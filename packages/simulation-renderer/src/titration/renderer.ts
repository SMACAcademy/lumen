/**
 * A burette over a flask, and the titration curve being drawn as the base
 * goes in.
 *
 * The flask shows what the indicator shows — colourless, then pink the drop
 * the pH passes 8.2 — and the curve beside it is the model's own pH at every
 * volume, so the jump at the equivalence point is exactly as steep as the
 * chemistry makes it. The indicator's range is drawn across the curve: a good
 * indicator's band sits inside the jump.
 */

import { ACID_ORDER, ACID_VOLUME, BURETTE_MAX, INDICATOR_ORDER, INDICATORS, pHAt, type TitrationParams } from "@ise/chemistry-engine";
import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

export interface TitrationLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Burette, flask and pH meter. */
  apparatus: Rect;
  /** pH against volume added. */
  chart: Rect;
}

export function computeTitrationLayout(width: number): TitrationLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(220, width - 2 * pad);
  if (compact) {
    const apparatus = { x: pad, y: pad, width: inner, height: 250 };
    const chart = { x: pad + 34, y: pad + 250 + 26, width: inner - 46, height: clamp(inner * 0.6, 180, 240) };
    return { width, height: Math.ceil(chart.y + chart.height + 30), compact, apparatus, chart };
  }
  const aw = Math.round(inner * 0.32);
  const height = 320;
  const apparatus = { x: pad, y: pad, width: aw, height };
  const chart = { x: pad + aw + 44, y: pad + 12, width: inner - aw - 56, height: height - 44 };
  return { width, height: Math.ceil(height + 24), compact, apparatus, chart };
}

/** The colours the indicators actually turn, keyed by their words. */
const INK: Record<string, string> = {
  colourless: "rgba(186, 230, 253, 0.18)",
  "pale pink": "#f9a8d4",
  pink: "#ec4899",
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#facc15",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  magenta: "#d946ef",
  "reddish-brown": "#b45309",
};

/** The colour of the solution for an indicator and a pH. */
export function solutionColour(indicator: number, pH: number): string {
  const id = INDICATOR_ORDER[indicator] ?? "phenolphthalein";
  const { range, colours } = INDICATORS[id];
  const word = pH < range[0] ? colours[0] : pH > range[1] ? colours[2] : colours[1];
  return INK[word] ?? INK.colourless!;
}

/** Recover the parameters the curve needs from the results. */
function paramsFrom(results: Results): TitrationParams {
  const acid = ACID_ORDER[num(results.acid)] ?? "hcl";
  return { acid, Ca: num(results.Ca, 0.1), Cb: num(results.Cb, 0.1), indicator: INDICATOR_ORDER[num(results.indicator)] ?? "phenolphthalein" };
}

// The whole curve is the same until the acid or the concentrations change, so draw it from a cache.
const curveCache = new Map<string, [number, number][]>();
export function titrationCurve(params: TitrationParams, samples = 240): [number, number][] {
  const key = `${params.acid}|${params.Ca}|${params.Cb}|${samples}`;
  const hit = curveCache.get(key);
  if (hit) return hit;
  const points: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const v = (BURETTE_MAX * i) / samples;
    points.push([v, pHAt(params, v)]);
  }
  // Add points right around the equivalence point, where the curve is steepest.
  const veq = (params.Ca * ACID_VOLUME) / params.Cb;
  for (const d of [-0.2, -0.05, -0.01, 0, 0.01, 0.05, 0.2]) {
    const v = veq + d;
    if (v > 0 && v < BURETTE_MAX) points.push([v, pHAt(params, v)]);
  }
  points.sort((a, b) => a[0] - b[0]);
  if (curveCache.size > 32) curveCache.clear();
  curveCache.set(key, points);
  return points;
}

