/**
 * Work and power for class 9: four small scenes, one per mode, picked by the
 * layers on show.
 *
 * - "push": a box (or a carried bag) moving a distance s while a force acts
 *   along the motion, against it (friction), or at right angles to it.
 * - "load": a load raised a height h at a steady speed.
 * - "stairs": two climbers of the same mass going up the same stairs, one
 *   faster than the other.
 * - "meter": an appliance, the hours it is on, and an electricity meter.
 *
 * Numbers a level asks the learner to estimate (the work, the power, the
 * units on the meter) are written only with "labels".
 */

import type { Results } from "@ise/science-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface SchoolWorkLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right edges of the drawing. */
  left: number;
  right: number;
  /** The floor of the push scene. */
  floor: number;
  /** The ground of the lift and stairs scenes. */
  ground: number;
  /** Where the bottom caption sits; two more lines can sit above it. */
  captionY: number;
}

export function computeSchoolWorkLayout(width: number): SchoolWorkLayout {
  const compact = width < 560;
  const height = compact ? 360 : 400;
  return {
    width,
    height,
    compact,
    left: 16,
    right: width - 16,
    floor: compact ? 220 : 240,
    ground: height - 80,
    captionY: height - 14,
  };
}

const SUPERSCRIPT: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** 3.60 × 10⁶ style, for very small or large numbers. */
export function swScientific(x: number, figures = 3): string {
  if (x === 0) return "0";
  let e = Math.floor(Math.log10(Math.abs(x)));
  let mantissa = x / 10 ** e;
  if (Math.abs(+mantissa.toFixed(figures - 1)) >= 10) {
    mantissa /= 10;
    e += 1;
  }
  const power = String(e).split("").map((c) => SUPERSCRIPT[c] ?? c).join("");
  return `${mantissa.toFixed(figures - 1)} × 10${power}`;
}

/** Whole numbers with grouping (1 470), small ones to two places, huge ones in powers of ten; a true minus sign. */
export function swNumber(x: number): string {
  const a = Math.abs(x);
  let text: string;
  if (a >= 1e6 || (a > 0 && a < 0.01)) text = swScientific(a);
  else if (a >= 1000) text = Math.round(a).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  else if (a >= 100) text = Math.round(a).toString();
  else if (a >= 10) text = (+a.toFixed(1)).toString();
  else text = (+a.toFixed(2)).toString();
  return x < 0 && text !== "0" ? `−${text}` : text;
}

/** Like swNumber, but small values as plain decimals (0.0025), for kW and kWh. */
export function swDecimal(x: number): string {
  const a = Math.abs(x);
  return a > 0 && a < 0.01 ? `${x < 0 ? "−" : ""}${+a.toFixed(4)}` : swNumber(x);
}

/** Rupees, to the paisa when needed: ₹5, ₹1.8, ₹112.5. */
export function swRupees(x: number): string {
  return `₹${+Math.max(0, x).toFixed(2)}`;
}

/** Keep a centred text (≈6.5 px a character) inside the canvas. */
function fitX(x: number, text: string, layout: SchoolWorkLayout): number {
  const half = (text.length * 6.5) / 2;
  return clamp(x, half + 4, layout.width - half - 4);
}

function centred(ctx: CanvasRenderingContext2D, layout: SchoolWorkLayout, text: string, x: number, y: number, color: string, font: string) {
  label(ctx, text, fitX(x, text, layout), y, { color, font, align: "center" });
}

/** One of up to three caption lines: 0 is the bottom line. */
function caption(ctx: CanvasRenderingContext2D, layout: SchoolWorkLayout, text: string, line: number, theme: LabTheme) {
  centred(ctx, layout, text, layout.width / 2, layout.captionY - 18 * line, line === 0 ? theme.text : theme.muted, theme.font);
}

function dashed(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function stickFigure(ctx: CanvasRenderingContext2D, x: number, feet: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, feet - 34, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x, feet - 28);
  ctx.lineTo(x, feet - 12);
  ctx.moveTo(x, feet - 12);
  ctx.lineTo(x - 5, feet);
  ctx.moveTo(x, feet - 12);
  ctx.lineTo(x + 5, feet);
  ctx.moveTo(x - 7, feet - 22);
  ctx.lineTo(x + 7, feet - 22);
  ctx.stroke();
  ctx.restore();
}

// ── Work: force and distance ─────────────────────────────────────────────────

const ALONG = 0;
const AGAINST = 1;
const ACROSS = 2;

function pushTitle(direction: number, distance: number): string {
  if (distance === 0) return "It does not move: s = 0";
  if (direction === AGAINST) return "Friction acts against the motion";
  if (direction === ACROSS) return "Carrying a bag along level ground";
  return "A force along the way it moves";
}

