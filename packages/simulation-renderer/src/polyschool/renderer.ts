/**
 * Identities, factorisation and polynomials, in eight pictures.
 *
 * Square of a sum: a square of side a + b cut into a², two ab rectangles
 * and b², on a grid of unit squares.
 *
 * Square of a difference: the (a − b)² square in the corner of a², with the
 * two a × b strips that are taken away overlapping in the b² corner.
 *
 * Difference of squares: a² with b² cut from its corner, and below it the
 * same two pieces rearranged into an (a + b) × (a − b) rectangle.
 *
 * Two brackets: an (x + a) by (x + b) rectangle of x², ax, bx and ab.
 *
 * Multiply: (px + q)(rx + s) on an area grid, a cell for every pair of terms.
 *
 * Factorise: x² + bx + c as algebra tiles, the x tiles split m and n round
 * the x² tile; the corner holds m × n unit tiles (negative ones dashed).
 *
 * Polynomial: the graph of p(x), its zeroes on the x-axis, and the point
 * (a, p(a)).
 *
 * Division: synthetic division of p(x) by (x − a), and the remainder beside
 * p(a). Remainders and values are written only with the words layer.
 */

import {
  polySchoolBinomial,
  polySchoolDivide,
  polySchoolText,
  polySchoolValue,
} from "@ise/mathematics-engine";
import { label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface PolySchoolLayout {
  width: number;
  height: number;
  /** Where the area pictures are drawn. */
  stage: Box;
  /** The graph of the polynomial view. */
  plot: Box;
}

export function computePolySchoolLayout(width: number): PolySchoolLayout {
  const height = width < 560 ? 400 : 420;
  return {
    width,
    height,
    stage: { x: 28, y: 44, width: width - 56, height: height - 44 - 70 },
    plot: { x: 36, y: 46, width: width - 48, height: height - 46 - 74 },
  };
}

/** A whole number as a book prints it, with a true minus sign. */
export function polySchoolFormat(v: number): string {
  const r = Math.round(v) || 0;
  return r < 0 ? `−${-r}` : String(r);
}

/** "64 − 96 + 44 − 6": signed numbers joined as a sum; "0" for none. */
export function polySchoolSum(values: readonly number[]): string {
  const parts: string[] = [];
  for (const v of values) {
    if (parts.length === 0) parts.push(polySchoolFormat(v));
    else parts.push(`${v < 0 ? "−" : "+"} ${Math.abs(Math.round(v))}`);
  }
  return parts.length ? parts.join(" ") : "0";
}

/** One rectangle of an area picture, in canvas pixels. */
export interface PolySchoolPiece {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Units of area it stands for (negative for a negative tile). */
  area: number;
  role: "first" | "cross" | "last" | "hole" | "outline";
}

type R = Record<string, unknown>;
const int = (r: R, key: string, fallback = 0) => Math.round(num(r[key], fallback));

/** The pieces of the square of a sum: a², ab, ab, b², on a fixed scale (side up to 18). */
export function polySchoolPlusPieces(layout: PolySchoolLayout, a: number, b: number): PolySchoolPiece[] {
  const { stage } = layout;
  const u = Math.min(stage.width, stage.height) / 18;
  const side = (a + b) * u;
  const x0 = stage.x + (stage.width - side) / 2;
  const y0 = stage.y;
  return [
    { name: "a²", x: x0, y: y0, w: a * u, h: a * u, area: a * a, role: "first" },
    { name: "ab", x: x0 + a * u, y: y0, w: b * u, h: a * u, area: a * b, role: "cross" },
    { name: "ab", x: x0, y: y0 + a * u, w: a * u, h: b * u, area: a * b, role: "cross" },
    { name: "b²", x: x0 + a * u, y: y0 + a * u, w: b * u, h: b * u, area: b * b, role: "last" },
  ];
}

/** The square of a difference: a² outlined, (a − b)² in its corner, two a × b strips overlapping in b². Needs a > b. */
export function polySchoolMinusPieces(layout: PolySchoolLayout, a: number, b: number): PolySchoolPiece[] {
  const { stage } = layout;
  const room = 30;
  const u = Math.min(stage.width - room, stage.height) / 9;
  const d = a - b;
  const x0 = stage.x + room + (stage.width - room - a * u) / 2;
  const y0 = stage.y;
  return [
    { name: "a²", x: x0, y: y0, w: a * u, h: a * u, area: a * a, role: "outline" },
    { name: "(a − b)²", x: x0, y: y0, w: d * u, h: d * u, area: d * d, role: "first" },
    { name: "ab", x: x0 + d * u, y: y0, w: b * u, h: a * u, area: a * b, role: "cross" },
    { name: "ab", x: x0, y: y0 + d * u, w: a * u, h: b * u, area: a * b, role: "cross" },
    { name: "b²", x: x0 + d * u, y: y0 + d * u, w: b * u, h: b * u, area: b * b, role: "last" },
  ];
}

/**
 * The difference of squares: above, a² with the b² corner cut away, leaving an
 * a × (a − b) strip and an (a − b) × b strip; below, the same two pieces side
 * by side as an (a + b) × (a − b) rectangle. Needs a > b.
 */
export function polySchoolDifferencePieces(layout: PolySchoolLayout, a: number, b: number): PolySchoolPiece[] {
  const { stage } = layout;
  const d = a - b;
  const room = 30;
  const inner = stage.width - room;
  const u = Math.min(inner / 17, (stage.height - 16) / 18);
  const x0 = stage.x + room + (inner - a * u) / 2;
  const y0 = stage.y;
  const x1 = stage.x + room + (inner - (a + b) * u) / 2;
  const y1 = y0 + a * u + 16 + u;
  return [
    { name: "top strip", x: x0, y: y0, w: a * u, h: d * u, area: a * d, role: "first" },
    { name: "side strip", x: x0, y: y0 + d * u, w: d * u, h: b * u, area: d * b, role: "last" },
    { name: "b²", x: x0 + d * u, y: y0 + d * u, w: b * u, h: b * u, area: b * b, role: "hole" },
    { name: "top strip", x: x1, y: y1, w: a * u, h: d * u, area: a * d, role: "first" },
    { name: "side strip", x: x1 + a * u, y: y1, w: b * u, h: d * u, area: d * b, role: "last" },
  ];
}

/** The (x + a) by (x + b) rectangle: x², ax, bx, ab (side up to 18). */
export function polySchoolPairPieces(layout: PolySchoolLayout, x: number, a: number, b: number): PolySchoolPiece[] {
  const { stage } = layout;
  const u = Math.min(stage.width, stage.height) / 18;
  const x0 = stage.x + (stage.width - (x + a) * u) / 2;
  const y0 = stage.y;
  return [
    { name: "x²", x: x0, y: y0, w: x * u, h: x * u, area: x * x, role: "first" },
    { name: "ax", x: x0 + x * u, y: y0, w: a * u, h: x * u, area: a * x, role: "cross" },
    { name: "bx", x: x0, y: y0 + x * u, w: x * u, h: b * u, area: b * x, role: "cross" },
    { name: "ab", x: x0 + x * u, y: y0 + x * u, w: a * u, h: b * u, area: a * b, role: "last" },
  ];
}

/** How long the x tile is drawn, in unit-tile lengths: any length works, so it is not a whole number. */
export const POLYSCHOOL_TILE_X = 4.5;

/**
 * Algebra tiles for (x + m)(x + n): one x² tile, |m| x tiles down its right
 * side, |n| x tiles along its bottom, and |m| × |n| unit tiles in the corner.
 */
export function polySchoolTilePieces(layout: PolySchoolLayout, m: number, n: number): PolySchoolPiece[] {
  const { stage } = layout;
  const X = POLYSCHOOL_TILE_X;
  const M = Math.abs(m);
  const N = Math.abs(n);
  const u = Math.min(22, stage.width / (X + M), (stage.height - 8) / (X + N));
  const x0 = stage.x + (stage.width - (X + M) * u) / 2;
  const y0 = stage.y + 4;
  const pieces: PolySchoolPiece[] = [{ name: "x²", x: x0, y: y0, w: X * u, h: X * u, area: 1, role: "first" }];
  for (let i = 0; i < M; i++) pieces.push({ name: "x", x: x0 + (X + i) * u, y: y0, w: u, h: X * u, area: Math.sign(m), role: "cross" });
  for (let j = 0; j < N; j++) pieces.push({ name: "x", x: x0, y: y0 + (X + j) * u, w: X * u, h: u, area: Math.sign(n), role: "cross" });
  for (let i = 0; i < M; i++)
    for (let j = 0; j < N; j++) pieces.push({ name: "1", x: x0 + (X + i) * u, y: y0 + (X + j) * u, w: u, h: u, area: Math.sign(m * n), role: "last" });
  return pieces;
}

function fillBox(ctx: CanvasRenderingContext2D, p: { x: number; y: number; w: number; h: number }, colour: string, alpha: number, stroke: string, dashed = false) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.25;
  if (dashed) ctx.setLineDash([4, 3]);
  ctx.strokeRect(p.x, p.y, p.w, p.h);
  ctx.restore();
}

