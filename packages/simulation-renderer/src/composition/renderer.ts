/**
 * Three pictures of what a formula stands for.
 *
 * Isotopes: a hundred atoms of an element in its two isotopes, and a mass
 * line from the lighter to the heavier with the average marked — it slides
 * towards whichever isotope there is more of.
 *
 * Formula: the atoms of one molecule in rows, then a bar sharing the molar
 * mass between the elements. Hydrogen often has the most atoms and the
 * least mass. Underneath, the empirical formula.
 *
 * Solution: a flask made up to the mark, with the four ways of saying how
 * strong the solution is.
 */

import {
  CONC_SOLUTE_ORDER,
  CONC_SOLUTES,
  empiricalOf,
  FORMULA_COMPOUND_ORDER,
  FORMULA_COMPOUNDS,
  FORMULA_MASSES,
  formulaText,
  ISOTOPE_ELEMENT_ORDER,
  ISOTOPE_ELEMENTS,
} from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface CompositionLayout {
  width: number;
  height: number;
  compact: boolean;
}

export function computeCompositionLayout(width: number): CompositionLayout {
  const compact = width < 560;
  return { width, height: compact ? 330 : 360, compact };
}

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** "³⁵Cl" */
export const isotopeName = (A: number, symbol: string) => String(A).split("").map((d) => SUPERSCRIPTS[Number(d)]).join("") + symbol;

/** Where a mass sits on the mass line, as a fraction from the lighter isotope to the heavier. */
export const massFraction = (mass: number, light: number, heavy: number) => clamp((mass - light) / (heavy - light), 0, 1);

