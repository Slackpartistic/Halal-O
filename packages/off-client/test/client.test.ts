import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createEvaluator, type Reference } from '@halal-o/engine';
import { createOffClient, isValidBarcode, memoryStore, OffError, withCache, PRODUCT_TTL_MS } from '../src';

// Shaped like an Open Food Facts v2 response. Hand-written: this environment can't reach the API.
const RESPONSE = {
  code: '5000159461122',
  status: 1,
  product: {
    code: '5000159461122',
    product_name: 'Caramel chocolate bar',
    brands: 'Example Brand, Example Group',
    image_front_small_url: 'https://images.openfoodfacts.org/example.jpg',
    ingredients_text: 'Sugar, glucose syrup, skimmed milk powder, whey permeate (from milk), emulsifier (soya lecithin)',
    labels_tags: ['en:vegetarian'],
    additives_tags: ['en:e322', 'en:e322i'],
    ingredients: [
      { text: 'Sugar', vegan: 'yes', vegetarian: 'yes' },
      { text: 'whey permeate', vegan: 'no', vegetarian: 'yes', ingredients: [{ text: 'from milk', vegan: 'no', vegetarian: 'yes' }] },
      { text: 'emulsifier', ingredients: [{ text: 'soya lecithin', vegan: 'yes', vegetarian: 'yes' }] },
    ],
  },
};

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

const UA = 'Halal-O/0.1 (halalo.support@gmail.com)';

describe('isValidBarcode', () => {
  it.each(['12345678', '012345678905', '5000159461122', '12345678901234'])('accepts %s', (b) => expect(isValidBarcode(b)).toBe(true));
  it.each(['1234567', '123456789012345', 'abc12345', ''])('rejects %s', (b) => expect(isValidBarcode(b)).toBe(false));
});

describe('createOffClient', () => {
  it('requests only the fields we use, with our User-Agent', async () => {
    const f = fakeFetch(200, RESPONSE);
    await createOffClient({ userAgent: UA, fetch: f }).getProduct('5000159461122');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/^https:\/\/world\.openfoodfacts\.org\/api\/v2\/product\/5000159461122\.json\?fields=code,/);
    expect((init.headers as Record<string, string>)['User-Agent']).toBe(UA);
  });

  it('maps the product for the app and the engine', async () => {
    const p = await createOffClient({ userAgent: UA, fetch: fakeFetch(200, RESPONSE) }).getProduct('5000159461122');
    expect(p).toMatchObject({ barcode: '5000159461122', name: 'Caramel chocolate bar', brand: 'Example Brand' });
    expect(p?.input.labels).toEqual(['en:vegetarian']);
    expect(p?.input.offIngredients?.map((i) => i.text)).toEqual(['Sugar', 'whey permeate', 'from milk', 'emulsifier', 'soya lecithin']);
  });

  it('prefers English ingredient text', async () => {
    const body = { ...RESPONSE, product: { ...RESPONSE.product, ingredients_text: 'Sucre', ingredients_text_en: 'Sugar' } };
    const p = await createOffClient({ userAgent: UA, fetch: fakeFetch(200, body) }).getProduct('5000159461122');
    expect(p?.input.ingredientsText).toBe('Sugar');
  });

  it('returns null for unknown products', async () => {
    const client = createOffClient({ userAgent: UA, fetch: fakeFetch(200, { status: 0, status_verbose: 'product not found' }) });
    expect(await client.getProduct('12345678')).toBeNull();
    expect(await createOffClient({ userAgent: UA, fetch: fakeFetch(404, {}) }).getProduct('12345678')).toBeNull();
  });

  it('reports rate limiting, server and network errors', async () => {
    await expect(createOffClient({ userAgent: UA, fetch: fakeFetch(429, {}) }).getProduct('12345678')).rejects.toMatchObject({ kind: 'rate_limited' });
    await expect(createOffClient({ userAgent: UA, fetch: fakeFetch(503, {}) }).getProduct('12345678')).rejects.toMatchObject({ kind: 'server', status: 503 });
    const broken = vi.fn(async () => {
      throw new TypeError('offline');
    });
    await expect(createOffClient({ userAgent: UA, fetch: broken }).getProduct('12345678')).rejects.toBeInstanceOf(OffError);
  });

  it('rejects things that are not barcodes before calling the API', async () => {
    const f = fakeFetch(200, RESPONSE);
    await expect(createOffClient({ userAgent: UA, fetch: f }).getProduct('https://example.com')).rejects.toMatchObject({ kind: 'invalid_barcode' });
    expect(f).not.toHaveBeenCalled();
  });

  it('feeds the engine end to end', async () => {
    const reference = JSON.parse(readFileSync(resolve(__dirname, '../../../data/ingredients.json'), 'utf-8')) as Reference;
    const p = await createOffClient({ userAgent: UA, fetch: fakeFetch(200, RESPONSE) }).getProduct('5000159461122');
    const result = createEvaluator(reference).evaluate(p!.input);
    expect(result.verdict).toBe('haram'); // whey, under the owner's rennet ruling
  });
});

