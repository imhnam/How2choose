import { ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';

export function allowedOrigins() {
  return [process.env.WEB_ORIGIN ?? 'http://localhost:3000', process.env.ADMIN_ORIGIN ?? 'http://localhost:3002']
    .flatMap(value => value.split(','))
    .map(value => value.trim())
    .filter(Boolean);
}

export function configureApp(app:INestApplication) {
  app.setGlobalPrefix('api');
  const origins=allowedOrigins();
  app.enableCors({origin:origins,credentials:true});
  app.use((req:Request,_res:Response,next:NextFunction)=>{
    if(['POST','PUT','PATCH','DELETE'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) return next(new ForbiddenException('Invalid request origin'));
    next();
  });
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  const config=new DocumentBuilder().setTitle('How2choose API').setVersion('0.2.0').build();
  SwaggerModule.setup('api/docs',app,SwaggerModule.createDocument(app,config));
}