/** Faint unit squares over a piece, so areas can be counted. */
function unitGrid(ctx: CanvasRenderingContext2D, p: PolySchoolPiece, u: number, theme: LabTheme) {
  ctx.save();
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  for (let x = p.x + u; x < p.x + p.w - 0.5; x += u) segment(ctx, x, p.y, x, p.y + p.h);
  for (let y = p.y + u; y < p.y + p.h - 0.5; y += u) segment(ctx, p.x, y, p.x + p.w, y);
  ctx.restore();
}

function roleColour(role: PolySchoolPiece["role"], theme: LabTheme) {
  return role === "first" ? theme.sine : role === "cross" ? theme.tangent : role === "last" ? theme.cosine : theme.muted;
}

/** The piece's name in its middle, when there is room for it. */
function nameIn(ctx: CanvasRenderingContext2D, p: PolySchoolPiece, text: string, theme: LabTheme) {
  if (p.w < text.length * 6 + 4 || p.h < 14) return;
  label(ctx, text, p.x + p.w / 2, p.y + p.h / 2, { color: theme.text, font: theme.fontStrong, align: "center" });
}

function caption(ctx: CanvasRenderingContext2D, layout: PolySchoolLayout, text: string, line: 1 | 2, colour: string, theme: LabTheme) {
  label(ctx, text, layout.width / 2, layout.height - (line === 1 ? 38 : 14), { color: colour, font: line === 2 ? theme.fontStrong : theme.font, align: "center" });
}

