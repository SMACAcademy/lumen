/**
 * Real numbers, patterns and quadratic graphs, in seven pictures.
 *
 * Factors: a factor tree for each of two numbers, ending in circled primes,
 * with the prime powers underneath — and, with the words, HCF and LCM.
 *
 * Roots: the square root spiral of unit right triangles, centred on the
 * number line, with a compass arc swinging √k down onto the line.
 *
 * Sticks: a row of matchstick triangles, squares or houses, one stick drawn
 * per stick counted, over a table of the first five terms.
 *
 * Dots: a square of n² dots and a staircase of n(n + 1)/2, with the dots the
 * next one needs drawn hollow.
 *
 * Tiles: two expressions as x², x and unit tiles, and what they make together.
 *
 * Parabola: y = ax² + bx + c on a grid, with its zeroes on the x-axis.
 *
 * Progression: the terms of an AP as bars; when every term is positive a
 * second copy, upside down, stacks on top to make a rectangle twice the sum.
 */

import { linearTicks } from "@ise/graph-engine";
import {
  PATTERNS_STICKS,
  PATTERNS_STICKS_ORDER,
  patternsPolynomial,
  patternsPowerForm,
  patternsPrimeFactors,
  patternsSpiral,
} from "@ise/mathematics-engine";
import { label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface PatternsLayout {
  width: number;
  height: number;
  /** The graph of the parabola view. */
  plot: Box;
  /** The bars of the progression view. */
  bars: Box;
}

export function computePatternsLayout(width: number): PatternsLayout {
  const height = width < 560 ? 390 : 410;
  return {
    width,
    height,
    plot: { x: 36, y: 30, width: width - 48, height: height - 30 - 74 },
    bars: { x: 40, y: 48, width: width - 54, height: height - 48 - 96 },
  };
}

/** A number as a book prints it: a true minus sign, at most two decimals. */
export function patternsFormat(v: number): string {
  const r = Math.round(v * 100) / 100 || 0;
  return `${r < 0 ? "−" : ""}${Math.abs(r)}`;
}

const SUBSCRIPT = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
const sub = (n: number) => String(n).split("").map((d) => SUBSCRIPT[Number(d)]).join("");
const bracket = (v: number) => (v < 0 ? `(${patternsFormat(v)})` : patternsFormat(v));

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 1) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
  segment(ctx, x1, y1, x2, y2);
  ctx.restore();
}

// ── Factors ─────────────────────────────────────────────────────────────────

/** A factor tree that splits off the smallest prime each time, stepping down and to the right. */
function drawTree(ctx: CanvasRenderingContext2D, col: Box, value: number, colour: string, theme: LabTheme) {
  const factors = patternsPrimeFactors(value);
  const rows = Math.max(1, factors.length - 1);
  const dy = Math.min(36, (col.height - 20) / rows);
  const dx = Math.min(20, (col.width - 60) / rows);
  const top = col.y + 10;
  let x = col.x + 36;
  let rest = value;
  const node = (text: string, nx: number, ny: number, prime: boolean) => {
    if (prime) ring(ctx, nx, ny, 11, theme.angle, 1.5);
    label(ctx, text, nx, ny, { color: prime ? theme.angle : colour, font: theme.fontStrong, align: "center" });
  };
  node(String(value), x, top, factors.length === 1);
  for (let i = 0; i < factors.length - 1; i++) {
    const p = factors[i]!;
    const y = top + i * dy;
    const next = y + dy;
    rest /= p;
    line(ctx, x, y + 9, x - 14, next - 10, theme.muted, 1.25);
    line(ctx, x, y + 9, x + dx, next - 10, theme.muted, 1.25);
    node(String(p), x - 14, next, true);
    x += dx;
    node(String(rest), x, next, i === factors.length - 2);
  }
}

