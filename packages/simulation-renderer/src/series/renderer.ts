/**
 * Sequences and series, in six pictures.
 *
 * AP: the terms as a staircase of bars, the nth one picked out.
 * AP sum: Gauss's picture — on each bar the terms reversed are stacked, so
 * every column reaches a + l and the two staircases make a rectangle of
 * n columns: 2Sₙ = n(a + l).
 * GP: bars that grow or shrink by the factor r; below, the partial sums. For
 * 0 < r < 1 (and a > 0) a square of area S∞ is cut again and again, each
 * piece the fraction 1 − r of what is left (halves when r = ½); otherwise
 * the partial sums hop along a number line.
 * Means: a semicircle on p + q. The radius is the AM, the half-chord at the
 * join is the GM, and the foot of the perpendicular from the join cuts the
 * HM off the slanting radius.
 * Blocks: Σk as a staircase and its copy, Σk² as squares side by side, Σk³
 * as L-shaped bands filling a square of side 1 + 2 + … + n.
 * AGP: S, rS shifted one place, and their difference, a GP less one term.
 *
 * Numbers that a level asks the learner to estimate are drawn only with
 * the "labels" layer.
 */

import { SERIES_SQUARES_DRAWN, seriesAgpTerms, seriesApTerms, seriesGpTerms, seriesPartialSums } from "@ise/mathematics-engine";
import { label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface SeriesLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The drawing area between the title and the caption. */
  plot: Box;
}

export function computeSeriesLayout(width: number): SeriesLayout {
  const compact = width < 560;
  const height = compact ? 400 : 420;
  return { width, height, compact, plot: { x: 16, y: 34, width: width - 32, height: height - 34 - 44 } };
}

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => String(Math.round(n)).split("").map((c) => SUB[Number(c)] ?? c).join("");
/** A number to at most `digits` places, trailing zeros dropped, with a true minus sign. */
function fmt(v: number, digits = 2): string {
  const rounded = Number(v.toFixed(digits)) || 0;
  return `${rounded < 0 ? "−" : ""}${Math.abs(rounded)}`;
}

function fill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: string, alpha = 1) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Columns across a box, with a vertical scale running from lo (bottom) to hi (top). */
function columns(box: Box, count: number, lo: number, hi: number) {
  const span = hi - lo || 1;
  const slot = box.width / Math.max(1, count);
  const barWidth = Math.max(1, slot * 0.72);
  return {
    slot,
    barWidth,
    left: (k: number) => box.x + slot * k + (slot - barWidth) / 2,
    mid: (k: number) => box.x + slot * (k + 0.5),
    y: (v: number) => box.y + ((hi - v) / span) * box.height,
  };
}

/** A bar from value `from` to value `to` in column k. */
function bar(ctx: CanvasRenderingContext2D, cols: ReturnType<typeof columns>, k: number, from: number, to: number, colour: string, alpha = 0.85) {
  const y1 = cols.y(from);
  const y2 = cols.y(to);
  fill(ctx, cols.left(k), Math.min(y1, y2), cols.barWidth, Math.max(1, Math.abs(y2 - y1)), colour, alpha);
}

/** Term numbers under the columns: all of them when few, else 1, 5, 10, … */
function indices(ctx: CanvasRenderingContext2D, cols: ReturnType<typeof columns>, count: number, y: number, theme: LabTheme) {
  for (let k = 1; k <= count; k++) {
    if (count <= 10 || k === 1 || k % 5 === 0) label(ctx, String(k), cols.mid(k - 1), y, { color: theme.muted, font: theme.font, align: "center" });
  }
}

const extent = (values: readonly number[]) => [Math.min(0, ...values), Math.max(0, ...values)] as const;

