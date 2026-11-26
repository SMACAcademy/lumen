/**
 * Combustion, fuels and flames: seven small benches, one per mode.
 *
 *   burn      — a material on a stand, the fire triangle, and bars for its
 *               temperature and the oxygen around it
 *   jar       — a candle under a jar, and the oxygen falling
 *   cup       — a paper cup over a flame, with or without water
 *   flame     — a candle flame, close up, with a probe in it
 *   fire      — a fire and what is used to put it out
 *   fuel      — every fuel's calorific value as a bar, and the heat from a mass
 *   products  — petroleum's refinery column, or coal heated without air
 *
 * Numbers a level asks the learner to estimate (the paper's temperature, the
 * heat a fuel gives, calorific values) appear only with the "labels" layer.
 */

import {
  COMBUST_AGENT_ORDER,
  COMBUST_AGENTS,
  COMBUST_CUP_ORDER,
  COMBUST_FIRE_ORDER,
  COMBUST_FIRES,
  COMBUST_FLAME_DARK,
  COMBUST_FLAME_LUMINOUS,
  COMBUST_FLAME_OUTER,
  COMBUST_FUEL_ORDER,
  COMBUST_FUELS,
  COMBUST_JAR_ORDER,
  COMBUST_MATERIAL_ORDER,
  COMBUST_MATERIALS,
  COMBUST_OXYGEN_AIR,
  COMBUST_OXYGEN_MIN,
  COMBUST_PRODUCT_ORDER,
  COMBUST_PRODUCTS,
  COMBUST_ZONES,
  combustCalorific,
  combustFight,
} from "@ise/chemistry-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface CombustionLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Side margin. */
  pad: number;
  /** Baseline of the caption along the bottom. */
  captionY: number;
}

export function computeCombustionLayout(width: number): CombustionLayout {
  const compact = width < 560;
  const height = compact ? 380 : 400;
  return { width, height, compact, pad: 16, captionY: height - 14 };
}

/** Colours of things themselves (flames, wax, water), not theme roles. */
const FLAME_YELLOW = "#facc15";
const FLAME_ORANGE = "#f97316";
const FLAME_BLUE = "#60a5fa";
const WAX = "#f5f5f4";
const WATER = "#3b82f6";
const MATERIAL_COLOURS: Readonly<Record<string, string>> = {
  lpg: "#e2e8f0", petrol: "#fde68a", alcohol: "#e0f2fe", kerosene: "#fef3c7", paper: "#f8fafc",
  wood: "#a16207", charcoal: "#1f2937", stone: "#78716c", glass: "#bae6fd", "iron-nail": "#71717a",
};

const SIDE_WORDS = ["nothing", "the fuel", "the air", "the heat"];
const POLLUTION_WORDS = ["none: only water", "little", "some", "a lot"];
const STATE_WORDS = ["solid", "liquid", "gas"];

type Results = Record<string, unknown>;

const pick = <T>(order: readonly T[], value: unknown): T => order[clamp(Math.round(num(value)), 0, order.length - 1)]!;
/** 55000 → "55 000". */
export const combustThousands = (v: number) => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

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
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}

/** A teardrop flame standing on (x, base), `w` wide and `h` tall. */
function flame(ctx: CanvasRenderingContext2D, x: number, base: number, w: number, h: number) {
  const tear = (scale: number, colour: string) => {
    const hh = h * scale;
    const ww = w * scale;
    ctx.beginPath();
    ctx.moveTo(x, base - hh);
    ctx.quadraticCurveTo(x + ww, base - hh * 0.35, x, base);
    ctx.quadraticCurveTo(x - ww, base - hh * 0.35, x, base - hh);
    ctx.fillStyle = colour;
    ctx.fill();
  };
  ctx.save();
  tear(1, FLAME_ORANGE);
  tear(0.65, FLAME_YELLOW);
  ctx.restore();
}

/** A horizontal gauge: `value` on a scale from `lo` to `hi`. */
function gauge(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, value: number, lo: number, hi: number, colour: string, theme: LabTheme) {
  box(ctx, x, y - 6, w, 12, theme.grid, theme.muted, 6);
  const f = clamp((value - lo) / (hi - lo), 0, 1);
  if (f > 0) box(ctx, x, y - 6, Math.max(6, w * f), 12, colour, null, 6);
}

