import type {
  AppSearchResult,
  BuildReport,
  BuildReportChunk,
  BuildReportChunksResponse,
  BuildReportSummary,
  CheckoutResponse,
  ChunkDetail,
  Conversation,
  ConversationDetail,
  CreditBalance,
  FeedbackItem,
  GenerateSpecsResponse,
  GooglePlaySearchResult,
  Message,
  Project,
  PromoteBuildSpecResponse,
  RunBuildNextResponse,
  Source,
  Spec,
  SpecPriority,
  SpecSources,
  SpecStatus,
  SpecType,
  TaskStatus,
  TokenResponse,
  UpdateUserNameRequest,
  UserMe,
} from "@/types";

export class PaywallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaywallError";
  }
}

export class AlreadyRunningError extends Error {
  constructor(
    public readonly existingReportId: string,
    public readonly taskId: string | null,
  ) {
    super("A Build Next run is already in progress for this project");
    this.name = "AlreadyRunningError";
  }
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let cachedToken: string | null = null;
let tokenFetchedAt = 0;
const TOKEN_CACHE_MS = 5 * 60 * 1000;

async function getAuthToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  if (cachedToken && Date.now() - tokenFetchedAt < TOKEN_CACHE_MS) {
    return cachedToken;
  }
  try {
    const res = await fetch("/api/token");
    if (!res.ok) return null;
    const data: TokenResponse = await res.json();
    cachedToken = data.token;
    tokenFetchedAt = Date.now();
    return cachedToken;
  } catch {
    return null;
  }
}

