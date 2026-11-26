/**
 * Oscillations, drawn so the motion can be compared with its graph.
 *
 * The scene sits on top: a block on a spring (one spring, two in series or
 * two in parallel, in oil when damped, pushed by a force when driven), a
 * simple pendulum, a torsion pendulum or a swinging rod. Above the block,
 * the reference circle: a point going steadily round, whose shadow is the
 * block, x = A cos(ωt + φ).
 *
 * The panel underneath shares the scene's horizontal scale. As a chart
 * recorder, it draws the displacement with time running downwards from the
 * block, "now" at the top; or the energy (U = ½kx² with KE and PE bars); or
 * the resonance curve of a driven oscillator; or the T²–L graph of the
 * pendulum experiment.
 */

import {
  SHM_ARRANGEMENT_ORDER,
  SHM_BODY_ORDER,
  SHM_DRIVEN_CAP,
  shmDampedX,
  shmDrivenAmplitude,
  shmLargeSwingFactor,
  shmPendulumTheta,
} from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface ShmLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The bottom panel: trace, energy, resonance curve or T²–L graph. */
  panel: Box;
  /** Where the block rests (x = 0), and the pivot line of pendulums and discs. */
  rest: number;
  centre: number;
  /** Pixels for a 0.2 m displacement of the block. */
  reach: number;
  /** Centre line of the block. */
  rowY: number;
  /** Pixels of drawn pendulum per metre, and the fixed extra. */
  lengthScale: number;
  pivotY: number;
}

const DEG = Math.PI / 180;
/** The widest angle the lab allows; the angular trace is scaled to it. */
const MAX_SWING = 80 * DEG;

export function computeShmLayout(width: number): ShmLayout {
  const compact = width < 560;
  const height = 410;
  const rest = Math.round(width / 2 + Math.min(20, width * 0.06));
  const reach = Math.max(30, Math.min(55, rest - 14 - 40 - 15, width - rest - 15 - 60));
  // The longest pendulum, 2.5 m, at the widest swing must stay on the canvas.
  const lengthScale = Math.min(1, (width / 2 - 14) / ((20 + 50 * 2.5) * Math.sin(MAX_SWING) + 10));
  return {
    width,
    height,
    compact,
    panel: { x: 12, y: 198, width: width - 24, height: 172 },
    rest,
    centre: width / 2,
    reach,
    rowY: 160,
    lengthScale,
    pivotY: 32,
  };
}

const fixed = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const signed = (v: number, digits = 2) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Pendulum length on screen. */
export function shmLengthPx(layout: ShmLayout, length: number): number {
  return (20 + 50 * length) * layout.lengthScale;
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, alpha = 1, lineWidth = 1.5) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 2, dash?: number[], alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** A coil spring from x1 to x2 along y. */
function spring(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, colour: string, coils = 8, amp = 6) {
  const lead = Math.min(6, Math.abs(x2 - x1) * 0.15);
  const a = x1 + lead;
  const b = x2 - lead;
  const n = coils * 2;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(a, y);
  for (let i = 1; i < n; i++) ctx.lineTo(a + ((b - a) * i) / n, y + (i % 2 ? -amp : amp));
  ctx.lineTo(b, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

/** A curve through (px, py) points, solid or faint. */
function polyline(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], colour: string, lineWidth: number, alpha = 1, dash?: number[]) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

/** Rounds up to 1, 2, 2.5 or 5 times a power of ten. */
function niceCeil(v: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v - 1e-12) return m * p;
  return 10 * p;
}

interface Trace {
  now: number;
  window: number;
  /** Screen x at time τ. */
  at: (tau: number) => number;
  /** Whether the motion before release is the same motion (no damping), drawn faintly. */
  past: boolean;
  /** A second, faint curve (the small-angle prediction). */
  ghost?: (tau: number) => number;
  /** Envelope half-width in pixels at time τ. */
  envelope?: (tau: number) => number;
  /** Screen x of the rest line and of ± the amplitude. */
  axis: number;
  bounds?: readonly [number, number];
  colour: string;
}

