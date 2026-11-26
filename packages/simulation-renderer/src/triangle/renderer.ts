/**
 * A right triangle, with squares on its sides and names for its sides.
 *
 * θ sits at the bottom left, the right angle at the bottom right, and the
 * height stands up from it. With the squares showing, each side carries its
 * square — below the base, beside the height, and tilted out from the
 * hypotenuse — gridded into unit squares when the legs are whole, so the
 * 9 + 16 = 25 can be counted. With the ratios showing, the sides are named
 * from θ: opposite, adjacent, hypotenuse.
 *
 * The figure is scaled to fit, so a bigger triangle is drawn the same size:
 * it is the shape, not the size, that the ratios care about.
 */

import { clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface TriangleLayout {
  width: number;
  height: number;
  compact: boolean;
  pad: number;
}

export function computeTriangleLayout(width: number): TriangleLayout {
  const compact = width < 560;
  return { width, height: compact ? 360 : 420, compact, pad: compact ? 20 : 32 };
}

type Pt = readonly [number, number];

/** Room kept clear for the side names when they are shown, px. */
export function labelRoom(layout: TriangleLayout): { right: number; bottom: number } {
  return { right: layout.compact ? 84 : 100, bottom: 22 };
}

/**
 * Where the figure goes: a scale and an origin (θ's corner) so that the
 * triangle — and its squares, if shown — fit the canvas above the words,
 * leaving `room` on the right and below for labels.
 */
export function triangleFrame(layout: TriangleLayout, a: number, b: number, squares: boolean, room = { right: 0, bottom: 0 }) {
  const xs = squares ? [-b, a + b] : [0, a];
  const ys = squares ? [-a, a + b] : [0, b];
  const spanX = xs[1]! - xs[0]!;
  const spanY = ys[1]! - ys[0]!;
  const bottom = layout.height - 34 - room.bottom;
  const availW = layout.width - 2 * layout.pad - room.right;
  const availH = bottom - layout.pad;
  const scale = Math.min(availW / spanX, availH / spanY, squares ? 40 : 60);
  // Centre the figure's box.
  const left = layout.pad + (availW - spanX * scale) / 2;
  const top = layout.pad + (availH - spanY * scale) / 2;
  const origin: Pt = [left - xs[0]! * scale, top + ys[1]! * scale];
  const at = (x: number, y: number): Pt => [origin[0] + x * scale, origin[1] - y * scale];
  return { scale, at };
}

function polygon(ctx: CanvasRenderingContext2D, pts: readonly Pt[], fill: string | null, stroke: string, width = 1.5) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Unit grid inside the square with corners p0 → p1 along one side and p0 → p3 along the other. */
function grid(ctx: CanvasRenderingContext2D, p0: Pt, p1: Pt, p3: Pt, n: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    ctx.beginPath();
    ctx.moveTo(p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t);
    ctx.lineTo(p3[0] + (p1[0] - p0[0]) * t, p3[1] + (p1[1] - p0[1]) * t);
    ctx.moveTo(p0[0] + (p3[0] - p0[0]) * t, p0[1] + (p3[1] - p0[1]) * t);
    ctx.lineTo(p1[0] + (p3[0] - p0[0]) * t, p1[1] + (p3[1] - p0[1]) * t);
    ctx.stroke();
  }
  ctx.restore();
}

const isWhole = (x: number) => Math.abs(x - Math.round(x)) < 1e-9;
const fmt = (x: number) => (isWhole(x) ? String(Math.round(x)) : x.toFixed(2));

function square(ctx: CanvasRenderingContext2D, corners: readonly [Pt, Pt, Pt, Pt], side: number, colour: string, theme: LabTheme, text: string) {
  ctx.save();
  ctx.globalAlpha = 0.18;
  polygon(ctx, corners, colour, colour, 0);
  ctx.restore();
  polygon(ctx, corners, null, colour, 1.5);
  const cellPx = Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]) / side;
  if (isWhole(side) && side <= 20 && cellPx >= 5) grid(ctx, corners[0], corners[1], corners[3], Math.round(side), colour);
  const cx = (corners[0][0] + corners[2][0]) / 2;
  const cy = (corners[0][1] + corners[2][1]) / 2;
  label(ctx, text, cx, cy, { color: theme.text, font: theme.fontStrong, align: "center" });
}

