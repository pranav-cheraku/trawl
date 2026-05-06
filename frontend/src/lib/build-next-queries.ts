// frontend/src/lib/build-next-queries.ts

/**
 * The 5 hardcoded exploratory queries that the Build Next pipeline issues
 * against the embedded feedback corpus. These are mirrored from
 * `backend/app/services/build_next.py` (Q1..Q5, in order).
 *
 * The X-Ray build variant uses `queryIndexFromText` to map a chunk's
 * `sourceQuery` string back to a Q1..Q5 index for badge attribution.
 */
export const BUILD_NEXT_QUERIES: readonly string[] = [
  "What are users complaining about?",
  "What features are users requesting?",
  "What experiences received low ratings?",
  "What do users praise about the product?",
  "Where do users encounter friction or confusion?",
] as const;

/** Short labels for the badge UI. */
export const BUILD_NEXT_QUERY_LABELS: readonly string[] = [
  "Q1 · COMPLAINTS",
  "Q2 · REQUESTS",
  "Q3 · LOW RATINGS",
  "Q4 · PRAISE",
  "Q5 · FRICTION",
] as const;

/**
 * Returns the 0-based index (0..4) of the matching query, or -1 if no
 * match. Compares exact string equality against `BUILD_NEXT_QUERIES`.
 * Falls back to a case-insensitive contains check for forward-compat
 * if the backend ever adjusts capitalization.
 */
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
