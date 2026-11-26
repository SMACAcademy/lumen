/**
 * A molecular orbital diagram for a homonuclear diatomic molecule.
 *
 * Each atom's 1s, 2s and 2p orbitals at the sides; the molecular orbitals
 * they make in the middle, lowest at the bottom, in the order they fill for
 * this element (π2p below σ2p up to nitrogen, above it after). Dashed lines
 * join each pair of atomic orbitals to the bonding and antibonding orbitals
 * they form, and every electron is an arrow.
 */

import { diatomicFormula, fillMOs, MO_SYMBOLS, orbitalOrder } from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface MOLayout {
  width: number;
  height: number;
  compact: boolean;
  box: number;
  step: number;
  bottom: number;
}

export function computeMOLayout(width: number): MOLayout {
  const compact = width < 560;
  const height = compact ? 380 : 400;
  const bottom = height - 60;
  return { width, height, compact, box: compact ? 20 : 24, step: (bottom - 60) / 7, bottom };
}

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

/** Boxes centred on x, holding these electron counts. */
function boxes(ctx: CanvasRenderingContext2D, cx: number, y: number, box: number, counts: readonly number[], theme: LabTheme, outline: string) {
  const w = counts.length * box + (counts.length - 1) * 3;
  counts.forEach((k, i) => {
    const bx = cx - w / 2 + i * (box + 3);
    ctx.save();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx, y - box / 2, box, box);
    ctx.restore();
    if (k >= 1) spin(ctx, bx + box * 0.33, y, box * 0.34, true, theme.sine);
    if (k >= 2) spin(ctx, bx + box * 0.67, y, box * 0.34, false, theme.cosine);
  });
  return w;
}

/** A neutral atom's 1s, 2s and 2p electrons, 2p filled by Hund's rule. */
export function atomicFilling(Z: number): { s1: number; s2: number; p2: number[] } {
  const s1 = Math.min(Z, 2);
  const s2 = clamp(Z - 2, 0, 2);
  const p = clamp(Z - 4, 0, 6);
  return { s1, s2, p2: [0, 1, 2].map((i) => (p > i + 3 ? 2 : p > i ? 1 : 0)) };
}

const dashed = (ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string) => {
  ctx.save();
  ctx.setLineDash([3, 4]);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
};

export const moRenderer: SimulationRenderer<MOLayout> = {
  id: "mo",
  layout: (width) => computeMOLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, box, step, bottom, compact } = layout;
    ctx.clearRect(0, 0, width, height);

    const Z = clamp(Math.round(num(results.Z, 8)), 1, 10);
    const charge = Math.round(num(results.charge));
    const order = orbitalOrder(Z);
    const filled = fillMOs(Z, num(results.electrons));
    const yOf = (i: number) => bottom - i * step;
    const midX = width / 2;
    const leftX = compact ? 46 : width * 0.16;
    const rightX = width - leftX;

    label(ctx, diatomicFormula(Z, charge), 14, 18, { color: theme.text, font: "700 18px ui-sans-serif, system-ui, sans-serif", align: "left" });

    if (has("diagram")) {
      // Atomic orbitals sit halfway between the bonding and antibonding orbitals they make.
      const idx = (id: string) => order.findIndex((m) => m.id === id);
      const s1y = (yOf(idx("s1s")) + yOf(idx("s1s*"))) / 2;
      const s2y = (yOf(idx("s2s")) + yOf(idx("s2s*"))) / 2;
      const p2y = (yOf(4) + yOf(6)) / 2 + step * 0.5;
      const atom = atomicFilling(Z);
      const sym = MO_SYMBOLS[Z] ?? "";
      for (const x of [leftX, rightX]) {
        boxes(ctx, x, s1y, box, [atom.s1], theme, theme.axis);
        boxes(ctx, x, s2y, box, [atom.s2], theme, theme.axis);
        boxes(ctx, x, p2y, box, atom.p2, theme, theme.axis);
        label(ctx, sym, x, bottom + 26, { color: theme.muted, font: theme.fontStrong, align: "center" });
      }
      // Above the boxes, so nothing runs off the left edge on a phone.
      for (const [text, y] of [["1s", s1y], ["2s", s2y], ["2p", p2y]] as const) label(ctx, text, leftX, y - box / 2 - 8, { color: theme.muted, font: theme.font, align: "center" });

      order.forEach((m, i) => {
        const y = yOf(i);
        const outline = m.bonding ? theme.tangent : theme.secant;
        const w = boxes(ctx, midX, y, box, filled[i]!, theme, outline);
        label(ctx, m.label, midX + w / 2 + 8, y, { color: m.bonding ? theme.tangent : theme.secant, font: theme.font, align: "left" });
        // Join to the atomic orbitals it comes from.
        const aoY = m.id.includes("1s") ? s1y : m.id.includes("2s") ? s2y : p2y;
        const aoHalf = m.id.includes("2p") ? (3 * box) / 2 + 3 : box / 2;
        dashed(ctx, leftX + aoHalf, aoY, midX - w / 2, y, theme.grid);
        dashed(ctx, rightX - aoHalf, aoY, midX + w / 2, y, theme.grid);
      });
      label(ctx, "energy ↑", 14, 40, { color: theme.muted, font: theme.font, align: "left" });
    }

    if (has("labels")) {
      const nb = num(results.bonding);
      const na = num(results.antibonding);
      const bo = num(results.bondOrder);
      const unpaired = num(results.unpaired);
      const magnet = unpaired > 0 ? `${unpaired} unpaired: paramagnetic` : "all paired: diamagnetic";
      const verdict = bo > 0 ? `bond order ${bo}` : "bond order 0: no molecule";
      label(ctx, `(${nb} − ${na}) / 2 → ${verdict} · ${magnet}`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
      if (num(results.hasLength) === 1)
        label(ctx, `${num(results.bondLength)} pm · ${num(results.bondEnthalpy)} kJ/mol`, width - 14, 18, { color: theme.muted, font: theme.font, align: "right" });
    }
  },
};
