import { normalize } from './normalize';
import type { ParsedIngredient } from './types';

// Text after these phrases is allergen or cross-contamination advice, not ingredients.
const TRAILING_NOTES = /\b(?:may contain|may also contain|allergy advice|for allergens|allergens:|produced in a factory|made in a factory|manufactured in a factory)\b[\s\S]*$/i;

// A leading "Ingredients:" label.
const LEADING_LABEL = /^\s*(?:ingredients?|ingr\.?)\s*[:\-]\s*/i;

const OPEN = '([{';
const CLOSE = ')]}';

/** Remove percentages, allergen advice and the leading "Ingredients:" label. */
export function cleanLabel(text: string): string {
  return text
    .replace(LEADING_LABEL, '')
    .replace(TRAILING_NOTES, '')
    .replace(/\(?\s*\d+(?:[.,]\d+)?\s?%\s*\)?/g, ' ')
    .replace(/\.\s*$/, '');
}

/**
 * Parse an ingredient list into a tree. Commas and semicolons separate ingredients;
 * brackets hold sub-ingredients. "Emulsifiers: E471, E322" keeps the class label
 * as a parent of the first item only, which is enough for matching.
 */
export function parseIngredients(text: string): ParsedIngredient[] {
  const s = cleanLabel(text);
  let i = 0;

  function parseList(closing: string | null): ParsedIngredient[] {
    const items: ParsedIngredient[] = [];
    let buf = '';
    let children: ParsedIngredient[] = [];

    const flush = () => {
      const raw = buf.replace(/\s+/g, ' ').trim();
      if (raw || children.length) {
        items.push(...splitClassLabel(raw, children));
      }
      buf = '';
      children = [];
    };

    while (i < s.length) {
      const c = s[i]!;
      if (OPEN.includes(c)) {
        i++;
        children.push(...parseList(CLOSE[OPEN.indexOf(c)]!));
        continue;
      }
      if (CLOSE.includes(c)) {
        i++;
        // Any closer ends the current group, so mismatched brackets on a label can't swallow the rest.
        if (closing !== null) break;
        continue; // stray closing bracket at top level
      }
      if (c === ',' || c === ';') {
        // Keep decimal commas such as "1,2-diol" together.
        if (c === ',' && /\d/.test(s[i - 1] ?? '') && /\d/.test(s[i + 1] ?? '')) {
          buf += c;
          i++;
          continue;
        }
        flush();
        i++;
        continue;
      }
      buf += c;
      i++;
    }
    flush();
    return items;
  }

  return parseList(null);
}

/** "Emulsifier: E471" becomes { text: "Emulsifier", children: [E471] }. */
function splitClassLabel(raw: string, children: ParsedIngredient[]): ParsedIngredient[] {
  const colon = raw.indexOf(':');
  if (colon > 0 && colon < raw.length - 1) {
    const label = raw.slice(0, colon).trim();
    const rest = raw.slice(colon + 1).trim();
    return [node(label, [node(rest, children)])];
  }
  return [node(raw.replace(/:$/, '').trim(), children)];
}

function node(text: string, children: ParsedIngredient[]): ParsedIngredient {
  return { text, normalized: normalize(text), children };
}
