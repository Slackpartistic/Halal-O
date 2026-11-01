import type { Result } from './evaluate';
import type { RulingVerdict } from './types';

/** A reviewed verdict for one barcode, written after a user report (data/corrections.json). */
export interface Correction {
  verdict: RulingVerdict;
  /** True when the reviewer confirmed a trusted halal certification on the pack. */
  certified?: boolean;
  /** Shown to the user, e.g. "Manufacturer confirmed the E471 is plant-based." */
  note: string;
  /** Date the correction was reviewed, YYYY-MM-DD. */
  reviewed: string;
  /** The report it came from. */
  issue?: string;
}

export interface CorrectionsFile {
  schema_version: 1;
  version: string;
  corrections: Record<string, Correction>;
}

/**
 * Corrections beat the engine (docs/SPEC.md §4). The corrections version is always
 * appended to referenceVersion, so saved scans are re-checked when the list changes.
 */
export function applyCorrection(result: Result, barcode: string | null | undefined, file: CorrectionsFile): Result {
  const referenceVersion = `${result.referenceVersion}+corrections.${file.version}`;
  const c = barcode ? file.corrections[barcode] : undefined;
  if (!c) return { ...result, referenceVersion };
  return {
    ...result,
    verdict: c.verdict,
    certified: c.verdict === 'halal' && (c.certified ?? false),
    confidence: 'high',
    referenceVersion,
    correction: { note: c.note, reviewed: c.reviewed, ...(c.issue ? { issue: c.issue } : {}) },
  };
}
