/**
 * Organic chemistry: basic principles.
 *
 * One canvas, seven views, chosen by the mode's layers:
 *   structure    — the builder's molecule, skeletal; with words on, its IUPAC
 *                  name, the parent chain in colour and its carbons numbered.
 *   isomers      — two isomers of one formula, one above the other, and
 *                  how they are related.
 *   acids        — a halogenated acid with its inductive pull marked, and
 *                  its pKa on a scale.
 *   resonance    — CH₂=CH–X with the curly arrows of its +R / −R effect
 *                  (for –CH₃, hyperconjugation), and the contributor.
 *   intermediates — a carbocation, radical or carbanion: groups, orbitals,
 *                  and where it sits in the stability order.
 *   electromeric — the +E and −E shifts as a reagent attacks.
 *   paper        — a chromatogram with a centimetre ruler.
 * Answers (names, relations, pKa, α-H, Rf …) appear only with "labels".
 */

import {
  ORGANIC_ACIDS,
  ORGANIC_CLASSES,
  ORGANIC_DEGREES,
  ORGANIC_DYES,
  ORGANIC_FORMULA_ORDER,
  ORGANIC_PAPER_CM,
  ORGANIC_PROBLEMS,
  ORGANIC_RELATIONS,
  ORGANIC_SPECIES,
  ORGANIC_SPECIES_ORDER,
  ORGANIC_SUBSTITUENT_ORDER,
  ORGANIC_SUBSTITUENTS,
  organicAcid,
  organicBuild,
  organicBuildFromResults,
  organicFormula,
  organicFormulaText,
  organicIsomerSet,
  organicShortName,
  type OrganicSubstituentId,
} from "@ise/chemistry-engine";
import { formatSignificant } from "@ise/units";
import { clamp, label, num } from "../shared/draw";
import {
  chainMolecule,
  drawBondArrow,
  drawCurlyArrow,
  drawMolecule,
  type ArrowEnd,
  type Box,
  type Molecule2D,
} from "../shared/molecule";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface OrganicLayout {
  width: number;
  height: number;
  /** The central column everything is drawn in. */
  left: number;
  right: number;
}

export function computeOrganicLayout(width: number): OrganicLayout {
  const column = Math.min(width - 32, 520);
  const left = (width - column) / 2;
  return { width, height: 380, left, right: left + column };
}

const centreX = (l: OrganicLayout) => (l.left + l.right) / 2;
const boxOf = (l: OrganicLayout, top: number, bottom: number): Box => ({ x: l.left, y: top, width: l.right - l.left, height: bottom - top });

