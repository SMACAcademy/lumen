/**
 * Big numbers and proportion, one picture per mode.
 *
 * Place: the same nine digits in two place-value charts, split into Indian
 * periods (crores, lakhs, thousands, ones) and international periods
 * (millions, thousands, ones), with the commas and the words both ways.
 * Round: a number line from the multiple below to the multiple above, with
 * the halfway mark, so you can see which end is nearer.
 * Estimate: a sum as two bars (exact and rounded), and a product as a
 * rectangle with the rounded rectangle drawn over it.
 * Roman: the number one place at a time, each place in Roman numerals, and
 * the seven symbols.
 * Direct and inverse: pens and their cost, workers and the days a job takes,
 * as a table and a small graph. Graphs: both graphs, large.
 *
 * Answers (rounded values, estimates, costs, days) appear only with the
 * labels layer.
 */

import {
  BIG_NUMBERS_LIMITS,
  BIG_NUMBERS_PLACE_NAMES,
  BIG_NUMBERS_ROMAN_SYMBOLS,
  bigNumbersIndianCommas,
  bigNumbersIndianWords,
  bigNumbersInternationalCommas,
  bigNumbersInternationalWords,
  bigNumbersRomanParts,
  bigNumbersToRoman,
} from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface BigNumbersLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right edges of the drawing. */
  x0: number;
  x1: number;
}

export function computeBigNumbersLayout(width: number): BigNumbersLayout {
  const compact = width < 560;
  const pad = compact ? 16 : 32;
  return { width, height: 400, compact, x0: pad, x1: width - pad };
}

// ── Text helpers ────────────────────────────────────────────────────────────

/** Break words into lines of at most `max` characters. */
export function bigNumbersWrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    if (current && current.length + 1 + word.length > max) {
      lines.push(current);
      current = word;
    } else current = current ? `${current} ${word}` : word;
  }
  if (current) lines.push(current);
  return lines;
}

/** Up to two decimal places, no trailing zeros: 7.5, 8.57, 10. */
export function bigNumbersDec(v: number): string {
  const s = String(Number(Math.abs(v).toFixed(2)));
  return `${v < 0 && s !== "0" ? "−" : ""}${s}`;
}

/** Days as a whole number, or as an exact fraction and a decimal: "60/7 ≈ 8.57". */
export function bigNumbersDaysText(n: number, d: number): string {
  return d === 1 ? String(n) : `${n}/${d} ≈ ${bigNumbersDec(n / d)}`;
}

const indian = bigNumbersIndianCommas;
const placeName = (k: number) => BIG_NUMBERS_PLACE_NAMES[Math.max(0, Math.min(BIG_NUMBERS_PLACE_NAMES.length - 1, Math.round(k)))]!;

/** The smallest of 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10 × a power of ten that is at least v. */
function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const e = 10 ** Math.floor(Math.log10(v));
  const m = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * e >= v - 1e-9) ?? 10;
  return m * e;
}

// ── Pictures ────────────────────────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;

function title(ctx: Ctx, layout: BigNumbersLayout, text: string, theme: LabTheme) {
  label(ctx, text, layout.x0, 18, { color: theme.text, font: theme.fontStrong });
}

function line(ctx: Ctx, layout: BigNumbersLayout, text: string, y: number, color: string, theme: LabTheme, strong = false) {
  label(ctx, text, layout.x0, y, { color, font: strong ? theme.fontStrong : theme.font });
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke: string, alpha = 0.35) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/** Characters that fit on one line of the drawing. */
const fits = (layout: BigNumbersLayout) => Math.max(20, Math.floor((layout.x1 - layout.x0) / 6.5));

interface Period {
  name: string;
  /** Columns it covers, counted from the left of nine. */
  from: number;
  to: number;
}

const INDIAN_PERIODS: readonly Period[] = [
  { name: "Crores", from: 0, to: 1 },
  { name: "Lakhs", from: 2, to: 3 },
  { name: "Thousands", from: 4, to: 5 },
  { name: "Ones", from: 6, to: 8 },
];
const INDIAN_PLACES = ["TC", "C", "TL", "L", "TTh", "Th", "H", "T", "O"];
const INTL_PERIODS: readonly Period[] = [
  { name: "Millions", from: 0, to: 2 },
  { name: "Thousands", from: 3, to: 5 },
  { name: "Ones", from: 6, to: 8 },
];
const INTL_PLACES = ["HM", "TM", "M", "HTh", "TTh", "Th", "H", "T", "O"];

