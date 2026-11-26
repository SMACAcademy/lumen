/**
 * Amines and biomolecules.
 *
 * One canvas, nine views, chosen by the mode's layers:
 *   basicity — the amine's structure (the lone pair on N; for an aniline,
 *              the curly arrows that spread it into the ring) and its pKb on a
 *              scale against ammonia.
 *   prep     — a preparation: starting compound → amine, with the carbons
 *              counted as beads (Hoffmann's lost carbon leaves as CO₃²⁻).
 *   tests    — carbylamine, Hinsberg and nitrous acid tubes for the amine.
 *   diazo    — benzenediazonium chloride, the reagent, and the product
 *              (an azo dye for coupling), with the 273–278 K window.
 *   sugars   — a carbohydrate's units and glycosidic links.
 *   anomers  — α- and β-D-glucopyranose (Haworth) and the specific rotation
 *              of their mixture.
 *   proteins — glycine or alanine in its dominant form at the pH, the pH
 *              scale with pKa₁, pI and pKa₂, and a peptide chain.
 *   enzymes  — lock and key, and a vitamin with its deficiency disease.
 *   dna      — a stretch of double helix with Chargaff's composition.
 * Answers (pKb, products, rotation, charge, percentages …) appear only with "labels".
 */

import {
  AMINEBIO_ALPHA_ROTATION,
  AMINEBIO_AMMONIA_PKB,
  AMINEBIO_BASES,
  AMINEBIO_BETA_ROTATION,
  AMINEBIO_COLOURS,
  AMINEBIO_DIAZO_MAX_K,
  AMINEBIO_EQUILIBRIUM_ROTATION,
  AMINEBIO_FORMS,
  AMINEBIO_HINSBERG,
  AMINEBIO_INVERT_ROTATION,
  AMINEBIO_NAMED,
  AMINEBIO_NITROUS,
  AMINEBIO_PRODUCT_CLASSES,
  AMINEBIO_ROUTES,
  AMINEBIO_SUCROSE_ROTATION,
  AMINEBIO_SUGAR_CLASSES,
  aminebioAmine,
  aminebioAminoAcid,
  aminebioBase,
  aminebioDiazo,
  aminebioEnzyme,
  aminebioPrepare,
  aminebioSugar,
  aminebioVitamin,
  type AminebioAmine,
} from "@ise/chemistry-engine";
import { formatSignificant } from "@ise/units";
import { clamp, label, num } from "../shared/draw";
import { chainMolecule, drawCurlyArrow, drawMolecule, type Atom2D, type Box, type Molecule2D } from "../shared/molecule";
import type { LabTheme } from "../theme";
import type { RenderInput, SimulationRenderer } from "../types";

export interface AminebioLayout {
  width: number;
  height: number;
  /** The central column everything is drawn in. */
  left: number;
  right: number;
}

export function computeAminebioLayout(width: number): AminebioLayout {
  const column = Math.min(width - 32, 520);
  const left = (width - column) / 2;
  return { width, height: 380, left, right: left + column };
}

const centreX = (l: AminebioLayout) => (l.left + l.right) / 2;
const boxOf = (l: AminebioLayout, top: number, bottom: number): Box => ({ x: l.left, y: top, width: l.right - l.left, height: bottom - top });
const fixed = (v: number, digits: number) => (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits);
/** "+52.5", "−19.95"; a value that rounds to zero has no sign. */
const signed = (v: number, digits = 1) => {
  const t = fixed(Math.abs(v), digits);
  return Number(t) === 0 ? t : `${v > 0 ? "+" : "−"}${t}`;
};

// ── Ring builder ──────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;

/** Add a benzene ring (Kekulé) centred at (cx, cy), vertex 0 at `startDeg` (y down); returns its atom indices. */
export function addBenzene(mol: Molecule2D, cx: number, cy: number, startDeg: number): number[] {
  const first = mol.atoms.length;
  for (let k = 0; k < 6; k++) {
    const a = (startDeg + 60 * k) * DEG;
    mol.atoms.push({ el: "C", x: cx + Math.cos(a), y: cy + Math.sin(a) });
  }
  for (let k = 0; k < 6; k++) mol.bonds.push({ a: first + k, b: first + ((k + 1) % 6), order: k % 2 === 0 ? 2 : 1 });
  return Array.from({ length: 6 }, (_, k) => first + k);
}

/** Hang atoms off atom `at` in direction `deg`, zig-zagging ±60° (or straight); returns the new indices. */
export function addGroup(mol: Molecule2D, at: number, deg: number, atoms: Partial<Atom2D>[], options: { orders?: number[]; straight?: boolean } = {}): number[] {
  const out: number[] = [];
  let prev = at;
  let dir = deg;
  atoms.forEach((spec, k) => {
    if (k > 0 && !options.straight) dir += k % 2 === 1 ? 60 : -60;
    const p = mol.atoms[prev]!;
    mol.atoms.push({ el: "C", ...spec, x: p.x + Math.cos(dir * DEG), y: p.y + Math.sin(dir * DEG) } as Atom2D);
    const index = mol.atoms.length - 1;
    mol.bonds.push({ a: prev, b: index, order: (options.orders?.[k] ?? 1) as 1 | 2 | 3 });
    out.push(index);
    prev = index;
  });
  return out;
}

const ringGroupAtom = (group: string): Partial<Atom2D> => (group === "Cl" ? { el: "Cl" } : { el: group === "CH₃" ? "C" : group.startsWith("O") ? "O" : "N", label: group });

export interface AmineDrawing {
  molecule: Molecule2D;
  /** Index of N. */
  n: number;
  /** For an aniline: the ipso and ortho carbons, for the curly arrows. */
  ring?: [number, number];
  style: "skeletal" | "condensed";
}

