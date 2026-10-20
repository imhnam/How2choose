'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, CatalogProduct, ProductVariant } from '@/lib/api';
import { addToCart } from '@/lib/cart';
import { HomeAccountNav } from '@/components/home-account-nav';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
function ProductVisual({ variant, name }: { variant: ProductVariant; name: string }) {
  const media = variant.media.find(item => item.type === 'IMAGE');
  return media ? <Image src={media.url} alt={name} width={800} height={800} unoptimized className="h-full w-full object-cover" /> : <div className="grid h-full min-h-[360px] place-items-center bg-gradient-to-br from-green-900 to-orange-500 text-8xl font-bold text-white/90">{name.charAt(0)}</div>;
}
export default function ProductDetail({ slug }: { slug: string }) {
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [variant, setVariant] = useState<ProductVariant | null>(null);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState('');
  const router = useRouter();
  useEffect(() => { api<CatalogProduct>(`/catalog/products/${slug}`).then(result => { setProduct(result); setVariant(result.variants[0] ?? null); }).catch(error => setError((error as Error).message)); }, [slug]);
  if (error) return <main className="mx-auto max-w-5xl px-6 py-12"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p><Link href="/catalog" className="mt-5 inline-block underline">Quay lại catalog</Link></main>;
  if (!product || !variant) return <main className="mx-auto max-w-5xl px-6 py-12 text-stone-600">Đang tải sản phẩm...</main>;
  const currentProduct = product;
  const currentVariant = variant;
  function add(redirect: boolean) { if (!addToCart(currentProduct, currentVariant, quantity)) { setCartMessage('Biến thể này hiện đã hết hàng.'); return; } setCartMessage('Đã thêm vào giỏ hàng.'); if (redirect) router.push('/cart?buyNow=1'); }
  return <main className="mx-auto max-w-6xl px-6 py-8 sm:px-12"><div className="flex items-center justify-between border-b border-green-900/15 pb-6"><Link href="/catalog" className="text-sm text-green-800">← Catalog</Link><HomeAccountNav /></div><div className="mt-10 grid gap-10 lg:grid-cols-2"><div className="overflow-hidden rounded-2xl bg-white"><div className="aspect-square"><ProductVisual variant={variant} name={product.name} /></div></div><div><div className="flex flex-wrap gap-2">{product.categories.map(item => <span key={item.id} className="rounded-full bg-green-900/10 px-3 py-1 text-xs text-green-900">{item.name}</span>)}</div><h1 className="mt-4 text-4xl font-semibold">{product.name}</h1><p className="mt-4 leading-7 text-stone-600">{product.description}</p><div className="mt-6 flex items-baseline gap-3"><span className="text-2xl font-bold text-orange-600">{money(variant.priceAfterDiscountVnd)}</span>{variant.priceAfterDiscountVnd !== variant.priceVnd && <span className="text-sm text-stone-500 line-through">{money(variant.priceVnd)}</span>}</div><p className="mt-3 text-sm text-stone-600">★ {product.ratingAverage.toFixed(1)} ({product.ratingCount} đánh giá) · Đã mua {product.purchaseCount} lần</p><div className="mt-8"><h2 className="font-semibold">Chọn biến thể</h2><div className="mt-3 flex flex-wrap gap-2">{product.variants.map(item => <button key={item.id} onClick={() => { setVariant(item); setQuantity(1); setCartMessage(''); }} className={`rounded-xl border px-4 py-2 text-sm ${item.id === variant.id ? 'border-green-900 bg-green-900 text-white' : 'border-green-900/20 bg-white'}`}>{[item.color, item.size].filter(Boolean).join(' · ') || item.sku}</button>)}</div></div><div className="mt-8 flex flex-wrap items-center gap-3"><div className="flex items-center rounded-xl border border-green-900/20 bg-white"><button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))} className="h-11 w-10 text-lg">−</button><span className="w-8 text-center">{quantity}</span><button type="button" onClick={() => setQuantity(value => Math.min(variant.stock, value + 1))} disabled={quantity >= variant.stock} className="h-11 w-10 text-lg disabled:opacity-40">+</button></div><button type="button" onClick={() => add(false)} disabled={variant.stock <= 0} className="rounded-xl border border-green-900 px-5 py-3 font-semibold text-green-900 disabled:opacity-50">Thêm vào giỏ</button><button type="button" onClick={() => add(true)} disabled={variant.stock <= 0} className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white disabled:opacity-50">Mua ngay</button></div>{cartMessage && <p role="status" className="mt-3 text-sm text-green-800">{cartMessage} <Link href="/cart" className="font-semibold underline">Xem giỏ hàng</Link></p>}<dl className="mt-8 grid grid-cols-2 gap-4 rounded-2xl bg-white p-5 text-sm"><div><dt className="text-stone-500">SKU</dt><dd className="mt-1 font-medium">{variant.sku}</dd></div><div><dt className="text-stone-500">Tồn kho</dt><dd className="mt-1 font-medium">{variant.stock}</dd></div><div><dt className="text-stone-500">Thương hiệu</dt><dd className="mt-1 font-medium">{product.brand || '—'}</dd></div><div><dt className="text-stone-500">Nhà cung cấp</dt><dd className="mt-1 font-medium">{product.supplier || '—'}</dd></div><div><dt className="text-stone-500">Màu sắc</dt><dd className="mt-1 font-medium">{variant.color || '—'}</dd></div><div><dt className="text-stone-500">Chất liệu</dt><dd className="mt-1 font-medium">{variant.material || '—'}</dd></div></dl></div></div></main>;
}