type ApiFetchOptions = RequestInit & { demo?: boolean };

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { demo, headers: extraHeaders, ...rest } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((extraHeaders as Record<string, string> | undefined) ?? {}),
  };

  if (demo) {
    headers["X-Demo-Token"] = process.env.NEXT_PUBLIC_DEMO_TOKEN ?? "";
  } else {
    const token = await getAuthToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      throw new Error("Unauthorized");
    }
    if (response.status === 402) {
      const body = await response.json().catch(() => ({})) as { detail?: string };
      window.dispatchEvent(new CustomEvent("trawl:paywall", { detail: body }));
      throw new PaywallError(body.detail ?? "Insufficient credits");
    }
    throw new Error(`API error: ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return response.json() as Promise<T>;
}

async function apiUpload<T>(path: string, body: FormData): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedToken = null;
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      throw new Error("Unauthorized");
    }
    if (response.status === 402) {
      const body = await response.json().catch(() => ({})) as { detail?: string };
      window.dispatchEvent(new CustomEvent("trawl:paywall", { detail: body }));
      throw new PaywallError(body.detail ?? "Insufficient credits");
    }
    throw new Error(`API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function createProject(data: {
  name: string;
  description?: string;
}): Promise<Project> {
  return apiFetch<Project>("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function listProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/api/projects");
}

export async function getProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`);
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch<void>(`/api/projects/${id}`, { method: "DELETE" });
}

export async function searchApps(
  query: string,
  country?: string
): Promise<AppSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (country) params.set("country", country);
  return apiFetch<AppSearchResult[]>(`/api/apps/search?${params}`);
}

export async function connectAppStore(
  projectId: string,
  appName: string,
  country?: string,
  preset: "quick" | "standard" = "standard",
): Promise<Source> {
  return apiFetch<Source>(`/api/projects/${projectId}/sources/appstore`, {
    method: "POST",
    body: JSON.stringify({ appName, country: country ?? "us", preset }),
  });
}

export async function searchGooglePlay(
  query: string,
): Promise<GooglePlaySearchResult[]> {
  const params = new URLSearchParams({ q: query });
  return apiFetch<GooglePlaySearchResult[]>(`/api/play/search?${params}`);
}

export async function connectGooglePlay(
  projectId: string,
  body: {
    packageName: string;
    appName: string;
    preset?: "quick" | "standard";
  },
): Promise<Source> {
  return apiFetch<Source>(
    `/api/projects/${projectId}/sources/google_play`,
    {
      method: "POST",
      body: JSON.stringify({ ...body, preset: body.preset ?? "standard" }),
    },
  );
}

export async function connectReddit(
  projectId: string,
  body: {
    mode: "subreddit" | "keyword";
    value: string;
    preset?: "quick" | "standard" | "deep";
  },
): Promise<Source> {
  return apiFetch<Source>(`/api/projects/${projectId}/sources/reddit`, {
    method: "POST",
    body: JSON.stringify({ ...body, preset: body.preset ?? "standard" }),
  });
}

export async function uploadCsv(
  projectId: string,
  file: File,
  contentColumn: string
): Promise<Source> {
  const form = new FormData();
  form.append("file", file);
  form.append("content_column", contentColumn);
  return apiUpload<Source>(`/api/projects/${projectId}/sources/csv`, form);
}

export async function connectManualPaste(
  projectId: string,
  body: { title?: string | null; content: string },
): Promise<Source> {
  return apiFetch<Source>(`/api/projects/${projectId}/sources/manual`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listSources(projectId: string): Promise<Source[]> {
  return apiFetch<Source[]>(`/api/projects/${projectId}/sources`);
}

export async function getSource(
  projectId: string,
  sourceId: string
): Promise<Source> {
  return apiFetch<Source>(`/api/projects/${projectId}/sources/${sourceId}`);
}

export async function deleteSource(
  projectId: string,
  sourceId: string
): Promise<void> {
  await apiFetch<void>(`/api/projects/${projectId}/sources/${sourceId}`, {
    method: "DELETE",
  });
}

export async function listFeedbackItems(
  projectId: string,
  sourceId: string,
  limit: number = 50,
  offset: number = 0
): Promise<FeedbackItem[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return apiFetch<FeedbackItem[]>(
    `/api/projects/${projectId}/sources/${sourceId}/items?${params}`
  );
}

export async function getChunkDetail(
  projectId: string,
  chunkId: string
): Promise<ChunkDetail> {
  return apiFetch<ChunkDetail>(
    `/api/projects/${projectId}/chunks/${chunkId}`
  );
}

export async function createConversation(
  projectId: string,
  title?: string | null
): Promise<Conversation> {
  const body: { title?: string | null } = {};
  if (title !== undefined) body.title = title;
  return apiFetch<Conversation>(
    `/api/projects/${projectId}/conversations`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function listConversations(
  projectId: string
): Promise<Conversation[]> {
  return apiFetch<Conversation[]>(`/api/projects/${projectId}/conversations`);
}

export async function getConversation(
  projectId: string,
  conversationId: string
): Promise<ConversationDetail> {
  return apiFetch<ConversationDetail>(
    `/api/projects/${projectId}/conversations/${conversationId}`
  );
}

export async function sendMessage(
  projectId: string,
  conversationId: string,
  content: string,
  sourceIds?: string[],
  topK?: number,
  threshold?: number
): Promise<Message> {
  const body: {
    content: string;
    sourceIds?: string[];
    topK?: number;
    threshold?: number;
  } = { content };
  if (sourceIds !== undefined) body.sourceIds = sourceIds;
  if (topK !== undefined) body.topK = topK;
  if (threshold !== undefined) body.threshold = threshold;
  return apiFetch<Message>(
    `/api/projects/${projectId}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function deleteConversation(
  projectId: string,
  conversationId: string
): Promise<void> {
  await apiFetch<void>(
    `/api/projects/${projectId}/conversations/${conversationId}`,
    { method: "DELETE" }
  );
}

export async function updateConversation(
  projectId: string,
  conversationId: string,
  title: string
): Promise<Conversation> {
  return apiFetch<Conversation>(
    `/api/projects/${projectId}/conversations/${conversationId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }
  );
}

export async function generateSpecs(
  projectId: string,
  type: SpecType,
  focus?: string,
  sourceIds?: string[]
): Promise<GenerateSpecsResponse> {
  const body: { type: SpecType; focus?: string; sourceIds?: string[] } = {
    type,
  };
  if (focus) body.focus = focus;
  if (sourceIds !== undefined) body.sourceIds = sourceIds;
  return apiFetch<GenerateSpecsResponse>(
    `/api/projects/${projectId}/generate`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  return apiFetch<TaskStatus>(`/api/tasks/${taskId}`);
}

export async function listSpecs(
  projectId: string,
  filters?: {
    type?: SpecType;
    status?: SpecStatus;
    priority?: SpecPriority;
  }
): Promise<Spec[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.priority) params.set("priority", filters.priority);
  const qs = params.toString();
  return apiFetch<Spec[]>(
    `/api/projects/${projectId}/specs${qs ? `?${qs}` : ""}`
  );
}

export async function updateSpec(
  specId: string,
  data: {
    title?: string;
    content?: Record<string, unknown>;
    priority?: SpecPriority;
    status?: SpecStatus;
  }
): Promise<Spec> {
  return apiFetch<Spec>(`/api/specs/${specId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function reorderSpecs(
  items: { id: string; kanbanOrder: number; status: SpecStatus }[]
): Promise<void> {
  await apiFetch<void>(`/api/specs/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ items }),
  });
}

export async function deleteSpec(specId: string): Promise<void> {
  await apiFetch<void>(`/api/specs/${specId}`, { method: "DELETE" });
}

export async function getSpecSources(specId: string): Promise<SpecSources> {
  return apiFetch<SpecSources>(`/api/specs/${specId}/sources`);
}

export async function runBuildNext(
  projectId: string,
  sourceIds?: string[],
): Promise<RunBuildNextResponse> {
  const body: Record<string, unknown> = {};
  if (sourceIds !== undefined) body.sourceIds = sourceIds;

  const token = await getAuthToken();
  const res = await fetch(
    `${API_BASE_URL}/api/projects/${projectId}/build-next/runs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    },
  );

  if (res.status === 409) {
    const detail = (await res.json().catch(() => ({}))) as {
      detail?: { existingReportId?: string; taskId?: string | null };
    };
    const existing = detail.detail?.existingReportId ?? "";
    throw new AlreadyRunningError(existing, detail.detail?.taskId ?? null);
  }
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(detail.detail ?? `runBuildNext failed: ${res.status}`);
  }
  return (await res.json()) as RunBuildNextResponse;
}

export async function listBuildRuns(
  projectId: string,
): Promise<BuildReportSummary[]> {
  return apiFetch<BuildReportSummary[]>(
    `/api/projects/${projectId}/build-next/runs`,
  );
}

export async function getBuildReport(reportId: string): Promise<BuildReport> {
  return apiFetch<BuildReport>(`/api/build-reports/${reportId}`);
}

export async function getBuildReportChunks(
  reportId: string,
): Promise<BuildReportChunk[]> {
  const res = await apiFetch<BuildReportChunksResponse>(
    `/api/build-reports/${reportId}/chunks`,
  );
  return res.chunks;
}

export async function getCreditBalance(): Promise<CreditBalance> {
  return apiFetch<CreditBalance>("/api/billing/me");
}

export async function createCheckoutSession(
  priceId: string,
): Promise<CheckoutResponse> {
  return apiFetch<CheckoutResponse>("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ priceId }),
  });
}

export async function promoteBuildSpec(
  reportId: string,
  specId: string,
): Promise<PromoteBuildSpecResponse | { existingSpecId: string }> {
  const token = await getAuthToken();
  const res = await fetch(
    `${API_BASE_URL}/api/build-reports/${reportId}/specs/${specId}/promote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (res.status === 409) {
    const detail = (await res.json().catch(() => ({}))) as {
      detail?: { existingSpecId?: string };
    };
    return { existingSpecId: detail.detail?.existingSpecId ?? "" };
  }
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { detail?: string };
    throw new Error(detail.detail ?? `promoteBuildSpec failed: ${res.status}`);
  }
  return (await res.json()) as PromoteBuildSpecResponse;
}

export async function getUserMe(): Promise<UserMe> {
  return apiFetch<UserMe>("/api/auth/me");
}

export async function updateUserName(name: string): Promise<UserMe> {
  const body: UpdateUserNameRequest = { name };
  const updated = await apiFetch<UserMe>("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  // Notify any useUserMe() consumers so dropdown + profile page stay in sync.
  window.dispatchEvent(new CustomEvent("trawl:user-updated", { detail: updated }));
  return updated;
}

export async function deleteAccount(): Promise<void> {
  await apiFetch<void>("/api/auth/me", { method: "DELETE" });
}
