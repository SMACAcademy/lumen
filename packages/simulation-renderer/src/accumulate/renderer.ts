/**
 * The fundamental theorem: two graphs, one above the other — the slope
 * graph's mirror image.
 *
 * Above, f with a sweep line at x and the area from the starting point a to
 * the line shaded (one colour above the axis, another below). Below, on the
 * same x-axis, the area collected so far, A(x) = ∫ₐˣ f, drawn only from a to
 * the line, with its tangent at x: the tangent's slope is f(x).
 *
 * The family view adds faint copies of A shifted up and down — the other
 * antiderivatives F(x) + C. The motion view adds a track along which an
 * object sits at the displacement collected so far.
 *
 * The A graph, its tangent and every number are drawn only with the words
 * layer, so an estimate can ask for them.
 */

import { ACCUMULATE_INTEGRANDS, ACCUMULATE_ORDER, ACCUMULATE_STRIPS } from "@ise/mathematics-engine";
import { arrow, label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface AccumulateLayout {
  width: number;
  height: number;
  compact: boolean;
  /** f's plot, the area graph beneath it, and the track (null when not shown). */
  top: Box;
  bottom: Box;
  track: Box | null;
}

export function computeAccumulateLayout(width: number, layers: ReadonlySet<string> = new Set()): AccumulateLayout {
  const compact = width < 560;
  const left = compact ? 34 : 46;
  const plot = compact ? 118 : 132;
  const top = { x: left, y: 26, width: width - left - 12, height: plot };
  const bottom = { x: left, y: top.y + plot + 30, width: top.width, height: plot };
  const track = layers.has("track") ? { x: left, y: bottom.y + plot + 26, width: top.width, height: 30 } : null;
  return { width, height: (track ? track.y + track.height : bottom.y + plot) + 40, compact, top, bottom, track };
}

const fixed = (v: number, digits = 2) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

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

/** The region between f and the axis from x0 to x1, as one closed path. */
function region(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, x0: number, x1: number) {
  const steps = Math.max(2, Math.ceil(((x1 - x0) / (plane.xDomain[1] - plane.xDomain[0])) * 300));
  ctx.beginPath();
  const [sx, sy] = plane.toPx(x0, 0);
  ctx.moveTo(sx, sy);
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const [px, py] = plane.toPx(x, f(x));
    ctx.lineTo(px, py);
  }
  const [ex, ey] = plane.toPx(x1, 0);
  ctx.lineTo(ex, ey);
  ctx.closePath();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export const accumulateRenderer: SimulationRenderer<AccumulateLayout> = {
  id: "accumulate",
  layout: (width, _graphs, layers) => computeAccumulateLayout(width, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, top, bottom, track } = layout;
    ctx.clearRect(0, 0, width, height);

    const id = ACCUMULATE_ORDER[Math.round(num(results.function))] ?? "linear";
    const curve = ACCUMULATE_INTEGRANDS[id];
    const motion = id === "velocity";
    const [lo, hi] = curve.view.x;
    const x = num(results.x, lo);
    const a = num(results.a, lo);
    const fx = num(results.fx);
    const area = num(results.area);
    const slope = num(results.areaSlope);
    const C = num(results.constant);
    const A = (t: number) => curve.F(t) + C;
    const upper = createPlane(top, curve.view.x, curve.view.f);
    const lower = createPlane(bottom, curve.view.x, curve.view.area);
    const from = Math.min(a, x);
    const to = Math.max(a, x);
    const aName = motion ? "s" : "A";

    if (has("function")) {
      label(ctx, motion ? "v (m/s) against t (s)" : `f(x) = ${curve.label}`, top.x, 12, { color: theme.text, font: theme.fontStrong });
      drawPlane(ctx, upper, theme);
    }

    if (has("area") && to > from) {
      // Above the axis counts positive, below it negative.
      for (const [above, color] of [[true, theme.sine], [false, theme.cosine]] as const) {
        ctx.save();
        const [, axisY] = upper.toPx(0, 0);
        ctx.beginPath();
        if (above) ctx.rect(top.x, top.y, top.width, Math.max(0, axisY - top.y));
        else ctx.rect(top.x, axisY, top.width, Math.max(0, top.y + top.height - axisY));
        ctx.clip();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = color;
        region(ctx, upper, curve.f, from, to);
        ctx.fill();
        ctx.restore();
      }
    }

    if (has("function")) {
      ctx.save();
      clipToPlane(ctx, upper);
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      stroke(ctx, upper, curve.f, lo, hi);
      ctx.restore();
    }

    // The starting point, and the sweep line through both plots.
    const [ax] = upper.toPx(a, 0);
    const [px, py] = upper.toPx(x, fx);
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([3, 4]);
    segment(ctx, ax, top.y, ax, top.y + top.height);
    ctx.setLineDash([]);
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 2;
    segment(ctx, px, top.y, px, top.y + top.height);
    if (has("accumulated")) segment(ctx, px, bottom.y, px, bottom.y + bottom.height);
    ctx.restore();
    // Named just inside the plot, on whichever side of its line has room.
    const right = ax > top.x + top.width / 2;
    label(ctx, motion ? "start" : "a", ax + (right ? -4 : 4), top.y + 9, { color: theme.muted, font: theme.font, align: right ? "right" : "left" });
    if (upper.contains(px, py, 2)) disc(ctx, px, py, 5, theme.angle);
    if (words) label(ctx, motion ? `v = ${fixed(fx)} m/s` : `f(x) = ${fixed(fx)}`, top.x + top.width, 12, { color: theme.curve, font: theme.font, align: "right" });

    if (has("accumulated")) {
      label(ctx, motion ? "s = area so far (m)" : "A(x) = area from a to x", bottom.x, bottom.y - 12, { color: theme.text, font: theme.fontStrong });
      drawPlane(ctx, lower, theme);

      if (has("family")) {
        // Other members of the family: the same shape, shifted by a constant.
        const span = curve.view.area[1] - curve.view.area[0];
        ctx.save();
        clipToPlane(ctx, lower);
        ctx.strokeStyle = theme.secant;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.3;
        for (let k = -3; k <= 3; k++) {
          if (k === 0) continue;
          const shift = (k * span) / 6;
          stroke(ctx, lower, (t) => A(t) + shift, lo, hi);
        }
        ctx.restore();
        label(ctx, `${curve.antiderivativeLabel} + C`, bottom.x + 6, bottom.y + 10, { color: theme.muted, font: theme.font });
      }

      const [sx, sy] = lower.toPx(a, 0);
      if (lower.contains(sx, sy, 2)) disc(ctx, sx, sy, 3.5, theme.muted);

      if (words) {
        ctx.save();
        clipToPlane(ctx, lower);
        if (has("family")) {
          // The whole of this member, faintly, beyond what has been collected.
          ctx.strokeStyle = theme.secant;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          stroke(ctx, lower, A, lo, hi);
          ctx.setLineDash([]);
        }
        ctx.strokeStyle = theme.secant;
        ctx.lineWidth = 2.5;
        stroke(ctx, lower, A, from, to);
        ctx.restore();

        const [qx, qy] = lower.toPx(x, area);
        if (has("tangent")) {
          // A fixed length on screen, whatever the slope.
          const run = 46 / Math.hypot(lower.sx, slope * lower.sy);
          const [x1, y1] = lower.toPx(x - run, area - slope * run);
          const [x2, y2] = lower.toPx(x + run, area + slope * run);
          ctx.save();
          clipToPlane(ctx, lower);
          ctx.strokeStyle = theme.tangent;
          ctx.lineWidth = 2.5;
          segment(ctx, x1, y1, x2, y2);
          ctx.restore();
          label(ctx, `slope of ${aName} = ${fixed(slope)}`, bottom.x + bottom.width, bottom.y - 12, { color: theme.tangent, font: theme.font, align: "right" });
        }
        if (lower.contains(qx, qy, 2)) disc(ctx, qx, qy, 5, theme.secant);
      }
    }

    if (track) {
      // Displacement along a straight track, on the same scale as the area graph.
      const [s0, s1] = curve.view.area;
      const toX = (s: number) => track.x + ((s - s0) / (s1 - s0)) * track.width;
      const lineY = track.y + track.height - 8;
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      segment(ctx, track.x, lineY, track.x + track.width, lineY);
      ctx.restore();
      const zero = toX(0);
      label(ctx, "start", zero, lineY + 10, { color: theme.muted, font: theme.font, align: "center" });
      ctx.save();
      ctx.strokeStyle = theme.muted;
      segment(ctx, zero, lineY - 6, zero, lineY + 4);
      ctx.restore();
      if (words) {
        const step = (s1 - s0) > 12 ? 5 : 1;
        ctx.save();
        ctx.strokeStyle = theme.muted;
        for (let s = Math.ceil(s0 / step) * step; s <= s1; s += step) {
          if (s === 0) continue;
          segment(ctx, toX(s), lineY - 3, toX(s), lineY + 3);
          label(ctx, `${s}`, toX(s), lineY + 10, { color: theme.muted, font: theme.font, align: "center" });
        }
        ctx.restore();
        // The object, at the displacement collected so far, with its velocity.
        const cx = Math.min(Math.max(toX(area), track.x + 7), track.x + track.width - 7);
        ctx.save();
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.roundRect(cx - 7, lineY - 14, 14, 10, 3);
        ctx.fill();
        ctx.restore();
        if (Math.abs(fx) > 0.05) arrow(ctx, cx, lineY - 20, cx + Math.max(-40, Math.min(40, fx * 8)), lineY - 20, { color: theme.curve, width: 2, head: 7 });
      }
    }

    if (words) {
      const caption = track
        ? motion
          ? `s = ${fixed(area, 1)} m · distance ${fixed(num(results.totalArea), 1)} m · a = ${fixed(num(results.accel), 1)} m/s²`
          : `${aName} = ${fixed(area)} · without sign ${fixed(num(results.totalArea))} · f′ = ${fixed(num(results.accel))}`
        : has("family")
          ? `${aName} = ${curve.antiderivativeLabel} + C, with C = ${fixed(C)}`
          : `${aName}(${fixed(x)}) = ${fixed(area)}  (${ACCUMULATE_STRIPS}-strip sum ${fixed(num(results.sum))})`;
      label(ctx, caption, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
