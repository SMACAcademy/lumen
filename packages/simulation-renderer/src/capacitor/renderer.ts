/**
 * Potential and capacitance, in three pictures.
 *
 * Field: the point charges (or a conducting sphere in a steady field) to
 * scale, with dashed equipotentials and field lines crossing them at right
 * angles. A probe P, a fixed point A, and two paths between them for the
 * test charge: the work is the same on both.
 *
 * Plates: a parallel-plate capacitor drawn to scale — plate width ∝ √A, gap
 * ∝ d — with its dielectric, the charges on the plates, the field between
 * them, and the battery, connected or switched off.
 *
 * Network: three capacitors in series, in parallel, or mixed, and a charged
 * capacitor sharing its charge with an empty one, with each one's charge and
 * voltage.
 */

import {
  CAP_ARRANGEMENT_ORDER,
  CAP_NETWORK_ORDER,
  CAP_POINT_A,
  CAP_SPHERE_RADIUS,
  CAP_X_RANGE,
  CAP_Y_RANGE,
  capCharges,
  capFieldAt,
  capPotentialAt,
  type CapArrangement,
} from "@ise/physics-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import { createPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface CapacitorLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The window of the field view, at one scale in x and y. */
  plot: Box;
  /** Pixels per centimetre in the field view. */
  scale: number;
  /** Baselines of the two caption lines. */
  captionY: readonly [number, number];
}

export function computeCapacitorLayout(width: number): CapacitorLayout {
  const compact = width < 560;
  const height = 390;
  const spanX = CAP_X_RANGE[1] - CAP_X_RANGE[0];
  const spanY = CAP_Y_RANGE[1] - CAP_Y_RANGE[0];
  const scale = Math.min((width - 24) / spanX, (height - 110) / spanY);
  const plotWidth = spanX * scale;
  return {
    width,
    height,
    compact,
    plot: { x: (width - plotWidth) / 2, y: 30, width: plotWidth, height: spanY * scale },
    scale,
    captionY: [height - 36, height - 14],
  };
}

/** Three significant figures, without a powers-of-ten tail. */
export function capFigures(v: number): string {
  const a = Math.abs(v);
  const s = a >= 100 ? a.toFixed(0) : a >= 10 ? a.toFixed(1) : a >= 1 ? a.toFixed(2) : a >= 0.001 ? a.toPrecision(3) : "0";
  return `${v < 0 && s !== "0" ? "−" : ""}${s}`;
}

const signed = (q: number) => `${q > 0 ? "+" : q < 0 ? "−" : ""}${Math.abs(q)} nC`;

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

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function clip(ctx: CanvasRenderingContext2D, box: Box) {
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
}

// ── Field view ────────────────────────────────────────────────────────────────

type Field = { arrangement: CapArrangement; q1: number; q2: number; s: number };
const potentialOf = (f: Field, x: number, y: number) => capPotentialAt(f.arrangement, f.q1, f.q2, f.s, x, y);
const fieldOf = (f: Field, x: number, y: number) => capFieldAt(f.arrangement, f.q1, f.q2, f.s, x, y);

/** The potentials drawn: doubling outwards for point charges, evenly spaced around the sphere. */
export function capEquipotentialLevels(f: Field): number[] {
  if (f.arrangement === "shell") return Array.from({ length: 40 }, (_, i) => -4875 + 250 * i);
  const levels = [250, 500, 1000, 2000, 4000, 8000];
  const out = [...levels, ...levels.map((v) => -v)];
  if (f.arrangement === "two" && f.q1 * f.q2 < 0) out.push(0);
  return out;
}