export const triangleRenderer: SimulationRenderer<TriangleLayout> = {
  id: "triangle",
  layout: (width) => computeTriangleLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const a = num(results.a, 4);
    const b = num(results.b, 3);
    const c = num(results.c, Math.hypot(a, b));
    const squares = has("squares");
    const ratios = has("ratios");
    const { scale, at } = triangleFrame(layout, a, b, squares, ratios ? labelRoom(layout) : undefined);
    const A = at(0, 0);
    const B = at(a, 0);
    const C = at(a, b);

    if (squares) {
      square(ctx, [A, B, at(a, -a), at(0, -a)], a, theme.sine, theme, `${fmt(num(results.squareA))}`);
      square(ctx, [B, at(a + b, 0), at(a + b, b), C], b, theme.cosine, theme, `${fmt(num(results.squareB))}`);
      square(ctx, [A, C, at(a - b, b + a), at(-b, a)], c, theme.tangent, theme, `${fmt(num(results.squareC))}`);
    }

    if (has("triangle")) {
      polygon(ctx, [A, B, C], theme.surface, theme.text, 2);
      // The right angle.
      const s = clamp(scale * 0.4, 6, 14);
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(B[0] - s, B[1]);
      ctx.lineTo(B[0] - s, B[1] - s);
      ctx.lineTo(B[0], B[1] - s);
      ctx.stroke();
      ctx.restore();
    }

    if (ratios) {
      const theta = num(results.theta);
      const r = clamp(scale * 1.2, 18, 40);
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(A[0], A[1], r, -(theta * Math.PI) / 180, 0);
      ctx.stroke();
      ctx.restore();
      label(ctx, `θ = ${theta.toFixed(1)}°`, A[0] + r + 6, A[1] - 10, { color: theme.angle, font: theme.fontStrong, align: "left" });
      const font = theme.font;
      label(ctx, `adjacent ${fmt(a)}`, (A[0] + B[0]) / 2, A[1] + 14, { color: theme.sine, font, align: "center" });
      label(ctx, `opposite ${fmt(b)}`, B[0] + 8, (B[1] + C[1]) / 2, { color: theme.cosine, font, align: "left" });
      // Hypotenuse name, lifted off the line on the outside.
      const mx = (A[0] + C[0]) / 2;
      const my = (A[1] + C[1]) / 2;
      const len = Math.hypot(C[0] - A[0], C[1] - A[1]) || 1;
      const nx = -(C[1] - A[1]) / len;
      const ny = (C[0] - A[0]) / len;
      // Kept on the canvas however steep or flat the triangle is.
      const hyp = `hypotenuse ${fmt(c)}`;
      ctx.font = font;
      const w = ctx.measureText(hyp).width;
      const hx = clamp(mx - nx * 14 - w, 4, layout.width - 4 - w);
      label(ctx, hyp, hx, my - ny * 14, { color: theme.tangent, font, align: "left" });
    } else if (has("triangle") && !squares) {
      label(ctx, fmt(a), (A[0] + B[0]) / 2, A[1] + 14, { color: theme.text, font: theme.font, align: "center" });
    }

    if (has("labels")) {
      let words: string;
      if (squares) words = `${fmt(num(results.squareA))} + ${fmt(num(results.squareB))} = ${fmt(num(results.squareC))}: the two small squares fill the big one`;
      else {
        const special = num(results.special);
        words = special
          ? `A ${special}° triangle: sin ${num(results.sin).toFixed(3)}, cos ${num(results.cos).toFixed(3)}, tan ${num(results.tan).toFixed(3)}`
          : `sin θ = ${num(results.sin).toFixed(3)}   cos θ = ${num(results.cos).toFixed(3)}   tan θ = ${num(results.tan).toFixed(3)}`;
      }
      label(ctx, words, layout.width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
