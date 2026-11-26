/**
 * Integers and rational numbers on the number line, for classes 6 to 8.
 *
 * Six panels, one per mode: a frog hopping along the integer line (adding and
 * subtracting); a vertical scale told as a thermometer, a lift, a bank
 * balance or the sea; the frog hopping out from 0 for a product, turned round
 * by each minus sign; two rationals on one line; the gap between two
 * rationals magnified, with the fractions that fit inside it; and fraction
 * bars recut into a common number of pieces to be added.
 *
 * Answers — where the frog lands, the product, the common bottom number —
 * are written only on the "labels" layer.
 */

import { INTEGERS_SCENE_ORDER, INTEGERS_SCENES, integersSigned } from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

export type IntegersPanelId = "hops" | "life" | "times" | "rational" | "zoom" | "bars";
export const INTEGERS_PANEL_ORDER: readonly IntegersPanelId[] = ["hops", "life", "times", "rational", "zoom", "bars"];
export const INTEGERS_PANEL_HEIGHT = 340;

export interface IntegersPanel {
  id: IntegersPanelId;
  top: number;
}

export interface IntegersLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right ends of every horizontal line. */
  x0: number;
  x1: number;
  panels: IntegersPanel[];
}

export function computeIntegersLayout(width: number, layers: ReadonlySet<string>): IntegersLayout {
  const compact = width < 560;
  const pad = compact ? 24 : 48;
  const shown = INTEGERS_PANEL_ORDER.filter((id) => layers.has(id));
  const ids = shown.length > 0 ? shown : (["hops"] as IntegersPanelId[]);
  const panels = ids.map((id, i) => ({ id, top: i * INTEGERS_PANEL_HEIGHT }));
  return { width, height: ids.length * INTEGERS_PANEL_HEIGHT, compact, x0: pad, x1: width - pad, panels };
}

/** x of a value on a line showing −half to +half. */
export function integersX(layout: IntegersLayout, value: number, half: number): number {
  return layout.x0 + ((layout.x1 - layout.x0) * (value + half)) / (2 * half);
}

/** Where each panel's line sits. */
export const hopsLineY = (top: number) => top + 200;
export const ratLineY = (top: number) => top + 170;
export const lifeScale = (top: number) => ({ top: top + 80, bottom: top + 316 });

/** Half-width of an integer line: ±10, or wider when a number needs it. */
export function integerWindow(...values: number[]): number {
  const far = Math.max(...values.map((v) => Math.abs(v)));
  return far <= 10 ? 10 : far <= 20 ? 20 : 25;
}

/** A fraction as written in a book: "−3/4", "5", and "3/(−4)" when the bottom is negative. */
export function integersFraction(n: number, d: number): string {
  if (d === 1) return integersSigned(n);
  return d < 0 ? `${integersSigned(n)}/(${integersSigned(d)})` : `${integersSigned(n)}/${d}`;
}

/** A number inside a sum, bracketed when negative: "(−5)". */
const term = (v: number) => (v < 0 ? `(${integersSigned(v)})` : String(v));
/** A decimal as a child would write it, with a true minus: "−0.75", "0.333". */
const decimal = (v: number) => integersSigned(Number(v.toFixed(3)) || 0);

const r = (results: Results, key: string, fallback = 0) => num(results[key], fallback);

