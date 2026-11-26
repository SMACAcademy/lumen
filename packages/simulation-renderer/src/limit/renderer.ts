/**
 * Limits, continuity and differentiability.
 *
 * Approach: the graph, with an open circle where it has a hole and a dot
 * where it has a value, and two markers at a − h and a + h whose heights are
 * carried across to the y-axis — so the eye sees them meet, or not.
 *
 * Trap: a band of ±ε round the limit and a strip of ±δ round a. The piece
 * of graph inside the strip is green when it stays in the band, orange when
 * any of it escapes.
 *
 * Zoom: the curve round one point, drawn with the same scale on both axes,
 * magnified up to a thousand times. Smooth curves straighten; corners,
 * cusps and vertical tangents do not.
 */

import {
  CORNER_KINDS,
  LIMIT_FUNCTION_ORDER,
  LIMIT_FUNCTIONS,
  limitOf,
  trapCentre,
  ZOOM_CURVE_ORDER,
  ZOOM_CURVES,
  zoomWindow,
} from "@ise/mathematics-engine";
import { clamp, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

export interface LimitLayout {
  width: number;
  height: number;
  compact: boolean;
  rect: { x: number; y: number; width: number; height: number };
}

export function computeLimitLayout(width: number): LimitLayout {
  const compact = width < 560;
  const height = compact ? 340 : 380;
  const left = compact ? 36 : 48;
  return { width, height, compact, rect: { x: left, y: 34, width: width - left - 14, height: height - 34 - 44 } };
}

/**
 * Draw y = f(x) across the plane, lifting the pen wherever the function has
 * no value or leaps (a jump or a pole), so no false vertical line is drawn.
 */
export function plotFunction(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, x0 = plane.xDomain[0], x1 = plane.xDomain[1], samples = 900): void {
  const leap = (plane.yDomain[1] - plane.yDomain[0]) * 0.6;
  let pen = false;
  let last = 0;
  ctx.beginPath();
  for (let i = 0; i <= samples; i++) {
    const x = x0 + ((x1 - x0) * i) / samples;
    const y = f(x);
    if (!Number.isFinite(y)) {
      pen = false;
      continue;
    }
    const [px, py] = plane.toPx(x, y);
    if (pen && Math.abs(y - last) < leap) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
    pen = true;
    last = y;
  }
  ctx.stroke();
}

/** The window the zoom view shows: equal scales on both axes, centred on the curve's point. */
export function zoomPlane(layout: LimitLayout, a: number, fa: number, zoomLog: number): Plane {
  const w = zoomWindow(zoomLog);
  const tall = (w * layout.rect.height) / layout.rect.width;
  return createPlane(layout.rect, [a - w, a + w], [fa - tall, fa + tall]);
}

const fixed = (v: number, digits: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function dashed(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export const limitRenderer: SimulationRenderer<LimitLayout> = {
  id: "limit",
  layout: (width) => computeLimitLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, rect } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const title = (words: string) => label(ctx, words, rect.x, 16, { color: theme.text, font: theme.fontStrong });

    if (has("graph")) {
      const fn = LIMIT_FUNCTIONS[LIMIT_FUNCTION_ORDER[Math.round(num(results.function))] ?? "hole"];
      const plane = createPlane(rect, fn.view.x, fn.view.y);
      const limit = limitOf(fn);
      const h = num(results.h, 1);
      title(`f(x) = ${fn.label}`);
      drawPlane(ctx, plane, theme);
      const [ax] = plane.toPx(fn.a, 0);
      const inside = (y: number) => clamp(y, fn.view.y[0], fn.view.y[1]);

      if (has("band")) {
        const epsilon = num(results.epsilon, 0.5);
        const centre = trapCentre(fn);
        const [, top] = plane.toPx(0, inside(centre + epsilon));
        const [, bottom] = plane.toPx(0, inside(centre - epsilon));
        const [left] = plane.toPx(fn.a - h, 0);
        const [right] = plane.toPx(fn.a + h, 0);
        ctx.save();
        clipToPlane(ctx, plane);
        ctx.fillStyle = theme.angle;
        ctx.globalAlpha = 0.16;
        ctx.fillRect(rect.x, top, rect.width, bottom - top);
        ctx.fillStyle = theme.sine;
        ctx.globalAlpha = 0.14;
        ctx.fillRect(left, rect.y, right - left, rect.height);
        ctx.restore();
        label(ctx, "ε", rect.x + rect.width - 6, top + 9, { color: theme.angle, font: theme.fontStrong, align: "right" });
        label(ctx, "δ", right + 4, rect.y + 10, { color: theme.sine, font: theme.fontStrong });
      }

      ctx.save();
      clipToPlane(ctx, plane);
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      plotFunction(ctx, plane, fn.f);
      if (has("band")) {
        // The piece inside the strip, coloured by whether it stays in the band.
        ctx.strokeStyle = num(results.trapped) === 1 ? theme.tangent : theme.secant;
        ctx.lineWidth = 4;
        plotFunction(ctx, plane, fn.f, fn.a - h, fn.a - h / 400, 200);
        plotFunction(ctx, plane, fn.f, fn.a + h / 400, fn.a + h, 200);
      }
      ctx.restore();

      // The point itself: an open circle on the limit if the value is elsewhere or missing, a dot on the value.
      if (limit !== null && fn.value !== limit) {
        const [, ly] = plane.toPx(0, limit);
        disc(ctx, ax, ly, 5, theme.background, theme.curve);
      }
      if (fn.value !== null) {
        const [, vy] = plane.toPx(0, fn.value);
        disc(ctx, ax, vy, 4.5, theme.curve);
      }

      if (has("approach")) {
        const [ox] = plane.toPx(Math.min(Math.max(0, fn.view.x[0]), fn.view.x[1]), 0);
        for (const [x, y, colour] of [[num(results.xLeft), num(results.fLeft), theme.sine], [num(results.xRight), num(results.fRight), theme.cosine]] as const) {
          if (x < fn.view.x[0] || x > fn.view.x[1]) continue;
          const [px, py] = plane.toPx(x, inside(y));
          dashed(ctx, px, py, ox, py, colour);
          dashed(ctx, px, py, px, rect.y + rect.height, colour);
          disc(ctx, px, py, 5, colour);
          disc(ctx, ox, py, 3, colour);
        }
        if (has("labels")) caption(`${fixed(h, 3)} from x = ${fixed(fn.a, 0)}: left ${fixed(num(results.fLeft), 4)} · right ${fixed(num(results.fRight), 4)}`);
      }

      if (has("band") && has("labels")) {
        // Short enough for a phone.
        const words = num(results.trapped) === 1 ? "the graph stays in the band" : "the graph escapes the band";
        caption(`δ = ${fixed(h, 3)}, ε = ${fixed(num(results.epsilon, 0.5), 2)}: ${words}`);
      }
    }

    if (has("zoom")) {
      const curve = ZOOM_CURVES[ZOOM_CURVE_ORDER[Math.round(num(results.curve))] ?? "parabola"];
      const zoomLog = num(results.zoom);
      const plane = zoomPlane(layout, curve.a, curve.f(curve.a), zoomLog);
      title(`y = ${curve.label}`);
      label(ctx, `× ${Math.round(num(results.zoomFactor, 1))}`, rect.x + rect.width, 16, { color: theme.angle, font: theme.fontStrong, align: "right" });
      drawPlane(ctx, plane, theme, { showLabels: false });
      ctx.save();
      clipToPlane(ctx, plane);
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 3;
      plotFunction(ctx, plane, curve.f, plane.xDomain[0], plane.xDomain[1], 600);
      ctx.restore();
      const [px, py] = plane.toPx(curve.a, curve.f(curve.a));
      disc(ctx, px, py, 5, theme.angle);
      if (has("labels")) {
        const kind = CORNER_KINDS[Math.round(num(results.corner))] ?? "smooth";
        const verdict = zoomLog < 1.5 ? "" : kind === "smooth" ? " — one straight line" : kind === "corner" ? " — still a corner" : kind === "vertical" ? " — ever steeper" : " — still a cusp";
        caption(`Slopes: left ${fixed(num(results.slopeLeft), 2)}, right ${fixed(num(results.slopeRight), 2)}${verdict}`);
      }
    }
  },
};
