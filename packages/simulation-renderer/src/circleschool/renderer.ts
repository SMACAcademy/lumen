/**
 * Tangents, sectors and coordinates for classes 9 and 10, one picture at a
 * time: a line sliding towards a circle; a line through a point P of the
 * circle, turned against the radius; two tangents from an outside point; a
 * sector with its arc, triangle and segment; a segment AB divided in a ratio
 * on squared paper; and a triangle built from three sides for Heron's
 * formula.
 *
 * Which picture is drawn follows the layers of the current mode. Shapes are
 * scaled to fit the figure box, so nothing leaves a phone-width canvas.
 * Tangent lengths, arcs, areas, the dividing point's coordinates and the
 * captions that state them are drawn only with the words layer on — a
 * level's estimate hides them.
 */

import type { Results } from "@ise/science-engine";
import { clamp, label, num } from "../shared/draw";
import { createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

export type CircleSchoolView = "sweep" | "spoke" | "outside" | "sector" | "section" | "heron";
const VIEWS: readonly CircleSchoolView[] = ["sweep", "spoke", "outside", "sector", "section", "heron"];

type Box = { x: number; y: number; width: number; height: number };
type Pt = readonly [number, number];

export interface CircleSchoolLayout {
  width: number;
  height: number;
  compact: boolean;
  view: CircleSchoolView;
  /** Where the figure goes, between the title line and the captions. */
  figure: Box;
  /** Baseline of the title line. */
  title: number;
  /** Baselines of the two caption lines. */
  lines: readonly [number, number];
}

export function circleSchoolView(layers: ReadonlySet<string>): CircleSchoolView {
  return VIEWS.find((v) => layers.has(v)) ?? "sweep";
}

export function computeCircleSchoolLayout(width: number, layers: ReadonlySet<string> = new Set()): CircleSchoolLayout {
  const compact = width < 560;
  const height = compact ? 380 : 420;
  const pad = compact ? 12 : 24;
  const lines = [height - 32, height - 13] as const;
  const top = 32;
  return {
    width,
    height,
    compact,
    view: circleSchoolView(layers),
    figure: { x: pad, y: top, width: width - 2 * pad, height: lines[0] - 14 - top },
    title: 14,
    lines,
  };
}

// ── Small helpers ────────────────────────────────────────────────────────────

const RAD = Math.PI / 180;
/** A number with at most `digits` decimals, trailing zeros dropped, and a proper minus sign. */
export const circleSchoolShort = (v: number, digits = 2) => {
  const text = String(Number(v.toFixed(digits)) || 0);
  return text.startsWith("-") ? `−${text.slice(1)}` : text;
};
const fixed = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

/** A centred piece of text, kept wholly on the canvas. */
function tag(ctx: CanvasRenderingContext2D, layout: CircleSchoolLayout, text: string, x: number, y: number, color: string, font: string) {
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
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.restore();
}

function disc(ctx: CanvasRenderingContext2D, p: Pt, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, c: Pt, r: number, color: string, width = 2) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A long straight line through p in direction (ux, uy), clipped to the figure box. */
function longLine(ctx: CanvasRenderingContext2D, box: Box, p: Pt, ux: number, uy: number, color: string, width = 2.5) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
  line(ctx, [p[0] - ux * 1000, p[1] - uy * 1000], [p[0] + ux * 1000, p[1] + uy * 1000], color, width);
  ctx.restore();
}

/** The small square marking a right angle at v, between the directions to p and q. */
function rightMark(ctx: CanvasRenderingContext2D, v: Pt, p: Pt, q: Pt, size: number, color: string) {
  const unit = (to: Pt) => {
    const l = Math.hypot(to[0] - v[0], to[1] - v[1]) || 1;
    return [(to[0] - v[0]) / l, (to[1] - v[1]) / l] as const;
  };
  const [ax, ay] = unit(p);
  const [bx, by] = unit(q);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(v[0] + ax * size, v[1] + ay * size);
  ctx.lineTo(v[0] + (ax + bx) * size, v[1] + (ay + by) * size);
  ctx.lineTo(v[0] + bx * size, v[1] + by * size);
  ctx.stroke();
  ctx.restore();
}

