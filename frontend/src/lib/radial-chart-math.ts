// frontend/src/lib/radial-chart-math.ts

export interface RadialSegmentInput {
  /** Stable identity used for keys and event mapping. */
  id: string;
  /** Wedge size weight. Should be > 0. Caller normalizes if needed. */
  weight: number;
}

export interface RadialSegment {
  id: string;
  /** Path `d` attribute for the wedge from inner radius to outer radius. */
  pathD: string;
  /** Center point of the wedge for label positioning. */
  labelX: number;
  labelY: number;
  /** Mid-angle in radians, useful for label alignment. */
  midAngle: number;
  /** Sweep angle in radians (post-normalization). */
  sweep: number;
}

export interface RadialChartGeometry {
  /** Square viewBox edge in user units. */
  size: number;
  /** Center x/y. */
  cx: number;
  cy: number;
  /** Outer wedge radius. */
  outer: number;
  /** Inner donut radius. */
  inner: number;
  segments: RadialSegment[];
}

/**
 * Compute SVG paths for an annular pie (donut) given a list of weighted
 * segments. Wedges start at 12 o'clock and proceed clockwise. If `weights`
 * sum to 0 the function returns a geometry with no segments.
 */
export function computeRadialGeometry(
  inputs: RadialSegmentInput[],
  options: { size?: number; outer?: number; inner?: number } = {},
): RadialChartGeometry {
  const size = options.size ?? 240;
  const outer = options.outer ?? 110;
  const inner = options.inner ?? 60;
  const cx = size / 2;
  const cy = size / 2;

  const totalWeight = inputs.reduce(
    (acc, s) => acc + (s.weight > 0 ? s.weight : 0),
    0,
  );
  if (totalWeight === 0 || inputs.length === 0) {
    return { size, cx, cy, outer, inner, segments: [] };
  }

  const TWO_PI = Math.PI * 2;
  let cursor = -Math.PI / 2; // start at 12 o'clock
  const segments: RadialSegment[] = [];

  // Nudge a full-circle single segment by a small epsilon so the outer arc
  // doesn't collapse to a zero-length path that SVG renderers won't draw.
  const FULL_CIRCLE_EPSILON = 1e-4;

  for (const input of inputs) {
    const weight = input.weight > 0 ? input.weight : 0;
    if (weight === 0) continue;
    let sweep = (weight / totalWeight) * TWO_PI;
    if (sweep >= TWO_PI - FULL_CIRCLE_EPSILON) {
      sweep = TWO_PI - FULL_CIRCLE_EPSILON;
    }
    const start = cursor;
    const end = cursor + sweep;
    cursor = end;

    const x0 = cx + Math.cos(start) * outer;
    const y0 = cy + Math.sin(start) * outer;
    const x1 = cx + Math.cos(end) * outer;
    const y1 = cy + Math.sin(end) * outer;
    const x2 = cx + Math.cos(end) * inner;
    const y2 = cy + Math.sin(end) * inner;
    const x3 = cx + Math.cos(start) * inner;
    const y3 = cy + Math.sin(start) * inner;
    const largeArc = sweep > Math.PI ? 1 : 0;

    const pathD = [
      `M ${x0} ${y0}`,
      `A ${outer} ${outer} 0 ${largeArc} 1 ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${inner} ${inner} 0 ${largeArc} 0 ${x3} ${y3}`,
      "Z",
    ].join(" ");

    const midAngle = start + sweep / 2;
    const labelRadius = (outer + inner) / 2;
    segments.push({
      id: input.id,
      pathD,
      midAngle,
      sweep,
      labelX: cx + Math.cos(midAngle) * labelRadius,
      labelY: cy + Math.sin(midAngle) * labelRadius,
    });
  }

  return { size, cx, cy, outer, inner, segments };
}
