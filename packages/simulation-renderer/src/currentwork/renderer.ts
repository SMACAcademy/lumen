/**
 * Electric current at work: seven small scenes, one per mode, picked by the
 * layers on show.
 *
 * - "heat": a supply driving a current through a heater coil that glows.
 * - "house": the 220 V mains, a fuse or MCB, bulbs and heaters in parallel,
 *   an earth wire, and the faults that blow the fuse.
 * - "nail": a coil round an iron nail, picking up pins.
 * - "field": field lines round a bar magnet, a straight wire, a loop or a
 *   solenoid, traced from the field of the currents themselves, so they
 *   never cross.
 * - "motor": a coil between two poles, the push on each side, and its rings.
 * - "induction": a magnet moving at a coil, and a galvanometer.
 * - "generator": a coil turning between two poles, and its output over a turn.
 *
 * Numbers a level asks the learner to estimate (the heat, the mains current,
 * the reversals each second) are written only with "labels".
 */

import { CW_MAX_DISTANCE, CW_MAX_KICK, CW_MAX_MOTOR_CURRENT } from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface CurrentWorkLayout {
  width: number;
  height: number;
  compact: boolean;
  left: number;
  right: number;
  /** Top of the drawing area. */
  top: number;
  /** Bottom of the drawing area, above the caption. */
  bottom: number;
  captionY: number;
  cx: number;
  cy: number;
}

export function computeCurrentWorkLayout(width: number): CurrentWorkLayout {
  const compact = width < 560;
  const height = compact ? 360 : 400;
  const top = 24;
  const bottom = height - 36;
  return { width, height, compact, left: 16, right: width - 16, top, bottom, captionY: height - 14, cx: width / 2, cy: (top + bottom) / 2 };
}

const TAU = 2 * Math.PI;

/** Whole numbers with thin grouping (15 000), small ones to two places. */
export function cwNumber(x: number): string {
  const a = Math.abs(x);
  if (a >= 1000) return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (a >= 100) return Math.round(x).toString();
  if (a >= 10) return (+x.toFixed(1)).toString();
  return (+x.toFixed(2)).toString();
}

/** Keep a centred text of `text.length` characters (≈6.5 px each) inside the canvas. */
function fitX(x: number, text: string, layout: CurrentWorkLayout): number {
  const half = (text.length * 6.5) / 2;
  return clamp(x, half + 4, layout.width - half - 4);
}

function caption(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, text: string, theme: LabTheme) {
  label(ctx, text, layout.width / 2, layout.captionY, { color: theme.text, font: theme.font, align: "center" });
}

function centred(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, text: string, x: number, y: number, color: string, font: string) {
  label(ctx, text, fitX(x, text, layout), y, { color, font, align: "center" });
}

function line(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], color: string, width = 2, alpha = 1, dash: number[] = []) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(points[0]![0], points[0]![1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i]![0], points[i]![1]);
  ctx.stroke();
  ctx.restore();
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | null, stroke: string | null, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
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

/** A wire seen end on: a dot for current towards you, a cross for away. */
function endOn(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, towards: boolean, theme: LabTheme) {
  disc(ctx, x, y, r, theme.surface2, theme.angle);
  if (towards) disc(ctx, x, y, Math.max(1.5, r * 0.3), theme.angle, null);
  else {
    const k = r * 0.55;
    line(ctx, [[x - k, y - k], [x + k, y + k]], theme.angle, 1.5);
    line(ctx, [[x - k, y + k], [x + k, y - k]], theme.angle, 1.5);
  }
}

function poleBlock(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, north: boolean, theme: LabTheme) {
  ctx.save();
  ctx.fillStyle = north ? theme.cosine : theme.sine;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  label(ctx, north ? "N" : "S", x + w / 2, y + h / 2, { color: theme.background, font: theme.fontStrong, align: "center" });
}

// ── Field lines, traced from line currents ───────────────────────────────────

/** A long straight current seen end on, in canvas pixels; s = +1 towards you, −1 away. */
export interface CwLineCurrent {
  x: number;
  y: number;
  s: number;
}

export interface CwBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** The field direction (canvas coordinates, y down) at a point: anticlockwise round a current towards you. */
export function cwFieldAt(currents: readonly CwLineCurrent[], x: number, y: number): [number, number] {
  let bx = 0;
  let by = 0;
  for (const c of currents) {
    const dx = x - c.x;
    const dy = y - c.y;
    const r2 = dx * dx + dy * dy;
    if (r2 < 1e-6) continue;
    bx += (c.s * dy) / r2;
    by += (-c.s * dx) / r2;
  }
  return [bx, by];
}

