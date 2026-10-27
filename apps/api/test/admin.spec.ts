import 'dotenv/config';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { hashPassword } from '../src/auth/auth.utils';
import { configureApp } from '../src/setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin authentication and catalog management (PostgreSQL)', () => {
  let app: INestApplication;
  let db: PrismaService;
  const userIds: string[] = [];
  const productIds: string[] = [];
  const categoryIds: string[] = [];
  const suffix = randomUUID().slice(0, 10);
  const adminIdentifier = `admin-${suffix}@example.test`;
  const adminPassword = 'AdminPass123!';

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    configureApp(app);
    await app.init();
    db = app.get(PrismaService);
    const admin = await db.user.create({
      data: {
        email: adminIdentifier,
        displayName: 'Quản trị viên kiểm thử',
        passwordHash: await hashPassword(adminPassword),
        role: 'ADMIN',
      },
    });
    userIds.push(admin.id);
  });

  afterAll(async () => {
    if (productIds.length) await db.product.deleteMany({ where: { id: { in: productIds } } });
    if (categoryIds.length) await db.category.deleteMany({ where: { id: { in: categoryIds } } });
    if (userIds.length) await db.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  it('rejects non-admin accounts without creating an admin session', async () => {
    const server = app.getHttpServer();
    const regular = await request(server).post('/api/auth/register').send({
      displayName: 'Người dùng thường',
      identifier: `user-${suffix}@example.test`,
      password: 'StrongPass123',
    }).expect(201);
    userIds.push(regular.body.user.id);

    const denied = await request(server).post('/api/admin/auth/login').send({
      identifier: `user-${suffix}@example.test`,
      password: 'StrongPass123',
    }).expect(401);
    expect(denied.headers['set-cookie']).toBeUndefined();

    await request(server).post('/api/admin/auth/login').send({
      identifier: adminIdentifier,
      password: 'wrong-password',
    }).expect(401);

    await request(server).get('/api/admin/summary').expect(401);
  });

  it('lets an admin sign in and blocks regular users from admin endpoints', async () => {
    const server = app.getHttpServer();
    const admin = request.agent(server);
    const login = await admin.post('/api/admin/auth/login').send({
      identifier: adminIdentifier,
      password: adminPassword,
    }).expect(201);
    expect(login.headers['set-cookie'][0]).toContain('HttpOnly');

    const me = await admin.get('/api/admin/auth/me').expect(200);
    expect(me.body.user.role).toBe('ADMIN');

    const regular = request.agent(server);
    await regular.post('/api/auth/login').send({
      identifier: `user-${suffix}@example.test`,
      password: 'StrongPass123',
    }).expect(201);
    await regular.get('/api/admin/summary').expect(403);
    await regular.get('/api/admin/products').expect(403);

    const summary = await admin.get('/api/admin/summary').expect(200);
    expect(summary.body.products.total).toBeGreaterThanOrEqual(0);
    expect(summary.body.orders.byStatus).toBeDefined();
  });

  it('enforces the admin origin for state-changing requests', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/admin/auth/login').send({ identifier: adminIdentifier, password: adminPassword }).expect(201);

    await agent.post('/api/admin/categories')
      .set('Origin', 'https://attacker.example')
      .send({ name: 'Danh mục xấu' })
      .expect(403);

    const created = await agent.post('/api/admin/categories')
      .set('Origin', 'http://localhost:3002')
      .send({ name: `Danh mục ${suffix}`, description: 'Mô tả danh mục' })
      .expect(201);
    categoryIds.push(created.body.id);
    expect(created.body.slug).toContain('danh-muc');

    const updated = await agent.patch(`/api/admin/categories/${created.body.id}`)
      .send({ name: `Danh mục đã đổi ${suffix}`, sortOrder: 3 })
      .expect(200);
    expect(updated.body.name).toBe(`Danh mục đã đổi ${suffix}`);
    expect(updated.body.sortOrder).toBe(3);
  });

  it('keeps products in draft until they have an active category and variant', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/admin/auth/login').send({ identifier: adminIdentifier, password: adminPassword }).expect(201);
    const categoryId = categoryIds[0];

    await agent.post('/api/admin/products').send({
      name: `Sản phẩm ${suffix}`,
      description: 'Mô tả sản phẩm kiểm thử.',
      priceVnd: 250_000,
      categoryIds: [categoryId],
      shippingRegions: ['ALL'],
      active: true,
    }).expect(400);

    const draft = await agent.post('/api/admin/products').send({
      name: `Sản phẩm ${suffix}`,
      description: 'Mô tả sản phẩm kiểm thử.',
      priceVnd: 250_000,
      categoryIds: [categoryId],
      shippingRegions: ['ALL'],
      tags: ['kiểm thử'],
    }).expect(201);
    productIds.push(draft.body.id);
    expect(draft.body.active).toBe(false);
    expect(draft.body.variants).toHaveLength(0);

    await agent.patch(`/api/admin/products/${draft.body.id}`).send({ active: true }).expect(400);

    const withVariant = await agent.post(`/api/admin/products/${draft.body.id}/variants`).send({
      sku: `TEST-${suffix.toUpperCase()}`,
      name: 'Bản tiêu chuẩn',
      priceVnd: 250_000,
      stock: 7,
      packageWeightGram: 500,
      packageLengthCm: 20,
      packageWidthCm: 15,
      packageHeightCm: 10,
    }).expect(201);
    const variant = withVariant.body.variants[0];
    expect(withVariant.body.stock).toBe(7);

    const published = await agent.patch(`/api/admin/products/${draft.body.id}`).send({ active: true }).expect(200);
    expect(published.body.active).toBe(true);

    const lowerStock = await agent.patch(`/api/admin/variants/${variant.id}`).send({ stock: 3 }).expect(200);
    expect(lowerStock.body.stock).toBe(3);

    const list = await agent.get('/api/admin/products').query({ q: suffix, status: 'active' }).expect(200);
    expect(list.body.items.some((item: { id: string }) => item.id === draft.body.id)).toBe(true);

    await agent.delete(`/api/admin/categories/${categoryId}`).expect(409);
    await agent.delete(`/api/admin/products/${draft.body.id}`).expect(200);
    const hidden = await agent.delete(`/api/admin/categories/${categoryId}`).expect(200);
    expect(hidden.body.archived).toBe(true);
  });

  it('lists orders for admins with pagination metadata', async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post('/api/admin/auth/login').send({ identifier: adminIdentifier, password: adminPassword }).expect(201);
    const orders = await agent.get('/api/admin/orders').query({ page: 1, limit: 5 }).expect(200);
    expect(orders.body.page).toBe(1);
    expect(orders.body.limit).toBe(5);
    expect(Array.isArray(orders.body.items)).toBe(true);
    expect(orders.body.total).toBeGreaterThanOrEqual(0);
  });
});