function pushSum(r: Results): string {
  const direction = Math.round(num(r.direction));
  const F = swNumber(num(r.force));
  const s = swNumber(num(r.distance));
  const W = swNumber(num(r.work));
  if (num(r.distance) === 0) return `Nothing moves: W = ${F} N × 0 m = 0 J`;
  if (direction === ACROSS) return "Force at right angles to the motion: W = 0 J";
  if (direction === AGAINST) return `W = −F × s = −(${F} N × ${s} m) = ${W} J`;
  return `W = F × s = ${F} N × ${s} m = ${W} J`;
}

function signWords(r: Results): string {
  const s = Math.round(num(r.workSign));
  if (s > 0) return "Positive work: the force helps the motion";
  if (s < 0) return "Negative work: the force opposes the motion";
  return "Zero work";
}

function drawPush(ctx: CanvasRenderingContext2D, layout: SchoolWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { compact, left, right, floor } = layout;
  const direction = clamp(Math.round(num(r.direction)), 0, 2);
  const force = num(r.force);
  const distance = num(r.distance);
  const moved = clamp(num(r.moved), 0, distance);
  const maxL = compact ? 40 : 70;
  const bw = compact ? 46 : 60;
  const bh = compact ? 38 : 46;
  const x0 = left + maxL + 8;
  const span = right - maxL - 8 - bw - x0;
  const ppm = span / Math.max(5, distance);
  const bx = x0 + moved * ppm;
  const centre = bx + bw / 2;

  label(ctx, pushTitle(direction, distance), left, 18, { color: theme.text, font: theme.fontStrong });

  // The floor, and where the object starts and stops.
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(left, floor, right - left, 14);
  ctx.restore();
  dashed(ctx, x0, floor - bh - 6, x0, floor, theme.muted);
  dashed(ctx, x0 + distance * ppm, floor - bh - 6, x0 + distance * ppm, floor, theme.muted);

  const L = force > 0 ? 10 + (clamp(force, 0, 100) / 100) * (maxL - 10) : 0;
  if (direction === ACROSS) {
    // A person carrying a bag: the force holding it up is at right angles to the way it moves.
    const bagTop = floor - 46;
    stickFigure(ctx, centre - bw / 2 - 2, floor, theme.neutral);
    ctx.save();
    ctx.fillStyle = theme.surface2;
    ctx.strokeStyle = theme.secant;
    ctx.lineWidth = 1.5;
    ctx.fillRect(centre - 14, bagTop, 28, 26);
    ctx.strokeRect(centre - 14, bagTop, 28, 26);
    ctx.restore();
    if (L > 0) {
      arrow(ctx, centre, bagTop - 2, centre, bagTop - 2 - L, { color: theme.sine, width: 3, head: 8 });
      label(ctx, `F = ${swNumber(force)} N`, centre + 8, bagTop - 2 - L / 2, { color: theme.sine, font: theme.font });
    }
  } else {
    ctx.save();
    ctx.fillStyle = theme.surface2;
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 1.5;
    ctx.fillRect(bx, floor - bh, bw, bh);
    ctx.strokeRect(bx, floor - bh, bw, bh);
    ctx.restore();
    if (L > 0 && direction === ALONG) {
      arrow(ctx, bx + bw + 2, floor - bh / 2, bx + bw + 2 + L, floor - bh / 2, { color: theme.sine, width: 3, head: 8 });
      centred(ctx, layout, `F = ${swNumber(force)} N`, bx + bw + 2 + L / 2, floor - bh - 14, theme.sine, theme.font);
    } else if (L > 0) {
      arrow(ctx, bx - 2, floor - 6, bx - 2 - L, floor - 6, { color: theme.cosine, width: 3, head: 8 });
      centred(ctx, layout, `friction ${swNumber(force)} N`, bx - 2 - L / 2, floor - bh - 14, theme.cosine, theme.font);
    }
  }

  // The distance moved, below the floor.
  const y = floor + 28;
  const start = x0 + bw / 2;
  if (distance > 0) arrow(ctx, start, y, start + distance * ppm, y, { color: theme.angle, width: 2, head: 7 });
  centred(ctx, layout, `s = ${swNumber(distance)} m`, start + (distance * ppm) / 2, y + 16, theme.angle, theme.font);

  if (labels) {
    label(ctx, `work so far ${swNumber(num(r.workSoFar))} J`, right, 40, { color: theme.curve, font: theme.font, align: "right" });
    caption(ctx, layout, signWords(r), 1, theme);
    caption(ctx, layout, pushSum(r), 0, theme);
  }
}

// ── Lifting a load ───────────────────────────────────────────────────────────

