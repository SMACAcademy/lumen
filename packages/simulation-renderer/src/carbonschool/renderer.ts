/**
 * Carbon and its compounds (class 10).
 *
 * One canvas, five views, chosen by the mode's layers:
 *   dots       — an electron-dot structure: each atom's own electrons as
 *                dots or crosses, shared pairs between the atoms.
 *   allotropes — diamond's 3D network, graphite's layers, the C₆₀ cage.
 *   chain      — the chain compound, as a condensed (or, when long, skeletal)
 *                structure, with its formula; its name with words on.
 *   reaction   — burning (a burner, and a blue or sooty flame) or one of
 *                the fixed reactions, with the molecules before and after.
 *   soap       — a bowl of water with oil, scum and micelles, and a soap
 *                molecule's head and tail.
 * Answers (names, counts, masses, scum) appear only with "labels".
 */

import {
  CARBON_ALLOTROPE_ORDER,
  CARBON_ALLOTROPES,
  CARBON_GASES,
  CARBON_MOLECULE_ORDER,
  CARBON_PROBLEMS,
  CARBON_REACTION_ORDER,
  CARBON_SERIES,
  type CarbonChain,
  type CarbonDotMolecule,
  type CarbonReactionId,
  carbonChainFromResults,
  carbonChainInfo,
  carbonEquationText,
  carbonMolecule,
  carbonReaction,
} from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import { type ChainSpec, chainMolecule, drawMolecule, placeMolecule, type Box } from "../shared/molecule";
import type { LabTheme } from "../theme";
import type { RenderInput, SimulationRenderer } from "../types";

export interface CarbonSchoolLayout {
  width: number;
  height: number;
  /** The central column everything is drawn in. */
  left: number;
  right: number;
}

export function computeCarbonSchoolLayout(width: number): CarbonSchoolLayout {
  const column = Math.min(width - 32, 520);
  const left = (width - column) / 2;
  return { width, height: 380, left, right: left + column };
}

const centreX = (l: CarbonSchoolLayout) => (l.left + l.right) / 2;
const boxOf = (l: CarbonSchoolLayout, top: number, bottom: number, left = l.left, right = l.right): Box => ({ x: left, y: top, width: right - left, height: bottom - top });

