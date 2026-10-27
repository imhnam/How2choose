import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { OrdersModule } from '../orders/orders.module';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminLoginThrottlerGuard } from './admin-login-throttler.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuthModule,
    MediaModule,
    OrdersModule,
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 10 }]),
  ],
  controllers: [AdminAuthController, AdminController],
  providers: [AdminService, PrismaService, AdminLoginThrottlerGuard],
})
export class AdminModule {}
