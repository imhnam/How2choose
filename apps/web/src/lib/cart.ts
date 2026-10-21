import { CatalogProduct, ProductVariant } from './api';

export const CART_STORAGE_KEY = 'how2choose-cart';
export const CART_UPDATED_EVENT = 'how2choose-cart-updated';

export type CartItem = {
  key: string;
  productId: string;
  slug: string;
  productName: string;
  variantId: string;
  sku: string;
  variantLabel: string;
  priceVnd: number;
  originalPriceVnd: number;
  quantity: number;
  stock: number;
  imageUrl: string | null;
};

function isBrowser() { return typeof window !== 'undefined'; }

export function getCart(): CartItem[] {
  if (!isBrowser()) return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter(item => item && typeof item.key === 'string') as CartItem[] : [];
  } catch { return []; }
}

function notify() {
  if (isBrowser()) window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

function saveCart(items: CartItem[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  notify();
}

export function addToCart(product: CatalogProduct, variant: ProductVariant, requestedQuantity = 1) {
  const quantity = Math.max(1, Math.min(requestedQuantity, variant.stock));
  if (variant.stock <= 0) return false;
  const items = getCart();
  const key = `${product.id}:${variant.id}`;
  const existing = items.find(item => item.key === key);
  const label = [variant.color, variant.size, variant.material].filter(Boolean).join(' · ') || variant.sku;
  if (existing) existing.quantity = Math.min(existing.quantity + quantity, variant.stock);
  else items.push({ key, productId: product.id, slug: product.slug, productName: product.name, variantId: variant.id, sku: variant.sku, variantLabel: label, priceVnd: variant.priceAfterDiscountVnd, originalPriceVnd: variant.priceVnd, quantity, stock: variant.stock, imageUrl: variant.media.find(media => media.type === 'IMAGE')?.url ?? null });
  saveCart(items);
  return true;
}

export function updateCartQuantity(key: string, quantity: number) {
  const items = getCart();
  const item = items.find(value => value.key === key);
  if (!item) return;
  item.quantity = Math.max(1, Math.min(Math.floor(quantity), item.stock));
  saveCart(items);
}

export function removeFromCart(key: string) { saveCart(getCart().filter(item => item.key !== key)); }
export function clearCart() { saveCart([]); }
export function cartCount(items = getCart()) { return items.length; }
