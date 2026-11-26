/**
 * Matrices and determinants, in three pictures.
 *
 * The plane: a 2 × 2 matrix A acting on the grid. The faint lattice is the
 * image of the square grid; the unit square becomes the parallelogram on
 * A's two columns (Aî and Aĵ), filled one colour when A keeps the picture the
 * right way round and another when it flips it. A little "F" shows the
 * flip. Layers add a point P and AP, the product (B first then A, against A
 * first then B), the inverse (what A⁻¹ does to the unit square), the
 * transpose with the symmetric and skew-symmetric parts, and the circle that
 * an orthogonal matrix keeps P on.
 *
 * The system: the two lines ax + by = e and cx + dy = f, meeting at one
 * point, running parallel, or lying on top of each other.
 *
 * The 3 × 3 determinant: the matrix with the chosen row or column marked,
 * and the three minors that expansion along it needs.
 *
 * Every number that a level asks for is written only with the words layer on.
 */

import { MATRIX_ENTRY, matrixRatio } from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };
export type MatrixView = "plane" | "system" | "det3";

export interface MatrixLayout {
  width: number;
  height: number;
  compact: boolean;
  view: MatrixView;
  /** Layers that change what the plane must fit, so a drag maps back to the same scale. */
  fits: { point: boolean; product: boolean; inverse: boolean; orthogonal: boolean };
  /** The square plane. */
  square: Box;
  /** Baselines of the three caption lines. */
  lines: readonly [number, number, number];
}

/** Half-widths the plane may take; the smallest that fits is used. */
const EXTENTS = [2, 3, 4, 5, 6, 8, 10, 12, 16, 20];
const SYSTEM_EXTENTS = [5, 8, 12];

export function computeMatrixLayout(width: number, _graphs: unknown = [], layers: ReadonlySet<string> = new Set()): MatrixLayout {
  const compact = width < 560;
  const height = compact ? 410 : 450;
  const lines = [height - 48, height - 30, height - 12] as const;
  const side = Math.max(120, Math.min(width - 32, lines[0] - 12 - 28));
  return {
    width,
    height,
    compact,
    view: layers.has("det3") ? "det3" : layers.has("system") ? "system" : "plane",
    fits: { point: layers.has("point") || layers.has("orthogonal"), product: layers.has("product"), inverse: layers.has("inverse"), orthogonal: layers.has("orthogonal") },
    square: { x: (width - side) / 2, y: 28, width: side, height: side },
    lines,
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

const round = (v: number, digits: number) => {
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return r === 0 ? 0 : r;
};
/** A number with at most `digits` decimals, trailing zeros dropped, and a true minus sign. */
export const matrixNumberText = (v: number, digits = 2) => String(round(v, digits)).replace("-", "−");
const n2 = matrixNumberText;
/** A number in brackets when it is negative, for products such as 2·(−3). */
const paren = (v: number) => (round(v, 2) < 0 ? `(${n2(v)})` : n2(v));

/** p/q as an exact fraction where possible: "9/5", "−1/2", "3"; a decimal otherwise. */
export function matrixFractionText(p: number, q: number): string {
  const r = matrixRatio(p, q);
  if (!r) return Math.abs(q) < 1e-9 ? "undefined" : n2(p / q);
  if (r.den === 1) return n2(r.num);
  return `${r.num < 0 ? "−" : ""}${Math.abs(r.num)}/${r.den}`;
}

/** A 2 × 2 matrix written on one line, row by row: [2 1; 1 3]. */
export function matrixInlineText(m: readonly number[]): string {
  const [a = 0, b = 0, c = 0, d = 0] = m;
  return `[${n2(a)} ${n2(b)}; ${n2(c)} ${n2(d)}]`;
}

/** ax + by = e with zero terms left out and unit coefficients dropped. */
export function matrixEquationText(a: number, b: number, e: number): string {
  const parts: string[] = [];
  for (const [v, name] of [[a, "x"], [b, "y"]] as const) {
    if (round(v, 2) === 0) continue;
    const mag = Math.abs(v);
    const body = mag === 1 ? name : `${n2(mag)}${name}`;
    parts.push(parts.length === 0 ? (v < 0 ? `−${body}` : body) : `${v < 0 ? "−" : "+"} ${body}`);
  }
  return `${parts.length ? parts.join(" ") : "0"} = ${n2(e)}`;
}

const SUB = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => String(n).split("").map((ch) => SUB[Number(ch)] ?? ch).join("");

// ── Drawing helpers ──────────────────────────────────────────────────────────

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, inside?: Box) {
  if (inside && (x < inside.x || x > inside.x + inside.width || y < inside.y || y > inside.y + inside.height)) return;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function polygon(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], style: { fill?: string; stroke?: string; alpha?: number; width?: number; dash?: number[] }) {
  if (points.length < 2) return;
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.globalAlpha = style.alpha ?? 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.width ?? 1.5;
    if (style.dash) ctx.setLineDash(style.dash);
    ctx.stroke();
  }
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** A name in a pill, kept inside a box. */
function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, box: Box, colour: string, theme: LabTheme) {
  const half = text.length * 3.5 + 6;
  const lx = Math.min(box.x + box.width - half, Math.max(box.x + half, x));
  const ly = Math.min(box.y + box.height - 9, Math.max(box.y + 9, y));
  label(ctx, text, lx, ly, { color: colour, font: theme.fontStrong, align: "center", background: theme.background });
}

