/**
 * Alcohols, phenols, ethers and carbonyl compounds.
 *
 * One canvas, eight views, chosen by the mode's layers:
 *   alcohol    — the alcohol (carbinol carbon ringed), a Lucas tube that
 *                clouds against the clock; with words, its degree, Lucas
 *                result, oxidation and dehydration products.
 *   boiling    — the compound; with words, a bar for every boiling point.
 *   acids      — the acid on a pKa scale; with words, its pKa, where the
 *                anion's charge goes (δ− on phenoxide's o/p carbons).
 *   phenol     — phenol and a reagent; with words, the product ring(s).
 *   williamson — an alkoxide meeting a halide; with words, the SN2 or E2
 *                arrows and the product.
 *   cleavage   — a protonated ether and I⁻; with words, the arrows and products.
 *   addition   — a nucleophile attacking C=O, with curly arrows.
 *   reaction   — a compound and a reagent; with words, the product and what
 *                the tube shows.
 * Answers (degree, products, boiling points, pKa …) appear only with "labels".
 */

import {
  OXY_ACID_FAMILIES,
  OXY_ANION_SPREAD,
  OXY_BOILING,
  OXY_CARBONYL_TYPES,
  OXY_CLEAVAGE,
  OXY_FAMILIES,
  OXY_GROUPS,
  OXY_LUCAS_MINUTES,
  OXY_REAGENTS,
  OXY_SUBSTRATES,
  OXY_WILLIAMSON,
  oxyAcid,
  oxyAlcohol,
  oxyAlcoholFactsAt,
  oxyAlkoxideGroup,
  oxyBoiling,
  oxyCleave,
  oxyEther,
  oxyHalideGroup,
  oxyMolarMass,
  oxyPhenolReaction,
  oxyReact,
  oxyReagentIndex,
  oxySubstrateIndex,
  oxyWilliamson,
  type OxyDrawing,
  type OxyRingGroup,
  type OrganicSketch,
} from "@ise/chemistry-engine";
import { formatSignificant } from "@ise/units";
import { arrow, clamp, label, num } from "../shared/draw";
import {
  chainMolecule,
  drawCurlyArrow,
  drawMolecule,
  type Atom2D,
  type Bond2D,
  type Box,
  type MoleculePlacement,
  type MoleculeStyleName,
  type Molecule2D,
} from "../shared/molecule";
import type { LabTheme } from "../theme";
import type { RenderInput, SimulationRenderer } from "../types";

export interface OxyLayout {
  width: number;
  height: number;
  /** The central column everything is drawn in. */
  left: number;
  right: number;
}

export function computeOxyLayout(width: number): OxyLayout {
  const column = Math.min(width - 32, 520);
  const left = (width - column) / 2;
  return { width, height: 380, left, right: left + column };
}

const centreX = (l: OxyLayout) => (l.left + l.right) / 2;
const boxOf = (l: OxyLayout, top: number, bottom: number): Box => ({ x: l.left, y: top, width: l.right - l.left, height: bottom - top });
const DEGREE = ["methyl", "1°", "2°", "3°"];

function say(ctx: CanvasRenderingContext2D, words: string, x: number, y: number, color: string, font: string, align: CanvasTextAlign = "center") {
  label(ctx, words, x, y, { color, font, align });
}

// ── Molecules ────────────────────────────────────────────────────────────────

/** A chain sketch as a molecule; atoms written "Ph" become a C₆H₅ label. */
export function oxySketchMolecule(sketch: OrganicSketch): Molecule2D {
  const mol = chainMolecule({
    atoms: sketch.atoms.map((a) => (a === "Ph" ? "C" : a)),
    orders: sketch.orders,
    branches: sketch.branches?.map((b) => ({ at: b.at, atoms: b.atoms.map((a) => (a === "Ph" ? "C" : a)), order: b.order })),
    cisAt: sketch.cisAt,
  });
  const all = [...sketch.atoms, ...(sketch.branches ?? []).flatMap((b) => b.atoms)];
  all.forEach((a, i) => {
    if (a === "Ph") mol.atoms[i] = { ...mol.atoms[i]!, label: "C₆H₅" };
  });
  return mol;
}

