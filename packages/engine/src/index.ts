export { normalize, words } from './normalize';
export { cleanLabel, parseIngredients } from './parse';
export { createMatcher } from './match';
export type { Matcher } from './match';
export type { IngredientMatch, ParsedIngredient, Reference, ReferenceEntry, RulingVerdict } from './types';
export { createEvaluator } from './evaluate';
export type { Confidence, Evaluator, OffIngredient, ProductInput, Reason, Result, Verdict } from './evaluate';
export { applyCorrection } from './corrections';
export type { Correction, CorrectionsFile } from './corrections';
