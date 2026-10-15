import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { RecipientsModule } from './recipients/recipients.module';
@Module({ imports:[AuthModule,RecipientsModule],controllers: [HealthController], providers: [PrismaService] })
export class AppModule {}
