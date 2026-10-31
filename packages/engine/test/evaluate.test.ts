import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createEvaluator, type Evaluator, type ProductInput, type Reference } from '../src';

interface Golden {
  name: string;
  input: ProductInput;
  expect: { verdict: string; certified?: boolean; reasonIds?: (string | null)[]; upgraded?: string[] };
}

const golden = JSON.parse(readFileSync(resolve(__dirname, 'golden-products.json'), 'utf-8')) as { products: Golden[] };
let evaluator: Evaluator;

beforeAll(() => {
  const reference = JSON.parse(readFileSync(resolve(__dirname, '../../../data/ingredients.json'), 'utf-8')) as Reference;
  evaluator = createEvaluator(reference);
});

// Sub-entries such as e322_i count as their parent additive.
const root = (id: string | null) => (id ? id.replace(/_(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/, '') : null);

describe('golden products', () => {
  it.each(golden.products.map((p) => [p.name, p] as const))('%s', (_name, p) => {
    const result = evaluator.evaluate(p.input);
    expect(result.verdict).toBe(p.expect.verdict);
    if (p.expect.certified !== undefined) expect(result.certified).toBe(p.expect.certified);
    if (p.expect.reasonIds) {
      const flagged = result.reasons.filter((r) => !r.upgradedByVeganLabel).map((r) => root(r.entryId));
      expect([...new Set(flagged)].sort()).toEqual([...p.expect.reasonIds].sort());
    }
    if (p.expect.upgraded) {
      expect(result.reasons.filter((r) => r.upgradedByVeganLabel).map((r) => root(r.entryId))).toEqual(p.expect.upgraded);
    }
  });
});

describe('evaluate', () => {
  it('uses the origin named on the label', () => {
    const r = evaluator.evaluate({ ingredientsText: 'pork gelatine, sugar' });
    expect(r.verdict).toBe('haram');
    expect(r.reasons.find((x) => x.entryId === 'e428')?.origin).toBe('pork');
  });

  it('treats fish gelatine as halal', () => {
    expect(evaluator.evaluate({ ingredientsText: 'sugar, fish gelatine' }).verdict).toBe('halal');
  });

  it('keeps haram findings visible on certified products', () => {
    const r = evaluator.evaluate({ ingredientsText: 'chicken, gelatine', labels: ['en:halal'] });
    expect(r.verdict).toBe('halal');
    expect(r.certified).toBe(true);
    expect(r.reasons.map((x) => x.entryId)).toContain('e428');
  });

  it('ignores a "non-halal" label', () => {
    expect(evaluator.evaluate({ ingredientsText: 'pork', labels: ['en:non-halal'] }).certified).toBe(false);
  });

  it('does not flag a class word that names its additive', () => {
    expect(evaluator.evaluate({ ingredientsText: 'emulsifier (soya lecithin)' }).verdict).toBe('halal');
    expect(evaluator.evaluate({ ingredientsText: 'emulsifier' }).verdict).toBe('mushbooh');
  });

  it('caps confidence when most ingredients are unchecked', () => {
    expect(evaluator.evaluate({ ingredientsText: 'potatoes, salt, sunflower oil' }).confidence).toBe('medium');
  });

  it('lists plain foods as not checked', () => {
    expect(evaluator.evaluate({ ingredientsText: 'potatoes, sunflower oil' }).notChecked).toEqual(['potatoes']);
  });
});
