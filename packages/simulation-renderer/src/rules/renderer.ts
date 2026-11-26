/**
 * The rules of differentiation, drawn.
 *
 * Product: a rectangle u by v, and what it gains when x is nudged — a strip
 * along the side (v·Δu), a strip along the top (u·Δv) and the small corner
 * where they meet (Δu·Δv).
 *
 * Chain: three number lines, x above u above y. The little interval from x
 * to x + Δx is carried down to the u line and on to the y line, stretched
 * (or squeezed, or flipped) at each step.
 *
 * Implicit: the circle or ellipse, the point on it, its tangent, and the
 * two arrows dx/dt and dy/dt whose ratio is the tangent's slope.
 */

import {
  CHAIN_COMPOSITION_ORDER,
  CHAIN_COMPOSITIONS,
  IMPLICIT_SHAPE_ORDER,
  IMPLICIT_SHAPES,
  NUDGE,
  PRODUCT_PAIR_ORDER,
  PRODUCT_PAIRS,
  PRODUCT_X,
} from "@ise/mathematics-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import { createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface RulesLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where the rectangle is drawn: its bottom-left corner and the room it has. */
  origin: { x: number; y: number };
  room: { width: number; height: number };
  /** The three number lines' ends and heights. */
  lines: { x1: number; x2: number; ys: readonly [number, number, number] };
}

export function computeRulesLayout(width: number): RulesLayout {
  const compact = width < 560;
  const height = compact ? 340 : 370;
  return {
    width,
    height,
    compact,
    origin: { x: 44, y: height - 78 },
    room: { width: width - 44 - 60, height: height - 78 - 44 },
    lines: { x1: 40, x2: width - 24, ys: [64, 152, 240] },
  };
}

/**
 * Pixels per unit along u and along v, so a pair's largest rectangle (x and
 * the nudge both at their most) just fills the room. The two scales differ,
 * which stretches the picture but leaves every area in proportion.
 */
export function rectangleScale(layout: RulesLayout, pairId: keyof typeof PRODUCT_PAIRS): { u: number; v: number } {
  const pair = PRODUCT_PAIRS[pairId];
  const far = PRODUCT_X[1] + NUDGE[1];
  return { u: layout.room.width / pair.u(far), v: layout.room.height / pair.v(far) };
}

/** Where a value sits on a number line. */
export function lineX(layout: RulesLayout, value: number, domain: readonly [number, number]): number {
  const f = clamp((value - domain[0]) / (domain[1] - domain[0]), 0, 1);
  return layout.lines.x1 + f * (layout.lines.x2 - layout.lines.x1);
}

const fixed = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, alpha: number) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, w, h);
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

function numberLine(ctx: CanvasRenderingContext2D, layout: RulesLayout, y: number, domain: readonly [number, number], name: string, theme: LabTheme) {
  const { x1, x2 } = layout.lines;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
  label(ctx, name, x1 - 8, y, { color: theme.text, font: theme.fontStrong, align: "right" });
  const end = (value: number) => fixed(value, Number.isInteger(value) ? 0 : 1);
  label(ctx, end(domain[0]), x1, y + 14, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, end(domain[1]), x2, y + 14, { color: theme.muted, font: theme.font, align: "center" });
}

