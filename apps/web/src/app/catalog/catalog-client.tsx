'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, CatalogCategory, CatalogProduct, Place } from '@/lib/api';
import { HomeAccountNav } from '@/components/home-account-nav';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

function flatten(categories: CatalogCategory[], level = 0): Array<CatalogCategory & { level: number }> {
  return categories.flatMap(category => [{ ...category, level }, ...flatten(category.children, level + 1)]);
}

function ProductImage({ product }: { product: CatalogProduct }) {
  const media = product.variants.flatMap(variant => variant.media).find(item => item.type === 'IMAGE');
  return media
    ? <Image src={media.url} alt={product.name} width={640} height={480} unoptimized className="h-full w-full object-cover" />
    : <div className="grid h-full min-h-48 place-items-center bg-gradient-to-br from-green-900 to-orange-500 text-6xl font-bold text-white/90">{product.name.charAt(0)}</div>;
}

export default function CatalogClient({ initialCategory }: { initialCategory?: string }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [category, setCategory] = useState(initialCategory ?? '');
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [suggestions, setSuggestions] = useState<CatalogProduct[]>([]);
  const [suggestionsFor, setSuggestionsFor] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [region, setRegion] = useState('');
  const [provinces, setProvinces] = useState<Place[]>([]);
  const [locationError, setLocationError] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const flatCategories = useMemo(() => flatten(categories), [categories]);
  const priceInvalid = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);

  useEffect(() => {
    api<CatalogCategory[]>('/catalog/categories').then(setCategories).catch(error => setError((error as Error).message));
  }, []);

  useEffect(() => {
    let active = true;
    api<Place[]>('/locations/provinces?version=current')
      .then(data => { if (active) { setProvinces(data); setLocationError(''); } })
      .catch(error => { if (active) setLocationError((error as Error).message); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (priceInvalid) return;
    let active = true;
    const params = new URLSearchParams({ limit: '50' });
    if (category) params.set('category', category);
    if (submittedSearch) params.set('q', submittedSearch);
    if (region) params.set('region', region);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minRating) params.set('minRating', minRating);
    api<{ items: CatalogProduct[]; total: number }>(`/catalog/products?${params.toString()}`)
      .then(data => { if (active) { setProducts(data.items); setTotal(data.total); setError(''); } })
      .catch(error => { if (active) setError((error as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, submittedSearch, region, minPrice, maxPrice, minRating, priceInvalid]);

  useEffect(() => {
    const value = search.trim();
    if (!value) return;
    let active = true;
    const timer = window.setTimeout(() => {
      api<{ items: CatalogProduct[] }>(`/catalog/products?q=${encodeURIComponent(value)}&limit=6`)
        .then(data => { if (active) { setSuggestions(data.items); setSuggestionsFor(value); } })
        .catch(() => { if (active) { setSuggestions([]); setSuggestionsFor(value); } });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSubmittedSearch(search.trim());
    setSearchFocused(false);
  }

  function resetFilters() {
    setRegion(''); setMinPrice(''); setMaxPrice(''); setMinRating(''); setLoading(true);
  }

  return <div className="mx-auto max-w-6xl px-6 py-8 sm:px-12">
    <header className="grid items-center gap-5 border-b border-green-900/15 pb-6 lg:grid-cols-[auto_minmax(260px,1fr)_auto]">
      <Link href="/" className="text-xl font-bold tracking-tight">How2choose</Link>
      <form onSubmit={submit} role="search" className="relative order-3 lg:order-none">
        <div className="flex overflow-hidden rounded-xl border border-green-900/20 bg-white focus-within:border-green-800 focus-within:ring-2 focus-within:ring-green-800/10">
          <input aria-label="Tìm sản phẩm" aria-expanded={searchFocused && search.trim().length > 0} aria-controls="catalog-search-suggestions" role="combobox" autoComplete="off" value={search} onChange={event => setSearch(event.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)} placeholder="Tìm sản phẩm, thương hiệu..." className="min-w-0 flex-1 px-4 py-3 outline-none" />
          {search && <button type="button" aria-label="Xóa tìm kiếm" onClick={() => { setSearch(''); setSubmittedSearch(''); setSuggestions([]); setLoading(true); }} className="px-2 text-stone-500">×</button>}
          <button type="submit" className="bg-orange-600 px-5 font-semibold text-white">Tìm</button>
        </div>
        {searchFocused && search.trim() && <div id="catalog-search-suggestions" role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-green-900/10 bg-white shadow-xl">
          {suggestionsFor !== search.trim() ? <p className="px-4 py-3 text-sm text-stone-500">Đang tìm gợi ý...</p> : suggestions.length ? suggestions.map(product => <Link role="option" aria-selected="false" key={product.id} href={`/catalog/${product.slug}`} className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-green-900/5"><span className="font-medium">{product.name}</span><span className="shrink-0 text-orange-600">{money(product.priceAfterDiscountVnd)}</span></Link>) : <p className="px-4 py-3 text-sm text-stone-500">Không tìm thấy sản phẩm.</p>}
        </div>}
      </form>
      <HomeAccountNav />
    </header>

    <section className="py-9"><h1 className="text-4xl font-semibold">Catalog quà tặng</h1><p className="mt-3 text-stone-600">Tìm món quà phù hợp theo khu vực giao hàng, giá và đánh giá.</p></section>

    <section aria-label="Bộ lọc sản phẩm" className="grid gap-3 rounded-2xl border border-green-900/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className="text-sm font-medium">Khu vực<select value={region} onChange={event => { setRegion(event.target.value); setLoading(true); }} className="mt-2 w-full rounded-lg border border-green-900/15 bg-white px-3 py-2.5"><option value="">Mọi khu vực</option>{provinces.map(item => <option key={item.code} value={`v2:${item.code}`}>{item.name}</option>)}</select></label>
      {locationError && <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-5">{locationError}</p>}
      <label className="text-sm font-medium">Giá từ (₫)<input type="number" min="0" step="1000" inputMode="numeric" value={minPrice} onChange={event => { setMinPrice(event.target.value); setLoading(true); }} placeholder="0" className="mt-2 w-full rounded-lg border border-green-900/15 px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Giá đến (₫)<input type="number" min="0" step="1000" inputMode="numeric" value={maxPrice} onChange={event => { setMaxPrice(event.target.value); setLoading(true); }} placeholder="Không giới hạn" className="mt-2 w-full rounded-lg border border-green-900/15 px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Đánh giá tối thiểu<select value={minRating} onChange={event => { setMinRating(event.target.value); setLoading(true); }} className="mt-2 w-full rounded-lg border border-green-900/15 bg-white px-3 py-2.5"><option value="">Tất cả</option><option value="4">4★ trở lên</option><option value="4.5">4,5★ trở lên</option><option value="4.8">4,8★ trở lên</option></select></label>
      <button type="button" onClick={resetFilters} className="rounded-lg px-3 py-2.5 text-sm font-semibold text-green-900 underline-offset-2 hover:underline">Xóa lọc</button>
      {priceInvalid && <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-5">Giá từ không được lớn hơn giá đến.</p>}
    </section>

    <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside><h2 className="text-sm font-bold uppercase tracking-wider text-green-900">Danh mục</h2><div className="mt-3 space-y-1"><button onClick={() => { setCategory(''); setLoading(true); }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${!category ? 'bg-green-900 font-semibold text-white' : 'hover:bg-white'}`}>Tất cả sản phẩm</button>{flatCategories.map(item => <button key={item.id} onClick={() => { setCategory(item.slug); setLoading(true); }} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${category === item.slug ? 'bg-green-900 font-semibold text-white' : 'hover:bg-white'}`} style={{ paddingLeft: `${12 + item.level * 16}px` }}>{item.name}</button>)}</div></aside>
      <section aria-label="Danh sách sản phẩm">
        <p className="text-sm text-stone-600">{priceInvalid ? 'Điều chỉnh khoảng giá để xem kết quả' : loading ? 'Đang tải...' : `${total} sản phẩm`}</p>
        {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {priceInvalid ? null : loading ? <p className="mt-8 text-stone-600" role="status">Đang tải sản phẩm...</p> : products.length === 0 ? <p className="mt-8 rounded-xl bg-white p-6 text-stone-600">Chưa có sản phẩm phù hợp. Hãy thử thay đổi bộ lọc.</p> : <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{products.map(product => <Link key={product.id} href={`/catalog/${product.slug}`} className="overflow-hidden rounded-2xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="aspect-[4/3]"><ProductImage product={product} /></div><div className="p-5"><div className="flex flex-wrap gap-1">{product.categories.slice(0, 2).map(item => <span key={item.id} className="text-xs text-green-800">{item.name}</span>)}</div><h2 className="mt-2 text-lg font-semibold">{product.name}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">{product.description}</p><div className="mt-4 flex items-end justify-between gap-2"><span className="font-bold text-orange-600">{money(product.priceAfterDiscountVnd)}</span><span className="text-xs text-stone-500">★ {product.ratingAverage.toFixed(1)} · {product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</span></div></div></Link>)}</div>}
      </section>
    </div>
  </div>;
}