/** The amine's structure: alkyl groups round N (condensed), or a ring (skeletal). N carries its lone pair. */
export function amineDrawing(a: AminebioAmine): AmineDrawing {
  if (a.kind === "ammonia") return { molecule: { atoms: [{ el: "N", x: 0, y: 0, lonePairs: 1 }], bonds: [] }, n: 0, style: "condensed" };
  if (a.kind === "alkyl") {
    const c = Array.from({ length: a.alkylC }, () => "C");
    const atoms = a.degree === 1 ? [...c, "N"] : [...c, "N", ...c];
    const mol = chainMolecule({ atoms, branches: a.degree === 3 ? [{ at: a.alkylC, atoms: c }] : [] });
    mol.atoms[a.alkylC]!.lonePairs = 1;
    return { molecule: mol, n: a.alkylC, style: "condensed" };
  }
  const mol: Molecule2D = { atoms: [], bonds: [] };
  const ring = addBenzene(mol, 0, 0, -90);
  if (a.kind === "benzyl") {
    const [, n] = addGroup(mol, ring[0]!, -90, [{ el: "C" }, { el: "N", lonePairs: 1 }]);
    return { molecule: mol, n: n!, style: "skeletal" };
  }
  const [n] = addGroup(mol, ring[0]!, -90, [{ el: "N", lonePairs: 1 }]);
  for (let k = 0; k < a.degree - 1; k++) addGroup(mol, n!, k === 0 ? -150 : -30, [{ el: "C", label: "CH₃" }]);
  if (a.ringGroup) addGroup(mol, ring[3]!, 90, [ringGroupAtom(a.ringGroup)]);
  return { molecule: mol, n: n!, ring: [ring[0]!, ring[1]!], style: "skeletal" };
}

// ── Basicity ─────────────────────────────────────────────────────────────────

const PKB_MAX = 14;