/** The chart recorder: time runs downwards from "now" at the top of the panel. */
function drawTrace(ctx: CanvasRenderingContext2D, panel: Box, theme: LabTheme, trace: Trace) {
  const { now, window } = trace;
  const lo = panel.x;
  const hi = panel.x + panel.width;
  const yOf = (tau: number) => panel.y + ((now - tau) / window) * panel.height;
  const bottom = panel.y + panel.height;

  ctx.save();
  ctx.fillStyle = theme.surface;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(panel.x, panel.y, panel.width, panel.height);
  ctx.restore();

  const every = panel.height / window >= 18 ? 1 : 2;
  for (let s = every; s < window; s += every) {
    const y = panel.y + (s / window) * panel.height;
    line(ctx, lo, y, hi, y, theme.grid, 1);
    label(ctx, `${s} s`, lo + 3, y - 7, { color: theme.muted, font: theme.font });
  }
  label(ctx, "now", lo + 3, panel.y + 8, { color: theme.muted, font: theme.font });
  label(ctx, "time ↓", lo + 3, bottom - 8, { color: theme.muted, font: theme.font });
  line(ctx, trace.axis, panel.y, trace.axis, bottom, theme.axis, 1.25);
  if (trace.bounds) {
    for (const [i, bx] of trace.bounds.entries()) {
      line(ctx, bx, panel.y, bx, bottom, theme.reference, 1, [3, 4]);
      label(ctx, i === 0 ? "−A" : "+A", bx, bottom + 9, { color: theme.muted, font: theme.font, align: "center" });
    }
  }

  const samples = 240;
  const solid: [number, number][] = [];
  const faint: [number, number][] = [];
  const ghost: [number, number][] = [];
  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const tau = now - (window * i) / samples;
    const y = yOf(tau);
    const x = clampTo(trace.at(tau), lo, hi);
    if (tau >= 0) solid.push([x, y]);
    else if (trace.past) faint.push([x, y]);
    if (trace.ghost && (tau >= 0 || trace.past)) ghost.push([clampTo(trace.ghost(tau), lo, hi), y]);
    if (trace.envelope && tau >= 0) {
      const half = trace.envelope(tau);
      upper.push([clampTo(trace.axis + half, lo, hi), y]);
      lower.push([clampTo(trace.axis - half, lo, hi), y]);
    }
  }
  // Join the solid and faint parts at release.
  if (faint.length > 0 && solid.length > 0) faint.unshift(solid[solid.length - 1]!);
  polyline(ctx, upper, theme.secant, 1.5, 0.8, [5, 4]);
  polyline(ctx, lower, theme.secant, 1.5, 0.8, [5, 4]);
  polyline(ctx, ghost, theme.muted, 1.5, 0.7, [4, 4]);
  polyline(ctx, faint, trace.colour, 2, 0.3);
  polyline(ctx, solid, trace.colour, 2.5);
  disc(ctx, clampTo(trace.at(now), lo, hi), panel.y, 4.5, trace.colour);
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, theme: LabTheme) {
  line(ctx, x, top, x, bottom, theme.neutral, 3);
  for (let y = top + 4; y < bottom; y += 7) line(ctx, x, y, x - 6, y + 6, theme.neutral, 1);
}

