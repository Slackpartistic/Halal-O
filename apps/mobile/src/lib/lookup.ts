import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import type { Result } from '@halal-o/engine';
import { createOffClient, OffError, withCache, type Product } from '@halal-o/off-client';
import { OFF_USER_AGENT } from './config';
import { sqliteProductStore } from './db';
import { getEvaluator } from './engine';

export type LookupState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | { status: 'error'; message: string }
  | { status: 'done'; product: Product; result: Result; fromCache: boolean };

const client = createOffClient({ userAgent: OFF_USER_AGENT });

/** Look a barcode up (cache first, then Open Food Facts) and evaluate it. */
export function useProductLookup(barcode: string): LookupState {
  const db = useSQLiteContext();
  const [state, setState] = useState<LookupState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    withCache(client, sqliteProductStore(db))
      .getProduct(barcode)
      .then(({ product, fromCache }) => {
        if (cancelled) return;
        if (!product) return setState({ status: 'not_found' });
        setState({ status: 'done', product, result: getEvaluator().evaluate(product.input), fromCache });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({ status: 'error', message: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [barcode, db]);

  return state;
}

function errorMessage(e: unknown): string {
  if (e instanceof OffError) {
    switch (e.kind) {
      case 'invalid_barcode':
        return "That doesn't look like a product barcode.";
      case 'rate_limited':
        return 'Too many lookups in a short time. Please wait a minute and try again.';
      case 'network':
        return "Couldn't reach the product database. Check your connection and try again.";
      case 'server':
        return 'The product database is having problems. Please try again later.';
    }
  }
  return 'Something went wrong looking this product up.';
}