/** A nine-column place-value chart with the number's digits, right-aligned. */
function chart(ctx: Ctx, layout: BigNumbersLayout, theme: LabTheme, top: number, n: number, periods: readonly Period[], places: readonly string[], color: string) {
  const colW = Math.min(44, (layout.x1 - layout.x0) / 9);
  const left = (layout.width - colW * 9) / 2;
  const digits = String(Math.round(n)).padStart(9, " ");
  const small = `10px ${theme.font.split(" ").slice(1).join(" ")}`;
  periods.forEach((period, k) => {
    const x = left + period.from * colW;
    const w = (period.to - period.from + 1) * colW;
    box(ctx, x, top, w, 46, k % 2 === 0 ? color : theme.neutral, theme.axis, 0.15);
    label(ctx, period.name, x + w / 2, top + 8, { color, font: small, align: "center" });
  });
  for (let i = 0; i < 9; i++) {
    const cx = left + (i + 0.5) * colW;
    label(ctx, places[i]!, cx, top + 22, { color: theme.muted, font: small, align: "center" });
    const digit = digits[i]!;
    if (digit !== " ") label(ctx, digit, cx, top + 38, { color: theme.text, font: theme.fontStrong, align: "center" });
  }
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  for (let i = 1; i < 9; i++) {
    const x = left + i * colW;
    const edge = periods.some((p) => p.from === i);
    ctx.globalAlpha = edge ? 1 : 0.35;
    segment(ctx, x, top + (edge ? 0 : 15), x, top + 46);
  }
  ctx.restore();
}

function drawPlace(ctx: Ctx, layout: BigNumbersLayout, r: Results, theme: LabTheme, labels: boolean) {
  const n = num(r.number);
  const digits = num(r.digits, 1);
  title(ctx, layout, `${indian(n)}: ${digits === 8 || digits === 11 ? "an" : "a"} ${digits}-digit number`, theme);
  chart(ctx, layout, theme, 30, n, INDIAN_PERIODS, INDIAN_PLACES, theme.sine);
  line(ctx, layout, `Indian: ${indian(n)}`, 92, theme.sine, theme, true);
  chart(ctx, layout, theme, 110, n, INTL_PERIODS, INTL_PLACES, theme.cosine);
  line(ctx, layout, `International: ${bigNumbersInternationalCommas(n)}`, 172, theme.cosine, theme, true);
  if (!labels) return;
  let y = 198;
  for (const text of bigNumbersWrap(bigNumbersIndianWords(n), fits(layout))) {
    line(ctx, layout, text, y, theme.sine, theme);
    y += 17;
  }
  y += 6;
  for (const text of bigNumbersWrap(bigNumbersInternationalWords(n), fits(layout))) {
    line(ctx, layout, text, y, theme.cosine, theme);
    y += 17;
  }
  line(ctx, layout, "1 lakh = 100 thousand", 336, theme.muted, theme);
  line(ctx, layout, "10 lakh = 1 million", 354, theme.muted, theme);
  line(ctx, layout, "1 crore = 10 million", 372, theme.muted, theme);
}