/** The x of `value` on a gauge. */
const along = (x: number, w: number, value: number, lo: number, hi: number) => x + w * clamp((value - lo) / (hi - lo), 0, 1);

/** The fire triangle: sides lit when that need is met. */
function triangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, side: number, met: { fuel: boolean; heat: boolean; air: boolean }, theme: LabTheme) {
  const h = (side * Math.sqrt(3)) / 2;
  const top = { x: cx, y: cy - (2 * h) / 3 };
  const left = { x: cx - side / 2, y: cy + h / 3 };
  const right = { x: cx + side / 2, y: cy + h / 3 };
  const edge = (a: { x: number; y: number }, b: { x: number; y: number }, ok: boolean) => {
    ctx.save();
    ctx.strokeStyle = ok ? theme.tangent : theme.secant;
    ctx.lineWidth = ok ? 4 : 2;
    ctx.setLineDash(ok ? [] : [5, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  };
  edge(left, right, met.fuel);
  edge(left, top, met.heat);
  edge(top, right, met.air);
  label(ctx, "FUEL", cx, left.y + 14, { color: met.fuel ? theme.tangent : theme.secant, font: theme.fontStrong, align: "center" });
  label(ctx, "HEAT", (left.x + top.x) / 2 - 8, (left.y + top.y) / 2, { color: met.heat ? theme.tangent : theme.secant, font: theme.fontStrong, align: "right" });
  label(ctx, "AIR", (right.x + top.x) / 2 + 8, (right.y + top.y) / 2, { color: met.air ? theme.tangent : theme.secant, font: theme.fontStrong, align: "left" });
}

// ── Burn ─────────────────────────────────────────────────────────────────────

function drawBurn(ctx: CanvasRenderingContext2D, layout: CombustionLayout, results: Results, theme: LabTheme, labels: boolean) {
  const { width, pad } = layout;
  const id = pick(COMBUST_MATERIAL_ORDER, results.material);
  const m = COMBUST_MATERIALS[id];
  const burning = num(results.burning) === 1;
  const temperature = num(results.temperature);
  const oxygen = num(results.oxygen);
  label(ctx, m.name, width / 2, 20, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The material in a dish on a stand, a flame above it when it burns.
  const mx = width * 0.27;
  const base = 128;
  box(ctx, mx - 34, base, 68, 8, theme.neutral, theme.muted, 2);
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mx - 26, base + 8);
  ctx.lineTo(mx - 30, base + 34);
  ctx.moveTo(mx + 26, base + 8);
  ctx.lineTo(mx + 30, base + 34);
  ctx.stroke();
  ctx.restore();
  const colour = MATERIAL_COLOURS[id] ?? theme.neutral;
  if (m.state === 2) {
    for (let i = 0; i < 5; i++) dot(ctx, mx - 20 + i * 10, base - 10 - (i % 2) * 8, 4, colour, theme.muted);
  } else if (m.state === 1) {
    box(ctx, mx - 30, base - 8, 60, 8, colour, theme.muted, 3);
  } else {
    box(ctx, mx - 26, base - 20, 52, 20, colour, theme.muted, 3);
  }
  if (burning) flame(ctx, mx, base - (m.state === 0 ? 20 : 8), 22, 62);

  triangle(ctx, width * 0.72, 92, Math.min(110, width * 0.3), { fuel: num(results.hasFuel) === 1, heat: num(results.hotEnough) === 1, air: num(results.enoughAir) === 1 }, theme);

  // Temperature, 0 to 500 °C, with the ignition temperature marked when labels are on.
  const gx = pad;
  const gw = width - 2 * pad;
  label(ctx, `Heated to ${Math.round(temperature)} °C`, pad, 190, { color: theme.text, font: theme.font, align: "left" });
  gauge(ctx, gx, 210, gw, temperature, 0, 500, theme.angle, theme);
  if (labels && m.combustible && m.ignition > 0) {
    const ix = along(gx, gw, m.ignition, 0, 500);
    ctx.save();
    ctx.strokeStyle = theme.secant;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ix, 200);
    ctx.lineTo(ix, 220);
    ctx.stroke();
    ctx.restore();
    label(ctx, `catches fire at ${m.ignition} °C`, gx + gw, 190, { color: theme.secant, font: theme.font, align: "right" });
  }

  // Oxygen, 0 to 21 %, with the 16 % limit.
  label(ctx, `Oxygen in the air: ${oxygen.toFixed(1)} %`, pad, 244, { color: theme.text, font: theme.font, align: "left" });
  gauge(ctx, gx, 264, gw, oxygen, 0, COMBUST_OXYGEN_AIR, theme.sine, theme);
  const lx = along(gx, gw, COMBUST_OXYGEN_MIN, 0, COMBUST_OXYGEN_AIR);
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(lx, 254);
  ctx.lineTo(lx, 274);
  ctx.stroke();
  ctx.restore();
  label(ctx, `${COMBUST_OXYGEN_MIN} %`, lx, 284, { color: theme.muted, font: theme.font, align: "center" });

  label(ctx, m.note, width / 2, 314, { color: theme.muted, font: theme.font, align: "center" });

  if (labels) {
    const missing = Math.round(num(results.missing));
    const words = burning
      ? "It burns: fuel, heat and air are all there"
      : missing === 1
        ? "Not a fuel: it cannot burn"
        : missing === 3
          ? `Too cold: it needs ${m.ignition} °C`
          : `Too little oxygen: below ${COMBUST_OXYGEN_MIN} %`;
    label(ctx, words, width / 2, layout.captionY, { color: burning ? theme.tangent : theme.secant, font: theme.fontStrong, align: "center" });
  }
}

// ── Jar ──────────────────────────────────────────────────────────────────────

function candle(ctx: CanvasRenderingContext2D, x: number, table: number, lit: boolean, theme: LabTheme) {
  box(ctx, x - 9, table - 56, 18, 56, WAX, theme.muted, 2);
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, table - 56);
  ctx.lineTo(x, table - 63);
  ctx.stroke();
  ctx.restore();
  if (lit) flame(ctx, x, table - 60, 10, 34);
  else {
    // A wisp of smoke.
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, table - 64);
    ctx.quadraticCurveTo(x + 8, table - 76, x, table - 88);
    ctx.quadraticCurveTo(x - 8, table - 100, x, table - 112);
    ctx.stroke();
    ctx.restore();
  }
}