const RING_GROUPS: Readonly<Record<string, Partial<Atom2D>>> = {
  OH: { el: "O" },
  "O-": { el: "O", charge: -1 },
  Br: { el: "Br" },
  Cl: { el: "Cl" },
  CH3: { el: "C", show: true },
  NO2: { el: "N", label: "NO₂" },
  COOH: { el: "C", label: "COOH" },
  CHO: { el: "C", label: "CHO" },
};
/** The same groups written from the left ("O₂N–"). */
const RING_LEFT: Readonly<Record<string, string>> = { NO2: "O₂N", COOH: "HOOC", CHO: "OHC" };

/** Direction of ring position 1–6 (1 at the top, numbered clockwise), y down. */
const ringDirection = (pos: number) => {
  const a = ((-90 + 60 * (pos - 1)) * Math.PI) / 180;
  return { x: Math.round(Math.cos(a) * 1e9) / 1e9 || 0, y: Math.round(Math.sin(a) * 1e9) / 1e9 || 0 };
};

/** A benzene ring (Kekulé) with groups at positions 1–6. Atoms 0–5 are the ring, position p at atom p − 1. */
export function oxyRingMolecule(groups: readonly OxyRingGroup[]): Molecule2D {
  const atoms: Atom2D[] = [];
  const bonds: Bond2D[] = [];
  for (let k = 0; k < 6; k++) atoms.push({ el: "C", ...ringDirection(k + 1) });
  for (let k = 0; k < 6; k++) bonds.push({ a: k, b: (k + 1) % 6, order: k % 2 === 0 ? 2 : 1 });
  for (const g of groups) {
    const d = ringDirection(g.pos);
    const spec = RING_GROUPS[g.group] ?? { el: "C", label: g.group };
    const left = d.x < -0.1 && RING_LEFT[g.group];
    atoms.push({ el: "C", ...spec, ...(left ? { label: left } : {}), x: 2 * d.x, y: 2 * d.y });
    bonds.push({ a: g.pos - 1, b: atoms.length - 1, order: 1 });
  }
  return { atoms, bonds };
}

interface StructureStyle {
  theme: LabTheme;
  style?: MoleculeStyleName;
  maxBond?: number;
  color?: string;
}

/** Draw an engine drawing (ring, sketch or plain label) into a box. */
function drawStructure(ctx: CanvasRenderingContext2D, drawing: OxyDrawing, box: Box, s: StructureStyle): { placed: MoleculePlacement | null; mol: Molecule2D | null } {
  const { theme } = s;
  if (drawing.label) {
    say(ctx, drawing.label, box.x + box.width / 2, box.y + box.height / 2, s.color ?? theme.neutral, theme.fontStrong);
    return { placed: null, mol: null };
  }
  const mol = drawing.ring ? oxyRingMolecule(drawing.ring) : oxySketchMolecule(drawing.sketch ?? { atoms: ["C"] });
  const style = s.style ?? (drawing.ring ? "skeletal" : mol.atoms.length <= 3 ? "condensed" : "skeletal");
  const placed = drawMolecule(ctx, mol, box, {
    style,
    color: s.color ?? theme.neutral,
    font: theme.font,
    maxBond: s.maxBond ?? 34,
    lineWidth: 1.8,
    atomColor: (_, atom) => (atom.el === "O" || atom.el === "N" ? theme.cosine : atom.el === "Br" || atom.el === "Cl" || atom.el === "F" ? theme.tangent : undefined),
  });
  return { placed, mol };
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A test tube from `top` to `bottom`, liquid from `level`, tinted `fill` at `alpha`. */
function tube(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, level: number, fill: string, alpha: number, theme: LabTheme) {
  const w = 13;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(x - w, level);
  ctx.lineTo(x - w, bottom - w);
  ctx.arc(x, bottom - w, w, Math.PI, 0, true);
  ctx.lineTo(x + w, level);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - w, top);
  ctx.lineTo(x - w, bottom - w);
  ctx.arc(x, bottom - w, w, Math.PI, 0, true);
  ctx.lineTo(x + w, top);
  ctx.stroke();
  ctx.restore();
}

// ── Alcohols ─────────────────────────────────────────────────────────────────

const LUCAS_SHORT = ["turbid at once", "turbid in ~5 min", "no turbidity (room T)"];

/** The tube's x position: on the right of the column. */
export const lucasTubeX = (l: OxyLayout) => l.right - 30;

