/**
 * Compound angles, trigonometric equations and inverse functions.
 *
 * circle: the unit circle with A, then B on top of it, landing on A + B. The
 * x-coordinate of that point is built in two pieces along the x-axis:
 * cos A cos B, then − sin A sin B. The optional proof layer adds NCERT's two
 * equal chords, P₁P₃ and P₂P₄.
 *
 * double: the same circle with B = A — the point at 2A and its two shadows.
 *
 * equation: y = f(x) across −5π/2 … 5π/2, the line y = k, a dot at every
 * solution and the n-th member of the general solution picked out.
 *
 * inverse: the restricted branch of f, the line y = x, and the branch's
 * mirror image, the graph of f⁻¹, on equal scales.
 *
 * fold: y = f⁻¹(f(θ)) against θ — the zigzag that gives θ back only on the
 * principal range.
 *
 * complement: sin⁻¹x and cos⁻¹x stacked at one x, always reaching π/2.
 *
 * tansum: tan⁻¹u and tan⁻¹v added on the unit circle, with the angle the
 * formula tan⁻¹((u + v)/(1 − uv)) gives, which is π short when uv > 1.
 *
 * small: f(θ) for 0 ≤ θ ≤ 60° (θ in radians along the axis) against its
 * small-angle form — the line y = θ for sin and tan, the parabola 1 − θ²/2
 * for cos — with θ marked and, with labels, the percentage error.
 */

import {
  TRIGPLUS_FUNCTIONS,
  TRIGPLUS_RANGE,
  TRIGPLUS_WINDOW,
  trigPlusFold,
  trigPlusForward,
  trigPlusSmallAngle,
  trigPlusSolutionsIn,
  type TrigPlusFunction,
} from "@ise/mathematics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface TrigPlusLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The unit circle of the compound-angle and tan-sum views. */
  circle: { cx: number; cy: number; r: number };
  /** The wide plot of the equation, fold and complement views. */
  plot: Box;
  /** A square plot, so that reflecting in y = x is a true mirror. */
  square: Box;
  /** Baselines of the two caption lines. */
  line1: number;
  line2: number;
}

const PI = Math.PI;
const TOP = 30;
const FOOT = 50;

export function computeTrigPlusLayout(width: number): TrigPlusLayout {
  const compact = width < 560;
  const height = compact ? 400 : 420;
  const room = height - TOP - FOOT;
  const r = Math.max(40, Math.min(width / 2 - 52, room / 2 - 16));
  const side = Math.max(120, Math.min(width - 40, room - 6));
  const left = compact ? 30 : 44;
  return {
    width,
    height,
    compact,
    circle: { cx: width / 2, cy: TOP + room / 2, r },
    plot: { x: left, y: TOP + 6, width: width - left - 14, height: room - 22 },
    square: { x: (width - side) / 2 + 8, y: TOP, width: side - 16, height: side - 16 },
    line1: height - 32,
    line2: height - 14,
  };
}

/** A fixed number of decimals, with a true minus sign and never "−0.00". */
const fixed = (v: number, digits = 2) => {
  const text = Math.abs(v).toFixed(digits);
  return `${v < 0 && Number(text) !== 0 ? "−" : ""}${text}`;
};
/** Degrees, whole when they are whole. */
const degrees = (v: number) => {
  const whole = Math.abs(v - Math.round(v)) < 0.05;
  return `${fixed(v, whole ? 0 : 1)}°`;
};
const FUNCTION_NAME: Record<TrigPlusFunction, string> = { sin: "sin", cos: "cos", tan: "tan" };
const inverseName = (f: TrigPlusFunction) => `${f}⁻¹`;

/** Multiples of π/2 as text: π/2, π, 3π/2, 2π … */
function piText(halves: number): string {
  const sign = halves < 0 ? "−" : "";
  const m = Math.abs(halves);
  if (m === 0) return "0";
  if (m % 2 === 0) return `${sign}${m === 2 ? "" : m / 2}π`;
  return `${sign}${m === 1 ? "" : m}π/2`;
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, PI * 2);
  ctx.fill();
  ctx.restore();
}

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

