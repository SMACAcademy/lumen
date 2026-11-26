/**
 * Synthetic fibres and plastics (class 8).
 *
 * One canvas, four views, chosen by the mode's layers:
 *   chain    — one repeating unit (a small structure, or its formula) and a
 *              chain of beads, one bead a unit, like paper clips joined.
 *   fibres   — NCERT's thread test: a thread on a stand with a weight that
 *              grows with the load; past the breaking load the thread snaps.
 *   plastics — a strip of plastic across two supports over a hotplate, and a
 *              close-up of its chains: separate ones slide and the strip sags
 *              when it softens; cross-linked ones stay put.
 *   waste    — a pit in the soil with the buried waste, shrinking as it rots.
 * Answers (counts, breaking loads, NCERT times, properties) appear only with
 * "labels".
 */

import {
  POLYMER_FIBRE_ORDER,
  POLYMER_MAX_LOAD,
  POLYMER_ORDER,
  POLYMER_PLASTIC_ORDER,
  POLYMER_ROT_TIMES,
  POLYMER_SOURCES,
  POLYMER_WASTE_ORDER,
  type PolymerId,
  type PolymerWasteId,
  polymerFibre,
  polymerInfo,
  polymerPlastic,
  polymerWaste,
} from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import { chainMolecule, drawMolecule, type Molecule2D } from "../shared/molecule";
import type { RenderInput, SimulationRenderer } from "../types";

export interface PolymerSchoolLayout {
  width: number;
  height: number;
  /** The central column everything is drawn in. */
  left: number;
  right: number;
}

export function computePolymerSchoolLayout(width: number): PolymerSchoolLayout {
  const column = Math.min(width - 32, 520);
  const left = (width - column) / 2;
  return { width, height: 380, left, right: left + column };
}

const centreX = (l: PolymerSchoolLayout) => (l.left + l.right) / 2;
const pick = <T extends string>(order: readonly T[], index: unknown): T => order[clamp(Math.round(num(index)), 0, order.length - 1)]!;

interface Point {
  x: number;
  y: number;
}

