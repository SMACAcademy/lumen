/**
 * Atoms, molecules and the periodic table, in seven pictures.
 *
 * Molecule: the atoms of one particle, joined, with the atomic masses that
 * add up to its molecular mass. Formula: two ions, their valencies crossed
 * into a formula. Mole: grams → moles → particles, down a ladder of boxes.
 * Triads: three masses on a number line, the average of the outer two
 * marked. Octaves: Newlands' table under its seven notes, with an element
 * and its eighth picked out. Mendeleev: a gap and the element that filled
 * it, then two elements that atomic mass puts the wrong way round.
 * Trends: a period or group drawn as atoms sized by their radii.
 *
 * Every number a level asks for is drawn only with the labels layer on.
 */

import {
  SA_ANION_ORDER,
  SA_ANIONS,
  SA_ATOMIC_MASS,
  SA_CATION_ORDER,
  SA_CATIONS,
  SA_GAP_ORDER,
  SA_GAPS,
  SA_NOTES,
  SA_OCTAVES,
  SA_PAIR_ORDER,
  SA_PAIRS,
  SA_SERIES,
  SA_SERIES_ORDER,
  SA_SUBSTANCE_ORDER,
  SA_SUBSTANCES,
  SA_TRIAD_ORDER,
  SA_TRIADS,
  saFormulaText,
  saMassOf,
  saSubscript,
  type SASubstance,
} from "@ise/chemistry-engine";
import type { Results } from "@ise/science-engine";
import { arrow, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface SchoolAtomsLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right edges of the drawing. */
  left: number;
  right: number;
}

export function computeSchoolAtomsLayout(width: number): SchoolAtomsLayout {
  const compact = width < 560;
  return { width, height: compact ? 360 : 380, compact, left: 16, right: width - 16 };
}

// ── Text helpers ─────────────────────────────────────────────────────────────

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };

/** 1.2044e24 → "1.204 × 10²⁴"; small exponents stay plain. */
export function saScientific(v: number, figures = 4): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(v)));
  if (exponent >= -2 && exponent < 4) return trim(v, figures);
  const mantissa = v / 10 ** exponent;
  const sup = String(exponent).split("").map((c) => SUPERSCRIPT[c] ?? c).join("");
  return `${trim(mantissa, figures)} × 10${sup}`;
}

/** Up to `figures` significant figures, without trailing zeros. */
function trim(v: number, figures = 3): string {
  const text = String(Number(v.toPrecision(figures)));
  return text.startsWith("-") ? `−${text.slice(1)}` : text;
}

/** One decimal where it matters: 35.5 stays, 16 stays 16. */
const mass = (m: number) => trim(m, 5);

const ATOMICITY_NAMES = ["", "monatomic", "diatomic", "triatomic", "tetra-atomic"];
export function atomicityName(n: number): string {
  return ATOMICITY_NAMES[n] ?? "poly-atomic";
}

/** "2 × 1 + 16 = 18 u" for water. */
export function massSum(atoms: Readonly<Record<string, number>>): string {
  const terms = Object.entries(atoms).map(([symbol, n]) => (n === 1 ? mass(SA_ATOMIC_MASS[symbol] ?? 0) : `${n} × ${mass(SA_ATOMIC_MASS[symbol] ?? 0)}`));
  return `${terms.join(" + ")} = ${mass(saMassOf(atoms))} u`;
}