/** The block on its spring(s); returns the block's centre x. */
function drawSpringScene(ctx: CanvasRenderingContext2D, layout: ShmLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { rest, reach, rowY, width } = layout;
  const driven = has("resonance");
  const scale = driven ? reach / SHM_DRIVEN_CAP : reach / 0.2;
  const x = driven ? num(results.drivenX) : num(results.x);
  const bx = rest + x * scale;
  const half = 15;
  const top = rowY - 14;
  const floor = rowY + 15;
  const wallX = 14;
  const arrangement = SHM_ARRANGEMENT_ORDER[Math.round(num(results.arrangement))] ?? "one";
  const damping = num(results.damping);

  // Oil, when there is damping: the block drags through it.
  if (damping > 0) {
    ctx.save();
    ctx.fillStyle = theme.sine;
    ctx.globalAlpha = 0.08 + 0.17 * Math.min(1, damping);
    ctx.fillRect(rest - reach - half - 8, top - 8, 2 * (reach + half + 8), floor - top + 8);
    ctx.restore();
    label(ctx, "oil", rest + reach + half + 2, top - 2, { color: theme.muted, font: theme.font, align: "right" });
  }

  drawWall(ctx, wallX, top - 8, floor + 2, theme);
  line(ctx, wallX, floor, width - 14, floor, theme.neutral, 2);
  line(ctx, rest, top - 6, rest, floor, theme.reference, 1, [3, 3]);

  const left = bx - half;
  if (arrangement === "series") {
    const joint = (wallX + left) / 2;
    spring(ctx, wallX, joint, rowY, theme.cosine, 5);
    spring(ctx, joint, left, rowY, theme.angle, 5);
    disc(ctx, joint, rowY, 3, theme.text);
    label(ctx, "k₁", (wallX + joint) / 2, rowY - 14, { color: theme.cosine, font: theme.font, align: "center" });
    label(ctx, "k₂", (joint + left) / 2, rowY - 14, { color: theme.angle, font: theme.font, align: "center" });
  } else if (arrangement === "parallel") {
    spring(ctx, wallX, left, rowY - 7, theme.cosine, 7, 4);
    spring(ctx, wallX, left, rowY + 7, theme.angle, 7, 4);
    label(ctx, "k₁", (wallX + left) / 2, rowY - 21, { color: theme.cosine, font: theme.font, align: "center" });
  } else {
    spring(ctx, wallX, left, rowY, theme.cosine);
    label(ctx, "k", (wallX + left) / 2, rowY - 16, { color: theme.cosine, font: theme.font, align: "center" });
  }

  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(left, top, 2 * half, 28);
  ctx.restore();
  label(ctx, "m", bx, rowY, { color: theme.background, font: theme.fontStrong, align: "center" });

  if (driven) {
    const f = Math.cos(num(results.driveOmega) * num(results.t));
    const y = top - 16;
    arrow(ctx, bx, y, bx + 30 * f, y, { color: theme.vector, width: 2.5, head: 7 });
    label(ctx, "F₀ cos ω_d t", rest, top - 34, { color: theme.vector, font: theme.font, align: "center" });
  } else {
    // Velocity above the block, acceleration below the floor, each scaled to its largest value.
    const vmax = num(results.vmax, 1) || 1;
    const amax = num(results.amax, 1) || 1;
    const vx = (num(results.v) / vmax) * 34;
    const ax = (num(results.a) / amax) * 34;
    if (Math.abs(vx) > 3) {
      arrow(ctx, bx, top - 6, bx + vx, top - 6, { color: theme.tangent, width: 2.5, head: 7 });
      label(ctx, "v", bx + vx + (vx > 0 ? 6 : -6), top - 6, { color: theme.tangent, font: theme.fontStrong, align: vx > 0 ? "left" : "right" });
    }
    if (Math.abs(ax) > 3) {
      arrow(ctx, bx, floor + 11, bx + ax, floor + 11, { color: theme.secant, width: 2.5, head: 7 });
      label(ctx, "a", bx + ax + (ax > 0 ? 6 : -6), floor + 11, { color: theme.secant, font: theme.fontStrong, align: ax > 0 ? "left" : "right" });
    }
  }
  return { bx, scale, top };
}

/** The reference circle: a point going round at ω, whose shadow is the block. */
function drawPhasor(ctx: CanvasRenderingContext2D, layout: ShmLayout, results: Record<string, unknown>, theme: LabTheme, bx: number, scale: number, top: number, labels: boolean) {
  const cx = layout.rest;
  const cy = 28 + layout.reach;
  const r = num(results.amplitudeNow) * scale;
  const psi = num(results.phaseNow);
  const phi = num(results.phase);
  line(ctx, cx - layout.reach - 6, cy, cx + layout.reach + 6, cy, theme.grid, 1);
  ring(ctx, cx, cy, r, theme.reference);
  if (Math.abs(phi) > 1e-9) line(ctx, cx, cy, cx + r * Math.cos(phi), cy - r * Math.sin(phi), theme.muted, 1.5, [3, 3]);
  const px = cx + r * Math.cos(psi);
  const py = cy - r * Math.sin(psi);
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(14, r * 0.5), 0, -psi, true);
  ctx.stroke();
  ctx.restore();
  line(ctx, cx, cy, px, py, theme.cosine, 2.5);
  line(ctx, px, py, bx, top, theme.cosine, 1, [3, 3], 0.8);
  disc(ctx, px, py, 4.5, theme.cosine);
  if (labels) {
    label(ctx, "ωt + φ", cx + 6, cy + 10, { color: theme.angle, font: theme.font });
    if (Math.abs(phi) > 1e-9) label(ctx, "φ at t = 0", cx - 6, cy + 10, { color: theme.muted, font: theme.font, align: "right" });
  }
}