export const seriesRenderer: SimulationRenderer<SeriesLayout> = {
  id: "series",
  layout: (width) => computeSeriesLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, plot } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (text: string) => label(ctx, text, width / 2, height - 16, { color: theme.text, font: theme.font, align: "center" });
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

    const n = Math.max(1, Math.round(num(results.n, 1)));
    const a = num(results.a);
    const d = num(results.d);
    const r = num(results.r);
    const barBox: Box = { ...plot, height: plot.height - 16 };

    if (has("ap")) {
      const terms = seriesApTerms(a, d, n);
      const pairs = has("pairs");
      const pair = num(results.apPair);
      const [lo, hi] = extent(pairs ? [...terms, pair] : terms);
      const cols = columns(barBox, n, lo, hi);
      title(pairs ? "The terms, and the terms reversed on top" : "AP: a, a + d, a + 2d, …");
      for (let k = 0; k < n; k++) {
        const t = terms[k]!;
        bar(ctx, cols, k, 0, t, !pairs && k === n - 1 ? theme.angle : theme.sine);
        if (pairs) bar(ctx, cols, k, t, t + terms[n - 1 - k]!, theme.cosine, 0.55);
      }
      line(ctx, barBox.x, cols.y(0), barBox.x + barBox.width, cols.y(0), theme.axis, 1.25);
      indices(ctx, cols, n, barBox.y + barBox.height + 9, theme);
      if (pairs) {
        ctx.save();
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(barBox.x, Math.min(cols.y(0), cols.y(pair)), barBox.width, Math.abs(cols.y(pair) - cols.y(0)));
        ctx.restore();
        const top = cols.y(pair);
        const above = top - barBox.y > 14;
        label(ctx, "a + l", barBox.x + barBox.width - 2, above ? top - 8 : top + 9, { color: theme.text, font: theme.font, align: "right" });
        caption(words ? `2S = ${n} × ${fmt(pair)}, so S${sub(n)} = ${fmt(num(results.apSum))}` : "Every column adds to a + l; n columns make 2S");
      } else {
        caption(words ? `a${sub(n)} = a + ${n - 1}d = ${fmt(num(results.apTerm))}` : `a = ${fmt(a)}, d = ${fmt(d)}, n = ${n}`);
      }
    }

    if (has("gp")) {
      const terms = seriesGpTerms(a, r, n);
      const limitView = has("limit");
      const top: Box = limitView ? { ...barBox, height: Math.round(barBox.height * 0.46) } : barBox;
      const [lo, hi] = extent(terms);
      const cols = columns(top, n, lo, hi);
      title("GP: a, ar, ar², …");
      for (let k = 0; k < n; k++) bar(ctx, cols, k, 0, terms[k]!, k === n - 1 ? theme.angle : theme.sine);
      line(ctx, top.x, cols.y(0), top.x + top.width, cols.y(0), theme.axis, 1.25);
      indices(ctx, cols, n, top.y + top.height + 9, theme);

      const converges = num(results.converges) === 1;
      const limit = num(results.gpLimit);
      if (limitView) {
        const below: Box = { x: plot.x, y: top.y + top.height + 26, width: plot.width, height: plot.y + plot.height - (top.y + top.height + 26) };
        if (a > 0 && r > 0 && r < 1) {
          // A square of area S∞: each cut takes the fraction 1 − r of what is left.
          const side = Math.min(below.height - 4, below.width * 0.6);
          let x = below.x + (below.width - side) / 2;
          let y = below.y + 2;
          let w = side;
          let h = side;
          for (let k = 0; k < n; k++) {
            const colour = k % 2 === 0 ? theme.sine : theme.cosine;
            if (k % 2 === 0) {
              fill(ctx, x, y, w * (1 - r), h, colour, 0.7);
              x += w * (1 - r);
              w *= r;
            } else {
              fill(ctx, x, y, w, h * (1 - r), colour, 0.7);
              y += h * (1 - r);
              h *= r;
            }
          }
          ctx.save();
          ctx.strokeStyle = theme.axis;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(below.x + (below.width - side) / 2, below.y + 2, side, side);
          ctx.restore();
          const right = below.x + (below.width + side) / 2 + 6;
          label(ctx, "whole: S∞", right, below.y + 10, { color: theme.text, font: theme.font });
          label(ctx, "shaded: Sₙ", right, below.y + 26, { color: theme.sine, font: theme.font });
        } else {
          // The partial sums hop along a line; the sum to infinity, if any, is dashed.
          const sums = seriesPartialSums(terms);
          const [s0, s1] = extent(converges ? [...sums, limit] : sums);
          const span = s1 - s0 || 1;
          const lx = (v: number) => below.x + 8 + ((v - s0) / span) * (below.width - 16);
          const ly = below.y + below.height * 0.7;
          line(ctx, below.x, ly, below.x + below.width, ly, theme.axis, 1.25);
          label(ctx, "0", lx(0), ly + 12, { color: theme.muted, font: theme.font, align: "center" });
          let prev = 0;
          for (let k = 0; k < sums.length; k++) {
            const x1 = lx(prev);
            const x2 = lx(sums[k]!);
            const rise = Math.min(below.height * 0.6, 10 + Math.abs(x2 - x1) * 0.4);
            ctx.save();
            ctx.strokeStyle = theme.sine;
            ctx.globalAlpha = 0.7;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x1, ly);
            ctx.quadraticCurveTo((x1 + x2) / 2, ly - rise, x2, ly);
            ctx.stroke();
            ctx.restore();
            disc(ctx, x2, ly, k === sums.length - 1 ? 5 : 3, k === sums.length - 1 ? theme.angle : theme.sine);
            prev = sums[k]!;
          }
          if (converges) {
            line(ctx, lx(limit), below.y + 4, lx(limit), ly + 6, theme.tangent, 2, [5, 4]);
            label(ctx, "S∞", lx(limit), ly + 14, { color: theme.tangent, font: theme.fontStrong, align: "center" });
          }
        }
      }
      const sn = `S${sub(n)} = ${fmt(num(results.gpSum), 4)}`;
      caption(words ? `${sn} · ${converges ? `S∞ = a/(1 − r) = ${fmt(limit, 4)}` : "|r| ≥ 1: no sum to infinity"}` : `a = ${fmt(a)}, r = ${fmt(r)}, n = ${n}`);
    }

    if (has("means")) {
      const p = num(results.p, 1);
      const q = num(results.q, 1);
      const gm = num(results.gm);
      title("AM and GM of p and q on a semicircle");
      const k = Math.min((plot.width - 16) / (p + q), (plot.height - 40) / ((p + q) / 2));
      // Centre the semicircle in the space, leaving a line under it for p and q.
      const base = Math.min(plot.y + plot.height - 26, plot.y + (plot.height + (k * (p + q)) / 2) / 2 + 10);
      const left = width / 2 - (k * (p + q)) / 2;
      const right = left + k * (p + q);
      const ox = width / 2;
      const cx = left + k * p;
      const radius = (k * (p + q)) / 2;
      const dy = base - k * gm;
      // The foot E of the perpendicular from C to the slanting radius OD; DE is the HM.
      const ux = (cx - ox) / radius;
      const uy = (dy - base) / radius;
      const along = (cx - ox) * ux;
      const ex = ox + ux * along;
      const ey = base + uy * along;

      ctx.save();
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ox, base, radius, Math.PI, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
      line(ctx, left, base, right, base, theme.axis, 2);
      line(ctx, cx, base - 6, cx, base + 6, theme.text, 2);
      line(ctx, ox, base, cx, dy, theme.muted, 1.5, [4, 4]);
      line(ctx, ox, base, ox, base - radius, theme.sine, 3);
      line(ctx, cx, base, cx, dy, theme.cosine, 3);
      line(ctx, cx, base, ex, ey, theme.muted, 1, [3, 3]);
      line(ctx, cx, dy, ex, ey, theme.tangent, 3);
      disc(ctx, ox, base, 3.5, theme.text);
      label(ctx, `p = ${fmt(p)}`, left, base + 14, { color: theme.text, font: theme.font });
      label(ctx, `q = ${fmt(q)}`, right, base + 14, { color: theme.text, font: theme.font, align: "right" });
      if (num(results.meansEqual) === 1) {
        label(ctx, "AM = GM = HM", ox + 8, base - radius / 2, { color: theme.text, font: theme.fontStrong });
      } else {
        const cLeft = cx < ox;
        label(ctx, "AM", cLeft ? ox + 7 : ox - 7, base - radius * 0.62, { color: theme.sine, font: theme.fontStrong, align: cLeft ? "left" : "right" });
        label(ctx, "GM", cLeft ? cx - 7 : cx + 7, base - (k * gm) / 2, { color: theme.cosine, font: theme.fontStrong, align: cLeft ? "right" : "left" });
        label(ctx, "HM", (cx + ex) / 2 + (cLeft ? -10 : 10), (dy + ey) / 2 - 10, { color: theme.tangent, font: theme.fontStrong, align: cLeft ? "right" : "left" });
      }
      const am = num(results.am);
      const hm = num(results.hm);
      const sign = num(results.meansEqual) === 1 ? "=" : "≥";
      caption(words ? `AM ${fmt(am)} ${sign} GM ${fmt(gm)} ${sign} HM ${fmt(hm)}` : "Radius = AM; half-chord at the join = GM");
    }

    if (has("blocks")) {
      const power = Math.round(num(results.power, 1));
      if (power === 1) {
        title("1 + 2 + … + n: a staircase and its copy");
        const u = Math.min(plot.width / n, (plot.height - 6) / (n + 1));
        const x0 = width / 2 - (u * n) / 2;
        const y0 = plot.y + (plot.height - u * (n + 1)) / 2;
        for (let k = 1; k <= n; k++) {
          const x = x0 + (k - 1) * u;
          fill(ctx, x, y0 + u * (n + 1 - k), u, u * k, theme.sine, 0.8);
          fill(ctx, x, y0, u, u * (n + 1 - k), theme.cosine, 0.35);
        }
        grid(ctx, x0, y0, n, n + 1, u, theme);
        caption(words ? `n(n + 1)/2 = ${n}·${n + 1}/2 = ${fmt(num(results.sumK))}` : "Two staircases make an n by n + 1 rectangle");
      } else if (power === 2) {
        title("1² + 2² + … + n²: squares side by side");
        const m = Math.min(n, SERIES_SQUARES_DRAWN);
        const total = (m * (m + 1)) / 2;
        const u = Math.min(plot.width / total, (plot.height - 22) / m);
        let x = width / 2 - (u * total) / 2;
        const floor = plot.y + plot.height - 4;
        for (let k = 1; k <= m; k++) {
          fill(ctx, x, floor - u * k, u * k, u * k, k % 2 === 0 ? theme.cosine : theme.sine, 0.75);
          grid(ctx, x, floor - u * k, k, k, u, theme);
          x += u * k;
        }
        if (n > m) label(ctx, `first ${m} squares drawn`, plot.x + plot.width, plot.y + 6, { color: theme.muted, font: theme.font, align: "right" });
        caption(words ? `n(n + 1)(2n + 1)/6 = ${fmt(num(results.sumK2))}` : "Count the unit blocks");
      } else {
        title("1³ + 2³ + … + n³ = (1 + 2 + … + n)²");
        const t = (k: number) => (k * (k + 1)) / 2;
        const side = Math.min(plot.width, plot.height - 6);
        const scale = side / t(n);
        const x0 = width / 2 - side / 2;
        const y0 = plot.y + (plot.height - side) / 2;
        // Largest first: each smaller square is painted over, leaving band k (k³ blocks) showing.
        for (let k = n; k >= 1; k--) fill(ctx, x0, y0, t(k) * scale, t(k) * scale, k % 2 === 0 ? theme.cosine : theme.sine, 0.4 + 0.4 * (k % 2));
        for (let k = 1; k <= n; k++) {
          const thick = k * scale;
          if (thick >= 18) label(ctx, `${k}³`, x0 + (t(k - 1) + k / 2) * scale, y0 + (t(k - 1) + k / 2) * scale, { color: theme.text, font: theme.font, align: "center" });
        }
        ctx.save();
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x0, y0, side, side);
        ctx.restore();
        caption(words ? `(n(n + 1)/2)² = ${t(n)}² = ${fmt(num(results.sumK3))}` : "Each L-shaped band holds k³ blocks");
      }
    }

    if (has("agp")) {
      title("S = r + 2r² + 3r³ + …: times r, subtract");
      const terms = seriesAgpTerms(r, n);
      const shifted = terms.map((t) => t * r);
      const gp = seriesGpTerms(r, r, n);
      const tail = -num(results.agpTail);
      const big = Math.max(1e-9, ...terms.map(Math.abs), ...shifted.map(Math.abs), ...gp.map(Math.abs), Math.abs(tail));
      const nameWidth = 46;
      const rowHeight = (plot.height - 16) / 3;
      const rows = [
        { name: "S", values: terms.map((v, k) => [k, v] as const), colour: theme.sine },
        { name: "rS", values: shifted.map((v, k) => [k + 1, v] as const), colour: theme.cosine },
        { name: "S − rS", values: [...gp.map((v, k) => [k, v] as const), [n, tail] as const], colour: theme.tangent },
      ];
      rows.forEach((row, i) => {
        const box: Box = { x: plot.x + nameWidth, y: plot.y + i * rowHeight + 3, width: plot.width - nameWidth, height: rowHeight - 6 };
        const cols = columns(box, n + 1, -big, big);
        line(ctx, box.x, cols.y(0), box.x + box.width, cols.y(0), theme.axis, 1);
        for (const [k, v] of row.values) bar(ctx, cols, k, 0, v, i === 2 && k === n ? theme.secant : row.colour);
        label(ctx, row.name, plot.x, box.y + box.height / 2, { color: row.colour, font: theme.fontStrong });
        if (i === 2) indices(ctx, cols, n + 1, plot.y + plot.height - 7, theme);
      });
      const converges = num(results.converges) === 1;
      const sn = `S${sub(n)} = ${fmt(num(results.agpSum), 4)}`;
      caption(words ? `${sn} · ${converges ? `S∞ = r/(1 − r)² = ${fmt(num(results.agpLimit), 4)}` : "|r| ≥ 1: no sum to infinity"}` : "(1 − r)S = r + r² + … + rⁿ − n·rⁿ⁺¹");
    }
  },
};

/** Unit-cell lines over a block of cols × rows cells, when the cells are big enough to see. */
function grid(ctx: CanvasRenderingContext2D, x0: number, y0: number, cols: number, rows: number, u: number, theme: LabTheme) {
  if (u < 5) return;
  ctx.save();
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= cols; i++) {
    ctx.moveTo(x0 + i * u, y0);
    ctx.lineTo(x0 + i * u, y0 + rows * u);
  }
  for (let j = 0; j <= rows; j++) {
    ctx.moveTo(x0, y0 + j * u);
    ctx.lineTo(x0 + cols * u, y0 + j * u);
  }
  ctx.stroke();
  ctx.restore();
}
