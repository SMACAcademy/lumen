/**
 * A flask of reacting molecules beside the concentration–time graph.
 *
 * In a first-order reaction every molecule of A has the same chance of
 * reacting in the next minute, whatever the others are doing. So the flask
 * does not simulate collisions; it shows the count the rate law gives — the
 * number of molecules that have turned into B is exactly what the curve beside
 * it says, spread through the flask. The half-life is then something to
 * watch happen: half of A gone, then half of what is left.
 */

import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

export interface KineticsLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The flask of molecules. */
  flask: Rect;
  /** [A] and [B] against time. */
  chart: Rect;
  /** ln[A] against time, when shown; zero height otherwise. */
  log: Rect;
}

/** How many molecules the flask shows. */
export const MOLECULES = 80;

export function computeKineticsLayout(width: number, showLog = false): KineticsLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(200, width - 2 * pad);
  const logHeight = showLog ? (compact ? 150 : 130) : 0;
  if (compact) {
    const flaskHeight = clamp(inner * 0.62, 190, 250);
    const chartHeight = clamp(inner * 0.55, 170, 220);
    const flask = { x: pad, y: pad, width: inner, height: flaskHeight };
    const chart = { x: pad + 44, y: pad + flaskHeight + 24, width: inner - 56, height: chartHeight };
    const log = { x: chart.x, y: chart.y + chartHeight + (showLog ? 40 : 0), width: chart.width, height: logHeight };
    return { width, height: Math.ceil(log.y + logHeight + 30), compact, flask, chart, log };
  }
  const flaskWidth = Math.round(inner * 0.36);
  const height = clamp(flaskWidth * 1.05, 260, 340);
  const flask = { x: pad, y: pad, width: flaskWidth, height };
  const chartX = pad + flaskWidth + 56;
  const chartWidth = inner - flaskWidth - 68;
  const chartHeight = showLog ? height - logHeight - 60 : height - 40;
  const chart = { x: chartX, y: pad + 12, width: chartWidth, height: chartHeight };
  const log = { x: chartX, y: chart.y + chartHeight + 44, width: chartWidth, height: logHeight };
  return { width, height: Math.ceil(height + 40), compact, flask, chart, log };
}

