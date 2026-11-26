/**
 * Statistics, in five pictures.
 *
 * Dots: the marks as a dot plot, one dot per student, stacked where marks
 * are equal. The picked-out student's dot can be dragged (any dot can). The
 * centre layer stands the plot on a pivot at the mean — the balance point —
 * with the median as a dashed line and the mode's stack ringed. The spread
 * layer shades x̄ ± σ, draws each mark's deviation from the mean, and
 * brackets the range.
 *
 * Change of scale: the marks x on one line, and y = kx + c on a second line
 * below, each with its mean and x̄ ± σ band.
 *
 * Histogram: a frequency table as bars of equal class width, with the
 * frequency polygon through the class marks (closed down to zero half a
 * class beyond each end), and the mode found by the crossing lines drawn
 * from the corners of the modal bar. Drag a bar's top to change its
 * frequency.
 *
 * Step deviation: the table worked column by column — class, f, x, u, fu,
 * fu² — with the assumed-mean row picked out. Tap a row to take its class
 * mark as a.
 *
 * Ogive: the less-than cumulative frequency curve, read across at n/2 and
 * down to the median.
 *
 * Every number that a level asks for — centre, spread, grouped mean, median
 * and mode — and every marker that would give one away is drawn only with
 * the words layer on.
 */

import { STATS_MAX_COUNT, STATS_MAX_FREQUENCY, STATS_MAX_MARK, STATS_TABLES } from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { arrow, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };
export type StatsView = "dots" | "transform" | "histogram" | "steps" | "ogive";

/** A number line with dots stacked on it. */
export interface StatsStrip {
  x0: number;
  x1: number;
  axisY: number;
  radius: number;
  /** Vertical distance between stacked dots. */
  pitch: number;
}

export interface StatsLayout {
  width: number;
  height: number;
  compact: boolean;
  view: StatsView;
  /** The dot plot of the marks view. */
  strip: StatsStrip;
  /** The two lines of the change-of-scale view. */
  upper: StatsStrip;
  lower: StatsStrip;
  /** The histogram's and the ogive's plot. */
  plot: Box;
  /** The step-deviation table: column centres, the header's baseline, and the row pitch. */
  columns: readonly number[];
  tableTop: number;
  rowHeight: number;
  /** Baselines of the two caption lines. */
  lines: readonly [number, number];
}

