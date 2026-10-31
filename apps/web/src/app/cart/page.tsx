'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CART_UPDATED_EVENT, CartItem, cartCount, getCart, removeFromCart, removeManyFromCart, updateCartQuantity } from '@/lib/cart';
import { ProductArtwork } from '@/components/product-artwork';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

function CartCheckbox({ checked, indeterminate = false, onChange, label, className = '' }: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} onChange={onChange} aria-label={label} className={`h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#193f32] ${className}`} />;
}

function QuantityStepper({ item, onChange, compact = false }: { item: CartItem; onChange: (quantity: number) => void; compact?: boolean }) {
  const size = compact ? 'h-8 w-8' : 'h-9 w-9';
  return <div className="inline-flex items-center overflow-hidden rounded-lg border border-[#d7dfd3] bg-white">
    <button type="button" aria-label={`Giảm số lượng ${item.productName}`} onClick={() => onChange(item.quantity - 1)} disabled={item.quantity <= 1} className={`${size} grid place-items-center text-lg leading-none transition hover:bg-[#f3f5ef] disabled:cursor-not-allowed disabled:opacity-35`}>−</button>
    <span aria-live="polite" className="min-w-9 border-x border-[#e6ebe2] px-1 text-center text-sm font-semibold">{item.quantity}</span>
    <button type="button" aria-label={`Tăng số lượng ${item.productName}`} onClick={() => onChange(item.quantity + 1)} disabled={item.quantity >= item.stock} className={`${size} grid place-items-center text-lg leading-none transition hover:bg-[#f3f5ef] disabled:cursor-not-allowed disabled:opacity-35`}>+</button>
  </div>;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const selectedKeysRef = useRef<Set<string>>(new Set());
  const knownKeysRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);

  const refresh = useCallback(() => {
    const next = getCart();
    const nextKeys = new Set(next.map(item => item.key));
    let selection: Set<string>;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      selection = new Set(nextKeys);
    } else {
      selection = new Set([...selectedKeysRef.current].filter(key => nextKeys.has(key)));
      for (const key of nextKeys) {
        if (!knownKeysRef.current.has(key)) selection.add(key);
      }
    }
    knownKeysRef.current = nextKeys;
    selectedKeysRef.current = selection;
    setSelectedKeys(selection);
    setItems(next);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CART_UPDATED_EVENT, refresh);
  }, [refresh]);

  const selectedItems = useMemo(() => items.filter(item => selectedKeys.has(item.key)), [items, selectedKeys]);
  const selectedQuantity = useMemo(() => selectedItems.reduce((total, item) => total + item.quantity, 0), [selectedItems]);
  const selectedSubtotal = useMemo(() => selectedItems.reduce((total, item) => total + item.priceVnd * item.quantity, 0), [selectedItems]);
  const discountVnd = 0;
  const totalVnd = selectedSubtotal - discountVnd;
  const allSelected = items.length > 0 && selectedKeys.size === items.length;
  const someSelected = selectedKeys.size > 0 && !allSelected;
  const count = cartCount(items);
  const checkoutHref = selectedItems.length > 0 && selectedItems.length < items.length
    ? `/checkout?items=${selectedItems.map(item => encodeURIComponent(item.key)).join(',')}`
    : '/checkout';

  function chooseSelection(next: Set<string>) {
    selectedKeysRef.current = next;
    setSelectedKeys(next);
  }

  function toggle(key: string) {
    const next = new Set(selectedKeysRef.current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    chooseSelection(next);
  }

  function toggleAll() {
    if (!items.length) return;
    chooseSelection(selectedKeysRef.current.size === items.length ? new Set() : new Set(items.map(item => item.key)));
  }

  function update(key: string, quantity: number) {
    updateCartQuantity(key, quantity);
    refresh();
  }

  function remove(key: string) {
    removeFromCart(key);
    refresh();
  }

  function removeSelected() {
    const keys = [...selectedKeysRef.current];
    if (!keys.length) return;
    if (!window.confirm(`Xóa ${keys.length} sản phẩm đã chọn khỏi giỏ hàng?`)) return;
    removeManyFromCart(keys);
    refresh();
  }

  return <main className="page-container flex-1 py-8 sm:py-10">
    <ol aria-label="Tiến trình đặt hàng" className="mb-7 flex flex-wrap items-center gap-3 text-sm">
      <li aria-current="step" className="flex items-center gap-2 font-bold"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#193f32] text-white">1</span>Giỏ hàng</li><span className="h-px w-8 bg-[#bac8bb]" />
      <li className="flex items-center gap-2 text-[#64756b]"><span className="grid h-7 w-7 place-items-center rounded-full border border-[#bac8bb]">2</span>Người nhận và vận chuyển</li><span className="h-px w-8 bg-[#bac8bb]" />
      <li className="flex items-center gap-2 text-[#64756b]"><span className="grid h-7 w-7 place-items-center rounded-full border border-[#bac8bb]">3</span>Thanh toán</li>
    </ol>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight">Giỏ hàng</h1>
      </div>
      <Link href="/catalog" className="text-sm font-semibold underline underline-offset-4">← Tiếp tục chọn quà</Link>
    </div>

    {items.length === 0 ? <section className="surface mx-auto my-12 max-w-xl p-10 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#edf1e8] text-[#193f32]">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5.5 8.5h13l1 11h-15l1-11Z" /><path d="M9 9V6.8a3 3 0 0 1 6 0V9" strokeLinecap="round" /></svg>
      </span>
      <h2 className="mt-4 text-xl font-bold">Giỏ hàng đang trống</h2>
      <p className="mt-2 text-[#64756b]">Hãy bắt đầu chọn một món quà phù hợp.</p>
      <Link href="/catalog" className="btn-primary mt-6">Khám phá quà tặng</Link>
    </section> : <>
      <section aria-label="Sản phẩm trong giỏ" className="overflow-hidden rounded-2xl border border-[#dfe5d9] bg-white">
        <div className="hidden border-b border-[#e8ece3] bg-[#fbfaf6] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#64756b] lg:grid lg:grid-cols-[40px_minmax(0,1fr)_130px_110px_140px_120px_80px] lg:items-center lg:gap-x-4">
          <CartCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} label="Chọn tất cả sản phẩm trong giỏ" />
          <span>Sản phẩm</span>
          <span>Phân loại</span>
          <span>Đơn giá</span>
          <span className="text-center">Số lượng</span>
          <span className="text-right">Số tiền</span>
          <span className="text-center">Thao tác</span>
        </div>
        <ul>
          {items.map(item => <li key={item.key} className="border-b border-[#eef1ea] last:border-b-0">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 px-4 py-4 lg:grid-cols-[40px_minmax(0,1fr)_130px_110px_140px_120px_80px] lg:items-center lg:gap-x-4 lg:px-5 lg:py-5">
              <CartCheckbox checked={selectedKeys.has(item.key)} onChange={() => toggle(item.key)} label={`Chọn ${item.productName}`} className="mt-1 lg:mt-0" />
              <div className="flex min-w-0 gap-3 lg:gap-4">
                <Link href={`/catalog/${item.slug}`} aria-label={`Xem ${item.productName}`} className="block w-20 shrink-0 self-start overflow-hidden rounded-xl border border-[#e8ece3] lg:w-24">
                  <ProductArtwork name={item.productName} imageUrl={item.imageUrl} className="aspect-square" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/catalog/${item.slug}`} className="line-clamp-2 text-sm font-semibold leading-5 no-underline hover:text-[#ff4d00] lg:text-[15px]">{item.productName}</Link>
                  <p className="mt-1 text-[11px] text-[#8a978f]">SKU: {item.sku}</p>
                  {item.originalPriceVnd > item.priceVnd && <p className="mt-1 text-xs text-[#9aa59d] line-through lg:hidden">{money(item.originalPriceVnd)}</p>}
                </div>
              </div>
              <div className="col-start-2 space-y-2.5 lg:hidden">
                <p className="text-xs leading-5 text-[#64756b]"><span className="font-semibold text-[#43564a]">Phân loại:</span> {item.variantLabel}</p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{money(item.priceVnd)}</span>
                  <QuantityStepper item={item} onChange={quantity => update(item.key, quantity)} compact />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#64756b]">Thành tiền <strong className="ml-1 text-[15px] text-[#193f32]">{money(item.priceVnd * item.quantity)}</strong></span>
                  <button type="button" onClick={() => remove(item.key)} className="text-xs font-semibold text-[#b42318] underline underline-offset-2">Xóa</button>
                </div>
              </div>
              <p className="hidden min-w-0 text-xs leading-5 text-[#64756b] lg:block">{item.variantLabel}</p>
              <div className="hidden lg:block">
                <span className="text-sm font-semibold">{money(item.priceVnd)}</span>
                {item.originalPriceVnd > item.priceVnd && <span className="mt-0.5 block text-xs text-[#9aa59d] line-through">{money(item.originalPriceVnd)}</span>}
              </div>
              <div className="hidden lg:flex lg:justify-center"><QuantityStepper item={item} onChange={quantity => update(item.key, quantity)} /></div>
              <p className="hidden text-right text-sm font-bold lg:block">{money(item.priceVnd * item.quantity)}</p>
              <div className="hidden text-center lg:block"><button type="button" onClick={() => remove(item.key)} className="text-xs font-semibold text-[#b42318] hover:underline">Xóa</button></div>
            </div>
          </li>)}
        </ul>
      </section>

      <section aria-label="Tổng kết giỏ hàng" className="mt-4 overflow-hidden rounded-2xl border border-[#dfe5d9] bg-white shadow-[0_12px_40px_rgba(25,63,50,0.10)] lg:sticky lg:bottom-4 lg:z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1ea] bg-[#fbfaf6] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#fff0e8] text-[#ff4d00]">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5v-2a2.5 2.5 0 0 0 0-5v-2Z" /><path d="M13 8v1m0 2.5v1m0 2.5v1" strokeLinecap="round" /></svg>
            </span>
            <div>
              <p className="text-sm font-bold">Mã giảm giá</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input disabled placeholder="Nhập mã giảm giá" aria-label="Mã giảm giá" title="Chưa hỗ trợ mã giảm giá" className="h-9 w-40 rounded-lg border border-[#dfe5d9] bg-white px-3 text-sm outline-none placeholder:text-[#9aa59d] disabled:cursor-not-allowed disabled:bg-[#f7f7f2] sm:w-52" />
            <button type="button" disabled title="Chưa hỗ trợ mã giảm giá" className="h-9 rounded-lg bg-[#193f32] px-4 text-xs font-bold text-white opacity-40">Áp dụng</button>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-x-5 gap-y-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-2.5">
            <CartCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} label="Chọn tất cả sản phẩm" />
            <button type="button" onClick={toggleAll} className="text-sm font-semibold hover:text-[#ff4d00]">Chọn tất cả ({items.length})</button>
          </div>
          <span aria-hidden="true" className="hidden h-5 w-px bg-[#dfe5d9] sm:block" />
          <button type="button" onClick={removeSelected} disabled={!selectedKeys.size} className="text-sm font-semibold text-[#b42318] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-[#9aa59d] disabled:no-underline">Xóa</button>
          <div className="ml-auto flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <dl className="w-full space-y-1.5 text-sm sm:w-[330px]">
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-[#64756b]">Tổng tiền hàng ({selectedQuantity} sản phẩm)</dt>
                <dd className="font-semibold">{money(selectedSubtotal)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-[#64756b]">Phí giao hàng</dt>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-[#64756b]">Giảm giá</dt>
                <dd className="font-semibold">{money(discountVnd)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6 border-t border-[#eef1ea] pt-2">
                <dt className="font-bold">Tổng cộng</dt>
                <dd className="text-2xl font-extrabold leading-none text-[#ff4d00]">{money(totalVnd)}</dd>
              </div>
            </dl>
            <div className="flex w-full sm:w-auto">
              {selectedKeys.size > 0
                ? <Link href={checkoutHref} className="btn-accent min-h-11 w-full px-6 sm:w-auto">Mua hàng</Link>
                : <span aria-disabled="true" className="btn-accent min-h-11 w-full cursor-not-allowed px-6 opacity-40 sm:w-auto">Mua hàng</span>}
            </div>
          </div>
        </div>
      </section>
    </>}
  </main>;
}
