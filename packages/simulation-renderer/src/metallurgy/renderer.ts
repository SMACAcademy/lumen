/**
 * Ionic compounds, extracting metals and alloys (class 10).
 *
 * One canvas, six pictures — a mode shows one of them:
 *   • ions: electron-dot pictures; the metal's outer electrons (crosses)
 *     travel one by one to the non-metal (dots), then brackets and charges;
 *   • properties: where the compound melts and boils on a 0–4000 K scale,
 *     and a bulb-and-battery tester dipped into the solid, the melt, a
 *     solution in water, or kerosene;
 *   • extraction: the reactivity series coloured by how each metal is
 *     extracted, and the ore's four stages as a flowchart;
 *   • refining: an electrolytic cell, impure anode shrinking and pure
 *     cathode growing;
 *   • alloys: what the alloy is made of, and a pure metal's neat rows of
 *     atoms beside the alloy's mixed ones;
 *   • carats: 24 squares, one for each part, gold or not.
 *
 * Numbers a level asks the learner to estimate (the metal's share of an ore,
 * the gold's share of an alloy) appear only with the labels layer.
 */

import {
  MET_ALLOY_ELEMENTS,
  MET_ALLOY_ORDER,
  MET_ALLOYS,
  MET_CARAT_MAX,
  MET_EQUATIONS,
  MET_FORM_ORDER,
  MET_IONIC,
  MET_IONIC_ORDER,
  MET_METHOD_NAMES,
  MET_ORE_ORDER,
  MET_ORES,
  METALACID_SERIES,
  metIonShells,
  metIonText,
  metMethodForMetal,
  metOuter,
  metShellText,
  type MetAlloyElement,
} from "@ise/chemistry-engine";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface MetallurgyLayout {
  width: number;
  height: number;
  compact: boolean;
  captionY: number;
}

export function computeMetallurgyLayout(width: number): MetallurgyLayout {
  const compact = width < 560;
  const height = 380;
  return { width, height, compact, captionY: height - 14 };
}

const ELEMENT_NAMES: Record<MetAlloyElement, string> = {
  Cu: "Copper", Zn: "Zinc", Sn: "Tin", Pb: "Lead", Fe: "Iron", Cr: "Chromium", Ni: "Nickel", C: "Carbon", Au: "Gold",
};

function elementColour(theme: LabTheme, element: MetAlloyElement): string {
  switch (element) {
    case "Cu": return theme.secant;
    case "Zn": return theme.sine;
    case "Sn": return theme.tangent;
    case "Pb": return theme.reference;
    case "Fe": return theme.neutral;
    case "Cr": return theme.curve;
    case "Ni": return theme.cosine;
    case "C": return theme.text;
    case "Au": return theme.angle;
  }
}

/** Colour of each route in the series: electrolysis, carbon, heating alone, found free. */
function methodColour(theme: LabTheme, method: number): string {
  return [theme.sine, theme.secant, theme.angle, theme.tangent, theme.curve][method] ?? theme.neutral;
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stroke: string, dash: number[] = []) {
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function cross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  segment(ctx, x - size, y - size, x + size, y + size);
  segment(ctx, x - size, y + size, x + size, y - size);
  ctx.restore();
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, stroke: string, fill?: string, fillAlpha = 0.15, dash: number[] = []) {
  ctx.save();
  if (fill) {
    ctx.globalAlpha = fillAlpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 6);
  ctx.stroke();
  ctx.restore();
}

// ── Giving electrons ─────────────────────────────────────────────────────────

/** Side angles: right, top, left, bottom. */
const SIDES = [0, -Math.PI / 2, Math.PI, Math.PI / 2];
const PAIR = 0.3;