function elementColour(theme: LabTheme, el: string): string {
  switch (el) {
    case "H": return theme.sine;
    case "O": return theme.cosine;
    case "N": return theme.tangent;
    case "Cl": return theme.angle;
    default: return theme.neutral;
  }
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function stroke(ctx: CanvasRenderingContext2D, colour: string, width: number, points: readonly { x: number; y: number }[], close = false, dash: number[] = []) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  if (close) ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// ── Electron-dot structures ──────────────────────────────────────────────────

export interface CarbonElectron {
  x: number;
  y: number;
  /** Atom whose electron it is. */
  atom: number;
  mark: "dot" | "cross";
}

export interface CarbonDotPlacement {
  atoms: { x: number; y: number }[];
  electrons: CarbonElectron[];
  /** Pixels per bond length. */
  unit: number;
}

const CARDINALS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

/** Where an atom's lone pairs go: greedily, the directions furthest from its bonds and from each other. */
function loneDirections(m: CarbonDotMolecule, i: number): { x: number; y: number }[] {
  const a = m.atoms[i]!;
  const taken = m.bonds
    .filter((b) => b.a === i || b.b === i)
    .map((b) => {
      const o = m.atoms[b.a === i ? b.b : b.a]!;
      const d = Math.hypot(o.x - a.x, o.y - a.y) || 1;
      return { x: (o.x - a.x) / d, y: (o.y - a.y) / d };
    });
  const chosen: { x: number; y: number }[] = [];
  for (let k = 0; k < a.lone; k++) {
    let best = CARDINALS[0]!;
    let bestScore = Infinity;
    for (const c of CARDINALS) {
      const all = [...taken, ...chosen];
      // Lower is better: the largest cosine to anything already there.
      const score = all.length === 0 ? -1 : Math.max(...all.map((t) => t.x * c.x + t.y * c.y));
      if (score < bestScore - 1e-9) {
        bestScore = score;
        best = c;
      }
    }
    chosen.push(best);
  }
  return chosen;
}

/** Canvas places for the atoms and every electron of an electron-dot structure, fitted to a box. */
export function carbonDotPlacement(m: CarbonDotMolecule, box: Box): CarbonDotPlacement {
  const xs = m.atoms.map((a) => a.x);
  const ys = m.atoms.map((a) => a.y);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const pad = 34;
  const unit = Math.min(78, spanX > 0 ? (box.width - 2 * pad) / spanX : Infinity, spanY > 0 ? (box.height - 2 * pad) / spanY : Infinity);
  const midX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const midY = (Math.max(...ys) + Math.min(...ys)) / 2;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const atoms = m.atoms.map((a) => ({ x: cx + (a.x - midX) * unit, y: cy + (a.y - midY) * unit }));
  const electrons: CarbonElectron[] = [];
  for (const b of m.bonds) {
    const p = atoms[b.a]!;
    const q = atoms[b.b]!;
    const d = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const u = { x: (q.x - p.x) / d, y: (q.y - p.y) / d };
    const n = { x: -u.y, y: u.x };
    const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    for (let j = 0; j < b.order; j++) {
      const off = (j - (b.order - 1) / 2) * 9;
      const c = { x: mid.x + n.x * off, y: mid.y + n.y * off };
      electrons.push({ x: c.x - u.x * 4, y: c.y - u.y * 4, atom: b.a, mark: m.atoms[b.a]!.own });
      electrons.push({ x: c.x + u.x * 4, y: c.y + u.y * 4, atom: b.b, mark: m.atoms[b.b]!.own });
    }
  }
  m.atoms.forEach((a, i) => {
    for (const d of loneDirections(m, i)) {
      const c = { x: atoms[i]!.x + d.x * 17, y: atoms[i]!.y + d.y * 17 };
      for (const s of [-1, 1]) electrons.push({ x: c.x - d.y * 4 * s, y: c.y + d.x * 4 * s, atom: i, mark: a.own });
    }
  });
  return { atoms, electrons, unit };
}

function bondWords(r: Readonly<Record<string, unknown>>): string {
  const parts: string[] = [];
  const add = (count: number, word: string) => {
    if (count > 0) parts.push(`${count} ${word}${count === 1 ? "" : "s"}`);
  };
  add(num(r.tripleBonds), "triple bond");
  add(num(r.doubleBonds), "double bond");
  add(num(r.singleBonds), "single bond");
  return parts.join(", ");
}

function drawDots(ctx: CanvasRenderingContext2D, l: CarbonSchoolLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const id = CARBON_MOLECULE_ORDER[num(results.molecule)] ?? "ch4";
  const m = carbonMolecule(id);
  const x = centreX(l);
  label(ctx, `${m.formula} · ${m.name}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const placed = carbonDotPlacement(m, boxOf(l, 34, l.height - 84));

  // Faint rings round each atom: the shells that overlap where electrons are shared.
  placed.atoms.forEach((p) => {
    ctx.save();
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.min(26, placed.unit * 0.6), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
  for (const e of placed.electrons) {
    const colour = elementColour(theme, m.atoms[e.atom]!.el);
    if (e.mark === "dot") dot(ctx, e.x, e.y, 2.6, colour);
    else {
      stroke(ctx, colour, 1.6, [{ x: e.x - 2.8, y: e.y - 2.8 }, { x: e.x + 2.8, y: e.y + 2.8 }]);
      stroke(ctx, colour, 1.6, [{ x: e.x - 2.8, y: e.y + 2.8 }, { x: e.x + 2.8, y: e.y - 2.8 }]);
    }
  }
  m.atoms.forEach((a, i) => label(ctx, a.el, placed.atoms[i]!.x, placed.atoms[i]!.y, { color: elementColour(theme, a.el), font: theme.fontStrong, align: "center" }));

  label(ctx, "• and × : electrons from different atoms", x, l.height - 64, { color: theme.muted, font: theme.font, align: "center" });
  if (words) {
    label(ctx, `${num(results.sharedPairs)} shared pairs · ${num(results.lonePairs)} lone pairs`, x, l.height - 42, { color: theme.angle, font: theme.font, align: "center" });
    label(ctx, `${bondWords(results)} · 8 round each (H: 2)`, x, l.height - 22, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── Allotropes ───────────────────────────────────────────────────────────────

/** Diamond: a carbon, its four neighbours, and theirs — tetrahedra seen slightly from above. */
export function diamondPoints(): { atoms: { x: number; y: number }[]; bonds: [number, number][] } {
  const t = [
    [0, 0, 1],
    [0.943, 0, -0.333],
    [-0.471, 0.816, -0.333],
    [-0.471, -0.816, -0.333],
  ] as const;
  const project = (v: readonly number[]) => ({ x: v[0]! + 0.25 * v[1]!, y: -v[2]! + 0.35 * v[1]! });
  const atoms3: number[][] = [[0, 0, 0]];
  const bonds: [number, number][] = [];
  t.forEach((d, k) => {
    atoms3.push([...d]);
    const nIndex = atoms3.length - 1;
    bonds.push([0, nIndex]);
    t.forEach((e, j) => {
      if (j === k) return;
      atoms3.push([d[0] - e[0], d[1] - e[1], d[2] - e[2]]);
      bonds.push([nIndex, atoms3.length - 1]);
    });
  });
  return { atoms: atoms3.map(project), bonds };
}

function drawAllotropes(ctx: CanvasRenderingContext2D, l: CarbonSchoolLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const id = CARBON_ALLOTROPE_ORDER[num(results.allotrope)] ?? "diamond";
  const a = CARBON_ALLOTROPES[id];
  const x = centreX(l);
  label(ctx, a.name, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const top = 40;
  const bottom = l.height - 90;
  const cy = (top + bottom) / 2;
  const room = Math.min(l.right - l.left, bottom - top);

  if (id === "diamond") {
    const d = diamondPoints();
    const s = room / 4.4;
    const pts = d.atoms.map((p) => ({ x: x + p.x * s, y: cy + p.y * s }));
    for (const [i, j] of d.bonds) stroke(ctx, theme.neutral, 1.8, [pts[i]!, pts[j]!]);
    pts.forEach((p, i) => dot(ctx, p.x, p.y, i === 0 ? 6 : 4.5, i === 0 ? theme.sine : theme.neutral));
  } else if (id === "graphite") {
    // Two flat sheets of hexagons, one above the other.
    const side = Math.min(22, (l.right - l.left) / 10);
    const h = side * Math.sqrt(3);
    const sheet = (y0: number) => {
      const cols = Math.floor((l.right - l.left - 2 * side) / (1.5 * side * 2)) * 2;
      for (let c = 0; c < cols; c++) {
        const hx = x + (c - (cols - 1) / 2) * 1.5 * side;
        const hy = y0 + (c % 2 === 0 ? 0 : h / 2);
        const ring = Array.from({ length: 6 }, (_, k) => ({ x: hx + side * Math.cos((k * Math.PI) / 3), y: hy + side * Math.sin((k * Math.PI) / 3) }));
        stroke(ctx, theme.neutral, 1.6, ring, true);
        ring.forEach((p) => dot(ctx, p.x, p.y, 2.6, theme.neutral));
      }
    };
    const y1 = cy - h * 1.6;
    const y2 = cy + h * 0.9;
    sheet(y1);
    sheet(y2);
    for (const fx of [-0.3, 0, 0.3]) {
      const px = x + fx * (l.right - l.left);
      stroke(ctx, theme.muted, 1, [{ x: px, y: y1 + h + 3 }, { x: px, y: y2 - h / 2 - 3 }], false, [3, 3]);
    }
    if (words) label(ctx, "layers slide over each other", x, (y1 + y2) / 2 + h * 0.25, { color: theme.muted, font: theme.font, align: "center", background: theme.background });
  } else {
    // C₆₀: a pentagon, ringed by hexagons, inside the cage's outline.
    const R = room / 2.4;
    ctx.save();
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    const at = (r: number, deg: number) => ({ x: x + r * Math.cos(((deg - 90) * Math.PI) / 180), y: cy + r * Math.sin(((deg - 90) * Math.PI) / 180) });
    const pent = Array.from({ length: 5 }, (_, k) => at(R * 0.28, k * 72));
    const spokes = Array.from({ length: 5 }, (_, k) => at(R * 0.55, k * 72));
    const ring = Array.from({ length: 15 }, (_, k) => at(k % 3 === 0 ? R * 0.55 : R * 0.68, k * 24));
    stroke(ctx, theme.sine, 1.8, pent, true);
    pent.forEach((p, k) => stroke(ctx, theme.neutral, 1.6, [p, spokes[k]!]));
    stroke(ctx, theme.neutral, 1.6, ring, true);
    ring.forEach((p, k) => {
      if (k % 3 !== 0) stroke(ctx, theme.neutral, 1.2, [p, at(R * 0.92, k * 24)]);
    });
    [...pent, ...ring].forEach((p) => dot(ctx, p.x, p.y, 2.8, theme.neutral));
  }

  label(ctx, a.structure, x, l.height - 64, { color: theme.text, font: theme.font, align: "center" });
  if (words) {
    label(ctx, `each carbon bonded to ${num(results.neighbours)} others`, x, l.height - 42, { color: theme.angle, font: theme.font, align: "center" });
    label(ctx, `${a.property} · conducts: ${num(results.conducts) === 1 ? "yes" : "no"}`, x, l.height - 22, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── Chains ───────────────────────────────────────────────────────────────────

/**
 * A chain compound as a drawing: carbons left to right with C1 on the right,
 * so the group, or the multiple bond, sits at the right-hand end.
 */
export function carbonChainSketch(chain: CarbonChain): ChainSpec {
  const n = Math.max(1, Math.round(chain.carbons));
  const atoms = Array.from({ length: n }, () => "C");
  const orders = Array.from({ length: Math.max(0, n - 1) }, () => 1);
  if (chain.bond > 0 && n >= 2) orders[n - 2] = chain.bond + 1;
  const branches: NonNullable<ChainSpec["branches"]> = [];
  switch (chain.group) {
    case 1: atoms.push("Cl"); orders.push(1); break;
    case 2: atoms.push("Br"); orders.push(1); break;
    case 3: atoms.push("O"); orders.push(1); break;
    case 4: atoms.push("O"); orders.push(2); break;
    case 5: if (n >= 2) branches.push({ at: n - 2, atoms: ["O"], order: 2 }); break;
    case 6: branches.push({ at: n - 1, atoms: ["O"], order: 2 }, { at: n - 1, atoms: ["O"] }); break;
    default: break;
  }
  return { atoms, orders, branches };
}

function drawChain(ctx: CanvasRenderingContext2D, l: CarbonSchoolLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const info = carbonChainInfo(carbonChainFromResults(results));
  const x = centreX(l);
  if (info.problem !== 0) {
    label(ctx, "Can't make this", x, 16, { color: theme.secant, font: theme.fontStrong, align: "center" });
    label(ctx, CARBON_PROBLEMS[info.problem] ?? "", x, 36, { color: theme.muted, font: theme.font, align: "center" });
    return;
  }
  label(ctx, words ? info.name : "name: ?", x, 16, { color: words ? theme.text : theme.muted, font: theme.fontStrong, align: "center" });
  const series = CARBON_SERIES[info.series] ?? "";
  label(ctx, words ? `${info.formula} · ${series} · ${info.mass} u` : info.formula, x, 36, { color: theme.muted, font: theme.font, align: "center" });

  const mol = chainMolecule(carbonChainSketch(info.chain));
  const box = boxOf(l, 50, l.height - 92);
  const condensed = placeMolecule(mol, box, { style: "condensed", maxBond: 46 }).bond >= 30;
  drawMolecule(ctx, mol, box, {
    style: condensed ? "condensed" : "skeletal",
    color: theme.neutral,
    font: theme.font,
    maxBond: 46,
    lineWidth: 1.8,
    atomColor: (_, atom) => (atom.el === "O" ? theme.cosine : atom.el === "Cl" || atom.el === "Br" ? theme.angle : undefined),
    bondColor: (_, b) => (b.order > 1 && mol.atoms[b.a]!.el === "C" && mol.atoms[b.b]!.el === "C" ? theme.tangent : undefined),
  });

  const lines: { text: string; colour: string }[] = [];
  lines.push({ text: info.condensed, colour: theme.text });
  if (!condensed) lines.push({ text: "each corner of the zig-zag is a carbon", colour: theme.muted });
  if (words) {
    lines.push({ text: `${info.chain.bond === 0 ? "saturated" : "unsaturated"} · ${num(results.chainPairs)} covalent bonds`, colour: theme.angle });
    lines.push({ text: info.iupac ? `class 11 name: ${info.iupac}` : "next in the series: + CH₂, + 14 u", colour: theme.sine });
  }
  lines.forEach((t, i) => label(ctx, t.text, x, l.height - 70 + i * 18, { color: t.colour, font: theme.font, align: "center" }));
}

// ── Reactions ────────────────────────────────────────────────────────────────

const ETHANOL: ChainSpec = { atoms: ["C", "C", "O"] };
const ACID: ChainSpec = { atoms: ["C", "C"], branches: [{ at: 1, atoms: ["O"], order: 2 }, { at: 1, atoms: ["O"] }] };
const ESTER: ChainSpec = { atoms: ["C", "C", "O", "C", "C"], branches: [{ at: 1, atoms: ["O"], order: 2 }] };

/** The main carbon compound before and after, for the pictures. */
export const CARBON_REACTION_PICTURES: Readonly<Record<Exclude<CarbonReactionId, "combustion">, { before: ChainSpec; after: ChainSpec; anion?: boolean }>> = {
  oxidation: { before: ETHANOL, after: ACID },
  addition: { before: { atoms: ["C", "C"], orders: [2] }, after: { atoms: ["C", "C"] } },
  substitution: { before: { atoms: ["C"] }, after: { atoms: ["C", "Cl"] } },
  sodium: { before: ETHANOL, after: ETHANOL, anion: true },
  dehydration: { before: ETHANOL, after: { atoms: ["C", "C"], orders: [2] } },
  esterification: { before: ACID, after: ESTER },
  saponification: { before: ESTER, after: ACID, anion: true },
  carbonate: { before: ACID, after: ACID, anion: true },
  neutralisation: { before: ACID, after: ACID, anion: true },
};

/** Where the burner's flame sits: its centre line, base and tip (the tip moves with the flame). */
export function flameGeometry(l: CarbonSchoolLayout) {
  const x = centreX(l);
  return { x, base: 196, tip: 70, halfWidth: 26 };
}

function drawBurning(ctx: CanvasRenderingContext2D, l: CarbonSchoolLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const info = carbonChainInfo(carbonChainFromResults(results));
  const r = carbonReaction("combustion", info);
  const x = centreX(l);
  label(ctx, r.title, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const g = flameGeometry(l);
  const flame = num(results.flame);
  const air = num(results.air);

  // The burner: a tube, with an air hole whose size follows the air supply.
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.fillRect(g.x - 12, g.base, 24, 70);
  ctx.strokeRect(g.x - 12, g.base, 24, 70);
  ctx.fillRect(g.x - 34, g.base + 70, 68, 10);
  ctx.strokeRect(g.x - 34, g.base + 70, 68, 10);
  ctx.restore();
  const hole = 3 + 9 * clamp((air - 40) / 110, 0, 1);
  dot(ctx, g.x, g.base + 40, hole, theme.background);

  if (flame > 0) {
    const sooty = flame === 2;
    const colour = sooty ? theme.angle : theme.sine;
    const tip = sooty ? g.tip - 10 : g.tip + 20;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(g.x - 11, g.base);
    ctx.quadraticCurveTo(g.x - g.halfWidth, g.base - 50, g.x, tip);
    ctx.quadraticCurveTo(g.x + g.halfWidth, g.base - 50, g.x + 11, g.base);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (sooty) {
      // Unburnt carbon: soot rising from the tip.
      for (let k = 0; k < 9; k++) {
        const sx = g.x + Math.sin(k * 2.1) * (6 + k * 1.6);
        const sy = tip - 6 - k * 4.5;
        dot(ctx, sx, sy, 2.4, theme.muted, 0.9);
      }
    } else {
      dot(ctx, g.x, g.base - 22, 7, theme.background, 0.5);
    }
  } else {
    label(ctx, "nothing to burn here", g.x, (g.base + g.tip) / 2, { color: theme.muted, font: theme.font, align: "center" });
  }

  label(ctx, `air: ${Math.round(air)}% of what burning needs`, x, l.height - 86, { color: theme.text, font: theme.font, align: "center" });
  if (r.reactants.length > 0) {
    label(ctx, words ? carbonEquationText(r) : "fuel + O₂ → CO₂ + H₂O", x, l.height - 64, { color: theme.text, font: theme.fontStrong, align: "center" });
  }
  if (words && flame > 0) {
    const say = flame === 1 ? "clean blue flame: burns completely" : num(results.saturated) === 0 ? "sooty yellow flame: unsaturated" : "sooty yellow flame: too little air";
    label(ctx, say, x, l.height - 42, { color: flame === 1 ? theme.sine : theme.angle, font: theme.font, align: "center" });
    label(ctx, "heat and light, carbon dioxide and water", x, l.height - 22, { color: theme.muted, font: theme.font, align: "center" });
  }
}

function drawReaction(ctx: CanvasRenderingContext2D, l: CarbonSchoolLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const id = CARBON_REACTION_ORDER[num(results.reaction)] ?? "combustion";
  if (id === "combustion") {
    drawBurning(ctx, l, input);
    return;
  }
  const words = layers.has("labels");
  const r = carbonReaction(id, carbonChainInfo(carbonChainFromResults(results)));
  const picture = CARBON_REACTION_PICTURES[id];
  const x = centreX(l);
  label(ctx, r.title, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });

  const top = 40;
  const bottom = 176;
  const gap = 26;
  const draw = (spec: ChainSpec, left: number, right: number, anion: boolean) => {
    const mol = chainMolecule(spec);
    if (anion) {
      // The carboxylate or ethoxide: the O that lost its H carries the charge.
      const last = mol.atoms.length - 1;
      mol.atoms[last] = { ...mol.atoms[last]!, charge: -1 };
    }
    drawMolecule(ctx, mol, boxOf(l, top, bottom, left, right), {
      style: "condensed",
      color: theme.neutral,
      font: theme.font,
      maxBond: 38,
      lineWidth: 1.8,
      atomColor: (_, atom) => (atom.el === "O" ? theme.cosine : atom.el === "Cl" ? theme.angle : undefined),
    });
  };
  draw(picture.before, l.left, x - gap, false);
  draw(picture.after, x + gap, l.right, picture.anion ?? false);
  const ay = (top + bottom) / 2;
  stroke(ctx, theme.text, 2, [{ x: x - 12, y: ay }, { x: x + 12, y: ay }]);
  stroke(ctx, theme.text, 2, [{ x: x + 6, y: ay - 5 }, { x: x + 12, y: ay }, { x: x + 6, y: ay + 5 }]);

  label(ctx, `with: ${r.condition}`, x, 200, { color: theme.angle, font: theme.font, align: "center" });
  label(ctx, carbonEquationText(r), x, 228, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (words) {
    label(ctx, r.observe, x, l.height - 64, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `gas given off: ${CARBON_GASES[num(results.gas)] ?? "none"}`, x, l.height - 42, { color: theme.sine, font: theme.font, align: "center" });
    label(ctx, `carbon product: ${CARBON_SERIES[num(results.productSeries)] ?? ""}`, x, l.height - 22, { color: theme.cosine, font: theme.font, align: "center" });
  }
}

// ── Soap ─────────────────────────────────────────────────────────────────────

/** The bowl: water from `surface` to `floor`, between `left` and `right`. */
export function bowlGeometry(l: CarbonSchoolLayout) {
  const x = centreX(l);
  const half = Math.min(140, (l.right - l.left) / 2);
  return { left: x - half, right: x + half, surface: 60, floor: 220 };
}

/** One soap molecule: a zig-zag tail of `length` px from (x, y) in direction `angle`, ending in a head. */
function soapMolecule(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, theme: LabTheme) {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const steps = 5;
  const pts = Array.from({ length: steps + 1 }, (_, k) => {
    const s = (k / steps) * length;
    const w = k % 2 === 0 ? 0 : 2.5;
    return { x: x + ux * s - uy * w, y: y + uy * s + ux * w };
  });
  stroke(ctx, theme.angle, 1.4, pts);
  dot(ctx, x + ux * (length + 3), y + uy * (length + 3), 3.4, theme.cosine);
}

function drawSoap(ctx: CanvasRenderingContext2D, l: CarbonSchoolLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const detergent = num(results.cleaner) === 1;
  const x = centreX(l);
  label(ctx, detergent ? "Detergent in the water" : "Soap in the water", x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const hard = num(results.hardness);
  label(ctx, hard > 0 ? `hard water: ${hard.toFixed(1)} mmol Ca²⁺/Mg²⁺` : "soft water", x, 36, { color: theme.muted, font: theme.font, align: "center" });

  const b = bowlGeometry(l);
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(b.left, b.surface, b.right - b.left, b.floor - b.surface);
  ctx.restore();
  stroke(ctx, theme.axis, 1.6, [{ x: b.left, y: b.surface - 12 }, { x: b.left, y: b.floor }, { x: b.right, y: b.floor }, { x: b.right, y: b.surface - 12 }]);
  stroke(ctx, theme.sine, 1, [{ x: b.left, y: b.surface }, { x: b.right, y: b.surface }]);

  // Calcium ions still in the water, and scum floating on top.
  const scum = num(results.scum);
  const ions = Math.round(clamp(hard - scum, 0, 6) * 2);
  for (let k = 0; k < ions; k++) dot(ctx, b.left + 14 + ((k * 37) % (b.right - b.left - 28)), b.surface + 18 + ((k * 23) % 60), 3, theme.tangent);
  const flakes = Math.round(clamp(scum, 0, 6) * 2);
  for (let k = 0; k < flakes; k++) {
    const fx = b.left + 12 + ((k * 29) % (b.right - b.left - 24));
    ctx.save();
    ctx.fillStyle = theme.muted;
    ctx.fillRect(fx - 7, b.surface - 3 + (k % 2) * 3, 14, 4);
    ctx.restore();
  }

  // Oil: in the micelles once there are any, else a drop on the floor.
  const micelles = num(results.micelles) === 1;
  const cleaning = num(results.cleaning);
  const midY = (b.surface + b.floor) / 2 + 10;
  if (micelles) {
    const count = 1 + Math.round((cleaning / 100) * 3);
    const span = b.right - b.left;
    for (let k = 0; k < count; k++) {
      const mx = b.left + (span * (k + 0.5)) / count;
      const my = midY + (k % 2 === 0 ? -14 : 14);
      const r = Math.min(13, span / count / 2 - 14);
      dot(ctx, mx, my, r, theme.secant, 0.8);
      for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 4;
        soapMolecule(ctx, mx + Math.cos(a) * (r * 0.5), my + Math.sin(a) * (r * 0.5), a, r * 0.5 + 8, theme);
      }
    }
    const left = 100 - cleaning;
    if (left > 0) dot(ctx, x, b.floor - 9, 6 + 0.12 * left, theme.secant, 0.8);
    // Lather on top.
    for (let k = 0; k < 7; k++) {
      const bx = b.left + 20 + ((k * 41) % (b.right - b.left - 40));
      ctx.save();
      ctx.strokeStyle = theme.point;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(bx, b.surface - 8, 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    dot(ctx, x, b.floor - 16, 16, theme.secant, 0.8);
    const free = num(results.freeSoap);
    const loose = Math.round(clamp(free, 0, 2) * 2);
    for (let k = 0; k < loose; k++) {
      const a = Math.PI + (k * Math.PI) / Math.max(1, loose - 1);
      soapMolecule(ctx, x + Math.cos(a) * 12, b.floor - 16 + Math.sin(a) * 12, a, 14, theme);
    }
  }

  // One soap molecule, large: head and tail.
  const my = 250;
  const tailLeft = l.left + 6;
  const tailRight = Math.min(l.right - 70, x + 60);
  const pts = Array.from({ length: 13 }, (_, k) => ({ x: tailLeft + ((tailRight - tailLeft) * k) / 12, y: my + (k % 2 === 0 ? 4 : -4) }));
  stroke(ctx, theme.angle, 1.8, pts);
  dot(ctx, tailRight + 8, my, 7, theme.cosine);
  label(ctx, detergent ? "–SO₃⁻Na⁺" : "–COO⁻Na⁺", tailRight + 18, my, { color: theme.cosine, font: theme.font });
  label(ctx, "tail: goes into oil", tailLeft, my + 20, { color: theme.angle, font: theme.font });
  label(ctx, "head: stays in water", l.right, my + 38, { color: theme.cosine, font: theme.font, align: "right" });

  if (words) {
    label(ctx, `scum: ${scum.toFixed(1)} mmol · used up: ${num(results.soapWasted).toFixed(1)} mmol`, x, l.height - 64, { color: theme.muted, font: theme.font, align: "center" });
    label(ctx, `free: ${num(results.freeSoap).toFixed(1)} mmol · micelles: ${micelles ? "yes" : "no"}`, x, l.height - 42, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `oil lifted: ${Math.round(cleaning)}%`, x, l.height - 22, { color: theme.secant, font: theme.font, align: "center" });
  }
}

export const carbonSchoolRenderer: SimulationRenderer<CarbonSchoolLayout> = {
  id: "carbonschool",
  layout: (width) => computeCarbonSchoolLayout(width),

  draw(ctx, layout, input) {
    ctx.clearRect(0, 0, layout.width, layout.height);
    const has = (layer: string) => input.layers.has(layer);
    if (has("allotropes")) drawAllotropes(ctx, layout, input);
    else if (has("chain")) drawChain(ctx, layout, input);
    else if (has("reaction")) drawReaction(ctx, layout, input);
    else if (has("soap")) drawSoap(ctx, layout, input);
    else if (has("dots")) drawDots(ctx, layout, input);
  },
};
