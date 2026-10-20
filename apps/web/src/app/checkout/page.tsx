'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddressSelector } from '@/components/address-selector';
import { api, DeliveryAddress } from '@/lib/api';
import { CartItem, getCart, removeFromCart } from '@/lib/cart';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
type Quote = {
  items: Array<{ variantId: string; productName: string; variantName: string; sku: string; quantity: number; unitPriceVnd: number; lineTotalVnd: number }>;
  subtotalVnd: number; shippingFeeVnd: number; totalVnd: number; expiresAt: string; quoteToken: string;
};
type Order = { id: string; status: string; shipmentStatus: string; ghnOrderCode: string | null; items: Array<{ variantId: string }> };

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [retryingShipment, setRetryingShipment] = useState(false);
  const [paidOrder, setPaidOrder] = useState<Order | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const onAddressChange = useCallback((value: DeliveryAddress | null) => {
    setAddress(value);
    setQuote(null);
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => setItems(getCart()), 0);
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('orderId');
    if (params.has('payment')) {
      if (!orderId) Promise.resolve().then(() => setNotice(params.get('payment') === 'invalid' ? 'Không xác minh được kết quả thanh toán.' : 'Chưa nhận được thông tin đơn hàng.'));
      else api<Order>(`/orders/${encodeURIComponent(orderId)}`).then(order => {
        if (order.status === 'PAID') {
          setPaidOrder(order);
          setNotice(order.shipmentStatus === 'CREATED' ? `Thanh toán thành công. Mã vận đơn GHN: ${order.ghnOrderCode}` : order.shipmentStatus === 'FAILED' ? 'Thanh toán thành công nhưng GHN chưa tạo được vận đơn.' : 'Thanh toán thành công. Đang tạo vận đơn GHN.');
          getCart().filter(item => order.items.some(line => line.variantId === item.variantId)).forEach(item => removeFromCart(item.key));
          setItems(getCart());
        } else if (order.status === 'PENDING_PAYMENT') setNotice('VNPAY đang xác nhận giao dịch. Trạng thái đơn sẽ được cập nhật sau khi máy chủ nhận thông báo.');
        else setNotice(`Thanh toán chưa hoàn tất (${order.status}).`);
      }).catch(reason => setNotice((reason as Error).message));
    }
    return () => window.clearTimeout(timer);
  }, []);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.priceVnd * item.quantity, 0), [items]);
  const summaryItems = quote
    ? quote.items.map(item => ({ key: item.variantId, productName: item.productName, variantName: item.variantName, quantity: item.quantity, lineTotalVnd: item.lineTotalVnd }))
    : items.map(item => ({ key: item.key, productName: item.productName, variantName: item.variantLabel, quantity: item.quantity, lineTotalVnd: item.priceVnd * item.quantity }));

  const requestData = () => {
    if (!address) throw new Error('Vui lòng nhập địa chỉ giao hàng.');
    return {
      items: items.map(item => ({ variantId: item.variantId, quantity: item.quantity })),
      recipientName: recipientName.trim(), phone: phone.trim(), addressVersion: address.version,
      provinceCode: address.province.code, districtCode: address.district?.code ?? undefined,
      wardCode: address.ward.code, addressLine: address.addressLine, deliveryNote: deliveryNote.trim() || undefined,
    };
  };

  async function requestQuote() {
    setError(''); setNotice(''); setQuote(null); setQuoting(true); idempotencyKey.current = null;
    try {
      const data = await api<Quote>('/orders/quote', { method: 'POST', body: JSON.stringify(requestData()) });
      setQuote(data);
    } catch (reason) { setError((reason as Error).message); }
    finally { setQuoting(false); }
  }

  async function placeOrder() {
    if (!quote) return;
    setError(''); setPlacing(true);
    try {
      const key = idempotencyKey.current ?? crypto.randomUUID();
      idempotencyKey.current = key;
      const result = await api<{ order: Order; paymentUrl: string | null }>('/orders', {
        method: 'POST', headers: { 'Idempotency-Key': key },
        body: JSON.stringify({ ...requestData(), quoteToken: quote.quoteToken }),
      });
      if (result.paymentUrl) window.location.assign(result.paymentUrl);
      else if (result.order.status === 'PAID') setNotice('Đơn đã thanh toán.');
      else setNotice('Đơn đã được tạo nhưng chưa có URL thanh toán.');
    } catch (reason) { setError((reason as Error).message); }
    finally { setPlacing(false); }
  }

  async function retryShipment() {
    if (!paidOrder) return;
    setRetryingShipment(true); setError('');
    try {
      const order = await api<Order>(`/orders/${encodeURIComponent(paidOrder.id)}/shipment/retry`, { method: 'POST' });
      setPaidOrder(order);
      setNotice(order.shipmentStatus === 'CREATED' ? `Đã tạo vận đơn GHN: ${order.ghnOrderCode}` : 'GHN vẫn chưa tạo được vận đơn.');
    } catch (reason) { setError((reason as Error).message); }
    finally { setRetryingShipment(false); }
  }

  return <main className="mx-auto max-w-5xl px-6 py-8 sm:px-12">
    <header className="flex items-center justify-between border-b border-green-900/15 pb-6"><Link href="/" className="text-xl font-bold">How2choose</Link><Link href="/cart" className="text-sm font-semibold text-green-900">Quay lại giỏ hàng</Link></header>
    <h1 className="mt-10 text-4xl font-semibold">Thông tin giao hàng</h1>
    {notice && <p role="status" className="mt-6 rounded-xl bg-green-50 p-4 text-sm text-green-900">{notice}</p>}
    {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {paidOrder?.status === 'PAID' && paidOrder.shipmentStatus === 'FAILED' && <button type="button" disabled={retryingShipment} onClick={retryShipment} className="mt-3 rounded-lg border border-green-900 px-4 py-2 text-sm font-semibold text-green-900 disabled:opacity-50">{retryingShipment ? 'Đang thử lại...' : 'Thử tạo lại vận đơn GHN'}</button>}
    {items.length === 0 ? <div className="mt-8 rounded-2xl bg-white p-8"><p>Giỏ hàng đang trống.</p><Link href="/catalog" className="mt-4 inline-block font-semibold text-green-900 underline">Xem sản phẩm</Link></div> : <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
      <section className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Tên người nhận *<input required maxLength={80} value={recipientName} onChange={event => { setRecipientName(event.target.value); setQuote(null); }} className="mt-2 w-full rounded-lg border border-green-900/15 bg-white px-3 py-3" /></label>
          <label className="text-sm font-medium">Số điện thoại *<input required inputMode="tel" maxLength={13} value={phone} onChange={event => { setPhone(event.target.value); setQuote(null); }} placeholder="0912345678" className="mt-2 w-full rounded-lg border border-green-900/15 bg-white px-3 py-3" /></label>
        </div>
        <AddressSelector onChange={onAddressChange} />
        <label className="block text-sm font-medium">Ghi chú giao hàng<input maxLength={1000} value={deliveryNote} onChange={event => { setDeliveryNote(event.target.value); setQuote(null); }} className="mt-2 w-full rounded-lg border border-green-900/15 bg-white px-3 py-3" /></label>
        {address?.version === 'current' && <p className="text-sm text-amber-800">GHN staging hiện chưa có bảng quy đổi địa giới mới để tính phí. Chọn địa chỉ trước 01/07/2025 để tiếp tục.</p>}
        <button type="button" disabled={quoting || !address || address.version !== 'legacy' || !recipientName.trim() || !phone.trim() || items.length === 0} onClick={requestQuote} className="rounded-lg bg-green-900 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{quoting ? 'Đang lấy phí GHN...' : 'Tính phí giao hàng'}</button>
      </section>
      <aside className="h-fit rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2><ul className="mt-4 space-y-3">{summaryItems.map(item => <li key={item.key} className="flex justify-between gap-3 text-sm"><span>{item.productName} · {item.variantName} × {item.quantity}</span><span className="shrink-0">{money(item.lineTotalVnd)}</span></li>)}</ul>
        <p className="mt-4 flex justify-between border-t border-green-900/10 pt-4 text-sm"><span>Tạm tính</span><span>{money(quote?.subtotalVnd ?? subtotal)}</span></p>
        <p className="mt-2 flex justify-between text-sm"><span>Phí giao GHN</span><span>{quote ? money(quote.shippingFeeVnd) : 'Chưa tính'}</span></p>
        <p className="mt-3 flex justify-between border-t border-green-900/10 pt-4 font-semibold"><span>Tổng thanh toán</span><span>{money(quote?.totalVnd ?? subtotal)}</span></p>
        {quote && <><p className="mt-3 text-xs text-stone-500">Báo giá hết hạn lúc {new Date(quote.expiresAt).toLocaleTimeString('vi-VN')}.</p><button type="button" disabled={placing} onClick={placeOrder} className="mt-4 w-full rounded-lg bg-green-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{placing ? 'Đang tạo đơn...' : 'Đặt hàng và thanh toán VNPAY'}</button></>}
        {address && <p className="mt-4 text-sm text-stone-600">{address.addressLine}, {address.ward.name}{address.district ? `, ${address.district.name}` : ''}, {address.province.name}</p>}
      </aside>
    </div>}
  </main>;
}
