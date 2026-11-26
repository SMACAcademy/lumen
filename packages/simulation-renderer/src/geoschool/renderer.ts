/**
 * School geometry, one picture at a time: an arm turning on a protractor,
 * two crossing lines, parallel lines and a transversal, a triangle (with its
 * exterior angle, or its angles copied up to the top), a triangle built
 * from given parts, a quadrilateral with its diagonals, and a chord's angles
 * in a circle.
 *
 * Which picture is drawn follows the layers of the current mode. Shapes are
 * scaled to fit the figure box, so nothing leaves a phone-width canvas.
 * Angle sizes, side lengths and the captions that state them are drawn only
 * with the words layer on — a level's estimate hides them.
 */

import { GEOSCHOOL_BASE, GEOSCHOOL_KIND_NAMES } from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

export type GeoSchoolView = "turn" | "pairs" | "parallel" | "triangle" | "build" | "quad" | "circle";
const VIEWS: readonly GeoSchoolView[] = ["turn", "pairs", "parallel", "triangle", "build", "quad", "circle"];

type Box = { x: number; y: number; width: number; height: number };
type Pt = readonly [number, number];

export interface GeoSchoolLayout {
  width: number;
  height: number;
  compact: boolean;
  view: GeoSchoolView;
  /** Where the figure goes, between the title line and the captions. */
  figure: Box;
  /** Baseline of the title line. */
  title: number;
  /** Baselines of the two caption lines. */
  lines: readonly [number, number];
  /** Layers that change what the triangle must fit, so a drag maps back to the same scale. */
  fits: { exterior: boolean; tear: boolean };
}

export function geoSchoolView(layers: ReadonlySet<string>): GeoSchoolView {
  return VIEWS.find((v) => layers.has(v)) ?? "turn";
}

export function computeGeoSchoolLayout(width: number, layers: ReadonlySet<string> = new Set()): GeoSchoolLayout {
  const compact = width < 560;
  const height = compact ? 360 : 420;
  const pad = compact ? 16 : 28;
  const lines = [height - 32, height - 13] as const;
  const top = pad + 14;
  return {
    width,
    height,
    compact,
    view: geoSchoolView(layers),
    figure: { x: pad, y: top, width: width - 2 * pad, height: lines[0] - 14 - top },
    title: 14,
    lines,
    fits: { exterior: layers.has("exterior"), tear: layers.has("tear") },
  };
}

// ── Small helpers ────────────────────────────────────────────────────────────

const RAD = Math.PI / 180;
const isWhole = (x: number) => Math.abs(x - Math.round(x)) < 0.05;
export const geoDeg = (x: number) => `${isWhole(x) ? Math.round(x) : x.toFixed(1)}°`;
const fmtLen = (x: number) => (Math.abs(x - Math.round(x)) < 1e-6 ? String(Math.round(x)) : x.toFixed(1));

/** A centred piece of text, kept wholly on the canvas. */
function tag(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, text: string, x: number, y: number, color: string, font: string) {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width;
  ctx.restore();
  const cx = clamp(x, w / 2 + 2, layout.width - w / 2 - 2);
  label(ctx, text, cx, clamp(y, 8, layout.height - 6), { color, font, align: "center" });
}

function line(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, color: string, width = 2, dash: number[] = []) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, p: Pt, color: string, r = 4) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

/** A filled wedge at a screen point from math angle `from` anticlockwise to `to`, degrees. */
function wedge(ctx: CanvasRenderingContext2D, c: Pt, r: number, from: number, to: number, color: string, alpha = 0.22) {
  if (to - from < 0.01) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(c[0], c[1]);
  ctx.arc(c[0], c[1], r, -to * RAD, -from * RAD);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c[0], c[1], r, -to * RAD, -from * RAD);
  ctx.stroke();
  ctx.restore();
}

/** Where to write an angle's size: along its bisector, just outside the arc. */
const bisector = (c: Pt, r: number, from: number, to: number): Pt => {
  const mid = ((from + to) / 2) * RAD;
  return [c[0] + r * Math.cos(mid), c[1] - r * Math.sin(mid)];
};

/** Screen direction from a to b as a math angle, degrees. */
const heading = (a: Pt, b: Pt) => Math.atan2(-(b[1] - a[1]), b[0] - a[0]) / RAD;

/** The interior angle at v between the rays to p and q, as [from, to] in math degrees. */
function corner(v: Pt, p: Pt, q: Pt): [number, number] {
  const a = heading(v, p);
  let d = (((heading(v, q) - a) % 360) + 360) % 360;
  if (d > 180) return [heading(v, q), heading(v, q) + (360 - d)];
  return [a, a + d];
}