/** "13 000", "0.87": a ratio to two significant figures, grouped in thousands. */
export function organicRatioText(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "0";
  const rounded = Number(v.toPrecision(2));
  if (rounded >= 1000) return String(Math.round(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return String(rounded);
}

// ── Naming ───────────────────────────────────────────────────────────────────

function drawNaming(ctx: CanvasRenderingContext2D, l: OrganicLayout, input: Parameters<SimulationRenderer<OrganicLayout>["draw"]>[2]) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const built = organicBuild(organicBuildFromResults(results));
  const named = built.named;
  const x = centreX(l);

  if (!named) {
    label(ctx, "No name", x, 18, { color: theme.secant, font: theme.fontStrong, align: "center" });
    const at = built.problemAt > 0 ? `C${built.problemAt}: ` : "";
    label(ctx, `${at}${ORGANIC_PROBLEMS[built.problem] ?? ""}`, x, 38, { color: theme.muted, font: theme.font, align: "center" });
  } else {
    label(ctx, words ? named.name : "name: ?", x, 18, { color: words ? theme.text : theme.muted, font: theme.fontStrong, align: "center" });
    const f = organicFormula(built.graph);
    const cls = ORGANIC_CLASSES[num(results.compoundClass)] ?? "";
    label(ctx, `${organicFormulaText(f)} · ${cls} · ${num(results.molarMass).toFixed(2)} g/mol`, x, 38, { color: theme.muted, font: theme.font, align: "center" });
  }

  const mol = chainMolecule(built.sketch);
  const chain = named && words ? named.chain : [];
  const onChain = new Set(chain);
  const chainBond = (a: number, b: number) => chain.some((c, k) => k + 1 < chain.length && ((c === a && chain[k + 1] === b) || (c === b && chain[k + 1] === a)));
  const condensed = built.graph.carbons.length <= 2;
  const placed = drawMolecule(ctx, mol, boxOf(l, 52, l.height - 76), {
    style: condensed ? "condensed" : "skeletal",
    color: theme.neutral,
    font: theme.font,
    maxBond: 40,
    lineWidth: 1.8,
    atomColor: (_, atom) => (atom.el === "O" ? theme.cosine : onChain.size > 0 && condensed ? theme.sine : undefined),
    bondColor: (_, b) => (chainBond(b.a, b.b) ? theme.sine : undefined),
  });

  if (words && named && !condensed) {
    // Number the parent chain, each number on the inside of its bend.
    chain.forEach((atom, k) => {
      const p = placed.point(atom);
      const nbrs = mol.bonds.flatMap((b) => (b.a === atom ? [b.b] : b.b === atom ? [b.a] : []));
      const mean = nbrs.reduce((s, j) => ({ x: s.x + placed.point(j).x / nbrs.length, y: s.y + placed.point(j).y / nbrs.length }), { x: 0, y: 0 });
      let dx = mean.x - p.x;
      let dy = mean.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 1e-6) [dx, dy] = [0, 1];
      else [dx, dy] = [dx / d, dy / d];
      label(ctx, String(k + 1), p.x + dx * 13, p.y + dy * 13, { color: theme.sine, font: theme.font, align: "center" });
    });
  }

  if (words && named) {
    const notes: string[] = [];
    if (num(results.chainChanged) === 1) notes.push(`Longest chain: ${named.chain.length} C, not the one drawn`);
    else if (num(results.reversed) === 1) notes.push("Numbered from the other end: lower locants");
    if (num(results.cisTrans) === 1) notes.push("Has cis and trans forms (see Isomers)");
    const short = organicShortName(named.name);
    if (short) notes.push(`Also written ${short}`);
    notes.slice(0, 2).forEach((n, i) => label(ctx, n, x, l.height - 50 + i * 20, { color: theme.text, font: theme.font, align: "center" }));
  }
}

// ── Isomers ──────────────────────────────────────────────────────────────────

function drawIsomers(ctx: CanvasRenderingContext2D, l: OrganicLayout, input: Parameters<SimulationRenderer<OrganicLayout>["draw"]>[2]) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const set = organicIsomerSet(ORGANIC_FORMULA_ORDER[num(results.formula)] ?? "c4h10");
  const x = centreX(l);
  label(ctx, words ? `${set.formula}: ${set.isomers.length} shown` : set.formula, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (words) {
    const line = set.structural > 0 ? `${set.structural} structural in all · ${set.note}` : set.note;
    label(ctx, line, x, 35, { color: theme.muted, font: theme.font, align: "center" });
  }
  const show = (index: number, top: number, bottom: number, tag: string, colour: string) => {
    const isomer = set.isomers[clamp(Math.round(num(index)), 0, set.isomers.length - 1)]!;
    const mol = chainMolecule(isomer.sketch);
    drawMolecule(ctx, mol, boxOf(l, top, bottom), {
      style: mol.atoms.length <= 3 ? "condensed" : "skeletal",
      color: colour,
      font: theme.font,
      maxBond: 34,
      lineWidth: 1.8,
      atomColor: (_, atom) => (atom.el === "O" ? theme.cosine : undefined),
    });
    label(ctx, `${tag}: ${isomer.name}`, x, bottom + 8, { color: theme.text, font: theme.font, align: "center" });
  };
  show(num(results.isomer), 46, 146, "A", theme.sine);
  if (words) {
    const relation = ORGANIC_RELATIONS[num(results.relation)] ?? "";
    const text = num(results.relation) === 0 ? "A and B are the same compound" : `A and B are ${relation}`;
    label(ctx, text, x, 182, { color: theme.angle, font: theme.fontStrong, align: "center" });
  }
  show(num(results.other), 200, 300, "B", theme.tangent);
}

