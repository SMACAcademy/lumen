/**
 * Fractions on a number line, with a fraction bar laid right above it.
 *
 * The bar is the line: it spans 0 to the last whole, cut into the same
 * pieces as the ticks, so "3 of 4 pieces shaded" and "the point at 3/4" are
 * visibly one idea. A second line with its own pieces sits below; when the
 * two points line up, a dashed link says they are the same number.
 *
 * A decimal ruler can sit below: whole numbers, tenths and hundredths as
 * taller to shorter marks, with its own point at dec hundredths. With the
 * labels on it names the decimal, its place value and how it compares with
 * the fraction on the first line ("0.5 > 0.45").
 */

import type { Results } from "@ise/science-engine";
import { label, num, segment } from "../shared/draw";
import type { PickResult, SimulationRenderer } from "../types";

export interface NumberLineLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right ends of both lines. */
  x0: number;
  x1: number;
  bar1: { y: number; height: number };
  line1: number;
  /** Null when the second line is hidden. */
  bar2: { y: number; height: number } | null;
  line2: number | null;
  /** y of the decimal ruler; null when it is hidden. */
  ruler: number | null;
}

export function computeNumberLineLayout(width: number, layers: ReadonlySet<string>): NumberLineLayout {
  const compact = width < 560;
  const pad = compact ? 22 : 48;
  const barHeight = compact ? 34 : 42;
  const bar1 = { y: 44, height: barHeight };
  const line1 = bar1.y + barHeight + 42;
  const second = layers.has("second");
  const bar2 = second ? { y: line1 + 74, height: barHeight } : null;
  const line2 = bar2 ? bar2.y + barHeight + 42 : null;
  // The ruler leaves room above it for its point's name, and below for its numbers and two captions.
  const ruler = layers.has("decimal") ? (line2 ?? line1) + 84 : null;
  const bottom = ruler !== null ? ruler + 82 : (line2 ?? line1) + 44;
  return { width, height: Math.ceil(bottom), compact, x0: pad, x1: width - pad, bar1, line1, bar2, line2, ruler };
}

/** x of a value on the lines, for a line that shows 0 to `max`. */
export function xOf(layout: NumberLineLayout, value: number, max: number): number {
  return layout.x0 + ((layout.x1 - layout.x0) * value) / Math.max(1, max);
}

/** Where the ticks fall: every 1/d from 0 to max. */
export function tickPositions(layout: NumberLineLayout, d: number, max: number): number[] {
  const count = Math.round(d * max);
  return Array.from({ length: count + 1 }, (_, k) => xOf(layout, k / d, max));
}

function drawBar(ctx: CanvasRenderingContext2D, layout: NumberLineLayout, bar: { y: number; height: number }, d: number, max: number, n: number, color: string, stroke: string) {
  const ticks = tickPositions(layout, d, max);
  ctx.save();
  // Shaded pieces first, one rectangle each, so a count of them is a count of pieces.
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.55;
  for (let k = 0; k < n && k + 1 < ticks.length; k++) ctx.fillRect(ticks[k]!, bar.y, ticks[k + 1]! - ticks[k]!, bar.height);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(layout.x0, bar.y, layout.x1 - layout.x0, bar.height);
  for (const x of ticks.slice(1, -1)) segment(ctx, x, bar.y, x, bar.y + bar.height);
  // Thicker edges between wholes.
  ctx.lineWidth = 3;
  for (let w = 1; w < max; w++) {
    const x = xOf(layout, w, max);
    segment(ctx, x, bar.y, x, bar.y + bar.height);
  }
  ctx.restore();
}