function elementColour(symbol: string, theme: LabTheme): string {
  switch (symbol) {
    case "H":
      return theme.neutral;
    case "O":
      return theme.cosine;
    case "N":
      return theme.sine;
    case "C":
      return theme.muted;
    case "S":
      return theme.angle;
    case "P":
      return theme.secant;
    case "Cl":
      return theme.tangent;
    case "He":
    case "Ar":
      return theme.accent;
    default:
      return theme.curve;
  }
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string, dash?: number[]) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
  }
  ctx.restore();
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stroke: string, fill?: string, lineWidth = 1.5) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function bond(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

const pick = <T extends string>(order: readonly T[], i: unknown): T => order[Math.round(num(i))] ?? order[0]!;

// ── Molecule ─────────────────────────────────────────────────────────────────

/** Atom centres for one particle: a ring for an element, a central atom with the others round it for a compound. */
export function moleculePositions(substance: SASubstance, cx: number, cy: number, r: number): { symbol: string; x: number; y: number; centre: boolean }[] {
  const entries = Object.entries(substance.atoms);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (total === 1) return [{ symbol: entries[0]![0], x: cx, y: cy, centre: true }];
  if (entries.length === 1 || substance.particle === 2) {
    const symbols = entries.flatMap(([s, n]) => Array.from({ length: n }, () => s));
    if (symbols.length === 2) return symbols.map((symbol, i) => ({ symbol, x: cx + (i === 0 ? -1 : 1) * r * 1.1, y: cy, centre: false }));
    const ring = r * (symbols.length <= 4 ? 1.5 : 2.6);
    return symbols.map((symbol, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / symbols.length;
      return { symbol, x: cx + ring * Math.cos(a), y: cy + ring * Math.sin(a), centre: false };
    });
  }
  const centre = entries.find(([s, n]) => n === 1 && s !== "H") ?? entries[0]!;
  const others = entries.filter((e) => e !== centre).flatMap(([s, n]) => Array.from({ length: n }, () => s));
  const reach = r * 2.1;
  // Water is bent; a pair round carbon (CO₂) is straight.
  const angles =
    others.length === 2
      ? centre[0] === "O"
        ? [Math.PI / 2 + 0.91, Math.PI / 2 - 0.91]
        : [Math.PI, 0]
      : others.map((_, i) => -Math.PI / 2 + (2 * Math.PI * i) / others.length);
  return [
    { symbol: centre[0], x: cx, y: cy, centre: true },
    ...others.map((symbol, i) => ({ symbol, x: cx + reach * Math.cos(angles[i]!), y: cy + reach * Math.sin(angles[i]!), centre: false })),
  ];
}

function drawMolecule(ctx: CanvasRenderingContext2D, layout: SchoolAtomsLayout, results: Results, theme: LabTheme, labels: boolean) {
  const id = pick(SA_SUBSTANCE_ORDER, results.substance);
  const s = SA_SUBSTANCES[id];
  const cx = layout.width / 2;
  const cy = 150;
  const r = layout.compact ? 18 : 22;
  label(ctx, `${s.formula}: ${s.name.toLowerCase()}`, cx, 22, { color: theme.text, font: theme.fontStrong, align: "center" });

  const atoms = moleculePositions(s, cx, cy, r);
  const centre = atoms.find((a) => a.centre);
  const ionic = s.particle === 2;
  if (!ionic && atoms.length > 1) {
    if (centre) for (const a of atoms) if (a !== centre) bond(ctx, centre.x, centre.y, a.x, a.y, theme.axis);
    if (!centre) for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i]!;
      const b = atoms[(i + 1) % atoms.length]!;
      if (atoms.length === 2 && i === 1) break;
      bond(ctx, a.x, a.y, b.x, b.y, theme.axis);
    }
    // P₄ is a tetrahedron: every atom bonded to every other.
    if (id === "p4") {
      bond(ctx, atoms[0]!.x, atoms[0]!.y, atoms[2]!.x, atoms[2]!.y, theme.axis);
      bond(ctx, atoms[1]!.x, atoms[1]!.y, atoms[3]!.x, atoms[3]!.y, theme.axis);
    }
  }
  for (const a of atoms) {
    disc(ctx, a.x, a.y, r, elementColour(a.symbol, theme), theme.background);
    label(ctx, a.symbol, a.x, a.y, { color: theme.background, font: theme.fontStrong, align: "center" });
    if (ionic) label(ctx, a.symbol === "Na" ? "+" : "−", a.x + r * 0.8, a.y - r * 0.8, { color: theme.text, font: theme.fontStrong, align: "center" });
  }

  const known = Object.keys(s.atoms).map((symbol) => `${symbol} = ${mass(SA_ATOMIC_MASS[symbol] ?? 0)} u`);
  label(ctx, `Atomic masses: ${known.join(", ")}`, cx, layout.height - 70, { color: theme.muted, font: theme.font, align: "center" });
  if (!labels) return;
  const n = num(results.atomicity);
  const what =
    s.particle === 0
      ? s.atoms.He || s.atoms.Ar
        ? "Exists as single atoms: monatomic"
        : "Made of atoms, counted one atom at a time"
      : ionic
        ? "One Na⁺ and one Cl⁻: a formula unit, not a molecule"
        : `${n} atoms in one molecule: ${atomicityName(n)}`;
  label(ctx, what, cx, layout.height - 46, { color: theme.text, font: theme.font, align: "center" });
  const kind = s.particle === 0 ? "atomic mass" : ionic ? "formula unit mass" : "molecular mass";
  label(ctx, `${kind} = ${massSum(s.atoms)}`, cx, layout.height - 24, { color: theme.angle, font: theme.fontStrong, align: "center" });
}

