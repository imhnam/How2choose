'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, CatalogProduct, Recipient } from '@/lib/api';
import { ProductArtwork } from '@/components/product-artwork';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export default function RecommendationPage({ initialRecipient }: { initialRecipient?: string }) {
  const router = useRouter();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [budget, setBudget] = useState(700000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api<Recipient[]>('/recipients'), api<{ items: CatalogProduct[] }>('/catalog/products?limit=8')])
      .then(([people, catalog]) => {
        if (!active) return;
        setRecipients(people);
        setProducts(catalog.items);
        const selected = people.find(person => person.id === initialRecipient) ?? people[0] ?? null;
        setRecipient(selected);
      })
      .catch(reason => {
        if (!active) return;
        if ((reason as { status?: number }).status === 401) router.replace('/login');
        else setError((reason as Error).message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialRecipient, router]);

  function selectRecipient(value: string) {
    const selected = recipients.find(person => person.id === value) ?? null;
    setRecipient(selected);
    router.replace(selected ? `/recommendations?recipient=${encodeURIComponent(selected.id)}` : '/recommendations');
  }

  if (loading) return <main className="page-container min-h-[50vh] flex-1 py-16" role="status">Đang tải thông tin người nhận và quà tặng...</main>;

  return <main className="page-container flex-1 py-8 sm:py-10">
    <p className="eyebrow">Gợi ý quà bằng AI</p><h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Tìm quà cho {recipient?.displayName ?? 'người bạn quan tâm'}</h1>
    <section aria-label="Chọn người nhận" className="mt-5 flex gap-5 overflow-x-auto rounded-2xl border border-[#dfe5d9] bg-white p-4">
      {recipients.length ? recipients.map(person => <button key={person.id} type="button" aria-pressed={recipient?.id === person.id} onClick={() => selectRecipient(person.id)} className="flex w-20 shrink-0 flex-col items-center gap-2 rounded-xl p-2 text-center hover:bg-[#f4f6f1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#193f32]">
        <span className={`grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-[#edf1e8] font-bold ring-2 ring-offset-2 ${recipient?.id === person.id ? 'ring-[#193f32]' : 'ring-transparent'}`}>
          {person.avatarUrl ? <Image src={person.avatarUrl} alt="" width={56} height={56} unoptimized className="h-full w-full object-cover" /> : person.displayName.slice(0, 2).toUpperCase()}
        </span>
        <span className={`w-full truncate text-xs ${recipient?.id === person.id ? 'font-bold text-[#193f32]' : 'text-[#64756b]'}`}>{person.displayName}</span>
      </button>) : <div className="flex items-center gap-3 text-sm text-[#64756b]"><span>Chưa có hồ sơ người nhận.</span><Link href="/recipients" className="font-semibold text-[#193f32] underline">Tạo hồ sơ</Link></div>}
    </section>
    <div className="mt-6 rounded-xl border border-[#eac8ad] bg-[#fff6ef] px-4 py-3 text-sm text-[#774a31]"><strong>Bản xem trước giao diện:</strong> kết nối AI và kết quả tư vấn sẽ được triển khai sau.</div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[285px_minmax(0,1fr)]">
      <aside className="space-y-4">
        <section className="surface p-4"><h2 className="font-extrabold">Dịp tặng quà</h2><div className="mt-3 flex flex-wrap gap-2">{['Sinh nhật','Kỷ niệm','Lễ tết','Cảm ơn','Khác'].map((item,index)=><span key={item} className={`rounded-full border px-3 py-2 text-xs ${index===0?'border-[#193f32] bg-[#193f32] font-bold text-white':'border-[#dfe5d9] bg-white'}`}>{item}</span>)}</div><p className="mt-3 text-xs text-[#64756b]">Dịp tặng có thể chọn khi tính năng gợi ý được kết nối.</p></section>
        <section className="surface p-4"><div className="flex items-center justify-between"><h2 className="font-extrabold">Ngân sách</h2><span className="text-sm font-bold">{money(budget)}</span></div><input aria-label="Ngân sách tối đa" type="range" min="100000" max="2000000" step="50000" value={budget} onChange={event=>setBudget(Number(event.target.value))} className="mt-4 w-full accent-[#193f32]" /><div className="flex justify-between text-xs text-[#64756b]"><span>100.000₫</span><span>2.000.000₫</span></div></section>
        <section className="surface p-4"><h2 className="font-extrabold">Sở thích</h2><div className="mt-3 flex flex-wrap gap-2">{(recipient?.interests.length ? recipient.interests : ['Thêm sở thích trong hồ sơ']).map(item=><span key={item} className="pill">{item}</span>)}</div><h3 className="mt-5 text-sm font-bold">Không thích</h3><div className="mt-3 flex flex-wrap gap-2">{(recipient?.dislikes.length ? recipient.dislikes : ['Chưa có dữ liệu']).map(item=><span key={item} className="rounded-full border border-dashed border-[#b9c7b9] px-3 py-1.5 text-xs">{item}</span>)}</div><Link href={recipient?`/recipients/${encodeURIComponent(recipient.id)}`:'/recipients'} className="mt-4 inline-block text-xs font-semibold underline">Chỉnh sửa hồ sơ</Link></section>
        {recipient?.notes && <section className="rounded-2xl border border-[#dfe5d9] bg-[#edf1e8] p-4"><h2 className="font-extrabold">Ghi chú</h2><p className="mt-2 text-sm leading-6 text-[#64756b]">{recipient.notes}</p></section>}
      </aside>
      <section className="overflow-hidden rounded-2xl border border-[#dfe5d9] bg-white">
        <div className="flex items-center gap-3 border-b border-[#edf1e8] p-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#193f32] text-white">✧</span><div><h2 className="font-bold">Trợ lý chọn quà</h2><p className="text-xs text-[#64756b]">Đang tham khảo hồ sơ và catalog How2choose</p></div><span className="ml-auto rounded-full bg-[#fff0e8] px-3 py-1 text-[10px] font-bold text-[#c83c00]">XEM TRƯỚC</span></div>
        <div className="space-y-4 p-4 sm:p-6">
          <div className="max-w-[86%] rounded-2xl rounded-tl-sm bg-[#edf1e8] p-4 text-sm">
            <p>{recipient ? `Mình đã đọc hồ sơ của ${recipient.displayName}. Đây là bản xem trước bố cục cho các gợi ý quà.` : 'Chọn người nhận để xem bố cục gợi ý quà.'}</p>
            <div className="mt-3 flex flex-wrap gap-2">{recipient?.relationship && <span className="rounded-full bg-white px-2.5 py-1 text-xs">{recipient.relationship}</span>}<span className="rounded-full bg-white px-2.5 py-1 text-xs">Ngân sách đến {money(budget)}</span>{recipient?.interests.slice(0,2).map(item=><span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs">{item}</span>)}</div>
            <p className="mt-3 font-semibold">Món quà hàng ngày nào sẽ khiến họ vui?</p>
          </div>
          <div className="ml-auto max-w-[75%] rounded-2xl rounded-tr-sm bg-[#193f32] p-4 text-sm text-white">Một món quà hữu ích, được chọn theo sở thích và ngân sách của bạn.</div>
          <div className="rounded-2xl border border-[#f0d7c7] bg-[#fff8f3] px-4 py-3 text-xs leading-5 text-[#774a31]">Các thẻ sản phẩm dưới đây lấy từ catalog để minh họa giao diện; chưa phải kết quả do AI xếp hạng.</div>
          <div className="space-y-3">
            {products.slice(0,3).map((product,index)=>{
              const variant=product.variants[0];
              const image=variant?.media.find(media=>media.type==='IMAGE')?.url;
              return <article key={product.id} className="rounded-2xl border border-[#dfe5d9] p-3 sm:p-4">
                <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
                  <ProductArtwork name={product.name} category={product.categories[0]?.name} imageUrl={image} className="aspect-square rounded-xl" />
                  <div className="flex min-w-0 flex-col">
                    <div className="flex flex-wrap items-start justify-between gap-2"><div><span className="rounded-full bg-[#fff0e8] px-2 py-1 text-[10px] font-bold text-[#c83c00]">{index===0?'Gợi ý xem trước':'Trong catalog'}</span><h3 className="mt-2 font-extrabold">{product.name}</h3></div><strong>{money(product.priceAfterDiscountVnd)}</strong></div>
                    <p className="mt-2 text-xs text-[#64756b]">★ {product.ratingAverage.toFixed(1)} ({product.ratingCount}) · {product.stock>0?'Còn hàng':'Hết hàng'}</p>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#64756b]">{product.description}</p>
                    <div className="mt-auto flex gap-2 pt-3"><Link href={`/catalog/${product.slug}`} className="btn-primary min-h-9 px-4 text-xs">Xem sản phẩm</Link><button type="button" disabled className="btn-outline min-h-9 px-4 text-xs opacity-55">♡ Lưu lại</button></div>
                  </div>
                </div>
              </article>;
            })}
            {!products.length && !error && <p className="rounded-xl bg-[#f4f6f1] p-5 text-sm text-[#64756b]">Catalog chưa có sản phẩm để hiển thị.</p>}
          </div>
          <div className="rounded-2xl bg-[#edf1e8] p-4 text-sm text-[#526b5c]">Bạn muốn điều chỉnh gì thêm? Những lựa chọn này sẽ khả dụng khi AI được kết nối.</div>
          <div className="flex flex-wrap gap-2">{['Thêm lựa chọn','Giá mềm hơn','Quà trải nghiệm'].map(item=><button key={item} disabled className="rounded-full border border-[#dfe5d9] px-3 py-2 text-xs opacity-55">{item}</button>)}</div>
        </div>
        <form onSubmit={event=>event.preventDefault()} className="flex items-center gap-3 border-t border-[#edf1e8] bg-[#f8f7f1] p-4"><input disabled placeholder="Trò chuyện với AI sẽ khả dụng sau" aria-label="Nhập yêu cầu cho AI" className="form-control rounded-full opacity-65" /><button type="button" disabled aria-label="Gửi tin nhắn" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#193f32] text-white opacity-50">→</button></form>
      </section>
    </div>
  </main>;
}
