import { describe, expect, it } from 'vitest';
import { normalize, words } from '../src';

describe('normalize', () => {
  it.each([
    ['E471', 'e471'],
    ['E 471', 'e471'],
    ['E-471', 'e471'],
    ['e.471', 'e471'],
    ['E160a(ii)', 'e160a(ii)'],
    ['E 160 a (ii)', 'e160a(ii)'],
    ['E150d', 'e150d'],
  ])('unifies %s as %s', (input, expected) => {
    expect(normalize(input)).toBe(expected);
  });

  it('turns a bare additive number into an E-number', () => {
    expect(normalize('471')).toBe('e471');
    expect(normalize('150d')).toBe('e150d');
  });

  it('leaves numbers outside the additive range alone', () => {
    expect(normalize('2000')).toBe('2000');
    expect(normalize('50')).toBe('50');
  });

  it('strips accents and case', () => {
    expect(normalize('Gélatine de PORC')).toBe('gelatine de porc');
    expect(normalize('Présure')).toBe('presure');
  });

  it('drops allergen emphasis markers', () => {
    expect(normalize('_MILK_ powder*')).toBe('milk powder');
  });
});

describe('words', () => {
  it('keeps E-numbers and hyphenated words whole', () => {
    expect(words('e160a(ii) and l-cysteine, mono-')).toEqual(['e160a(ii)', 'and', 'l-cysteine', 'mono']);
  });
});
