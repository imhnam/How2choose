import { ForbiddenException, INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NextFunction, Request, Response } from 'express';
export function configureApp(app:INestApplication) {
  app.setGlobalPrefix('api');
  const webOrigin=process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({origin:webOrigin,credentials:true});
  app.use((req:Request,_res:Response,next:NextFunction)=>{
    if(['POST','PUT','PATCH','DELETE'].includes(req.method) && req.headers.origin && req.headers.origin!==webOrigin) return next(new ForbiddenException('Invalid request origin'));
    next();
  });
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  const config=new DocumentBuilder().setTitle('Howtochoose API').setVersion('0.2.0').build();
  SwaggerModule.setup('api/docs',app,SwaggerModule.createDocument(app,config));
}