function traceOneWay(currents: readonly CwLineCurrent[], x0: number, y0: number, box: CwBox, sign: number, step: number, maxSteps: number) {
  const points: [number, number][] = [[x0, y0]];
  const unit = (x: number, y: number): [number, number] | null => {
    const [bx, by] = cwFieldAt(currents, x, y);
    const m = Math.hypot(bx, by);
    return m > 0 ? [(sign * bx) / m, (sign * by) / m] : null;
  };
  let x = x0;
  let y = y0;
  for (let i = 0; i < maxSteps; i++) {
    const a = unit(x, y);
    if (!a) break;
    const b = unit(x + (a[0] * step) / 2, y + (a[1] * step) / 2);
    if (!b) break;
    x += b[0] * step;
    y += b[1] * step;
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) break;
    if (currents.some((c) => Math.hypot(x - c.x, y - c.y) < 5)) break;
    points.push([x, y]);
    if (i > 20 && Math.hypot(x - x0, y - y0) < step * 1.2) {
      points.push([x0, y0]);
      return { points, closed: true };
    }
  }
  return { points, closed: false };
}

/** A field line through a seed, running along the field; closed when it comes back round. */
export function cwTrace(currents: readonly CwLineCurrent[], x0: number, y0: number, box: CwBox, step = 2.5, maxSteps = 1500) {
  const forward = traceOneWay(currents, x0, y0, box, 1, step, maxSteps);
  if (forward.closed) return forward;
  const backward = traceOneWay(currents, x0, y0, box, -1, step, maxSteps);
  return { points: [...backward.points.slice(1).reverse(), ...forward.points], closed: false };
}

/** An arrowhead on a field line: at the point farthest from the axis, or the middle of a straight line. */
function lineArrow(ctx: CanvasRenderingContext2D, points: readonly [number, number][], cy: number, color: string) {
  if (points.length < 4) return;
  let best = Math.floor(points.length / 2);
  let far = 0;
  points.forEach(([, y], i) => {
    if (Math.abs(y - cy) > far + 0.5) {
      far = Math.abs(y - cy);
      best = i;
    }
  });
  if (far < 4) best = Math.floor(points.length / 2);
  const i = clamp(best, 1, points.length - 2);
  const [x1, y1] = points[i - 1]!;
  const [x2, y2] = points[i + 1]!;
  const m = Math.hypot(x2 - x1, y2 - y1);
  if (m < 1e-6) return;
  const ux = (x2 - x1) / m;
  const uy = (y2 - y1) / m;
  const [x, y] = points[i]!;
  arrow(ctx, x - ux * 6, y - uy * 6, x + ux * 4, y + uy * 4, { color, width: 1.5, head: 7 });
}

/** Two rows of currents along the top and bottom of a solenoid (or the bar magnet it stands for). */
export function cwSolenoidCurrents(cx: number, cy: number, length: number, half: number, dir: number, n = 14): CwLineCurrent[] {
  const out: CwLineCurrent[] = [];
  for (let i = 0; i < n; i++) {
    const x = cx - length / 2 + (length * (i + 0.5)) / n;
    out.push({ x, y: cy - half, s: dir }, { x, y: cy + half, s: -dir });
  }
  return out;
}

function fieldBox(layout: CurrentWorkLayout): CwBox {
  return { left: layout.left - 8, right: layout.right + 8, top: layout.top + 4, bottom: layout.bottom - 26 };
}

function drawTracedLines(ctx: CanvasRenderingContext2D, currents: CwLineCurrent[], seeds: [number, number][], box: CwBox, cy: number, theme: LabTheme) {
  for (const [sx, sy] of seeds) {
    const { points } = cwTrace(currents, sx, sy, box);
    line(ctx, points, theme.curve, 1.5, 0.85);
    lineArrow(ctx, points, cy, theme.curve);
  }
}