/** Letters along the top and the left of an area picture. */
function sideNames(ctx: CanvasRenderingContext2D, top: [string, number, number][], left: [string, number, number][], x0: number, y0: number, theme: LabTheme) {
  for (const [text, from, to] of top) if (to - from >= Math.max(8, text.length * 6 - 6)) label(ctx, text, (from + to) / 2, y0 - 9, { color: theme.text, font: theme.font, align: "center" });
  for (const [text, from, to] of left) if (to - from >= 8) label(ctx, text, x0 - 8, (from + to) / 2, { color: theme.text, font: theme.font, align: "right" });
}

// ── Identities ──────────────────────────────────────────────────────────────

function drawPlus(ctx: CanvasRenderingContext2D, layout: PolySchoolLayout, r: R, theme: LabTheme, words: boolean) {
  const a = int(r, "a", 5);
  const b = int(r, "b", 3);
  const pieces = polySchoolPlusPieces(layout, a, b);
  const u = pieces[0]!.w / a;
  for (const p of pieces) {
    fillBox(ctx, p, roleColour(p.role, theme), 0.35, theme.text);
    unitGrid(ctx, p, u, theme);
    nameIn(ctx, p, p.name, theme);
  }
  const [sq, , , last] = pieces;
  sideNames(ctx, [["a", sq!.x, sq!.x + sq!.w], ["b", last!.x, last!.x + last!.w]], [["a", sq!.y, sq!.y + sq!.h], ["b", last!.y, last!.y + last!.h]], sq!.x, sq!.y, theme);
  caption(ctx, layout, `a = ${a}, b = ${b}: a square of side a + b = ${a + b}`, 1, theme.text, theme);
  const total = `(${a} + ${b})²`;
  if (words) caption(ctx, layout, `${total} = ${a * a} + 2 × ${a * b} + ${b * b} = ${(a + b) ** 2}`, 2, theme.tangent, theme);
  else caption(ctx, layout, `${total} = a² + 2ab + b² = ?`, 2, theme.tangent, theme);
}

