/**
 * The 3d transition metals.
 *
 * Across the top, the row from Sc to Zn with the chosen element lit. Ions:
 * the species it forms in this oxidation state, its five d orbitals filled
 * by Hund's rule, and a tube of its solution in its colour. States: every
 * oxidation state of every element as a dot, the highest joined by a line
 * that climbs to manganese's +7 and falls away after it.
 */

import { COLOUR_NAMES, FIRST_Z, LAST_Z, TRANSITION_ELEMENTS, transitionSpecies } from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface TransitionLayout {
  width: number;
  height: number;
  compact: boolean;
  tile: number;
}

export function computeTransitionLayout(width: number): TransitionLayout {
  const compact = width < 560;
  return { width, height: compact ? 330 : 350, compact, tile: Math.min(52, (width - 16) / 10) };
}

export const SOLUTION_COLOURS: Readonly<Record<string, string>> = {
  colourless: "transparent",
  purple: "#7e22ce",
  blue: "#2563eb",
  green: "#16a34a",
  violet: "#8b5cf6",
  yellow: "#eab308",
  orange: "#ea580c",
  pink: "#f472b6",
  brown: "#78350f",
  metallic: "#9ca3af",
};

const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (n: number) => [...String(n)].map((d) => SUPERSCRIPT[Number(d)]).join("");

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

/** Five d boxes holding `d` electrons, singly first. */
export function drawDBoxes(ctx: CanvasRenderingContext2D, x: number, y: number, box: number, d: number, theme: LabTheme) {
  for (let i = 0; i < 5; i++) {
    const bx = x + i * (box + 4);
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(bx, y - box / 2, box, box);
    ctx.restore();
    if (i < Math.min(d, 5)) spin(ctx, bx + box * 0.33, y, box * 0.34, true, theme.sine);
    if (i < d - 5) spin(ctx, bx + box * 0.67, y, box * 0.34, false, theme.cosine);
  }
}

export const transitionRenderer: SimulationRenderer<TransitionLayout> = {
  id: "transition",
  layout: (width) => computeTransitionLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, tile, compact } = layout;
    ctx.clearRect(0, 0, width, height);

    const Z = clamp(Math.round(num(results.Z, 26)), FIRST_Z, LAST_Z);
    const ox = Math.round(num(results.ox));
    const el = TRANSITION_ELEMENTS[Z]!;
    const stripX = (width - tile * 10) / 2;

    if (has("strip")) {
      for (let z = FIRST_Z; z <= LAST_Z; z++) {
        const x = stripX + (z - FIRST_Z) * tile;
        const on = z === Z;
        ctx.save();
        ctx.fillStyle = on ? theme.accent : theme.surface;
        ctx.globalAlpha = on ? 0.3 : 1;
        ctx.fillRect(x + 1, 8, tile - 2, tile - 2);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = on ? theme.accent : theme.axis;
        ctx.lineWidth = on ? 2 : 1;
        ctx.strokeRect(x + 1, 8, tile - 2, tile - 2);
        ctx.restore();
        label(ctx, TRANSITION_ELEMENTS[z]!.symbol, x + tile / 2, 8 + tile / 2 - 3, { color: theme.text, font: theme.fontStrong, align: "center" });
        label(ctx, String(z), x + tile / 2, 8 + tile - 10, { color: theme.muted, font: compact ? "10px ui-sans-serif, system-ui, sans-serif" : theme.font, align: "center" });
      }
    }

    const top = 8 + tile + 18;

    if (has("ion")) {
      const species = transitionSpecies(Z, ox);
      label(ctx, species.formula, 16, top + 14, { color: theme.text, font: "700 22px ui-sans-serif, system-ui, sans-serif", align: "left" });
      const d = Math.round(num(results.dCount));
      label(ctx, `${el.name}, ${ox === 0 ? "the metal" : `oxidation state +${ox}`} · 3d${sup(d)}`, 16, top + 40, { color: theme.muted, font: theme.font, align: "left" });
    }

    if (has("dboxes")) {
      const box = compact ? 24 : 28;
      drawDBoxes(ctx, 16, top + 80, box, Math.round(num(results.dCount)), theme);
      label(ctx, "3d", 16 + 5 * (box + 4) + 6, top + 80, { color: theme.muted, font: theme.fontStrong, align: "left" });
    }

    if (has("solution")) {
      const colourName = COLOUR_NAMES[Math.round(num(results.colour))] ?? "colourless";
      const tw = compact ? 56 : 70;
      const tx = width - tw - 20;
      const ty = top;
      const th = compact ? 120 : 140;
      const fill = SOLUTION_COLOURS[colourName] ?? "transparent";
      if (fill !== "transparent") {
        ctx.save();
        ctx.fillStyle = fill;
        ctx.globalAlpha = colourName === "metallic" ? 0.9 : 0.75;
        ctx.fillRect(tx, ty + (colourName === "metallic" ? th * 0.55 : th * 0.25), tw, colourName === "metallic" ? th * 0.45 : th * 0.75);
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx, ty + th);
      ctx.lineTo(tx + tw, ty + th);
      ctx.lineTo(tx + tw, ty);
      ctx.stroke();
      ctx.restore();
      label(ctx, colourName === "metallic" ? "the metal" : colourName, tx + tw / 2, ty + th + 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    }

    if (has("states")) {
      const left = stripX;
      const bottomY = height - 50;
      const topY = top + 6;
      const yOf = (s: number) => bottomY - (s / 7) * (bottomY - topY);
      ctx.save();
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      for (let s = 0; s <= 7; s++) {
        ctx.beginPath();
        ctx.moveTo(left, yOf(s));
        ctx.lineTo(left + tile * 10, yOf(s));
        ctx.stroke();
      }
      ctx.restore();
      for (let s = 1; s <= 7; s++) label(ctx, `+${s}`, left - 4, yOf(s), { color: theme.muted, font: theme.font, align: "right" });
      const peak: [number, number][] = [];
      for (let z = FIRST_Z; z <= LAST_Z; z++) {
        const x = left + (z - FIRST_Z + 0.5) * tile;
        const states = TRANSITION_ELEMENTS[z]!.states;
        peak.push([x, yOf(Math.max(...states))]);
        for (const s of states) {
          ctx.save();
          ctx.fillStyle = z === Z && s === ox ? theme.angle : theme.sine;
          ctx.beginPath();
          ctx.arc(x, yOf(s), z === Z && s === ox ? 7 : 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      ctx.save();
      ctx.strokeStyle = theme.cosine;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      peak.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.restore();
    }

    if (has("labels")) {
      const unpaired = Math.round(num(results.unpaired));
      const moment = num(results.moment);
      let words: string;
      if (has("states")) words = `${el.name}: states ${el.states.map((s) => `+${s}`).join(", ")} — the most is manganese's +7, all its 3d and 4s electrons`;
      else if (ox === 0) words = `${el.name} metal${unpaired ? `: ${unpaired} unpaired electron${unpaired === 1 ? "" : "s"}` : ""}`;
      else if (num(results.chargeTransfer) === 1) words = `Coloured by charge transfer between O and ${el.symbol}, not by d–d jumps`;
      else if (num(results.coloured) === 1) words = `${unpaired} unpaired: μ = √(${unpaired} × ${unpaired + 2}) = ${moment.toFixed(2)} BM · coloured by d–d jumps`;
      else words = `3d${sup(Math.round(num(results.dCount)))}: no d–d jump to make, so colourless${unpaired ? "" : " and diamagnetic"}`;
      label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