/** Equipotentials by marching squares over the plot, one path per level. */
function drawEquipotentials(ctx: CanvasRenderingContext2D, plane: Plane, f: Field, theme: LabTheme, cell: number) {
  const { rect } = plane;
  const nx = Math.max(2, Math.round(rect.width / cell));
  const ny = Math.max(2, Math.round(rect.height / cell));
  const grid: number[][] = [];
  for (let j = 0; j <= ny; j++) {
    const row: number[] = [];
    for (let i = 0; i <= nx; i++) {
      const [x, y] = plane.fromPx(rect.x + (rect.width * i) / nx, rect.y + (rect.height * j) / ny);
      row.push(potentialOf(f, x, y));
    }
    grid.push(row);
  }
  const px = (i: number) => rect.x + (rect.width * i) / nx;
  const py = (j: number) => rect.y + (rect.height * j) / ny;
  ctx.save();
  clip(ctx, rect);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 3]);
  for (const level of capEquipotentialLevels(f)) {
    ctx.strokeStyle = level > 0 ? theme.cosine : level < 0 ? theme.sine : theme.muted;
    ctx.beginPath();
    let any = false;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const corners: [number, number, number][] = [
          [px(i), py(j), grid[j]![i]!],
          [px(i + 1), py(j), grid[j]![i + 1]!],
          [px(i + 1), py(j + 1), grid[j + 1]![i + 1]!],
          [px(i), py(j + 1), grid[j + 1]![i]!],
        ];
        const points: [number, number][] = [];
        for (let k = 0; k < 4; k++) {
          const [x1, y1, v1] = corners[k]!;
          const [x2, y2, v2] = corners[(k + 1) % 4]!;
          if (v1 >= level !== v2 >= level) {
            const t = (level - v1) / (v2 - v1);
            points.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]);
          }
        }
        for (let k = 0; k + 1 < points.length; k += 2) {
          ctx.moveTo(points[k]![0], points[k]![1]);
          ctx.lineTo(points[k + 1]![0], points[k + 1]![1]);
          any = true;
        }
      }
    }
    if (any) ctx.stroke();
  }
  ctx.restore();
}

type Ending = "edge" | "charge" | "sphere" | "long";

/** Follow the field (or against it) from a point, in cm. */
function traceLine(f: Field, x0: number, y0: number, sign: 1 | -1, from: { x: number; y: number } | null): { points: [number, number][]; end: Ending; endCharge: number } {
  const step = 0.2;
  const charges = capCharges(f.arrangement, f.q1, f.q2, f.s).filter((c) => c.q !== 0);
  const points: [number, number][] = [[x0, y0]];
  let x = x0;
  let y = y0;
  const dir = (px: number, py: number): [number, number] => {
    const [ex, ey] = fieldOf(f, px, py);
    const m = Math.hypot(ex, ey);
    return m < 1e-9 ? [0, 0] : [(sign * ex) / m, (sign * ey) / m];
  };
  for (let n = 0; n < 500; n++) {
    const [dx1, dy1] = dir(x, y);
    if (dx1 === 0 && dy1 === 0) return { points, end: "long", endCharge: 0 };
    const [dx, dy] = dir(x + (dx1 * step) / 2, y + (dy1 * step) / 2);
    x += dx * step;
    y += dy * step;
    points.push([x, y]);
    if (x < CAP_X_RANGE[0] - 1 || x > CAP_X_RANGE[1] + 1 || y < CAP_Y_RANGE[0] - 1 || y > CAP_Y_RANGE[1] + 1) return { points, end: "edge", endCharge: 0 };
    if (f.arrangement === "shell" && Math.hypot(x, y) <= CAP_SPHERE_RADIUS) return { points, end: "sphere", endCharge: 0 };
    for (const c of charges) {
      if (from && c.x === from.x && c.y === from.y) continue;
      if (Math.hypot(x - c.x, y - c.y) < 0.4) return { points, end: "charge", endCharge: c.q };
    }
  }
  return { points, end: "long", endCharge: 0 };
}