/** A point on a circle of centre c and pixel radius r, at a maths angle (anticlockwise from the right, in degrees). */
const onCircle = (c: Pt, r: number, deg: number): Pt => [c[0] + r * Math.cos(deg * RAD), c[1] - r * Math.sin(deg * RAD)];

// ── Geometry shared by draw and pick ─────────────────────────────────────────

/** The sliding line: the circle sits near the top, with room below for the line out to 2.2 radii. */
export const CIRCLE_SCHOOL_SWEEP_REACH = 2.2;
export function circleSchoolSweepFrame(layout: CircleSchoolLayout, r: number) {
  const f = layout.figure;
  const k = Math.min((f.width / 2 - 14) / r, (f.height - 12) / ((1 + CIRCLE_SCHOOL_SWEEP_REACH) * r));
  const O: Pt = [f.x + f.width / 2, f.y + 6 + r * k];
  return { O, k, R: r * k };
}

/** The line through P: a circle of fixed size in the middle of the figure. */
export function circleSchoolSpokeFrame(layout: CircleSchoolLayout) {
  const f = layout.figure;
  const R = Math.max(20, Math.min(f.width, f.height) / 2 - 34);
  const O: Pt = [f.x + f.width / 2, f.y + f.height / 2];
  return { O, R };
}

/** Two tangents: O on the left, P to its right, both scaled to fit. */
export function circleSchoolOutsideFrame(layout: CircleSchoolLayout, r: number, d: number) {
  const f = layout.figure;
  const k = Math.min((f.width - 44) / (r + Math.max(d, r)), (f.height - 24) / (2 * r));
  const O: Pt = [f.x + 22 + r * k, f.y + f.height / 2];
  return { O, k, R: r * k, P: [O[0] + d * k, O[1]] as Pt };
}

/** The sector: a circle of fixed size, the sector opening upwards and symmetric about the vertical. */
export function circleSchoolSectorFrame(layout: CircleSchoolLayout) {
  const f = layout.figure;
  const R = Math.max(20, Math.min(f.width / 2 - 24, f.height / 2 - 12));
  return { O: [f.x + f.width / 2, f.y + f.height / 2] as Pt, R };
}

/** Squared paper from −11 to 11 each way, as large a square as fits. */
export const CIRCLE_SCHOOL_GRID = 11;
export function circleSchoolSectionPlane(layout: CircleSchoolLayout) {
  const f = layout.figure;
  const side = Math.min(f.width - 30, f.height - 6);
  const rect = { x: f.x + (f.width - side) / 2 + 10, y: f.y + 2, width: side, height: side };
  return createPlane(rect, [-CIRCLE_SCHOOL_GRID, CIRCLE_SCHOOL_GRID], [-CIRCLE_SCHOOL_GRID, CIRCLE_SCHOOL_GRID]);
}

/** Heron's triangle: AB along the bottom, C above, all scaled into the figure. */
export function circleSchoolHeronFrame(layout: CircleSchoolLayout, a: number, b: number, c: number, closes: boolean) {
  const f = layout.figure;
  const cx = closes ? (b * b + c * c - a * a) / (2 * c) : 0;
  const cy = closes ? Math.sqrt(Math.max(0, b * b - cx * cx)) : 0;
  const left = Math.min(0, cx);
  const right = Math.max(c, cx, closes ? 0 : Math.max(a, b));
  const k = Math.min((f.width - 60) / (right - left || 1), cy > 0 ? (f.height - 50) / cy : Infinity);
  const x0 = f.x + f.width / 2 - ((left + right) / 2) * k;
  const y0 = closes ? f.y + f.height / 2 + (cy * k) / 2 : f.y + f.height / 2 + 20;
  const to = (x: number, y: number): Pt => [x0 + x * k, y0 - y * k];
  return { A: to(0, 0), B: to(c, 0), C: to(cx, cy), k, to };
}

