import { type CurveTrace, type TraceSegment, binCenter, traceSegments } from "@ise/science-engine";
import type { GraphFrame } from "./frame";

export interface Polyline {
  visit: TraceSegment["visit"];
  points: [number, number][];
}

/**
 * Convert a trace channel into canvas polylines — one per contiguous run of
 * visited bins. Values come straight from the trace (i.e. from the model).
 * `offset` maps the trace coordinate (which starts at 0) onto the graph's
 * x-axis, e.g. −2 when the trace records h + 2.
 */
export function tracePolylines(trace: CurveTrace, channel: string, frame: GraphFrame, offset = 0): Polyline[] {
  const column = trace.values[channel];
  if (!column) return [];
  return traceSegments(trace).map((segment) => ({
    visit: segment.visit,
    points: segment.bins.map((bin) => frame.point(binCenter(trace, bin) + offset, column[bin]!)),
  }));
}

/**
 * Sample a function across the frame's coordinate domain. Breaks the line
 * where the function is undefined, so asymptotes are not bridged.
 */
export function functionPolylines(
  fn: (x: number) => number,
  frame: GraphFrame,
  samples = 400,
): [number, number][][] {
  const [c0, c1] = frame.coordinateDomain;
  const lines: [number, number][][] = [];
  let current: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const x = c0 + ((c1 - c0) * i) / samples;
    const y = fn(x);
    if (!Number.isFinite(y)) {
      if (current.length) lines.push(current);
      current = [];
      continue;
    }
    current.push(frame.point(x, y));
  }
  if (current.length) lines.push(current);
  return lines;
}
