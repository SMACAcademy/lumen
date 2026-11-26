/**
 * Organic structures on a canvas: a small, shared drawer.
 *
 * ── The molecule ──────────────────────────────────────────────────────────
 * A `Molecule2D` is atoms and bonds. Coordinates are in bond lengths, with
 * y pointing DOWN (canvas convention): a bond is 1 long.
 *
 *   atoms: { el: "C" | "O" | "N" | "Cl" | …, x, y,
 *            charge?: ±1 …, lonePairs?: n, radical?: true,
 *            h?: explicit H count, label?: text instead of the element,
 *            show?: print a carbon even in skeletal style }
 *   bonds: { a, b, order: 1 | 2 | 3, stereo?: "wedge" | "dash" }  (wedge/dash: narrow at a, wide at b)
 *
 * Hydrogens are implicit, from the usual valence (C 4, N 3, O 2, halogens 1,
 * H 1): carbon loses one for a charge or a radical; N⁺ and O⁺ gain one,
 * O⁻ loses one.
 *
 * ── Builders ──────────────────────────────────────────────────────────────
 *   chainMolecule({ atoms: ["C","C","O"], orders?: [1, 1], branches?: [{ at, atoms, order?, angle? }], cisAt? })
 *     lays the main chain out as a 120° zig-zag (straight through sp carbons
 *     of a triple bond), then hangs each branch off chain atom `at` (0-based),
 *     pointing outward; a second branch on the same atom splays to the other
 *     side, and a chain end takes up to three. `angle` (degrees, y down)
 *     forces a branch's direction. `cisAt: i` folds the chain after the
 *     double bond i→i+1 back so its neighbours are cis.
 *     ATOM ORDER: the main chain first (0 … n−1), then each branch's atoms
 *     in the order the branches are listed — so callers can patch charges
 *     or lone pairs by index afterwards.
 *   zigzagChain(n, [{ at: 2, atoms: "C" }, { at: 3, atoms: "OH"… }])
 *     n carbons with substituents at 1-based positions; `atoms` is a list
 *     or a string of element symbols ("CC" for ethyl, "O" for –OH).
 *
 * ── Drawing ───────────────────────────────────────────────────────────────
 *   drawMolecule(ctx, molecule, box, { style: "skeletal" | "condensed", color, font, … })
 *     scales the molecule into `box` (never larger than `maxBond` px a bond)
 *     and draws it. Skeletal: carbons are vertices, heteroatoms are labelled
 *     with their H count ("OH", "NH₂"); condensed: every atom is ("CH₃").
 *     H is written on the side away from the bonds ("H₃C–", "–OH").
 *     Returns the placement: canvas points for atoms, bond midpoints and
 *     lone pairs — for arrows and labels drawn on top.
 *   drawCurlyArrow(ctx, placement, from, to, { color, fishhook?, bend? })
 *     a curved electron-pushing arrow from { bond: [a, b] } or { lonePair: i }
 *     (or { atom: i }) to { atom: i } or { bond: [a, b] }. `fishhook` draws
 *     a single-barbed (one-electron) head. The curve bows away from the
 *     molecule's centre unless `bend` (+1 / −1) says otherwise.
 *   drawBondArrow(ctx, placement, a, b, { color })
 *     the inductive-effect mark: an arrowhead in the middle of bond a–b,
 *     pointing to b (electrons pulled toward b).
 */

import type { LabelStyle } from "./draw";

export interface Atom2D {
  el: string;
  x: number;
  y: number;
  charge?: number;
  lonePairs?: number;
  radical?: boolean;
  /** Explicit hydrogen count, overriding the implicit one. */
  h?: number;
  /** Text printed instead of the element (and its hydrogens), e.g. "R" or "CN". */
  label?: string;
  /** Print a carbon even in skeletal style. */
  show?: boolean;
}

export interface Bond2D {
  a: number;
  b: number;
  order: 1 | 2 | 3;
  /** Wedge (towards you) or dash (away), narrow at a and wide at b. */
  stereo?: "wedge" | "dash";
}

export interface Molecule2D {
  atoms: Atom2D[];
  bonds: Bond2D[];
}

export interface ChainBranch {
  /** Main-chain atom (0-based) the branch hangs from. */
  at: number;
  atoms: string[];
  /** Order of the bond joining it to the chain (default 1). */
  order?: number;
  /** Direction of the first bond, degrees with y down (0 = right, −90 = up). */
  angle?: number;
}