export function computeStatsLayout(width: number, _graphs: unknown = [], layers: ReadonlySet<string> = new Set()): StatsLayout {
  const compact = width < 560;
  const height = compact ? 390 : 420;
  const lines = [height - 36, height - 15] as const;
  const view: StatsView = layers.has("transform")
    ? "transform"
    : layers.has("histogram")
      ? "histogram"
      : layers.has("steps")
        ? "steps"
        : layers.has("ogive")
          ? "ogive"
          : "dots";
  const side = compact ? 22 : 40;
  const left = compact ? 36 : 52;
  return {
    width,
    height,
    compact,
    view,
    strip: { x0: side, x1: width - side, axisY: height - 132, radius: 6, pitch: 13 },
    upper: { x0: side, x1: width - side, axisY: 148, radius: 4.5, pitch: 9.5 },
    lower: { x0: side, x1: width - side, axisY: height - 92, radius: 4.5, pitch: 9.5 },
    plot: { x: left, y: 52, width: width - left - 16, height: lines[0] - 52 - 44 },
    columns: [0.13, 0.3, 0.45, 0.59, 0.74, 0.89].map((f) => Math.round(width * f)),
    tableTop: 44,
    rowHeight: compact ? 23 : 25,
    lines,
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

const round = (v: number, digits: number) => {
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return r === 0 ? 0 : r;
};
/** At most `digits` decimals, trailing zeros dropped, a true minus sign. */
export const statsNumberText = (v: number, digits = 2) => String(round(v, digits)).replace("-", "−");
const n = statsNumberText;
const fixed = (v: number, digits = 2) => `${round(v, digits) < 0 ? "−" : ""}${Math.abs(round(v, digits)).toFixed(digits)}`;

/** y = kx + c as a textbook writes it: y = 2x + 5, y = −x, y = 0.5x − 3, y = x. */
export function statsTransformText(k: number, c: number): string {
  const kk = round(k, 2);
  const cc = round(c, 2);
  const kx = kk === 0 ? "" : kk === 1 ? "x" : kk === -1 ? "−x" : `${n(kk)}x`;
  if (!kx) return `y = ${n(cc)}`;
  if (cc === 0) return `y = ${kx}`;
  return `y = ${kx} ${cc > 0 ? "+" : "−"} ${n(Math.abs(cc))}`;
}

// ── Geometry shared by drawing and picking ───────────────────────────────────

const markKeys = Array.from({ length: STATS_MAX_COUNT }, (_, i) => `m${i + 1}`);
const freqKeys = Array.from({ length: 7 }, (_, i) => `f${i + 1}`);
const cfKeys = Array.from({ length: 7 }, (_, i) => `cf${i + 1}`);

const toX = (s: StatsStrip, domain: readonly [number, number], v: number) => s.x0 + ((v - domain[0]) / (domain[1] - domain[0])) * (s.x1 - s.x0);
const fromX = (s: StatsStrip, domain: readonly [number, number], px: number) => domain[0] + ((px - s.x0) / (s.x1 - s.x0)) * (domain[1] - domain[0]);

export function statsMarks(results: Results): number[] {
  const count = Math.round(num(results.count, STATS_MAX_COUNT));
  return markKeys.slice(0, count).map((k) => num(results[k]));
}

/** Where each dot sits: stacked upwards, in student order, where values are equal. */
export function statsDots(values: readonly number[], strip: StatsStrip, domain: readonly [number, number]): { index: number; x: number; y: number }[] {
  const seen = new Map<number, number>();
  return values.map((v, index) => {
    const key = Math.round(v * 1000);
    const level = seen.get(key) ?? 0;
    seen.set(key, level + 1);
    return { index, x: toX(strip, domain, v), y: strip.axisY - strip.radius - 2 - level * strip.pitch };
  });
}

const MARK_DOMAIN: readonly [number, number] = [0, STATS_MAX_MARK];

/** The window of the second line: everything y = kx + c can reach for x in 0…20, on round numbers. */
export function statsTransformDomain(k: number, c: number): [number, number] {
  const ends = [c, k * STATS_MAX_MARK + c, 0];
  const lo = Math.floor(Math.min(...ends) / 10) * 10;
  const hi = Math.max(lo + 20, Math.ceil(Math.max(...ends, 20) / 10) * 10);
  return [lo, hi];
}

interface Classes {
  k: number;
  lower: number;
  h: number;
  f: number[];
  cf: number[];
}

function classesOf(results: Results): Classes {
  const table = STATS_TABLES[Math.round(num(results.table))] ?? STATS_TABLES[0]!;
  const k = Math.round(num(results.classCount, table.frequencies.length));
  return {
    k,
    lower: num(results.classLower, table.lower),
    h: num(results.classWidth, table.width) || 1,
    f: freqKeys.slice(0, k).map((key) => num(results[key])),
    cf: cfKeys.slice(0, k).map((key) => num(results[key])),
  };
}

interface Frame {
  x: (v: number) => number;
  y: (v: number) => number;
  fromY: (py: number) => number;
  xDomain: readonly [number, number];
  yMax: number;
}

/** The histogram's frame: one empty class either side, so the polygon can come down to zero. */
function histogramFrame(plot: Box, c: Classes): Frame {
  const xDomain = [c.lower - c.h, c.lower + (c.k + 1) * c.h] as const;
  const yMax = Math.max(10, Math.ceil((Math.max(...c.f) + 1) / 5) * 5);
  return frame(plot, xDomain, yMax);
}

function ogiveFrame(plot: Box, c: Classes): Frame {
  const total = c.cf[c.k - 1] ?? 0;
  return frame(plot, [c.lower, c.lower + c.k * c.h], Math.max(10, Math.ceil(total / 10) * 10));
}

function frame(plot: Box, xDomain: readonly [number, number], yMax: number): Frame {
  return {
    x: (v) => plot.x + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * plot.width,
    y: (v) => plot.y + plot.height - (v / yMax) * plot.height,
    fromY: (py) => ((plot.y + plot.height - py) / plot.height) * yMax,
    xDomain,
    yMax,
  };
}

const tickStep = (span: number) => (span <= 24 ? 2 : span <= 50 ? 5 : 10);

// ── Drawing helpers ──────────────────────────────────────────────────────────

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, ring?: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (ring) {
    ctx.strokeStyle = ring;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function band(ctx: CanvasRenderingContext2D, x1: number, x2: number, top: number, bottom: number, colour: string) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.14;
  ctx.fillRect(Math.min(x1, x2), top, Math.abs(x2 - x1), bottom - top);
  ctx.restore();
}

/** A label kept on the canvas: centred on x where it can be, pushed in from either edge where it cannot. */
function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, colour: string, font: string) {
  const half = (text.length * 6.5) / 2;
  label(ctx, text, Math.min(width - 4 - half, Math.max(4 + half, x)), y, { color: colour, font, align: "center" });
}

/** A number line from the strip's domain, with round-number ticks. */
function axis(ctx: CanvasRenderingContext2D, s: StatsStrip, domain: readonly [number, number], theme: LabTheme, labelY: number) {
  line(ctx, s.x0, s.axisY, s.x1, s.axisY, theme.axis, 1.5);
  const step = tickStep(domain[1] - domain[0]);
  for (let v = Math.ceil(domain[0] / step) * step; v <= domain[1] + 1e-9; v += step) {
    const x = toX(s, domain, v);
    line(ctx, x, s.axisY, x, s.axisY + 4, theme.axis, 1);
    label(ctx, n(v), x, labelY, { color: theme.muted, font: theme.font, align: "center" });
  }
}

function dots(ctx: CanvasRenderingContext2D, values: readonly number[], s: StatsStrip, domain: readonly [number, number], theme: LabTheme) {
  for (const d of statsDots(values, s, domain)) disc(ctx, d.x, d.y, s.radius, d.index === 0 ? theme.cosine : theme.sine);
}

/** How high the tallest stack reaches. */
const stackTop = (values: readonly number[], s: StatsStrip, domain: readonly [number, number]) =>
  Math.min(s.axisY - s.radius * 2, ...statsDots(values, s, domain).map((d) => d.y - s.radius));

// ── The views ────────────────────────────────────────────────────────────────

function drawDots(ctx: CanvasRenderingContext2D, layout: StatsLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const { strip: s, width } = layout;
  const values = statsMarks(results);
  const words = has("labels");
  const mean = num(results.mean);
  const median = num(results.median);
  const sd = num(results.sd);
  const top = 82;
  const xm = toX(s, MARK_DOMAIN, mean);

  if (has("spread") && words) {
    // x̄ ± σ as a shaded band, then each mark's deviation from the mean.
    band(ctx, toX(s, MARK_DOMAIN, mean - sd), toX(s, MARK_DOMAIN, mean + sd), top, s.axisY, theme.curve);
    tag(ctx, "x̄ − σ", toX(s, MARK_DOMAIN, mean - sd) - 18, top - 10, width, theme.curve, theme.font);
    tag(ctx, "x̄ + σ", toX(s, MARK_DOMAIN, mean + sd) + 18, top - 10, width, theme.curve, theme.font);
    for (const d of statsDots(values, s, MARK_DOMAIN)) {
      const above = values[d.index]! >= mean;
      line(ctx, xm, d.y, d.x, d.y, above ? theme.tangent : theme.secant, 1.5);
    }
    // The range, bracketed under the axis.
    const y = s.axisY + 46;
    arrow(ctx, toX(s, MARK_DOMAIN, num(results.min)), y, toX(s, MARK_DOMAIN, num(results.max)), y, { color: theme.angle, width: 1.5, head: 6, double: true });
    tag(ctx, `range ${n(num(results.range))}`, (toX(s, MARK_DOMAIN, num(results.min)) + toX(s, MARK_DOMAIN, num(results.max))) / 2, y + 13, width, theme.angle, theme.font);
  }

  axis(ctx, s, MARK_DOMAIN, theme, s.axisY + 26);
  label(ctx, "marks out of 20", s.x1, s.axisY + 46 + (has("spread") && words ? 26 : 0), { color: theme.muted, font: theme.font, align: "right" });

  if (has("centre") && words) {
    const modeKind = num(results.modeKind);
    if (modeKind > 0) {
      // Ring every stack that is as tall as the tallest.
      const counts = new Map<number, number>();
      for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
      const tallest = num(results.modeFrequency);
      for (const [v, c] of counts) {
        if (c !== tallest) continue;
        const x = toX(s, MARK_DOMAIN, v);
        ctx.save();
        ctx.strokeStyle = theme.curve;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - s.radius - 3, s.axisY - 2 - c * s.pitch - 2, 2 * s.radius + 6, c * s.pitch + 2);
        ctx.restore();
      }
    }
    const xmed = toX(s, MARK_DOMAIN, median);
    line(ctx, xmed, 60, xmed, s.axisY, theme.tangent, 2, [5, 4]);
    line(ctx, xm, 42, xm, s.axisY, theme.angle, 2.5);
    tag(ctx, `x̄ = ${n(mean)}`, xm, 34, width, theme.angle, theme.fontStrong);
    tag(ctx, `median ${n(median)}`, xmed, 52, width, theme.tangent, theme.font);
    tag(ctx, modeKind === 0 ? "no mode" : modeKind === 1 ? `mode ${n(num(results.mode))}` : "two or more modes", toX(s, MARK_DOMAIN, num(results.mode)), 70, width, theme.curve, theme.font);
  }

  dots(ctx, values, s, MARK_DOMAIN, theme);

  if (has("centre") && words) {
    // The pivot: the plot balances on the mean.
    ctx.save();
    ctx.fillStyle = theme.angle;
    ctx.beginPath();
    ctx.moveTo(xm, s.axisY + 1);
    ctx.lineTo(xm - 8, s.axisY + 15);
    ctx.lineTo(xm + 8, s.axisY + 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (!words) return ["Drag a dot to change a mark."];
  if (has("spread")) {
    return [
      `MD about x̄ ${fixed(num(results.mdMean))} · about median ${fixed(num(results.mdMedian))}`,
      `σ² = ${fixed(num(results.variance))} · σ = ${fixed(sd)}`,
    ];
  }
  const count = values.length;
  const nth = (k: number) => `${k}${k === 1 ? "st" : k === 2 ? "nd" : k === 3 ? "rd" : "th"}`;
  const middle = count % 2 === 1 ? `the middle (${nth((count + 1) / 2)}) mark` : `the ${nth(count / 2)} and ${nth(count / 2 + 1)} averaged`;
  return [`${count} marks, total ${n(num(results.sum))}: x̄ = ${n(mean)}`, `median ${n(median)}: ${middle}`];
}

function drawTransform(ctx: CanvasRenderingContext2D, layout: StatsLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const { upper, lower, width } = layout;
  const words = has("labels");
  const k = num(results.scale, 1);
  const c = num(results.shift);
  const values = statsMarks(results);
  const moved = values.map((v) => k * v + c);
  const domain = statsTransformDomain(k, c);

  const strip = (s: StatsStrip, vs: readonly number[], d: readonly [number, number], mean: number, sd: number, name: string, labelY: number) => {
    const top = stackTop(vs, s, d) - 6;
    if (words) {
      band(ctx, toX(s, d, mean - sd), toX(s, d, mean + sd), top, s.axisY, theme.curve);
      line(ctx, toX(s, d, mean), top - 4, toX(s, d, mean), s.axisY, theme.angle, 2.5);
    }
    axis(ctx, s, d, theme, labelY);
    dots(ctx, vs, s, d, theme);
    label(ctx, name, s.x0, top - 14, { color: theme.text, font: theme.fontStrong });
  };

  strip(upper, values, MARK_DOMAIN, num(results.mean), num(results.sd), "x: the marks", upper.axisY + 16);
  strip(lower, moved, domain, num(results.newMean), num(results.newSd), statsTransformText(k, c), lower.axisY + 16);

  if (!words) return [`Every mark x becomes ${statsTransformText(k, c)}.`];
  return [
    `x̄ = ${fixed(num(results.mean))}, σ = ${fixed(num(results.sd))} → ȳ = ${fixed(num(results.newMean))}`,
    `σ of y = |${n(k)}| × ${fixed(num(results.sd))} = ${fixed(num(results.newSd))}`,
  ];
}

/** Class boundaries along the bottom of a plot. */
function classAxis(ctx: CanvasRenderingContext2D, plot: Box, f: Frame, c: Classes, theme: LabTheme, name: string) {
  const base = plot.y + plot.height;
  line(ctx, plot.x, base, plot.x + plot.width, base, theme.axis, 1.5);
  line(ctx, plot.x, plot.y, plot.x, base, theme.axis, 1.5);
  for (let i = 0; i <= c.k; i++) {
    const x = f.x(c.lower + i * c.h);
    line(ctx, x, base, x, base + 4, theme.axis, 1);
    label(ctx, n(c.lower + i * c.h), x, base + 14, { color: theme.muted, font: theme.font, align: "center" });
  }
  const step = f.yMax <= 10 ? 2 : f.yMax <= 30 ? 5 : 10;
  for (let v = step; v <= f.yMax + 1e-9; v += step) {
    const y = f.y(v);
    line(ctx, plot.x, y, plot.x + plot.width, y, theme.grid, 1);
    label(ctx, n(v), plot.x - 6, y, { color: theme.muted, font: theme.font, align: "right" });
  }
  label(ctx, name, plot.x + plot.width, base + 30, { color: theme.muted, font: theme.font, align: "right" });
}

function drawHistogram(ctx: CanvasRenderingContext2D, layout: StatsLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const { plot } = layout;
  const words = has("labels");
  const c = classesOf(results);
  const f = histogramFrame(plot, c);
  const table = STATS_TABLES[Math.round(num(results.table))] ?? STATS_TABLES[0]!;
  const base = plot.y + plot.height;
  classAxis(ctx, plot, f, c, theme, `${table.variable} (class width ${n(c.h)})`);
  label(ctx, "frequency", plot.x + 4, plot.y - 12, { color: theme.muted, font: theme.font });

  const modal = Math.round(num(results.modalClass)) - 1;
  const showMode = has("modal") && words && modal >= 0;
  c.f.forEach((fi, i) => {
    const x1 = f.x(c.lower + i * c.h);
    const x2 = f.x(c.lower + (i + 1) * c.h);
    const y = f.y(fi);
    ctx.save();
    ctx.fillStyle = showMode && i === modal ? theme.angle : theme.sine;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x1, y, x2 - x1, base - y);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = showMode && i === modal ? theme.angle : theme.sine;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x1, y, x2 - x1, base - y);
    ctx.restore();
    label(ctx, n(fi), (x1 + x2) / 2, y - 9, { color: theme.text, font: theme.font, align: "center" });
  });

  if (has("polygon")) {
    // Through the class marks, down to zero at the marks of the empty classes either side.
    const points: [number, number][] = [[c.lower - c.h / 2, 0], ...c.f.map((fi, i) => [c.lower + (i + 0.5) * c.h, fi] as [number, number]), [c.lower + (c.k + 0.5) * c.h, 0]];
    ctx.save();
    ctx.strokeStyle = theme.curve;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(f.x(x), f.y(y)) : ctx.lineTo(f.x(x), f.y(y))));
    ctx.stroke();
    ctx.restore();
    for (const [x, y] of points) disc(ctx, f.x(x), f.y(y), 3.5, theme.curve);
  }

  if (showMode) {
    // The crossing lines: the modal bar's top-left to the next bar's height at its right edge, and its top-right to the previous bar's height at its left edge.
    const l = c.lower + modal * c.h;
    const f1 = num(results.modalFreq);
    const f0 = num(results.modeBefore);
    const f2 = num(results.modeAfter);
    line(ctx, f.x(l), f.y(f1), f.x(l + c.h), f.y(f2), theme.text, 1.5);
    line(ctx, f.x(l + c.h), f.y(f1), f.x(l), f.y(f0), theme.text, 1.5);
    const mode = num(results.groupedMode);
    line(ctx, f.x(mode), f.y(f1) + 4, f.x(mode), base, theme.angle, 2, [4, 4]);
    disc(ctx, f.x(mode), base, 4, theme.angle);
  }

  const N = num(results.total);
  if (!words) return [`${table.label}`, `N = ${n(N)} · drag a bar to change its frequency`];
  if (showMode) {
    const l = num(results.modalLower);
    return [
      `modal class ${n(l)}–${n(l + c.h)}: f₀ = ${n(num(results.modeBefore))}, f₁ = ${n(num(results.modalFreq))}, f₂ = ${n(num(results.modeAfter))}`,
      `mode = ${n(l)} + (f₁ − f₀)/(2f₁ − f₀ − f₂) × ${n(c.h)} = ${n(num(results.groupedMode))}`,
    ];
  }
  return [`${table.label}`, `N = ${n(N)} · class marks ${n(c.lower + c.h / 2)}, ${n(c.lower + 1.5 * c.h)}, …`];
}

