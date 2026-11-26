/**
 * Haloalkanes and haloarenes.
 *
 * One canvas, eight views, chosen by the mode's layers:
 *   bond        — CH₃–X with its polarity; bond lengths (to a pm ruler) and
 *                 bond enthalpies for F, Cl, Br and I.
 *   sn2         — the one-step backside attack, the umbrella turning inside
 *                 out; rate = k[RX][Nu⁻].
 *   sn1         — ionisation to a flat carbocation, then attack on both
 *                 faces: half inversion, half retention.
 *   chooser     — substrate, nucleophile and solvent; which mechanism.
 *   elimination — the substrate with α and β carbons, and what aqueous or
 *                 alcoholic KOH makes of it.
 *   mirror      — a tetrahedral carbon and its mirror image, which can be
 *                 turned; a polarimeter reading for a mixture.
 *   arene       — Cl on a benzene ring with –NO₂ groups ortho/para.
 *   eas         — chlorobenzene's ortho and para substitution.
 * Answers (lengths, rates, mechanisms, products, rotations, conditions)
 * appear only with "labels".
 */

import {
  HALO_ARYL_C_CL,
  HALO_BONDS,
  HALO_CONFIGS,
  HALO_DEGREES,
  HALO_ELIMINATION_SUBSTRATES,
  HALO_PATHWAYS,
  HALO_SUBSTRATES,
  HALO_TETRAHEDRON,
  haloArene,
  haloChiralMolecule,
  haloEliminate,
  haloElectrophile,
  haloEliminationSubstrate,
  haloMirrorPositions,
  haloSn1Frames,
  haloSn2Frame,
  type HaloFrame,
  type HaloVec,
} from "@ise/chemistry-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import { chainMolecule, drawCurlyArrow, drawMolecule, type Atom2D, type Bond2D, type Box, type Molecule2D, type MoleculePlacement } from "../shared/molecule";
import type { LabTheme } from "../theme";
import type { RenderInput, SimulationRenderer } from "../types";

export interface HaloLayout {
  width: number;
  height: number;
  /** The central column everything is drawn in. */
  left: number;
  right: number;
}

export function computeHaloLayout(width: number): HaloLayout {
  const column = Math.min(width - 32, 520);
  const left = (width - column) / 2;
  return { width, height: 380, left, right: left + column };
}

const centreX = (l: HaloLayout) => (l.left + l.right) / 2;
const colWidth = (l: HaloLayout) => l.right - l.left;
const boxOf = (l: HaloLayout, top: number, bottom: number, from = l.left, to = l.right): Box => ({ x: from, y: top, width: to - from, height: bottom - top });

// ── 3D → 2D ──────────────────────────────────────────────────────────────────

const YAW = (40 * Math.PI) / 180;

/**
 * A mechanism seen a little from the right (turned 40° about the vertical),
 * so the umbrella of three groups opens out: canvas x, y (bond units, y down).
 */
export function haloProject(p: HaloVec): { x: number; y: number } {
  return { x: p.x * Math.cos(YAW) + p.z * Math.sin(YAW) || 0, y: -p.y || 0 };
}

/**
 * A tetrahedral carbon drawn the chemist’s way: groups towards the viewer
 * slide down, groups away slide up, so a wedge and a dash on the same side
 * never land on each other — nor, however the mirror image is turned, on the
 * carbon. (A sideways slide would put some turn’s group on the carbon.)
 */
export function haloOblique(p: HaloVec): { x: number; y: number } {
  return { x: p.x || 0, y: -(p.y - 0.8 * p.z) || 0 };
}

/** Wedge or dash from the group’s own z (towards the viewer), as chemists draw it — not from the tilted view. */
const stereoOf = (depth: number): Bond2D["stereo"] => (depth > 0.3 ? "wedge" : depth < -0.3 ? "dash" : undefined);

/**
 * Draw a molecule at a fixed scale with its atom `anchor` at (ox, oy), so a
 * picture that changes from frame to frame does not jump about.
 */
function drawAnchored(ctx: CanvasRenderingContext2D, mol: Molecule2D, anchor: number, ox: number, oy: number, bond: number, color: string, theme: LabTheme, atomColor?: (i: number, atom: Atom2D) => string | undefined): MoleculePlacement {
  const xs = mol.atoms.map((a) => a.x);
  const ys = mol.atoms.map((a) => a.y);
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const a = mol.atoms[anchor]!;
  const cx = ox + (midX - a.x) * bond;
  const cy = oy + (midY - a.y) * bond;
  const size = 4000;
  return drawMolecule(ctx, mol, { x: cx - size / 2, y: cy - size / 2, width: size, height: size }, { style: "skeletal", color, font: theme.font, maxBond: bond, lineWidth: 1.8, atomColor });
}

