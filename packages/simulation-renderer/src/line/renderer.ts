/**
 * Straight lines on a coordinate plane, and a point to drag.
 *
 * A square plane from −8 to 8 with a unit grid. The first line, y = mx + c,
 * is drawn right across it; the second, when shown, in a second colour, with
 * a ring where the two meet. Their equations sit in a small legend. The point can be dragged
 * anywhere on the plane and snaps to halves; it turns solid when it sits on
 * the first line. Coordinates are written only with the words showing, so an
 * estimate can hide them.
 */

import { PLANE_LIMIT } from "@ise/mathematics-engine";
import { clamp, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

export interface LineLayout {
  width: number;
  height: number;
  compact: boolean;
  plane: Plane;
}

export function computeLineLayout(width: number): LineLayout {
  const compact = width < 560;
  const side = Math.min(width - (compact ? 32 : 64), compact ? 340 : 400);
  const x = (width - side) / 2;
  const plane = createPlane({ x, y: 16, width: side, height: side }, [-PLANE_LIMIT, PLANE_LIMIT], [-PLANE_LIMIT, PLANE_LIMIT]);
  return { width, height: side + 16 + 44, compact, plane };
}

const trim = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r).replace("-", "−");
};

/** "y = 2x + 1", "y = −x", "y = 3", with the tidy signs a textbook uses. */
export function lineEquation(m: number, c: number): string {
  const mPart = m === 0 ? "" : m === 1 ? "x" : m === -1 ? "−x" : `${trim(m)}x`;
  if (!mPart) return `y = ${trim(c)}`;
  if (c === 0) return `y = ${mPart}`;
  return `y = ${mPart} ${c > 0 ? "+" : "−"} ${trim(Math.abs(c))}`;
}

const point = (x: number, y: number) => `(${trim(x)}, ${trim(y)})`;
const QUADRANTS = ["", "I", "II", "III", "IV"];

function drawLine(ctx: CanvasRenderingContext2D, plane: Plane, m: number, c: number, colour: string) {
  const [x0, y0] = plane.toPx(-PLANE_LIMIT, m * -PLANE_LIMIT + c);
  const [x1, y1] = plane.toPx(PLANE_LIMIT, m * PLANE_LIMIT + c);
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

/** The lines' equations, boxed in the top-left corner so no line runs through them. */
function legend(ctx: CanvasRenderingContext2D, plane: Plane, entries: readonly { text: string; colour: string }[], theme: LabTheme) {
  if (!entries.length) return;
  ctx.save();
  ctx.font = theme.fontStrong;
  const w = Math.max(...entries.map((e) => ctx.measureText(e.text).width)) + 16;
  const h = entries.length * 18 + 8;
  const { x, y } = plane.rect;
  ctx.fillStyle = theme.surface;
  ctx.globalAlpha = 0.92;
  ctx.fillRect(x + 4, y + 4, w, h);
  ctx.restore();
  entries.forEach((e, i) => label(ctx, e.text, x + 12, y + 17 + i * 18, { color: e.colour, font: theme.fontStrong, align: "left" }));
}

export const lineRenderer: SimulationRenderer<LineLayout> = {
  id: "line",
  layout: (width) => computeLineLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { plane } = layout;
    ctx.clearRect(0, 0, layout.width, layout.height);

    const m = num(results.m, 1);
    const c = num(results.c);
    const m2 = num(results.m2, -1);
    const c2 = num(results.c2);
    const x = num(results.x);
    const y = num(results.y);
    const second = has("second");
    const solutions = Math.round(num(results.solutions, 1));

    if (has("plane")) drawPlane(ctx, plane, theme, { gridStep: 1, xLabel: "x", yLabel: "y" });
    if (has("line")) drawLine(ctx, plane, m, c, theme.sine);
    if (second) drawLine(ctx, plane, m2, c2, theme.cosine);

    if (second && solutions === 1) {
      const mx = num(results.meetX);
      const my = num(results.meetY);
      if (Math.abs(mx) <= PLANE_LIMIT && Math.abs(my) <= PLANE_LIMIT) {
        const [px, py] = plane.toPx(mx, my);
        ctx.save();
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (has("labels")) label(ctx, point(mx, my), px + 12, py - 12, { color: theme.angle, font: theme.fontStrong, align: "left" });
      }
    }

    if (has("point")) {
      const [px, py] = plane.toPx(x, y);
      const on = num(results.onLine) === 1;
      ctx.save();
      ctx.fillStyle = on ? theme.tangent : theme.surface;
      ctx.strokeStyle = on ? theme.tangent : theme.point;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      const right = px < plane.rect.x + plane.rect.width - 70;
      if (has("labels")) label(ctx, point(x, y), px + (right ? 10 : -10), py + 14, { color: theme.text, font: theme.font, align: right ? "left" : "right" });
    }

    legend(
      ctx,
      plane,
      [...(has("line") ? [{ text: lineEquation(m, c), colour: theme.sine }] : []), ...(second ? [{ text: lineEquation(m2, c2), colour: theme.cosine }] : [])],
      theme,
    );

    if (has("labels")) {
      let words: string;
      if (second) {
        words =
          solutions === 2
            ? "The same line twice: every point on it solves both equations"
            : solutions === 0
              ? "Same slope, different starts: parallel lines never meet — no solution"
              : `The lines meet at ${point(num(results.meetX), num(results.meetY))}: the one point on both`;
      } else if (has("point") && !has("line")) {
        const q = Math.round(num(results.quadrant));
        const where = `${x >= 0 ? "right" : "left"} ${trim(Math.abs(x))}, ${y >= 0 ? "up" : "down"} ${trim(Math.abs(y))}`;
        words = q ? `${point(x, y)} is in quadrant ${QUADRANTS[q]}: ${where}` : `${point(x, y)} is on an axis: ${where}`;
      } else if (has("point")) {
        const lineY = num(results.lineY);
        words =
          num(results.onLine) === 1
            ? `${point(x, y)} is on the line: ${trim(m)} × ${trim(x)} + ${trim(c)} = ${trim(y)}`
            : `${point(x, y)} is off the line: at x = ${trim(x)} the line is at y = ${trim(lineY)}`;
      } else words = `Slope ${trim(m)}: up ${trim(m)} for every 1 across. It crosses the y-axis at ${trim(c)}.`;
      label(ctx, words, layout.width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  },

  pick(layout, px, py): PickResult | null {
    const { plane } = layout;
    if (!plane.contains(px, py, 12)) return null;
    const [x, y] = plane.fromPx(px, py);
    const snap = (v: number) => clamp(Math.round(v * 2) / 2, -PLANE_LIMIT, PLANE_LIMIT);
    return {
      writes: [
        { variable: "x", value: snap(x) },
        { variable: "y", value: snap(y) },
      ],
      region: "plane",
    };
  },
};
