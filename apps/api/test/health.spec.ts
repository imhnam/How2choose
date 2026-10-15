import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { configureApp } from '../src/setup';
describe('Health HTTP endpoints', () => {
  let app: INestApplication;
  const db = { $queryRaw: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(db).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
  });
  afterAll(async () => { await app.close(); });
  it('reports liveness without querying the database', async () => {
    db.$queryRaw.mockClear();
    await request(app.getHttpServer()).get('/api/health').expect(200).expect({ status: 'ok', service: 'howtochoose-api' });
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
  it('reports database readiness', async () => {
    db.$queryRaw.mockResolvedValueOnce([{ value: 1 }]);
    await request(app.getHttpServer()).get('/api/health/ready').expect(200).expect({ status: 'ok', database: 'connected' });
  });
  it('returns 503 without exposing connection details', async () => {
    db.$queryRaw.mockRejectedValueOnce(new Error('sensitive connection detail'));
    const response = await request(app.getHttpServer()).get('/api/health/ready').expect(503);
    expect(response.body.message).toBe('Database unavailable');
    expect(JSON.stringify(response.body)).not.toContain('sensitive');
  });
});