function drawAlcohol(ctx: CanvasRenderingContext2D, l: OxyLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const a = oxyAlcohol(num(results.alcohol));
  const f = oxyAlcoholFactsAt(num(results.alcohol));
  const x = centreX(l);
  say(ctx, `${a.name} · ${a.condensed}`, x, 16, theme.text, theme.fontStrong);
  say(ctx, `${f.formula} · ${f.molarMass.toFixed(2)} g/mol`, x, 36, theme.muted, theme.font);

  const tx = lucasTubeX(l);
  const mol = oxySketchMolecule(a.sketch);
  const o = mol.atoms.findIndex((at) => at.el === "O");
  const cBond = mol.bonds.find((b) => b.a === o || b.b === o)!;
  const carbinol = cBond.a === o ? cBond.b : cBond.a;
  const placed = drawMolecule(ctx, mol, { x: l.left, y: 50, width: tx - 30 - l.left, height: 140 }, {
    style: mol.atoms.length <= 2 ? "condensed" : "skeletal",
    color: theme.neutral,
    font: theme.font,
    maxBond: 40,
    lineWidth: 1.8,
    atomColor: (_, at) => (at.el === "O" ? theme.cosine : undefined),
    bondColor: (_, b) => (b.a === o || b.b === o ? theme.cosine : undefined),
  });
  if (words) {
    const p = placed.point(carbinol);
    ring(ctx, p.x, p.y, placed.labelled(carbinol) ? 14 : 8, theme.sine);
    const tag = f.degree === 0 ? "methyl" : `${DEGREE[f.degree]} C`;
    say(ctx, tag, p.x, p.y + 22, theme.sine, theme.font);
  }

  // The Lucas tube.
  const minutes = clamp(num(results.minutes), 0, OXY_LUCAS_MINUTES);
  const turbid = num(results.turbid) === 1;
  tube(ctx, tx, 56, 186, 104, turbid ? theme.neutral : theme.sine, turbid ? 0.6 : 0.14, theme);
  if (turbid) {
    ctx.save();
    ctx.fillStyle = theme.text;
    for (let k = 0; k < 12; k++) {
      ctx.beginPath();
      ctx.arc(tx - 8 + ((k * 7) % 17), 112 + ((k * 13) % 60), 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  say(ctx, "Lucas", tx, 46, theme.muted, theme.font);
  say(ctx, words ? `${minutes.toFixed(1)} min · ${turbid ? "turbid" : "clear"}` : `${minutes.toFixed(1)} min`, l.right, 202, theme.angle, theme.font, "right");

  if (!words) {
    say(ctx, "Words on: degree, Lucas, oxidation, dehydration", x, l.height - 20, theme.muted, theme.font);
    return;
  }
  const degree = f.degree === 0 ? "Methyl (as 1°)" : `${DEGREE[f.degree]} alcohol`;
  say(ctx, `${degree} · Lucas: ${LUCAS_SHORT[f.lucas]}`, x, 236, theme.text, theme.font);
  const oxidation =
    f.oxidation === 0 ? `[O]: ${f.aldehyde} → ${f.acid}` : f.oxidation === 1 ? `[O]: → ${f.ketone}` : "[O]: no reaction — no H on the C–OH carbon";
  say(ctx, oxidation, x, 262, theme.cosine, theme.font);
  const dehydration = f.dehydration ? `−H₂O, ${f.dehydration.reagent}, ${f.dehydration.kelvin} K → ${f.alkene}` : "No alkene: no carbon next to C–OH";
  say(ctx, dehydration, x, 288, theme.tangent, theme.font);
  if (f.alkeneCisTrans) say(ctx, "(the major alkene; it has cis and trans forms)", x, 308, theme.muted, theme.font);
  say(ctx, f.iodoform ? "Has CH₃CH(OH)–: gives iodoform" : "No CH₃CH(OH)–: no iodoform", x, 334, theme.muted, theme.font);
}

// ── Boiling points ───────────────────────────────────────────────────────────

const TB_MAX = 460;

/** Where a bar of `kelvin` ends, for the boiling-point chart. */
export function boilingBarEnd(l: OxyLayout, kelvin: number): number {
  const x0 = l.left + 96;
  return x0 + (clamp(kelvin, 0, TB_MAX) / TB_MAX) * (l.right - 40 - x0);
}

const familyColour = (theme: LabTheme, family: number) => [theme.neutral, theme.tangent, theme.sine, theme.cosine][family] ?? theme.neutral;

function drawBoiling(ctx: CanvasRenderingContext2D, l: OxyLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const index = num(results.bpCompound);
  const b = oxyBoiling(index);
  const x = centreX(l);
  say(ctx, `${b.name} · ${b.formula}`, x, 16, theme.text, theme.fontStrong);
  say(ctx, `M = ${oxyMolarMass(b.atoms).toFixed(2)} g/mol · ${OXY_FAMILIES[b.family]}`, x, 36, theme.muted, theme.font);
  drawStructure(ctx, b.drawing, boxOf(l, 46, 150), { theme, maxBond: 36 });

  if (!words) {
    say(ctx, "Turn on Words for the boiling points", x, l.height - 20, theme.muted, theme.font);
    return;
  }
  say(ctx, b.family >= 2 ? "O–H: its molecules hydrogen-bond" : "No O–H: no hydrogen bonds between molecules", x, 162, theme.cosine, theme.font);
  const x0 = l.left + 96;
  OXY_BOILING.forEach((c, k) => {
    const y = 186 + k * 23;
    const selected = c === b;
    const colour = familyColour(theme, c.family);
    say(ctx, c.name.length > 14 ? `${c.name.slice(0, 13)}.` : c.name, l.left, y, selected ? theme.text : theme.muted, selected ? theme.fontStrong : theme.font, "left");
    const end = boilingBarEnd(l, c.kelvin);
    ctx.save();
    ctx.fillStyle = colour;
    ctx.globalAlpha = selected ? 0.95 : 0.45;
    ctx.fillRect(x0, y - 7, end - x0, 14);
    ctx.restore();
    say(ctx, `${Math.round(c.kelvin)} K`, end + 4, y, selected ? theme.text : theme.muted, theme.font, "left");
  });
}

// ── Acidity ──────────────────────────────────────────────────────────────────

const PKA_TOP = 18;

/** Where a pKa sits on the scale (0 at the left, 18 at the right). */
export function oxyPKaX(l: OxyLayout, pKa: number): number {
  return l.left + 14 + (clamp(pKa, 0, PKA_TOP) / PKA_TOP) * (l.right - l.left - 28);
}

function drawAcids(ctx: CanvasRenderingContext2D, l: OxyLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const a = oxyAcid(num(results.acid));
  const x = centreX(l);
  say(ctx, a.formula === a.name || a.family === 0 ? a.name : `${a.name} · ${a.formula}`, x, 16, theme.text, theme.fontStrong);
  say(ctx, OXY_ACID_FAMILIES[a.family] ?? "", x, 36, theme.muted, theme.font);
  const { placed } = drawStructure(ctx, a.drawing, boxOf(l, 44, 172), { theme, maxBond: 36 });

  // Phenoxide: the charge goes onto the ortho and para carbons.
  if (words && a.family === 2 && placed) {
    const centre = [0, 1, 2, 3, 4, 5].map((k) => placed.point(k)).reduce((s, p) => ({ x: s.x + p.x / 6, y: s.y + p.y / 6 }), { x: 0, y: 0 });
    for (const k of [1, 3, 5]) {
      const p = placed.point(k);
      say(ctx, "δ−", p.x + (centre.x - p.x) * 0.42, p.y + (centre.y - p.y) * 0.42, theme.angle, theme.font);
    }
  }

  const y = 228;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(oxyPKaX(l, 0), y);
  ctx.lineTo(oxyPKaX(l, PKA_TOP), y);
  for (let p = 0; p <= PKA_TOP; p += 2) {
    ctx.moveTo(oxyPKaX(l, p), y);
    ctx.lineTo(oxyPKaX(l, p), y + 6);
  }
  ctx.stroke();
  ctx.restore();
  for (let p = 0; p <= PKA_TOP; p += 2) say(ctx, String(p), oxyPKaX(l, p), y + 16, theme.muted, theme.font);
  say(ctx, "pKa — stronger acid to the left", x, y + 34, theme.muted, theme.font);

  if (!words) return;
  const refs: [string, number][] = [["CH₃COOH", 4.76], ["phenol", 10], ["H₂O", 15.7]];
  for (const [name, pKa] of refs) {
    const rx = oxyPKaX(l, pKa);
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(rx, y - 22);
    ctx.lineTo(rx, y);
    ctx.stroke();
    ctx.restore();
    say(ctx, name, rx, y - 30, theme.muted, theme.font);
  }
  const px = oxyPKaX(l, a.pKa);
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.moveTo(px, y - 2);
  ctx.lineTo(px - 6, y - 14);
  ctx.lineTo(px + 6, y - 14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  say(ctx, `pKa = ${a.pKa.toFixed(2)} · Ka = ${formatSignificant(num(results.ka), 2)}`, x, 292, theme.angle, theme.font);
  say(ctx, `Anion: charge ${OXY_ANION_SPREAD[num(results.anionSpread)] ?? ""}`, x, 316, theme.text, theme.font);
  if (a.effect) say(ctx, a.effect, x, 340, theme.muted, theme.font);
}

// ── Phenol ───────────────────────────────────────────────────────────────────

function drawPhenol(ctx: CanvasRenderingContext2D, l: OxyLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const r = oxyPhenolReaction(num(results.phenolReaction));
  const x = centreX(l);
  say(ctx, `Phenol: ${r.name}`, x, 16, theme.text, theme.fontStrong);
  say(ctx, r.reagent, x, 36, theme.muted, theme.font);
  drawStructure(ctx, { ring: [{ pos: 1, group: "OH" }] }, boxOf(l, 44, 162), { theme, maxBond: 26 });
  arrow(ctx, x, 166, x, 188, { color: theme.muted, width: 1.5, head: 7 });

  if (!words) {
    say(ctx, "?", x, 246, theme.muted, theme.fontStrong);
    say(ctx, "Turn on Words to see the product", x, l.height - 20, theme.muted, theme.font);
    return;
  }
  const n = r.products.length;
  const w = (l.right - l.left) / n;
  r.products.forEach((p, k) => {
    const left = l.left + k * w;
    drawStructure(ctx, { ring: p.ring }, { x: left, y: 192, width: w, height: 112 }, { theme, maxBond: 26, color: theme.tangent });
    say(ctx, p.tag ? `${p.name} (${p.tag})` : p.name, left + w / 2, 314, theme.text, theme.font);
  });
  say(ctx, r.observation, x, 338, theme.angle, theme.font);
  if (r.electrophile) say(ctx, `Electrophile: ${r.electrophile}`, x, 360, theme.muted, theme.font);
}

// ── Williamson ───────────────────────────────────────────────────────────────

export interface WilliamsonPicture {
  molecule: Molecule2D;
  /** Atom indices: the alkoxide O, the halide's carbon, Br, and (for E2) the β-H. */
  nucleophile: number;
  alpha: number;
  bromine: number;
  hydrogen: number | null;
  beta: number | null;
}

/** R′O⁻ on the left, the halide R–Br in the middle and right; an explicit β-H when it will eliminate. */
export function williamsonPicture(halideGroup: number, alkoxideGroup: number, eliminates: boolean): WilliamsonPicture {
  const g = OXY_GROUPS[halideGroup]!;
  const o = OXY_GROUPS[alkoxideGroup]!;
  const atoms: Atom2D[] = [
    { el: "O", label: `${o.formula}O`, charge: -1, lonePairs: 1, x: -2.5, y: 0 },
    g.degree < 0 ? { el: "C", label: "C₆H₅", x: 0, y: 0 } : { el: "C", x: 0, y: 0 },
    { el: "Br", x: 1.1, y: 0 },
  ];
  const bonds: Bond2D[] = [{ a: 1, b: 2, order: 1 }];
  const spots = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -0.9, y: 0.45 }];
  const betas: number[] = [];
  for (let k = 0; k < Math.max(0, g.degree); k++) {
    atoms.push({ el: "C", ...spots[k]! });
    bonds.push({ a: 1, b: atoms.length - 1, order: 1 });
    betas.push(atoms.length - 1);
  }
  let hydrogen: number | null = null;
  let beta: number | null = null;
  if (eliminates && betas.length > 0) {
    beta = betas[0]!;
    atoms.push({ el: "H", x: -0.8, y: -1.5 });
    bonds.push({ a: beta, b: atoms.length - 1, order: 1 });
    hydrogen = atoms.length - 1;
  }
  return { molecule: { atoms, bonds }, nucleophile: 0, alpha: 1, bromine: 2, hydrogen, beta };
}

function drawWilliamson(ctx: CanvasRenderingContext2D, l: OxyLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const hg = oxyHalideGroup(num(results.halide));
  const og = oxyAlkoxideGroup(num(results.alkoxide));
  const w = oxyWilliamson(hg, og);
  const x = centreX(l);
  say(ctx, `${OXY_GROUPS[hg]!.formula}Br + ${OXY_GROUPS[og]!.formula}O⁻Na⁺`, x, 16, theme.text, theme.fontStrong);
  say(ctx, `The halide's carbon: ${OXY_GROUPS[hg]!.degree < 0 ? "aryl" : DEGREE[OXY_GROUPS[hg]!.degree]}`, x, 36, theme.muted, theme.font);

  const pic = williamsonPicture(hg, og, w.outcome === 2);
  const placed = drawMolecule(ctx, pic.molecule, boxOf(l, 48, 196), {
    style: "condensed",
    color: theme.neutral,
    font: theme.font,
    maxBond: 40,
    lineWidth: 1.8,
    atomColor: (i) => (i === pic.nucleophile ? theme.sine : i === pic.bromine ? theme.tangent : i === pic.hydrogen ? theme.angle : undefined),
  });

  if (!words) {
    say(ctx, "Ether, alkene, or nothing? Turn on Words.", x, l.height - 20, theme.muted, theme.font);
    return;
  }
  const curl = { color: theme.angle };
  if (w.outcome === 0 || w.outcome === 1) {
    drawCurlyArrow(ctx, placed, { lonePair: pic.nucleophile }, { atom: pic.alpha }, curl);
    drawCurlyArrow(ctx, placed, { bond: [pic.alpha, pic.bromine] }, { atom: pic.bromine }, curl);
  } else if (w.outcome === 2 && pic.hydrogen !== null && pic.beta !== null) {
    drawCurlyArrow(ctx, placed, { lonePair: pic.nucleophile }, { atom: pic.hydrogen }, curl);
    drawCurlyArrow(ctx, placed, { bond: [pic.beta, pic.hydrogen] }, { bond: [pic.beta, pic.alpha] }, curl);
    drawCurlyArrow(ctx, placed, { bond: [pic.alpha, pic.bromine] }, { atom: pic.bromine }, curl);
  }
  say(ctx, OXY_WILLIAMSON[w.outcome] ?? "", x, 222, theme.text, theme.fontStrong);
  const product =
    w.outcome === 0 ? `→ ${w.ether}` : w.outcome === 1 ? `→ ${w.ether} + ${w.alkene}` : w.outcome === 2 ? `→ ${w.alkene} + ${OXY_GROUPS[og]!.formula}OH + NaBr` : "→ no reaction";
  say(ctx, product, x, 248, theme.sine, theme.font);
  if (w.etherName) say(ctx, w.etherName, x, 270, theme.muted, theme.font);
  say(ctx, w.why, x, 300, theme.text, theme.font);
}

// ── Cleavage by HI ───────────────────────────────────────────────────────────

function drawCleavage(ctx: CanvasRenderingContext2D, l: OxyLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const [a, b] = oxyEther(num(results.ether));
  const c = oxyCleave(a, b);
  const x = centreX(l);
  say(ctx, `${c.ether} + HI`, x, 16, theme.text, theme.fontStrong);
  say(ctx, "HI first puts H⁺ on the ether's oxygen", x, 36, theme.muted, theme.font);

  const side = c.iodide === a ? 0 : 2;
  const molecule: Molecule2D = {
    atoms: [
      { el: "C", label: OXY_GROUPS[a]!.formula, x: -1.3, y: 0 },
      { el: "O", charge: 1, x: 0, y: 0 },
      { el: "C", label: OXY_GROUPS[b]!.right, x: 1.3, y: 0 },
      { el: "I", charge: -1, lonePairs: 1, x: side === 0 ? -1.3 : 1.3, y: 1.4 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
    ],
  };
  const broken = (bond: Bond2D) => words && (bond.a === side || bond.b === side);
  const placed = drawMolecule(ctx, molecule, boxOf(l, 52, 178), {
    style: "condensed",
    color: theme.neutral,
    font: theme.font,
    maxBond: 50,
    lineWidth: 1.8,
    atomColor: (i) => (i === 1 ? theme.cosine : i === 3 ? theme.tangent : undefined),
    bondColor: (_, bond) => (broken(bond) ? theme.secant : undefined),
  });
  if (!words) {
    say(ctx, "Which side becomes the iodide? Turn on Words.", x, l.height - 20, theme.muted, theme.font);
    return;
  }
  const curl = { color: theme.angle };
  drawCurlyArrow(ctx, placed, { bond: [side, 1] }, { atom: 1 }, curl);
  drawCurlyArrow(ctx, placed, { lonePair: 3 }, { atom: side }, curl);
  say(ctx, `→ ${c.products}`, x, 214, theme.sine, theme.fontStrong);
  say(ctx, OXY_CLEAVAGE[c.mechanism] ?? "", x, 240, theme.text, theme.font);
  const aryl = OXY_GROUPS[a]!.degree < 0 || OXY_GROUPS[b]!.degree < 0;
  const note = aryl
    ? "The O–aryl bond is not broken: phenol forms"
    : c.mechanism === 2
      ? `${OXY_GROUPS[c.iodide]!.formula}⁺ leaves first, then takes I⁻`
      : a === b
        ? `Excess HI and heat: two ${OXY_GROUPS[a]!.formula}I`
        : `I⁻ attacks the less crowded ${OXY_GROUPS[c.iodide]!.name} carbon`;
  say(ctx, note, x, 264, theme.muted, theme.font);
}

// ── Nucleophilic addition ────────────────────────────────────────────────────

export interface AdditionPicture {
  molecule: Molecule2D;
  carbon: number;
  oxygen: number;
  nucleophile: number;
}

const groupAtom = (g: string, x: number, y: number): Atom2D => (g === "H" ? { el: "H", x, y } : { el: "C", label: g, x, y });

/** The C=O with its two groups and an incoming nucleophile. */
export function additionPicture(groups: readonly [string, string], nucleophile: string): AdditionPicture {
  const molecule: Molecule2D = {
    atoms: [
      { el: "C", x: 0, y: 0 },
      { el: "O", lonePairs: 2, x: 0, y: -1 },
      groupAtom(groups[0], -0.87, 0.5),
      groupAtom(groups[1], 0.87, 0.5),
      { el: "C", label: nucleophile, charge: -1, lonePairs: 1, x: -1.9, y: -0.75 },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
    ],
  };
  return { molecule, carbon: 0, oxygen: 1, nucleophile: 4 };
}

const NUCLEOPHILE: Readonly<Record<number, string>> = { 8: "CN", 9: "CH₃" };

function drawAddition(ctx: CanvasRenderingContext2D, l: OxyLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const si = oxySubstrateIndex(num(results.substrate));
  const ri = oxyReagentIndex(num(results.reagent));
  const s = OXY_SUBSTRATES[si]!;
  const x = centreX(l);
  say(ctx, `${s.name} · ${s.formula}`, x, 16, theme.text, theme.fontStrong);
  if (!s.groups) {
    const kind = OXY_CARBONYL_TYPES[s.type] ?? "";
    say(ctx, `${/^[aeiou]/.test(kind) ? "An" : "A"} ${kind}: no aldehyde or ketone C=O`, x, 120, theme.muted, theme.font);
    say(ctx, "Pick an aldehyde or a ketone", x, 144, theme.muted, theme.font);
    return;
  }
  const nu = NUCLEOPHILE[ri] ?? "Nu";
  say(ctx, `Nucleophile: ${nu}⁻${ri === 9 ? " (from CH₃MgBr)" : ri === 8 ? " (from HCN)" : ""}`, x, 36, theme.muted, theme.font);
  const pic = additionPicture(s.groups, nu);
  const placed = drawMolecule(ctx, pic.molecule, boxOf(l, 52, 196), {
    style: "condensed",
    color: theme.neutral,
    font: theme.font,
    maxBond: 46,
    lineWidth: 1.8,
    atomColor: (i) => (i === pic.oxygen ? theme.cosine : i === pic.nucleophile ? theme.sine : undefined),
  });
  const c = placed.point(pic.carbon);
  const o = placed.point(pic.oxygen);
  say(ctx, "δ+", c.x + 16, c.y - 4, theme.angle, theme.font);
  say(ctx, "δ−", o.x + 18, o.y, theme.angle, theme.font);
  const curl = { color: theme.angle };
  drawCurlyArrow(ctx, placed, { lonePair: pic.nucleophile }, { atom: pic.carbon }, curl);
  drawCurlyArrow(ctx, placed, { bond: [pic.carbon, pic.oxygen] }, { atom: pic.oxygen }, { ...curl, bend: 1 });

  say(ctx, "sp², planar → sp³, tetrahedral", x, l.height - 18, theme.muted, theme.font);
  if (!words) return;
  const product = ri === 8 ? `→ ${s.cyanohydrin!.formula}, a cyanohydrin` : ri === 9 ? `→ (H₃O⁺) ${s.grignard!.formula}` : "Nu adds to C; O⁻ then takes H⁺";
  say(ctx, product, x, 224, theme.sine, theme.fontStrong);
  const crowd = ["no carbon groups: open and most δ+", "one carbon group: a little crowded", "two carbon groups: crowded, less δ+"][s.carbonGroups] ?? "";
  say(ctx, `${s.carbonGroups} on C=O — ${crowd}`, x, 250, theme.text, theme.font);
  if (s.aromatic) say(ctx, "The ring's resonance feeds the C=O: slower", x, 272, theme.muted, theme.font);
}

// ── Reactions and tests ──────────────────────────────────────────────────────

/** Colour of what a test tube shows, by product class (null: nothing to see). */
export function oxyTubeColour(theme: LabTheme, productClass: number): string | null {
  switch (productClass) {
    case 1: return theme.neutral;
    case 2: return theme.secant;
    case 3: return theme.angle;
    case 4: return theme.secant;
    default: return null;
  }
}

function drawReaction(ctx: CanvasRenderingContext2D, l: OxyLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const si = oxySubstrateIndex(num(results.substrate));
  const ri = oxyReagentIndex(num(results.reagent));
  const s = OXY_SUBSTRATES[si]!;
  const reagent = OXY_REAGENTS[ri]!;
  const r = oxyReact(si, ri);
  const x = centreX(l);
  say(ctx, `${s.name} + ${reagent.name}`, x, 16, theme.text, theme.fontStrong);
  say(ctx, reagent.reagent, x, 36, theme.muted, theme.font);

  const tx = l.right - 30;
  drawStructure(ctx, s.drawing, { x: l.left, y: 48, width: tx - 30 - l.left, height: 130 }, { theme, style: "condensed", maxBond: 38 });
  const colour = words ? oxyTubeColour(theme, r.productClass) : null;
  tube(ctx, tx, 56, 176, 112, colour ?? theme.sine, colour ? 0.7 : 0.14, theme);

  if (!words) {
    say(ctx, "Turn on Words to see what happens", x, l.height - 20, theme.muted, theme.font);
    return;
  }
  say(ctx, `${OXY_CARBONYL_TYPES[s.type]} · α-H: ${s.alphaH}`, tx, 192, theme.muted, theme.font, "right");
  if (r.reacts) {
    say(ctx, `→ ${r.product}`, x, 224, theme.sine, theme.fontStrong);
    say(ctx, r.productName, x, 248, theme.text, theme.font);
  } else {
    say(ctx, reagent.test ? "Negative: no change" : "No reaction", x, 224, theme.muted, theme.fontStrong);
  }
  say(ctx, r.why, x, 274, theme.muted, theme.font);
  if (r.productDegree > 0) say(ctx, `a ${DEGREE[r.productDegree]} alcohol`, x, 298, theme.angle, theme.font);
}

export const oxycompoundRenderer: SimulationRenderer<OxyLayout> = {
  id: "oxycompound",
  layout: (width) => computeOxyLayout(width),

  draw(ctx, layout, input) {
    ctx.clearRect(0, 0, layout.width, layout.height);
    const has = (layer: string) => input.layers.has(layer);
    if (has("boiling")) drawBoiling(ctx, layout, input);
    else if (has("acids")) drawAcids(ctx, layout, input);
    else if (has("phenol")) drawPhenol(ctx, layout, input);
    else if (has("williamson")) drawWilliamson(ctx, layout, input);
    else if (has("cleavage")) drawCleavage(ctx, layout, input);
    else if (has("addition")) drawAddition(ctx, layout, input);
    else if (has("reaction")) drawReaction(ctx, layout, input);
    else if (has("alcohol")) drawAlcohol(ctx, layout, input);
  },
};