/**
 * A 2 × 2 matrix drawn as a textbook does: a name, an optional factor, and
 * the entries between brackets (or bars, for a determinant). Returns its width.
 */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rows: readonly (readonly string[])[],
  options: { name?: string; factor?: string; colour: string; theme: LabTheme; bars?: boolean; cell?: number; panel?: boolean; highlight?: { row?: number; column?: number; colour: string } },
): number {
  const { theme, colour } = options;
  const cell = options.cell ?? 30;
  const rowHeight = 18;
  const prefix = [options.name ? `${options.name} =` : "", options.factor ?? ""].filter(Boolean).join(" ");
  const prefixWidth = prefix ? prefix.length * 6.5 + 6 : 0;
  const columns = rows[0]?.length ?? 0;
  const width = prefixWidth + columns * cell + 10;
  const height = rows.length * rowHeight + 6;
  if (options.panel) {
    ctx.save();
    ctx.fillStyle = theme.background;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
    ctx.restore();
  }
  if (prefix) label(ctx, prefix, x, y + height / 2, { color: colour, font: theme.fontStrong });
  const left = x + prefixWidth;
  const right = left + columns * cell + 8;
  const hl = options.highlight;
  if (hl) {
    ctx.save();
    ctx.fillStyle = hl.colour;
    ctx.globalAlpha = 0.22;
    if (hl.row !== undefined) ctx.fillRect(left + 3, y + 3 + hl.row * rowHeight, columns * cell + 2, rowHeight);
    if (hl.column !== undefined) ctx.fillRect(left + 4 + hl.column * cell, y + 2, cell, rows.length * rowHeight + 2);
    ctx.restore();
  }
  // Brackets (or the bars of a determinant).
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  const tick = options.bars ? 0 : 4;
  ctx.beginPath();
  ctx.moveTo(left + tick, y);
  ctx.lineTo(left, y);
  ctx.lineTo(left, y + height);
  ctx.lineTo(left + tick, y + height);
  ctx.moveTo(right - tick, y);
  ctx.lineTo(right, y);
  ctx.lineTo(right, y + height);
  ctx.lineTo(right - tick, y + height);
  ctx.stroke();
  ctx.restore();
  rows.forEach((row, i) =>
    row.forEach((entry, j) => label(ctx, entry, left + 4 + cell * (j + 0.5), y + 3 + rowHeight * (i + 0.5), { color: theme.text, font: theme.font, align: "center" })),
  );
  return width;
}