// ── Inductive effect: acids ──────────────────────────────────────────────────

const PKA_MAX = 5;

/** Where a pKa sits on the scale (0 at the left, 5 at the right). */
export function pKaX(l: OrganicLayout, pKa: number): number {
  return l.left + 14 + (clamp(pKa, 0, PKA_MAX) / PKA_MAX) * (l.right - l.left - 28);
}

function drawAcids(ctx: CanvasRenderingContext2D, l: OrganicLayout, input: Parameters<SimulationRenderer<OrganicLayout>["draw"]>[2]) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const acid = organicAcid(num(results.acid));
  const x = centreX(l);
  label(ctx, `${acid.formula} · ${acid.name}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (words) label(ctx, `pKa = ${acid.pKa.toFixed(2)} · Ka = ${formatSignificant(num(results.ka), 2)}`, x, 36, { color: theme.angle, font: theme.font, align: "center" });

  const mol = chainMolecule(acid.sketch);
  const halogen = (el: string) => el === "F" || el === "Cl" || el === "Br" || el === "I";
  const placed = drawMolecule(ctx, mol, boxOf(l, 48, 200), {
    style: "condensed",
    color: theme.neutral,
    font: theme.font,
    maxBond: 46,
    lineWidth: 1.8,
    atomColor: (_, atom) => (halogen(atom.el) ? theme.cosine : atom.el === "O" ? theme.sine : undefined),
  });
  // −I: each C–X bond pulls towards X, and the pull runs back along the chain from the carboxyl carbon.
  const carboxyl = acid.sketch.atoms.length - 1;
  for (const b of mol.bonds) {
    if (halogen(mol.atoms[b.b]!.el)) {
      drawBondArrow(ctx, placed, b.a, b.b, { color: theme.cosine });
      for (let k = carboxyl; k > b.a; k--) drawBondArrow(ctx, placed, k, k - 1, { color: theme.cosine });
    }
  }

  // The pKa scale.
  const y = 262;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pKaX(l, 0), y);
  ctx.lineTo(pKaX(l, PKA_MAX), y);
  for (let p = 0; p <= PKA_MAX; p++) {
    ctx.moveTo(pKaX(l, p), y);
    ctx.lineTo(pKaX(l, p), y + 6);
  }
  ctx.stroke();
  ctx.restore();
  for (let p = 0; p <= PKA_MAX; p++) label(ctx, String(p), pKaX(l, p), y + 16, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "pKa — stronger acid to the left", x, y + 34, { color: theme.muted, font: theme.font, align: "center" });
  const ref = pKaX(l, ORGANIC_ACIDS[0]!.pKa);
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(ref, y - 26);
  ctx.lineTo(ref, y);
  ctx.stroke();
  ctx.restore();
  label(ctx, "CH₃COOH", ref, y - 34, { color: theme.muted, font: theme.font, align: "right" });
  if (words) {
    const px = pKaX(l, acid.pKa);
    ctx.save();
    ctx.fillStyle = theme.angle;
    ctx.beginPath();
    ctx.moveTo(px, y - 2);
    ctx.lineTo(px - 6, y - 14);
    ctx.lineTo(px + 6, y - 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const times = num(results.relativeStrength);
    const verdict = acid.pKa === ORGANIC_ACIDS[0]!.pKa ? "The yardstick: ethanoic acid" : `${organicRatioText(times)}× as strong as ethanoic acid`;
    label(ctx, verdict, x, l.height - 34, { color: theme.text, font: theme.font, align: "center" });
    if (acid.halogens > 0) {
      const where = ["", "α", "β", "γ"][acid.position] ?? "";
      label(ctx, `${acid.halogens} ${acid.halogen} on the ${where} carbon: −I pulls electrons`, x, l.height - 14, { color: theme.muted, font: theme.font, align: "center" });
    }
  }
}

// ── Resonance ────────────────────────────────────────────────────────────────

interface ResonancePicture {
  molecule: Molecule2D;
  arrows: [ArrowEnd, ArrowEnd][];
  /** The atom that gives or takes the electrons, for the words. */
  atom: string;
}

/** CH₂=CH–X drawn with the arrows of its resonance (or, for –CH₃, hyperconjugation). */
export function resonancePicture(id: OrganicSubstituentId): ResonancePicture {
  const make = (atoms: string[], orders: number[], branches: { at: number; atoms: string[] }[] = []) => chainMolecule({ atoms, orders, branches });
  const donor = (atoms: string[], pairs: number): ResonancePicture => {
    const m = make(atoms, [2, 1, 1]);
    m.atoms[2]!.lonePairs = pairs;
    return { molecule: m, arrows: [[{ lonePair: 2 }, { bond: [1, 2] }], [{ bond: [0, 1] }, { atom: 0 }]], atom: atoms[2]! };
  };
  const acceptor = (m: Molecule2D, atom: string): ResonancePicture => ({ molecule: m, arrows: [[{ bond: [0, 1] }, { bond: [1, 2] }], [{ bond: [2, 3] }, { atom: 3 }]], atom });
  switch (id) {
    case "nh2": return donor(["C", "C", "N"], 1);
    case "oh": return donor(["C", "C", "O"], 2);
    case "och3": return donor(["C", "C", "O", "C"], 2);
    case "cl": return donor(["C", "C", "Cl"], 3);
    case "ch3": {
      const m = make(["C", "C", "C"], [2, 1], [{ at: 2, atoms: ["H"] }]);
      return { molecule: m, arrows: [[{ bond: [2, 3] }, { bond: [1, 2] }], [{ bond: [0, 1] }, { atom: 0 }]], atom: "C–H" };
    }
    case "no2": {
      const m = make(["C", "C", "N", "O"], [2, 1, 2], [{ at: 2, atoms: ["O"] }]);
      m.atoms[2]!.charge = 1;
      m.atoms[4]!.charge = -1;
      return acceptor(m, "O");
    }
    case "cn": return acceptor(make(["C", "C", "C", "N"], [2, 1, 3]), "N");
    case "cho": return acceptor(make(["C", "C", "C", "O"], [2, 1, 2]), "O");
    case "cooh": return acceptor(make(["C", "C", "C", "O"], [2, 1, 2], [{ at: 2, atoms: ["O"] }]), "O");
  }
}

function drawResonance(ctx: CanvasRenderingContext2D, l: OrganicLayout, input: Parameters<SimulationRenderer<OrganicLayout>["draw"]>[2]) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const id = ORGANIC_SUBSTITUENT_ORDER[num(results.substituent)] ?? "oh";
  const s = ORGANIC_SUBSTITUENTS[id];
  const x = centreX(l);
  const I = s.inductive > 0 ? "+I" : "−I";
  const R = s.resonance > 0 ? "+R" : s.resonance < 0 ? "−R" : "no R";
  label(ctx, words ? `${s.label}: ${I}, ${R}` : `CH₂=CH${s.label}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });

  const picture = resonancePicture(id);
  const placed = drawMolecule(ctx, picture.molecule, boxOf(l, 36, 206), {
    style: "condensed",
    color: theme.neutral,
    font: theme.font,
    maxBond: 50,
    lineWidth: 1.8,
    atomColor: (_, atom) => (atom.el === "C" || atom.el === "H" ? undefined : theme.cosine),
  });
  if (words) {
    for (const [from, to] of picture.arrows) drawCurlyArrow(ctx, placed, from, to, { color: theme.angle });
    label(ctx, s.contributor, x, 230, { color: theme.text, font: theme.font, align: "center" });
    const how =
      s.resonance > 0
        ? `+R: a lone pair on ${picture.atom} is pushed into the C=C`
        : s.resonance < 0
          ? `−R: the C=C's π electrons are drawn into ${s.label}`
          : "No R: C–H σ electrons spread in (hyperconjugation)";
    label(ctx, how, x, 262, { color: theme.text, font: theme.font, align: "center" });
    const pull = s.inductive > 0 ? "+I: the alkyl group pushes σ electrons" : `−I: ${s.label} pulls σ electrons towards itself`;
    label(ctx, pull, x, 284, { color: theme.muted, font: theme.font, align: "center" });
    label(ctx, "Charges in the contributor show where", x, l.height - 34, { color: theme.muted, font: theme.font, align: "center" });
    label(ctx, "electron density has moved", x, l.height - 16, { color: theme.muted, font: theme.font, align: "center" });
  }
}

