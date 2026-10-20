'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, CatalogProduct, ProductVariant } from '@/lib/api';
import { addToCart } from '@/lib/cart';
import { ProductArtwork } from '@/components/product-artwork';
import { ProductCard } from '@/components/product-card';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
type GalleryItem = { variant: ProductVariant; imageUrl: string | null; key: string };
const sampleReviews = [
  { name: 'Minh Anh', date: '12/10/2026', rating: 5, comment: 'Sản phẩm đẹp hơn mong đợi, đóng gói chỉn chu và giao hàng nhanh. Mình rất hài lòng!' },
  { name: 'Hoàng Nam', date: '08/10/2026', rating: 5, comment: 'Mua làm quà tặng và người nhận rất thích. Chất lượng tốt so với mức giá.' },
  { name: 'Thu Hà', date: '02/10/2026', rating: 4, comment: 'Mẫu mã đẹp, dùng ổn. Sẽ cân nhắc mua thêm để tặng bạn bè.' },
];

export default function ProductDetail({ slug }: { slug: string }) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [related, setRelated] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState('');
  const [relatedError, setRelatedError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    let active = true;
    api<CatalogProduct>(`/catalog/products/${slug}`)
      .then(result => { if (active) { setProduct(result); setVariant(result.variants[0] ?? null); } })
      .catch(reason => { if (active) setError((reason as Error).message); });
    api<{ items: CatalogProduct[] }>('/catalog/products?limit=6')
      .then(result => { if (active) setRelated(result.items); })
      .catch(reason => { if (active) setRelatedError((reason as Error).message); });
    return () => { active = false; };
  }, [slug]);

  const galleryItems: GalleryItem[] = product ? product.variants.flatMap<GalleryItem>(item => {
    const images = item.media.filter(media => media.type === 'IMAGE');
    return images.length
      ? images.map(media => ({ variant: item, imageUrl: media.url, key: media.id }))
      : [{ variant: item, imageUrl: null, key: item.id }];
  }) : [];
  const activeGalleryIndex = galleryItems.length ? galleryIndex % galleryItems.length : 0;
  const activeGalleryItem = galleryItems[activeGalleryIndex];

  if (error) return <main className="page-container min-h-[50vh] flex-1 py-16"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p><Link href="/catalog" className="mt-5 inline-block underline">Quay lại catalog</Link></main>;
  if (!product || !variant) return <main className="page-container min-h-[50vh] flex-1 py-16 text-[#64756b]" role="status">Đang tải sản phẩm...</main>;

  const currentProduct = product;
  const currentVariant = activeGalleryItem?.variant ?? variant;
  const category = product.categories[0]?.name;
  const variantLabel = [variant.color, variant.size, variant.material].filter(Boolean).join(' · ') || variant.sku;
  function showGalleryItem(index: number) {
    const nextIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[nextIndex];
    if (!item) return;
    setGalleryIndex(nextIndex);
    setVariant(item.variant);
    setQuantity(1);
    setCartMessage('');
  }
  function add(redirect: boolean) {
    if (!addToCart(currentProduct, currentVariant, quantity)) { setCartMessage('Biến thể này hiện đã hết hàng.'); return; }
    setCartMessage('Đã thêm vào giỏ hàng.');
    if (redirect) router.push('/cart?buyNow=1');
  }

  return <main className="page-container flex-1 py-8">
    <p className="mb-7 text-xs text-[#64756b]"><Link href="/catalog" className="hover:underline">Catalog quà tặng</Link><span className="mx-2">/</span>{category}<span className="mx-2">/</span><span className="text-[#193f32]">{product.name}</span></p>
    <section className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="lg:sticky lg:top-4">
        <div className="relative h-[min(70vw,460px)] min-h-[280px] overflow-hidden rounded-[24px] border border-[#dfe5d9] sm:h-[min(48vw,460px)] lg:h-[min(38vw,420px)]">
          {activeGalleryItem && <ProductArtwork name={product.name} category={category} imageUrl={activeGalleryItem.imageUrl} imageFit="contain" className="h-full min-h-full aspect-auto" />}
          {galleryItems.length > 1 && <>
            <button type="button" onClick={() => showGalleryItem(activeGalleryIndex - 1)} aria-label="Ảnh sản phẩm trước" className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/25 text-white shadow-sm backdrop-blur-md transition hover:bg-black/40"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="m15 18-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            <button type="button" onClick={() => showGalleryItem(activeGalleryIndex + 1)} aria-label="Ảnh sản phẩm tiếp theo" className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/25 text-white shadow-sm backdrop-blur-md transition hover:bg-black/40"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          </>}
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
          {galleryItems.slice(0, 4).map((item, index) => <button key={item.key} type="button" aria-label={`Xem ảnh ${index + 1}: ${[item.variant.color, item.variant.size].filter(Boolean).join(' ') || item.variant.sku}`} aria-pressed={activeGalleryIndex === index} onClick={() => showGalleryItem(index)} className={`overflow-hidden rounded-xl border-2 ${activeGalleryIndex === index ? 'border-[#193f32]' : 'border-transparent'}`}><ProductArtwork name={product.name} category={category} imageUrl={item.imageUrl} className="aspect-square" /></button>)}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#64756b]">{category}</p>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
        <p className="mt-3 text-sm"><span className="font-bold text-[#193f32]"><span className="text-[#f5b800]">★</span> {product.ratingAverage.toFixed(1)}</span><span className="mx-2 text-[#64756b]">{product.ratingCount} đánh giá</span><span className={variant.stock > 0 ? 'text-[#327450]' : 'text-[#a14537]'}>· {variant.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</span></p>
        <div className="mt-5 flex flex-wrap items-baseline gap-3"><span className="text-3xl font-extrabold">{money(variant.priceAfterDiscountVnd)}</span>{variant.priceAfterDiscountVnd < variant.priceVnd && <><span className="text-sm text-[#64756b] line-through">{money(variant.priceVnd)}</span><span className="rounded-full bg-[#fff0e8] px-3 py-1 text-xs font-bold text-[#c83c00]">Giảm {variant.discountPercent ?? Math.round((1 - variant.priceAfterDiscountVnd / variant.priceVnd) * 100)}%</span></>}</div>
        <p className="mt-5 leading-7 text-[#64756b]">{product.description}</p>
        <div className="mt-6"><h2 className="text-sm font-bold">Biến thể</h2><div className="mt-3 flex flex-wrap gap-2">{product.variants.map(item => <button key={item.id} type="button" aria-pressed={item.id === variant.id} onClick={() => { const imageIndex = galleryItems.findIndex(image => image.variant.id === item.id); if (imageIndex >= 0) setGalleryIndex(imageIndex); setVariant(item); setQuantity(1); setCartMessage(''); }} className={`rounded-full border px-4 py-2 text-sm ${item.id === variant.id ? 'border-[#193f32] bg-[#edf1e8] font-bold' : 'border-[#dfe5d9] bg-white'}`}>{[item.color, item.size, item.material].filter(Boolean).join(' · ') || item.sku}</button>)}</div><p className="mt-2 text-xs text-[#64756b]">Đang chọn: {variantLabel}</p></div>
        <div className="mt-6 flex items-center gap-3">
          <div className="flex items-center rounded-full border border-[#dfe5d9] bg-white"><button type="button" aria-label="Giảm số lượng" onClick={() => setQuantity(value => Math.max(1, value - 1))} className="h-10 w-10 text-lg">−</button><span className="w-7 text-center">{quantity}</span><button type="button" aria-label="Tăng số lượng" onClick={() => setQuantity(value => Math.min(variant.stock, value + 1))} disabled={quantity >= variant.stock} className="h-10 w-10 text-lg disabled:opacity-40">+</button></div>
          <span className="text-xs text-[#64756b]">Còn {variant.stock} sản phẩm</span>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => add(false)} disabled={variant.stock <= 0} className="btn-outline disabled:opacity-50">Thêm vào giỏ hàng</button><button type="button" onClick={() => add(true)} disabled={variant.stock <= 0} className="btn-accent disabled:opacity-50">Mua ngay</button></div>
        {cartMessage && <p role="status" className="mt-3 text-sm text-[#327450]">{cartMessage} <Link href="/cart" className="font-semibold underline">Xem giỏ hàng</Link></p>}
        <div className="mt-6 rounded-2xl border border-[#f3d8c8] bg-[#fff0e8] p-5"><h2 className="font-bold">✧ Một món quà phù hợp</h2><p className="mt-2 text-sm leading-6 text-[#526b5c]">Khám phá thêm sản phẩm và chọn món quà phù hợp với sở thích của người nhận.</p><Link href="/recommendations" className="mt-3 inline-block text-sm font-bold underline">Nhờ AI gợi ý →</Link></div>
      </div>
    </section>

    <section className="mt-16 border-t border-[#dfe5d9] py-10">
      <div className="grid gap-10 lg:grid-cols-2">
        <div><h2 className="text-2xl font-extrabold">Mô tả sản phẩm</h2><p className="mt-4 leading-7 text-[#64756b]">{product.description}</p><div className="mt-5 flex flex-wrap gap-2">{product.tags.map(tag => <span key={tag} className="pill">{tag}</span>)}</div></div>
        <div><h2 className="text-2xl font-extrabold">Thông số</h2><dl className="mt-4 overflow-hidden rounded-2xl border border-[#dfe5d9] bg-white">{[['SKU', variant.sku],['Màu sắc', variant.color || '—'],['Kích thước', variant.size || '—'],['Chất liệu', variant.material || '—'],['Thương hiệu', product.brand || '—'],['Nhà cung cấp', product.supplier || '—']].map(([label,value]) => <div key={label} className="grid grid-cols-2 border-b border-[#edf1e8] last:border-b-0"><dt className="bg-[#f4f6f1] px-4 py-3 text-sm font-semibold">{label}</dt><dd className="px-4 py-3 text-sm text-[#64756b]">{value}</dd></div>)}</dl></div>
      </div>
    </section>
    <section className="border-t border-[#dfe5d9] py-10">
      <div className="mb-5 flex items-end justify-between"><div><h2 className="text-2xl font-extrabold">Đánh giá từ người mua</h2><p className="mt-2 text-sm text-[#64756b]">Điểm đánh giá tổng hợp từ khách hàng.</p></div><p className="text-3xl font-extrabold"><span className="text-[#f5b800]">★</span> {product.ratingAverage.toFixed(1)} <span className="text-sm font-normal text-[#64756b]">({product.ratingCount})</span></p></div>
      <div className="flex items-center gap-3"><span className="text-sm font-semibold">Mức độ hài lòng</span><div className="h-2 w-full max-w-xl overflow-hidden rounded-full bg-[#e3e9e1]"><div className="h-full rounded-full bg-[#f5b800]" style={{ width: `${Math.min(100, Math.max(0, product.ratingAverage / 5 * 100))}%` }} /></div><span className="text-sm">{Math.round(product.ratingAverage / 5 * 100)}%</span></div>
      <p className="mt-6 text-xs text-[#64756b]">Các nhận xét bên dưới là nội dung minh họa giao diện, chưa phải đánh giá thực tế.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {sampleReviews.map(review => <article key={review.name} className="rounded-2xl border border-[#dfe5d9] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="font-bold">{review.name}</h3><p className="mt-1 text-xs text-[#64756b]">{review.date}</p></div>
            <p className="shrink-0 text-sm font-bold text-[#193f32]" aria-label={`${review.rating} trên 5 sao`}>{'★'.repeat(review.rating)}<span className="text-[#dfe5d9]">{'★'.repeat(5 - review.rating)}</span></p>
          </div>
          <p className="mt-3 text-sm leading-6 text-[#526b5c]">{review.comment}</p>
        </article>)}
      </div>
    </section>
    <section className="border-t border-[#dfe5d9] py-10">
      <div className="mb-5 flex items-end justify-between"><h2 className="text-2xl font-extrabold">Quà liên quan</h2><Link href="/catalog" className="text-sm font-semibold underline">Xem catalog →</Link></div>
      {relatedError && <p role="alert" className="mb-4 text-sm text-red-700">{relatedError}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">{related.filter(item => item.id !== product.id).slice(0, 5).map(item => <ProductCard key={item.id} product={item} />)}</div>
    </section>
  </main>;
}