function drawIntegerLine(ctx: CanvasRenderingContext2D, layout: IntegersLayout, y: number, half: number, theme: LabTheme) {
  ctx.save();
  // The negative side, faintly tinted.
  ctx.fillStyle = theme.cosine;
  ctx.globalAlpha = 0.08;
  ctx.fillRect(layout.x0, y - 80, integersX(layout, 0, half) - layout.x0, 88);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, layout.x0 - 10, y, layout.x1 + 10, y);
  ctx.lineWidth = 1.2;
  for (let k = -half; k <= half; k++) {
    const x = integersX(layout, k, half);
    const big = k % 5 === 0;
    segment(ctx, x, y - (big ? 8 : 5), x, y + (big ? 8 : 5));
  }
  ctx.lineWidth = 3;
  const x0 = integersX(layout, 0, half);
  segment(ctx, x0, y - 12, x0, y + 12);
  ctx.restore();
  // Every number on a wide canvas, every fifth on a phone or a long line.
  const every = !layout.compact && half === 10 ? 1 : half === 25 ? 5 : layout.compact ? 5 : 2;
  for (let k = -half; k <= half; k += every) {
    label(ctx, integersSigned(k), integersX(layout, k, half), y + 22, { color: k === 0 ? theme.text : theme.muted, font: k === 0 ? theme.fontStrong : theme.font, align: "center" });
  }
}