export interface ChainSpec {
  atoms: string[];
  /** Order of the bond from chain atom i to i + 1 (default 1). */
  orders?: number[];
  branches?: ChainBranch[];
  /** Fold the chain after double bond i → i + 1 so its neighbours are cis. */
  cisAt?: number;
}

// ── Builders ──────────────────────────────────────────────────────────────────

interface Vec {
  x: number;
  y: number;
}

const DEG = Math.PI / 180;
const vec = (angleDeg: number): Vec => ({ x: Math.cos(angleDeg * DEG), y: Math.sin(angleDeg * DEG) });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const len = (a: Vec) => Math.hypot(a.x, a.y);
const unit = (a: Vec): Vec => (len(a) < 1e-9 ? { x: 0, y: -1 } : scale(a, 1 / len(a)));
const rotate = (a: Vec, deg: number): Vec => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
};
const clean = (v: number) => Math.round(v * 1e9) / 1e9 || 0;

/** Split "CCl" into ["C", "Cl"]. */
export function splitElements(text: string): string[] {
  return text.match(/[A-Z][a-z]?/g) ?? [];
}

export function chainMolecule(spec: ChainSpec): Molecule2D {
  const n = spec.atoms.length;
  const order = (i: number) => spec.orders?.[i] ?? 1;
  // sp atoms (a triple bond, or two double bonds) keep the chain straight.
  const linear = (i: number) => i > 0 && i < n - 1 && (order(i - 1) === 3 || order(i) === 3 || (order(i - 1) === 2 && order(i) === 2));
  const points: Vec[] = [{ x: 0, y: 0 }];
  let angle = -30;
  for (let i = 0; i + 1 < n; i++) {
    if (i > 0 && !linear(i)) angle = -angle;
    points.push(add(points[i]!, vec(angle)));
  }
  if (spec.cisAt !== undefined && spec.cisAt >= 0 && spec.cisAt + 2 < n) {
    const p = points[spec.cisAt]!;
    const d = unit(sub(points[spec.cisAt + 1]!, p));
    for (let k = spec.cisAt + 2; k < n; k++) {
      const r = sub(points[k]!, p);
      const along = scale(d, r.x * d.x + r.y * d.y);
      points[k] = add(p, sub(scale(along, 2), r));
    }
  }

  const atoms: Atom2D[] = spec.atoms.map((el, i) => ({ el, x: clean(points[i]!.x), y: clean(points[i]!.y) }));
  const bonds: Bond2D[] = [];
  for (let i = 0; i + 1 < n; i++) bonds.push({ a: i, b: i + 1, order: order(i) as 1 | 2 | 3 });

  const branches = spec.branches ?? [];
  const placedAt = new Map<number, number>();
  const totalAt = (k: number) => branches.filter((b) => b.at === k).length;
  for (const branch of branches) {
    const k = branch.at;
    const m = placedAt.get(k) ?? 0;
    placedAt.set(k, m + 1);
    const total = totalAt(k);
    const here = points[k]!;
    const chainNeighbours = [k - 1, k + 1].filter((j) => j >= 0 && j < n).map((j) => unit(sub(points[j]!, here)));
    let dir: Vec;
    if (branch.angle !== undefined) dir = vec(branch.angle);
    else if (chainNeighbours.length === 2) {
      const outward = unit(scale(add(chainNeighbours[0]!, chainNeighbours[1]!), -1));
      const options = total === 1 ? [outward] : [rotate(outward, -35), rotate(outward, 35), scale(outward, -1)];
      dir = options[m] ?? outward;
    } else if (chainNeighbours.length === 1) {
      const u = chainNeighbours[0]!;
      const pair = [rotate(u, 120), rotate(u, -120)].sort((p, q) => Math.abs(q.y) - Math.abs(p.y));
      const options = total >= 3 ? [rotate(u, 90), rotate(u, 180), rotate(u, 270)] : pair;
      dir = options[m] ?? pair[0]!;
    } else {
      dir = vec([-30, 150, 90, -90][m] ?? 0);
    }
    let prev = k;
    let at = add(here, dir);
    let turn = 0;
    branch.atoms.forEach((el, idx) => {
      if (idx > 0) {
        const placed = atoms.map((a) => ({ x: a.x, y: a.y }));
        const options = (turn === 0 ? [60, -60] : [turn * -1]).map((t) => ({ t, p: add(at, rotate(dir, t)) }));
        const far = (p: Vec) => Math.min(...placed.map((q) => len(sub(p, q))));
        const best = options.sort((a, b) => far(b.p) - far(a.p))[0]!;
        dir = rotate(dir, best.t);
        turn = best.t;
        at = best.p;
      }
      atoms.push({ el, x: clean(at.x), y: clean(at.y) });
      bonds.push({ a: prev, b: atoms.length - 1, order: (idx === 0 ? (branch.order ?? 1) : 1) as 1 | 2 | 3 });
      prev = atoms.length - 1;
    });
  }
  return { atoms, bonds };
}

