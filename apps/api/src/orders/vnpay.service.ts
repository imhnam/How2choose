import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';

type VnpayParams = Record<string, string>;

function encode(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%20/g, '+');
}

function vnDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}${value.month}${value.day}${value.hour}${value.minute}${value.second}`;
}

@Injectable()
export class VnpayService {
  private readonly payUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

  private config() {
    const tmnCode = process.env.VNPAY_TMN_CODE?.trim();
    const hashSecret = process.env.VNPAY_HASH_SECRET?.trim();
    const apiPublicUrl = process.env.API_PUBLIC_URL?.trim();
    const ipnUrl = process.env.VNPAY_IPN_URL?.trim();
    if (!tmnCode || !hashSecret || !apiPublicUrl || !ipnUrl) throw new ServiceUnavailableException('VNPAY sandbox chưa được cấu hình đầy đủ.');
    if (!apiPublicUrl.startsWith('https://') || !ipnUrl.startsWith('https://')) throw new ServiceUnavailableException('VNPAY return/IPN URL phải dùng HTTPS công khai.');
    return { tmnCode, hashSecret, apiPublicUrl: apiPublicUrl.replace(/\/$/, '') };
  }

  assertConfigured() {
    this.config();
  }

  createPaymentUrl(input: { txnRef: string; amountVnd: number; orderNumber: string; expiresAt: Date; ipAddress?: string }) {
    const { tmnCode, hashSecret, apiPublicUrl } = this.config();
    const params: VnpayParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(input.amountVnd * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: input.txnRef,
      vnp_OrderInfo: `Thanh toan don hang ${input.orderNumber}`,
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: `${apiPublicUrl}/api/payments/vnpay/return`,
      vnp_IpAddr: input.ipAddress?.replace(/^::ffff:/, '').slice(0, 45) || '127.0.0.1',
      vnp_CreateDate: vnDate(new Date()),
      vnp_ExpireDate: vnDate(input.expiresAt),
    };
    const query = this.canonical(params);
    const signature = createHmac('sha512', hashSecret).update(query).digest('hex');
    return `${this.payUrl}?${query}&vnp_SecureHash=${signature}`;
  }

  isValidSignature(params: Record<string, unknown>) {
    const { hashSecret } = this.config();
    const signature = typeof params.vnp_SecureHash === 'string' ? params.vnp_SecureHash : '';
    if (!/^[a-f\d]{128}$/i.test(signature)) return false;
    const values: VnpayParams = {};
    for (const [key, value] of Object.entries(params)) {
      if (!key.startsWith('vnp_') || key === 'vnp_SecureHash' || key === 'vnp_SecureHashType' || typeof value !== 'string') continue;
      values[key] = value;
    }
    const expected = createHmac('sha512', hashSecret).update(this.canonical(values)).digest();
    const received = Buffer.from(signature, 'hex');
    return received.length === expected.length && timingSafeEqual(received, expected);
  }

  private canonical(params: VnpayParams) {
    return Object.keys(params).sort().map(key => `${encode(key)}=${encode(params[key])}`).join('&');
  }
}