/** A round frog with two eyes, at (x, y), looking the way it is going. */
function drawFrog(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, theme: LabTheme) {
  ctx.save();
  ctx.fillStyle = theme.tangent;
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.background;
  const look = facing === 0 ? 0 : facing * 2.5;
  for (const dx of [-3.5, 3.5]) {
    ctx.beginPath();
    ctx.arc(x + dx + look, y - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Hop arcs from `from`, `count` hops of `size` each: the ones already made
 * solid, the rest faint and dashed — but only when `ahead` is on, since the
 * hops still to come give the answer away.
 */
function drawHops(ctx: CanvasRenderingContext2D, layout: IntegersLayout, y: number, half: number, from: number, size: number, count: number, done: number, color: string, ahead: boolean) {
  const height = Math.min(34, Math.max(12, (Math.abs(integersX(layout, size, half) - integersX(layout, 0, half)) * 0.9)));
  for (let k = 0; k < count; k++) {
    if (k >= Math.floor(done) && !ahead) break;
    const a = integersX(layout, from + size * k, half);
    const b = integersX(layout, from + size * (k + 1), half);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = k < Math.floor(done) ? 1 : 0.35;
    ctx.setLineDash(k < Math.floor(done) ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(a, y - 2);
    ctx.quadraticCurveTo((a + b) / 2, y - 2 - 2 * height, b, y - 2);
    ctx.stroke();
    ctx.restore();
  }
  return height;
}

/** Where the frog is drawn mid-hop: up an arc between two whole hops. */
function frogY(y: number, hop: number, count: number, height: number): number {
  const along = Math.min(hop, count);
  const frac = along >= count ? 0 : along - Math.floor(along);
  return y - 12 - height * Math.sin(Math.PI * frac);
}

function caption(ctx: CanvasRenderingContext2D, layout: IntegersLayout, text: string, y: number, color: string, font: string) {
  label(ctx, text, layout.width / 2, y, { color, font, align: "center" });
}

// ── Panels ───────────────────────────────────────────────────────────────────

function drawHopsPanel(ctx: CanvasRenderingContext2D, layout: IntegersLayout, top: number, results: Results, theme: LabTheme, labels: boolean) {
  const start = r(results, "start");
  const added = r(results, "added");
  const move = r(results, "move");
  const sign = r(results, "sign", 1);
  const result = r(results, "result");
  const hops = r(results, "hops");
  const direction = r(results, "direction");
  const half = integerWindow(start, result);
  const y = hopsLineY(top);
  drawIntegerLine(ctx, layout, y, half, theme);
  label(ctx, "← negative", layout.x0, y + 46, { color: theme.cosine, font: theme.font, align: "left" });
  label(ctx, "positive →", layout.x1, y + 46, { color: theme.sine, font: theme.font, align: "right" });

  // How far the frog has got, read back from its position.
  const along = hops === 0 ? 0 : Math.abs(r(results, "position", start) - start);
  const height = drawHops(ctx, layout, y, half, start, direction, hops, r(results, "landed") ? hops : along, theme.tangent, labels);

  // Start: a small flag under the line.
  const xs = integersX(layout, start, half);
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.moveTo(xs, y + 34);
  ctx.lineTo(xs - 6, y + 44);
  ctx.lineTo(xs + 6, y + 44);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Landing spot: a ring on the line (an answer, so with the labels).
  if (labels) {
  ctx.save();
  ctx.strokeStyle = theme.cosine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(integersX(layout, result, half), y, 7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  }

  const position = r(results, "position", start);
  drawFrog(ctx, integersX(layout, position, half), frogY(y, along, hops, height), direction, theme);

  if (labels) {
    const sum = sign < 0 ? `${integersSigned(start)} − ${term(move)} = ${integersSigned(start)} + ${term(added)} = ${integersSigned(result)}` : `${integersSigned(start)} + ${term(added)} = ${integersSigned(result)}`;
    caption(ctx, layout, sum, top + 26, theme.text, theme.fontStrong);
    const how = added === 0 ? "No hops: the frog stays put" : `${hops} hop${hops === 1 ? "" : "s"} to the ${direction > 0 ? "right" : "left"}`;
    caption(ctx, layout, sign < 0 ? `Subtracting ${term(move)} is adding ${term(added)}` : how, top + 50, theme.muted, theme.font);
    label(ctx, integersSigned(result), clamp(integersX(layout, result, half), layout.x0 + 14, layout.x1 - 14), y - 2 * height - 18, { color: theme.cosine, font: theme.fontStrong, align: "center", background: theme.background });
  }
}

const LIFE_UNITS = ["°C", "floor", "₹", "m"];

function lifeWords(sceneIndex: number, startAmount: number, change: number, amount: number): string {
  const id = INTEGERS_SCENE_ORDER[sceneIndex] ?? "temperature";
  const scene = INTEGERS_SCENES[id];
  const size = Math.abs(change);
  const up = change >= 0;
  const step =
    id === "temperature" ? `${size} °C ${up ? "warmer" : "colder"}`
    : id === "lift" ? `${up ? "up" : "down"} ${size} floor${size === 1 ? "" : "s"}`
    : id === "bank" ? `${up ? "save" : "spend"} ₹${size}`
    : `${up ? "up" : "down"} ${size} m`;
  return `${scene.format(startAmount)}, ${step}: ${scene.format(amount)}`;
}

function drawLifePanel(ctx: CanvasRenderingContext2D, layout: IntegersLayout, top: number, results: Results, theme: LabTheme, labels: boolean) {
  const sceneIndex = Math.round(r(results, "scene"));
  const id = INTEGERS_SCENE_ORDER[sceneIndex] ?? "temperature";
  const scene = INTEGERS_SCENES[id];
  const scale = r(results, "scale", 1);
  const start = r(results, "start");
  const result = r(results, "result");
  const position = r(results, "position", start);
  const half = integerWindow(start, result);
  const { top: yTop, bottom: yBottom } = lifeScale(top);
  const yOf = (v: number) => yBottom - ((yBottom - yTop) * (v + half)) / (2 * half);
  const x = layout.x0 + (layout.compact ? 70 : 120);
  const y0 = yOf(0);

  // The story's name; with labels on, the story itself takes its place.
  if (!labels) caption(ctx, layout, scene.label, top + 22, theme.text, theme.fontStrong);

  // Below zero: water for the sea, basements for the lift, and so on.
  ctx.save();
  ctx.fillStyle = id === "sea" ? theme.sine : theme.cosine;
  ctx.globalAlpha = id === "sea" ? 0.18 : 0.08;
  ctx.fillRect(layout.x0, y0, layout.x1 - layout.x0, yBottom - y0);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  segment(ctx, layout.x0, y0, layout.x1, y0);
  ctx.restore();
  label(ctx, scene.zero, layout.x1, y0 - 10, { color: theme.text, font: theme.font, align: "right" });
  label(ctx, scene.below, layout.x1, yBottom - 10, { color: theme.cosine, font: theme.font, align: "right" });

  // The scale, numbered every fifth step in the scene's own amounts.
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, x, yTop - 6, x, yBottom + 6);
  ctx.lineWidth = 1;
  for (let k = -half; k <= half; k++) segment(ctx, x - (k % 5 === 0 ? 8 : 4), yOf(k), x + (k % 5 === 0 ? 8 : 4), yOf(k));
  ctx.restore();
  for (let k = -half; k <= half; k += 5) label(ctx, integersSigned(k * scale), x - 14, yOf(k), { color: k === 0 ? theme.text : theme.muted, font: theme.font, align: "right" });
  label(ctx, LIFE_UNITS[INTEGERS_SCENE_ORDER.indexOf(id)] ?? "", x - 14, yTop - 18, { color: theme.muted, font: theme.font, align: "right" });

  if (id === "temperature") {
    // A thermometer: the column rises from the bottom to the reading.
    ctx.save();
    ctx.fillStyle = theme.secant;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x + 16, yOf(position), 10, yBottom - yOf(position));
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 16, yTop, 10, yBottom - yTop);
    ctx.restore();
  }

  // Start, and the marker that moves.
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.moveTo(x - 30, yOf(start));
  ctx.lineTo(x - 40, yOf(start) - 6);
  ctx.lineTo(x - 40, yOf(start) + 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const mx = x + (id === "temperature" ? 50 : 34);
  if (id === "lift") {
    ctx.save();
    ctx.fillStyle = theme.tangent;
    ctx.fillRect(mx - 12, yOf(position) - 10, 24, 20);
    ctx.restore();
  } else {
    drawFrog(ctx, mx, yOf(position), 0, theme);
  }
  const moving = Math.abs(result - start) > 0;
  if (moving && labels) arrow(ctx, mx + 24, yOf(start), mx + 24, yOf(result), { color: theme.cosine, width: 2, head: 8, dash: [4, 3], alpha: 0.8 });

  if (labels) {
    const words = lifeWords(sceneIndex, start * scale, r(results, "changeAmount"), r(results, "amount"));
    caption(ctx, layout, words, top + 22, theme.text, theme.fontStrong);
    caption(ctx, layout, `${integersSigned(start)} + ${term(r(results, "added"))} = ${integersSigned(result)} steps`, top + 44, theme.muted, theme.font);
    label(ctx, scene.format(r(results, "amount")), mx + 34, yOf(result), { color: theme.cosine, font: theme.fontStrong, align: "left", background: theme.background });
  }
}

function drawTimesPanel(ctx: CanvasRenderingContext2D, layout: IntegersLayout, top: number, results: Results, theme: LabTheme, labels: boolean) {
  const times = r(results, "times");
  const jump = r(results, "jump");
  const product = r(results, "product");
  const turns = r(results, "turns");
  const half = integerWindow(product, jump);
  const y = hopsLineY(top);
  drawIntegerLine(ctx, layout, y, half, theme);
  const count = Math.abs(times);
  const size = Math.sign(times) * jump;
  const along = size === 0 ? (r(results, "timesLanded") ? count : 0) : Math.abs(r(results, "timesPosition") / size);
  const height = drawHops(ctx, layout, y, half, 0, size, count, r(results, "timesLanded") ? count : along, theme.tangent, labels);
  const position = r(results, "timesPosition");
  drawFrog(ctx, integersX(layout, position, half), frogY(y, along, count, height), Math.sign(size), theme);

  // One "turn round" badge for each minus sign: on the count, on the jump.
  const badges: string[] = [];
  if (jump < 0) badges.push("hops point left");
  if (times < 0) badges.push("turned round");
  label(ctx, `${term(times)} × ${term(jump)}: ${count} hop${count === 1 ? "" : "s"} of ${term(jump)}`, layout.width / 2, top + 74, { color: theme.text, font: theme.font, align: "center" });
  if (badges.length > 0) label(ctx, badges.join(" · "), layout.width / 2, top + 92, { color: theme.secant, font: theme.font, align: "center" });

  if (labels) {
    caption(ctx, layout, `${term(times)} × ${term(jump)} = ${integersSigned(product)}`, top + 26, theme.text, theme.fontStrong);
    const why =
      product === 0 ? "Anything times 0 is 0"
      : turns === 2 ? "Two minus signs: turned round twice, so positive"
      : turns === 1 ? "One minus sign: turned round once, so negative"
      : "No minus signs: the answer is positive";
    caption(ctx, layout, why, top + 50, theme.muted, theme.font);
    if (jump !== 0) caption(ctx, layout, `and back again: ${term(product)} ÷ ${term(jump)} = ${integersSigned(times)}`, y + 72, theme.muted, theme.font);
    label(ctx, integersSigned(product), clamp(integersX(layout, product, half), layout.x0 + 14, layout.x1 - 14), y - 2 * height - 18, { color: theme.cosine, font: theme.fontStrong, align: "center", background: theme.background });
  }
}

/** Half-width of the rational line: big enough for both points, at least 1. */
export function rationalWindow(...values: number[]): number {
  return Math.max(1, Math.min(12, Math.ceil(Math.max(...values.map((v) => Math.abs(v))) - 1e-9)));
}

function drawRationalPanel(ctx: CanvasRenderingContext2D, layout: IntegersLayout, top: number, results: Results, theme: LabTheme, labels: boolean) {
  const p = r(results, "p");
  const q = r(results, "q", 1);
  const p2 = r(results, "p2");
  const q2 = r(results, "q2", 1);
  const valid = r(results, "valid") === 1;
  const valid2 = r(results, "valid2") === 1;
  const v1 = r(results, "value");
  const v2 = r(results, "value2");
  const half = rationalWindow(valid ? v1 : 0, valid2 ? v2 : 0);
  const y = ratLineY(top);

  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, layout.x0 - 10, y, layout.x1 + 10, y);
  // Small ticks every 1/|q|, when there are not too many to see.
  const pieces = Math.abs(q);
  if (valid && 2 * half * pieces <= 60) {
    ctx.lineWidth = 1;
    for (let k = -half * pieces; k <= half * pieces; k++) {
      const x = integersX(layout, k / pieces, half);
      segment(ctx, x, y - 5, x, y + 5);
    }
  }
  ctx.lineWidth = 2.5;
  for (let k = -half; k <= half; k++) {
    const x = integersX(layout, k, half);
    segment(ctx, x, y - 10, x, y + 10);
  }
  ctx.restore();
  const every = half <= 3 || !layout.compact ? (half <= 6 ? 1 : 2) : half <= 6 ? 2 : 4;
  for (let k = -half; k <= half; k += every) label(ctx, integersSigned(k), integersX(layout, k, half), y + 24, { color: k === 0 ? theme.text : theme.muted, font: theme.font, align: "center" });

  const dot = (v: number, color: string, yy: number) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(integersX(layout, v, half), yy, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  if (valid) dot(v1, theme.angle, y);
  if (valid2) dot(v2, theme.cosine, y);

  // Fractions with a bottom of 0 are not numbers: say so plainly.
  if (!valid) caption(ctx, layout, `${integersSigned(p)}/0 is not a number: q can't be 0`, top + 100, theme.secant, theme.fontStrong);
  else if (!valid2) caption(ctx, layout, `${integersSigned(p2)}/0 is not a number: q can't be 0`, top + 100, theme.secant, theme.fontStrong);

  if (labels) {
    const name = (pp: number, qq: number, n: number, d: number, v: number) => {
      const raw = integersFraction(pp, qq);
      const std = integersFraction(n, d);
      return raw === std ? `${std} = ${decimal(v)}` : `${raw} = ${std}`;
    };
    const tag = (v: number, text: string, color: string, yy: number) =>
      label(ctx, text, clamp(integersX(layout, v, half), layout.x0 + 40, layout.x1 - 40), yy, { color, font: theme.fontStrong, align: "center", background: theme.background });
    if (valid) tag(v1, name(p, q, r(results, "stdN"), r(results, "stdD", 1), v1), theme.angle, y - 30);
    if (valid2) tag(v2, name(p2, q2, r(results, "std2N"), r(results, "std2D", 1), v2), theme.cosine, y + 52);
    if (valid && valid2) {
      const c = r(results, "compare");
      const a = integersFraction(r(results, "stdN"), r(results, "stdD", 1));
      const b = integersFraction(r(results, "std2N"), r(results, "std2D", 1));
      caption(ctx, layout, `${a} ${c < 0 ? "<" : c > 0 ? ">" : "="} ${b}`, top + 30, theme.text, theme.fontStrong);
      caption(ctx, layout, c === 0 ? "Two names for the same point" : "Further right is bigger", top + 52, theme.muted, theme.font);
    }
  }
}

function drawZoomPanel(ctx: CanvasRenderingContext2D, layout: IntegersLayout, top: number, results: Results, theme: LabTheme, labels: boolean) {
  const valid = r(results, "valid") === 1 && r(results, "valid2") === 1;
  if (!valid) {
    caption(ctx, layout, "A bottom number of 0 is not allowed", top + 120, theme.secant, theme.fontStrong);
    return;
  }
  const a = r(results, "value");
  const b = r(results, "value2");
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const aName = integersFraction(r(results, "stdN"), r(results, "stdD", 1));
  const bName = integersFraction(r(results, "std2N"), r(results, "std2D", 1));

  // Top: the whole numbers around both points, with the gap shaded.
  const left = Math.floor(lo);
  const right = Math.max(left + 1, Math.ceil(hi));
  const yTop = top + 80;
  const xt = (v: number) => layout.x0 + ((layout.x1 - layout.x0) * (v - left)) / (right - left);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, layout.x0, yTop, layout.x1, yTop);
  for (let k = left; k <= right; k++) segment(ctx, xt(k), yTop - 8, xt(k), yTop + 8);
  ctx.fillStyle = theme.tangent;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(xt(lo), yTop - 6, Math.max(2, xt(hi) - xt(lo)), 12);
  ctx.restore();
  const step = right - left > 8 ? Math.ceil((right - left) / 6) : 1;
  for (let k = left; k <= right; k += step) label(ctx, integersSigned(k), xt(k), yTop + 20, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, aName, xt(a), yTop - 18, { color: theme.angle, font: theme.fontStrong, align: a <= b ? "right" : "left" });
  label(ctx, bName, xt(b), yTop - 18, { color: theme.cosine, font: theme.fontStrong, align: a <= b ? "left" : "right" });

  // Below: the gap blown up to the full width, cut into 1/commonD pieces.
  const yLow = top + 210;
  const margin = (layout.x1 - layout.x0) * 0.08;
  const xl = (v: number) => (hi - lo < 1e-12 ? layout.width / 2 : layout.x0 + margin + ((layout.x1 - layout.x0 - 2 * margin) * (v - lo)) / (hi - lo));
  ctx.save();
  ctx.strokeStyle = theme.tangent;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  segment(ctx, xt(lo), yTop + 8, xl(lo), yLow - 12);
  segment(ctx, xt(hi), yTop + 8, xl(hi), yLow - 12);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, layout.x0, yLow, layout.x1, yLow);
  ctx.restore();

  const d = r(results, "commonD", 1);
  const aOver = r(results, "aOver");
  const bOver = r(results, "bOver");
  const from = Math.min(aOver, bOver);
  const to = Math.max(aOver, bOver);
  const between = r(results, "between");
  if (to - from <= 60) {
    for (let k = from + 1; k < to; k++) {
      ctx.save();
      ctx.fillStyle = theme.tangent;
      ctx.beginPath();
      ctx.arc(xl(k / d), yLow, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    for (let k = from; k <= to; k++) segment(ctx, xl(k / d), yLow - 6, xl(k / d), yLow + 6);
    ctx.restore();
  } else {
    ctx.save();
    ctx.fillStyle = theme.tangent;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(xl(lo), yLow - 3, xl(hi) - xl(lo), 6);
    ctx.restore();
  }
  for (const [v, color] of [[a, theme.angle], [b, theme.cosine]] as const) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(xl(v), yLow, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  label(ctx, `pieces of 1/${d}`, layout.width / 2, yLow + 48, { color: theme.muted, font: theme.font, align: "center" });

  if (labels) {
    label(ctx, `${aOver}/${d}`, xl(a), yLow + 24, { color: theme.angle, font: theme.fontStrong, align: "center" });
    label(ctx, `${bOver}/${d}`, xl(b), yLow + 24, { color: theme.cosine, font: theme.fontStrong, align: "center" });
    const many = between === 1 ? "1 fraction fits between" : `${between} fractions fit between`;
    caption(ctx, layout, `${many} ${aName} and ${bName}`, top + 24, theme.text, theme.fontStrong);
    caption(ctx, layout, `Halfway: ${integersFraction(r(results, "midN"), r(results, "midD", 1))} · cut finer for more`, yLow + 72, theme.muted, theme.font);
  }
}

function drawBarsPanel(ctx: CanvasRenderingContext2D, layout: IntegersLayout, top: number, results: Results, theme: LabTheme, labels: boolean) {
  const valid = r(results, "valid") === 1 && r(results, "valid2") === 1;
  const sign = r(results, "sign", 1);
  const q = r(results, "q", 1);
  const q2 = r(results, "q2", 1);
  const aD = Math.abs(q);
  const bD = Math.abs(q2);
  const aN = Math.sign(q) * r(results, "p");
  const bN = Math.sign(q2) * r(results, "p2");
  const lcd = r(results, "lcd", 1);
  const sumOver = r(results, "sumOver");
  const op = sign < 0 ? "−" : "+";
  const aName = integersFraction(aN, aD || 1);
  const bName = integersFraction(bN, bD || 1);

  if (!valid) {
    caption(ctx, layout, "A bottom number of 0 is not allowed", top + 120, theme.secant, theme.fontStrong);
    return;
  }
  const drawable = aN >= 0 && aN <= aD && bN >= 0 && bN <= bD && sumOver >= 0;
  const wholes = sumOver > lcd ? 2 : 1;
  const nameW = 44;
  const bx0 = layout.x0 + nameW;
  const bx1 = layout.x1;
  const xs = (v: number) => bx0 + ((bx1 - bx0) * v) / wholes;
  const barH = 30;

  const bar = (y: number, n: number, d: number, color: string, recut: number | null) => {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    for (let k = 0; k < n; k++) ctx.fillRect(xs(k / d), y, xs((k + 1) / d) - xs(k / d), barH);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx0, y, bx1 - bx0, barH);
    for (let k = 1; k < d * wholes; k++) segment(ctx, xs(k / d), y, xs(k / d), y + barH);
    if (recut) {
      // The finer common cut, thin and dashed, over the original pieces.
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      for (let k = 1; k < recut * wholes; k++) segment(ctx, xs(k / recut), y, xs(k / recut), y + barH);
    }
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    if (wholes === 2) segment(ctx, xs(1), y, xs(1), y + barH);
    ctx.restore();
  };

  const y1 = top + 70;
  const y2 = top + 130;
  const y3 = top + 220;
  label(ctx, aName, layout.x0, y1 + barH / 2, { color: theme.angle, font: theme.fontStrong, align: "left" });
  label(ctx, `${op} ${bName}`, layout.x0, y2 + barH / 2, { color: theme.cosine, font: theme.fontStrong, align: "left" });
  if (drawable) {
    bar(y1, aN, aD, theme.angle, labels ? lcd : null);
    bar(y2, bN, bD, theme.cosine, labels ? lcd : null);
  } else {
    caption(ctx, layout, "The bars show fractions from 0 to 1", y1 + 40, theme.muted, theme.font);
  }

  if (labels) {
    if (drawable) {
      label(ctx, "=", layout.x0, y3 + barH / 2, { color: theme.text, font: theme.fontStrong, align: "left" });
      bar(y3, sumOver, lcd, theme.tangent, null);
    }
    const sumName = integersFraction(r(results, "sumN"), r(results, "sumD", 1));
    const over = `${r(results, "aScaled")}/${lcd} ${op} ${integersSigned(r(results, "bScaled"))}/${lcd}`;
    const raw = `${integersSigned(sumOver)}/${lcd}`;
    const tail = raw === sumName ? sumName : `${raw} = ${sumName}`;
    caption(ctx, layout, `${aName} ${op} ${bName} = ${over} = ${tail}`, top + 26, theme.text, theme.fontStrong);
    caption(ctx, layout, `Both cut into ${lcd}ths, then ${sign < 0 ? "take away" : "add"} the tops`, y3 + barH + 34, theme.muted, theme.font);
  }
}

export const integersRenderer: SimulationRenderer<IntegersLayout> = {
  id: "integers",
  layout: (width, _graphs, layers) => computeIntegersLayout(width, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const labels = layers.has("labels");
    ctx.clearRect(0, 0, layout.width, layout.height);
    for (const panel of layout.panels) {
      switch (panel.id) {
        case "hops": drawHopsPanel(ctx, layout, panel.top, results, theme, labels); break;
        case "life": drawLifePanel(ctx, layout, panel.top, results, theme, labels); break;
        case "times": drawTimesPanel(ctx, layout, panel.top, results, theme, labels); break;
        case "rational": drawRationalPanel(ctx, layout, panel.top, results, theme, labels); break;
        case "zoom": drawZoomPanel(ctx, layout, panel.top, results, theme, labels); break;
        case "bars": drawBarsPanel(ctx, layout, panel.top, results, theme, labels); break;
      }
    }
  },

  /** Drag the frog's start along the line (or up the scale), or a rational along its line. */
  pick(layout, x, y, locked, results: Results): PickResult | null {
    const panel = layout.panels.find((p) => y >= p.top && y < p.top + INTEGERS_PANEL_HEIGHT) ?? layout.panels[0];
    if (!panel) return null;
    const along = (half: number) => -half + ((clamp(x, layout.x0, layout.x1) - layout.x0) / (layout.x1 - layout.x0)) * 2 * half;
    if (panel.id === "hops" && (!locked || locked === "start")) {
      const half = integerWindow(r(results, "start"), r(results, "result"));
      return { writes: [{ variable: "start", value: Math.round(along(half)) }], region: "start", press: "jump" };
    }
    if (panel.id === "life" && (!locked || locked === "life")) {
      const half = integerWindow(r(results, "start"), r(results, "result"));
      const { top, bottom } = lifeScale(panel.top);
      const v = -half + ((bottom - clamp(y, top, bottom)) / (bottom - top)) * 2 * half;
      return { writes: [{ variable: "start", value: Math.round(v) }], region: "life", press: "jump" };
    }
    if (panel.id === "rational") {
      const valid = r(results, "valid") === 1;
      const valid2 = r(results, "valid2") === 1;
      const half = rationalWindow(valid ? r(results, "value") : 0, valid2 ? r(results, "value2") : 0);
      const v = along(half);
      const second = locked ? locked === "p2" : valid2 && (!valid || Math.abs(v - r(results, "value2")) < Math.abs(v - r(results, "value")));
      const q = second ? r(results, "q2", 1) : r(results, "q", 1);
      if (q === 0) return null;
      return { writes: [{ variable: second ? "p2" : "p", value: Math.round(v * q) }], region: second ? "p2" : "p", press: "jump" };
    }
    return null;
  },
};
