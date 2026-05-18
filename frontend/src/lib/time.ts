// Time utilities. parseUtcIso is required because the backend writes naive UTC
// timestamps without a Z suffix; new Date("2026-05-18T10:00:00") parses as
// local time, which produces wrong values in non-UTC timezones.
/** Parses a (possibly naive) UTC ISO string as UTC, not local time. */
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
