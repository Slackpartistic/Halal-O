// Roman-numeral suffixes used by sub-additives such as E160a(ii) or E450(iii).
const ROMAN = '(?:i{1,3}|iv|vi{0,3}|ix|x)';

// "E 471", "E-471", "e471", "E160a(ii)", "E 160 a (ii)" -> "e471", "e160a(ii)".
const E_NUMBER = new RegExp(`\\be[\\s.-]?(\\d{3,4})\\s?([a-j])?\\s?(?:\\(\\s?(${ROMAN})\\s?\\))?(?![\\p{L}\\d])`, 'gu');

// A token that is only an additive number, as in "emulsifier (471)" or "colours: 150d".
const BARE_E_NUMBER = new RegExp(`^(\\d{3,4})\\s?([a-j])?\\s?(?:\\(\\s?(${ROMAN})\\s?\\))?$`, 'u');

function formatE(digits: string, letter?: string, roman?: string): string {
  return `e${digits}${letter ?? ''}${roman ? `(${roman})` : ''}`;
}

/** Lower-case, strip accents, and unify how E-numbers are written. */
export function normalize(text: string): string {
  let s = text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
  s = s.replace(/[’‘`´]/g, "'").replace(/[_*†‡]/g, ' ');
  s = s.replace(E_NUMBER, (_m, d: string, l?: string, r?: string) => formatE(d, l, r));
  s = s.replace(/\s+/g, ' ').trim();
  const bare = BARE_E_NUMBER.exec(s);
  if (bare) {
    const n = Number(bare[1]);
    if (n >= 100 && n <= 1599) s = formatE(bare[1]!, bare[2], bare[3]);
  }
  return s;
}

/** Split normalised text into words for whole-word matching. E-numbers stay one word. */
export function words(normalized: string): string[] {
  return normalized.match(/e\d{3,4}[a-j]?(?:\([ivx]+\))?|[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) ?? [];
}
