export { createOffClient, isValidBarcode, toProduct, OffError, DEFAULT_BASE_URL, PRODUCT_FIELDS } from './client';
export type { ClientOptions, OffClient, OffProduct, Product } from './client';
export { memoryStore, withCache, PRODUCT_TTL_MS, NOT_FOUND_TTL_MS } from './cache';
export type { CachedLookup, ProductStore } from './cache';
