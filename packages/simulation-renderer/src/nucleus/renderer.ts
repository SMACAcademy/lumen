/**
 * Nuclei, in six pictures.
 *
 * Nucleus: protons and neutrons packed into a sphere of radius R₀A^⅓, drawn
 * to one scale for every nuclide; with "size", its radius and its density set
 * against water and iron on a log scale; with "defect", the mass of the parts
 * apart beside the mass of the atom, the gap magnified.
 *
 * Curve: binding energy per nucleon against A — the real nuclides as dots,
 * the semi-empirical model dashed, a marker to slide along the model, and
 * arrows for fission and fusion climbing towards the peak.
 *
 * Decay: 400 atoms going one by one, beside N = N₀e^(−λt) with its half-lives
 * marked. Emission: a parent, what it emits, and the daughter. Reaction: what
 * goes in and comes out of fission or fusion, and the mass that goes missing.
 * Chain: the fissions in each generation, kⁿ.
 */

import {
  NUC_DECAY_KINDS,
  NUC_EVERYDAY_DENSITIES,
  NUC_GRID,
  NUC_MAX_TIME,
  NUC_NUCLIDE_ORDER,
  NUC_NUCLIDES,
  NUC_PARENT_ORDER,
  NUC_PARENTS,
  NUC_REACTION_ORDER,
  NUC_REACTIONS,
  NUC_SAMPLE,
  NUC_SYMBOLS,
  nucBindingEnergy,
  nucModelPerNucleon,
  nucRadius,
  nucSurvives,
} from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface NucleusLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The upper picture (a nucleus, a decay, a reaction) and the panel under it. */
  top: Box;
  bottom: Box;
  /** The binding-energy curve. */
  plot: Box;
  /** The sample of atoms, and the graph of N against t. */
  grid: Box;
  graph: Box;
}

export function computeNucleusLayout(width: number): NucleusLayout {
  const compact = width < 560;
  const height = compact ? 390 : 400;
  const side = compact ? 156 : 230;
  return {
    width,
    height,
    compact,
    top: { x: 16, y: 28, width: width - 32, height: 176 },
    bottom: { x: 16, y: 222, width: width - 32, height: height - 222 - 44 },
    plot: { x: 44, y: 34, width: width - 44 - 16, height: height - 34 - 76 },
    grid: compact ? { x: (width - side) / 2, y: 28, width: side, height: side } : { x: 24, y: 44, width: side, height: side },
    graph: compact
      ? { x: 44, y: 214, width: width - 44 - 16, height: height - 214 - 62 }
      : { x: 24 + side + 56, y: 44, width: width - (24 + side + 56) - 16, height: side },
  };
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sup = (n: number) => String(Math.abs(Math.round(n))).split("").map((d) => SUP[Number(d)]).join("");
const sub = (n: number) => (n < 0 ? "₋" : "") + String(Math.abs(Math.round(n))).split("").map((d) => SUB[Number(d)]).join("");
const symbolOf = (Z: number) => NUC_SYMBOLS[Z] ?? "?";
/** ⁵⁶Fe */
export const nuclideName = (A: number, Z: number, excited = false) => `${sup(A)}${symbolOf(Z)}${excited ? "*" : ""}`;
/** ⁵⁶₂₆Fe */
const fullName = (A: number, Z: number, excited = false) => `${sup(A)}${sub(Z)}${symbolOf(Z)}${excited ? "*" : ""}`;

const fixed = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
/** 2.29 × 10¹⁷ */
export function scientific(v: number, digits = 2): string {
  if (!(v > 0)) return "0";
  let e = Math.floor(Math.log10(v));
  let mantissa = v / 10 ** e;
  if (Number(mantissa.toFixed(digits)) >= 10) {
    e += 1;
    mantissa /= 10;
  }
  return `${mantissa.toFixed(digits)} × 10${e < 0 ? "⁻" : ""}${sup(e)}`;
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, width = 1.5, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, colour: string, alpha = 0.75) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, Math.max(0, w), h);
  ctx.restore();
}