/** Deterministic scatter, 0–1 in each direction. */
function scatter(i: number): [number, number] {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return [a - Math.floor(a), b - Math.floor(b)];
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

const ELEMENTS = ["C", "H", "O"] as const;
const elementColour = (e: (typeof ELEMENTS)[number], theme: LabTheme) => (e === "C" ? theme.reference : e === "H" ? theme.sine : theme.cosine);

export const compositionRenderer: SimulationRenderer<CompositionLayout> = {
  id: "composition",
  layout: (width) => computeCompositionLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, compact } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });

    if (has("isotopes")) {
      const pair = ISOTOPE_ELEMENTS[ISOTOPE_ELEMENT_ORDER[Math.round(num(results.element))] ?? "chlorine"];
      const abundance = num(results.abundance, 50);
      const lightCount = Math.round(abundance);
      const gap = compact ? 15 : 17;
      const gx = width / 2 - gap * 5 - (compact ? 40 : 0);
      const gy = 22;
      for (let i = 0; i < 100; i++) {
        const x = gx + (i % 10) * gap + gap / 2;
        const y = gy + Math.floor(i / 10) * gap + gap / 2;
        disc(ctx, x, y, gap * 0.36, i < lightCount ? theme.sine : theme.cosine);
      }
      const lx = gx + gap * 10 + 14;
      const lightName = isotopeName(pair.light.A, pair.symbol);
      const heavyName = isotopeName(pair.heavy.A, pair.symbol);
      disc(ctx, lx + 5, gy + 20, 5, theme.sine);
      label(ctx, `${lightName} × ${lightCount}`, lx + 16, gy + 20, { color: theme.text, font: theme.font });
      disc(ctx, lx + 5, gy + 42, 5, theme.cosine);
      label(ctx, `${heavyName} × ${100 - lightCount}`, lx + 16, gy + 42, { color: theme.text, font: theme.font });

      // The mass line.
      const x1 = 44;
      const x2 = width - 44;
      const y = gy + gap * 10 + (compact ? 46 : 56);
      const at = (mass: number) => x1 + massFraction(mass, pair.light.mass, pair.heavy.mass) * (x2 - x1);
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
      ctx.restore();
      disc(ctx, x1, y, 6, theme.sine);
      disc(ctx, x2, y, 6, theme.cosine);
      label(ctx, `${lightName}  ${pair.light.mass.toFixed(2)}`, x1 - 8, y + 20, { color: theme.sine, font: theme.font });
      label(ctx, `${heavyName}  ${pair.heavy.mass.toFixed(2)}`, x2 + 8, y + 20, { color: theme.cosine, font: theme.font, align: "right" });
      // The average: a pointer above the line.
      const average = num(results.averageMass);
      const ax = at(average);
      ctx.save();
      ctx.fillStyle = theme.angle;
      ctx.beginPath();
      ctx.moveTo(ax, y - 4);
      ctx.lineTo(ax - 7, y - 17);
      ctx.lineTo(ax + 7, y - 17);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (has("labels")) {
        label(ctx, average.toFixed(2), clamp(ax, x1 + 6, x2 - 6), y - 27, { color: theme.angle, font: theme.fontStrong, align: "center" });
        const f = abundance / 100;
        caption(`${f.toFixed(2)} × ${pair.light.mass.toFixed(2)} + ${(1 - f).toFixed(2)} × ${pair.heavy.mass.toFixed(2)} = ${average.toFixed(2)} u`);
      }
    }

    if (has("formula")) {
      const compound = FORMULA_COMPOUNDS[FORMULA_COMPOUND_ORDER[Math.round(num(results.compound))] ?? "glucose"];
      const atoms = compound.atoms;
      const molarMass = num(results.molarMass, 1);
      label(ctx, `${compound.name}  ${formulaText(atoms)}`, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });

      // One molecule's atoms, a row for each element.
      const r = compact ? 8 : 9;
      ELEMENTS.forEach((e, row) => {
        const y = 48 + row * (r * 2 + 8);
        label(ctx, e, 22, y, { color: theme.text, font: theme.fontStrong, align: "center" });
        if (atoms[e] === 0) label(ctx, "none", 40, y, { color: theme.muted, font: theme.font });
        for (let i = 0; i < atoms[e]; i++) disc(ctx, 48 + i * (r * 2 + 4), y, r, elementColour(e, theme), theme.axis);
      });

      // The molar mass shared out.
      const bx = 20;
      const bw = width - 40;
      const by = 48 + 3 * (r * 2 + 8) + 8;
      const bh = 34;
      let x = bx;
      for (const e of ELEMENTS) {
        const w = (bw * atoms[e] * FORMULA_MASSES[e]) / molarMass;
        ctx.save();
        ctx.fillStyle = elementColour(e, theme);
        ctx.fillRect(x, by, w, bh);
        ctx.restore();
        x += w;
      }
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
      label(ctx, "share of the mass", bx, by - 9, { color: theme.muted, font: theme.font });
      ELEMENTS.forEach((e, i) => {
        const cx = bx + (bw * (i + 0.5)) / 3;
        const grams = atoms[e] * FORMULA_MASSES[e];
        disc(ctx, cx - 34, by + bh + 18, 5, elementColour(e, theme), theme.axis);
        label(ctx, `${e}: ${atoms[e]} × ${FORMULA_MASSES[e]}`, cx - 24, by + bh + 18, { color: theme.text, font: theme.font });
        if (has("labels")) label(ctx, `${grams} g · ${((100 * grams) / molarMass).toFixed(1)}%`, cx - 24, by + bh + 36, { color: theme.muted, font: theme.font });
      });

      if (has("labels")) {
        const empirical = empiricalOf(atoms);
        const words = empirical.multiple === 1
          ? `Empirical formula ${formulaText(empirical.atoms)}: already the simplest ratio`
          : `Empirical formula ${formulaText(empirical.atoms)}, × ${empirical.multiple} = ${formulaText(atoms)}`;
        label(ctx, words, width / 2, by + bh + 64, { color: theme.angle, font: theme.fontStrong, align: "center" });
        caption(`M = ${molarMass} g/mol · ${num(results.sample).toFixed(0)} g is ${num(results.moles).toFixed(3)} mol`);
      }
    }

    if (has("flask")) {
      const solute = CONC_SOLUTES[CONC_SOLUTE_ORDER[Math.round(num(results.solute))] ?? "nacl"];
      const volume = num(results.volume, 1000);
      const mass = num(results.soluteMass);
      label(ctx, `${mass.toFixed(1)} g ${solute.formula}, made up to ${volume.toFixed(0)} mL`, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });

      const fw = compact ? 110 : 150;
      const fx = compact ? 50 : width / 2 - fw - 20;
      const top = 44;
      const bottom = height - 50;
      const levelOf = (mL: number) => bottom - ((bottom - top - 14) * mL) / 1000;
      const level = levelOf(volume);
      ctx.save();
      ctx.fillStyle = theme.sine;
      ctx.globalAlpha = clamp(0.12 + num(results.molarity) * 0.08, 0.12, 0.6);
      ctx.fillRect(fx, level, fw, bottom - level);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, top);
      ctx.lineTo(fx, bottom);
      ctx.lineTo(fx + fw, bottom);
      ctx.lineTo(fx + fw, top);
      ctx.stroke();
      ctx.restore();
      for (const mL of [250, 500, 750, 1000]) {
        const y = levelOf(mL);
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.beginPath();
        ctx.moveTo(fx, y);
        ctx.lineTo(fx + 10, y);
        ctx.stroke();
        ctx.restore();
        label(ctx, String(mL), fx - 6, y, { color: theme.muted, font: theme.font, align: "right" });
      }
      // Solute particles: in proportion to the moles.
      const particles = clamp(Math.round(num(results.soluteMoles) * 30), 1, 90);
      for (let i = 0; i < particles; i++) {
        const [u, v] = scatter(i + 1);
        disc(ctx, fx + 7 + u * (fw - 14), level + 7 + v * (bottom - level - 14), 3, theme.angle);
      }

      if (has("labels")) {
        const tx = fx + fw + (compact ? 18 : 40);
        const rows: [string, string][] = [
          ["molarity", `${num(results.molarity).toFixed(2)} mol/L`],
          ["molality", `${num(results.molality).toFixed(2)} mol/kg`],
          ["mole fraction", num(results.moleFraction).toFixed(3)],
          ["mass %", `${num(results.massPercent).toFixed(1)}%`],
        ];
        rows.forEach(([name, value], i) => {
          const y = top + 26 + i * 44;
          label(ctx, name, tx, y, { color: theme.muted, font: theme.font });
          label(ctx, value, tx, y + 17, { color: theme.text, font: theme.fontStrong });
        });
        caption(`n = ${mass.toFixed(1)} g ÷ ${solute.M} g/mol = ${num(results.soluteMoles).toFixed(2)} mol in ${(volume / 1000).toFixed(2)} L`);
      }
    }
  },
};