function drawSteps(ctx: CanvasRenderingContext2D, layout: StatsLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const { columns, tableTop, rowHeight, width } = layout;
  const words = has("labels");
  const c = classesOf(results);
  const a = num(results.assumedMean);
  const assumed = Math.round(num(results.assumed)) - 1;
  const heads = ["class", "f", "x", "u", "fu", "fu²"];
  heads.forEach((h, i) => label(ctx, h, columns[i]!, tableTop, { color: theme.muted, font: theme.fontStrong, align: "center" }));
  line(ctx, 8, tableTop + 11, width - 8, tableTop + 11, theme.axis, 1);
  c.f.forEach((fi, i) => {
    const y = tableTop + rowHeight * (i + 1);
    const x = c.lower + (i + 0.5) * c.h;
    const u = (x - a) / c.h;
    if (i === assumed) {
      ctx.save();
      ctx.fillStyle = theme.angle;
      ctx.globalAlpha = 0.2;
      ctx.fillRect(8, y - rowHeight / 2, width - 16, rowHeight);
      ctx.restore();
    }
    const cells = [`${n(c.lower + i * c.h)}–${n(c.lower + (i + 1) * c.h)}`, n(fi), n(x), n(u), n(fi * u), n(fi * u * u)];
    cells.forEach((text, j) => label(ctx, text, columns[j]!, y, { color: j === 3 && i === assumed ? theme.angle : theme.text, font: theme.font, align: "center" }));
  });
  const sumY = tableTop + rowHeight * (c.k + 1);
  line(ctx, 8, sumY - rowHeight / 2, width - 8, sumY - rowHeight / 2, theme.axis, 1);
  label(ctx, "Σ", columns[0]!, sumY, { color: theme.muted, font: theme.fontStrong, align: "center" });
  label(ctx, n(num(results.total)), columns[1]!, sumY, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (words) {
    label(ctx, n(num(results.sumFu)), columns[4]!, sumY, { color: theme.text, font: theme.fontStrong, align: "center" });
    label(ctx, n(num(results.sumFu2)), columns[5]!, sumY, { color: theme.text, font: theme.fontStrong, align: "center" });
    label(ctx, `σ² = h²[Σfu²/N − (Σfu/N)²] = ${fixed(num(results.groupedVariance))}`, width / 2, sumY + 24, { color: theme.curve, font: theme.font, align: "center" });
  }
  const h = n(c.h);
  if (!words) return [`a = ${n(a)}, h = ${h}, u = (x − a)/h`, "Tap a row to take its class mark as a."];
  if (num(results.empty) === 1) return [`a = ${n(a)}, h = ${h}`, "every frequency is 0: there is no mean"];
  return [
    `x̄ = a + h·Σfu/Σf = ${n(a)} + ${h} × ${n(num(results.sumFu))}/${n(num(results.total))}`,
    `= ${n(num(results.stepMean))}, the same as Σfx/Σf = ${n(num(results.sumFx))}/${n(num(results.total))}`,
  ];
}

function drawOgive(ctx: CanvasRenderingContext2D, layout: StatsLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const { plot } = layout;
  const words = has("labels");
  const c = classesOf(results);
  const f = ogiveFrame(plot, c);
  const table = STATS_TABLES[Math.round(num(results.table))] ?? STATS_TABLES[0]!;
  classAxis(ctx, plot, f, c, theme, `${table.variable}: upper class limit`);
  label(ctx, "cumulative frequency", plot.x + 4, plot.y - 12, { color: theme.muted, font: theme.font });

  const points: [number, number][] = [[c.lower, 0], ...c.cf.map((cf, i) => [c.lower + (i + 1) * c.h, cf] as [number, number])];
  ctx.save();
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(f.x(x), f.y(y)) : ctx.lineTo(f.x(x), f.y(y))));
  ctx.stroke();
  ctx.restore();
  for (const [x, y] of points) disc(ctx, f.x(x), f.y(y), 3.5, theme.curve);
  c.cf.forEach((cf, i) => label(ctx, n(cf), f.x(c.lower + (i + 1) * c.h) - 6, f.y(cf) - 10, { color: theme.text, font: theme.font, align: "right" }));

  const half = num(results.halfN);
  if (!words || num(results.empty) === 1) return [`${table.label}`, `N = ${n(num(results.total))}: read across at n/2`];
  const median = num(results.groupedMedian);
  line(ctx, plot.x, f.y(half), f.x(median), f.y(half), theme.tangent, 2, [5, 4]);
  line(ctx, f.x(median), f.y(half), f.x(median), plot.y + plot.height, theme.tangent, 2, [5, 4]);
  disc(ctx, f.x(median), plot.y + plot.height, 4, theme.tangent);
  label(ctx, `n/2 = ${n(half)}`, plot.x + 6, f.y(half) - 9, { color: theme.tangent, font: theme.font });
  const l = num(results.medianLower);
  return [
    `median class ${n(l)}–${n(l + c.h)}: cf = ${n(num(results.cfBefore))}, f = ${n(num(results.medianFreq))}`,
    `median = ${n(l)} + (${n(half)} − ${n(num(results.cfBefore))})/${n(num(results.medianFreq))} × ${n(c.h)} = ${n(median)}`,
  ];
}

