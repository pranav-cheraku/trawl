import type {
  AppSearchResult,
  BuildReport,
  BuildReportChunk,
  BuildReportChunksResponse,
  BuildReportSummary,
  ChunkDetail,
  Conversation,
  ConversationDetail,
  FeedbackItem,
  GenerateSpecsResponse,
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
} from "@/types";

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
const TOKEN_CACHE_MS = 5 * 60 * 1000; // 5 minutes

async function getAuthToken(): Promise<string | null> {
  // Only attempt in browser (Client Components)
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

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
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
    throw new Error(`API error: ${response.status}`);
  }
  // 204 No Content — return undefined without attempting JSON parse
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
    throw new Error(`API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

// ── Project endpoints ────────────────────────────────────────────────

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

// ── App search endpoints ─────────────────────────────────────────────

export async function searchApps(
  query: string,
  country?: string
): Promise<AppSearchResult[]> {
  const params = new URLSearchParams({ q: query });
  if (country) params.set("country", country);
  return apiFetch<AppSearchResult[]>(`/api/apps/search?${params}`);
}

// ── Source endpoints ─────────────────────────────────────────────────

export async function connectAppStore(
  projectId: string,
  appName: string,
  country?: string
): Promise<Source> {
  return apiFetch<Source>(`/api/projects/${projectId}/sources/appstore`, {
    method: "POST",
    body: JSON.stringify({ appName, country: country ?? "us" }),
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

// ── Conversation endpoints ───────────────────────────────────────────

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
  sourceIds?: string[]
): Promise<Message> {
  const body: { content: string; sourceIds?: string[] } = { content };
  if (sourceIds !== undefined) body.sourceIds = sourceIds;
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

// ── Spec endpoints ───────────────────────────────────────────────────

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

// ── Build Next endpoints ─────────────────────────────────────────────

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