function drawLine(ctx: CanvasRenderingContext2D, layout: NumberLineLayout, y: number, d: number, max: number, axis: string, text: string, font: string) {
  ctx.save();
  ctx.strokeStyle = axis;
  ctx.lineWidth = 2;
  segment(ctx, layout.x0 - 10, y, layout.x1 + 10, y);
  ctx.lineWidth = 1.5;
  for (const x of tickPositions(layout, d, max)) segment(ctx, x, y - 6, x, y + 6);
  ctx.lineWidth = 2.5;
  for (let w = 0; w <= max; w++) {
    const x = xOf(layout, w, max);
    segment(ctx, x, y - 11, x, y + 11);
  }
  ctx.restore();
  for (let w = 0; w <= max; w++) label(ctx, String(w), xOf(layout, w, max), y + 24, { color: text, font, align: "center" });
}

function drawPoint(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The ruler's marks that are far enough apart to draw: wholes always, tenths and hundredths when they are at least 3 px apart. */
export function rulerMarks(layout: NumberLineLayout, max: number): { x: number; size: "whole" | "tenth" | "hundredth"; k: number }[] {
  const perWhole = (layout.x1 - layout.x0) / Math.max(1, max);
  const marks: { x: number; size: "whole" | "tenth" | "hundredth"; k: number }[] = [];
  for (let k = 0; k <= 100 * max; k++) {
    const size = k % 100 === 0 ? "whole" : k % 10 === 0 ? "tenth" : "hundredth";
    if (size === "tenth" && perWhole / 10 < 3) continue;
    if (size === "hundredth" && perWhole / 100 < 3) continue;
    marks.push({ x: xOf(layout, k / 100, max), size, k });
  }
  return marks;
}

function drawRuler(ctx: CanvasRenderingContext2D, layout: NumberLineLayout, y: number, max: number, theme: { axis: string; muted: string; font: string }) {
  const perWhole = (layout.x1 - layout.x0) / Math.max(1, max);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, layout.x0 - 10, y, layout.x1 + 10, y);
  const tall = { whole: 11, tenth: 7, hundredth: 3.5 } as const;
  const width = { whole: 2.5, tenth: 1.5, hundredth: 1 } as const;
  for (const mark of rulerMarks(layout, max)) {
    ctx.lineWidth = width[mark.size];
    segment(ctx, mark.x, y - tall[mark.size], mark.x, y + tall[mark.size]);
  }
  ctx.restore();
  for (let w = 0; w <= max; w++) label(ctx, String(w), xOf(layout, w, max), y + 24, { color: theme.muted, font: theme.font, align: "center" });
  // Tenths get their names too when there is room: 0.1, 0.2, …
  if (perWhole / 10 >= 26) {
    for (let k = 1; k < 10 * max; k++) {
      if (k % 10 === 0) continue;
      label(ctx, decimal(k / 10), xOf(layout, k / 10, max), y + 24, { color: theme.muted, font: theme.font, align: "center" });
    }
  }
}

/** A decimal as a child would write it: up to three places, no trailing zeros ("0.75", "0.333"). */
export function decimal(value: number): string {
  return String(Number(value.toFixed(3)));
}