/** Where electron slot `k` (0–7) of a side-ordered shell sits: two per side. */
function slot(cx: number, cy: number, r: number, sides: readonly number[], k: number): [number, number] {
  const side = sides[Math.floor(k / 2)]!;
  const a = side + (k % 2 === 0 ? -PAIR : PAIR);
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** The four sides, the one facing `facing` last, so the outer electrons fill the far sides first. */
function sidesFacingLast(facing: number): number[] {
  return [...SIDES.filter((s) => Math.abs(s - facing) > 1e-9), facing];
}

export interface IonsGeometry {
  r: number;
  metal: { x: number; y: number };
  nonMetals: { x: number; y: number; facing: number }[];
}

export function ionsGeometry(layout: MetallurgyLayout, nonMetals: number): IonsGeometry {
  const { width, compact } = layout;
  const r = compact ? 30 : 38;
  const y = 150;
  if (nonMetals === 2) {
    return {
      r,
      metal: { x: width / 2, y },
      nonMetals: [
        { x: width * 0.17, y, facing: 0 },
        { x: width * 0.83, y, facing: Math.PI },
      ],
    };
  }
  return { r, metal: { x: width * 0.3, y }, nonMetals: [{ x: width * 0.7, y, facing: Math.PI }] };
}

function drawIons(ctx: CanvasRenderingContext2D, layout: MetallurgyLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width } = layout;
  const id = MET_IONIC_ORDER[Math.round(num(results.compound))] ?? "nacl";
  const c = MET_IONIC[id];
  const g = ionsGeometry(layout, c.nonMetals);
  const total = metOuter(c.metal);
  const transfer = clamp(num(results.transfer), 0, 1);
  const moved = Math.round(num(results.electronsMoved));
  const formed = num(results.ionsFormed) === 1;
  const gain = 8 - metOuter(c.nonMetal);

  label(ctx, `${c.name}, ${c.formula}`, width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "× metal's electrons   • non-metal's electrons", width / 2, 38, { color: theme.muted, font: theme.font, align: "center" });

  // Where each of the metal's electrons starts and ends.
  const targets = Array.from({ length: total }, (_, k) => {
    const n = c.nonMetals === 2 ? k : 0;
    const nm = g.nonMetals[n]!;
    const sides = sidesFacingLast(nm.facing);
    const own = metOuter(c.nonMetal);
    const into = c.nonMetals === 2 ? own : own + k;
    const toward = Math.atan2(nm.y - g.metal.y, nm.x - g.metal.x);
    const startAngle = toward + (total === 2 && c.nonMetals === 1 ? (k === 0 ? -PAIR : PAIR) : 0);
    const from: [number, number] = [g.metal.x + g.r * Math.cos(startAngle), g.metal.y + g.r * Math.sin(startAngle)];
    return { from, to: slot(nm.x, nm.y, g.r, sides, into) };
  });

  // Attraction between the ions once they have formed.
  if (formed) {
    for (const nm of g.nonMetals) {
      const dir = Math.sign(nm.x - g.metal.x);
      const x1 = g.metal.x + dir * (g.r + 14);
      const x2 = nm.x - dir * (g.r + 14);
      arrow(ctx, x1, g.metal.y + g.r + 26, x2, nm.y + g.r + 26, { color: theme.angle, width: 1.5, head: 7, double: true });
    }
    label(ctx, "opposite charges attract", width / 2, g.metal.y + g.r + 42, { color: theme.angle, font: theme.font, align: "center" });
  }

  // The metal atom.
  const metalCharge = moved;
  ring(ctx, g.metal.x, g.metal.y, g.r, theme.sine, metalCharge === total ? [4, 4] : []);
  label(ctx, c.metal, g.metal.x, g.metal.y, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (formed) {
    bracket(ctx, g.metal.x, g.metal.y, g.r, theme.text);
    label(ctx, total === 1 ? "+" : `${total}+`, g.metal.x + g.r + 12, g.metal.y - g.r - 6, { color: theme.sine, font: theme.fontStrong, align: "left" });
  }

  // The non-metal atoms with their own electrons.
  g.nonMetals.forEach((nm, n) => {
    const sides = sidesFacingLast(nm.facing);
    ring(ctx, nm.x, nm.y, g.r, theme.cosine);
    label(ctx, c.nonMetal, nm.x, nm.y, { color: theme.text, font: theme.fontStrong, align: "center" });
    for (let k = 0; k < metOuter(c.nonMetal); k++) {
      const [x, y] = slot(nm.x, nm.y, g.r, sides, k);
      disc(ctx, x, y, 3.2, theme.cosine);
    }
    if (formed) {
      bracket(ctx, nm.x, nm.y, g.r, theme.text);
      const side = nm.x > g.metal.x ? 1 : -1;
      const charge = gain === 1 ? "−" : `${gain}−`;
      label(ctx, charge, nm.x + side * (g.r + 12), nm.y - g.r - 6, { color: theme.cosine, font: theme.fontStrong, align: side > 0 ? "left" : "right" });
    }
    if (labels) {
      const charge = c.nonMetals === 2 ? -(moved > n ? 1 : 0) : -moved;
      const shells = charge === 0 ? [...metIonShells(c.nonMetal, 0)] : metIonShells(c.nonMetal, charge);
      label(ctx, `${metIonText(c.nonMetal, charge)} ${metShellText(shells)}`, nm.x, nm.y + g.r + 70, { color: theme.text, font: theme.font, align: "center" });
    }
  });
  if (labels) {
    label(ctx, `${metIonText(c.metal, metalCharge)} ${metShellText(metIonShells(c.metal, metalCharge))}`, g.metal.x, g.metal.y + g.r + 70, { color: theme.text, font: theme.font, align: "center" });
  }

  // The metal's electrons, where they are now.
  targets.forEach((t, k) => {
    const p = clamp(transfer * total - k, 0, 1);
    const x = t.from[0] + (t.to[0] - t.from[0]) * p;
    const y = t.from[1] + (t.to[1] - t.from[1]) * p - Math.sin(Math.PI * p) * 22;
    cross(ctx, x, y, 3.5, theme.sine);
  });

  if (labels) {
    const caption = formed
      ? `${MET_EQUATIONS[`ion-${c.metal.toLowerCase()}` as keyof typeof MET_EQUATIONS]};  ${MET_EQUATIONS[`ion-${c.nonMetal.toLowerCase()}` as keyof typeof MET_EQUATIONS]}`
      : `${moved} of ${total} electron${total === 1 ? "" : "s"} moved`;
    label(ctx, caption, width / 2, layout.captionY, { color: theme.text, font: theme.font, align: "center" });
  }
}

/** Square brackets round an ion. */
function bracket(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  const a = r + 8;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - a + 6, y - a);
  ctx.lineTo(x - a, y - a);
  ctx.lineTo(x - a, y + a);
  ctx.lineTo(x - a + 6, y + a);
  ctx.moveTo(x + a - 6, y - a);
  ctx.lineTo(x + a, y - a);
  ctx.lineTo(x + a, y + a);
  ctx.lineTo(x + a - 6, y + a);
  ctx.stroke();
  ctx.restore();
}

