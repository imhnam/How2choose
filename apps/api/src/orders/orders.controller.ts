import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthRequest } from '../auth/auth.types';
import { SessionGuard } from '../auth/session.guard';
import { CreateOrderDto, OrderQuoteDto } from './order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
@UseGuards(SessionGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('quote')
  quote(@Req() request: AuthRequest, @Body() body: OrderQuoteDto) {
    return this.orders.quote(request.authUser!.id, body);
  }

  @Post()
  create(@Req() request: AuthRequest, @Headers('idempotency-key') key: string, @Body() body: CreateOrderDto) {
    return this.orders.create(request.authUser!.id, body, key, request.ip);
  }

  @Get()
  list(@Req() request: AuthRequest) {
    return this.orders.list(request.authUser!.id);
  }

  @Get(':id')
  get(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.orders.get(request.authUser!.id, id);
  }

  @Post(':id/cancel')
  cancel(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.orders.cancel(request.authUser!.id, id);
  }

  @Post(':id/shipment/retry')
  retryShipment(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.orders.retryShipment(request.authUser!.id, id);
  }
}