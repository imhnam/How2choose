import { BadGatewayException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { CatalogService, RecommendationCandidate } from '../src/catalog/catalog.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RecommendationsService } from '../src/recommendations/recommendations.service';

const candidate: RecommendationCandidate = {
  productId: 'product-1',
  slug: 'handmade-notebook',
  name: 'Sổ tay thủ công',
  description: 'Sổ tay bìa vải dùng hằng ngày.',
  tags: ['sổ tay', 'thủ công'],
  categories: ['Văn phòng phẩm'],
  variants: [{ variantId: 'variant-1', label: 'Xanh · A5', priceVnd: 189000, stock: 3 }],
};
const secondCandidate: RecommendationCandidate = {
  productId: 'product-2',
  slug: 'wooden-bookmark',
  name: 'Bookmark gỗ',
  description: 'Bookmark gỗ thủ công.',
  tags: ['bookmark'],
  categories: ['Phụ kiện'],
  variants: [{ variantId: 'variant-2', label: 'Gỗ sồi', priceVnd: 90000, stock: 5 }],
};

const catalogProduct = {
  id: candidate.productId,
  slug: candidate.slug,
  name: candidate.name,
  description: candidate.description,
  priceVnd: 189000,
  priceAfterDiscountVnd: 189000,
  stock: 3,
  tags: candidate.tags,
  brand: null,
  supplier: null,
  shippingRegions: ['ALL'],
  purchaseCount: 0,
  ratingAverage: 4.8,
  ratingCount: 12,
  discountPercent: null,
  discountAmountVnd: null,
  categories: [{ id: 'category-1', slug: 'stationery', name: 'Văn phòng phẩm' }],
  variants: [{
    id: 'variant-1',
    sku: 'NOTEBOOK-1',
    name: null,
    color: 'Xanh',
    size: 'A5',
    material: 'Vải',
    priceVnd: 189000,
    priceAfterDiscountVnd: 189000,
    stock: 3,
    discountPercent: null,
    discountAmountVnd: null,
    media: [],
  }],
};
const secondCatalogProduct = {
  ...catalogProduct,
  id: secondCandidate.productId,
  slug: secondCandidate.slug,
  name: secondCandidate.name,
  description: secondCandidate.description,
  priceVnd: 90000,
  priceAfterDiscountVnd: 90000,
  variants: [{
    ...catalogProduct.variants[0],
    id: 'variant-2',
    sku: 'BOOKMARK-1',
    color: null,
    size: null,
    material: 'Gỗ sồi',
    priceVnd: 90000,
    priceAfterDiscountVnd: 90000,
    stock: 5,
  }],
};

describe('RecommendationsService', () => {
  const previousApiKey = process.env.GEMINI_API_KEY;
  const previousModel = process.env.GEMINI_MODEL;
  const recipientFindFirst = jest.fn();
  const conversationFindFirst = jest.fn();
  const conversationCreate = jest.fn();
  const conversationUpdate = jest.fn();
  const recommendationCandidates = jest.fn();
  const getProduct = jest.fn();
  const prisma = {
    recipient: { findFirst: recipientFindFirst },
    recommendationConversation: {
      findFirst: conversationFindFirst,
      create: conversationCreate,
      update: conversationUpdate,
    },
  } as unknown as PrismaService;
  const catalog = { recommendationCandidates, getProduct } as unknown as CatalogService;
  const service = new RecommendationsService(prisma, catalog);
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'unit-test-key';
    process.env.GEMINI_MODEL = 'gemini_2.5_flash_lite';
    const recipientProfile = {
      displayName: 'An',
      relationship: 'Bạn',
      birthday: null,
      interests: ['đọc sách'],
      dislikes: ['đồ ngọt'],
      notes: 'Thích sản phẩm thủ công',
    };
    recipientFindFirst.mockImplementation(({ select }: { select?: { recommendationConversations?: unknown } }) => Promise.resolve(
      select?.recommendationConversations ? { id: 'recipient-1', recommendationConversations: [] } : recipientProfile,
    ));
    conversationFindFirst.mockResolvedValue(null);
    const savedConversation = (data: { occasion: string; budgetVnd: number; messages: { create: Array<{ role: string; content: string; bundles?: unknown }> } }, id = 'conversation-1') => ({
      id,
      occasion: data.occasion,
      budgetVnd: data.budgetVnd,
      messages: data.messages.create.map((message, index) => ({
        id: `message-${index + 1}`,
        ...message,
        bundles: message.bundles ?? [],
        createdAt: new Date(`2026-10-21T10:0${index}:00.000Z`),
      })).reverse(),
    });
    conversationCreate.mockImplementation(({ data }: { data: Parameters<typeof savedConversation>[0] }) => savedConversation(data));
    conversationUpdate.mockImplementation(({ data }: { data: Parameters<typeof savedConversation>[0] }) => savedConversation(data));
    recommendationCandidates.mockResolvedValue([candidate, secondCandidate]);
    getProduct.mockImplementation((slug: string) => Promise.resolve(slug === candidate.slug ? catalogProduct : secondCatalogProduct));
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (previousApiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = previousApiKey;
    if (previousModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = previousModel;
  });

  it('scopes recipient lookup to the owner and returns only verified catalog products', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({
          message: 'Một món quà phù hợp.',
          followUpQuestion: '',
          bundles: [
            { title: 'Gói đọc sách', reason: 'Phù hợp sở thích.', items: [
              { productId: candidate.productId, variantId: 'variant-1', quantity: 1, reason: 'Dùng mỗi ngày.' },
              { productId: secondCandidate.productId, variantId: 'variant-2', quantity: 1, reason: 'Đi kèm hữu ích.' },
            ] },
            { title: 'Gói có sản phẩm giả', reason: 'Không được chọn.', items: [
              { productId: 'untrusted-product', variantId: 'variant-unknown', quantity: 1, reason: 'Không có trong catalog.' },
            ] },
            { title: 'Gói vượt ngân sách', reason: 'Không được chọn.', items: [
              { productId: candidate.productId, variantId: 'variant-1', quantity: 3, reason: 'Tổng vượt ngân sách.' },
            ] },
          ],
        }) }] } }],
      }),
    } as Response);

    const result = await service.recommend('owner-1', {
      recipientId: 'recipient-1',
      budgetVnd: 500000,
      occasion: 'birthday',
    });

    expect(recipientFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'recipient-1', ownerId: 'owner-1' },
    }));
    expect(fetchMock).toHaveBeenCalledWith('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', expect.objectContaining({
      headers: expect.objectContaining({ 'x-goog-api-key': 'unit-test-key' }),
    }));
    expect(result.bundles).toHaveLength(1);
    expect(result.bundles[0]).toMatchObject({
      totalPriceVnd: 279000,
      items: [
        { product: { id: candidate.productId }, variantId: 'variant-1', priceVnd: 189000, quantity: 1, reason: 'Dùng mỗi ngày.' },
        { product: { id: secondCandidate.productId }, variantId: 'variant-2', priceVnd: 90000, quantity: 1, reason: 'Đi kèm hữu ích.' },
      ],
    });
    expect(result.messages.map(message => message.role)).toEqual(['USER', 'ASSISTANT']);
    expect(result.messages[0].content).toContain('Tìm gợi ý quà dịp sinh nhật');
    expect(result.messages[1].bundles).toHaveLength(1);
    expect(result.messages[1].bundles[0].items[0].product.variants).toHaveLength(1);
    expect(result.messages[1].bundles[0].items[0].product).not.toHaveProperty('tags');
    expect(result.conversationId).toBe('conversation-1');
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { contents: Array<{ parts: Array<{ text: string }> }> };
    const sentContext = JSON.parse(requestBody.contents[0].parts[0].text) as Record<string, unknown>;
    expect(sentContext).not.toHaveProperty('recipient.displayName');
    expect(JSON.stringify(sentContext)).not.toContain('phone');
    expect(JSON.stringify(sentContext)).not.toContain('address');
  });

  it('rejects recipient IDs that do not belong to the requesting owner without calling Gemini', async () => {
    recipientFindFirst.mockResolvedValue(null);

    await expect(service.recommend('owner-2', {
      recipientId: 'someone-elses-recipient',
      budgetVnd: 300000,
      occasion: 'birthday',
    })).rejects.toBeInstanceOf(NotFoundException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads recent history in pages and scopes the conversation to its recipient owner', async () => {
    const createdAt = (index: number) => new Date(Date.UTC(2026, 9, 21, 10, 0, index));
    recipientFindFirst.mockResolvedValue({
      id: 'recipient-1',
      recommendationConversations: [{
        id: 'conversation-history',
        occasion: 'birthday',
        budgetVnd: 500000,
        messages: Array.from({ length: 21 }, (_, index) => ({
          id: `message-${20 - index}`,
          role: index % 2 ? 'ASSISTANT' : 'USER',
          content: `message-${20 - index}`,
          bundles: [],
          createdAt: createdAt(20 - index),
        })),
      }],
    });

    const result = await service.getConversation('owner-1', 'recipient-1');

    expect(recipientFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'recipient-1', ownerId: 'owner-1' },
      select: {
        id: true,
        recommendationConversations: {
          where: { ownerId: 'owner-1' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: { id: true, occasion: true, budgetVnd: true, messages: { orderBy: { createdAt: 'desc' }, take: 21 } },
        },
      },
    }));
    expect(result.messages).toHaveLength(20);
    expect(result.messages[0].id).toBe('message-1');
    expect(result.hasMoreMessages).toBe(true);

    recipientFindFirst.mockClear();
    await service.getConversation('owner-1', 'recipient-1', createdAt(1).toISOString());
    expect(recipientFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        recommendationConversations: expect.objectContaining({
          select: expect.objectContaining({
            messages: { where: { createdAt: { lt: createdAt(1) } }, orderBy: { createdAt: 'desc' }, take: 21 },
          }),
        }),
      }),
    }));
  });

  it('returns empty history from one owner-scoped recipient query when no conversation exists', async () => {
    recipientFindFirst.mockClear();
    conversationFindFirst.mockClear();
    const result = await service.getConversation('owner-1', 'recipient-1');

    expect(result).toEqual({ conversationId: null, occasion: null, budgetVnd: null, messages: [], hasMoreMessages: false });
    expect(recipientFindFirst).toHaveBeenCalledTimes(1);
    expect(conversationFindFirst).not.toHaveBeenCalled();
  });

  it('continues an owned conversation with previous user and assistant turns', async () => {
    conversationFindFirst.mockResolvedValue({
      id: 'conversation-existing',
      messages: [
        { id: 'assistant-old', role: 'ASSISTANT', content: 'Mình đã gợi ý một cuốn sách.', bundles: [], createdAt: new Date('2026-10-21T10:01:00Z') },
        { id: 'user-old', role: 'USER', content: 'Bạn ấy thích đọc sách.', bundles: [], createdAt: new Date('2026-10-21T10:00:00Z') },
      ],
    });
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        message: 'Mình sẽ tìm thêm lựa chọn.',
        bundles: [{ title: 'Gói nhỏ gọn', reason: 'Dễ mang theo.', items: [
          { productId: candidate.productId, variantId: 'variant-1', quantity: 1, reason: 'Nhỏ gọn.' },
        ] }],
        followUpQuestion: '',
      }) }] } }] }),
    } as Response);

    await service.recommend('owner-1', {
      recipientId: 'recipient-1',
      conversationId: 'conversation-existing',
      budgetVnd: 500000,
      occasion: 'birthday',
      request: 'Có thêm lựa chọn nhỏ gọn không?',
    });

    expect(conversationFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'conversation-existing', ownerId: 'owner-1', recipientId: 'recipient-1' },
    }));
    expect(conversationUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'conversation-existing' },
      data: expect.objectContaining({
        messages: { create: expect.arrayContaining([
          expect.objectContaining({ role: 'USER', content: 'Có thêm lựa chọn nhỏ gọn không?' }),
          expect.objectContaining({ role: 'ASSISTANT', content: 'Mình sẽ tìm thêm lựa chọn.' }),
        ]) },
      }),
    }));
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as { contents: Array<{ role: string; parts: Array<{ text: string }> }> };
    expect(requestBody.contents.map(turn => turn.role)).toEqual(['user', 'model', 'user']);
    expect(requestBody.contents.at(-1)?.parts[0].text).toContain('Có thêm lựa chọn nhỏ gọn không?');
  });

  it('does not call Gemini when the catalog has no in-budget stock', async () => {
    recommendationCandidates.mockResolvedValue([]);

    const result = await service.recommend('owner-1', {
      recipientId: 'recipient-1',
      budgetVnd: 50000,
      occasion: 'other',
    });

    expect(result.bundles).toEqual([]);
    expect(result.message).toContain('chưa có sản phẩm');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a clear configuration error when Gemini credentials are missing', async () => {
    delete process.env.GEMINI_API_KEY;

    await expect(service.recommend('owner-1', {
      recipientId: 'recipient-1',
      budgetVnd: 300000,
      occasion: 'birthday',
    })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects malformed model output instead of returning fabricated recommendations', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }),
    } as Response);

    await expect(service.recommend('owner-1', {
      recipientId: 'recipient-1',
      budgetVnd: 300000,
      occasion: 'birthday',
    })).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('explains Gemini request validation failures without exposing provider payloads', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'Invalid JSON schema.' } }),
    } as Response);

    await expect(service.recommend('owner-1', {
      recipientId: 'recipient-1',
      budgetVnd: 300000,
      occasion: 'birthday',
    })).rejects.toThrow('Gemini từ chối định dạng yêu cầu (HTTP 400). Chi tiết từ Google: Invalid JSON schema.');
  });

  it('explains that a 404 model can be unavailable to the current Google project', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'models/gemini-2.5-flash-lite is not found for API version v1beta.' } }),
    } as Response);

    await expect(service.recommend('owner-1', {
      recipientId: 'recipient-1',
      budgetVnd: 300000,
      occasion: 'birthday',
    })).rejects.toThrow('Google Gemini không cung cấp model “gemini-2.5-flash-lite” cho endpoint generateContent với project/API key hiện tại. Kiểm tra quyền Gemini API của project hoặc danh sách model khả dụng. Chi tiết từ Google: models/gemini-2.5-flash-lite is not found for API version v1beta.');
  });

  it('redacts the API key from provider error details', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: 'Request failed for unit-test-key.' } }),
    } as Response);

    await expect(service.recommend('owner-1', {
      recipientId: 'recipient-1',
      budgetVnd: 300000,
      occasion: 'birthday',
    })).rejects.toThrow('Request failed for [redacted].');
  });
});