function drawFactors(ctx: CanvasRenderingContext2D, layout: PatternsLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const num1 = Math.round(num(results.num1, 60));
  const num2 = Math.round(num(results.num2, 84));
  const half = width / 2;
  const treeHeight = height - 30 - 112;
  drawTree(ctx, { x: 0, y: 30, width: half, height: treeHeight }, num1, theme.sine, theme);
  drawTree(ctx, { x: half, y: 30, width: half, height: treeHeight }, num2, theme.cosine, theme);
  line(ctx, half, 34, half, 30 + treeHeight, theme.grid, 1);
  const formY = height - 80;
  label(ctx, `${num1} = ${patternsPowerForm(num1)}`, half / 2, formY, { color: theme.sine, font: theme.font, align: "center" });
  label(ctx, `${num2} = ${patternsPowerForm(num2)}`, half + half / 2, formY, { color: theme.cosine, font: theme.font, align: "center" });
  if (!words) return;
  const hcf = num(results.hcf, 1);
  const lcm = num(results.lcm, 1);
  const form = (v: number) => (patternsPrimeFactors(v).length > 1 ? `${patternsPowerForm(v)} = ${v}` : String(v));
  const hcfText = hcf === 1 ? "HCF = 1: no prime in common" : `HCF = ${form(hcf)}`;
  label(ctx, hcfText, width / 2, height - 56, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `LCM = ${form(lcm)}`, width / 2, height - 36, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `${hcf} × ${lcm} = ${num(results.product)} = ${num1} × ${num2}`, width / 2, height - 14, { color: theme.tangent, font: theme.fontStrong, align: "center" });
}

// ── Roots ───────────────────────────────────────────────────────────────────

export function patternsSpiralGeometry(layout: PatternsLayout) {
  const u = Math.min((layout.width - 24) / 9.2, (layout.height - 100) / 8.6);
  return { u, cx: layout.width / 2, cy: 34 + 4.2 * u };
}

function drawRoots(ctx: CanvasRenderingContext2D, layout: PatternsLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const k = Math.max(1, Math.round(num(results.k, 2)));
  const root = Math.sqrt(k);
  const { u, cx, cy } = patternsSpiralGeometry(layout);
  const px = (x: number, y: number): [number, number] => [cx + x * u, cy - y * u];

  // The number line through the centre of the spiral.
  const left = Math.max(8, cx - 4.5 * u);
  const right = Math.min(width - 8, cx + 4.5 * u);
  line(ctx, left, cy, right, cy, theme.axis, 1.5);
  for (let t = -4; t <= 4; t++) {
    const [tx] = px(t, 0);
    line(ctx, tx, cy - 4, tx, cy + 4, theme.axis, 1.25);
    if (t >= 0) label(ctx, String(t), tx, cy + 7, { color: theme.muted, font: theme.font, align: "center", baseline: "top" });
  }

  const points = patternsSpiral(k);
  for (let j = 0; j + 1 < points.length; j++) {
    const [ax, ay] = px(...points[j]!);
    const [bx, by] = px(...points[j + 1]!);
    ctx.save();
    ctx.fillStyle = theme.sine;
    ctx.globalAlpha = j % 2 === 0 ? 0.16 : 0.08;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    line(ctx, cx, cy, ax, ay, theme.muted, 1);
    line(ctx, ax, ay, bx, by, theme.tangent, 2);
  }
  const last = points[points.length - 1]!;
  const [lx, ly] = px(...last);
  line(ctx, cx, cy, lx, ly, theme.angle, 3);

  // The compass swings the newest hypotenuse down onto the line.
  const theta = Math.atan2(last[1], last[0]);
  if (theta > 1e-6) {
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, root * u, -theta, 0, false);
    ctx.stroke();
    ctx.restore();
  }
  const [rx] = px(root, 0);
  disc(ctx, rx, cy, 5, theme.angle);
  disc(ctx, cx, cy, 3, theme.text);
  label(ctx, `√${k}`, rx + 6, cy - 12, { color: theme.angle, font: theme.fontStrong, background: theme.background });
  if (k > 1) {
    const [mx, my] = px((last[0] + points[points.length - 2]![0]) / 2, (last[1] + points[points.length - 2]![1]) / 2);
    const out = Math.hypot(mx - cx, my - cy) || 1;
    label(ctx, "1", mx + ((mx - cx) / out) * 10, my + ((my - cy) / out) * 10, { color: theme.tangent, font: theme.font, align: "center" });
  }

  if (!words) return;
  const below = num(results.below);
  const above = num(results.above);
  if (num(results.isRational) === 1) {
    label(ctx, `√${k} = ${root}`, width / 2, height - 38, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `√${k} = ${root}: ${k} is a perfect square, so √${k} is rational`, width / 2, height - 14, { color: theme.tangent, font: theme.font, align: "center" });
  } else {
    label(ctx, `${below} < √${k} < ${above}`, width / 2, height - 38, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `√${k} ≈ ${root.toFixed(5)}… never ends, never repeats`, width / 2, height - 14, { color: theme.tangent, font: theme.font, align: "center" });
  }
}

