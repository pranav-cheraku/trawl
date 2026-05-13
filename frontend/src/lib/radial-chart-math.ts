export interface RadialSegmentInput {
  id: string;
  weight: number;
}

export interface RadialSegment {
  id: string;
  pathD: string;
  labelX: number;
  labelY: number;
  midAngle: number;
  sweep: number;
}

export interface RadialChartGeometry {
  size: number;
  cx: number;
  cy: number;
  outer: number;
  inner: number;
  segments: RadialSegment[];
}

/**
 * Compute SVG paths for a donut chart. Wedges start at 12 o'clock, clockwise.
 * Returns empty segments when all weights are zero.
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
  let cursor = -Math.PI / 2;
  const segments: RadialSegment[] = [];

  // A segment whose sweep equals exactly 2*PI produces a zero-length arc that
  // SVG renderers silently drop. Clamp to just below 2*PI to keep it visible.
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