// ── Formula ──────────────────────────────────────────────────────────────────

function drawFormula(ctx: CanvasRenderingContext2D, layout: SchoolAtomsLayout, results: Results, theme: LabTheme, labels: boolean) {
  const cationId = pick(SA_CATION_ORDER, results.cation);
  const anionId = pick(SA_ANION_ORDER, results.anion);
  const c = SA_CATIONS[cationId];
  const a = SA_ANIONS[anionId];
  const w = layout.width;
  const cardW = Math.min(130, (w - 60) / 2);
  const leftX = w / 2 - cardW - 14;
  const rightX = w / 2 + 14;
  const top = 18;
  const cardH = 74;
  for (const [ion, x, colour] of [[c, leftX, theme.sine], [a, rightX, theme.cosine]] as const) {
    box(ctx, x, top, cardW, cardH, colour);
    label(ctx, ion.symbol, x + cardW / 2, top + 20, { color: colour, font: theme.fontStrong, align: "center" });
    label(ctx, ion.name, x + cardW / 2, top + 40, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `valency ${ion.valency} · ${mass(saMassOf(ion.atoms))} u`, x + cardW / 2, top + 58, { color: theme.muted, font: theme.font, align: "center" });
  }

  // The cross: each valency goes down to the other ion.
  const y1 = top + cardH + 8;
  const y2 = y1 + 56;
  arrow(ctx, leftX + cardW * 0.7, y1, rightX + cardW * 0.3, y2, { color: theme.sine, width: 2, head: 8 });
  arrow(ctx, rightX + cardW * 0.3, y1, leftX + cardW * 0.7, y2, { color: theme.cosine, width: 2, head: 8 });
  label(ctx, "cross the valencies", w / 2, y1 + 28, { color: theme.muted, font: theme.font, align: "center", background: theme.background });

  const fy = y2 + 26;
  if (!labels) {
    label(ctx, `${c.core} ? ${a.core} ?`, w / 2, fy, { color: theme.text, font: theme.fontStrong, align: "center" });
    return;
  }
  const nc = num(results.cationCount);
  const na = num(results.anionCount);
  label(ctx, saFormulaText(cationId, anionId), w / 2, fy, { color: theme.angle, font: theme.fontStrong, align: "center" });
  // The ions of one formula unit.
  const beads = nc + na;
  const step = Math.min(28, (w - 40) / beads);
  const startX = w / 2 - (step * (beads - 1)) / 2;
  for (let i = 0; i < beads; i++) {
    const positive = i < nc;
    const x = startX + i * step;
    disc(ctx, x, fy + 30, Math.min(11, step / 2 - 1), positive ? theme.sine : theme.cosine);
    label(ctx, positive ? "+" : "−", x, fy + 30, { color: theme.background, font: theme.fontStrong, align: "center" });
  }
  label(ctx, `charges: ${nc} × (+${c.valency}) = +${nc * c.valency}, ${na} × (−${a.valency}) = −${na * a.valency}`, w / 2, fy + 58, { color: theme.text, font: theme.font, align: "center" });
  const mc = mass(saMassOf(c.atoms));
  const ma = mass(saMassOf(a.atoms));
  const term = (n: number, m: string) => (n === 1 ? m : `${n} × ${m}`);
  label(ctx, `mass = ${term(nc, mc)} + ${term(na, ma)} = ${mass(num(results.formulaMass))} u`, w / 2, fy + 80, { color: theme.angle, font: theme.font, align: "center" });
  if (num(results.simplified) === 1) {
    label(ctx, `crossed ${a.valency} and ${c.valency}, then cancelled the common factor`, w / 2, fy + 102, { color: theme.muted, font: theme.font, align: "center" });
  }
}

