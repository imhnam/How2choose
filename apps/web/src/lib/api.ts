export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
export type User = { id: string; email: string | null; phone: string | null; displayName: string | null; birthday: string | null };
export type AddressVersion = 'current' | 'legacy';
export type Place = { code: number; name: string };
export type DeliveryAddress = { version: AddressVersion; province: Place; district: Place | null; ward: Place; addressLine: string };
export type AccountAddress = DeliveryAddress & { recipientName: string; phone: string };
export type RecipientAddressInput = { version: AddressVersion; provinceCode: number; districtCode?: number; wardCode: number; addressLine: string };
export function toRecipientAddressInput(address: DeliveryAddress | null): RecipientAddressInput | null {
  if (!address) return null;
  return {
    version: address.version,
    provinceCode: address.province.code,
    ...(address.version === 'legacy' && address.district ? { districtCode: address.district.code } : {}),
    wardCode: address.ward.code,
    addressLine: address.addressLine,
  };
}
export type Recipient = {
  id: string; displayName: string; phone?: string | null; relationship: string | null; birthday: string | null;
  interests: string[]; dislikes: string[]; notes: string | null;
  address: DeliveryAddress | null; avatarUrl: string | null;
};
export type CatalogCategory = { id: string; slug: string; name: string; description: string | null; parentId: string | null; sortOrder: number; children: CatalogCategory[] };
export type ProductMedia = { id: string; type: 'IMAGE' | 'VIDEO'; originalName: string; mimeType: string; sizeBytes: number; sortOrder: number; url: string };
export type ProductVariant = { id: string; sku: string; name: string | null; color: string | null; size: string | null; material: string | null; priceVnd: number; priceAfterDiscountVnd: number; stock: number; discountPercent: number | null; discountAmountVnd: number | null; media: ProductMedia[] };
export type CatalogProduct = { id: string; slug: string; name: string; description: string; priceVnd: number; priceAfterDiscountVnd: number; stock: number; tags: string[]; brand: string | null; supplier: string | null; shippingRegions: string[]; purchaseCount: number; ratingAverage: number; ratingCount: number; discountPercent: number | null; discountAmountVnd: number | null; categories: Array<{ id: string; slug: string; name: string }>; media: ProductMedia[]; variants: ProductVariant[] };
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(options.headers);
    if (!(typeof FormData !== 'undefined' && options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    response = await fetch(API_URL + '/api' + path, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch {
    throw new Error('Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.');
  }
  if (!response.ok) {
    let message = 'Có lỗi xảy ra. Vui lòng thử lại.';
    try {
      const body = await response.json();
      if (typeof body.message === 'string') message = body.message;
      else if (Array.isArray(body.message)) message = body.message.join(', ');
    } catch { /* Keep the default error. */ }
    throw Object.assign(new Error(message), { status: response.status });
  }
  return response.json() as Promise<T>;
}