export const statsRenderer: SimulationRenderer<StatsLayout> = {
  id: "stats",
  layout: (width, graphs, layers) => computeStatsLayout(width, graphs, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

    let lines: string[];
    switch (layout.view) {
      case "transform":
        title("Change of scale: y = kx + c");
        lines = drawTransform(ctx, layout, results, has, theme);
        break;
      case "histogram":
        title(has("polygon") ? "Histogram and frequency polygon" : "Histogram");
        lines = drawHistogram(ctx, layout, results, has, theme);
        break;
      case "steps":
        title("Mean by step deviation");
        lines = drawSteps(ctx, layout, results, has, theme);
        break;
      case "ogive":
        title("Less-than ogive");
        lines = drawOgive(ctx, layout, results, has, theme);
        break;
      default:
        title(has("spread") ? "How spread out are the marks?" : "Where is the middle?");
        lines = drawDots(ctx, layout, results, has, theme);
    }
    lines.slice(0, 2).forEach((words, i) => label(ctx, words, width / 2, layout.lines[lines.length === 1 ? 1 : i]!, { color: theme.text, font: theme.font, align: "center" }));
  },

  pick(layout, x, y, locked, results): PickResult | null {
    if (layout.view === "dots" || layout.view === "transform") {
      const s = layout.view === "dots" ? layout.strip : layout.upper;
      const mark = (v: number) => Math.max(0, Math.min(STATS_MAX_MARK, Math.round(v)));
      if (locked?.startsWith("m")) return { writes: [{ variable: locked, value: mark(fromX(s, MARK_DOMAIN, x)) }], region: locked };
      let best: { index: number; d: number } | null = null;
      for (const d of statsDots(statsMarks(results), s, MARK_DOMAIN)) {
        const dist = Math.hypot(d.x - x, d.y - y);
        if (dist <= s.radius + 8 && (!best || dist < best.d)) best = { index: d.index, d: dist };
      }
      if (!best) return null;
      const variable = `m${best.index + 1}`;
      return { writes: [{ variable, value: mark(fromX(s, MARK_DOMAIN, x)) }], region: variable };
    }
    if (layout.view === "histogram") {
      const c = classesOf(results);
      const f = histogramFrame(layout.plot, c);
      const value = (py: number) => Math.max(0, Math.min(STATS_MAX_FREQUENCY, Math.round(f.fromY(py))));
      if (locked?.startsWith("f")) return { writes: [{ variable: locked, value: value(y) }], region: locked };
      const { plot } = layout;
      if (y < plot.y - 10 || y > plot.y + plot.height + 4) return null;
      for (let i = 0; i < c.k; i++) {
        if (x >= f.x(c.lower + i * c.h) && x <= f.x(c.lower + (i + 1) * c.h)) return { writes: [{ variable: `f${i + 1}`, value: value(y) }], region: `f${i + 1}`, press: "jump" };
      }
      return null;
    }
    if (layout.view === "steps") {
      const c = classesOf(results);
      const row = Math.round((y - layout.tableTop) / layout.rowHeight);
      if (row < 1 || row > c.k) return null;
      return { writes: [{ variable: "assumed", value: row }], region: "assumed", press: "jump" };
    }
    return null;
  },
};
