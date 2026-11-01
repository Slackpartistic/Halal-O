import { applyCorrection, createEvaluator, type CorrectionsFile, type Evaluator, type ProductInput, type Reference, type Result } from '@halal-o/engine';

let reference: Reference | null = null;
let evaluator: Evaluator | null = null;
let corrections: CorrectionsFile | null = null;

/**
 * The full reference (about 2 MB) is bundled for now; trimming it to the languages
 * we support and downloading updates at launch come later (docs/SPEC.md §5.3).
 */
export function getReference(): Reference {
  if (!reference) reference = require('../../../../data/ingredients.json') as Reference;
  return reference;
}

/** Built lazily because indexing the reference takes a moment. */
export function getEvaluator(): Evaluator {
  if (!evaluator) evaluator = createEvaluator(getReference());
  return evaluator;
}

/** Reviewed per-barcode verdicts. Bundled for now; downloaded with the reference later. */
export function getCorrections(): CorrectionsFile {
  if (!corrections) corrections = require('../../../../data/corrections.json') as CorrectionsFile;
  return corrections;
}

/** The engine's verdict, replaced by a reviewed correction when there is one for this barcode. */
export function evaluateProduct(barcode: string | null, input: ProductInput): Result {
  return applyCorrection(getEvaluator().evaluate(input), barcode, getCorrections());
}
