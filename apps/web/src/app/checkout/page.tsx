'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AddressSelector } from '@/components/address-selector';
import { api, DeliveryAddress, Recipient, toRecipientAddressInput } from '@/lib/api';
import { CartItem, getCart, removeFromCart } from '@/lib/cart';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
type Quote = {
  items: Array<{ variantId: string; productName: string; variantName: string; sku: string; quantity: number; unitPriceVnd: number; lineTotalVnd: number }>;
  subtotalVnd: number; shippingFeeVnd: number; totalVnd: number; expiresAt: string; quoteToken: string;
};
type Order = { id: string; status: string; shipmentStatus: string; ghnOrderCode: string | null; items: Array<{ variantId: string }> };

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [recipientProfiles, setRecipientProfiles] = useState<Recipient[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
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
  const [savingRecipient, setSavingRecipient] = useState(false);
  const [recipientSaved, setRecipientSaved] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const onAddressChange = useCallback((value: DeliveryAddress | null) => {
    setAddress(value);
    setQuote(null);
    setRecipientSaved(false);
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
  useEffect(() => {
    let active = true;
    const requestedRecipientId = new URLSearchParams(window.location.search).get('recipient');
    api<Recipient[]>('/recipients')
      .then(profiles => {
        if (!active) return;
        setRecipientProfiles(profiles);
        const selected = profiles.find(profile => profile.id === requestedRecipientId);
        if (requestedRecipientId && !selected) {
          setError('Không tìm thấy hồ sơ người nhận đã chọn. Vui lòng chọn lại.');
          return;
        }
        if (selected) {
          setSelectedRecipientId(selected.id);
          setRecipientName(selected.displayName);
          setPhone(selected.phone ?? '');
          setAddress(selected.address);
        }
      })
      .catch(reason => { if (active) setError((reason as Error).message); });
    return () => { active = false; };
  }, []);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.priceVnd * item.quantity, 0), [items]);
  const summaryItems = quote
    ? quote.items.map(item => ({ key: item.variantId, productName: item.productName, variantName: item.variantName, quantity: item.quantity, lineTotalVnd: item.lineTotalVnd }))
    : items.map(item => ({ key: item.key, productName: item.productName, variantName: item.variantLabel, quantity: item.quantity, lineTotalVnd: item.priceVnd * item.quantity }));
  const selectedRecipient = recipientProfiles.find(profile => profile.id === selectedRecipientId) ?? null;

  function selectRecipient(id: string) {
    const selected = recipientProfiles.find(profile => profile.id === id) ?? null;
    setSelectedRecipientId(selected?.id ?? '');
    setRecipientName(selected?.displayName ?? '');
    setPhone(selected?.phone ?? '');
    setAddress(selected?.address ?? null);
    setQuote(null);
    setRecipientSaved(false);
    idempotencyKey.current = null;
  }

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

  async function saveRecipientInfo() {
    if (!selectedRecipient) return;
    setError('');
    setRecipientSaved(false);
    setSavingRecipient(true);
    try {
      const updated = await api<Recipient>(`/recipients/${encodeURIComponent(selectedRecipient.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: recipientName.trim(),
          phone: phone.trim(),
          ...(address ? { address: toRecipientAddressInput(address) } : {}),
        }),
      });
      setRecipientProfiles(profiles => profiles.map(profile => profile.id === updated.id ? updated : profile));
      setRecipientName(updated.displayName);
      setPhone(updated.phone ?? '');
      setAddress(updated.address);
      setRecipientSaved(true);
    } catch (reason) { setError((reason as Error).message); }
    finally { setSavingRecipient(false); }
  }

  return <main className="page-container flex-1 py-8 sm:py-10">
    <ol aria-label="Tiến trình đặt hàng" className="mb-7 flex flex-wrap items-center gap-3 text-sm">
      <li className="flex items-center gap-2"><Link href="/cart" className="grid h-7 w-7 place-items-center rounded-full bg-[#193f32] text-white no-underline">✓</Link><Link href="/cart" className="font-semibold no-underline">Giỏ hàng</Link></li><span className="h-px w-8 bg-[#bac8bb]" />
      <li aria-current={quote ? undefined : 'step'} className={`flex items-center gap-2 ${quote ? 'text-[#64756b]' : 'font-bold'}`}><span className={`grid h-7 w-7 place-items-center rounded-full ${quote ? 'border border-[#bac8bb]' : 'bg-[#193f32] text-white'}`}>2</span>Địa chỉ và vận chuyển</li><span className="h-px w-8 bg-[#bac8bb]" />
      <li aria-current={quote ? 'step' : undefined} className={`flex items-center gap-2 ${quote ? 'font-bold' : 'text-[#64756b]'}`}><span className={`grid h-7 w-7 place-items-center rounded-full ${quote ? 'bg-[#193f32] text-white' : 'border border-[#bac8bb]'}`}>3</span>Thanh toán</li>
    </ol>
    <div className="flex flex-wrap items-end justify-between gap-4"><h1 className="text-4xl font-extrabold tracking-tight">Thanh toán</h1><Link href="/cart" className="text-sm font-semibold text-green-900 underline">Quay lại giỏ hàng</Link></div>
    {notice && <p role="status" className="mt-6 rounded-xl bg-[#edf1e8] p-4 text-sm text-green-900">{notice}</p>}
    {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {paidOrder?.status === 'PAID' && paidOrder.shipmentStatus === 'FAILED' && <button type="button" disabled={retryingShipment} onClick={retryShipment} className="mt-3 rounded-lg border border-green-900 px-4 py-2 text-sm font-semibold text-green-900 disabled:opacity-50">{retryingShipment ? 'Đang thử lại...' : 'Thử tạo lại vận đơn GHN'}</button>}
    {items.length === 0 ? <div className="surface mt-8 p-8"><p>Giỏ hàng đang trống.</p><Link href="/catalog" className="mt-4 inline-block font-semibold text-green-900 underline">Xem sản phẩm</Link></div> : <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
      <section className="surface p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Thông tin người nhận</h2>
        <label className="mt-4 block text-sm font-semibold">Hồ sơ người nhận<select value={selectedRecipientId} onChange={event => selectRecipient(event.target.value)} className="form-control mt-2"><option value="">Nhập thông tin thủ công</option>{recipientProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select></label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Họ và tên người nhận<input required maxLength={80} value={recipientName} onChange={event => { setRecipientName(event.target.value); setQuote(null); setRecipientSaved(false); }} className="form-control mt-2" /></label>
          <label className="text-sm font-semibold">Số điện thoại<input required inputMode="tel" maxLength={13} value={phone} onChange={event => { setPhone(event.target.value); setQuote(null); setRecipientSaved(false); }} placeholder="0912345678" className="form-control mt-2" /></label>
        </div>
        {selectedRecipient && <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" disabled={savingRecipient || !recipientName.trim() || !phone.trim()} onClick={saveRecipientInfo} className="btn-outline min-h-10 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50">{savingRecipient ? 'Đang lưu hồ sơ...' : 'Lưu thông tin này vào hồ sơ'}</button>{recipientSaved && <span role="status" className="text-sm text-green-800">Đã lưu thông tin vào hồ sơ.</span>}</div>}
        <label className="mt-4 block text-sm font-semibold">Lời nhắn trên thiệp <span className="font-normal text-[#64756b]">(không bắt buộc)</span><textarea maxLength={1000} value={deliveryNote} onChange={event => { setDeliveryNote(event.target.value); setQuote(null); }} placeholder="Viết lời chúc gửi đến người nhận..." className="form-control mt-2 min-h-24 resize-y" /></label>
        <p className="mt-2 text-xs text-[#64756b]">Phiếu giao hàng sẽ không in giá tiền.</p>
      </section>
      <section className="surface p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Địa chỉ giao hàng</h2>
        <div className="mt-4"><AddressSelector key={selectedRecipientId || 'manual-address'} initialAddress={selectedRecipient?.address ?? null} onChange={onAddressChange} /></div>
      </section>
      <section className="surface p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">Vận chuyển và thanh toán</h2>
        <div className="mt-4 rounded-xl border border-[#dfe5d9] bg-[#edf1e8] p-4"><p className="font-bold">Giao hàng GHN</p><p className="mt-1 text-sm text-[#64756b]">{quote ? `Phí vận chuyển ${money(quote.shippingFeeVnd)}` : 'Phí giao hàng sẽ được tính theo địa chỉ nhận.'}</p></div>
        <div className="mt-3 rounded-xl border border-[#dfe5d9] p-4"><p className="font-bold">VNPAY</p><p className="mt-1 text-sm text-[#64756b]">Thanh toán an toàn qua cổng VNPAY sandbox.</p></div>
        {address?.version === 'current' && <p className="text-sm text-amber-800">GHN staging hiện chưa có bảng quy đổi địa giới mới để tính phí. Chọn địa chỉ trước 01/07/2025 để tiếp tục.</p>}
        <button type="button" disabled={quoting || !address || address.version !== 'legacy' || !recipientName.trim() || !phone.trim() || items.length === 0} onClick={requestQuote} className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50">{quoting ? 'Đang lấy phí GHN...' : 'Tính phí giao hàng'}</button>
      </section>
      </div>
      <aside className="surface h-fit p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Đơn hàng của bạn</h2><Link href="/cart" className="text-xs font-semibold underline">Sửa</Link></div><ul className="mt-4 space-y-4">{summaryItems.map(item => <li key={item.key} className="flex justify-between gap-3 text-sm"><span className="min-w-0"><span className="block font-semibold">{item.productName}</span><span className="mt-1 block text-xs text-[#64756b]">{item.variantName} · SL {item.quantity}</span></span><span className="shrink-0 font-semibold">{money(item.lineTotalVnd)}</span></li>)}</ul>
        <p className="mt-4 flex justify-between border-t border-green-900/10 pt-4 text-sm"><span>Tạm tính</span><span>{money(quote?.subtotalVnd ?? subtotal)}</span></p>
        <p className="mt-2 flex justify-between text-sm"><span>Phí vận chuyển (GHN)</span><span>{quote ? money(quote.shippingFeeVnd) : 'Chưa tính'}</span></p>
        <p className="mt-3 flex justify-between border-t border-green-900/10 pt-4 font-extrabold"><span>Tổng cộng</span><span className="text-xl">{money(quote?.totalVnd ?? subtotal)}</span></p>
        {quote && <><p className="mt-3 text-xs text-stone-500">Báo giá hết hạn lúc {new Date(quote.expiresAt).toLocaleTimeString('vi-VN')}.</p><button type="button" disabled={placing} onClick={placeOrder} className="mt-4 w-full rounded-lg bg-green-900 px-5 py-3 font-semibold text-white disabled:opacity-50">{placing ? 'Đang tạo đơn...' : 'Đặt hàng và thanh toán VNPAY'}</button></>}
        {address && <p className="mt-4 border-t border-[#edf1e8] pt-3 text-xs leading-5 text-[#64756b]">{address.addressLine}, {address.ward.name}{address.district ? `, ${address.district.name}` : ''}, {address.province.name}</p>}
      </aside>
    </div>}
  </main>;
}
