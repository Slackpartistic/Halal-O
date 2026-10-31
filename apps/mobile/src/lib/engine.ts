import { createEvaluator, type Evaluator, type Reference } from '@halal-o/engine';

let evaluator: Evaluator | null = null;

/**
 * The evaluator is built lazily because indexing the reference takes a moment.
 * The full reference (about 2 MB) is bundled for now; trimming it to the languages
 * we support and downloading updates at launch come later (docs/SPEC.md §5.3).
 */
export function getEvaluator(): Evaluator {
  if (!evaluator) {
    const reference = require('../../../../data/ingredients.json') as Reference;
    evaluator = createEvaluator(reference);
  }
  return evaluator;
}
