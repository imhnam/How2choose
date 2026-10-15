import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../media/storage.service';

export type CatalogQuery = { category?: string; search?: string; page?: string; limit?: string };

function effectivePrice(priceVnd: number, discountPercent?: number | null, discountAmountVnd?: number | null) {
  const percentDiscount = discountPercent ? Math.round(priceVnd * discountPercent / 100) : 0;
  return Math.max(0, priceVnd - percentDiscount - (discountAmountVnd ?? 0));
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService, private readonly storage: StorageService) {}

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
    id: string; slug: string; name: string; description: string; priceVnd: number; stock: number; tags: string[];
    brand: string | null; supplier: string | null; purchaseCount: number; ratingAverage: number; ratingCount: number;
    discountPercent: number | null; discountAmountVnd: number | null;
    categories: Array<{ category: { id: string; slug: string; name: string } }>;
    variants: Array<{ id: string; sku: string; name: string | null; color: string | null; size: string | null; material: string | null; priceVnd: number; stock: number; discountPercent: number | null; discountAmountVnd: number | null; media: Array<{ id: string; type: string; originalName: string; mimeType: string; sizeBytes: number; sortOrder: number; objectKey: string }> }>;
  }) {
    const variants = await Promise.all(product.variants.map(async variant => ({
      id: variant.id, sku: variant.sku, name: variant.name, color: variant.color, size: variant.size, material: variant.material,
      priceVnd: variant.priceVnd,
      priceAfterDiscountVnd: effectivePrice(variant.priceVnd, variant.discountPercent ?? product.discountPercent, variant.discountAmountVnd ?? product.discountAmountVnd),
      stock: variant.stock,
      discountPercent: variant.discountPercent ?? product.discountPercent,
      discountAmountVnd: variant.discountAmountVnd ?? product.discountAmountVnd,
      media: await Promise.all(variant.media.map(media => this.mediaUrl(media))),
    })));
    const prices = variants.length ? variants.map(variant => variant.priceAfterDiscountVnd) : [effectivePrice(product.priceVnd, product.discountPercent, product.discountAmountVnd)];
    return {
      id: product.id, slug: product.slug, name: product.name, description: product.description,
      priceVnd: product.priceVnd, priceAfterDiscountVnd: Math.min(...prices),
      stock: variants.length ? variants.reduce((total, variant) => total + variant.stock, 0) : product.stock,
      tags: product.tags, brand: product.brand, supplier: product.supplier, purchaseCount: product.purchaseCount,
      ratingAverage: product.ratingAverage, ratingCount: product.ratingCount,
      discountPercent: product.discountPercent, discountAmountVnd: product.discountAmountVnd,
      categories: product.categories.map(item => item.category), variants,
    };
  }

  async listProducts(query: CatalogQuery) {
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit ?? '12', 10) || 12));
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
      ...(categorySlugs ? { categories: { some: { category: { slug: { in: categorySlugs }, active: true } } } } : {}),
      ...(query.search?.trim() ? { OR: [
        { name: { contains: query.search.trim(), mode: 'insensitive' as const } },
        { description: { contains: query.search.trim(), mode: 'insensitive' as const } },
        { brand: { contains: query.search.trim(), mode: 'insensitive' as const } },
      ] } : {}),
    };
    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where, orderBy: [{ purchaseCount: 'desc' }, { createdAt: 'desc' }], skip: (page - 1) * limit, take: limit,
        include: {
          categories: { include: { category: { select: { id: true, slug: true, name: true } } } },
          variants: { where: { active: true }, orderBy: { priceVnd: 'asc' }, include: { media: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } },
        },
      }),
    ]);
    return { items: await Promise.all(products.map(product => this.serializeProduct(product))), page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async getProduct(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, active: true },
      include: {
        categories: { include: { category: { select: { id: true, slug: true, name: true } } } },
        variants: { where: { active: true }, orderBy: { priceVnd: 'asc' }, include: { media: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } } },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    return this.serializeProduct(product);
  }
}