export const numberLineRenderer: SimulationRenderer<NumberLineLayout> = {
  id: "number-line",
  layout: (width, _graphs, layers) => computeNumberLineLayout(width, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const max = Math.max(1, Math.round(num(results.max, 1)));
    const d = Math.max(1, Math.round(num(results.d, 4)));
    const n = Math.round(num(results.n));
    const d2 = Math.max(1, Math.round(num(results.d2, 8)));
    const n2 = Math.round(num(results.n2));
    const equal = num(results.equal) === 1;
    const x1 = xOf(layout, n / d, max);
    const x2 = xOf(layout, n2 / d2, max);

    if (has("bars")) drawBar(ctx, layout, layout.bar1, d, max, n, theme.sine, theme.text);
    if (has("line")) {
      drawLine(ctx, layout, layout.line1, d, max, theme.axis, theme.muted, theme.font);
      drawPoint(ctx, x1, layout.line1, theme.angle);
    }

    const second = has("second") && layout.bar2 && layout.line2 !== null;
    if (second) {
      if (has("bars")) drawBar(ctx, layout, layout.bar2!, d2, max, n2, theme.cosine, theme.text);
      drawLine(ctx, layout, layout.line2!, d2, max, theme.axis, theme.muted, theme.font);
      drawPoint(ctx, x2, layout.line2!, theme.cosine);
      if (equal) {
        ctx.save();
        ctx.strokeStyle = theme.tangent;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        segment(ctx, x1, layout.line1, x2, layout.line2!);
        ctx.restore();
      }
    }

    const ruler = has("decimal") && layout.ruler !== null ? layout.ruler : null;
    const dec = Math.round(num(results.dec));
    const xd = xOf(layout, dec / 100, max);
    if (ruler !== null) {
      drawRuler(ctx, layout, ruler, max, { axis: theme.axis, muted: theme.muted, font: theme.font });
      drawPoint(ctx, xd, ruler, theme.secant);
    }

    if (has("labels")) {
      // Each point's name sits above it, with its decimal: "3/4 = 0.75".
      const tag = (x: number, y: number, text: string, color: string) =>
        label(ctx, text, Math.min(layout.x1 - 30, Math.max(layout.x0 + 30, x)), y - 20, { color, font: theme.fontStrong, align: "center", background: theme.background });
      // With one piece in a whole the line is the whole numbers, and a point is just its number.
      tag(x1, layout.line1, d === 1 ? String(n) : `${n}/${d} = ${decimal(n / d)}`, theme.angle);
      if (second) tag(x2, layout.line2!, `${n2}/${d2} = ${decimal(n2 / d2)}`, theme.cosine);
      if (second && equal) {
        // In the gap between the top line's numbers and the lower bar.
        const gapY = layout.line1 + 44;
        const toLeft = x1 > layout.x1 - 90;
        label(ctx, "same point!", toLeft ? x1 - 10 : x1 + 10, gapY, { color: theme.tangent, font: theme.fontStrong, align: toLeft ? "right" : "left" });
      }
      if (ruler !== null) {
        tag(xd, ruler, decimal(dec / 100), theme.secant);
        // Place value: 0.45 is 0 ones, 4 tenths and 5 hundredths.
        const place = `${num(results.onesDigit)} ones · ${num(results.tenthsDigit)} tenths · ${num(results.hundredthsDigit)} hundredths`;
        label(ctx, place, layout.width / 2, ruler + 48, { color: theme.secant, font: theme.font, align: "center" });
        if (has("line")) {
          const compare = Math.round(num(results.decCompare));
          const sign = compare > 0 ? ">" : compare < 0 ? "<" : "=";
          label(ctx, `${n}/${d} = ${decimal(n / d)}  ${sign}  ${decimal(dec / 100)}`, layout.width / 2, ruler + 68, { color: theme.text, font: theme.fontStrong, align: "center" });
        }
      }
    }
  },

  /** Drag along a line to move its point; it snaps to the nearest piece. */
  pick(layout, x, y, locked, results: Results): PickResult | null {
    const max = Math.max(1, Math.round(num(results.max, 1)));
    const along = Math.min(1, Math.max(0, (x - layout.x0) / (layout.x1 - layout.x0))) * max;
    const near = (lineY: number, barY: number) => y > barY - 10 && y < lineY + 20;
    if (layout.ruler !== null && (locked === "ruler" || (!locked && Math.abs(y - layout.ruler) < 24))) {
      return { writes: [{ variable: "dec", value: Math.round(along * 100) }], region: "ruler", press: "jump" };
    }
    const onSecond = layout.line2 !== null && layout.bar2 !== null && (locked === "line2" || (!locked && near(layout.line2, layout.bar2.y)));
    if (onSecond) {
      const d2 = Math.max(1, Math.round(num(results.d2, 8)));
      return { writes: [{ variable: "n2", value: Math.round(along * d2) }], region: "line2", press: "jump" };
    }
    if (locked === "line1" || (!locked && near(layout.line1, layout.bar1.y))) {
      const d = Math.max(1, Math.round(num(results.d, 4)));
      return { writes: [{ variable: "n", value: Math.round(along * d) }], region: "line1", press: "jump" };
    }
    return null;
  },
};