/** The field lines worth drawing, each with the direction the field runs along it. */
export function capFieldLines(f: Field): { points: [number, number][]; sign: 1 | -1 }[] {
  const out: { points: [number, number][]; sign: 1 | -1 }[] = [];
  if (f.arrangement === "shell") {
    for (let y = -9; y <= 9 + 1e-9; y += 1.5) out.push({ points: traceLine(f, CAP_X_RANGE[0], y, 1, null).points, sign: 1 });
    for (let k = 0; k < 24; k++) {
      const a = (2 * Math.PI * k) / 24;
      const r = CAP_SPHERE_RADIUS + 0.05;
      const [x, y] = [r * Math.cos(a), r * Math.sin(a)];
      const [ex, ey] = fieldOf(f, x, y);
      if (ex * Math.cos(a) + ey * Math.sin(a) > 1) out.push({ points: traceLine(f, x, y, 1, null).points, sign: 1 });
    }
    for (let y = -9; y <= 9 + 1e-9; y += 1.5) {
      const back = traceLine(f, CAP_X_RANGE[1], y, -1, null);
      if (back.end === "sphere") out.push({ points: back.points, sign: -1 });
    }
    return out;
  }
  const charges = capCharges(f.arrangement, f.q1, f.q2, f.s).filter((c) => c.q !== 0);
  const biggest = Math.max(0, ...charges.map((c) => Math.abs(c.q)));
  for (const c of charges) {
    const count = Math.max(4, Math.round((12 * Math.abs(c.q)) / biggest));
    const sign: 1 | -1 = c.q > 0 ? 1 : -1;
    for (let k = 0; k < count; k++) {
      const a = (2 * Math.PI * (k + 0.5)) / count;
      const traced = traceLine(f, c.x + 0.45 * Math.cos(a), c.y + 0.45 * Math.sin(a), sign, c);
      // A line from a negative charge that ends on a positive one is already drawn from there.
      if (sign < 0 && traced.end === "charge" && traced.endCharge > 0) continue;
      out.push({ points: traced.points, sign });
    }
  }
  return out;
}

