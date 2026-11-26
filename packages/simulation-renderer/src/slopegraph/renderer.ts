/**
 * The derivative as a function: two graphs, one above the other.
 *
 * Above, the curve with a point and its tangent. Below, on the same x-axis,
 * the tangent's slope — plotted only over the stretch the point has visited,
 * so the derivative's graph is drawn by the learner, not handed over. A
 * dashed line ties the point to its slope.
 *
 * In the bending view the curve is coloured by which way it bends: one
 * colour where the slope is rising (f″ > 0), another where it is falling.
 */

import { SLOPE_CURVE_ORDER, SLOPE_CURVES } from "@ise/mathematics-engine";
import { label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface SlopeGraphLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The curve's plot, and the slope's plot beneath it. */
  top: Box;
  bottom: Box;
}

export function computeSlopeGraphLayout(width: number): SlopeGraphLayout {
  const compact = width < 560;
  const left = compact ? 34 : 46;
  const plot = compact ? 138 : 160;
  const top = { x: left, y: 26, width: width - left - 12, height: plot };
  const bottom = { x: left, y: top.y + plot + 30, width: top.width, height: plot };
  return { width, height: bottom.y + plot + 44, compact, top, bottom };
}

const fixed = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

/** Stroke y = f(x) from x0 to x1 in the plane (the caller sets the style and clip). */
function stroke(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, x0: number, x1: number) {
  if (x1 <= x0) return;
  const steps = Math.max(2, Math.ceil(((x1 - x0) / (plane.xDomain[1] - plane.xDomain[0])) * 300));
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const [px, py] = plane.toPx(x, f(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const slopeGraphRenderer: SimulationRenderer<SlopeGraphLayout> = {
  id: "slopegraph",
  layout: (width) => computeSlopeGraphLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, top, bottom } = layout;
    ctx.clearRect(0, 0, width, height);

    const id = SLOPE_CURVE_ORDER[Math.round(num(results.function))] ?? "square";
    const curve = SLOPE_CURVES[id];
    const n = Math.round(num(results.n, 2));
    const x = num(results.x);
    const slope = num(results.slope);
    const f = (t: number) => curve.f(t, n);
    const df = (t: number) => curve.df(t, n);
    const name = id === "power" ? `x${["", "", "²", "³", "⁴", "⁵"][n] ?? ""}` : curve.label;
    const upper = createPlane(top, curve.view.x, curve.view.y);
    const lower = createPlane(bottom, curve.view.x, curve.view.slope);
    const [px, py] = upper.toPx(x, f(x));

    if (has("curve")) {
      label(ctx, `y = ${name}`, top.x, 12, { color: theme.text, font: theme.fontStrong });
      drawPlane(ctx, upper, theme);
      ctx.save();
      clipToPlane(ctx, upper);
      ctx.lineWidth = 2.5;
      if (has("bend")) {
        // In short pieces, each coloured by the sign of f″ at its middle.
        const [x0, x1] = curve.view.x;
        const pieces = 120;
        for (let i = 0; i < pieces; i++) {
          const a = x0 + ((x1 - x0) * i) / pieces;
          const b = x0 + ((x1 - x0) * (i + 1)) / pieces;
          const bending = curve.d2f((a + b) / 2, n);
          ctx.strokeStyle = Math.abs(bending) < 0.05 ? theme.neutral : bending > 0 ? theme.sine : theme.cosine;
          stroke(ctx, upper, f, a, b);
        }
      } else {
        ctx.strokeStyle = theme.curve;
        stroke(ctx, upper, f, curve.view.x[0], curve.view.x[1]);
      }
      ctx.restore();
    }

    if (has("tangent")) {
      // A fixed length on screen, whatever the slope.
      const run = 46 / Math.hypot(upper.sx, slope * upper.sy);
      const [x1, y1] = upper.toPx(x - run, f(x) - slope * run);
      const [x2, y2] = upper.toPx(x + run, f(x) + slope * run);
      ctx.save();
      clipToPlane(ctx, upper);
      ctx.strokeStyle = theme.tangent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }
    if (has("curve") && upper.contains(px, py, 2)) disc(ctx, px, py, 5, theme.angle);

    if (has("slope")) {
      label(ctx, "slope of the tangent", bottom.x, bottom.y - 12, { color: theme.tangent, font: theme.fontStrong });
      drawPlane(ctx, lower, theme);
      if (has("labels")) {
        const lo = num(results.trailLo, x);
        const hi = num(results.trailHi, x);
        ctx.save();
        clipToPlane(ctx, lower);
        ctx.strokeStyle = theme.tangent;
        ctx.lineWidth = 2.5;
        stroke(ctx, lower, df, lo, hi);
        ctx.restore();
        const [sx, sy] = lower.toPx(x, slope);
        // Tie the point on the curve to its slope below.
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(px, Math.min(Math.max(py, top.y), top.y + top.height));
        ctx.lineTo(sx, Math.min(Math.max(sy, bottom.y), bottom.y + bottom.height));
        ctx.stroke();
        ctx.restore();
        if (lower.contains(sx, sy, 2)) disc(ctx, sx, sy, 5, theme.tangent);
        if (num(results.coverage) >= 0.95) {
          const formula = id === "power" ? (n === 1 ? "1" : `${n}x${["", "", "", "²", "³", "⁴"][n] ?? ""}`) : curve.slopeLabel;
          label(ctx, `the trail is y = ${formula}`, bottom.x + bottom.width, bottom.y - 12, { color: theme.text, font: theme.font, align: "right" });
        }
      }
    }

    if (has("labels")) {
      const words = has("bend")
        ? `f″ = ${fixed(num(results.second))}: ${num(results.concavity) > 0 ? "bending up, the slope is rising" : num(results.concavity) < 0 ? "bending down, the slope is falling" : "not bending here"}`
        : `At x = ${fixed(x)} the slope is ${fixed(slope)}`;
      label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
