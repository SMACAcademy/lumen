/**
 * Pure solvent and solution, side by side at one temperature, with a
 * thermometer strip that marks where each freezes and boils.
 *
 * Drag the temperature down and the pure beaker freezes first; up, and it
 * boils first. The dissolved particles are drawn — salt as separate ions,
 * ethanoic acid in benzene as pairs — because counting them is the whole of
 * the chapter. An optional plot shows why: the solution's vapour pressure
 * curve sits below the solvent's, so it has to be hotter to reach 1 atm.
 */

import { SOLUTE_ORDER, SOLVENT_ORDER, SOLVENTS, T_RANGE, vapourPressure } from "@ise/chemistry-engine";
import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface ColligativeLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The two beakers. */
  beakers: Rect;
  /** The temperature strip. */
  strip: Rect;
  /** Vapour pressure near the boiling point; zero height when hidden. */
  vapour: Rect;
}

export function computeColligativeLayout(width: number, showVapour = false): ColligativeLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(240, width - 2 * pad);
  const vapourHeight = showVapour ? (compact ? 170 : 150) : 0;
  if (compact) {
    const beakers = { x: pad, y: pad + 4, width: inner, height: 190 };
    const strip = { x: pad + 12, y: beakers.y + beakers.height + 34, width: inner - 24, height: 60 };
    const vapour = { x: pad + 40, y: strip.y + strip.height + (showVapour ? 40 : 0), width: inner - 52, height: vapourHeight };
    return { width, height: Math.ceil(vapour.y + vapourHeight + 26), compact, beakers, strip, vapour };
  }
  const beakersWidth = showVapour ? Math.round(inner * 0.58) : inner;
  const beakers = { x: pad, y: pad + 4, width: beakersWidth, height: 200 };
  const strip = { x: pad + 16, y: beakers.y + beakers.height + 34, width: inner - 32, height: 60 };
  const vapour = { x: pad + beakersWidth + 56, y: pad + 12, width: inner - beakersWidth - 66, height: vapourHeight };
  return { width, height: Math.ceil(strip.y + strip.height + 24), compact, beakers, strip, vapour };
}

/** Horizontal position of a temperature on the strip. */
export function stripX(layout: ColligativeLayout, T: number): number {
  const { strip } = layout;
  return strip.x + ((clamp(T, T_RANGE[0], T_RANGE[1]) - T_RANGE[0]) / (T_RANGE[1] - T_RANGE[0])) * strip.width;
}

function hash(i: number, c: number): number {
  const x = Math.sin(i * 91.7 + c * 47.3) * 43758.5453;
  return x - Math.floor(x);
}

const PHASE_WORDS = ["frozen", "liquid", "boiling"] as const;

