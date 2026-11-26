/**
 * Crystal field splitting in an octahedral complex.
 *
 * On the left, the five d orbitals of the free ion at one energy; on the
 * right, the same five split by the ligands: three t₂g boxes below, two eg
 * boxes above, the gap Δo drawn to scale and filled with the complex's
 * electrons — high spin or low. Below, the visible spectrum with the band
 * the complex absorbs marked, and a swatch of the colour left over.
 */

import { COMPLEX_COLOURS, COMPLEX_METAL_ORDER, COMPLEX_METALS, complexFormula, fillOctahedral, LIGANDS } from "@ise/chemistry-engine";
import { wavelengthColor } from "../hydrogen/renderer";
import { clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹", "¹⁰"];

export interface CrystalLayout {
  width: number;
  height: number;
  compact: boolean;
  box: number;
}

export function computeCrystalLayout(width: number): CrystalLayout {
  const compact = width < 560;
  return { width, height: compact ? 340 : 360, compact, box: compact ? 22 : 26 };
}

/** Pixels per cm⁻¹ of Δo: the largest splitting fills about 130 px. */
export const PX_PER_WAVENUMBER = 130 / 50000;

export const SEEN_COLOURS: Readonly<Record<string, string>> = {
  colourless: "transparent",
  "pale yellow": "#fef3c7",
  yellow: "#facc15",
  orange: "#fb923c",
  violet: "#8b5cf6",
  blue: "#3b82f6",
  green: "#22c55e",
  "very pale": "#e5e7eb",
};

function spin(ctx: CanvasRenderingContext2D, x: number, y: number, half: number, up: boolean, colour: string) {
  const dir = up ? 1 : -1;
  const tip = y - dir * half;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + dir * half);
  ctx.lineTo(x, tip);
  ctx.lineTo(x - dir * 4, tip + dir * 5);
  ctx.stroke();
  ctx.restore();
}

function boxes(ctx: CanvasRenderingContext2D, x: number, y: number, box: number, counts: readonly number[], theme: LabTheme) {
  counts.forEach((k, i) => {
    const bx = x + i * (box + 4);
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx, y - box / 2, box, box);
    ctx.restore();
    if (k >= 1) spin(ctx, bx + box * 0.33, y, box * 0.34, true, theme.sine);
    if (k >= 2) spin(ctx, bx + box * 0.67, y, box * 0.34, false, theme.cosine);
  });
}

