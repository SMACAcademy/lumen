/**
 * Methods of integration, in three pictures.
 *
 * Substitution: two graphs with the same scale, one over the x-axis and one
 * over the u-axis. The strips of the first are carried to the second by
 * u = g(x): each one comes out g′ times as wide and g′ times as low, so its
 * area is unchanged. One strip, picked by the probe, is drawn in its own
 * colour on both.
 *
 * By parts: the curve (u, v) in the u–v plane. The region below it is ∫v du,
 * the region to its left ∫u dv; together they fill the rectangle u·v.
 *
 * Partial fractions: the fraction's graph and area on top; below, the two
 * simple pieces, one area above the axis and one below, which add to it.
 */

import {
  integrationProbeStrip,
  integrationStrips,
  PARTIAL_FRACTION_ORDER,
  PARTIAL_FRACTIONS,
  PARTS_PAIR_ORDER,
  PARTS_PAIRS,
  SUBSTITUTION_ORDER,
  SUBSTITUTIONS,
} from "@ise/mathematics-engine";
import { label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface IntegrationLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The two stacked graphs of the substitution and partial-fraction views. */
  top: Box;
  bottom: Box;
  /** The single u–v plane of the parts view. */
  plot: Box;
}

export function computeIntegrationLayout(width: number): IntegrationLayout {
  const compact = width < 560;
  const height = 400;
  const left = compact ? 36 : 48;
  const inner = width - left - 14;
  return {
    width,
    height,
    compact,
    top: { x: left, y: 40, width: inner, height: 118 },
    bottom: { x: left, y: 206, width: inner, height: 118 },
    plot: { x: left, y: 40, width: inner, height: height - 40 - 84 },
  };
}

const fixed = (v: number, digits = 3) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