function drawFieldLines(ctx: CanvasRenderingContext2D, plane: Plane, f: Field, theme: LabTheme) {
  ctx.save();
  clip(ctx, plane.rect);
  for (const { points, sign } of capFieldLines(f)) {
    if (points.length < 2) continue;
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      const [sx, sy] = plane.toPx(x, y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    ctx.restore();
    // An arrowhead part-way along, pointing the way the field runs.
    const m = Math.min(points.length - 2, Math.max(1, Math.round(points.length * 0.35)));
    const [ax, ay] = plane.toPx(...points[m]!);
    const [bx, by] = plane.toPx(...points[m + 1]!);
    const [tx, ty] = sign > 0 ? [bx, by] : [ax, ay];
    const [fx, fy] = sign > 0 ? [ax, ay] : [bx, by];
    const len = Math.hypot(tx - fx, ty - fy);
    if (len > 0.1 && plane.contains(tx, ty)) {
      arrow(ctx, tx - ((tx - fx) / len) * 7, ty - ((ty - fy) / len) * 7, tx, ty, { color: theme.angle, width: 1.3, head: 6 });
    }
  }
  ctx.restore();
}

function drawFieldView(ctx: CanvasRenderingContext2D, layout: CapacitorLayout, results: Record<string, unknown>, has: (l: string) => boolean, theme: LabTheme) {
  const { plot, captionY, width } = layout;
  const arrangement = CAP_ARRANGEMENT_ORDER[Math.round(num(results.arrangement))] ?? "one";
  const f: Field = { arrangement, q1: num(results.q1), q2: num(results.q2), s: num(results.separation, 6) };
  const plane = createPlane(plot, CAP_X_RANGE, CAP_Y_RANGE);
  const title = arrangement === "one" ? "One point charge" : arrangement === "two" ? "Two point charges" : "A conducting sphere in a steady field";
  label(ctx, title, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(plot.x, plot.y, plot.width, plot.height);
  ctx.restore();

  if (has("equipotentials")) drawEquipotentials(ctx, plane, f, theme, layout.compact ? 5 : 6);
  if (has("fieldLines")) drawFieldLines(ctx, plane, f, theme);

  if (arrangement === "shell") {
    const [cx, cy] = plane.toPx(0, 0);
    const r = CAP_SPHERE_RADIUS * layout.scale;
    disc(ctx, cx, cy, r, theme.neutral, 0.28);
    ctx.save();
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    // Induced charge on the surface: σ = ε₀ × (the field just outside, along the outward normal).
    for (let k = 0; k < 12; k++) {
      const a = (2 * Math.PI * k) / 12;
      const R = CAP_SPHERE_RADIUS + 0.02;
      const [ex, ey] = fieldOf(f, R * Math.cos(a), R * Math.sin(a));
      const normal = ex * Math.cos(a) + ey * Math.sin(a);
      if (Math.abs(normal) < 300) continue;
      label(ctx, normal > 0 ? "+" : "−", cx + (r - 7) * Math.cos(a), cy - (r - 7) * Math.sin(a), {
        color: normal > 0 ? theme.cosine : theme.sine,
        font: theme.fontStrong,
        align: "center",
      });
    }
    label(ctx, `Q ${signed(f.q1)}`, cx, cy + r + 10, { color: theme.text, font: theme.font, align: "center" });
  } else {
    capCharges(arrangement, f.q1, f.q2, f.s).forEach((c, i) => {
      const [x, y] = plane.toPx(c.x, c.y);
      const colour = c.q > 0 ? theme.cosine : c.q < 0 ? theme.sine : theme.muted;
      disc(ctx, x, y, 9, colour);
      label(ctx, c.q > 0 ? "+" : c.q < 0 ? "−" : "0", x, y, { color: theme.background, font: theme.fontStrong, align: "center" });
      const name = arrangement === "one" ? "q" : i === 0 ? "q₁" : "q₂";
      const right = arrangement === "two" && i === 1;
      label(ctx, `${name} ${signed(c.q)}`, right ? x + 4 : x - 4, y + 20, { color: theme.text, font: theme.font, align: right ? "left" : "right" });
    });
  }

  if (has("probe")) {
    const [ax, ay] = plane.toPx(CAP_POINT_A[0], CAP_POINT_A[1]);
    const [px, py] = plane.toPx(num(results.px), num(results.py));
    // Two ways from A to P: the work is the same on both.
    ctx.save();
    clip(ctx, plot);
    ctx.strokeStyle = theme.tangent;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([2, 4]);
    for (const bow of [-0.35, 0.35]) {
      const mx = (ax + px) / 2 - (py - ay) * bow;
      const my = (ay + py) / 2 + (px - ax) * bow;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(mx, my, px, py);
      ctx.stroke();
    }
    ctx.restore();
    disc(ctx, ax, ay, 4.5, theme.tangent);
    label(ctx, "A", ax - 8, ay - 10, { color: theme.tangent, font: theme.fontStrong, align: "center" });
    const ex = num(results.fieldX);
    const ey = num(results.fieldY);
    const m = Math.hypot(ex, ey);
    if (m > 1e-6) arrow(ctx, px, py, px + (ex / m) * 26, py - (ey / m) * 26, { color: theme.secant, width: 2.2, head: 7 });
    disc(ctx, px, py, 5, theme.point);
    label(ctx, "P", px + 8, py - 10, { color: theme.text, font: theme.fontStrong, align: "center" });
  }

  if (has("labels")) {
    const caption = (words: string, y: number) => label(ctx, words, width / 2, y, { color: theme.text, font: theme.font, align: "center" });
    const v = num(results.potential);
    const e = num(results.field);
    if (arrangement === "shell" && num(results.inside) === 1) {
      caption(`inside the conductor: E = 0, V = ${capFigures(v)} V`, captionY[0]);
    } else {
      caption(`at P: V = ${capFigures(v)} V · E = ${capFigures(e)} kV/m`, captionY[0]);
    }
    const work = `W(A→P) = q₀ΔV = ${capFigures(num(results.work))} µJ, any path`;
    caption(arrangement === "two" ? `${work.replace(", any path", "")} · U = ${capFigures(num(results.pairEnergy))} µJ` : work, captionY[1]);
  }
}

// ── Plates view ───────────────────────────────────────────────────────────────

function drawBattery(ctx: CanvasRenderingContext2D, x: number, y: number, theme: LabTheme) {
  // Long plate (+) on top, short plate (−) below.
  line(ctx, x - 13, y - 4, x + 13, y - 4, theme.text, 2.5);
  line(ctx, x - 7, y + 4, x + 7, y + 4, theme.text, 4);
}

function drawPlatesView(ctx: CanvasRenderingContext2D, layout: CapacitorLayout, results: Record<string, unknown>, has: (l: string) => boolean, theme: LabTheme) {
  const { width, captionY } = layout;
  label(ctx, "A parallel-plate capacitor", width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  const area = num(results.area, 100);
  const gap = num(results.gap, 1);
  const k = num(results.dielectric, 1);
  const q = num(results.plateCharge);
  const connected = num(results.connected) === 1;
  const batteryX = 40;
  const left = 84;
  const right = width - 16;
  const maxWidth = Math.min(right - left, 300);
  const plateWidth = Math.max(24, (maxWidth * Math.sqrt(area)) / 20);
  const cx = (left + right) / 2;
  const cy = 170;
  const gapPx = clamp(gap * 14, 7, 140);
  const top = cy - gapPx / 2;
  const bottom = cy + gapPx / 2;
  const x1 = cx - plateWidth / 2;
  const x2 = cx + plateWidth / 2;

  // The dielectric slab fills the gap.
  if (k > 1) {
    ctx.save();
    ctx.fillStyle = theme.curve;
    ctx.globalAlpha = clamp(0.12 + 0.05 * (k - 1), 0.12, 0.55);
    ctx.fillRect(x1, top, plateWidth, gapPx);
    ctx.restore();
  }

  if (has("fieldLines") && q > 0) {
    const n = Math.max(2, Math.min(7, Math.floor(plateWidth / 30)));
    for (let i = 0; i < n; i++) {
      const x = x1 + (plateWidth * (i + 0.5)) / n;
      arrow(ctx, x, top + 3, x, bottom - 3, { color: theme.angle, width: 1.4, head: Math.min(6, gapPx / 3), alpha: 0.85 });
    }
  }
  if (has("equipotentials")) {
    for (const t of [0.25, 0.5, 0.75]) line(ctx, x1, top + gapPx * t, x2, top + gapPx * t, theme.tangent, 1, [4, 3]);
  }

  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.fillRect(x1, top - 6, plateWidth, 6);
  ctx.fillRect(x1, bottom, plateWidth, 6);
  ctx.restore();

  // Charges on the plates: more marks for more charge.
  const marks = q > 0 ? Math.round(clamp(2 + 2 * Math.log(1 + q), 2, 14)) : 0;
  for (let i = 0; i < marks; i++) {
    const x = x1 + (plateWidth * (i + 0.5)) / marks;
    label(ctx, "+", x, top - 14, { color: theme.cosine, font: theme.fontStrong, align: "center" });
    label(ctx, "−", x, bottom + 14, { color: theme.sine, font: theme.fontStrong, align: "center" });
  }

  // Wires to the battery, with a switch in the top wire.
  const topWire = top - 3;
  const bottomWire = bottom + 3;
  const switchX = (batteryX + x1) / 2;
  line(ctx, x1, topWire, switchX + 9, topWire, theme.text, 1.5);
  line(ctx, batteryX, topWire, switchX - 9, topWire, theme.text, 1.5);
  if (connected) line(ctx, switchX - 9, topWire, switchX + 9, topWire, theme.text, 1.5);
  else line(ctx, switchX - 9, topWire, switchX + 7, topWire - 12, theme.text, 1.5);
  disc(ctx, switchX - 9, topWire, 2.5, theme.text);
  disc(ctx, switchX + 9, topWire, 2.5, theme.text);
  line(ctx, batteryX, topWire, batteryX, cy - 4, theme.text, 1.5);
  line(ctx, batteryX, cy + 4, batteryX, bottomWire, theme.text, 1.5);
  line(ctx, batteryX, bottomWire, x1, bottomWire, theme.text, 1.5);
  drawBattery(ctx, batteryX, cy, theme);
  label(ctx, `${num(results.batteryVoltage)} V`, batteryX, cy + 22, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, connected ? "battery on" : "battery off", switchX, topWire - 22, { color: connected ? theme.tangent : theme.secant, font: theme.font, align: "center" });
  label(ctx, `A = ${area} cm² · d = ${gap} mm · ${k > 1 ? `K = ${k}` : "air"}`, cx, Math.min(bottom + 34, captionY[0] - 22), { color: theme.muted, font: theme.font, align: "center" });

  if (has("labels")) {
    const caption = (words: string, y: number) => label(ctx, words, width / 2, y, { color: theme.text, font: theme.font, align: "center" });
    caption(`C = ${capFigures(num(results.capacitance))} pF · Q = ${capFigures(q)} nC · V = ${capFigures(num(results.plateVoltage))} V`, captionY[0]);
    caption(`E = V/d = ${capFigures(num(results.plateField))} kV/m · U = ${capFigures(num(results.plateEnergy))} µJ`, captionY[1]);
  }
}

// ── Network view ──────────────────────────────────────────────────────────────

/** A capacitor on a wire: two plates across the wire, at (x, y). */
function capacitorSymbol(ctx: CanvasRenderingContext2D, x: number, y: number, vertical: boolean, theme: LabTheme) {
  ctx.save();
  ctx.fillStyle = theme.background;
  if (vertical) ctx.fillRect(x - 15, y - 4, 30, 8);
  else ctx.fillRect(x - 4, y - 15, 8, 30);
  ctx.restore();
  if (vertical) {
    line(ctx, x - 13, y - 4, x + 13, y - 4, theme.sine, 3);
    line(ctx, x - 13, y + 4, x + 13, y + 4, theme.sine, 3);
  } else {
    line(ctx, x - 4, y - 13, x - 4, y + 13, theme.sine, 3);
    line(ctx, x + 4, y - 13, x + 4, y + 13, theme.sine, 3);
  }
}

function drawNetworkView(ctx: CanvasRenderingContext2D, layout: CapacitorLayout, results: Record<string, unknown>, has: (l: string) => boolean, theme: LabTheme) {
  const { width, captionY } = layout;
  const network = CAP_NETWORK_ORDER[Math.round(num(results.network))] ?? "series";
  const c = [num(results.c1, 1), num(results.c2, 1), num(results.c3, 1)];
  const q = [num(results.capQ1), num(results.capQ2), num(results.capQ3)];
  const v = [num(results.capV1), num(results.capV2), num(results.capV3)];
  const names = ["C₁", "C₂", "C₃"];
  const titles = { series: "Capacitors in series", parallel: "Capacitors in parallel", mixed: "C₁ in series with C₂ ∥ C₃", share: "A charged C₁ shares with an empty C₂" };
  label(ctx, titles[network], width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  const topY = 100;
  const bottomY = 220;
  const midY = (topY + bottomY) / 2;
  const batteryX = 36;
  const left = 80;
  const right = width - 30;
  const span = right - left;
  const at = (t: number) => left + span * t;
  const words = has("labels");

  /** Name above, charge and voltage below, centred on x. */
  const tag = (i: number, x: number, nameY: number, valueY: number) => {
    label(ctx, `${names[i]} ${c[i]} µF`, x, nameY, { color: theme.sine, font: theme.font, align: "center" });
    if (!words) return;
    label(ctx, `${capFigures(q[i]!)} µC`, x, valueY, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `${capFigures(v[i]!)} V`, x, valueY + 14, { color: theme.text, font: theme.font, align: "center" });
  };

  if (network !== "share") {
    const end = network === "series" ? right : network === "parallel" ? at(0.85) : at(0.92);
    line(ctx, batteryX, topY, end, topY, theme.text, 1.5);
    line(ctx, batteryX, bottomY, end, bottomY, theme.text, 1.5);
    line(ctx, batteryX, topY, batteryX, midY - 4, theme.text, 1.5);
    line(ctx, batteryX, midY + 4, batteryX, bottomY, theme.text, 1.5);
    drawBattery(ctx, batteryX, midY, theme);
    label(ctx, `${num(results.batteryVoltage)} V`, batteryX, midY + 22, { color: theme.text, font: theme.font, align: "center" });
  }

  if (network === "series") {
    line(ctx, right, topY, right, bottomY, theme.text, 1.5);
    [0.12, 0.5, 0.88].forEach((t, i) => {
      capacitorSymbol(ctx, at(t), topY, false, theme);
      tag(i, at(t), topY - 26, topY + 28);
    });
  } else if (network === "parallel") {
    [0.15, 0.5, 0.85].forEach((t, i) => {
      line(ctx, at(t), topY, at(t), bottomY, theme.text, 1.5);
      capacitorSymbol(ctx, at(t), midY, true, theme);
      tag(i, at(t), bottomY + 18, bottomY + 34);
    });
  } else if (network === "mixed") {
    capacitorSymbol(ctx, at(0.15), topY, false, theme);
    tag(0, at(0.15), topY - 26, topY + 28);
    [0.58, 0.92].forEach((t, i) => {
      line(ctx, at(t), topY, at(t), bottomY, theme.text, 1.5);
      capacitorSymbol(ctx, at(t), midY, true, theme);
      tag(i + 1, at(t), bottomY + 18, bottomY + 34);
    });
  } else {
    // C₁ (charged on its own battery, now removed) joined across the empty C₂.
    const a = at(0.2);
    const b = at(0.8);
    line(ctx, a, topY, b, topY, theme.text, 1.5);
    line(ctx, a, bottomY, b, bottomY, theme.text, 1.5);
    for (const [i, x] of [[0, a], [1, b]] as const) {
      line(ctx, x, topY, x, bottomY, theme.text, 1.5);
      capacitorSymbol(ctx, x, midY, true, theme);
      tag(i, x, bottomY + 18, bottomY + 34);
    }
    label(ctx, `C₁ was charged to ${num(results.batteryVoltage)} V`, width / 2, topY - 30, { color: theme.muted, font: theme.font, align: "center" });
  }

  if (words) {
    const caption = (text: string, y: number) => label(ctx, text, width / 2, y, { color: theme.text, font: theme.font, align: "center" });
    if (network === "share") {
      caption(`shared V = ${capFigures(v[0]!)} V · total Q = ${capFigures(num(results.netCharge))} µC`, captionY[0]);
      caption(`U: ${capFigures(num(results.energyBefore))} → ${capFigures(num(results.netEnergy))} µJ, ${capFigures(num(results.energyLost))} µJ lost`, captionY[1]);
    } else {
      caption(`C_eq = ${capFigures(num(results.ceq))} µF · Q = ${capFigures(num(results.netCharge))} µC`, captionY[0]);
      caption(`U = ½C_eq V² = ${capFigures(num(results.netEnergy))} µJ`, captionY[1]);
    }
  }
}

export const capacitorRenderer: SimulationRenderer<CapacitorLayout> = {
  id: "capacitor",
  layout: (width) => computeCapacitorLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);
    if (has("field")) drawFieldView(ctx, layout, results, has, theme);
    else if (has("plates")) drawPlatesView(ctx, layout, results, has, theme);
    else if (has("network")) drawNetworkView(ctx, layout, results, has, theme);
  },
};
