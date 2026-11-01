import { createEvaluator, type Evaluator, type Reference } from '@halal-o/engine';

let reference: Reference | null = null;
let evaluator: Evaluator | null = null;

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