function drawField(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { compact, cx, left, right } = layout;
  const box = fieldBox(layout);
  const cy = (box.top + box.bottom) / 2;
  const source = Math.round(num(r.fieldSource));
  const turn = Math.round(num(r.fieldTurn));
  const dir = num(r.currentDirection) < 0 ? -1 : 1;
  const current = num(r.wireCurrent);
  const rightPole = Math.round(num(r.rightPole));
  const textY = box.bottom + 12;

  if (source === 0 || source === 3) {
    const length = compact ? 120 : 170;
    const half = compact ? 15 : 18;
    const magnet = source === 0;
    if (magnet || current > 0) {
      const currents = cwSolenoidCurrents(cx, cy, length, half, magnet ? 1 : dir);
      const seeds: [number, number][] = [0.15, 0.4, 0.65].flatMap((f) => [[cx, cy - f * half], [cx, cy + f * half]] as [number, number][]);
      drawTracedLines(ctx, currents, seeds, box, cy, theme);
    }
    if (magnet) {
      poleBlock(ctx, cx - length / 2, cy - half, length / 2, 2 * half, false, theme);
      poleBlock(ctx, cx, cy - half, length / 2, 2 * half, true, theme);
      caption(ctx, layout, "Lines leave N, curve round to S, and never cross", theme);
      return;
    }
    // The solenoid's turns: dots along one side, crosses along the other.
    const n = 10;
    for (let i = 0; i < n; i++) {
      const x = cx - length / 2 + (length * (i + 0.5)) / n;
      endOn(ctx, x, cy - half, 4, dir > 0, theme);
      endOn(ctx, x, cy + half, 4, dir < 0, theme);
    }
    if (rightPole !== 0) {
      label(ctx, rightPole > 0 ? "N" : "S", cx + length / 2 + 12, cy - half - 12, { color: theme.text, font: theme.fontStrong, align: "center" });
      label(ctx, rightPole > 0 ? "S" : "N", cx - length / 2 - 12, cy - half - 12, { color: theme.text, font: theme.fontStrong, align: "center" });
    }
    centred(ctx, layout, `Solenoid, ${cwNumber(current)} A`, cx, textY, theme.muted, theme.font);
    caption(ctx, layout, current > 0 ? "Like a bar magnet: straight lines inside" : "No current: no field", theme);
    return;
  }

  if (source === 2) {
    const a = compact ? 46 : 60;
    if (current > 0) {
      const currents: CwLineCurrent[] = [
        { x: cx, y: cy - a, s: dir },
        { x: cx, y: cy + a, s: -dir },
      ];
      const seeds: [number, number][] = [0, 0.35, 0.65, 0.85].flatMap((f) => (f === 0 ? [[cx, cy]] : [[cx, cy - f * a], [cx, cy + f * a]]) as [number, number][]);
      drawTracedLines(ctx, currents, seeds, box, cy, theme);
    }
    // The loop seen edge on: an ellipse, with the two places it crosses the page.
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 10, a, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    endOn(ctx, cx, cy - a, 6, dir > 0, theme);
    endOn(ctx, cx, cy + a, 6, dir < 0, theme);
    if (rightPole !== 0) {
      label(ctx, rightPole > 0 ? "N face" : "S face", cx + 18, cy - a - 14, { color: theme.text, font: theme.fontStrong });
    }
    centred(ctx, layout, `Loop, ${cwNumber(current)} A`, cx, textY, theme.muted, theme.font);
    caption(ctx, layout, current > 0 ? "Circles near each side, straight through the middle" : "No current: no field", theme);
    return;
  }

  // A straight wire, seen end on: circles, closer together near the wire.
  const maxR = Math.min((right - left) / 2, (box.bottom - box.top) / 2) - 4;
  const circles = current > 0 ? 1 + Math.ceil(current / 2) : 0;
  for (let k = 0; k < circles; k++) {
    const radius = 14 * 1.45 ** k;
    if (radius > maxR) break;
    disc(ctx, cx, cy, radius, null, theme.curve, 0.8);
    // At the top of the circle the field runs left for anticlockwise, right for clockwise.
    const ux = turn >= 0 ? -1 : 1;
    arrow(ctx, cx - ux * 5, cy - radius, cx + ux * 5, cy - radius, { color: theme.curve, width: 1.5, head: 7 });
  }
  endOn(ctx, cx, cy, 7, dir > 0, theme);
  const scale = (maxR - 10) / CW_MAX_DISTANCE;
  const distance = num(r.distance, 2);
  const px = cx + distance * scale;
  disc(ctx, px, cy, 9, theme.surface2, theme.neutral);
  const needle = Math.round(num(r.compassPoints));
  if (needle !== 0) arrow(ctx, px, cy + 7 * needle, px, cy - 7 * needle, { color: theme.cosine, width: 2, head: 5 });
  centred(ctx, layout, `${cwNumber(current)} A ${dir > 0 ? "towards you" : "away from you"}`, cx, textY, theme.muted, theme.font);
  if (labels) {
    centred(ctx, layout, `compass ${cwNumber(distance)} cm away: B = ${cwNumber(num(r.wireField))} μT`, cx, textY + 14, theme.text, theme.font);
  }
  caption(ctx, layout, current > 0 ? "Circles round the wire: right-hand thumb rule" : "No current: no field, the compass is not moved", theme);
}

// ── Heat ─────────────────────────────────────────────────────────────────────