export const titrationRenderer: SimulationRenderer<TitrationLayout> = {
  id: "titration",
  layout: (width) => computeTitrationLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const Vb = num(results.Vb);
    const pH = num(results.pH, 7);
    const Veq = num(results.equivalenceVolume, 25);
    const low = num(results.indicatorLow);
    const high = num(results.indicatorHigh);
    const indicator = num(results.indicator);
    const colour = solutionColour(indicator, pH);
    const { apparatus } = layout;
    const cx = apparatus.x + apparatus.width * 0.42;

    // ── The burette ───────────────────────────────────────────────────────
    const tube = { top: apparatus.y + 8, bottom: apparatus.y + apparatus.height * 0.5, half: 7 };
    if (has("apparatus")) {
      const fill = 1 - Vb / BURETTE_MAX;
      const liquidTop = tube.bottom - (tube.bottom - tube.top - 6) * fill;
      ctx.save();
      ctx.globalAlpha = dim("apparatus");
      ctx.fillStyle = theme.sine;
      ctx.globalAlpha = 0.35 * dim("apparatus");
      ctx.fillRect(cx - tube.half, liquidTop, tube.half * 2, tube.bottom - liquidTop);
      ctx.globalAlpha = dim("apparatus");
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - tube.half, tube.top, tube.half * 2, tube.bottom - tube.top);
      // Graduations every 10 mL.
      ctx.lineWidth = 1;
      for (let mL = 0; mL <= BURETTE_MAX; mL += 10) {
        const y = tube.top + 3 + ((tube.bottom - tube.top - 6) * mL) / BURETTE_MAX;
        segment(ctx, cx + tube.half - 5, y, cx + tube.half, y);
      }
      // Tap and tip.
      ctx.lineWidth = 2;
      segment(ctx, cx, tube.bottom, cx, tube.bottom + 18);
      segment(ctx, cx - 8, tube.bottom + 6, cx + 8, tube.bottom + 6);
      ctx.restore();
    }

    // ── The flask, in the indicator's colour ──────────────────────────────
    const flask = { neckTop: tube.bottom + 26, bottom: apparatus.y + apparatus.height - 34, halfNeck: 12, halfBase: Math.min(62, apparatus.width * 0.36) };
    if (has("solution")) {
      const bodyTop = flask.neckTop + 22;
      const volumeShare = clamp((ACID_VOLUME + Vb) / (ACID_VOLUME + BURETTE_MAX), 0, 1);
      const liquidTop = flask.bottom - (flask.bottom - bodyTop) * (0.35 + 0.45 * volumeShare);
      const halfAt = (y: number) => flask.halfNeck + (flask.halfBase - flask.halfNeck) * clamp((y - bodyTop) / (flask.bottom - bodyTop), 0, 1);
      ctx.save();
      ctx.globalAlpha = dim("solution");
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.moveTo(cx - halfAt(liquidTop), liquidTop);
      ctx.lineTo(cx + halfAt(liquidTop), liquidTop);
      ctx.lineTo(cx + flask.halfBase, flask.bottom);
      ctx.lineTo(cx - flask.halfBase, flask.bottom);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx - flask.halfNeck, flask.neckTop);
      ctx.lineTo(cx - flask.halfNeck, bodyTop);
      ctx.lineTo(cx - flask.halfBase, flask.bottom);
      ctx.lineTo(cx + flask.halfBase, flask.bottom);
      ctx.lineTo(cx + flask.halfNeck, bodyTop);
      ctx.lineTo(cx + flask.halfNeck, flask.neckTop);
      ctx.stroke();
      ctx.restore();
    }

    if (has("labels")) {
      const meterX = apparatus.x + apparatus.width - 4;
      label(ctx, `pH ${formatNumber(pH, 2)}`, meterX, apparatus.y + apparatus.height * 0.6, {
        color: theme.text,
        font: theme.fontStrong,
        align: "right",
        background: theme.surface2,
      });
      label(ctx, `${formatNumber(Vb, 2)} mL added`, apparatus.x + 2, apparatus.y + apparatus.height - 12, { color: theme.sine, font: theme.font });
      label(ctx, `${formatNumber(Veq, 2)} mL to neutralise`, apparatus.x + 2, apparatus.y + apparatus.height + 4, { color: theme.muted, font: theme.font });
    }

    // ── The titration curve ───────────────────────────────────────────────
    if (has("curve")) {
      const plane = createPlane(layout.chart, [0, BURETTE_MAX], [0, 14]);
      drawPlane(ctx, plane, theme, { xLabel: "NaOH added / mL", yLabel: "pH" });

      if (has("indicator-band")) {
        const [, yHigh] = plane.toPx(0, high);
        const [, yLow] = plane.toPx(0, low);
        ctx.save();
        ctx.globalAlpha = 0.22 * dim("indicator-band");
        ctx.fillStyle = solutionColour(indicator, high + 1);
        ctx.fillRect(plane.rect.x, yHigh, plane.rect.width, yLow - yHigh);
        ctx.restore();
        if (has("labels")) {
          const name = INDICATORS[INDICATOR_ORDER[indicator] ?? "phenolphthalein"].label;
          label(ctx, `${name} changes here`, plane.rect.x + 6, (yHigh + yLow) / 2, { color: theme.text, font: theme.font, background: theme.background });
        }
      }

      if (has("buffer") && num(results.strong) < 0.5) {
        const [x1] = plane.toPx(0.1 * Veq, 0);
        const [x2] = plane.toPx(0.9 * Veq, 0);
        ctx.save();
        ctx.globalAlpha = 0.12 * dim("buffer");
        ctx.fillStyle = theme.tangent;
        ctx.fillRect(x1, plane.rect.y, x2 - x1, plane.rect.height);
        ctx.restore();
        const [hx, hy] = plane.toPx(Veq / 2, num(results.pHAtHalf));
        ctx.save();
        ctx.globalAlpha = dim("buffer");
        ctx.fillStyle = theme.tangent;
        ctx.beginPath();
        ctx.arc(hx, hy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (has("labels")) {
          label(ctx, "buffer region", (x1 + x2) / 2, plane.rect.y + 14, { color: theme.tangent, font: theme.font, align: "center" });
          label(ctx, `half-way: pH = pKa = ${formatNumber(num(results.pKa), 2)}`, hx + 8, hy - 14, { color: theme.tangent, font: theme.font, background: theme.background });
        }
      }

      const points = titrationCurve(paramsFrom(results));
      ctx.save();
      clipToPlane(ctx, plane);
      ctx.globalAlpha = dim("curve");
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      points.forEach(([v, p], i) => {
        const [px, py] = plane.toPx(v, p);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();

      if (has("equivalence")) {
        const [ex, ey] = plane.toPx(Veq, num(results.pHAtEquivalence));
        ctx.save();
        ctx.globalAlpha = dim("equivalence");
        ctx.strokeStyle = theme.angle;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.25;
        segment(ctx, ex, plane.rect.y, ex, plane.rect.y + plane.rect.height);
        ctx.setLineDash([]);
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.arc(ex, ey, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        if (has("labels")) {
          label(ctx, `equivalence: pH ${formatNumber(num(results.pHAtEquivalence), 2)}`, Math.min(ex + 8, plane.rect.x + plane.rect.width - 150), ey + 16, {
            color: theme.angle,
            font: theme.font,
            background: theme.background,
          });
        }
      }

      const [cx2, cy2] = plane.toPx(Vb, pH);
      ctx.save();
      ctx.globalAlpha = dim("curve");
      ctx.fillStyle = theme.point;
      ctx.beginPath();
      ctx.arc(cx2, cy2, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  /** Click or drag along the curve to add that much base. */
  pick(layout, x, y, locked) {
    const plane = createPlane(layout.chart, [0, BURETTE_MAX], [0, 14]);
    if (locked !== "curve" && (locked || !plane.contains(x, y, 8))) return null;
    const [mL] = plane.fromPx(x, y);
    return { writes: [{ variable: "Vb", value: clamp(mL, 0, BURETTE_MAX) }], region: "curve", press: "sweep" };
  },
};