/** Mark the interior angle at v and, with words, write its size. */
function cornerMark(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, v: Pt, p: Pt, q: Pt, r: number, color: string, text: string | null, theme: LabTheme) {
  const [from, to] = corner(v, p, q);
  wedge(ctx, v, r, from, to, color);
  if (text) {
    const [x, y] = bisector(v, r + 15, from, to);
    tag(ctx, layout, text, x, y, color, theme.fontStrong);
  }
}

/** A right-angle box at v, along the rays to p and q. */
function rightBox(ctx: CanvasRenderingContext2D, v: Pt, p: Pt, q: Pt, s: number, color: string) {
  const u = (w: Pt): Pt => {
    const l = Math.hypot(w[0] - v[0], w[1] - v[1]) || 1;
    return [((w[0] - v[0]) / l) * s, ((w[1] - v[1]) / l) * s];
  };
  const a = u(p);
  const b = u(q);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(v[0] + a[0], v[1] + a[1]);
  ctx.lineTo(v[0] + a[0] + b[0], v[1] + a[1] + b[1]);
  ctx.lineTo(v[0] + b[0], v[1] + b[1]);
  ctx.stroke();
  ctx.restore();
}

function polygon(ctx: CanvasRenderingContext2D, pts: readonly Pt[], fill: string | null, stroke: string, width = 2, dash: number[] = []) {
  ctx.save();
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.setLineDash(dash);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

/** A vertex letter, pushed out from a centre point. */
function letter(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, text: string, p: Pt, from: Pt, theme: LabTheme) {
  const dx = p[0] - from[0];
  const dy = p[1] - from[1];
  const l = Math.hypot(dx, dy) || 1;
  tag(ctx, layout, text, p[0] + (dx / l) * 14, p[1] + (dy / l) * 14, theme.text, theme.fontStrong);
}

/** A scale and origin that fit model points (y up) into a box, centred, leaving `inset` px for letters. */
export function geoSchoolFit(box: Box, pts: readonly Pt[], inset = 18, maxScale = 40) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const w = box.width - 2 * inset;
  const h = box.height - 2 * inset;
  const scale = Math.min(w / Math.max(x1 - x0, 1e-6), h / Math.max(y1 - y0, 1e-6), maxScale);
  const left = box.x + inset + (w - (x1 - x0) * scale) / 2;
  const top = box.y + inset + (h - (y1 - y0) * scale) / 2;
  const at = (x: number, y: number): Pt => [left + (x - x0) * scale, top + (y1 - y) * scale];
  const from = (px: number, py: number): Pt => [(px - left) / scale + x0, y1 - (py - top) / scale];
  return { scale, at, from };
}

// ── Turn ─────────────────────────────────────────────────────────────────────

function turnGeometry(layout: GeoSchoolLayout) {
  const f = layout.figure;
  const R = Math.min(f.width, f.height) * 0.38;
  return { O: [f.x + f.width / 2, f.y + f.height / 2 + 6] as Pt, R };
}

function drawTurn(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, r: Results, words: boolean, theme: LabTheme): string[] {
  const { O, R } = turnGeometry(layout);
  const turn = num(r.turn);
  // The protractor: a ring with a tick every 10°.
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(O[0], O[1], R, 0, 2 * Math.PI);
  ctx.stroke();
  for (let d = 0; d < 360; d += 10) {
    const long = d % 30 === 0;
    const c = Math.cos(d * RAD);
    const s = Math.sin(d * RAD);
    ctx.beginPath();
    ctx.moveTo(O[0] + c * R, O[1] - s * R);
    ctx.lineTo(O[0] + c * (R - (long ? 9 : 5)), O[1] - s * (R - (long ? 9 : 5)));
    ctx.stroke();
  }
  ctx.restore();
  for (const d of [0, 90, 180, 270]) tag(ctx, layout, `${d}°`, O[0] + Math.cos(d * RAD) * (R + 13), O[1] - Math.sin(d * RAD) * (R + 13), theme.muted, theme.font);

  const inner = R * 0.34;
  if (turn >= 360) wedge(ctx, O, inner, 0, 359.99, theme.angle);
  else wedge(ctx, O, inner, 0, turn, theme.angle);
  const end: Pt = [O[0] + Math.cos(turn * RAD) * R * 0.92, O[1] - Math.sin(turn * RAD) * R * 0.92];
  line(ctx, O, [O[0] + R * 0.92, O[1]], theme.text, 3);
  line(ctx, O, end, theme.sine, 3);
  dot(ctx, end, theme.sine, 5);
  dot(ctx, O, theme.text, 3);
  if (!words) return [];
  const [x, y] = bisector(O, inner + 16, 0, Math.min(turn, 359.99));
  tag(ctx, layout, geoDeg(turn), x, y, theme.angle, theme.fontStrong);
  const kind = GEOSCHOOL_KIND_NAMES[num(r.turnKind)] ?? "";
  return [`${geoDeg(turn)}: ${kind}`, `The rest of the full turn: ${geoDeg(num(r.turnRest))}`];
}