const glyphRows = (m: readonly number[]) => [
  [n2(m[0] ?? 0), n2(m[1] ?? 0)],
  [n2(m[2] ?? 0), n2(m[3] ?? 0)],
];

// ── The plane ────────────────────────────────────────────────────────────────

/** The "F": inside the unit square, so its image sits inside the parallelogram — and it shows a flip. */
export const MATRIX_F_SHAPE: readonly (readonly [number, number])[] = [
  [0.15, 0.1], [0.35, 0.1], [0.35, 0.45], [0.65, 0.45], [0.65, 0.62], [0.35, 0.62], [0.35, 0.78], [0.8, 0.78], [0.8, 0.95], [0.15, 0.95],
];
const UNIT_SQUARE: readonly (readonly [number, number])[] = [[0, 0], [1, 0], [1, 1], [0, 1]];

type M2 = readonly [number, number, number, number];
const apply = (m: M2, [x, y]: readonly [number, number]): [number, number] => [m[0] * x + m[1] * y, m[2] * x + m[3] * y];

function matricesOf(results: Results) {
  const A: M2 = [num(results.a11), num(results.a12), num(results.a21), num(results.a22)];
  const B: M2 = [num(results.b11), num(results.b12), num(results.b21), num(results.b22)];
  const AB: M2 = [num(results.ab11), num(results.ab12), num(results.ab21), num(results.ab22)];
  const BA: M2 = [num(results.ba11), num(results.ba12), num(results.ba21), num(results.ba22)];
  const inv: M2 = [num(results.inv11), num(results.inv12), num(results.inv21), num(results.inv22)];
  return { A, B, AB, BA, inv };
}

/** The smallest of the allowed half-widths that holds every point drawn. */
export function matrixExtent(results: Results, fits: MatrixLayout["fits"]): number {
  const { A, B, AB, BA, inv } = matricesOf(results);
  const points: [number, number][] = [[1, 1], ...UNIT_SQUARE.map((p) => apply(A, p))];
  if (fits.point) points.push([num(results.px), num(results.py)], [num(results.imageX), num(results.imageY)]);
  if (fits.orthogonal) {
    const r = num(results.lengthIn);
    points.push([r, r]);
  }
  if (fits.product) for (const m of [B, AB, BA]) points.push(...UNIT_SQUARE.map((p) => apply(m, p)));
  if (fits.inverse && num(results.invertible) === 1) points.push(...UNIT_SQUARE.map((p) => apply(inv, p)));
  const needed = Math.max(...points.flat().map(Math.abs)) + 0.4;
  return EXTENTS.find((e) => e >= needed) ?? EXTENTS[EXTENTS.length - 1]!;
}

function matrixPlane(layout: MatrixLayout, results: Results): Plane {
  const e = matrixExtent(results, layout.fits);
  return createPlane(layout.square, [-e, e], [-e, e]);
}