// ── The views ────────────────────────────────────────────────────────────────

type Draw = (ctx: CanvasRenderingContext2D, layout: CircleSchoolLayout, r: Results, words: boolean, theme: LabTheme) => [string, string, string];

const drawSweep: Draw = (ctx, layout, res, words, theme) => {
  const r = num(res.radius, 5);
  const gap = num(res.gap);
  const crossings = Math.round(num(res.crossings));
  const { O, k, R } = circleSchoolSweepFrame(layout, r);
  const f = layout.figure;
  const shown = Math.min(gap, CIRCLE_SCHOOL_SWEEP_REACH * r);
  const y = O[1] + shown * k;
  const colour = crossings === 1 ? theme.tangent : crossings === 2 ? theme.secant : theme.muted;

  ring(ctx, O, R, theme.curve, 2.5);
  disc(ctx, O, 3.5, theme.text);
  tag(ctx, layout, "O", O[0] - 12, O[1] - 8, theme.text, theme.fontStrong);
  // The radius, drawn sideways so it never sits on the distance line.
  line(ctx, O, [O[0] - R, O[1]], theme.sine, 2);
  tag(ctx, layout, `r = ${circleSchoolShort(r, 1)} cm`, O[0] - R / 2, O[1] - 10, theme.sine, theme.font);
  longLine(ctx, f, [O[0], y], 1, 0, colour, 2.5);
  if (gap > 0.01) line(ctx, O, [O[0], y], theme.angle, 1.5, [4, 4]);
  tag(ctx, layout, `d = ${circleSchoolShort(gap, 1)} cm${gap > shown ? " (farther)" : ""}`, O[0] + 56, (O[1] + y) / 2 + 4, theme.angle, theme.font);
  if (crossings === 2) {
    const half = Math.sqrt(Math.max(0, R * R - (shown * k) ** 2));
    disc(ctx, [O[0] - half, y], 4.5, colour);
    disc(ctx, [O[0] + half, y], 4.5, colour);
  } else if (crossings === 1) {
    disc(ctx, [O[0], y], 4.5, colour);
  }

  if (!words) return ["A line sliding towards a circle", "", ""];
  const caption =
    crossings === 0 ? "d > r: no common point — the line misses" : crossings === 1 ? "d = r: one common point — a tangent" : `d < r: two common points — a secant`;
  return ["A line sliding towards a circle", caption, crossings === 2 ? `It cuts off a chord ${fixed(num(res.chord))} cm long` : ""];
};

