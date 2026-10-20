import { BadRequestException } from '@nestjs/common';
import { CatalogService } from '../src/catalog/catalog.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { StorageService } from '../src/media/storage.service';
import { LocationsService } from '../src/locations/locations.service';

const product = {
  id: 'product-1', slug: 'gift', name: 'Quà tặng', description: 'Mô tả', priceVnd: 100000, stock: 3,
  tags: [], brand: null, supplier: null, shippingRegions: ['HN'], purchaseCount: 0, ratingAverage: 4.8, ratingCount: 12,
  discountPercent: null, discountAmountVnd: null,
  categories: [{ category: { id: 'category-1', slug: 'gifts', name: 'Quà tặng' } }],
  variants: [
    { id: 'cheap', sku: 'CHEAP', name: null, color: null, size: null, material: null, priceVnd: 100000, stock: 1, discountPercent: null, discountAmountVnd: null, media: [] },
    { id: 'expensive', sku: 'EXPENSIVE', name: null, color: null, size: null, material: null, priceVnd: 300000, stock: 2, discountPercent: 10, discountAmountVnd: 20000, media: [] },
  ],
};

describe('Catalog filters', () => {
  const findMany = jest.fn().mockResolvedValue([product]);
  const prisma = { product: { findMany } } as unknown as PrismaService;
  const service = new CatalogService(prisma, {} as StorageService, {} as LocationsService);

  beforeEach(() => findMany.mockClear());

  it('filters on the effective variant price and displays the matching price', async () => {
    const result = await service.listProducts({ minPrice: '200000', maxPrice: '260000', region: 'HN', minRating: '4.5' });
    expect(result.total).toBe(1);
    expect(result.items[0].priceAfterDiscountVnd).toBe(250000);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ratingAverage: { gte: 4.5 } }) }));
  });

  it('excludes products when no variant matches the price range', async () => {
    const result = await service.listProducts({ minPrice: '110000', maxPrice: '200000' });
    expect(result.total).toBe(0);
  });

  it('rejects an inverted price range', async () => {
    await expect(service.listProducts({ minPrice: '300000', maxPrice: '100000' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('matches Vietnamese names without requiring diacritics', async () => {
    const result = await service.listProducts({ search: 'qua tang' });
    expect(result.total).toBe(1);
  });
});
