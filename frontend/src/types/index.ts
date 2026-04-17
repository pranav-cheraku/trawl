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

/** Full chunk + parent feedback item, fetched on demand by the X-Ray modal. */
export interface ChunkDetail {
  chunkId: string;
  feedbackItemId: string;
  chunkText: string;
  feedbackItemContent: string;
  sourceType: string;
  sourceName: string;
}

/** A single retrieved chunk as it appears in a message's transparency blob. */
export interface TransparencyChunk {
  chunkId: string;
  feedbackItemId: string;
  chunkTextPreview: string;
  /** Full chunk text. Optional for messages created before Day 16. */
  chunkText?: string;
  /** Full parent feedback item content. Optional for pre-Day-16 messages. */
  feedbackItemContent?: string;
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
  title: string | null;
  createdAt: string;
}

/** Conversation detail with full message history. */
export interface ConversationDetail extends Conversation {
  messages: Message[];
}

// ── Spec generation ──────────────────────────────────────────────────

export type SpecType = "feature_specs" | "user_stories";
export type SpecStatus = "backlog" | "planned" | "in_progress" | "done";
export type SpecPriority = "critical" | "high" | "medium" | "low";
export type TaskStatusValue =
  | "pending"
  | "started"
  | "success"
  | "failure"
  | "retry";

/** Structured body written to Spec.content for type="feature_specs". */
export interface FeatureSpecContent {
  title: string;
  problem: string;
  proposed_solution: string;
  user_stories: string[];
  acceptance_criteria: string[];
  priority: SpecPriority;
  supporting_feedback_indices: number[];
  effort_estimate: string;
}

/** Structured body written to Spec.content for type="user_stories". */
export interface UserStoryContent {
  title: string;
  theme: string;
  acceptance_criteria: string[];
  priority: SpecPriority;
  supporting_feedback_indices: number[];
  effort_estimate: string;
}

/** A single spec returned by GET /api/projects/{id}/specs. */
export interface Spec {
  id: string;
  projectId: string;
  type: SpecType;
  title: string;
  content: FeatureSpecContent | UserStoryContent | Record<string, unknown>;
  priority: SpecPriority;
  status: SpecStatus;
  kanbanOrder: number;
  sourceChunkIds: string[];
  createdAt: string;
  updatedAt: string;
}

/** 202 response from POST /api/projects/{id}/generate. */
export interface GenerateSpecsResponse {
  taskId: string;
}

/** Response from GET /api/tasks/{taskId}. */
export interface TaskStatus {
  taskId: string;
  status: TaskStatusValue;
  result?: { specIds: string[]; count: number } | null;
  error?: string | null;
}

/** Response from GET /api/specs/{id}/sources — powers the RAG X-Ray panel. */
export interface SpecSources {
  specId: string;
  retrievedChunks: TransparencyChunk[];
  generationPrompt?: string | null;
  modelUsed?: string | null;
  totalChunksSearched?: number | null;
  retrievalTopK?: number | null;
}