export const crystalRenderer: SimulationRenderer<CrystalLayout> = {
  id: "crystal",
  layout: (width) => computeCrystalLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, box, compact } = layout;
    ctx.clearRect(0, 0, width, height);

    const metal = COMPLEX_METALS[COMPLEX_METAL_ORDER[Math.round(num(results.metal))] ?? "ti3"];
    const ligand = LIGANDS[clamp(Math.round(num(results.ligand)), 0, LIGANDS.length - 1)]!;
    const deltaO = num(results.deltaO);
    const lowSpin = num(results.lowSpin) === 1;

    label(ctx, complexFormula(metal, ligand), 14, 18, { color: theme.text, font: "700 18px ui-sans-serif, system-ui, sans-serif", align: "left" });
    label(ctx, `${metal.display}, d${SUPERSCRIPT[metal.d] ?? metal.d}, with ${ligand.name}`, 14, 40, { color: theme.muted, font: theme.font, align: "left" });

    if (has("splitting")) {
      const centreY = compact ? 150 : 160;
      const gap = Math.max(26, deltaO * PX_PER_WAVENUMBER);
      const t2gY = centreY + 0.4 * gap;
      const egY = centreY - 0.6 * gap;
      const freeX = compact ? 14 : 30;
      const freeW = compact ? 70 : 100;
      const splitX = freeX + freeW + (compact ? 50 : 80);

      // The free ion's five d orbitals, all at one energy.
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const x = freeX + (i * freeW) / 5;
        ctx.beginPath();
        ctx.moveTo(x + 2, centreY);
        ctx.lineTo(x + freeW / 5 - 2, centreY);
        ctx.stroke();
      }
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(freeX + freeW, centreY);
      ctx.lineTo(splitX - 4, egY);
      ctx.moveTo(freeX + freeW, centreY);
      ctx.lineTo(splitX - 4, t2gY);
      ctx.stroke();
      ctx.restore();
      label(ctx, "free ion", freeX + freeW / 2, centreY + 16, { color: theme.muted, font: theme.font, align: "center" });

      const { t2g, eg } = fillOctahedral(metal.d, lowSpin);
      boxes(ctx, splitX, t2gY, box, t2g, theme);
      boxes(ctx, splitX + (box + 4) / 2, egY, box, eg, theme);
      const tagX = splitX + 3 * (box + 4) + 6;
      // e with a subscript g (Unicode has no subscript g).
      label(ctx, "e", tagX, egY, { color: theme.cosine, font: theme.fontStrong, align: "left" });
      label(ctx, "g", tagX + 8, egY + 5, { color: theme.cosine, font: theme.font, align: "left" });
      label(ctx, "t₂g", tagX, t2gY, { color: theme.sine, font: theme.fontStrong, align: "left" });

      // Δo, to scale.
      const ax = tagX + 34;
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ax, t2gY);
      ctx.lineTo(ax, egY);
      ctx.moveTo(ax - 4, egY + 6);
      ctx.lineTo(ax, egY);
      ctx.lineTo(ax + 4, egY + 6);
      ctx.moveTo(ax - 4, t2gY - 6);
      ctx.lineTo(ax, t2gY);
      ctx.lineTo(ax + 4, t2gY - 6);
      ctx.stroke();
      ctx.restore();
      label(ctx, "Δo", ax + 8, (egY + t2gY) / 2 - 8, { color: theme.angle, font: theme.fontStrong, align: "left" });
      label(ctx, `${Math.round(deltaO).toLocaleString("en-IN")} cm⁻¹`, ax + 8, (egY + t2gY) / 2 + 8, { color: theme.angle, font: theme.font, align: "left" });

      // Answers to estimates, so only with the words on.
      const cfse = num(results.cfse);
      if (has("labels")) label(ctx, `CFSE = ${cfse === 0 ? "0" : `${cfse < 0 ? "−" : "+"}${Math.abs(cfse)} Δo`}`, splitX, t2gY + box + 6, { color: theme.text, font: theme.font, align: "left" });
    }

    if (has("spectrum")) {
      const y = height - 74;
      const x0 = 30;
      const x1 = width - (compact ? 90 : 120);
      const nmToX = (nm: number) => x0 + ((nm - 380) / (780 - 380)) * (x1 - x0);
      for (let nm = 380; nm < 780; nm += 5) {
        ctx.save();
        ctx.fillStyle = wavelengthColor(nm + 2.5, theme);
        ctx.fillRect(nmToX(nm), y, nmToX(nm + 5) - nmToX(nm) + 0.5, 14);
        ctx.restore();
      }
      const absorbed = num(results.absorbed);
      if (num(results.coloured) === 1) {
        const ax = clamp(nmToX(absorbed), x0 - 12, x1 + 12);
        ctx.save();
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ax, y - 8);
        ctx.lineTo(ax, y + 22);
        ctx.stroke();
        ctx.restore();
        const where = absorbed < 380 ? "UV" : absorbed > 780 ? "IR" : `${Math.round(absorbed)} nm`;
        if (has("labels")) label(ctx, `absorbs ${where}`, clamp(ax, x0 + 30, x1 - 30), y - 16, { color: theme.text, font: theme.font, align: "center" });
      }
      label(ctx, "400", nmToX(400), y + 26, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, "700 nm", nmToX(700), y + 26, { color: theme.muted, font: theme.font, align: "center" });

      const seen = COMPLEX_COLOURS[Math.round(num(results.colour))] ?? "colourless";
      const sx = width - (compact ? 70 : 96);
      const fill = SEEN_COLOURS[seen] ?? "transparent";
      ctx.save();
      if (fill !== "transparent") {
        ctx.fillStyle = fill;
        ctx.fillRect(sx, y - 20, compact ? 50 : 70, 40);
      }
      ctx.strokeStyle = theme.axis;
      ctx.strokeRect(sx, y - 20, compact ? 50 : 70, 40);
      ctx.restore();
      label(ctx, seen, sx + (compact ? 25 : 35), y + 32, { color: theme.text, font: theme.fontStrong, align: "center" });
    }

    if (has("labels")) {
      const unpaired = Math.round(num(results.unpaired));
      const P = num(results.pairing);
      let words: string;
      if (num(results.spinChoice) === 1)
        words = lowSpin
          ? `Δo > P (${P.toLocaleString("en-IN")} cm⁻¹): pair up in t₂g — low spin, ${unpaired} unpaired`
          : `Δo < P (${P.toLocaleString("en-IN")} cm⁻¹): spread into eg — high spin, ${unpaired} unpaired`;
      else if (metal.d === 0 || metal.d === 10) words = `d${SUPERSCRIPT[metal.d]}: no d–d jump, so colourless`;
      else words = `d${SUPERSCRIPT[metal.d] ?? metal.d}: only one way to fill — ${unpaired} unpaired, whatever the ligand`;
      label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
