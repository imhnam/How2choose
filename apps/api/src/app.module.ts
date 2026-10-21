import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { RecipientsModule } from './recipients/recipients.module';
import { MediaModule } from './media/media.module';
import { CatalogModule } from './catalog/catalog.module';
import { LocationsModule } from './locations/locations.module';
import { OrdersModule } from './orders/orders.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
@Module({ imports:[AuthModule,RecipientsModule,MediaModule,CatalogModule,LocationsModule,OrdersModule,RecommendationsModule],controllers: [HealthController], providers: [PrismaService] })
export class AppModule {}
