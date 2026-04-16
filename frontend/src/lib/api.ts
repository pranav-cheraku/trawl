import type {
  AppSearchResult,
  ChunkDetail,
  Conversation,
  ConversationDetail,
  FeedbackItem,
  Message,
  Project,
  Source,
  TokenResponse,
} from "@/types";

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
  content: string
): Promise<Message> {
  return apiFetch<Message>(
    `/api/projects/${projectId}/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
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