// ── Matchsticks ─────────────────────────────────────────────────────────────

/** The sticks of n shapes in a row, as segments; their count is the pattern's term. */
export function patternsStickSegments(shape: (typeof PATTERNS_STICKS_ORDER)[number], n: number, x0: number, base: number, s: number) {
  const out: [number, number, number, number][] = [];
  const h = (s * Math.sqrt(3)) / 2;
  if (shape === "triangles") {
    const z = (i: number): [number, number] => [x0 + (i * s) / 2, i % 2 === 1 ? base - h : base];
    for (let i = 0; i <= n; i++) out.push([...z(i), ...z(i + 1)]);
    for (let j = 0; j < n; j++) out.push([...z(j), ...z(j + 2)]);
  } else {
    for (let i = 0; i <= n; i++) out.push([x0 + i * s, base, x0 + i * s, base - s]);
    for (let j = 0; j < n; j++) {
      out.push([x0 + j * s, base, x0 + (j + 1) * s, base]);
      out.push([x0 + j * s, base - s, x0 + (j + 1) * s, base - s]);
      if (shape === "houses") {
        out.push([x0 + j * s, base - s, x0 + (j + 0.5) * s, base - s - h]);
        out.push([x0 + (j + 0.5) * s, base - s - h, x0 + (j + 1) * s, base - s]);
      }
    }
  }
  return out;
}

const NOUN: Record<(typeof PATTERNS_STICKS_ORDER)[number], [string, string]> = {
  triangles: ["triangle", "triangles"],
  squares: ["square", "squares"],
  houses: ["house", "houses"],
};

function drawSticks(ctx: CanvasRenderingContext2D, layout: PatternsLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const shape = PATTERNS_STICKS_ORDER[Math.round(num(results.sticks, 1))] ?? "squares";
  const rule = PATTERNS_STICKS[shape];
  const n = Math.max(1, Math.round(num(results.n, 1)));
  const units = shape === "triangles" ? (n + 1) / 2 : n;
  const s = Math.min(40, (width - 40) / units);
  const x0 = (width - units * s) / 2;
  const base = 172;
  const thick = Math.max(2, s * 0.12);
  for (const [x1, y1, x2, y2] of patternsStickSegments(shape, n, x0, base, s)) {
    // A little gap at each end keeps the sticks separate, as they are on a table.
    const gap = Math.min(2.5, s * 0.08);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const ux = ((x2 - x1) / len) * gap;
    const uy = ((y2 - y1) / len) * gap;
    line(ctx, x1 + ux, y1 + uy, x2 - ux, y2 - uy, theme.angle, thick);
    disc(ctx, x2 - ux, y2 - uy, thick * 0.85, theme.secant);
  }

  // The first five terms, for spotting the rule.
  const tableY = 214;
  const colW = Math.min(44, (width - 90) / 6);
  const firstX = 70;
  label(ctx, "n", firstX - 12, tableY, { color: theme.muted, font: theme.font, align: "right" });
  label(ctx, "sticks", firstX - 12, tableY + 22, { color: theme.muted, font: theme.font, align: "right" });
  for (let j = 1; j <= 5; j++) {
    const x = firstX + (j - 1) * colW + colW / 2;
    label(ctx, String(j), x, tableY, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, String(rule.growth * j + rule.start), x, tableY + 22, { color: theme.angle, font: theme.fontStrong, align: "center" });
  }
  label(ctx, "…", firstX + 5 * colW + colW / 2, tableY + 11, { color: theme.muted, font: theme.font, align: "center" });

  if (!words) return;
  const term = num(results.term);
  label(ctx, `${n} ${NOUN[shape][n === 1 ? 0 : 1]}: ${term} sticks`, width / 2, height - 38, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `rule ${rule.growth}n + ${rule.start}: ${rule.growth} × ${n} + ${rule.start} = ${term}`, width / 2, height - 14, { color: theme.tangent, font: theme.fontStrong, align: "center" });
}

// ── Dots ────────────────────────────────────────────────────────────────────