export interface ZigzagSubstituent {
  /** 1-based carbon of the chain. */
  at: number;
  /** Element symbols, outward: "C" methyl, "CC" ethyl, "O" hydroxy. */
  atoms: string | string[];
  order?: number;
}

/** n carbons in a zig-zag with substituents at 1-based positions. */
export function zigzagChain(n: number, substituents: readonly ZigzagSubstituent[] = [], orders?: number[]): Molecule2D {
  return chainMolecule({
    atoms: Array.from({ length: Math.max(1, Math.round(n)) }, () => "C"),
    orders,
    branches: substituents.map((s) => ({ at: s.at - 1, atoms: typeof s.atoms === "string" ? splitElements(s.atoms) : s.atoms, order: s.order })),
  });
}

// ── Hydrogens and labels ─────────────────────────────────────────────────────

const VALENCE: Readonly<Record<string, number>> = { H: 1, C: 4, N: 3, O: 2, S: 2, F: 1, Cl: 1, Br: 1, I: 1 };

/** Implicit hydrogens on atom i (or its explicit `h`). */
export function implicitHydrogens(mol: Molecule2D, i: number): number {
  const atom = mol.atoms[i]!;
  if (atom.h !== undefined) return atom.h;
  if (atom.label !== undefined) return 0;
  const valence = VALENCE[atom.el];
  if (valence === undefined) return 0;
  const charge = atom.charge ?? 0;
  const capacity = (atom.el === "C" ? valence - Math.abs(charge) : valence + charge) - (atom.radical ? 1 : 0);
  const used = mol.bonds.reduce((s, b) => s + (b.a === i || b.b === i ? b.order : 0), 0);
  return Math.max(0, capacity - used);
}

const SUBSCRIPT = "₀₁₂₃₄₅₆₇₈₉";
const SUPERSCRIPT: Readonly<Record<string, string>> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻" };
const subscript = (n: number) => String(n).split("").map((d) => SUBSCRIPT[Number(d)]).join("");

/** "⁺", "⁻", "²⁺" … for a charge; "" for none. */
export function chargeText(charge: number | undefined): string {
  if (!charge) return "";
  const size = Math.abs(charge) === 1 ? "" : String(Math.abs(charge));
  return `${size}${charge > 0 ? "+" : "-"}`.split("").map((c) => SUPERSCRIPT[c] ?? c).join("");
}

export type MoleculeStyleName = "skeletal" | "condensed";

export interface AtomLabel {
  /** The element (or custom label), centred on the atom. */
  core: string;
  /** "H", "H₂", … or "" — written beside the core. */
  hydrogens: string;
  side: "left" | "right";
  charge: string;
}

function neighboursOf(mol: Molecule2D, i: number): number[] {
  return mol.bonds.flatMap((b) => (b.a === i ? [b.b] : b.b === i ? [b.a] : []));
}

/** What is written at atom i, or null for a bare skeletal vertex. */
export function atomLabel(mol: Molecule2D, i: number, style: MoleculeStyleName): AtomLabel | null {
  const atom = mol.atoms[i]!;
  const nbrs = neighboursOf(mol, i);
  const charge = chargeText(atom.charge);
  if (atom.label !== undefined) return { core: atom.label, hydrogens: "", side: "right", charge };
  if (style === "skeletal" && atom.el === "C" && !atom.show && nbrs.length > 0) return null;
  const h = implicitHydrogens(mol, i);
  const hydrogens = h === 0 ? "" : h === 1 ? "H" : `H${subscript(h)}`;
  // H goes on the side away from the bonds: H₃C– on a left end, –OH on a right end.
  const allRight = nbrs.length > 0 && nbrs.every((j) => mol.atoms[j]!.x > atom.x + 0.05);
  return { core: atom.el, hydrogens, side: allRight ? "left" : "right", charge };
}