const drawSpoke: Draw = (ctx, layout, res, words, theme) => {
  const t = num(res.touch);
  const tilt = num(res.tilt, 90);
  const tangent = num(res.isTangent) === 1;
  const { O, R } = circleSchoolSpokeFrame(layout);
  const P = onCircle(O, R, t);
  // Line direction: the radius direction turned by the tilt (maths angles, canvas y down).
  const dir = t + tilt;
  const ux = Math.cos(dir * RAD);
  const uy = -Math.sin(dir * RAD);
  const back = 2 * R * Math.cos(tilt * RAD);
  const Q: Pt = [P[0] - back * ux, P[1] - back * uy];
  const colour = tangent ? theme.tangent : theme.secant;

  ring(ctx, O, R, theme.curve, 2.5);
  line(ctx, O, P, theme.sine, 2.5);
  longLine(ctx, layout.figure, P, ux, uy, colour, 2.5);
  disc(ctx, O, 3.5, theme.text);
  disc(ctx, P, 5, theme.angle);
  if (!tangent) disc(ctx, Q, 4.5, theme.secant);

  // The angle between the line and the radius, at P.
  const toO = t + 180;
  if (tangent) {
    const along: Pt = [P[0] + ux * 20, P[1] + uy * 20];
    rightMark(ctx, P, O, along, 11, theme.angle);
  } else {
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(P[0], P[1], 18, -toO * RAD, -(toO + tilt) * RAD, true);
    ctx.stroke();
    ctx.restore();
  }
  const mid = toO + tilt / 2;
  tag(ctx, layout, `${Math.round(tilt)}°`, P[0] + 34 * Math.cos(mid * RAD), P[1] - 34 * Math.sin(mid * RAD), theme.angle, theme.fontStrong);
  tag(ctx, layout, "O", O[0] - 10 * Math.cos(t * RAD), O[1] + 12 * Math.sin(t * RAD) + 2, theme.text, theme.fontStrong);
  tag(ctx, layout, "P", P[0] + 14 * Math.cos(t * RAD), P[1] - 14 * Math.sin(t * RAD), theme.text, theme.fontStrong);
  if (!tangent && Math.hypot(Q[0] - P[0], Q[1] - P[1]) > 14) {
    const qa = Math.atan2(-(Q[1] - O[1]), Q[0] - O[0]);
    tag(ctx, layout, "Q", Q[0] + 14 * Math.cos(qa), Q[1] - 14 * Math.sin(qa), theme.secant, theme.fontStrong);
  }

  if (!words) return ["A line through P on the circle", "", ""];
  return tangent
    ? ["A line through P on the circle", "At 90° to the radius it touches only at P:", "the tangent at P"]
    : ["A line through P on the circle", `At ${Math.round(tilt)}° to the radius it cuts again at Q:`, `a secant, chord PQ ${fixed(num(res.tiltChord))} cm`];
};

const drawOutside: Draw = (ctx, layout, res, words, theme) => {
  const r = num(res.radius, 5);
  const d = num(res.dist);
  const count = Math.round(num(res.tangentCount));
  const { O, R, P } = circleSchoolOutsideFrame(layout, r, d);

  ring(ctx, O, R, theme.curve, 2.5);
  disc(ctx, O, 3.5, theme.text);
  tag(ctx, layout, "O", O[0] - 10, O[1] + 14, theme.text, theme.fontStrong);
  if (d > 0.01) line(ctx, O, P, theme.muted, 1.5, [4, 4]);
  tag(ctx, layout, `d = ${circleSchoolShort(d, 1)} cm`, (O[0] + P[0]) / 2 + (count === 2 ? 0 : 28), O[1] + 14, theme.muted, theme.font);

  if (count === 2) {
    const alpha = Math.acos(r / d) / RAD;
    const A = onCircle(O, R, alpha);
    const B = onCircle(O, R, -alpha);
    line(ctx, O, A, theme.sine, 2, [5, 4]);
    line(ctx, O, B, theme.sine, 2, [5, 4]);
    line(ctx, P, A, theme.tangent, 2.5);
    line(ctx, P, B, theme.tangent, 2.5);
    rightMark(ctx, A, O, P, 9, theme.angle);
    rightMark(ctx, B, O, P, 9, theme.angle);
    disc(ctx, A, 4, theme.tangent);
    disc(ctx, B, 4, theme.tangent);
    tag(ctx, layout, "A", A[0] - 4, A[1] - 13, theme.text, theme.fontStrong);
    tag(ctx, layout, "B", B[0] - 4, B[1] + 14, theme.text, theme.fontStrong);
    tag(ctx, layout, `r = ${circleSchoolShort(r, 1)}`, (O[0] + A[0]) / 2 - 22, (O[1] + A[1]) / 2 - 4, theme.sine, theme.font);
    if (words) {
      const length = fixed(num(res.tangentLength));
      tag(ctx, layout, `PA = ${length}`, (A[0] + P[0]) / 2 + 14, (A[1] + P[1]) / 2 - 14, theme.tangent, theme.font);
      tag(ctx, layout, `PB = ${length}`, (B[0] + P[0]) / 2 + 14, (B[1] + P[1]) / 2 + 14, theme.tangent, theme.font);
    }
  } else if (count === 1) {
    // P on the circle: the one tangent is the line at right angles to OP.
    longLine(ctx, layout.figure, P, 0, 1, theme.tangent, 2.5);
    line(ctx, O, P, theme.sine, 2, [5, 4]);
    rightMark(ctx, P, O, [P[0], P[1] - 20], 9, theme.angle);
  }
  disc(ctx, P, 5, theme.angle);
  tag(ctx, layout, "P", Math.max(P[0] + 12, O[0] + 12), P[1] - 12, theme.text, theme.fontStrong);

  if (!words) return ["Tangents from a point P", "", ""];
  if (count === 2) {
    return ["Tangents from a point P", `Two tangents, each √(d² − r²) = ${fixed(num(res.tangentLength))} cm`, `∠APB = ${fixed(num(res.tangentAngle), 1)}°, ∠AOB = ${fixed(num(res.centreAngle), 1)}°`];
  }
  return count === 1 ? ["Tangents from a point P", "P is on the circle: exactly one tangent", ""] : ["Tangents from a point P", "P is inside the circle: no tangent at all", ""];
};

