/**
 * ΔG against temperature: one straight line that says whether a reaction
 * goes.
 *
 * The line starts at ΔH and slopes down by ΔS each kelvin. Wherever it is
 * below zero, the reaction runs by itself; the crossover, ΔH/ΔS, is where it
 * changes its mind. Beside the plot, ΔG is broken into its two terms, and a
 * grid of the four sign combinations says which kind of reaction this is.
 */

import { crossover, QUADRANT, T_LIMITS } from "@ise/chemistry-engine";
import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

export interface GibbsLayout {
  width: number;
  height: number;
  compact: boolean;
  /** ΔG against T. */
  chart: Rect;
  /** ΔH, −TΔS and ΔG as bars. */
  terms: Rect;
  /** The four kinds of reaction. */
  quadrants: Rect;
}

export function computeGibbsLayout(width: number): GibbsLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(240, width - 2 * pad);
  if (compact) {
    const chart = { x: pad + 50, y: pad + 12, width: inner - 62, height: 220 };
    const terms = { x: pad + 8, y: chart.y + chart.height + 40, width: inner - 16, height: 130 };
    const quadrants = { x: pad + 8, y: terms.y + terms.height + 30, width: inner - 16, height: 130 };
    return { width, height: Math.ceil(quadrants.y + quadrants.height + 36), compact, chart, terms, quadrants };
  }
  const chartWidth = Math.round(inner * 0.58);
  const chart = { x: pad + 54, y: pad + 12, width: chartWidth - 54, height: 270 };
  const rx = pad + chartWidth + 30;
  const rw = inner - chartWidth - 30;
  const terms = { x: rx, y: pad + 10, width: rw, height: 140 };
  const quadrants = { x: rx, y: terms.y + terms.height + 30, width: rw, height: 120 };
  // Room below the chart for its axis labels, and below the grid for the verdict.
  return { width, height: Math.ceil(Math.max(chart.y + chart.height + 34, quadrants.y + quadrants.height + 36)), compact, chart, terms, quadrants };
}

/** The ΔG axis: wide enough for ΔH, the far end of the line and zero, with a margin. */
export function gibbsPlane(layout: GibbsLayout, results: Results): Plane {
  const dH = num(results.dH);
  const dS = num(results.dS);
  const ends = [dH - (T_LIMITS[0] * dS) / 1000, dH - (T_LIMITS[1] * dS) / 1000, 0];
  const lo = Math.min(...ends);
  const hi = Math.max(...ends);
  const margin = Math.max(5, (hi - lo) * 0.12);
  return createPlane(layout.chart, [0, T_LIMITS[1]], [lo - margin, hi + margin]);
}

const VERDICT = ["goes at every temperature", "never goes by itself", "goes only below", "goes only above"] as const;