function drawDots(ctx: CanvasRenderingContext2D, layout: PatternsLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const n = Math.max(1, Math.round(num(results.n, 1)));
  const half = width / 2;
  const p = Math.min(18, (half - 24) / (n + 1), (height - 170) / (n + 1));
  const r = Math.max(1.6, p * 0.32);
  const top = 40 + p / 2;

  // n × n, with the 2n + 1 dots of the next square hollow.
  const sx = (half - (n + 1) * p) / 2 + p / 2;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= n; j++) {
      const x = sx + j * p;
      const y = top + i * p;
      if (i < n && j < n) disc(ctx, x, y, r, theme.sine);
      else ring(ctx, x, y, r, theme.muted);
    }
  }
  // Row r has r dots; the next row, n + 1 dots, hollow.
  const tx = half + (half - (n + 1) * p) / 2 + p / 2;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= i; j++) {
      const x = tx + j * p;
      const y = top + i * p;
      if (i < n) disc(ctx, x, y, r, theme.cosine);
      else ring(ctx, x, y, r, theme.muted);
    }
  }
  const nameY = top + (n + 1) * p + 6;
  label(ctx, "square numbers", half / 2, nameY, { color: theme.sine, font: theme.font, align: "center", baseline: "top" });
  label(ctx, "triangular numbers", half + half / 2, nameY, { color: theme.cosine, font: theme.font, align: "center", baseline: "top" });

  if (!words) return;
  label(ctx, `${n}² = ${num(results.squareDots)}`, half / 2, height - 38, { color: theme.sine, font: theme.fontStrong, align: "center" });
  label(ctx, `${n} × ${n + 1} ÷ 2 = ${num(results.triangleDots)}`, half + half / 2, height - 38, { color: theme.cosine, font: theme.fontStrong, align: "center" });
  label(ctx, `next: +${num(results.squareGrowth)} dots (2n + 1) and +${num(results.triangleGrowth)} dots (n + 1)`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
}

// ── Tiles ───────────────────────────────────────────────────────────────────

const TILE = { big: 30, thin: 10, gap: 4, kindGap: 12 };

function rowWidth(x2: number, x: number, u: number) {
  return Math.abs(x2) * (TILE.big + TILE.gap) + Math.abs(x) * (TILE.thin + TILE.gap) + Math.abs(u) * (TILE.thin + TILE.gap) + 2 * TILE.kindGap;
}

/** One expression as tiles: x² squares, x bars and unit squares; negative tiles in the warning colour with a dashed edge. */
function drawTileRow(ctx: CanvasRenderingContext2D, x0: number, y: number, scale: number, coeffs: readonly [number, number, number], theme: LabTheme) {
  const kinds = [
    { w: TILE.big, h: TILE.big, colour: theme.sine },
    { w: TILE.thin, h: TILE.big, colour: theme.tangent },
    { w: TILE.thin, h: TILE.thin, colour: theme.angle },
  ];
  let x = x0;
  coeffs.forEach((count, kind) => {
    const k = kinds[kind]!;
    for (let i = 0; i < Math.abs(count); i++) {
      const w = k.w * scale;
      const h = k.h * scale;
      const top = y + (TILE.big - k.h) * scale;
      ctx.save();
      ctx.fillStyle = count < 0 ? theme.secant : k.colour;
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x, top, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1;
      if (count < 0) ctx.setLineDash([3, 2]);
      ctx.strokeRect(x, top, w, h);
      ctx.restore();
      x += (k.w + TILE.gap) * scale;
    }
    if (count !== 0) x += TILE.kindGap * scale;
  });
}