describe('withCache', () => {
  it('serves fresh results from the cache', async () => {
    const f = fakeFetch(200, RESPONSE);
    const lookup = withCache(createOffClient({ userAgent: UA, fetch: f }), memoryStore(), () => 1000);
    expect((await lookup.getProduct('5000159461122')).fromCache).toBe(false);
    expect((await lookup.getProduct('5000159461122')).fromCache).toBe(true);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it('refetches after 30 days', async () => {
    const f = fakeFetch(200, RESPONSE);
    let t = 0;
    const lookup = withCache(createOffClient({ userAgent: UA, fetch: f }), memoryStore(), () => t);
    await lookup.getProduct('5000159461122');
    t = PRODUCT_TTL_MS + 1;
    await lookup.getProduct('5000159461122');
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('falls back to a stale copy when the network fails', async () => {
    const store = memoryStore();
    let t = 0;
    await withCache(createOffClient({ userAgent: UA, fetch: fakeFetch(200, RESPONSE) }), store, () => t).getProduct('5000159461122');
    t = PRODUCT_TTL_MS + 1;
    const offline = withCache(createOffClient({ userAgent: UA, fetch: fakeFetch(503, {}) }), store, () => t);
    const r = await offline.getProduct('5000159461122');
    expect(r).toMatchObject({ fromCache: true, product: { name: 'Caramel chocolate bar' } });
  });
});

describe('recorded response', () => {
  // Recorded from the live API on 31 Oct 2026 (fields=ingredients,labels_tags only).
  // Open Food Facts only sets vegan/vegetarian on ingredients it recognises (is_in_taxonomy: 1).
  const recorded = JSON.parse(readFileSync(resolve(__dirname, 'fixtures/3017624010701.json'), 'utf-8'));

  it('keeps vegan flags only where Open Food Facts set them', async () => {
    const p = await createOffClient({ userAgent: UA, fetch: fakeFetch(200, recorded) }).getProduct('3017624010701');
    const flags = Object.fromEntries((p?.input.offIngredients ?? []).map((i) => [i.text, i.vegan]));
    expect(flags).toMatchObject({ vanillin: 'yes', sugar: undefined, emulsifier: undefined });
  });

  it('flags the unnamed emulsifier when the ingredient text is the parsed list', async () => {
    const reference = JSON.parse(readFileSync(resolve(__dirname, '../../../data/ingredients.json'), 'utf-8')) as Reference;
    const p = await createOffClient({ userAgent: UA, fetch: fakeFetch(200, recorded) }).getProduct('3017624010701');
    const text = p!.input.offIngredients!.map((i) => i.text).join(', ');
    const result = createEvaluator(reference).evaluate({ ...p!.input, ingredientsText: text });
    expect(result.verdict).toBe('mushbooh');
    expect(result.reasons.map((r) => r.entryId)).toEqual(['emulsifier_unspecified']);
    expect(result.assumedHalal).toContain('vanillin');
  });
});
