'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { api, CatalogProduct, Recipient } from '@/lib/api';
import { ProductCard } from '@/components/product-card';

export default function Home() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [productError, setProductError] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ items: CatalogProduct[] }>('/catalog/products?limit=5')
      .then(data => setProducts(data.items.slice(0, 5)))
      .catch(error => setProductError((error as Error).message))
      .finally(() => setLoading(false));
    api<Recipient[]>('/recipients').then(setRecipients).catch(error => {
      if ((error as { status?: number }).status !== 401) setRecipientError((error as Error).message);
    });
  }, []);

  return <>
    <main>
      <section className="page-container grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_.92fr] lg:gap-16">
        <div className="-translate-y-2 py-4 sm:-translate-y-4">
          <p className="eyebrow">Dành cho những người bạn quan tâm</p>
          <h1 className="mt-5 max-w-2xl text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-7xl">Quà hợp ý.<br /><span className="text-[#ff4d00]">Tình trọn vẹn</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#64756b]">How2choose giúp bạn chọn quà theo sở thích, dịp và ngân sách của từng người, ghi nhớ những món quà đã tặng để lần sau không bao giờ bị trùng.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link href="/recommendations" className="btn-accent">✧ Nhờ AI gợi ý</Link><Link href="/catalog" className="btn-outline">Xem catalog quà tặng</Link></div>
        </div>
        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="relative aspect-[1.13/1]">
            <Image src="/images/home-gift.png" alt="Hộp quà How2choose dành tặng cho bạn" fill priority sizes="(max-width: 1024px) 100vw, 560px" className="object-contain rotate-[3deg]" />
          </div>
          <Image src="/images/mascot/mascot-gift.png" alt="" width={553} height={786} className="pointer-events-none absolute -bottom-6 -left-2 hidden w-24 -rotate-6 select-none sm:block lg:-left-10 lg:w-32" />
        </div>
      </section>

      <section className="page-container py-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-3xl font-extrabold tracking-tight">Bắt đầu từ ai?</h2><p className="mt-2 text-sm text-[#64756b]">Chọn một hồ sơ có sẵn hoặc tạo mới để nhận gợi ý đúng người, đúng dịp.</p></div><Link href="/recipients" className="border-b border-[#ff4d00] pb-1 text-sm font-semibold no-underline">Xem tất cả hồ sơ →</Link></div>
        {recipientError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{recipientError}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {recipients.slice(0, 4).map((recipient, index) => <article key={recipient.id} className="surface flex min-h-44 flex-col p-4">
            <div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center overflow-hidden rounded-full font-bold ${index % 2 ? 'bg-[#e5ecdf]' : 'bg-[#fff0e8]'}`}>{recipient.avatarUrl?<Image src={recipient.avatarUrl} alt={`Ảnh đại diện ${recipient.displayName}`} width={40} height={40} unoptimized className="h-full w-full object-cover" />:recipient.displayName.slice(0, 2).toUpperCase()}</span><div><h3 className="font-bold">{recipient.relationship || recipient.displayName}</h3><p className="text-xs text-[#64756b]">{recipient.displayName}</p></div></div>
            <p className="mt-5 text-xs text-[#64756b]">Sở thích</p><p className="mt-1 line-clamp-1 text-sm">{recipient.interests.join(' · ') || 'Thêm sở thích để cá nhân hóa gợi ý'}</p>
            <Link href={`/recommendations?recipient=${encodeURIComponent(recipient.id)}`} className="mt-auto pt-4 text-sm font-bold no-underline">Tìm quà cho {recipient.displayName} →</Link>
          </article>)}
          <Link href="/recipients" className="flex min-h-44 flex-col justify-center rounded-2xl border border-dashed border-[#b9c7b9] p-5 no-underline hover:bg-white/60"><span className="grid h-9 w-9 place-items-center rounded-full border border-[#9cac9f] text-xl">+</span><strong className="mt-3">Tạo hồ sơ mới</strong><span className="mt-2 text-xs leading-5 text-[#64756b]">Lưu sở thích và điều họ không thích để lần sau chọn nhanh hơn.</span></Link>
        </div>
      </section>

      <section className="bg-[#edf1e8] py-12 sm:py-16">
        <div className="page-container grid gap-8 lg:grid-cols-[1.1fr_2fr]">
          <div><p className="eyebrow">Cách hoạt động</p><h2 className="mt-4 max-w-sm text-3xl font-extrabold">Chọn quà trong ba bước</h2><p className="mt-3 max-w-sm leading-6 text-[#64756b]">Bạn chỉ cần nhớ một lần. Những lần sau, mọi thứ đã sẵn sàng.</p></div>
          <div className="grid gap-7 sm:grid-cols-3">{[['01','Tạo hồ sơ','Lưu sở thích, điều không thích và những dịp quan trọng.'],['02','Nhận gợi ý','Tìm món quà phù hợp từ catalog quà tặng.'],['03','Chọn và gửi quà','Đặt hàng và gửi tặng đến người thân.']].map(([number,title,description]) => <article key={number}><span className=""></span><p className="mt-3 text-xs font-bold text-[#ff4d00]">{number}</p><h3 className="mt-2 font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#64756b]">{description}</p></article>)}</div>
        </div>
      </section>

      <section className="page-container py-14 sm:py-16">
        <div className="mb-7 flex items-end justify-between gap-4"><h2 className="text-3xl font-extrabold tracking-tight">Quà được yêu thích</h2><Link href="/catalog" className="border-b border-[#ff4d00] pb-1 text-sm font-semibold no-underline">Xem catalog quà tặng →</Link></div>
        {productError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{productError}</p>}
        {loading ? <div role="status" className="flex items-center gap-4 py-8 text-[#64756b]"><Image src="/images/mascot/mascot-laptop.png" alt="" width={223} height={289} className="w-14" /><p>Đang tải sản phẩm...</p></div> : products.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">{products.map(product => <ProductCard key={product.id} product={product} />)}</div> : !productError && <div className="flex items-center gap-4 py-8 text-[#64756b]"><Image src="/images/mascot/mascot-excited.png" alt="" width={226} height={278} className="w-16" /><p>Hiện chưa có sản phẩm nổi bật.</p></div>}
      </section>
    </main>
  </>;
}
