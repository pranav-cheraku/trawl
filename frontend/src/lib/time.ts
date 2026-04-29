/**
 * Coerces a backend ISO timestamp to a UTC-anchored Date.
 *
 * The Python backend writes naive UTC timestamps (no Z, no offset). New
 * Date(naiveString) interprets them as local time, which is wrong by the
 * server's UTC offset. This helper appends "Z" if there's no timezone
 * suffix, then parses.
 */
export function parseUtcIso(iso: string): Date {
  const hasTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  return new Date(hasTz ? iso : iso + "Z");
}

/**
 * Renders a "5 min ago" / "2h ago" / "3d ago" string for an ISO timestamp.
 *
 * Backend timestamps are naive UTC (see parseUtcIso). The thresholds are
 * sec < 60 → "Ns ago"; min < 60 → "N min ago"; hour < 24 → "Nh ago";
 * else → "Nd ago".
 */
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