const drawSector: Draw = (ctx, layout, res, words, theme) => {
  const theta = num(res.theta);
  const r = num(res.radius, 5);
  const { O, R } = circleSchoolSectorFrame(layout);
  const a0 = 90 - theta / 2;
  const a1 = 90 + theta / 2;
  const A = onCircle(O, R, a0);
  const B = onCircle(O, R, a1);
  const pi = num(res.piChoice) === 1 ? "3.14" : "22/7";

  ring(ctx, O, R, theme.muted, 1.5);
  if (theta > 0.5) {
    // The sector, and the segment between the chord and the arc.
    ctx.save();
    ctx.fillStyle = theme.sine;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.moveTo(O[0], O[1]);
    ctx.lineTo(A[0], A[1]);
    ctx.arc(O[0], O[1], R, -a0 * RAD, -a1 * RAD, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = theme.angle;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.arc(O[0], O[1], R, -a0 * RAD, -a1 * RAD, true);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(O[0], O[1], R, -a0 * RAD, -a1 * RAD, true);
    ctx.stroke();
    ctx.restore();
    line(ctx, O, A, theme.sine, 2);
    line(ctx, O, B, theme.sine, 2);
    if (theta < 359.5) line(ctx, A, B, theme.cosine, 2, [5, 4]);
    // The angle at the centre.
    ctx.save();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(O[0], O[1], 16, -a0 * RAD, -a1 * RAD, true);
    ctx.stroke();
    ctx.restore();
  }
  disc(ctx, O, 3.5, theme.text);
  tag(ctx, layout, "O", O[0], O[1] + 14, theme.text, theme.fontStrong);
  tag(ctx, layout, `θ = ${Math.round(theta)}°`, O[0], O[1] - 28, theme.text, theme.fontStrong);
  if (theta > 0.5 && theta < 359.5) {
    tag(ctx, layout, "A", A[0] + 12 * Math.cos(a0 * RAD), A[1] - 12 * Math.sin(a0 * RAD), theme.text, theme.fontStrong);
    tag(ctx, layout, "B", B[0] + 12 * Math.cos(a1 * RAD), B[1] - 12 * Math.sin(a1 * RAD), theme.text, theme.fontStrong);
  }
  tag(ctx, layout, `r = ${circleSchoolShort(r, 1)} cm`, O[0] + R / 2, O[1] + 14, theme.sine, theme.font);

  const title = `A sector of a circle (π = ${pi})`;
  if (!words) return [title, "", ""];
  return [
    title,
    `arc ${fixed(num(res.arc))} cm · sector ${fixed(num(res.sectorArea))} cm²`,
    // Past 180° the triangle lies inside the segment, so it is added.
    `segment = sector ${theta > 180 ? "+" : "−"} △OAB = ${fixed(num(res.segment))} cm²`,
  ];
};

const drawSection: Draw = (ctx, layout, res, words, theme) => {
  const plane = circleSchoolSectionPlane(layout);
  drawPlane(ctx, plane, theme, { gridStep: 1 });
  const ax = num(res.ax);
  const ay = num(res.ay);
  const bx = num(res.bx);
  const by = num(res.by);
  const sx = num(res.sectionX);
  const sy = num(res.sectionY);
  const A = plane.toPx(ax, ay);
  const B = plane.toPx(bx, by);
  const P = plane.toPx(sx, sy);
  const M = plane.toPx(num(res.midX), num(res.midY));
  line(ctx, A, B, theme.neutral, 2.5);
  disc(ctx, A, 5, theme.sine);
  disc(ctx, B, 5, theme.cosine);
  if (words) {
    disc(ctx, M, 3.5, theme.muted);
    if (Math.hypot(M[0] - P[0], M[1] - P[1]) > 16) tag(ctx, layout, "M", M[0] - 10, M[1] + 12, theme.muted, theme.fontStrong);
  }
  disc(ctx, P, 5.5, theme.angle);
  const right = plane.rect.x + plane.rect.width;
  const name = (text: string, p: Pt, colour: string, below = false) => {
    ctx.save();
    ctx.font = theme.fontStrong;
    const w = ctx.measureText(text).width;
    ctx.restore();
    const x = p[0] + 8 + w > right ? p[0] - 8 - w / 2 : p[0] + 8 + w / 2;
    tag(ctx, layout, text, x, p[1] + (below ? 12 : -12), colour, theme.fontStrong);
  };
  const s = circleSchoolShort;
  name(`A(${s(ax)}, ${s(ay)})`, A, theme.sine);
  name(`B(${s(bx)}, ${s(by)})`, B, theme.cosine);
  name(words ? `P(${s(sx)}, ${s(sy)})` : "P", P, theme.angle, true);

  const m = Math.round(num(res.m, 1));
  const n = Math.round(num(res.n, 1));
  const title = `P divides AB in the ratio ${m} : ${n}`;
  if (!words) return [title, "", ""];
  const p = (v: number) => (v < 0 ? `(${s(v)})` : s(v));
  return [title, `x = (${m}×${p(bx)} + ${n}×${p(ax)}) ÷ ${m + n} = ${s(sx)}`, `y = (${m}×${p(by)} + ${n}×${p(ay)}) ÷ ${m + n} = ${s(sy)}`];
};

const drawHeron: Draw = (ctx, layout, res, words, theme) => {
  const a = num(res.sideA, 3);
  const b = num(res.sideB, 4);
  const c = num(res.sideC, 5);
  const closes = num(res.closes) === 1;
  const { A, B, C, k } = circleSchoolHeronFrame(layout, a, b, c, closes);
  const s = circleSchoolShort;
  if (closes) {
    ctx.save();
    ctx.fillStyle = theme.tangent;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.lineTo(C[0], C[1]);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    line(ctx, A, B, theme.sine, 2.5);
    line(ctx, B, C, theme.cosine, 2.5);
    line(ctx, C, A, theme.angle, 2.5);
    tag(ctx, layout, "A", A[0] - 10, A[1] + 10, theme.text, theme.fontStrong);
    tag(ctx, layout, "B", B[0] + 10, B[1] + 10, theme.text, theme.fontStrong);
    tag(ctx, layout, "C", C[0], C[1] - 12, theme.text, theme.fontStrong);
    tag(ctx, layout, `c = ${s(c)}`, (A[0] + B[0]) / 2, A[1] + 14, theme.sine, theme.font);
    tag(ctx, layout, `a = ${s(a)}`, (B[0] + C[0]) / 2 + 30, (B[1] + C[1]) / 2, theme.cosine, theme.font);
    tag(ctx, layout, `b = ${s(b)}`, (A[0] + C[0]) / 2 - 30, (A[1] + C[1]) / 2, theme.angle, theme.font);
  } else {
    // Sticks that cannot meet: b laid from A and a laid from B, along the base.
    line(ctx, A, B, theme.sine, 2.5);
    line(ctx, [A[0], A[1] - 14], [A[0] + b * k, A[1] - 14], theme.angle, 2.5);
    line(ctx, [B[0], B[1] - 28], [B[0] - a * k, B[1] - 28], theme.cosine, 2.5);
    tag(ctx, layout, `c = ${s(c)}`, (A[0] + B[0]) / 2, A[1] + 14, theme.sine, theme.font);
    tag(ctx, layout, `b = ${s(b)}`, A[0] + (b * k) / 2, A[1] - 26, theme.angle, theme.font);
    tag(ctx, layout, `a = ${s(a)}`, B[0] - (a * k) / 2, B[1] - 40, theme.cosine, theme.font);
  }

  const title = "Heron's formula: area from three sides";
  if (!words) return [title, "", ""];
  if (!closes) return [title, "The two shorter sides do not beat the longest:", "these sticks make no triangle"];
  const semi = num(res.semi);
  return [
    title,
    `s = (${s(a)} + ${s(b)} + ${s(c)}) ÷ 2 = ${s(semi)}`,
    `area = √(${s(semi)} × ${s(num(res.sMinusA))} × ${s(num(res.sMinusB))} × ${s(num(res.sMinusC))}) = ${fixed(num(res.heronArea))}`,
  ];
};

const DRAW: Record<CircleSchoolView, Draw> = { sweep: drawSweep, spoke: drawSpoke, outside: drawOutside, sector: drawSector, section: drawSection, heron: drawHeron };

export const circleSchoolRenderer: SimulationRenderer<CircleSchoolLayout> = {
  id: "circleschool",
  layout: (width, _graphs, layers) => computeCircleSchoolLayout(width, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    // The view follows the layers shown now, even if the layout was computed for another mode.
    const view = layers.size > 0 ? circleSchoolView(layers) : layout.view;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const [title, first, second] = DRAW[view](ctx, layout, results, layers.has("labels"), theme);
    tag(ctx, layout, title, layout.width / 2, layout.title, theme.text, theme.fontStrong);
    if (first) tag(ctx, layout, first, layout.width / 2, layout.lines[0], theme.text, theme.font);
    if (second) tag(ctx, layout, second, layout.width / 2, layout.lines[1], theme.text, theme.font);
  },

  pick(layout, x, y, locked, results): PickResult | null {
    if (layout.view === "sweep") {
      const r = num(results.radius, 5);
      const { O, k } = circleSchoolSweepFrame(layout, r);
      const f = layout.figure;
      if (locked !== "gap" && (x < f.x || x > f.x + f.width || y < O[1] - 4 || y > f.y + f.height + 6)) return null;
      const gap = Math.round(clamp((y - O[1]) / k, 0, CIRCLE_SCHOOL_SWEEP_REACH * r) * 10) / 10;
      return { writes: [{ variable: "gap", value: gap }], region: "gap" };
    }
    if (layout.view === "spoke") {
      const { O, R } = circleSchoolSpokeFrame(layout);
      const from = Math.hypot(x - O[0], y - O[1]);
      if (locked !== "touch" && Math.abs(from - R) > 24) return null;
      const deg = Math.round(((Math.atan2(-(y - O[1]), x - O[0]) / RAD) % 360 + 360) % 360);
      return { writes: [{ variable: "touch", value: deg === 360 ? 0 : deg }], region: "touch" };
    }
    return null;
  },
};
