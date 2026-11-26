/**
 * Ratios, percentages and powers, one picture per mode.
 *
 * Share: two rows of equal parts, a parts for Riya and b for Kabir.
 * Proportion: two pairs of columns, each pair scaled to its own taller
 * column, so two ratios that are equal have exactly the same shape.
 * Grid: a 10 × 10 grid with pct squares shaded: per cent is out of 100.
 * Money: before-and-after bars for a percentage change, then cost price
 * against selling price.
 * Interest: simple and compound interest year by year, side by side.
 * Powers: aᵐ as m tiles of a; multiplying two powers joins their tiles.
 * Standard form: k × 10ⁿ, the same number written out, and a ruler of
 * powers of ten from tiny to huge.
 * Squares: the tiles arranged into the biggest square they can make, with
 * any left over round its edge.
 *
 * Answers (shares, results, roots) appear only with the labels layer.
 */

import {
  RATIO_POWER_LIMITS,
  RATIO_POWER_THING_ORDER,
  RATIO_POWER_THINGS,
  ratioPowerPrimeFactors,
} from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface RatioPowerLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right edges of the drawing. */
  x0: number;
  x1: number;
}

export function computeRatioPowerLayout(width: number): RatioPowerLayout {
  const compact = width < 560;
  const pad = compact ? 16 : 32;
  return { width, height: compact ? 380 : 400, compact, x0: pad, x1: width - pad };
}

// ── Writing numbers the way a class 7 book does ─────────────────────────────

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
/** 11 → "¹¹", −6 → "⁻⁶". */
export function sup(n: number): string {
  return String(Math.round(n)).split("").map((ch) => SUPERSCRIPT[ch] ?? ch).join("");
}

const minus = (v: number) => (v < 0 ? "−" : "");

/** Up to `digits` decimal places, no trailing zeros, a proper minus sign: 1.5, 16.67, −200. */
export function dec(v: number, digits = 2): string {
  const s = String(Number(Math.abs(v).toFixed(digits)));
  return `${s === "0" ? "" : minus(v)}${s}`;
}