// ── Reactive intermediates ───────────────────────────────────────────────────

/** The intermediate: central carbon with methyls and hydrogens, planar (sp²) or pyramidal (sp³). */
export function intermediateMolecule(species: "cation" | "radical" | "anion", degree: number): Molecule2D {
  const pyramidal = species === "anion";
  const spots = pyramidal
    ? [{ x: -1, y: 0.55 }, { x: 0.55, y: 0.85 }, { x: 0.85, y: 0.3 }]
    : [{ x: -1.05, y: 0.1 }, { x: 0.7, y: 0.45 }, { x: 0.8, y: -0.25 }];
  const centre = { el: "C", x: 0, y: 0, charge: species === "cation" ? 1 : species === "anion" ? -1 : 0, radical: species === "radical", lonePairs: pyramidal ? 1 : 0 };
  const groups = spots.map((p, k) => ({ el: k < degree ? "C" : "H", x: p.x, y: p.y }));
  return {
    atoms: [centre, ...groups],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1, stereo: "wedge" },
      { a: 0, b: 3, order: 1, stereo: "dash" },
    ],
  };
}

function lobe(ctx: CanvasRenderingContext2D, x: number, y: number, up: boolean, theme: LabTheme) {
  ctx.save();
  ctx.strokeStyle = theme.curve;
  ctx.fillStyle = theme.curve;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(x, y + (up ? -24 : 24), 9, 17, 0, 0, Math.PI * 2);
  ctx.globalAlpha = 0.14;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.restore();
}

