import { describe, expect, it } from 'vitest';
import { applyCorrection, type CorrectionsFile, type Result } from '../src';

const base: Result = {
  verdict: 'mushbooh',
  certified: false,
  confidence: 'medium',
  reasons: [],
  assumedHalal: ['sugar'],
  notChecked: [],
  signalsUsed: [],
  referenceVersion: '2026-10-31',
};

const file: CorrectionsFile = {
  schema_version: 1,
  version: '2026-11-01',
  corrections: {
    '5000000000001': { verdict: 'halal', note: 'Manufacturer confirmed the E471 is plant-based.', reviewed: '2026-11-01', issue: 'https://github.com/Slackpartistic/Halal-O/issues/1' },
    '5000000000002': { verdict: 'haram', certified: true, note: 'Contains pork gelatine.', reviewed: '2026-11-01' },
  },
};

describe('applyCorrection', () => {
  it('replaces the verdict for a corrected barcode', () => {
    const r = applyCorrection(base, '5000000000001', file);
    expect(r.verdict).toBe('halal');
    expect(r.confidence).toBe('high');
    expect(r.certified).toBe(false);
    expect(r.correction).toEqual({ note: 'Manufacturer confirmed the E471 is plant-based.', reviewed: '2026-11-01', issue: 'https://github.com/Slackpartistic/Halal-O/issues/1' });
    expect(r.assumedHalal).toEqual(['sugar']);
  });

  it('never marks a non-halal correction as certified', () => {
    expect(applyCorrection(base, '5000000000002', file).certified).toBe(false);
  });

  it('leaves other products alone but still stamps the corrections version', () => {
    for (const code of ['4000000000000', null, undefined]) {
      const r = applyCorrection(base, code, file);
      expect(r.verdict).toBe('mushbooh');
      expect(r.correction).toBeUndefined();
      expect(r.referenceVersion).toBe('2026-10-31+corrections.2026-11-01');
    }
  });
});