function drawJar(ctx: CanvasRenderingContext2D, layout: CombustionLayout, results: Results, theme: LabTheme, labels: boolean) {
  const { width, pad } = layout;
  const closed = pick(COMBUST_JAR_ORDER, results.jar) === "closed";
  const lit = num(results.candleLit) === 1;
  const volume = num(results.jarVolume, 1);
  const oxygen = num(results.jarOxygen, COMBUST_OXYGEN_AIR);
  const time = num(results.time);
  label(ctx, closed ? `Candle under a ${volume} L jar: ${Math.round(time)} s` : `Candle in the open air: ${Math.round(time)} s`, width / 2, 20, { color: theme.text, font: theme.fontStrong, align: "center" });

  const cx = width / 2;
  const table = 250;
  box(ctx, pad, table, width - 2 * pad, 8, theme.neutral, null, 2, 0.6);
  candle(ctx, cx, table, lit, theme);
  if (closed) {
    // The jar grows with its volume (as the cube root, like a real jar).
    const s = Math.cbrt(volume / 2);
    const w = 150 * s;
    const h = 190 * s;
    box(ctx, cx - w / 2, table - h, w, h, theme.sine, theme.sine, 14, 0.12);
    box(ctx, cx - w / 2, table - h, w, h, null, theme.sine, 14);
  } else {
    arrow(ctx, cx - 70, table - 40, cx - 24, table - 40, { color: theme.sine, width: 2 });
    arrow(ctx, cx + 70, table - 40, cx + 24, table - 40, { color: theme.sine, width: 2 });
    label(ctx, "fresh air", cx - 70, table - 58, { color: theme.sine, font: theme.font, align: "center" });
  }

  // Oxygen gauge.
  const gx = pad;
  const gw = width - 2 * pad;
  label(ctx, "Oxygen in the jar", pad, 280, { color: theme.text, font: theme.font, align: "left" });
  gauge(ctx, gx, 300, gw, oxygen, 0, COMBUST_OXYGEN_AIR, theme.sine, theme);
  const lx = along(gx, gw, COMBUST_OXYGEN_MIN, 0, COMBUST_OXYGEN_AIR);
  ctx.save();
  ctx.strokeStyle = theme.secant;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(lx, 290);
  ctx.lineTo(lx, 310);
  ctx.stroke();
  ctx.restore();
  label(ctx, `goes out at ${COMBUST_OXYGEN_MIN} %`, lx, 322, { color: theme.secant, font: theme.font, align: "right" });

  if (labels) {
    label(ctx, `${oxygen.toFixed(1)} %`, gx + gw, 280, { color: theme.sine, font: theme.fontStrong, align: "right" });
    const burnTime = num(results.burnTime);
    const words = !closed
      ? "Fresh air keeps reaching the flame"
      : lit
        ? `This jar keeps it alight for ${burnTime.toFixed(1)} s`
        : `Out after ${burnTime.toFixed(1)} s: too little oxygen`;
    label(ctx, words, width / 2, layout.captionY, { color: lit ? theme.tangent : theme.secant, font: theme.fontStrong, align: "center" });
  }
}

