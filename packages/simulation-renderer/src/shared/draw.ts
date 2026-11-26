/** Small canvas helpers shared by renderers. Presentation only. */

import type { GraphStyle } from "@ise/graph-engine";
import type { LabTheme } from "../theme";

export function graphStyle(theme: LabTheme): GraphStyle {
  return { axis: theme.axis, grid: theme.grid, text: theme.text, muted: theme.muted, font: theme.font };
}

export function segment(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export interface ArrowStyle {
  color: string;
  width?: number;
  head?: number;
  dash?: number[];
  alpha?: number;
  /** Draw heads at both ends (for measurements like the period). */
  double?: boolean;
}

/** A straight arrow from (x1, y1) to (x2, y2). */
export function arrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, style: ArrowStyle): void {
  const length = Math.hypot(x2 - x1, y2 - y1);
  if (length < 0.5) return;
  const head = Math.min(style.head ?? 10, length * 0.45);
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  ctx.save();
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.strokeStyle = style.color;
  ctx.fillStyle = style.color;
  ctx.lineWidth = style.width ?? 2;
  ctx.lineCap = "round";
  ctx.setLineDash(style.dash ?? []);
  segment(ctx, x1 + (style.double ? ux * head * 0.8 : 0), y1 + (style.double ? uy * head * 0.8 : 0), x2 - ux * head * 0.8, y2 - uy * head * 0.8);
  ctx.setLineDash([]);
  const drawHead = (tx: number, ty: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - dx * head - dy * head * 0.5, ty - dy * head + dx * head * 0.5);
    ctx.lineTo(tx - dx * head + dy * head * 0.5, ty - dy * head - dx * head * 0.5);
    ctx.closePath();
    ctx.fill();
  };
  drawHead(x2, y2, ux, uy);
  if (style.double) drawHead(x1, y1, -ux, -uy);
  ctx.restore();
}

export interface LabelStyle {
  color: string;
  font: string;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  /** Paint a background pill so the label stays readable over lines. */
  background?: string;
}

export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, style: LabelStyle): void {
  ctx.save();
  ctx.font = style.font;
  ctx.textAlign = style.align ?? "left";
  ctx.textBaseline = style.baseline ?? "middle";
  if (style.background) {
    const w = ctx.measureText(text).width;
    const h = 16;
    const left = style.align === "center" ? x - w / 2 : style.align === "right" ? x - w : x;
    const top = style.baseline === "top" ? y : style.baseline === "bottom" ? y - h : y - h / 2;
    ctx.fillStyle = style.background;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.roundRect(left - 4, top - 1, w + 8, h + 2, 5);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = style.color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