function drawLoad(ctx: CanvasRenderingContext2D, layout: SchoolWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { left, right, ground } = layout;
  const cx = layout.width / 2;
  const mass = num(r.mass);
  const h = num(r.height);
  const now = clamp(num(r.liftNow), 0, h);
  const beam = 52;
  const boxW = 54;
  const boxH = 34;
  const room = ground - (beam + 40) - boxH;
  const ppm = Math.min(90, room / Math.max(0.5, h));

  label(ctx, "Lifting a load at a steady speed", left, 18, { color: theme.text, font: theme.fontStrong });

  // Ground, mast and beam.
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(left, ground, right - left, 12);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.reference;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(right - 10, ground);
  ctx.lineTo(right - 10, beam);
  ctx.lineTo(cx - 20, beam);
  ctx.stroke();
  ctx.restore();

  // The rope and the load.
  const bottom = ground - now * ppm;
  const top = bottom - boxH;
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, beam);
  ctx.lineTo(cx, top);
  ctx.stroke();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.neutral;
  ctx.fillRect(cx - boxW / 2, top, boxW, boxH);
  ctx.strokeRect(cx - boxW / 2, top, boxW, boxH);
  ctx.restore();
  label(ctx, `${swNumber(mass)} kg`, cx, top + boxH / 2, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The lifting force up, the weight down: equal, for a steady lift.
  arrow(ctx, cx + boxW / 2 + 10, bottom - 4, cx + boxW / 2 + 10, top - 26, { color: theme.sine, width: 2.5, head: 7 });
  label(ctx, "F = m g", cx + boxW / 2 + 16, top - 16, { color: theme.sine, font: theme.font });
  arrow(ctx, cx - boxW / 2 - 10, top + 4, cx - boxW / 2 - 10, bottom + 22, { color: theme.cosine, width: 2.5, head: 7 });
  const weight = labels ? `m g = ${swNumber(num(r.weight))} N` : "m g";
  centred(ctx, layout, weight, cx - boxW / 2 - 10, bottom + 34, theme.cosine, theme.font);

  // The height it is raised.
  const target = ground - h * ppm;
  dashed(ctx, cx - boxW / 2 - 24, target, cx + boxW / 2 + 24, target, theme.angle);
  if (h > 0) arrow(ctx, left + 4, ground, left + 4, target, { color: theme.angle, width: 1.5, head: 6, double: true });
  label(ctx, `h = ${swNumber(h)} m`, left + 10, (ground + target) / 2, { color: theme.angle, font: theme.font });

  if (labels) {
    label(ctx, `work so far ${swNumber(num(r.liftWorkSoFar))} J`, right - 18, 38, { color: theme.curve, font: theme.font, align: "right" });
    caption(ctx, layout, `W = m g h = ${swNumber(mass)} × 9.8 × ${swNumber(h)} = ${swNumber(num(r.liftWork))} J`, 0, theme);
  } else {
    caption(ctx, layout, "work done = weight × height raised", 0, theme);
  }
}

// ── Power: two climbers ──────────────────────────────────────────────────────

function drawStairs(ctx: CanvasRenderingContext2D, layout: SchoolWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { left, right, ground } = layout;
  const h = num(r.height);
  const topY = 80;
  const x0 = left + 20;
  const x1 = right - 60;
  const steps = 6;
  const stepW = (x1 - x0) / steps;
  const rise = (ground - topY) / steps;

  // The stairs.
  ctx.save();
  ctx.strokeStyle = theme.reference;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, ground);
  ctx.lineTo(x0, ground);
  for (let i = 0; i < steps; i++) {
    ctx.lineTo(x0 + i * stepW, ground - (i + 1) * rise);
    ctx.lineTo(x0 + (i + 1) * stepW, ground - (i + 1) * rise);
  }
  ctx.lineTo(right - 30, topY);
  ctx.stroke();
  ctx.restore();
  arrow(ctx, right - 10, ground, right - 10, topY, { color: theme.angle, width: 1.5, head: 6, double: true });
  label(ctx, `h = ${swNumber(h)} m`, right - 16, (ground + topY) / 2 + 20, { color: theme.angle, font: theme.font, align: "right" });

  // The climbers, each on its way up the slope of the stairs.
  const place = (climb: number) => {
    const f = h > 0 ? clamp(climb / h, 0, 1) : 0;
    return { x: x0 + f * (x1 - x0), feet: ground - f * (ground - topY) };
  };
  const a = place(num(r.climbA));
  const b = place(num(r.climbB));
  stickFigure(ctx, b.x - 6, b.feet, theme.secant);
  stickFigure(ctx, a.x + 6, a.feet, theme.sine);
  label(ctx, "B", b.x - 6, b.feet - 50, { color: theme.secant, font: theme.fontStrong, align: "center" });
  label(ctx, "A", a.x + 6, a.feet - 50, { color: theme.sine, font: theme.fontStrong, align: "center" });

  label(ctx, `Each climber: ${swNumber(num(r.mass))} kg, up ${swNumber(h)} m`, left, 18, { color: theme.text, font: theme.fontStrong });
  label(ctx, `A takes ${swNumber(num(r.timeA))} s, B takes ${swNumber(num(r.timeB))} s`, left, 38, { color: theme.muted, font: theme.font });
  label(ctx, `t = ${num(r.t).toFixed(1)} s`, right, 18, { color: theme.text, font: theme.font, align: "right" });

  if (labels) {
    const W = swNumber(num(r.liftWork));
    caption(ctx, layout, `Same work for each: m g h = ${W} J`, 2, theme);
    caption(ctx, layout, `A: ${W} J ÷ ${swNumber(num(r.timeA))} s = ${swNumber(num(r.powerA))} W`, 1, theme);
    caption(ctx, layout, `B: ${W} J ÷ ${swNumber(num(r.timeB))} s = ${swNumber(num(r.powerB))} W`, 0, theme);
  } else {
    caption(ctx, layout, "power = work done ÷ time taken", 0, theme);
  }
}

