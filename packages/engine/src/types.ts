export type RulingVerdict = 'halal' | 'haram' | 'mushbooh';

/** One entry of data/ingredients.json. */
export interface ReferenceEntry {
  id: string;
  e_number: string | null;
  name: string;
  aliases: Record<string, string[]>;
  category: string[];
  possible_origins: string[];
  verdict_by_origin: Record<string, RulingVerdict>;
  default_verdict: RulingVerdict;
  alcohol_related: boolean;
  vegan_label_upgrades: boolean;
  madhab: string;
  rationale: string;
  contested: string | null;
  confidence: 'high' | 'medium' | 'low';
  basis: string;
  references: string[];
  last_reviewed: string;
}

export interface Reference {
  schema_version: number;
  generated: string;
  madhab_default: string;
  verdicts: RulingVerdict[];
  rules: string[];
  references: Record<string, { title: string; url: string; accessed: string }>;
  entries: ReferenceEntry[];
}

/** One ingredient from a label, with any bracketed sub-ingredients. */
export interface ParsedIngredient {
  /** The ingredient as written on the label (trimmed). */
  text: string;
  /** Normalised form used for matching. */
  normalized: string;
  children: ParsedIngredient[];
}

export interface IngredientMatch {
  entry: ReferenceEntry;
  /** The alias that matched, in normalised form. */
  alias: string;
  /** Word offsets of the match within the ingredient's normalised text. */
  start: number;
  end: number;
}