function drawHeat(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { left, right, top, compact, cx } = layout;
  const x1 = left + 30;
  const x2 = right - 20;
  const y1 = top + 40;
  const y2 = compact ? 210 : 230;
  const I = num(r.heatCurrent);
  const glow = clamp(num(r.glow), 0, 1);

  // The loop of wire, with a gap for the coil along the bottom.
  const coilW = compact ? 120 : 170;
  const c1 = cx - coilW / 2;
  const c2 = cx + coilW / 2;
  line(ctx, [[c1, y2], [x1, y2], [x1, y1], [x2, y1], [x2, y2], [c2, y2]], theme.neutral, 2);

  // The supply on the left side.
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.fillRect(x1 - 16, (y1 + y2) / 2 - 22, 32, 44);
  ctx.strokeRect(x1 - 16, (y1 + y2) / 2 - 22, 32, 44);
  ctx.restore();
  label(ctx, "+", x1, (y1 + y2) / 2 - 11, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "−", x1, (y1 + y2) / 2 + 11, { color: theme.text, font: theme.fontStrong, align: "center" });

  // An ammeter on the top wire.
  disc(ctx, cx, y1, 14, theme.surface2, theme.sine);
  label(ctx, "A", cx, y1, { color: theme.sine, font: theme.fontStrong, align: "center" });
  centred(ctx, layout, `I = ${cwNumber(I)} A`, cx, y1 - 24, theme.sine, theme.fontStrong);
  if (I > 0) arrow(ctx, cx + 30, y1, cx + 60, y1, { color: theme.sine, width: 2, head: 7 });

  // The heater coil: a zigzag that glows with its power.
  const zig: [number, number][] = [[c1, y2]];
  const teeth = 12;
  for (let i = 1; i < teeth; i++) zig.push([c1 + (coilW * i) / teeth, y2 + (i % 2 ? -9 : 9)]);
  zig.push([c2, y2]);
  if (glow > 0.02) {
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.4 * glow;
    ctx.fillStyle = theme.secant;
    ctx.beginPath();
    ctx.ellipse(cx, y2, coilW / 2 + 10 * glow, 16 + 18 * glow, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  line(ctx, zig, theme.neutral, 2.5);
  if (glow > 0.02) line(ctx, zig, glow > 0.6 ? theme.angle : theme.secant, 2.5, Math.min(1, 0.3 + glow));
  centred(ctx, layout, `R = ${cwNumber(num(r.coilResistance))} Ω`, cx, y2 + 30, theme.text, theme.font);
  centred(ctx, layout, `on for t = ${cwNumber(num(r.seconds))} s`, cx, y2 + 48, theme.muted, theme.font);

  if (labels) {
    centred(ctx, layout, `P = I²R = ${cwNumber(num(r.heatPower))} W`, cx, y2 + 72, theme.secant, theme.font);
    centred(ctx, layout, `H = I²Rt = ${cwNumber(num(r.heat))} J`, cx, y2 + 90, theme.angle, theme.fontStrong);
  }
  const words = I === 0 ? "No current: the coil stays cold" : glow >= 0.25 ? "The coil glows: the current heats it" : "The current warms the coil";
  caption(ctx, layout, words, theme);
}

// ── House wiring ─────────────────────────────────────────────────────────────

function bulbIcon(ctx: CanvasRenderingContext2D, x: number, y: number, lit: boolean, theme: LabTheme) {
  if (lit) disc(ctx, x, y, 15, theme.angle, null, 0.3);
  disc(ctx, x, y, 9, lit ? theme.angle : theme.surface2, theme.neutral);
}

function heaterIcon(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean, theme: LabTheme) {
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - 14, y - 12, 28, 24);
  ctx.strokeRect(x - 14, y - 12, 28, 24);
  ctx.restore();
  const zig: [number, number][] = [];
  for (let i = 0; i <= 6; i++) zig.push([x - 10 + (20 * i) / 6, y + (i % 2 ? -5 : 5)]);
  line(ctx, zig, on ? theme.secant : theme.muted, 2);
}

function drawHouse(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { left, right, top, compact } = layout;
  const live = top + 44;
  const neutral = compact ? 196 : 210;
  const box = left + 4;
  const on = num(r.supplyOn) === 1;
  const blown = num(r.fuseBlown) === 1;
  const mcb = num(r.protector) === 1;
  const fault = Math.round(num(r.fault));
  const earthed = num(r.earthed) === 1;
  const bulbs = Math.round(num(r.bulbs));
  const heaters = Math.round(num(r.heaters));

  label(ctx, `Mains ${cwNumber(num(r.mainsVoltage))} V, ${cwNumber(num(r.mainsFrequency))} Hz`, left, top + 8, { color: theme.text, font: theme.fontStrong });

  // Live and neutral wires.
  const fuseX = left + (compact ? 52 : 70);
  const fuseW = compact ? 34 : 44;
  line(ctx, [[box, live], [fuseX, live]], theme.secant, 2.5);
  line(ctx, [[fuseX + fuseW, live], [right, live]], theme.secant, 2.5, on ? 1 : 0.4);
  line(ctx, [[box, neutral], [right, neutral]], theme.sine, 2.5);
  label(ctx, "live", box, live - 12, { color: theme.secant, font: theme.font });
  label(ctx, "neutral", box, neutral + 14, { color: theme.sine, font: theme.font });

  // The fuse (a thin wire in a holder) or the MCB.
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(fuseX, live - 9, fuseW, 18);
  ctx.restore();
  if (!blown) line(ctx, [[fuseX, live], [fuseX + fuseW, live]], theme.text, 1);
  else if (mcb) line(ctx, [[fuseX + 4, live], [fuseX + fuseW - 4, live - 8]], theme.text, 1.5);
  else {
    line(ctx, [[fuseX, live], [fuseX + fuseW * 0.35, live + 2]], theme.text, 1);
    line(ctx, [[fuseX + fuseW * 0.65, live - 2], [fuseX + fuseW, live]], theme.text, 1);
  }
  const rating = `${cwNumber(num(r.fuseRating))} A ${mcb ? "MCB" : "fuse"}`;
  label(ctx, rating, fuseX + fuseW / 2, live + 22, { color: theme.text, font: theme.font, align: "center" });

  // Two branches in parallel: the bulbs and the heaters.
  const bx = left + (right - left) * 0.5;
  const hx = left + (right - left) * 0.82;
  const mid = (live + neutral) / 2;
  for (const [x, count] of [[bx, bulbs], [hx, heaters]] as const) {
    line(ctx, [[x, live], [x, mid - 16]], theme.neutral, 1.5, count > 0 ? 1 : 0.35);
    line(ctx, [[x, mid + 16], [x, neutral]], theme.neutral, 1.5, count > 0 ? 1 : 0.35);
  }
  bulbIcon(ctx, bx, mid, on && bulbs > 0, theme);
  heaterIcon(ctx, hx, mid, on && heaters > 0, theme);
  label(ctx, `${bulbs} × 100 W`, bx - 14, mid + 30, { color: theme.text, font: theme.font, align: "right" });
  label(ctx, `${heaters} × 1 kW`, hx, mid + 30, { color: theme.text, font: theme.font, align: "center" });

  // The earth wire from the heater's metal case.
  if (earthed) {
    const ey = neutral + 32;
    line(ctx, [[hx + 14, mid + 6], [right - 2, mid + 6], [right - 2, ey]], theme.tangent, 2);
    line(ctx, [[right - 14, ey], [right - 2, ey]], theme.tangent, 2);
    line(ctx, [[right - 11, ey + 4], [right - 4, ey + 4]], theme.tangent, 2);
    label(ctx, "earth", right - 18, ey, { color: theme.tangent, font: theme.font, align: "right" });
  }

  // Faults.
  if (fault === 1) {
    const sx = left + (right - left) * 0.3;
    line(ctx, [[sx, live], [sx + 8, mid - 10], [sx - 6, mid + 4], [sx + 4, neutral]], theme.cosine, 2.5);
    label(ctx, "short", sx + 10, mid + 10, { color: theme.cosine, font: theme.fontStrong });
  } else if (fault === 2) {
    line(ctx, [[hx - 22, live], [hx - 14, live + 12], [hx - 22, mid - 18], [hx - 14, mid - 10]], theme.cosine, 2);
    label(ctx, "leak to case", hx - 26, live + 12, { color: theme.cosine, font: theme.font, align: "right" });
  }

  const infoY = neutral + 52;
  if (labels) {
    centred(ctx, layout, `${cwNumber(num(r.housePower))} W in all; current ${cwNumber(num(r.houseCurrent))} A`, layout.cx, infoY, theme.text, theme.font);
  }

  let words: string;
  if (num(r.shockDanger) === 1) words = "Danger: touching the heater's case gives a shock";
  else if (blown) words = mcb ? "Too much current: the MCB trips, the power is off" : "Too much current: the fuse melts, the power is off";
  else if (bulbs + heaters === 0) words = "Everything is switched off";
  else words = "The current is within the rating: all is working";
  caption(ctx, layout, words, theme);
}

// ── Electromagnet ────────────────────────────────────────────────────────────

const PINS = 15;

function drawNail(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { cx, top, compact } = layout;
  const length = compact ? 190 : 260;
  const ny = top + 60;
  const x1 = cx - length / 2;
  const x2 = cx + length / 2;
  const iron = num(r.ironCore) === 1;
  const on = num(r.magnetOn) === 1;
  const turns = Math.round(num(r.coilTurns));
  const current = num(r.magnetCurrent);
  const north = Math.round(num(r.nailNorthEnd));
  const pins = Math.round(clamp(num(r.pinsHeld), 0, PINS));

  // The nail.
  if (iron) {
    ctx.save();
    ctx.fillStyle = theme.neutral;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(x1, ny - 7);
    ctx.lineTo(x2 - 16, ny - 5);
    ctx.lineTo(x2, ny);
    ctx.lineTo(x2 - 16, ny + 5);
    ctx.lineTo(x1, ny + 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x1 - 4, ny - 12, 6, 24);
    ctx.restore();
  }

  // The coil: one drawn turn for every five.
  const drawn = Math.min(20, Math.ceil(turns / 5));
  const c1 = x1 + 20;
  const c2 = x2 - 30;
  for (let i = 0; i < drawn; i++) {
    const x = drawn === 1 ? (c1 + c2) / 2 : c1 + ((c2 - c1) * i) / (drawn - 1);
    ctx.save();
    ctx.strokeStyle = theme.secant;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, ny, 4, 13, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  // Wires down to the cells and the switch.
  const by = compact ? 230 : 250;
  line(ctx, [[c1, ny + 13], [c1, by], [cx - 20, by]], theme.neutral, 1.5);
  line(ctx, [[c2, ny + 13], [c2, by], [cx + 30, by]], theme.neutral, 1.5);
  line(ctx, [[cx - 20, by - 10], [cx - 20, by + 10]], theme.neutral, 2);
  line(ctx, [[cx - 12, by - 5], [cx - 12, by + 5]], theme.neutral, 3);
  const switchOn = num(r.switchOn) === 1;
  line(ctx, [[cx + 6, by], switchOn ? [cx + 30, by] : [cx + 26, by - 14]], theme.text, 2);
  disc(ctx, cx + 6, by, 2.5, theme.text, null);
  label(ctx, switchOn ? "switch on" : "switch off", cx + 10, by + 16, { color: theme.muted, font: theme.font });
  label(ctx, `${cwNumber(current)} A`, cx - 16, by + 16, { color: theme.sine, font: theme.font, align: "right" });

  // Current on the front of the coil runs down for "forward".
  if (on) {
    const ax = c1 - 12;
    const sgn = north >= 0 ? 1 : -1;
    arrow(ctx, ax, ny - 10 * sgn, ax, ny + 10 * sgn, { color: theme.sine, width: 1.5, head: 6 });
    label(ctx, north > 0 ? "N" : "S", x2 + 12, ny, { color: north > 0 ? theme.cosine : theme.sine, font: theme.fontStrong, align: "center" });
    label(ctx, north > 0 ? "S" : "N", x1 - 14, ny, { color: north > 0 ? theme.sine : theme.cosine, font: theme.fontStrong, align: "center" });
  }

  // Pins: those held hang under the nail; the rest lie in a heap.
  const hangY = ny + 16;
  for (let i = 0; i < pins; i++) {
    const x = c1 + ((c2 - c1) * (i + 0.5)) / PINS;
    line(ctx, [[x, hangY], [x + 2, hangY + 22]], theme.text, 1.5);
  }
  const heapY = by - 34;
  for (let i = pins; i < PINS; i++) {
    const x = cx - 60 + ((i * 37) % 120);
    const y = heapY + ((i * 13) % 10);
    line(ctx, [[x, y], [x + 18, y + ((i % 3) - 1) * 3]], theme.muted, 1.5);
  }

  label(ctx, `${turns} turns${iron ? " on an iron nail" : ", no nail"}`, layout.left, top + 8, { color: theme.text, font: theme.font });
  if (labels) {
    centred(ctx, layout, `strength = turns × current = ${cwNumber(num(r.magnetStrength))}`, cx, by + 40, theme.text, theme.font);
    centred(ctx, layout, `It holds ${pins} pin${pins === 1 ? "" : "s"}`, cx, by + 58, theme.angle, theme.fontStrong);
  }
  const words = !on
    ? "No current: the nail is not a magnet, the pins drop"
    : !iron
      ? "Without the iron nail the coil is a weak magnet"
      : pins === 0
        ? "A weak magnet: too weak to lift a pin"
        : "The current makes the nail a magnet";
  caption(ctx, layout, words, theme);
}

// ── Motor ────────────────────────────────────────────────────────────────────

function drawPoles(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, cy: number, gap: number, northLeft: boolean, theme: LabTheme) {
  const { cx } = layout;
  const w = layout.compact ? 34 : 48;
  const h = layout.compact ? 120 : 140;
  poleBlock(ctx, cx - gap - w, cy - h / 2, w, h, northLeft, theme);
  poleBlock(ctx, cx + gap, cy - h / 2, w, h, !northLeft, theme);
  // Faint field lines from N to S.
  for (const dy of [-0.35, 0, 0.35]) {
    const y = cy + dy * h;
    const from = northLeft ? cx - gap + 4 : cx + gap - 4;
    const to = northLeft ? cx + gap - 4 : cx - gap + 4;
    arrow(ctx, from, y, to, y, { color: theme.curve, width: 1, head: 6, alpha: 0.4 });
  }
}

function drawMotor(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { cx, top, compact } = layout;
  const cy = top + (compact ? 100 : 115);
  const gap = compact ? 82 : 110;
  const a = compact ? 50 : 66;
  const northLeft = num(r.poles) === 0;
  const split = num(r.motorRings) === 0;
  const current = num(r.motorCurrent);
  const dir = num(r.currentDirection) < 0 ? -1 : 1;
  const field = northLeft ? 1 : -1;
  drawPoles(ctx, layout, cy, gap, northLeft, theme);

  const phi = num(r.coilAngle);
  const sides = [0, Math.PI].map((offset, k) => {
    const angle = phi + offset;
    const x = cx + a * Math.cos(angle);
    const y = cy - a * Math.sin(angle);
    // With a split ring the side on the left always carries the current "towards you" (forward);
    // with slip rings each side keeps its own current.
    const towards = split ? (x < cx ? dir : -dir) : k === 0 ? dir : -dir;
    return { x, y, towards };
  });
  line(ctx, [[sides[0]!.x, sides[0]!.y], [sides[1]!.x, sides[1]!.y]], theme.neutral, 2);
  for (const side of sides) {
    endOn(ctx, side.x, side.y, 7, side.towards > 0, theme);
    if (current > 0) {
      // F = I L × B: towards you × field to the right gives a push up the page.
      const up = side.towards * field;
      const len = 14 + (34 * current) / CW_MAX_MOTOR_CURRENT;
      arrow(ctx, side.x, side.y - 10 * up, side.x, side.y - (10 + len) * up, { color: theme.vector, width: 2.5, head: 8 });
    }
  }

  // The rings and brushes under the coil.
  const ry = cy + (compact ? 92 : 104);
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 3;
  if (split) {
    ctx.beginPath();
    ctx.arc(cx, ry, 12, 0.25, Math.PI - 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, ry, 12, Math.PI + 0.25, TAU - 0.25);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx - 10, ry, 10, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 10, ry, 10, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  label(ctx, split ? "split ring" : "slip rings", cx + 30, ry, { color: theme.muted, font: theme.font });

  label(ctx, `coil current ${cwNumber(current)} A`, layout.left, top + 8, { color: theme.text, font: theme.font });
  if (labels) {
    centred(ctx, layout, "Fleming's left-hand rule gives each push", cx, ry + 28, theme.muted, theme.font);
  }
  const spin = Math.round(num(r.spin));
  const words =
    current === 0
      ? "No current: no push, the coil stays still"
      : spin < 0
        ? "Turns clockwise: the split ring keeps it going"
        : spin > 0
          ? "Turns anticlockwise: the split ring keeps it going"
          : "No commutator: it swings upright and stops";
  caption(ctx, layout, words, theme);
}

// ── Induction ────────────────────────────────────────────────────────────────

function drawInduction(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { left, right, top, compact } = layout;
  const cy = top + 80;
  const coilX1 = left + (right - left) * 0.5;
  const coilX2 = right - 24;
  const turns = Math.round(num(r.coilTurns));
  const v = num(r.magnetVelocity);
  const kick = num(r.kick);
  const pole = num(r.magnetPole) === 1 ? "S" : "N";

  // The coil.
  const drawn = Math.max(1, Math.min(16, Math.ceil(turns / 6)));
  for (let i = 0; i < drawn; i++) {
    const x = drawn === 1 ? (coilX1 + coilX2) / 2 : coilX1 + ((coilX2 - coilX1) * i) / (drawn - 1);
    ctx.save();
    ctx.strokeStyle = theme.secant;
    ctx.lineWidth = 2;
    ctx.globalAlpha = turns > 0 ? 1 : 0.3;
    ctx.beginPath();
    ctx.ellipse(x, cy, 5, 26, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  label(ctx, `${turns} turns`, (coilX1 + coilX2) / 2, cy - 40, { color: theme.text, font: theme.font, align: "center" });

  // The magnet, its facing pole towards the coil.
  const mw = compact ? 90 : 120;
  const mx2 = coilX1 - 18;
  poleBlock(ctx, mx2 - mw, cy - 13, mw / 2, 26, pole === "S", theme);
  poleBlock(ctx, mx2 - mw / 2, cy - 13, mw / 2, 26, pole === "N", theme);
  if (Math.abs(v) > 1e-9) {
    const len = 12 + 18 * Math.abs(v);
    const ax = mx2 - mw / 2;
    arrow(ctx, ax - (len / 2) * Math.sign(v), cy + 30, ax + (len / 2) * Math.sign(v), cy + 30, { color: theme.vector, width: 2.5, head: 8 });
  }
  label(ctx, `${cwNumber(Math.abs(v))} m/s ${v > 0 ? "in" : v < 0 ? "out" : "(still)"}`, mx2 - mw / 2, cy + 48, { color: theme.muted, font: theme.font, align: "center" });

  // The galvanometer.
  const gx = (left + right) / 2;
  const gy = compact ? 250 : 270;
  const gr = compact ? 44 : 52;
  line(ctx, [[coilX1, cy + 26], [coilX1, gy - gr - 8], [gx - 8, gy - gr - 8]], theme.neutral, 1.5);
  line(ctx, [[coilX2, cy + 26], [coilX2, gy - gr - 8], [gx + 8, gy - gr - 8]], theme.neutral, 1.5);
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(gx, gy, gr, Math.PI, TAU);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  for (let k = -CW_MAX_KICK; k <= CW_MAX_KICK; k += 5) {
    const ang = -Math.PI / 2 + (k / CW_MAX_KICK) * (Math.PI / 3);
    line(ctx, [[gx + (gr - 6) * Math.cos(ang), gy + (gr - 6) * Math.sin(ang)], [gx + gr * Math.cos(ang), gy + gr * Math.sin(ang)]], theme.muted, 1);
  }
  const ang = -Math.PI / 2 + (clamp(kick, -CW_MAX_KICK, CW_MAX_KICK) / CW_MAX_KICK) * (Math.PI / 3);
  line(ctx, [[gx, gy], [gx + (gr - 8) * Math.cos(ang), gy + (gr - 8) * Math.sin(ang)]], theme.cosine, 2.5);
  label(ctx, "G", gx, gy - 12, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (labels) {
    label(ctx, `${cwNumber(Math.abs(kick))} div`, gx + gr + 8, gy - 8, { color: theme.text, font: theme.font });
  }

  const words =
    kick === 0
      ? turns === 0
        ? "No coil: nothing to make a current in"
        : "The magnet is still: no current"
      : `The magnet moves ${v > 0 ? "in" : "out"}: the needle kicks ${kick > 0 ? "right" : "left"}`;
  caption(ctx, layout, words, theme);
}

// ── Generator ────────────────────────────────────────────────────────────────

function drawGenerator(ctx: CanvasRenderingContext2D, layout: CurrentWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { cx, left, right, top, compact } = layout;
  const cy = top + (compact ? 78 : 90);
  const gap = compact ? 70 : 96;
  const a = compact ? 42 : 56;
  const ac = num(r.isAC) === 1;
  drawPoles(ctx, { ...layout, compact: true }, cy, gap, true, theme);

  const theta = num(r.genAngle);
  const s1 = { x: cx + a * Math.sin(theta), y: cy - a * Math.cos(theta) };
  const s2 = { x: cx - a * Math.sin(theta), y: cy + a * Math.cos(theta) };
  line(ctx, [[s1.x, s1.y], [s2.x, s2.y]], theme.neutral, 2);
  disc(ctx, s1.x, s1.y, 6, theme.surface2, theme.angle);
  disc(ctx, s2.x, s2.y, 6, theme.surface2, theme.angle);
  arrow(ctx, cx + a + 12, cy - 18, cx + a + 12, cy + 10, { color: theme.muted, width: 1.5, head: 6, alpha: 0.6 });

  // The output over one turn.
  const gx1 = left + 24;
  const gx2 = right - 8;
  const gmid = compact ? 238 : 262;
  const gh = compact ? 36 : 44;
  line(ctx, [[gx1, gmid], [gx2, gmid]], theme.axis, 1);
  line(ctx, [[gx1, gmid - gh - 4], [gx1, gmid + gh + 4]], theme.axis, 1);
  const curve: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const t = (TAU * i) / 120;
    const value = ac ? Math.sin(t) : Math.abs(Math.sin(t));
    curve.push([gx1 + ((gx2 - gx1) * i) / 120, gmid - gh * value]);
  }
  line(ctx, curve, theme.sine, 2);
  const out = num(r.genOutput);
  disc(ctx, gx1 + ((gx2 - gx1) * theta) / TAU, gmid - gh * out, 4, theme.angle, null);
  label(ctx, "current", gx1 + 4, gmid - gh - 10, { color: theme.muted, font: theme.font });
  label(ctx, "one turn", gx2, gmid + gh + 6, { color: theme.muted, font: theme.font, align: "right" });

  label(ctx, `${cwNumber(num(r.genSpeed))} turns each second`, left, top + 6, { color: theme.text, font: theme.font });
  label(ctx, ac ? "slip rings: AC" : "split ring: DC", right, top + 6, { color: theme.text, font: theme.font, align: "right" });
  if (labels && ac) {
    centred(ctx, layout, `${cwNumber(num(r.acFrequency))} Hz: it reverses ${cwNumber(num(r.reversals))} times a second`, cx, cy + 66, theme.angle, theme.font);
  }
  caption(ctx, layout, ac ? "Slip rings: the current changes direction" : "Split ring: the current always flows one way", theme);
}

export const currentWorkRenderer: SimulationRenderer<CurrentWorkLayout> = {
  id: "currentwork",
  layout: (width) => computeCurrentWorkLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const labels = layers.has("labels");
    ctx.clearRect(0, 0, layout.width, layout.height);
    if (layers.has("heat")) drawHeat(ctx, layout, results, theme, labels);
    else if (layers.has("house")) drawHouse(ctx, layout, results, theme, labels);
    else if (layers.has("nail")) drawNail(ctx, layout, results, theme, labels);
    else if (layers.has("field")) drawField(ctx, layout, results, theme, labels);
    else if (layers.has("motor")) drawMotor(ctx, layout, results, theme, labels);
    else if (layers.has("induction")) drawInduction(ctx, layout, results, theme, labels);
    else if (layers.has("generator")) drawGenerator(ctx, layout, results, theme, labels);
  },
};