function drawTiles(ctx: CanvasRenderingContext2D, layout: PatternsLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const p = [num(results.x2a), num(results.xa), num(results.ua)] as const;
  const q = [num(results.x2b), num(results.xb), num(results.ub)] as const;
  const r = [num(results.rx2), num(results.rx), num(results.ru)] as const;
  const subtract = num(results.op) === 1;
  const left = 74;
  const scale = Math.min(1, (width - left - 10) / Math.max(rowWidth(...p), rowWidth(...q), rowWidth(...r), 1));
  const rows: { name: string; coeffs: readonly [number, number, number]; y: number; colour: string }[] = [
    { name: "first", coeffs: p, y: 56, colour: theme.text },
    { name: "second", coeffs: q, y: 126, colour: theme.text },
    { name: subtract ? "difference" : "sum", coeffs: r, y: 206, colour: theme.tangent },
  ];
  for (const [i, row] of rows.entries()) {
    label(ctx, row.name, left - 8, row.y + (TILE.big * scale) / 2, { color: theme.muted, font: theme.font, align: "right" });
    if (i < 2 || words) label(ctx, `${patternsPolynomial(...row.coeffs)}`, left, row.y - 12, { color: row.colour, font: theme.fontStrong });
    drawTileRow(ctx, left, row.y, scale, row.coeffs, theme);
  }
  label(ctx, subtract ? "−" : "+", 16, 106, { color: theme.text, font: theme.fontStrong, align: "center" });
  line(ctx, 10, 172, width - 10, 172, theme.axis, 1.25);

  // A key: one tile of each kind, and a negative one.
  const keyY = 262;
  const key: [string, number, number, string][] = [
    ["x²", 16, 16, theme.sine],
    ["x", 6, 16, theme.tangent],
    ["1", 6, 6, theme.angle],
    ["negative", 6, 6, theme.secant],
  ];
  let kx = Math.max(10, width / 2 - 130);
  for (const [name, w, h, colour] of key) {
    ctx.save();
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(kx, keyY + 16 - h, w, h);
    ctx.restore();
    label(ctx, name, kx + w + 4, keyY + 10, { color: theme.muted, font: theme.font });
    kx += w + 14 + name.length * 7;
  }

  if (!words) return;
  const pairs = num(results.zeroPairs);
  label(ctx, pairs === 0 ? "no zero pairs: nothing cancels" : `${pairs} zero pair${pairs === 1 ? "" : "s"} cancel`, width / 2, height - 38, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `check at x = 2: ${patternsFormat(num(results.pAt2))} ${subtract ? "−" : "+"} ${bracket(num(results.qAt2))} = ${patternsFormat(num(results.resultAt2))}`, width / 2, height - 14, { color: theme.tangent, font: theme.fontStrong, align: "center" });
}

// ── Parabola ────────────────────────────────────────────────────────────────

function drawParabola(ctx: CanvasRenderingContext2D, layout: PatternsLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height, plot } = layout;
  const a = num(results.qa, 1);
  const b = num(results.qb);
  const c = num(results.qc);
  const plane = createPlane(plot, [-6, 6], [-10, 10]);
  drawPlane(ctx, plane, theme, { gridStep: 1 });
  const quadratic = num(results.isQuadratic) === 1;
  label(ctx, `y = ${patternsPolynomial(a, b, c)}`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const x = -6 + (12 * i) / 240;
    const [sx, sy] = plane.toPx(x, a * x * x + b * x + c);
    // Keep far-off points finite so the path stays drawable.
    const yy = Math.max(-1e4, Math.min(1e4, sy));
    if (i === 0) ctx.moveTo(sx, yy);
    else ctx.lineTo(sx, yy);
  }
  ctx.stroke();
  ctx.restore();

  const count = num(results.zeroCount);
  const zeroes = count === 2 ? [num(results.zero1), num(results.zero2)] : count === 1 ? [num(results.zero1)] : [];
  for (const z of zeroes) {
    if (Math.abs(z) > 6) continue;
    const [zx, zy] = plane.toPx(z, 0);
    disc(ctx, zx, zy, 5, theme.angle);
    if (words) label(ctx, patternsFormat(z), zx, zy - 14, { color: theme.angle, font: theme.fontStrong, align: "center", background: theme.background });
  }
  if (quadratic) {
    const vx = num(results.vertexX);
    const vy = num(results.vertexY);
    if (plane.contains(...plane.toPx(vx, vy))) disc(ctx, ...plane.toPx(vx, vy), 3.5, theme.text);
  }

  if (!words) return;
  const d = num(results.disc);
  const say = (text: string, y: number, colour = theme.text) => label(ctx, text, width / 2, y, { color: colour, font: theme.font, align: "center" });
  if (!quadratic) {
    say("a = 0: not a quadratic, just a straight line", height - 38);
    return;
  }
  if (count === 2) say(`b² − 4ac = ${patternsFormat(d)} > 0: two zeroes, ${patternsFormat(zeroes[0]!)} and ${patternsFormat(zeroes[1]!)}`, height - 38);
  else if (count === 1) say(`b² − 4ac = 0: one zero, ${patternsFormat(zeroes[0]!)} (it touches)`, height - 38);
  else say(`b² − 4ac = ${patternsFormat(d)} < 0: no zeroes`, height - 38);
  if (count > 0) say(`sum ${patternsFormat(num(results.sumOfZeroes))} = −b/a · product ${patternsFormat(num(results.productOfZeroes))} = c/a`, height - 14, theme.tangent);
  else say("the parabola never meets the x-axis", height - 14, theme.tangent);
}

// ── Arithmetic progression ──────────────────────────────────────────────────

