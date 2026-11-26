/**
 * Hydrocarbons.
 *
 * One canvas, eight views, chosen by the mode's layers:
 *   newman     — ethane end-on (Newman projection) turning with θ, and its
 *                torsional energy against θ.
 *   mechanism  — a radical or ionic mechanism, one step at a time, with
 *                curly arrows (fishhooks for single electrons).
 *   addition   — an alkene, a reagent and the product built by rule.
 *   alkynes    — an alkyne, a reagent and the product.
 *   rings      — a ring or ion, its π electrons and Hückel's rule.
 *   kekule     — benzene's two Kekulé structures, the hybrid and bond lengths.
 *   eas        — electrophilic substitution: E⁺, the σ-complex, loss of H⁺.
 *   directing  — a substituted benzene and where E⁺ attacks.
 * Answers (energies, names, degrees, π counts, bond lengths …) appear only
 * with "labels".
 */

import {
  HYDROCARBON_AROMATIC_REASONS,
  HYDROCARBON_BOND_LENGTHS,
  HYDROCARBON_CONFORMATIONS,
  HYDROCARBON_DIRECTS,
  HYDROCARBON_EAS_STAGES,
  HYDROCARBON_ETHANE_BARRIER,
  HYDROCARBON_INTERMEDIATES,
  HYDROCARBON_POSITIONS,
  HYDROCARBON_STAGE_KINDS,
  hydrocarbonAdd,
  hydrocarbonAlkene,
  hydrocarbonAlkeneReagent,
  hydrocarbonAlkyne,
  hydrocarbonAlkyneReact,
  hydrocarbonAlkyneReagent,
  hydrocarbonEasReaction,
  hydrocarbonHuckel,
  hydrocarbonMechanism,
  hydrocarbonRing,
  hydrocarbonSubstituent,
  hydrocarbonTorsionalEnergy,
  type HydrocarbonRing,
  type OrganicSketch,
} from "@ise/chemistry-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import { chainMolecule, drawCurlyArrow, drawMolecule, type ArrowEnd, type Atom2D, type Bond2D, type Box, type Molecule2D, type MoleculePlacement } from "../shared/molecule";
import type { LabTheme } from "../theme";
import type { RenderInput, SimulationRenderer } from "../types";

export interface HydrocarbonLayout {
  width: number;
  height: number;
  /** The central column everything is drawn in. */
  left: number;
  right: number;
}

export function computeHydrocarbonLayout(width: number): HydrocarbonLayout {
  const column = Math.min(width - 32, 520);
  const left = (width - column) / 2;
  return { width, height: 380, left, right: left + column };
}

const centreX = (l: HydrocarbonLayout) => (l.left + l.right) / 2;
const boxOf = (l: HydrocarbonLayout, top: number, bottom: number, from = l.left, to = l.right): Box => ({ x: from, y: top, width: to - from, height: bottom - top });
const DEG = Math.PI / 180;

function centred(ctx: CanvasRenderingContext2D, l: HydrocarbonLayout, text: string, y: number, color: string, font: string) {
  label(ctx, text, centreX(l), y, { color, font, align: "center" });
}

// ── Newman projection and torsional energy ──────────────────────────────────

export interface NewmanGeometry {
  cx: number;
  cy: number;
  /** Radius of the circle that stands for the back carbon. */
  radius: number;
  /** Where the C–H bonds end. */
  reach: number;
}

export function newmanGeometry(l: HydrocarbonLayout): NewmanGeometry {
  return { cx: centreX(l), cy: 112, radius: 24, reach: 60 };
}

/** Bond directions (degrees, y down): front H at the top and 120° apart; the back set turned by θ. */
export function newmanAngles(dihedral: number): { front: number[]; back: number[] } {
  const front = [-90, 30, 150];
  return { front, back: front.map((a) => a + dihedral) };
}

export interface EnergyPlot {
  left: number;
  right: number;
  top: number;
  bottom: number;
  /** Top of the energy axis, kJ/mol. */
  eMax: number;
}

export function energyPlot(l: HydrocarbonLayout): EnergyPlot {
  return { left: l.left + 34, right: l.right - 8, top: 222, bottom: 316, eMax: 14 };
}

const plotX = (p: EnergyPlot, deg: number) => p.left + (clamp(deg, 0, 360) / 360) * (p.right - p.left);
const plotY = (p: EnergyPlot, e: number) => p.bottom - (clamp(e, 0, p.eMax) / p.eMax) * (p.bottom - p.top);

