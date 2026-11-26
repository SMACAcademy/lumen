/**
 * Complex numbers and quadratics, in three pictures.
 *
 * Argand plane: z as an arrow from 0, its argument as an arc from the
 * positive real axis. Layers add the conjugate (a reflection in the real
 * axis), i·z (a quarter turn), a second number w with the sum, difference,
 * product or quotient, the product as "multiply the lengths, add the angles",
 * and the polar form. The plane grows to fit whatever is drawn.
 *
 * Roots of unity: the n roots of zⁿ = 1 as the corners of a regular polygon
 * on the unit circle, with ωᵐ ringed.
 *
 * Quadratic: the parabola y = ax² + bx + c, its real roots where it meets
 * the x-axis, and — when D < 0 — an Argand inset with the complex pair. Layers
 * add a number k with f(k), and the part of the x-axis where f(x) > 0.
 *
 * Every number that a level asks for is written only with the words layer on.
 */

import { COMPLEX_LIMIT, COMPLEX_OP_ORDER, COMPLEX_OP_SYMBOLS, QUADRATIC_K } from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };
export type ComplexView = "argand" | "unity" | "quadratic";

export interface ComplexLayout {
  width: number;
  height: number;
  compact: boolean;
  view: ComplexView;
  /** Layers that change what the Argand plane must fit, so a drag maps back to the same scale. */
  fits: { pair: boolean; product: boolean };
  /** The square Argand plane (and the roots of unity). */
  square: Box;
  /** The parabola's plot. */
  plot: Box;
  /** Baselines of the two caption lines. */
  lines: readonly [number, number];
}

/** The parabola's fixed window. */
export const COMPLEX_PLOT_X: readonly [number, number] = [-7, 7];
export const COMPLEX_PLOT_Y: readonly [number, number] = [-10, 10];
/** Half-widths the Argand plane may take; the smallest that fits is used. */
const EXTENTS = [5, 6, 8, 10, 12, 16, 20, 25, 32, 40];

export function computeComplexLayout(width: number, _graphs: unknown = [], layers: ReadonlySet<string> = new Set()): ComplexLayout {
  const compact = width < 560;
  const height = compact ? 400 : 430;
  const lines = [height - 32, height - 13] as const;
  const side = Math.max(120, Math.min(width - 32, lines[0] - 12 - 28));
  const left = compact ? 34 : 48;
  return {
    width,
    height,
    compact,
    view: layers.has("unity") ? "unity" : layers.has("parabola") ? "quadratic" : "argand",
    fits: { pair: layers.has("pair"), product: layers.has("product") },
    square: { x: (width - side) / 2, y: 28, width: side, height: side },
    plot: { x: left, y: 28, width: width - left - 14, height: lines[0] - 14 - 28 },
    lines,
  };
}

// ── Formatting ───────────────────────────────────────────────────────────────

const round = (v: number, digits: number) => {
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return r === 0 ? 0 : r;
};
/** A number with at most `digits` decimals, trailing zeros dropped, and a true minus sign. */
export const complexNumberText = (v: number, digits = 2) => String(round(v, digits)).replace("-", "−");
const n2 = complexNumberText;
const deg = (v: number) => `${n2(v, 1)}°`;

/** a + ib written the way a textbook does: 3 − 2i, −i, 4, 0.5i. */
export function complexText(re: number, im: number, digits = 2): string {
  const r = round(re, digits);
  const i = round(im, digits);
  if (i === 0) return n2(r, digits);
  const mag = Math.abs(i) === 1 ? "i" : `${n2(Math.abs(i), digits)}i`;
  if (r === 0) return i < 0 ? `−${mag}` : mag;
  return `${n2(r, digits)} ${i < 0 ? "−" : "+"} ${mag}`;
}

/** ax² + bx + c with zero terms left out and unit coefficients dropped. */
export function polynomialText(a: number, b: number, c: number): string {
  const parts: string[] = [];
  for (const [v, power] of [[a, "x²"], [b, "x"], [c, ""]] as const) {
    if (v === 0) continue;
    const mag = Math.abs(v);
    const body = power && mag === 1 ? power : `${n2(mag)}${power}`;
    parts.push(parts.length === 0 ? (v < 0 ? `−${body}` : body) : `${v < 0 ? "−" : "+"} ${body}`);
  }
  return parts.length ? parts.join(" ") : "0";
}

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => String(n).split("").map((ch) => SUPERSCRIPT[Number(ch)] ?? ch).join("");
const omegaPower = (j: number) => (j === 0 ? "1" : j === 1 ? "ω" : `ω${sup(j)}`);

