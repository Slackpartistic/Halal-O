import { normalize, words } from './normalize';
import type { IngredientMatch, Reference, ReferenceEntry, RulingVerdict } from './types';

const STRICTNESS: Record<RulingVerdict, number> = { haram: 2, mushbooh: 1, halal: 0 };

// Short Latin-script aliases that are also common words in some language
// (e.g. "or" is French for gold, E175) would match far too much text.
function usableAlias(alias: string): boolean {
  if (!alias) return false;
  if (/^\d+$/.test(alias)) return false;
  const latin = /^[\p{Script=Latin}\d\s'-]+$/u.test(alias);
  if (latin && alias.length <= 3 && !/\d/.test(alias) && !/^(bha|bht|fmn)$/.test(alias)) return false;
  return true;
}

export interface Matcher {
  /** All reference matches in one ingredient's text, longest alias first, non-overlapping. */
  match(text: string): IngredientMatch[];
  /** Number of distinct aliases indexed. */
  readonly size: number;
}

/**
 * Index every alias of every entry by its normalised word sequence. When two entries
 * share an alias, the stricter verdict wins so that an ambiguous name is never
 * reported as more permissive than one of its readings.
 */
export function createMatcher(reference: Reference): Matcher {
  const index = new Map<string, { entry: ReferenceEntry; alias: string }>();
  let longest = 1;

  for (const entry of reference.entries) {
    const all = Object.values(entry.aliases).flat();
    if (entry.e_number) all.push(entry.e_number);
    for (const raw of all) {
      const alias = normalize(raw);
      if (!usableAlias(alias)) continue;
      const w = words(alias);
      if (w.length === 0) continue;
      const key = w.join(' ');
      const existing = index.get(key);
      if (!existing || STRICTNESS[entry.default_verdict] > STRICTNESS[existing.entry.default_verdict]) {
        index.set(key, { entry, alias: key });
      }
      longest = Math.max(longest, w.length);
    }
  }

  return {
    size: index.size,
    match(text: string): IngredientMatch[] {
      const w = words(normalize(text));
      const out: IngredientMatch[] = [];
      let i = 0;
      while (i < w.length) {
        let found: IngredientMatch | null = null;
        for (let n = Math.min(longest, w.length - i); n >= 1; n--) {
          const hit = index.get(w.slice(i, i + n).join(' '));
          if (hit) {
            found = { entry: hit.entry, alias: hit.alias, start: i, end: i + n };
            break;
          }
        }
        if (found) {
          out.push(found);
          i = found.end;
        } else {
          i++;
        }
      }
      return out;
    },
  };
}
