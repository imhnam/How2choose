import { createHmac, createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException, ConflictException, Injectable, Logger, NotFoundException,
  OnModuleDestroy, OnModuleInit, ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GhnService, GhnShipmentItem } from '../ghn/ghn.service';
import { LocationsService } from '../locations/locations.service';
import { CreateOrderDto, OrderQuoteDto } from './order.dto';
import { VnpayService } from './vnpay.service';
import { Order as OrderRecord, OrderItem, PaymentAttempt } from '../generated/prisma/client';

type QuoteLine = {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  variantName: string;
  originalUnitPriceVnd: number;
  discountVnd: number;
  unitPriceVnd: number;
  quantity: number;
  lineTotalVnd: number;
  packageWeightGram: number;
  packageLengthCm: number;
  packageWidthCm: number;
  packageHeightCm: number;
  shippingRegion: string;
};
type QuoteData = {
  ownerId: string;
  recipientName: string;
  phone: string;
  addressVersion: 'legacy';
  provinceCode: number;
  provinceName: string;
  districtCode: number;
  districtName: string;
  wardCode: number;
  wardName: string;
  addressLine: string;
  deliveryNote: string | null;
  items: QuoteLine[];
  subtotalVnd: number;
  shippingFeeVnd: number;
  totalVnd: number;
  packageWeightGram: number;
  packageLengthCm: number;
  packageWidthCm: number;
  packageHeightCm: number;
  ghnServiceTypeId: number;
  fingerprint: string;
};
type QuoteClaims = { ownerId: string; fingerprint: string; expiresAt: number };

function effectivePrice(price: number, percent: number | null, amount: number | null) {
  return Math.max(0, price - (percent ? Math.round(price * percent / 100) : 0) - (amount ?? 0));
}