/** An arc of the circle of radius r about (cx, cy), from angle a to angle b (maths angles, anticlockwise positive). */
function arc(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, a: number, b: number, colour: string, lineWidth = 2, dash?: number[]) {
  if (Math.abs(b - a) < 1e-6) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  // Canvas angles run clockwise, so a maths angle t is canvas angle −t.
  ctx.arc(cx, cy, r, -a, -b, b > a);
  ctx.stroke();
  ctx.restore();
}

/** A curve sampled across the plane, broken wherever it jumps or is undefined. */
function stroke(ctx: CanvasRenderingContext2D, plane: Plane, points: (t: number) => [number, number] | null, t0: number, t1: number, colour: string, lineWidth: number, dash?: number[], samples = 400) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  let last: [number, number] | null = null;
  for (let i = 0; i <= samples; i++) {
    const p = points(t0 + ((t1 - t0) * i) / samples);
    if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) {
      last = null;
      continue;
    }
    const [px, py] = plane.toPx(p[0], p[1]);
    if (!last || Math.abs(py - last[1]) > plane.rect.height * 0.6) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    last = [px, py];
  }
  ctx.stroke();
  ctx.restore();
}

/** The two axes through the origin, without the shared plane's decimal ticks. */
function axes(ctx: CanvasRenderingContext2D, plane: Plane, theme: LabTheme) {
  const [ox, oy] = plane.toPx(0, 0);
  const { rect } = plane;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  if (oy >= rect.y && oy <= rect.y + rect.height) {
    ctx.moveTo(rect.x, oy);
    ctx.lineTo(rect.x + rect.width, oy);
  }
  if (ox >= rect.x && ox <= rect.x + rect.width) {
    ctx.moveTo(ox, rect.y);
    ctx.lineTo(ox, rect.y + rect.height);
  }
  ctx.stroke();
  ctx.restore();
}

/** Tick labels at multiples of π/2 (or π) along an axis, plus any plain numbers asked for. */
function ticks(ctx: CanvasRenderingContext2D, plane: Plane, theme: LabTheme, axis: "x" | "y", everyHalves: number, plain: number[] = []) {
  const [lo, hi] = axis === "x" ? plane.xDomain : plane.yDomain;
  const [ox, oy] = plane.toPx(0, 0);
  const style = { color: theme.muted, font: theme.font };
  const put = (value: number, text: string) => {
    if (axis === "x") {
      const [px] = plane.toPx(value, 0);
      line(ctx, px, oy - 3, px, oy + 3, theme.axis, 1);
      label(ctx, text, px, oy + 11, { ...style, align: "center" });
    } else {
      const [, py] = plane.toPx(0, value);
      line(ctx, ox - 3, py, ox + 3, py, theme.axis, 1);
      label(ctx, text, ox - 6, py, { ...style, align: "right" });
    }
  };
  for (let h = Math.ceil(lo / (PI / 2)); h * (PI / 2) <= hi; h++) {
    if (h !== 0 && h % everyHalves === 0) put((h * PI) / 2, piText(h));
  }
  for (const v of plain) if (v > lo && v < hi) put(v, fixed(v, 0));
}

function band(ctx: CanvasRenderingContext2D, plane: Plane, x0: number, x1: number, colour: string) {
  const [a] = plane.toPx(x0, 0);
  const [b] = plane.toPx(x1, 0);
  const { rect } = plane;
  const left = Math.max(rect.x, Math.min(a, b));
  const right = Math.min(rect.x + rect.width, Math.max(a, b));
  if (right <= left) return;
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.1;
  ctx.fillRect(left, rect.y, right - left, rect.height);
  ctx.restore();
}

/** Keep a point label inside the canvas. */
const inside = (x: number, width: number, chars: number) => Math.min(width - 4 - chars * 3.2, Math.max(4 + chars * 3.2, x));

