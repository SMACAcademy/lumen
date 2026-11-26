/**
 * A sparingly soluble salt in a beaker.
 *
 * Dissolve: solid at the bottom, its ions above, and under the beaker a
 * scale of solubility in powers of ten — where this salt sits in pure
 * water, and where it moves to when a common ion is stirred in. The ions
 * drawn follow that scale (a few more for each power of ten), since the
 * real numbers differ a billion-fold.
 *
 * Precipitate: two solutions mixed. The scale now shows the ionic product Q
 * against Ksp; once Q passes Ksp the beaker clouds and solid settles.
 */

import { SPARINGLY_SOLUBLE, SPARINGLY_SOLUBLE_ORDER } from "@ise/chemistry-engine";
import { formatSignificant } from "@ise/units";
import { clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface KspLayout {
  width: number;
  height: number;
  compact: boolean;
  beaker: { x: number; y: number; width: number; height: number };
  /** The log scale under the beaker. */
  scale: { x1: number; x2: number; y: number };
}

export function computeKspLayout(width: number): KspLayout {
  const compact = width < 560;
  const height = compact ? 330 : 360;
  const bw = compact ? 140 : 180;
  const bh = compact ? 140 : 160;
  return {
    width,
    height,
    compact,
    beaker: { x: width / 2 - bw / 2 - (compact ? 30 : 0), y: 54, width: bw, height: bh },
    scale: { x1: 30, x2: width - 30, y: height - 64 },
  };
}

/** The solubility scale runs from 10⁻¹² to 10⁻¹ mol/L; the Q scale six powers of ten either side of Ksp. */
export const SOLUBILITY_DECADES: readonly [number, number] = [-12, -1];
export const Q_DECADES: readonly [number, number] = [-6, 6];

/** Where a log value sits along a scale, clamped to its ends. */
export function scaleX(layout: KspLayout, value: number, decades: readonly [number, number]): number {
  const f = clamp((value - decades[0]) / (decades[1] - decades[0]), 0, 1);
  return layout.scale.x1 + f * (layout.scale.x2 - layout.scale.x1);
}

/** How many formula units' worth of ions to draw for a solubility of 10^log mol/L. */
export function ionsShown(logSolubility: number): number {
  return clamp(Math.round((logSolubility + 12) * 1.4), 1, 14);
}

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
const power = (n: number) => `10${String(n).split("").map((c) => SUPERSCRIPT[c] ?? c).join("")}`;
const sci = (v: number) => formatSignificant(v, 2);

function scatter(i: number): [number, number] {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return [a - Math.floor(a), b - Math.floor(b)];
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function pointer(ctx: CanvasRenderingContext2D, x: number, y: number, colour: string, hollow = false) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - 3);
  ctx.lineTo(x - 6, y - 15);
  ctx.lineTo(x + 6, y - 15);
  ctx.closePath();
  if (hollow) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    ctx.fillStyle = colour;
    ctx.fill();
  }
  ctx.restore();
}

function drawScale(ctx: CanvasRenderingContext2D, layout: KspLayout, theme: LabTheme, decades: readonly [number, number], every: number, name: (n: number) => string) {
  const { x1, x2, y } = layout.scale;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  for (let n = decades[0]; n <= decades[1]; n++) {
    const x = scaleX(layout, n, decades);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + ((n - decades[0]) % every === 0 ? 7 : 4));
  }
  ctx.stroke();
  ctx.restore();
  for (let n = decades[0]; n <= decades[1]; n += every) {
    label(ctx, name(n), scaleX(layout, n, decades), y + 17, { color: theme.muted, font: theme.font, align: "center" });
  }
}