function labelForVariant(variant: { name: string | null; color: string | null; size: string | null; material: string | null }) {
  return variant.name || [variant.color, variant.size, variant.material].filter(Boolean).join(' / ') || 'Mặc định';
}

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private expirationTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly locations: LocationsService,
    private readonly ghn: GhnService,
    private readonly vnpay: VnpayService,
  ) {}

  onModuleInit() {
    this.expirationTimer = setInterval(() => this.sweepExpiredOrders(), 60_000);
    this.expirationTimer.unref?.();
    this.sweepExpiredOrders();
  }

  private sweepExpiredOrders() {
    void this.expirePendingOrders().catch(error => this.logger.error('Unable to expire pending orders', error instanceof Error ? error.stack : undefined));
  }

  onModuleDestroy() {
    if (this.expirationTimer) clearInterval(this.expirationTimer);
  }

  private quoteSecret() {
    const secret = process.env.ORDER_QUOTE_SECRET?.trim();
    if (!secret || (process.env.NODE_ENV === 'production' && secret.length < 32)) {
      throw new ServiceUnavailableException('ORDER_QUOTE_SECRET chưa được cấu hình an toàn.');
    }
    return secret;
  }

  private signQuote(claims: QuoteClaims) {
    const encoded = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = createHmac('sha256', this.quoteSecret()).update(encoded).digest('base64url');
    return `${encoded}.${signature}`;
  }

  private verifyQuote(token: string, ownerId: string): QuoteClaims {
    const [encoded, supplied] = token.split('.');
    if (!encoded || !supplied) throw new BadRequestException('Báo giá không hợp lệ. Vui lòng báo giá lại.');
    const expected = createHmac('sha256', this.quoteSecret()).update(encoded).digest();
    let actual: Buffer;
    try { actual = Buffer.from(supplied, 'base64url'); } catch { throw new BadRequestException('Báo giá không hợp lệ.'); }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new BadRequestException('Báo giá không hợp lệ.');
    let claims: QuoteClaims;
    try { claims = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as QuoteClaims; } catch { throw new BadRequestException('Báo giá không hợp lệ.'); }
    if (claims.ownerId !== ownerId) throw new BadRequestException('Báo giá không thuộc tài khoản này.');
    if (!Number.isSafeInteger(claims.expiresAt) || claims.expiresAt <= Date.now()) throw new ConflictException('Báo giá đã hết hạn. Vui lòng báo giá lại.');
    return claims;
  }

  private async validateAddress(input: OrderQuoteDto) {
    if (input.addressVersion !== 'legacy') {
      throw new BadRequestException('GHN staging hiện chỉ hỗ trợ báo phí với địa chỉ theo địa giới trước 01/07/2025.');
    }
    if (!input.districtCode) throw new BadRequestException('Vui lòng chọn quận/huyện giao hàng.');
    const provinces = await this.locations.provinces('legacy');
    const province = provinces.find(item => item.code === input.provinceCode);
    if (!province) throw new BadRequestException('Tỉnh/thành giao hàng không hợp lệ.');
    const districts = await this.locations.districts(input.provinceCode);
    const district = districts.find(item => item.code === input.districtCode);
    if (!district) throw new BadRequestException('Quận/huyện không thuộc tỉnh/thành đã chọn.');
    const wards = await this.locations.wards('legacy', input.districtCode);
    const ward = wards.find(item => item.code === input.wardCode);
    if (!ward) throw new BadRequestException('Phường/xã không thuộc quận/huyện đã chọn.');
    return { province, district, ward };
  }

  private async buildQuote(ownerId: string, input: OrderQuoteDto): Promise<QuoteData> {
    if (!input.items.length) throw new BadRequestException('Giỏ hàng đang trống.');
    if (new Set(input.items.map(item => item.variantId)).size !== input.items.length) throw new BadRequestException('Giỏ hàng có biến thể bị trùng.');
    const address = await this.validateAddress(input);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: input.items.map(item => item.variantId) }, active: true, product: { active: true } },
      include: { product: true },
    });
    if (variants.length !== input.items.length) throw new BadRequestException('Một hoặc nhiều sản phẩm không còn được bán.');
    const variantById = new Map(variants.map(variant => [variant.id, variant]));
    const regionCode = address.province.code === 1 ? 'HN' : address.province.code === 79 ? 'HCM' : address.province.code === 48 ? 'DN' : `v1:${address.province.code}`;
    const items: QuoteLine[] = input.items.map(line => {
      const variant = variantById.get(line.variantId)!;
      if (line.quantity > variant.stock) throw new ConflictException(`Sản phẩm ${variant.product.name} không đủ tồn kho.`);
      if (!variant.product.shippingRegions.includes('ALL') && !variant.product.shippingRegions.includes(regionCode)) {
        throw new BadRequestException(`Sản phẩm ${variant.product.name} không giao đến khu vực đã chọn.`);
      }
      const dimensions = [variant.packageWeightGram, variant.packageLengthCm, variant.packageWidthCm, variant.packageHeightCm];
      if (dimensions.some(value => value === null || value <= 0)) {
        throw new BadRequestException(`Sản phẩm ${variant.product.name} chưa có đủ cân nặng và kích thước đóng gói.`);
      }
      const unitPriceVnd = effectivePrice(variant.priceVnd, variant.discountPercent ?? variant.product.discountPercent, variant.discountAmountVnd ?? variant.product.discountAmountVnd);
      const variantName = labelForVariant(variant);
      return {
        variantId: variant.id, productId: variant.productId, productName: variant.product.name, sku: variant.sku,
        variantName, originalUnitPriceVnd: variant.priceVnd, discountVnd: variant.priceVnd - unitPriceVnd,
        unitPriceVnd, quantity: line.quantity, lineTotalVnd: unitPriceVnd * line.quantity,
        packageWeightGram: variant.packageWeightGram!, packageLengthCm: variant.packageLengthCm!,
        packageWidthCm: variant.packageWidthCm!, packageHeightCm: variant.packageHeightCm!, shippingRegion: regionCode,
      };
    });
    const subtotalVnd = items.reduce((sum, item) => sum + item.lineTotalVnd, 0);
    const packageWeightGram = items.reduce((sum, item) => sum + item.packageWeightGram * item.quantity, 0);
    if (packageWeightGram > 50_000) throw new BadRequestException('Tổng khối lượng đơn vượt giới hạn 50 kg của GHN.');
    const packageLengthCm = Math.max(...items.map(item => item.packageLengthCm));
    const packageWidthCm = Math.max(...items.map(item => item.packageWidthCm));
    const packageHeightCm = items.reduce((sum, item) => sum + item.packageHeightCm * item.quantity, 0);
    if (packageHeightCm > 200) throw new BadRequestException('Kích thước kiện hàng vượt giới hạn của GHN.');
    const shipmentItems: GhnShipmentItem[] = items.map(item => ({
      name: `${item.productName} ${item.variantName}`, code: item.sku, quantity: item.quantity, price: item.unitPriceVnd,
      weight: item.packageWeightGram, length: item.packageLengthCm, width: item.packageWidthCm, height: item.packageHeightCm,
    }));
    const addressCodes = { provinceCode: address.province.code, districtCode: address.district.code, wardCode: address.ward.code };
    const ghnQuote = await this.ghn.quote({
      address: addressCodes, weight: packageWeightGram, length: packageLengthCm, width: packageWidthCm,
      height: packageHeightCm, insuranceValue: subtotalVnd, items: shipmentItems,
    });
    const quoteBase = {
      ownerId, recipientName: input.recipientName.trim(), phone: input.phone.trim(), addressVersion: 'legacy' as const,
      provinceCode: address.province.code, provinceName: address.province.name,
      districtCode: address.district.code, districtName: address.district.name,
      wardCode: address.ward.code, wardName: address.ward.name,
      addressLine: input.addressLine.trim(), deliveryNote: input.deliveryNote?.trim() || null,
      items, subtotalVnd, shippingFeeVnd: ghnQuote.feeVnd, totalVnd: subtotalVnd + ghnQuote.feeVnd,
      packageWeightGram, packageLengthCm, packageWidthCm, packageHeightCm,
      ghnServiceTypeId: ghnQuote.serviceTypeId,
    };
    const fingerprint = createHash('sha256').update(JSON.stringify(quoteBase)).digest('hex');
    return { ...quoteBase, fingerprint };
  }

  async quote(ownerId: string, input: OrderQuoteDto) {
    const quote = await this.buildQuote(ownerId, input);
    const expiresAt = Date.now() + 5 * 60_000;
    return {
      items: quote.items,
      subtotalVnd: quote.subtotalVnd,
      shippingFeeVnd: quote.shippingFeeVnd,
      totalVnd: quote.totalVnd,
      expiresAt: new Date(expiresAt).toISOString(),
      quoteToken: this.signQuote({ ownerId, fingerprint: quote.fingerprint, expiresAt }),
    };
  }

  async create(ownerId: string, input: CreateOrderDto, idempotencyKey: string, ipAddress?: string) {
    if (!/^[\w-]{8,128}$/.test(idempotencyKey)) throw new BadRequestException('Idempotency-Key không hợp lệ.');
    this.vnpay.assertConfigured();
    const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const existing = await this.prisma.order.findUnique({ where: { ownerId_idempotencyKey: { ownerId, idempotencyKey } }, include: { items: true, payment: true } });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ConflictException('Idempotency-Key đã được dùng với nội dung khác.');
      if (!existing.payment || existing.status !== 'PENDING_PAYMENT') return { order: this.publicOrder(existing), paymentUrl: null };
      return { order: this.publicOrder(existing), paymentUrl: this.vnpay.createPaymentUrl({ txnRef: existing.payment.txnRef, amountVnd: existing.totalVnd, orderNumber: existing.orderNumber, expiresAt: existing.expiresAt, ipAddress }) };
    }
    const claims = this.verifyQuote(input.quoteToken, ownerId);
    const currentQuote = await this.buildQuote(ownerId, input);
    if (claims.fingerprint !== currentQuote.fingerprint) throw new ConflictException('Giá, phí giao hàng hoặc thông tin đơn đã thay đổi. Vui lòng kiểm tra báo giá mới.');

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60_000);
    const orderNumber = `HTC${Date.now()}${randomBytes(4).toString('hex').toUpperCase()}`;
    const txnRef = `${Date.now()}${randomInt(100000, 999999)}`;
    let order;
    try {
      order = await this.prisma.$transaction(async tx => {
        const variants = await tx.productVariant.findMany({
          where: { id: { in: currentQuote.items.map(item => item.variantId) }, active: true, product: { active: true } },
          include: { product: true },
        });
        if (variants.length !== currentQuote.items.length) throw new ConflictException('Sản phẩm đã thay đổi. Vui lòng báo giá lại.');
        for (const item of currentQuote.items) {
          const variant = variants.find(value => value.id === item.variantId);
          if (!variant || variant.stock < item.quantity || effectivePrice(variant.priceVnd, variant.discountPercent ?? variant.product.discountPercent, variant.discountAmountVnd ?? variant.product.discountAmountVnd) !== item.unitPriceVnd) {
            throw new ConflictException('Giá hoặc tồn kho đã thay đổi. Vui lòng báo giá lại.');
          }
          const updated = await tx.productVariant.updateMany({
            where: { id: item.variantId, active: true, stock: { gte: item.quantity }, product: { active: true } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count !== 1) throw new ConflictException('Tồn kho vừa thay đổi. Vui lòng báo giá lại.');
        }
        return tx.order.create({
          data: {
            orderNumber, ownerId, status: 'PENDING_PAYMENT', recipientName: currentQuote.recipientName, phone: currentQuote.phone,
            addressVersion: currentQuote.addressVersion, provinceCode: currentQuote.provinceCode, provinceName: currentQuote.provinceName,
            districtCode: currentQuote.districtCode, districtName: currentQuote.districtName, wardCode: currentQuote.wardCode,
            wardName: currentQuote.wardName, addressLine: currentQuote.addressLine, deliveryNote: currentQuote.deliveryNote,
            subtotalVnd: currentQuote.subtotalVnd, shippingFeeVnd: currentQuote.shippingFeeVnd, totalVnd: currentQuote.totalVnd,
            packageWeightGram: currentQuote.packageWeightGram, packageLengthCm: currentQuote.packageLengthCm,
            packageWidthCm: currentQuote.packageWidthCm, packageHeightCm: currentQuote.packageHeightCm,
            ghnServiceTypeId: currentQuote.ghnServiceTypeId, expiresAt, idempotencyKey, requestHash,
            items: { create: currentQuote.items.map(item => ({
              productId: item.productId, variantId: item.variantId, productName: item.productName, sku: item.sku,
              variantName: item.variantName, originalUnitPriceVnd: item.originalUnitPriceVnd, discountVnd: item.discountVnd,
              unitPriceVnd: item.unitPriceVnd, quantity: item.quantity,
              lineTotalVnd: item.lineTotalVnd, packageWeightGram: item.packageWeightGram,
              packageLengthCm: item.packageLengthCm, packageWidthCm: item.packageWidthCm, packageHeightCm: item.packageHeightCm,
            })) },
            payment: { create: { txnRef, amountVnd: currentQuote.totalVnd, status: 'PENDING' } },
          },
          include: { items: true, payment: true },
        });
      });
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        const duplicate = await this.prisma.order.findUnique({ where: { ownerId_idempotencyKey: { ownerId, idempotencyKey } }, include: { items: true, payment: true } });
        if (duplicate?.requestHash === requestHash) return { order: this.publicOrder(duplicate), paymentUrl: duplicate.payment ? this.vnpay.createPaymentUrl({ txnRef: duplicate.payment.txnRef, amountVnd: duplicate.totalVnd, orderNumber: duplicate.orderNumber, expiresAt: duplicate.expiresAt, ipAddress }) : null };
      }
      throw error;
    }
    const paymentUrl = this.vnpay.createPaymentUrl({ txnRef, amountVnd: order.totalVnd, orderNumber, expiresAt, ipAddress });
    return { order: this.publicOrder(order), paymentUrl };
  }

  private publicOrder(order: OrderRecord & { items?: OrderItem[]; payment?: PaymentAttempt | null }) {
    const publicOrder = Object.fromEntries(Object.entries(order).filter(([key]) => !['requestHash', 'idempotencyKey', 'ownerId', 'payment'].includes(key))) as Record<string, unknown>;
    if (order.payment) publicOrder.payment = { status: order.payment.status, amountVnd: order.payment.amountVnd, paidAt: order.payment.paidAt };
    return publicOrder;
  }

  async list(ownerId: string) {
    const orders = await this.prisma.order.findMany({ where: { ownerId }, orderBy: { createdAt: 'desc' }, take: 50, include: { items: true } });
    return orders.map(order => this.publicOrder(order));
  }

  async get(ownerId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, ownerId }, include: { items: true, payment: true } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    return this.publicOrder(order);
  }

  async cancel(ownerId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, ownerId }, include: { items: true } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (order.status !== 'PENDING_PAYMENT') throw new ConflictException('Chỉ có thể hủy đơn đang chờ thanh toán.');
    await this.releaseOrder(order.id, 'CANCELLED');
    return this.get(ownerId, id);
  }

  private async releaseOrder(id: string, status: 'CANCELLED' | 'EXPIRED' | 'PAYMENT_FAILED') {
    await this.prisma.$transaction(async tx => {
      const changed = await tx.order.updateMany({ where: { id, status: 'PENDING_PAYMENT' }, data: { status } });
      if (!changed.count) return;
      const items = await tx.orderItem.findMany({ where: { orderId: id } });
      for (const item of items) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      await tx.paymentAttempt.updateMany({ where: { orderId: id, status: 'PENDING' }, data: { status: 'FAILED' } });
    });
  }

  private async expirePendingOrders() {
    if (!this.prisma.order) return;
    const expired = await this.prisma.order.findMany({ where: { status: 'PENDING_PAYMENT', expiresAt: { lte: new Date() } }, select: { id: true }, take: 100 });
    await Promise.all(expired.map(order => this.releaseOrder(order.id, 'EXPIRED')));
  }

  async retryShipment(ownerId: string, id: string) {
    const order = await this.prisma.order.findFirst({ where: { id, ownerId } });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    if (order.status !== 'PAID') throw new ConflictException('Chỉ tạo vận đơn cho đơn đã thanh toán.');
    await this.ensureShipment(order.id);
    return this.get(ownerId, id);
  }

  private async ensureShipment(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order || order.status !== 'PAID' || order.shipmentStatus === 'CREATED') return;
    try {
      const ghnOrderCode = await this.ghn.createShipment({
        orderNumber: order.orderNumber,
        recipientName: order.recipientName,
        phone: order.phone,
        addressLine: order.addressLine,
        provinceName: order.provinceName,
        districtName: order.districtName ?? '',
        wardName: order.wardName,
        deliveryNote: order.deliveryNote,
        address: { provinceCode: order.provinceCode, districtCode: order.districtCode!, wardCode: order.wardCode },
        quote: {
          feeVnd: order.shippingFeeVnd,
          serviceTypeId: order.ghnServiceTypeId,
          package: { weight: order.packageWeightGram, length: order.packageLengthCm, width: order.packageWidthCm, height: order.packageHeightCm },
        },
        subtotalVnd: order.subtotalVnd,
        items: order.items.map(item => ({
          name: `${item.productName} ${item.variantName}`, code: item.sku, quantity: item.quantity, price: item.unitPriceVnd,
          weight: item.packageWeightGram, length: item.packageLengthCm, width: item.packageWidthCm, height: item.packageHeightCm,
        })),
      });
      await this.prisma.order.update({ where: { id }, data: { shipmentStatus: 'CREATED', ghnOrderCode, ghnShipmentError: null } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GHN tạo vận đơn thất bại.';
      await this.prisma.order.update({ where: { id }, data: { shipmentStatus: 'FAILED', ghnShipmentError: message.slice(0, 500) } });
    }
  }

  async handleVnpayIpn(params: Record<string, unknown>) {
    if (!this.vnpay.isValidSignature(params)) return { RspCode: '97', Message: 'Invalid signature' };
    const get = (key: string) => typeof params[key] === 'string' ? params[key] as string : '';
    if (get('vnp_TmnCode') !== process.env.VNPAY_TMN_CODE?.trim()) return { RspCode: '97', Message: 'Invalid merchant' };
    const txnRef = get('vnp_TxnRef');
    const attempt = await this.prisma.paymentAttempt.findUnique({ where: { txnRef }, include: { order: { include: { items: true } } } });
    if (!attempt) return { RspCode: '01', Message: 'Order not found' };
    if (get('vnp_Amount') !== String(attempt.amountVnd * 100)) return { RspCode: '04', Message: 'Invalid amount' };
    const success = get('vnp_ResponseCode') === '00' && get('vnp_TransactionStatus') === '00';
    if (attempt.status === 'PAID' || (attempt.status === 'FAILED' && !success)) {
      if (attempt.status === 'PAID') await this.ensureShipment(attempt.orderId);
      return { RspCode: '02', Message: 'Order already confirmed' };
    }
    const gatewayTransactionNo = get('vnp_TransactionNo');
    if (success && !gatewayTransactionNo) return { RspCode: '04', Message: 'Missing gateway transaction number' };
    const now = new Date();
    try {
      await this.prisma.$transaction(async tx => {
        const current = await tx.order.findUnique({ where: { id: attempt.orderId }, include: { items: true } });
        if (!current) throw new NotFoundException('Order not found');
        const paymentChanged = await tx.paymentAttempt.updateMany({
          where: { id: attempt.id, status: attempt.status },
          data: success
            ? { status: 'PAID', responseCode: get('vnp_ResponseCode'), bankCode: get('vnp_BankCode') || null, gatewayTransactionNo: gatewayTransactionNo || null, paidAt: now }
            : { status: 'FAILED', responseCode: get('vnp_ResponseCode'), bankCode: get('vnp_BankCode') || null },
        });
        if (!paymentChanged.count) return;
        if (success) {
          if (current.status === 'PENDING_PAYMENT' && current.expiresAt > now) {
            const changed = await tx.order.updateMany({ where: { id: current.id, status: 'PENDING_PAYMENT', expiresAt: { gt: now } }, data: { status: 'PAID', paidAt: now } });
            if (changed.count) for (const item of current.items) await tx.product.update({ where: { id: item.productId }, data: { purchaseCount: { increment: item.quantity } } });
            if (!changed.count) await tx.order.updateMany({ where: { id: current.id, status: { in: ['CANCELLED', 'EXPIRED', 'PAYMENT_FAILED'] } }, data: { status: 'PAYMENT_REVIEW', paidAt: now } });
          } else if (current.status === 'PENDING_PAYMENT') {
            const changed = await tx.order.updateMany({ where: { id: current.id, status: 'PENDING_PAYMENT' }, data: { status: 'PAYMENT_REVIEW', paidAt: now } });
            if (changed.count) for (const item of current.items) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
          } else if (['CANCELLED', 'EXPIRED', 'PAYMENT_FAILED'].includes(current.status)) {
            await tx.order.updateMany({ where: { id: current.id, status: current.status }, data: { status: 'PAYMENT_REVIEW', paidAt: now } });
          }
        } else if (current.status === 'PENDING_PAYMENT') {
          const changed = await tx.order.updateMany({ where: { id: current.id, status: 'PENDING_PAYMENT' }, data: { status: 'PAYMENT_FAILED' } });
          if (changed.count) for (const item of current.items) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        }
      });
    } catch {
      return { RspCode: '99', Message: 'Unable to update payment' };
    }
    const updated = await this.prisma.order.findUnique({ where: { id: attempt.orderId } });
    if (success && updated?.status === 'PAID') await this.ensureShipment(attempt.orderId);
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  verifyVnpayReturn(params: Record<string, unknown>) {
    return this.vnpay.isValidSignature(params) && params.vnp_TmnCode === process.env.VNPAY_TMN_CODE?.trim();
  }

  async findByTxnRef(txnRef: string) {
    return this.prisma.paymentAttempt.findUnique({ where: { txnRef }, select: { orderId: true, order: { select: { orderNumber: true } } } });
  }
}