export const trigPlusRenderer: SimulationRenderer<TrigPlusLayout> = {
  id: "trigplus",
  layout: (width) => computeTrigPlusLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, circle, plot, square, line1, line2 } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (text: string, y = line2) => label(ctx, text, width / 2, y, { color: theme.text, font: theme.font, align: "center" });
    const f = TRIGPLUS_FUNCTIONS[Math.round(num(results.func))] ?? "sin";
    const name = FUNCTION_NAME[f];

    // ── Compound and double angles on the unit circle ──
    if (has("circle") || has("double")) {
      const double = !has("circle");
      const { cx, cy, r } = circle;
      const at = (t: number, s = 1): [number, number] => [cx + r * s * Math.cos(t), cy - r * s * Math.sin(t)];
      const A = num(results.A);
      const B = double ? A : num(results.B);
      const total = A + B;
      title(double ? `A = ${degrees(num(results.aDeg))}, 2A = ${degrees(2 * num(results.aDeg))}` : `A = ${degrees(num(results.aDeg))}, B = ${degrees(num(results.bDeg))}, A + B = ${degrees(num(results.sumDeg))}`);

      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, PI * 2);
      ctx.stroke();
      ctx.restore();
      line(ctx, cx - r - 12, cy, cx + r + 12, cy, theme.axis, 1);
      line(ctx, cx, cy - r - 8, cx, cy + r + 8, theme.axis, 1);

      // The two turns: A from the x-axis, then B from A.
      arc(ctx, cx, cy, r * 0.22, 0, A, theme.angle, 2.5);
      arc(ctx, cx, cy, r * 0.3, A, total, theme.secant, 2.5);
      const [lax, lay] = at(A / 2, 0.36);
      label(ctx, "A", lax, lay, { color: theme.angle, font: theme.fontStrong, align: "center" });
      const [lbx, lby] = at(A + B / 2, 0.44);
      label(ctx, double ? "A" : "B", lbx, lby, { color: theme.secant, font: theme.fontStrong, align: "center" });

      const [ax, ay] = at(A);
      line(ctx, cx, cy, ax, ay, theme.angle, 2);

      // cos B along the direction A, then sin B at right angles: the point at A + B.
      const cosB = Math.cos(B);
      const sinB = Math.sin(B);
      const qx = cx + r * cosB * Math.cos(A);
      const qy = cy - r * cosB * Math.sin(A);
      const [px, py] = at(total);
      line(ctx, cx, cy, qx, qy, theme.cosine, 3);
      line(ctx, qx, qy, px, py, theme.sine, 3);
      line(ctx, cx, cy, px, py, theme.text, 1.5, [4, 4]);

      // Their shadows on the x-axis: cos A cos B, then − sin A sin B, ending at cos(A + B).
      line(ctx, qx, qy, qx, cy, theme.cosine, 1, [3, 4]);
      line(ctx, px, py, px, cy, theme.text, 1, [3, 4]);
      line(ctx, cx, cy + 6, qx, cy + 6, theme.cosine, 4);
      line(ctx, qx, cy + 12, px, cy + 12, theme.sine, 4);
      if (!double) {
        label(ctx, "cos A cos B", inside(cx + (qx - cx) / 2, width, 11), cy + 24, { color: theme.cosine, font: theme.font, align: "center" });
        label(ctx, "− sin A sin B", inside(qx + (px - qx) / 2, width, 13), cy + 38, { color: theme.sine, font: theme.font, align: "center" });
      }
      disc(ctx, qx, qy, 3.5, theme.cosine);
      disc(ctx, px, py, 5.5, theme.point);
      const [tx, ty] = at(total, 1.12);
      label(ctx, double ? "2A" : "A + B", inside(tx, width, 5), ty, { color: theme.text, font: theme.fontStrong, align: "center" });

      if (has("proof") && !double) {
        // NCERT: P₁ at A, P₂ at A + B, P₃ at −B, P₄ at 0. The chords P₁P₃ and P₂P₄ are equal.
        const p1 = at(A);
        const p2 = at(total);
        const p3 = at(-B);
        const p4 = at(0);
        line(ctx, p1[0], p1[1], p3[0], p3[1], theme.tangent, 2);
        line(ctx, p2[0], p2[1], p4[0], p4[1], theme.tangent, 2, [6, 4]);
        const names: [[number, number], number, string][] = [[p1, A, "P₁"], [p2, total, "P₂"], [p3, -B, "P₃"], [p4, 0, "P₄"]];
        for (const [p, t, text] of names) {
          disc(ctx, p[0], p[1], 3.5, theme.tangent);
          const [nx, ny] = at(t, 1.2);
          label(ctx, text, inside(nx, width, 2), ny, { color: theme.tangent, font: theme.font, align: "center" });
        }
        if (words) caption(`P₁P₃ = P₂P₄ = ${fixed(num(results.chordP1P3), 3)}`, line1);
      }

      if (words) {
        if (double) {
          caption(`sin 2A = 2 sin A cos A = ${fixed(num(results.sin2AFormula), 3)}`, line1);
          caption(`cos 2A = 1 − 2 sin²A = ${fixed(num(results.cos2AForm3), 3)}`);
        } else {
          caption(`cos(A + B) = ${fixed(num(results.cosACosB), 3)} − ${fixed(num(results.sinASinB), 3)} = ${fixed(num(results.cosSumFormula), 3)}`.replace("− −", "+ "));
        }
      }
    }

    // ── f(x) = k and its general solution ──
    if (has("equation")) {
      const plane = createPlane(plot, TRIGPLUS_WINDOW, [-2.4, 2.4]);
      const k = num(results.k);
      title(`${name} x = k, for −5π/2 ≤ x < 5π/2`);
      band(ctx, plane, 0, 2 * PI, theme.angle);
      label(ctx, "0 ≤ x < 2π", plane.toPx(PI, 0)[0], plot.y + 8, { color: theme.angle, font: theme.font, align: "center" });
      axes(ctx, plane, theme);
      ticks(ctx, plane, theme, "x", 2);
      ticks(ctx, plane, theme, "y", 99, [-2, -1, 1, 2]);
      if (f === "tan") {
        for (let h = -5; h <= 5; h += 2) {
          const [ax] = plane.toPx((h * PI) / 2, 0);
          line(ctx, ax, plot.y, ax, plot.y + plot.height, theme.muted, 1, [3, 5]);
        }
      }
      stroke(ctx, plane, (x) => [x, trigPlusForward(f, x)], TRIGPLUS_WINDOW[0], TRIGPLUS_WINDOW[1], theme.curve, 2.5, undefined, 800);
      const [, ky] = plane.toPx(0, k);
      line(ctx, plot.x, ky, plot.x + plot.width, ky, theme.angle, 2);
      label(ctx, `k = ${fixed(k)}`, plot.x + plot.width - 2, ky - 9, { color: theme.angle, font: theme.font, align: "right" });

      const solvable = num(results.solvable) === 1;
      for (const x of trigPlusSolutionsIn(f, k, TRIGPLUS_WINDOW[0], TRIGPLUS_WINDOW[1])) {
        const [sx, sy] = plane.toPx(x, k);
        disc(ctx, sx, sy, 3.5, theme.point);
      }
      const n = Math.round(num(results.n));
      if (solvable) {
        const marked = f === "cos" ? [num(results.solutionN), num(results.solutionNOther)] : [num(results.solutionN)];
        let shown = false;
        for (const x of marked) {
          if (x < TRIGPLUS_WINDOW[0] || x > TRIGPLUS_WINDOW[1]) continue;
          const [sx, sy] = plane.toPx(x, k);
          disc(ctx, sx, sy, 6.5, theme.tangent);
          if (!shown) label(ctx, `n = ${fixed(n, 0)}`, inside(sx, width, 6), sy + (k > 0 ? 16 : -16), { color: theme.tangent, font: theme.fontStrong, align: "center" });
          shown = true;
        }
        if (!shown) label(ctx, `n = ${fixed(n, 0)} is off the graph`, width / 2, plot.y + plot.height - 8, { color: theme.tangent, font: theme.font, align: "center" });
      }

      if (words) {
        if (!solvable) {
          caption(`${name} x = ${fixed(k)} has no solution: ${name} x lies in [−1, 1]`);
        } else {
          const count = num(results.principalCount);
          caption(`α = ${inverseName(f)}(${fixed(k)}) = ${degrees(num(results.alphaDeg))}; ${count} solution${count === 1 ? "" : "s"} in [0, 2π)`, line1);
          const general = f === "sin" ? "nπ + (−1)ⁿα" : f === "cos" ? "2nπ ± α" : "nπ + α";
          const at = f === "cos" ? `${degrees(num(results.solutionNDeg))}, ${degrees(num(results.solutionNOtherDeg))}` : degrees(num(results.solutionNDeg));
          caption(`x = ${general}; n = ${fixed(n, 0)} gives ${at}`);
        }
      }
    }

    // ── The restricted function and its inverse, mirrored in y = x ──
    if (has("inverse")) {
      const span: Record<TrigPlusFunction, readonly [number, number]> = { sin: [-2.1, 2.1], cos: [-1.7, 3.5], tan: [-3.3, 3.3] };
      const plane = createPlane(square, span[f], span[f]);
      const [lo, hi] = TRIGPLUS_RANGE[f];
      const open = f === "tan" ? 0.02 : 0;
      const [opening, closing] = f === "tan" ? ["(", ")"] : ["[", "]"];
      title(`y = ${name} x on ${opening}${piText(Math.round(lo / (PI / 2)))}, ${piText(Math.round(hi / (PI / 2)))}${closing} and y = ${inverseName(f)}x`);
      axes(ctx, plane, theme);
      ticks(ctx, plane, theme, "x", 1, [-1, 1]);
      ticks(ctx, plane, theme, "y", 1);
      stroke(ctx, plane, (t) => [t, t], span[f][0], span[f][1], theme.muted, 1.25, [5, 5], 2);
      const [yx, yy] = plane.toPx(span[f][1] * 0.82, span[f][1] * 0.92);
      label(ctx, "y = x", yx, yy, { color: theme.muted, font: theme.font, align: "right" });
      // The whole of f, faint: not one-one until it is cut down.
      ctx.save();
      ctx.globalAlpha = 0.35;
      stroke(ctx, plane, (x) => [x, trigPlusForward(f, x)], span[f][0], span[f][1], theme.curve, 1.5);
      ctx.restore();
      stroke(ctx, plane, (t) => [t, trigPlusForward(f, t)], lo + open, hi - open, theme.curve, 3);
      stroke(ctx, plane, (t) => [trigPlusForward(f, t), t], lo + open, hi - open, theme.tangent, 3);
      const tagF = f === "tan" ? plane.toPx(1.1, Math.tan(1.1)) : plane.toPx(hi, trigPlusForward(f, hi));
      label(ctx, `${name} x`, tagF[0] + 6, tagF[1], { color: theme.curve, font: theme.fontStrong });
      const tagI = f === "tan" ? plane.toPx(span[f][1] * 0.8, Math.atan(span[f][1] * 0.8)) : plane.toPx(trigPlusForward(f, hi), hi);
      label(ctx, `${inverseName(f)}x`, Math.min(tagI[0] + 6, width - 50), tagI[1] - 12, { color: theme.tangent, font: theme.fontStrong });

      const u = num(results.u);
      if (num(results.inDomain) === 1) {
        const y = num(results.inverse);
        const [qx, qy] = plane.toPx(u, y);
        const [mx, my] = plane.toPx(y, u);
        const [, oy] = plane.toPx(0, 0);
        const [ox] = plane.toPx(0, 0);
        line(ctx, qx, qy, mx, my, theme.neutral, 1.25, [3, 4]);
        line(ctx, qx, oy, qx, qy, theme.tangent, 1, [3, 4]);
        line(ctx, ox, qy, qx, qy, theme.tangent, 1, [3, 4]);
        disc(ctx, mx, my, 4.5, theme.curve);
        disc(ctx, qx, qy, 5.5, theme.tangent);
        if (words) {
          caption(`${inverseName(f)}(${fixed(u)}) = ${degrees(num(results.inverseDeg))} = ${fixed(y)} rad`, line1);
          caption(`principal values: ${f === "cos" ? "0° to 180°" : f === "sin" ? "−90° to 90°" : "between −90° and 90°"}`);
        }
      } else {
        const [qx] = plane.toPx(u, 0);
        if (qx >= square.x && qx <= square.x + square.width) line(ctx, qx, square.y, qx, square.y + square.height, theme.secant, 1.5, [4, 4]);
        if (words) caption(`${inverseName(f)}(${fixed(u)}) is not defined: x must be in [−1, 1]`);
      }
    }

    // ── f⁻¹(f(θ)): the zigzag ──
    if (has("fold")) {
      const ys: Record<TrigPlusFunction, readonly [number, number]> = { sin: [-2.2, 2.2], cos: [-0.8, 3.8], tan: [-2.2, 2.2] };
      const plane = createPlane(plot, [-2 * PI, 2 * PI], ys[f]);
      const [lo, hi] = TRIGPLUS_RANGE[f];
      title(`y = ${inverseName(f)}(${name} θ)`);
      band(ctx, plane, lo, hi, theme.angle);
      axes(ctx, plane, theme);
      ticks(ctx, plane, theme, "x", 2);
      ticks(ctx, plane, theme, "y", 1);
      stroke(ctx, plane, (t) => [t, t], -2 * PI, 2 * PI, theme.muted, 1.25, [5, 5], 2);
      stroke(ctx, plane, (t) => {
        const r = trigPlusFold(f, t);
        return r.defined ? [t, r.value] : null;
      }, -2 * PI, 2 * PI, theme.tangent, 3, undefined, 960);
      const theta = num(results.theta);
      const fold = num(results.fold);
      const [px, py] = plane.toPx(theta, fold);
      const [, oy] = plane.toPx(0, 0);
      line(ctx, px, oy, px, py, theme.tangent, 1, [3, 4]);
      disc(ctx, px, py, 5.5, num(results.foldDefined) === 1 ? theme.tangent : theme.secant);
      label(ctx, "θ", px, oy + 24, { color: theme.angle, font: theme.fontStrong, align: "center" });
      if (words) {
        const thetaDeg = degrees(num(results.thetaDeg));
        if (num(results.foldDefined) !== 1) caption(`tan ${thetaDeg} is not defined`);
        else {
          caption(`${inverseName(f)}(${name} ${thetaDeg}) = ${degrees(num(results.foldDeg))}`, line1);
          const range = f === "cos" ? "0° to 180°" : "−90° to 90°";
          caption(num(results.foldSame) === 1 ? `θ is in ${range}, so θ comes back` : `θ is outside ${range}: another angle comes back`);
        }
      }
    }

    // ── sin⁻¹x + cos⁻¹x = π/2 ──
    if (has("complement")) {
      const plane = createPlane(plot, [-1.3, 1.3], [-1.9, 3.5]);
      title("y = sin⁻¹x and y = cos⁻¹x");
      axes(ctx, plane, theme);
      ticks(ctx, plane, theme, "x", 99, [-1, 1]);
      ticks(ctx, plane, theme, "y", 1);
      const [, half] = plane.toPx(0, PI / 2);
      line(ctx, plot.x, half, plot.x + plot.width, half, theme.angle, 1.5, [6, 4]);
      stroke(ctx, plane, (x) => [x, Math.asin(x)], -1, 1, theme.sine, 2.5);
      stroke(ctx, plane, (x) => [x, Math.acos(x)], -1, 1, theme.cosine, 2.5);
      const [sx, sy] = plane.toPx(-1, -PI / 2);
      label(ctx, "sin⁻¹x", sx + 6, sy + 2, { color: theme.sine, font: theme.fontStrong });
      const [cx, cy] = plane.toPx(-1, PI);
      label(ctx, "cos⁻¹x", cx + 8, cy, { color: theme.cosine, font: theme.fontStrong });
      const u = num(results.u);
      if (num(results.uInRange) === 1) {
        const asin = num(results.asinU);
        const [bx, zero] = plane.toPx(u, 0);
        const [, top1] = plane.toPx(u, asin);
        // sin⁻¹u from 0, then cos⁻¹u stacked on top of it: always up to π/2.
        line(ctx, bx, zero, bx, top1, theme.sine, 6);
        line(ctx, bx + 0.01, top1, bx + 0.01, half, theme.cosine, 6);
        disc(ctx, bx, top1, 4, theme.sine);
        disc(ctx, bx, plane.toPx(u, num(results.acosU))[1], 4, theme.cosine);
        if (words) {
          caption(`sin⁻¹x + cos⁻¹x = ${degrees(num(results.asinU) * (180 / PI))} + ${degrees(num(results.acosU) * (180 / PI))} = ${degrees(num(results.complementSumDeg))}`, line1);
          caption(`at x = ${fixed(u)}`);
        }
      } else if (words) caption(`x = ${fixed(u)}: both need −1 ≤ x ≤ 1`);
    }

    // ── tan⁻¹u + tan⁻¹v against the formula ──
    if (has("tansum")) {
      const { cx, cy, r } = circle;
      const at = (t: number, s = 1): [number, number] => [cx + r * s * Math.cos(t), cy - r * s * Math.sin(t)];
      const a = num(results.atanU);
      const b = num(results.atanV);
      const sum = num(results.atanSum);
      title("tan⁻¹u + tan⁻¹v on the unit circle");
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, PI * 2);
      ctx.stroke();
      ctx.restore();
      line(ctx, cx - r - 12, cy, cx + r + 12, cy, theme.axis, 1);
      line(ctx, cx, cy - r - 8, cx, cy + r + 8, theme.axis, 1);
      arc(ctx, cx, cy, r * 0.28, 0, a, theme.sine, 3);
      arc(ctx, cx, cy, r * 0.4, a, sum, theme.cosine, 3);
      const [ux, uy] = at(a);
      line(ctx, cx, cy, ux, uy, theme.sine, 2);
      const [lux, luy] = at(a / 2, 0.5);
      label(ctx, "tan⁻¹u", lux, luy, { color: theme.sine, font: theme.font, align: "center" });
      const [lvx, lvy] = at(a + b / 2, 0.62);
      label(ctx, "tan⁻¹v", inside(lvx, width, 6), lvy, { color: theme.cosine, font: theme.font, align: "center" });
      const [sx, sy] = at(sum);
      arrow(ctx, cx, cy, sx, sy, { color: theme.text, width: 2.5, head: 9 });
      if (num(results.tanFormulaDefined) === 1) {
        const [fx, fy] = at(num(results.tanFormula), 0.92);
        arrow(ctx, cx, cy, fx, fy, { color: theme.angle, width: 2, head: 8, dash: [5, 4] });
        const [tfx, tfy] = at(num(results.tanFormula), 1.14);
        label(ctx, "formula", inside(tfx, width, 7), tfy, { color: theme.angle, font: theme.font, align: "center" });
      }
      const [tsx, tsy] = at(sum, 1.14);
      label(ctx, "sum", inside(tsx, width, 3), tsy + (num(results.correction) === 0 ? -12 : 0), { color: theme.text, font: theme.fontStrong, align: "center" });
      if (words) {
        const u = num(results.u);
        const v = num(results.v);
        caption(`tan⁻¹${fixed(u)} + tan⁻¹${fixed(v)} = ${degrees(num(results.atanSumDeg))}`, line1);
        const uv = num(results.uv);
        const correction = num(results.correction);
        if (num(results.tanFormulaDefined) !== 1) caption("uv = 1: (u + v)/(1 − uv) is undefined");
        else if (correction === 0) caption(`uv = ${fixed(uv)} < 1: the formula gives it directly`);
        else caption(`uv = ${fixed(uv)} > 1: formula ${degrees(num(results.tanFormulaDeg))}, ${correction > 0 ? "add" : "take away"} 180°`);
      }
    }

    // ── Small angles: f(θ) against θ (or 1 − θ²/2) ──
    if (has("small")) {
      const top = PI / 3;
      const ys: Record<TrigPlusFunction, readonly [number, number]> = { sin: [-0.12, 1.25], tan: [-0.12, 1.85], cos: [0.38, 1.06] };
      const plane = createPlane(plot, [-0.08, top + 0.08], ys[f]);
      const approxName = f === "cos" ? "1 − θ²/2" : "θ";
      const theta = num(results.smallRad);
      title(`${name} θ and ${approxName}, θ = ${degrees(num(results.smallDeg))}`);
      const [ox, oy] = plane.toPx(0, Math.max(0, ys[f][0]));
      line(ctx, plot.x, oy, plot.x + plot.width, oy, theme.axis, 1.25);
      line(ctx, ox, plot.y, ox, plot.y + plot.height, theme.axis, 1.25);
      for (const d of [15, 30, 45, 60]) {
        const [px] = plane.toPx((d * PI) / 180, 0);
        line(ctx, px, oy - 3, px, oy + 3, theme.axis, 1);
        label(ctx, `${d}°`, px, oy + 12, { color: theme.muted, font: theme.font, align: "center" });
      }
      for (const v of f === "cos" ? [0.5, 0.75, 1] : [0.5, 1, 1.5]) {
        if (v > ys[f][1]) continue;
        const [, py] = plane.toPx(0, v);
        line(ctx, ox - 3, py, ox + 3, py, theme.axis, 1);
        label(ctx, fixed(v, v === 0.75 ? 2 : 1), ox - 6, py, { color: theme.muted, font: theme.font, align: "right" });
      }
      const colour = f === "sin" ? theme.sine : f === "cos" ? theme.cosine : theme.tangent;
      stroke(ctx, plane, (t) => [t, trigPlusSmallAngle(f, t).approx], 0, top, theme.angle, 2, [6, 4], 120);
      stroke(ctx, plane, (t) => [t, trigPlusForward(f, t)], 0, top, colour, 3, undefined, 240);
      const [ex, ey] = plane.toPx(top, trigPlusForward(f, top));
      label(ctx, `${name} θ`, ex - 4, ey + (f === "sin" ? 14 : f === "tan" ? 10 : -12), { color: colour, font: theme.fontStrong, align: "right" });
      const [ax, ay] = plane.toPx(top, trigPlusSmallAngle(f, top).approx);
      label(ctx, approxName, ax - 4, ay + (f === "sin" ? -12 : f === "tan" ? 14 : 14), { color: theme.angle, font: theme.fontStrong, align: "right" });

      // θ marked, with both values on its vertical.
      const [mx, my1] = plane.toPx(theta, num(results.smallTrue));
      const [, my2] = plane.toPx(theta, num(results.smallApprox));
      line(ctx, mx, oy, mx, Math.min(my1, my2), theme.muted, 1, [3, 4]);
      disc(ctx, mx, my2, 4, theme.angle);
      disc(ctx, mx, my1, 5, colour);
      label(ctx, "θ", mx, oy + 26, { color: theme.angle, font: theme.fontStrong, align: "center" });

      if (words) {
        const err = num(results.smallErrorPct);
        const errText = err < 0.01 ? fixed(err, 4) : err < 1 ? fixed(err, 3) : fixed(err, 2);
        caption(`θ = ${fixed(theta, 4)} rad, ${name} θ = ${fixed(num(results.smallTrue), 4)}`, line1);
        caption(`${approxName} = ${fixed(num(results.smallApprox), 4)}: off by ${errText}%`);
      } else caption("θ along the axis in radians, marked in degrees");
    }
  },
};
