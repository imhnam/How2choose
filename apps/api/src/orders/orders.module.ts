import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GhnModule } from '../ghn/ghn.module';
import { LocationsModule } from '../locations/locations.module';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { VnpayController } from './vnpay.controller';
import { VnpayService } from './vnpay.service';

@Module({
  imports: [AuthModule, GhnModule, LocationsModule],
  controllers: [OrdersController, VnpayController],
  providers: [OrdersService, VnpayService, PrismaService],
  exports: [OrdersService],
})
export class OrdersModule {}