function drawMinus(ctx: CanvasRenderingContext2D, layout: PolySchoolLayout, r: R, theme: LabTheme, words: boolean) {
  const a = int(r, "a", 5);
  const b = int(r, "b", 3);
  const total = `(${a} − ${b})²`;
  if (a <= b) {
    label(ctx, "Make a bigger than b to see (a − b)² as a square.", layout.width / 2, layout.stage.y + 60, { color: theme.muted, font: theme.font, align: "center" });
  } else {
    const pieces = polySchoolMinusPieces(layout, a, b);
    const [outline, small, right, bottom, corner] = pieces;
    const u = outline!.w / a;
    fillBox(ctx, outline!, theme.muted, 0.06, theme.muted);
    unitGrid(ctx, outline!, u, theme);
    fillBox(ctx, small!, theme.sine, 0.45, theme.text);
    for (const strip of [right!, bottom!]) fillBox(ctx, strip, theme.tangent, 0.18, theme.tangent, true);
    fillBox(ctx, corner!, theme.cosine, 0.45, theme.text);
    nameIn(ctx, small!, "(a − b)²", theme);
    // Name the strips where they do not overlap.
    nameIn(ctx, { ...right!, h: right!.h - corner!.h }, "ab", theme);
    nameIn(ctx, { ...bottom!, w: bottom!.w - corner!.w }, "ab", theme);
    nameIn(ctx, corner!, "b²", theme);
    sideNames(ctx, [["a − b", small!.x, small!.x + small!.w], ["b", corner!.x, corner!.x + corner!.w]], [["a − b", small!.y, small!.y + small!.h], ["b", corner!.y, corner!.y + corner!.h]], outline!.x, outline!.y, theme);
  }
  caption(ctx, layout, `a = ${a}, b = ${b}: take two a × b strips, add b² back`, 1, theme.text, theme);
  if (words) caption(ctx, layout, `${total} = ${a * a} − 2 × ${a * b} + ${b * b} = ${(a - b) ** 2}`, 2, theme.tangent, theme);
  else caption(ctx, layout, `${total} = a² − 2ab + b² = ?`, 2, theme.tangent, theme);
}

function drawDifference(ctx: CanvasRenderingContext2D, layout: PolySchoolLayout, r: R, theme: LabTheme, words: boolean) {
  const a = int(r, "a", 5);
  const b = int(r, "b", 3);
  if (a <= b) {
    label(ctx, "Make a bigger than b to cut b² from a².", layout.width / 2, layout.stage.y + 60, { color: theme.muted, font: theme.font, align: "center" });
  } else {
    const pieces = polySchoolDifferencePieces(layout, a, b);
    const [top, side, hole, top2, side2] = pieces;
    const u = top!.w / a;
    for (const p of [top!, side!, top2!, side2!]) {
      fillBox(ctx, p, roleColour(p.role, theme), 0.38, theme.text);
      unitGrid(ctx, p, u, theme);
    }
    fillBox(ctx, hole!, theme.background, 0, theme.muted, true);
    nameIn(ctx, hole!, "b²", theme);
    sideNames(ctx, [["a", top!.x, top!.x + top!.w]], [["a − b", top!.y, top!.y + top!.h], ["b", side!.y, side!.y + side!.h]], top!.x, top!.y, theme);
    // Below the rectangle: its length a + b, split as a and b.
    const below = top2!.y + top2!.h + 10;
    label(ctx, `a + b = ${a + b}`, top2!.x + (top2!.w + side2!.w) / 2, below, { color: theme.text, font: theme.font, align: "center" });
    if (top2!.h >= 8) label(ctx, "a − b", top2!.x - 6, top2!.y + top2!.h / 2, { color: theme.text, font: theme.font, align: "right" });
  }
  caption(ctx, layout, "cut b² from a², then move the side strip", 1, theme.text, theme);
  if (words) caption(ctx, layout, `${a * a} − ${b * b} = ${a + b} × ${a - b} = ${a * a - b * b}`, 2, theme.tangent, theme);
  else caption(ctx, layout, `${a}² − ${b}² = (${a} + ${b}) × (${a} − ${b})`, 2, theme.tangent, theme);
}

