import type { Spec, SpecStatus } from "@/types";

const STATUS_LABEL: Record<SpecStatus, string> = {
  backlog: "Backlog",
  planned: "Planned",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_ORDER: SpecStatus[] = ["backlog", "planned", "in_progress", "done"];

// RFC 4180: wrap in quotes and double any internal quotes if the cell contains , " \n or \r.
function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function typeLabel(t: Spec["type"]): string {
  return t === "feature_specs" ? "Feature" : "Story";
}

function citationCount(spec: Spec): number {
  const raw = (spec.content as Record<string, unknown>)["supporting_feedback_indices"];
  if (!Array.isArray(raw)) return 0;
  return raw.filter(
    (n): n is number =>
      typeof n === "number" && Number.isInteger(n) && n >= 1
  ).length;
}

export function specsToCsv(specs: Spec[]): string {
  const header = [
    "id",
    "type",
    "title",
    "priority",
    "status",
    "kanban_column",
    "kanban_order",
    "citation_count",
    "created_at",
    "updated_at",
  ].join(",");

  const rows = specs.map((s) => {
    return [
      s.id,
      typeLabel(s.type),
      csvCell(s.title),
      s.priority,
      s.status,
      STATUS_LABEL[s.status as SpecStatus] ?? s.status,
      s.kanbanOrder,
      citationCount(s),
      s.createdAt,
      s.updatedAt,
    ].join(",");
  });

  return [header, ...rows].join("\n") + "\n";
}

function mdCitations(spec: Spec): string {
  const raw = (spec.content as Record<string, unknown>)["supporting_feedback_indices"];
  if (!Array.isArray(raw)) return "";
  const ids = raw.filter(
    (n): n is number =>
      typeof n === "number" && Number.isInteger(n) && n >= 1
  );
  if (ids.length === 0) return "";
  return ids.map((n) => `F#${n}`).join(", ");
}

function mdList(items: unknown): string {
  if (!Array.isArray(items) || items.length === 0) return "_(none)_";
  return items
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => `- ${x}`)
    .join("\n");
}

function mdBody(spec: Spec): string {
  const c = spec.content as Record<string, unknown>;
  const parts: string[] = [];
  parts.push(
    `**Type:** ${typeLabel(spec.type)} · **Priority:** ${spec.priority}`
  );

  if (spec.type === "feature_specs") {
    if (typeof c["problem"] === "string") {
      parts.push(`\n**Problem**\n\n${c["problem"]}`);
    }
    if (typeof c["proposed_solution"] === "string") {
      parts.push(`\n**Proposed Solution**\n\n${c["proposed_solution"]}`);
    }
    if (Array.isArray(c["user_stories"])) {
      parts.push(`\n**User Stories**\n\n${mdList(c["user_stories"])}`);
    }
    if (Array.isArray(c["acceptance_criteria"])) {
      parts.push(`\n**Acceptance Criteria**\n\n${mdList(c["acceptance_criteria"])}`);
    }
  } else {
    if (typeof c["theme"] === "string") {
      parts.push(`\n**Theme**\n\n${c["theme"]}`);
    }
    if (Array.isArray(c["acceptance_criteria"])) {
      parts.push(`\n**Acceptance Criteria**\n\n${mdList(c["acceptance_criteria"])}`);
    }
  }

  const cites = mdCitations(spec);
  if (cites) parts.push(`\n**Citations:** ${cites}`);
  return parts.join("\n");
}

export function specsToMarkdown(specs: Spec[], projectName: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const lines: string[] = [];
  lines.push(`# ${projectName} — Specs`);
  lines.push(`_Exported ${today} · ${specs.length} specs_`);
  lines.push("");

  for (const status of STATUS_ORDER) {
    const inCol = specs.filter((s) => s.status === status);
    if (inCol.length === 0) continue;
    lines.push(`## ${STATUS_LABEL[status]} (${inCol.length})`);
    lines.push("");
    inCol.sort((a, b) => {
      if (a.kanbanOrder !== b.kanbanOrder) return a.kanbanOrder - b.kanbanOrder;
      return a.createdAt.localeCompare(b.createdAt);
    });
    for (const s of inCol) {
      lines.push(`### ${s.title}`);
      lines.push("");
      lines.push(mdBody(s));
      lines.push("");
      lines.push("---");
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "project";
}