/**
 * A ball of A nucleons, Z of them protons, spread evenly through a disc of
 * radius r (a sunflower spiral) — the look of a nucleus, not its arrangement.
 */
function drawNucleons(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, A: number, Z: number, theme: LabTheme) {
  const n = Math.max(1, Math.round(A));
  const ball = Math.min(r, r * Math.sqrt(0.8 / n));
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const spread = n === 1 ? 0 : (r - ball) * Math.sqrt((i + 0.5) / n);
    const angle = i * golden;
    const proton = Math.floor(((i + 1) * Z) / n) > Math.floor((i * Z) / n);
    disc(ctx, cx + spread * Math.cos(angle), cy + spread * Math.sin(angle), ball * 0.95, proton ? theme.secant : theme.neutral, 0.9);
  }
}

/** The largest nucleus drawn, so every nuclide shares one scale. */
const R_MAX = nucRadius(240);

function drawNucleus(ctx: CanvasRenderingContext2D, layout: NucleusLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { top, width } = layout;
  const A = Math.round(num(results.massNumber, 56));
  const Z = Math.round(num(results.protons, 26));
  const N = A - Z;
  const R = num(results.radius, nucRadius(A));
  const maxPx = Math.min(top.height / 2 - 6, width / 2 - 92);
  const rPx = (maxPx * R) / R_MAX;
  const cx = width / 2;
  const cy = top.y + top.height / 2;
  label(ctx, `${nuclideName(A, Z)}: ${Z} proton${Z === 1 ? "" : "s"}, ${N} neutron${N === 1 ? "" : "s"}`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  drawNucleons(ctx, cx, cy, rPx, A, Z, theme);
  ring(ctx, cx, cy, rPx + 1, theme.axis, [3, 3]);
  // Key, bottom left of the picture.
  disc(ctx, top.x + 6, top.y + top.height - 18, 4, theme.secant);
  label(ctx, "proton", top.x + 14, top.y + top.height - 18, { color: theme.muted, font: theme.font });
  disc(ctx, top.x + 6, top.y + top.height - 4, 4, theme.neutral);
  label(ctx, "neutron", top.x + 14, top.y + top.height - 4, { color: theme.muted, font: theme.font });

  if (has("size")) {
    line(ctx, cx, cy, cx + rPx, cy, theme.angle, 2);
    label(ctx, "R", cx + rPx / 2, cy - 9, { color: theme.angle, font: theme.fontStrong, align: "center", background: theme.background });
    if (has("labels")) label(ctx, `R = ${fixed(R)} fm`, cx + maxPx + 8, cy, { color: theme.angle, font: theme.font });
    drawDensities(ctx, layout, num(results.density), theme, has("labels"));
    label(ctx, "R = R₀A^⅓: volume grows as A, so density is fixed", width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
  if (has("defect")) drawDefect(ctx, layout, results, theme, has("labels"));
}

/** Densities on a log scale: everyday matter, then a nucleus. */
function drawDensities(ctx: CanvasRenderingContext2D, layout: NucleusLayout, density: number, theme: LabTheme, words: boolean) {
  const { bottom } = layout;
  const rows = [...NUC_EVERYDAY_DENSITIES.map((d) => ({ ...d, colour: theme.sine })), { label: "nucleus", density, colour: theme.secant }];
  const left = bottom.x + 62;
  const span = bottom.width - 62 - 4;
  const top = 18;
  label(ctx, "density, log scale (each tick ×1000)", bottom.x, bottom.y + 4, { color: theme.muted, font: theme.font });
  for (let tick = 0; tick <= top; tick += 3) {
    const x = left + (span * tick) / top;
    line(ctx, x, bottom.y + 16, x, bottom.y + 16 + rows.length * 26, theme.grid, 1);
  }
  rows.forEach((row, i) => {
    const y = bottom.y + 20 + i * 26;
    bar(ctx, left, y, (span * Math.log10(Math.max(1, row.density))) / top, 16, row.colour);
    label(ctx, row.label, bottom.x, y + 8, { color: theme.text, font: theme.font });
    if (words) {
      const text = `${scientific(row.density, row.label === "nucleus" ? 2 : 1)} kg/m³`;
      const end = left + (span * Math.log10(Math.max(1, row.density))) / top;
      const inside = end - left > text.length * 6.5 + 12;
      label(ctx, text, inside ? end - 6 : end + 6, y + 8, { color: inside ? theme.background : theme.text, font: theme.font, align: inside ? "right" : "left" });
    }
  });
}

/** The parts apart and the atom, on a broken axis so the missing mass shows. */
function drawDefect(ctx: CanvasRenderingContext2D, layout: NucleusLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { bottom, width, height } = layout;
  const A = Math.round(num(results.massNumber, 56));
  const Z = Math.round(num(results.protons, 26));
  const parts = num(results.partsMass);
  const atom = num(results.atomicMass);
  const defect = num(results.massDefect);
  const left = bottom.x + 4;
  const span = bottom.width - 8;
  label(ctx, "mass (axis broken: the gap is magnified)", bottom.x, bottom.y + 4, { color: theme.muted, font: theme.font });
  // The axis starts below the atom's mass by twice the gap, so the gap is always a third of the longer bar.
  const full = defect > 1e-9 ? span : span * 0.66;
  const short = defect > 1e-9 ? (span * 2) / 3 : full;
  bar(ctx, left, bottom.y + 18, full, 20, theme.sine);
  bar(ctx, left, bottom.y + 50, short, 20, theme.secant);
  ctx.save();
  ctx.strokeStyle = theme.background;
  ctx.lineWidth = 3;
  for (const y of [bottom.y + 18, bottom.y + 50]) {
    ctx.beginPath();
    ctx.moveTo(left + 10, y - 2);
    ctx.lineTo(left + 4, y + 22);
    ctx.stroke();
  }
  ctx.restore();
  const apart = `${Z} p + ${A - Z} n apart`;
  const together = `${nuclideName(A, Z)} atom`;
  label(ctx, words ? `${apart}: ${parts.toFixed(6)} u` : apart, left + 16, bottom.y + 28, { color: theme.background, font: theme.fontStrong });
  label(ctx, words ? `${together}: ${atom.toFixed(6)} u` : together, left + 16, bottom.y + 60, { color: theme.background, font: theme.fontStrong });
  if (defect > 1e-9) {
    arrow(ctx, left + short + 2, bottom.y + 60, left + full - 2, bottom.y + 60, { color: theme.tangent, width: 2, head: 6, double: true });
    label(ctx, "Δm", left + (short + full) / 2, bottom.y + 82, { color: theme.tangent, font: theme.fontStrong, align: "center" });
  }
  if (words) {
    const sentence = defect > 1e-9
      ? `Δm = ${defect.toFixed(6)} u · Eb = ${num(results.bindingEnergy).toFixed(2)} MeV`
      : "one proton alone: nothing to bind, Δm = 0";
    label(ctx, sentence, width / 2, height - 30, { color: theme.text, font: theme.font, align: "center" });
    if (defect > 1e-9) label(ctx, `${num(results.bindingPerNucleon).toFixed(2)} MeV per nucleon`, width / 2, height - 12, { color: theme.tangent, font: theme.font, align: "center" });
  }
}

function drawCurve(ctx: CanvasRenderingContext2D, layout: NucleusLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { plot, width, height } = layout;
  const plane = createPlane(plot, [0, 240], [0, 10]);
  label(ctx, "Binding energy per nucleon", width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  drawPlane(ctx, plane, theme, { xLabel: "A", yLabel: "MeV per nucleon" });

  // The model, dashed, from A = 10 (it fails for the lightest few).
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  for (let A = 10; A <= 240; A += 2) {
    const [x, y] = plane.toPx(A, nucModelPerNucleon(A));
    if (A === 10) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  const point = (A: number) => {
    const n = NUC_NUCLIDES[A]!;
    return plane.toPx(A, nucBindingEnergy(n.Z, n.A, n.mass) / n.A);
  };

  if (has("reactions")) {
    const [ux, uy] = point(235);
    for (const A of [141, 92]) {
      const [x, y] = point(A);
      arrow(ctx, ux - 4, uy - 2, x + 6, y + 4, { color: theme.secant, width: 2, head: 7 });
    }
    label(ctx, "fission", (ux + point(141)[0]) / 2 + 8, uy + 16, { color: theme.secant, font: theme.fontStrong, align: "center" });
    const [hx, hy] = point(4);
    for (const A of [2, 3]) {
      const [x, y] = point(A);
      arrow(ctx, x, y - 4, hx, hy + 6, { color: theme.tangent, width: 2, head: 7 });
    }
    label(ctx, "fusion", point(3)[0] + 10, (hy + point(2)[1]) / 2 + 12, { color: theme.tangent, font: theme.fontStrong });
  }

  const chosen = Math.round(num(results.massNumber, 56));
  for (const A of NUC_NUCLIDE_ORDER) {
    const [x, y] = point(A);
    disc(ctx, x, y, A === chosen ? 5.5 : 3.5, A === chosen ? theme.angle : theme.text);
  }
  // A few names, placed clear of the curve.
  const named: [number, number, number, CanvasTextAlign][] = [[4, 8, -6, "left"], [56, 0, -14, "center"], [238, 0, -14, "right"], [2, 8, 0, "left"]];
  for (const [A, dx, dy, align] of named) {
    const n = NUC_NUCLIDES[A]!;
    const [x, y] = point(A);
    label(ctx, nuclideName(n.A, n.Z), x + dx, y + dy, { color: A === chosen ? theme.angle : theme.muted, font: theme.font, align });
  }

  const curveA = Math.round(num(results.curveA, 20));
  const model = num(results.curvePerNucleon);
  const [mx, my] = plane.toPx(curveA, model);
  line(ctx, mx, my, mx, plot.y + plot.height, theme.tangent, 1.5, [3, 3]);
  disc(ctx, mx, my, 6, theme.tangent);

  label(ctx, "dots: real nuclei · dashed: a model curve", width / 2, height - 32, { color: theme.muted, font: theme.font, align: "center" });
  if (has("labels")) {
    const n = NUC_NUCLIDES[chosen];
    const real = n ? ` · ${nuclideName(n.A, n.Z)} ${num(results.bindingPerNucleon).toFixed(2)}` : "";
    label(ctx, `model at A = ${curveA}: ${model.toFixed(2)} MeV${real}`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawDecay(ctx: CanvasRenderingContext2D, layout: NucleusLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { grid, graph, width, height } = layout;
  const fraction = num(results.fraction, 1);
  const halfLife = num(results.halfLife, 30);
  const t = num(results.t);
  const expected = num(results.expected);
  label(ctx, `${NUC_SAMPLE} atoms, half-life ${halfLife.toFixed(0)} s`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  if (has("grid")) {
    const cell = grid.width / NUC_GRID;
    for (let i = 0; i < NUC_SAMPLE; i++) {
      const x = grid.x + (i % NUC_GRID) * cell + cell / 2;
      const y = grid.y + Math.floor(i / NUC_GRID) * cell + cell / 2;
      if (nucSurvives(i, fraction)) disc(ctx, x, y, cell * 0.38, theme.sine);
      else disc(ctx, x, y, cell * 0.18, theme.muted, 0.45);
    }
  }

  if (has("law")) {
    const plane = createPlane(graph, [0, NUC_MAX_TIME], [0, NUC_SAMPLE]);
    drawPlane(ctx, plane, theme, { xLabel: "t / s", yLabel: "N" });
    for (let n = 1; n * halfLife <= NUC_MAX_TIME && n <= 4; n++) {
      const level = NUC_SAMPLE / 2 ** n;
      const [x, y] = plane.toPx(n * halfLife, level);
      line(ctx, graph.x, y, x, y, theme.angle, 1, [3, 3]);
      line(ctx, x, y, x, graph.y + graph.height, theme.angle, 1, [3, 3]);
      if (n === 1) label(ctx, "T½", x + 4, graph.y + graph.height - 10, { color: theme.angle, font: theme.font });
    }
    ctx.save();
    clipToPlane(ctx, plane);
    ctx.strokeStyle = theme.curve;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const time = (NUC_MAX_TIME * i) / 200;
      const [x, y] = plane.toPx(time, NUC_SAMPLE * 2 ** (-time / halfLife));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    const [px, py] = plane.toPx(t, expected);
    disc(ctx, px, py, 5, theme.text);
  }

  if (has("labels")) {
    label(ctx, `t = ${t.toFixed(0)} s = ${num(results.halfLivesGone).toFixed(2)} T½ · law N = ${expected.toFixed(1)}`, width / 2, height - 32, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `counted ${Math.round(num(results.counted))} · R = λN = ${num(results.activity).toFixed(2)} Bq`, width / 2, height - 14, { color: theme.sine, font: theme.font, align: "center" });
  }
}

const EMISSION: Record<string, { title: string; particle: string; symbol: string; colour: keyof LabTheme }> = {
  alpha: { title: "an α particle", particle: "⁴₂He", symbol: "α", colour: "angle" },
  "beta-minus": { title: "a β⁻ particle, an electron", particle: "⁰₋₁e + ν̄", symbol: "β⁻", colour: "sine" },
  "beta-plus": { title: "a β⁺ particle, a positron", particle: "⁰₊₁e + ν", symbol: "β⁺", colour: "cosine" },
  gamma: { title: "a γ ray", particle: "γ", symbol: "γ", colour: "vector" },
};

function drawEmission(ctx: CanvasRenderingContext2D, layout: NucleusLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { top, bottom, width, height } = layout;
  const p = NUC_PARENTS[NUC_PARENT_ORDER[Math.round(num(results.parent))] ?? "u238"];
  const kind = NUC_DECAY_KINDS[Math.round(num(results.decayKind))] ?? p.kind;
  const e = EMISSION[kind]!;
  const colour = theme[e.colour] as string;
  const excited = kind === "gamma";
  label(ctx, `${p.label} emits ${e.title}`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  const scale = Math.min(9, (0.56 * top.width - 70) / (2 * R_MAX));
  const cy = top.y + top.height / 2 + 6;
  const px = top.x + top.width * 0.22;
  const dx = top.x + top.width * 0.78;
  const pr = nucRadius(p.parent.A) * scale;
  const dr = nucRadius(p.daughter.A) * scale;
  drawNucleons(ctx, px, cy, pr, p.parent.A, p.parent.Z, theme);
  drawNucleons(ctx, dx, cy, dr, p.daughter.A, p.daughter.Z, theme);
  if (excited) ring(ctx, px, cy, pr + 4, colour, [2, 3]);
  arrow(ctx, px + pr + 8, cy, dx - dr - 8, cy, { color: theme.text, width: 2, head: 8 });
  // The emitted particle flies off upwards from the arrow.
  const mid = (px + pr + dx - dr) / 2;
  arrow(ctx, mid, cy - 6, mid + 26, cy - 48, { color: colour, width: 2, head: 7, dash: kind === "gamma" ? [4, 3] : undefined });
  label(ctx, e.symbol, mid + 32, cy - 54, { color: colour, font: theme.fontStrong });
  label(ctx, nuclideName(p.parent.A, p.parent.Z, excited), px, cy + pr + 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, nuclideName(p.daughter.A, p.daughter.Z), dx, cy + dr + 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  const equation = `${fullName(p.parent.A, p.parent.Z, excited)} → ${fullName(p.daughter.A, p.daughter.Z)} + ${e.particle}`;
  label(ctx, equation, width / 2, bottom.y + 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  const dA = Math.round(num(results.deltaA));
  const dZ = Math.round(num(results.deltaZ));
  const change = (v: number) => (v === 0 ? "unchanged" : v > 0 ? `up ${v}` : `down ${-v}`);
  label(ctx, `A: ${p.parent.A} → ${p.daughter.A} (${change(dA)})`, width / 2, bottom.y + 42, { color: theme.angle, font: theme.font, align: "center" });
  label(ctx, `Z: ${p.parent.Z} → ${p.daughter.Z} (${change(dZ)})`, width / 2, bottom.y + 62, { color: theme.secant, font: theme.font, align: "center" });
  if (has("labels")) label(ctx, `energy released Q = ${num(results.decayQ).toFixed(kind === "beta-minus" ? 3 : 2)} MeV`, width / 2, height - 14, { color: theme.tangent, font: theme.font, align: "center" });
}

/** Each nucleus of a reaction as a disc sized R₀A^⅓, with its name under it. */
const PIECES: Record<string, { before: [number, number][]; after: [number, number][]; extra?: string }> = {
  // [A, Z]; Z = 0 is a neutron.
  fission: { before: [[1, 0], [235, 92]], after: [[141, 56], [92, 36], [1, 0], [1, 0], [1, 0]] },
  dt: { before: [[2, 1], [3, 1]], after: [[4, 2], [1, 0]] },
  sun: { before: [[1, 1], [1, 1], [1, 1], [1, 1]], after: [[4, 2]], extra: "+ 2e⁺ + 2ν" },
};

function drawReaction(ctx: CanvasRenderingContext2D, layout: NucleusLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { top, bottom, width, height } = layout;
  const id = NUC_REACTION_ORDER[Math.round(num(results.reaction))] ?? "fission";
  const r = NUC_REACTIONS[id];
  const pieces = PIECES[id]!;
  label(ctx, r.label, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  const scale = id === "fission" ? Math.min(3.2, (top.width - 120) / 70) : Math.min(9, (top.width - 120) / 25);
  const cy = top.y + 70;
  const group = (items: [number, number][], x0: number) => {
    let x = x0;
    for (const [A, Z] of items) {
      const rad = Math.max(4, nucRadius(A) * scale);
      // Heavy nuclei are drawn with at most 60 balls here, to stay legible at this size.
      drawNucleons(ctx, x + rad, cy, rad, Math.min(A, 60), Math.max(Z === 0 ? 0 : 1, Math.round((Z * Math.min(A, 60)) / A)), theme);
      label(ctx, Z === 0 ? "n" : nuclideName(A, Z), x + rad, cy + Math.max(rad, 8) + 14, { color: theme.text, font: theme.font, align: "center" });
      x += 2 * rad + 6;
    }
    return x;
  };
  const before = group(pieces.before, top.x + 4);
  const arrowStart = before + 4;
  const after = group(pieces.after, arrowStart + 40);
  arrow(ctx, arrowStart, cy, arrowStart + 32, cy, { color: theme.text, width: 2, head: 8 });
  if (pieces.extra) label(ctx, pieces.extra, Math.min(after + 2, width - 16 - pieces.extra.length * 6.5), cy, { color: theme.muted, font: theme.font });
  label(ctx, r.equation, width / 2, top.y + top.height - 24, { color: theme.text, font: theme.fontStrong, align: "center" });

  // Mass in and mass out, on a broken axis.
  const left = bottom.x + 4;
  const span = bottom.width - 8;
  label(ctx, "mass (axis broken: the gap is magnified)", bottom.x, bottom.y - 6, { color: theme.muted, font: theme.font });
  bar(ctx, left, bottom.y + 6, span, 20, theme.sine);
  bar(ctx, left, bottom.y + 36, (span * 2) / 3, 20, theme.secant);
  const words = has("labels");
  label(ctx, words ? `in: ${num(results.massBefore).toFixed(6)} u` : "in", left + 8, bottom.y + 16, { color: theme.background, font: theme.fontStrong });
  label(ctx, words ? `out: ${num(results.massAfter).toFixed(6)} u` : "out", left + 8, bottom.y + 46, { color: theme.background, font: theme.fontStrong });
  arrow(ctx, left + (span * 2) / 3 + 2, bottom.y + 46, left + span - 2, bottom.y + 46, { color: theme.tangent, width: 2, head: 6, double: true });
  label(ctx, "Δm → energy", left + (span * 5) / 6, bottom.y + 68, { color: theme.tangent, font: theme.fontStrong, align: "center" });
  if (words) {
    label(ctx, `Δm = ${num(results.reactionDefect).toFixed(6)} u → Q = ${num(results.q).toFixed(2)} MeV`, width / 2, height - 30, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `${num(results.qPerNucleon).toFixed(2)} MeV per nucleon of fuel`, width / 2, height - 12, { color: theme.tangent, font: theme.font, align: "center" });
  }
}

function drawChain(ctx: CanvasRenderingContext2D, layout: NucleusLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { width, height } = layout;
  const k = num(results.k, 2);
  const g = Math.round(num(results.generation, 4));
  const kind = Math.round(num(results.chainKind));
  label(ctx, `A chain reaction, k = ${k.toFixed(1)}`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  const verdict = kind === 1 ? "critical: steady, as in a reactor" : kind === 2 ? "supercritical: it runs away" : "subcritical: it dies out";
  label(ctx, verdict, width / 2, 34, { color: kind === 1 ? theme.tangent : kind === 2 ? theme.secant : theme.sine, font: theme.fontStrong, align: "center" });
  const box = { x: 24, y: 56, width: width - 48, height: height - 56 - 96 };
  const counts = Array.from({ length: g + 1 }, (_, i) => k ** i);
  const most = Math.max(...counts);
  const slot = box.width / 11;
  counts.forEach((c, i) => {
    const h = Math.max(2, (box.height * c) / most);
    bar(ctx, box.x + i * slot + slot * 0.15, box.y + box.height - h, slot * 0.7, h, i === g ? theme.secant : theme.sine, i === g ? 0.9 : 0.6);
    label(ctx, String(i), box.x + i * slot + slot / 2, box.y + box.height + 10, { color: theme.muted, font: theme.font, align: "center" });
  });
  line(ctx, box.x, box.y + box.height, box.x + box.width, box.y + box.height, theme.axis, 1.25);
  label(ctx, "generation", width / 2, box.y + box.height + 28, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "bar height: fissions in that generation", width / 2, height - 32, { color: theme.muted, font: theme.font, align: "center" });
  if (has("labels")) {
    const count = num(results.chainFissions);
    const shown = count >= 100 ? count.toFixed(0) : count >= 1 ? count.toFixed(2) : count.toFixed(3);
    label(ctx, `generation ${g}: kⁿ = ${shown} fissions per first one`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

export const nucleusRenderer: SimulationRenderer<NucleusLayout> = {
  id: "nucleus",
  layout: (width) => computeNucleusLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);
    const r = results as Record<string, unknown>;
    if (has("nucleus")) drawNucleus(ctx, layout, r, theme, has);
    if (has("curve")) drawCurve(ctx, layout, r, theme, has);
    if (has("grid") || has("law")) drawDecay(ctx, layout, r, theme, has);
    if (has("emission")) drawEmission(ctx, layout, r, theme, has);
    if (has("reaction")) drawReaction(ctx, layout, r, theme, has);
    if (has("chain")) drawChain(ctx, layout, r, theme, has);
  },
};
