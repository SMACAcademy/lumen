/**
 * Valence bond theory in three pictures.
 *
 * Curve: two hydrogen 1s clouds a set distance apart, over the energy of
 * the pair against that distance. The marker rides the curve down into the
 * well at 74 pm and up the wall beyond it.
 *
 * Overlap: two orbitals on the line joining their nuclei. An s orbital is
 * one colour; a p orbital has a lobe of each phase. Head-on they add up
 * along the line (σ); side by side they add above and below it (π); an s
 * across both halves of a sideways p cancels.
 *
 * Count: a molecule's structure, one line for each σ bond and extra lines
 * for the π bonds of double and triple bonds.
 */

import {
  BONDED_MOLECULE_ORDER,
  BONDED_MOLECULES,
  H2_BOND_ENTHALPY,
  H2_BOND_LENGTH,
  h2Energy,
  MAX_DISTANCE,
  MIN_DISTANCE,
  OVERLAP_TYPE_ORDER,
  OVERLAP_TYPES,
  type BondedMolecule,
} from "@ise/chemistry-engine";
import { label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface OverlapLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where the two atoms sit, and pixels per picometre between them. */
  atomsY: number;
  perPm: number;
  /** The energy plot. */
  rect: { x: number; y: number; width: number; height: number };
}

export function computeOverlapLayout(width: number): OverlapLayout {
  const compact = width < 560;
  const height = compact ? 330 : 360;
  return {
    width,
    height,
    compact,
    atomsY: 62,
    perPm: Math.min(0.5, (width - 110) / MAX_DISTANCE),
    rect: { x: 46, y: 116, width: width - 46 - 16, height: height - 116 - 62 },
  };
}

/** The energy axis, kJ/mol. */
export const ENERGY_DOMAIN: readonly [number, number] = [-500, 300];
/** Radius of a drawn 1s cloud, px. */
const CLOUD = 36;

