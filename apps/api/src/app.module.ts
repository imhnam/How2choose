import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { RecipientsModule } from './recipients/recipients.module';
import { MediaModule } from './media/media.module';
import { CatalogModule } from './catalog/catalog.module';
@Module({ imports:[AuthModule,RecipientsModule,MediaModule,CatalogModule],controllers: [HealthController], providers: [PrismaService] })
export class AppModule {}