function dotted(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, q: { x: number; y: number }, color: string) {
  const d = Math.hypot(q.x - p.x, q.y - p.y);
  if (d < 1) return;
  const ux = (q.x - p.x) / d;
  const uy = (q.y - p.y) / d;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(p.x + ux * 9, p.y + uy * 9);
  ctx.lineTo(q.x - ux * 9, q.y - uy * 9);
  ctx.stroke();
  ctx.restore();
}

interface FrameIndex {
  c: number;
  groups: number[];
  nu: number;
  leaving: number;
}

/** A mechanism frame as a molecule: only full bonds are bonds; partial ones are drawn dotted on top. */
export function frameMolecule(frame: HaloFrame, groups: readonly string[]): { mol: Molecule2D; index: FrameIndex } {
  const atoms: Atom2D[] = [{ el: "C", x: 0, y: 0, show: true, h: 0, charge: frame.charge }];
  const bonds: Bond2D[] = [];
  const at = (p: HaloVec) => haloProject(p);
  const groupIdx = frame.groups.map((g3, i) => {
    const p = at(g3);
    atoms.push({ el: "C", label: groups[i] ?? "H", x: p.x, y: p.y });
    bonds.push({ a: 0, b: atoms.length - 1, order: 1, stereo: stereoOf(g3.z) });
    return atoms.length - 1;
  });
  let nu = -1;
  if (frame.nu) {
    const p = at(frame.nu);
    atoms.push({ el: "O", label: "HO", x: p.x, y: p.y, charge: frame.nuBond === 0 ? -1 : 0, lonePairs: frame.nuBond === 0 ? 1 : 0 });
    nu = atoms.length - 1;
    if (frame.nuBond === 1) bonds.push({ a: 0, b: nu, order: 1 });
  }
  let leaving = -1;
  if (frame.leaving) {
    const p = at(frame.leaving);
    atoms.push({ el: "Br", x: p.x, y: p.y, h: 0, charge: frame.leavingBond === 0 ? -1 : 0 });
    leaving = atoms.length - 1;
    if (frame.leavingBond === 1) bonds.push({ a: 0, b: leaving, order: 1 });
  }
  return { mol: { atoms, bonds }, index: { c: 0, groups: groupIdx, nu, leaving } };
}

function drawFrame(ctx: CanvasRenderingContext2D, frame: HaloFrame, degree: number, ox: number, oy: number, bond: number, theme: LabTheme, arrows: boolean): MoleculePlacement {
  const { mol, index } = frameMolecule(frame, HALO_SUBSTRATES[degree]!.groups);
  const placed = drawAnchored(ctx, mol, index.c, ox, oy, bond, theme.neutral, theme, (i, atom) =>
    i === index.nu ? theme.sine : i === index.leaving ? theme.cosine : atom.charge && i === index.c ? theme.angle : undefined,
  );
  if (index.nu >= 0 && frame.nuBond === 0.5) {
    dotted(ctx, placed.point(index.c), placed.point(index.nu), theme.sine);
    label(ctx, "δ−", placed.point(index.nu).x, placed.point(index.nu).y - 16, { color: theme.sine, font: theme.font, align: "center" });
  }
  if (index.leaving >= 0 && frame.leavingBond === 0.5) {
    dotted(ctx, placed.point(index.c), placed.point(index.leaving), theme.cosine);
    label(ctx, "δ−", placed.point(index.leaving).x, placed.point(index.leaving).y - 16, { color: theme.cosine, font: theme.font, align: "center" });
  }
  if (arrows) {
    if (index.nu >= 0 && frame.nuBond === 0) drawCurlyArrow(ctx, placed, { lonePair: index.nu }, { atom: index.c }, { color: theme.sine, bend: -1 });
    if (index.leaving >= 0 && frame.leavingBond === 1) drawCurlyArrow(ctx, placed, { bond: [index.c, index.leaving] }, { atom: index.leaving }, { color: theme.cosine, bend: 1 });
  }
  return placed;
}

// ── The C–X bond ─────────────────────────────────────────────────────────────

/** Where a bond length (pm) lands on the ruler. */
export function bondLengthX(l: HaloLayout, pm: number): number {
  return l.left + 40 + (clamp(pm, 0, 250) / 250) * (colWidth(l) - 52);
}