/** Scale and offset that fit a molecule's atoms into a box centred on (cx, cy). */
export function fitMolecule(molecule: BondedMolecule, cx: number, cy: number, roomX: number, roomY: number): (x: number, y: number) => [number, number] {
  const xs = molecule.atoms.map((a) => a.x);
  const ys = molecule.atoms.map((a) => a.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const midX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const midY = (Math.max(...ys) + Math.min(...ys)) / 2;
  const scale = Math.min(52, roomX / Math.max(spanX, 0.1), roomY / Math.max(spanY, 0.1));
  // y is up in the model and down on the canvas.
  return (x, y) => [cx + (x - midX) * scale, cy - (y - midY) * scale];
}

const minus = (v: number) => `${v < 0 ? "−" : v > 0 ? "+" : ""}${Math.abs(Math.round(v))}`;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** One lobe of a p orbital: from the nucleus out along `angle`. */
function lobe(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, colour: string) {
  const reach = 46;
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.ellipse(x + (Math.cos(angle) * reach) / 2, y + (Math.sin(angle) * reach) / 2, reach / 2, 15, angle, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A p orbital with its + lobe along `angle` and its − lobe opposite. */
function pOrbital(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, theme: LabTheme) {
  lobe(ctx, x, y, angle, theme.sine);
  lobe(ctx, x, y, angle + Math.PI, theme.cosine);
}

export const overlapRenderer: SimulationRenderer<OverlapLayout> = {
  id: "overlap",
  layout: (width) => computeOverlapLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, rect } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });

    if (has("atoms")) {
      const distance = num(results.distance, 300);
      const half = (distance * layout.perPm) / 2;
      const y = layout.atomsY;
      for (const side of [-1, 1]) {
        disc(ctx, width / 2 + side * half, y, CLOUD, theme.sine, 0.3);
        disc(ctx, width / 2 + side * half, y, 3, theme.text);
      }
      label(ctx, `H   ${distance.toFixed(0)} pm   H`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    }

    if (has("curve")) {
      const plane = createPlane(rect, [0, MAX_DISTANCE], ENERGY_DOMAIN);
      drawPlane(ctx, plane, theme);
      // On the right, clear of the steep wall of the curve beside the axis.
      label(ctx, "energy / kJ mol⁻¹", rect.x + rect.width, rect.y + 8, { color: theme.text, font: theme.font, align: "right" });
      label(ctx, "distance / pm", rect.x + rect.width, rect.y + rect.height + 28, { color: theme.muted, font: theme.font, align: "right" });
      ctx.save();
      clipToPlane(ctx, plane);
      ctx.strokeStyle = theme.sine;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let r = MIN_DISTANCE; r <= MAX_DISTANCE; r += 2) {
        const [px, py] = plane.toPx(r, h2Energy(r));
        if (r === MIN_DISTANCE) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      const distance = num(results.distance, 300);
      const energy = num(results.energy);
      const [mx, my] = plane.toPx(distance, Math.min(energy, ENERGY_DOMAIN[1]));
      if (has("labels")) {
        const [bx, by] = plane.toPx(H2_BOND_LENGTH, -H2_BOND_ENTHALPY);
        ctx.save();
        ctx.strokeStyle = theme.angle;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(rect.x, by);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx, plane.toPx(0, 0)[1]);
        ctx.stroke();
        ctx.restore();
        label(ctx, "−436", bx + 8, by + 2, { color: theme.angle, font: theme.font });
        if (num(results.atMinimum) === 1) caption("74 pm: the lowest energy, −436 kJ/mol. This is the bond");
        else if (num(results.repelling) === 1) caption(`Too close: the nuclei repel. E = ${minus(energy)} kJ/mol`);
        else caption(`Attraction is winning: E = ${minus(energy)} kJ/mol`);
      }
      disc(ctx, mx, my, 5.5, theme.angle);
    }

    if (has("orbitals")) {
      const typeId = OVERLAP_TYPE_ORDER[Math.round(num(results.overlapType))] ?? "ss";
      const type = OVERLAP_TYPES[typeId];
      const cy = (height - 40) / 2 + 10;
      const sep = { ss: 46, sp: 62, "pp-head": 78, "pp-side": 34, "sp-side": 40 }[typeId];
      const xL = width / 2 - sep / 2;
      const xR = width / 2 + sep / 2;
      label(ctx, type.name, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(width / 2 - 120, cy);
      ctx.lineTo(width / 2 + 120, cy);
      ctx.stroke();
      ctx.restore();
      const UP = -Math.PI / 2;
      if (type.orbitals[0] === "s") disc(ctx, xL, cy, 34, theme.sine, 0.35);
      else pOrbital(ctx, xL, cy, type.headOn ? 0 : UP, theme);
      if (type.orbitals[1] === "s") disc(ctx, xR, cy, 34, theme.sine, 0.35);
      else pOrbital(ctx, xR, cy, type.headOn ? Math.PI : UP, theme);
      disc(ctx, xL, cy, 3, theme.text);
      disc(ctx, xR, cy, 3, theme.text);
      const ly = height - 58;
      disc(ctx, width / 2 - 74, ly, 5, theme.sine, 0.8);
      label(ctx, "+ phase", width / 2 - 64, ly, { color: theme.muted, font: theme.font });
      disc(ctx, width / 2 + 14, ly, 5, theme.cosine, 0.8);
      label(ctx, "− phase", width / 2 + 24, ly, { color: theme.muted, font: theme.font });
      if (has("labels")) {
        if (type.bond === "sigma") caption("Head-on, along the line of the nuclei: a sigma (σ) bond");
        else if (type.bond === "pi") caption("Side by side, above and below the line: a pi (π) bond");
        else caption("The + and − halves cancel: zero overlap, no bond");
      }
    }

    if (has("structure")) {
      const molecule = BONDED_MOLECULES[BONDED_MOLECULE_ORDER[Math.round(num(results.molecule))] ?? "ethene"];
      const place = fitMolecule(molecule, width / 2, (height - 40) / 2 + 12, width - 70, height - 130);
      label(ctx, `${molecule.name}  ${molecule.formula}`, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
      const shown = has("labels");
      for (const [a, b, order] of molecule.bonds) {
        const [x1, y1] = place(molecule.atoms[a]!.x, molecule.atoms[a]!.y);
        const [x2, y2] = place(molecule.atoms[b]!.x, molecule.atoms[b]!.y);
        const length = Math.hypot(x2 - x1, y2 - y1) || 1;
        const nx = -(y2 - y1) / length;
        const ny = (x2 - x1) / length;
        // The σ line, then a π line each side of it for a triple bond or to one side for a double.
        const offsets = order === 1 ? [0] : order === 2 ? [-3, 3] : [0, -6, 6];
        offsets.forEach((offset, i) => {
          ctx.save();
          ctx.strokeStyle = !shown ? theme.neutral : i === 0 ? theme.sine : theme.cosine;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x1 + nx * offset, y1 + ny * offset);
          ctx.lineTo(x2 + nx * offset, y2 + ny * offset);
          ctx.stroke();
          ctx.restore();
        });
      }
      for (const atom of molecule.atoms) {
        const [x, y] = place(atom.x, atom.y);
        disc(ctx, x, y, 10, theme.background);
        label(ctx, atom.el, x, y, { color: atom.el === "H" ? theme.muted : theme.text, font: theme.fontStrong, align: "center" });
      }
      if (shown) {
        const ly = height - 40;
        for (const [x, colour, name] of [[width / 2 - 62, theme.sine, "σ bond"], [width / 2 + 18, theme.cosine, "π bond"]] as const) {
          ctx.save();
          ctx.strokeStyle = colour;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x, ly);
          ctx.lineTo(x + 14, ly);
          ctx.stroke();
          ctx.restore();
          label(ctx, name, x + 19, ly, { color: theme.muted, font: theme.font });
        }
        const pi = Math.round(num(results.piBonds));
        caption(`${plural(Math.round(num(results.sigmaBonds)), "σ bond")} + ${plural(pi, "π bond")}`);
      }
    }
  },
};