/** The label as one string, e.g. "H₃C", "OH", "C⁺". */
export function atomLabelText(mol: Molecule2D, i: number, style: MoleculeStyleName): string | null {
  const l = atomLabel(mol, i, style);
  if (!l) return null;
  return l.side === "left" ? `${l.hydrogens}${l.core}${l.charge}` : `${l.core}${l.hydrogens}${l.charge}`;
}

// ── Placement ────────────────────────────────────────────────────────────────

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlaceOptions {
  style?: MoleculeStyleName;
  /** Largest bond length, px (default 34). */
  maxBond?: number;
  /** Space kept clear inside the box for labels, px (default 14). */
  padding?: number;
}

export interface MoleculePlacement {
  molecule: Molecule2D;
  style: MoleculeStyleName;
  /** Bond length in px. */
  bond: number;
  /** Canvas point of atom i. */
  point(i: number): Vec;
  /** Canvas midpoint of the bond a–b. */
  bondMid(a: number, b: number): Vec;
  /** Canvas point of lone pair k on atom i (the free direction, round the label). */
  lonePair(i: number, k?: number): Vec;
  /** Whether atom i carries a text label. */
  labelled(i: number): boolean;
  /** Canvas centre of the atoms. */
  centre: Vec;
  /** Extent of the atoms on the canvas. */
  bounds: { left: number; top: number; right: number; bottom: number };
}

/** Directions (unit vectors, canvas) round atom i that point away from its bonds: `count` of them. */
function freeDirections(mol: Molecule2D, i: number, count: number): Vec[] {
  const atom = mol.atoms[i]!;
  const taken = neighboursOf(mol, i).map((j) => Math.atan2(mol.atoms[j]!.y - atom.y, mol.atoms[j]!.x - atom.x));
  const chosen: number[] = [];
  for (let c = 0; c < count; c++) {
    let best = -Math.PI / 2;
    let bestGap = -1;
    for (let step = 0; step < 24; step++) {
      // Try up first, then round: ties go to the earlier (upper) direction.
      const a = -Math.PI / 2 + (step * Math.PI) / 12;
      const all = [...taken, ...chosen];
      const gap = all.length === 0 ? Math.PI : Math.min(...all.map((t) => Math.abs(Math.atan2(Math.sin(a - t), Math.cos(a - t)))));
      if (gap > bestGap + 1e-6) {
        bestGap = gap;
        best = a;
      }
    }
    chosen.push(best);
  }
  return chosen.map((a) => ({ x: Math.cos(a), y: Math.sin(a) }));
}

