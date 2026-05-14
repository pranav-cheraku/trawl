export interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSearchResult {
  trackId: string;
  trackName: string;
  bundleId: string;
  artworkUrl: string;
  averageRating: number | null;
  ratingCount: number;
  genre: string;
}

export interface GooglePlaySearchResult {
  packageName: string;
  trackName: string;
  artworkUrl: string;
  averageRating: number | null;
  ratingCount: number;
  genre: string;
}

export type SourceType =
  | "app_store"
  | "google_play"
  | "reddit"
  | "csv"
  | "manual";

export interface Source {
  id: string;
  sourceType: SourceType;
  filename: string | null;
  appStoreId: string | null;
  appStoreName: string | null;
  appStoreCountry: string | null;
  recordCount: number;
  status: string;
  createdAt: string;
  // App Store sources use the legacy appStoreId/Name/Country columns.
  // Other source types populate this JSONB blob; shape varies by sourceType.
  connectorConfig: Record<string, unknown> | null;
}

export interface FeedbackItem {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  externalId: string | null;
  createdAt: string;
}

export interface TokenResponse {
  token: string | null;
}

export interface UserSyncResponse {
  id: string;
}

export interface ChunkDetail {
  chunkId: string;
  feedbackItemId: string;
  chunkText: string;
  feedbackItemContent: string;
  sourceType: string;
  sourceName: string;
}

export interface TransparencyChunk {
  chunkId: string;
  feedbackItemId: string;
  chunkTextPreview: string;
  chunkText?: string;
  feedbackItemContent?: string;
  similarityScore: number;
  retrievalRank: number;
  sourceType: string;
  sourceName: string;
}

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

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  sourceChunkIds: string[];
  transparency: Transparency | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  projectId: string;
  title: string | null;
  createdAt: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
}


export type SpecType = "feature_specs" | "user_stories";
export type SpecStatus = "backlog" | "planned" | "in_progress" | "done";
export type SpecPriority = "critical" | "high" | "medium" | "low";
export type TaskStatusValue =
  | "pending"
  | "started"
  | "success"
  | "failure"
  | "retry";

export interface FeatureSpecContent {
  title: string;
  problem: string;
  proposed_solution: string;
  user_stories: string[];
  acceptance_criteria: string[];
  priority: SpecPriority;
  supporting_feedback_indices: number[];
}

export interface UserStoryContent {
  title: string;
  theme: string;
  acceptance_criteria: string[];
  priority: SpecPriority;
  supporting_feedback_indices: number[];
}

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

export interface GenerateSpecsResponse {
  taskId: string;
}

export interface TaskStatus {
  taskId: string;
  status: TaskStatusValue;
  // result is a raw Celery dict, not a Pydantic model, so the camelCase
  // alias_generator does not apply. Keys arrive in snake_case.
  result?: { spec_ids: string[]; count: number } | null;
  error?: string | null;
}

export interface SpecSources {
  specId: string;
  retrievedChunks: TransparencyChunk[];
  generationPrompt?: string | null;
  modelUsed?: string | null;
  totalChunksSearched?: number | null;
  retrievalTopK?: number | null;
}


export type BuildReportStatus = "pending" | "running" | "success" | "failure";

export interface BuildRetrievalMetadata {
  model: string;
  queries: string[];
  topKPerQuery: number;
  totalRetrieved?: number;
  rawTotal?: number;
  dedupedTotal?: number;
  embedMs?: number;
  retrieveMs?: number;
  clusterMs?: number;
  specTotalMs?: number;
  rationaleMs?: number;
  summaryMs?: number;
  totalMs?: number;
  partialFailureThemes?: number;
  tokenUsage?: { input: number; output: number };
}

export interface BuildTheme {
  id: string;
  rank: number;
  name: string;
  description: string;
  frequencyPct: number;
  chunkCount: number;
  severityScore: number;
  specGenerationFailed: boolean;
}

export interface BuildReportSpec {
  id: string;
  themeId: string;
  buildRank: number;
  title: string;
  // content is a raw JSONB dict, not a Pydantic model. Keys stay snake_case.
  content: Record<string, unknown>;
  promotedSpecId: string | null;
}

export interface BuildOrderEntry {
  rank: number;
  specId: string | null;
  rationale: string;
}

export interface BuildReport {
  id: string;
  projectId: string;
  status: BuildReportStatus;
  taskId: string | null;
  failureReason: string | null;
  executiveSummary: string | null;
  themes: BuildTheme[];
  specs: BuildReportSpec[];
  buildOrder: BuildOrderEntry[];
  retrievalMetadata: BuildRetrievalMetadata | null;
  sourceIds: string[];
  partialFailure: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface BuildReportSummary {
  id: string;
  status: BuildReportStatus;
  createdAt: string;
  completedAt: string | null;
  sourceCount: number;
  themeCount: number;
  specCount: number;
}

export interface BuildReportChunk {
  chunkId: string;
  similarity: number;
  retrievalRank: number;
  sourceQuery: string;
  chunkText: string;
  sourceName: string;
  feedbackItemId: string;
}

export interface BuildReportChunksResponse {
  chunks: BuildReportChunk[];
}

export interface RunBuildNextResponse {
  reportId: string;
  taskId: string;
}

export interface PromoteBuildSpecResponse {
  kanbanSpecId: string;
}

export interface CreditBalance {
  creditsBalance: number;
}

export interface CheckoutResponse {
  url: string;
}

export type CheckoutPriceId = "small" | "large";
