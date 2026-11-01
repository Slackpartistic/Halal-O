import type { SQLiteDatabase } from 'expo-sqlite';
import type { Result, Verdict } from '@halal-o/engine';
import type { Product } from '@halal-o/off-client';
import { getEvaluator } from './engine';

export const HISTORY_LIMIT = 100;

export interface Scan {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  verdict: Verdict;
  certified: boolean;
  /** Set when a later check gave a different verdict than the one shown last time. */
  previousVerdict: Verdict | null;
  scannedAt: number;
}

interface ScanRow {
  barcode: string;
  name: string | null;
  brand: string | null;
  image_url: string | null;
  verdict: Verdict;
  certified: number;
  previous_verdict: Verdict | null;
  reference_version: string;
  scanned_at: number;
}

const toScan = (r: ScanRow): Scan => ({
  barcode: r.barcode,
  name: r.name,
  brand: r.brand,
  imageUrl: r.image_url,
  verdict: r.verdict,
  certified: r.certified === 1,
  previousVerdict: r.previous_verdict,
  scannedAt: r.scanned_at,
});

/**
 * Record a scan the user just looked at. Opening a product counts as seeing its
 * current verdict, so any "verdict changed" flag is cleared. Only the newest
 * HISTORY_LIMIT scans are kept.
 */
export async function recordScan(db: SQLiteDatabase, product: Product, result: Result, now = Date.now()): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO scans
       (barcode, name, brand, image_url, verdict, certified, previous_verdict, reference_version, scanned_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    product.barcode,
    product.name,
    product.brand,
    product.imageUrl,
    result.verdict,
    result.certified ? 1 : 0,
    result.referenceVersion,
    now,
  );
  await db.runAsync(
    `DELETE FROM scans WHERE barcode NOT IN (SELECT barcode FROM scans ORDER BY scanned_at DESC LIMIT ?)`,
    HISTORY_LIMIT,
  );
}

/** Newest first, optionally filtered by name, brand or barcode. */
export async function listScans(db: SQLiteDatabase, search = ''): Promise<Scan[]> {
  const q = `%${search.trim().toLowerCase()}%`;
  const rows = await db.getAllAsync<ScanRow>(
    `SELECT * FROM scans
     WHERE ? = '%%' OR lower(coalesce(name, '')) LIKE ? OR lower(coalesce(brand, '')) LIKE ? OR barcode LIKE ?
     ORDER BY scanned_at DESC`,
    q, q, q, q,
  );
  return rows.map(toScan);
}

/**
 * Re-check saved scans whose verdict came from an older ingredient reference, using
 * the cached product. When the verdict changes, keep the old one so the list can
 * show a "verdict changed" badge (our version of Mustakshif's status-change alerts).
 * Returns how many verdicts changed.
 */
export async function recheckScans(db: SQLiteDatabase): Promise<number> {
  const evaluator = getEvaluator();
  const rows = await db.getAllAsync<ScanRow & { json: string | null }>(
    `SELECT s.*, p.json FROM scans s JOIN products p ON p.barcode = s.barcode`,
  );
  let changed = 0;
  for (const row of rows) {
    if (!row.json) continue;
    const result = evaluator.evaluate((JSON.parse(row.json) as Product).input);
    if (result.referenceVersion === row.reference_version && result.verdict === row.verdict) continue;
    const differs = result.verdict !== row.verdict;
    if (differs) changed++;
    let previous = differs ? (row.previous_verdict ?? row.verdict) : row.previous_verdict;
    if (previous === result.verdict) previous = null; // changed back to what the user last saw
    await db.runAsync(
      `UPDATE scans SET verdict = ?, certified = ?, reference_version = ?, previous_verdict = ? WHERE barcode = ?`,
      result.verdict,
      result.certified ? 1 : 0,
      result.referenceVersion,
      previous,
      row.barcode,
    );
  }
  return changed;
}
