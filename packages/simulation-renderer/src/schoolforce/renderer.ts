/**
 * Forces, pressure and gravity for classes 8 and 9: five small scenes, one
 * per mode, picked by the layers on show.
 *
 * - "box": a box on a floor of glass, wood or sand, pushed by friends A and B,
 *   with friction drawn along the floor ("forces", "friction").
 * - "press": a force pressing on a contact patch that sinks into soft ground
 *   deeper the bigger the pressure.
 * - "masses": two balls pulling on each other across a distance.
 * - "drop": a coin and a feather falling side by side, in air or not.
 * - "balance": a mass hanging on a spring balance, on the Earth or the Moon.
 *
 * Numbers a level asks the learner to estimate (pressure, fall time, weight,
 * the pull between the balls, friction) are written only with "labels".
 */

import { SF_SURFACES, SF_SURFACE_ORDER } from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface SchoolForceLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right edges of the drawing. */
  left: number;
  right: number;
  /** The floor (box, press) or the ground the things fall to. */
  ground: number;
  /** Where the bottom caption sits. */
  captionY: number;
}

export function computeSchoolForceLayout(width: number): SchoolForceLayout {
  const compact = width < 560;
  const height = compact ? 340 : 380;
  return { width, height, compact, left: 16, right: width - 16, ground: compact ? 220 : 245, captionY: height - 14 };
}

/** Track length the box loops round, m. */
export const SF_TRACK = 10;

const SUPERSCRIPT: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** 1.67 × 10⁻⁷ style, for very small or large numbers. */
export function sfScientific(x: number, figures = 3): string {
  if (x === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(x)));
  let mantissa = x / 10 ** exponent;
  let e = exponent;
  if (Math.abs(+mantissa.toFixed(figures - 1)) >= 10) {
    mantissa /= 10;
    e += 1;
  }
  const power = String(e).split("").map((c) => SUPERSCRIPT[c] ?? c).join("");
  return `${mantissa.toFixed(figures - 1)} × 10${power}`;
}

/** Whole numbers with thin grouping (20 000), small ones to a few figures, huge ones in powers of ten. */
export function sfNumber(x: number): string {
  const a = Math.abs(x);
  if (a >= 1e6 || (a > 0 && a < 0.01)) return sfScientific(x);
  if (a >= 1000) return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (a >= 100) return Math.round(x).toString();
  if (a >= 10) return (+x.toFixed(1)).toString();
  return (+x.toFixed(2)).toString();
}

const SURFACE_COLOUR = (theme: LabTheme, surface: number) => [theme.sine, theme.secant, theme.angle][surface] ?? theme.secant;

function caption(ctx: CanvasRenderingContext2D, layout: SchoolForceLayout, text: string, theme: LabTheme) {
  label(ctx, text, layout.width / 2, layout.captionY, { color: theme.text, font: theme.font, align: "center" });
}

/** Keep a text of `length` characters (≈6 px each) inside the canvas when centred at x. */
function fitX(x: number, text: string, layout: SchoolForceLayout): number {
  const half = (text.length * 6.5) / 2;
  return clamp(x, half + 4, layout.width - half - 4);
}

// ── Push and friction ────────────────────────────────────────────────────────

function fateWords(r: Results): string {
  const fate = Math.round(num(r.fate));
  const moving = num(r.moving) === 1;
  if (fate === 0) return num(r.appliedSize) === 0 ? "No push: the box stays still" : "Friction holds it: forces balance, no motion";
  if (fate === 1) return moving ? "Speeding up: the push beats friction" : "The push beats friction: it starts to move";
  if (fate === 2) return "Push equals friction: steady speed";
  if (fate === 3) return `Friction slows it: it stops after ${sfNumber(num(r.stopDistance))} m`;
  return "It slows, stops, then goes back the other way";
}

