'use client';
import Link from 'next/link';
import Image from 'next/image';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, CatalogCategory, CatalogProduct } from '@/lib/api';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
function flatten(categories: CatalogCategory[], level = 0): Array<CatalogCategory & { level: number }> {
  return categories.flatMap(category => [{ ...category, level }, ...flatten(category.children, level + 1)]);
}

function ProductImage({ product }: { product: CatalogProduct }) {
  const media = product.variants.flatMap(variant => variant.media).find(item => item.type === 'IMAGE');
  return media ? <Image src={media.url} alt={product.name} width={640} height={480} unoptimized className="h-full w-full object-cover" /> : <div className="grid h-full min-h-48 place-items-center bg-gradient-to-br from-green-900 to-orange-500 text-6xl font-bold text-white/90">{product.name.charAt(0)}</div>;
}

export default function CatalogClient({ initialCategory }: { initialCategory?: string }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [category, setCategory] = useState(initialCategory ?? '');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const flatCategories = useMemo(() => flatten(categories), [categories]);

  useEffect(() => { api<CatalogCategory[]>('/catalog/categories').then(setCategories).catch(error => setError((error as Error).message)); }, []);
  useEffect(() => {
    const params = new URLSearchParams(); if (category) params.set('category', category); if (submittedSearch) params.set('q', submittedSearch);
    api<{ items: CatalogProduct[] }>(`/catalog/products?${params.toString()}`).then(data => setProducts(data.items)).catch(error => setError((error as Error).message)).finally(() => setLoading(false));
  }, [category, submittedSearch]);
  function submit(event: FormEvent) { event.preventDefault(); setSubmittedSearch(search.trim()); }

  return <div className="mx-auto max-w-6xl px-6 py-8 sm:px-12">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-green-900/15 pb-6"><div><Link href="/" className="text-xl font-bold">How2choose</Link><h1 className="mt-10 text-4xl font-semibold">Catalog quà tặng</h1><p className="mt-3 text-stone-600">Những món quà được chọn để bạn dễ dàng bắt đầu.</p></div><Link href="/recipients" className="rounded-xl border border-green-900/20 px-4 py-2 text-sm font-semibold">Hồ sơ người nhận</Link></div>
    <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside><h2 className="text-sm font-bold uppercase tracking-wider text-green-900">Danh mục</h2><div className="mt-3 space-y-1"><button onClick={() => setCategory('')} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${!category ? 'bg-green-900 font-semibold text-white' : 'hover:bg-white'}`}>Tất cả sản phẩm</button>{flatCategories.map(item => <button key={item.id} onClick={() => setCategory(item.slug)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${category === item.slug ? 'bg-green-900 font-semibold text-white' : 'hover:bg-white'}`} style={{ paddingLeft: `${12 + item.level * 16}px` }}>{item.name}</button>)}</div></aside>
      <section><form onSubmit={submit} className="flex gap-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm theo tên, thương hiệu..." className="min-w-0 flex-1 rounded-xl border border-green-900/15 bg-white px-4 py-3 outline-none focus:border-green-800" /><button className="rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white">Tìm</button></form>
        {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {loading ? <p className="mt-8 text-stone-600" role="status">Đang tải sản phẩm...</p> : products.length === 0 ? <p className="mt-8 rounded-xl bg-white p-6 text-stone-600">Chưa có sản phẩm phù hợp.</p> : <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{products.map(product => <Link key={product.id} href={`/catalog/${product.slug}`} className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="aspect-[4/3]"><ProductImage product={product} /></div><div className="p-5"><div className="flex flex-wrap gap-1">{product.categories.slice(0, 2).map(item => <span key={item.id} className="text-xs text-green-800">{item.name}</span>)}</div><h2 className="mt-2 text-lg font-semibold">{product.name}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{product.description}</p><div className="mt-4 flex items-end justify-between gap-2"><span className="font-bold text-orange-600">{money(product.priceAfterDiscountVnd)}</span><span className="text-xs text-stone-500">★ {product.ratingAverage.toFixed(1)} · {product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</span></div></div></Link>)}</div>}
      </section>
    </div>
  </div>;
}
