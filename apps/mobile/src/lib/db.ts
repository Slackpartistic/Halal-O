import type { SQLiteDatabase } from 'expo-sqlite';
import type { Product, ProductStore } from '@halal-o/off-client';

const SCHEMA_VERSION = 1;

/** Runs once per app start from <SQLiteProvider onInit>. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= SCHEMA_VERSION) return;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      barcode TEXT PRIMARY KEY NOT NULL,
      json TEXT,
      saved_at INTEGER NOT NULL
    );
    PRAGMA user_version = ${SCHEMA_VERSION};
  `);
}

/** The off-client cache, stored in SQLite. A null product records "not found". */
export function sqliteProductStore(db: SQLiteDatabase): ProductStore {
  return {
    async get(barcode) {
      const row = await db.getFirstAsync<{ json: string | null; saved_at: number }>(
        'SELECT json, saved_at FROM products WHERE barcode = ?',
        barcode,
      );
      if (!row) return undefined;
      return { product: row.json ? (JSON.parse(row.json) as Product) : null, savedAt: row.saved_at };
    },
    async set(barcode, value) {
      await db.runAsync(
        'INSERT OR REPLACE INTO products (barcode, json, saved_at) VALUES (?, ?, ?)',
        barcode,
        value.product ? JSON.stringify(value.product) : null,
        value.savedAt,
      );
    },
  };
}
