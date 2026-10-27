import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../media/storage.service';
import { LocationsService } from '../locations/locations.service';

export type CatalogQuery = { category?: string; search?: string; page?: string; limit?: string; region?: string; minPrice?: string; maxPrice?: string; minRating?: string };
export type AddressVersionKind = 'legacy' | 'current';
const majorRegionByProvince: Record<number, string> = { 1: 'HN', 79: 'HCM', 48: 'DN' };

/** Chuyển tỉnh/thành của người nhận thành token khu vực khớp cột `shippingRegions` của sản phẩm. */
export function regionTokenForProvince(version: AddressVersionKind, provinceCode: number): string {
  return majorRegionByProvince[provinceCode] ?? `${version === 'legacy' ? 'v1' : 'v2'}:${provinceCode}`;
}

export type RecommendationCandidate = {
  productId: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  categories: string[];
  variants: Array<{ variantId: string; label: string; priceVnd: number; stock: number }>;
};

function optionalNumber(value: string | undefined, name: string, max?: number) {
  if (value === undefined || value === '') return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (max !== undefined && number > max)) throw new BadRequestException(`${name} không hợp lệ.`);
  return number;
}

function effectivePrice(priceVnd: number, discountPercent?: number | null, discountAmountVnd?: number | null) {
  const percentDiscount = discountPercent ? Math.round(priceVnd * discountPercent / 100) : 0;
  return Math.max(0, priceVnd - percentDiscount - (discountAmountVnd ?? 0));
}

