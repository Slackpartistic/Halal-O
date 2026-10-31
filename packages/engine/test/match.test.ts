import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createMatcher, type Matcher, type Reference } from '../src';

let matcher: Matcher;

beforeAll(() => {
  const path = resolve(__dirname, '../../../data/ingredients.json');
  matcher = createMatcher(JSON.parse(readFileSync(path, 'utf-8')) as Reference);
});

const ids = (text: string) => matcher.match(text).map((m) => m.entry.id);

describe('createMatcher', () => {
  it('indexes the whole reference', () => {
    expect(matcher.size).toBeGreaterThan(5000);
  });

  it.each([
    ['E471', 'e471'],
    ['e 471', 'e471'],
    ['mono- and diglycerides of fatty acids', 'e471'],
    ['carmine', 'e120'],
    ['gelatine', 'e428'],
    ['confectioner\'s glaze', 'e904'],
    ['soya lecithin', 'e322'],
  ])('matches %s to %s', (text, id) => {
    // Sub-entries such as e322_i (lecithin) count as their parent additive.
    expect(ids(text).some((m) => m === id || m.startsWith(`${id}_`))).toBe(true);
  });

  it('matches non-E-number ingredients', () => {
    expect(ids('pork')).toEqual(['pork']);
    expect(ids('calf rennet')).toEqual(['animal_rennet']);
    expect(ids('whey powder')).toEqual(['whey']);
  });

  it('prefers the longest alias', () => {
    expect(ids('spirit vinegar')).toEqual(['vinegar_spirit_plain']);
    expect(ids('fish gelatin')).toEqual(['fish_gelatin']);
    expect(ids('microbial rennet')).toEqual(['microbial_vegetable_rennet']);
  });

  it('matches whole words only', () => {
    expect(ids('graham crackers')).toEqual([]);
    expect(ids('kale')).toEqual([]);
    expect(ids('hamburger buns')).toEqual([]);
    expect(ids('support')).toEqual([]);
  });

  it('ignores short aliases that are common words', () => {
    // "or" is French for gold (E175).
    expect(ids('sugar or glucose')).not.toContain('e175');
  });

  it('matches across languages and accents', () => {
    expect(ids('gélatine')).toContain('e428');
    expect(ids('présure')).toEqual(['rennet_unspecified']);
  });

  it('finds several matches in one ingredient', () => {
    expect(ids('beef stock with wine')).toEqual(['meat_stock_extract', 'alcoholic_drinks_khamr']);
  });

  it('matches unrelated plain foods to nothing', () => {
    expect(ids('wheat flour')).toEqual([]);
    expect(ids('sugar')).toEqual([]);
  });
});