export function placeMolecule(mol: Molecule2D, box: Box, options: PlaceOptions = {}): MoleculePlacement {
  const style = options.style ?? "skeletal";
  const maxBond = options.maxBond ?? 34;
  const padding = options.padding ?? 14;
  const xs = mol.atoms.map((a) => a.x);
  const ys = mol.atoms.map((a) => a.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const room = (span: number, px: number) => (span < 1e-9 ? Infinity : Math.max(1, px - 2 * padding) / span);
  const bond = Math.min(maxBond, room(spanX, box.width), room(spanY, box.height));
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const point = (i: number): Vec => {
    const a = mol.atoms[i]!;
    return { x: cx + (a.x - midX) * bond, y: cy + (a.y - midY) * bond };
  };
  const labelled = (i: number) => atomLabel(mol, i, style) !== null;
  const lonePairCache = new Map<number, Vec[]>();
  const lonePair = (i: number, k = 0): Vec => {
    if (!lonePairCache.has(i)) lonePairCache.set(i, freeDirections(mol, i, Math.max(1, mol.atoms[i]!.lonePairs ?? 1)));
    const dirs = lonePairCache.get(i)!;
    const d = dirs[Math.min(k, dirs.length - 1)]!;
    const r = labelled(i) ? 11 : 7;
    return add(point(i), scale(d, r));
  };
  return {
    molecule: mol,
    style,
    bond,
    point,
    bondMid: (a, b) => scale(add(point(a), point(b)), 0.5),
    lonePair,
    labelled,
    centre: { x: cx, y: cy },
    bounds: {
      left: cx + (minX - midX) * bond,
      right: cx + (maxX - midX) * bond,
      top: cy + (minY - midY) * bond,
      bottom: cy + (maxY - midY) * bond,
    },
  };
}

// ── Drawing ──────────────────────────────────────────────────────────────────

export interface MoleculeStyle extends PlaceOptions {
  color: string;
  font: string;
  /** Colour for one atom's label (default `color`). */
  atomColor?: (i: number, atom: Atom2D) => string | undefined;
  /** Colour for one bond, by index in `bonds` (default `color`). */
  bondColor?: (index: number, bond: Bond2D) => string | undefined;
  /** Line width of bonds, px (default 1.6). */
  lineWidth?: number;
}

/** Radius round a labelled atom that bonds stop short of, px. */
const LABEL_CLEARANCE = 8;

function text(ctx: CanvasRenderingContext2D, words: string, x: number, y: number, style: LabelStyle) {
  ctx.save();
  ctx.font = style.font;
  ctx.textAlign = style.align ?? "center";
  ctx.textBaseline = style.baseline ?? "middle";
  ctx.fillStyle = style.color;
  ctx.fillText(words, x, y);
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, p: Vec, q: Vec) {
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(q.x, q.y);
  ctx.stroke();
}

export function drawMolecule(ctx: CanvasRenderingContext2D, mol: Molecule2D, box: Box, style: MoleculeStyle): MoleculePlacement {
  const placed = placeMolecule(mol, box, style);
  const { point, labelled } = placed;
  const width = style.lineWidth ?? 1.6;

  mol.bonds.forEach((b, index) => {
    const colour = style.bondColor?.(index, b) ?? style.color;
    let p = point(b.a);
    let q = point(b.b);
    const d = unit(sub(q, p));
    if (labelled(b.a)) p = add(p, scale(d, LABEL_CLEARANCE));
    if (labelled(b.b)) q = sub(q, scale(d, LABEL_CLEARANCE));
    const normal = { x: -d.y, y: d.x };
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    if (b.stereo === "wedge") {
      const w = Math.max(3, placed.bond * 0.12);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x + normal.x * w, q.y + normal.y * w);
      ctx.lineTo(q.x - normal.x * w, q.y - normal.y * w);
      ctx.closePath();
      ctx.fill();
    } else if (b.stereo === "dash") {
      const w = Math.max(3, placed.bond * 0.12);
      ctx.lineWidth = 1.2;
      for (let k = 1; k <= 6; k++) {
        const t = k / 6;
        const c = add(p, scale(sub(q, p), t));
        line(ctx, add(c, scale(normal, w * t)), sub(c, scale(normal, w * t)));
      }
    } else if (b.order === 1) {
      line(ctx, p, q);
    } else {
      const gap = b.order === 2 ? 2.4 : 3.4;
      const offsets = b.order === 2 ? [-gap, gap] : [-gap, 0, gap];
      for (const o of offsets) line(ctx, add(p, scale(normal, o)), add(q, scale(normal, o)));
    }
    ctx.restore();
  });

  mol.atoms.forEach((atom, i) => {
    const at = point(i);
    const colour = style.atomColor?.(i, atom) ?? style.color;
    const l = atomLabel(mol, i, placed.style);
    if (l) {
      const coreHalf = measure(ctx, l.core, style.font) / 2;
      text(ctx, l.core, at.x, at.y, { color: colour, font: style.font });
      let right = at.x + coreHalf;
      if (l.hydrogens) {
        if (l.side === "right") {
          text(ctx, l.hydrogens, right, at.y, { color: colour, font: style.font, align: "left" });
          right += measure(ctx, l.hydrogens, style.font);
        } else {
          text(ctx, l.hydrogens, at.x - coreHalf, at.y, { color: colour, font: style.font, align: "right" });
        }
      }
      if (l.charge) text(ctx, l.charge, right + 1, at.y - 7, { color: colour, font: style.font, align: "left" });
    } else if (atom.charge) {
      const d = freeDirections(mol, i, 1)[0]!;
      text(ctx, chargeText(atom.charge), at.x + d.x * 9, at.y + d.y * 9, { color: colour, font: style.font });
    }
    const pairs = atom.lonePairs ?? 0;
    const dirs = freeDirections(mol, i, pairs + (atom.radical ? 1 : 0));
    dirs.forEach((d, k) => {
      const r = l ? 11 : 7;
      const c = add(at, scale(d, r));
      const across = { x: -d.y * 2.2, y: d.x * 2.2 };
      const dots = k < pairs ? [add(c, across), sub(c, across)] : [c];
      ctx.save();
      ctx.fillStyle = colour;
      for (const dot of dots) {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  });
  return placed;
}

function measure(ctx: CanvasRenderingContext2D, words: string, font: string): number {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(words).width;
  ctx.restore();
  return typeof w === "number" && Number.isFinite(w) ? w : words.length * 7;
}

// ── Arrows ───────────────────────────────────────────────────────────────────

export type ArrowEnd = { atom: number } | { bond: [number, number] } | { lonePair: number; pair?: number } | { point: Vec };

export interface CurlyArrowStyle {
  color: string;
  width?: number;
  /** Single-barbed head: one electron moving (homolysis, radicals). */
  fishhook?: boolean;
  /** +1 or −1 to choose which side the curve bows; default away from the molecule's centre. */
  bend?: number;
}

function endPoint(placed: MoleculePlacement, end: ArrowEnd): Vec {
  if ("point" in end) return end.point;
  if ("bond" in end) return placed.bondMid(end.bond[0], end.bond[1]);
  if ("lonePair" in end) return placed.lonePair(end.lonePair, end.pair ?? 0);
  return placed.point(end.atom);
}

/** The quadratic curve of a curly arrow: start, control point and (shortened) end. */
export function curlyArrowPath(placed: MoleculePlacement, from: ArrowEnd, to: ArrowEnd, bend?: number): { start: Vec; control: Vec; end: Vec } {
  const start = endPoint(placed, from);
  let end = endPoint(placed, to);
  if ("atom" in to) {
    const back = unit(sub(start, end));
    end = add(end, scale(back, placed.labelled(to.atom) ? 10 : 5));
  }
  const mid = scale(add(start, end), 0.5);
  const span = len(sub(end, start));
  const normal = unit({ x: -(end.y - start.y), y: end.x - start.x });
  let sign = bend ?? 0;
  if (sign === 0) {
    const plus = len(sub(add(mid, normal), placed.centre));
    const minus = len(sub(sub(mid, normal), placed.centre));
    sign = plus >= minus ? 1 : -1;
  }
  const control = add(mid, scale(normal, sign * Math.max(10, span * 0.55)));
  return { start, control, end };
}

export function drawCurlyArrow(ctx: CanvasRenderingContext2D, placed: MoleculePlacement, from: ArrowEnd, to: ArrowEnd, style: CurlyArrowStyle): void {
  const { start, control, end } = curlyArrowPath(placed, from, to, style.bend);
  if (len(sub(end, start)) < 1) return;
  const head = 7;
  const d = unit(sub(end, control));
  const normal = { x: -d.y, y: d.x };
  ctx.save();
  ctx.strokeStyle = style.color;
  ctx.fillStyle = style.color;
  ctx.lineWidth = style.width ?? 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.quadraticCurveTo(control.x, control.y, end.x - d.x * 2, end.y - d.y * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - d.x * head + normal.x * head * 0.5, end.y - d.y * head + normal.y * head * 0.5);
  if (style.fishhook) {
    ctx.lineTo(end.x - d.x * head * 0.6, end.y - d.y * head * 0.6);
  } else {
    ctx.lineTo(end.x - d.x * head - normal.x * head * 0.5, end.y - d.y * head - normal.y * head * 0.5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The inductive mark: an arrowhead in the middle of bond a–b, pointing to b. */
export function drawBondArrow(ctx: CanvasRenderingContext2D, placed: MoleculePlacement, a: number, b: number, style: { color: string }): void {
  const p = placed.point(a);
  const q = placed.point(b);
  const d = unit(sub(q, p));
  const tip = add(scale(add(p, q), 0.5), scale(d, 4));
  const normal = { x: -d.y, y: d.x };
  const offset = scale(normal, 6);
  const t = add(tip, offset);
  ctx.save();
  ctx.fillStyle = style.color;
  ctx.beginPath();
  ctx.moveTo(t.x, t.y);
  ctx.lineTo(t.x - d.x * 7 + normal.x * 3.5, t.y - d.y * 7 + normal.y * 3.5);
  ctx.lineTo(t.x - d.x * 7 - normal.x * 3.5, t.y - d.y * 7 - normal.y * 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
