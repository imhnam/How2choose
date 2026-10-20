import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Response } from 'express';
import { OrdersService } from './orders.service';

@ApiExcludeController()
@Controller('payments/vnpay')
export class VnpayController {
  constructor(private readonly orders: OrdersService) {}

  @Get('ipn')
  ipn(@Query() query: Record<string, unknown>) {
    return this.orders.handleVnpayIpn(query);
  }

  @Get('return')
  async paymentReturn(@Query() query: Record<string, unknown>, @Res() response: Response) {
    const webOrigin = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
    if (!this.orders.verifyVnpayReturn(query)) return response.redirect(`${webOrigin}/checkout?payment=invalid`);
    const txnRef = typeof query.vnp_TxnRef === 'string' ? query.vnp_TxnRef : '';
    const payment = txnRef ? await this.orders.findByTxnRef(txnRef) : null;
    if (!payment) return response.redirect(`${webOrigin}/checkout?payment=unknown`);
    const result = query.vnp_ResponseCode === '00' && query.vnp_TransactionStatus === '00' ? 'processing' : 'failed';
    return response.redirect(`${webOrigin}/checkout?payment=${result}&orderId=${encodeURIComponent(payment.orderId)}`);
  }
}