/** "43 000", "56", "1.1": a ratio to two significant figures, grouped in thousands. */
export function aminebioRatioText(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "0";
  const rounded = Number(v.toPrecision(2));
  if (rounded >= 1000) return String(Math.round(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return String(rounded);
}

/** Where a pKb sits on the scale (0 at the left, 14 at the right). */
export function pKbX(l: AminebioLayout, pKb: number): number {
  return l.left + 14 + (clamp(pKb, 0, PKB_MAX) / PKB_MAX) * (l.right - l.left - 28);
}

const DEGREE_WORDS = ["ammonia", "1° amine", "2° amine", "3° amine"];

function drawBasicity(ctx: CanvasRenderingContext2D, l: AminebioLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const a = aminebioAmine(num(results.amine));
  const x = centreX(l);
  label(ctx, `${a.formula} · ${a.name}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const kind = a.kind === "aryl" ? "arylamine: N on the ring" : a.kind === "benzyl" ? "N on a CH₂, not on the ring" : a.kind === "alkyl" ? "alkylamine" : "NH₃";
  label(ctx, a.degree === 0 ? "the reference base" : `${DEGREE_WORDS[a.degree]} · ${kind}`, x, 36, { color: theme.muted, font: theme.font, align: "center" });

  const d = amineDrawing(a);
  const placed = drawMolecule(ctx, d.molecule, boxOf(l, 48, 200), {
    style: d.style,
    color: theme.neutral,
    font: theme.font,
    maxBond: 40,
    lineWidth: 1.8,
    atomColor: (i, atom) => (i === d.n ? theme.sine : atom.label || atom.el === "Cl" ? theme.cosine : undefined),
  });
  if (words && d.ring) {
    // The lone pair forms C=N; the ring's π pair moves on to the ortho carbon.
    drawCurlyArrow(ctx, placed, { lonePair: d.n }, { bond: [d.n, d.ring[0]] }, { color: theme.angle });
    drawCurlyArrow(ctx, placed, { bond: [d.ring[0], d.ring[1]] }, { atom: d.ring[1] }, { color: theme.angle });
  }

  // The pKb scale.
  const y = 236;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pKbX(l, 0), y);
  ctx.lineTo(pKbX(l, PKB_MAX), y);
  for (let p = 0; p <= PKB_MAX; p += 2) {
    ctx.moveTo(pKbX(l, p), y);
    ctx.lineTo(pKbX(l, p), y + 6);
  }
  ctx.stroke();
  ctx.restore();
  for (let p = 0; p <= PKB_MAX; p += 2) label(ctx, String(p), pKbX(l, p), y + 16, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "pKb — stronger base to the left", x, y + 34, { color: theme.muted, font: theme.font, align: "center" });
  const ref = pKbX(l, AMINEBIO_AMMONIA_PKB);
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(ref, y - 22);
  ctx.lineTo(ref, y);
  ctx.stroke();
  ctx.restore();
  label(ctx, "NH₃", ref, y - 28, { color: theme.muted, font: theme.font, align: "center" });
  if (words) {
    const px = pKbX(l, a.pKb);
    ctx.save();
    ctx.fillStyle = theme.sine;
    ctx.beginPath();
    ctx.moveTo(px, y - 2);
    ctx.lineTo(px - 6, y - 14);
    ctx.lineTo(px + 6, y - 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    label(ctx, `pKb = ${a.pKb.toFixed(2)} · Kb = ${formatSignificant(num(results.kb), 2)}`, x, 296, { color: theme.sine, font: theme.font, align: "center" });
    const ratio = num(results.vsAmmonia);
    const vs = a.degree === 0 ? "The yardstick for amines" : ratio >= 1 ? `${aminebioRatioText(ratio)}× as basic as NH₃` : `NH₃ is ${aminebioRatioText(1 / ratio)}× more basic`;
    label(ctx, vs, x, 316, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, a.why, x, 342, { color: theme.text, font: theme.font, align: "center" });
    const order = a.kind === "aryl" ? "Ring groups: +R/+I raise basicity, −R/−I lower it" : "Gas phase: 3° > 2° > 1° > NH₃ (+I alone)";
    label(ctx, order, x, 362, { color: theme.muted, font: theme.font, align: "center" });
  }
}

// ── Preparation ──────────────────────────────────────────────────────────────

function beads(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, colour: string, lost: number, theme: LabTheme) {
  const gap = 22;
  const total = count + lost;
  const start = x - ((total - 1) * gap) / 2;
  for (let k = 0; k < total; k++) {
    const cx = start + k * gap;
    if (k > 0) {
      ctx.save();
      ctx.strokeStyle = k >= count ? theme.secant : colour;
      ctx.lineWidth = 2;
      if (k >= count) ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(cx - gap + 8, y);
      ctx.lineTo(cx - 8, y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, y, 8, 0, Math.PI * 2);
    if (k < count) {
      ctx.fillStyle = colour;
      ctx.fill();
    } else {
      ctx.strokeStyle = theme.secant;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawPrep(ctx: CanvasRenderingContext2D, l: AminebioLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const route = clamp(Math.round(num(results.route)), 0, AMINEBIO_ROUTES.length - 1);
  const p = aminebioPrepare(route, num(results.substrate), num(results.carbons, 1));
  const r = AMINEBIO_ROUTES[route]!;
  const x = centreX(l);
  label(ctx, r.name, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, r.reagent, x, 36, { color: theme.muted, font: theme.font, align: "center" });

  label(ctx, p.start, x, 70, { color: theme.cosine, font: theme.fontStrong, align: "center" });
  label(ctx, p.startName, x, 88, { color: theme.muted, font: theme.font, align: "center" });
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.fillStyle = theme.axis;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, 102);
  ctx.lineTo(x, 132);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, 138);
  ctx.lineTo(x - 5, 129);
  ctx.lineTo(x + 5, 129);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (words) {
    label(ctx, p.works ? p.product : "no amine", x, 154, { color: p.works ? theme.sine : theme.secant, font: theme.fontStrong, align: "center" });
    label(ctx, p.works ? p.productName : "no reaction", x, 172, { color: theme.muted, font: theme.font, align: "center" });
  } else {
    label(ctx, "product: ?", x, 154, { color: theme.muted, font: theme.fontStrong, align: "center" });
  }

  // Carbons, start and product.
  label(ctx, `start: ${p.startCarbons} C`, l.left, 204, { color: theme.cosine, font: theme.font });
  beads(ctx, x, 226, p.startCarbons, theme.cosine, 0, theme);
  if (words && p.works) {
    const lost = p.startCarbons - p.productCarbons;
    label(ctx, `amine: ${p.productCarbons} C${lost > 0 ? " (one leaves as CO₃²⁻)" : ""}`, l.left, 258, { color: theme.sine, font: theme.font });
    beads(ctx, x, 280, p.productCarbons, theme.sine, Math.max(0, lost), theme);
    label(ctx, AMINEBIO_PRODUCT_CLASSES[p.productClass] ?? "", x, 310, { color: theme.text, font: theme.font, align: "center" });
    if (p.ringAmine) label(ctx, "N on the ring: an arylamine", x, 330, { color: theme.text, font: theme.font, align: "center" });
  }
  if (words && p.note) label(ctx, p.note, x, l.height - 14, { color: theme.muted, font: theme.font, align: "center" });
}

// ── Tests ────────────────────────────────────────────────────────────────────

function tube(ctx: CanvasRenderingContext2D, x: number, top: number, theme: LabTheme, fill: string) {
  const w = 22;
  const h = 70;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(x - w / 2, top + h * 0.4, w, h * 0.6 - w / 2);
  ctx.beginPath();
  ctx.arc(x, top + h - w / 2, w / 2, 0, Math.PI);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, top);
  ctx.lineTo(x - w / 2, top + h - w / 2);
  ctx.arc(x, top + h - w / 2, w / 2, Math.PI, 0, true);
  ctx.lineTo(x + w / 2, top);
  ctx.stroke();
  ctx.restore();
}

function dots(ctx: CanvasRenderingContext2D, points: [number, number][], r: number, colour: string, filled: boolean) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  for (const [px, py] of points) {
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    if (filled) ctx.fill();
    else ctx.stroke();
  }
  ctx.restore();
}

function drawTests(ctx: CanvasRenderingContext2D, l: AminebioLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const a = aminebioAmine(num(results.amine));
  const x = centreX(l);
  label(ctx, `Tests on ${a.formula}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (words) label(ctx, a.degree === 0 ? "ammonia" : DEGREE_WORDS[a.degree]!, x, 34, { color: theme.muted, font: theme.font, align: "center" });

  const carbyl = num(results.carbylamine);
  const hins = clamp(Math.round(num(results.hinsberg)), 0, 3);
  const nitrous = clamp(Math.round(num(results.nitrous)), 0, 2);
  const tx = l.left + 18;
  const text = l.left + 44;
  const rows: { top: number; name: string; reagent: string; result: string }[] = [
    { top: 50, name: "Carbylamine test", reagent: "CHCl₃ + ethanolic KOH, warm", result: carbyl ? "R–NC, an isocyanide: foul smell" : "no isocyanide: no smell" },
    { top: 160, name: "Hinsberg's test", reagent: "C₆H₅SO₂Cl, then KOH(aq)", result: AMINEBIO_HINSBERG[hins]! },
    { top: 270, name: "Nitrous acid", reagent: "NaNO₂ + HCl, cold", result: AMINEBIO_NITROUS[nitrous]! },
  ];
  rows.forEach((row, k) => {
    tube(ctx, tx, row.top, theme, theme.sine);
    const bottom = row.top + 70;
    if (k === 0 && carbyl) {
      // Wavy lines: the smell.
      ctx.save();
      ctx.strokeStyle = theme.secant;
      ctx.lineWidth = 1.2;
      for (const dx of [-5, 5]) {
        ctx.beginPath();
        ctx.moveTo(tx + dx, row.top - 2);
        ctx.quadraticCurveTo(tx + dx + 4, row.top - 8, tx + dx, row.top - 14);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (k === 1 && hins === 2) dots(ctx, [[tx - 5, bottom - 8], [tx + 2, bottom - 6], [tx + 6, bottom - 10], [tx - 1, bottom - 12]], 2, theme.point, true);
    if (k === 2 && nitrous === 1) dots(ctx, [[tx - 3, bottom - 14], [tx + 4, bottom - 24], [tx - 2, bottom - 34]], 3, theme.point, false);
    label(ctx, row.name, text, row.top + 10, { color: theme.text, font: theme.fontStrong });
    label(ctx, row.reagent, text, row.top + 30, { color: theme.muted, font: theme.font });
    if (words) label(ctx, row.result, text, row.top + 52, { color: theme.angle, font: theme.font });
  });
}

// ── Diazonium salts ──────────────────────────────────────────────────────────

/** Benzenediazonium: Ar–N⁺≡N. */
export function diazoniumMolecule(): Molecule2D {
  const mol: Molecule2D = { atoms: [], bonds: [] };
  const ring = addBenzene(mol, 0, 0, 0);
  addGroup(mol, ring[0]!, 0, [{ el: "N", charge: 1 }, { el: "N" }], { orders: [1, 3], straight: true });
  return mol;
}

/** The product: C₆H₅–X, or an azo dye p-X–C₆H₄–N=N–C₆H₅ for coupling. */
export function diazoProductMolecule(index: number): Molecule2D {
  const d = aminebioDiazo(index);
  const mol: Molecule2D = { atoms: [], bonds: [] };
  if (d.keepsNitrogen) {
    const a = addBenzene(mol, 0, 0, 0);
    const [, n2] = addGroup(mol, a[0]!, -30, [{ el: "N" }, { el: "N" }], { orders: [1, 2] });
    const n = mol.atoms[n2!]!;
    const ipso = { x: n.x + Math.cos(-30 * DEG), y: n.y + Math.sin(-30 * DEG) };
    const b = addBenzene(mol, ipso.x + 1, ipso.y, 180);
    mol.bonds.push({ a: n2!, b: b[0]!, order: 1 });
    addGroup(mol, b[3]!, 0, [d.group === "OH" ? { el: "O" } : { el: "N" }]);
    return mol;
  }
  const ring = addBenzene(mol, 0, 0, 0);
  if (d.group === "H") return mol;
  const atom: Partial<Atom2D> = d.group === "OH" ? { el: "O" } : d.group.length <= 2 && d.group !== "CN" ? { el: d.group } : { el: d.group === "CN" ? "C" : "N", label: d.group };
  addGroup(mol, ring[0]!, 0, [atom]);
  return mol;
}

/** Where a temperature sits on the window bar. */
export function temperatureX(l: AminebioLayout, kelvin: number): number {
  return l.left + 20 + ((clamp(kelvin, 273, 303) - 273) / 30) * (l.right - l.left - 40);
}

function drawDiazo(ctx: CanvasRenderingContext2D, l: AminebioLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const d = aminebioDiazo(num(results.reagent));
  const x = centreX(l);
  label(ctx, `C₆H₅N₂⁺Cl⁻ + ${d.reagent}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const named = AMINEBIO_NAMED[d.named] ?? "";
  if (words) label(ctx, named === "coupling" ? "Coupling: –N=N– kept, an azo dye" : named ? `${named} reaction: N₂ lost` : "N₂ is replaced", x, 34, { color: theme.muted, font: theme.font, align: "center" });

  const style = { style: "skeletal" as const, color: theme.neutral, font: theme.font, maxBond: 26, lineWidth: 1.6 };
  drawMolecule(ctx, diazoniumMolecule(), boxOf(l, 42, 112), { ...style, atomColor: (_, a) => (a.el === "N" ? theme.sine : undefined) });
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.fillStyle = theme.axis;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, 116);
  ctx.lineTo(x, 136);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, 142);
  ctx.lineTo(x - 5, 133);
  ctx.lineTo(x + 5, 133);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (words) {
    const dye = d.colour === 1 ? theme.secant : d.colour === 2 ? theme.angle : theme.neutral;
    drawMolecule(ctx, diazoProductMolecule(num(results.reagent)), boxOf(l, 146, 236), { ...style, color: dye, atomColor: (_, a) => (a.el !== "C" || a.label ? theme.cosine : undefined) });
    label(ctx, `${d.productName}${d.colour ? ` · ${AMINEBIO_COLOURS[d.colour]} dye` : ""}`, x, 248, { color: theme.text, font: theme.font, align: "center" });
  } else {
    label(ctx, "product: ?", x, 190, { color: theme.muted, font: theme.fontStrong, align: "center" });
  }

  // The temperature window.
  const y = 296;
  const t = clamp(num(results.temperature, 276), 273, 303);
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(temperatureX(l, 273), y - 8, temperatureX(l, AMINEBIO_DIAZO_MAX_K) - temperatureX(l, 273), 16);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(temperatureX(l, 273), y - 8, temperatureX(l, 303) - temperatureX(l, 273), 16);
  ctx.restore();
  for (const k of [273, 278, 283, 293, 303]) label(ctx, String(k), temperatureX(l, k), y + 20, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "K", l.right - 4, y + 20, { color: theme.muted, font: theme.font, align: "right" });
  const tx = temperatureX(l, t);
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.moveTo(tx, y - 9);
  ctx.lineTo(tx - 6, y - 20);
  ctx.lineTo(tx + 6, y - 20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  label(ctx, `Diazonium salt solution at ${t.toFixed(0)} K`, x, y - 32, { color: theme.text, font: theme.font, align: "center" });
  if (words) {
    const kept = num(results.saltKept) === 1;
    label(ctx, kept ? "Kept: made and used at 273–278 K" : "Too warm: decomposes to phenol + N₂", x, l.height - 18, { color: kept ? theme.tangent : theme.secant, font: theme.font, align: "center" });
  }
}

// ── Carbohydrates ────────────────────────────────────────────────────────────

const UNIT_NAMES: Readonly<Record<string, string>> = { g: "α-Glc", b: "β-Glc", f: "β-Fru", a: "β-Gal", r: "Rib" };

function ringShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, sides: number, r: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let k = 0; k <= sides; k++) {
    const a = (-90 + (360 / sides) * k + (sides === 6 ? 30 : 0)) * DEG;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawSugars(ctx: CanvasRenderingContext2D, l: AminebioLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const s = aminebioSugar(num(results.sugar));
  const x = centreX(l);
  label(ctx, `${s.name} · ${s.formula}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (words) label(ctx, `${AMINEBIO_SUGAR_CLASSES[s.cls]} · ${s.reducing ? "reducing" : "non-reducing"}`, x, 36, { color: theme.muted, font: theme.font, align: "center" });

  const units = s.units.split("");
  const poly = s.cls === 3;
  const gap = Math.min(70, (l.right - l.left - 40) / Math.max(1, units.length));
  const r = Math.min(22, gap * 0.36);
  const y = 100;
  const start = x - ((units.length - 1) * gap) / 2;
  units.forEach((u, k) => {
    const cx = start + k * gap;
    const colour = u === "f" ? theme.tangent : u === "a" ? theme.angle : u === "b" ? theme.cosine : theme.sine;
    ringShape(ctx, cx, y, u === "f" || u === "r" ? 5 : 6, r, colour);
    label(ctx, UNIT_NAMES[u] ?? "", cx, y + r + 12, { color: colour, font: theme.font, align: "center" });
    if (k > 0) {
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx - gap + r, y);
      ctx.lineTo(cx - r, y);
      ctx.stroke();
      ctx.restore();
      label(ctx, "O", cx - gap / 2, y - 9, { color: theme.cosine, font: theme.font, align: "center" });
    }
  });
  if (poly) {
    label(ctx, "…", start - gap / 2, y, { color: theme.muted, font: theme.fontStrong, align: "center" });
    label(ctx, "…", start + (units.length - 0.5) * gap, y, { color: theme.muted, font: theme.fontStrong, align: "center" });
  }
  if (s.branched) {
    // A C1–C6 branch hanging below the second unit.
    const bx = start + gap;
    ctx.save();
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx, y + r + 20);
    ctx.lineTo(bx, y + r + 44);
    ctx.stroke();
    ctx.restore();
    ringShape(ctx, bx, y + 2 * r + 50, 6, r, theme.sine);
    label(ctx, "C1–C6", bx + 8, y + r + 32, { color: theme.muted, font: theme.font });
  }

  if (words) {
    label(ctx, s.link, x, 236, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, s.cls === 1 ? "Not hydrolysed further" : `Hydrolysis gives ${s.gives}`, x, 258, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, s.reducing ? "Reduces Tollens' and Fehling's reagents" : "Does not reduce Tollens' or Fehling's", x, 280, { color: s.reducing ? theme.tangent : theme.secant, font: theme.font, align: "center" });
    const mass = num(results.sugarMass);
    if (mass > 0) label(ctx, `M = ${mass.toFixed(2)} g/mol`, x, 302, { color: theme.angle, font: theme.font, align: "center" });
    if (s.name === "sucrose") {
      label(ctx, `Sucrose ${signed(AMINEBIO_SUCROSE_ROTATION)}° → invert sugar ${signed(AMINEBIO_INVERT_ROTATION, 2)}°`, x, 334, { color: theme.text, font: theme.font, align: "center" });
      label(ctx, "Fructose −92.4° outweighs glucose +52.5°", x, 354, { color: theme.muted, font: theme.font, align: "center" });
    }
  }
}

// ── Anomers ──────────────────────────────────────────────────────────────────

/** α- or β-D-glucopyranose as a Haworth projection: ring O at the back right, C1 on the right. */
export function haworthMolecule(anomer: "alpha" | "beta"): Molecule2D {
  const ring: Atom2D[] = [
    { el: "O", x: 0.7, y: -0.5 },
    { el: "C", x: 1.35, y: 0.15 },
    { el: "C", x: 0.7, y: 0.65 },
    { el: "C", x: -0.7, y: 0.65 },
    { el: "C", x: -1.35, y: 0.15 },
    { el: "C", x: -0.7, y: -0.5 },
  ];
  const mol: Molecule2D = { atoms: [...ring], bonds: [] };
  for (let k = 0; k < 6; k++) mol.bonds.push({ a: k, b: (k + 1) % 6, order: 1 });
  const hang = (at: number, up: boolean, text: string) => {
    const p = mol.atoms[at]!;
    mol.atoms.push({ el: text === "H" ? "H" : text === "OH" ? "O" : "C", label: text, x: p.x, y: p.y + (up ? -0.75 : 0.75) });
    mol.bonds.push({ a: at, b: mol.atoms.length - 1, order: 1 });
  };
  const up = anomer === "beta";
  hang(1, up, "OH"); // C1, the anomeric carbon
  hang(1, !up, "H");
  hang(2, false, "OH");
  hang(3, true, "OH");
  hang(4, false, "OH");
  hang(5, true, "CH₂OH");
  return mol;
}

/** Where a rotation sits on the scale (+18.7° … +112°, left to right). */
export function rotationX(l: AminebioLayout, deg: number): number {
  const lo = AMINEBIO_BETA_ROTATION;
  const hi = AMINEBIO_ALPHA_ROTATION;
  return l.left + 20 + ((clamp(deg, lo, hi) - lo) / (hi - lo)) * (l.right - l.left - 40);
}

function drawAnomers(ctx: CanvasRenderingContext2D, l: AminebioLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const x = centreX(l);
  const half = (l.right - l.left) / 2;
  label(ctx, "α- and β-D-glucose (Haworth)", x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const style = { style: "skeletal" as const, font: theme.font, maxBond: 34, lineWidth: 1.6, padding: 18 };
  drawMolecule(ctx, haworthMolecule("alpha"), { x: l.left, y: 30, width: half, height: 140 }, { ...style, color: theme.sine, atomColor: (i) => (i === 6 ? theme.angle : undefined) });
  drawMolecule(ctx, haworthMolecule("beta"), { x: l.left + half, y: 30, width: half, height: 140 }, { ...style, color: theme.tangent, atomColor: (i) => (i === 6 ? theme.angle : undefined) });
  label(ctx, "α: C1–OH down", l.left + half / 2, 180, { color: theme.sine, font: theme.font, align: "center" });
  label(ctx, "β: C1–OH up", l.left + 1.5 * half, 180, { color: theme.tangent, font: theme.font, align: "center" });

  // The mixture.
  const beta = clamp(num(results.beta), 0, 100);
  const barY = 206;
  const w = l.right - l.left - 40;
  const bx = l.left + 20;
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.fillRect(bx, barY, (w * (100 - beta)) / 100, 14);
  ctx.fillStyle = theme.tangent;
  ctx.fillRect(bx + (w * (100 - beta)) / 100, barY, (w * beta) / 100, 14);
  ctx.restore();
  label(ctx, `α ${fixed(100 - beta, 0)} %`, bx, barY + 28, { color: theme.sine, font: theme.font });
  label(ctx, `β ${fixed(beta, 0)} %`, bx + w, barY + 28, { color: theme.tangent, font: theme.font, align: "right" });

  // The rotation scale.
  const y = 290;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(rotationX(l, AMINEBIO_BETA_ROTATION), y);
  ctx.lineTo(rotationX(l, AMINEBIO_ALPHA_ROTATION), y);
  ctx.stroke();
  ctx.strokeStyle = theme.muted;
  ctx.setLineDash([3, 3]);
  const eq = rotationX(l, AMINEBIO_EQUILIBRIUM_ROTATION);
  ctx.beginPath();
  ctx.moveTo(eq, y - 16);
  ctx.lineTo(eq, y + 6);
  ctx.stroke();
  ctx.restore();
  label(ctx, "+18.7° (β)", rotationX(l, AMINEBIO_BETA_ROTATION), y + 16, { color: theme.tangent, font: theme.font, align: "left" });
  label(ctx, "+112° (α)", rotationX(l, AMINEBIO_ALPHA_ROTATION), y + 16, { color: theme.sine, font: theme.font, align: "right" });
  label(ctx, "equilibrium +52.5°", eq, y - 24, { color: theme.muted, font: theme.font, align: "center" });
  if (words) {
    const rot = num(results.rotation);
    const px = rotationX(l, rot);
    ctx.save();
    ctx.fillStyle = theme.angle;
    ctx.beginPath();
    ctx.arc(px, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label(ctx, `Specific rotation of the mixture: ${signed(rot)}°`, x, 334, { color: theme.angle, font: theme.font, align: "center" });
  }
  label(ctx, "In water α and β interconvert (mutarotation)", x, l.height - 16, { color: theme.muted, font: theme.font, align: "center" });
}

// ── Amino acids and peptides ─────────────────────────────────────────────────

/** H₂N–CHR–COOH in the given form (1 cation, 2 zwitterion, 3 anion), condensed. */
export function aminoAcidMolecule(r: string, form: number): Molecule2D {
  const mol = chainMolecule({ atoms: ["N", "C", "C", "O"], branches: [{ at: 2, atoms: ["O"], order: 2 }, ...(r === "H" ? [] : [{ at: 1, atoms: ["C"] }])] });
  if (form <= 2) mol.atoms[0]!.charge = 1;
  if (form >= 2) mol.atoms[3]!.charge = -1;
  return mol;
}

/** Where a pH sits on the scale. */
export function pHX(l: AminebioLayout, pH: number): number {
  return l.left + 14 + (clamp(pH, 0, 14) / 14) * (l.right - l.left - 28);
}

function drawProteins(ctx: CanvasRenderingContext2D, l: AminebioLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const aa = aminebioAminoAcid(num(results.aminoAcid));
  const pH = clamp(num(results.pH, 7), 0, 14);
  const form = clamp(Math.round(num(results.form, 2)), 1, 3);
  const x = centreX(l);
  label(ctx, `${aa.name} at pH ${pH.toFixed(1)}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  drawMolecule(ctx, aminoAcidMolecule(aa.r, form), boxOf(l, 26, 126), {
    style: "condensed",
    color: theme.neutral,
    font: theme.font,
    maxBond: 40,
    lineWidth: 1.8,
    atomColor: (_, a) => (a.charge ? theme.cosine : a.el === "N" || a.el === "O" ? theme.sine : undefined),
  });
  if (words) {
    const q = num(results.netCharge);
    label(ctx, `${AMINEBIO_FORMS[form]} · average charge ${signed(q, 2)}`, x, 140, { color: theme.angle, font: theme.font, align: "center" });
  }

  // The pH scale with pKa₁ and pKa₂ (and pI with words).
  const y = 186;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pHX(l, 0), y);
  ctx.lineTo(pHX(l, 14), y);
  for (let p = 0; p <= 14; p += 2) {
    ctx.moveTo(pHX(l, p), y);
    ctx.lineTo(pHX(l, p), y + 6);
  }
  ctx.stroke();
  ctx.strokeStyle = theme.cosine;
  ctx.setLineDash([3, 3]);
  for (const p of [aa.pKa1, aa.pKa2]) {
    ctx.beginPath();
    ctx.moveTo(pHX(l, p), y - 18);
    ctx.lineTo(pHX(l, p), y);
    ctx.stroke();
  }
  ctx.restore();
  for (let p = 0; p <= 14; p += 2) label(ctx, String(p), pHX(l, p), y + 16, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, `pKa₁ ${aa.pKa1.toFixed(2)}`, pHX(l, aa.pKa1) - 2, y - 26, { color: theme.cosine, font: theme.font, align: "left" });
  label(ctx, `pKa₂ ${aa.pKa2.toFixed(2)}`, pHX(l, aa.pKa2) + 2, y - 26, { color: theme.cosine, font: theme.font, align: "right" });
  const px = pHX(l, pH);
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.moveTo(px, y - 2);
  ctx.lineTo(px - 6, y - 13);
  ctx.lineTo(px + 6, y - 13);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  label(ctx, "cation", (pHX(l, 0) + pHX(l, aa.pKa1)) / 2, y + 34, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "zwitterion", (pHX(l, aa.pKa1) + pHX(l, aa.pKa2)) / 2, y + 34, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "anion", (pHX(l, aa.pKa2) + pHX(l, 14)) / 2, y + 34, { color: theme.muted, font: theme.font, align: "center" });
  if (words) label(ctx, `pI = ${num(results.pI).toFixed(2)}: no net charge`, x, y + 54, { color: theme.angle, font: theme.font, align: "center" });

  // A peptide chain.
  const n = clamp(Math.round(num(results.residues, 1)), 1, 10);
  const gap = Math.min(28, (l.right - l.left - 20) / n);
  const cy = 296;
  const start = x - ((n - 1) * gap) / 2;
  for (let k = 0; k < n; k++) {
    const cx = start + k * gap;
    if (k > 0) {
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - gap + 9, cy);
      ctx.lineTo(cx - 9, cy);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = theme.sine;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  label(ctx, "–CO–NH– peptide bonds join the amino acids", x, cy - 24, { color: theme.muted, font: theme.font, align: "center" });
  if (words) {
    label(ctx, `${n} amino acids · ${n - 1} peptide bonds · ${n - 1} H₂O lost`, x, cy + 30, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `M = ${num(results.peptideMass).toFixed(2)} g/mol`, x, cy + 50, { color: theme.angle, font: theme.font, align: "center" });
  }
}

// ── Enzymes and vitamins ─────────────────────────────────────────────────────

/** The outline of a substrate (and of an active site that fits it): 0 triangle, 1 square, 2 round, 3 notch. */
function substrateShape(ctx: CanvasRenderingContext2D, kind: number, cx: number, top: number, size: number) {
  ctx.beginPath();
  if (kind === 0) {
    ctx.moveTo(cx - size, top);
    ctx.lineTo(cx, top + size * 1.2);
    ctx.lineTo(cx + size, top);
  } else if (kind === 1) {
    ctx.moveTo(cx - size * 0.8, top);
    ctx.lineTo(cx - size * 0.8, top + size * 1.2);
    ctx.lineTo(cx + size * 0.8, top + size * 1.2);
    ctx.lineTo(cx + size * 0.8, top);
  } else if (kind === 2) {
    ctx.arc(cx, top, size, Math.PI, 0, true);
  } else {
    ctx.moveTo(cx - size, top);
    ctx.lineTo(cx - size, top + size);
    ctx.lineTo(cx, top + size * 0.5);
    ctx.lineTo(cx + size, top + size);
    ctx.lineTo(cx + size, top);
  }
}

export const AMINEBIO_SHAPES = 4;
export const shapeOfSugar = (sugar: number) => ((sugar % AMINEBIO_SHAPES) + AMINEBIO_SHAPES) % AMINEBIO_SHAPES;

function drawEnzymes(ctx: CanvasRenderingContext2D, l: AminebioLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const e = aminebioEnzyme(num(results.enzyme));
  const s = aminebioSugar(num(results.sugar));
  const fits = num(results.fits) === 1;
  const x = centreX(l);
  label(ctx, `${e.name} + ${s.name}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (words) label(ctx, fits ? `Fits: ${e.reaction}` : "No fit: the enzyme leaves it alone", x, 36, { color: fits ? theme.tangent : theme.secant, font: theme.font, align: "center" });

  // The enzyme: a block with an active site cut to its own substrate's shape.
  const size = 18;
  const top = 108;
  const siteKind = shapeOfSugar(e.substrates[0] ?? 0);
  ctx.save();
  ctx.fillStyle = theme.curve;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(x - 70, top, 140, 50);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 1.8;
  const halfSite = siteKind === 1 ? 0.8 * (size + 2) : size + 2;
  ctx.beginPath();
  ctx.moveTo(x - 70, top);
  ctx.lineTo(x - halfSite, top);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + halfSite, top);
  ctx.lineTo(x + 70, top);
  ctx.lineTo(x + 70, top + 50);
  ctx.lineTo(x - 70, top + 50);
  ctx.lineTo(x - 70, top);
  ctx.stroke();
  substrateShape(ctx, siteKind, x, top, size + 2);
  ctx.stroke();
  ctx.restore();
  label(ctx, "enzyme", x, top + 38, { color: theme.curve, font: theme.font, align: "center" });
  // The substrate: seated in the site if it fits, held above if not.
  const kind = shapeOfSugar(num(results.sugar));
  const seat = fits ? top : top - 50;
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.globalAlpha = 0.8;
  substrateShape(ctx, kind, fits ? x : x + 40, seat, size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  label(ctx, "substrate", fits ? x + 70 + 4 : x + 40 + size + 6, seat + 6, { color: theme.angle, font: theme.font, align: "left" });
  label(ctx, "Lock and key: each enzyme fits its own substrate", x, 184, { color: theme.muted, font: theme.font, align: "center" });

  // A vitamin.
  const v = aminebioVitamin(num(results.vitamin));
  label(ctx, `Vitamin ${v.name} · ${v.chemical}`, x, 232, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (words) {
    label(ctx, v.fatSoluble ? "Fat-soluble: stored in liver and fat tissue" : v.stored ? "Water-soluble, yet stored in the liver" : "Water-soluble: excreted, needed regularly", x, 254, { color: v.fatSoluble ? theme.angle : theme.sine, font: theme.font, align: "center" });
    label(ctx, `Lack of it: ${v.disease}`, x, 276, { color: theme.secant, font: theme.font, align: "center" });
    label(ctx, "Fat-soluble: A, D, E, K", x, 318, { color: theme.angle, font: theme.font, align: "center" });
    label(ctx, "Water-soluble: B group and C", x, 338, { color: theme.sine, font: theme.font, align: "center" });
  }
}

// ── Nucleic acids ────────────────────────────────────────────────────────────

/** Ten base pairs with the given % G (rounded to the nearest pair): G–C pairs spread through A–T pairs. */
export function basePairs(guanine: number): [string, string][] {
  const gc = clamp(Math.round((2 * clamp(guanine, 0, 50)) / 10), 0, 10);
  const pairs: [string, string][] = [];
  let placed = 0;
  for (let k = 0; k < 10; k++) {
    const want = Math.round(((k + 1) * gc) / 10);
    const isGC = want > placed;
    if (isGC) placed++;
    const flip = k % 2 === 1;
    pairs.push(isGC ? (flip ? ["C", "G"] : ["G", "C"]) : flip ? ["T", "A"] : ["A", "T"]);
  }
  return pairs;
}

function baseColour(theme: LabTheme, letter: string): string {
  return letter === "A" ? theme.sine : letter === "T" || letter === "U" ? theme.tangent : letter === "G" ? theme.cosine : theme.angle;
}

function drawDna(ctx: CanvasRenderingContext2D, l: AminebioLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const g = clamp(num(results.guanine, 20), 0, 50);
  const x = centreX(l);
  label(ctx, "DNA: two strands, bases paired inside", x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const pairs = basePairs(g);
  const top = 36;
  const step = 18;
  const lx = x - 70;
  const rx = x + 70;
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 3;
  for (const sx of [lx, rx]) {
    ctx.beginPath();
    ctx.moveTo(sx, top - 4);
    ctx.lineTo(sx, top + step * 9 + 4);
    ctx.stroke();
  }
  ctx.restore();
  pairs.forEach(([a, b], k) => {
    const y = top + k * step;
    if (!words) {
      // Without words the pairs are not shown: they would give away the composition.
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(lx + 6, y);
      ctx.lineTo(rx - 6, y);
      ctx.stroke();
      ctx.restore();
      return;
    }
    label(ctx, a, lx + 16, y, { color: baseColour(theme, a), font: theme.fontStrong, align: "center" });
    label(ctx, b, rx - 16, y, { color: baseColour(theme, b), font: theme.fontStrong, align: "center" });
    const bonds = a === "G" || a === "C" ? 3 : 2;
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1.2;
    for (let h = 0; h < bonds; h++) {
      const hx = x - 24 + (h * 48) / Math.max(1, bonds - 1);
      ctx.beginPath();
      ctx.moveTo(hx - 5, y);
      ctx.lineTo(hx + 5, y);
      ctx.stroke();
    }
    ctx.restore();
  });
  label(ctx, "sugar–phosphate backbones", x, top + step * 10 + 4, { color: theme.muted, font: theme.font, align: "center" });

  if (words) {
    const values: [string, number][] = [["A", num(results.adenine)], ["T", num(results.thymine)], ["G", num(results.guanine)], ["C", num(results.cytosine)]];
    const base = 290;
    const cell = (l.right - l.left) / 4;
    values.forEach(([letter, v], k) => {
      const cx = l.left + cell * (k + 0.5);
      const h = (v / 50) * 50;
      ctx.save();
      ctx.fillStyle = baseColour(theme, letter);
      ctx.fillRect(cx - 12, base - h, 24, h);
      ctx.restore();
      label(ctx, `${letter} ${fixed(v, 0)}%`, cx, base + 12, { color: baseColour(theme, letter), font: theme.font, align: "center" });
    });
    label(ctx, `Chargaff: A = T, G = C · ${fixed(num(results.hBondsPer100), 0)} H-bonds per 100 pairs`, x, base + 32, { color: theme.text, font: theme.font, align: "center" });
  }

  const b = aminebioBase(num(results.base));
  const partner = AMINEBIO_BASES[b.partner]!;
  const where = b.inDNA && b.inRNA ? "DNA and RNA" : b.inDNA ? "DNA only" : "RNA only";
  label(ctx, `${b.name} (${b.letter})`, x, l.height - 34, { color: baseColour(theme, b.letter), font: theme.fontStrong, align: "center" });
  if (words) label(ctx, `${b.purine ? "purine" : "pyrimidine"} · pairs with ${partner.letter} (${b.hBonds} H-bonds) · ${where}`, x, l.height - 14, { color: theme.text, font: theme.font, align: "center" });
}

export const aminebioRenderer: SimulationRenderer<AminebioLayout> = {
  id: "aminebio",
  layout: (width) => computeAminebioLayout(width),

  draw(ctx, layout, input) {
    ctx.clearRect(0, 0, layout.width, layout.height);
    const has = (layer: string) => input.layers.has(layer);
    if (has("prep")) drawPrep(ctx, layout, input);
    else if (has("tests")) drawTests(ctx, layout, input);
    else if (has("diazo")) drawDiazo(ctx, layout, input);
    else if (has("sugars")) drawSugars(ctx, layout, input);
    else if (has("anomers")) drawAnomers(ctx, layout, input);
    else if (has("proteins")) drawProteins(ctx, layout, input);
    else if (has("enzymes")) drawEnzymes(ctx, layout, input);
    else if (has("dna")) drawDna(ctx, layout, input);
    else if (has("basicity")) drawBasicity(ctx, layout, input);
  },
};