// ── Drawing helpers ──────────────────────────────────────────────────────────

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 1.5, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
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

/** An arc for an angle θ (rad, anticlockwise positive) about a canvas point. */
function angleArc(ctx: CanvasRenderingContext2D, ox: number, oy: number, r: number, from: number, theta: number, colour: string, lineWidth = 2) {
  if (Math.abs(theta) < 1e-9) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(ox, oy, r, -from, -(from + theta), theta > 0);
  ctx.stroke();
  ctx.restore();
}

/** An arrow from 0 to a point, with a name just beyond its head, kept inside the plane. */
function pointer(ctx: CanvasRenderingContext2D, plane: Plane, x: number, y: number, name: string, colour: string, theme: LabTheme, dash?: number[]) {
  const [ox, oy] = plane.toPx(0, 0);
  const [hx, hy] = plane.toPx(x, y);
  arrow(ctx, ox, oy, hx, hy, { color: colour, width: 2.5, head: 9, dash });
  disc(ctx, hx, hy, 3.5, colour);
  const length = Math.hypot(hx - ox, hy - oy) || 1;
  const { rect } = plane;
  const lx = Math.min(rect.x + rect.width - 14, Math.max(rect.x + 14, hx + ((hx - ox) / length) * 14));
  const ly = Math.min(rect.y + rect.height - 8, Math.max(rect.y + 8, hy + ((hy - oy) / length) * 14));
  label(ctx, name, lx, ly, { color: colour, font: theme.fontStrong, align: "center", background: theme.background });
}

/** The smallest of the allowed half-widths that holds every point drawn. */
export function complexExtent(results: Results, fits: { pair: boolean; product: boolean }): number {
  const coords = [num(results.re), num(results.im), COMPLEX_LIMIT];
  if (fits.pair) coords.push(num(results.wRe), num(results.wIm), num(results.resultRe), num(results.resultIm), num(results.sumRe), num(results.sumIm));
  if (fits.product) coords.push(num(results.wRe), num(results.wIm), num(results.prodRe), num(results.prodIm));
  const needed = Math.max(...coords.map(Math.abs)) + 0.6;
  return EXTENTS.find((e) => e >= needed) ?? EXTENTS[EXTENTS.length - 1]!;
}

function argandPlane(layout: ComplexLayout, results: Results): Plane {
  const e = complexExtent(results, layout.fits);
  return createPlane(layout.square, [-e, e], [-e, e]);
}

// ── The three views ──────────────────────────────────────────────────────────

