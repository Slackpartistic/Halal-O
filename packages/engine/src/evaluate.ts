import { createMatcher, type Matcher } from './match';
import { normalize, words } from './normalize';
import { parseIngredients } from './parse';
import type { ParsedIngredient, Reference, ReferenceEntry, RulingVerdict } from './types';

export type Verdict = RulingVerdict | 'unknown';
export type Confidence = 'high' | 'medium' | 'low';

/** Open Food Facts' own analysis of one parsed ingredient (product.ingredients[]). */
export interface OffIngredient {
  text: string;
  vegan?: 'yes' | 'no' | 'maybe';
  vegetarian?: 'yes' | 'no' | 'maybe';
}

export interface ProductInput {
  ingredientsText?: string | null;
  /** Open Food Facts labels_tags, e.g. ["en:halal", "en:vegan"]. */
  labels?: string[];
  /** Open Food Facts additives_tags, e.g. ["en:e471"]. */
  additivesTags?: string[];
  offIngredients?: OffIngredient[];
}

export interface Reason {
  ingredientText: string;
  /** null when the verdict came from Open Food Facts' analysis rather than our reference. */
  entryId: string | null;
  verdict: RulingVerdict;
  rationale: string;
  refs: string[];
  /** The origin named on the label that decided the verdict, e.g. "plant" for "E471 (vegetable)". */
  origin?: string;
  upgradedByVeganLabel?: boolean;
  contested?: string | null;
}

export interface Result {
  verdict: Verdict;
  certified: boolean;
  confidence: Confidence;
  /** Every Haram or Mushbooh finding, plus findings a label upgraded. */
  reasons: Reason[];
  assumedHalal: string[];
  notChecked: string[];
  signalsUsed: ('halal_label' | 'vegan_label')[];
  /** Version of the data behind the verdict; changes when the reference or corrections list does. */
  referenceVersion: string;
  /** Set when a reviewed correction for this barcode replaced the engine's verdict. */
  correction?: { note: string; reviewed: string; issue?: string };
}

const STRICTNESS: Record<RulingVerdict, number> = { halal: 0, mushbooh: 1, haram: 2 };
const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

// Words on a label that say where an ingredient comes from.
const ORIGIN_WORDS: Record<string, string> = {
  vegetable: 'plant', plant: 'plant', 'plant-based': 'plant', vegan: 'plant', palm: 'plant', soya: 'plant',
  soy: 'plant', sunflower: 'plant', rapeseed: 'plant', canola: 'plant', coconut: 'plant', olive: 'plant',
  pork: 'pork', porcine: 'pork', pig: 'pork', swine: 'pork',
  beef: 'animal', bovine: 'animal', animal: 'animal', mutton: 'animal', chicken: 'animal', calf: 'animal',
  fish: 'fish', marine: 'fish',
  microbial: 'microbial', bacterial: 'microbial', fungal: 'microbial', fermentation: 'microbial',
  synthetic: 'synthetic',
};

// Catch-all entries that only apply when the label doesn't say which one was used.
const GENERIC_IDS = new Set(['emulsifier_unspecified', 'enzymes_unspecified', 'rennet_unspecified']);

export interface Evaluator {
  evaluate(input: ProductInput): Result;
}

