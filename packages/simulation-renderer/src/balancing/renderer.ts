/**
 * An equation to balance, drawn as molecules and a tally of atoms.
 *
 * Across the top, the equation with its numbers in front. Below it, each
 * substance drawn that many times as a little cluster of coloured atoms —
 * reactants on the left of the arrow, products on the right. At the bottom,
 * a tally: every element's atoms on each side, ticked when they match.
 */

import { elementsOf, BALANCING_ORDER, BALANCING_REACTIONS, type BalancingSpecies } from "@ise/chemistry-engine";
import { arrow, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface BalancingLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Baseline of the equation. */
  equationY: number;
  /** Top of the molecules. */
  moleculesY: number;
  atomRadius: number;
  /** Top of the tally. */
  tallyY: number;
  rowHeight: number;
}

export function computeBalancingLayout(width: number): BalancingLayout {
  const compact = width < 560;
  const atomRadius = compact ? 5.5 : 7;
  const moleculesY = compact ? 48 : 56;
  // Room for six molecules stacked.
  const tallyY = moleculesY + 6 * (atomRadius * 2 + 6) + 18;
  const rowHeight = compact ? 18 : 20;
  return { width, height: tallyY + rowHeight * 6 + 30, compact, equationY: compact ? 20 : 24, moleculesY, atomRadius, tallyY, rowHeight };
}

export const ATOM_COLOURS: Readonly<Record<string, string>> = {
  H: "#e2e8f0",
  O: "#ef4444",
  N: "#3b82f6",
  C: "#475569",
  Mg: "#86efac",
  Fe: "#b45309",
  Ca: "#fde68a",
  Zn: "#94a3b8",
  Cl: "#22c55e",
  Cu: "#f97316",
  S: "#facc15",
  Ba: "#2dd4bf",
  Na: "#a78bfa",
};

/** The atoms of one molecule as a flat list, e.g. H₂O → O, H, H. */
function atomList(species: BalancingSpecies): string[] {
  return Object.entries(species.atoms).flatMap(([el, n]) => Array.from({ length: n }, () => el));
}

function molecule(ctx: CanvasRenderingContext2D, species: BalancingSpecies, cx: number, cy: number, r: number, theme: LabTheme) {
  const atoms = atomList(species);
  const step = r * 1.6;
  const x0 = cx - ((atoms.length - 1) * step) / 2;
  ctx.save();
  // An outline keeps pale atoms (hydrogen) visible on a light background.
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1;
  atoms.forEach((el, i) => {
    ctx.fillStyle = ATOM_COLOURS[el] ?? theme.neutral;
    ctx.beginPath();
    ctx.arc(x0 + i * step, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

export const balancingRenderer: SimulationRenderer<BalancingLayout> = {
  id: "balancing",
  layout: (width) => computeBalancingLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, compact, atomRadius: r } = layout;
    ctx.clearRect(0, 0, width, layout.height);

    const reaction = BALANCING_REACTIONS[BALANCING_ORDER[Math.round(num(results.reaction))] ?? "water"];
    const species = [...reaction.reactants, ...reaction.products];
    const coefficients = [results.c1, results.c2, results.c3, results.c4].map((c) => Math.max(1, Math.round(num(c, 1))));
    const nLeft = reaction.reactants.length;
    const balanced = num(results.balanced) === 1;

    // Columns: reactants share the left half, products the right, with the arrow between.
    const mid = width / 2;
    const gutter = compact ? 14 : 22;
    const columnX = species.map((_, i) => {
      const isLeft = i < nLeft;
      const n = isLeft ? nLeft : species.length - nLeft;
      const k = isLeft ? i : i - nLeft;
      const from = isLeft ? 8 : mid + gutter;
      const to = isLeft ? mid - gutter : width - 8;
      return from + ((k + 0.5) * (to - from)) / n;
    });

    if (has("equation")) {
      const font = compact ? theme.fontStrong : "600 16px ui-sans-serif, system-ui, sans-serif";
      species.forEach((s, i) => {
        const text = `${coefficients[i]} ${s.formula}`;
        label(ctx, text, columnX[i] ?? mid, layout.equationY, { color: theme.text, font, align: "center" });
        const nextOnSameSide = i + 1 < species.length && i + 1 !== nLeft;
        if (nextOnSameSide) label(ctx, "+", ((columnX[i] ?? 0) + (columnX[i + 1] ?? 0)) / 2, layout.equationY, { color: theme.muted, font, align: "center" });
      });
      arrow(ctx, mid - gutter * 0.6, layout.equationY, mid + gutter * 0.6, layout.equationY, { color: theme.text, width: 2, head: 7 });
    }

    if (has("molecules")) {
      const gap = r * 2 + 6;
      species.forEach((s, i) => {
        for (let k = 0; k < (coefficients[i] ?? 1); k++) molecule(ctx, s, columnX[i] ?? mid, layout.moleculesY + r + k * gap, r, theme);
      });
      ctx.save();
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mid, layout.moleculesY - 6);
      ctx.lineTo(mid, layout.tallyY - 12);
      ctx.stroke();
      ctx.restore();
    }

    if (has("tally")) {
      const elements = elementsOf(reaction);
      const { tallyY, rowHeight } = layout;
      const colEl = mid - (compact ? 90 : 130);
      const colL = mid - (compact ? 20 : 40);
      const colR = mid + (compact ? 30 : 50);
      const colOk = mid + (compact ? 80 : 120);
      label(ctx, "atoms", colEl, tallyY, { color: theme.muted, font: theme.font, align: "left" });
      label(ctx, "left", colL, tallyY, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, "right", colR, tallyY, { color: theme.muted, font: theme.font, align: "center" });
      elements.forEach((el, i) => {
        const y = tallyY + rowHeight * (i + 1);
        const left = num(results[`left${i + 1}`]);
        const right = num(results[`right${i + 1}`]);
        const ok = left === right;
        ctx.save();
        ctx.fillStyle = ATOM_COLOURS[el] ?? theme.neutral;
        ctx.beginPath();
        ctx.arc(colEl + 5, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        label(ctx, el, colEl + 16, y, { color: theme.text, font: theme.fontStrong, align: "left" });
        label(ctx, String(left), colL, y, { color: ok ? theme.text : theme.secant, font: theme.fontStrong, align: "center" });
        label(ctx, String(right), colR, y, { color: ok ? theme.text : theme.secant, font: theme.fontStrong, align: "center" });
        label(ctx, ok ? "✓" : "✗", colOk, y, { color: ok ? theme.tangent : theme.secant, font: theme.fontStrong, align: "center" });
      });
    }

    if (has("labels")) {
      let words: string;
      if (balanced) words = num(results.simplest) === 1 ? "Balanced! Every atom on the left is there on the right" : "Balanced — but every number can be divided down";
      else {
        const elements = elementsOf(reaction);
        const i = elements.findIndex((_, k) => num(results[`left${k + 1}`]) !== num(results[`right${k + 1}`]));
        const el = elements[i] ?? "";
        words = `Not yet: ${num(results[`left${i + 1}`])} ${el} on the left, ${num(results[`right${i + 1}`])} on the right`;
      }
      label(ctx, words, width / 2, layout.height - 14, { color: balanced ? theme.tangent : theme.text, font: theme.font, align: "center" });
    }
  },
};
