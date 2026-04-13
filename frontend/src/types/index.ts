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
  appStoreName: string | null;
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

/** A single retrieved chunk as it appears in a message's transparency blob. */
export interface TransparencyChunk {
  chunkId: string;
  feedbackItemId: string;
  chunkTextPreview: string;
  similarityScore: number;
  retrievalRank: number;
  sourceType: string;
  sourceName: string;
}

/** Full RAG transparency payload stored on assistant messages. */
export interface Transparency {
  query: string;
  retrievedChunks: TransparencyChunk[];
  modelUsed: string | null;
  topK: number;
  threshold: number;
  totalChunksSearched: number;
  retrievalLatencyMs: number;
  generationLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
}

/** A single message in a conversation. */
export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  sourceChunkIds: string[];
  transparency: Transparency | null;
  createdAt: string;
}

/** Basic conversation shape (no nested messages). */
export interface Conversation {
  id: string;
  projectId: string;
  createdAt: string;
}

/** Conversation detail with full message history. */
export interface ConversationDetail extends Conversation {
  messages: Message[];
}