function drawPendulum(ctx: CanvasRenderingContext2D, layout: ShmLayout, results: Record<string, unknown>, theme: LabTheme, ghost: boolean) {
  const { centre, pivotY } = layout;
  const lp = shmLengthPx(layout, num(results.length, 1));
  const theta = num(results.theta);
  line(ctx, centre - 36, pivotY - 2, centre + 36, pivotY - 2, theme.neutral, 3);
  line(ctx, centre, pivotY, centre, pivotY + lp + 12, theme.reference, 1, [3, 3]);
  const bx = centre + lp * Math.sin(theta);
  const by = pivotY + lp * Math.cos(theta);
  if (ghost) {
    const small = num(results.swing) * Math.cos(num(results.pendulumOmega) * num(results.t));
    const gx = centre + lp * Math.sin(small);
    const gy = pivotY + lp * Math.cos(small);
    line(ctx, centre, pivotY, gx, gy, theme.muted, 1, [3, 3], 0.7);
    ring(ctx, gx, gy, 7, theme.muted, 0.8);
  }
  line(ctx, centre, pivotY, bx, by, theme.neutral, 1.5);
  const r = 6 + 4 * Math.cbrt(clampTo(num(results.mass, 1), 0.1, 4) / 4);
  disc(ctx, bx, by, r, theme.sine);
  disc(ctx, centre, pivotY, 3, theme.text);
  label(ctx, "L", (centre + bx) / 2 + (theta >= 0 ? -10 : 10), (pivotY + by) / 2, { color: theme.text, font: theme.font, align: "center" });
  if (Math.abs(theta) > 3 * DEG) {
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const a0 = Math.PI / 2;
    ctx.arc(centre, pivotY, 22, Math.min(a0, a0 - theta), Math.max(a0, a0 - theta));
    ctx.stroke();
    ctx.restore();
    label(ctx, "θ", centre + 30 * Math.sin(theta / 2), pivotY + 30 * Math.cos(theta / 2), { color: theme.angle, font: theme.fontStrong, align: "center" });
  }
}

