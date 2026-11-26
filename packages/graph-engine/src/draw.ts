/** Canvas drawing for synchronized graphs. Pure presentation — no maths beyond mapping. */

import type { CurveTrace } from "@ise/science-engine";
import type { AngleUnit } from "@ise/units";
import type { GraphFrame } from "./frame";
import { functionPolylines, tracePolylines } from "./paths";
import { type AxisKind, axisTicks, linearTicks } from "./ticks";

export interface GraphStyle {
  axis: string;
  grid: string;
  text: string;
  muted: string;
  font: string;
}

export type Dash = "solid" | "dashed";

export interface SeriesStyle {
  channel: string;
  label: string;
  color: string;
  dash: Dash;
  /** Dim a series that is not the focus of attention. */
  dimmed?: boolean;
}

/** A horizontal reference line at a value, e.g. the limit a sequence approaches. */
export interface Guide {
  value: number;
  label: string;
  color: string;
}

export interface AxesOptions {
  style: GraphStyle;
  angleUnit: AngleUnit;
  xAxis?: AxisKind;
  xLabel: string;
  yLabel: string;
  /** Omit the value-axis tick labels when the axis is shared with the simulation. */
  showValueLabels?: boolean;
}

export interface DrawGraphArgs extends AxesOptions {
  frame: GraphFrame;
  trace: CurveTrace | null;
  series: readonly SeriesStyle[];
  /** Maps trace coordinates onto the x-axis (see tracePolylines). */
  traceOffset?: number;
  guides?: readonly Guide[];
  /** Current coordinate (inside the domain) for the moving marker. */
  current?: { coordinate: number; values: Readonly<Record<string, number>> };
}

export const DASH: Record<Dash, number[]> = { solid: [], dashed: [9, 6] };

export function drawGraph(ctx: CanvasRenderingContext2D, args: DrawGraphArgs): void {
  const { frame, trace, series, current } = args;
  drawAxes(ctx, frame, args);

  ctx.save();
  clipToFrame(ctx, frame);
  for (const guide of args.guides ?? []) drawGuide(ctx, frame, guide, args.style);
  ctx.restore();
  if (trace) drawTrace(ctx, frame, trace, series, args.traceOffset ?? 0);

  if (current) {
    for (const s of series) {
      const value = current.values[s.channel];
      if (value === undefined || !Number.isFinite(value)) continue;
      const [x, y] = frame.point(current.coordinate, value);
      if (frame.contains(x, y)) drawMarker(ctx, x, y, s.color, s.dimmed ? 0.4 : 1);
    }
  }
}

/** Stroke the generated part of each series (previous revolution faded), clipped to the frame. */
export function drawTrace(
  ctx: CanvasRenderingContext2D,
  frame: GraphFrame,
  trace: CurveTrace,
  series: readonly SeriesStyle[],
  offset = 0,
): void {
  ctx.save();
  clipToFrame(ctx, frame);
  for (const s of series) {
    ctx.save();
    ctx.setLineDash(DASH[s.dash]);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = s.color;
    for (const line of tracePolylines(trace, s.channel, frame, offset)) {
      ctx.globalAlpha = (line.visit === "previous" ? 0.28 : 1) * (s.dimmed ? 0.35 : 1);
      ctx.lineWidth = line.visit === "previous" ? 2 : 3;
      strokePolyline(ctx, line.points);
    }
    ctx.restore();
  }
  ctx.restore();
}

export interface CurveStyle {
  color: string;
  dash?: Dash;
  width?: number;
  alpha?: number;
}

/** Draw y = fn(x) across the frame, clipped to it. */
export function drawFunctionCurve(
  ctx: CanvasRenderingContext2D,
  frame: GraphFrame,
  fn: (x: number) => number,
  style: CurveStyle,
): void {
  ctx.save();
  clipToFrame(ctx, frame);
  ctx.strokeStyle = style.color;
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.lineWidth = style.width ?? 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(DASH[style.dash ?? "solid"]);
  for (const line of functionPolylines(fn, frame)) strokePolyline(ctx, line);
  ctx.restore();
}

export function clipToFrame(ctx: CanvasRenderingContext2D, frame: GraphFrame, pad = 2): void {
  const { rect } = frame;
  ctx.beginPath();
  ctx.rect(rect.x - pad, rect.y - pad, rect.width + 2 * pad, rect.height + 2 * pad);
  ctx.clip();
}

export function drawGuide(ctx: CanvasRenderingContext2D, frame: GraphFrame, guide: Guide, style: GraphStyle): void {
  if (!Number.isFinite(guide.value)) return;
  const { rect } = frame;
  const y = frame.valueToPixel(guide.value);
  ctx.save();
  ctx.strokeStyle = guide.color;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  line(ctx, rect.x, y, rect.x + rect.width, y);
  ctx.setLineDash([]);
  ctx.fillStyle = guide.color;
  ctx.font = style.font;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(guide.label, rect.x + rect.width - 4, y - 3);
  ctx.restore();
}