function searchable(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService, private readonly locations: LocationsService) {}

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, slug: true, name: true, description: true, parentId: true, sortOrder: true },
    });
    const byParent = new Map<string | null, typeof categories>();
    for (const category of categories) {
      const group = byParent.get(category.parentId) ?? [];
      group.push(category);
      byParent.set(category.parentId, group);
    }
    const build = (parentId: string | null): Array<typeof categories[number] & { children: unknown[] }> =>
      (byParent.get(parentId) ?? []).map(category => ({ ...category, children: build(category.id) }));
    return build(null);
  }

  private async mediaUrl(media: { id: string; type: string; originalName: string; mimeType: string; sizeBytes: number; sortOrder: number; objectKey: string }) {
    return { id: media.id, type: media.type, originalName: media.originalName, mimeType: media.mimeType, sizeBytes: media.sizeBytes, sortOrder: media.sortOrder, url: await this.storage.signedUrl(media.objectKey) };
  }

  private async serializeProduct(product: {
    id: string; slug: string; name: string; description: string; priceVnd: number; stock: number; tags: string[]; shippingRegions: string[];
    brand: string | null; supplier: string | null; purchaseCount: number; ratingAverage: number; ratingCount: number;
    discountPercent: number | null; discountAmountVnd: number | null;
    categories: Array<{ category: { id: string; slug: string; name: string } }>;
    media: Array<{ id: string; type: string; originalName: string; mimeType: string; sizeBytes: number; sortOrder: number; objectKey: string }>;
    variants: Array<{ id: string; sku: string; name: string | null; color: string | null; size: string | null; material: string | null; priceVnd: number; stock: number; discountPercent: number | null; discountAmountVnd: number | null; media: Array<{ id: string; type: string; originalName: string; mimeType: string; sizeBytes: number; sortOrder: number; objectKey: string }> }>;
  }, priceRange?: { min?: number; max?: number }) {
    const variants = await Promise.all(product.variants.map(async variant => ({
      id: variant.id, sku: variant.sku, name: variant.name, color: variant.color, size: variant.size, material: variant.material,
      priceVnd: variant.priceVnd,
      priceAfterDiscountVnd: effectivePrice(variant.priceVnd, variant.discountPercent ?? product.discountPercent, variant.discountAmountVnd ?? product.discountAmountVnd),
      stock: variant.stock,
      discountPercent: variant.discountPercent ?? product.discountPercent,
      discountAmountVnd: variant.discountAmountVnd ?? product.discountAmountVnd,
      media: await Promise.all(variant.media.map(media => this.mediaUrl(media))),
    })));
    const allPrices = variants.length ? variants.map(variant => variant.priceAfterDiscountVnd) : [effectivePrice(product.priceVnd, product.discountPercent, product.discountAmountVnd)];
    const prices = priceRange ? allPrices.filter(price => (priceRange.min === undefined || price >= priceRange.min) && (priceRange.max === undefined || price <= priceRange.max)) : allPrices;
    return {
      id: product.id, slug: product.slug, name: product.name, description: product.description,
      priceVnd: product.priceVnd, priceAfterDiscountVnd: Math.min(...prices),
      stock: variants.length ? variants.reduce((total, variant) => total + variant.stock, 0) : product.stock,
      tags: product.tags, brand: product.brand, supplier: product.supplier, shippingRegions: product.shippingRegions, purchaseCount: product.purchaseCount,
      ratingAverage: product.ratingAverage, ratingCount: product.ratingCount,
      discountPercent: product.discountPercent, discountAmountVnd: product.discountAmountVnd,
      categories: product.categories.map(item => item.category), variants,
      media: await Promise.all(product.media.map(media => this.mediaUrl(media))),
    };
  }

  async listProducts(query: CatalogQuery) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit ?? '12', 10) || 12));
    const minPrice = optionalNumber(query.minPrice, 'minPrice');
    const maxPrice = optionalNumber(query.maxPrice, 'maxPrice');
    const minRating = optionalNumber(query.minRating, 'minRating', 5);
    const needle = searchable(query.search?.trim() ?? '');
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) throw new BadRequestException('Giá tối thiểu không được lớn hơn giá tối đa.');
    let shippingRegion = query.region;
    if (shippingRegion && !['HN', 'HCM', 'DN'].includes(shippingRegion)) {
      const match = /^(v1|v2):([1-9]\d{0,5})$/.exec(shippingRegion);
      if (!match) throw new BadRequestException('Khu vực không hợp lệ.');
      const code = Number(match[2]);
      const provinces = await this.locations.provinces(match[1] === 'v1' ? 'legacy' : 'current');
      if (!provinces.some(province => province.code === code)) throw new BadRequestException('Khu vực không hợp lệ.');
      shippingRegion = majorRegionByProvince[code] ?? shippingRegion;
    }
    let categorySlugs: string[] | undefined;
    if (query.category) {
      const categoryRows = await this.prisma.category.findMany({ where: { active: true }, select: { id: true, slug: true, parentId: true } });
      const selected = categoryRows.find(item => item.slug === query.category);
      if (selected) {
        const ids = new Set<string>();
        const pending = [selected];
        while (pending.length) {
          const current = pending.shift();
          if (!current || ids.has(current.slug)) continue;
          ids.add(current.slug);
          pending.push(...categoryRows.filter(item => item.parentId === current.id));
        }
        categorySlugs = [...ids];
      } else categorySlugs = [query.category];
    }
    const where = {
      active: true,
      ...(shippingRegion ? { OR: [{ shippingRegions: { has: 'ALL' } }, { shippingRegions: { has: shippingRegion } }] } : {}),
      ...(minRating !== undefined ? { ratingAverage: { gte: minRating } } : {}),
      ...(categorySlugs ? { categories: { some: { category: { slug: { in: categorySlugs }, active: true } } } } : {}),
    };
    const candidates = await this.prisma.product.findMany({
        where, orderBy: [{ purchaseCount: 'desc' }, { createdAt: 'desc' }],
        include: {
          categories: { include: { category: { select: { id: true, slug: true, name: true } } } },
          media: { where: { variantId: null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          variants: { where: { active: true }, orderBy: { priceVnd: 'asc' }, include: { media: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } },
        },
      });
    const matches = candidates.filter(product => {
      if (needle && !searchable([product.name, product.description, product.brand ?? '', ...product.tags].join(' ')).includes(needle)) return false;
      const prices = product.variants.length
        ? product.variants.map(variant => effectivePrice(variant.priceVnd, variant.discountPercent ?? product.discountPercent, variant.discountAmountVnd ?? product.discountAmountVnd))
        : [effectivePrice(product.priceVnd, product.discountPercent, product.discountAmountVnd)];
      return prices.some(price => (minPrice === undefined || price >= minPrice) && (maxPrice === undefined || price <= maxPrice));
    });
    const total = matches.length;
    const products = matches.slice((page - 1) * limit, page * limit);
    return { items: await Promise.all(products.map(product => this.serializeProduct(product, { min: minPrice, max: maxPrice }))), page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async getProduct(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, active: true },
      include: {
        categories: { include: { category: { select: { id: true, slug: true, name: true } } } },
        media: { where: { variantId: null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        variants: { where: { active: true }, orderBy: { priceVnd: 'asc' }, include: { media: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    return this.serializeProduct(product);
  }

  async recommendationCandidates(maxBudgetVnd: number, region?: string): Promise<RecommendationCandidate[]> {
    const products = await this.prisma.product.findMany({
      where: {
        active: true,
        variants: { some: { active: true, stock: { gt: 0 } } },
        ...(region ? { OR: [{ shippingRegions: { has: 'ALL' } }, { shippingRegions: { has: region } }] } : {}),
      },
      orderBy: [{ purchaseCount: 'desc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        categories: { include: { category: { select: { name: true } } } },
        variants: {
          where: { active: true, stock: { gt: 0 } },
          orderBy: { priceVnd: 'asc' },
          take: 8,
          select: { id: true, sku: true, name: true, color: true, size: true, material: true, priceVnd: true, stock: true, discountPercent: true, discountAmountVnd: true },
        },
      },
    });

    return products.flatMap(product => {
      const variants = product.variants
        .map(variant => ({
          variantId: variant.id,
          label: [variant.name, variant.color, variant.size, variant.material].filter(Boolean).join(' · ') || variant.sku,
          priceVnd: effectivePrice(variant.priceVnd, variant.discountPercent ?? product.discountPercent, variant.discountAmountVnd ?? product.discountAmountVnd),
          stock: variant.stock,
        }))
        .filter(variant => variant.priceVnd <= maxBudgetVnd);
      if (!variants.length) return [];
      return [{
        productId: product.id,
        slug: product.slug,
        name: product.name,
        description: product.description.slice(0, 500),
        tags: product.tags.slice(0, 10),
        categories: product.categories.slice(0, 5).map(item => item.category.name),
        variants,
      }];
    });
  }
}
