/**
 * Thermodynamics, in three pictures.
 *
 * Equilibrium: two blocks pressed together, coloured hot and cold, with an
 * arrow for the heat crossing between them, above a graph of both
 * temperatures closing in on one another as the contact time runs.
 *
 * Process: a cylinder of gas with its piston — insulated, in a bath, free or
 * locked — beside three bars for Q, W and ΔU, above the P–V diagram with the
 * process's path and the work, the area under it, shaded. The isotherm and
 * the steeper adiabat through the same start can be laid over it.
 *
 * Cycle: hot body, engine and cold body with arrows for Q₁, W and Q₂ (all
 * reversed for a refrigerator), beside the piston at the running point, above
 * the cycle on the P–V diagram, its enclosed area shaded as the net work.
 */

import { THERMO_GAS_ORDER, THERMO_PROCESS_ORDER, thermoContact, thermoCyclePoint, type ThermoCycleShape } from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface HeatEngineLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The picture: the bodies, the cylinder and bars, or the engine diagram. */
  top: Box;
  /** The graph underneath: temperature against time, or the P–V diagram. */
  plot: Box;
}

export function computeHeatEngineLayout(width: number): HeatEngineLayout {
  const compact = width < 560;
  const height = 400;
  const left = 52;
  return {
    width,
    height,
    compact,
    top: { x: 16, y: 28, width: width - 32, height: 112 },
    plot: { x: left, y: 172, width: width - left - 16, height: height - 172 - 46 },
  };
}

/** A whole number with a real minus sign. */
const whole = (v: number) => `${Math.round(v) < 0 ? "−" : ""}${Math.abs(Math.round(v))}`;
const fixed = (v: number, digits: number) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