function drawRound(ctx: Ctx, layout: BigNumbersLayout, r: Results, theme: LabTheme, labels: boolean) {
  const n = num(r.number);
  const place = Math.round(num(r.place, 1));
  const unit = num(r.roundUnit, 10);
  const low = num(r.roundLow);
  const high = num(r.roundHigh, unit);
  const rounded = num(r.rounded);
  const name = placeName(place);
  title(ctx, layout, `Round ${indian(n)} to the nearest ${name}`, theme);

  const y = 96;
  const xa = layout.x0 + 10;
  const xb = layout.x1 - 10;
  const xOf = (v: number) => xa + ((xb - xa) * (v - low)) / Math.max(1, high - low);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, xa, y, xb, y);
  ctx.lineWidth = 1.5;
  for (const x of [xa, xb]) segment(ctx, x, y - 9, x, y + 9);
  ctx.setLineDash([4, 3]);
  segment(ctx, (xa + xb) / 2, y - 22, (xa + xb) / 2, y + 9);
  ctx.restore();
  label(ctx, "halfway", (xa + xb) / 2, y - 30, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, indian(low), layout.x0, y + 24, { color: theme.text, font: theme.font });
  label(ctx, indian(high), layout.x1, y + 24, { color: theme.text, font: theme.font, align: "right" });

  const px = xOf(n);
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.arc(px, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const text = indian(n);
  const half = (text.length * 6.5) / 2;
  const tx = Math.min(layout.x1 - half, Math.max(layout.x0 + half, px));
  label(ctx, text, tx, y + 46, { color: theme.angle, font: theme.fontStrong, align: "center" });

  line(ctx, layout, "Look at the digit one place to the right:", 196, theme.muted, theme);
  line(ctx, layout, "5 or more rounds up, less than 5 rounds down.", 214, theme.muted, theme);
  if (!labels) return;
  const below = Math.floor(n / 10 ** (place - 1)) % 10;
  const up = rounded > n;
  line(ctx, layout, `The ${placeName(place - 1)}s digit is ${below}, so round ${up ? "up" : "down"}`, 244, theme.text, theme);
  line(ctx, layout, `Nearest ${name}: ${indian(rounded)}`, 268, theme.angle, theme, true);
  line(ctx, layout, `Off by ${indian(num(r.roundGap))}`, 292, theme.muted, theme);
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 3;
  segment(ctx, px, y, up ? xb : xa, y);
  ctx.restore();
}

function stackedBar(ctx: Ctx, theme: LabTheme, x: number, y: number, scale: number, a: number, b: number, alpha: number) {
  box(ctx, x, y, a * scale, 18, theme.sine, theme.sine, alpha);
  box(ctx, x + a * scale, y, b * scale, 18, theme.cosine, theme.cosine, alpha);
}

function drawEstimate(ctx: Ctx, layout: BigNumbersLayout, r: Results, theme: LabTheme, labels: boolean) {
  const p = num(r.p, 1);
  const q = num(r.q, 1);
  const pr = num(r.pRounded);
  const qr = num(r.qRounded);
  const name = placeName(num(r.place, 1));
  title(ctx, layout, `Estimate ${indian(p)} + ${indian(q)}`, theme);
  line(ctx, layout, `Round both to the nearest ${name}`, 36, theme.muted, theme);
  const nameW = 58;
  const barX = layout.x0 + nameW;
  const scale = (layout.x1 - barX) / Math.max(1, p + q, pr + qr);
  label(ctx, "exact", layout.x0, 61, { color: theme.text, font: theme.font });
  stackedBar(ctx, theme, barX, 52, scale, p, q, 0.6);
  if (labels) {
    label(ctx, "rounded", layout.x0, 87, { color: theme.text, font: theme.font });
    stackedBar(ctx, theme, barX, 78, scale, pr, qr, 0.25);
    line(ctx, layout, `≈ ${indian(pr)} + ${indian(qr)} = ${indian(num(r.sumEstimate))}`, 116, theme.angle, theme, true);
    line(ctx, layout, `Exact: ${indian(num(r.sumExact))}, off by ${indian(num(r.sumGap))}`, 136, theme.muted, theme);
  }

  const pg = num(r.pGreatest);
  const qg = num(r.qGreatest);
  label(ctx, `Estimate ${indian(p)} × ${indian(q)}`, layout.x0, 170, { color: theme.text, font: theme.fontStrong });
  line(ctx, layout, "Round each to its greatest place", 188, theme.muted, theme);
  const top = 202;
  const maxW = Math.min(layout.x1 - layout.x0, 240);
  const maxH = 110;
  const sx = maxW / Math.max(1, p, pg);
  const sy = maxH / Math.max(1, q, qg);
  box(ctx, layout.x0, top, p * sx, q * sy, theme.sine, theme.sine, 0.35);
  label(ctx, `${indian(p)} by ${indian(q)}`, layout.x0 + 4, top + 10, { color: theme.text, font: theme.font });
  if (!labels) return;
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(layout.x0, top, pg * sx, qg * sy);
  ctx.restore();
  line(ctx, layout, `≈ ${indian(pg)} × ${indian(qg)} = ${indian(num(r.productEstimate))}`, 334, theme.angle, theme, true);
  line(ctx, layout, `Exact: ${indian(num(r.productExact))}`, 354, theme.muted, theme);
  line(ctx, layout, "Dashed: the rounded rectangle", 374, theme.muted, theme);
}

