import 'dotenv/config';
import 'reflect-metadata';
import cookieParser from 'cookie-parser';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './setup';
async function bootstrap() {
  const app=await NestFactory.create(AppModule);
  app.use(cookieParser());
  configureApp(app);
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3001),'127.0.0.1');
}
void bootstrap();