/** A fixed, well-mixed pseudo-random number for molecule i and channel c. */
function hash(i: number, c: number): number {
  const x = Math.sin(i * 127.1 + c * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** How many molecules the flask shows for a starting concentration: more A, more molecules. */
export function moleculesShown(a0: number): number {
  return Math.round(clamp(MOLECULES * (a0 / 2), 8, MOLECULES));
}

/**
 * Which of the shown molecules have turned into B. Each gets a fixed place in
 * a shuffled queue, so the ones that react are spread through the flask and a
 * molecule, once reacted, stays reacted; exactly round(N × fraction) are B.
 */
export function reactedMolecules(shown: number, fractionReacted: number): boolean[] {
  const queue = Array.from({ length: shown }, (_, i) => i).sort((a, b) => hash(a, 7) - hash(b, 7));
  const count = Math.round(shown * clamp(fractionReacted, 0, 1));
  const reacted = new Array<boolean>(shown).fill(false);
  for (let r = 0; r < count; r++) reacted[queue[r]!] = true;
  return reacted;
}

/** The liquid inside the flask, as a trapezoid (the conical body) under a neck. */
export function flaskGeometry(layout: KineticsLayout) {
  const { flask } = layout;
  const cx = flask.x + flask.width / 2;
  const bottom = flask.y + flask.height - 30;
  // The readout sits above the flask, so the neck starts below its four lines.
  const neckTop = flask.y + 70;
  const bodyTop = Math.max(neckTop + 24, flask.y + flask.height * 0.42);
  const halfBase = Math.min(flask.width * 0.44, (bottom - bodyTop) * 0.9);
  const halfNeck = Math.max(14, halfBase * 0.26);
  const liquidTop = bodyTop + (bottom - bodyTop) * 0.12;
  return { cx, bottom, bodyTop, halfBase, halfNeck, neckTop, liquidTop };
}

/** Half-width of the flask's body at height y. */
function halfWidthAt(g: ReturnType<typeof flaskGeometry>, y: number): number {
  const t = clamp((y - g.bodyTop) / (g.bottom - g.bodyTop), 0, 1);
  return g.halfNeck + (g.halfBase - g.halfNeck) * t;
}

function drawCurve(ctx: CanvasRenderingContext2D, plane: Plane, f: (t: number) => number, to: number, color: string, width: number, dash: number[] = []) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  const steps = 160;
  for (let s = 0; s <= steps; s++) {
    const t = (to * s) / steps;
    const [px, py] = plane.toPx(t, f(t));
    if (s === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

export const kineticsRenderer: SimulationRenderer<KineticsLayout> = {
  id: "kinetics",
  layout: (width, _graphs, layers) => computeKineticsLayout(width, layers.has("logplot")),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const t = num(results.t);
    const a0 = Math.max(1e-6, num(results.a0, 1));
    const k = Math.max(1e-9, num(results.k, 0.1));
    const A = num(results.concentration);
    const end = Math.max(1e-6, num(results.runEnd, 60));
    const halfLife = num(results.halfLife);
    const reacted = clamp(1 - num(results.fractionLeft, 1), 0, 1);
    const colorA = theme.cosine;
    const colorB = theme.tangent;

    // ── The flask ─────────────────────────────────────────────────────────
    const g = flaskGeometry(layout);
    if (has("flask")) {
      ctx.save();
      ctx.globalAlpha = dim("flask");
      // The liquid, faintly.
      ctx.fillStyle = theme.sine;
      ctx.globalAlpha = 0.1 * dim("flask");
      ctx.beginPath();
      ctx.moveTo(g.cx - halfWidthAt(g, g.liquidTop), g.liquidTop);
      ctx.lineTo(g.cx + halfWidthAt(g, g.liquidTop), g.liquidTop);
      ctx.lineTo(g.cx + g.halfBase, g.bottom);
      ctx.lineTo(g.cx - g.halfBase, g.bottom);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = dim("flask");
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(g.cx - g.halfNeck, g.neckTop);
      ctx.lineTo(g.cx - g.halfNeck, g.bodyTop);
      ctx.lineTo(g.cx - g.halfBase, g.bottom);
      ctx.lineTo(g.cx + g.halfBase, g.bottom);
      ctx.lineTo(g.cx + g.halfNeck, g.bodyTop);
      ctx.lineTo(g.cx + g.halfNeck, g.neckTop);
      ctx.stroke();
      ctx.restore();
    }

    if (has("particles")) {
      const shown = moleculesShown(a0);
      const isB = reactedMolecules(shown, reacted);
      ctx.save();
      ctx.globalAlpha = dim("particles");
      for (let i = 0; i < shown; i++) {
        // A fixed home in the liquid, and a small wander that follows the clock.
        const v = hash(i, 2);
        const y = g.liquidTop + 10 + v * (g.bottom - g.liquidTop - 18);
        const half = halfWidthAt(g, y) - 9;
        const u = hash(i, 1) * 2 - 1;
        const x = g.cx + u * half + Math.sin(t * 1.7 + i) * 3;
        const yy = y + Math.cos(t * 1.3 + i * 1.7) * 3;
        ctx.fillStyle = isB[i] ? colorB : colorA;
        ctx.beginPath();
        ctx.arc(x, yy, isB[i] ? 4 : 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (has("labels")) {
      const { flask } = layout;
      const lines: [string, string][] = [
        [`A  ${formatNumber(A, 3)} mol/L`, colorA],
        [`B  ${formatNumber(num(results.product), 3)} mol/L`, colorB],
        [`t = ${formatNumber(t, 1)} min · ${formatNumber(num(results.halfLives), 2)} half-lives`, theme.text],
        [`${formatNumber(num(results.T), 0)} K · k = ${formatNumber(k, 3)} min⁻¹`, theme.muted],
      ];
      lines.forEach(([text, color], i) => {
        label(ctx, text, flask.x + 2, flask.y + 6 + i * 15, { color, font: i < 2 ? theme.fontStrong : theme.font, baseline: "top", background: theme.background });
      });
    }

    // ── Concentration against time ────────────────────────────────────────
    if (has("curve")) {
      const plane = createPlane(layout.chart, [0, end], [0, a0 * 1.08]);
      drawPlane(ctx, plane, theme, { xLabel: "t / min", yLabel: "mol/L" });
      ctx.save();
      ctx.globalAlpha = dim("curve");
      drawCurve(ctx, plane, (s) => a0 - a0 * Math.exp(-k * s), end, colorB, 2, [6, 4]);
      drawCurve(ctx, plane, (s) => a0 * Math.exp(-k * s), end, colorA, 2.75);
      ctx.restore();

      // Half-lives: down to a half, a quarter, an eighth, each the same time apart.
      if (has("halflives") && halfLife > 0) {
        ctx.save();
        ctx.globalAlpha = 0.75 * dim("halflives");
        ctx.strokeStyle = theme.angle;
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.25;
        for (let i = 1; i <= 3 && i * halfLife <= end; i++) {
          const [px, py] = plane.toPx(i * halfLife, a0 / 2 ** i);
          const [, base] = plane.toPx(0, 0);
          const [left] = plane.toPx(0, 0);
          segment(ctx, px, py, px, base);
          segment(ctx, left, py, px, py);
        }
        ctx.restore();
        if (has("labels")) {
          for (let i = 1; i <= 3 && i * halfLife <= end; i++) {
            const [px, py] = plane.toPx(i * halfLife, a0 / 2 ** i);
            label(ctx, i === 1 ? "t½" : `${i}t½`, px + 4, py - 10, { color: theme.angle, font: theme.font, background: theme.background });
          }
        }
      }

      // The rate is the slope: the tangent to the curve where we are.
      const [cx, cy] = plane.toPx(t, A);
      if (has("tangent")) {
        const slope = -k * A;
        const span = end * 0.18;
        const [x1, y1] = plane.toPx(t - span, A - slope * span);
        const [x2, y2] = plane.toPx(t + span, A + slope * span);
        ctx.save();
        clipToPlane(ctx, plane);
        ctx.globalAlpha = dim("tangent");
        ctx.strokeStyle = theme.secant;
        ctx.lineWidth = 2;
        segment(ctx, x1, y1, x2, y2);
        ctx.restore();
        if (has("labels")) {
          // Pinned to the corner, where it never collides with the half-life marks.
          label(ctx, `rate ${formatNumber(num(results.rate), 3)} mol L⁻¹ min⁻¹`, plane.rect.x + plane.rect.width - 4, plane.rect.y + 4, {
            color: theme.secant,
            font: theme.font,
            align: "right",
            baseline: "top",
            background: theme.background,
          });
        }
      }
      ctx.save();
      ctx.globalAlpha = dim("curve");
      ctx.fillStyle = theme.point;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── ln[A] against time: first order makes it a straight line ─────────
    if (has("logplot") && layout.log.height > 0) {
      const top = Math.log(a0);
      const bottom = top - k * end;
      const plane = createPlane(layout.log, [0, end], [bottom - 0.3, top + 0.3]);
      drawPlane(ctx, plane, theme, { xLabel: "t / min", yLabel: "ln [A]" });
      ctx.save();
      ctx.globalAlpha = dim("logplot");
      drawCurve(ctx, plane, (s) => top - k * s, end, theme.curve, 2.5);
      const [px, py] = plane.toPx(t, top - k * t);
      ctx.fillStyle = theme.point;
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (has("labels")) {
        label(ctx, `slope = −k = −${formatNumber(k, 3)} min⁻¹`, plane.rect.x + plane.rect.width - 4, plane.rect.y + 4, {
          color: theme.curve,
          font: theme.font,
          align: "right",
          baseline: "top",
          background: theme.background,
        });
      }
    }
  },

  /** Clicking or dragging along either graph moves the clock. */
  pick(layout, x, y, locked, results: Results) {
    const end = Math.max(1e-6, num(results.runEnd, 60));
    for (const [region, rect] of [
      ["chart", layout.chart],
      ["log", layout.log],
    ] as const) {
      if (rect.height <= 0) continue;
      const plane = createPlane(rect, [0, end], [0, 1]);
      if (locked === region || (!locked && plane.contains(x, y, 8))) {
        const [minutes] = plane.fromPx(x, y);
        return { writes: [{ variable: "t", value: clamp(minutes, 0, end) }], region, press: "sweep" };
      }
    }
    return null;
  },
};