export const kspRenderer: SimulationRenderer<KspLayout> = {
  id: "ksp",
  layout: (width) => computeKspLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, beaker } = layout;
    ctx.clearRect(0, 0, width, height);

    const salt = SPARINGLY_SOLUBLE[SPARINGLY_SOLUBLE_ORDER[Math.round(num(results.salt))] ?? "agcl"];
    const mixing = has("ionic");
    const cloudy = mixing && num(results.precipitates) === 1;
    const common = num(results.common);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const count = (n: number, ion: string) => (n === 1 ? ion : `${n}${ion}`);

    label(ctx, `${salt.formula}(s) ⇌ ${count(salt.x, salt.cation)} + ${count(salt.y, salt.anion)}`, width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
    label(ctx, `Ksp = ${sci(salt.ksp)}`, width / 2, 35, { color: theme.muted, font: theme.font, align: "center" });

    if (has("beaker")) {
      const { x, y, width: bw, height: bh } = beaker;
      const top = y + 14;
      const bottom = y + bh;
      const solid = !mixing || cloudy;
      const heap = solid ? 16 : 0;
      ctx.save();
      ctx.fillStyle = cloudy ? theme.neutral : theme.sine;
      ctx.globalAlpha = cloudy ? 0.3 : 0.14;
      ctx.fillRect(x, top, bw, bottom - top);
      ctx.restore();
      if (solid) {
        ctx.save();
        ctx.fillStyle = theme.neutral;
        ctx.beginPath();
        ctx.moveTo(x + 2, bottom - 1);
        ctx.quadraticCurveTo(x + bw / 2, bottom - heap * 2, x + bw - 2, bottom - 1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, bottom);
      ctx.lineTo(x + bw, bottom);
      ctx.lineTo(x + bw, y);
      ctx.stroke();
      ctx.restore();

      const units = ionsShown(num(results.logDissolved, -5));
      const cations = mixing ? clamp(Math.round((12 - num(results.pCation, 6)) * 1.6), 1, 18) : units * salt.x;
      const anions = mixing ? clamp(Math.round((12 - num(results.pAnion, 6)) * 1.6), 1, 18) : units * salt.y + Math.round(Math.sqrt(common) * 40);
      const place = (i: number, colour: string) => {
        const [u, v] = scatter(i);
        disc(ctx, x + 8 + u * (bw - 16), top + 8 + v * (bottom - heap - top - 16), 3.5, colour);
      };
      for (let i = 0; i < cations; i++) place(i + 1, theme.sine);
      for (let i = 0; i < anions; i++) place(i + 101, theme.cosine);

      const lx = x + bw + 14;
      disc(ctx, lx + 4, y + 28, 4.5, theme.sine);
      label(ctx, salt.cation, lx + 14, y + 28, { color: theme.text, font: theme.font });
      disc(ctx, lx + 4, y + 48, 4.5, theme.cosine);
      label(ctx, salt.anion, lx + 14, y + 48, { color: theme.text, font: theme.font });
      if (solid) label(ctx, cloudy ? "precipitate" : "solid", lx, bottom - 8, { color: theme.muted, font: theme.font });
      if (!mixing && common > 0) label(ctx, `+ ${salt.source}`, lx, y + 72, { color: theme.cosine, font: theme.font });
    }

    if (has("scale")) {
      drawScale(ctx, layout, theme, SOLUBILITY_DECADES, 3, power);
      label(ctx, "solubility / mol L⁻¹", layout.scale.x2, layout.scale.y - 26, { color: theme.muted, font: theme.font, align: "right" });
      if (has("labels")) {
        const pure = num(results.solubility);
        const now = num(results.dissolved);
        if (common > 0) pointer(ctx, scaleX(layout, Math.log10(pure), SOLUBILITY_DECADES), layout.scale.y, theme.muted, true);
        pointer(ctx, scaleX(layout, Math.log10(now), SOLUBILITY_DECADES), layout.scale.y, theme.angle);
        if (common > 0) {
          const times = num(results.suppression);
          const fold = times < 1e5 ? String(Number(times.toPrecision(2))) : sci(times);
          caption(`${formatSignificant(common, 2)} M ${salt.anion}: S = ${sci(now)} mol/L, ${fold}× less`);
        } else {
          caption(`In pure water S = ${sci(pure)} mol/L`);
        }
      }
    }

    if (mixing) {
      drawScale(ctx, layout, theme, Q_DECADES, 3, (n) => (n === 0 ? "Ksp" : `${n > 0 ? "×" : "÷"} ${power(Math.abs(n))}`));
      const mid = scaleX(layout, 0, Q_DECADES);
      label(ctx, "stays clear", (layout.scale.x1 + mid) / 2, layout.scale.y - 26, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, "precipitates", (mid + layout.scale.x2) / 2, layout.scale.y - 26, { color: theme.muted, font: theme.font, align: "center" });
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(mid, layout.scale.y - 36);
      ctx.lineTo(mid, layout.scale.y);
      ctx.stroke();
      ctx.restore();
      if (has("labels")) {
        const over = num(results.logQOverK);
        pointer(ctx, scaleX(layout, over, Q_DECADES), layout.scale.y, theme.angle);
        const saturation = num(results.saturation);
        const verdict = saturation > 0 ? "> Ksp: a precipitate forms" : saturation < 0 ? "< Ksp: stays clear" : "= Ksp: just saturated";
        caption(`Q = ${sci(10 ** num(results.logQ))} ${verdict}`);
      }
    }
  },
};