/** 149600000000 → "149,600,000,000". */
export function groupThousands(intDigits: string): string {
  return intDigits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** The Indian system for rupees: 123834 → "1,23,834". */
export function groupIndian(intDigits: string): string {
  if (intDigits.length <= 3) return intDigits;
  const last = intDigits.slice(-3);
  const rest = intDigits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last}`;
}

/** ₹ with paise only when there are some: ₹600, ₹1,610.51, −₹200. */
export function rupees(v: number): string {
  const paise = Math.round(Math.abs(v) * 100);
  const whole = Math.floor(paise / 100);
  const part = paise % 100;
  return `${paise === 0 ? "" : minus(v)}₹${groupIndian(String(whole))}${part ? `.${String(part).padStart(2, "0")}` : ""}`;
}

/** k from its digits: "1496" → "1.496", "7" → "7". */
export function mantissaText(digits: string): string {
  return digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
}

/** The digits of k × 10ⁿ written out in full, with no rounding: ("1496", 11) → "149,600,000,000"; ("7", −6) → "0.000007". */
export function writeOut(digits: string, exponent: number): string {
  const point = 1 + exponent;
  let whole: string;
  let frac: string;
  if (point >= digits.length) {
    whole = digits + "0".repeat(point - digits.length);
    frac = "";
  } else if (point <= 0) {
    whole = "0";
    frac = "0".repeat(-point) + digits;
  } else {
    whole = digits.slice(0, point);
    frac = digits.slice(point);
  }
  frac = frac.replace(/0+$/, "");
  return frac ? `${groupThousands(whole)}.${frac}` : groupThousands(whole);
}

/** aᵉ as a number a child can read: 32, 1,000,000, 1/8, or 10⁶⁴ once it is too long to write out. */
export function powerText(base: number, exponent: number): string {
  if (base === 1 || exponent === 0) return "1";
  const big = base ** Math.abs(exponent);
  const body = big < 1e9 ? groupThousands(String(big)) : `${base}${sup(Math.abs(exponent))}`;
  return exponent > 0 ? body : `1/${body}`;
}

// ── Pictures ────────────────────────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;

function title(ctx: Ctx, layout: RatioPowerLayout, text: string, theme: LabTheme) {
  label(ctx, text, layout.x0, 18, { color: theme.text, font: theme.fontStrong });
}

function line(ctx: Ctx, layout: RatioPowerLayout, text: string, y: number, color: string, theme: LabTheme, strong = false) {
  label(ctx, text, layout.x0, y, { color, font: strong ? theme.fontStrong : theme.font });
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, stroke: string, alpha = 0.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawShare(ctx: Ctx, layout: RatioPowerLayout, r: Results, theme: LabTheme, labels: boolean) {
  const a = num(r.a, 2);
  const b = num(r.b, 3);
  const total = num(r.total);
  const partSize = num(r.partSize);
  title(ctx, layout, `Share ${total} sweets in the ratio ${a} : ${b}`, theme);
  const nameW = 50;
  const barX = layout.x0 + nameW;
  const partW = Math.min(40, (layout.x1 - barX) / Math.max(a, b));
  const rows = [
    { name: "Riya", parts: a, share: num(r.shareA), color: theme.sine, y: 48 },
    { name: "Kabir", parts: b, share: num(r.shareB), color: theme.cosine, y: 108 },
  ];
  for (const row of rows) {
    label(ctx, row.name, layout.x0, row.y + 15, { color: row.color, font: theme.fontStrong });
    for (let k = 0; k < row.parts; k++) {
      const x = barX + k * partW;
      box(ctx, x, row.y, partW, 30, row.color, theme.text);
      if (labels && partW >= 22) label(ctx, dec(partSize, 1), x + partW / 2, row.y + 15, { color: theme.text, font: theme.font, align: "center" });
    }
    if (labels) label(ctx, `${dec(row.share)} sweets`, barX, row.y + 44, { color: row.color, font: theme.font });
  }
  if (!labels) return;
  const simpleA = num(r.simpleA, a);
  const simpleB = num(r.simpleB, b);
  line(ctx, layout, `${a} + ${b} = ${a + b} equal parts`, 190, theme.text, theme);
  line(ctx, layout, `1 part = ${total} ÷ ${a + b} = ${dec(partSize)} sweets`, 212, theme.angle, theme, true);
  line(
    ctx,
    layout,
    simpleA === a ? `${a} : ${b} is already in simplest form` : `${a} : ${b} = ${simpleA} : ${simpleB} in simplest form`,
    236,
    theme.tangent,
    theme,
  );
  if (num(r.fair) !== 1) line(ctx, layout, `${total} does not split into ${a + b} whole parts`, 258, theme.secant, theme);
}

function drawProportion(ctx: Ctx, layout: RatioPowerLayout, r: Results, theme: LabTheme, labels: boolean) {
  const [a, b, c, d] = [num(r.a, 1), num(r.b, 1), num(r.c, 1), num(r.d, 1)];
  const same = num(r.proportional) === 1;
  title(ctx, layout, `Is ${a} : ${b} the same as ${c} : ${d}?`, theme);
  const top = 44;
  const h = 140;
  const colW = layout.compact ? 26 : 34;
  const pair = (cx: number, p: number, q: number, name: string) => {
    const tall = Math.max(p, q);
    const hp = (h * p) / tall;
    const hq = (h * q) / tall;
    box(ctx, cx - colW - 4, top + h - hp, colW, hp, theme.sine, theme.text);
    box(ctx, cx + 4, top + h - hq, colW, hq, theme.cosine, theme.text);
    label(ctx, String(p), cx - colW / 2 - 4, top + h + 14, { color: theme.sine, font: theme.fontStrong, align: "center" });
    label(ctx, String(q), cx + colW / 2 + 4, top + h + 14, { color: theme.cosine, font: theme.fontStrong, align: "center" });
    label(ctx, name, cx, top + h + 34, { color: theme.muted, font: theme.font, align: "center" });
  };
  const span = layout.x1 - layout.x0;
  pair(layout.x0 + span * 0.25, a, b, `${a} : ${b}`);
  pair(layout.x0 + span * 0.75, c, d, `${c} : ${d}`);
  if (!labels) return;
  line(ctx, layout, `extremes: ${a} × ${d} = ${a * d}`, 236, theme.text, theme);
  line(ctx, layout, `means: ${b} × ${c} = ${b * c}`, 256, theme.text, theme);
  line(ctx, layout, same ? "Equal, so the ratios are in proportion" : "Not equal: not in proportion", 278, same ? theme.tangent : theme.secant, theme, true);
  line(ctx, layout, `Unitary: 1 goes with ${dec(num(r.unitValue))}, so ${c} goes with ${dec(num(r.missingD))}`, 302, theme.angle, theme);
}

function drawGrid(ctx: Ctx, layout: RatioPowerLayout, r: Results, theme: LabTheme, labels: boolean) {
  const pct = num(r.pct);
  title(ctx, layout, "Per cent means out of 100", theme);
  const side = Math.min(layout.x1 - layout.x0, 230);
  const cell = side / 10;
  const left = (layout.width - side) / 2;
  const top = 34;
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.6;
  for (let k = 0; k < pct; k++) ctx.fillRect(left + (k % 10) * cell + 1, top + Math.floor(k / 10) * cell + 1, cell - 2, cell - 2);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 10; i++) {
    segment(ctx, left + i * cell, top, left + i * cell, top + side);
    segment(ctx, left, top + i * cell, left + side, top + i * cell);
  }
  ctx.restore();
  const y = top + side + 22;
  line(ctx, layout, `${pct} of 100 squares shaded`, y, theme.text, theme);
  if (!labels) return;
  line(ctx, layout, `${pct}% = ${dec(num(r.pctDecimal))} = ${num(r.pctN)}/${num(r.pctD)}`, y + 22, theme.angle, theme, true);
  line(ctx, layout, `${pct}% of ${rupees(num(r.price))} = ${rupees(num(r.pctOfPrice))}`, y + 44, theme.tangent, theme);
}

function moneyBars(
  ctx: Ctx,
  layout: RatioPowerLayout,
  theme: LabTheme,
  top: number,
  rows: readonly { name: string; value: number; color: string; text: string | null }[],
) {
  const nameW = 62;
  const barX = layout.x0 + nameW;
  const longest = Math.max(1, ...rows.map((row) => row.value));
  rows.forEach((row, i) => {
    const y = top + i * 32;
    label(ctx, row.name, layout.x0, y + 11, { color: row.color, font: theme.font });
    const w = ((layout.x1 - barX) * Math.max(0, row.value)) / longest;
    box(ctx, barX, y, w, 22, row.color, theme.text);
    if (row.text) label(ctx, row.text, barX + 6, y + 11, { color: theme.text, font: theme.fontStrong, background: theme.background });
  });
}

function drawMoney(ctx: Ctx, layout: RatioPowerLayout, r: Results, theme: LabTheme, labels: boolean) {
  const price = num(r.price);
  const change = num(r.change);
  const changed = num(r.changed);
  title(ctx, layout, `Change ${rupees(price)} by ${change > 0 ? "+" : ""}${dec(change)}%`, theme);
  moneyBars(ctx, layout, theme, 34, [
    { name: "Before", value: price, color: theme.neutral, text: rupees(price) },
    { name: "After", value: changed, color: theme.angle, text: labels ? rupees(changed) : null },
  ]);
  if (labels) {
    const sign = change < 0 ? "−" : "+";
    line(ctx, layout, `${rupees(price)} ${sign} ${dec(Math.abs(change))}% = ${rupees(price)} ${sign} ${rupees(Math.abs(num(r.changeAmount)))} = ${rupees(changed)}`, 112, theme.angle, theme);
  }

  const sell = num(r.sell);
  label(ctx, "Buying and selling", layout.x0, 156, { color: theme.text, font: theme.fontStrong });
  moneyBars(ctx, layout, theme, 172, [
    { name: "Cost", value: price, color: theme.neutral, text: `CP ${rupees(price)}` },
    { name: "Selling", value: sell, color: theme.cosine, text: `SP ${rupees(sell)}` },
  ]);
  if (!labels) return;
  const gain = num(r.gain);
  const profit = num(r.profit);
  const percent = Math.abs(num(r.profitPercent));
  const verdict =
    gain > 0
      ? `Profit ${rupees(profit)} = ${dec(percent)}% of the cost price`
      : gain < 0
        ? `Loss ${rupees(-profit)} = ${dec(percent)}% of the cost price`
        : "No profit, no loss";
  line(ctx, layout, verdict, 252, gain > 0 ? theme.tangent : gain < 0 ? theme.secant : theme.text, theme, true);
  line(ctx, layout, "Profit or loss % is always on the cost price", 276, theme.muted, theme);
}

function drawInterest(ctx: Ctx, layout: RatioPowerLayout, r: Results, theme: LabTheme, labels: boolean) {
  const price = num(r.price, 100);
  const rate = num(r.rate, 10);
  const years = Math.round(num(r.years));
  const maxYears = RATIO_POWER_LIMITS.years[1];
  title(ctx, layout, `${rupees(price)} at ${dec(rate)}% a year, ${years} year${years === 1 ? "" : "s"}`, theme);
  // Legend.
  box(ctx, layout.x0, 32, 12, 12, theme.sine, theme.text, 0.7);
  label(ctx, "simple", layout.x0 + 18, 38, { color: theme.sine, font: theme.font });
  box(ctx, layout.x0 + 80, 32, 12, 12, theme.cosine, theme.text, 0.7);
  label(ctx, "compound", layout.x0 + 98, 38, { color: theme.cosine, font: theme.font });

  const top = 58;
  const bottom = 250;
  const tallest = price * (1 + rate / 100) ** maxYears - price;
  const slot = (layout.x1 - layout.x0) / maxYears;
  const barW = Math.max(3, slot * 0.34);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  segment(ctx, layout.x0, bottom, layout.x1, bottom);
  ctx.restore();
  for (let y = 1; y <= maxYears; y++) {
    const cx = layout.x0 + slot * (y - 0.5);
    label(ctx, String(y), cx, bottom + 12, { color: theme.muted, font: theme.font, align: "center" });
    if (y > years) continue;
    const si = (price * rate * y) / 100;
    const ci = price * (1 + rate / 100) ** y - price;
    const hs = ((bottom - top) * si) / tallest;
    const hc = ((bottom - top) * ci) / tallest;
    box(ctx, cx - barW - 1, bottom - hs, barW, hs, theme.sine, theme.sine, 0.7);
    box(ctx, cx + 1, bottom - hc, barW, hc, theme.cosine, theme.cosine, 0.7);
  }
  label(ctx, "years", layout.x1, bottom + 28, { color: theme.muted, font: theme.font, align: "right" });
  if (!labels) return;
  line(ctx, layout, `SI = ${rupees(num(r.si))}, amount ${rupees(num(r.amountSI))}`, 300, theme.sine, theme);
  line(ctx, layout, `CI = ${rupees(num(r.ci))}, amount ${rupees(num(r.amountCI))}`, 322, theme.cosine, theme);
  line(ctx, layout, `Compound earns ${rupees(num(r.ciMore))} more`, 346, theme.tangent, theme, true);
}

/** One row of tiles: aᵉ as |e| tiles of a, after "1 ÷" when e is negative. */
function tiles(ctx: Ctx, theme: LabTheme, x: number, y: number, tileW: number, base: number, exponent: number, colors: readonly string[]) {
  let left = x;
  if (exponent === 0) {
    label(ctx, "no factors: just 1", left, y + 13, { color: theme.muted, font: theme.font });
    return;
  }
  if (exponent < 0) {
    label(ctx, "1 ÷", left, y + 13, { color: theme.text, font: theme.fontStrong });
    left += 28;
  }
  const small = tileW < 20 ? `10px ${theme.font.split(" ").slice(1).join(" ")}` : theme.font;
  for (let k = 0; k < Math.abs(exponent); k++) {
    const color = colors[Math.min(k, colors.length - 1)] ?? theme.neutral;
    box(ctx, left + k * tileW, y, tileW - 2, 26, color, theme.text);
    label(ctx, String(base), left + k * tileW + (tileW - 2) / 2, y + 13, { color: theme.text, font: small, align: "center" });
  }
}

function drawPowers(ctx: Ctx, layout: RatioPowerLayout, r: Results, theme: LabTheme, labels: boolean) {
  const a = num(r.base, 2);
  const m = num(r.m);
  const n = num(r.n);
  const sum = m + n;
  title(ctx, layout, "A power is repeated multiplication", theme);
  const nameW = 56;
  const tilesX = layout.x0 + nameW;
  const most = Math.max(1, Math.abs(m), Math.abs(n), Math.abs(sum));
  const tileW = Math.min(32, (layout.x1 - tilesX - 30) / most);
  const both = m > 0 && n > 0 ? [...Array<string>(m).fill(theme.sine), ...Array<string>(n).fill(theme.cosine)] : [theme.angle];
  const rows = [
    { name: `${a}${sup(m)}`, e: m, colors: [theme.sine], y: 34 },
    { name: `${a}${sup(n)}`, e: n, colors: [theme.cosine], y: 98 },
    { name: `${a}${sup(sum)}`, e: sum, colors: both, y: 162 },
  ];
  for (const [k, row] of rows.entries()) {
    label(ctx, row.name, layout.x0, row.y + 13, { color: k === 2 ? theme.angle : row.colors[0]!, font: theme.fontStrong });
    tiles(ctx, theme, tilesX, row.y, tileW, a, row.e, row.colors);
    if (labels) label(ctx, `= ${powerText(a, row.e)}`, tilesX, row.y + 42, { color: theme.text, font: theme.font });
  }
  const added = `${sup(m)}⁺${n < 0 ? `⁽${sup(n)}⁾` : sup(n)}`;
  label(ctx, `${a}${sup(m)} × ${a}${sup(n)} = ${a}${added} = ${a}${sup(sum)}`, layout.x0, 236, { color: theme.angle, font: theme.fontStrong });
  if (!labels) return;
  // "= 10⁶⁴" would only repeat the power, so leave it off.
  const value = (e: number) => {
    const text = powerText(a, e);
    return text === `${a}${sup(e)}` ? "" : ` = ${text}`;
  };
  line(ctx, layout, `${a}${sup(m)} ÷ ${a}${sup(n)} = ${a}${sup(m - n)}${value(m - n)}`, 262, theme.text, theme);
  line(ctx, layout, `(${a}${sup(m)})${sup(n)} = ${a}${sup(m * n)}${value(m * n)}`, 286, theme.text, theme);
  line(ctx, layout, `${a}⁰ = 1, and ${a}⁻¹ = 1/${a}`, 310, theme.muted, theme);
}

function drawStandard(ctx: Ctx, layout: RatioPowerLayout, r: Results, theme: LabTheme, labels: boolean) {
  const id = RATIO_POWER_THING_ORDER[Math.round(num(r.thing))] ?? "sun";
  const thing = RATIO_POWER_THINGS[id];
  const se = Math.round(num(r.se));
  title(ctx, layout, `${thing.label}, in ${thing.unit}`, theme);
  line(ctx, layout, writeOut(thing.digits, thing.exponent), 46, theme.text, theme, true);
  label(ctx, "Your number:", layout.x0, 82, { color: theme.muted, font: theme.font });
  label(ctx, `${mantissaText(thing.digits)} × 10${sup(se)}`, layout.x0, 106, { color: theme.sine, font: theme.fontStrong });
  line(ctx, layout, `= ${writeOut(thing.digits, se)}`, 130, theme.sine, theme);
  const way = se > 0 ? `the point moves ${se} place${se === 1 ? "" : "s"} right` : se < 0 ? `the point moves ${-se} place${se === -1 ? "" : "s"} left` : "the point stays put";
  line(ctx, layout, way, 152, theme.muted, theme);

  // A ruler of powers of ten.
  const [lo, hi] = RATIO_POWER_LIMITS.se;
  const y = 214;
  const xOf = (p: number) => layout.x0 + 8 + ((layout.x1 - layout.x0 - 16) * (p - lo)) / (hi - lo);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  segment(ctx, xOf(lo), y, xOf(hi), y);
  for (let p = lo; p <= hi; p++) segment(ctx, xOf(p), y - (p % 4 === 0 ? 7 : 4), xOf(p), y + (p % 4 === 0 ? 7 : 4));
  ctx.restore();
  for (let p = lo; p <= hi; p += 4) label(ctx, `10${sup(p)}`, xOf(p), y + 20, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "tiny", xOf(lo), y - 18, { color: theme.muted, font: theme.font, align: "left" });
  label(ctx, "huge", xOf(hi), y - 18, { color: theme.muted, font: theme.font, align: "right" });
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.beginPath();
  ctx.arc(xOf(se), y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (!labels) return;
  const match = num(r.match) === 1;
  line(
    ctx,
    layout,
    match ? `Match! ${mantissaText(thing.digits)} × 10${sup(se)} ${thing.unit}` : se < thing.exponent ? "Too small: move the point further right" : "Too big: move the point further left",
    272,
    match ? theme.tangent : theme.secant,
    theme,
    true,
  );
  line(ctx, layout, "Standard form: k × 10ⁿ, with k from 1 up to 10", 296, theme.muted, theme);
}

function drawSquares(ctx: Ctx, layout: RatioPowerLayout, r: Results, theme: LabTheme, labels: boolean) {
  const n = Math.round(num(r.tiles, 1));
  const root = Math.round(num(r.rootFloor, 1));
  const extra = n - root * root;
  title(ctx, layout, `Can ${n} tiles make a square?`, theme);
  const across = extra > 0 ? root + 1 : root;
  const room = Math.min(layout.x1 - layout.x0, layout.height - 140);
  const tile = Math.min(22, room / Math.max(1, across));
  const left = (layout.width - tile * across) / 2;
  const top = 32;
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = theme.sine;
  for (let i = 0; i < root; i++) for (let j = 0; j < root; j++) ctx.fillRect(left + j * tile + 1, top + i * tile + 1, tile - 2, tile - 2);
  // Left-over tiles go down the right-hand edge, then along the bottom.
  ctx.fillStyle = theme.secant;
  for (let k = 0; k < extra; k++) {
    const [i, j] = k < root ? [k, root] : [root, k - root];
    ctx.fillRect(left + j * tile + 1, top + i * tile + 1, tile - 2, tile - 2);
  }
  ctx.restore();
  const y = top + tile * across + 22;
  line(ctx, layout, `${n} tiles`, y, theme.text, theme);
  if (!labels) return;
  const perfect = extra === 0;
  line(
    ctx,
    layout,
    perfect ? `${n} = ${root} × ${root}: a perfect square, √${n} = ${root}` : `${n} = ${root} × ${root} + ${extra} left over: not a square`,
    y + 22,
    perfect ? theme.tangent : theme.secant,
    theme,
    true,
  );
  const factors = ratioPowerPrimeFactors(n);
  if (factors.length > 0) line(ctx, layout, `${n} = ${factors.join(" × ")}`, y + 44, theme.text, theme);
  if (perfect && factors.length > 0) {
    const half = factors.filter((_, k) => k % 2 === 0);
    line(ctx, layout, `One from each pair: √${n} = ${half.join(" × ")} = ${root}`, y + 66, theme.angle, theme);
  } else if (!perfect) {
    const by = num(r.multiplier, 1);
    line(ctx, layout, `× ${by} makes ${num(r.madeSquare)} = ${num(r.madeRoot)} × ${num(r.madeRoot)}`, y + 66, theme.angle, theme);
  }
}

export const ratioPowerRenderer: SimulationRenderer<RatioPowerLayout> = {
  id: "ratiopower",
  layout: (width) => computeRatioPowerLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const labels = layers.has("labels");
    if (layers.has("share")) drawShare(ctx, layout, results, theme, labels);
    else if (layers.has("proportion")) drawProportion(ctx, layout, results, theme, labels);
    else if (layers.has("grid")) drawGrid(ctx, layout, results, theme, labels);
    else if (layers.has("money")) drawMoney(ctx, layout, results, theme, labels);
    else if (layers.has("interest")) drawInterest(ctx, layout, results, theme, labels);
    else if (layers.has("powers")) drawPowers(ctx, layout, results, theme, labels);
    else if (layers.has("standard")) drawStandard(ctx, layout, results, theme, labels);
    else if (layers.has("squares")) drawSquares(ctx, layout, results, theme, labels);
  },
};