export const gibbsRenderer: SimulationRenderer<GibbsLayout> = {
  id: "gibbs",
  layout: (width) => computeGibbsLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const dH = num(results.dH);
    const dS = num(results.dS);
    const T = num(results.T, 298);
    const dG = num(results.dG);
    const cross = crossover(dH, dS);
    const quadrant = Math.round(num(results.quadrant));
    const lineAt = (t: number) => dH - (t * dS) / 1000;

    // ── ΔG against T ──────────────────────────────────────────────────────
    if (has("chart")) {
      const plane = gibbsPlane(layout, results);
      drawPlane(ctx, plane, theme, { xLabel: "T / K", yLabel: "ΔG / kJ mol⁻¹" });
      // Shade where the reaction runs by itself: the part of the line below zero.
      ctx.save();
      clipToPlane(ctx, plane);
      ctx.globalAlpha = 0.14 * dim("chart");
      ctx.fillStyle = theme.tangent;
      const [, zeroY] = plane.toPx(0, 0);
      ctx.fillRect(plane.rect.x, zeroY, plane.rect.width, plane.rect.y + plane.rect.height - zeroY);
      ctx.restore();

      ctx.save();
      clipToPlane(ctx, plane);
      ctx.globalAlpha = dim("chart");
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.75;
      const [x1, y1] = plane.toPx(T_LIMITS[0], lineAt(T_LIMITS[0]));
      const [x2, y2] = plane.toPx(T_LIMITS[1], lineAt(T_LIMITS[1]));
      segment(ctx, x1, y1, x2, y2);
      ctx.restore();

      if (cross > 0 && cross <= T_LIMITS[1]) {
        const [cx, cy] = plane.toPx(cross, 0);
        ctx.save();
        ctx.globalAlpha = dim("chart");
        ctx.strokeStyle = theme.angle;
        ctx.setLineDash([4, 4]);
        segment(ctx, cx, plane.rect.y, cx, plane.rect.y + plane.rect.height);
        ctx.setLineDash([]);
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (has("labels")) {
          label(ctx, `ΔG = 0 at ${formatNumber(cross, 0)} K`, clamp(cx + 8, plane.rect.x, plane.rect.x + plane.rect.width - 120), cy - 14, {
            color: theme.angle,
            font: theme.font,
            background: theme.background,
          });
        }
      }

      const [px, py] = plane.toPx(T, dG);
      ctx.save();
      ctx.globalAlpha = dim("chart");
      ctx.fillStyle = dG < 0 ? theme.tangent : theme.cosine;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (has("labels")) {
        label(ctx, "spontaneous (ΔG < 0)", plane.rect.x + plane.rect.width - 4, plane.rect.y + plane.rect.height - 6, {
          color: theme.tangent,
          font: theme.font,
          align: "right",
          baseline: "bottom",
        });
      }
    }

    // ── ΔG = ΔH − TΔS, term by term ───────────────────────────────────────
    if (has("terms")) {
      const { terms } = layout;
      const values: [string, number, string][] = [
        ["ΔH", dH, theme.secant],
        ["−TΔS", -num(results.TdS), theme.sine],
        ["ΔG", dG, dG < 0 ? theme.tangent : theme.cosine],
      ];
      const biggest = Math.max(1e-9, ...values.map(([, v]) => Math.abs(v)));
      const zeroY = terms.y + terms.height / 2;
      const columnWidth = terms.width / values.length;
      ctx.save();
      ctx.globalAlpha = dim("terms");
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1;
      segment(ctx, terms.x, zeroY, terms.x + terms.width, zeroY);
      values.forEach(([, v, colour], i) => {
        const h = ((terms.height / 2 - 18) * v) / biggest;
        ctx.fillStyle = colour;
        ctx.fillRect(terms.x + i * columnWidth + columnWidth * 0.25, v >= 0 ? zeroY - h : zeroY, columnWidth * 0.5, Math.abs(h));
      });
      ctx.restore();
      if (has("labels")) {
        values.forEach(([name, v, colour], i) => {
          const x = terms.x + (i + 0.5) * columnWidth;
          label(ctx, name, x, terms.y, { color: colour, font: theme.fontStrong, align: "center", baseline: "top" });
          label(ctx, formatNumber(v, 1), x, terms.y + terms.height, { color: theme.text, font: theme.font, align: "center", baseline: "bottom" });
        });
      }
    }

    // ── The four kinds of reaction ────────────────────────────────────────
    if (has("quadrants")) {
      const { quadrants } = layout;
      const w = quadrants.width / 2;
      const h = quadrants.height / 2;
      // Columns: ΔS > 0, ΔS < 0. Rows: ΔH < 0, ΔH > 0.
      const cells: [number, number, number, string][] = [
        [QUADRANT.always, 0, 0, "always"],
        [QUADRANT.lowT, 1, 0, "low T only"],
        [QUADRANT.highT, 0, 1, "high T only"],
        [QUADRANT.never, 1, 1, "never"],
      ];
      ctx.save();
      ctx.globalAlpha = dim("quadrants");
      for (const [q, col, row] of cells) {
        ctx.fillStyle = q === quadrant ? theme.surface2 : "transparent";
        ctx.strokeStyle = q === quadrant ? theme.angle : theme.grid;
        ctx.lineWidth = q === quadrant ? 2 : 1;
        ctx.fillRect(quadrants.x + col * w, quadrants.y + row * h, w, h);
        ctx.strokeRect(quadrants.x + col * w, quadrants.y + row * h, w, h);
      }
      ctx.restore();
      if (has("labels")) {
        for (const [q, col, row, text] of cells) {
          label(ctx, text, quadrants.x + (col + 0.5) * w, quadrants.y + (row + 0.5) * h, {
            color: q === quadrant ? theme.text : theme.muted,
            font: q === quadrant ? theme.fontStrong : theme.font,
            align: "center",
          });
        }
        label(ctx, "ΔS > 0", quadrants.x + w / 2, quadrants.y - 4, { color: theme.muted, font: theme.font, align: "center", baseline: "bottom" });
        label(ctx, "ΔS < 0", quadrants.x + 1.5 * w, quadrants.y - 4, { color: theme.muted, font: theme.font, align: "center", baseline: "bottom" });
        const verdict = VERDICT[quadrant] ?? "";
        const tail = quadrant === QUADRANT.lowT || quadrant === QUADRANT.highT ? ` ${formatNumber(cross, 0)} K` : "";
        label(ctx, `This reaction ${verdict}${tail}.`, quadrants.x, quadrants.y + quadrants.height + 8, { color: theme.text, font: theme.font, baseline: "top" });
      }
    }
  },

  /** Click or drag along the plot to set the temperature. */
  pick(layout, x, y, locked, results) {
    const plane = gibbsPlane(layout, results);
    if (locked !== "chart" && (locked || !plane.contains(x, y, 8))) return null;
    const [T] = plane.fromPx(x, y);
    return { writes: [{ variable: "T", value: clamp(T, T_LIMITS[0], T_LIMITS[1]) }], region: "chart", press: "sweep" };
  },
};