// ── The electricity bill ─────────────────────────────────────────────────────

function drawMeter(ctx: CanvasRenderingContext2D, layout: SchoolWorkLayout, r: Results, theme: LabTheme, labels: boolean) {
  const { left, right } = layout;
  const cx = layout.width / 2;
  const watts = num(r.appliance);
  const hours = num(r.hours);
  const days = num(r.days, 1);
  const kWh = num(r.energyKWh);

  label(ctx, "An electricity meter counts kWh", left, 18, { color: theme.text, font: theme.fontStrong });

  // The appliance: a lamp that glows brighter for more watts.
  const bx = left + 46;
  const by = 100;
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.globalAlpha = 0.25 + 0.6 * clamp(Math.log10(Math.max(1, watts)) / Math.log10(3000), 0, 1);
  ctx.beginPath();
  ctx.arc(bx, by, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.neutral;
  ctx.fillRect(bx - 9, by + 22, 18, 12);
  ctx.restore();
  label(ctx, `${swNumber(watts)} W`, bx, by + 50, { color: theme.angle, font: theme.fontStrong, align: "center" });
  label(ctx, `on ${swNumber(hours)} h a day`, left, by + 70, { color: theme.text, font: theme.font });
  label(ctx, `for ${swNumber(days)} ${days === 1 ? "day" : "days"}`, left, by + 88, { color: theme.text, font: theme.font });

  // The meter.
  const mx = cx + 10;
  const mw = right - mx;
  arrow(ctx, bx + 30, by, mx - 6, by, { color: theme.muted, width: 1.5, head: 6 });
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.fillRect(mx, by - 40, mw, 84);
  ctx.strokeRect(mx, by - 40, mw, 84);
  ctx.fillStyle = theme.background;
  ctx.fillRect(mx + 10, by - 12, mw - 20, 30);
  ctx.restore();
  label(ctx, "units used", mx + mw / 2, by - 26, { color: theme.muted, font: theme.font, align: "center" });
  const reading = labels ? `${swDecimal(kWh)} kWh` : "? kWh";
  label(ctx, reading, mx + mw / 2, by + 3, { color: theme.tangent, font: theme.fontStrong, align: "center" });
  label(ctx, `${swRupees(num(r.rate))} a unit`, mx + mw / 2, by + 62, { color: theme.muted, font: theme.font, align: "center" });

  if (labels) {
    const units = `${swDecimal(kWh)} ${kWh === 1 ? "unit" : "units"}`;
    caption(ctx, layout, `${swDecimal(num(r.applianceKW))} kW × ${swNumber(num(r.totalHours))} h = ${swDecimal(kWh)} kWh = ${units}`, 2, theme);
    caption(ctx, layout, `= ${swNumber(num(r.energyJ))} J, as 1 kWh = 3.6 × 10⁶ J`, 1, theme);
    caption(ctx, layout, `Bill: ${units} × ${swRupees(num(r.rate))} = ${swRupees(num(r.cost))}`, 0, theme);
  } else {
    caption(ctx, layout, "1 kWh = 1 kW used for 1 hour = one unit", 0, theme);
  }
}

export const schoolWorkRenderer: SimulationRenderer<SchoolWorkLayout> = {
  id: "schoolwork",
  layout: (width) => computeSchoolWorkLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const labels = layers.has("labels");
    ctx.clearRect(0, 0, layout.width, layout.height);
    if (layers.has("push")) drawPush(ctx, layout, results, theme, labels);
    else if (layers.has("load")) drawLoad(ctx, layout, results, theme, labels);
    else if (layers.has("stairs")) drawStairs(ctx, layout, results, theme, labels);
    else if (layers.has("meter")) drawMeter(ctx, layout, results, theme, labels);
  },
};