/** The image of the square grid: lines x = n and y = n carried by A. */
function lattice(ctx: CanvasRenderingContext2D, plane: Plane, A: M2, extent: number, theme: LabTheme) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.reference;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  const N = Math.min(24, Math.ceil(extent) * 2);
  for (let n = -N; n <= N; n++) {
    for (const [p, q] of [
      [[n, -N], [n, N]],
      [[-N, n], [N, n]],
    ] as const) {
      const [x1, y1] = plane.toPx(...apply(A, p));
      const [x2, y2] = plane.toPx(...apply(A, q));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function shape(ctx: CanvasRenderingContext2D, plane: Plane, m: M2, points: readonly (readonly [number, number])[], style: Parameters<typeof polygon>[2]) {
  polygon(ctx, points.map((p) => plane.toPx(...apply(m, p))), style);
}

function drawPlaneView(ctx: CanvasRenderingContext2D, layout: MatrixLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const plane = matrixPlane(layout, results);
  const extent = plane.xDomain[1];
  drawPlane(ctx, plane, theme, { xLabel: "x", yLabel: "y", gridStep: extent <= 6 ? 1 : 2 });
  const { A, B, AB, BA, inv } = matricesOf(results);
  const det = num(results.det);
  const orientation = Math.round(num(results.orientation));
  const words = has("labels");
  const lines: string[] = [];
  const box = plane.rect;
  const fill = orientation < 0 ? theme.cosine : theme.sine;
  const I: M2 = [1, 0, 0, 1];

  if (!has("product")) lattice(ctx, plane, A, extent, theme);

  ctx.save();
  clipToPlane(ctx, plane);
  if (has("square") && !has("product")) {
    shape(ctx, plane, I, UNIT_SQUARE, { stroke: theme.muted, width: 1.2, dash: [4, 4] });
    shape(ctx, plane, A, UNIT_SQUARE, { fill, alpha: 0.28, stroke: fill, width: 2 });
  }
  if (has("inverse") && num(results.invertible) === 1) {
    // What A⁻¹ does to the unit square: the parallelogram that A sends back onto it.
    shape(ctx, plane, inv, UNIT_SQUARE, { fill: theme.tangent, alpha: 0.12, stroke: theme.tangent, width: 1.5, dash: [6, 4] });
  }
  if (has("shape") || has("product")) shape(ctx, plane, I, MATRIX_F_SHAPE, { stroke: theme.muted, width: 1.2, dash: [3, 3] });
  if (has("product")) {
    shape(ctx, plane, B, MATRIX_F_SHAPE, { fill: theme.neutral, alpha: 0.12, stroke: theme.neutral, width: 1, dash: [2, 3] });
    shape(ctx, plane, AB, MATRIX_F_SHAPE, { fill: theme.curve, alpha: 0.35, stroke: theme.curve, width: 2 });
    shape(ctx, plane, BA, MATRIX_F_SHAPE, { fill: theme.secant, alpha: 0.25, stroke: theme.secant, width: 2, dash: [5, 3] });
  } else if (has("shape")) {
    shape(ctx, plane, A, MATRIX_F_SHAPE, { fill: theme.angle, alpha: 0.45, stroke: theme.angle, width: 2 });
  }
  if (has("orthogonal")) {
    const [ox, oy] = plane.toPx(0, 0);
    const r = num(results.lengthIn) * plane.sx;
    if (r > 0.5) {
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(ox, oy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();

  const [ox, oy] = plane.toPx(0, 0);
  if (has("product")) {
    const centre: [number, number] = [0.45, 0.55];
    const [abx, aby] = plane.toPx(...apply(AB, centre));
    const [bax, bay] = plane.toPx(...apply(BA, centre));
    const commute = num(results.commute) === 1;
    tag(ctx, commute ? "AB = BA" : "AB", abx, aby, box, theme.curve, theme);
    if (!commute) tag(ctx, "BA", bax, bay, box, theme.secant, theme);
  }

  if (has("basis")) {
    const [ix, iy] = plane.toPx(1, 0);
    const [jx, jy] = plane.toPx(0, 1);
    arrow(ctx, ox, oy, ix, iy, { color: theme.muted, width: 1.5, head: 6 });
    arrow(ctx, ox, oy, jx, jy, { color: theme.muted, width: 1.5, head: 6 });
    const [ax, ay] = plane.toPx(A[0], A[2]);
    const [bx, by] = plane.toPx(A[1], A[3]);
    ctx.save();
    clipToPlane(ctx, plane);
    arrow(ctx, ox, oy, ax, ay, { color: theme.secant, width: 2.5, head: 9 });
    arrow(ctx, ox, oy, bx, by, { color: theme.tangent, width: 2.5, head: 9 });
    ctx.restore();
    disc(ctx, ax, ay, 4, theme.secant, box);
    disc(ctx, bx, by, 4, theme.tangent, box);
    const away = (x: number, y: number) => {
      const len = Math.hypot(x - ox, y - oy) || 1;
      return [x + ((x - ox) / len) * 16, y + ((y - oy) / len) * 16] as const;
    };
    tag(ctx, "Aî", ...away(ax, ay), box, theme.secant, theme);
    tag(ctx, "Aĵ", ...away(bx, by), box, theme.tangent, theme);
  }

  if (has("point") || has("orthogonal")) {
    const [px, py] = plane.toPx(num(results.px), num(results.py));
    const [qx, qy] = plane.toPx(num(results.imageX), num(results.imageY));
    ctx.save();
    clipToPlane(ctx, plane);
    arrow(ctx, px, py, qx, qy, { color: theme.curve, width: 1.5, head: 7, dash: [5, 4] });
    ctx.restore();
    disc(ctx, px, py, 4.5, theme.neutral, box);
    disc(ctx, qx, qy, 5, theme.curve, box);
    tag(ctx, "P", px - 12, py - 12, box, theme.neutral, theme);
    tag(ctx, "AP", qx + 14, qy - 12, box, theme.curve, theme);
  }
  disc(ctx, ox, oy, 2.5, theme.text);

  // The matrix itself, top left; the matrix the layer is about, top right.
  const glyphY = box.y + 6;
  drawGrid(ctx, box.x + 6, glyphY, glyphRows(A), { name: "A", colour: theme.text, theme, panel: true, cell: 32 });
  const right = (rows: string[][], options: { name: string; factor?: string; colour: string }) => {
    const width = (`${options.name} =`.length + (options.factor ? options.factor.length + 1 : 0)) * 6.5 + 6 + 2 * 32 + 10;
    drawGrid(ctx, box.x + box.width - width - 6, glyphY, rows, { ...options, theme, panel: true, cell: 32 });
  };

  // ── Words ──
  const a = A;
  const columns = `Aî = (${n2(a[0])}, ${n2(a[2])}) · Aĵ = (${n2(a[1])}, ${n2(a[3])})`;
  if (has("product")) {
    right(glyphRows(B), { name: "B", colour: theme.neutral });
    const commute = num(results.commute) === 1;
    if (words) {
      lines.push(`AB = ${matrixInlineText(AB)} · BA = ${matrixInlineText(BA)}`);
      lines.push(commute ? "AB = BA: this time the order does not matter" : "AB ≠ BA: the order matters");
    } else {
      lines.push("AB: B first, then A · BA: A first, then B");
    }
    return lines;
  }

  if (has("inverse")) {
    const invertible = num(results.invertible) === 1;
    if (words && invertible) {
      const factor = Math.abs(det - 1) < 1e-9 ? undefined : `(${matrixFractionText(1, det)})`;
      right(glyphRows([num(results.adj11), num(results.adj12), num(results.adj21), num(results.adj22)]), { name: "A⁻¹", factor, colour: theme.tangent });
    }
    if (words) {
      lines.push(`adj A = ${matrixInlineText([num(results.adj11), num(results.adj12), num(results.adj21), num(results.adj22)])} · A(adj A) = ${n2(det)}I`);
      lines.push(invertible ? `A⁻¹ = adj A / |A| = adj A / ${paren(det)}` : "|A| = 0: A squashes the plane, so no A⁻¹");
    } else {
      lines.push(invertible ? "Dashed: the shape A sends onto the unit square" : "A squashes the plane flat");
    }
    return lines;
  }

  if (has("special") || has("orthogonal")) {
    if (has("special")) right([[n2(a[0]), n2(a[2])], [n2(a[1]), n2(a[3])]], { name: "Aᵀ", colour: theme.cosine });
    if (words && has("special")) {
      const kind = Math.round(num(results.symmetry));
      const s = num(results.sym12);
      const w = num(results.skew12);
      lines.push(kind === 1 ? "Aᵀ = A: symmetric" : kind === 2 ? "Aᵀ = −A: skew-symmetric" : kind === 3 ? "A = O: both symmetric and skew-symmetric" : "Aᵀ ≠ A and Aᵀ ≠ −A: neither");
      lines.push(`A = ${matrixInlineText([a[0], s, s, a[3]])} + ${matrixInlineText([0, w, -w, 0])}`);
    }
    if (words && has("orthogonal")) {
      lines.push(`|P| = ${n2(num(results.lengthIn))} · |AP| = ${n2(num(results.lengthOut))}`);
      lines.push(num(results.isOrthogonal) === 1 ? `AᵀA = I: orthogonal, |A| = ${n2(det)}` : "AᵀA ≠ I: not orthogonal");
    }
    if (!words) lines.push(has("special") ? "Aᵀ: rows become columns" : "Dotted: the circle through P");
    return lines;
  }

  lines.push(words ? columns : "Aî is A's first column; Aĵ is its second");
  if (has("square") && words) {
    const how = orientation > 0 ? "" : orientation < 0 ? ", flipped" : ": squashed flat";
    lines.push(`|A| = ${paren(a[0])}·${paren(a[3])} − ${paren(a[1])}·${paren(a[2])} = ${n2(det)}`);
    lines.push(`areas × ${n2(Math.abs(det))}${how}`);
  }
  if (has("point") && words) lines.push(`P = (${n2(num(results.px))}, ${n2(num(results.py))}) → AP = (${n2(num(results.imageX))}, ${n2(num(results.imageY))})`);
  return lines;
}

// ── The system ───────────────────────────────────────────────────────────────

/** The part of ax + by = e inside the plane, or null when a = b = 0. */
function lineEnds(plane: Plane, a: number, b: number, e: number): [[number, number], [number, number]] | null {
  const [x0, x1] = plane.xDomain;
  const [y0, y1] = plane.yDomain;
  if (Math.abs(a) < 1e-9 && Math.abs(b) < 1e-9) return null;
  if (Math.abs(b) >= Math.abs(a)) return [plane.toPx(x0, (e - a * x0) / b), plane.toPx(x1, (e - a * x1) / b)];
  return [plane.toPx((e - b * y0) / a, y0), plane.toPx((e - b * y1) / a, y1)];
}

function drawSystem(ctx: CanvasRenderingContext2D, layout: MatrixLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const kind = Math.round(num(results.system));
  const x = num(results.solX);
  const y = num(results.solY);
  const needed = kind === 0 ? Math.max(Math.abs(x), Math.abs(y)) + 1 : 0;
  const e = SYSTEM_EXTENTS.find((v) => v >= needed) ?? SYSTEM_EXTENTS[SYSTEM_EXTENTS.length - 1]!;
  const plane = createPlane(layout.square, [-e, e], [-e, e]);
  drawPlane(ctx, plane, theme, { xLabel: "x", yLabel: "y", gridStep: e <= 5 ? 1 : 2 });
  const [a, b, c, d] = [num(results.a11), num(results.a12), num(results.a21), num(results.a22)];
  const [rhs1, rhs2] = [num(results.e), num(results.f)];

  ctx.save();
  clipToPlane(ctx, plane);
  const first = lineEnds(plane, a, b, rhs1);
  const second = lineEnds(plane, c, d, rhs2);
  if (first) line(ctx, first[0][0], first[0][1], first[1][0], first[1][1], theme.sine, kind === 2 ? 5 : 2.5);
  if (second) line(ctx, second[0][0], second[0][1], second[1][0], second[1][1], theme.cosine, 2.5, kind === 2 ? [8, 6] : undefined);
  ctx.restore();

  const box = plane.rect;
  if (kind === 0) {
    const [sx, sy] = plane.toPx(x, y);
    disc(ctx, sx, sy, 6, theme.angle);
    if (has("labels")) tag(ctx, `(${n2(x)}, ${n2(y)})`, sx, sy - 18, box, theme.angle, theme);
  }
  // Name each line near its left end.
  const name = (ends: [[number, number], [number, number]] | null, text: string, colour: string, dy: number) => {
    if (!ends) return;
    const [p, q] = ends;
    const [lx, ly] = p[0] <= q[0] ? p : q;
    tag(ctx, text, lx + 22, ly + dy, box, colour, theme);
  };
  name(first, "1", theme.sine, -12);
  name(second, "2", theme.cosine, 12);

  if (!has("labels")) {
    return ["Line 1: first equation · Line 2: second equation"];
  }
  const D = num(results.det);
  const d1 = num(results.d1);
  const d2 = num(results.d2);
  const lines: string[] = [];
  const empty = [!first ? "Line 1 is 0 = " + n2(rhs1) : "", !second ? "Line 2 is 0 = " + n2(rhs2) : ""].filter(Boolean).join(" · ");
  if (empty) lines.push(empty);
  lines.push(`D = |A| = ${n2(D)} · D₁ = ${n2(d1)} · D₂ = ${n2(d2)}`);
  if (kind === 0) {
    lines.push(has("cramer") ? `x = D₁/D = ${matrixFractionText(d1, D)} · y = D₂/D = ${matrixFractionText(d2, D)}` : `one solution: X = A⁻¹B = (${n2(x)}, ${n2(y)})`);
  } else if (kind === 1) {
    lines.push(`D = 0, (adj A)B = (${n2(d1)}, ${n2(d2)}): no solution`);
  } else {
    lines.push("D = 0, (adj A)B = O: infinitely many solutions");
  }
  return lines;
}

// ── The 3 × 3 determinant ────────────────────────────────────────────────────

function drawDet3(ctx: CanvasRenderingContext2D, layout: MatrixLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const { width } = layout;
  const G = [
    [num(results.g11), num(results.g12), num(results.g13)],
    [num(results.g21), num(results.g22), num(results.g23)],
    [num(results.g31), num(results.g32), num(results.g33)],
  ];
  const byRow = Math.round(num(results.expandBy)) === 0;
  const L = Math.max(1, Math.min(3, Math.round(num(results.line, 1))));
  const cell = layout.compact ? 40 : 52;
  const gridWidth = 6.5 * 3 + 6 + cell * 3 + 10;
  const top = 36;
  drawGrid(ctx, (width - gridWidth) / 2, top, G.map((row) => row.map((v) => n2(v))), {
    name: "Δ",
    colour: theme.text,
    theme,
    bars: true,
    cell,
    highlight: byRow ? { row: L - 1, colour: theme.secant } : { column: L - 1, colour: theme.secant },
  });

  // The three minors along the line.
  const words = has("labels");
  const slot = width / 3;
  const minorTop = top + 3 * 18 + 6 + 30;
  const entries = [num(results.le1), num(results.le2), num(results.le3)];
  const minors = [num(results.lm1), num(results.lm2), num(results.lm3)];
  const cofactors = [num(results.lc1), num(results.lc2), num(results.lc3)];
  const terms: string[] = [];
  for (let n = 1; n <= 3; n++) {
    const [i, j] = byRow ? [L, n] : [n, L];
    const rest = G.filter((_, r) => r !== i - 1).map((row) => row.filter((_, cIdx) => cIdx !== j - 1).map((v) => n2(v)));
    const centre = slot * (n - 0.5);
    const sign = (i + j) % 2 === 0 ? "+" : "−";
    label(ctx, `${sign} a${sub(i)}${sub(j)} = ${n2(entries[n - 1]!)}`, centre, minorTop, { color: theme.secant, font: theme.fontStrong, align: "center" });
    const minorCell = layout.compact ? 26 : 32;
    const minorWidth = ("M" + sub(i) + sub(j) + " =").length * 6.5 + 6 + 2 * minorCell + 10;
    drawGrid(ctx, centre - minorWidth / 2, minorTop + 14, rest, { name: `M${sub(i)}${sub(j)}`, colour: theme.curve, theme, bars: true, cell: minorCell });
    if (words) {
      label(ctx, `M${sub(i)}${sub(j)} = ${n2(minors[n - 1]!)}`, centre, minorTop + 72, { color: theme.curve, font: theme.font, align: "center" });
      label(ctx, `C${sub(i)}${sub(j)} = ${n2(cofactors[n - 1]!)}`, centre, minorTop + 90, { color: theme.tangent, font: theme.font, align: "center" });
    }
    terms.push(`${paren(entries[n - 1]!)}·${paren(cofactors[n - 1]!)}`);
  }
  label(ctx, "Cᵢⱼ = (−1)ⁱ⁺ʲ Mᵢⱼ: signs in a chessboard", width / 2, minorTop + 116, { color: theme.muted, font: theme.font, align: "center" });

  const symbolic = [1, 2, 3].map((n) => {
    const [i, j] = byRow ? [L, n] : [n, L];
    return `a${sub(i)}${sub(j)}C${sub(i)}${sub(j)}`;
  });
  const lines = [`Δ = ${symbolic.join(" + ")}`];
  if (words) lines.push(`Δ = ${terms.join(" + ")} = ${n2(num(results.det3))}`);
  return lines;
}

// ── The renderer ─────────────────────────────────────────────────────────────

export const matrixRenderer: SimulationRenderer<MatrixLayout> = {
  id: "matrix",
  layout: (width, graphs, layers) => computeMatrixLayout(width, graphs, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (words: string) => label(ctx, words, width / 2, 13, { color: theme.text, font: theme.fontStrong, align: "center" });

    let lines: string[];
    if (layout.view === "det3") {
      title(`Expanding along ${Math.round(num(results.expandBy)) === 0 ? "row" : "column"} ${Math.round(num(results.line, 1))}`);
      lines = drawDet3(ctx, layout, results, has, theme);
    } else if (layout.view === "system") {
      const [a, b, c, d] = [num(results.a11), num(results.a12), num(results.a21), num(results.a22)];
      title(`${matrixEquationText(a, b, num(results.e))} and ${matrixEquationText(c, d, num(results.f))}`);
      lines = drawSystem(ctx, layout, results, has, theme);
    } else {
      title(
        has("product")
          ? "AB: do B first, then A"
          : has("inverse")
            ? "A⁻¹ undoes A"
            : has("special")
              ? "Transpose, symmetric and skew parts"
              : has("orthogonal")
                ? "Does A keep lengths?"
                : has("square")
                  ? "|A| is the area scale"
                  : "Where î and ĵ land",
      );
      lines = drawPlaneView(ctx, layout, results, has, theme);
    }
    // At most three lines of words under the picture: the last three say the most.
    const shown = lines.slice(-3);
    const start = 3 - shown.length;
    shown.forEach((words, i) => label(ctx, words, width / 2, layout.lines[start + i]!, { color: theme.text, font: theme.font, align: "center" }));
  },

  /** Drag the heads of Aî and Aĵ: that sets A's two columns. Only when A is built from its entries. */
  pick(layout, x, y, locked, results): PickResult | null {
    if (layout.view !== "plane" || Math.round(num(results.source)) !== 0) return null;
    const plane = matrixPlane(layout, results);
    const [hx1, hy1] = plane.toPx(num(results.a11), num(results.a21));
    const [hx2, hy2] = plane.toPx(num(results.a12), num(results.a22));
    const d1 = Math.hypot(x - hx1, y - hy1);
    const d2 = Math.hypot(x - hx2, y - hy2);
    const region = locked ?? (Math.min(d1, d2) <= 24 ? (d1 <= d2 ? "i" : "j") : undefined);
    if (region !== "i" && region !== "j") return null;
    const [u, v] = plane.fromPx(x, y);
    const snap = (t: number) => Math.max(-MATRIX_ENTRY, Math.min(MATRIX_ENTRY, Math.round(t * 2) / 2));
    return region === "i"
      ? { writes: [{ variable: "a", value: snap(u) }, { variable: "c", value: snap(v) }], region }
      : { writes: [{ variable: "b", value: snap(u) }, { variable: "d", value: snap(v) }], region };
  },
};