function drawIntermediates(ctx: CanvasRenderingContext2D, l: OrganicLayout, input: Parameters<SimulationRenderer<OrganicLayout>["draw"]>[2]) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const id = ORGANIC_SPECIES_ORDER[num(results.species)] ?? "cation";
  const s = ORGANIC_SPECIES[id];
  const degree = clamp(Math.round(num(results.degree)), 0, 3);
  const x = centreX(l);
  const kind = degree === 0 ? `methyl ${s.name}` : `${ORGANIC_DEGREES[degree]} ${s.name}`;
  label(ctx, `${s.series[degree]} · ${kind}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, s.forms, x, 36, { color: theme.muted, font: theme.font, align: "center" });

  const mol = intermediateMolecule(id, degree);
  const placed = drawMolecule(ctx, mol, boxOf(l, 70, 190), {
    style: "condensed",
    color: theme.neutral,
    font: theme.font,
    maxBond: 46,
    lineWidth: 1.8,
    atomColor: (i) => (i === 0 ? theme.angle : undefined),
  });
  const c = placed.point(0);
  if (id === "anion") lobe(ctx, c.x, c.y, true, theme);
  else {
    lobe(ctx, c.x, c.y, true, theme);
    lobe(ctx, c.x, c.y, false, theme);
  }

  // The stability ladder, methyl to 3°.
  const y = 250;
  const cell = (l.right - l.left) / 4;
  const names = ["CH₃", "1°", "2°", "3°"];
  names.forEach((n, k) => {
    const cx = l.left + cell * (k + 0.5);
    ctx.save();
    ctx.strokeStyle = k === degree ? theme.angle : theme.axis;
    ctx.lineWidth = k === degree ? 2 : 1;
    ctx.strokeRect(cx - cell / 2 + 4, y - 13, cell - 8, 26);
    ctx.restore();
    label(ctx, n, cx, y, { color: k === degree ? theme.angle : theme.text, font: theme.font, align: "center" });
  });
  if (words) {
    const rising = s.charge >= 0;
    label(ctx, rising ? "stability increases →" : "← stability increases", x, y + 28, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `α-H: ${num(results.alphaH)} · sp${num(results.hybridisation) === 2 ? "²" : "³"} · ${s.electrons} valence electrons`, x, l.height - 40, { color: theme.angle, font: theme.font, align: "center" });
    label(ctx, s.shape, x, l.height - 18, { color: theme.muted, font: theme.font, align: "center" });
  }
}

// ── Electromeric effect ──────────────────────────────────────────────────────

function drawElectromeric(ctx: CanvasRenderingContext2D, l: OrganicLayout, input: Parameters<SimulationRenderer<OrganicLayout>["draw"]>[2]) {
  const { theme } = input;
  const x = centreX(l);
  const style = { style: "condensed" as const, color: theme.neutral, font: theme.font, maxBond: 44, lineWidth: 1.8 };

  label(ctx, "+E: H⁺ attacks C=C", x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const ethene: Molecule2D = {
    atoms: [{ el: "C", x: 0, y: 0 }, { el: "C", x: 1, y: 0 }, { el: "H", x: 2.4, y: -0.4, charge: 1, h: 0 }],
    bonds: [{ a: 0, b: 1, order: 2 }],
  };
  const top = drawMolecule(ctx, ethene, boxOf(l, 30, 110), style);
  drawCurlyArrow(ctx, top, { bond: [0, 1] }, { atom: 2 }, { color: theme.angle, bend: -1 });
  label(ctx, "→ CH₃–CH₂⁺", x, 124, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, "π electrons move to the C that H⁺ joins", x, 144, { color: theme.muted, font: theme.font, align: "center" });

  label(ctx, "−E: CN⁻ attacks C=O", x, 182, { color: theme.text, font: theme.fontStrong, align: "center" });
  const ketone = chainMolecule({ atoms: ["C", "C", "C"], branches: [{ at: 1, atoms: ["O"], order: 2 }] });
  ketone.atoms[3]!.lonePairs = 2;
  ketone.atoms.push({ el: "C", x: 2.6, y: -1.2, label: "CN", charge: -1, lonePairs: 1 });
  const bottom = drawMolecule(ctx, ketone, boxOf(l, 196, 290), { ...style, atomColor: (_, a) => (a.el === "O" ? theme.cosine : undefined) });
  drawCurlyArrow(ctx, bottom, { lonePair: 4 }, { atom: 1 }, { color: theme.angle });
  drawCurlyArrow(ctx, bottom, { bond: [1, 3] }, { atom: 3 }, { color: theme.angle, bend: -1 });
  label(ctx, "→ (CH₃)₂C(CN)–O⁻", x, 304, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, "π electrons move to O, away from the attack", x, 324, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "Temporary: only while the reagent attacks", x, l.height - 16, { color: theme.text, font: theme.font, align: "center" });
}

// ── Paper chromatography ─────────────────────────────────────────────────────

export interface PaperGeometry {
  left: number;
  right: number;
  /** Base line and the 10 cm mark. */
  base: number;
  top: number;
  perCm: number;
}

export function paperGeometry(l: OrganicLayout): PaperGeometry {
  const x = centreX(l);
  const base = l.height - 62;
  const top = 40;
  return { left: x - 80, right: x - 24, base, top, perCm: (base - top) / ORGANIC_PAPER_CM };
}

function drawPaper(ctx: CanvasRenderingContext2D, l: OrganicLayout, input: Parameters<SimulationRenderer<OrganicLayout>["draw"]>[2]) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const g = paperGeometry(l);
  const front = clamp(num(results.front), 0, ORGANIC_PAPER_CM);
  const yOf = (cm: number) => g.base - cm * g.perCm;
  label(ctx, "Paper chromatography of an ink", centreX(l), 16, { color: theme.text, font: theme.fontStrong, align: "center" });

  // Solvent below the base line, and the wet paper above it.
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(g.left - 14, g.base + 12, g.right - g.left + 28, 22);
  ctx.globalAlpha = 0.1;
  ctx.fillRect(g.left, yOf(front), g.right - g.left, g.base + 12 - yOf(front));
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(g.left, g.top - 6, g.right - g.left, g.base + 24 - g.top);
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(g.left, g.base);
  ctx.lineTo(g.right, g.base);
  ctx.stroke();
  ctx.restore();
  if (front > 0) {
    ctx.save();
    ctx.strokeStyle = theme.sine;
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(g.left, yOf(front));
    ctx.lineTo(g.right, yOf(front));
    ctx.stroke();
    ctx.restore();
  }

  // The ruler, 0–10 cm from the base line.
  const rx = g.left - 22;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.beginPath();
  ctx.moveTo(rx, g.base);
  ctx.lineTo(rx, yOf(ORGANIC_PAPER_CM));
  for (let cm = 0; cm <= ORGANIC_PAPER_CM; cm += 0.5) {
    const tick = cm % 1 === 0 ? 7 : 4;
    ctx.moveTo(rx, yOf(cm));
    ctx.lineTo(rx + tick, yOf(cm));
  }
  ctx.stroke();
  ctx.restore();
  for (let cm = 0; cm <= ORGANIC_PAPER_CM; cm += 2) label(ctx, String(cm), rx - 4, yOf(cm), { color: theme.muted, font: theme.font, align: "right" });
  label(ctx, "cm", rx - 4, g.base + 18, { color: theme.muted, font: theme.font, align: "right" });

  const colours = [theme.sine, theme.cosine, theme.tangent];
  const lane = (g.left + g.right) / 2;
  const distances = [num(results.distanceA), num(results.distanceB), num(results.distanceC)];
  ORGANIC_DYES.forEach((dye, k) => {
    const y = yOf(distances[k]!);
    ctx.save();
    ctx.fillStyle = colours[k]!;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.ellipse(lane, y, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Spread the words if spots are close together (early in the run).
    const ty = Math.min(g.base - 4, yOf(distances[k]!)) - (front < 3 ? k * 14 : 0);
    const text = words ? `${dye.name}: ${distances[k]!.toFixed(1)} cm · Rf ${dye.rf.toFixed(2)}` : dye.name;
    label(ctx, text, g.right + 10, ty, { color: colours[k]!, font: theme.font });
  });
  if (words && front > 0) label(ctx, `front: ${front.toFixed(1)} cm`, g.right + 10, yOf(front) - 12, { color: theme.sine, font: theme.font });
  label(ctx, "Rf = spot's distance ÷ solvent's distance", centreX(l), l.height - 14, { color: theme.text, font: theme.font, align: "center" });
}

export const organicRenderer: SimulationRenderer<OrganicLayout> = {
  id: "organic",
  layout: (width) => computeOrganicLayout(width),

  draw(ctx, layout, input) {
    ctx.clearRect(0, 0, layout.width, layout.height);
    const has = (layer: string) => input.layers.has(layer);
    if (has("isomers")) drawIsomers(ctx, layout, input);
    else if (has("acids")) drawAcids(ctx, layout, input);
    else if (has("resonance")) drawResonance(ctx, layout, input);
    else if (has("intermediates")) drawIntermediates(ctx, layout, input);
    else if (has("electromeric")) drawElectromeric(ctx, layout, input);
    else if (has("paper")) drawPaper(ctx, layout, input);
    else if (has("structure")) drawNaming(ctx, layout, input);
  },
};