// ── Pairs ────────────────────────────────────────────────────────────────────

function drawPairs(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, r: Results, words: boolean, theme: LabTheme): string[] {
  const f = layout.figure;
  const O: Pt = [f.x + f.width / 2, f.y + f.height / 2];
  const L = Math.min(f.width, f.height) * 0.46;
  const cross = num(r.cross, 50);
  const ray = (d: number): Pt => [O[0] + Math.cos(d * RAD) * L, O[1] - Math.sin(d * RAD) * L];
  const rr = 30;
  const marks: [number, number, string][] = [
    [0, cross, theme.sine],
    [cross, 180, theme.cosine],
    [180, 180 + cross, theme.sine],
    [180 + cross, 360, theme.cosine],
  ];
  for (const [a, b, c] of marks) wedge(ctx, O, rr, a, b, c, 0.18);
  line(ctx, ray(180), ray(0), theme.text, 2.5);
  line(ctx, ray(180 + cross), ray(cross), theme.text, 2.5);
  dot(ctx, ray(cross), theme.sine, 5);
  dot(ctx, O, theme.text, 3);
  if (!words) return [];
  for (const [a, b, c] of marks) {
    const [x, y] = bisector(O, rr + 17, a, b);
    tag(ctx, layout, geoDeg(b - a), x, y, c, theme.fontStrong);
  }
  return [`${geoDeg(cross)} + ${geoDeg(num(r.supplement))} = 180°: a linear pair`, `Vertically opposite angles are equal: ${geoDeg(cross)} = ${geoDeg(num(r.opposite))}`];
}

// ── Parallel ─────────────────────────────────────────────────────────────────

export function geoSchoolParallelPoints(layout: GeoSchoolLayout, cut: number) {
  const f = layout.figure;
  const y1 = f.y + f.height * 0.3;
  const y2 = f.y + f.height * 0.72;
  const run = ((y2 - y1) * Math.cos(cut * RAD)) / Math.sin(cut * RAD);
  const cx = f.x + f.width / 2;
  return { P: [cx + run / 2, y1] as Pt, Q: [cx - run / 2, y2] as Pt };
}

function drawParallel(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, r: Results, words: boolean, theme: LabTheme): string[] {
  const f = layout.figure;
  const cut = num(r.cut, 60);
  const tilt = num(r.tilt);
  const { P, Q } = geoSchoolParallelPoints(layout, cut);
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.x, f.y, f.width, f.height);
  ctx.clip();
  line(ctx, [f.x, P[1]], [f.x + f.width, P[1]], theme.text, 2.5);
  const t = Math.tan(tilt * RAD);
  line(ctx, [f.x, Q[1] + t * (Q[0] - f.x)], [f.x + f.width, Q[1] - t * (f.x + f.width - Q[0])], theme.text, 2.5);
  const ext = 60;
  const dir: Pt = [Math.cos(cut * RAD), -Math.sin(cut * RAD)];
  line(ctx, [P[0] + dir[0] * ext, P[1] + dir[1] * ext], [Q[0] - dir[0] * ext, Q[1] - dir[1] * ext], theme.muted, 2);
  ctx.restore();
  const rr = 24;
  // ∠1 and ∠5 corresponding (one colour), ∠4 and ∠6 alternate (the other).
  const at: [Pt, number, number, string, number][] = [
    [P, 0, cut, theme.sine, num(r.corrTop)],
    [P, cut + 180, 360, theme.cosine, num(r.altTop)],
    [Q, tilt, cut, theme.sine, num(r.corrBottom)],
    [Q, cut, tilt + 180, theme.cosine, num(r.altBottom)],
  ];
  for (const [c, a, b, col] of at) wedge(ctx, c, rr, a, b, col, 0.2);
  dot(ctx, P, theme.text, 3);
  dot(ctx, Q, theme.text, 3);
  tag(ctx, layout, "P", P[0] - 10, P[1] - 12, theme.text, theme.fontStrong);
  tag(ctx, layout, "Q", Q[0] + 10, Q[1] + 13, theme.text, theme.fontStrong);
  if (!words) return [];
  for (const [c, a, b, col, v] of at) {
    const [x, y] = bisector(c, rr + 15, a, b);
    tag(ctx, layout, geoDeg(v), x, y, col, theme.fontStrong);
  }
  const co = `${geoDeg(num(r.altTop))} + ${geoDeg(num(r.corrBottom))} = ${geoDeg(num(r.coInteriorSum))}`;
  return num(r.isParallel)
    ? [`Parallel: corresponding angles equal, ${geoDeg(cut)} = ${geoDeg(num(r.corrBottom))}`, `Co-interior angles: ${co}`]
    : [`Not parallel: ${geoDeg(cut)} and ${geoDeg(num(r.corrBottom))} no longer match`, `Co-interior: ${co}, not 180°`];
}

