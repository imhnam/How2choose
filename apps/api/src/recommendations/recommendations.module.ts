import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { MediaModule } from '../media/media.module';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { UserThrottlerGuard } from './user-throttler.guard';

@Module({
  imports: [AuthModule, CatalogModule, MediaModule, ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }])],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, PrismaService, UserThrottlerGuard],
})
export class RecommendationsModule {}
