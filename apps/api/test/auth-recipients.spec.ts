import 'dotenv/config';
import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import cookieParser from 'cookie-parser';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/setup';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication and recipient ownership (PostgreSQL)', () => {
  let app: INestApplication;
  let db: PrismaService;
  const userIds: string[] = [];
  beforeAll(async () => {
    const module = await Test.createTestingModule({imports:[AppModule]}).compile();
    app=module.createNestApplication();
    app.use(cookieParser());
    configureApp(app);
    await app.init();
    db=app.get(PrismaService);
  });
  afterAll(async () => {
    if(userIds.length) await db.user.deleteMany({where:{id:{in:userIds}}});
    await app.close();
  });
  it('registers, persists a session, scopes recipients, and revokes logout', async () => {
    const server=app.getHttpServer();
    const first=request.agent(server);
    const second=request.agent(server);
    const suffix=randomUUID().slice(0,10);
    const a=await first.post('/api/auth/register').send({displayName:'Người dùng A',identifier:'first-'+suffix+'@example.test',password:'StrongPass123'}).expect(201);
    const b=await second.post('/api/auth/register').send({displayName:'Người dùng B',identifier:'second-'+suffix+'@example.test',password:'StrongPass123'}).expect(201);
    userIds.push(a.body.user.id,b.body.user.id);
    expect(a.headers['set-cookie'][0]).toContain('HttpOnly');
    await first.get('/api/auth/me').expect(200);
    await request(server).get('/api/auth/me/address').expect(401);
    await request(server).post('/api/auth/me/address').send({}).expect(401);
    const emptyAddress=await first.get('/api/auth/me/address').expect(200);
    expect(emptyAddress.body.address).toBeNull();
    expect((await first.get('/api/auth/me').expect(200)).body.user.birthday).toBeNull();
    await first.post('/api/auth/me/address').send({
      recipientName:'Người nhận',phone:'invalid',version:'current',provinceCode:1,wardCode:1,addressLine:'12 Nguyễn Trãi',
    }).expect(400);
    const updatedProfile=await first.patch('/api/auth/me').send({displayName:'Nam mới',birthday:'1990-05-14'}).expect(200);
    expect(updatedProfile.body.user.displayName).toBe('Nam mới');
    expect(updatedProfile.body.user.birthday).toBe('1990-05-14');
    await first.patch('/api/auth/me').send({displayName:'Nam mới',birthday:'2026-02-31'}).expect(400);
    await request(server).get('/api/recipients').expect(401);
    await request(server).post('/api/media/recipients/unknown/avatar').expect(401);
    const item=await first.post('/api/recipients').send({displayName:'An',relationship:'Bạn',birthday:'2000-12-31',interests:['sách'],dislikes:[],notes:''}).expect(201);
    expect(item.body.address).toBeNull();
    expect(item.body.avatarUrl).toBeNull();
    expect(item.body.birthday).toBe('2000-12-31');
    await first.post('/api/recipients').send({
      displayName:'Địa chỉ sai',interests:[],dislikes:[],address:{version:'unsupported',provinceCode:1,wardCode:1,addressLine:'12 Nguyễn Trãi'},
    }).expect(400);
    await first.post('/api/media/recipients/'+item.body.id+'/avatar').expect(400);
    await second.post('/api/media/recipients/'+item.body.id+'/avatar').expect(404);
    await first.get('/api/recipients/'+item.body.id).expect(200);
    await second.get('/api/recipients/'+item.body.id).expect(404);
    await second.patch('/api/recipients/'+item.body.id).send({displayName:'Changed'}).expect(404);
    await second.get('/api/recipients').expect(200).expect([]);
    await first.post('/api/recipients').send({displayName:'A',interests:[],dislikes:[],ownerId:b.body.user.id}).expect(400);
    await first.patch('/api/recipients/'+item.body.id).send({displayName:'An mới',phone:'0912345678',birthday:null}).expect(200);
    const list=await first.get('/api/recipients').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].displayName).toBe('An mới');
    expect(list.body[0].phone).toBe('0912345678');
    expect(list.body[0].birthday).toBeNull();
    await first.post('/api/auth/logout').expect(201);
    await first.get('/api/auth/me').expect(401);
  });
  it('rejects bad credentials, cross-origin writes, and invalid Google state', async () => {
    const server=app.getHttpServer();
    await request(server).post('/api/auth/register').send({identifier:'missing-name@example.test',password:'StrongPass123'}).expect(400);
    await request(server).post('/api/auth/login').send({identifier:'missing@example.test',password:'wrongpassword'}).expect(401);
    await request(server).post('/api/auth/register').set('Origin','https://attacker.example').send({identifier:'new@example.test',password:'StrongPass123'}).expect(403);
    await request(server).get('/api/auth/google/callback?code=fake&state=fake').expect(400);
  });
  it('normalizes a Vietnamese phone number for later login', async () => {
    const server=app.getHttpServer();
    const local='09'+String(Math.floor(Math.random()*100000000)).padStart(8,'0');
    const registered=await request(server).post('/api/auth/register').send({displayName:'Người dùng điện thoại',identifier:local,password:'StrongPass123'}).expect(201);
    userIds.push(registered.body.user.id);
    expect(registered.body.user.phone).toBe('+84'+local.slice(1));
    await request(server).post('/api/auth/login').send({identifier:'+84'+local.slice(1),password:'StrongPass123'}).expect(201);
  });
});