// ── Properties ───────────────────────────────────────────────────────────────

/** The temperature scale runs from 0 to 4000 K. */
export const MET_SCALE_MAX_K = 4000;

export function temperatureX(layout: MetallurgyLayout, kelvin: number): number {
  const x1 = 20;
  const x2 = layout.width - 20;
  return x1 + clamp(kelvin / MET_SCALE_MAX_K, 0, 1) * (x2 - x1);
}

const FORM_WORDS = ["solid crystals", "molten (melted)", "in water", "in kerosene"];

function drawProperties(ctx: CanvasRenderingContext2D, layout: MetallurgyLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width } = layout;
  const id = MET_IONIC_ORDER[Math.round(num(results.compound))] ?? "nacl";
  const c = MET_IONIC[id];
  const formIndex = Math.round(num(results.form));
  const form = MET_FORM_ORDER[formIndex] ?? "solid";
  const conducts = num(results.conducts) === 1;
  const melt = num(results.meltingPoint);
  const boil = num(results.boilingPoint);

  label(ctx, `${c.name}, ${c.formula}`, width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });

  // Solid, liquid and gas along the temperature scale.
  const y = 62;
  const xm = temperatureX(layout, melt);
  const xb = temperatureX(layout, boil);
  const x0 = temperatureX(layout, 0);
  const xe = temperatureX(layout, MET_SCALE_MAX_K);
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = theme.sine;
  ctx.fillRect(x0, y - 8, xm - x0, 16);
  ctx.fillStyle = theme.secant;
  ctx.fillRect(xm, y - 8, xb - xm, 16);
  ctx.fillStyle = theme.neutral;
  ctx.fillRect(xb, y - 8, xe - xb, 16);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  for (let k = 0; k <= MET_SCALE_MAX_K; k += 1000) segment(ctx, temperatureX(layout, k), y + 8, temperatureX(layout, k), y + 13);
  ctx.restore();
  for (let k = 0; k <= MET_SCALE_MAX_K; k += 1000) {
    label(ctx, k === 0 ? "0 K" : String(k), temperatureX(layout, k), y + 22, { color: theme.muted, font: theme.font, align: k === 0 ? "left" : k === MET_SCALE_MAX_K ? "right" : "center" });
  }
  // Room temperature, for comparison.
  const xr = temperatureX(layout, 298);
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.setLineDash([2, 3]);
  segment(ctx, xr, y - 14, xr, y + 8);
  ctx.restore();
  label(ctx, "room", xr - 3, y + 36, { color: theme.muted, font: theme.font, align: "left" });
  if (labels) {
    label(ctx, `melts ${melt} K`, clamp(xm, 60, width - 60), y - 20, { color: theme.angle, font: theme.font, align: "center" });
    label(ctx, `boils ${boil} K`, clamp(xb, 60, width - 60), y + 36, { color: theme.secant, font: theme.font, align: "center" });
  }

  // The conductivity tester.
  const bx = layout.compact ? 16 : width / 2 - 170;
  const bw = 120;
  const top = 160;
  const bottom = 300;
  const liquid = form === "molten" ? theme.secant : form === "water" ? theme.sine : form === "kerosene" ? theme.angle : null;
  if (liquid) {
    ctx.save();
    ctx.globalAlpha = form === "kerosene" ? 0.12 : 0.22;
    ctx.fillStyle = liquid;
    ctx.fillRect(bx, top + 30, bw, bottom - top - 30);
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx, top);
  ctx.lineTo(bx, bottom);
  ctx.lineTo(bx + bw, bottom);
  ctx.lineTo(bx + bw, top);
  ctx.stroke();
  ctx.restore();

  // The ions: a tight lattice in the solid or undissolved lumps, scattered where free.
  const dissolved = form === "molten" || (form === "water" && c.inWater !== 0);
  if (dissolved) {
    for (let i = 0; i < 16; i++) {
      const u = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const v = (Math.sin(i * 78.233) * 12345.6789) % 1;
      const x = bx + 12 + Math.abs(u) * (bw - 24);
      const yy = top + 42 + Math.abs(v) * (bottom - top - 54);
      ion(ctx, x, yy, i % 2 === 0, theme);
    }
  } else {
    const rows = form === "solid" ? 3 : 2;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < 6; col++) ion(ctx, bx + 22 + col * 17, bottom - 10 - row * 14, (row + col) % 2 === 0, theme);
    }
  }

  // Electrodes, wires, battery and bulb.
  const e1 = bx + 30;
  const e2 = bx + bw - 30;
  ctx.save();
  ctx.fillStyle = theme.reference;
  ctx.fillRect(e1 - 4, top - 10, 8, bottom - top - 20);
  ctx.fillRect(e2 - 4, top - 10, 8, bottom - top - 20);
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(e1, top - 10);
  ctx.lineTo(e1, top - 40);
  ctx.lineTo(bx + bw / 2 - 30, top - 40);
  ctx.moveTo(bx + bw / 2 + 30, top - 40);
  ctx.lineTo(e2, top - 40);
  ctx.lineTo(e2, top - 10);
  ctx.stroke();
  // Battery: a long and a short plate.
  segment(ctx, bx + bw / 2 - 30, top - 48, bx + bw / 2 - 30, top - 32);
  ctx.lineWidth = 3;
  segment(ctx, bx + bw / 2 - 24, top - 44, bx + bw / 2 - 24, top - 36);
  ctx.lineWidth = 1.5;
  segment(ctx, bx + bw / 2 - 24, top - 40, bx + bw / 2 + 20, top - 40);
  ctx.restore();
  const bulbX = bx + bw / 2 + 25;
  if (conducts) disc(ctx, bulbX, top - 40, 14, theme.angle, 0.35);
  disc(ctx, bulbX, top - 40, 7, conducts ? theme.angle : theme.surface2);
  ring(ctx, bulbX, top - 40, 7, theme.text);

  label(ctx, FORM_WORDS[formIndex] ?? "", bx + bw / 2, bottom + 14, { color: theme.text, font: theme.font, align: "center" });

  // What the compound does, beside the beaker.
  const tx = bx + bw + 16;
  const lines: [string, string][] = [
    [conducts ? "Bulb glows" : "Bulb stays dark", conducts ? theme.angle : theme.muted],
    [conducts ? "ions free to move" : form === "solid" ? "ions held in place" : form === "water" ? "it hardly dissolves" : "it does not dissolve", theme.muted],
  ];
  if (labels) {
    lines.push(["", theme.muted]);
    lines.push([`Water: ${["hardly dissolves", "dissolves", "reacts with it"][c.inWater]}`, theme.text]);
    lines.push(["Kerosene: insoluble", theme.text]);
    lines.push(["Hard, brittle solid", theme.text]);
  }
  lines.forEach(([text, colour], i) => {
    if (text) label(ctx, text, tx, top - 8 + i * 22, { color: colour, font: i === 0 ? theme.fontStrong : theme.font });
  });
}