function drawPair(ctx: CanvasRenderingContext2D, layout: PolySchoolLayout, r: R, theme: LabTheme, words: boolean) {
  const x = int(r, "x", 4);
  const a = int(r, "a", 5);
  const b = int(r, "b", 3);
  const pieces = polySchoolPairPieces(layout, x, a, b);
  const u = pieces[0]!.w / x;
  for (const p of pieces) {
    fillBox(ctx, p, roleColour(p.role, theme), 0.35, theme.text);
    unitGrid(ctx, p, u, theme);
    nameIn(ctx, p, p.name, theme);
  }
  const [sq, , , last] = pieces;
  sideNames(ctx, [["x", sq!.x, sq!.x + sq!.w], ["a", last!.x, last!.x + last!.w]], [["x", sq!.y, sq!.y + sq!.h], ["b", last!.y, last!.y + last!.h]], sq!.x, sq!.y, theme);
  caption(ctx, layout, `x = ${x}, a = ${a}, b = ${b}: (x + a)(x + b)`, 1, theme.text, theme);
  if (words) caption(ctx, layout, `${x + a} × ${x + b} = ${x * x} + ${(a + b) * x} + ${a * b} = ${(x + a) * (x + b)}`, 2, theme.tangent, theme);
  else caption(ctx, layout, "x² + (a + b)x + ab", 2, theme.tangent, theme);
}

// ── Multiplying ─────────────────────────────────────────────────────────────

/** "6x²", "−10x", "15": one term with its sign, as written in a grid cell. */
function term(coeff: number, power: number): string {
  const m = Math.abs(coeff);
  const sign = coeff < 0 ? "−" : "";
  if (power === 0) return `${sign}${m}`;
  return `${sign}${m === 1 ? "" : m}x${power === 2 ? "²" : ""}`;
}

/** The area grid geometry: column and row terms and the cell size. */
export function polySchoolGrid(layout: PolySchoolLayout, columns: number, rows: number) {
  const cw = Math.min(96, (layout.width - 90) / Math.max(1, columns));
  const ch = Math.min(52, 120 / Math.max(1, rows));
  const left = (layout.width - columns * cw) / 2 + 18;
  const top = 74;
  return { cw, ch, left, top, right: left + columns * cw, bottom: top + rows * ch };
}

function drawMultiply(ctx: CanvasRenderingContext2D, layout: PolySchoolLayout, r: R, theme: LabTheme, words: boolean) {
  const p = int(r, "mp", 2);
  const q = int(r, "mq", 3);
  const rr = int(r, "mr", 3);
  const s = int(r, "ms", 5);
  const first = polySchoolText([p, q]);
  const second = polySchoolText([rr, s]);
  label(ctx, `(${first})(${second})`, layout.width / 2, 38, { color: theme.text, font: theme.fontStrong, align: "center" });
  const cols = [
    { c: p, power: 1 },
    { c: q, power: 0 },
  ].filter((t) => t.c !== 0);
  const rows = [
    { c: rr, power: 1 },
    { c: s, power: 0 },
  ].filter((t) => t.c !== 0);
  if (cols.length === 0 || rows.length === 0) {
    label(ctx, "A bracket that is 0 makes the whole product 0.", layout.width / 2, 120, { color: theme.muted, font: theme.font, align: "center" });
    caption(ctx, layout, "anything × 0 = 0", 2, theme.tangent, theme);
    return;
  }
  const g = polySchoolGrid(layout, cols.length, rows.length);
  cols.forEach((t, i) => label(ctx, term(t.c, t.power), g.left + (i + 0.5) * g.cw, g.top - 12, { color: theme.sine, font: theme.fontStrong, align: "center" }));
  rows.forEach((t, j) => label(ctx, term(t.c, t.power), g.left - 8, g.top + (j + 0.5) * g.ch, { color: theme.cosine, font: theme.fontStrong, align: "right" }));
  const cells: string[] = [];
  // Each term of the first bracket times the whole second bracket, in turn.
  cols.forEach((col, i) =>
    rows.forEach((row, j) => {
      const c = col.c * row.c;
      const power = col.power + row.power;
      const box = { x: g.left + i * g.cw, y: g.top + j * g.ch, w: g.cw, h: g.ch };
      const colour = power === 2 ? theme.sine : power === 1 ? theme.tangent : theme.angle;
      fillBox(ctx, box, c < 0 ? theme.secant : colour, 0.3, theme.text, c < 0);
      const text = term(c, power);
      cells.push(text);
      label(ctx, text, box.x + box.w / 2, box.y + box.h / 2, { color: theme.text, font: theme.fontStrong, align: "center" });
    }),
  );
  // Like terms: the x cells are the same colour.
  const below = g.bottom + 22;
  const joined = cells.map((t, k) => (k === 0 ? t : t.startsWith("−") ? `− ${t.slice(1)}` : `+ ${t}`)).join(" ");
  label(ctx, `= ${joined}`, layout.width / 2, below, { color: theme.text, font: theme.font, align: "center" });
  const x2 = int(r, "mulX2");
  const x1 = int(r, "mulX1");
  const x0 = int(r, "mulX0");
  caption(ctx, layout, int(r, "mulLike") ? "the two x cells are like terms: add them" : "no like terms to collect here", 1, theme.text, theme);
  if (words) {
    label(ctx, `= ${polySchoolText([x2, x1, x0])}`, layout.width / 2, below + 24, { color: theme.tangent, font: theme.fontStrong, align: "center" });
    caption(ctx, layout, `check at x = 2: ${polySchoolFormat(int(r, "firstAt2"))} × ${bracketed(int(r, "secondAt2"))} = ${polySchoolFormat(int(r, "mulAt2"))}`, 2, theme.tangent, theme);
  }
}