function drawArgand(ctx: CanvasRenderingContext2D, layout: ComplexLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const plane = argandPlane(layout, results);
  drawPlane(ctx, plane, theme, { xLabel: "Re", yLabel: "Im" });
  const [ox, oy] = plane.toPx(0, 0);
  const a = num(results.re);
  const b = num(results.im);
  const zero = num(results.isZero) === 1;
  const arg = num(results.arg);
  const words = has("labels");
  const lines: string[] = [];

  if (has("polar")) {
    // The unit circle, and the circle |z| = r that z travels round as θ changes.
    ring(ctx, ox, oy, plane.sx, theme.reference, 1.2, [4, 4]);
    if (!zero) ring(ctx, ox, oy, num(results.modulus) * plane.sx, theme.neutral, 1, [2, 5]);
  }

  if (has("conjugate")) {
    const [hx, hy] = plane.toPx(a, b);
    const [cx, cy] = plane.toPx(a, -b);
    line(ctx, hx, hy, cx, cy, theme.muted, 1.2, [3, 4]);
    pointer(ctx, plane, a, -b, "z̄", theme.cosine, theme);
  }
  if (has("times-i") && !zero) {
    pointer(ctx, plane, num(results.iRe), num(results.iIm), "iz", theme.tangent, theme);
    // The right angle between z and iz.
    // On the canvas (y down) z points along (cos θ, −sin θ) and iz along (−sin θ, −cos θ).
    const s = 12;
    const [ux, uy] = [Math.cos(arg) * s, -Math.sin(arg) * s];
    const [vx, vy] = [-Math.sin(arg) * s, -Math.cos(arg) * s];
    ctx.save();
    ctx.strokeStyle = theme.tangent;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(ox + ux, oy + uy);
    ctx.lineTo(ox + ux + vx, oy + uy + vy);
    ctx.lineTo(ox + vx, oy + vy);
    ctx.stroke();
    ctx.restore();
  }

  const opIndex = Math.round(num(results.op));
  const op = COMPLEX_OP_ORDER[opIndex] ?? "add";
  if (has("pair")) {
    const c = num(results.wRe);
    const d = num(results.wIm);
    pointer(ctx, plane, c, d, "w", theme.cosine, theme);
    const name = op === "add" ? "z + w" : op === "subtract" ? "z − w" : op === "multiply" ? "zw" : "z/w";
    if (op === "add") {
      // Tip to tail: w carried to the head of z, and back the other way round.
      const [zx, zy] = plane.toPx(a, b);
      const [wx, wy] = plane.toPx(c, d);
      const [sx, sy] = plane.toPx(a + c, b + d);
      arrow(ctx, zx, zy, sx, sy, { color: theme.cosine, width: 1.5, head: 7, dash: [5, 4] });
      arrow(ctx, wx, wy, sx, sy, { color: theme.sine, width: 1.5, head: 7, dash: [5, 4] });
    } else if (op === "subtract") {
      // z − w is the arrow from w to z, moved to start at 0.
      const [zx, zy] = plane.toPx(a, b);
      const [wx, wy] = plane.toPx(c, d);
      arrow(ctx, wx, wy, zx, zy, { color: theme.curve, width: 1.5, head: 7, dash: [5, 4] });
    }
    if (num(results.resultDefined) === 1) pointer(ctx, plane, num(results.resultRe), num(results.resultIm), name, theme.curve, theme);
    if (words) {
      lines.push(
        num(results.resultDefined) === 1
          ? `(${complexText(a, b)}) ${COMPLEX_OP_SYMBOLS[opIndex] ?? "+"} (${complexText(c, d)}) = ${complexText(num(results.resultRe), num(results.resultIm))}`
          : "w = 0: dividing by 0 is not defined",
      );
    }
  }

  if (has("product")) {
    const c = num(results.wRe);
    const d = num(results.wIm);
    pointer(ctx, plane, c, d, "w", theme.cosine, theme);
    pointer(ctx, plane, num(results.prodRe), num(results.prodIm), "zw", theme.curve, theme);
    const arg2 = num(results.arg2);
    angleArc(ctx, ox, oy, 34, arg, arg2, theme.cosine, 2);
    angleArc(ctx, ox, oy, 46, 0, num(results.prodArg), theme.curve, 1.5);
    if (words) {
      const turns = Math.round(num(results.argTurns));
      const sum = `${deg(num(results.argDeg))} + ${deg(num(results.arg2Deg))}`;
      const angle = turns === 0 ? sum : `${sum} ${turns < 0 ? "−" : "+"} 360°`;
      lines.push(`|zw| = ${n2(num(results.modulus))} × ${n2(num(results.modulus2))} = ${n2(num(results.prodModulus))}`);
      lines.push(`arg zw = ${angle} = ${deg(num(results.prodArgDeg))}`);
    }
  }

  // z itself, and its argument, on top.
  if (!zero) angleArc(ctx, ox, oy, 24, 0, arg, theme.angle, 2.5);
  pointer(ctx, plane, a, b, "z", theme.sine, theme);
  disc(ctx, ox, oy, 2.5, theme.text);

  if (words) {
    const z = complexText(a, b);
    if (has("polar")) {
      const r = n2(num(results.modulus));
      const t = deg(num(results.argDeg));
      if (zero) lines.unshift("z = 0 has modulus 0 and no argument");
      else lines.unshift(`z = ${r}(cos ${t} + i sin ${t})`, `= ${r}e^(${n2(arg)}i), with θ = ${n2(arg)} rad`);
    } else {
      lines.unshift(zero ? "z = 0: modulus 0, and no argument" : `z = ${z} · |z| = ${n2(num(results.modulus))} · arg z = ${deg(num(results.argDeg))}`);
    }
    const extra: string[] = [];
    if (has("conjugate")) extra.push(`z̄ = ${complexText(a, -b)}`, `zz̄ = ${n2(num(results.zzBar))}`);
    if (has("times-i")) extra.push(`iz = ${complexText(num(results.iRe), num(results.iIm))}`);
    if (extra.length) lines.push(extra.join(" · "));
  }
  return lines;
}