// ── Triangle ─────────────────────────────────────────────────────────────────

/** The angle-sum triangle's frame: A, B and C on screen, and how to map back. */
export function geoSchoolTriangleFrame(layout: GeoSchoolLayout, r: Results) {
  const apex: Pt = [num(r.apexX, 3), num(r.apexY, 3)];
  const pts: Pt[] = [[0, 0], [GEOSCHOOL_BASE, 0], apex];
  if (layout.fits.exterior) pts.push([GEOSCHOOL_BASE + 3, 0]);
  if (layout.fits.tear) pts.push([apex[0] - 2.5, apex[1]], [apex[0] + 2.5, apex[1]]);
  const fit = geoSchoolFit(layout.figure, pts, 20, 36);
  return { ...fit, A: fit.at(0, 0), B: fit.at(GEOSCHOOL_BASE, 0), C: fit.at(apex[0], apex[1]) };
}

function drawTriangle(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, r: Results, words: boolean, theme: LabTheme): string[] {
  const { A, B, C, scale } = geoSchoolTriangleFrame(layout, r);
  const a = num(r.triA);
  const b = num(r.triB);
  const c = num(r.triC);
  const rr = clamp(Math.min(Math.hypot(C[0] - A[0], C[1] - A[1]), Math.hypot(C[0] - B[0], C[1] - B[1]), GEOSCHOOL_BASE * scale) * 0.22, 12, 28);
  const { exterior, tear } = layout.fits;
  if (exterior) {
    const far: Pt = [B[0] + 3 * scale, B[1]];
    line(ctx, B, far, theme.muted, 2, [5, 4]);
    wedge(ctx, B, rr + 8, 0, 180 - b, theme.angle, 0.16);
  }
  if (tear) {
    line(ctx, [C[0] - 2.5 * scale, C[1]], [C[0] + 2.5 * scale, C[1]], theme.muted, 2, [5, 4]);
    // Alternate angles: A's copy sits left of C, B's copy right of it.
    wedge(ctx, C, rr, 180, 180 + a, theme.sine, 0.3);
    wedge(ctx, C, rr, 360 - b, 360, theme.cosine, 0.3);
  }
  polygon(ctx, [A, B, C], null, theme.text, 2);
  cornerMark(ctx, layout, A, B, C, rr, theme.sine, words ? geoDeg(a) : null, theme);
  cornerMark(ctx, layout, B, C, A, rr, theme.cosine, words ? geoDeg(b) : null, theme);
  cornerMark(ctx, layout, C, A, B, rr, theme.tangent, words && !tear ? geoDeg(c) : null, theme);
  const mid: Pt = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3];
  letter(ctx, layout, "A", A, mid, theme);
  letter(ctx, layout, "B", B, exterior ? [B[0], B[1] - 1] : mid, theme);
  letter(ctx, layout, "C", C, mid, theme);
  dot(ctx, C, theme.tangent, 5);
  if (!words) return [];
  if (exterior) {
    const [x, y] = bisector(B, rr + 24, 0, 180 - b);
    tag(ctx, layout, geoDeg(num(r.exterior)), x, y, theme.angle, theme.fontStrong);
  }
  if (tear) tag(ctx, layout, geoDeg(c), C[0], C[1] + rr + 12, theme.tangent, theme.fontStrong);
  const sum = `${geoDeg(a)} + ${geoDeg(b)} + ${geoDeg(c)} = ${geoDeg(num(r.triSum))}`;
  const kind = ["", "An acute-angled triangle", "A right-angled triangle", "An obtuse-angled triangle"][num(r.triKind)] ?? "";
  if (exterior) return [sum, `Exterior angle ${geoDeg(num(r.exterior))} = ${geoDeg(a)} + ${geoDeg(c)}`];
  if (tear) return [sum, "Copied to the top, they fill a straight line"];
  return [sum, kind];
}

// ── Build ────────────────────────────────────────────────────────────────────