function ion(ctx: CanvasRenderingContext2D, x: number, y: number, positive: boolean, theme: LabTheme) {
  disc(ctx, x, y, 6, positive ? theme.sine : theme.cosine);
  label(ctx, positive ? "+" : "−", x, y, { color: theme.background, font: theme.font, align: "center" });
}

// ── Extraction ───────────────────────────────────────────────────────────────

export interface LadderBox {
  symbol: string;
  x: number;
  w: number;
}

export function ladderBoxes(layout: MetallurgyLayout): LadderBox[] {
  const x1 = 10;
  const w = (layout.width - 20) / METALACID_SERIES.length;
  return METALACID_SERIES.map((symbol, i) => ({ symbol, x: x1 + i * w, w }));
}

export const STAGE_TOP = 92;
export const STAGE_HEIGHT = 56;
export const STAGE_GAP = 8;

function drawExtraction(ctx: CanvasRenderingContext2D, layout: MetallurgyLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width } = layout;
  const oreId = MET_ORE_ORDER[Math.round(num(results.ore))] ?? "zinc-blende";
  const ore = MET_ORES[oreId];
  const stage = clamp(num(results.stage), 0, 4);
  const current = Math.min(3, Math.floor(stage));

  label(ctx, `${ore.name}, ${ore.mineral} → ${ore.metalName}`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The reactivity series, each metal coloured by its route.
  const boxes = ladderBoxes(layout);
  const top = 28;
  for (const b of boxes) {
    const isMetal = b.symbol === ore.metal;
    const colour = b.symbol === "H" ? theme.muted : methodColour(theme, metMethodForMetal(b.symbol));
    box(ctx, b.x + 1, top, b.w - 2, 20, isMetal ? theme.text : theme.axis, colour, isMetal ? 0.6 : 0.15);
    label(ctx, b.symbol, b.x + b.w / 2, top + 10, { color: theme.text, font: isMetal ? theme.fontStrong : theme.font, align: "center" });
  }
  const span = (from: string, to: string) => {
    const a = boxes.find((b) => b.symbol === from)!;
    const z = boxes.find((b) => b.symbol === to)!;
    return [a.x, z.x + z.w] as const;
  };
  const groups: [string, string, string, number][] = [
    ["K", "Al", "electrolysis", 0],
    ["Zn", "Pb", "carbon", 1],
    ["Cu", "Hg", "heat", 2],
    ["Ag", "Au", "free", 3],
  ];
  for (const [from, to, words, method] of groups) {
    const [a, z] = span(from, to);
    ctx.save();
    ctx.fillStyle = methodColour(theme, method);
    ctx.fillRect(a + 1, top + 23, z - a - 2, 3);
    ctx.restore();
    if (labels) label(ctx, words, (a + z) / 2, top + 36, { color: theme.muted, font: theme.font, align: "center" });
  }

  // The four stages.
  for (let i = 0; i < 4; i++) {
    const s = ore.stages[i]!;
    const y = STAGE_TOP + i * (STAGE_HEIGHT + STAGE_GAP);
    const skipped = s.skipped === 1;
    const active = i === current;
    const done = stage >= i + 1 || (stage >= 4 && i === 3);
    const colour = skipped ? theme.muted : active ? theme.accent : done ? theme.tangent : theme.axis;
    box(ctx, 10, y, width - 20, STAGE_HEIGHT, colour, active && !skipped ? theme.accent : undefined, 0.12, skipped ? [4, 4] : []);
    disc(ctx, 26, y + 18, 9, colour, skipped ? 0.4 : 1);
    label(ctx, done && !skipped ? "✓" : String(i + 1), 26, y + 18, { color: theme.background, font: theme.fontStrong, align: "center" });
    label(ctx, s.title, 44, y + 18, { color: skipped ? theme.muted : theme.text, font: theme.fontStrong });
    const line = s.equation ? MET_EQUATIONS[s.equation] : (s.note ?? "");
    label(ctx, line, 44, y + 40, { color: skipped ? theme.muted : s.equation ? theme.angle : theme.text, font: theme.font });
    if (active && !skipped) {
      const p = clamp(stage - i, 0, 1);
      ctx.save();
      ctx.fillStyle = theme.accent;
      ctx.fillRect(12, y + STAGE_HEIGHT - 4, (width - 24) * p, 2);
      ctx.restore();
    }
  }

  if (labels) {
    const percent = num(results.metalPercent);
    const words = ore.kind === 4 ? `Route: ${MET_METHOD_NAMES[ore.method]}` : `${ore.mineral} is ${percent.toFixed(1)}% ${ore.metalName} by mass`;
    label(ctx, words, width / 2, layout.captionY, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── Refining ─────────────────────────────────────────────────────────────────

export interface RefiningGeometry {
  tank: { x: number; y: number; w: number; h: number };
  anodeWidth: number;
  cathodeWidth: number;
}

export function refiningGeometry(layout: MetallurgyLayout, refined: number): RefiningGeometry {
  const w = Math.min(layout.width - 60, 340);
  const r = clamp(refined, 0, 1);
  return { tank: { x: layout.width / 2 - w / 2, y: 150, w, h: 150 }, anodeWidth: 28 * (1 - 0.7 * r), cathodeWidth: 6 + 20 * r };
}

function drawRefining(ctx: CanvasRenderingContext2D, layout: MetallurgyLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width } = layout;
  const oreId = MET_ORE_ORDER[Math.round(num(results.ore))] ?? "zinc-blende";
  const ore = MET_ORES[oreId];
  const refined = clamp(num(results.refined), 0, 1);
  const g = refiningGeometry(layout, refined);
  const { x, y, w, h } = g.tank;
  const copper = ore.metal === "Cu";

  label(ctx, `Refining ${ore.metalName} by electrolysis`, width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (num(results.refinedByElectrolysis) !== 1) {
    label(ctx, ore.stages[3].note ?? "Not refined by electrolysis", width / 2, 60, { color: theme.muted, font: theme.font, align: "center" });
    return;
  }
  if (copper) {
    label(ctx, `Anode: ${MET_EQUATIONS["refine-anode"]}`, width / 2, 42, { color: theme.angle, font: theme.font, align: "center" });
    label(ctx, `Cathode: ${MET_EQUATIONS["refine-cathode"]}`, width / 2, 62, { color: theme.angle, font: theme.font, align: "center" });
  }

  // The solution and the tank.
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = copper ? theme.sine : theme.neutral;
  ctx.fillRect(x, y + 16, w, h - 16);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();

  // Anode (impure, left) and cathode (pure, right).
  const ax = x + w * 0.22;
  const cx = x + w * 0.78;
  ctx.save();
  ctx.fillStyle = theme.secant;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(ax - g.anodeWidth / 2, y - 10, g.anodeWidth, h - 40);
  ctx.globalAlpha = 1;
  ctx.fillStyle = copper ? theme.secant : theme.neutral;
  ctx.fillRect(cx - g.cathodeWidth / 2, y - 10, g.cathodeWidth, h - 40);
  ctx.restore();
  // Anode mud collects under the anode.
  const mud = 4 + 14 * refined;
  ctx.save();
  ctx.fillStyle = theme.reference;
  ctx.beginPath();
  ctx.moveTo(ax - 30, y + h - 1);
  ctx.quadraticCurveTo(ax, y + h - mud * 2, ax + 30, y + h - 1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Wires to the battery.
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ax, y - 10);
  ctx.lineTo(ax, y - 44);
  ctx.lineTo(width / 2 - 8, y - 44);
  ctx.moveTo(width / 2 + 8, y - 44);
  ctx.lineTo(cx, y - 44);
  ctx.lineTo(cx, y - 10);
  ctx.stroke();
  ctx.lineWidth = 3;
  segment(ctx, width / 2 - 8, y - 54, width / 2 - 8, y - 34);
  ctx.lineWidth = 1.5;
  segment(ctx, width / 2 + 8, y - 50, width / 2 + 8, y - 38);
  ctx.restore();
  label(ctx, "+", ax - 12, y - 30, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "−", cx + 12, y - 30, { color: theme.text, font: theme.fontStrong, align: "center" });

  // Metal ions crossing from anode to cathode.
  const ionName = copper ? "Cu²⁺" : `${ore.metal} ions`;
  for (let i = 0; i < 3; i++) {
    const yy = y + 40 + i * 26;
    arrow(ctx, ax + 22, yy, cx - 18, yy, { color: theme.sine, width: 1.5, head: 7, alpha: 0.8 });
  }
  label(ctx, ionName, (ax + cx) / 2, y + 28, { color: theme.text, font: theme.font, align: "center" });

  label(ctx, "anode", ax, y + h + 14, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, "cathode", cx, y + h + 14, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `impure ${ore.metal}`, ax, y + h + 30, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, `pure ${ore.metal}`, cx, y + h + 30, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "anode mud", ax, y + h - mud - 12, { color: theme.text, font: theme.font, align: "center" });

  if (labels) {
    const solution = copper ? "acidified copper sulphate" : `a solution of a ${ore.metalName} salt`;
    label(ctx, `In ${solution}: ${Math.round(refined * 100)}% refined`, width / 2, layout.captionY, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── Alloys ───────────────────────────────────────────────────────────────────

/** How many atoms of the 28 in the alloy picture belong to each element (at least one if it is there at all). */
export function alloyAtoms(percents: Record<MetAlloyElement, number>): { element: MetAlloyElement; count: number }[] {
  const present = MET_ALLOY_ELEMENTS.filter((e) => percents[e] > 0);
  const base = present.reduce((best, e) => (percents[e] > percents[best] ? e : best), present[0]!);
  const others = present.filter((e) => e !== base).map((element) => ({ element, count: Math.max(1, Math.round((28 * percents[element]) / 100)) }));
  const used = others.reduce((sum, o) => sum + o.count, 0);
  return [{ element: base, count: 28 - used }, ...others];
}

function drawAlloys(ctx: CanvasRenderingContext2D, layout: MetallurgyLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width } = layout;
  const id = MET_ALLOY_ORDER[Math.round(num(results.alloy))] ?? "brass";
  const alloy = MET_ALLOYS[id];
  const percents: Record<MetAlloyElement, number> = {
    Cu: num(results.copperPercent), Zn: num(results.zincPercent), Sn: num(results.tinPercent), Pb: num(results.leadPercent),
    Fe: num(results.ironPercent), Cr: num(results.chromiumPercent), Ni: num(results.nickelPercent), C: num(results.carbonPercent), Au: num(results.alloyGoldPercent),
  };
  const present = MET_ALLOY_ELEMENTS.filter((e) => percents[e] > 0).sort((a, b) => percents[b] - percents[a]);

  label(ctx, `${alloy.name} = ${present.map((e) => ELEMENT_NAMES[e].toLowerCase()).join(" + ")}`, width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, alloy.use, width / 2, 38, { color: theme.muted, font: theme.font, align: "center" });

  // The composition bar.
  const x1 = 20;
  const x2 = width - 20;
  let x = x1;
  for (const e of present) {
    const w = Math.max(3, ((x2 - x1) * percents[e]) / 100);
    ctx.save();
    ctx.fillStyle = elementColour(theme, e);
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x, 58, Math.min(w, x2 - x), 26);
    ctx.restore();
    x += w;
  }
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.strokeRect(x1, 58, x2 - x1, 26);
  ctx.restore();
  present.forEach((e, i) => {
    const ly = 102 + i * 20;
    disc(ctx, x1 + 6, ly, 5, elementColour(theme, e));
    const amount = labels ? `  ${Number(percents[e].toFixed(2))}%` : "";
    label(ctx, `${ELEMENT_NAMES[e]} (${e})${amount}`, x1 + 18, ly, { color: theme.text, font: theme.font });
  });

  // Atoms: the pure base metal in neat rows, the alloy mixed.
  const atoms = alloyAtoms(percents);
  const base = atoms[0]!.element;
  const panelW = Math.min(150, (width - 40) / 2);
  const spacing = panelW / 7;
  const panels = [
    { left: width / 2 - panelW - 10, title: `pure ${ELEMENT_NAMES[base].toLowerCase()}`, mixed: false },
    { left: width / 2 + 10, title: alloy.name.toLowerCase(), mixed: true },
  ];
  const py = 200;
  // Which of the 28 sites hold another element: spread out, the same every time.
  const sites = Array.from({ length: 28 }, (_, i) => (i * 11) % 28);
  const kind: MetAlloyElement[] = Array(28).fill(base);
  let k = 0;
  for (const a of atoms.slice(1)) for (let n = 0; n < a.count; n++) kind[sites[k++]!] = a.element;
  for (const panel of panels) {
    label(ctx, panel.title, panel.left + panelW / 2, py - 14, { color: theme.text, font: theme.font, align: "center" });
    for (let i = 0; i < 28; i++) {
      const col = i % 7;
      const row = Math.floor(i / 7);
      const element = panel.mixed ? kind[i]! : base;
      const small = element !== base;
      disc(ctx, panel.left + spacing * (col + 0.5), py + 4 + row * spacing, small ? spacing * 0.3 : spacing * 0.44, elementColour(theme, element), 0.85);
    }
  }
  label(ctx, "layers slide easily", panels[0]!.left + panelW / 2, py + 4 * spacing + 14, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "layers lock: harder", panels[1]!.left + panelW / 2, py + 4 * spacing + 14, { color: theme.muted, font: theme.font, align: "center" });

  label(ctx, alloy.note, width / 2, layout.captionY - 20, { color: theme.text, font: theme.font, align: "center" });
  if (num(results.rusts) === 1) label(ctx, "Still rusts in moist air", width / 2, layout.captionY, { color: theme.secant, font: theme.font, align: "center" });
}

// ── Carats ───────────────────────────────────────────────────────────────────

export function caratGrid(layout: MetallurgyLayout): { x: number; y: number; size: number } {
  const size = Math.min(30, (layout.width - 40) / 12);
  return { x: layout.width / 2 - 6 * size, y: 70, size };
}

function drawCarat(ctx: CanvasRenderingContext2D, layout: MetallurgyLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width } = layout;
  const carat = Math.round(clamp(num(results.carat, 24), 1, MET_CARAT_MAX));
  const grid = caratGrid(layout);

  label(ctx, `${carat} carat gold`, width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "Gold is counted in 24 parts", width / 2, 40, { color: theme.muted, font: theme.font, align: "center" });
  for (let i = 0; i < MET_CARAT_MAX; i++) {
    const col = i % 12;
    const row = Math.floor(i / 12);
    const gold = i < carat;
    box(ctx, grid.x + col * grid.size + 2, grid.y + row * grid.size + 2, grid.size - 4, grid.size - 4, gold ? theme.angle : theme.secant, gold ? theme.angle : theme.secant, gold ? 0.7 : 0.35);
  }
  const legendY = grid.y + 2 * grid.size + 24;
  disc(ctx, 26, legendY, 6, theme.angle);
  label(ctx, "gold", 38, legendY, { color: theme.text, font: theme.font });
  disc(ctx, 96, legendY, 6, theme.secant);
  label(ctx, "copper or silver", 108, legendY, { color: theme.text, font: theme.font });

  // A carat scale with the stops jewellers use.
  const sx1 = 30;
  const sx2 = width - 30;
  const sy = legendY + 60;
  const at = (n: number) => sx1 + ((sx2 - sx1) * n) / MET_CARAT_MAX;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  segment(ctx, sx1, sy, sx2, sy);
  for (const n of [0, 14, 18, 22, 24]) segment(ctx, at(n), sy - 5, at(n), sy + 5);
  ctx.restore();
  for (const n of [0, 14, 18, 22, 24]) label(ctx, String(n), at(n), sy + 16, { color: theme.muted, font: theme.font, align: "center" });
  disc(ctx, at(carat), sy, 6, theme.angle);
  label(ctx, "softer, purer →", sx2, sy - 18, { color: theme.muted, font: theme.font, align: "right" });
  label(ctx, "← harder", sx1, sy - 18, { color: theme.muted, font: theme.font, align: "left" });

  label(ctx, `${carat} parts gold, ${MET_CARAT_MAX - carat} parts other metal`, width / 2, sy + 48, { color: theme.text, font: theme.font, align: "center" });
  if (labels) {
    label(ctx, `${carat}/24 of it is gold: ${num(results.goldPercent).toFixed(1)}%`, width / 2, layout.captionY, { color: theme.text, font: theme.font, align: "center" });
  }
}

export const metallurgyRenderer: SimulationRenderer<MetallurgyLayout> = {
  id: "metallurgy",
  layout: (width) => computeMetallurgyLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const labels = layers.has("labels");
    ctx.clearRect(0, 0, layout.width, layout.height);
    const r = results as Record<string, unknown>;
    if (layers.has("ions")) drawIons(ctx, layout, r, theme, labels);
    else if (layers.has("properties")) drawProperties(ctx, layout, r, theme, labels);
    else if (layers.has("extraction")) drawExtraction(ctx, layout, r, theme, labels);
    else if (layers.has("refining")) drawRefining(ctx, layout, r, theme, labels);
    else if (layers.has("alloys")) drawAlloys(ctx, layout, r, theme, labels);
    else if (layers.has("carat")) drawCarat(ctx, layout, r, theme, labels);
  },
};
