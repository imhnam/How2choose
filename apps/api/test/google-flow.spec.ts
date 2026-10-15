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
import { GoogleService } from '../src/auth/google.service';

describe('Google callback orchestration (Google token exchange mocked)', () => {
  let app: INestApplication;
  let db: PrismaService;
  const userIds:string[]=[];
  const suffix=randomUUID().slice(0,10);
  const identity=jest.fn().mockResolvedValue({subject:'google-'+suffix,email:'google-'+suffix+'@example.test',displayName:'Google User'});
  beforeAll(async()=>{
    const module=await Test.createTestingModule({imports:[AppModule]}).overrideProvider(GoogleService).useValue({isConfigured:()=>true,authorizationUrl:(state:string)=>'https://accounts.google.com/test?state='+state,identity}).compile();
    app=module.createNestApplication();app.use(cookieParser());configureApp(app);await app.init();db=app.get(PrismaService);
  });
  afterAll(async()=>{if(userIds.length) await db.user.deleteMany({where:{id:{in:userIds}}});await app.close();});
  it('checks state and creates a reusable local session',async()=>{
    const agent=request.agent(app.getHttpServer());
    const start=await agent.get('/api/auth/google/start').expect(302);
    const state=new URL(start.headers.location).searchParams.get('state');
    expect(state).toBeTruthy();
    const callback=await agent.get('/api/auth/google/callback?code=test&state='+state).expect(302);
    expect(callback.headers.location).toBe('http://localhost:3000/recipients');
    const me=await agent.get('/api/auth/me').expect(200);
    userIds.push(me.body.user.id);
    expect(me.body.user.email).toBe('google-'+suffix+'@example.test');
    expect(identity).toHaveBeenCalledWith('test');
  });
  it('does not silently link a local password account by matching email',async()=>{
    const email='collision-'+suffix+'@example.test';
    const local=await request(app.getHttpServer()).post('/api/auth/register').send({displayName:'Local User',identifier:email,password:'StrongPass123'}).expect(201);
    userIds.push(local.body.user.id);
    identity.mockResolvedValueOnce({subject:'other-'+suffix,email,displayName:'Other'});
    const agent=request.agent(app.getHttpServer());
    const start=await agent.get('/api/auth/google/start').expect(302);
    const state=new URL(start.headers.location).searchParams.get('state');
    const callback=await agent.get('/api/auth/google/callback?code=test&state='+state).expect(302);
    expect(callback.headers.location).toContain('error=account_exists');
    await agent.get('/api/auth/me').expect(401);
  });
});