export const rulesRenderer: SimulationRenderer<RulesLayout> = {
  id: "rules",
  layout: (width) => computeRulesLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, origin } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const title = (words: string) => label(ctx, words, width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
    const dx = num(results.dx, 0.5);

    if (has("rectangle")) {
      const pairId = PRODUCT_PAIR_ORDER[Math.round(num(results.pair))] ?? "x-square";
      const pair = PRODUCT_PAIRS[pairId];
      const scale = rectangleScale(layout, pairId);
      const u = num(results.u) * scale.u;
      const v = num(results.v) * scale.v;
      const x = num(results.x, 1.5);
      const du = (pair.u(x + dx) - pair.u(x)) * scale.u;
      const dv = (pair.v(x + dx) - pair.v(x)) * scale.v;
      title(`u · v = ${pair.label}`);
      box(ctx, origin.x, origin.y - v, u, v, theme.sine, 0.3);
      box(ctx, origin.x + u, origin.y - v, du, v, theme.cosine, 0.55);
      box(ctx, origin.x, origin.y - v - dv, u, dv, theme.angle, 0.55);
      box(ctx, origin.x + u, origin.y - v - dv, du, dv, theme.neutral, 0.8);
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(origin.x, origin.y - v, u, v);
      ctx.restore();
      label(ctx, `u = ${pair.uLabel}`, origin.x + u / 2, origin.y + 14, { color: theme.text, font: theme.font, align: "center" });
      label(ctx, "v", origin.x - 10, origin.y - v / 2, { color: theme.text, font: theme.fontStrong, align: "right" });
      if (du > 26) label(ctx, "v·Δu", origin.x + u + du / 2, origin.y - v / 2, { color: theme.text, font: theme.font, align: "center" });
      else label(ctx, "v·Δu", origin.x + u + du + 5, origin.y - v / 2, { color: theme.cosine, font: theme.font });
      if (dv > 14) label(ctx, "u·Δv", origin.x + u / 2, origin.y - v - dv / 2, { color: theme.text, font: theme.font, align: "center" });
      else label(ctx, "u·Δv", origin.x + u / 2, origin.y - v - dv - 9, { color: theme.angle, font: theme.font, align: "center" });
      if (has("labels")) {
        label(ctx, `v = ${pair.vLabel}`, origin.x + 6, origin.y - v + 12, { color: theme.text, font: theme.font });
        caption(`Δ(uv)/Δx = ${fixed(num(results.average))} → u′v + uv′ = ${fixed(num(results.productRule))} · corner ${(num(results.cornerShare) * 100).toFixed(1)}%`);
      }
    }

    if (has("chain")) {
      const chain = CHAIN_COMPOSITIONS[CHAIN_COMPOSITION_ORDER[Math.round(num(results.composition))] ?? "square-linear"];
      const cx = num(results.cx);
      const inner = num(results.inner);
      const outer = num(results.outer);
      const [yx, yu, yy] = layout.lines.ys;
      title(`y = ${chain.label}: ${chain.innerLabel}, ${chain.outerLabel}`);
      numberLine(ctx, layout, yx, chain.x, "x", theme);
      numberLine(ctx, layout, yu, chain.u, "u", theme);
      numberLine(ctx, layout, yy, chain.y, "y", theme);
      const ends: [number, number][] = [
        [lineX(layout, cx, chain.x), lineX(layout, cx + dx, chain.x)],
        [lineX(layout, inner, chain.u), lineX(layout, inner + num(results.innerChange), chain.u)],
        [lineX(layout, outer, chain.y), lineX(layout, outer + num(results.outerChange), chain.y)],
      ];
      const ys = [yx, yu, yy];
      // The funnels that carry one interval to the next.
      for (let i = 0; i < 2; i++) {
        ctx.save();
        ctx.fillStyle = i === 0 ? theme.sine : theme.cosine;
        ctx.globalAlpha = 0.18;
        ctx.beginPath();
        ctx.moveTo(ends[i]![0], ys[i]!);
        ctx.lineTo(ends[i]![1], ys[i]!);
        ctx.lineTo(ends[i + 1]![1], ys[i + 1]!);
        ctx.lineTo(ends[i + 1]![0], ys[i + 1]!);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      const colours = [theme.angle, theme.sine, theme.cosine];
      ends.forEach(([a, b], i) => {
        ctx.save();
        ctx.strokeStyle = colours[i]!;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a, ys[i]!);
        ctx.lineTo(b, ys[i]!);
        ctx.stroke();
        ctx.restore();
        disc(ctx, a, ys[i]!, 4.5, colours[i]!);
      });
      if (has("labels")) {
        label(ctx, `× ${fixed(num(results.innerRate))}`, width / 2, (yx + yu) / 2 + 6, { color: theme.sine, font: theme.fontStrong, align: "center", background: theme.background });
        label(ctx, `× ${fixed(num(results.outerRate))}`, width / 2, (yu + yy) / 2 + 6, { color: theme.cosine, font: theme.fontStrong, align: "center", background: theme.background });
        caption(`dy/dx = ${fixed(num(results.innerRate))} × ${fixed(num(results.outerRate))} = ${fixed(num(results.chainRate))} · measured ${fixed(num(results.actualRatio))}`);
      }
    }

    if (has("curve")) {
      const shape = IMPLICIT_SHAPES[IMPLICIT_SHAPE_ORDER[Math.round(num(results.shape))] ?? "circle"];
      // The same scale on both axes, so a circle is a circle.
      const size = Math.min(width - 40, height - 80);
      const rect = { x: (width - size) / 2, y: 30, width: size, height: size };
      const plane = createPlane(rect, [-7, 7], [-7, 7]);
      title(shape.label);
      drawPlane(ctx, plane, theme, { showLabels: false });
      ctx.save();
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const [ox, oy] = plane.toPx(0, 0);
      ctx.ellipse(ox, oy, shape.a * plane.sx, shape.b * plane.sy, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      const x = num(results.pointX);
      const y = num(results.pointY);
      const [px, py] = plane.toPx(x, y);
      const dxdt = num(results.dxdt);
      const dydt = num(results.dydt);
      // The tangent: along the velocity, a fixed length on screen.
      const speed = Math.hypot(dxdt, dydt) || 1;
      const reach = 3.2;
      const [t1x, t1y] = plane.toPx(x - (dxdt / speed) * reach, y - (dydt / speed) * reach);
      const [t2x, t2y] = plane.toPx(x + (dxdt / speed) * reach, y + (dydt / speed) * reach);
      ctx.save();
      ctx.strokeStyle = theme.tangent;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(t1x, t1y);
      ctx.lineTo(t2x, t2y);
      ctx.stroke();
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.restore();
      if (has("labels")) {
        const [hx] = plane.toPx(x + dxdt * 0.5, y);
        const [, vy] = plane.toPx(x, y + dydt * 0.5);
        if (Math.abs(hx - px) > 4) arrow(ctx, px, py, hx, py, { color: theme.sine, width: 2, head: 7 });
        if (Math.abs(vy - py) > 4) arrow(ctx, px, py, px, vy, { color: theme.cosine, width: 2, head: 7 });
        // Short enough for a phone.
        if (num(results.vertical) === 1) caption(`(${fixed(x, 1)}, ${fixed(y, 1)}): the tangent is vertical — dx/dt = 0`);
        else caption(`(${fixed(x, 1)}, ${fixed(y, 1)}): dy/dt ÷ dx/dt = ${fixed(dydt)} ÷ ${fixed(dxdt)} = ${fixed(num(results.tangentSlope))}`);
      }
      disc(ctx, px, py, 5, theme.angle);
    }
  },
};