function stroke(ctx: CanvasRenderingContext2D, colour: string, width: number, points: readonly Point[], close = false, dash: number[] = []) {
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

function fill(ctx: CanvasRenderingContext2D, colour: string, points: readonly Point[], alpha = 1) {
  if (points.length < 3) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const rect = (x: number, y: number, w: number, h: number): Point[] => [
  { x, y },
  { x: x + w, y },
  { x: x + w, y: y + h },
  { x, y: y + h },
];

const hexagon = (x: number, y: number, r: number): Point[] =>
  Array.from({ length: 6 }, (_, k) => ({ x: x + r * Math.cos((Math.PI / 3) * k), y: y + r * Math.sin((Math.PI / 3) * k) }));

// ── Chain view ───────────────────────────────────────────────────────────────

/** The repeat unit of polythene, PVC or acrylic, between brackets; null for the bigger units (drawn as a formula). */
export function polymerUnitMolecule(id: PolymerId): Molecule2D | null {
  const branches =
    id === "pvc" ? [{ at: 2, atoms: ["Cl"] }] : id === "acrylic" ? [{ at: 2, atoms: ["X"] }] : id === "polythene" ? [] : null;
  if (!branches) return null;
  const mol = chainMolecule({ atoms: ["X", "C", "C", "X"], branches });
  mol.atoms[0] = { ...mol.atoms[0]!, label: "[" };
  mol.atoms[3] = { ...mol.atoms[3]!, label: "]ₙ" };
  if (id === "acrylic") mol.atoms[4] = { ...mol.atoms[4]!, el: "C", label: "CN" };
  return mol;
}

/** Where the beads of the chain go: up to `max` of them on a gentle wave across the column. */
export function polymerBeads(l: PolymerSchoolLayout, units: number, max = 40): Point[] {
  const shown = clamp(Math.round(units), 1, max);
  const x0 = l.left + 14;
  const x1 = l.right - 14;
  const y = 205;
  if (shown === 1) return [{ x: centreX(l), y }];
  return Array.from({ length: shown }, (_, k) => {
    const x = x0 + ((x1 - x0) * k) / (shown - 1);
    return { x, y: y + 16 * Math.sin((k / Math.max(1, shown - 1)) * Math.PI * 3) };
  });
}

function drawChain(ctx: CanvasRenderingContext2D, l: PolymerSchoolLayout, input: RenderInput) {
  const { results, theme } = input;
  const words = input.layers.has("labels");
  const x = centreX(l);
  const id = pick(POLYMER_ORDER, results.polymer);
  const p = polymerInfo(id);
  const natural = num(results.polymerNatural) === 1;

  label(ctx, p.name, l.left, 18, { color: theme.text, font: theme.fontStrong });
  label(ctx, `one unit is made from ${p.unitName}`, l.left, 38, { color: theme.muted, font: theme.font });

  // The repeating unit.
  const mol = polymerUnitMolecule(id);
  if (mol) {
    drawMolecule(ctx, mol, { x: l.left + 20, y: 52, width: l.right - l.left - 40, height: 84 }, { style: "condensed", color: theme.text, font: theme.font, maxBond: 34 });
  } else {
    label(ctx, `[${p.condensed}]ₙ`, x, 94, { color: theme.text, font: theme.fontStrong, align: "center" });
  }

  // The chain: one bead a unit.
  const units = Math.max(1, Math.round(num(results.units, 1)));
  const beads = polymerBeads(l, units);
  const r = clamp(((l.right - l.left - 28) / Math.max(1, beads.length - 1)) * 0.38, 2.5, 7);
  stroke(ctx, theme.muted, 1.2, beads);
  const colour = natural ? theme.tangent : theme.sine;
  for (const b of beads) {
    if (id === "cellulose") {
      fill(ctx, colour, hexagon(b.x, b.y, r), 0.9);
    } else dot(ctx, b.x, b.y, r, colour, 0.9);
  }
  const note = units > beads.length ? `${units} units (only ${beads.length} drawn)` : `${units} unit${units === 1 ? "" : "s"}`;
  label(ctx, note, x, 160, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, "like paper clips joined end to end", x, 252, { color: theme.muted, font: theme.font, align: "center" });

  label(ctx, `one unit: ${p.formula}${natural ? " · a natural polymer" : ""}`, x, 292, { color: theme.text, font: theme.font, align: "center" });
  if (words) {
    label(ctx, `${num(results.unitCarbons)} carbon atoms, ${num(results.unitAtoms)} atoms in all`, x, 314, { color: theme.muted, font: theme.font, align: "center" });
    label(ctx, `chain: ${num(results.chainCarbons)} carbon atoms`, x, 340, { color: theme.angle, font: theme.fontStrong, align: "center" });
    label(ctx, `${num(results.chainAtoms)} atoms in all`, x, 360, { color: theme.muted, font: theme.font, align: "center" });
  } else {
    label(ctx, "chain: ? carbon atoms", x, 340, { color: theme.muted, font: theme.font, align: "center" });
  }
}

// ── Fibre view ───────────────────────────────────────────────────────────────

export interface ThreadGeometry {
  barY: number;
  floor: number;
  postX: number;
  threadX: number;
  /** Where the weight hangs (or lies, once the thread has snapped). */
  weight: { x: number; y: number; w: number; h: number };
}

export function threadGeometry(l: PolymerSchoolLayout, load: number, snapped: boolean): ThreadGeometry {
  const x = centreX(l);
  const barY = 62;
  const floor = 286;
  const size = 14 + 34 * Math.sqrt(clamp(load, 0, POLYMER_MAX_LOAD) / POLYMER_MAX_LOAD);
  const hangY = barY + 132;
  const y = snapped ? floor - size : hangY;
  return { barY, floor, postX: Math.max(l.left + 6, x - 100), threadX: x, weight: { x: x - size / 2, y, w: size, h: size } };
}

function drawFibres(ctx: CanvasRenderingContext2D, l: PolymerSchoolLayout, input: RenderInput) {
  const { results, theme } = input;
  const words = input.layers.has("labels");
  const x = centreX(l);
  const id = pick(POLYMER_FIBRE_ORDER, results.fibre);
  const f = polymerFibre(id);
  const load = num(results.load);
  const snapped = num(results.snapped) === 1;
  const g = threadGeometry(l, load, snapped);

  label(ctx, `${f.name} thread`, l.left, 18, { color: theme.text, font: theme.fontStrong });
  label(ctx, "every thread is the same thickness", l.left, 38, { color: theme.muted, font: theme.font });

  // Stand: post, bar and base.
  stroke(ctx, theme.neutral, 3, [{ x: g.postX, y: g.floor }, { x: g.postX, y: g.barY }, { x: x + 30, y: g.barY }]);
  stroke(ctx, theme.neutral, 3, [{ x: l.left, y: g.floor }, { x: l.right, y: g.floor }]);

  // Thread.
  const colour = f.natural ? theme.tangent : theme.sine;
  const hook = g.weight.y;
  if (snapped) {
    stroke(ctx, colour, 2, [{ x, y: g.barY }, { x, y: g.barY + 62 }, { x: x + 4, y: g.barY + 68 }]);
    stroke(ctx, colour, 2, [{ x: g.weight.x - 4, y: g.floor - 2 }, { x: g.weight.x - 50, y: g.floor - 4 }]);
    label(ctx, "snap!", x + 12, g.barY + 70, { color: theme.secant, font: theme.fontStrong });
  } else {
    stroke(ctx, colour, 2, [{ x, y: g.barY }, { x, y: hook }]);
  }

  // The weight.
  fill(ctx, theme.neutral, rect(g.weight.x, g.weight.y, g.weight.w, g.weight.h), 0.85);
  label(ctx, `${Math.round(load)} g`, g.weight.x + g.weight.w + 8, g.weight.y + g.weight.h / 2, { color: theme.text, font: theme.font });

  if (words) {
    label(ctx, `holds up to ${f.breakingLoad} g (illustrative)`, x, g.floor + 22, { color: theme.angle, font: theme.font, align: "center" });
    const kind = f.natural ? "natural" : "man-made";
    label(ctx, `${kind} · from ${POLYMER_SOURCES[f.source]}`, x, g.floor + 42, { color: theme.text, font: theme.font, align: "center" });
    const water = f.absorbs ? "soaks up a lot of water · dries slowly" : "soaks up little water · dries quickly";
    label(ctx, water, x, g.floor + 62, { color: theme.muted, font: theme.font, align: "center" });
    const heat = f.melts ? "melts when heated: not for the kitchen" : "does not melt when heated";
    label(ctx, heat, x, g.floor + 82, { color: f.melts ? theme.secant : theme.muted, font: theme.font, align: "center" });
  }
}

// ── Plastic view ─────────────────────────────────────────────────────────────

export interface PlasticGeometry {
  /** Supports the strip rests on. */
  leftX: number;
  rightX: number;
  top: number;
  /** How far the middle of the strip sags. */
  sag: number;
  plateY: number;
  /** The close-up circle of the chains. */
  zoom: { x: number; y: number; r: number };
}

export function plasticGeometry(l: PolymerSchoolLayout, soft: boolean): PlasticGeometry {
  const x = centreX(l);
  const half = Math.min(110, (l.right - l.left) / 2 - 20);
  return { leftX: x - half, rightX: x + half, top: 210, sag: soft ? 30 : 0, plateY: 296, zoom: { x, y: 120, r: 54 } };
}

/** The strip's top edge at x: flat, or a smooth sag between the supports. */
function stripY(g: PlasticGeometry, x: number): number {
  const t = (x - g.leftX) / (g.rightX - g.leftX);
  return g.top + g.sag * Math.sin(Math.PI * clamp(t, 0, 1));
}

function drawPlastics(ctx: CanvasRenderingContext2D, l: PolymerSchoolLayout, input: RenderInput) {
  const { results, theme } = input;
  const words = input.layers.has("labels");
  const x = centreX(l);
  const id = pick(POLYMER_PLASTIC_ORDER, results.plastic);
  const p = polymerPlastic(id);
  const soft = num(results.soft) === 1;
  const crossLinked = num(results.crossLinked) === 1;
  const heat = num(results.heat, 25);
  const g = plasticGeometry(l, soft);

  label(ctx, p.name, l.left, 18, { color: theme.text, font: theme.fontStrong });
  label(ctx, `${Math.round(heat)} °C`, l.right, 18, { color: heat >= 60 ? theme.secant : theme.text, font: theme.fontStrong, align: "right" });

  // Close-up of the chains.
  const z = g.zoom;
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  const spread = soft ? 1.35 : 1;
  const rows = [-1.5, -0.5, 0.5, 1.5];
  const chainPoints = rows.map((row, k) => {
    const shift = soft ? (k % 2 === 0 ? 8 : -8) : 0;
    return Array.from({ length: 9 }, (_, j) => {
      const px = z.x - z.r * 0.72 + (z.r * 1.44 * j) / 8 + shift;
      return { x: clamp(px, z.x - z.r * 0.8, z.x + z.r * 0.8), y: z.y + row * 18 * spread * 0.62 + (j % 2 === 0 ? -3 : 3) };
    });
  });
  chainPoints.forEach((pts) => stroke(ctx, crossLinked ? theme.cosine : theme.sine, 2, pts));
  if (crossLinked) {
    for (let k = 0; k + 1 < chainPoints.length; k++) {
      for (const j of [2, 6]) {
        const a = chainPoints[k]![j + (k % 2)]!;
        const b = chainPoints[k + 1]![j + (k % 2)]!;
        stroke(ctx, theme.angle, 1.6, [a, b]);
      }
    }
  }
  if (words) {
    const zoomText = crossLinked ? "cross-linked: the chains are tied together" : "separate chains: they slide when warm";
    label(ctx, zoomText, x, z.y + z.r + 14, { color: theme.text, font: theme.font, align: "center" });
  }

  // The strip on its supports.
  const thickness = 12;
  const xs = Array.from({ length: 21 }, (_, k) => g.leftX + ((g.rightX - g.leftX) * k) / 20);
  const topEdge = xs.map((px) => ({ x: px, y: stripY(g, px) }));
  const bottomEdge = xs.map((px) => ({ x: px, y: stripY(g, px) + thickness })).reverse();
  fill(ctx, crossLinked ? theme.cosine : theme.sine, [...topEdge, ...bottomEdge], 0.6);
  for (const sx of [g.leftX + 6, g.rightX - 6]) stroke(ctx, theme.neutral, 3, [{ x: sx, y: g.top + thickness }, { x: sx, y: g.plateY }]);

  // The hotplate, glowing as it warms.
  const glow = clamp((heat - 20) / 230, 0, 1);
  fill(ctx, theme.neutral, rect(g.leftX - 10, g.plateY, g.rightX - g.leftX + 20, 10), 0.7);
  fill(ctx, theme.secant, rect(g.leftX - 10, g.plateY - 3, g.rightX - g.leftX + 20, 3), 0.15 + 0.85 * glow);

  if (words) {
    const kind = p.thermoplastic ? `thermoplastic · softens at about ${p.softensAt} °C` : "thermosetting · does not soften";
    label(ctx, kind, x, g.plateY + 28, { color: theme.angle, font: theme.font, align: "center" });
    const now = soft ? "soft now: it can be bent to a new shape" : p.thermoplastic ? "still hard: heat it some more" : "stays hard, however hot";
    label(ctx, now, x, g.plateY + 48, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `used for ${p.uses}`, x, g.plateY + 68, { color: theme.muted, font: theme.font, align: "center" });
  }
}

// ── Waste view ───────────────────────────────────────────────────────────────

export interface PitGeometry {
  surface: number;
  bottom: number;
  item: { x: number; y: number };
  /** Full size of the item, px. */
  size: number;
}

export function pitGeometry(l: PolymerSchoolLayout): PitGeometry {
  return { surface: 92, bottom: 286, item: { x: centreX(l), y: 196 }, size: Math.min(110, (l.right - l.left) * 0.4) };
}

/** The item's outline at a scale (1 whole). */
function itemShape(kind: PolymerWasteId, cx: number, cy: number, s: number): Point[] {
  const w = s;
  const h = s * 0.6;
  switch (kind) {
    case "peels":
      return Array.from({ length: 12 }, (_, k) => {
        const a = (Math.PI * 2 * k) / 12;
        const r = (k % 2 === 0 ? 0.5 : 0.36) * w;
        return { x: cx + r * Math.cos(a), y: cy + r * 0.7 * Math.sin(a) };
      });
    case "wood":
      return rect(cx - w / 2, cy - h / 3, w, (h * 2) / 3);
    case "can":
      return rect(cx - w / 4, cy - h / 2, w / 2, h);
    case "bag":
      return [
        { x: cx - w / 2, y: cy - h / 2 },
        { x: cx - w / 4, y: cy - h / 2 },
        { x: cx - w / 4, y: cy - h / 3 },
        { x: cx + w / 4, y: cy - h / 3 },
        { x: cx + w / 4, y: cy - h / 2 },
        { x: cx + w / 2, y: cy - h / 2 },
        { x: cx + w / 2.4, y: cy + h / 2 },
        { x: cx - w / 2.4, y: cy + h / 2 },
      ];
    case "bottle":
      return [
        { x: cx - w / 2, y: cy - h / 4 },
        { x: cx + w / 5, y: cy - h / 4 },
        { x: cx + w / 3, y: cy - h / 9 },
        { x: cx + w / 2, y: cy - h / 9 },
        { x: cx + w / 2, y: cy + h / 9 },
        { x: cx + w / 3, y: cy + h / 9 },
        { x: cx + w / 5, y: cy + h / 4 },
        { x: cx - w / 2, y: cy + h / 4 },
      ];
    default:
      return rect(cx - w / 2, cy - h / 2, w, h);
  }
}

function drawWaste(ctx: CanvasRenderingContext2D, l: PolymerSchoolLayout, input: RenderInput) {
  const { results, theme } = input;
  const words = input.layers.has("labels");
  const x = centreX(l);
  const id = pick(POLYMER_WASTE_ORDER, results.waste);
  const w = polymerWaste(id);
  const days = Math.round(num(results.days));
  const left = clamp(num(results.left, 100), 0, 100);
  const g = pitGeometry(l);

  label(ctx, `buried: ${w.name}`, l.left, 18, { color: theme.text, font: theme.fontStrong });
  label(ctx, `day ${days}`, l.right, 18, { color: theme.text, font: theme.fontStrong, align: "right" });
  if (days >= 365) label(ctx, days >= 730 ? "two years" : "over a year", l.right, 38, { color: theme.muted, font: theme.font, align: "right" });

  // Soil, with grass on top.
  fill(ctx, theme.angle, rect(l.left, g.surface, l.right - l.left, g.bottom - g.surface), 0.18);
  stroke(ctx, theme.tangent, 3, [{ x: l.left, y: g.surface }, { x: l.right, y: g.surface }]);
  for (let k = 0; k < 9; k++) {
    const gx = l.left + 12 + ((l.right - l.left - 24) * k) / 8;
    stroke(ctx, theme.tangent, 1.5, [{ x: gx, y: g.surface }, { x: gx - 3, y: g.surface - 8 }]);
  }

  // The waste, shrinking as it rots.
  const colour = w.biodegradable ? theme.tangent : theme.sine;
  const scale = Math.sqrt(left / 100);
  const full = itemShape(id, g.item.x, g.item.y, g.size);
  if (left > 0) fill(ctx, colour, itemShape(id, g.item.x, g.item.y, g.size * scale), 0.8);
  stroke(ctx, theme.muted, 1, full, true, [4, 4]);
  if (num(results.gone) === 1) label(ctx, "gone: it has rotted away", x, g.item.y + g.size * 0.5, { color: theme.text, font: theme.font, align: "center" });

  // Bacteria and other decomposers at work on biodegradable waste.
  if (w.biodegradable && left > 0 && days > 0) {
    for (let k = 0; k < 10; k++) {
      const a = (Math.PI * 2 * k) / 10;
      dot(ctx, g.item.x + Math.cos(a) * (g.size * 0.55 * scale + 10), g.item.y + Math.sin(a) * (g.size * 0.35 * scale + 10), 2, theme.cosine);
    }
  }

  if (words) {
    const kind = w.biodegradable ? "biodegradable: bacteria break it down" : "non-biodegradable: bacteria can't";
    label(ctx, kind, x, g.bottom + 22, { color: theme.angle, font: theme.font, align: "center" });
    label(ctx, `NCERT: ${POLYMER_ROT_TIMES[w.time]} (approximate)`, x, g.bottom + 42, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `left: ${Math.round(left)}% (steady rotting, illustrative)`, x, g.bottom + 62, { color: theme.muted, font: theme.font, align: "center" });
  }
}

export const polymerSchoolRenderer: SimulationRenderer<PolymerSchoolLayout> = {
  id: "polymerschool",
  layout: (width) => computePolymerSchoolLayout(width),

  draw(ctx, layout, input) {
    ctx.clearRect(0, 0, layout.width, layout.height);
    const has = (layer: string) => input.layers.has(layer);
    if (has("fibres")) drawFibres(ctx, layout, input);
    else if (has("plastics")) drawPlastics(ctx, layout, input);
    else if (has("waste")) drawWaste(ctx, layout, input);
    else drawChain(ctx, layout, input);
  },
};
