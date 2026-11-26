/**
 * A redox equation, with its oxidation numbers and its electrons.
 *
 * The equation runs across the top with the number in front of each
 * substance, and over each substance the oxidation numbers of its elements —
 * the element oxidised in one colour, the element reduced in another. Below,
 * the electron bookkeeping: what each atom loses or gains, and the totals
 * with the numbers in front. At the bottom, a tally of atoms, charge and
 * electrons, each ticked when the two sides agree.
 */

import { REDOX_ORDER, REDOX_REACTIONS, redoxElements, type RedoxSpecies } from "@ise/chemistry-engine";
import { arrow, label, num } from "../shared/draw";
import type { SimulationRenderer } from "../types";

export interface RedoxLayout {
  width: number;
  height: number;
  compact: boolean;
  equationY: number;
  electronsY: number;
  tallyY: number;
  rowHeight: number;
}

export function computeRedoxLayout(width: number): RedoxLayout {
  const compact = width < 560;
  const rowHeight = compact ? 18 : 20;
  return { width, height: compact ? 340 : 360, compact, equationY: 50, electronsY: 96, tallyY: 170, rowHeight };
}

/** "+2", "−1", "0". */
export function signed(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0";
}

/** The oxidation numbers written over a species, element by element: "+3 −2" over Fe₂O₃. */
export function oxLine(species: RedoxSpecies): string {
  return Object.keys(species.atoms)
    .map((el) => signed(species.ox[el] ?? 0))
    .join(" ");
}

export const redoxRenderer: SimulationRenderer<RedoxLayout> = {
  id: "redox",
  layout: (width) => computeRedoxLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, compact } = layout;
    ctx.clearRect(0, 0, width, layout.height);

    const reaction = REDOX_REACTIONS[REDOX_ORDER[Math.round(num(results.reaction))] ?? "zinc-copper"];
    const species = [...reaction.reactants, ...reaction.products];
    const nLeft = reaction.reactants.length;
    const coefficients = [results.c1, results.c2, results.c3, results.c4].map((c) => Math.max(1, Math.round(num(c, 1))));
    const mid = width / 2;
    const gutter = compact ? 14 : 22;
    const columnX = species.map((_, i) => {
      const left = i < nLeft;
      const n = left ? nLeft : species.length - nLeft;
      const k = left ? i : i - nLeft;
      const from = left ? 6 : mid + gutter;
      const to = left ? mid - gutter : width - 6;
      return from + ((k + 0.5) * (to - from)) / n;
    });
    const colourOf = (s: RedoxSpecies) =>
      s.atoms[reaction.oxidised.element] ? theme.sine : s.atoms[reaction.reduced.element] ? theme.cosine : theme.text;

    if (has("equation")) {
      const font = compact ? theme.fontStrong : "600 16px ui-sans-serif, system-ui, sans-serif";
      species.forEach((s, i) => {
        const text = `${coefficients[i] === 1 ? "" : `${coefficients[i]} `}${s.formula}`;
        label(ctx, text, columnX[i]!, layout.equationY, { color: theme.text, font, align: "center" });
        if (has("ox")) label(ctx, oxLine(s), columnX[i]!, layout.equationY - 20, { color: colourOf(s), font: theme.font, align: "center" });
        if (i + 1 < species.length && i + 1 !== nLeft) label(ctx, "+", (columnX[i]! + columnX[i + 1]!) / 2, layout.equationY, { color: theme.muted, font, align: "center" });
      });
      arrow(ctx, mid - gutter * 0.6, layout.equationY, mid + gutter * 0.6, layout.equationY, { color: theme.text, width: 2, head: 7 });
    }

    if (has("electrons")) {
      const { oxidised, reduced } = reaction;
      const lost = num(results.electronsLost);
      const gained = num(results.electronsGained);
      const each = (c: { from: number; to: number }) => Math.abs(c.to - c.from);
      const y = layout.electronsY;
      label(ctx, `${oxidised.element}: ${signed(oxidised.from)} → ${signed(oxidised.to)}, oxidised, loses ${each(oxidised)} e⁻ per atom`, 12, y, { color: theme.sine, font: theme.font, align: "left" });
      label(ctx, `${reduced.element}: ${signed(reduced.from)} → ${signed(reduced.to)}, reduced, gains ${each(reduced)} e⁻ per atom`, 12, y + 20, { color: theme.cosine, font: theme.font, align: "left" });
      // The totals only with the words on, so an estimate can hide them.
      const ok = lost === gained;
      if (has("labels")) label(ctx, `electrons lost ${lost}, gained ${gained} ${ok ? "✓" : "✗"}`, 12, y + 44, { color: ok ? theme.tangent : theme.secant, font: theme.fontStrong, align: "left" });
    }

    if (has("tally")) {
      const { tallyY, rowHeight } = layout;
      const colName = mid - (compact ? 90 : 130);
      const colL = mid - (compact ? 10 : 30);
      const colR = mid + (compact ? 40 : 60);
      const colOk = mid + (compact ? 90 : 130);
      label(ctx, "left", colL, tallyY, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, "right", colR, tallyY, { color: theme.muted, font: theme.font, align: "center" });
      const rows: [string, number, number][] = [];
      const coefficient = (i: number) => coefficients[i] ?? 1;
      for (const el of redoxElements(reaction)) {
        let left = 0;
        let right = 0;
        species.forEach((s, i) => {
          const n = (s.atoms[el] ?? 0) * coefficient(i);
          if (i < nLeft) left += n;
          else right += n;
        });
        rows.push([`${el} atoms`, left, right]);
      }
      rows.push(["charge", num(results.chargeLeft), num(results.chargeRight)]);
      rows.forEach(([name, left, right], i) => {
        const y = tallyY + rowHeight * (i + 1);
        const ok = left === right;
        label(ctx, name, colName, y, { color: theme.text, font: theme.font, align: "left" });
        label(ctx, name === "charge" ? signed(left) : String(left), colL, y, { color: ok ? theme.text : theme.secant, font: theme.fontStrong, align: "center" });
        label(ctx, name === "charge" ? signed(right) : String(right), colR, y, { color: ok ? theme.text : theme.secant, font: theme.fontStrong, align: "center" });
        label(ctx, ok ? "✓" : "✗", colOk, y, { color: ok ? theme.tangent : theme.secant, font: theme.fontStrong, align: "center" });
      });
    }

    if (has("labels")) {
      let words: string;
      if (num(results.balanced) !== 1) words = num(results.electronsBalanced) !== 1 ? "Balance the electrons first: lost must equal gained" : "Electrons match — now make the atoms and the charge add up";
      else if (num(results.hasPotential) === 1) {
        const e = num(results.ecell);
        words = e > 0 ? `Balanced. E°cell = ${signed(Number(e.toFixed(2)))} V: it goes` : `Balanced — but E°cell = ${signed(Number(e.toFixed(2)))} V: it does not go`;
      } else words = "Balanced: electrons lost = electrons gained";
      label(ctx, words, width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
