import { describe, expect, it } from 'vitest';
import { parseIngredients, type ParsedIngredient } from '../src';

const texts = (items: ParsedIngredient[]): unknown =>
  items.map((i) => (i.children.length ? { [i.text]: texts(i.children) } : i.text));

describe('parseIngredients', () => {
  it('splits on commas and semicolons', () => {
    expect(texts(parseIngredients('Sugar, wheat flour; palm oil'))).toEqual(['Sugar', 'wheat flour', 'palm oil']);
  });

  it('nests bracketed sub-ingredients', () => {
    expect(texts(parseIngredients('Chocolate (sugar, cocoa butter [emulsifier]), salt'))).toEqual([
      { Chocolate: ['sugar', { 'cocoa butter': ['emulsifier'] }] },
      'salt',
    ]);
  });

  it('removes the label, percentages and allergen advice', () => {
    const items = parseIngredients('Ingredients: Milk chocolate (45%), hazelnuts 13%. May contain peanuts, sesame.');
    expect(texts(items)).toEqual(['Milk chocolate', 'hazelnuts']);
  });

  it('keeps class labels as the parent of what follows the colon', () => {
    expect(texts(parseIngredients('Emulsifiers: E471, soya lecithin'))).toEqual([{ Emulsifiers: ['E471'] }, 'soya lecithin']);
  });

  it('keeps chemical names with digit commas together', () => {
    expect(texts(parseIngredients('propane-1,2-diol, water'))).toEqual(['propane-1,2-diol', 'water']);
  });

  it('survives unbalanced brackets', () => {
    expect(texts(parseIngredients('Sugar (glucose, salt'))).toEqual([{ Sugar: ['glucose', 'salt'] }]);
    expect(texts(parseIngredients('Sugar), salt'))).toEqual(['Sugar', 'salt']);
  });

  it('normalises E-numbers in brackets after a class word', () => {
    const [emulsifier] = parseIngredients('emulsifier (471)');
    expect(emulsifier?.children[0]?.normalized).toBe('e471');
  });
});