function drawRoman(ctx: Ctx, layout: BigNumbersLayout, r: Results, theme: LabTheme, labels: boolean) {
  const value = Math.round(num(r.romanValue));
  const digits = [num(r.romanThousands), num(r.romanHundreds), num(r.romanTens), num(r.romanOnes)];
  const parts = bigNumbersRomanParts(value);
  const roman = bigNumbersToRoman(value);
  title(ctx, layout, value > 0 ? `${value} in Roman numerals` : "The Romans had no numeral for 0", theme);
  const names = ["Thousands", "Hundreds", "Tens", "Ones"];
  const slot = (layout.x1 - layout.x0) / 4;
  names.forEach((name, i) => {
    const cx = layout.x0 + slot * (i + 0.5);
    box(ctx, layout.x0 + slot * i + 3, 32, slot - 6, 84, theme.curve, theme.axis, 0.12);
    label(ctx, name, cx, 44, { color: theme.muted, font: theme.font, align: "center" });
    label(ctx, String(digits[i]), cx, 66, { color: theme.text, font: theme.fontStrong, align: "center" });
    label(ctx, parts[i] || "–", cx, 100, { color: theme.curve, font: theme.fontStrong, align: "center" });
  });
  if (value > 0) {
    line(ctx, layout, `${value} = ${parts.filter(Boolean).join(" + ")}`, 140, theme.text, theme);
    line(ctx, layout, `= ${roman}`, 164, theme.curve, theme, true);
  }

  const w = (layout.x1 - layout.x0) / BIG_NUMBERS_ROMAN_SYMBOLS.length;
  BIG_NUMBERS_ROMAN_SYMBOLS.forEach((s, i) => {
    const x = layout.x0 + w * i;
    box(ctx, x + 2, 186, w - 4, 40, theme.neutral, theme.axis, 0.1);
    label(ctx, s.symbol, x + w / 2, 198, { color: theme.curve, font: theme.fontStrong, align: "center" });
    label(ctx, String(s.value), x + w / 2, 216, { color: theme.muted, font: theme.font, align: "center" });
  });
  if (!labels) return;
  line(ctx, layout, "I, X, C, M repeat at most 3 times: III = 3", 252, theme.text, theme);
  line(ctx, layout, "V, L and D are never repeated", 272, theme.text, theme);
  line(ctx, layout, "Smaller after bigger adds on: VI = 5 + 1", 292, theme.text, theme);
  line(ctx, layout, "Smaller before bigger is taken away: IV = 5 − 1", 312, theme.text, theme);
  line(ctx, layout, "Pairs: IV IX XL XC CD CM", 332, theme.muted, theme);
  const pairs = Math.round(num(r.romanPairs));
  if (value > 0) line(ctx, layout, `${roman} uses ${pairs} taken-away pair${pairs === 1 ? "" : "s"}`, 356, theme.curve, theme, true);
}

interface PlotRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Cost against pens: a straight line through 0. */
function plotDirect(ctx: Ctx, rect: PlotRect, r: Results, theme: LabTheme, labels: boolean) {
  const price = num(r.penPrice, 1);
  const pens = num(r.pens);
  const maxPens = BIG_NUMBERS_LIMITS.pens[1];
  const plane = createPlane(rect, [0, maxPens], [0, niceCeil(price * maxPens)]);
  drawPlane(ctx, plane, theme, { xLabel: "pens", yLabel: "cost ₹" });
  ctx.save();
  ctx.strokeStyle = theme.sine;
  ctx.lineWidth = 2.5;
  const [ax, ay] = plane.toPx(0, 0);
  const [bx, by] = plane.toPx(maxPens, price * maxPens);
  segment(ctx, ax, ay, bx, by);
  const [px, py] = plane.toPx(pens, price * pens);
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (labels) {
    const text = `${pens} pens, ₹${indian(num(r.cost))}`;
    const right = px > rect.x + rect.width / 2;
    label(ctx, text, right ? px - 8 : px + 8, py + 12, { color: theme.angle, font: theme.font, align: right ? "right" : "left", background: theme.background });
  }
}