function drawBeaker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, phase: number, theme: LabTheme, alpha: number) {
  const liquidTop = y + h * 0.25;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (phase === 0) {
    // Ice: pale, with a few crystal lines.
    ctx.fillStyle = theme.point;
    ctx.globalAlpha = 0.28 * alpha;
    ctx.fillRect(x + 2, liquidTop, w - 4, y + h - liquidTop - 2);
    ctx.globalAlpha = 0.5 * alpha;
    ctx.strokeStyle = theme.point;
    ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      const cx = x + w * (0.15 + 0.14 * k);
      const cy = liquidTop + (y + h - liquidTop) * (0.3 + 0.4 * hash(k, 3));
      segment(ctx, cx - 6, cy, cx + 6, cy);
      segment(ctx, cx - 3, cy - 5, cx + 3, cy + 5);
      segment(ctx, cx + 3, cy - 5, cx - 3, cy + 5);
    }
  } else {
    ctx.fillStyle = theme.sine;
    ctx.globalAlpha = 0.25 * alpha;
    ctx.fillRect(x + 2, liquidTop, w - 4, y + h - liquidTop - 2);
    if (phase === 2) {
      ctx.globalAlpha = 0.8 * alpha;
      ctx.strokeStyle = theme.point;
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 9; k++) {
        ctx.beginPath();
        ctx.arc(x + w * (0.12 + 0.1 * k), liquidTop + (y + h - liquidTop) * (0.2 + 0.6 * hash(k, 5)), 3 + (k % 3), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

export function beakerGeometry(layout: ColligativeLayout) {
  const { beakers } = layout;
  const w = Math.min(160, beakers.width * 0.36);
  const h = beakers.height - 46;
  const y = beakers.y + 26;
  return { w, h, y, pureX: beakers.x + beakers.width * 0.25 - w / 2, solutionX: beakers.x + beakers.width * 0.75 - w / 2 };
}

export const colligativeRenderer: SimulationRenderer<ColligativeLayout> = {
  id: "colligative",
  layout: (width, _graphs, layers) => computeColligativeLayout(width, layers.has("vapour")),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const solvent = SOLVENTS[SOLVENT_ORDER[num(results.solvent)] ?? "water"];
    const soluteId = SOLUTE_ORDER[num(results.solute)] ?? "glucose";
    const T = num(results.T);
    const i = num(results.i, 1);
    const particles = num(results.particles);
    const g = beakerGeometry(layout);

    // ── The two beakers ───────────────────────────────────────────────────
    if (has("beakers")) {
      drawBeaker(ctx, g.pureX, g.y, g.w, g.h, Math.round(num(results.statePure)), theme, dim("beakers"));
      drawBeaker(ctx, g.solutionX, g.y, g.w, g.h, Math.round(num(results.stateSolution)), theme, dim("beakers"));
      if (has("labels")) {
        label(ctx, `pure ${solvent.label.toLowerCase()} · ${PHASE_WORDS[num(results.statePure)] ?? ""}`, g.pureX + g.w / 2, g.y - 14, { color: theme.text, font: theme.fontStrong, align: "center" });
        label(ctx, `solution · ${PHASE_WORDS[num(results.stateSolution)] ?? ""}`, g.solutionX + g.w / 2, g.y - 14, { color: theme.text, font: theme.fontStrong, align: "center" });
        label(ctx, `${formatNumber(T, 1)} °C`, layout.beakers.x + layout.beakers.width / 2, g.y + g.h / 2, { color: theme.cosine, font: theme.fontStrong, align: "center", background: theme.background });
      }
    }

    // ── Dissolved particles: what the colligative properties count ────────
    if (has("particles")) {
      const formulaUnits = Math.round(clamp(num(results.m) * 10, 0, 24));
      const liquidTop = g.y + g.h * 0.25;
      const pairs = i < 1;
      const pieces = pairs ? 1 : Math.round(i);
      ctx.save();
      ctx.globalAlpha = dim("particles");
      let k = 0;
      for (let u = 0; u < formulaUnits; u++) {
        const cx = g.solutionX + 12 + hash(u, 1) * (g.w - 24);
        const cy = liquidTop + 10 + hash(u, 2) * (g.y + g.h - liquidTop - 20);
        if (pairs) {
          // Ethanoic acid in benzene: two molecules held together, counting as one particle.
          ctx.fillStyle = theme.angle;
          ctx.beginPath();
          ctx.arc(cx - 3, cy, 3.5, 0, Math.PI * 2);
          ctx.arc(cx + 4, cy, 3.5, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        for (let p = 0; p < pieces; p++, k++) {
          // Ions drift apart: cations and anions in two colours.
          const ox = pieces > 1 ? (hash(k, 4) - 0.5) * 18 : 0;
          const oy = pieces > 1 ? (hash(k, 5) - 0.5) * 18 : 0;
          ctx.fillStyle = pieces === 1 ? theme.angle : p === 0 ? theme.vector : theme.tangent;
          ctx.beginPath();
          ctx.arc(clamp(cx + ox, g.solutionX + 6, g.solutionX + g.w - 6), cy + oy, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      if (has("labels")) {
        const what = soluteId === "ethanoic" && pairs ? "dimers" : pieces > 1 ? `${pieces} ions each` : "molecules";
        label(ctx, `i = ${formatNumber(i, i % 1 ? 1 : 0)} (${what}) · ${formatNumber(particles, 2)} mol particles/kg`, g.solutionX + g.w / 2, g.y + g.h + 14, {
          color: theme.muted,
          font: theme.font,
          align: "center",
        });
      }
    }

    // ── The thermometer strip ─────────────────────────────────────────────
    if (has("strip")) {
      const { strip } = layout;
      const mid = strip.y + strip.height / 2;
      ctx.save();
      ctx.globalAlpha = dim("strip");
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      segment(ctx, strip.x, mid, strip.x + strip.width, mid);
      const marks: [number, string, boolean][] = [
        [num(results.TfPure), theme.muted, true],
        [num(results.TbPure), theme.muted, true],
        [num(results.TfSolution), theme.sine, false],
        [num(results.TbSolution), theme.cosine, false],
      ];
      for (const [t, colour, pure] of marks) {
        ctx.strokeStyle = colour;
        ctx.lineWidth = pure ? 2 : 3;
        const x = stripX(layout, t);
        segment(ctx, x, mid - (pure ? 10 : 14), x, mid + (pure ? 10 : 14));
      }
      ctx.fillStyle = theme.point;
      ctx.beginPath();
      ctx.arc(stripX(layout, T), mid, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (has("labels")) {
        for (let t = -20; t <= 120; t += 20) label(ctx, `${t}`, stripX(layout, t), mid + 18, { color: theme.muted, font: theme.font, align: "center", baseline: "top" });
        label(ctx, `ΔTf = ${formatNumber(num(results.deltaTf), 2)} K`, stripX(layout, num(results.TfSolution)), strip.y - 4, { color: theme.sine, font: theme.font, align: "center", background: theme.background });
        label(ctx, `ΔTb = ${formatNumber(num(results.deltaTb), 2)} K`, stripX(layout, num(results.TbSolution)), strip.y - 4, { color: theme.cosine, font: theme.font, align: "center", background: theme.background });
        label(ctx, "°C", strip.x + strip.width, mid + 18, { color: theme.muted, font: theme.font, align: "right", baseline: "top" });
      }
    }

    // ── Why: vapour pressure near the boiling point ───────────────────────
    if (has("vapour") && layout.vapour.height > 0) {
      const x0 = solvent.Tb - 12;
      const x1 = solvent.Tb + Math.max(6, num(results.deltaTb) * 3);
      const plane = createPlane(layout.vapour, [x0, x1], [0.6, 1.25]);
      drawPlane(ctx, plane, theme, { xLabel: "°C", yLabel: "vapour pressure / atm" });
      const lowering = num(results.relativeLowering);
      const curve = (scale: number, colour: string) => {
        ctx.save();
        clipToPlane(ctx, plane);
        ctx.globalAlpha = dim("vapour");
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2.25;
        ctx.beginPath();
        for (let s = 0; s <= 80; s++) {
          const t = x0 + ((x1 - x0) * s) / 80;
          const [px, py] = plane.toPx(t, vapourPressure(solvent, t) * scale);
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      };
      curve(1, theme.muted);
      curve(1 - lowering, theme.cosine);
      const [ax, ay] = plane.toPx(x0, 1);
      const [bx] = plane.toPx(x1, 1);
      ctx.save();
      ctx.globalAlpha = dim("vapour");
      ctx.strokeStyle = theme.angle;
      ctx.setLineDash([4, 4]);
      segment(ctx, ax, ay, bx, ay);
      ctx.restore();
      if (has("labels")) label(ctx, "1 atm: boiling", bx - 4, ay - 10, { color: theme.angle, font: theme.font, align: "right" });
    }
  },

  /** Drag along the strip to set the temperature. */
  pick(layout, x, y, locked, _results: Results) {
    const { strip } = layout;
    const inside = x >= strip.x - 8 && x <= strip.x + strip.width + 8 && y >= strip.y - 16 && y <= strip.y + strip.height + 8;
    if (locked !== "strip" && (locked || !inside)) return null;
    const T = T_RANGE[0] + ((clamp(x, strip.x, strip.x + strip.width) - strip.x) / strip.width) * (T_RANGE[1] - T_RANGE[0]);
    return { writes: [{ variable: "T", value: T }], region: "strip", press: "sweep" };
  },
};