const RULE_TITLES = [
  "SSS: three sides",
  "SAS: two sides and the angle between",
  "ASA: two angles and the side between",
  "RHS: right angle, hypotenuse, one side",
  "SSA: two sides, an angle not between",
  "AAA: three angles, no sides",
];

const COUNT_LINES = ["No triangle fits", "Exactly one triangle fits", "Two different triangles fit", "Endless triangles fit, of any size"];

function drawBuild(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, r: Results, words: boolean, theme: LabTheme): string[] {
  const rule = num(r.rule);
  const count = num(r.triangles);
  const p = num(r.sideP, 3);
  const q = num(r.sideQ, 4);
  const A = num(r.buildA, 50);
  const B = num(r.buildB, 60);
  const yx = num(r.buildYX);
  const z: Pt = [num(r.buildZX), num(r.buildZY)];
  const y2x = num(r.buildY2X);
  tag(ctx, layout, RULE_TITLES[rule] ?? "", layout.width / 2, layout.title, theme.text, theme.fontStrong);

  const pts: Pt[] = [[0, 0], [Math.max(yx, 1), 0]];
  if (count > 0 || rule === 4) pts.push(z);
  if (y2x > 0) pts.push([y2x, 0]);
  if (rule === 4) pts.push([z[0] - q, z[1]], [z[0] + q, z[1]], [z[0], z[1] - q], [z[0], z[1] + q]);
  if (rule === 3 && count === 0) pts.push([p, q * 1.2]);
  if (rule === 0 && count === 0) pts.push([0, 1.2]);
  const { at, scale } = geoSchoolFit(layout.figure, pts, 20, 36);
  const X = at(0, 0);
  const Y = at(yx, 0);
  const Z = at(z[0], z[1]);
  const given = theme.sine;
  const other = theme.cosine;
  const rr = 22;
  const out: string[] = [];

  if (rule === 0 && count === 0) {
    // Lay the two short sticks along the long one: they cannot reach each other.
    const s = [num(r.sideP), num(r.sideQ), num(r.sideR)].sort((u, v) => u - v);
    const lift = 12;
    line(ctx, X, Y, given, 4);
    line(ctx, [X[0], X[1] - lift], [X[0] + s[1]! * scale, X[1] - lift], given, 4);
    line(ctx, [Y[0], Y[1] - lift], [Y[0] - s[0]! * scale, Y[1] - lift], given, 4);
    if (s[2]! - s[0]! - s[1]! > 1e-9) line(ctx, [X[0] + s[1]! * scale, X[1] - lift], [Y[0] - s[0]! * scale, Y[1] - lift], theme.secant, 2, [3, 3]);
    if (words) {
      tag(ctx, layout, fmtLen(s[2]!), (X[0] + Y[0]) / 2, X[1] + 14, given, theme.font);
      tag(ctx, layout, fmtLen(s[1]!), X[0] + (s[1]! * scale) / 2, X[1] - lift - 12, given, theme.font);
      tag(ctx, layout, fmtLen(s[0]!), Y[0] - (s[0]! * scale) / 2, Y[1] - lift - 12, given, theme.font);
    }
  } else if (count === 0) {
    line(ctx, X, Y, given, 4);
    if (rule === 3) {
      line(ctx, Y, at(p, q * 1.2), theme.muted, 1.5, [5, 4]);
      rightBox(ctx, Y, X, at(p, 1), 10, theme.text);
      line(ctx, X, at(q, 0), other, 4);
      out.push(`The hypotenuse ${fmtLen(q)} must be longer than ${fmtLen(p)}`);
    } else {
      // SSA with the swinging side too short to reach the ground.
      line(ctx, X, at(Math.max(z[0] + q, 1), 0), theme.muted, 1.5);
      line(ctx, X, Z, given, 4);
      ctx.save();
      ctx.strokeStyle = other;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(Z[0], Z[1], q * scale, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
      out.push(`A side of ${fmtLen(q)} cannot reach down to the ground`);
    }
  } else {
    if (rule === 4) {
      line(ctx, X, at(z[0] + q, 0), theme.muted, 1.5);
      ctx.save();
      ctx.strokeStyle = other;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(Z[0], Z[1], q * scale, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
    if (y2x > 0) polygon(ctx, [X, at(y2x, 0), Z], null, theme.curve, 2, [6, 4]);
    if (rule === 5) polygon(ctx, [X, at(yx * 0.55, 0), at(z[0] * 0.55, z[1] * 0.55)], null, theme.curve, 2, [6, 4]);
    polygon(ctx, [X, Y, Z], theme.surface, theme.text, 2);
    // Thicken and colour the parts the rule gives.
    const sides: [Pt, Pt, string, number][] =
      rule === 0
        ? [[X, Y, given, yx], [X, Z, given, num(r.builtXZ)], [Y, Z, given, num(r.builtYZ)]]
        : rule === 1
          ? [[X, Y, given, p], [X, Z, given, q]]
          : rule === 2
            ? [[X, Y, given, p]]
            : rule === 3
              ? [[X, Y, given, p], [X, Z, other, q]]
              : rule === 4
                ? [[X, Z, given, p], [Y, Z, other, q]]
                : [];
    for (const [u, v, col] of sides) line(ctx, u, v, col, 4);
    const angleAt: [Pt, Pt, Pt, string, number][] =
      rule === 1 || rule === 4
        ? [[X, Y, Z, theme.angle, A]]
        : rule === 2 || rule === 5
          ? [[X, Y, Z, theme.angle, A], [Y, Z, X, theme.angle, B]]
          : [];
    if (rule === 5) angleAt.push([Z, X, Y, theme.angle, 180 - A - B]);
    for (const [v, a, b, col, deg] of angleAt) cornerMark(ctx, layout, v, a, b, rr, col, words ? geoDeg(deg) : null, theme);
    if (rule === 3) rightBox(ctx, Y, X, Z, 10, theme.text);
    if (words) {
      // Every side's length: the given ones in their colour, the rest muted.
      const all: [Pt, Pt, number][] = [[X, Y, num(r.builtXY)], [Y, Z, num(r.builtYZ)], [X, Z, num(r.builtXZ)]];
      for (const [u, v, l] of all) {
        const col = sides.find((s) => (s[0] === u && s[1] === v) || (s[0] === v && s[1] === u))?.[2] ?? theme.muted;
        const mid: Pt = [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
        const c: Pt = [(X[0] + Y[0] + Z[0]) / 3, (X[1] + Y[1] + Z[1]) / 3];
        const dx = mid[0] - c[0];
        const dy = mid[1] - c[1];
        const d = Math.hypot(dx, dy) || 1;
        tag(ctx, layout, fmtLen(l), mid[0] + (dx / d) * 13, mid[1] + (dy / d) * 13, col, theme.font);
      }
    }
    letter(ctx, layout, "X", X, Z, theme);
    letter(ctx, layout, "Y", Y, Z, theme);
    letter(ctx, layout, "Z", Z, [(X[0] + Y[0]) / 2, X[1]], theme);
    if (y2x > 0) tag(ctx, layout, "Y′", at(y2x, 0)[0], X[1] + 14, theme.curve, theme.fontStrong);
  }

  if (!words) return [];
  const first = COUNT_LINES[count] ?? "";
  if (rule === 0) {
    const longest = num(r.longest);
    const two = num(r.otherTwo);
    const s = [num(r.sideP), num(r.sideQ), num(r.sideR)].sort((u, v) => u - v);
    const sum = `${fmtLen(s[0]!)} + ${fmtLen(s[1]!)} = ${fmtLen(two)}`;
    return [
      first,
      num(r.closes) ? `${sum}, more than ${fmtLen(longest)}: the sticks close` : num(r.flat) ? `${sum}, just ${fmtLen(longest)}: they lie flat` : `${sum}, less than ${fmtLen(longest)}: they can't meet`,
    ];
  }
  if (out.length) return [first, out[0]!];
  if (rule === 4) return [first, count === 2 ? "The side swings to two places: SSA fails" : "Only one place for the swinging side here"];
  if (rule === 5) return [first, "Same angles, different sizes: not congruent"];
  return [first, "One shape, one size: the triangle is fixed"];
}

// ── Quad ─────────────────────────────────────────────────────────────────────

export function geoSchoolQuadPoints(layout: GeoSchoolLayout, r: Results) {
  const a = num(r.quadBase, 6);
  const b = num(r.quadSide, 4);
  const alpha = num(r.quadAngle, 60) * RAD;
  const s = num(r.quadShift);
  const d: Pt = [b * Math.cos(alpha), b * Math.sin(alpha)];
  const model: Pt[] = [[0, 0], [a, 0], [d[0] + a + s, d[1]], d];
  const { at } = geoSchoolFit(layout.figure, model, 20, 36);
  return model.map(([x, y]) => at(x, y)) as [Pt, Pt, Pt, Pt];
}

function drawQuad(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, r: Results, words: boolean, theme: LabTheme): string[] {
  const [A, B, C, D] = geoSchoolQuadPoints(layout, r);
  const para = num(r.isParallelogram) === 1;
  tag(ctx, layout, para ? "Parallelogram ABCD" : "Trapezium ABCD: only AB ∥ DC", layout.width / 2, layout.title, theme.text, theme.fontStrong);
  polygon(ctx, [A, B, C, D], theme.surface, theme.text, 2);
  line(ctx, A, C, theme.muted, 1.5, [5, 4]);
  line(ctx, B, D, theme.muted, 1.5, [5, 4]);
  const ao = num(r.ao);
  const oc = num(r.oc);
  const t = ao / (ao + oc || 1);
  const O: Pt = [A[0] + (C[0] - A[0]) * t, A[1] + (C[1] - A[1]) * t];
  dot(ctx, O, theme.point, 3.5);
  const rr = 18;
  const values = [num(r.qA), num(r.qB), num(r.qC), num(r.qD)];
  const corners: [Pt, Pt, Pt, string][] = [
    [A, B, D, theme.sine],
    [B, C, A, theme.cosine],
    [C, D, B, theme.sine],
    [D, A, C, theme.cosine],
  ];
  corners.forEach(([v, p, q, col], i) => cornerMark(ctx, layout, v, p, q, rr, col, words ? geoDeg(values[i]!) : null, theme));
  const mid: Pt = [(A[0] + B[0] + C[0] + D[0]) / 4, (A[1] + B[1] + C[1] + D[1]) / 4];
  (["A", "B", "C", "D"] as const).forEach((n, i) => letter(ctx, layout, n, [A, B, C, D][i]!, mid, theme));
  tag(ctx, layout, "O", O[0], O[1] - 11, theme.point, theme.font);
  if (!words) return [];
  const sum = `${values.map(geoDeg).join(" + ")} = ${geoDeg(num(r.qSum))}`;
  return [
    sum,
    num(r.bisect)
      ? `Diagonals bisect: AO = OC = ${ao.toFixed(2)}, BO = OD = ${num(r.bo).toFixed(2)}`
      : `AO = ${ao.toFixed(2)}, OC = ${oc.toFixed(2)}: the diagonals don't bisect`,
  ];
}

// ── Circle ───────────────────────────────────────────────────────────────────

export function geoSchoolCircleFrame(layout: GeoSchoolLayout) {
  const f = layout.figure;
  const R = Math.min(f.width, f.height) * 0.4;
  const O: Pt = [f.x + f.width / 2, f.y + f.height / 2];
  const on = (deg: number): Pt => [O[0] + R * Math.cos(deg * RAD), O[1] - R * Math.sin(deg * RAD)];
  return { O, R, on };
}

function drawCircle(ctx: CanvasRenderingContext2D, layout: GeoSchoolLayout, r: Results, layers: ReadonlySet<string>, words: boolean, theme: LabTheme): string[] {
  const { O, R, on } = geoSchoolCircleFrame(layout);
  const arc = num(r.arc, 100);
  const A = on(-90 - arc / 2);
  const B = on(-90 + arc / 2);
  const P = on(num(r.pointP, 90));
  const Q = on(num(r.pointQ, 270));
  const pSide = num(r.pSide);
  const cyclic = layers.has("cyclic");
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(O[0], O[1], R, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
  line(ctx, A, B, theme.text, 2.5);
  line(ctx, O, A, theme.secant, 2);
  line(ctx, O, B, theme.secant, 2);
  // The angle at the centre that the arc facing P makes.
  const [cFrom, cTo] = pSide === 2 ? [-90 + arc / 2, 270 - arc / 2] : [-90 - arc / 2, -90 + arc / 2];
  wedge(ctx, O, 20, cFrom, cTo, theme.secant, 0.18);
  if (cyclic) {
    line(ctx, Q, A, theme.tangent, 2);
    line(ctx, Q, B, theme.tangent, 2);
    if (num(r.qSide)) cornerMark(ctx, layout, Q, A, B, 20, theme.tangent, words ? geoDeg(num(r.angleQ)) : null, theme);
    dot(ctx, Q, theme.tangent, 5);
    letter(ctx, layout, "Q", Q, O, theme);
  }
  line(ctx, P, A, theme.angle, 2);
  line(ctx, P, B, theme.angle, 2);
  if (pSide) cornerMark(ctx, layout, P, A, B, 20, theme.angle, words ? geoDeg(num(r.angleP)) : null, theme);
  dot(ctx, P, theme.angle, 5);
  dot(ctx, O, theme.text, 3);
  letter(ctx, layout, "A", A, O, theme);
  letter(ctx, layout, "B", B, O, theme);
  letter(ctx, layout, "P", P, O, theme);
  tag(ctx, layout, "O", O[0] - 12, O[1] - 10, theme.text, theme.fontStrong);
  if (!words) return [];
  const centre = num(r.centreForP);
  const [x, y] = bisector(O, 34, cFrom, cTo);
  tag(ctx, layout, geoDeg(pSide ? centre : arc), x, y, theme.secant, theme.fontStrong);
  if (!pSide) return ["P sits on A or B: move it round", ""];
  const first = num(r.semicircle)
    ? `A diameter: the angle in a semicircle is ${geoDeg(num(r.angleP))}`
    : `At the centre ${geoDeg(centre)} = 2 × ${geoDeg(num(r.angleP))}, the angle at P`;
  if (!cyclic) return [first, ""];
  const second = num(r.oppositeArcs)
    ? `Cyclic APBQ: ${geoDeg(num(r.angleP))} + ${geoDeg(num(r.angleQ))} = ${geoDeg(num(r.cyclicSum))}`
    : num(r.sameSegment)
      ? `Same segment: ${geoDeg(num(r.angleP))} = ${geoDeg(num(r.angleQ))}`
      : "Move Q off A and B";
  return [first, second];
}

// ── The renderer ─────────────────────────────────────────────────────────────

export const geoSchoolRenderer: SimulationRenderer<GeoSchoolLayout> = {
  id: "geoschool",
  layout: (width, _graphs, layers) => computeGeoSchoolLayout(width, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const words = layers.has("labels");
    const view = geoSchoolView(layers);
    let lines: string[];
    switch (view) {
      case "turn":
        lines = drawTurn(ctx, layout, results, words, theme);
        break;
      case "pairs":
        lines = drawPairs(ctx, layout, results, words, theme);
        break;
      case "parallel":
        lines = drawParallel(ctx, layout, results, words, theme);
        break;
      case "triangle":
        lines = drawTriangle(ctx, layout, results, words, theme);
        break;
      case "build":
        lines = drawBuild(ctx, layout, results, words, theme);
        break;
      case "quad":
        lines = drawQuad(ctx, layout, results, words, theme);
        break;
      case "circle":
        lines = drawCircle(ctx, layout, results, layers, words, theme);
        break;
    }
    lines.forEach((text, i) => {
      if (text) tag(ctx, layout, text, layout.width / 2, layout.lines[i] ?? layout.lines[1], i === 0 ? theme.text : theme.muted, i === 0 ? theme.fontStrong : theme.font);
    });
  },

  pick(layout, x, y, locked, results): PickResult | null {
    switch (layout.view) {
      case "turn": {
        const { O, R } = turnGeometry(layout);
        if (locked !== "turn" && Math.hypot(x - O[0], y - O[1]) > R + 20) return null;
        const d = Math.round(((Math.atan2(-(y - O[1]), x - O[0]) / RAD) % 360 + 360) % 360);
        return { writes: [{ variable: "turn", value: d === 360 ? 0 : d }], region: "turn" };
      }
      case "pairs": {
        const f = layout.figure;
        if (locked !== "cross" && (x < f.x || x > f.x + f.width || y < f.y || y > f.y + f.height)) return null;
        const d = Math.atan2(-(y - (f.y + f.height / 2)), x - (f.x + f.width / 2)) / RAD;
        const cross = Math.round(((d % 180) + 180) % 180);
        return { writes: [{ variable: "cross", value: clamp(cross, 10, 170) }], region: "cross" };
      }
      case "triangle": {
        const frame = geoSchoolTriangleFrame(layout, results);
        if (locked !== "apex" && Math.hypot(x - frame.C[0], y - frame.C[1]) > 26) return null;
        const [mx, my] = frame.from(x, y);
        const h = Math.max(my, 0.05);
        return {
          writes: [
            { variable: "angleA", value: Math.round(Math.atan2(h, mx) / RAD) },
            { variable: "angleB", value: Math.round(Math.atan2(h, GEOSCHOOL_BASE - mx) / RAD) },
          ],
          region: "apex",
        };
      }
      case "circle": {
        const { O, on } = geoSchoolCircleFrame(layout);
        const near = (p: Pt) => Math.hypot(x - p[0], y - p[1]) <= 24;
        const region = locked ?? (near(on(num(results.pointP, 90))) ? "P" : near(on(num(results.pointQ, 270))) ? "Q" : null);
        if (region !== "P" && region !== "Q") return null;
        const d = Math.round(((Math.atan2(-(y - O[1]), x - O[0]) / RAD) % 360 + 360) % 360) % 360;
        return { writes: [{ variable: region === "P" ? "pointP" : "pointQ", value: Math.min(d, 359) }], region };
      }
      default:
        return null;
    }
  },
};