function drawUnity(ctx: CanvasRenderingContext2D, layout: ComplexLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const plane = createPlane(layout.square, [-1.6, 1.6], [-1.6, 1.6]);
  drawPlane(ctx, plane, theme, { gridStep: 0.5, xLabel: "Re", yLabel: "Im", showLabels: false });
  const [ox, oy] = plane.toPx(0, 0);
  ring(ctx, ox, oy, plane.sx, theme.reference, 1.2, [4, 4]);
  const n = Math.max(2, Math.round(num(results.n, 3)));
  const m = Math.round(num(results.m));
  const corners = Array.from({ length: n }, (_, j) => plane.toPx(Math.cos((2 * Math.PI * j) / n), Math.sin((2 * Math.PI * j) / n)));

  ctx.save();
  ctx.strokeStyle = theme.curve;
  ctx.fillStyle = theme.curve;
  ctx.lineWidth = 2;
  ctx.beginPath();
  corners.forEach(([x, y], j) => (j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.globalAlpha = 0.12;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.restore();

  // ωᵐ ringed, with its arrow from 0.
  const [px, py] = plane.toPx(num(results.powerRe, 1), num(results.powerIm));
  arrow(ctx, ox, oy, px, py, { color: theme.angle, width: 2.5, head: 9 });
  ring(ctx, px, py, 9, theme.angle, 2);
  angleArc(ctx, ox, oy, 20, 0, (2 * Math.PI) / n, theme.tangent, 2);

  corners.forEach(([x, y], j) => {
    disc(ctx, x, y, 4.5, theme.sine);
    if (n > 8 && j > 1 && j !== m % n) return;
    const t = (2 * Math.PI * j) / n;
    label(ctx, omegaPower(j), x + Math.cos(t) * 20, y - Math.sin(t) * 20, { color: theme.sine, font: theme.fontStrong, align: "center" });
  });
  // The polygon balances on its centre: that is why the roots add up to 0.
  ring(ctx, ox, oy, 4, theme.text, 1.5);

  if (!has("labels")) return [];
  return [
    `n = ${n}: corners ${deg(num(results.rootAngleDeg))} apart · ω = ${complexText(num(results.omegaRe), num(results.omegaIm))}`,
    `ω${sup(m)} = ${complexText(num(results.powerRe), num(results.powerIm))} · sum = ${complexText(num(results.rootSumRe), num(results.rootSumIm))} · product = ${n2(num(results.rootProduct))}`,
  ];
}

function drawQuadratic(ctx: CanvasRenderingContext2D, layout: ComplexLayout, results: Results, has: (l: string) => boolean, theme: LabTheme): string[] {
  const { plot } = layout;
  const plane = createPlane(plot, COMPLEX_PLOT_X, COMPLEX_PLOT_Y);
  drawPlane(ctx, plane, theme, { xLabel: "x", yLabel: "y" });
  const A = num(results.qa);
  const B = num(results.qb);
  const C = num(results.qc);
  const f = (x: number) => A * x * x + B * x + C;
  const [x0, x1] = COMPLEX_PLOT_X;
  const kind = Math.round(num(results.rootKind));
  const [, axisY] = plane.toPx(0, 0);

  if (has("inequality")) {
    // Thick stripes along the x-axis wherever f(x) > 0.
    ctx.save();
    ctx.strokeStyle = theme.tangent;
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.7;
    ctx.lineCap = "butt";
    let start: number | null = null;
    const STEPS = 280;
    for (let i = 0; i <= STEPS; i++) {
      const x = x0 + ((x1 - x0) * i) / STEPS;
      const positive = f(x) > 1e-9;
      if (positive && start === null) start = x;
      if ((!positive || i === STEPS) && start !== null) {
        const [sx] = plane.toPx(start, 0);
        const [ex] = plane.toPx(x, 0);
        ctx.beginPath();
        ctx.moveTo(sx, axisY);
        ctx.lineTo(ex, axisY);
        ctx.stroke();
        start = null;
      }
    }
    ctx.restore();
  }

  // The curve.
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const x = x0 + ((x1 - x0) * i) / 240;
    const [px, py] = plane.toPx(x, Math.max(-1e3, Math.min(1e3, f(x))));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  if (kind !== 3) {
    // The axis of symmetry and the vertex.
    const vx = num(results.vertexX);
    const vy = num(results.vertexY);
    if (vx >= x0 && vx <= x1) {
      const [sx] = plane.toPx(vx, 0);
      line(ctx, sx, plot.y, sx, plot.y + plot.height, theme.muted, 1, [3, 5]);
      const [, py] = plane.toPx(vx, vy);
      if (py >= plot.y && py <= plot.y + plot.height) disc(ctx, sx, py, 4, theme.neutral);
    }
  }

  // Real roots on the axis.
  if (kind === 0 || kind === 1) {
    const roots = kind === 0 ? [num(results.alphaRe), num(results.betaRe)] : [num(results.alphaRe)];
    roots.forEach((x, j) => {
      if (x < x0 || x > x1) return;
      const [rx] = plane.toPx(x, 0);
      disc(ctx, rx, axisY, 5, theme.angle);
      const name = kind === 1 ? "α = β" : j === 0 ? "α" : "β";
      label(ctx, name, rx, axisY - 14, { color: theme.angle, font: theme.fontStrong, align: "center", background: theme.background });
    });
  }

  if (has("location")) {
    const k = num(results.k);
    const [kx] = plane.toPx(k, 0);
    line(ctx, kx, plot.y, kx, plot.y + plot.height, theme.secant, 1.5, [6, 4]);
    label(ctx, "k", kx, plot.y + plot.height - 8, { color: theme.secant, font: theme.fontStrong, align: "center", background: theme.background });
    const fk = num(results.fk);
    const [, ky] = plane.toPx(k, fk);
    if (ky >= plot.y && ky <= plot.y + plot.height) {
      disc(ctx, kx, ky, 5, theme.secant);
      line(ctx, kx, axisY, kx, ky, theme.secant, 2.5);
    }
  }

  if (kind === 2 && has("roots")) {
    // The complex pair, on its own small Argand plane in the half the parabola leaves empty.
    const size = Math.min(112, plot.width * 0.4, plot.height * 0.45);
    const box = { x: plot.x + plot.width - size - 4, y: A > 0 ? plot.y + plot.height - size - 4 : plot.y + 4, width: size, height: size };
    ctx.save();
    ctx.fillStyle = theme.background;
    ctx.globalAlpha = 0.92;
    ctx.fillRect(box.x, box.y, box.width, box.height);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.restore();
    const inset = createPlane(box, [-4, 4], [-4, 4]);
    const [ix, iy] = inset.toPx(0, 0);
    line(ctx, box.x, iy, box.x + box.width, iy, theme.axis, 1);
    line(ctx, ix, box.y, ix, box.y + box.height, theme.axis, 1);
    const [ax, ay] = inset.toPx(num(results.alphaRe), num(results.alphaIm));
    const [bx, by] = inset.toPx(num(results.betaRe), num(results.betaIm));
    line(ctx, ax, ay, bx, by, theme.muted, 1, [3, 3]);
    disc(ctx, ax, ay, 4, theme.cosine);
    disc(ctx, bx, by, 4, theme.cosine);
    label(ctx, "α", ax + 9, ay, { color: theme.cosine, font: theme.fontStrong });
    label(ctx, "β", bx + 9, by, { color: theme.cosine, font: theme.fontStrong });
    label(ctx, "Argand", box.x + 4, box.y + 9, { color: theme.muted, font: theme.font });
  }

  if (!has("labels")) return [];
  const lines: string[] = [];
  const D = n2(num(results.disc));
  const alpha = num(results.alphaRe);
  const beta = num(results.betaRe);
  if (kind === 3) lines.push("a = 0: not a quadratic");
  else if (kind === 0) lines.push(`D = ${D} > 0: two real roots, ${n2(alpha)} and ${n2(beta)}`);
  else if (kind === 1) lines.push(`D = 0: one repeated root, x = ${n2(alpha)}`);
  else {
    const p = num(results.alphaRe);
    const q = n2(num(results.alphaIm));
    lines.push(`D = ${D} < 0: roots ${p === 0 ? "" : `${n2(p)} `}± ${q}i`);
  }

  if (has("location") && kind !== 3) {
    const fk = n2(num(results.fk));
    const where = Math.round(num(results.kLocation));
    lines.push(
      where === 0
        ? `f(k) = ${fk}: no real roots to place k against`
        : where === 1
          ? "f(k) = 0: k is a root"
          : where === 3
            ? `f(k) = ${fk}, a·f(k) < 0: k is between the roots`
            : `f(k) = ${fk}, a·f(k) > 0: both roots ${where === 2 ? "above" : "below"} k`,
    );
  }
  if (has("inequality") && kind !== 3) {
    const set = Math.round(num(results.positiveSet));
    lines.push(
      set === 0
        ? "f(x) > 0 for every x"
        : set === 1
          ? `f(x) > 0 for x < ${n2(alpha)} or x > ${n2(beta)}`
          : set === 2
            ? `f(x) > 0 for ${n2(alpha)} < x < ${n2(beta)}`
            : set === 3
              ? "f(x) > 0 for no x at all"
              : `f(x) > 0 for every x except ${n2(alpha)}`,
    );
  }
  if (lines.length === 1 && kind !== 3) {
    lines.push(`α + β = ${n2(num(results.rootSum))} = −b/a · αβ = ${n2(num(results.rootProduct2))} = c/a`);
  }
  return lines;
}

export const complexRenderer: SimulationRenderer<ComplexLayout> = {
  id: "complex",
  layout: (width, graphs, layers) => computeComplexLayout(width, graphs, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (words: string) => label(ctx, words, width / 2, 13, { color: theme.text, font: theme.fontStrong, align: "center" });

    let lines: string[];
    if (has("unity")) {
      title(`The ${Math.round(num(results.n, 3))} roots of zⁿ = 1`.replace("ⁿ", sup(Math.round(num(results.n, 3)))));
      lines = drawUnity(ctx, layout, results, has, theme);
    } else if (has("parabola")) {
      title(`y = ${polynomialText(num(results.qa), num(results.qb), num(results.qc))}`);
      lines = drawQuadratic(ctx, layout, results, has, theme);
    } else {
      title(has("polar") ? "z in polar form" : has("product") ? "Multiply the lengths, add the angles" : "The Argand plane");
      lines = drawArgand(ctx, layout, results, has, theme);
    }
    // At most two lines of words under the picture: the last two say the most.
    lines.slice(-2).forEach((words, i, shown) => {
      label(ctx, words, width / 2, (shown.length === 1 ? layout.lines[1] : i === 0 ? layout.lines[0] : layout.lines[1]), { color: theme.text, font: theme.font, align: "center" });
    });
  },

  /** Drag z on the Argand plane, or k along the parabola's x-axis. */
  pick(layout, x, y, locked, results): PickResult | null {
    if (layout.view === "unity") return null;
    if (layout.view === "quadratic") {
      const plane = createPlane(layout.plot, COMPLEX_PLOT_X, COMPLEX_PLOT_Y);
      if (locked !== "k" && !plane.contains(x, y, 10)) return null;
      const [kx] = plane.fromPx(x, y);
      return { writes: [{ variable: "k", value: Math.max(-QUADRATIC_K, Math.min(QUADRATIC_K, Math.round(kx * 2) / 2)) }], region: "k" };
    }
    const plane = argandPlane(layout, results);
    if (locked !== "z" && !plane.contains(x, y, 10)) return null;
    const [re, im] = plane.fromPx(x, y);
    const snap = (v: number) => Math.max(-COMPLEX_LIMIT, Math.min(COMPLEX_LIMIT, Math.round(v * 2) / 2));
    return {
      writes: [
        { variable: "a", value: snap(re) },
        { variable: "b", value: snap(im) },
      ],
      region: "z",
    };
  },
};