function drawBond(ctx: CanvasRenderingContext2D, l: HaloLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const h = clamp(Math.round(num(results.halogen)), 0, 3);
  const bond = HALO_BONDS[h]!;
  const x = centreX(l);
  label(ctx, `${bond.formula}: the carbon–halogen bond`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });

  const mol = chainMolecule({ atoms: ["C", bond.symbol] });
  mol.atoms[0] = { ...mol.atoms[0]!, x: 0, y: 0, show: true };
  mol.atoms[1] = { ...mol.atoms[1]!, x: 1, y: 0 };
  const placed = drawAnchored(ctx, mol, 0, x - 26, 58, 52, theme.neutral, theme, (i) => (i === 1 ? theme.cosine : undefined));
  const c = placed.point(0);
  const xp = placed.point(1);
  label(ctx, "δ+", c.x, c.y - 18, { color: theme.sine, font: theme.font, align: "center" });
  label(ctx, "δ−", xp.x, xp.y - 18, { color: theme.cosine, font: theme.font, align: "center" });
  arrow(ctx, c.x + 6, c.y + 16, xp.x - 6, xp.y + 16, { color: theme.cosine, width: 1.5, head: 7 });
  label(ctx, `electrons pulled to ${bond.symbol}`, x, 92, { color: theme.muted, font: theme.font, align: "center" });

  // Bond lengths, to scale.
  const top = 118;
  label(ctx, "C–X bond length", l.left, top, { color: theme.text, font: theme.fontStrong });
  const rowY = (k: number, start: number) => start + 18 + k * 17;
  HALO_BONDS.forEach((b, k) => {
    const y = rowY(k, top);
    const on = k === h;
    label(ctx, `C–${b.symbol}`, l.left, y, { color: on ? theme.cosine : theme.muted, font: on ? theme.fontStrong : theme.font });
    ctx.save();
    ctx.fillStyle = on ? theme.cosine : theme.reference;
    ctx.globalAlpha = on ? 0.9 : 0.5;
    ctx.fillRect(bondLengthX(l, 0), y - 5, bondLengthX(l, b.length) - bondLengthX(l, 0), 10);
    ctx.restore();
    if (words) label(ctx, `${b.length} pm`, bondLengthX(l, b.length) + 4, y, { color: on ? theme.text : theme.muted, font: theme.font, align: b.length > 200 ? "right" : "left" });
  });
  const rulerY = rowY(4, top) - 4;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.beginPath();
  ctx.moveTo(bondLengthX(l, 0), rulerY);
  ctx.lineTo(bondLengthX(l, 250), rulerY);
  for (let pm = 0; pm <= 250; pm += 10) {
    ctx.moveTo(bondLengthX(l, pm), rulerY);
    ctx.lineTo(bondLengthX(l, pm), rulerY + (pm % 50 === 0 ? 6 : 3));
  }
  ctx.stroke();
  ctx.restore();
  for (let pm = 0; pm <= 250; pm += 50) label(ctx, String(pm), bondLengthX(l, pm), rulerY + 14, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "pm", l.left, rulerY + 14, { color: theme.muted, font: theme.font });

  // Bond enthalpies.
  const top2 = 238;
  label(ctx, "C–X bond enthalpy", l.left, top2, { color: theme.text, font: theme.fontStrong });
  const eX = (kj: number) => l.left + 40 + (clamp(kj, 0, 500) / 500) * (colWidth(l) - 52);
  HALO_BONDS.forEach((b, k) => {
    const y = rowY(k, top2);
    const on = k === h;
    label(ctx, `C–${b.symbol}`, l.left, y, { color: on ? theme.angle : theme.muted, font: on ? theme.fontStrong : theme.font });
    ctx.save();
    ctx.fillStyle = on ? theme.angle : theme.reference;
    ctx.globalAlpha = on ? 0.9 : 0.5;
    ctx.fillRect(eX(0), y - 5, eX(b.enthalpy) - eX(0), 10);
    ctx.restore();
    if (words) label(ctx, `${b.enthalpy} kJ/mol`, eX(b.enthalpy) + 4, y, { color: on ? theme.text : theme.muted, font: theme.font, align: b.enthalpy > 350 ? "right" : "left" });
  });

  if (words) {
    label(ctx, `μ(${bond.formula}) = ${bond.dipole.toFixed(3)} D · b.p. ${bond.boilingPoint.toFixed(1)} °C`, x, l.height - 34, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, "Reactivity: R–I > R–Br > R–Cl > R–F", x, l.height - 14, { color: theme.angle, font: theme.font, align: "center" });
  } else {
    label(ctx, "Longer bond, weaker bond?", x, l.height - 14, { color: theme.muted, font: theme.font, align: "center" });
  }
}

// ── SN2 and SN1 ──────────────────────────────────────────────────────────────

const SN2_CAPTIONS = ["OH⁻ comes in from the back, opposite Br", "Transition state: C half-bonded to both", "Inverted, like an umbrella in the wind"];
const SN1_CAPTIONS = ["Step 1 (slow): the C–Br bond ionises", "A flat carbocation: sp², empty p orbital", "Step 2 (fast): OH⁻ attacks either face"];

/** "30", "0.02", "1 200 000", or "≈ 0". */
export function haloRateText(v: number): string {
  if (!Number.isFinite(v) || v <= 0) return "≈ 0";
  if (v >= 1000) return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return String(Number(v.toPrecision(2)));
}

