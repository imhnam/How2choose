import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../media/storage.service';
import { OrdersService } from '../orders/orders.service';
import {
  AdminOrderQueryDto,
  AdminProductQueryDto,
  CreateCategoryDto,
  CreateProductDto,
  CreateVariantDto,
  ORDER_STATUSES,
  ReorderMediaDto,
  UpdateCategoryDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './admin.dto';

const productInclude = {
  categories: { include: { category: { select: { id: true, slug: true, name: true, active: true } } } },
  media: { where: { variantId: null }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
  variants: {
    orderBy: { createdAt: 'asc' },
    include: { media: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
  },
} satisfies Prisma.ProductInclude;

const orderInclude = {
  owner: { select: { id: true, email: true, phone: true, displayName: true } },
  payment: true,
  items: true,
  _count: { select: { items: true } },
} satisfies Prisma.OrderInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;
type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;
type MediaRow = {
  id: string;
  variantId: string | null;
  type: 'IMAGE' | 'VIDEO';
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  createdAt: Date;
};

function effectivePrice(priceVnd: number, discountPercent?: number | null, discountAmountVnd?: number | null) {
  const percentDiscount = discountPercent ? Math.round(priceVnd * discountPercent / 100) : 0;
  return Math.max(0, priceVnd - percentDiscount - (discountAmountVnd ?? 0));
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'san-pham';
}

function normalizeTags(tags?: string[]) {
  return [...new Set((tags ?? []).map(tag => tag.trim()).filter(Boolean))];
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly orders: OrdersService,
  ) {}

  async summary() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [productTotal, productActive, lowStock, groupedOrders, revenue, shipmentFailed, recentOrders] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { active: true } }),
      this.prisma.productVariant.findMany({
        where: { active: true, stock: { lte: 5 } },
        orderBy: { stock: 'asc' },
        take: 10,
        select: { id: true, sku: true, name: true, stock: true, product: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.order.aggregate({ where: { status: 'PAID', paidAt: { gte: since } }, _sum: { totalVnd: true } }),
      this.prisma.order.count({ where: { shipmentStatus: 'FAILED' } }),
      this.prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: orderInclude }),
    ]);
    const byStatus = Object.fromEntries(ORDER_STATUSES.map(status => [status, groupedOrders.find(item => item.status === status)?._count._all ?? 0]));
    return {
      products: { total: productTotal, active: productActive, inactive: productTotal - productActive },
      lowStock: { threshold: 5, items: lowStock },
      orders: {
        byStatus,
        pendingPayment: byStatus.PENDING_PAYMENT,
        paymentReview: byStatus.PAYMENT_REVIEW,
      },
      revenue30dVnd: revenue._sum.totalVnd ?? 0,
      shipmentFailed,
      recentOrders: recentOrders.map(order => this.serializeOrder(order)),
    };
  }

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    return {
      items: categories.map(category => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        parentId: category.parentId,
        sortOrder: category.sortOrder,
        active: category.active,
        productCount: category._count.products,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      })),
    };
  }

  async createCategory(dto: CreateCategoryDto) {
    await this.assertParentCategory(dto.parentId ?? null);
    const slug = dto.slug ? dto.slug.trim() : await this.uniqueCategorySlug(slugify(dto.name));
    if (dto.slug) await this.assertCategorySlugAvailable(slug);
    try {
      const category = await this.prisma.category.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim() || null,
          parentId: dto.parentId ?? null,
          sortOrder: dto.sortOrder ?? 0,
          active: dto.active ?? true,
        },
      });
      return this.categoryResponse(category.id);
    } catch (error) {
      this.translateUniqueError(error, 'Slug danh mục đã tồn tại.');
    }
  }

  async updateCategory(id: string, dto: UpdateCategoryDto) {
    const current = await this.prisma.category.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Không tìm thấy danh mục.');
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) throw new BadRequestException('Danh mục không thể là cha của chính nó.');
      await this.assertParentCategory(dto.parentId);
      let cursor: string | null = dto.parentId;
      const seen = new Set<string>();
      while (cursor) {
        if (cursor === id) throw new BadRequestException('Không thể chọn danh mục con làm danh mục cha.');
        if (seen.has(cursor)) throw new BadRequestException('Cây danh mục không hợp lệ.');
        seen.add(cursor);
        const parent: { parentId: string | null } | null = await this.prisma.category.findUnique({ where: { id: cursor }, select: { parentId: true } });
        if (!parent) throw new BadRequestException('Danh mục cha không tồn tại.');
        cursor = parent.parentId;
      }
    }
    if (dto.slug !== undefined) await this.assertCategorySlugAvailable(dto.slug.trim(), id);
    if (dto.active === false) await this.assertCategoryCanHide(id);
    const data: Prisma.CategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = dto.slug.trim();
    if (dto.description !== undefined) data.description = dto.description?.trim() || null;
    if (dto.parentId !== undefined) data.parent = dto.parentId ? { connect: { id: dto.parentId } } : { disconnect: true };
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.active !== undefined) data.active = dto.active;
    try {
      await this.prisma.category.update({ where: { id }, data });
    } catch (error) {
      this.translateUniqueError(error, 'Slug danh mục đã tồn tại.');
    }
    return this.categoryResponse(id);
  }

  async deleteCategory(id: string, hard: boolean) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { children: true, products: true } } },
    });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục.');
    if (hard) {
      if (category._count.children || category._count.products) {
        throw new ConflictException('Không thể xóa cứng danh mục còn danh mục con hoặc sản phẩm.');
      }
      await this.prisma.category.delete({ where: { id } });
      return { deleted: true };
    }
    await this.assertCategoryCanHide(id);
    await this.prisma.category.update({ where: { id }, data: { active: false } });
    return { archived: true };
  }

  async listProducts(query: AdminProductQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where: Prisma.ProductWhereInput = {};
    if (query.status === 'active') where.active = true;
    if (query.status === 'inactive') where.active = false;
    if (query.categoryId) where.categories = { some: { categoryId: query.categoryId } };
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } },
      ];
    }
    const orderBy: Prisma.ProductOrderByWithRelationInput = query.sort === 'name'
      ? { name: 'asc' }
      : query.sort === 'price'
        ? { priceVnd: 'asc' }
        : query.sort === 'createdAt'
          ? { createdAt: 'desc' }
          : { updatedAt: 'desc' };
    const [total, products] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: productInclude }),
    ]);
    return {
      items: await Promise.all(products.map(product => this.serializeProductSummary(product))),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: productInclude });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    return this.serializeProduct(product);
  }

  async createProduct(dto: CreateProductDto) {
    if (dto.active) throw new BadRequestException('Hãy tạo sản phẩm ở trạng thái nháp, thêm biến thể rồi xuất bản.');
    this.assertDiscount(dto.priceVnd, dto.discountPercent ?? null, dto.discountAmountVnd ?? null);
    this.assertShippingRegions(dto.shippingRegions ?? ['ALL']);
    const categoryIds = dto.categoryIds ?? [];
    await this.assertCategoryIds(categoryIds);
    const slug = dto.slug ? dto.slug.trim() : await this.uniqueProductSlug(slugify(dto.name));
    if (dto.slug) await this.assertProductSlugAvailable(slug);
    try {
      const product = await this.prisma.product.create({
        data: {
          name: dto.name.trim(),
          slug,
          description: dto.description.trim(),
          priceVnd: dto.priceVnd,
          stock: 0,
          tags: normalizeTags(dto.tags),
          brand: dto.brand?.trim() || null,
          supplier: dto.supplier?.trim() || null,
          shippingRegions: dto.shippingRegions ?? ['ALL'],
          discountPercent: dto.discountPercent ?? null,
          discountAmountVnd: dto.discountAmountVnd ?? null,
          active: false,
          ...(categoryIds.length ? { categories: { create: categoryIds.map(categoryId => ({ categoryId })) } } : {}),
        },
      });
      return this.getProduct(product.id);
    } catch (error) {
      this.translateUniqueError(error, 'Slug sản phẩm đã tồn tại.');
    }
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const current = await this.prisma.product.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Không tìm thấy sản phẩm.');
    const nextPrice = dto.priceVnd ?? current.priceVnd;
    const nextPercent = dto.discountPercent !== undefined ? dto.discountPercent : current.discountPercent;
    const nextAmount = dto.discountAmountVnd !== undefined ? dto.discountAmountVnd : current.discountAmountVnd;
    this.assertDiscount(nextPrice, nextPercent, nextAmount);
    if (dto.shippingRegions !== undefined) this.assertShippingRegions(dto.shippingRegions);
    if (dto.categoryIds !== undefined) await this.assertCategoryIds(dto.categoryIds);
    if (dto.slug !== undefined) await this.assertProductSlugAvailable(dto.slug.trim(), id);
    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = dto.slug.trim();
    if (dto.description !== undefined) data.description = dto.description.trim();
    if (dto.priceVnd !== undefined) data.priceVnd = dto.priceVnd;
    if (dto.tags !== undefined) data.tags = normalizeTags(dto.tags);
    if (dto.brand !== undefined) data.brand = dto.brand?.trim() || null;
    if (dto.supplier !== undefined) data.supplier = dto.supplier?.trim() || null;
    if (dto.shippingRegions !== undefined) data.shippingRegions = dto.shippingRegions;
    if (dto.discountPercent !== undefined) data.discountPercent = dto.discountPercent;
    if (dto.discountAmountVnd !== undefined) data.discountAmountVnd = dto.discountAmountVnd;
    if (dto.active !== undefined) data.active = dto.active;
    try {
      await this.prisma.$transaction(async tx => {
        await tx.product.update({ where: { id }, data });
        if (dto.categoryIds !== undefined) {
          await tx.productCategory.deleteMany({ where: { productId: id } });
          if (dto.categoryIds.length) {
            await tx.productCategory.createMany({ data: dto.categoryIds.map(categoryId => ({ productId: id, categoryId })) });
          }
        }
        if (dto.active === true) await this.assertPublishable(tx, id);
      });
    } catch (error) {
      this.translateUniqueError(error, 'Slug sản phẩm đã tồn tại.');
    }
    return this.getProduct(id);
  }

  async archiveProduct(id: string) {
    await this.assertProductExists(id);
    await this.prisma.product.update({ where: { id }, data: { active: false } });
    return { archived: true };
  }

  async restoreProduct(id: string) {
    await this.prisma.$transaction(async tx => {
      await tx.product.update({ where: { id }, data: { active: true } });
      await this.assertPublishable(tx, id);
    });
    return this.getProduct(id);
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    await this.assertProductExists(productId);
    this.assertVariantPackage({ ...dto, sku: dto.sku });
    this.assertDiscount(dto.priceVnd, dto.discountPercent ?? null, dto.discountAmountVnd ?? null);
    try {
      await this.prisma.$transaction(async tx => {
        await tx.productVariant.create({
          data: {
            productId,
            sku: dto.sku,
            name: dto.name?.trim() || null,
            color: dto.color?.trim() || null,
            size: dto.size?.trim() || null,
            material: dto.material?.trim() || null,
            priceVnd: dto.priceVnd,
            stock: dto.stock,
            packageWeightGram: dto.packageWeightGram,
            packageLengthCm: dto.packageLengthCm,
            packageWidthCm: dto.packageWidthCm,
            packageHeightCm: dto.packageHeightCm,
            discountPercent: dto.discountPercent ?? null,
            discountAmountVnd: dto.discountAmountVnd ?? null,
            active: dto.active ?? true,
          },
        });
        await this.syncProductStock(tx, productId);
      });
    } catch (error) {
      this.translateUniqueError(error, 'SKU đã tồn tại.');
    }
    return this.getProduct(productId);
  }

  async updateVariant(id: string, dto: UpdateVariantDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: { product: { select: { id: true, active: true } } },
    });
    if (!variant) throw new NotFoundException('Không tìm thấy biến thể sản phẩm.');
    if (dto.sku !== undefined) {
      const duplicate = await this.prisma.productVariant.findFirst({ where: { sku: dto.sku, NOT: { id } }, select: { id: true } });
      if (duplicate) throw new ConflictException('SKU đã tồn tại.');
    }
    const nextActive = dto.active ?? variant.active;
    if (variant.product.active && variant.active && !nextActive) {
      const activeCount = await this.prisma.productVariant.count({ where: { productId: variant.productId, active: true } });
      if (activeCount <= 1) throw new ConflictException('Sản phẩm đang bán phải có ít nhất một biến thể đang hoạt động.');
    }
    const nextPrice = dto.priceVnd ?? variant.priceVnd;
    const nextPercent = dto.discountPercent !== undefined ? dto.discountPercent : variant.discountPercent;
    const nextAmount = dto.discountAmountVnd !== undefined ? dto.discountAmountVnd : variant.discountAmountVnd;
    this.assertDiscount(nextPrice, nextPercent, nextAmount);
    this.assertVariantPackage({
      sku: dto.sku ?? variant.sku,
      packageWeightGram: dto.packageWeightGram ?? variant.packageWeightGram,
      packageLengthCm: dto.packageLengthCm ?? variant.packageLengthCm,
      packageWidthCm: dto.packageWidthCm ?? variant.packageWidthCm,
      packageHeightCm: dto.packageHeightCm ?? variant.packageHeightCm,
    });
    const data: Prisma.ProductVariantUpdateInput = {};
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.name !== undefined) data.name = dto.name?.trim() || null;
    if (dto.color !== undefined) data.color = dto.color?.trim() || null;
    if (dto.size !== undefined) data.size = dto.size?.trim() || null;
    if (dto.material !== undefined) data.material = dto.material?.trim() || null;
    if (dto.priceVnd !== undefined) data.priceVnd = dto.priceVnd;
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.packageWeightGram !== undefined) data.packageWeightGram = dto.packageWeightGram;
    if (dto.packageLengthCm !== undefined) data.packageLengthCm = dto.packageLengthCm;
    if (dto.packageWidthCm !== undefined) data.packageWidthCm = dto.packageWidthCm;
    if (dto.packageHeightCm !== undefined) data.packageHeightCm = dto.packageHeightCm;
    if (dto.discountPercent !== undefined) data.discountPercent = dto.discountPercent;
    if (dto.discountAmountVnd !== undefined) data.discountAmountVnd = dto.discountAmountVnd;
    if (dto.active !== undefined) data.active = dto.active;
    try {
      await this.prisma.$transaction(async tx => {
        await tx.productVariant.update({ where: { id }, data });
        await this.syncProductStock(tx, variant.productId);
      });
    } catch (error) {
      this.translateUniqueError(error, 'SKU đã tồn tại.');
    }
    return this.getProduct(variant.productId);
  }

  async deleteVariant(id: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: { product: { select: { id: true, active: true } }, media: { select: { objectKey: true } } },
    });
    if (!variant) throw new NotFoundException('Không tìm thấy biến thể sản phẩm.');
    if (variant.product.active && variant.active) {
      const activeCount = await this.prisma.productVariant.count({ where: { productId: variant.productId, active: true } });
      if (activeCount <= 1) throw new ConflictException('Không thể xóa biến thể hoạt động cuối cùng của sản phẩm đang bán. Hãy ngừng bán sản phẩm trước.');
    }
    const ordered = await this.prisma.orderItem.count({ where: { variantId: id } });
    if (ordered) {
      await this.prisma.$transaction(async tx => {
        await tx.productVariant.update({ where: { id }, data: { active: false } });
        await this.syncProductStock(tx, variant.productId);
      });
      return { archived: true };
    }
    await this.prisma.$transaction(async tx => {
      await tx.productVariant.delete({ where: { id } });
      await this.syncProductStock(tx, variant.productId);
    });
    await Promise.allSettled(variant.media.map(item => this.storage.remove(item.objectKey)));
    return { deleted: true };
  }

  async reorderMedia(dto: ReorderMediaDto) {
    const media = await this.prisma.productMedia.findMany({
      where: { id: { in: dto.mediaIds } },
      select: { id: true, productId: true, variantId: true },
    });
    if (media.length !== dto.mediaIds.length) throw new NotFoundException('Một hoặc nhiều media không tồn tại.');
    const productIds = new Set(media.map(item => item.productId));
    const variantIds = new Set(media.map(item => item.variantId ?? null));
    if (productIds.size !== 1 || variantIds.size !== 1) {
      throw new BadRequestException('Chỉ có thể sắp xếp media trong cùng một phạm vi sản phẩm hoặc biến thể.');
    }
    await this.prisma.$transaction(media.map((item, index) => this.prisma.productMedia.update({ where: { id: item.id }, data: { sortOrder: index } })));
    return { ok: true };
  }

  async listOrders(query: AdminOrderQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const where: Prisma.OrderWhereInput = {};
    if (query.status) where.status = query.status;
    const q = query.q?.trim();
    if (q) {
      where.OR = [
        { orderNumber: { contains: q, mode: 'insensitive' } },
        { recipientName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    const [total, orders] = await this.prisma.$transaction([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, include: orderInclude }),
    ]);
    return {
      items: orders.map(order => this.serializeOrder(order)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng.');
    return this.serializeOrder(order);
  }

  async retryOrderShipment(id: string) {
    await this.orders.retryShipmentForAdmin(id);
    return this.getOrder(id);
  }

  private async serializeProductSummary(product: ProductRow) {
    const { media, variants, categories, ...rest } = product;
    const activeVariants = variants.filter(variant => variant.active);
    const cover = media.find(item => item.type === 'IMAGE') ?? variants.flatMap(variant => variant.media).find(item => item.type === 'IMAGE');
    const prices = activeVariants.map(variant => effectivePrice(variant.priceVnd, variant.discountPercent ?? product.discountPercent, variant.discountAmountVnd ?? product.discountAmountVnd));
    const fallbackPrice = effectivePrice(product.priceVnd, product.discountPercent, product.discountAmountVnd);
    return {
      id: rest.id,
      slug: rest.slug,
      name: rest.name,
      priceVnd: rest.priceVnd,
      discountPercent: rest.discountPercent,
      discountAmountVnd: rest.discountAmountVnd,
      active: rest.active,
      brand: rest.brand,
      supplier: rest.supplier,
      tags: rest.tags,
      shippingRegions: rest.shippingRegions,
      categories: categories.map(item => item.category),
      variantCount: variants.length,
      activeVariantCount: activeVariants.length,
      stock: activeVariants.reduce((total, variant) => total + variant.stock, 0),
      priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: fallbackPrice, max: fallbackPrice },
      coverUrl: cover ? await this.storage.signedUrl(cover.objectKey) : null,
      updatedAt: rest.updatedAt,
      createdAt: rest.createdAt,
    };
  }

  private async serializeProduct(product: ProductRow) {
    const { media, variants, categories, ...rest } = product;
    const activeVariants = variants.filter(variant => variant.active);
    const cover = media.find(item => item.type === 'IMAGE') ?? variants.flatMap(variant => variant.media).find(item => item.type === 'IMAGE');
    const prices = activeVariants.map(variant => effectivePrice(variant.priceVnd, variant.discountPercent ?? product.discountPercent, variant.discountAmountVnd ?? product.discountAmountVnd));
    const fallbackPrice = effectivePrice(product.priceVnd, product.discountPercent, product.discountAmountVnd);
    return {
      ...rest,
      categories: categories.map(item => item.category),
      media: await this.serializeMedia(media),
      variants: await Promise.all(variants.map(async variant => {
        const { media: variantMedia, ...variantRest } = variant;
        return {
          ...variantRest,
          effectivePriceVnd: effectivePrice(variant.priceVnd, variant.discountPercent ?? product.discountPercent, variant.discountAmountVnd ?? product.discountAmountVnd),
          media: await this.serializeMedia(variantMedia),
        };
      })),
      stock: activeVariants.reduce((total, variant) => total + variant.stock, 0),
      priceRange: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: fallbackPrice, max: fallbackPrice },
      coverUrl: cover ? await this.storage.signedUrl(cover.objectKey) : null,
    };
  }

  private async serializeMedia(media: MediaRow[]) {
    return Promise.all(media.map(async item => ({
      id: item.id,
      variantId: item.variantId,
      type: item.type,
      originalName: item.originalName,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      sortOrder: item.sortOrder,
      url: await this.storage.signedUrl(item.objectKey),
    })));
  }

  private serializeOrder(order: OrderRow) {
    const { items, _count, ...rest } = order;
    const fields = rest as Record<string, unknown>;
    delete fields.requestHash;
    delete fields.idempotencyKey;
    delete fields.ownerId;
    return {
      ...fields,
      itemCount: _count.items,
      items,
      payment: order.payment ? {
        id: order.payment.id,
        status: order.payment.status,
        amountVnd: order.payment.amountVnd,
        paidAt: order.payment.paidAt,
        responseCode: order.payment.responseCode,
        bankCode: order.payment.bankCode,
        txnRef: order.payment.txnRef,
        gatewayTransactionNo: order.payment.gatewayTransactionNo,
      } : null,
    };
  }

  private async categoryResponse(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('Không tìm thấy danh mục.');
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      description: category.description,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      active: category.active,
      productCount: category._count.products,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private async assertPublishable(tx: Prisma.TransactionClient, id: string) {
    const product = await tx.product.findUnique({
      where: { id },
      include: {
        variants: { where: { active: true } },
        categories: { include: { category: { select: { active: true } } } },
      },
    });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm.');
    if (!product.variants.length) throw new BadRequestException('Sản phẩm phải có ít nhất một biến thể đang hoạt động trước khi xuất bản.');
    for (const variant of product.variants) {
      this.assertVariantPackage({
        sku: variant.sku,
        packageWeightGram: variant.packageWeightGram,
        packageLengthCm: variant.packageLengthCm,
        packageWidthCm: variant.packageWidthCm,
        packageHeightCm: variant.packageHeightCm,
      });
    }
    if (!product.categories.some(item => item.category.active)) {
      throw new BadRequestException('Sản phẩm phải thuộc ít nhất một danh mục đang hoạt động trước khi xuất bản.');
    }
  }

  private async syncProductStock(tx: Prisma.TransactionClient, productId: string) {
    const aggregate = await tx.productVariant.aggregate({ where: { productId, active: true }, _sum: { stock: true } });
    await tx.product.update({ where: { id: productId }, data: { stock: aggregate._sum.stock ?? 0 } });
  }

  private async assertProductExists(id: string) {
    if (!(await this.prisma.product.findUnique({ where: { id }, select: { id: true } }))) {
      throw new NotFoundException('Không tìm thấy sản phẩm.');
    }
  }

  private async assertParentCategory(parentId: string | null) {
    if (!parentId) return;
    if (!(await this.prisma.category.findUnique({ where: { id: parentId }, select: { id: true } }))) {
      throw new BadRequestException('Danh mục cha không tồn tại.');
    }
  }

  private async assertCategoryCanHide(id: string) {
    const activeChildren = await this.prisma.category.count({ where: { parentId: id, active: true } });
    if (activeChildren) throw new ConflictException('Không thể ẩn danh mục còn danh mục con đang hoạt động.');
    const activeProducts = await this.prisma.productCategory.count({ where: { categoryId: id, product: { active: true } } });
    if (activeProducts) throw new ConflictException('Không thể ẩn danh mục còn sản phẩm đang bán. Hãy chuyển sản phẩm sang danh mục khác trước.');
  }

  private async assertCategoryIds(ids: string[]) {
    if (!ids.length) return;
    const found = await this.prisma.category.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (found.length !== ids.length) throw new BadRequestException('Một hoặc nhiều danh mục không tồn tại.');
  }

  private assertVariantPackage(variant: {
    sku?: string | null;
    packageWeightGram?: number | null;
    packageLengthCm?: number | null;
    packageWidthCm?: number | null;
    packageHeightCm?: number | null;
  }) {
    const values = [variant.packageWeightGram, variant.packageLengthCm, variant.packageWidthCm, variant.packageHeightCm];
    if (values.some(value => value === null || value === undefined || value <= 0)) {
      throw new BadRequestException(`Biến thể ${variant.sku ?? ''} chưa có đủ cân nặng và kích thước đóng gói.`);
    }
  }

  private assertDiscount(priceVnd: number, percent?: number | null, amount?: number | null) {
    if (percent !== null && percent !== undefined && (percent < 0 || percent > 100)) {
      throw new BadRequestException('Giảm giá phần trăm phải từ 0 đến 100.');
    }
    if (amount !== null && amount !== undefined && amount < 0) {
      throw new BadRequestException('Giảm giá số tiền không được âm.');
    }
    const effective = priceVnd - Math.round(priceVnd * (percent ?? 0) / 100) - (amount ?? 0);
    if (effective < 0) throw new BadRequestException('Giảm giá vượt quá giá bán.');
  }

  private assertShippingRegions(regions: string[]) {
    if (!regions.length) throw new BadRequestException('Vui lòng chọn ít nhất một khu vực giao hàng.');
    if (regions.includes('ALL') && regions.length > 1) {
      throw new BadRequestException('Khu vực "Toàn quốc" không được chọn cùng khu vực cụ thể.');
    }
  }

  private async assertProductSlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.product.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
    if (existing) throw new ConflictException('Slug sản phẩm đã tồn tại.');
  }

  private async uniqueProductSlug(base: string) {
    let candidate = base;
    for (let index = 2; index <= 100; index++) {
      if (!(await this.prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
      candidate = `${base}-${index}`;
    }
    throw new ConflictException('Không thể tạo slug duy nhất cho sản phẩm.');
  }

  private async assertCategorySlugAvailable(slug: string, excludeId?: string) {
    const existing = await this.prisma.category.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } });
    if (existing) throw new ConflictException('Slug danh mục đã tồn tại.');
  }

  private async uniqueCategorySlug(base: string) {
    let candidate = base;
    for (let index = 2; index <= 100; index++) {
      if (!(await this.prisma.category.findUnique({ where: { slug: candidate }, select: { id: true } }))) return candidate;
      candidate = `${base}-${index}`;
    }
    throw new ConflictException('Không thể tạo slug duy nhất cho danh mục.');
  }

  private translateUniqueError(error: unknown, message: string): never {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
      throw new ConflictException(message);
    }
    throw error;
  }
}