function drawAngular(ctx: CanvasRenderingContext2D, layout: ShmLayout, results: Record<string, unknown>, theme: LabTheme) {
  const { centre, pivotY } = layout;
  const body = SHM_BODY_ORDER[Math.round(num(results.body))] ?? "torsion";
  const theta = num(results.angularTheta);
  if (body === "torsion") {
    const cy = 124;
    const rx = Math.min(66, layout.width / 2 - 30);
    const ry = 18;
    line(ctx, centre - 30, 26, centre + 30, 26, theme.neutral, 3);
    line(ctx, centre, 27, centre, cy, theme.neutral, 1.5);
    label(ctx, "wire, κ", centre + 8, 60, { color: theme.text, font: theme.font });
    ctx.save();
    ctx.fillStyle = theme.neutral;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.ellipse(centre, cy + 8, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(centre, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(centre, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    line(ctx, centre, cy, centre, cy + ry, theme.reference, 1.5, [3, 3]);
    const mx = centre + rx * Math.sin(theta);
    const my = cy + ry * Math.cos(theta);
    line(ctx, centre, cy, mx, my, theme.angle, 2.5);
    disc(ctx, mx, my, 4, theme.angle);
    label(ctx, "disc, I", centre - rx - 4, cy - ry - 6, { color: theme.text, font: theme.font });
    return;
  }
  // A rod from one end, beside a faint simple pendulum of the same length.
  const lp = shmLengthPx(layout, num(results.length, 1));
  line(ctx, centre - 36, pivotY - 2, centre + 36, pivotY - 2, theme.neutral, 3);
  line(ctx, centre, pivotY, centre, pivotY + lp + 8, theme.reference, 1, [3, 3]);
  const p = num(results.theta);
  const gx = centre + lp * Math.sin(p);
  const gy = pivotY + lp * Math.cos(p);
  line(ctx, centre, pivotY, gx, gy, theme.muted, 1, [3, 3], 0.7);
  ring(ctx, gx, gy, 7, theme.muted, 0.8);
  const tx = centre + lp * Math.sin(theta);
  const ty = pivotY + lp * Math.cos(theta);
  line(ctx, centre, pivotY, tx, ty, theme.secant, 7);
  disc(ctx, (centre + tx) / 2, (pivotY + ty) / 2, 3.5, theme.text);
  disc(ctx, centre, pivotY, 3, theme.text);
}

function drawEnergy(ctx: CanvasRenderingContext2D, panel: Box, results: Record<string, unknown>, theme: LabTheme) {
  const A = num(results.amplitude, 0.1);
  const E = num(results.energy, 1) || 1;
  const k = num(results.kEff, 1);
  const x = num(results.x);
  const ke = num(results.ke);
  const pe = num(results.pe);
  const total = num(results.total);
  const plot: Box = { x: panel.x + 14, y: panel.y + 22, width: panel.width - 14 - 104, height: panel.height - 44 };
  const plane = createPlane(plot, [-1.25 * A, 1.25 * A], [0, 1.5 * E]);
  const base = plot.y + plot.height;
  line(ctx, plot.x, base, plot.x + plot.width, base, theme.axis, 1.25);
  label(ctx, "U = ½kx², and the total E", plot.x, panel.y + 8, { color: theme.muted, font: theme.font });
  const curve: [number, number][] = [];
  for (let i = 0; i <= 120; i++) {
    const xi = -1.2 * A + (2.4 * A * i) / 120;
    curve.push(plane.toPx(xi, Math.min(1.5 * E, 0.5 * k * xi * xi)));
  }
  polyline(ctx, curve, theme.curve, 2.5);
  const [, ey] = plane.toPx(0, Math.min(1.5 * E, total));
  line(ctx, plot.x, ey, plot.x + plot.width, ey, theme.angle, 1.5, [5, 4]);
  label(ctx, "E", plot.x + plot.width + 4, ey, { color: theme.angle, font: theme.fontStrong });
  for (const s of [-1, 1]) {
    const [ax] = plane.toPx(s * A, 0);
    line(ctx, ax, base, ax, base + 4, theme.axis, 1);
    label(ctx, s < 0 ? "−A" : "+A", ax, base + 12, { color: theme.muted, font: theme.font, align: "center" });
  }
  const [px, py] = plane.toPx(x, Math.min(1.5 * E, pe));
  line(ctx, px, base, px, py, theme.cosine, 4);
  line(ctx, px, py, px, ey, theme.sine, 4);
  disc(ctx, px, py, 4.5, theme.text);

  // Bars, on the same energy scale as the graph.
  const barTop = (value: number) => plane.toPx(0, Math.min(1.5 * E, value))[1];
  const bars: [string, number, string][] = [
    ["KE", ke, theme.sine],
    ["PE", pe, theme.cosine],
    ["E", total, theme.angle],
  ];
  const x0 = panel.x + panel.width - 88;
  bars.forEach(([name, value, colour], i) => {
    const bxl = x0 + i * 30;
    const y = barTop(value);
    ctx.save();
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(bxl, y, 22, base - y);
    ctx.restore();
    label(ctx, name, bxl + 11, base + 12, { color: colour, font: theme.fontStrong, align: "center" });
  });
}

function drawResonance(ctx: CanvasRenderingContext2D, panel: Box, results: Record<string, unknown>, theme: LabTheme) {
  const force = num(results.force, 0.5);
  const m = num(results.mass, 0.5);
  const k = num(results.kEff, 50);
  const b = num(results.damping);
  const amplitude = num(results.drivenAmplitude) * 100;
  const peak = num(results.peakAmplitude) * 100;
  const top = niceCeil(Math.max(2, peak, amplitude) * 1.1);
  const rect: Box = { x: panel.x + 34, y: panel.y + 22, width: panel.width - 46, height: panel.height - 46 };
  const plane: Plane = createPlane(rect, [0, 30], [0, top]);
  drawPlane(ctx, plane, theme);
  label(ctx, "amplitude / cm, against ω_d / (rad/s)", panel.x + 2, panel.y + 8, { color: theme.muted, font: theme.font });
  const curve: [number, number][] = [];
  for (let i = 0; i <= 300; i++) {
    const w = 0.1 + (29.9 * i) / 300;
    curve.push(plane.toPx(w, Math.min(top, shmDrivenAmplitude(force, m, k, b, w) * 100)));
  }
  polyline(ctx, curve, theme.curve, 2.5);
  const omega = num(results.omega);
  if (omega > 0 && omega <= 30) {
    const [ox] = plane.toPx(omega, 0);
    line(ctx, ox, rect.y, ox, rect.y + rect.height, theme.reference, 1, [4, 4]);
    label(ctx, "ω₀", ox + 4, rect.y + 6, { color: theme.text, font: theme.font });
  }
  const [dx, dy] = plane.toPx(num(results.driveOmega), Math.min(top, amplitude));
  disc(ctx, dx, dy, 5, theme.angle);
}

function drawTSquared(ctx: CanvasRenderingContext2D, panel: Box, results: Record<string, unknown>, theme: LabTheme) {
  const slope = num(results.slope, 4);
  const factor = shmLargeSwingFactor(num(results.swing));
  const top = niceCeil(slope * 2.5 * factor * factor * 1.08);
  const rect: Box = { x: panel.x + 34, y: panel.y + 22, width: panel.width - 46, height: panel.height - 46 };
  const plane = createPlane(rect, [0, 2.5], [0, top]);
  drawPlane(ctx, plane, theme);
  label(ctx, "T² / s², against L / m", panel.x + 2, panel.y + 8, { color: theme.muted, font: theme.font });
  // Small-angle theory: T² = (4π²/g) L.
  polyline(ctx, [plane.toPx(0, 0), plane.toPx(2.5, slope * 2.5)], theme.reference, 1.5, 1, [5, 4]);
  // Timings at this swing, every 0.25 m.
  for (let i = 1; i <= 10; i++) {
    const L = i * 0.25;
    const [px, py] = plane.toPx(L, slope * L * factor * factor);
    disc(ctx, px, py, 3, theme.sine, 0.7);
  }
  const L = num(results.length, 1);
  const [px, py] = plane.toPx(L, slope * L * factor * factor);
  disc(ctx, px, py, 5.5, theme.angle);
}

export const shmRenderer: SimulationRenderer<ShmLayout> = {
  id: "shm",
  layout: (width) => computeShmLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const labels = has("labels");
    const { width, height, panel, rest, centre } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (words: string) => label(ctx, words, width / 2, 12, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (words: string) => label(ctx, words, width / 2, height - 12, { color: theme.text, font: theme.font, align: "center" });
    const t = num(results.t);
    const arrangement = SHM_ARRANGEMENT_ORDER[Math.round(num(results.arrangement))] ?? "one";
    const body = SHM_BODY_ORDER[Math.round(num(results.body))] ?? "torsion";
    const damping = num(results.damping);

    if (has("spring")) {
      title(
        has("resonance")
          ? "Driven by a force F₀ cos ω_d t"
          : has("energy")
            ? "Energy in SHM"
            : has("envelope")
              ? damping > 0
                ? "Damped: the block drags through oil"
                : "No damping yet"
              : arrangement === "series"
                ? "Two springs in series"
                : arrangement === "parallel"
                  ? "Two springs in parallel"
                  : "Mass on a spring",
      );
      const { bx, scale, top } = drawSpringScene(ctx, layout, results, theme, has);
      if (has("phasor")) drawPhasor(ctx, layout, results, theme, bx, scale, top, labels);
      if (has("trace")) {
        const A = num(results.amplitude, 0.1);
        const m = num(results.mass, 0.5);
        const k = num(results.kEff, 50);
        const phase = num(results.phase);
        const gamma = num(results.gamma);
        const period = num(results.periodDamped) || num(results.period, 1);
        drawTrace(ctx, panel, theme, {
          now: t,
          window: has("envelope") ? 6 : clampTo(3 * period, 1.5, 6),
          at: (tau) => rest + shmDampedX(A, m, k, damping, phase, tau) * scale,
          past: damping === 0,
          envelope: has("envelope") && damping > 0 ? (tau) => A * Math.exp(-gamma * tau) * scale : undefined,
          axis: rest,
          bounds: [rest - A * scale, rest + A * scale],
          colour: theme.sine,
        });
      }
      if (has("energy")) drawEnergy(ctx, panel, results, theme);
      if (has("resonance")) drawResonance(ctx, panel, results, theme);
    }

    if (has("pendulum")) {
      title(has("tsquared") ? "Timing a pendulum: T² against L" : "Simple pendulum");
      const ghost = has("trace") && num(results.swingError) > 0.5;
      drawPendulum(ctx, layout, results, theme, ghost);
      if (has("trace")) {
        const lp = shmLengthPx(layout, num(results.length, 1));
        const theta0 = num(results.swing);
        const w0 = num(results.pendulumOmega, 1);
        drawTrace(ctx, panel, theme, {
          now: t,
          window: clampTo(3 * num(results.periodExact, 2), 2, 8),
          at: (tau) => centre + lp * Math.sin(shmPendulumTheta(theta0, w0, tau)),
          ghost: ghost ? (tau) => centre + lp * Math.sin(theta0 * Math.cos(w0 * tau)) : undefined,
          past: true,
          axis: centre,
          bounds: [centre - lp * Math.sin(theta0), centre + lp * Math.sin(theta0)],
          colour: theme.sine,
        });
      }
      if (has("tsquared")) drawTSquared(ctx, panel, results, theme);
    }

    if (has("angular")) {
      title(body === "rod" ? "A rod from one end (faint: a pendulum)" : "Torsion pendulum");
      drawAngular(ctx, layout, results, theme);
      if (has("trace")) {
        const theta0 = num(results.swing);
        const half = Math.min(layout.width / 2 - 24, 140);
        const w = body === "rod" ? Math.sqrt((3 * num(results.g, 9.8)) / (2 * num(results.length, 1))) : Math.sqrt(num(results.kappa, 0.1) / num(results.inertia, 0.01));
        const angle = (tau: number) => (body === "rod" ? shmPendulumTheta(theta0, w, tau) : theta0 * Math.cos(w * tau));
        drawTrace(ctx, panel, theme, {
          now: t,
          window: clampTo(3 * num(results.angularPeriod, 2), 2, 8),
          at: (tau) => centre + (angle(tau) / MAX_SWING) * half,
          past: true,
          axis: centre,
          bounds: [centre - (theta0 / MAX_SWING) * half, centre + (theta0 / MAX_SWING) * half],
          colour: theme.angle,
        });
      }
    }

    if (!labels) return;
    if (has("tsquared")) {
      caption(`T = ${fixed(num(results.periodExact), 3)} s · g = 4π²L/T² = ${fixed(num(results.gMeasured))} m/s²`);
    } else if (has("resonance")) {
      const wd = fixed(num(results.driveOmega), 1);
      caption(
        num(results.runaway) === 1
          ? `ω_d = ${wd} rad/s · no damping: A grows without limit`
          : `ω_d = ${wd} rad/s · A = ${fixed(num(results.drivenAmplitude) * 100, 1)} cm${num(results.resonance) === 1 ? " · resonance" : ""}`,
      );
    } else if (has("energy")) {
      caption(`KE ${fixed(num(results.ke), 3)} J + PE ${fixed(num(results.pe), 3)} J = ${fixed(num(results.total), 3)} J`);
    } else if (has("envelope")) {
      caption(
        damping > 0
          ? `ω′ = ${fixed(num(results.omegaDamped))} rad/s · amplitude halves every ${fixed(num(results.halfLife))} s`
          : `no damping: the amplitude stays ${fixed(num(results.amplitude))} m`,
      );
    } else if (has("pendulum")) {
      caption(`2π√(L/g) = ${fixed(num(results.periodPendulum), 3)} s · true T ${fixed(num(results.periodExact), 3)} s (+${fixed(num(results.swingError), 1)}%)`);
    } else if (has("angular")) {
      caption(
        body === "rod"
          ? `rod T = ${fixed(num(results.rodPeriod))} s · pendulum T = ${fixed(num(results.periodPendulum))} s`
          : `T = 2π√(I/κ) = ${fixed(num(results.torsionPeriod))} s`,
      );
    } else if (has("spring")) {
      caption(
        arrangement === "one"
          ? `T = ${fixed(num(results.period), 3)} s · x = ${signed(num(results.x), 3)} m · v = ${signed(num(results.v))} m/s`
          : `${arrangement === "series" ? "in series" : "in parallel"}: k_eff = ${fixed(num(results.kEff), 1)} N/m · T = ${fixed(num(results.period), 3)} s`,
      );
    }
  },
};
