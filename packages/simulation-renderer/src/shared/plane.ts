/** A Cartesian plane mapped onto a canvas rectangle (maths y-up → canvas y-down). */

import type { Rect } from "@ise/graph-engine";
import { linearTicks } from "@ise/graph-engine";
import type { LabTheme } from "../theme";
import { label, segment } from "./draw";

export interface Plane {
  rect: Rect;
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  /** Pixels per unit along x and y. */
  sx: number;
  sy: number;
  toPx(x: number, y: number): [number, number];
  fromPx(px: number, py: number): [number, number];
  contains(px: number, py: number, slack?: number): boolean;
}

export function createPlane(rect: Rect, xDomain: readonly [number, number], yDomain: readonly [number, number]): Plane {
  const sx = rect.width / (xDomain[1] - xDomain[0]);
  const sy = rect.height / (yDomain[1] - yDomain[0]);
  return {
    rect,
    xDomain,
    yDomain,
    sx,
    sy,
    toPx: (x, y) => [rect.x + (x - xDomain[0]) * sx, rect.y + (yDomain[1] - y) * sy],
    fromPx: (px, py) => [xDomain[0] + (px - rect.x) / sx, yDomain[1] - (py - rect.y) / sy],
    contains: (px, py, slack = 0) =>
      px >= rect.x - slack && px <= rect.x + rect.width + slack && py >= rect.y - slack && py <= rect.y + rect.height + slack,
  };
}

export interface PlaneGridOptions {
  /** Grid spacing in units (default: every tick). */
  gridStep?: number;
  xLabel?: string;
  yLabel?: string;
  showLabels?: boolean;
}

/** Grid lines, axes through the origin (or the nearest edge) and tick labels. */
export function drawPlane(ctx: CanvasRenderingContext2D, plane: Plane, theme: LabTheme, options: PlaneGridOptions = {}): void {
  const { rect, xDomain, yDomain } = plane;
  const xTicks = linearTicks(xDomain, Math.max(4, Math.floor(rect.width / 60)));
  const yTicks = linearTicks(yDomain, Math.max(4, Math.floor(rect.height / 60)));
  const [ox, oy] = plane.toPx(
    Math.min(Math.max(0, xDomain[0]), xDomain[1]),
    Math.min(Math.max(0, yDomain[0]), yDomain[1]),
  );

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = theme.grid;
  const step = options.gridStep;
  if (step) {
    for (let x = Math.ceil(xDomain[0] / step) * step; x <= xDomain[1] + 1e-9; x += step) {
      const [px] = plane.toPx(x, 0);
      segment(ctx, px, rect.y, px, rect.y + rect.height);
    }
    for (let y = Math.ceil(yDomain[0] / step) * step; y <= yDomain[1] + 1e-9; y += step) {
      const [, py] = plane.toPx(0, y);
      segment(ctx, rect.x, py, rect.x + rect.width, py);
    }
  } else {
    for (const t of xTicks) {
      const [px] = plane.toPx(t.value, 0);
      segment(ctx, px, rect.y, px, rect.y + rect.height);
    }
    for (const t of yTicks) {
      const [, py] = plane.toPx(0, t.value);
      segment(ctx, rect.x, py, rect.x + rect.width, py);
    }
  }

  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.25;
  segment(ctx, rect.x, oy, rect.x + rect.width, oy);
  segment(ctx, ox, rect.y, ox, rect.y + rect.height);

  if (options.showLabels ?? true) {
    for (const t of xTicks) {
      if (t.value === 0) continue;
      const [px] = plane.toPx(t.value, 0);
      label(ctx, t.label, px, oy + 5, { color: theme.muted, font: theme.font, align: "center", baseline: "top" });
    }
    for (const t of yTicks) {
      if (t.value === 0) continue;
      const [, py] = plane.toPx(0, t.value);
      label(ctx, t.label, ox - 5, py, { color: theme.muted, font: theme.font, align: "right" });
    }
    if (options.xLabel) label(ctx, options.xLabel, rect.x + rect.width - 2, oy - 8, { color: theme.text, font: theme.font, align: "right", baseline: "bottom" });
    if (options.yLabel) label(ctx, options.yLabel, ox + 8, rect.y + 2, { color: theme.text, font: theme.font, baseline: "top" });
  }
  ctx.restore();
}

export function clipToPlane(ctx: CanvasRenderingContext2D, plane: Plane): void {
  const { rect } = plane;
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
}