const bracketed = (v: number) => (v < 0 ? `(${polySchoolFormat(v)})` : polySchoolFormat(v));

// ── Factorising ─────────────────────────────────────────────────────────────

function drawFactorise(ctx: CanvasRenderingContext2D, layout: PolySchoolLayout, r: R, theme: LabTheme, words: boolean) {
  const b = int(r, "fb", 5);
  const c = int(r, "fc", 6);
  const m = int(r, "fm", 1);
  const n = b - m;
  const fits = int(r, "fits") === 1;
  const expression = polySchoolText([1, b, c]);
  label(ctx, `Factorise ${expression} with tiles`, layout.width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  const pieces = polySchoolTilePieces(layout, m, n);
  for (const p of pieces) {
    const negative = p.area < 0;
    fillBox(ctx, p, negative ? theme.secant : roleColour(p.role, theme), p.role === "last" ? 0.55 : 0.35, theme.text, negative);
  }
  const sq = pieces[0]!;
  const u = sq.w / POLYSCHOOL_TILE_X;
  if (fits) {
    ctx.save();
    ctx.strokeStyle = theme.tangent;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(sq.x, sq.y, sq.w + Math.abs(m) * u, sq.h + Math.abs(n) * u);
    ctx.restore();
  }
  nameIn(ctx, sq, "x²", theme);
  const sign = (k: number) => `${k < 0 ? "−" : "+"}${Math.abs(k)}`;
  const top: [string, number, number][] = [["x", sq.x, sq.x + sq.w]];
  if (m !== 0) top.push([sign(m), sq.x + sq.w, sq.x + sq.w + Math.abs(m) * u]);
  const left: [string, number, number][] = [["x", sq.y, sq.y + sq.h]];
  if (n !== 0) left.push([sign(n), sq.y + sq.h, sq.y + sq.h + Math.abs(n) * u]);
  sideNames(ctx, top, left, sq.x, sq.y, theme);

  const mx = `${polySchoolFormat(m)}x`;
  const nx = `${n < 0 ? "−" : "+"} ${Math.abs(n)}x`;
  caption(ctx, layout, `${polySchoolFormat(b)}x as ${mx} ${nx}: corner ${bracketed(m)} × ${bracketed(n)} = ${polySchoolFormat(m * n)}`, 1, theme.text, theme);
  if (fits && words) caption(ctx, layout, `${expression} = ${factorForm(m, n)}`, 2, theme.tangent, theme);
  else if (fits) caption(ctx, layout, "the tiles close into a rectangle", 2, theme.tangent, theme);
  else caption(ctx, layout, `the corner needs ${polySchoolFormat(c)}, not ${polySchoolFormat(m * n)}: try another split`, 2, theme.secant, theme);
}

/** "(x + 2)(x + 3)", "(x + 3)²", "x(x + 5)". */
export function factorForm(m: number, n: number): string {
  if (m === n) return m === 0 ? "x²" : `(${polySchoolBinomial(m)})²`;
  const lo = Math.min(m, n);
  const hi = Math.max(m, n);
  if (lo === 0) return `x(${polySchoolBinomial(hi)})`;
  if (hi === 0) return `x(${polySchoolBinomial(lo)})`;
  return `(${polySchoolBinomial(hi)})(${polySchoolBinomial(lo)})`;
}

// ── Polynomials ─────────────────────────────────────────────────────────────

const KIND: Record<number, string> = { 0: "a constant", 1: "linear", 2: "quadratic", 3: "a cubic" };

function coefficients(r: R): [number, number, number, number] {
  return [int(r, "c3", 1), int(r, "c2", -6), int(r, "c1", 11), int(r, "c0", -6)];
}

/** "p(4) = 64 − 96 + 44 − 6": the value, term by term (the terms whose coefficient is not 0). */
export function polySchoolValueSum(coeffs: readonly number[], a: number): string {
  const top = coeffs.length - 1;
  const terms = coeffs.map((c, i) => (c === 0 ? null : c * a ** (top - i))).filter((t): t is number => t !== null && t !== 0);
  return polySchoolSum(terms);
}

function drawPolynomial(ctx: CanvasRenderingContext2D, layout: PolySchoolLayout, r: R, theme: LabTheme, words: boolean) {
  const { width, plot } = layout;
  const coeffs = coefficients(r);
  const a = int(r, "pa");
  const zeroPoly = int(r, "isZeroPoly") === 1;
  const degree = int(r, "degree");
  label(ctx, `p(x) = ${polySchoolText(coeffs)}`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, zeroPoly ? "the zero polynomial: it has no degree" : `degree ${degree}: ${KIND[degree]}`, width / 2, 32, { color: theme.muted, font: theme.font, align: "center" });

  const plane = createPlane(plot, [-5.5, 5.5], [-20, 20]);
  drawPlane(ctx, plane, theme, { gridStep: 1, showLabels: true });
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 220; i++) {
    const x = -5.5 + (11 * i) / 220;
    const [sx, sy] = plane.toPx(x, polySchoolValue(coeffs, x));
    const yy = Math.max(-1e4, Math.min(1e4, sy));
    if (i === 0) ctx.moveTo(sx, yy);
    else ctx.lineTo(sx, yy);
  }
  ctx.stroke();
  ctx.restore();

  // Zeroes at whole numbers and halves (with leading coefficient 1 or 2 those are the only fractions possible).
  if (!zeroPoly) {
    for (let k = -11; k <= 11; k++) {
      if (polySchoolValue(coeffs, k / 2) !== 0) continue;
      const [zx, zy] = plane.toPx(k / 2, 0);
      dot(ctx, zx, zy, 4.5, theme.tangent);
    }
  }

  const value = polySchoolValue(coeffs, a);
  const [ax, ay0] = plane.toPx(a, 0);
  const shown = Math.max(-20, Math.min(20, value));
  const [, ay] = plane.toPx(a, shown);
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  segment(ctx, ax, ay0, ax, ay);
  ctx.restore();
  dot(ctx, ax, ay, 5.5, theme.angle);
  const tag = words ? `p(${polySchoolFormat(a)}) = ${polySchoolFormat(value)}` : `p(${polySchoolFormat(a)})`;
  const tagX = Math.max(plot.x + 30, Math.min(plot.x + plot.width - 30, ax));
  const tagY = ay < plot.y + 24 ? ay + 16 : ay - 14;
  label(ctx, tag, tagX, tagY, { color: theme.angle, font: theme.fontStrong, align: "center", background: theme.background });

  const sum = polySchoolValueSum(coeffs, a);
  if (words) {
    caption(ctx, layout, `p(${polySchoolFormat(a)}) = ${sum} = ${polySchoolFormat(value)}`, 1, theme.text, theme);
    if (zeroPoly) caption(ctx, layout, "every number is a zero of the zero polynomial", 2, theme.tangent, theme);
    else if (value === 0) caption(ctx, layout, `p(${polySchoolFormat(a)}) = 0: ${polySchoolFormat(a)} is a zero, on the x-axis`, 2, theme.tangent, theme);
    else {
      const count = int(r, "zeroCount");
      caption(ctx, layout, `${count} different zero${count === 1 ? "" : "es"}: where the graph meets the x-axis`, 2, theme.tangent, theme);
    }
  } else {
    caption(ctx, layout, `p(${polySchoolFormat(a)}) = ${sum} = ?`, 1, theme.text, theme);
  }
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, colour: string) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The synthetic division table: where each row and column sits. */
export function polySchoolTable(layout: PolySchoolLayout) {
  const cw = Math.min(60, (layout.width - 80) / 4);
  const left = (layout.width - 4 * cw) / 2 + 20;
  return { cw, left, rows: [92, 128, 170] as const };
}