function drawProgression(ctx: CanvasRenderingContext2D, layout: PatternsLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height, bars } = layout;
  const a = num(results.apA);
  const d = num(results.apD);
  const n = Math.max(1, Math.round(num(results.n, 1)));
  const last = a + (n - 1) * d;
  const terms = Array.from({ length: n }, (_, j) => a + j * d);
  const positive = terms.every((t) => t >= 0);
  label(ctx, `An AP: a = ${patternsFormat(a)}, d = ${patternsFormat(d)}`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  const shown = Array.from({ length: 5 }, (_, j) => patternsFormat(a + j * d)).join(", ");
  label(ctx, `${shown}, …`, width / 2, 33, { color: theme.angle, font: theme.font, align: "center" });

  const top = Math.max(1, positive ? a + last : Math.max(...terms));
  const bottom = Math.min(0, ...terms);
  const span = top - bottom;
  const plane = createPlane(bars, [0, n], [bottom - span * 0.04, top + span * 0.06]);
  const [, y0] = plane.toPx(0, 0);
  // Axis and a few heights.
  line(ctx, bars.x, y0, bars.x + bars.width, y0, theme.axis, 1.25);
  line(ctx, bars.x, bars.y, bars.x, bars.y + bars.height, theme.axis, 1.25);
  for (const t of linearTicks(plane.yDomain, 5)) {
    const [, ty] = plane.toPx(0, t.value);
    line(ctx, bars.x - 3, ty, bars.x, ty, theme.axis, 1);
    label(ctx, t.label.replace("-", "−"), bars.x - 5, ty, { color: theme.muted, font: theme.font, align: "right" });
  }
  const w = (bars.width / n) * 0.78;
  terms.forEach((t, j) => {
    const [x] = plane.toPx(j + 0.11, 0);
    const [, ty] = plane.toPx(0, t);
    ctx.save();
    ctx.fillStyle = j === n - 1 ? theme.angle : t < 0 ? theme.secant : theme.sine;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(x, Math.min(ty, y0), w, Math.abs(ty - y0));
    ctx.restore();
    if (positive) {
      // The same AP backwards, upside down on top: every column reaches a + l.
      const [, cy] = plane.toPx(0, t + terms[n - 1 - j]!);
      ctx.save();
      ctx.strokeStyle = theme.cosine;
      ctx.setLineDash([3, 3]);
      ctx.strokeRect(x, cy, w, ty - cy);
      ctx.restore();
    }
    if (n <= 10 || (j + 1) % 5 === 0) label(ctx, String(j + 1), x + w / 2, bars.y + bars.height + 8, { color: theme.muted, font: theme.font, align: "center", baseline: "top" });
  });
  label(ctx, "term number", bars.x + bars.width, bars.y + bars.height + 24, { color: theme.muted, font: theme.font, align: "right", baseline: "top" });

  if (!words) return;
  label(ctx, `a${sub(n)} = ${patternsFormat(a)} + ${n - 1} × ${bracket(d)} = ${patternsFormat(last)}`, width / 2, height - 38, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `S${sub(n)} = ${n}/2 × (${patternsFormat(a)} + ${bracket(last)}) = ${patternsFormat(num(results.apSum))}`, width / 2, height - 14, { color: theme.tangent, font: theme.fontStrong, align: "center" });
}

export const patternsRenderer: SimulationRenderer<PatternsLayout> = {
  id: "patterns",
  layout: (width) => computePatternsLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const title = (text: string) => label(ctx, text, layout.width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    ctx.clearRect(0, 0, layout.width, layout.height);
    const r = results as Record<string, unknown>;

    if (has("factors")) {
      title("Factor trees: down to the primes");
      drawFactors(ctx, layout, r, theme, words);
    }
    if (has("roots")) {
      title("The square root spiral");
      drawRoots(ctx, layout, r, theme, words);
    }
    if (has("sticks")) {
      const shape = PATTERNS_STICKS_ORDER[Math.round(num(results.sticks, 1))] ?? "squares";
      const name = PATTERNS_STICKS[shape].label;
      title(`Matchsticks: ${name}`);
      drawSticks(ctx, layout, r, theme, words);
    }
    if (has("dots")) {
      title("Square and triangular numbers");
      drawDots(ctx, layout, r, theme, words);
    }
    if (has("tiles")) {
      title("Like terms: tiles join their own kind");
      drawTiles(ctx, layout, r, theme, words);
    }
    if (has("parabola")) drawParabola(ctx, layout, r, theme, words);
    if (has("ap")) drawProgression(ctx, layout, r, theme, words);
  },
};