export function createEvaluator(reference: Reference, matcher: Matcher = createMatcher(reference)): Evaluator {
  const byId = new Map(reference.entries.map((e) => [e.id, e]));
  const byEnumber = new Map<string, ReferenceEntry>();
  for (const e of reference.entries) if (e.e_number) byEnumber.set(e.e_number.toLowerCase(), e);

  return {
    evaluate(input) {
      const labels = (input.labels ?? []).map((l) => l.toLowerCase());
      const halalLabel = labels.some((l) => l.includes('halal') && !l.includes('non-halal'));
      const veganLabel = labels.includes('en:vegan');
      const signalsUsed: Result['signalsUsed'] = [];
      if (halalLabel) signalsUsed.push('halal_label');
      if (veganLabel) signalsUsed.push('vegan_label');

      const reasons: Reason[] = [];
      const assumedHalal: string[] = [];
      const notChecked: string[] = [];
      // Confidence of every finding, in the same order as they were added.
      const scored: { verdict: RulingVerdict; confidence: Confidence }[] = [];
      const seenEntries = new Set<string>();

      const off = new Map((input.offIngredients ?? []).map((i) => [normalize(i.text), i]));
      const text = input.ingredientsText?.trim() ?? '';
      const tree = text ? parseIngredients(text) : [];

      const add = (r: Reason, confidence: Confidence) => {
        if (veganLabel && r.verdict === 'mushbooh' && (r.entryId === null || byId.get(r.entryId)?.vegan_label_upgrades)) {
          r = { ...r, verdict: 'halal', upgradedByVeganLabel: true };
        }
        if (r.verdict === 'halal' && !r.upgradedByVeganLabel) {
          assumedHalal.push(r.ingredientText);
        } else {
          reasons.push(r);
        }
        scored.push({ verdict: r.verdict, confidence });
      };

      const visit = (node: ParsedIngredient, parent: ParsedIngredient | null) => {
        const hints = originHints([node, parent, ...node.children]);
        const matches = matcher
          .match(node.text)
          // "Emulsifier (soya lecithin)" names its additive, so the catch-all doesn't apply;
          // "rennet (animal)" only names an origin, so it still does.
          .filter((m) => !(GENERIC_IDS.has(m.entry.id) && node.children.some((c) => matcher.match(c.text).length > 0)));

        for (const m of matches) {
          seenEntries.add(m.entry.id);
          const { verdict, origin } = verdictFor(m.entry, hints);
          add(
            {
              ingredientText: node.text,
              entryId: m.entry.id,
              verdict,
              rationale: m.entry.rationale,
              refs: m.entry.references,
              origin,
              contested: m.entry.contested,
            },
            origin ? 'high' : m.entry.confidence,
          );
        }

        if (matches.length === 0 && node.children.length === 0 && node.text) {
          fallback(node.text);
        }
        for (const child of node.children) visit(child, node);
      };

      const fallback = (ingredientText: string) => {
        if (Object.prototype.hasOwnProperty.call(ORIGIN_WORDS, normalize(ingredientText))) return; // "(vegetable)" is a hint, not an ingredient
        const a = off.get(normalize(ingredientText));
        if (a?.vegan === 'yes') {
          assumedHalal.push(ingredientText);
        } else if (a?.vegetarian === 'no') {
          add({ ingredientText, entryId: null, verdict: 'mushbooh', rationale: 'Open Food Facts marks this as an animal ingredient that our reference does not cover.', refs: ['off'] }, 'low');
        } else if (a?.vegan === 'maybe') {
          add({ ingredientText, entryId: null, verdict: 'mushbooh', rationale: 'Open Food Facts says this may be animal-derived.', refs: ['off'] }, 'low');
        } else {
          notChecked.push(ingredientText);
        }
      };

      for (const node of tree) visit(node, null);

      // Additives Open Food Facts detected that the text didn't name (e.g. text in another language).
      for (const tag of input.additivesTags ?? []) {
        const entry = byEnumber.get(tag.replace(/^[a-z]{2}:/, '').toLowerCase());
        if (!entry || seenEntries.has(entry.id)) continue;
        seenEntries.add(entry.id);
        add(
          { ingredientText: entry.e_number ?? entry.name, entryId: entry.id, verdict: entry.default_verdict, rationale: entry.rationale, refs: entry.references, contested: entry.contested },
          entry.confidence,
        );
      }

      const found = reasons.length + assumedHalal.length + notChecked.length;
      if (found === 0) {
        return { verdict: halalLabel ? 'halal' : 'unknown', certified: halalLabel, confidence: 'low', reasons, assumedHalal, notChecked, signalsUsed, referenceVersion: reference.generated };
      }

      const worst = reasons.reduce<RulingVerdict>((v, r) => (STRICTNESS[r.verdict] > STRICTNESS[v] ? r.verdict : v), 'halal');
      let confidence = minConfidence(scored.filter((x) => x.verdict === worst).map((x) => x.confidence));
      // Plain foods ("potatoes", "salt") are unchecked by design, so they only cap confidence at medium.
      if (worst === 'halal' && notChecked.length / found > 0.5 && confidence === 'high') confidence = 'medium';

      return {
        verdict: halalLabel ? 'halal' : worst,
        certified: halalLabel,
        confidence: halalLabel ? 'high' : confidence,
        reasons,
        assumedHalal,
        notChecked,
        signalsUsed,
        referenceVersion: reference.generated,
      };
    },
  };
}

function originHints(nodes: (ParsedIngredient | null)[]): Set<string> {
  const hints = new Set<string>();
  let halal = false;
  for (const n of nodes) {
    if (!n) continue;
    for (const w of words(n.normalized)) {
      if (w === 'halal') halal = true;
      const o = ORIGIN_WORDS[w];
      if (o) hints.add(o);
    }
  }
  if (halal && hints.has('animal')) {
    hints.delete('animal');
    hints.add('animal_halal_certified');
  }
  return hints;
}

/** Use the origin named on the label when the entry has a verdict for it; the strictest wins. */
function verdictFor(entry: ReferenceEntry, hints: Set<string>): { verdict: RulingVerdict; origin?: string } {
  let best: { verdict: RulingVerdict; origin: string } | null = null;
  for (const h of hints) {
    const v = entry.verdict_by_origin[h];
    if (v && (!best || STRICTNESS[v] > STRICTNESS[best.verdict])) best = { verdict: v, origin: h };
  }
  return best ?? { verdict: entry.default_verdict };
}

function minConfidence(list: Confidence[]): Confidence {
  return list.reduce<Confidence>((m, c) => (CONFIDENCE_RANK[c] < CONFIDENCE_RANK[m] ? c : m), 'high');
}