function drawSn2(ctx: CanvasRenderingContext2D, l: HaloLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const degree = clamp(Math.round(num(results.degree)), 0, 3);
  const sub = HALO_SUBSTRATES[degree]!;
  const progress = clamp(num(results.progress), 0, 1);
  const x = centreX(l);
  label(ctx, `SN2: ${sub.formula} + OH⁻ (${HALO_DEGREES[degree]})`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const frame = haloSn2Frame(progress, degree);
  const bond = Math.min(34, (colWidth(l) - 56) / 6.8);
  drawFrame(ctx, frame, degree, x, 140, bond, theme, true);
  const blocked = num(results.sn2Blocked) === 1;
  const stage = clamp(Math.round(num(results.sn2Stage)), 0, 2);
  const caption = blocked ? "Blocked: three CH₃ groups shield the back of C" : SN2_CAPTIONS[stage]!;
  label(ctx, caption, x, 236, { color: blocked ? theme.secant : theme.text, font: theme.font, align: "center" });
  if (stage === 1 && !blocked) label(ctx, "three groups flat, OH and Br in a line", x, 254, { color: theme.muted, font: theme.font, align: "center" });

  label(ctx, "rate = k[RX][OH⁻]: one step, both collide", x, 286, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `[RX] ${num(results.rx).toFixed(2)} M · [OH⁻] ${num(results.nu).toFixed(2)} M`, x, 306, { color: theme.muted, font: theme.font, align: "center" });
  if (words) {
    label(ctx, `rate × ${num(results.sn2RateFactor).toFixed(2)} (vs 0.10 M each) · rough rel. rate ${haloRateText(sub.sn2)}`, x, 326, { color: theme.angle, font: theme.font, align: "center" });
    if (num(results.configBefore) > 0) {
      const before = HALO_CONFIGS[num(results.configBefore)] ?? "";
      const after = HALO_CONFIGS[num(results.configAfter)] ?? "";
      label(ctx, `(${before})-2-bromobutane → (${after})-butan-2-ol: inversion`, x, 346, { color: theme.tangent, font: theme.font, align: "center" });
    }
    label(ctx, "SN2 order: CH₃X > 1° > 2° > 3° (crowding)", x, l.height - 12, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawSn1(ctx: CanvasRenderingContext2D, l: HaloLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const degree = clamp(Math.round(num(results.degree)), 0, 3);
  const sub = HALO_SUBSTRATES[degree]!;
  const progress = clamp(num(results.progress), 0, 1);
  const x = centreX(l);
  label(ctx, `SN1: ${sub.formula} + OH⁻ (${HALO_DEGREES[degree]})`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const frames = haloSn1Frames(progress);
  if (frames.length === 1) {
    const bond = Math.min(34, (colWidth(l) - 56) / 6.8);
    drawFrame(ctx, frames[0]!, degree, x - 30, 140, bond, theme, true);
  } else {
    const half = colWidth(l) / 2;
    const bond = Math.min(30, (half - 40) / 4.4);
    frames.forEach((f, k) => {
      const ox = l.left + half * k + half / 2 + (k === 0 ? bond * 1.1 : -bond * 1.1);
      drawFrame(ctx, f, degree, ox, 140, bond, theme, true);
      label(ctx, k === 0 ? "from the back" : "from the front", l.left + half * k + half / 2, 206, { color: theme.muted, font: theme.font, align: "center" });
      if (words) label(ctx, k === 0 ? "inversion · 50%" : "retention · 50%", l.left + half * k + half / 2, 222, { color: theme.tangent, font: theme.font, align: "center" });
    });
  }
  const stage = clamp(Math.round(num(results.sn1Stage)), 0, 2);
  label(ctx, SN1_CAPTIONS[stage]!, x, 244, { color: theme.text, font: theme.font, align: "center" });
  if (degree <= 1) {
    const which = degree === 0 ? "CH₃⁺ is far too unstable: CH₃Br does not go SN1" : "A 1° cation barely forms: 1° halides go SN2";
    label(ctx, which, x, 262, { color: theme.secant, font: theme.font, align: "center" });
  }

  label(ctx, "rate = k[RX]: only the slow step counts", x, 286, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `[RX] ${num(results.rx).toFixed(2)} M · [OH⁻] ${num(results.nu).toFixed(2)} M`, x, 306, { color: theme.muted, font: theme.font, align: "center" });
  if (words) {
    label(ctx, `rate × ${num(results.sn1RateFactor).toFixed(2)} (vs 0.10 M) · rough rel. rate ${haloRateText(sub.sn1)}`, x, 326, { color: theme.angle, font: theme.font, align: "center" });
    if (degree === 2) label(ctx, "(R) + (S)-butan-2-ol, 50 : 50 — racemic", x, 346, { color: theme.tangent, font: theme.font, align: "center" });
    label(ctx, "SN1 order: 3° > 2° > 1° > CH₃X (cation stability)", x, l.height - 12, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── The chooser ──────────────────────────────────────────────────────────────

const CHOOSER_SKETCHES = [{ atoms: ["C", "Br"] }, HALO_ELIMINATION_SUBSTRATES[0]!.sketch, HALO_ELIMINATION_SUBSTRATES[3]!.sketch, HALO_ELIMINATION_SUBSTRATES[6]!.sketch];
const CROWDING = ["back side wide open", "back side open", "back side partly crowded", "back side blocked"];
const CATION = ["CH₃⁺: very unstable", "1° cation: unstable", "2° cation: fairly stable", "3° cation: stable"];

/** The one-line reason for the chooser's verdict. */
export function haloChooserReason(degree: number, pathway: number): string {
  if (pathway === 2) return "2°: neither path wins outright — a mixture";
  if (pathway === 1) return degree === 3 ? "Back side blocked; the 3° cation is stable" : "Weak Nu, protic solvent steadies the ions";
  return degree <= 1 ? "Open back side; the cation would be too unstable" : "Strong Nu⁻ in an aprotic solvent: one step wins";
}

function drawChooser(ctx: CanvasRenderingContext2D, l: HaloLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const degree = clamp(Math.round(num(results.degree)), 0, 3);
  const sub = HALO_SUBSTRATES[degree]!;
  const x = centreX(l);
  label(ctx, `${sub.formula} (${HALO_DEGREES[degree]}) — SN1 or SN2?`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const mol = chainMolecule(CHOOSER_SKETCHES[degree]!);
  drawMolecule(ctx, mol, boxOf(l, 30, 120), {
    style: degree === 0 ? "condensed" : "skeletal",
    color: theme.neutral,
    font: theme.font,
    maxBond: 34,
    lineWidth: 1.8,
    atomColor: (_, atom) => (atom.el === "Br" ? theme.cosine : undefined),
  });
  const strong = num(results.nucleophile) === 1;
  const protic = num(results.solvent) === 1;
  const rows: [string, string, string][] = [
    ["Substrate", `${CROWDING[degree]}; ${CATION[degree]}`, theme.neutral],
    ["Nucleophile", strong ? "OH⁻ — strong, charged" : "H₂O — weak, neutral", theme.sine],
    ["Solvent", protic ? "water/ethanol — polar protic" : "acetone — polar aprotic", theme.tangent],
  ];
  rows.forEach(([head, text, colour], k) => {
    const y = 146 + k * 36;
    label(ctx, head, l.left, y, { color: colour, font: theme.fontStrong });
    label(ctx, text, l.left, y + 16, { color: theme.text, font: theme.font });
  });
  const pathway = clamp(Math.round(num(results.pathway)), 0, 2);
  if (words) {
    label(ctx, `Mechanism: ${HALO_PATHWAYS[pathway]}`, x, 276, { color: theme.angle, font: theme.fontStrong, align: "center" });
    label(ctx, haloChooserReason(degree, pathway), x, 296, { color: theme.text, font: theme.font, align: "center" });
    if (num(results.eliminationRisk) === 1) label(ctx, "Strong base on a 2°/3° halide: elimination competes", x, 316, { color: theme.secant, font: theme.font, align: "center" });
  } else {
    label(ctx, "Mechanism: ?", x, 276, { color: theme.muted, font: theme.fontStrong, align: "center" });
  }
  label(ctx, "Protic solvents steady ions; aprotic ones free Nu⁻", x, l.height - 14, { color: theme.muted, font: theme.font, align: "center" });
}

// ── Elimination ──────────────────────────────────────────────────────────────

function drawElimination(ctx: CanvasRenderingContext2D, l: HaloLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const sub = haloEliminationSubstrate(num(results.substrate));
  const r = haloEliminate(sub);
  const x = centreX(l);
  label(ctx, `${sub.name}, ${sub.formula}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const mol = chainMolecule(sub.sketch);
  const placed = drawMolecule(ctx, mol, boxOf(l, 28, 112), {
    style: mol.atoms.length <= 3 ? "condensed" : "skeletal",
    color: theme.neutral,
    font: theme.font,
    maxBond: 34,
    lineWidth: 1.8,
    atomColor: (_, atom) => (atom.el === "Br" ? theme.cosine : undefined),
  });
  if (mol.atoms.length > 3) {
    const mark = (i: number, text: string, colour: string) => {
      const p = placed.point(i);
      const below = p.y <= placed.centre.y;
      label(ctx, text, p.x, p.y + (below ? -12 : 12), { color: colour, font: theme.fontStrong, align: "center" });
    };
    mark(r.alpha, "α", theme.angle);
    for (const b of r.beta) mark(b, "β", theme.tangent);
  }

  const alcoholic = num(results.reagent) === 1;
  const reagent = alcoholic ? "alcoholic KOH, heat: β-H and Br⁻ leave" : "aqueous KOH: OH⁻ takes Br's place";
  arrow(ctx, x, 120, x, 146, { color: alcoholic ? theme.tangent : theme.sine, width: 2, head: 8 });
  label(ctx, reagent, x, 160, { color: alcoholic ? theme.tangent : theme.sine, font: theme.font, align: "center" });

  const products = alcoholic ? r.alkenes.map((a) => ({ name: a.shortName, sketch: a.sketch, tag: "" })) : [{ name: r.alcohol.name, sketch: r.alcohol.sketch, tag: "" }];
  const n = products.length;
  const w = colWidth(l) / n;
  products.forEach((p, k) => {
    const m = chainMolecule(p.sketch);
    drawMolecule(ctx, m, boxOf(l, 176, 270, l.left + w * k, l.left + w * (k + 1)), {
      style: m.atoms.length <= 3 ? "condensed" : "skeletal",
      color: k === 0 ? theme.neutral : theme.muted,
      font: theme.font,
      maxBond: 32,
      lineWidth: 1.8,
      atomColor: (_, atom) => (atom.el === "O" ? theme.sine : undefined),
    });
    const cx = l.left + w * (k + 0.5);
    if (words) {
      label(ctx, p.name, cx, 282, { color: theme.text, font: theme.font, align: "center" });
      if (n > 1) {
        const pct = sub.majorPercent > 0 ? ` ${k === 0 ? sub.majorPercent : 100 - sub.majorPercent}%` : "";
        label(ctx, `${k === 0 ? "major" : "minor"}${pct}`, cx, 300, { color: k === 0 ? theme.angle : theme.muted, font: theme.font, align: "center" });
      }
    }
  });
  if (words && alcoholic) {
    if (n > 1) label(ctx, "Saytzeff: more alkyl groups on C=C, the major one", x, 326, { color: theme.angle, font: theme.font, align: "center" });
    if (r.alkenes[0]?.cisTrans) label(ctx, `${r.alkenes[0].shortName}: mostly the trans form`, x, 344, { color: theme.muted, font: theme.font, align: "center" });
  }
  const tendency = ["", "1°: substitution usually wins", "2°: substitution and elimination compete", "3°: elimination wins with a strong base"][sub.degree] ?? "";
  if (words) label(ctx, tendency, x, l.height - 12, { color: theme.text, font: theme.font, align: "center" });
}

// ── Chirality ────────────────────────────────────────────────────────────────

/** A tetrahedral carbon with four labelled groups at the given directions. */
export function tetrahedralMolecule(groups: readonly string[], positions: readonly HaloVec[]): Molecule2D {
  const atoms: Atom2D[] = [{ el: "C", x: 0, y: 0, show: true, h: 0 }];
  const bonds: Bond2D[] = [];
  positions.forEach((g3, i) => {
    const p = haloOblique(g3);
    atoms.push({ el: "C", label: groups[i] ?? "H", x: p.x, y: p.y });
    bonds.push({ a: 0, b: i + 1, order: 1, stereo: stereoOf(g3.z) });
  });
  return { atoms, bonds };
}

function drawMirror(ctx: CanvasRenderingContext2D, l: HaloLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const molecule = haloChiralMolecule(num(results.molecule));
  const turn = clamp(num(results.turn), 0, 360);
  const x = centreX(l);
  label(ctx, `${molecule.name}, ${molecule.formula}`, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const quarter = colWidth(l) / 4;
  const bond = Math.min(40, (quarter * 2 - 70) / 1.7);
  const groupColour = (g: string) => (g === "Br" ? theme.cosine : g === "OH" ? theme.sine : g === "H" ? theme.muted : g === "C₂H₅" ? theme.tangent : theme.neutral);
  const a = tetrahedralMolecule(molecule.groups, HALO_TETRAHEDRON);
  const b = tetrahedralMolecule(molecule.groups, haloMirrorPositions(turn));
  const colourOf = (mol: Molecule2D) => (i: number) => (i === 0 ? undefined : groupColour(mol.atoms[i]!.label ?? ""));
  drawAnchored(ctx, a, 0, l.left + quarter, 112, bond, theme.neutral, theme, colourOf(a));
  drawAnchored(ctx, b, 0, l.right - quarter, 112, bond, theme.neutral, theme, colourOf(b));
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, 40);
  ctx.lineTo(x, 190);
  ctx.stroke();
  ctx.restore();
  label(ctx, "mirror", x, 200, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "A", l.left + quarter, 48, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, `B, turned ${Math.round(turn)}°`, l.right - quarter, 48, { color: theme.text, font: theme.fontStrong, align: "center" });

  const chiral = num(results.chiral) === 1;
  if (words) {
    const fits = num(results.superimposes) === 1;
    label(ctx, fits ? "B fits on A: the same molecule" : "B does not fit on A at this turn", x, 220, { color: fits ? theme.tangent : theme.secant, font: theme.font, align: "center" });
    const verdict = chiral ? `Chiral: four different groups — (${HALO_CONFIGS[num(results.configA)]}) and (${HALO_CONFIGS[num(results.configB)]})` : "Achiral: two groups the same";
    label(ctx, verdict, x, 238, { color: theme.angle, font: theme.font, align: "center" });
  }

  // The polarimeter: a sample with (+) and (−) in some proportion.
  const plus = clamp(num(results.plus), 0, 100);
  const top = 262;
  const barL = l.left + 4;
  const barR = l.right - 4;
  const split = barL + ((barR - barL) * plus) / 100;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = theme.sine;
  ctx.fillRect(barL, top, split - barL, 12);
  ctx.fillStyle = theme.cosine;
  ctx.fillRect(split, top, barR - split, 12);
  ctx.restore();
  label(ctx, `(+) ${Math.round(plus)}%`, barL, top + 26, { color: theme.sine, font: theme.font });
  label(ctx, `(−) ${Math.round(100 - plus)}%`, barR, top + 26, { color: theme.cosine, font: theme.font, align: "right" });
  if (chiral) {
    label(ctx, `pure (+)-${molecule.name}: [α] = +${molecule.rotationS.toFixed(1)}°`, x, top + 48, { color: theme.text, font: theme.font, align: "center" });
    if (words) {
      const rot = num(results.mixtureRotation);
      const sign = rot > 0 ? "+" : rot < 0 ? "−" : "";
      const note = Math.abs(rot) < 1e-9 ? " — racemic" : "";
      label(ctx, `this mixture: ${sign}${Math.abs(rot).toFixed(2)}°${note}`, x, top + 68, { color: theme.angle, font: theme.fontStrong, align: "center" });
    }
  } else if (words) {
    label(ctx, "Achiral: no rotation of plane-polarised light", x, top + 48, { color: theme.muted, font: theme.font, align: "center" });
  }
  label(ctx, "Turn B; slide the (+) share", x, l.height - 12, { color: theme.muted, font: theme.font, align: "center" });
}

// ── Haloarenes ───────────────────────────────────────────────────────────────

/** A benzene ring (Kekulé), C1 at the top, numbered clockwise, with groups on it. */
export function ringMolecule(substituents: readonly { at: number; el: string; label?: string }[]): Molecule2D {
  const atoms: Atom2D[] = [];
  const bonds: Bond2D[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + 60 * i) * Math.PI) / 180;
    atoms.push({ el: "C", x: Math.cos(a) || 0, y: Math.sin(a) || 0 });
  }
  for (let i = 0; i < 6; i++) bonds.push({ a: i, b: (i + 1) % 6, order: i % 2 === 0 ? 2 : 1 });
  for (const s of substituents) {
    const a = ((-90 + 60 * (s.at - 1)) * Math.PI) / 180;
    atoms.push({ el: s.el, x: 2 * Math.cos(a) || 0, y: 2 * Math.sin(a) || 0, ...(s.label ? { label: s.label } : {}) });
    bonds.push({ a: s.at - 1, b: atoms.length - 1, order: 1 });
  }
  return { atoms, bonds };
}

const ringColour = (theme: LabTheme) => (_: number, atom: Atom2D) => (atom.el === "Cl" ? theme.cosine : atom.el === "N" ? theme.secant : atom.el === "O" ? theme.sine : atom.label ? theme.tangent : undefined);

function drawArene(ctx: CanvasRenderingContext2D, l: HaloLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const arene = haloArene(num(results.arene));
  const x = centreX(l);
  label(ctx, arene.name, x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const mol = ringMolecule([{ at: 1, el: "Cl" }, ...arene.nitro.map((at) => ({ at, el: "N", label: "NO₂" }))]);
  drawMolecule(ctx, mol, boxOf(l, 28, 196), { style: "skeletal", color: theme.neutral, font: theme.font, maxBond: 30, lineWidth: 1.8, atomColor: ringColour(theme) });
  label(ctx, words ? arene.conditions : "NaOH: how hot must it be?", x, 214, { color: words ? theme.angle : theme.muted, font: theme.font, align: "center" });
  if (words) label(ctx, `→ ${arene.product}`, x, 232, { color: theme.text, font: theme.font, align: "center" });
  const opn = num(results.opNitro);
  label(ctx, `–NO₂ at ortho/para: ${opn}`, x, 254, { color: theme.secant, font: theme.font, align: "center" });
  if (words) {
    const lines = [
      `C–Cl: ${HALO_ARYL_C_CL} pm here, ${HALO_BONDS[1]!.length} pm in CH₃Cl — partly double`,
      "Cl's lone pair joins the ring (resonance); C is sp²",
      "No SN1: the phenyl cation is too unstable",
      "No SN2: the ring blocks attack from the back",
      "o/p –NO₂ takes the negative charge: easier",
    ];
    lines.forEach((t, k) => label(ctx, t, x, 278 + k * 19, { color: theme.text, font: theme.font, align: "center" }));
  } else {
    label(ctx, "Why does Cl hold on so tightly here?", x, 280, { color: theme.muted, font: theme.font, align: "center" });
  }
}

/** Break a long chemical name in two, as evenly as possible: at a space, before a locant, or after "benzene". */
export function haloWrapName(name: string): [string, string] {
  let best: [string, string] = [name, ""];
  let worst = Infinity;
  for (let i = 1; i < name.length; i++) {
    let cut: [string, string] | null = null;
    if (name[i] === " ") cut = [name.slice(0, i), name.slice(i + 1)];
    else if (name[i - 1] === "-" && /[0-9]/.test(name[i]!)) cut = [name.slice(0, i), name.slice(i)];
    else if (name.slice(0, i).endsWith("benzene")) cut = [`${name.slice(0, i)}-`, name.slice(i)];
    if (cut && Math.max(cut[0].length, cut[1].length) < worst) {
      worst = Math.max(cut[0].length, cut[1].length);
      best = cut;
    }
  }
  return best;
}

function drawEas(ctx: CanvasRenderingContext2D, l: HaloLayout, input: RenderInput) {
  const { theme, results, layers } = input;
  const words = layers.has("labels");
  const e = haloElectrophile(num(results.electrophile));
  const x = centreX(l);
  label(ctx, "Chlorobenzene: electrophilic substitution", x, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  const ring = ringMolecule([{ at: 1, el: "Cl" }]);
  const placed = drawMolecule(ctx, ring, boxOf(l, 26, 136), { style: "skeletal", color: theme.neutral, font: theme.font, maxBond: 24, lineWidth: 1.8, atomColor: ringColour(theme) });
  // Resonance puts extra electron density at 2, 4 and 6.
  for (const i of [1, 3, 5]) {
    const p = placed.point(i);
    const dx = p.x - placed.centre.x;
    const dy = p.y - placed.centre.y;
    const d = Math.hypot(dx, dy) || 1;
    label(ctx, "δ−", p.x + (dx / d) * 14, p.y + (dy / d) * 12, { color: theme.sine, font: theme.font, align: "center" });
  }
  label(ctx, `+ ${e.reagent}`, x, 150, { color: theme.angle, font: theme.font, align: "center" });
  label(ctx, `E⁺ brings ${e.group} to the ring`, x, 168, { color: theme.muted, font: theme.font, align: "center" });

  const half = colWidth(l) / 2;
  const group = (at: number) => ({ at, el: "C", label: e.group });
  [ringMolecule([{ at: 1, el: "Cl" }, group(2)]), ringMolecule([{ at: 1, el: "Cl" }, group(4)])].forEach((m, k) => {
    drawMolecule(ctx, m, boxOf(l, 184, 300, l.left + half * k, l.left + half * (k + 1)), { style: "skeletal", color: theme.neutral, font: theme.font, maxBond: 20, lineWidth: 1.6, atomColor: ringColour(theme) });
    const cx = l.left + half * (k + 0.5);
    label(ctx, k === 0 ? "ortho (2-)" : "para (4-)", cx, 310, { color: theme.text, font: theme.font, align: "center" });
    if (words) {
      const name = k === 0 ? e.ortho : e.para;
      const lines = name.length * 6.5 <= half - 6 ? [name] : haloWrapName(name);
      lines.forEach((t, i) => label(ctx, t, cx, 326 + i * 14, { color: theme.text, font: theme.font, align: "center" }));
      label(ctx, k === 0 ? "minor" : "major", cx, 326 + lines.length * 14 + 2, { color: k === 0 ? theme.muted : theme.angle, font: theme.font, align: "center" });
    }
  });
  if (words) label(ctx, "Cl: −I deactivates, +R directs ortho/para", x, l.height - 12, { color: theme.text, font: theme.font, align: "center" });
}

export const haloRenderer: SimulationRenderer<HaloLayout> = {
  id: "halo",
  layout: (width) => computeHaloLayout(width),

  draw(ctx, layout, input) {
    ctx.clearRect(0, 0, layout.width, layout.height);
    const has = (layer: string) => input.layers.has(layer);
    if (has("sn2")) drawSn2(ctx, layout, input);
    else if (has("sn1")) drawSn1(ctx, layout, input);
    else if (has("chooser")) drawChooser(ctx, layout, input);
    else if (has("elimination")) drawElimination(ctx, layout, input);
    else if (has("mirror")) drawMirror(ctx, layout, input);
    else if (has("arene")) drawArene(ctx, layout, input);
    else if (has("eas")) drawEas(ctx, layout, input);
    else if (has("bond")) drawBond(ctx, layout, input);
  },
};