function drawBox(ctx: CanvasRenderingContext2D, layout: SchoolForceLayout, r: Results, theme: LabTheme, layers: ReadonlySet<string>) {
  const { left, right, ground, compact } = layout;
  const has = (layer: string) => layers.has(layer);
  const surface = clamp(Math.round(num(r.surface)), 0, 2);
  const wheels = num(r.wheels) === 1;
  const bw = compact ? 56 : 72;
  const bh = compact ? 44 : 54;
  const lift = wheels ? 12 : 0;

  // The floor.
  ctx.save();
  ctx.fillStyle = SURFACE_COLOUR(theme, surface);
  ctx.globalAlpha = 0.35;
  ctx.fillRect(left, ground, right - left, 18);
  ctx.restore();
  const name = SF_SURFACES[SF_SURFACE_ORDER[surface] ?? "wood"].label;
  label(ctx, `${name} floor${wheels ? ", box on wheels" : ""}`, left, ground + 32, { color: theme.muted, font: theme.font });

  // The box, looping round a 10 m track.
  const span = right - left - bw;
  const x = num(r.position);
  const along = ((x % SF_TRACK) + SF_TRACK) % SF_TRACK;
  const bx = left + (along / SF_TRACK) * span;
  const top = ground - lift - bh;
  const cy = top + bh / 2;
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.fillRect(bx, top, bw, bh);
  ctx.strokeRect(bx, top, bw, bh);
  if (wheels) {
    ctx.fillStyle = theme.neutral;
    for (const wx of [bx + bw * 0.25, bx + bw * 0.75]) {
      ctx.beginPath();
      ctx.arc(wx, ground - 6, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  label(ctx, `${sfNumber(num(r.mass))} kg`, bx + bw / 2, cy, { color: theme.text, font: theme.fontStrong, align: "center" });

  const maxLen = compact ? 64 : 110;
  const lengthOf = (f: number) => (clamp(Math.abs(f), 0, 60) / 60) * maxLen;

  if (has("forces")) {
    const a = num(r.forceA);
    const b = num(r.forceB);
    const opposite = num(r.applied) < a;
    if (a > 0) {
      const L = Math.max(10, lengthOf(a));
      const x0 = Math.max(2, bx - 4 - L);
      arrow(ctx, x0, cy - 8, bx - 4, cy - 8, { color: theme.sine, width: 3, head: 8 });
      label(ctx, `A ${sfNumber(a)} N`, Math.max(2, x0), cy - 22, { color: theme.sine, font: theme.font });
    }
    if (b > 0) {
      const L = Math.max(10, lengthOf(b));
      if (opposite) {
        const x0 = Math.min(layout.width - 2, bx + bw + 4 + L);
        arrow(ctx, x0, cy - 8, bx + bw + 4, cy - 8, { color: theme.tangent, width: 3, head: 8 });
        const text = `B ${sfNumber(b)} N`;
        label(ctx, text, Math.min(x0, layout.width - 4), cy - 22, { color: theme.tangent, font: theme.font, align: "right" });
      } else {
        const x0 = Math.max(2, bx - 4 - L);
        arrow(ctx, x0, cy + 10, bx - 4, cy + 10, { color: theme.tangent, width: 3, head: 8 });
        label(ctx, `B ${sfNumber(b)} N`, Math.max(2, x0), cy + 24, { color: theme.tangent, font: theme.font });
      }
    }
    // The combined push, above the box.
    const applied = num(r.applied);
    if (applied !== 0) {
      const y = top - 18;
      const centre = bx + bw / 2;
      const L = Math.max(10, lengthOf(applied));
      const end = clamp(centre + Math.sign(applied) * L, 2, layout.width - 2);
      arrow(ctx, centre, y, end, y, { color: theme.curve, width: 2, head: 7 });
      if (has("labels")) {
        const text = `combined ${sfNumber(Math.abs(applied))} N`;
        label(ctx, text, fitX(centre, text, layout), y - 14, { color: theme.curve, font: theme.font, align: "center" });
      }
    }
  }

  if (has("friction")) {
    const f = num(r.friction);
    if (f !== 0) {
      const centre = bx + bw / 2;
      const L = Math.max(8, lengthOf(f));
      const end = clamp(centre + Math.sign(f) * L, 2, layout.width - 2);
      arrow(ctx, centre, ground + 9, end, ground + 9, { color: theme.cosine, width: 3, head: 7 });
    }
    if (has("labels")) {
      const text = `friction ${sfNumber(num(r.frictionSize))} N (holds up to ${sfNumber(num(r.frictionLimit))} N)`;
      label(ctx, text, left, ground + 50, { color: theme.cosine, font: theme.font });
    }
  }

  const v = num(r.velocity);
  const motion = `v = ${Math.abs(v).toFixed(2)} m/s${v > 0 ? " →" : v < 0 ? " ←" : ""}`;
  label(ctx, motion, left, 18, { color: theme.text, font: theme.fontStrong });
  label(ctx, `moved ${num(r.position).toFixed(2)} m`, right, 18, { color: theme.muted, font: theme.font, align: "right" });

  if (has("labels")) caption(ctx, layout, fateWords(r), theme);
}

// ── Pressure ─────────────────────────────────────────────────────────────────

/** Width of the contact patch for an area in cm², px: a point for a nail, wide for a ski. */
export function patchWidth(area: number, width: number): number {
  const t = clamp((Math.log10(Math.max(0.01, area)) + 2) / (Math.log10(5000) + 2), 0, 1);
  return 3 + t * (width * 0.72 - 3);
}

/** How far the patch sinks into the soft ground, px. */
export function sinkDepth(pressure: number): number {
  return clamp((Math.log10(Math.max(1, pressure)) - 2) * 7, 0, 42);
}

function drawPress(ctx: CanvasRenderingContext2D, layout: SchoolForceLayout, r: Results, theme: LabTheme, layers: ReadonlySet<string>) {
  const { ground, left, right } = layout;
  const cx = layout.width / 2;
  const area = num(r.area, 1);
  const pressure = num(r.pressure);
  const patch = patchWidth(area, layout.width);
  const sink = sinkDepth(pressure);
  const blockW = Math.max(70, Math.min(patch, 110));
  const blockTop = ground - 120;
  const blockBottom = ground - 50;

  // Soft ground.
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.18;
  ctx.fillRect(left, ground, right - left, 70);
  ctx.restore();
  label(ctx, "soft ground", left, ground + 84, { color: theme.muted, font: theme.font });

  // The block, and the leg that carries its push down to the patch.
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.fillRect(cx - blockW / 2, blockTop, blockW, blockBottom - blockTop);
  ctx.strokeRect(cx - blockW / 2, blockTop, blockW, blockBottom - blockTop);
  ctx.beginPath();
  ctx.moveTo(cx - blockW / 2, blockBottom);
  ctx.lineTo(cx + blockW / 2, blockBottom);
  ctx.lineTo(cx + patch / 2, ground + sink);
  ctx.lineTo(cx - patch / 2, ground + sink);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const force = num(r.pressForce);
  arrow(ctx, cx, blockTop - 52, cx, blockTop - 4, { color: theme.sine, width: 3, head: 9 });
  label(ctx, `force ${sfNumber(force)} N`, cx + 10, blockTop - 34, { color: theme.sine, font: theme.fontStrong });
  const areaText = `area ${sfNumber(area)} cm²`;
  label(ctx, areaText, fitX(cx, areaText, layout), ground + sink + 16, { color: theme.angle, font: theme.font, align: "center" });

  if (layers.has("labels")) {
    label(ctx, `= ${sfNumber(num(r.areaM2))} m²`, fitX(cx, areaText, layout), ground + sink + 32, { color: theme.muted, font: theme.font, align: "center" });
    caption(ctx, layout, `pressure = ${sfNumber(force)} N ÷ area = ${sfNumber(pressure)} Pa`, theme);
  }
}

// ── Gravitation ──────────────────────────────────────────────────────────────

function drawMasses(ctx: CanvasRenderingContext2D, layout: SchoolForceLayout, r: Results, theme: LabTheme, layers: ReadonlySet<string>) {
  const { compact, left, right } = layout;
  const mA = num(r.massA);
  const mB = num(r.massB);
  const d = num(r.distance, 1);
  const F = num(r.gravForce);
  const radius = (m: number) => (compact ? 8 : 10) + (compact ? 16 : 24) * Math.cbrt(clamp(m, 0, 1000) / 1000);
  const rA = radius(mA);
  const rB = radius(mB);
  const cy = compact ? 130 : 140;
  const maxGap = right - left - rA - rB;
  const gap = Math.max(rA + rB + 10, (clamp(d, 0, 10) / 10) * maxGap);
  const cx = layout.width / 2;
  const xA = cx - gap / 2;
  const xB = cx + gap / 2;

  ctx.save();
  for (const [x, rr, colour] of [[xA, rA, theme.sine], [xB, rB, theme.secant]] as const) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(x, cy, rr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  label(ctx, `${sfNumber(mA)} kg`, xA, cy + rA + 16, { color: theme.sine, font: theme.font, align: "center" });
  label(ctx, `${sfNumber(mB)} kg`, xB, cy + rB + 16, { color: theme.secant, font: theme.font, align: "center" });

  // Equal and opposite pulls, longer for a stronger force (on a log scale: they are tiny).
  const room = Math.max(0, (xB - rB - (xA + rA)) / 2 - 3);
  const len = Math.min(room, clamp(6 + 4.5 * (Math.log10(Math.max(F, 1e-16)) + 15), 6, 54));
  if (len > 4) {
    arrow(ctx, xA + rA + 2, cy, xA + rA + 2 + len, cy, { color: theme.curve, width: 2.5, head: 7 });
    arrow(ctx, xB - rB - 2, cy, xB - rB - 2 - len, cy, { color: theme.curve, width: 2.5, head: 7 });
  }

  const y = cy + Math.max(rA, rB) + 40;
  arrow(ctx, xA, y, xB, y, { color: theme.muted, width: 1, head: 6, double: true });
  label(ctx, `d = ${sfNumber(d)} m`, cx, y + 14, { color: theme.text, font: theme.font, align: "center" });

  if (layers.has("labels")) {
    const text = `pull F = ${sfScientific(F)} N`;
    label(ctx, text, fitX(cx, text, layout), cy - Math.max(rA, rB) - 22, { color: theme.curve, font: theme.fontStrong, align: "center" });
    caption(ctx, layout, `Tiny! Earth pulls the ${sfNumber(mA)} kg ball with ${sfNumber(num(r.earthPullA))} N`, theme);
  }
}

// ── Free fall ────────────────────────────────────────────────────────────────

function drawDrop(ctx: CanvasRenderingContext2D, layout: SchoolForceLayout, r: Results, theme: LabTheme, layers: ReadonlySet<string>) {
  const { left, right, compact } = layout;
  const top = 50;
  const floor = layout.height - (compact ? 60 : 64);
  const h = Math.max(0.1, num(r.dropHeight, 2));
  const yOf = (drop: number) => top + (clamp(drop, 0, h) / h) * (floor - top);
  const coinX = layout.width * 0.35;
  const featherX = layout.width * 0.65;
  const hasAir = num(r.hasAir) === 1;
  const onMoon = num(r.onMoon) === 1;

  if (hasAir) {
    ctx.save();
    ctx.fillStyle = theme.muted;
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 36; i++) {
      const x = left + 10 + ((i * 53) % Math.max(1, right - left - 20));
      const y = top + ((i * 37) % Math.max(1, floor - top));
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const where = onMoon ? "On the Moon: there is no air" : hasAir ? "In air" : "In a vacuum: all the air pumped out";
  label(ctx, where, layout.width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });

  ctx.save();
  ctx.strokeStyle = theme.reference;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, floor);
  ctx.lineTo(right, floor);
  ctx.stroke();
  ctx.restore();
  arrow(ctx, left + 8, top, left + 8, floor, { color: theme.muted, width: 1, head: 5, double: true });
  label(ctx, `${sfNumber(h)} m`, left + 14, (top + floor) / 2, { color: theme.muted, font: theme.font });

  // The coin.
  const cyCoin = yOf(num(r.coinDrop)) - 7;
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.arc(coinX, cyCoin, 7, 0, Math.PI * 2);
  ctx.fill();
  // The feather: a long thin leaf shape with a quill.
  const cyFeather = yOf(num(r.featherDrop)) - 6;
  ctx.fillStyle = theme.point;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.ellipse(featherX, cyFeather, 16, 5, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  label(ctx, "coin", coinX, floor + 14, { color: theme.angle, font: theme.font, align: "center" });
  label(ctx, "feather", featherX, floor + 14, { color: theme.point, font: theme.font, align: "center" });

  if (layers.has("labels")) {
    label(ctx, `t = ${num(r.fallClock).toFixed(2)} s`, right, 40, { color: theme.text, font: theme.font, align: "right" });
    const coinT = num(r.coinTime).toFixed(2);
    const words =
      num(r.together) === 1
        ? `Both land together after ${coinT} s`
        : `Coin lands after ${coinT} s, feather after ${num(r.featherTime).toFixed(2)} s`;
    caption(ctx, layout, words, theme);
  }
}

// ── Mass and weight ──────────────────────────────────────────────────────────

function drawBalance(ctx: CanvasRenderingContext2D, layout: SchoolForceLayout, r: Results, theme: LabTheme, layers: ReadonlySet<string>) {
  const { compact, left, right } = layout;
  const onMoon = num(r.onMoon) === 1;
  const cx = layout.width / 2;
  const hook = 34;
  const weight = num(r.weight);
  const stretch = (clamp(weight, 0, 1000) / 1000) * (compact ? 110 : 140);
  const springEnd = hook + 30 + stretch;

  ctx.save();
  ctx.strokeStyle = theme.reference;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 50, hook);
  ctx.lineTo(cx + 50, hook);
  ctx.stroke();
  // The spring: a zigzag that stretches with the weight.
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, hook);
  const coils = 10;
  for (let i = 1; i <= coils; i++) {
    const y = hook + 10 + ((springEnd - hook - 20) * i) / coils;
    ctx.lineTo(cx + (i % 2 === 0 ? -8 : 8), y);
  }
  ctx.lineTo(cx, springEnd);
  ctx.stroke();
  ctx.restore();

  // A scale beside the spring, 0 to 1000 N.
  const scaleX = cx + 34;
  const zero = hook + 30;
  const full = zero + (compact ? 110 : 140);
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(scaleX, zero);
  ctx.lineTo(scaleX, full);
  ctx.stroke();
  ctx.restore();
  label(ctx, "0 N", scaleX + 6, zero, { color: theme.muted, font: theme.font });
  label(ctx, "1000 N", scaleX + 6, full, { color: theme.muted, font: theme.font });
  arrow(ctx, scaleX - 2, springEnd, cx + 10, springEnd, { color: theme.cosine, width: 2, head: 6 });

  // The mass hanging on it.
  const boxW = compact ? 60 : 70;
  const boxH = 40;
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.fillRect(cx - boxW / 2, springEnd, boxW, boxH);
  ctx.strokeRect(cx - boxW / 2, springEnd, boxW, boxH);
  ctx.restore();
  label(ctx, `${sfNumber(num(r.mass))} kg`, cx, springEnd + boxH / 2, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The ground: green Earth or grey Moon.
  const groundY = layout.height - 52;
  ctx.save();
  ctx.fillStyle = onMoon ? theme.neutral : theme.tangent;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(left, groundY, right - left, 14);
  ctx.restore();
  const g = num(r.g, 9.8);
  label(ctx, `${onMoon ? "On the Moon" : "On the Earth"}: g = ${sfNumber(g)} m/s²`, left, groundY - 12, { color: theme.text, font: theme.font });

  if (layers.has("labels")) {
    label(ctx, `reads ${sfNumber(weight)} N`, cx - 16, springEnd - 8, { color: theme.cosine, font: theme.fontStrong, align: "right" });
    caption(ctx, layout, `weight = ${sfNumber(num(r.mass))} kg × ${sfNumber(g)} m/s² = ${sfNumber(weight)} N`, theme);
  }
}

export const schoolForceRenderer: SimulationRenderer<SchoolForceLayout> = {
  id: "schoolforce",
  layout: (width) => computeSchoolForceLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    ctx.clearRect(0, 0, layout.width, layout.height);
    if (layers.has("box")) drawBox(ctx, layout, results, theme, layers);
    else if (layers.has("press")) drawPress(ctx, layout, results, theme, layers);
    else if (layers.has("masses")) drawMasses(ctx, layout, results, theme, layers);
    else if (layers.has("drop")) drawDrop(ctx, layout, results, theme, layers);
    else if (layers.has("balance")) drawBalance(ctx, layout, results, theme, layers);
  },
};
