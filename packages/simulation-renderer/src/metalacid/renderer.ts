/**
 * Metals, acids and salts: seven small benches, one per mode.
 *
 *   element    — a sample of the element and its checklist of properties
 *   corrosion  — a bar of metal left in moist air, its coat growing day by day
 *   series     — the reactivity series beside a beaker with a metal strip in it
 *   redox      — an equation with what is oxidised and what is reduced bracketed
 *   acid       — a flask of dilute acid, with the gas led off to be tested
 *   phscale    — a substance in universal indicator, on the 0–14 scale
 *   salts      — a salt, its water of crystallisation, how it is made and used
 *
 * Numbers a level asks the learner to estimate (the pH, the share corroded,
 * the water of crystallisation) appear only with the "labels" layer.
 */

import {
  METALACID_COATING_NAMES,
  METALACID_COMPOUND_ORDER,
  METALACID_COMPOUNDS,
  METALACID_ELEMENT_ORDER,
  METALACID_ELEMENTS,
  METALACID_LIQUID_ORDER,
  METALACID_LIQUIDS,
  METALACID_METAL_ORDER,
  METALACID_METALS,
  METALACID_REDOX,
  METALACID_REDOX_ORDER,
  METALACID_SALT_ORDER,
  METALACID_SALTS,
  METALACID_SERIES,
  METALACID_SUBSTANCE_ORDER,
  METALACID_SUBSTANCES,
  metalAcidEquationText,
  metalAcidInLiquid,
  metalAcidSide,
  type MetalAcidMetalId,
} from "@ise/chemistry-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface MetalAcidLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Side margin. */
  pad: number;
  /** Baseline of the caption along the bottom. */
  captionY: number;
}

export function computeMetalAcidLayout(width: number): MetalAcidLayout {
  const compact = width < 560;
  const height = compact ? 380 : 400;
  return { width, height, compact, pad: 16, captionY: height - 14 };
}

/** Colours of the materials themselves (not theme roles): metals, coats, indicators. */
export const METALACID_METAL_COLOURS: Readonly<Record<string, string>> = {
  K: "#cbd5e1", Na: "#cbd5e1", Ca: "#e2e8f0", Mg: "#d1d5db", Al: "#e5e7eb", Zn: "#a1a1aa", Fe: "#71717a",
  Pb: "#64748b", Cu: "#c2410c", Hg: "#d4d4d8", Ag: "#e5e7eb", Au: "#eab308",
};
const COATING_COLOURS = ["#00000000", "#9a3412", "#3f9b6e", "#111827", "#f1f5f9"];
const ELEMENT_COLOURS: Readonly<Record<string, string>> = {
  iron: "#71717a", copper: "#c2410c", aluminium: "#e5e7eb", gold: "#eab308", silver: "#e5e7eb", sodium: "#d4d4d8",
  mercury: "#d4d4d8", sulphur: "#facc15", graphite: "#374151", iodine: "#4c1d95", bromine: "#9f1239", oxygen: "#bae6fd",
};
/** Universal indicator, pH 0 to 14. */
export const UNIVERSAL_COLOURS = [
  "#b91c1c", "#ef4444", "#f97316", "#fb923c", "#facc15", "#fde047", "#bef264", "#22c55e",
  "#14b8a6", "#0ea5e9", "#3b82f6", "#6366f1", "#7c3aed", "#6d28d9", "#581c87",
];
export const universalColour = (pH: number) => UNIVERSAL_COLOURS[clamp(Math.round(pH), 0, 14)]!;

const INDICATORS: readonly { name: string; key: string; colours: readonly string[]; words: readonly string[] }[] = [
  { name: "Litmus", key: "litmus", colours: ["#dc2626", "#9333ea", "#2563eb"], words: ["red", "purple", "blue"] },
  { name: "Phenolphthalein", key: "phenolphthalein", colours: ["#f8fafc", "#ec4899"], words: ["colourless", "pink"] },
  { name: "Methyl orange", key: "methylOrange", colours: ["#dc2626", "#f97316", "#facc15"], words: ["red", "orange", "yellow"] },
  { name: "Turmeric", key: "turmeric", colours: ["#eab308", "#9a3412"], words: ["yellow", "reddish-brown"] },
];