/** Days against workers: a curve that comes down towards the axis but never meets it. */
function plotInverse(ctx: Ctx, rect: PlotRect, r: Results, theme: LabTheme, labels: boolean) {
  const work = num(r.work, 1);
  const workers = num(r.workers, 1);
  const maxWorkers = BIG_NUMBERS_LIMITS.workers[1];
  const yMax = niceCeil(work);
  const plane = createPlane(rect, [0, maxWorkers], [0, yMax]);
  drawPlane(ctx, plane, theme, { xLabel: "workers", yLabel: "days" });
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.cosine;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  // From where the curve leaves the top of the graph out to the most workers.
  const start = work / yMax;
  const samples = 160;
  for (let i = 0; i <= samples; i++) {
    const x = start + ((maxWorkers - start) * i) / samples;
    const [cx, cy] = plane.toPx(x, work / x);
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();
  const [px, py] = plane.toPx(workers, num(r.days));
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (labels) {
    const text = `${workers} workers, ${bigNumbersDec(num(r.days))} days`;
    const right = px > rect.x + rect.width / 2;
    label(ctx, text, right ? px - 8 : px + 8, py - 12, { color: theme.angle, font: theme.font, align: right ? "right" : "left", background: theme.background });
  }
}

/** A two-row table: the top row's numbers, and the bottom row's (or "?" without the labels). */
function table(
  ctx: Ctx,
  layout: BigNumbersLayout,
  theme: LabTheme,
  y: number,
  names: readonly [string, string],
  columns: readonly { top: string; bottom: string; current: boolean }[],
  color: string,
  labels: boolean,
) {
  const nameW = 66;
  const colW = (layout.x1 - layout.x0 - nameW) / columns.length;
  label(ctx, names[0], layout.x0, y, { color: theme.text, font: theme.font });
  label(ctx, names[1], layout.x0, y + 24, { color, font: theme.font });
  columns.forEach((col, i) => {
    const x = layout.x0 + nameW + colW * i;
    if (col.current) box(ctx, x + 1, y - 11, colW - 2, 46, theme.angle, theme.angle, 0.15);
    label(ctx, col.top, x + colW / 2, y, { color: theme.text, font: col.current ? theme.fontStrong : theme.font, align: "center" });
    label(ctx, labels ? col.bottom : "?", x + colW / 2, y + 24, { color, font: col.current ? theme.fontStrong : theme.font, align: "center" });
  });
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  segment(ctx, layout.x0, y + 12, layout.x1, y + 12);
  ctx.restore();
}

function drawDirect(ctx: Ctx, layout: BigNumbersLayout, r: Results, theme: LabTheme, labels: boolean) {
  const price = num(r.penPrice, 1);
  const pens = Math.round(num(r.pens));
  title(ctx, layout, `Pens at ₹${price} each`, theme);
  const maxPens = BIG_NUMBERS_LIMITS.pens[1];
  const step = Math.min(14, (layout.x1 - layout.x0) / maxPens);
  ctx.save();
  ctx.fillStyle = theme.sine;
  for (let k = 0; k < pens; k++) ctx.fillRect(layout.x0 + k * step + 2, 32, Math.max(2, step - 5), 26);
  ctx.restore();
  line(ctx, layout, `${pens} pen${pens === 1 ? "" : "s"}`, 72, theme.text, theme);
  const shown = [1, 2, 5, 10].filter((k) => k !== pens);
  const cols = [...shown.slice(0, 4), pens].sort((a, b) => a - b).map((k) => ({ top: String(k), bottom: indian(price * k), current: k === pens }));
  table(ctx, layout, theme, 98, ["Pens", "Cost (₹)"], cols, theme.sine, labels);
  if (labels) {
    line(
      ctx,
      layout,
      pens > 0 ? `cost ÷ pens = ${indian(num(r.cost))} ÷ ${pens} = ₹${bigNumbersDec(num(r.costPerPen))}` : "No pens cost ₹0: the line starts at 0",
      152,
      theme.sine,
      theme,
      true,
    );
    line(ctx, layout, "The same in every column: direct proportion", 172, theme.muted, theme);
  }
  plotDirect(ctx, { x: layout.x0 + 40, y: 196, width: layout.x1 - layout.x0 - 52, height: 170 }, r, theme, labels);
}

function drawInverse(ctx: Ctx, layout: BigNumbersLayout, r: Results, theme: LabTheme, labels: boolean) {
  const work = num(r.work, 1);
  const workers = Math.round(num(r.workers, 1));
  title(ctx, layout, `1 worker alone takes ${work} day${work === 1 ? "" : "s"}`, theme);
  const maxWorkers = BIG_NUMBERS_LIMITS.workers[1];
  const step = Math.min(14, (layout.x1 - layout.x0) / maxWorkers);
  ctx.save();
  ctx.fillStyle = theme.cosine;
  for (let k = 0; k < workers; k++) {
    ctx.beginPath();
    ctx.arc(layout.x0 + k * step + step / 2, 44, Math.max(2, step / 2 - 1.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  line(ctx, layout, `${workers} worker${workers === 1 ? "" : "s"}`, 72, theme.text, theme);
  const shown = [1, 2, 3, 4].filter((k) => k !== workers);
  const days = (k: number) => {
    const d = work / k;
    return Number.isInteger(d) ? String(d) : bigNumbersDec(d);
  };
  const cols = [...shown.slice(0, 4), workers].sort((a, b) => a - b).map((k) => ({ top: String(k), bottom: days(k), current: k === workers }));
  table(ctx, layout, theme, 98, ["Workers", "Days"], cols, theme.cosine, labels);
  if (labels) {
    line(ctx, layout, `workers × days = ${workers} × ${bigNumbersDaysText(num(r.daysN), num(r.daysD, 1))} = ${num(r.workerDays)}`, 152, theme.cosine, theme, true);
    line(ctx, layout, "The same in every column: inverse proportion", 172, theme.muted, theme);
  }
  plotInverse(ctx, { x: layout.x0 + 40, y: 196, width: layout.x1 - layout.x0 - 52, height: 170 }, r, theme, labels);
}

function drawGraphs(ctx: Ctx, layout: BigNumbersLayout, r: Results, theme: LabTheme, labels: boolean) {
  const x = layout.x0 + 40;
  const width = layout.x1 - layout.x0 - 52;
  label(ctx, "Direct: a straight line through 0", layout.x0, 14, { color: theme.sine, font: theme.fontStrong });
  plotDirect(ctx, { x, y: 30, width, height: 140 }, r, theme, labels);
  label(ctx, "Inverse: a curve that never meets the axes", layout.x0, 208, { color: theme.cosine, font: theme.fontStrong });
  plotInverse(ctx, { x, y: 224, width, height: 140 }, r, theme, labels);
}

export const bigNumbersRenderer: SimulationRenderer<BigNumbersLayout> = {
  id: "bignumbers",
  layout: (width) => computeBigNumbersLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const labels = layers.has("labels");
    if (layers.has("place")) drawPlace(ctx, layout, results, theme, labels);
    else if (layers.has("round")) drawRound(ctx, layout, results, theme, labels);
    else if (layers.has("estimate")) drawEstimate(ctx, layout, results, theme, labels);
    else if (layers.has("roman")) drawRoman(ctx, layout, results, theme, labels);
    else if (layers.has("direct")) drawDirect(ctx, layout, results, theme, labels);
    else if (layers.has("inverse")) drawInverse(ctx, layout, results, theme, labels);
    else if (layers.has("graphs")) drawGraphs(ctx, layout, results, theme, labels);
  },
};
