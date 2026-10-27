import Link from 'next/link';
import { CatalogProduct } from '@/lib/api';
import { ProductArtwork } from '@/components/product-artwork';

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = product.media.find(media => media.type === 'IMAGE')?.url
    ?? product.variants.flatMap(variant => variant.media).find(media => media.type === 'IMAGE')?.url;
  const category = product.categories[0]?.name;
  return (
    <Link href={`/catalog/${product.slug}`} className="group overflow-hidden rounded-2xl border border-[#dfe5d9] bg-white no-underline transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative">
        <ProductArtwork name={product.name} category={category} imageUrl={image} className="aspect-[1.3/1]" />
        {product.discountPercent ? <span className="absolute left-3 top-3 rounded-full bg-[#fff0e8] px-3 py-1.5 text-sm font-extrabold text-[#c83c00]">-{product.discountPercent}%</span> : null}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[.12em] text-[#64756b]">{category ?? 'Quà tặng'}</p>
          <p className="shrink-0 text-xs"><span className="font-bold text-[#193f32]"><span className="text-[#f5b800]">★</span> {product.ratingAverage.toFixed(1)}</span><span className="ml-1 text-[#64756b]">({product.ratingCount})</span></p>
        </div>
        <h3 className="mt-1 line-clamp-2 min-h-10 font-bold leading-5 text-[#193f32] group-hover:underline">{product.name}</h3>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="text-lg font-extrabold">{money(product.priceAfterDiscountVnd)}</span>
          {product.priceVnd > product.priceAfterDiscountVnd && <span className="text-xs text-[#78867d] line-through">{money(product.priceVnd)}</span>}
        </div>
        <p className={`mt-2 text-xs font-semibold ${product.stock > 0 ? 'text-[#327450]' : 'text-[#a14537]'}`}>● {product.stock > 0 ? 'Còn hàng' : 'Hết hàng'}</p>
      </div>
    </Link>
  );
}
