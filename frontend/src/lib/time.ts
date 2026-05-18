/**
 * The backend writes naive UTC timestamps (no Z suffix). new Date(naive)
 * interprets them as local time, which produces wrong values. This appends "Z"
 * when no timezone suffix is present.
 */
export function parseUtcIso(iso: string): Date {
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTz ? iso : iso + "Z");
}

export function friendlyAgo(iso: string): string {
  const t = parseUtcIso(iso).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Absolute date like "Apr 7, 2026", parsed as UTC. */
export function formatDate(iso: string): string {
  return parseUtcIso(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
