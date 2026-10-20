'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CartItem, CART_UPDATED_EVENT, cartCount, clearCart, getCart, removeFromCart, updateCartQuantity } from '@/lib/cart';
import { ProductArtwork } from '@/components/product-artwork';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { const sync = () => setItems(getCart()); const timer = window.setTimeout(sync, 0); window.addEventListener(CART_UPDATED_EVENT, sync); return () => { window.clearTimeout(timer); window.removeEventListener(CART_UPDATED_EVENT, sync); }; }, []);
  const subtotal = useMemo(() => items.reduce((total, item) => total + item.priceVnd * item.quantity, 0), [items]);
  const count = cartCount(items);
  function update(key: string, quantity: number) { updateCartQuantity(key, quantity); setItems(getCart()); }
  function remove(key: string) { removeFromCart(key); setItems(getCart()); }
  function empty() { clearCart(); setItems([]); }

  return <main className="page-container flex-1 py-8 sm:py-10">
    <ol aria-label="Tiến trình đặt hàng" className="mb-7 flex flex-wrap items-center gap-3 text-sm">
      <li aria-current="step" className="flex items-center gap-2 font-bold"><span className="grid h-7 w-7 place-items-center rounded-full bg-[#193f32] text-white">1</span>Giỏ hàng</li><span className="h-px w-8 bg-[#bac8bb]" />
      <li className="flex items-center gap-2 text-[#64756b]"><span className="grid h-7 w-7 place-items-center rounded-full border border-[#bac8bb]">2</span>Địa chỉ và vận chuyển</li><span className="h-px w-8 bg-[#bac8bb]" /><li className="flex items-center gap-2 text-[#64756b]"><span className="grid h-7 w-7 place-items-center rounded-full border border-[#bac8bb]">3</span>Thanh toán</li>
    </ol>
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><h1 className="text-4xl font-extrabold tracking-tight">Giỏ hàng</h1>{items.length > 0 && <button type="button" onClick={empty} className="text-sm text-[#64756b] underline">Xóa tất cả</button>}</div>
    {items.length === 0 ? <section className="surface mx-auto my-12 max-w-xl p-10 text-center"><span className="text-4xl">♧</span><h2 className="mt-4 text-xl font-bold">Giỏ hàng đang trống</h2><p className="mt-2 text-[#64756b]">Hãy bắt đầu chọn một món quà phù hợp.</p><Link href="/catalog" className="btn-primary mt-6">Khám phá quà tặng</Link></section> : <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe5d9] bg-[#edf1e8] px-5 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-white font-bold">♡</span><div><p className="text-sm font-bold">Món quà dành tặng người đặc biệt</p><p className="mt-1 text-xs text-[#64756b]">Bạn đã chọn {count} sản phẩm</p></div></div><Link href="/recipients" className="text-sm font-semibold underline">Chọn người nhận</Link></div>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-label="Sản phẩm trong giỏ" className="space-y-4">{items.map(item => <article key={item.key} className="surface flex gap-4 p-4 sm:gap-5 sm:p-5">
          <Link href={`/catalog/${item.slug}`} className="block w-24 shrink-0 overflow-hidden rounded-xl sm:w-28">
            {item.imageUrl ? <div className="relative aspect-square"><Image src={item.imageUrl} alt={item.productName} fill unoptimized className="object-cover" /></div> : <ProductArtwork name={item.productName} className="aspect-square" />}
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3"><div><Link href={`/catalog/${item.slug}`} className="font-bold no-underline hover:underline">{item.productName}</Link><p className="mt-1 text-sm text-[#64756b]">{item.variantLabel}</p><p className="mt-2 text-sm text-[#64756b]">Đơn giá {money(item.priceVnd)}</p></div><strong className="shrink-0">{money(item.priceVnd * item.quantity)}</strong></div>
            <div className="mt-4 flex items-center justify-between"><div className="flex items-center rounded-full border border-[#dfe5d9] bg-white"><button type="button" aria-label={`Giảm ${item.productName}`} onClick={() => update(item.key, item.quantity - 1)} disabled={item.quantity <= 1} className="h-9 w-9 disabled:opacity-40">−</button><span className="w-7 text-center text-sm">{item.quantity}</span><button type="button" aria-label={`Tăng ${item.productName}`} onClick={() => update(item.key, item.quantity + 1)} disabled={item.quantity >= item.stock} className="h-9 w-9 disabled:opacity-40">+</button></div><button type="button" onClick={() => remove(item.key)} className="text-xs font-semibold text-[#64756b] underline">Xóa</button></div>
          </div>
        </article>)}</section>
        <aside className="surface p-5 sm:p-6"><h2 className="text-lg font-extrabold">Tóm tắt đơn hàng</h2><label className="mt-5 flex gap-2"><input disabled placeholder="Mã giảm giá" className="form-control min-w-0" /><button type="button" disabled className="btn-outline min-h-10 px-4 text-xs opacity-60">Áp dụng</button></label><p className="mt-5 flex justify-between text-sm"><span className="text-[#64756b]">Tạm tính ({count} sản phẩm)</span><span>{money(subtotal)}</span></p><p className="mt-3 flex justify-between text-sm"><span className="text-[#64756b]">Phí vận chuyển</span><span>Tính sau</span></p><p className="mt-4 flex justify-between border-t border-[#dfe5d9] pt-4 font-bold"><span>Tổng cộng</span><span className="text-xl">{money(subtotal)}</span></p><Link href="/checkout" className="btn-accent mt-5 w-full">Tiến hành thanh toán</Link><p className="mt-4 text-xs leading-5 text-[#64756b]">🔒 Thanh toán an toàn qua VNPAY<br />♧ Giao hàng bởi GHN</p></aside>
      </div>
      <Link href="/catalog" className="mt-5 inline-block text-sm font-semibold underline">← Tiếp tục chọn quà</Link>
    </>}
  </main>;
}
