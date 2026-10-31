import type { OffIngredient, ProductInput } from '@halal-o/engine';

export const DEFAULT_BASE_URL = 'https://world.openfoodfacts.org';

// Only the fields the app uses, so responses stay small.
export const PRODUCT_FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'image_front_small_url',
  'ingredients_text',
  'ingredients_text_en',
  'labels_tags',
  'additives_tags',
  'ingredients',
] as const;

/** The parts of an Open Food Facts product response we read. */
export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  image_front_small_url?: string;
  ingredients_text?: string;
  ingredients_text_en?: string;
  labels_tags?: string[];
  additives_tags?: string[];
  ingredients?: OffApiIngredient[];
}

interface OffApiIngredient {
  text?: string;
  vegan?: string;
  vegetarian?: string;
  ingredients?: OffApiIngredient[];
}

export interface Product {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  /** Ready to pass to the engine's evaluate(). */
  input: ProductInput;
}

export class OffError extends Error {
  constructor(
    message: string,
    readonly kind: 'invalid_barcode' | 'rate_limited' | 'server' | 'network',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'OffError';
  }
}

export interface ClientOptions {
  /** Open Food Facts requires "AppName/Version (contact email)". */
  userAgent: string;
  baseUrl?: string;
  fetch?: typeof fetch;
}

/** EAN-8, UPC-A, EAN-13 and GTIN-14 are 8 to 14 digits. */
export function isValidBarcode(barcode: string): boolean {
  return /^\d{8,14}$/.test(barcode);
}

export function createOffClient(options: ClientOptions) {
  const base = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  const doFetch = options.fetch ?? fetch;

  return {
    /** Look up a product by barcode. Resolves to null when Open Food Facts doesn't know it. */
    async getProduct(barcode: string): Promise<Product | null> {
      const code = barcode.trim();
      if (!isValidBarcode(code)) throw new OffError(`Not a product barcode: ${barcode}`, 'invalid_barcode');

      const url = `${base}/api/v2/product/${code}.json?fields=${PRODUCT_FIELDS.join(',')}`;
      let res: Response;
      try {
        res = await doFetch(url, { headers: { 'User-Agent': options.userAgent, Accept: 'application/json' } });
      } catch (e) {
        throw new OffError(`Network error: ${(e as Error).message}`, 'network');
      }
      if (res.status === 404) return null;
      if (res.status === 429) throw new OffError('Open Food Facts rate limit reached', 'rate_limited', 429);
      if (!res.ok) throw new OffError(`Open Food Facts returned ${res.status}`, 'server', res.status);

      const body = (await res.json()) as { status?: number; product?: OffProduct };
      if (body.status !== 1 || !body.product) return null;
      return toProduct(code, body.product);
    },
  };
}

export type OffClient = ReturnType<typeof createOffClient>;

/** Map an Open Food Facts product to what the app and engine need. */
export function toProduct(barcode: string, p: OffProduct): Product {
  // English text matches the most aliases; fall back to the product's main language.
  const text = p.ingredients_text_en?.trim() || p.ingredients_text?.trim() || null;
  return {
    barcode,
    name: p.product_name_en?.trim() || p.product_name?.trim() || null,
    brand: p.brands?.split(',')[0]?.trim() || null,
    imageUrl: p.image_front_small_url ?? null,
    input: {
      ingredientsText: text,
      labels: p.labels_tags ?? [],
      additivesTags: p.additives_tags ?? [],
      offIngredients: flattenIngredients(p.ingredients ?? []),
    },
  };
}

function flattenIngredients(list: OffApiIngredient[]): OffIngredient[] {
  const out: OffIngredient[] = [];
  for (const i of list) {
    if (i.text) {
      out.push({ text: i.text, vegan: flag(i.vegan), vegetarian: flag(i.vegetarian) });
    }
    if (i.ingredients) out.push(...flattenIngredients(i.ingredients));
  }
  return out;
}

function flag(v: string | undefined): OffIngredient['vegan'] {
  return v === 'yes' || v === 'no' || v === 'maybe' ? v : undefined;
}