function drawDivision(ctx: CanvasRenderingContext2D, layout: PolySchoolLayout, r: R, theme: LabTheme, words: boolean) {
  const { width } = layout;
  const coeffs = coefficients(r);
  const a = int(r, "pa");
  const divisor = polySchoolBinomial(-a);
  label(ctx, `Divide p(x) by (${divisor})`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, `p(x) = ${polySchoolText(coeffs)}`, width / 2, 36, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, "Bring down, times a, add; again and again.", width / 2, 56, { color: theme.muted, font: theme.font, align: "center" });

  const { quotient, remainder, carries } = polySchoolDivide(coeffs, a);
  const t = polySchoolTable(layout);
  const cx = (i: number) => t.left + (i + 0.5) * t.cw;
  const [y1, y2, y3] = t.rows;
  label(ctx, `a = ${polySchoolFormat(a)}`, t.left - 10, y1, { color: theme.angle, font: theme.fontStrong, align: "right" });
  coeffs.forEach((c, i) => label(ctx, polySchoolFormat(c), cx(i), y1, { color: theme.sine, font: theme.fontStrong, align: "center" }));
  carries.forEach((c, i) => {
    if (i > 0) label(ctx, polySchoolFormat(c), cx(i), y2, { color: theme.muted, font: theme.font, align: "center" });
  });
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.25;
  segment(ctx, t.left - 4, y2 + 18, t.left + 4 * t.cw, y2 + 18);
  segment(ctx, t.left - 4, y1 - 14, t.left - 4, y3 + 14);
  ctx.restore();
  quotient.forEach((c, i) => label(ctx, polySchoolFormat(c), cx(i), y3, { color: theme.tangent, font: theme.fontStrong, align: "center" }));
  // The remainder, boxed in the last column.
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx(3) - t.cw / 2 + 4, y3 - 14, t.cw - 8, 28);
  ctx.restore();
  label(ctx, words ? polySchoolFormat(remainder) : "?", cx(3), y3, { color: theme.angle, font: theme.fontStrong, align: "center" });
  label(ctx, "quotient", t.left + 1.5 * t.cw, y3 + 26, { color: theme.tangent, font: theme.font, align: "center" });
  label(ctx, "remainder", cx(3), y3 + 26, { color: theme.angle, font: theme.font, align: "center" });

  const q = polySchoolText(quotient);
  label(ctx, `q(x) = ${q}`, width / 2, y3 + 58, { color: theme.tangent, font: theme.font, align: "center" });
  if (words) {
    label(ctx, `p(x) = (${divisor})(${q}) ${remainder < 0 ? "−" : "+"} ${Math.abs(remainder)}`, width / 2, y3 + 82, { color: theme.text, font: theme.font, align: "center" });
    const value = polySchoolValue(coeffs, a);
    caption(ctx, layout, `p(${polySchoolFormat(a)}) = ${polySchoolValueSum(coeffs, a)} = ${polySchoolFormat(value)}`, 1, theme.text, theme);
    caption(ctx, layout, remainder === 0 ? `remainder 0, so (${divisor}) is a factor` : `remainder = p(${polySchoolFormat(a)}) = ${polySchoolFormat(remainder)}: not a factor`, 2, remainder === 0 ? theme.tangent : theme.angle, theme);
  } else {
    caption(ctx, layout, `remainder = p(${polySchoolFormat(a)}) = ?`, 2, theme.angle, theme);
  }
}

export const polySchoolRenderer: SimulationRenderer<PolySchoolLayout> = {
  id: "polyschool",
  layout: (width) => computePolySchoolLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const title = (text: string) => label(ctx, text, layout.width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    ctx.clearRect(0, 0, layout.width, layout.height);
    const r = results as R;

    if (has("plus-square")) {
      title("(a + b)²: a square of side a + b");
      drawPlus(ctx, layout, r, theme, words);
    }
    if (has("minus-square")) {
      title("(a − b)²: what is left of a²");
      drawMinus(ctx, layout, r, theme, words);
    }
    if (has("difference")) {
      title("a² − b²: cut, move, make a rectangle");
      drawDifference(ctx, layout, r, theme, words);
    }
    if (has("pair")) {
      title("(x + a)(x + b) as a rectangle");
      drawPair(ctx, layout, r, theme, words);
    }
    if (has("multiply")) {
      title("Multiply: every term meets every term");
      drawMultiply(ctx, layout, r, theme, words);
    }
    if (has("factorise")) drawFactorise(ctx, layout, r, theme, words);
    if (has("polynomial")) drawPolynomial(ctx, layout, r, theme, words);
    if (has("division")) drawDivision(ctx, layout, r, theme, words);
  },
};