// ── Cup ──────────────────────────────────────────────────────────────────────

function drawCup(ctx: CanvasRenderingContext2D, layout: CombustionLayout, results: Results, theme: LabTheme, labels: boolean) {
  const { width, pad } = layout;
  const water = pick(COMBUST_CUP_ORDER, results.cup) === "water";
  const temp = num(results.cupTemp, 30);
  const burning = num(results.cupBurning) === 1;
  const boiling = num(results.waterBoiling) === 1;
  const time = Math.round(num(results.time));
  label(ctx, `${water ? "Paper cup of water" : "Empty paper cup"} on a flame: ${time} s`, width / 2, 20, { color: theme.text, font: theme.fontStrong, align: "center" });

  const cx = width * 0.4;
  // Burner and its flame.
  box(ctx, cx - 14, 270, 28, 40, theme.neutral, theme.muted, 3);
  flame(ctx, cx, 270, 14, 44);
  // Stand.
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 60, 214);
  ctx.lineTo(cx + 60, 214);
  ctx.moveTo(cx - 50, 214);
  ctx.lineTo(cx - 60, 310);
  ctx.moveTo(cx + 50, 214);
  ctx.lineTo(cx + 60, 310);
  ctx.stroke();
  ctx.restore();

  // The cup: a trapezium, wider at the top.
  const top = 110;
  const bottom = 212;
  const paper = burning ? "#44403c" : "#fafaf9";
  ctx.save();
  ctx.fillStyle = paper;
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 44, top);
  ctx.lineTo(cx + 44, top);
  ctx.lineTo(cx + 32, bottom);
  ctx.lineTo(cx - 32, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (water) {
    ctx.fillStyle = WATER;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - 40, top + 20);
    ctx.lineTo(cx + 40, top + 20);
    ctx.lineTo(cx + 32, bottom - 2);
    ctx.lineTo(cx - 32, bottom - 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (water && boiling) for (let i = 0; i < 5; i++) dot(ctx, cx - 24 + i * 12, top + 40 + (i % 2) * 30, 3, "#e0f2fe");
  if (water && boiling) {
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1.5;
    for (const dx of [-16, 0, 16]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, top - 6);
      ctx.quadraticCurveTo(cx + dx + 8, top - 22, cx + dx, top - 38);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (burning) flame(ctx, cx, top + 10, 40, 80);

  // Thermometer for the paper, only with labels (a level asks for this value).
  if (labels) {
    const tx = Math.min(width - pad - 40, cx + 110);
    const t0 = 80;
    const t1 = 280;
    const yOf = (t: number) => t1 - ((t1 - t0) * clamp(t, 0, 300)) / 300;
    box(ctx, tx - 5, t0, 10, t1 - t0, theme.grid, theme.muted, 5);
    box(ctx, tx - 5, yOf(temp), 10, t1 - yOf(temp), theme.secant, null, 5);
    dot(ctx, tx, t1 + 6, 9, theme.secant);
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - 12, yOf(COMBUST_MATERIALS.paper.ignition));
    ctx.lineTo(tx + 12, yOf(COMBUST_MATERIALS.paper.ignition));
    ctx.stroke();
    ctx.restore();
    label(ctx, `${COMBUST_MATERIALS.paper.ignition} °C`, tx + 14, yOf(COMBUST_MATERIALS.paper.ignition) - 10, { color: theme.angle, font: theme.font, align: "left" });
    label(ctx, "Paper", tx, t0 - 26, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `${Math.round(temp)} °C`, tx, t0 - 10, { color: theme.secant, font: theme.fontStrong, align: "center" });

    const words = burning
      ? "The paper reached 230 °C: it catches fire"
      : water
        ? boiling
          ? "Water boils at 100 °C: the paper stays cool"
          : "The water carries the heat away"
        : "The paper heats up fast";
    label(ctx, words, width / 2, layout.captionY, { color: burning ? theme.secant : theme.tangent, font: theme.fontStrong, align: "center" });
  }
}

// ── Flame ────────────────────────────────────────────────────────────────────

function drawFlame(ctx: CanvasRenderingContext2D, layout: CombustionLayout, results: Results, theme: LabTheme, labels: boolean) {
  const { width } = layout;
  label(ctx, "A candle flame, close up", width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
  const s = 3.8;
  const cx = width / 2;
  const topY = 34;
  const toX = (mm: number) => cx + mm * s;
  const toY = (mm: number) => topY + (60 - mm) * s;
  const oval = (o: { cx: number; cy: number; a: number; b: number }, fill: string, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(toX(o.cx), toY(o.cy), o.a * s, o.b * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  oval(COMBUST_FLAME_OUTER, FLAME_BLUE, 0.45);
  oval(COMBUST_FLAME_LUMINOUS, FLAME_YELLOW, 0.95);
  oval(COMBUST_FLAME_DARK, "#1c1917", 0.85);

  // Wick and candle.
  const wick = toY(0);
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, wick);
  ctx.lineTo(cx, wick + 12);
  ctx.stroke();
  ctx.restore();
  box(ctx, cx - 30, wick + 12, 60, 24, WAX, theme.muted, 3);

  // Zone names, beside the flame, only with labels.
  if (labels) {
    const right = cx + COMBUST_FLAME_OUTER.a * s + 10;
    const left = cx - COMBUST_FLAME_OUTER.a * s - 10;
    label(ctx, "outer:", right, toY(42), { color: FLAME_BLUE, font: theme.font, align: "left" });
    label(ctx, "hottest", right, toY(38), { color: FLAME_BLUE, font: theme.font, align: "left" });
    label(ctx, "luminous:", left, toY(32), { color: FLAME_YELLOW, font: theme.font, align: "right" });
    label(ctx, "partial", left, toY(28), { color: FLAME_YELLOW, font: theme.font, align: "right" });
    label(ctx, "dark:", right, toY(8), { color: theme.muted, font: theme.font, align: "left" });
    label(ctx, "wax vapour", right, toY(4), { color: theme.muted, font: theme.font, align: "left" });
  }

  // The probe.
  const px = toX(num(results.probeX));
  const py = toY(num(results.probeY, 25));
  ctx.save();
  ctx.strokeStyle = theme.point;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(px - 8, py);
  ctx.lineTo(px + 8, py);
  ctx.moveTo(px, py - 8);
  ctx.lineTo(px, py + 8);
  ctx.stroke();
  ctx.restore();
  dot(ctx, px, py, 3.5, theme.point, theme.text);

  const zone = clamp(Math.round(num(results.zone)), 0, 3);
  const z = COMBUST_ZONES[zone]!;
  const y0 = wick + 54;
  label(ctx, `Probe: ${z.name}`, width / 2, y0, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (zone > 0) label(ctx, z.burning, width / 2, y0 + 20, { color: theme.muted, font: theme.font, align: "center" });
  if (labels && zone > 0) label(ctx, z.sign, width / 2, layout.captionY, { color: theme.tangent, font: theme.fontStrong, align: "center" });
}

// ── Fire ─────────────────────────────────────────────────────────────────────

function drawFire(ctx: CanvasRenderingContext2D, layout: CombustionLayout, results: Results, theme: LabTheme, labels: boolean) {
  const { width } = layout;
  const fireId = pick(COMBUST_FIRE_ORDER, results.fire);
  const agentId = pick(COMBUST_AGENT_ORDER, results.agent);
  const fight = combustFight(fireId, agentId);
  const out = num(results.fireOut) === 1;
  label(ctx, COMBUST_FIRES[fireId].name, width / 2, 20, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, `Tried: ${COMBUST_AGENTS[agentId]}`, width / 2, 42, { color: theme.muted, font: theme.font, align: "center" });

  const cx = width / 2;
  const base = 200;
  // What is burning.
  if (fireId === "wood") {
    box(ctx, cx - 50, base - 14, 100, 14, "#a16207", theme.muted, 4);
    box(ctx, cx - 40, base - 26, 80, 12, "#854d0e", theme.muted, 4);
  } else if (fireId === "paper") {
    box(ctx, cx - 40, base - 10, 80, 10, "#f8fafc", theme.muted, 2);
  } else if (fireId === "electrical") {
    box(ctx, cx - 30, base - 40, 60, 40, theme.neutral, theme.muted, 4);
    dot(ctx, cx - 10, base - 20, 4, theme.text);
    dot(ctx, cx + 10, base - 20, 4, theme.text);
  } else if (fireId === "petrol") {
    ctx.save();
    ctx.fillStyle = "#fde68a";
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(cx, base - 4, 60, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    box(ctx, cx - 50, base - 12, 100, 12, theme.neutral, theme.muted, 3);
    box(ctx, cx + 60, base - 60, 28, 60, theme.secant, theme.muted, 6);
  }
  const top = fireId === "electrical" ? base - 40 : base - 14;
  if (!out) flame(ctx, cx, top, 46, 110);
  else {
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 2;
    for (const dx of [-20, 0, 20]) {
      ctx.beginPath();
      ctx.moveTo(cx + dx, top - 4);
      ctx.quadraticCurveTo(cx + dx + 10, top - 30, cx + dx, top - 56);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (agentId === "water") for (let i = 0; i < 6; i++) dot(ctx, cx - 50 + i * 20, 70 + (i % 2) * 12, 4, WATER);
  if (agentId === "sand") for (let i = 0; i < 8; i++) dot(ctx, cx - 56 + i * 16, base - 2 - (i % 3) * 4, 3, "#d6b36a");
  if (agentId === "co2") for (let i = 0; i < 6; i++) dot(ctx, cx - 50 + i * 20, 76 + (i % 2) * 10, 6, "#e2e8f0", theme.muted);

  label(ctx, `Water on this fire: ${COMBUST_FIRES[fireId].waterSafe ? "safe" : "never"}`, width / 2, 240, {
    color: COMBUST_FIRES[fireId].waterSafe ? theme.tangent : theme.secant, font: theme.font, align: "center",
  });
  label(ctx, fight.note, width / 2, 270, { color: theme.text, font: theme.font, align: "center" });
  if (labels) {
    const side = clamp(Math.round(num(results.sideRemoved)), 0, 3);
    if (out) label(ctx, `It takes away ${SIDE_WORDS[side]}`, width / 2, 300, { color: theme.muted, font: theme.font, align: "center" });
    const danger = num(results.danger) === 1;
    label(ctx, out ? "The fire is out" : danger ? "Dangerous: the fire is not out" : "Still burning", width / 2, layout.captionY, {
      color: out ? theme.tangent : theme.secant, font: theme.fontStrong, align: "center",
    });
  }
}

// ── Fuel ─────────────────────────────────────────────────────────────────────

function drawFuel(ctx: CanvasRenderingContext2D, layout: CombustionLayout, results: Results, theme: LabTheme, labels: boolean) {
  const { width, pad } = layout;
  const id = pick(COMBUST_FUEL_ORDER, results.fuel);
  const f = COMBUST_FUELS[id];
  label(ctx, labels ? "Calorific value, kJ/kg" : "Calorific value: heat from 1 kg", width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });

  const nameW = 98;
  const x0 = pad + nameW;
  const x1 = width - pad - (labels && !layout.compact ? 60 : 0);
  const max = 150000;
  const rowH = 19;
  const top = 42;
  COMBUST_FUEL_ORDER.forEach((fuelId, i) => {
    const fuel = COMBUST_FUELS[fuelId];
    const y = top + i * rowH;
    const selected = fuelId === id;
    if (selected) box(ctx, pad - 6, y - rowH / 2, width - 2 * pad + 12, rowH, theme.grid, null, 4);
    label(ctx, fuel.name, pad, y, { color: selected ? theme.text : theme.muted, font: selected ? theme.fontStrong : theme.font, align: "left" });
    const wLow = ((x1 - x0) * fuel.low) / max;
    const wHigh = ((x1 - x0) * fuel.high) / max;
    if (wHigh > wLow) box(ctx, x0, y - 5, Math.max(2, wHigh), 10, selected ? theme.angle : theme.neutral, null, 3, 0.35);
    box(ctx, x0, y - 5, Math.max(2, wLow), 10, selected ? theme.angle : theme.neutral, null, 3, selected ? 1 : 0.6);
    if (labels && !layout.compact) {
      const text = fuel.low === fuel.high ? combustThousands(fuel.low) : `${fuel.low / 1000}–${fuel.high / 1000}k`;
      label(ctx, text, x1 + 6, y, { color: theme.muted, font: theme.font, align: "left" });
    }
  });

  const y = top + COMBUST_FUEL_ORDER.length * rowH + 10;
  label(ctx, `${f.name}: ${STATE_WORDS[f.state]}, ${f.fossil ? "a fossil fuel" : "not a fossil fuel"}`, pad, y, { color: theme.text, font: theme.font, align: "left" });
  label(ctx, `Pollution: ${POLLUTION_WORDS[f.pollution]}${f.so2 ? ", with SO₂" : ""}`, pad, y + 20, { color: f.pollution >= 3 ? theme.secant : theme.text, font: theme.font, align: "left" });
  label(ctx, f.note, pad, y + 40, { color: theme.muted, font: theme.font, align: "left" });
  const mass = num(results.mass);
  label(ctx, `Burning ${mass.toFixed(1)} kg of ${f.name.toLowerCase()}`, pad, y + 64, { color: theme.text, font: theme.font, align: "left" });

  if (labels) {
    const cv = combustCalorific(f);
    const range = f.low === f.high ? "" : " (middle)";
    label(ctx, `Calorific value: ${combustThousands(cv)} kJ/kg${range}`, pad, y + 84, { color: theme.angle, font: theme.font, align: "left" });
    label(ctx, `Heat = ${mass.toFixed(1)} × ${combustThousands(cv)} = ${combustThousands(num(results.heat))} kJ`, width / 2, layout.captionY, {
      color: theme.angle, font: theme.fontStrong, align: "center",
    });
  }
}

// ── Coal and petroleum products ──────────────────────────────────────────────

function drawProducts(ctx: CanvasRenderingContext2D, layout: CombustionLayout, results: Results, theme: LabTheme, labels: boolean) {
  const { width, pad } = layout;
  const id = pick(COMBUST_PRODUCT_ORDER, results.product);
  const p = COMBUST_PRODUCTS[id];
  if (p.source === 1) {
    label(ctx, "Refining petroleum", width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
    const colX = pad + 20;
    const colW = 56;
    const top = 44;
    const trays = COMBUST_PRODUCT_ORDER.filter((q) => COMBUST_PRODUCTS[q].source === 1);
    const trayH = 34;
    box(ctx, colX, top, colW, trays.length * trayH, theme.surface2, theme.muted, 8);
    trays.forEach((q, i) => {
      const y = top + i * trayH + trayH / 2;
      const selected = q === id;
      if (i > 0) {
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.beginPath();
        ctx.moveTo(colX + 6, top + i * trayH);
        ctx.lineTo(colX + colW - 6, top + i * trayH);
        ctx.stroke();
        ctx.restore();
      }
      arrow(ctx, colX + colW, y, colX + colW + 18, y, { color: selected ? theme.angle : theme.muted, width: selected ? 2.5 : 1.5, head: 6 });
      label(ctx, COMBUST_PRODUCTS[q].name, colX + colW + 24, y, { color: selected ? theme.angle : theme.text, font: selected ? theme.fontStrong : theme.font, align: "left" });
    });
    const bottom = top + trays.length * trayH;
    arrow(ctx, pad, bottom - 12, colX, bottom - 12, { color: theme.secant, width: 2, head: 6 });
    label(ctx, "crude oil in, heated", colX + colW + 24, bottom + 16, { color: theme.secant, font: theme.font, align: "left" });
    label(ctx, "lighter parts rise higher", width - pad, top - 10, { color: theme.muted, font: theme.font, align: "right" });
  } else {
    label(ctx, "Coal heated without air", width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
    const cx = width * 0.3;
    // The retort with coal (coke left behind), heated from below.
    box(ctx, cx - 46, 120, 92, 70, theme.surface2, theme.muted, 10);
    for (let i = 0; i < 7; i++) dot(ctx, cx - 30 + i * 10, 172 - (i % 2) * 8, 6, id === "coke" ? theme.angle : "#1f2937", theme.muted);
    flame(ctx, cx, 230, 18, 32);
    // A pipe to the tar pot and on to the gas jar.
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 46, 136);
    ctx.lineTo(width * 0.62, 136);
    ctx.lineTo(width * 0.62, 170);
    ctx.stroke();
    ctx.restore();
    const tx = width * 0.62;
    box(ctx, tx - 24, 170, 48, 50, null, theme.muted, 6);
    box(ctx, tx - 22, 196, 44, 22, id === "coal-tar" ? theme.angle : "#1c1917", null, 4);
    arrow(ctx, tx, 160, tx + 40, 100, { color: id === "coal-gas" ? theme.angle : theme.muted, width: id === "coal-gas" ? 2.5 : 1.5, head: 7 });
    label(ctx, "Coal gas", Math.min(width - pad, tx + 42), 88, { color: id === "coal-gas" ? theme.angle : theme.text, font: id === "coal-gas" ? theme.fontStrong : theme.font, align: "right" });
    label(ctx, "Coal tar", tx, 236, { color: id === "coal-tar" ? theme.angle : theme.text, font: id === "coal-tar" ? theme.fontStrong : theme.font, align: "center" });
    label(ctx, "Coke", cx, 108, { color: id === "coke" ? theme.angle : theme.text, font: id === "coke" ? theme.fontStrong : theme.font, align: "center" });
    label(ctx, "Coal formed from plants, over millions of years", width / 2, 286, { color: theme.muted, font: theme.font, align: "center" });
  }
  label(ctx, p.name, width / 2, 316, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (labels) label(ctx, p.use, width / 2, layout.captionY, { color: theme.tangent, font: theme.font, align: "center" });
}

export const combustionRenderer: SimulationRenderer<CombustionLayout> = {
  id: "combustion",
  layout: (width) => computeCombustionLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);
    const r = results as Results;
    const labels = has("labels");
    if (has("burn")) drawBurn(ctx, layout, r, theme, labels);
    else if (has("jar")) drawJar(ctx, layout, r, theme, labels);
    else if (has("cup")) drawCup(ctx, layout, r, theme, labels);
    else if (has("flame")) drawFlame(ctx, layout, r, theme, labels);
    else if (has("fire")) drawFire(ctx, layout, r, theme, labels);
    else if (has("fuel")) drawFuel(ctx, layout, r, theme, labels);
    else if (has("products")) drawProducts(ctx, layout, r, theme, labels);
  },
};
