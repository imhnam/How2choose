import 'dotenv/config';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { GhnService } from '../src/ghn/ghn.service';
import { LocationsService } from '../src/locations/locations.service';
import { VnpayService } from '../src/orders/vnpay.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';

describe('Orders, VNPAY and GHN staging flow (PostgreSQL; providers mocked)', () => {
  let app: INestApplication;
  let db: PrismaService;
  let userId: string;
  let variantId: string;
  let ghn: { quote: jest.Mock; createShipment: jest.Mock };
  let vnpay: VnpayService;

  beforeAll(async () => {
    process.env.ORDER_QUOTE_SECRET = 'order-quote-test-secret-long-enough-for-tests';
    process.env.VNPAY_TMN_CODE = 'DEMO1234';
    process.env.VNPAY_HASH_SECRET = 'sandbox-hash-secret';
    process.env.API_PUBLIC_URL = 'https://api.example.test';
    process.env.VNPAY_IPN_URL = 'https://api.example.test/api/payments/vnpay/ipn';
    const localLocations = {
      provinces: jest.fn().mockResolvedValue([{ code: 1, name: 'Hà Nội' }]),
      districts: jest.fn().mockResolvedValue([{ code: 1, name: 'Ba Đình' }]),
      wards: jest.fn().mockResolvedValue([{ code: 1, name: 'Phúc Xá' }]),
    };
    ghn = {
      quote: jest.fn().mockResolvedValue({ feeVnd: 19000, serviceTypeId: 2, package: { weight: 500, length: 10, width: 10, height: 10 } }),
      createShipment: jest.fn().mockResolvedValue('GHNSTAGE123'),
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(LocationsService).useValue(localLocations)
      .overrideProvider(GhnService).useValue(ghn)
      .compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    configureApp(app);
    await app.init();
    db = app.get(PrismaService);
    vnpay = app.get(VnpayService);
  });

  afterAll(async () => {
    if (userId) {
      await db.order.deleteMany({ where: { ownerId: userId } });
      await db.productVariant.deleteMany({ where: { productId: 'order-flow-product' } });
      await db.product.deleteMany({ where: { id: 'order-flow-product' } });
      await db.user.deleteMany({ where: { id: userId } });
    }
    await app.close();
  });

  it('quotes authoritative prices, reserves stock idempotently, and creates GHN shipment only after VNPAY IPN', async () => {
    const server = app.getHttpServer();
    const agent = request.agent(server);
    const suffix = randomUUID().slice(0, 8);
    const registered = await agent.post('/api/auth/register').send({ displayName: 'Order test', identifier: `orders-${suffix}@example.test`, password: 'StrongPass123' }).expect(201);
    userId = registered.body.user.id as string;
    const product = await db.product.create({
      data: {
        id: 'order-flow-product', slug: `order-flow-${suffix}`, name: 'Sản phẩm test', description: 'Test', priceVnd: 200000,
        stock: 5, tags: [], shippingRegions: ['ALL'], variants: { create: {
          id: `order-flow-variant-${suffix}`, sku: `ORDER-${suffix}`, priceVnd: 200000, stock: 5,
          packageWeightGram: 500, packageLengthCm: 10, packageWidthCm: 10, packageHeightCm: 10,
        } },
      }, include: { variants: true },
    });
    variantId = product.variants[0].id;
    const quoteInput = {
      items: [{ variantId, quantity: 1 }], recipientName: 'Người nhận', phone: '0912345678', addressVersion: 'legacy',
      provinceCode: 1, districtCode: 1, wardCode: 1, addressLine: '12 Đường thử',
    };
    const quoteResponse = await agent.post('/api/orders/quote').send(quoteInput).expect(201);
    expect(quoteResponse.body).toMatchObject({ subtotalVnd: 200000, shippingFeeVnd: 19000, totalVnd: 219000 });
    const requestBody = { ...quoteInput, quoteToken: quoteResponse.body.quoteToken };
    const idempotencyKey = randomUUID();
    const created = await agent.post('/api/orders').set('Idempotency-Key', idempotencyKey).send(requestBody).expect(201);
    expect(created.body.order.status).toBe('PENDING_PAYMENT');
    expect(created.body.paymentUrl).toContain('sandbox.vnpayment.vn');
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variantId } }).then(item => item.stock)).toBe(4);
    const repeated = await agent.post('/api/orders').set('Idempotency-Key', idempotencyKey).send(requestBody).expect(201);
    expect(repeated.body.order.id).toBe(created.body.order.id);
    expect(await db.productVariant.findUniqueOrThrow({ where: { id: variantId } }).then(item => item.stock)).toBe(4);

    jest.spyOn(vnpay, 'isValidSignature').mockReturnValue(true);
    const attempt = await db.paymentAttempt.findUniqueOrThrow({ where: { orderId: created.body.order.id } });
    const callback = {
      vnp_TmnCode: 'DEMO1234', vnp_TxnRef: attempt.txnRef, vnp_Amount: String(attempt.amountVnd * 100),
      vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: '987654321', vnp_BankCode: 'NCB',
    };
    await request(server).get('/api/payments/vnpay/ipn').query(callback).expect(200).expect({ RspCode: '00', Message: 'Confirm Success' });
    const paid = await db.order.findUniqueOrThrow({ where: { id: created.body.order.id } });
    expect(paid.status).toBe('PAID');
    expect(paid.shipmentStatus).toBe('CREATED');
    expect(paid.ghnOrderCode).toBe('GHNSTAGE123');
    expect(ghn.createShipment).toHaveBeenCalledTimes(1);

    const secondQuote = await agent.post('/api/orders/quote').send(quoteInput).expect(201);
    const secondOrder = await agent.post('/api/orders').set('Idempotency-Key', randomUUID()).send({ ...quoteInput, quoteToken: secondQuote.body.quoteToken }).expect(201);
    await agent.post(`/api/orders/${secondOrder.body.order.id}/cancel`).expect(201);
    const lateAttempt = await db.paymentAttempt.findUniqueOrThrow({ where: { orderId: secondOrder.body.order.id } });
    await request(server).get('/api/payments/vnpay/ipn').query({ ...callback, vnp_TxnRef: lateAttempt.txnRef, vnp_Amount: String(lateAttempt.amountVnd * 100), vnp_TransactionNo: '987654322' }).expect(200);
    const review = await db.order.findUniqueOrThrow({ where: { id: secondOrder.body.order.id } });
    expect(review.status).toBe('PAYMENT_REVIEW');
    expect(review.shipmentStatus).toBe('NOT_CREATED');
    expect(ghn.createShipment).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });
});