function stroke(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, from: number, to: number, colour: string, lineWidth = 2.5) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let i = 0; i <= 160; i++) {
    const x = from + ((to - from) * i) / 160;
    const [px, py] = plane.toPx(x, f(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/** The area between y = f(x) and the axis, from `from` to `to`. */
function fillArea(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, from: number, to: number, colour: string) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(...plane.toPx(from, 0));
  for (let i = 0; i <= 120; i++) {
    const x = from + ((to - from) * i) / 120;
    ctx.lineTo(...plane.toPx(x, f(x)));
  }
  ctx.lineTo(...plane.toPx(to, 0));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** One strip from x₁ to x₂ of height h, in plane units. */
function strip(ctx: CanvasRenderingContext2D, plane: Plane, x1: number, x2: number, h: number, colour: string, alpha: number) {
  const [left, top] = plane.toPx(x1, h);
  const [right, bottom] = plane.toPx(x2, 0);
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.fillStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.fillRect(left, top, right - left, bottom - top);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, right - left, bottom - top);
  ctx.restore();
}

function polygon(ctx: CanvasRenderingContext2D, points: readonly [number, number][], colour: string, alpha = 0.35) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
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

function header(ctx: CanvasRenderingContext2D, box: Box, words: string, theme: LabTheme, colour = theme.muted) {
  label(ctx, words, box.x, box.y - 10, { color: colour, font: theme.font });
}

export const integrationRenderer: SimulationRenderer<IntegrationLayout> = {
  id: "integration",
  layout: (width) => computeIntegrationLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, top, bottom, plot } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (words: string, line: 1 | 2) =>
      label(ctx, words, width / 2, line === 1 ? height - 34 : height - 14, { color: theme.text, font: theme.font, align: "center" });

    if (has("substitution")) {
      const sub = SUBSTITUTIONS[SUBSTITUTION_ORDER[Math.round(num(results.substitution))] ?? "exp-square"];
      const b = num(results.upper, 1);
      const n = Math.max(1, Math.round(num(results.strips, 4)));
      const probe = num(results.probe);
      const u0 = sub.g(0);
      const xPlane = createPlane(top, [0, sub.span], [0, sub.height]);
      const uPlane = createPlane(bottom, [u0, u0 + sub.span], [0, sub.height]);
      title(sub.label);
      drawPlane(ctx, xPlane, theme, { xLabel: "x" });
      drawPlane(ctx, uPlane, theme, { xLabel: "u" });
      header(ctx, top, `in x: y = ${sub.integrandLabel}`, theme, theme.sine);
      header(ctx, bottom, `in u, with ${sub.innerLabel}: y = ${sub.outerLabel}`, theme, theme.cosine);

      const { edges, mids } = integrationStrips(b, n);
      const picked = integrationProbeStrip(probe, b, n);
      for (let i = 0; i < n; i++) {
        const m = mids[i]!;
        const h = sub.f(sub.g(m));
        const colour = i === picked ? theme.angle : null;
        strip(ctx, xPlane, edges[i]!, edges[i + 1]!, h * sub.dg(m), colour ?? theme.sine, colour ? 0.65 : 0.3);
        strip(ctx, uPlane, sub.g(edges[i]!), sub.g(edges[i + 1]!), h, colour ?? theme.cosine, colour ? 0.65 : 0.3);
      }
      stroke(ctx, xPlane, (x) => sub.f(sub.g(x)) * sub.dg(x), 0, sub.xMax, theme.curve);
      stroke(ctx, uPlane, sub.f, u0, sub.g(sub.xMax), theme.curve);

      if (has("labels")) {
        const stretch = num(results.stretch);
        caption(`x strips ${fixed(num(results.xSum))} · u strips ${fixed(num(results.uSum))} · exact ${fixed(num(results.exactSub))}`, 1);
        caption(`u from ${fixed(num(results.uLower), 2)} to ${fixed(num(results.uUpper), 2)} · picked strip stretched ×${fixed(stretch, 2)}`, 2);
      }
    }

    if (has("parts")) {
      const pair = PARTS_PAIRS[PARTS_PAIR_ORDER[Math.round(num(results.pair))] ?? "x-exp"];
      const t = num(results.t, pair.b);
      const plane = createPlane(plot, pair.uWindow, pair.vWindow);
      title(`${pair.label}: ${pair.uLabel}, ${pair.dvLabel}`);
      drawPlane(ctx, plane, theme, { xLabel: "u", yLabel: "v" });
      label(ctx, "∫v du below", plot.x, plot.y - 10, { color: theme.sine, font: theme.fontStrong });
      label(ctx, "∫u dv to the left", plot.x + plot.width, plot.y - 10, { color: theme.cosine, font: theme.fontStrong, align: "right" });

      const samples = 120;
      const curve: [number, number][] = [];
      for (let i = 0; i <= samples; i++) {
        const s = pair.a + ((t - pair.a) * i) / samples;
        curve.push(plane.toPx(pair.u(s), pair.v(s)));
      }
      const u0 = pair.u(pair.a);
      const v0 = pair.v(pair.a);
      const u1 = pair.u(t);
      const v1 = pair.v(t);
      if (t > pair.a) {
        ctx.save();
        clipToPlane(ctx, plane);
        polygon(ctx, [plane.toPx(u0, 0), ...curve, plane.toPx(u1, 0)], theme.sine);
        polygon(ctx, [plane.toPx(0, v0), ...curve, plane.toPx(0, v1)], theme.cosine);
        // The corner u(a)·v(a), which [uv] takes away (empty when u(a) = 0).
        if (Math.abs(u0 * v0) > 1e-9) polygon(ctx, [plane.toPx(0, 0), plane.toPx(u0, 0), plane.toPx(u0, v0), plane.toPx(0, v0)], theme.neutral, 0.5);
        ctx.restore();
        const [rx, ry] = plane.toPx(0, v1);
        const [qx, qy] = plane.toPx(u1, 0);
        ctx.save();
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(rx, ry, qx - rx, qy - ry);
        ctx.restore();
      }

      // The whole curve faintly, the part swept so far boldly.
      ctx.save();
      clipToPlane(ctx, plane);
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      for (let i = 0; i <= samples; i++) {
        const s = pair.a + ((pair.b - pair.a) * i) / samples;
        const [px, py] = plane.toPx(pair.u(s), pair.v(s));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      curve.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.stroke();
      ctx.restore();
      const [px, py] = plane.toPx(u1, v1);
      disc(ctx, px, py, 5, theme.angle);

      if (has("labels")) {
        caption(`[uv] ${fixed(num(results.uv))} = ∫u dv ${fixed(num(results.udv))} + ∫v du ${fixed(num(results.vdu))}`, 1);
        caption(`so ∫u dv = [uv] − ∫v du = ${fixed(num(results.udv))}`, 2);
      }
    }

    if (has("fractions")) {
      const frac = PARTIAL_FRACTIONS[PARTIAL_FRACTION_ORDER[Math.round(num(results.fraction))] ?? "one-two"];
      const c = num(results.fracUpper, 1);
      const whole = createPlane(top, [0, 4], frac.y);
      const pieces = createPlane(bottom, [0, 4], frac.y);
      const pieceA = (x: number) => frac.A / (x + frac.p);
      const pieceB = (x: number) => frac.B / (x + frac.q);
      title(`∫ ${frac.label} dx`);
      drawPlane(ctx, whole, theme, { xLabel: "x" });
      drawPlane(ctx, pieces, theme, { xLabel: "x" });
      header(ctx, top, `y = ${frac.label}`, theme, theme.curve);
      header(ctx, bottom, has("labels") ? `split: y = ${frac.splitLabel}` : "split into two simple fractions", theme);

      fillArea(ctx, whole, frac.f, 0, c, theme.curve);
      stroke(ctx, whole, frac.f, 0, 4, theme.curve);
      fillArea(ctx, pieces, pieceA, 0, c, theme.sine);
      fillArea(ctx, pieces, pieceB, 0, c, theme.cosine);
      stroke(ctx, pieces, pieceA, 0, 4, theme.sine);
      stroke(ctx, pieces, pieceB, 0, 4, theme.cosine);

      if (has("labels")) {
        caption(`area ${fixed(num(results.areaWhole))} = ${fixed(num(results.areaA))} + (${fixed(num(results.areaB))})`, 1);
        caption(`A = ${fixed(num(results.coefA), 1)}, B = ${fixed(num(results.coefB), 1)} · from x = 0 to ${fixed(c, 1)}`, 2);
      }
    }
  },
};