function drawNewman(ctx: CanvasRenderingContext2D, l: HydrocarbonLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const dihedral = clamp(num(results.dihedral), 0, 360);
  const g = newmanGeometry(l);
  const { front, back } = newmanAngles(dihedral);
  centred(ctx, l, "Ethane end-on: a Newman projection", 16, theme.text, theme.fontStrong);

  const at = (deg: number, r: number) => ({ x: g.cx + Math.cos(deg * DEG) * r, y: g.cy + Math.sin(deg * DEG) * r });
  const bond = (deg: number, from: number, colour: string) => {
    const p = at(deg, from);
    const q = at(deg, g.reach);
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
    ctx.restore();
  };
  // The back carbon's bonds come out from behind its circle; its H labels sit further out.
  for (const a of back) {
    bond(a, g.radius, theme.tangent);
    const t = at(a, g.reach + 20);
    label(ctx, "H", t.x, t.y, { color: theme.tangent, font: theme.font, align: "center" });
  }
  ctx.save();
  ctx.fillStyle = theme.background;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(g.cx, g.cy, g.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  for (const a of front) {
    bond(a, 0, theme.sine);
    const t = at(a, g.reach + 8);
    label(ctx, "H", t.x, t.y, { color: theme.sine, font: theme.font, align: "center" });
  }
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.beginPath();
  ctx.arc(g.cx, g.cy, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  label(ctx, `θ = ${Math.round(dihedral)}°`, l.left, g.cy - 10, { color: theme.angle, font: theme.fontStrong });
  const kind = HYDROCARBON_CONFORMATIONS[num(results.conformation)] ?? "";
  if (words) label(ctx, kind, l.left, g.cy + 10, { color: theme.angle, font: theme.font });
  label(ctx, "front C–H", l.right, g.cy - 10, { color: theme.sine, font: theme.font, align: "right" });
  label(ctx, "back C–H", l.right, g.cy + 10, { color: theme.tangent, font: theme.font, align: "right" });

  // Torsional energy against θ.
  const p = energyPlot(l);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(p.left, p.top - 6);
  ctx.lineTo(p.left, p.bottom);
  ctx.lineTo(p.right, p.bottom);
  for (let d = 0; d <= 360; d += 60) {
    ctx.moveTo(plotX(p, d), p.bottom);
    ctx.lineTo(plotX(p, d), p.bottom + 4);
  }
  ctx.stroke();
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let d = 0; d <= 360; d += 3) {
    const x = plotX(p, d);
    const y = plotY(p, hydrocarbonTorsionalEnergy(d));
    if (d === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  for (let d = 0; d <= 360; d += 60) label(ctx, `${d}°`, plotX(p, d), p.bottom + 14, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "E", p.left - 10, p.top - 4, { color: theme.text, font: theme.fontStrong, align: "right" });
  if (words) {
    label(ctx, String(HYDROCARBON_ETHANE_BARRIER), p.left - 4, plotY(p, HYDROCARBON_ETHANE_BARRIER), { color: theme.muted, font: theme.font, align: "right" });
    label(ctx, "0", p.left - 4, p.bottom, { color: theme.muted, font: theme.font, align: "right" });
    label(ctx, `E = ${num(results.torsionalEnergy).toFixed(1)} kJ/mol`, p.right, p.top - 12, { color: theme.curve, font: theme.font, align: "right" });
  }
  const e = num(results.torsionalEnergy);
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.arc(plotX(p, dihedral), plotY(p, e), 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  label(ctx, "torsional energy against θ", (p.left + p.right) / 2, p.bottom + 30, { color: theme.muted, font: theme.font, align: "center" });

  const caption = !words
    ? "Turn the back carbon, or press play"
    : num(results.conformation) === 0
      ? "Eclipsed: C–H bond pairs repel (torsional strain)"
      : num(results.conformation) === 1
        ? "Staggered: bond pairs farthest apart, lowest E"
        : "Skew: any angle in between";
  centred(ctx, l, caption, l.height - 14, words ? theme.text : theme.muted, theme.font);
}

// ── Mechanisms ───────────────────────────────────────────────────────────────

/** Where a curly arrow starts or ends: an atom, a bond, a lone pair or radical dot, or midway between two atoms. */
export type HydrocarbonArrowEnd = ArrowEnd | { between: [number, number] };

export interface HydrocarbonArrow {
  from: HydrocarbonArrowEnd;
  to: HydrocarbonArrowEnd;
  /** One electron moves (a fishhook). */
  fishhook: boolean;
  bend: number;
}

export interface HydrocarbonPicture {
  molecule: Molecule2D;
  arrows: HydrocarbonArrow[];
  /** A key under the picture, e.g. "R = C₆H₅CO". */
  key?: string;
}

const atom = (el: string, x: number, y: number, extra: Partial<Atom2D> = {}): Atom2D => ({ el, x, y, ...extra });
const single = (a: number, b: number): Bond2D => ({ a, b, order: 1 });
const fish = (from: HydrocarbonArrowEnd, to: HydrocarbonArrowEnd, bend: number): HydrocarbonArrow => ({ from, to, fishhook: true, bend });
const pair = (from: HydrocarbonArrowEnd, to: HydrocarbonArrowEnd, bend: number): HydrocarbonArrow => ({ from, to, fishhook: false, bend });

/** Two radicals pairing: each gives one electron to the new bond. */
const combine = (a: Atom2D, b: Atom2D): HydrocarbonPicture => ({
  molecule: { atoms: [a, b], bonds: [] },
  arrows: [fish({ lonePair: 0 }, { between: [0, 1] }, -1), fish({ lonePair: 1 }, { between: [0, 1] }, 1)],
});

/** A radical X• takes the atom A from A–B: X• + A–B → X–A + B•. */
const abstraction = (x: Atom2D, a: Atom2D, b: Atom2D): HydrocarbonPicture => ({
  molecule: { atoms: [x, a, b], bonds: [single(1, 2)] },
  arrows: [fish({ lonePair: 0 }, { between: [0, 1] }, -1), fish({ bond: [1, 2] }, { between: [0, 1] }, 1), fish({ bond: [1, 2] }, { atom: 2 }, 1)],
});

/** The picture for one step of a mechanism, with the arrows that make it happen. */
export function mechanismPicture(mechanism: number, stage: number): HydrocarbonPicture {
  const radical = { radical: true };
  const id = hydrocarbonMechanism(mechanism).id;
  if (id === "chlorination") {
    switch (stage) {
      case 0:
        return {
          molecule: { atoms: [atom("Cl", 0, 0), atom("Cl", 1.6, 0)], bonds: [single(0, 1)] },
          arrows: [fish({ bond: [0, 1] }, { atom: 0 }, 1), fish({ bond: [0, 1] }, { atom: 1 }, -1)],
        };
      case 1:
        return abstraction(atom("Cl", 0, 0, radical), atom("H", 1.6, 0), atom("C", 3.1, 0));
      case 2:
        return abstraction(atom("C", 0, 0, radical), atom("Cl", 1.6, 0), atom("Cl", 3.1, 0));
      case 3:
        return combine(atom("Cl", 0, 0, radical), atom("Cl", 1.6, 0, radical));
      case 4:
        return combine(atom("C", 0, 0, radical), atom("C", 1.6, 0, radical));
      default:
        return combine(atom("C", 0, 0, radical), atom("Cl", 1.6, 0, radical));
    }
  }
  if (id === "hbr") {
    if (stage === 0) {
      // π electrons take the H of H–Br; the H–Br pair goes to Br.
      return {
        molecule: {
          atoms: [atom("C", 0, 0), atom("C", 0.87, -0.5), atom("C", 1.73, 0), atom("H", 2.9, 0), atom("Br", 4.4, 0)],
          bonds: [single(0, 1), { a: 1, b: 2, order: 2 }, single(3, 4)],
        },
        arrows: [pair({ bond: [1, 2] }, { atom: 3 }, -1), pair({ bond: [3, 4] }, { atom: 4 }, -1)],
      };
    }
    return {
      molecule: {
        atoms: [atom("C", 0, 0), atom("C", 0.87, -0.5, { charge: 1 }), atom("C", 1.73, 0), atom("Br", 2.7, -1.5, { charge: -1, lonePairs: 1 })],
        bonds: [single(0, 1), single(1, 2)],
      },
      arrows: [pair({ lonePair: 3 }, { atom: 1 }, 1)],
    };
  }
  // The peroxide effect.
  switch (stage) {
    case 0:
      return {
        molecule: { atoms: [atom("C", -1.2, 0, { label: "R" }), atom("O", 0, 0), atom("O", 1.6, 0), atom("C", 2.8, 0, { label: "R" })], bonds: [single(0, 1), single(1, 2), single(2, 3)] },
        arrows: [fish({ bond: [1, 2] }, { atom: 1 }, 1), fish({ bond: [1, 2] }, { atom: 2 }, -1)],
        key: "R = C₆H₅CO (benzoyl)",
      };
    case 1:
      return abstraction(atom("C", 0, 0, { label: "C₆H₅", radical: true }), atom("H", 1.6, 0), atom("Br", 3.1, 0));
    case 2:
      // Br• and one π electron make the C–Br bond; the other π electron stays on the middle carbon.
      return {
        molecule: { atoms: [atom("Br", 0, 0, radical), atom("C", 1.6, 0), atom("C", 2.47, -0.5), atom("C", 3.33, 0)], bonds: [{ a: 1, b: 2, order: 2 }, single(2, 3)] },
        arrows: [fish({ lonePair: 0 }, { between: [0, 1] }, -1), fish({ bond: [1, 2] }, { between: [0, 1] }, 1), fish({ bond: [1, 2] }, { atom: 2 }, -1)],
      };
    default:
      return {
        molecule: {
          atoms: [atom("Br", 0, 0), atom("C", 0.87, -0.5), atom("C", 1.73, 0, radical), atom("C", 2.6, -0.5), atom("H", 2.73, 1.1), atom("Br", 4.23, 1.1)],
          bonds: [single(0, 1), single(1, 2), single(2, 3), single(4, 5)],
        },
        arrows: [fish({ lonePair: 2 }, { between: [2, 4] }, 1), fish({ bond: [4, 5] }, { between: [2, 4] }, 1), fish({ bond: [4, 5] }, { atom: 5 }, -1)],
      };
  }
}

function resolveEnd(placed: MoleculePlacement, end: HydrocarbonArrowEnd): ArrowEnd {
  if ("between" in end) {
    const p = placed.point(end.between[0]);
    const q = placed.point(end.between[1]);
    return { point: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } };
  }
  return end;
}

function drawPicture(ctx: CanvasRenderingContext2D, picture: HydrocarbonPicture, box: Box, theme: LabTheme, maxBond = 56): MoleculePlacement {
  const placed = drawMolecule(ctx, picture.molecule, box, {
    style: "condensed",
    color: theme.neutral,
    font: theme.font,
    maxBond,
    lineWidth: 1.8,
    atomColor: (_, a) => (a.radical || a.charge ? theme.angle : a.el === "Br" || a.el === "Cl" ? theme.cosine : undefined),
  });
  for (const a of picture.arrows) drawCurlyArrow(ctx, placed, resolveEnd(placed, a.from), resolveEnd(placed, a.to), { color: theme.angle, fishhook: a.fishhook, bend: a.bend });
  return placed;
}

function drawMechanism(ctx: CanvasRenderingContext2D, l: HydrocarbonLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const m = hydrocarbonMechanism(num(results.mechanism));
  const stage = clamp(Math.round(num(results.stage)), 0, m.stages.length - 1);
  const st = m.stages[stage]!;
  centred(ctx, l, m.name, 16, theme.text, theme.fontStrong);
  centred(ctx, l, `Step ${stage + 1} of ${m.stages.length} · ${HYDROCARBON_STAGE_KINDS[st.kind]}`, 36, theme.angle, theme.font);

  const picture = mechanismPicture(num(results.mechanism), stage);
  drawPicture(ctx, picture, boxOf(l, 58, picture.key ? 168 : 186), theme);
  if (picture.key) centred(ctx, l, picture.key, 180, theme.muted, theme.font);

  centred(ctx, l, st.reactants, 204, theme.text, theme.font);
  centred(ctx, l, `→ ${st.products}`, 224, theme.text, theme.fontStrong);
  centred(ctx, l, st.note, 248, theme.muted, theme.font);
  if (words) {
    const lines: string[] = [];
    if (st.kind !== 3) lines.push(st.radicalChange > 0 ? `Radicals made: ${st.radicalChange}` : st.radicalChange < 0 ? `Radicals used up: ${-st.radicalChange}` : "Radicals: one in, one out");
    if (st.intermediate > 0) lines.push(`Leaves a ${st.degree > 0 ? `${st.degree}°` : "methyl"} ${HYDROCARBON_INTERMEDIATES[st.intermediate]}`);
    else if (st.kind === 3) lines.push("The product forms");
    lines.forEach((t, k) => centred(ctx, l, t, 274 + k * 20, k === 0 ? theme.angle : theme.text, theme.font));
  }
  centred(ctx, l, `Overall: ${m.overall}`, l.height - 38, theme.text, theme.font);
  centred(ctx, l, m.conditions, l.height - 18, theme.muted, theme.font);
}

// ── Additions to alkenes and alkynes ─────────────────────────────────────────

const condensedStyle = (theme: LabTheme, maxBond = 42) => ({
  style: "condensed" as const,
  color: theme.neutral,
  font: theme.font,
  maxBond,
  lineWidth: 1.8,
  atomColor: (_: number, a: Atom2D) => (a.el === "Br" || a.el === "Cl" ? theme.cosine : a.el === "O" ? theme.sine : a.charge ? theme.angle : undefined),
});

/** A sketch as a molecule, laid out by the shared chain builder. */
export function sketchMolecule(sketch: OrganicSketch): Molecule2D {
  return chainMolecule(sketch);
}

function drawAddition(ctx: CanvasRenderingContext2D, l: HydrocarbonLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const alkene = hydrocarbonAlkene(num(results.alkene));
  const reagent = hydrocarbonAlkeneReagent(num(results.reagent));
  const added = hydrocarbonAdd(alkene, reagent);
  const x = centreX(l);
  centred(ctx, l, `${alkene.formula} + ${reagent.label}`, 16, theme.text, theme.fontStrong);
  drawMolecule(ctx, sketchMolecule(alkene.sketch), boxOf(l, 30, 116), condensedStyle(theme));
  arrow(ctx, x, 120, x, 146, { color: theme.muted, width: 1.6, head: 8 });
  if (words) label(ctx, reagent.makes, x + 12, 133, { color: theme.muted, font: theme.font });

  const top = 150;
  const bottom = 250;
  if (added.sketches.length === 2) {
    drawMolecule(ctx, sketchMolecule(added.sketches[0]!), boxOf(l, top, bottom, l.left, x - 14), condensedStyle(theme, 38));
    label(ctx, "+", x, (top + bottom) / 2, { color: theme.text, font: theme.fontStrong, align: "center" });
    drawMolecule(ctx, sketchMolecule(added.sketches[1]!), boxOf(l, top, bottom, x + 14, l.right), condensedStyle(theme, 38));
  } else {
    drawMolecule(ctx, sketchMolecule(added.sketches[0]!), boxOf(l, top, bottom), condensedStyle(theme));
  }

  if (!words) {
    centred(ctx, l, "product: ?", 268, theme.muted, theme.font);
  } else {
    centred(ctx, l, added.names.join(" + "), 268, theme.text, theme.fontStrong);
    const xName = reagent.atom === "O" ? "OH" : reagent.atom;
    const orientation =
      added.orientation === 1
        ? `Markovnikov: ${xName} goes to the C with fewer H`
        : added.orientation === 2
          ? `Peroxide effect: ${xName} goes to the C with more H`
          : reagent.kind === "cut"
            ? "Ozonolysis cuts the C=C: each C becomes C=O"
            : reagent.kind === "same"
              ? "The same atom adds to both carbons"
              : "Both C=C carbons alike: only one product";
    centred(ctx, l, orientation, 290, theme.angle, theme.font);
    if (added.intermediate > 0) {
      const kind = HYDROCARBON_INTERMEDIATES[added.intermediate];
      centred(ctx, l, `By way of a ${added.degree}° ${kind}${added.orientation > 0 ? ", the more stable" : ""}`, 312, theme.text, theme.font);
    }
  }
  const notes: Record<string, string> = {
    h2: "Finely divided Ni, Pt or Pd catalyses it",
    br2: "Red-brown Br₂ loses its colour: a test for C=C",
    hbr: "The more stable carbocation decides",
    "hbr-peroxide": "Only HBr shows the peroxide effect",
    "hcl-peroxide": "No peroxide effect with HCl (or HI)",
    water: "Acid-catalysed: Markovnikov, like HX",
    baeyer: "Purple KMnO₄ turns colourless: a test for C=C",
    ozone: "The carbonyl products locate the C=C",
  };
  centred(ctx, l, notes[reagent.id] ?? "", l.height - 16, theme.muted, theme.font);
}

function drawAlkynes(ctx: CanvasRenderingContext2D, l: HydrocarbonLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const alkyne = hydrocarbonAlkyne(num(results.alkyne));
  const reagent = hydrocarbonAlkyneReagent(num(results.alkyneReagent));
  const r = hydrocarbonAlkyneReact(alkyne, reagent);
  const x = centreX(l);
  centred(ctx, l, `${alkyne.formula} + ${reagent.label}`, 16, theme.text, theme.fontStrong);
  drawMolecule(ctx, sketchMolecule(alkyne.sketch), boxOf(l, 30, 116), condensedStyle(theme));
  arrow(ctx, x, 120, x, 146, { color: theme.muted, width: 1.6, head: 8 });

  if (r.reacts) {
    const mol = sketchMolecule(r.sketch);
    if (r.anionAt >= 0) {
      const a = mol.atoms[r.anionAt]!;
      a.charge = -1;
      const away = r.anionAt === 0 ? -1.4 : 1.4;
      mol.atoms.push({ el: "Na", x: a.x + away, y: a.y, label: "Na", charge: 1 });
    }
    drawMolecule(ctx, mol, boxOf(l, 150, 250), condensedStyle(theme));
  } else {
    centred(ctx, l, "—", 200, theme.muted, theme.fontStrong);
  }

  if (!words) {
    centred(ctx, l, "product: ?", 268, theme.muted, theme.font);
  } else {
    centred(ctx, l, r.name, 268, theme.text, theme.fontStrong);
    const terminal = r.anionAt >= 0;
    const notes: Record<string, string> = {
      nanh2: terminal ? "Acidic ≡C–H: NH₂⁻ takes the proton" : "No H on a triply bonded carbon: nothing to take",
      lindlar: r.stereo === 1 ? "cis: both H add from the same side" : "Lindlar's catalyst stops at the alkene",
      "na-nh3": terminal ? "Na takes the acidic H (H₂ is given off)" : "trans: the two H end up on opposite sides",
      "h2-ni": "Two H₂ add: all the way to the alkane",
      br2: "Two Br₂ add: four Br on two carbons",
      hbr: "Markovnikov twice: both Br on one carbon",
      hydration: "The enol formed first turns into C=O",
    };
    centred(ctx, l, notes[reagent.id] ?? "", 290, theme.angle, theme.font);
    centred(ctx, l, `Acidic H on ${alkyne.name}: ${num(results.acidicH)}`, 312, theme.text, theme.font);
  }
  centred(ctx, l, "sp carbon: 50% s character holds electrons close", l.height - 16, theme.muted, theme.font);
}

// ── Rings and aromaticity ────────────────────────────────────────────────────

/** A regular polygon of `n` atoms, bond length 1, flat side down. */
function polygon(n: number): { x: number; y: number }[] {
  const r = 1 / (2 * Math.sin(Math.PI / n));
  const start = 90 + 180 / n;
  return Array.from({ length: n }, (_, k) => {
    const a = (start + (360 * k) / n) * DEG;
    return { x: Math.round(Math.cos(a) * r * 1e9) / 1e9 || 0, y: Math.round(Math.sin(a) * r * 1e9) / 1e9 || 0 };
  });
}

const NAPHTHALENE = [
  { x: 0, y: -0.5 }, { x: 0, y: 0.5 }, { x: -0.866, y: -1 }, { x: -1.732, y: -0.5 }, { x: -1.732, y: 0.5 },
  { x: -0.866, y: 1 }, { x: 0.866, y: -1 }, { x: 1.732, y: -0.5 }, { x: 1.732, y: 0.5 }, { x: 0.866, y: 1 },
];

/** The ring as a molecule: a Kekulé structure, the charged carbon, an explicit CH₂ for an sp³ carbon. */
export function ringMolecule(ring: HydrocarbonRing): Molecule2D {
  const points = ring.id === "naphthalene" ? NAPHTHALENE : polygon(ring.atoms);
  const atoms: Atom2D[] = points.map((p, i) => ({
    el: "C",
    x: p.x,
    y: p.y,
    ...(i === ring.chargeAt ? { charge: ring.charge } : {}),
    ...(i === ring.sp3At ? { show: true } : {}),
  }));
  const bonds: Bond2D[] = ring.bonds.map(([a, b, order]) => ({ a, b, order }));
  return { atoms, bonds };
}

/** Centres of the rings (one, or two for naphthalene), in molecule coordinates. */
const ringCentres = (ring: HydrocarbonRing) => (ring.id === "naphthalene" ? [{ x: -0.866, y: 0 }, { x: 0.866, y: 0 }] : [{ x: 0, y: 0 }]);

function drawRings(ctx: CanvasRenderingContext2D, l: HydrocarbonLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const ring = hydrocarbonRing(num(results.ring));
  const h = hydrocarbonHuckel(ring);
  centred(ctx, l, `${ring.name}, ${ring.formula}`, 16, theme.text, theme.fontStrong);
  const mol = ringMolecule(ring);
  const placed = drawMolecule(ctx, mol, boxOf(l, 34, 196), {
    style: "skeletal",
    color: theme.neutral,
    font: theme.font,
    maxBond: 50,
    lineWidth: 2,
    atomColor: (i) => (i === ring.chargeAt || i === ring.sp3At ? theme.angle : undefined),
  });
  // A carbanion's lone pair, drawn beyond its charge.
  if ((ring.charge ?? 0) < 0 && ring.chargeAt !== undefined) {
    const p = placed.point(ring.chargeAt);
    const c = placed.centre;
    const d = Math.hypot(p.x - c.x, p.y - c.y) || 1;
    const ux = (p.x - c.x) / d;
    const uy = (p.y - c.y) / d;
    ctx.save();
    ctx.fillStyle = theme.angle;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(p.x + ux * 20 - uy * 3 * s, p.y + uy * 20 + ux * 3 * s, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  if (words && h.aromatic) {
    const ref = mol.atoms[0]!;
    const p0 = placed.point(0);
    for (const c of ringCentres(ring)) {
      const cx = p0.x + (c.x - ref.x) * placed.bond;
      const cy = p0.y + (c.y - ref.y) * placed.bond;
      const radius = (ring.id === "naphthalene" ? 1 : 1 / (2 * Math.sin(Math.PI / ring.atoms))) * placed.bond * 0.55;
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  if (!words) {
    centred(ctx, l, "Count the π electrons in the ring", 222, theme.muted, theme.font);
  } else {
    const pi = h.piElectrons;
    const rule = h.n >= 0 ? ` = 4(${h.n}) + 2` : ` = 4(${pi / 4})`;
    centred(ctx, l, `${pi} π electrons${rule}`, 222, theme.angle, theme.fontStrong);
    const tick = (ok: boolean) => (ok ? "✓" : "✗");
    const checks = [
      `${tick(true)} cyclic`,
      `${tick(ring.planar)} planar${ring.shape ? ` (it is ${ring.shape})` : ""}`,
      `${tick(h.conjugated)} a p orbital on every ring carbon`,
      `${tick(h.n >= 0)} 4n + 2 π electrons`,
    ];
    checks.forEach((c, k) => label(ctx, c, l.left + 8, 248 + k * 20, { color: c.startsWith("✓") ? theme.tangent : theme.secant, font: theme.font }));
    const verdict = h.aromatic ? "Aromatic, by Hückel's rule" : `Not aromatic: ${HYDROCARBON_AROMATIC_REASONS[h.reason]}`;
    centred(ctx, l, verdict, l.height - 16, h.aromatic ? theme.tangent : theme.secant, theme.fontStrong);
  }
}

// ── Kekulé structures and bond lengths ───────────────────────────────────────

/** Benzene as a molecule: pointy-top hexagon, atom 0 at the top; Kekulé structure 0 or 1, or the hybrid (all single lines). */
export function benzeneMolecule(kekule: 0 | 1 | "hybrid"): Molecule2D {
  const atoms: Atom2D[] = Array.from({ length: 6 }, (_, k) => {
    const a = (-90 + 60 * k) * DEG;
    return { el: "C", x: Math.round(Math.cos(a) * 1e9) / 1e9 || 0, y: Math.round(Math.sin(a) * 1e9) / 1e9 || 0 };
  });
  const bonds: Bond2D[] = Array.from({ length: 6 }, (_, k) => ({ a: k, b: (k + 1) % 6, order: kekule !== "hybrid" && k % 2 === kekule ? 2 : 1 }));
  return { atoms, bonds };
}

export interface BondBar {
  name: string;
  pm: number;
  y: number;
  x0: number;
  x1: number;
}

/** The bond-length bars: from x0, length in proportion to the bond (0–160 pm). */
export function bondBars(l: HydrocarbonLayout): BondBar[] {
  const x0 = l.left + 70;
  const span = l.right - 52 - x0;
  const rows: [string, number][] = [
    ["C–C", HYDROCARBON_BOND_LENGTHS.single],
    ["benzene", HYDROCARBON_BOND_LENGTHS.benzene],
    ["C=C", HYDROCARBON_BOND_LENGTHS.double],
    ["C≡C", HYDROCARBON_BOND_LENGTHS.triple],
  ];
  return rows.map(([name, pm], k) => ({ name, pm, y: 268 + k * 20, x0, x1: x0 + (pm / 160) * span }));
}

function drawKekule(ctx: CanvasRenderingContext2D, l: HydrocarbonLayout, input: RenderInput) {
  const { theme, layers } = input;
  const words = layers.has("labels");
  const x = centreX(l);
  centred(ctx, l, "Benzene: two Kekulé structures", 16, theme.text, theme.fontStrong);
  const style = { style: "skeletal" as const, color: theme.neutral, font: theme.font, maxBond: 34, lineWidth: 2 };
  drawMolecule(ctx, benzeneMolecule(0), boxOf(l, 30, 128, l.left, x - 18), style);
  drawMolecule(ctx, benzeneMolecule(1), boxOf(l, 30, 128, x + 18, l.right), style);
  label(ctx, "⟷", x, 79, { color: theme.angle, font: theme.fontStrong, align: "center" });
  centred(ctx, l, "real benzene: the resonance hybrid", 142, theme.muted, theme.font);
  const placed = drawMolecule(ctx, benzeneMolecule("hybrid"), boxOf(l, 150, 240), style);
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(placed.centre.x, placed.centre.y, placed.bond * 0.58, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const bars = bondBars(l);
  for (const b of bars) {
    const hidden = b.name === "benzene" && !words;
    label(ctx, b.name, b.x0 - 8, b.y, { color: b.name === "benzene" ? theme.angle : theme.text, font: theme.font, align: "right" });
    ctx.save();
    ctx.fillStyle = b.name === "benzene" ? theme.angle : theme.neutral;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(b.x0, b.y - 5, b.x1 - b.x0, 10);
    ctx.restore();
    label(ctx, hidden ? "? pm" : `${b.pm} pm`, b.x1 + 6, b.y, { color: theme.muted, font: theme.font });
  }
  centred(ctx, l, words ? "All six C–C bonds are equal: 139 pm" : "C–C bond lengths, pm", l.height - 16, words ? theme.text : theme.muted, theme.font);
}

// ── Electrophilic substitution ───────────────────────────────────────────────

/** The ring at an EAS stage: 0 benzene + E⁺, 1 the σ-complex, 2 the product; with the arrows for the next move. */
export function easPicture(group: string, electrophile: string, charge: number, stage: number): HydrocarbonPicture {
  const ring = benzeneMolecule(0);
  if (stage === 0) {
    ring.atoms.push({ el: "N", x: 0.9, y: -2.2, label: electrophile.replace(/[⁺⁻]/g, ""), charge });
    // π electrons of C1=C2 attack E⁺; E bonds to C1.
    return { molecule: ring, arrows: [pair({ bond: [0, 1] }, { atom: 6 }, -1)] };
  }
  if (stage === 1) {
    const sigma: Molecule2D = {
      atoms: [...ring.atoms.map((a, i) => (i === 1 ? { ...a, charge: 1 } : a)), { el: "H", x: -0.6, y: -1.9 }, { el: "N", x: 0.6, y: -1.9, label: group }],
      bonds: [single(0, 1), { a: 1, b: 2, order: 1 }, { a: 2, b: 3, order: 2 }, single(3, 4), { a: 4, b: 5, order: 2 }, single(5, 0), single(0, 6), single(0, 7)],
    };
    // The C–H pair falls back into the ring, restoring the π bond.
    return { molecule: sigma, arrows: [pair({ bond: [0, 6] }, { bond: [0, 1] }, 1)] };
  }
  ring.atoms.push({ el: "N", x: 0, y: -2, label: group });
  ring.bonds.push(single(0, 6));
  return { molecule: ring, arrows: [] };
}

function drawEas(ctx: CanvasRenderingContext2D, l: HydrocarbonLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const r = hydrocarbonEasReaction(num(results.reaction));
  const stage = clamp(Math.round(num(results.easStage)), 0, 2);
  centred(ctx, l, r.name, 16, theme.text, theme.fontStrong);
  centred(ctx, l, r.reagents, 36, theme.muted, theme.font);
  centred(ctx, l, `Step ${stage + 1} of 3: ${HYDROCARBON_EAS_STAGES[stage]}`, 58, theme.angle, theme.font);

  const picture = easPicture(r.group, r.electrophile, r.charge, stage);
  const placed = drawMolecule(ctx, picture.molecule, boxOf(l, 70, 228), {
    style: "skeletal",
    color: theme.neutral,
    font: theme.font,
    maxBond: 40,
    lineWidth: 2,
    atomColor: (i, a) => (a.label ? theme.cosine : a.charge ? theme.angle : i === 0 && stage === 1 ? theme.angle : undefined),
  });
  for (const a of picture.arrows) drawCurlyArrow(ctx, placed, resolveEnd(placed, a.from), resolveEnd(placed, a.to), { color: theme.angle, fishhook: a.fishhook, bend: a.bend });

  const lines =
    stage === 0
      ? [r.generation, `The ring's π electrons attack ${r.electrophile}`]
      : stage === 1
        ? ["σ-complex (arenium ion): one sp³ carbon", "The + is spread over three ring carbons"]
        : [`→ ${r.product} + H⁺`, "Losing H⁺ makes the ring aromatic again"];
  centred(ctx, l, lines[0]!, 248, theme.text, theme.font);
  centred(ctx, l, lines[1]!, 270, theme.muted, theme.font);
  if (words) {
    const e = r.charge === 0 ? `Electrophile: ${r.electrophile} (neutral, S electron-poor)` : `Electrophile: ${r.electrophile}`;
    centred(ctx, l, e, 296, theme.cosine, theme.fontStrong);
  }
  centred(ctx, l, "Substitution, not addition: aromaticity is kept", l.height - 16, theme.muted, theme.font);
}

// ── Directing effects ────────────────────────────────────────────────────────

/** Ring atoms at each position: ortho 1 and 5, meta 2 and 4, para 3 (the substituent is on atom 0). */
export const HYDROCARBON_POSITION_ATOMS: Readonly<Record<number, number[]>> = { 2: [1, 5], 3: [2, 4], 4: [3] };

const GROUP_TEXT: Readonly<Record<string, string>> = { h: "", oh: "OH", nh2: "NH₂", och3: "OCH₃", ch3: "CH₃", cl: "Cl", br: "Br", no2: "NO₂", cn: "CN", cho: "CHO", cooh: "COOH" };

function drawDirecting(ctx: CanvasRenderingContext2D, l: HydrocarbonLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const s = hydrocarbonSubstituent(num(results.substituent));
  const position = clamp(Math.round(num(results.position)), 2, 4);
  const directs = num(results.directs);
  const group = GROUP_TEXT[s.id] ?? "";
  centred(ctx, l, group ? `C₆H₅${s.label}: where does E⁺ attack?` : "Benzene: where does E⁺ attack?", 16, theme.text, theme.fontStrong);

  const mol = benzeneMolecule(0);
  if (group) {
    mol.atoms.push({ el: "N", x: 0, y: -2, label: group });
    mol.bonds.push(single(0, 6));
  }
  const placed = drawMolecule(ctx, mol, boxOf(l, 36, 224), {
    style: "skeletal",
    color: theme.neutral,
    font: theme.font,
    maxBond: 44,
    lineWidth: 2,
    atomColor: (i) => (i === 6 ? theme.cosine : undefined),
  });
  const c = placed.centre;
  const outward = (i: number, r: number) => {
    const p = placed.point(i);
    const d = Math.hypot(p.x - c.x, p.y - c.y) || 1;
    return { x: p.x + ((p.x - c.x) / d) * r, y: p.y + ((p.y - c.y) / d) * r };
  };
  // The chosen position, ringed; E⁺ comes in at the first of its carbons.
  const targets = HYDROCARBON_POSITION_ATOMS[position] ?? [3];
  for (const i of targets) {
    const p = placed.point(i);
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  const hit = targets[0]!;
  const from = outward(hit, 44);
  const to = outward(hit, 12);
  arrow(ctx, from.x, from.y, to.x, to.y, { color: theme.angle, width: 1.6, head: 7 });
  const tag = outward(hit, 54);
  label(ctx, "E⁺", tag.x, tag.y, { color: theme.angle, font: theme.fontStrong, align: "center" });
  const name = HYDROCARBON_POSITIONS[position] ?? "";
  label(ctx, name, l.left, 60, { color: theme.angle, font: theme.fontStrong });

  if (words && directs !== 0) {
    // Resonance leaves partial charges at ortho and para.
    const sign = directs === 1 ? "δ−" : "δ+";
    for (const i of [1, 3, 5]) {
      const p = outward(i, -16);
      label(ctx, sign, p.x, p.y, { color: directs === 1 ? theme.sine : theme.secant, font: theme.font, align: "center" });
    }
  }

  if (!words) {
    centred(ctx, l, "Ortho, meta or para?", 252, theme.muted, theme.font);
  } else {
    const act = num(results.activation) > 0 ? "activating" : num(results.activation) < 0 ? "deactivating" : "the reference";
    const head = group ? `${s.label}: ${HYDROCARBON_DIRECTS[directs]}, ${act}` : "Benzene: all six positions alike";
    centred(ctx, l, head, 252, theme.text, theme.fontStrong);
    const why = s.halogen
      ? "−I slows the ring; +R still steers to o and p"
      : s.resonance > 0
        ? "+R: a lone pair pushed into the ring"
        : s.resonance < 0
          ? "−R: the ring's π electrons pulled out"
          : s.inductive > 0
            ? "+I and hyperconjugation push electrons in"
            : "No group to push or pull electrons";
    centred(ctx, l, why, 274, theme.muted, theme.font);
    centred(ctx, l, `Attack at ${name}: ${num(results.favoured) === 1 ? "favoured" : "not favoured"}`, 298, num(results.favoured) === 1 ? theme.tangent : theme.secant, theme.font);
  }
  centred(ctx, l, "ortho: C2, C6 · meta: C3, C5 · para: C4", l.height - 16, theme.muted, theme.font);
}

export const hydrocarbonRenderer: SimulationRenderer<HydrocarbonLayout> = {
  id: "hydrocarbon",
  layout: (width) => computeHydrocarbonLayout(width),

  draw(ctx, layout, input) {
    ctx.clearRect(0, 0, layout.width, layout.height);
    const has = (layer: string) => input.layers.has(layer);
    if (has("mechanism")) drawMechanism(ctx, layout, input);
    else if (has("addition")) drawAddition(ctx, layout, input);
    else if (has("alkynes")) drawAlkynes(ctx, layout, input);
    else if (has("rings")) drawRings(ctx, layout, input);
    else if (has("kekule")) drawKekule(ctx, layout, input);
    else if (has("eas")) drawEas(ctx, layout, input);
    else if (has("directing")) drawDirecting(ctx, layout, input);
    else if (has("newman")) drawNewman(ctx, layout, input);
  },
};
