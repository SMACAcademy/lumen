/**
 * Area by strips, in four pictures.
 *
 * Strips: a curve with n strips standing on [a, b] — rectangles at the left,
 * right or middle height, or trapezia — and underneath, the size of the
 * error against n on log scales, falling as a straight line.
 *
 * Signed: the same strips coloured by sign — above the axis in one colour,
 * below it in another — with the two totals that cancel.
 *
 * Split: the exact region from a to b shaded in two colours either side of
 * c, showing ∫ₐᶜ + ∫ᶜᵇ = ∫ₐᵇ. An arrow shows the direction when b < a.
 *
 * Between: two curves and strips from one to the other, coloured by which
 * curve is on top.
 */

import {
  RIEMANN_FUNCTION_ORDER,
  RIEMANN_FUNCTIONS,
  RIEMANN_PAIR_ORDER,
  RIEMANN_PAIRS,
  RIEMANN_RULE_NAMES,
  RIEMANN_RULE_ORDER,
  riemannStrips,
  riemannSum,
  type RiemannRule,
} from "@ise/mathematics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface RiemannLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The curve and its strips. */
  plot: Box;
  /** The error against n; zero height when the error layer is hidden. */
  errorPlot: Box;
}

export function computeRiemannLayout(width: number, layers: ReadonlySet<string> = new Set()): RiemannLayout {
  const compact = width < 560;
  const withError = layers.has("error");
  const height = withError ? 410 : 380;
  const left = compact ? 36 : 48;
  const plotHeight = withError ? 200 : height - 30 - 58;
  return {
    width,
    height,
    compact,
    plot: { x: left, y: 30, width: width - left - 14, height: plotHeight },
    errorPlot: withError ? { x: left, y: 272, width: width - left - 14, height: 86 } : { x: left, y: height, width: width - left - 14, height: 0 },
  };
}

/** The n values the error graph samples. */
export const RIEMANN_ERROR_SAMPLES = [1, 2, 3, 4, 5, 6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 64, 80, 100, 128, 160, 200] as const;

