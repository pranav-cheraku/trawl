// The 5 hardcoded queries used by the Build Next pipeline for X-Ray attribution.
// Must stay byte-for-byte identical to the queries in backend/app/services/build_next.py.
// Drift silently mis-attributes X-Ray badges.
export const BUILD_NEXT_QUERIES: readonly string[] = [
  "What are users complaining about?",
  "What features are users requesting?",
  "What experiences received low ratings?",
  "What do users praise about the product?",
  "Where do users encounter friction or confusion?",
] as const;

export const BUILD_NEXT_QUERY_LABELS: readonly string[] = [
  "Q1 · COMPLAINTS",
  "Q2 · REQUESTS",
  "Q3 · LOW RATINGS",
  "Q4 · PRAISE",
  "Q5 · FRICTION",
] as const;

// Falls back to a case-insensitive prefix check in case the backend adjusts capitalization.
export function queryIndexFromText(sourceQuery: string | null | undefined): number {
  if (!sourceQuery) return -1;
  const exact = BUILD_NEXT_QUERIES.indexOf(sourceQuery);
  if (exact !== -1) return exact;
  const lower = sourceQuery.toLowerCase();
  for (let i = 0; i < BUILD_NEXT_QUERIES.length; i++) {
    const q = BUILD_NEXT_QUERIES[i].toLowerCase();
    if (q === lower || lower.includes(q.slice(0, 16))) return i;
  }
  return -1;
}