/** The smallest round number at or above `v`, for an axis. */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  for (const s of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (s * mag >= v - 1e-9) return s * mag;
  return 10 * mag;
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

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** A curve through the plane, clipped to it. */
function polyline(ctx: CanvasRenderingContext2D, plane: Plane, points: readonly (readonly [number, number])[], colour: string, lineWidth: number, dash?: number[]) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const [px, py] = plane.toPx(x, y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.stroke();
  ctx.restore();
}

/** A filled region of the plane. */
function region(ctx: CanvasRenderingContext2D, plane: Plane, points: readonly (readonly [number, number])[], colour: string, alpha: number) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.fillStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const [px, py] = plane.toPx(x, y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * A cylinder of gas, its piston at `fill` of the way up. `walls` marks how the
 * gas meets the outside: insulated (thick walls), in a bath, free, or locked.
 */
function cylinder(ctx: CanvasRenderingContext2D, box: Box, fill: number, walls: "insulated" | "bath" | "free" | "locked" | "plain", theme: LabTheme) {
  const { x, y, width: w, height: h } = box;
  const gas = Math.max(4, Math.min(1, fill) * (h - 10));
  const top = y + h - gas;
  rect(ctx, x, top, w, gas, theme.curve, 0.3);
  if (walls === "bath") rect(ctx, x - 6, y + h * 0.35, w + 12, h * 0.65 + 6, theme.sine, 0.18);
  ctx.save();
  ctx.strokeStyle = walls === "insulated" ? theme.reference : theme.axis;
  ctx.lineWidth = walls === "insulated" ? 5 : 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
  rect(ctx, x + 2, top - 6, w - 4, 6, theme.neutral);
  line(ctx, x + w / 2, top - 6, x + w / 2, Math.max(y - 4, top - 30), theme.neutral, 3);
  if (walls === "free") rect(ctx, x + w / 2 - 12, Math.max(y - 4, top - 30) - 10, 24, 10, theme.neutral, 0.8);
  if (walls === "locked") {
    rect(ctx, x - 7, top - 5, 7, 4, theme.angle);
    rect(ctx, x + w, top - 5, 7, 4, theme.angle);
  }
}

const WALLS = { isothermal: "bath", adiabatic: "insulated", isobaric: "free", isochoric: "locked" } as const;
const WALL_WORDS = { isothermal: "in a bath", adiabatic: "insulated", isobaric: "free piston", isochoric: "piston locked" } as const;
const PROCESS_NAMES = { isothermal: "Isothermal", adiabatic: "Adiabatic", isobaric: "Isobaric", isochoric: "Isochoric" } as const;

/** Pressure along a process from (V₁, P₁), kPa, at volume V. */
function processPressure(process: (typeof THERMO_PROCESS_ORDER)[number], V: number, P1: number, V1: number, gamma: number): number {
  if (process === "isothermal") return (P1 * V1) / V;
  if (process === "adiabatic") return P1 * (V1 / V) ** gamma;
  return P1;
}

function drawEquilibrium(ctx: CanvasRenderingContext2D, layout: HeatEngineLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { top, plot } = layout;
  const TA0 = num(results.TA0, 400);
  const TB0 = num(results.TB0, 300);
  const capB = num(results.capB, 1000);
  const t = num(results.tContact);
  const tempA = num(results.tempA, TA0);
  const tempB = num(results.tempB, TB0);
  const settled = num(results.settled) === 1;

  // The two blocks, B's width growing a little with its heat capacity.
  const mid = top.x + top.width / 2;
  const bw = Math.min(110, (top.width - 20) / 2);
  const bwB = bw * (0.6 + 0.4 * Math.min(1, capB / 4000));
  const by = top.y + 18;
  const bh = 58;
  const hue = (T: number, other: number) => (Math.abs(T - other) < 1 ? theme.tangent : T > other ? theme.secant : theme.sine);
  rect(ctx, mid - bw, by, bw, bh, hue(tempA, tempB), 0.4);
  rect(ctx, mid, by, bwB, bh, hue(tempB, tempA), 0.4);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(mid - bw, by, bw, bh);
  ctx.strokeRect(mid, by, bwB, bh);
  ctx.restore();
  label(ctx, "A", mid - bw / 2, by + bh / 2, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "B", mid + bwB / 2, by + bh / 2, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (!settled) {
    const dir = tempA > tempB ? 1 : -1;
    arrow(ctx, mid - 16 * dir, by - 6, mid + 16 * dir, by - 6, { color: theme.angle, width: 2.5, head: 7 });
    label(ctx, "heat", mid + 22, by - 7, { color: theme.angle, font: theme.font });
  }
  if (labels) {
    label(ctx, `${fixed(tempA, 1)} K`, mid - bw / 2, by + bh + 14, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `${fixed(tempB, 1)} K`, mid + bwB / 2, by + bh + 14, { color: theme.text, font: theme.font, align: "center" });
  }

  // Both temperatures against time, drawn only as far as the clock has run.
  const lo = Math.floor((Math.min(TA0, TB0) - 20) / 50) * 50;
  const hi = Math.ceil((Math.max(TA0, TB0) + 20) / 50) * 50;
  const plane = createPlane(plot, [0, 20], [lo, hi]);
  drawPlane(ctx, plane, theme);
  label(ctx, "T / K, against time in contact / s", plot.x - 40, plot.y - 12, { color: theme.muted, font: theme.font });
  const samples = (which: "tempA" | "tempB") =>
    Array.from({ length: 81 }, (_, i) => {
      const s = (t * i) / 80;
      return [s, thermoContact(TA0, TB0, capB, s)[which]] as const;
    });
  if (labels) {
    const [, cy] = plane.toPx(0, num(results.Tcommon));
    line(ctx, plot.x, cy, plot.x + plot.width, cy, theme.tangent, 1.5, [5, 4]);
  }
  if (t > 0) {
    polyline(ctx, plane, samples("tempA"), theme.secant, 2.5);
    polyline(ctx, plane, samples("tempB"), theme.sine, 2.5);
  }
  const [ax, ay] = plane.toPx(t, tempA);
  const [bx, byy] = plane.toPx(t, tempB);
  disc(ctx, ax, ay, 4.5, theme.secant);
  disc(ctx, bx, byy, 4.5, theme.sine);
  label(ctx, "A", ax + 8, ay - (tempA >= tempB ? 8 : -8), { color: theme.secant, font: theme.fontStrong });
  label(ctx, "B", bx + 8, byy + (tempA >= tempB ? 8 : -8), { color: theme.sine, font: theme.fontStrong });

  if (labels) {
    const heat = num(results.heatAB);
    const words = settled
      ? `Both at ${fixed(num(results.Tcommon), 1)} K: in equilibrium`
      : `A ${fixed(tempA, 1)} K · B ${fixed(tempB, 1)} K · ${whole(Math.abs(heat))} J ${heat >= 0 ? "A→B" : "B→A"}`;
    label(ctx, words, layout.width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawProcess(ctx: CanvasRenderingContext2D, layout: HeatEngineLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean, compare: boolean) {
  const { top, plot, compact } = layout;
  const process = THERMO_PROCESS_ORDER[Math.round(num(results.process))] ?? "isothermal";
  const gamma = num(results.gamma, 5 / 3);
  const V1 = num(results.V1, 10);
  const P1 = num(results.P1, 250);
  const V2 = num(results.V2, V1);
  const P2 = num(results.P2, P1);
  const T2 = num(results.T2);
  const W = num(results.W);
  const Q = num(results.Q);
  const dU = num(results.dU);
  const vMax = 32;

  // The cylinder, its volume to the same scale as the diagram's V axis.
  const cw = compact ? 80 : 110;
  cylinder(ctx, { x: top.x + 6, y: top.y + 8, width: cw - 12, height: 84 }, V2 / vMax, WALLS[process], theme);
  label(ctx, WALL_WORDS[process], top.x + cw / 2, top.y + 106, { color: theme.muted, font: theme.font, align: "center" });

  // Q, W and ΔU as bars either side of zero.
  const x0 = top.x + cw + 18;
  const zx = (x0 + 26 + top.x + top.width) / 2;
  const half = top.x + top.width - zx;
  const scale = Math.max(Math.abs(Q), Math.abs(W), Math.abs(dU), 1);
  line(ctx, zx, top.y + 6, zx, top.y + 98, theme.axis, 1.25);
  const rows = [
    { name: "Q", value: Q, colour: theme.secant },
    { name: "W", value: W, colour: theme.sine },
    { name: "ΔU", value: dU, colour: theme.tangent },
  ];
  rows.forEach((row, i) => {
    const y = top.y + 20 + 32 * i;
    label(ctx, row.name, x0, y, { color: row.colour, font: theme.fontStrong });
    const length = (row.value / scale) * half;
    if (Math.abs(length) >= 0.5) rect(ctx, Math.min(zx, zx + length), y - 6, Math.abs(length), 12, row.colour, 0.85);
    if (labels) {
      const words = `${whole(row.value)} J`;
      if (row.value >= 0) label(ctx, words, zx - 4, y, { color: theme.text, font: theme.font, align: "right" });
      else label(ctx, words, zx + 4, y, { color: theme.text, font: theme.font });
    }
  });

  // The P–V diagram.
  const curveTop = compare ? Math.max(P1 * (V1 / 5) ** gamma, (P1 * V1) / 5) : 0;
  const pMax = niceCeil(1.15 * Math.max(P1, P2, curveTop));
  const plane = createPlane(plot, [0, vMax], [0, pMax]);
  drawPlane(ctx, plane, theme);
  label(ctx, "P / kPa, against V / L", plot.x - 40, plot.y - 12, { color: theme.muted, font: theme.font });
  const along = (from: number, to: number, f: (V: number) => number) =>
    Array.from({ length: 61 }, (_, i) => {
      const V = from + ((to - from) * i) / 60;
      return [V, f(V)] as const;
    });

  if (compare) {
    polyline(ctx, plane, along(5, 30, (V) => (P1 * V1) / V), theme.curve, 1.75, [6, 4]);
    polyline(ctx, plane, along(5, 30, (V) => P1 * (V1 / V) ** gamma), theme.cosine, 1.75, [6, 4]);
    const [ix, iy] = plane.toPx(26, (P1 * V1) / 26);
    label(ctx, "isotherm", ix, iy - 10, { color: theme.curve, font: theme.font, align: "center" });
    const [ax, ay] = plane.toPx(6.5, P1 * (V1 / 6.5) ** gamma);
    label(ctx, "adiabat", ax + 8, ay - 6, { color: theme.cosine, font: theme.font });
  }

  if (process === "isochoric") {
    const [x, y1] = plane.toPx(V1, P1);
    const [, y2] = plane.toPx(V1, P2);
    line(ctx, x, y1, x, y2, theme.angle, 3);
  } else {
    polyline(ctx, plane, along(5, 30, (V) => processPressure(process, V, P1, V1, gamma)), theme.reference, 1.25);
    if (Math.abs(V2 - V1) > 1e-9) {
      const path = along(V1, V2, (V) => processPressure(process, V, P1, V1, gamma));
      region(ctx, plane, [[V1, 0], ...path, [V2, 0]], W >= 0 ? theme.sine : theme.secant, 0.28);
      polyline(ctx, plane, path, theme.angle, 3);
      const [mx] = plane.toPx((V1 + V2) / 2, 0);
      const [, my] = plane.toPx(0, Math.min(P1, P2) / 2);
      label(ctx, "W", mx, my, { color: theme.text, font: theme.fontStrong, align: "center" });
    }
  }
  const [sx, sy] = plane.toPx(V1, P1);
  const [ex, ey] = plane.toPx(V2, P2);
  disc(ctx, sx, sy, 4.5, theme.text);
  disc(ctx, ex, ey, 5, theme.angle);
  label(ctx, "1", sx - 8, sy - 9, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "2", ex + 9, ey - 9, { color: theme.angle, font: theme.fontStrong, align: "center" });

  if (labels) {
    label(ctx, `T₂ ${whole(T2)} K · Q ${whole(Q)} J = ΔU ${whole(dU)} J + W ${whole(W)} J`, layout.width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawCycle(ctx: CanvasRenderingContext2D, layout: HeatEngineLayout, results: Record<string, unknown>, theme: LabTheme, labels: boolean, fridge: boolean) {
  const { top, plot } = layout;
  const carnot = num(results.cycle) === 1;
  const shape: ThermoCycleShape = {
    cycle: carnot ? 1 : 0,
    gamma: num(results.gamma, 5 / 3),
    V: [num(results.VA, 10), num(results.VB, 10), num(results.VC, 20), num(results.VD, 20)],
    P: [num(results.PA, 100), num(results.PB, 200), num(results.PC, 200), num(results.PD, 100)],
  };
  const Q1 = num(results.Q1, 1);
  const Q2 = num(results.Q2);
  const W = num(results.Wnet);
  const phase = num(results.phase);
  // A refrigerator runs the same cycle backwards: A → D → C → B → A.
  const at = (s: number) => thermoCyclePoint(shape, fridge ? 4 - s : s);
  const now = at(phase);

  // Hot body, machine, cold body.
  const sx = top.x + 60;
  const hotY = top.y + 2;
  const coldY = top.y + 90;
  const cy = top.y + 56;
  rect(ctx, sx - 50, hotY, 100, 20, theme.secant, 0.35);
  rect(ctx, sx - 50, coldY, 100, 20, theme.sine, 0.35);
  label(ctx, labels ? `hot ${whole(num(results.Thot))} K` : "hot, T₁", sx, hotY + 10, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, labels ? `cold ${whole(num(results.Tcold))} K` : "cold, T₂", sx, coldY + 10, { color: theme.text, font: theme.font, align: "center" });
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(sx, cy, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  const thick = (e: number) => 1.5 + 5 * Math.min(1, Math.abs(e) / Math.max(Q1, 1));
  if (fridge) {
    arrow(ctx, sx, coldY - 1, sx, cy + 16, { color: theme.sine, width: thick(Q2), head: 7 });
    arrow(ctx, sx, cy - 16, sx, hotY + 21, { color: theme.secant, width: thick(Q1), head: 7 });
    arrow(ctx, sx + 54, cy, sx + 17, cy, { color: theme.tangent, width: thick(W), head: 7 });
  } else {
    arrow(ctx, sx, hotY + 21, sx, cy - 16, { color: theme.secant, width: thick(Q1), head: 7 });
    arrow(ctx, sx, cy + 16, sx, coldY - 1, { color: theme.sine, width: thick(Q2), head: 7 });
    arrow(ctx, sx + 17, cy, sx + 54, cy, { color: theme.tangent, width: thick(W), head: 7 });
  }
  label(ctx, "Q₁", sx - 10, (hotY + 20 + cy - 15) / 2, { color: theme.secant, font: theme.fontStrong, align: "right" });
  label(ctx, "Q₂", sx - 10, (cy + 15 + coldY) / 2, { color: theme.sine, font: theme.fontStrong, align: "right" });
  label(ctx, "W", sx + 36, cy - 12, { color: theme.tangent, font: theme.fontStrong, align: "center" });

  // The piston at the running point, to the V axis's scale.
  const vMax = niceCeil(1.08 * Math.max(...shape.V));
  const pMax = niceCeil(1.15 * Math.max(...shape.P));
  const cylW = 34;
  cylinder(ctx, { x: top.x + top.width - cylW, y: top.y + 8, width: cylW, height: 84 }, now.V / vMax, "plain", theme);

  if (labels) {
    const nx = sx + 74;
    const lines = [`Q₁ ${whole(Q1)} J`, `Q₂ ${whole(Q2)} J`, `W ${whole(W)} J`];
    lines.forEach((words, i) => label(ctx, words, nx, top.y + 24 + 26 * i, { color: theme.text, font: theme.font }));
  }

  // The cycle on the P–V diagram.
  const plane = createPlane(plot, [0, vMax], [0, pMax]);
  drawPlane(ctx, plane, theme);
  label(ctx, "P / kPa, against V / L", plot.x - 40, plot.y - 12, { color: theme.muted, font: theme.font });
  const round = Array.from({ length: 241 }, (_, i) => {
    const p = thermoCyclePoint(shape, (4 * i) / 240);
    return [p.V, p.P] as const;
  });
  region(ctx, plane, round, theme.tangent, 0.25);
  // Heat flows in along the hot sides and out along the cold ones.
  const sideColour = carnot ? [theme.secant, theme.neutral, theme.sine, theme.neutral] : [theme.secant, theme.secant, theme.sine, theme.sine];
  for (let k = 0; k < 4; k++) {
    const side = Array.from({ length: 41 }, (_, i) => {
      const p = thermoCyclePoint(shape, k + (0.999999 * i) / 40);
      return [p.V, p.P] as const;
    });
    polyline(ctx, plane, side, sideColour[k]!, 2.5);
    // Which way round: forwards for an engine (clockwise), backwards for a refrigerator.
    const s = fridge ? 4 - (k + 0.5) : k + 0.5;
    const [ax, ay] = plane.toPx(at(s).V, at(s).P);
    const [bx, by] = plane.toPx(at(s + 0.02).V, at(s + 0.02).P);
    const d = Math.hypot(bx - ax, by - ay) || 1;
    arrow(ctx, ax - ((bx - ax) / d) * 6, ay - ((by - ay) / d) * 6, ax + ((bx - ax) / d) * 6, ay + ((by - ay) / d) * 6, { color: theme.text, width: 1.5, head: 7 });
  }
  const offsets = carnot
    ? [[-9, -9], [8, -10], [9, 9], [-9, 10]]
    : [[-9, 9], [-9, -9], [9, -9], [9, 9]];
  ["A", "B", "C", "D"].forEach((name, k) => {
    const [px, py] = plane.toPx(shape.V[k]!, shape.P[k]!);
    label(ctx, name, px + offsets[k]![0]!, py + offsets[k]![1]!, { color: theme.text, font: theme.fontStrong, align: "center" });
  });
  const [dx, dy] = plane.toPx(now.V, now.P);
  disc(ctx, dx, dy, 5, theme.angle);

  if (labels) {
    const words = fridge
      ? `COP = Q₂/W = ${whole(Q2)} J / ${whole(W)} J = ${fixed(num(results.cop), 2)}`
      : carnot
        ? `W ${whole(W)} J · η = 1 − ${whole(num(results.Tcold))}/${whole(num(results.Thot))} = ${fixed(num(results.eta), 2)}`
        : `W ${whole(W)} J · Q₁ ${whole(Q1)} J · η ${fixed(num(results.eta), 2)} (limit ${fixed(num(results.etaCarnot), 2)})`;
    label(ctx, words, layout.width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

export const heatEngineRenderer: SimulationRenderer<HeatEngineLayout> = {
  id: "heatengine",
  layout: (width) => computeHeatEngineLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);
    const title = (words: string) => label(ctx, words, layout.width / 2, 12, { color: theme.text, font: theme.fontStrong, align: "center" });
    const gas = THERMO_GAS_ORDER[Math.round(num(results.gas))] === "di" ? "diatomic" : "monatomic";

    if (has("bodies")) {
      title("Two bodies in contact");
      drawEquilibrium(ctx, layout, results, theme, has("labels"));
    }

    if (has("pv")) {
      const process = THERMO_PROCESS_ORDER[Math.round(num(results.process))] ?? "isothermal";
      const going = num(results.expanding);
      const heating = num(results.T2) - num(results.T1);
      const what =
        process === "isochoric"
          ? heating > 0 ? "heating" : heating < 0 ? "cooling" : "process"
          : going > 0 ? "expansion" : going < 0 ? "compression" : "process";
      title(`${PROCESS_NAMES[process]} ${what} · ${gas} gas`);
      drawProcess(ctx, layout, results, theme, has("labels"), has("compare"));
    }

    if (has("cycle")) {
      const carnot = num(results.cycle) === 1;
      const fridge = has("fridge");
      const name = carnot ? (fridge ? "Carnot refrigerator" : "Carnot engine") : fridge ? "Rectangle cycle, run backwards" : "Rectangle cycle engine";
      title(`${name} · ${gas}`);
      drawCycle(ctx, layout, results, theme, has("labels"), fridge);
    }
  },
};