const fixed = (v: number, digits = 3) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const signed = (v: number, digits = 3) => `${v >= 0.5 * 10 ** -digits ? "+" : v <= -0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

/** A limit as a learner would write it: 0, 2, π, 2π, −π/2, e, 1.5. */
export function riemannLimitText(v: number): string {
  const sign = v < 0 ? "−" : "";
  const m = Math.abs(v);
  if (m < 1e-9) return "0";
  if (Math.abs(m - Math.E) < 1e-6) return `${sign}e`;
  const halves = (2 * m) / Math.PI;
  if (Math.abs(halves - Math.round(halves)) < 1e-6) {
    const k = Math.round(halves);
    const text = k % 2 === 0 ? (k === 2 ? "π" : `${k / 2}π`) : k === 1 ? "π/2" : `${k}π/2`;
    return sign + text;
  }
  return sign + String(Number(m.toFixed(2)));
}

function stroke(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, colour: string, from = plane.xDomain[0], to = plane.xDomain[1]) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  let started = false;
  for (let i = 0; i <= 240; i++) {
    const x = from + ((to - from) * i) / 240;
    const y = f(x);
    if (!Number.isFinite(y)) {
      started = false;
      continue;
    }
    const [px, py] = plane.toPx(x, Math.max(plane.yDomain[0] - 10, Math.min(plane.yDomain[1] + 10, y)));
    if (!started) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    started = true;
  }
  ctx.stroke();
  ctx.restore();
}

/** A filled quadrilateral (a strip) from four corners in maths coordinates. */
function quad(ctx: CanvasRenderingContext2D, plane: Plane, corners: readonly (readonly [number, number])[], fill: string, outline: string | null) {
  ctx.beginPath();
  corners.forEach(([x, y], i) => {
    const [px, py] = plane.toPx(x, Math.max(plane.yDomain[0] - 10, Math.min(plane.yDomain[1] + 10, y)));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.38;
  ctx.fill();
  if (outline) {
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** The exact region between y = top(x) and y = bottom(x) from x0 to x1. */
function region(ctx: CanvasRenderingContext2D, plane: Plane, top: (x: number) => number, bottom: (x: number) => number, x0: number, x1: number, fill: string) {
  if (Math.abs(x1 - x0) < 1e-12) return;
  const steps = 80;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const [px, py] = plane.toPx(x, top(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = steps; i >= 0; i--) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const [px, py] = plane.toPx(x, bottom(x));
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.38;
  ctx.fill();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 1.5, dash?: number[]) {
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

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Strips standing on the axis (or between two curves): rectangles, or trapezia for the trapezium rule. */
function drawStrips(
  ctx: CanvasRenderingContext2D,
  plane: Plane,
  gap: (x: number) => number,
  base: (x: number) => number,
  a: number,
  b: number,
  n: number,
  rule: RiemannRule,
  colours: { up: string; down: string; edge: string },
) {
  const strips = riemannStrips(gap, a, b, n, rule);
  const outline = n <= 60 ? colours.edge : null;
  ctx.save();
  clipToPlane(ctx, plane);
  for (const s of strips) {
    if (rule === "trap") {
      const fill = s.h0 + s.h1 >= 0 ? colours.up : colours.down;
      quad(ctx, plane, [[s.x0, base(s.x0)], [s.x0, base(s.x0) + s.h0], [s.x1, base(s.x1) + s.h1], [s.x1, base(s.x1)]], fill, outline);
      continue;
    }
    // Between curves the strip runs from the lower curve to the upper at its sample point.
    const sample = rule === "left" ? s.x0 : rule === "right" ? s.x1 : (s.x0 + s.x1) / 2;
    const foot = base(sample);
    const h = s.height;
    const fill = h >= 0 ? colours.up : colours.down;
    quad(ctx, plane, [[s.x0, foot], [s.x0, foot + h], [s.x1, foot + h], [s.x1, foot]], fill, outline);
  }
  ctx.restore();
}

/** The error against n on log–log scales, with the current n marked. */
function drawErrorPlot(ctx: CanvasRenderingContext2D, box: Box, f: (x: number) => number, exact: number, a: number, b: number, rule: RiemannRule, n: number, theme: LabTheme, words: boolean, ratio: number) {
  const floor = 1e-12;
  const logs = RIEMANN_ERROR_SAMPLES.map((k) => Math.log10(Math.max(floor, Math.abs(riemannSum(f, a, b, k, rule) - exact))));
  const current = Math.log10(Math.max(floor, Math.abs(riemannSum(f, a, b, n, rule) - exact)));
  const top = Math.ceil(Math.max(...logs, current));
  const bottom = Math.min(top - 1, Math.floor(Math.min(...logs, current)));
  const xMax = Math.log10(200);
  const toPx = (lx: number, ly: number): [number, number] => [box.x + (lx / xMax) * box.width, box.y + ((top - ly) / (top - bottom)) * box.height];

  label(ctx, "size of the error against n (log scales)", box.x, box.y - 12, { color: theme.muted, font: theme.font });
  ctx.save();
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  const stepY = Math.max(1, Math.ceil((top - bottom) / 4));
  for (let p = top; p >= bottom; p -= stepY) {
    const [, py] = toPx(0, p);
    ctx.beginPath();
    ctx.moveTo(box.x, py);
    ctx.lineTo(box.x + box.width, py);
    ctx.stroke();
  }
  ctx.restore();
  line(ctx, box.x, box.y, box.x, box.y + box.height, theme.axis, 1.25);
  line(ctx, box.x, box.y + box.height, box.x + box.width, box.y + box.height, theme.axis, 1.25);
  for (let p = top; p >= bottom; p -= stepY) {
    label(ctx, p === 0 ? "1" : `10${superscript(p)}`, box.x - 4, toPx(0, p)[1], { color: theme.muted, font: theme.font, align: "right" });
  }
  for (const k of [1, 10, 100]) {
    const [px] = toPx(Math.log10(k), bottom);
    label(ctx, String(k), px, box.y + box.height + 4, { color: theme.muted, font: theme.font, align: k === 1 ? "left" : "center", baseline: "top" });
  }
  label(ctx, "n", box.x + box.width, box.y + box.height + 4, { color: theme.muted, font: theme.font, align: "right", baseline: "top" });

  if (Math.max(...logs, current) <= Math.log10(floor) + 1e-9) {
    label(ctx, "the sum is exact at every n", box.x + box.width / 2, box.y + box.height / 2, { color: theme.text, font: theme.font, align: "center" });
    return;
  }
  ctx.save();
  ctx.strokeStyle = theme.secant;
  ctx.lineWidth = 2;
  ctx.beginPath();
  RIEMANN_ERROR_SAMPLES.forEach((k, i) => {
    const [px, py] = toPx(Math.log10(k), logs[i]!);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.restore();
  const [cx, cy] = toPx(Math.log10(n), current);
  disc(ctx, cx, cy, 4.5, theme.angle);
  if (words && ratio > 0) {
    label(ctx, `double n: error ÷ ${ratio.toFixed(2)}`, box.x + box.width - 2, box.y + 8, { color: theme.text, font: theme.font, align: "right", background: theme.background });
  }
}

const SUPERSCRIPTS: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const superscript = (p: number) => String(p).split("").map((ch) => SUPERSCRIPTS[ch] ?? ch).join("");

export const riemannRenderer: SimulationRenderer<RiemannLayout> = {
  id: "riemann",
  layout: (width, _graphs, layers) => computeRiemannLayout(width, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, plot, errorPlot } = layout;
    ctx.clearRect(0, 0, width, height);
    const words = has("labels");
    const caption = (text: string) => label(ctx, text, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const ruleId = RIEMANN_RULE_ORDER[Math.round(num(results.rule))] ?? "left";
    const n = Math.max(1, Math.round(num(results.n, 1)));

    if (has("between")) {
      const pair = RIEMANN_PAIRS[RIEMANN_PAIR_ORDER[Math.round(num(results.pair))] ?? "line-square"];
      const plane = createPlane(plot, pair.x, pair.y);
      title(`Between ${pair.label}`);
      drawPlane(ctx, plane, theme);
      drawStrips(ctx, plane, (x) => pair.f(x) - pair.g(x), pair.g, pair.a, pair.b, n, ruleId, { up: theme.sine, down: theme.angle, edge: theme.axis });
      stroke(ctx, plane, pair.f, theme.curve);
      stroke(ctx, plane, pair.g, theme.cosine);
      for (const x of [pair.a, pair.b, ...pair.crossings]) {
        const [px, py] = plane.toPx(x, pair.f(x));
        disc(ctx, px, py, 4, theme.text);
      }
      label(ctx, pair.fLabel, plot.x + 8, plot.y + 10, { color: theme.curve, font: theme.fontStrong, background: theme.background });
      label(ctx, pair.gLabel, plot.x + 8, plot.y + 30, { color: theme.cosine, font: theme.fontStrong, background: theme.background });
      if (words) {
        caption(`n = ${n} · strips ${fixed(num(results.pairSum), 4)} · area ${fixed(num(results.pairArea), 4)}`);
        if (pair.crossings.length > 0) {
          label(ctx, `∫(f − g) dx = ${fixed(num(results.pairSigned), 3)}`, plot.x + plot.width - 4, plot.y + plot.height - 10, {
            color: theme.text,
            font: theme.font,
            align: "right",
            background: theme.background,
          });
        }
      }
      return;
    }

    if (!has("curve")) return;
    const fn = RIEMANN_FUNCTIONS[RIEMANN_FUNCTION_ORDER[Math.round(num(results.fn))] ?? "square"];
    const a = num(results.a);
    const b = num(results.b);
    const c = num(results.c);
    const plane = createPlane(plot, fn.x, fn.y);
    title(`y = ${fn.label} from ${riemannLimitText(a)} to ${riemannLimitText(b)}`);
    drawPlane(ctx, plane, theme);

    if (has("split")) {
      // The exact region, a to c in one colour and c to b in another.
      const zero = () => 0;
      region(ctx, plane, fn.f, zero, a, c, theme.tangent);
      region(ctx, plane, fn.f, zero, c, b, theme.angle);
      const [cx] = plane.toPx(c, 0);
      line(ctx, cx, plot.y, cx, plot.y + plot.height, theme.text, 1.5, [4, 4]);
      label(ctx, "c", cx + 5, plot.y + 10, { color: theme.text, font: theme.fontStrong });
    } else {
      drawStrips(ctx, plane, fn.f, () => 0, a, b, n, ruleId, { up: theme.sine, down: theme.secant, edge: theme.axis });
    }
    stroke(ctx, plane, fn.f, theme.curve);

    for (const [x, name] of [[a, "a"], [b, "b"]] as const) {
      const [px] = plane.toPx(x, 0);
      line(ctx, px, plot.y + 18, px, plot.y + plot.height, theme.muted, 1, [2, 4]);
      label(ctx, name, px, plot.y + 10, { color: theme.angle, font: theme.fontStrong, align: "center" });
    }
    if (b < a - 1e-9) {
      const [ax] = plane.toPx(a, 0);
      const [bx] = plane.toPx(b, 0);
      arrow(ctx, ax, plot.y + 24, bx, plot.y + 24, { color: theme.angle, width: 2, head: 7 });
    }

    if (has("error")) {
      drawErrorPlot(ctx, errorPlot, fn.f, num(results.exact), a, b, ruleId, n, theme, words, num(results.errorRatio));
    }

    if (!words) return;
    if (has("split")) {
      caption(`∫ₐᶜ ${fixed(num(results.partLeft))} + ∫ᶜᵇ ${fixed(num(results.partRight))} = ∫ₐᵇ ${fixed(num(results.exact))}`);
    } else if (has("signed")) {
      caption(`above ${signed(num(results.aboveExact))} · below ${signed(num(results.belowExact))} · net ${fixed(num(results.exact))}`);
      label(ctx, `area shaded ${fixed(num(results.geometric))}`, plot.x + plot.width - 4, plot.y + plot.height - 10, {
        color: theme.text,
        font: theme.font,
        align: "right",
        background: theme.background,
      });
    } else {
      caption(`n = ${n} · ${RIEMANN_RULE_NAMES[ruleId]} sum ${fixed(num(results.sum), 4)} · exact ${fixed(num(results.exact), 4)}`);
    }
  },
};
