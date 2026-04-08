export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/** iTunes app search result from GET /api/apps/search. */
export interface AppSearchResult {
  trackId: string;
  trackName: string;
  bundleId: string;
  artworkUrl: string;
  averageRating: number | null;
  ratingCount: number;
  genre: string;
}

/** Feedback source from GET /api/projects/{id}/sources. */
export interface Source {
  id: string;
  sourceType: string;
  filename: string | null;
  appStoreId: string | null;
  appStoreCountry: string | null;
  recordCount: number;
  status: string;
  createdAt: string;
}

/** Single feedback item from GET /api/projects/{id}/sources/{id}/items. */
export interface FeedbackItem {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  externalId: string | null;
  createdAt: string;
}

/** Response from the /api/token endpoint. */
export interface TokenResponse {
  token: string | null;
}

/** Response from POST /api/auth/sync (backend user upsert). */
export interface UserSyncResponse {
  id: string;
}
