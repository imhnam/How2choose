'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, CatalogCategory, CatalogProduct, Place } from '@/lib/api';
import { ProductCard } from '@/components/product-card';

function flatten(categories: CatalogCategory[], level = 0): Array<CatalogCategory & { level: number }> {
  return categories.flatMap(category => [{ ...category, level }, ...flatten(category.children, level + 1)]);
}

export default function CatalogClient({ initialCategory, initialSearch }: { initialCategory?: string; initialSearch?: string }) {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [category, setCategory] = useState(initialCategory ?? '');
  const submittedSearch = initialSearch ?? '';
  const [region, setRegion] = useState('');
  const [provinces, setProvinces] = useState<Place[]>([]);
  const [locationError, setLocationError] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [error, setError] = useState('');
  const flatCategories = useMemo(() => flatten(categories), [categories]);
  const pageNumbers = useMemo<Array<number | 'ellipsis'>>(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    if (page >= totalPages - 3) return [1, 'ellipsis', ...Array.from({ length: 5 }, (_, index) => totalPages - 4 + index)];
    return [1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages];
  }, [page, totalPages]);
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
    const params = new URLSearchParams({ page: String(page), limit: '12' });
    if (category) params.set('category', category);
    if (submittedSearch) params.set('q', submittedSearch);
    if (region) params.set('region', region);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minRating) params.set('minRating', minRating);
    api<{ items: CatalogProduct[]; total: number; totalPages: number }>(`/catalog/products?${params.toString()}`)
      .then(data => { if (active) { setProducts(data.items); setTotal(data.total); setTotalPages(data.totalPages); setError(''); } })
      .catch(error => { if (active) setError((error as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [category, submittedSearch, region, minPrice, maxPrice, minRating, page, priceInvalid]);

  function resetFilters() {
    setRegion(''); setMinPrice(''); setMaxPrice(''); setMinRating(''); setPage(1); setLoading(true);
  }

  return <main className="page-container flex-1 pb-8 pt-3">
    <section className="flex flex-wrap items-end justify-between gap-4 py-3"><div><h1 className="text-4xl font-extrabold tracking-tight">Catalog quà tặng</h1></div></section>

    <section aria-label="Bộ lọc sản phẩm" className="catalog-filters grid gap-2 rounded-2xl border border-[#dfe5d9] bg-white p-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className="text-sm font-medium">Khu vực<select value={region} onChange={event => { setRegion(event.target.value); setPage(1); setLoading(true); }} className="form-control mt-1"><option value="">Mọi khu vực</option>{provinces.map(item => <option key={item.code} value={`v2:${item.code}`}>{item.name}</option>)}</select></label>
      {locationError && <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-5">{locationError}</p>}
      <label className="text-sm font-medium">Giá từ (₫)<input type="number" min="0" step="1000" inputMode="numeric" value={minPrice} onChange={event => { setMinPrice(event.target.value); setPage(1); setLoading(true); }} placeholder="0" className="form-control mt-1" /></label>
      <label className="text-sm font-medium">Giá đến (₫)<input type="number" min="0" step="1000" inputMode="numeric" value={maxPrice} onChange={event => { setMaxPrice(event.target.value); setPage(1); setLoading(true); }} placeholder="Không giới hạn" className="form-control mt-1" /></label>
      <label className="text-sm font-medium">Đánh giá tối thiểu<select value={minRating} onChange={event => { setMinRating(event.target.value); setPage(1); setLoading(true); }} className="form-control mt-1"><option value="">Tất cả</option><option value="4">4★ trở lên</option><option value="4.5">4,5★ trở lên</option><option value="4.8">4,8★ trở lên</option></select></label>
      <button type="button" onClick={resetFilters} className="rounded-lg px-2 py-2 text-sm font-semibold text-green-900 underline-offset-2 hover:underline">Xóa lọc</button>
      {priceInvalid && <p role="alert" className="text-sm text-red-700 sm:col-span-2 lg:col-span-5">Giá từ không được lớn hơn giá đến.</p>}
    </section>

    <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside><h2 className="text-xs font-bold uppercase tracking-wider text-[#64756b]">Danh mục</h2><div className="mt-3 space-y-1"><button onClick={() => { setCategory(''); setPage(1); setLoading(true); }} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ${!category ? 'bg-[#edf1e8] font-semibold text-green-950' : 'hover:bg-white'}`}>Tất cả sản phẩm</button>{flatCategories.map(item => <button key={item.id} onClick={() => { setCategory(item.slug); setPage(1); setLoading(true); }} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ${category === item.slug ? 'bg-[#edf1e8] font-semibold text-green-950' : 'hover:bg-white'}`} style={{ paddingLeft: `${12 + item.level * 16}px` }}>{item.name}</button>)}</div><h2 className="mt-8 text-xs font-bold uppercase tracking-wider text-[#64756b]">Phù hợp để tặng</h2><p className="mt-1 text-[11px] text-[#64756b]">Sắp ra mắt</p><div className="mt-3 space-y-3 text-sm text-[#41594c]">{['Người yêu','Mẹ và gia đình','Bạn thân','Đồng nghiệp'].map(item=><label key={item} className="flex items-center gap-2 text-[#64756b]"><input disabled type="checkbox" className="accent-[#193f32]" />{item}</label>)}</div></aside>
      <section aria-label="Danh sách sản phẩm">
        <p className="text-sm text-stone-600">{priceInvalid ? 'Điều chỉnh khoảng giá để xem kết quả' : loading ? 'Đang tải...' : `${total} sản phẩm`}</p>
        {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
        {priceInvalid ? null : loading ? <p className="mt-8 text-stone-600" role="status">Đang tải sản phẩm...</p> : products.length === 0 ? <p className="mt-8 rounded-xl bg-white p-6 text-stone-600">Chưa có sản phẩm phù hợp. Hãy thử thay đổi bộ lọc.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{products.map(product => <ProductCard key={product.id} product={product} />)}</div>}
        {!priceInvalid && totalPages > 1 && <nav aria-label="Phân trang sản phẩm" className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <button type="button" onClick={() => { setPage(current => current - 1); setLoading(true); }} disabled={page === 1 || loading} aria-label="Trang trước" className="grid h-10 min-w-10 place-items-center rounded-full border border-[#dfe5d9] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">←</button>
          {pageNumbers.map((pageNumber, index) => pageNumber === 'ellipsis'
            ? <span key={`ellipsis-${index}`} aria-hidden="true" className="px-1 text-[#64756b]">…</span>
            : <button key={pageNumber} type="button" onClick={() => { setPage(pageNumber); setLoading(true); }} aria-label={`Trang ${pageNumber}`} aria-current={page === pageNumber ? 'page' : undefined} disabled={loading} className={`grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-semibold disabled:cursor-not-allowed ${page === pageNumber ? 'bg-[#193f32] text-white' : 'border border-[#dfe5d9] bg-white hover:bg-[#edf1e8]'}`}>{pageNumber}</button>)}
          <button type="button" onClick={() => { setPage(current => current + 1); setLoading(true); }} disabled={page === totalPages || loading} aria-label="Trang sau" className="grid h-10 min-w-10 place-items-center rounded-full border border-[#dfe5d9] px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">→</button>
        </nav>}
      </section>
    </div>
  </main>;
}