// ── Mole ─────────────────────────────────────────────────────────────────────

const PARTICLE_WORDS = ["atoms", "molecules", "formula units"];

function drawMole(ctx: CanvasRenderingContext2D, layout: SchoolAtomsLayout, results: Results, theme: LabTheme, labels: boolean) {
  const s = SA_SUBSTANCES[pick(SA_SUBSTANCE_ORDER, results.substance)];
  const w = layout.width;
  const bw = Math.min(220, w - 80);
  const bx = w / 2 - bw / 2;
  const bh = 46;
  const gap = 52;
  const ys = [36, 36 + bh + gap, 36 + 2 * (bh + gap)];
  const words = PARTICLE_WORDS[num(results.particleKind)] ?? "particles";
  label(ctx, `${s.name} (${s.formula}), counted as ${words}`, w / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });

  const values = [
    `${trim(num(results.mass), 4)} g`,
    labels ? `${trim(num(results.moles), 4)} mol` : "? mol",
    labels ? `${saScientific(num(results.particles))} ${words}` : `? ${words}`,
  ];
  const names = ["mass", "moles", "number of particles"];
  const colours = [theme.neutral, theme.angle, theme.sine];
  ys.forEach((y, i) => {
    box(ctx, bx, y, bw, bh, colours[i]!);
    label(ctx, names[i]!, bx + bw / 2, y + 13, { color: theme.muted, font: theme.font, align: "center" });
    label(ctx, values[i]!, bx + bw / 2, y + 31, { color: colours[i]!, font: theme.fontStrong, align: "center" });
  });
  const molar = mass(num(results.molarMass));
  const steps = [`÷ ${molar} g/mol`, "× 6.022 × 10²³"];
  for (let i = 0; i < 2; i++) {
    const y1 = ys[i]! + bh + 4;
    const y2 = ys[i + 1]! - 4;
    arrow(ctx, w / 2, y1, w / 2, y2, { color: theme.axis, width: 2, head: 8 });
    label(ctx, steps[i]!, w / 2 + 10, (y1 + y2) / 2, { color: theme.text, font: theme.font });
  }
  const y = ys[2]! + bh + 22;
  label(ctx, `1 mole of ${s.formula} weighs ${molar} g`, w / 2, y, { color: theme.muted, font: theme.font, align: "center" });
  if (labels && num(results.atomicity) > 1) {
    label(ctx, `= ${saScientific(num(results.atoms))} atoms (${num(results.atomicity)} in each)`, w / 2, y + 20, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── Triads ───────────────────────────────────────────────────────────────────

function drawTriads(ctx: CanvasRenderingContext2D, layout: SchoolAtomsLayout, results: Results, theme: LabTheme, labels: boolean) {
  const t = SA_TRIADS[pick(SA_TRIAD_ORDER, results.triad)];
  const w = layout.width;
  label(ctx, `Döbereiner: ${t.symbols.join(", ")} in order of mass`, w / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
  const cw = Math.min(90, (w - 60) / 3);
  const colours = [theme.sine, theme.angle, theme.cosine];
  t.symbols.forEach((symbol, i) => {
    const x = w / 2 + (i - 1) * (cw + 14) - cw / 2;
    box(ctx, x, 38, cw, 56, colours[i]!);
    label(ctx, symbol, x + cw / 2, 56, { color: colours[i]!, font: theme.fontStrong, align: "center" });
    label(ctx, `${t.masses[i]!.toFixed(1)} u`, x + cw / 2, 78, { color: theme.text, font: theme.font, align: "center" });
  });

  // A number line from the lightest to the heaviest.
  const x1 = layout.left + 20;
  const x2 = layout.right - 20;
  const [lo, , hi] = t.masses;
  const at = (m: number) => x1 + ((m - lo) / (hi - lo)) * (x2 - x1);
  const ly = 170;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x1, ly);
  ctx.lineTo(x2, ly);
  ctx.stroke();
  ctx.restore();
  t.masses.forEach((m, i) => {
    disc(ctx, at(m), ly, 7, colours[i]!);
    label(ctx, t.symbols[i]!, at(m), ly - 18, { color: colours[i]!, font: theme.fontStrong, align: "center" });
  });
  if (!labels) {
    label(ctx, "Is the middle mass halfway?", w / 2, ly + 50, { color: theme.muted, font: theme.font, align: "center" });
    return;
  }
  const avg = num(results.triadAverage);
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(at(avg), ly - 6);
  ctx.lineTo(at(avg), ly + 22);
  ctx.stroke();
  ctx.restore();
  label(ctx, `average ${trim(avg, 5)}`, at(avg), ly + 32, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `(${lo.toFixed(1)} + ${hi.toFixed(1)}) ÷ 2 = ${trim(avg, 5)}`, w / 2, ly + 70, { color: theme.text, font: theme.font, align: "center" });
  const off = Math.abs(num(results.triadGap));
  const verdict = num(results.isTriad) === 1 ? "a triad" : "not a triad";
  label(ctx, `${t.symbols[1]} is ${trim(off, 3)} from it (${trim(num(results.triadOff), 2)}%): ${verdict}`, w / 2, ly + 92, { color: theme.angle, font: theme.fontStrong, align: "center" });
}

// ── Octaves ──────────────────────────────────────────────────────────────────

export function octaveCell(layout: SchoolAtomsLayout, position: number) {
  const cw = (layout.right - layout.left) / 7;
  const ch = layout.compact ? 34 : 38;
  const col = (position - 1) % 7;
  const row = Math.floor((position - 1) / 7);
  return { x: layout.left + col * cw, y: 46 + row * ch, width: cw, height: ch };
}

function drawOctaves(ctx: CanvasRenderingContext2D, layout: SchoolAtomsLayout, results: Results, theme: LabTheme, labels: boolean) {
  const w = layout.width;
  const here = num(results.octave, 1);
  const eighth = num(results.eighth);
  SA_NOTES.forEach((note, i) => {
    const cell = octaveCell(layout, i + 1);
    label(ctx, note, cell.x + cell.width / 2, 34, { color: theme.muted, font: theme.font, align: "center" });
  });
  SA_OCTAVES.forEach((slot, i) => {
    const p = i + 1;
    const cell = octaveCell(layout, p);
    const mark = p === here ? theme.angle : p === eighth ? theme.tangent : theme.grid;
    const fill = labels && p > 17 ? theme.surface2 : undefined;
    box(ctx, cell.x + 2, cell.y + 2, cell.width - 4, cell.height - 4, mark, fill, p === here || p === eighth ? 2.5 : 1);
    label(ctx, slot.label.replace(", ", ","), cell.x + cell.width / 2, cell.y + cell.height / 2, { color: theme.text, font: theme.font, align: "center" });
  });
  const name = SA_OCTAVES[here - 1]?.label ?? "";
  const y = octaveCell(layout, 33).y + 60;
  if (!eighth) {
    label(ctx, `${name}: the table ends before its eighth`, w / 2, y, { color: theme.muted, font: theme.font, align: "center" });
    return;
  }
  const other = SA_OCTAVES[eighth - 1]?.label ?? "";
  label(ctx, `${name} → ${other}: the eighth element on`, w / 2, y, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (!labels) return;
  const alike = num(results.alike) === 1;
  const past = num(results.pastCalcium) === 1;
  label(ctx, alike ? "same family: the octave works" : past ? "not alike: past calcium the octaves fail" : "not alike", w / 2, y + 22, {
    color: alike ? theme.tangent : theme.cosine,
    font: theme.font,
    align: "center",
  });
}

// ── Mendeleev ────────────────────────────────────────────────────────────────

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

function drawMendeleev(ctx: CanvasRenderingContext2D, layout: SchoolAtomsLayout, results: Results, theme: LabTheme, labels: boolean) {
  const g = SA_GAPS[pick(SA_GAP_ORDER, results.gap)];
  const w = layout.width;
  const x0 = layout.left;
  label(ctx, `Mendeleev's group ${ROMAN[g.group] ?? g.group}: a gap below ${g.above}`, w / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  // The column: the element above, and the gap.
  box(ctx, x0, 34, 54, 38, theme.axis);
  label(ctx, g.above, x0 + 27, 53, { color: theme.text, font: theme.fontStrong, align: "center" });
  box(ctx, x0, 80, 54, 38, theme.angle, undefined, 2);
  label(ctx, "?", x0 + 27, 99, { color: theme.angle, font: theme.fontStrong, align: "center" });
  const tx = x0 + 66;
  const oxide = `E${num(results.ekaOxideMetal) > 1 ? saSubscript(num(results.ekaOxideMetal)) : ""}O${num(results.ekaOxideOxygen) > 1 ? saSubscript(num(results.ekaOxideOxygen)) : ""}`;
  label(ctx, `${g.eka}: mass ${g.predicted}`, tx, 44, { color: theme.angle, font: theme.font });
  label(ctx, labels ? `oxide ${oxide}, chloride ECl${saSubscript(g.group)}` : "oxide ?, chloride ?", tx, 62, { color: theme.angle, font: theme.font });
  label(ctx, `${g.element} (${g.symbol}), found ${g.discovered}:`, tx, 90, { color: theme.tangent, font: theme.font });
  label(ctx, `mass ${g.measured.toFixed(1)}${labels ? ` (${trim(num(results.ekaError), 2)}% off)` : ""}`, tx, 108, { color: theme.tangent, font: theme.font });

  // An order pair.
  const p = SA_PAIRS[pick(SA_PAIR_ORDER, results.pair)];
  const top = 150;
  label(ctx, `${p.symbols[0]} and ${p.symbols[1]}: which comes first?`, w / 2, top, { color: theme.text, font: theme.fontStrong, align: "center" });
  const byMass = p.masses[0] < p.masses[1] ? [0, 1] : [1, 0];
  const rows: [string, number[], (i: number) => string][] = [
    ["by atomic mass", byMass, (i) => `${p.symbols[i]} ${p.masses[i]!.toFixed(1)}`],
    ["by atomic number", [0, 1], (i) => `${p.symbols[i]} Z=${p.Z[i]}`],
  ];
  const cw = Math.min(90, (w - 32 - 100) / 2);
  rows.forEach(([name, order, text], r) => {
    const y = top + 22 + r * 50;
    label(ctx, name, x0, y + 18, { color: theme.muted, font: theme.font });
    order.forEach((i, k) => {
      const x = layout.right - (2 - k) * (cw + 6);
      box(ctx, x, y, cw, 36, r === 0 ? theme.secant : theme.sine);
      label(ctx, text(i), x + cw / 2, y + 18, { color: theme.text, font: theme.font, align: "center" });
    });
  });
  if (labels) {
    const agrees = num(results.massOrderAgrees) === 1;
    label(ctx, agrees ? "Both orders agree" : "Mass puts them the wrong way round", w / 2, top + 134, { color: agrees ? theme.tangent : theme.cosine, font: theme.font, align: "center" });
  }
}

// ── Trends ───────────────────────────────────────────────────────────────────

const SERIES_TITLES = ["Period 2, left to right", "Period 3, left to right", "Group 1, top to bottom", "Group 14, top to bottom", "Group 17, top to bottom"];
const CHARACTER_WORDS = ["non-metal", "metalloid", "metal", "noble gas"];

export function trendCentre(layout: SchoolAtomsLayout, count: number, member: number) {
  const cw = (layout.right - layout.left) / count;
  return { x: layout.left + cw * (member - 0.5), y: 120, cell: cw };
}

function drawTrends(ctx: CanvasRenderingContext2D, layout: SchoolAtomsLayout, results: Results, theme: LabTheme, labels: boolean) {
  const seriesIndex = Math.round(num(results.series));
  const series = SA_SERIES[SA_SERIES_ORDER[seriesIndex] ?? "period-3"];
  const w = layout.width;
  const member = num(results.member, 1);
  const fills = [theme.sine, theme.angle, theme.curve, theme.muted];
  label(ctx, `${SERIES_TITLES[seriesIndex] ?? ""}: atoms drawn to scale`, w / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
  const largest = Math.max(...series.map((e) => e.radius ?? 0));
  const cell = trendCentre(layout, series.length, 1).cell;
  const maxPx = Math.min(cell / 2 - 3, 46);
  series.forEach((e, i) => {
    const { x, y } = trendCentre(layout, series.length, i + 1);
    const current = i + 1 === member;
    const fill = labels ? fills[e.character]! : theme.neutral;
    if (e.radius === null) disc(ctx, x, y, 6, theme.surface2, theme.muted, [3, 3]);
    else disc(ctx, x, y, (e.radius / largest) * maxPx, fill, current ? theme.text : undefined);
    label(ctx, e.symbol, x, y + maxPx + 14, { color: current ? theme.text : theme.muted, font: current ? theme.fontStrong : theme.font, align: "center" });
    if (labels) label(ctx, e.radius === null ? "—" : String(e.radius), x, y + maxPx + 32, { color: theme.muted, font: theme.font, align: "center" });
  });
  if (inSeries(member, series.length)) {
    const { x } = trendCentre(layout, series.length, member);
    arrow(ctx, x, 44, x, 120 - maxPx - 4, { color: theme.text, width: 1.5, head: 7 });
  }
  if (!labels) return;
  const y = 120 + maxPx + 62;
  const e = series[member - 1]!;
  const v = num(results.valenceElectrons);
  label(ctx, `${e.symbol}: Z = ${e.Z}, period ${e.period}, group ${e.group}, a ${CHARACTER_WORDS[e.character]}`, w / 2, y, { color: theme.text, font: theme.font, align: "center" });
  const radius = num(results.hasRadius) === 1 ? `radius ${num(results.radius)} pm · ` : "";
  label(ctx, `${radius}${v} outer electron${v === 1 ? "" : "s"}, valency ${num(results.valency)}`, w / 2, y + 20, { color: theme.angle, font: theme.font, align: "center" });
  // Key to the colours.
  const keyY = layout.height - 16;
  const keys = CHARACTER_WORDS.slice(0, 3);
  const step = (layout.right - layout.left) / keys.length;
  keys.forEach((word, i) => {
    const x = layout.left + step * i + 8;
    disc(ctx, x, keyY, 5, fills[i]!);
    label(ctx, word, x + 9, keyY, { color: theme.muted, font: theme.font });
  });
}

const inSeries = (member: number, count: number) => member >= 1 && member <= count;

export const schoolAtomsRenderer: SimulationRenderer<SchoolAtomsLayout> = {
  id: "schoolatoms",
  layout: (width) => computeSchoolAtomsLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const labels = layers.has("labels");
    if (layers.has("molecule")) drawMolecule(ctx, layout, results, theme, labels);
    else if (layers.has("formula")) drawFormula(ctx, layout, results, theme, labels);
    else if (layers.has("mole")) drawMole(ctx, layout, results, theme, labels);
    else if (layers.has("triads")) drawTriads(ctx, layout, results, theme, labels);
    else if (layers.has("octaves")) drawOctaves(ctx, layout, results, theme, labels);
    else if (layers.has("mendeleev")) drawMendeleev(ctx, layout, results, theme, labels);
    else if (layers.has("trends")) drawTrends(ctx, layout, results, theme, labels);
  },
};
