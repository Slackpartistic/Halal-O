import { APP_VERSION, GITHUB_REPO, SUPPORT_EMAIL } from './config';
import { getCorrections, getReference } from './engine';

export const PROBLEMS = ['Verdict looks wrong', 'Halal logo on pack', 'Ingredients are out of date', 'Product is missing'] as const;
export type Problem = (typeof PROBLEMS)[number];

export interface Report {
  problem: Problem;
  details: string;
  barcode?: string;
  product?: string;
  appVerdict?: string;
  /** Typed ingredients, when the report comes from the manual screen. */
  ingredients?: string;
}

// Keeps the GitHub link well under URL length limits.
const MAX_INGREDIENTS = 1500;

export function appInfo(): string {
  return `Halal-O ${APP_VERSION}, reference ${getReference().generated}, corrections ${getCorrections().version}`;
}

function title(r: Report): string {
  return `[Report] ${r.problem}: ${r.product ?? r.barcode ?? 'typed ingredients'}`;
}

function detailsWithIngredients(r: Report): string {
  if (!r.ingredients) return r.details;
  return `${r.details}\n\nIngredients as typed:\n${r.ingredients.slice(0, MAX_INGREDIENTS)}`;
}

const query = (params: Record<string, string>) =>
  Object.entries(params)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');

/** Opens the "Report a product" issue form with the fields filled in. */
export function githubIssueUrl(r: Report): string {
  // Built by hand: React Native's URLSearchParams has historically been incomplete.
  const params: Record<string, string> = {
    template: 'report.yml',
    title: title(r),
    barcode: r.barcode ?? '',
    product: r.product ?? '',
    problem: r.problem,
    app_verdict: r.appVerdict ?? '',
    details: detailsWithIngredients(r),
    app_info: appInfo(),
  };
  return `${GITHUB_REPO}/issues/new?${query(params)}`;
}

/** For people without a GitHub account. Photos are attached in the mail app. */
export function emailUrl(r: Report): string {
  const body = [
    `Problem: ${r.problem}`,
    `Barcode: ${r.barcode ?? '-'}`,
    `Product: ${r.product ?? '-'}`,
    `What the app said: ${r.appVerdict ?? '-'}`,
    '',
    detailsWithIngredients(r),
    '',
    'Please attach photos of the ingredient list and any halal logo.',
    '',
    appInfo(),
  ].join('\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(title(r))}&body=${encodeURIComponent(body)}`;
}