const OXIDE_WORDS = ["acidic", "basic", "both acidic and basic", "hardly forms one", "—"];
const STATE_WORDS = ["solid", "liquid", "gas"];
const NATURE_WORDS = ["acidic", "neutral", "basic"];

const LIQUID_SHORT: Readonly<Record<string, string>> = {
  hcl: "dilute HCl", water: "cold water", cuso4: "CuSO₄ solution", feso4: "FeSO₄ solution",
  znso4: "ZnSO₄ solution", mgso4: "MgSO₄ solution", agno3: "AgNO₃ solution",
};

const pick = <T>(order: readonly T[], value: unknown): T => order[clamp(Math.round(num(value)), 0, order.length - 1)]!;
const pct = (v: number) => `${Math.round(clamp(v, 0, 1) * 100)}%`;
/** A fixed scatter in [0, 1)², so drawings do not flicker. */
function scatter(i: number): [number, number] {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return [a - Math.floor(a), b - Math.floor(b)];
}

function mix(a: string, b: string, t: number): string {
  const f = clamp(t, 0, 1);
  const p = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(a, i) * (1 - f) + p(b, i) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string | null, stroke: string | null, radius = 4, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/** Word-wrap `text` into lines no wider than `width`. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number, font: string): string[] {
  ctx.save();
  ctx.font = font;
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines;
}

// ── Element: metal or non-metal ──────────────────────────────────────────────

function drawElement(ctx: CanvasRenderingContext2D, layout: MetalAcidLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width, pad } = layout;
  const id = pick(METALACID_ELEMENT_ORDER, results.element);
  const e = METALACID_ELEMENTS[id];
  const colour = ELEMENT_COLOURS[id] ?? theme.neutral;
  const cx = width / 2;
  label(ctx, `${e.name} (${e.symbol})`, cx, 20, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The sample: a block, a puddle or a few gas molecules.
  if (e.state === 0) {
    box(ctx, cx - 40, 44, 80, 46, colour, theme.muted, 6);
    if (e.lustre) box(ctx, cx - 30, 50, 46, 6, "#ffffff", null, 3, 0.7);
  } else if (e.state === 1) {
    ctx.save();
    ctx.fillStyle = colour;
    ctx.strokeStyle = theme.muted;
    ctx.beginPath();
    ctx.ellipse(cx, 76, 46, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    if (e.lustre) box(ctx, cx - 26, 68, 30, 4, "#ffffff", null, 2, 0.7);
  } else {
    for (let i = 0; i < 6; i++) {
      const [a, b] = scatter(i + 3);
      dot(ctx, cx - 40 + a * 80, 50 + b * 36, 5, colour, theme.muted);
    }
  }

  const tick = (v: number) => (v ? "✓" : "✗");
  const rows: [string, string, boolean | null][] = [
    ["Shiny (lustre)", tick(e.lustre), !!e.lustre],
    ["Beats into sheets (malleable)", tick(e.malleable), !!e.malleable],
    ["Draws into wire (ductile)", tick(e.ductile), !!e.ductile],
    ["Conducts electricity", tick(e.conducts), !!e.conducts],
    ["Rings when struck (sonorous)", tick(e.sonorous), !!e.sonorous],
    ["Soft enough to cut with a knife", tick(e.knife), null],
    ["At room temperature", STATE_WORDS[e.state]!, null],
    ["Its oxide", e.oxideFormula ? `${OXIDE_WORDS[e.oxide]}` : OXIDE_WORDS[e.oxide]!, null],
  ];
  const top = 118;
  const rowH = layout.compact ? 25 : 27;
  rows.forEach(([name, value, good], i) => {
    const y = top + i * rowH;
    if (i % 2 === 0) box(ctx, pad - 6, y - rowH / 2, width - 2 * pad + 12, rowH, theme.grid, null, 4);
    label(ctx, name, pad, y, { color: theme.text, font: theme.font, align: "left" });
    const color = good === null ? theme.text : good ? theme.tangent : theme.secant;
    label(ctx, value, width - pad, y, { color, font: theme.fontStrong, align: "right" });
  });
  if (e.oxideFormula) label(ctx, `oxide: ${e.oxideFormula}`, width - pad, top + 8 * rowH, { color: theme.muted, font: theme.font, align: "right" });

  if (labels) {
    const special: Partial<Record<string, string>> = {
      mercury: "Mercury is a metal, yet it is a liquid",
      sodium: "Sodium is a metal soft enough to cut",
      graphite: "Graphite is a non-metal that conducts",
      iodine: "Iodine is a non-metal, yet it shines",
      bromine: "Bromine is a non-metal, and a liquid",
    };
    const words = special[id] ?? `${e.name} is a ${e.metal ? "metal" : "non-metal"}`;
    label(ctx, words, width / 2, layout.captionY, { color: e.metal ? theme.sine : theme.cosine, font: theme.fontStrong, align: "center" });
  }
}

// ── Corrosion ────────────────────────────────────────────────────────────────

const CORROSION_NOTES: Readonly<Record<MetalAcidMetalId, string>> = {
  potassium: "Tarnishes at once: it is kept under kerosene",
  sodium: "Tarnishes at once: it is kept under kerosene",
  calcium: "Turns dull white quickly in moist air",
  magnesium: "A dull layer slowly covers the ribbon",
  aluminium: "A thin oxide layer, Al₂O₃, seals it",
  zinc: "A dull grey layer forms and protects it",
  iron: "4Fe + 3O₂ + 2xH₂O → 2Fe₂O₃·xH₂O (rust)",
  lead: "A dull grey layer covers it",
  copper: "Green coat: basic copper carbonate",
  mercury: "Mercury hardly changes in air",
  silver: "Black coat: silver sulphide, Ag₂S",
  gold: "Gold does not corrode",
};

function drawCorrosion(ctx: CanvasRenderingContext2D, layout: MetalAcidLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width, pad } = layout;
  const id = pick(METALACID_METAL_ORDER, results.metal);
  const m = METALACID_METALS[id];
  const days = Math.round(num(results.days));
  const corrosion = clamp(num(results.corrosion), 0, 1);
  const coat = clamp(Math.round(num(results.coatingColour)), 0, 4);
  label(ctx, `${m.name} in moist air: day ${days}`, width / 2, 20, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The bar, cut into cells; each cell turns once corrosion passes its own threshold.
  const x0 = pad + 20;
  const x1 = width - pad - 20;
  const y = 64;
  const h = 34;
  box(ctx, x0, y, x1 - x0, h, METALACID_METAL_COLOURS[m.symbol] ?? theme.neutral, theme.muted, 6);
  const cells = 24;
  const cw = (x1 - x0) / cells;
  for (let i = 0; i < cells; i++) {
    for (let j = 0; j < 2; j++) {
      const [threshold] = scatter(i * 2 + j + 1);
      if (coat !== 0 && corrosion > 0 && threshold < corrosion) {
        box(ctx, x0 + i * cw, y + j * (h / 2), cw, h / 2, COATING_COLOURS[coat]!, null, 1, coat === 4 ? 0.8 : 0.95);
      }
    }
  }
  // Rust flakes off and falls; other coats stay on.
  if (num(results.layerStays) === 0 && coat === 1 && corrosion > 0.3) {
    const flakes = Math.round((corrosion - 0.3) * 14);
    for (let i = 0; i < flakes; i++) {
      const [a, b] = scatter(i + 50);
      box(ctx, x0 + a * (x1 - x0 - 6), y + h + 8 + b * 20, 5, 3, COATING_COLOURS[1]!, null, 1);
    }
  }

  label(ctx, CORROSION_NOTES[id], width / 2, 150, { color: theme.text, font: theme.font, align: "center" });

  // A calendar bar: 0 to 100 days.
  const cx0 = pad + 10;
  const cx1 = width - pad - 10;
  const cy = 200;
  box(ctx, cx0, cy - 3, cx1 - cx0, 6, theme.grid, null, 3);
  const mx = cx0 + (clamp(days, 0, 100) / 100) * (cx1 - cx0);
  box(ctx, cx0, cy - 3, mx - cx0, 6, theme.angle, null, 3);
  dot(ctx, mx, cy, 6, theme.angle);
  label(ctx, "0", cx0, cy + 16, { color: theme.muted, font: theme.font, align: "left" });
  label(ctx, "100 days", cx1, cy + 16, { color: theme.muted, font: theme.font, align: "right" });

  if (labels) {
    const what = coat === 0 || corrosion === 0 ? "No coat yet" : `Coated: ${pct(corrosion)}, ${METALACID_COATING_NAMES[coat]}`;
    label(ctx, what, width / 2, 262, { color: theme.text, font: theme.fontStrong, align: "center" });
    const how = coat === 0 ? "" : num(results.layerStays) ? "The layer stays on the surface as a thin skin" : "Rust flakes off, so the iron keeps rusting";
    if (how) label(ctx, how, width / 2, layout.captionY, { color: theme.muted, font: theme.font, align: "center" });
  }
}

// ── The reactivity series and the beaker ─────────────────────────────────────

function drawSeries(ctx: CanvasRenderingContext2D, layout: MetalAcidLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { width, pad, height } = layout;
  const metalId = pick(METALACID_METAL_ORDER, results.metal);
  const liquidId = pick(METALACID_LIQUID_ORDER, results.liquid);
  const m = METALACID_METALS[metalId];
  const liquid = METALACID_LIQUIDS[liquidId];
  const inSolution = liquid.metal ? METALACID_METALS[liquid.metal] : null;
  const what = metalAcidInLiquid(metalId, liquidId);
  const labels = has("labels");

  label(ctx, `${m.name} + ${LIQUID_SHORT[liquidId]}`, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (labels) {
    const eq = what.equation ? metalAcidEquationText(what.equation) : "No reaction";
    label(ctx, eq, width / 2, 40, { color: what.equation ? theme.text : theme.muted, font: theme.font, align: "center" });
  }

  const top = 62;
  if (has("series")) {
    const rowH = (height - top - 46) / METALACID_SERIES.length;
    const w = 46;
    METALACID_SERIES.forEach((symbol, i) => {
      const y = top + i * rowH;
      const isMetal = symbol === m.symbol;
      const isSolution = inSolution !== null && symbol === inSolution.symbol;
      const isH = symbol === "H";
      const fill = isMetal ? theme.sine : isSolution ? theme.cosine : null;
      box(ctx, pad, y + 1, w, rowH - 2, fill ?? theme.grid, isH ? theme.angle : null, 4, fill ? 0.85 : 1);
      label(ctx, isH ? "(H)" : symbol, pad + w / 2, y + rowH / 2, { color: fill ? theme.background : isH ? theme.angle : theme.text, font: theme.fontStrong, align: "center" });
    });
    arrow(ctx, pad + w + 8, top + METALACID_SERIES.length * rowH - 4, pad + w + 8, top + 4, { color: theme.muted, width: 1.5, head: 6 });
    label(ctx, "more reactive", pad, height - 30, { color: theme.muted, font: theme.font, align: "left" });
  }

  if (has("beaker")) {
    const bx0 = has("series") ? pad + 74 : pad + 20;
    const bx1 = width - pad;
    const by0 = 96;
    const by1 = height - 60;
    const surface = by0 + 40;
    // Liquid: clear, tinted blue by copper ions and pale green by iron ions.
    box(ctx, bx0, surface, bx1 - bx0, by1 - surface, "#94a3b8", null, 0, 0.18);
    const blue = clamp(num(results.blueness), 0, 1);
    const green = clamp(num(results.greenness), 0, 1);
    if (blue > 0) box(ctx, bx0, surface, bx1 - bx0, by1 - surface, "#2563eb", null, 0, 0.55 * blue);
    if (green > 0) box(ctx, bx0, surface, bx1 - bx0, by1 - surface, "#86efac", null, 0, 0.45 * green);
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx0, by0);
    ctx.lineTo(bx0, by1);
    ctx.lineTo(bx1, by1);
    ctx.lineTo(bx1, by0);
    ctx.stroke();
    ctx.restore();

    // The strip (mercury is a drop at the bottom), coated by the metal pushed out.
    const sx = (bx0 + bx1) / 2;
    const metalColour = METALACID_METAL_COLOURS[m.symbol] ?? theme.neutral;
    const coating = clamp(num(results.coating), 0, 1);
    const deposit = inSolution ? (METALACID_METAL_COLOURS[inSolution.symbol] ?? theme.neutral) : theme.neutral;
    const stripTop = by0 - 24;
    const stripBottom = by1 - 16;
    if (metalId === "mercury") {
      dot(ctx, sx, by1 - 12, 10, metalColour, theme.muted);
      if (coating > 0) dot(ctx, sx, by1 - 12, 10 * Math.sqrt(coating), deposit);
    } else {
      box(ctx, sx - 10, stripTop, 20, stripBottom - stripTop, metalColour, theme.muted, 3);
      if (coating > 0) box(ctx, sx - 10, surface, 20, stripBottom - surface, deposit, null, 3, 0.9 * coating);
    }

    // Bubbles of hydrogen while it fizzes.
    const fizz = clamp(num(results.fizz), 0, 1);
    const n = Math.round(14 * fizz);
    for (let i = 0; i < n; i++) {
      const [a, b] = scatter(i + 10);
      const x = clamp(sx + (a - 0.5) * 60, bx0 + 6, bx1 - 6);
      dot(ctx, x, surface + 8 + b * (by1 - surface - 24), 3, "#ffffff", theme.muted);
    }
    if (labels && n > 0) label(ctx, "H₂", Math.min(sx + 34, bx1 - 12), surface - 12, { color: theme.text, font: theme.fontStrong, align: "center" });
    if (labels && inSolution && coating > 0.05) {
      label(ctx, `${inSolution.symbol} coats the strip`, (bx0 + bx1) / 2, by1 + 16, { color: theme.cosine, font: theme.font, align: "center" });
    }
  }

  if (labels) label(ctx, what.note, width / 2, layout.captionY, { color: num(results.violent) ? theme.secant : theme.text, font: theme.font, align: "center" });
}

// ── Oxidation and reduction ──────────────────────────────────────────────────

function drawRedox(ctx: CanvasRenderingContext2D, layout: MetalAcidLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width, pad } = layout;
  const id = pick(METALACID_REDOX_ORDER, results.redox);
  const r = METALACID_REDOX[id];
  label(ctx, r.label, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });

  // Lay the equation out term by term, so the brackets can find each one.
  const font = theme.fontStrong;
  ctx.save();
  ctx.font = font;
  const pieces: { text: string; side: "r" | "p" | "op"; index: number }[] = [];
  r.equation.reactants.forEach((t, i) => {
    if (i > 0) pieces.push({ text: " + ", side: "op", index: -1 });
    pieces.push({ text: metalAcidSide([t]), side: "r", index: i });
  });
  pieces.push({ text: " → ", side: "op", index: -1 });
  r.equation.products.forEach((t, i) => {
    if (i > 0) pieces.push({ text: " + ", side: "op", index: -1 });
    pieces.push({ text: metalAcidSide([t]), side: "p", index: i });
  });
  const widths = pieces.map((p) => ctx.measureText(p.text).width);
  ctx.restore();
  const total = widths.reduce((a, b) => a + b, 0);
  let x = width / 2 - total / 2;
  const centres: Record<string, number> = {};
  const eqY = 112;
  pieces.forEach((p, i) => {
    const w = widths[i]!;
    label(ctx, p.text, x, eqY, { color: p.side === "op" ? theme.muted : theme.text, font, align: "left" });
    if (p.side !== "op") centres[`${p.side}${p.index}`] = x + w / 2;
    x += w;
  });

  const bracket = (from: number, to: number, y: number, tip: number, colour: string, words: string) => {
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(from, tip);
    ctx.lineTo(from, y);
    ctx.lineTo(to, y);
    ctx.stroke();
    ctx.restore();
    arrow(ctx, to, y, to, tip, { color: colour, width: 2, head: 7 });
    const mid = clamp((from + to) / 2, pad + 70, width - pad - 70);
    label(ctx, words, mid, y + (y < eqY ? -12 : 12), { color: colour, font: theme.font, align: "center" });
  };
  const ox = r.oxidised;
  const red = r.reduced;
  bracket(centres[`r${ox.reactant}`] ?? pad, centres[`p${ox.product}`] ?? width - pad, 80, eqY - 12, theme.secant, `oxidised: ${ox.how}`);
  bracket(centres[`r${red.reactant}`] ?? pad, centres[`p${red.product}`] ?? width - pad, 144, eqY + 12, theme.sine, `reduced: ${red.how}`);

  const oxidised = r.equation.reactants[ox.reactant]!.formula;
  const reduced = r.equation.reactants[red.reactant]!.formula;
  label(ctx, `Oxidising agent: ${reduced}`, width / 2, 186, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `Reducing agent: ${oxidised}`, width / 2, 206, { color: theme.text, font: theme.font, align: "center" });

  // A heated tube: the solid changes colour as it reacts.
  const progress = clamp(num(results.redoxProgress), 0, 1);
  const tx0 = pad + 30;
  const tx1 = width - pad - 30;
  const ty = 262;
  box(ctx, tx0, ty - 16, tx1 - tx0, 32, null, theme.axis, 16);
  box(ctx, (tx0 + tx1) / 2 - 40, ty - 2, 80, 14, mix(r.before, r.after, progress), theme.muted, 4);
  ctx.save();
  ctx.fillStyle = theme.secant;
  ctx.beginPath();
  const fx = (tx0 + tx1) / 2;
  ctx.moveTo(fx - 10, ty + 44);
  ctx.quadraticCurveTo(fx, ty + 12, fx + 10, ty + 44);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (labels) label(ctx, `${reduced} ${red.how}; ${oxidised} ${ox.how}`, width / 2, layout.captionY, { color: theme.text, font: theme.font, align: "center" });
  if (labels) label(ctx, `${pct(progress)} reacted`, width / 2, ty - 26, { color: theme.muted, font: theme.font, align: "center" });
}

// ── Acids with metals, carbonates, an oxide and a base ───────────────────────

function drawAcid(ctx: CanvasRenderingContext2D, layout: MetalAcidLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width, pad, height } = layout;
  const id = pick(METALACID_COMPOUND_ORDER, results.compound);
  const c = METALACID_COMPOUNDS[id];
  const progress = clamp(num(results.acidProgress), 0, 1);
  const test = Math.round(num(results.gasTest));
  label(ctx, `${c.name} + dilute HCl`, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, metalAcidEquationText(c.equation), width / 2, 40, { color: theme.text, font: theme.font, align: "center" });

  // The flask.
  const fx = pad + (width - 2 * pad) * 0.3;
  const neckTop = 76;
  const neckBottom = 130;
  const base = height - 92;
  const half = Math.min(70, (width - 2 * pad) * 0.26);
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(fx - 12, neckTop);
    ctx.lineTo(fx - 12, neckBottom);
    ctx.lineTo(fx - half, base);
    ctx.lineTo(fx + half, base);
    ctx.lineTo(fx + 12, neckBottom);
    ctx.lineTo(fx + 12, neckTop);
  };
  ctx.save();
  ctx.beginPath();
  const level = base - 80;
  const wAt = 12 + ((half - 12) * (level - neckBottom)) / (base - neckBottom);
  ctx.moveTo(fx - wAt, level);
  ctx.lineTo(fx - half, base);
  ctx.lineTo(fx + half, base);
  ctx.lineTo(fx + wAt, level);
  ctx.closePath();
  ctx.fillStyle = c.blue ? mix("#cbd5e1", "#14b8a6", progress) : "#cbd5e1";
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  outline();
  ctx.stroke();
  ctx.restore();

  // The solid left at the bottom.
  const leftOver = 1 - progress;
  const pieces = Math.round(8 * leftOver);
  const solidColour = id === "copper-oxide" ? "#1f2937" : id === "zinc" ? "#a1a1aa" : "#f8fafc";
  for (let i = 0; i < pieces; i++) {
    const [a] = scatter(i + 30);
    dot(ctx, fx - half * 0.6 + a * half * 1.2, base - 6, 5, solidColour, theme.muted);
  }
  const bubbles = Math.round(12 * clamp(num(results.bubbling), 0, 1));
  for (let i = 0; i < bubbles; i++) {
    const [a, b] = scatter(i + 70);
    dot(ctx, fx - half * 0.5 + a * half, level + 8 + b * (base - level - 22), 2.5, "#ffffff", theme.muted);
  }

  // The delivery tube to a test tube on the right.
  const tx = pad + (width - 2 * pad) * 0.8;
  const tTop = 150;
  const tBottom = base;
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx, neckTop + 6);
  ctx.lineTo(fx, 64);
  ctx.lineTo(tx, 64);
  ctx.lineTo(tx, c.gas === 2 ? tBottom - 20 : tTop + 10);
  ctx.stroke();
  ctx.restore();
  if (c.gas === 2 || c.gas === 0) {
    const milky = test === 2;
    box(ctx, tx - 14, tTop + 40, 28, tBottom - tTop - 40, milky ? "#f8fafc" : "#cbd5e1", null, 8, milky ? 0.9 : 0.3);
  }
  box(ctx, tx - 14, tTop, 28, tBottom - tTop, null, theme.axis, 8);
  if (c.gas === 1) {
    // A burning splint at the mouth.
    box(ctx, tx + 10, tTop - 34, 30, 4, "#a16207", null, 2);
    dot(ctx, tx + 10, tTop - 32, 4, theme.secant);
    if (test === 1) label(ctx, "pop!", tx, tTop - 52, { color: theme.secant, font: theme.fontStrong, align: "center" });
  }
  const tubeWords = c.gas === 1 ? "lit splint" : "limewater";
  label(ctx, tubeWords, tx, tBottom + 14, { color: theme.muted, font: theme.font, align: "center" });

  if (labels) {
    label(ctx, `pH ${num(results.beakerPH).toFixed(2)}`, fx, base + 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const words =
      c.gas === 2 ? (test === 2 ? "Carbon dioxide turns limewater milky" : "Carbon dioxide is on its way")
        : c.gas === 1 ? (test === 1 ? "Hydrogen burns with a pop" : "Hydrogen is on its way")
          : id === "copper-oxide" ? "Metal oxide + acid → salt + water" : "Acid + base → salt + water";
    label(ctx, words, width / 2, layout.captionY, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── The pH scale and indicators ──────────────────────────────────────────────

function drawPH(ctx: CanvasRenderingContext2D, layout: MetalAcidLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { width, pad } = layout;
  const id = pick(METALACID_SUBSTANCE_ORDER, results.substance);
  const s = METALACID_SUBSTANCES[id];
  const pH = num(results.pH, s.pH);
  const labels = has("labels");
  label(ctx, s.name, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
  box(ctx, width / 2 - 36, 38, 72, 74, universalColour(pH), theme.axis, 8);

  const x0 = pad;
  const x1 = width - pad;
  const barY = 148;
  const unit = (x1 - x0) / 15;
  UNIVERSAL_COLOURS.forEach((colour, i) => box(ctx, x0 + i * unit, barY, unit, 22, colour, null, 0));
  for (let p = 0; p <= 14; p += 2) label(ctx, String(p), x0 + (p + 0.5) * unit, barY + 34, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "acidic", x0, barY + 52, { color: theme.text, font: theme.font, align: "left" });
  label(ctx, "neutral", x0 + 7.5 * unit, barY + 52, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, "basic", x1, barY + 52, { color: theme.text, font: theme.font, align: "right" });
  if (labels) {
    const px = x0 + (clamp(pH, 0, 14) + 0.5) * unit;
    ctx.save();
    ctx.fillStyle = theme.text;
    ctx.beginPath();
    ctx.moveTo(px, barY - 2);
    ctx.lineTo(px - 6, barY - 12);
    ctx.lineTo(px + 6, barY - 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    label(ctx, `pH ${pH.toFixed(1)}`, clamp(px, x0 + 24, x1 - 24), barY - 22, { color: theme.text, font: theme.fontStrong, align: "center" });
  }

  if (has("indicators")) {
    INDICATORS.forEach((ind, i) => {
      const y = 232 + i * 24;
      const k = clamp(Math.round(num(results[ind.key])), 0, ind.colours.length - 1);
      dot(ctx, pad + 8, y, 7, ind.colours[k]!, theme.muted);
      label(ctx, `${ind.name}: ${ind.words[k]}`, pad + 22, y, { color: theme.text, font: theme.font, align: "left" });
    });
  }

  if (labels) {
    const nature = NATURE_WORDS[clamp(Math.round(num(results.nature)), 0, 2)];
    label(ctx, `pH ${pH.toFixed(1)}: ${nature}`, width / 2, layout.captionY, { color: theme.text, font: theme.fontStrong, align: "center" });
  }
}

// ── Salts ────────────────────────────────────────────────────────────────────

function drawSalts(ctx: CanvasRenderingContext2D, layout: MetalAcidLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width, pad } = layout;
  const id = pick(METALACID_SALT_ORDER, results.salt);
  const s = METALACID_SALTS[id];
  label(ctx, s.common, width / 2, 20, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, s.formula, width / 2, 48, { color: theme.text, font: layout.compact ? "600 18px ui-sans-serif, system-ui, sans-serif" : "600 20px ui-sans-serif, system-ui, sans-serif", align: "center" });
  label(ctx, s.name, width / 2, 74, { color: theme.muted, font: theme.font, align: "center" });

  // A crystal, with its water molecules around it when labels are on.
  const cx = width / 2;
  const cy = 128;
  const crystal = id === "blue-vitriol" ? "#2563eb" : "#e2e8f0";
  ctx.save();
  ctx.fillStyle = crystal;
  ctx.strokeStyle = theme.muted;
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 3) * k;
    const px = cx + 24 * Math.cos(a);
    const py = cy + 24 * Math.sin(a);
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const water = num(results.water);
  if (labels) {
    const whole = Math.floor(water);
    const half = water - whole >= 0.5;
    const count = whole + (half ? 1 : 0);
    for (let i = 0; i < count; i++) {
      const a = (2 * Math.PI * i) / Math.max(1, count) - Math.PI / 2;
      const r = 40;
      const isHalf = half && i === count - 1;
      ctx.save();
      ctx.fillStyle = theme.sine;
      ctx.beginPath();
      if (isHalf) ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 6, Math.PI / 2, (3 * Math.PI) / 2);
      else ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const w = water === 0.5 ? "½" : String(water);
    label(ctx, water === 0 ? "No water of crystallisation" : `Water of crystallisation: ${w} H₂O`, width / 2, 188, { color: theme.sine, font: theme.font, align: "center" });
    label(ctx, `Its solution is ${NATURE_WORDS[s.nature]}`, width / 2, 210, { color: theme.text, font: theme.font, align: "center" });
  }

  label(ctx, s.reaction, width / 2, 244, { color: theme.text, font: theme.font, align: "center" });
  const lines = wrapText(ctx, `Used for: ${s.use}`, width - 2 * pad, theme.font);
  lines.slice(0, 3).forEach((line, i) => label(ctx, line, width / 2, 278 + i * 18, { color: theme.muted, font: theme.font, align: "center" }));
}

export const metalAcidRenderer: SimulationRenderer<MetalAcidLayout> = {
  id: "metalacid",
  layout: (width) => computeMetalAcidLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);
    const r = results as Record<string, unknown>;
    if (has("element")) drawElement(ctx, layout, r, theme, has("labels"));
    else if (has("corrosion")) drawCorrosion(ctx, layout, r, theme, has("labels"));
    else if (has("series") || has("beaker")) drawSeries(ctx, layout, r, theme, has);
    else if (has("redox")) drawRedox(ctx, layout, r, theme, has("labels"));
    else if (has("acid")) drawAcid(ctx, layout, r, theme, has("labels"));
    else if (has("phscale")) drawPH(ctx, layout, r, theme, has);
    else if (has("salts")) drawSalts(ctx, layout, r, theme, has("labels"));
  },
};