export function strokePolyline(ctx: CanvasRenderingContext2D, points: readonly [number, number][]): void {
  if (points.length === 0) return;
  ctx.beginPath();
  const [x0, y0] = points[0]!;
  ctx.moveTo(x0, y0);
  if (points.length === 1) ctx.lineTo(x0 + 0.01, y0);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]!;
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  alpha = 1,
  radius = 5.5,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.stroke();
  ctx.restore();
}

/** Grid, axes, tick labels and titles for a frame. */
export function drawAxes(ctx: CanvasRenderingContext2D, frame: GraphFrame, options: AxesOptions): void {
  const { style, angleUnit, xLabel, yLabel } = options;
  const showValueLabels = options.showValueLabels ?? true;
  const { rect, orientation } = frame;
  const [c0, c1] = frame.coordinateDomain;
  const axisLength = orientation === "right" ? rect.width : rect.height;
  const rawTicks = axisTicks(options.xAxis ?? "angle", frame.coordinateDomain, angleUnit, Math.max(3, Math.floor(axisLength / 70)));
  // Thin the labels on short axes so they never collide.
  const majors = rawTicks.filter((t) => t.major);
  const spacing = majors.length > 1 ? axisLength / (majors.length - 1) : axisLength;
  const every = spacing < 44 ? Math.ceil(44 / spacing) : 1;
  let majorIndex = 0;
  const coordinateTicks = rawTicks.map((t) => (t.major ? { ...t, labelled: majorIndex++ % every === 0 } : { ...t, labelled: false }));
  const valueLength = orientation === "right" ? rect.height : rect.width;
  const vTicks = linearTicks(frame.valueDomain, Math.max(2, Math.floor(valueLength / 50)));

  ctx.save();
  ctx.font = style.font;
  ctx.lineWidth = 1;

  // Grid lines.
  ctx.strokeStyle = style.grid;
  for (const t of coordinateTicks) {
    if (!t.major) continue;
    const p = frame.coordinateToPixel(t.value);
    line(ctx, ...(orientation === "right" ? frameLineAcross(frame, p, "vertical") : frameLineAcross(frame, p, "horizontal")));
  }
  for (const t of vTicks) {
    const p = frame.valueToPixel(t.value);
    line(ctx, ...(orientation === "right" ? frameLineAcross(frame, p, "horizontal") : frameLineAcross(frame, p, "vertical")));
  }

  // Coordinate axis at value 0 (clamped into the frame).
  ctx.strokeStyle = style.axis;
  ctx.lineWidth = 1.25;
  const [v0, v1] = frame.valueDomain;
  const zeroValue = Math.min(Math.max(0, Math.min(v0, v1)), Math.max(v0, v1));
  const zero = frame.valueToPixel(zeroValue);
  if (orientation === "right") line(ctx, rect.x, zero, rect.x + rect.width, zero);
  else line(ctx, zero, rect.y, zero, rect.y + rect.height);
  // Value axis where the coordinate is 0, if 0 lies strictly inside the domain.
  if (Math.min(c0, c1) < 0 && Math.max(c0, c1) > 0) {
    const p = frame.coordinateToPixel(0);
    if (orientation === "right") line(ctx, p, rect.y, p, rect.y + rect.height);
    else line(ctx, rect.x, p, rect.x + rect.width, p);
  }

  // Coordinate tick labels.
  ctx.fillStyle = style.muted;
  for (const t of coordinateTicks) {
    if (!t.labelled) continue;
    const p = frame.coordinateToPixel(t.value);
    if (orientation === "right") {
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(t.label, p, rect.y + rect.height + 6);
    } else {
      // Left of a downward graph: the space to its right belongs to neighbouring graphs.
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(t.label, rect.x - 6, p);
    }
  }

  if (showValueLabels) {
    for (const t of vTicks) {
      const p = frame.valueToPixel(t.value);
      if (orientation === "right") {
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(t.label, rect.x - 6, p);
      } else {
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(t.label, p, rect.y + rect.height + 6);
      }
    }
  }

  // Axis titles.
  ctx.fillStyle = style.text;
  if (orientation === "right") {
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(xLabel, rect.x + rect.width, zero - 6);
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(yLabel, rect.x + 6, rect.y - 4);
  } else {
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText(xLabel, zero + 6, rect.y + rect.height);
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(yLabel, rect.x + rect.width, rect.y + rect.height + 22);
  }
  ctx.restore();
}

function frameLineAcross(
  frame: GraphFrame,
  p: number,
  direction: "vertical" | "horizontal",
): [number, number, number, number] {
  const { rect } = frame;
  return direction === "vertical" ? [p, rect.y, p, rect.y + rect.height] : [rect.x, p, rect.x + rect.width, p];
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(Math.round(x1) + 0.5, Math.round(y1) + 0.5);
  ctx.lineTo(Math.round(x2) + 0.5, Math.round(y2) + 0.5);
  ctx.stroke();
}
