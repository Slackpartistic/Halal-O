import type { OffClient, Product } from './client';

/** Storage the app provides (SQLite on the phone, a Map in tests). */
export interface ProductStore {
  get(barcode: string): Promise<{ product: Product | null; savedAt: number } | undefined>;
  set(barcode: string, value: { product: Product | null; savedAt: number }): Promise<void>;
}

export const PRODUCT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// "Not found" is cached briefly so a product added to Open Food Facts shows up soon.
export const NOT_FOUND_TTL_MS = 24 * 60 * 60 * 1000;

export function memoryStore(): ProductStore {
  const map = new Map<string, { product: Product | null; savedAt: number }>();
  return {
    get: async (b) => map.get(b),
    set: async (b, v) => {
      map.set(b, v);
    },
  };
}

export interface CachedLookup {
  product: Product | null;
  /** True when the result came from the cache, including a stale copy used because the network failed. */
  fromCache: boolean;
}

/**
 * Look up a barcode, using the cache while it's fresh. When the network fails,
 * a stale cached copy is better than nothing, so it's returned instead of the error.
 */
export function withCache(client: OffClient, store: ProductStore, now: () => number = Date.now) {
  return {
    async getProduct(barcode: string): Promise<CachedLookup> {
      const cached = await store.get(barcode);
      if (cached) {
        const ttl = cached.product ? PRODUCT_TTL_MS : NOT_FOUND_TTL_MS;
        if (now() - cached.savedAt < ttl) return { product: cached.product, fromCache: true };
      }
      try {
        const product = await client.getProduct(barcode);
        await store.set(barcode, { product, savedAt: now() });
        return { product, fromCache: false };
      } catch (e) {
        if (cached?.product) return { product: cached.product, fromCache: true };
        throw e;
      }
    },
  };
}
