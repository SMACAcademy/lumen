/**
 * Fluids in motion and surface tension, one scene per layer.
 *
 * lift: two oil-filled cylinders joined at the bottom, a push on the small
 * piston and a car on the large one.
 * pipe: a venturi tube with water moving through it — the particles crowd
 * together and speed up in the throat — and an open tube on each part whose
 * water column is the pressure there.
 * tank: Torricelli's jet from a hole in the side of a tank of water.
 * shear: a plate dragged over a layer of liquid, the arrows of the velocity
 * gradient between.
 * fall: a ball sinking through a column of liquid, the forces on it, and its
 * velocity–time curve rising to the terminal velocity (layer "graph").
 * reynolds: a dye streak in a pipe, smooth or broken up.
 * drops: a drop or a bubble and the pressure inside it.
 * capillary: a glass tube dipped in a trough, the liquid standing above or
 * below the level outside.
 *
 * Numbers a level asks for are drawn only with the "labels" layer.
 */

import {
  FLOW_BALL_ORDER,
  FLOW_BALLS,
  FLOW_CAR_MASS,
  FLOW_COLUMN_DEPTH,
  FLOW_FILM_ORDER,
  FLOW_FILMS,
  FLOW_GRAVITY,
  FLOW_LIQUID_ORDER,
  FLOW_LIQUIDS,
  FLOW_MAX_STROKE,
  FLOW_TANK_HEIGHT,
  FLOW_WIDE_AREA,
} from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface FlowLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Top of the drawing (under the title) and the line the caption sits on. */
  top: number;
  captionY: number;
}

export function computeFlowLayout(width: number): FlowLayout {
  const compact = width < 560;
  const height = compact ? 380 : 400;
  return { width, height, compact, top: 30, captionY: height - 14 };
}

const fixed = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

/** Three significant figures, with a power of ten for very small or large values. */
export function flowSig(v: number, figures = 3): string {
  if (v === 0 || !Number.isFinite(v)) return "0";
  const a = Math.abs(v);
  if (a >= 1e-3 && a < 1e5) {
    const digits = Math.max(0, figures - 1 - Math.floor(Math.log10(a)));
    return `${v < 0 ? "−" : ""}${Number(a.toPrecision(figures)).toFixed(digits)}`;
  }
  const exponent = Math.floor(Math.log10(a));
  const mantissa = a / 10 ** exponent;
  const sup = String(exponent).replace(/-/g, "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]!);
  return `${v < 0 ? "−" : ""}${mantissa.toFixed(figures - 1)} × 10${sup}`;
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

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, w, h);
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

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 1.5) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A smooth, repeatable wobble in [−1, 1] for the turbulent dye. */
const wobble = (a: number, b: number) => Math.sin(a * 1.7 + b * 2.3) * 0.6 + Math.sin(a * 3.1 - b * 1.3) * 0.4;

type Draw = {
  ctx: CanvasRenderingContext2D;
  layout: FlowLayout;
  theme: LabTheme;
  r: (key: string, fallback?: number) => number;
  labels: boolean;
  title: (words: string) => void;
  caption: (words: string, line?: number) => void;
  text: (words: string, x: number, y: number, colour: string, align?: CanvasTextAlign, strong?: boolean) => void;
};

// ── Lift ────────────────────────────────────────────────────────────────────

function drawLift({ ctx, layout, theme, r, labels, title, caption, text }: Draw) {
  const { width, height } = layout;
  title("A hydraulic lift");
  const a1 = r("smallArea", 10);
  const a2 = r("largeArea", 500);
  const k = (0.36 * width) / Math.sqrt(2000);
  const w1 = Math.max(6, k * Math.sqrt(a1));
  const w2 = Math.max(12, k * Math.sqrt(a2));
  const cx1 = 16 + 0.2 * width;
  const cx2 = width - 16 - 0.22 * width;
  const rest = 130;
  const floor = height - 86;
  const perCm = (floor - rest - 40) / FLOW_MAX_STROKE;
  const y1 = rest + r("stroke") * perCm;
  const y2 = rest - r("rise") * perCm;

  // Oil, then the walls.
  box(ctx, cx1 - w1 / 2, y1, w1, floor - y1, theme.angle, 0.35);
  box(ctx, cx2 - w2 / 2, y2, w2, floor - y2, theme.angle, 0.35);
  box(ctx, cx1 - w1 / 2, floor, cx2 - cx1 + w1 / 2 + w2 / 2, 18, theme.angle, 0.35);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx1 - w1 / 2, rest - 30);
  ctx.lineTo(cx1 - w1 / 2, floor + 18);
  ctx.lineTo(cx2 + w2 / 2, floor + 18);
  ctx.lineTo(cx2 + w2 / 2, rest - 60);
  ctx.moveTo(cx1 + w1 / 2, rest - 30);
  ctx.lineTo(cx1 + w1 / 2, floor);
  ctx.lineTo(cx2 - w2 / 2, floor);
  ctx.lineTo(cx2 - w2 / 2, rest - 60);
  ctx.stroke();
  ctx.restore();

  // Pistons.
  box(ctx, cx1 - w1 / 2, y1 - 6, w1, 6, theme.neutral);
  box(ctx, cx2 - w2 / 2, y2 - 6, w2, 6, theme.neutral);
  arrow(ctx, cx1, y1 - 48, cx1, y1 - 8, { color: theme.secant, width: 2.5, head: 8 });
  text(`F₁ = ${fixed(r("effort"), 0)} N`, cx1, y1 - 58, theme.secant, "center", true);

  // The car sits on the large piston.
  const carW = Math.min(w2 - 6, 70);
  const carTop = y2 - 6 - 26;
  box(ctx, cx2 - carW / 2, carTop + 8, carW, 14, theme.sine, 0.85);
  box(ctx, cx2 - carW * 0.3, carTop, carW * 0.6, 10, theme.sine, 0.85);
  disc(ctx, cx2 - carW * 0.3, carTop + 23, 4, theme.text);
  disc(ctx, cx2 + carW * 0.3, carTop + 23, 4, theme.text);
  text(`${FLOW_CAR_MASS} kg`, cx2, carTop - 9, theme.sine, "center");

  text(`A₁ = ${fixed(a1, 0)} cm²`, cx1, floor + 32, theme.muted, "center");
  text(`A₂ = ${fixed(a2, 0)} cm²`, cx2, floor + 32, theme.muted, "center");

  if (labels) {
    const lifts = r("lifts") === 1;
    caption(`F₂ = ${fixed(r("liftForce"), 0)} N, ${lifts ? "enough to lift the car" : "less than the car's 9800 N"}`, 1);
    caption(`P = ${fixed(r("liftPressure"), 1)} kPa · pushed ${fixed(r("stroke"), 1)} cm, car up ${fixed(r("rise"), 2)} cm`);
  }
}

// ── Pipe ────────────────────────────────────────────────────────────────────

function drawPipe(d: Draw, streamlines: boolean) {
  const { ctx, layout, theme, r, labels, title, caption, text } = d;
  const { width } = layout;
  title("Water through a narrowing pipe");
  const a2 = r("throatArea", 3);
  const v1 = r("inletSpeed", 0.4);
  const left = 16;
  const right = width - 16;
  const x1 = left + 0.3 * (right - left);
  const x2 = left + 0.42 * (right - left);
  const x3 = left + 0.58 * (right - left);
  const x4 = left + 0.7 * (right - left);
  const cy = 252;
  const wide = 32;
  const narrow = wide * Math.sqrt(a2 / FLOW_WIDE_AREA);
  /** Half-height of the pipe at x. */
  const half = (x: number) => {
    if (x <= x1 || x >= x4) return wide;
    if (x >= x2 && x <= x3) return narrow;
    const f = x < x2 ? (x - x1) / (x2 - x1) : (x4 - x) / (x4 - x3);
    return wide + (narrow - wide) * (0.5 - 0.5 * Math.cos(Math.PI * f));
  };

  // The water, then the walls.
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) {
    const x = left + ((right - left) * i) / 80;
    if (i === 0) ctx.moveTo(x, cy - half(x));
    else ctx.lineTo(x, cy - half(x));
  }
  for (let i = 80; i >= 0; i--) {
    const x = left + ((right - left) * i) / 80;
    ctx.lineTo(x, cy + half(x));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  for (const sign of [-1, 1]) {
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const x = left + ((right - left) * i) / 80;
      if (i === 0) ctx.moveTo(x, cy + sign * half(x));
      else ctx.lineTo(x, cy + sign * half(x));
    }
    ctx.stroke();
    ctx.restore();
  }

  const rows = [-0.7, -0.35, 0, 0.35, 0.7];
  if (streamlines) {
    for (const f of rows) {
      ctx.save();
      ctx.strokeStyle = theme.sine;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 80; i++) {
        const x = left + ((right - left) * i) / 80;
        if (i === 0) ctx.moveTo(x, cy + f * half(x));
        else ctx.lineTo(x, cy + f * half(x));
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  // Particles evenly spaced by the volume that has passed, so they crowd
  // together nowhere and race through the throat: dx/dt = v₁A₁/A(x).
  const n = 60;
  const cumulative: number[] = [0];
  const xs: number[] = [left];
  for (let i = 1; i <= n; i++) {
    const x = left + ((right - left) * i) / n;
    const mid = x - (right - left) / (2 * n);
    const areaRatio = (half(mid) / wide) ** 2;
    cumulative.push(cumulative[i - 1]! + ((right - left) / n) * areaRatio);
    xs.push(x);
  }
  const total = cumulative[n]!;
  const spacing = total / 9;
  const shift = ((r("clock") * v1 * 120) % spacing + spacing) % spacing;
  for (let u = shift; u < total; u += spacing) {
    let i = 1;
    while (i < n && cumulative[i]! < u) i++;
    const f = (u - cumulative[i - 1]!) / (cumulative[i]! - cumulative[i - 1]!);
    const x = xs[i - 1]! + f * (xs[i]! - xs[i - 1]!);
    for (const row of rows) disc(ctx, x, cy + row * half(x), 2.5, theme.sine);
  }

  // Open tubes standing on the wide part and on the throat.
  const perCm = 3.2;
  const tubes = [
    { x: left + 0.15 * (right - left), head: r("wideHead", 50), top: cy - wide, name: "h₁" },
    { x: (x2 + x3) / 2, head: r("throatHead"), top: cy - narrow, name: "h₂" },
  ];
  for (const tube of tubes) {
    const surface = cy - Math.max(0, tube.head) * perCm;
    box(ctx, tube.x - 5, surface, 10, tube.top - surface, theme.sine, 0.55);
    line(ctx, tube.x - 6, 40, tube.x - 6, tube.top, theme.axis, 1.5);
    line(ctx, tube.x + 6, 40, tube.x + 6, tube.top, theme.axis, 1.5);
    text(tube.name, tube.x + 12, surface, theme.sine, "left", true);
    if (labels) text(`${fixed(tube.head, 1)} cm`, tube.x + 12, surface + 15, theme.muted);
  }

  text(`A₁ = ${fixed(FLOW_WIDE_AREA, 0)} cm²`, left + 0.15 * (right - left), cy + wide + 14, theme.muted, "center");
  text(`A₂ = ${fixed(a2, 1)} cm²`, (x2 + x3) / 2, cy + wide + 14, theme.muted, "center");
  arrow(ctx, left + 4, cy, left + 34, cy, { color: theme.tangent, width: 2.5, head: 7 });

  if (labels) {
    text(`v₁ = ${fixed(v1, 2)} m/s`, left + 0.15 * (right - left), cy + wide + 30, theme.tangent, "center");
    text(`v₂ = ${fixed(r("throatSpeed"), 2)} m/s`, (x2 + x3) / 2 + 30, cy + wide + 30, theme.tangent, "left");
    caption(`faster in the throat, so ${fixed(r("pressureDrop"), 0)} Pa lower pressure`);
  }
}

// ── Tank ────────────────────────────────────────────────────────────────────

function drawTank({ ctx, layout, theme, r, labels, title, caption, text }: Draw) {
  const { width, height } = layout;
  title("Water from a hole in a tank");
  const h = r("holeDepth", 0.2);
  const v = r("effluxSpeed");
  const ground = height - 52;
  const tankW = 56;
  const tankLeft = 18;
  const s = Math.min((ground - 64) / (FLOW_TANK_HEIGHT * 1.1), (width - tankLeft - tankW - 24) / 1.02);
  const surface = ground - FLOW_TANK_HEIGHT * s;
  const holeX = tankLeft + tankW;
  const holeY = surface + h * s;

  line(ctx, 8, ground, width - 8, ground, theme.neutral, 3);
  box(ctx, tankLeft, surface, tankW, ground - surface, theme.sine, 0.35);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tankLeft, surface - 16);
  ctx.lineTo(tankLeft, ground);
  ctx.lineTo(holeX, ground);
  ctx.lineTo(holeX, holeY + 3);
  ctx.moveTo(holeX, holeY - 3);
  ctx.lineTo(holeX, surface - 16);
  ctx.stroke();
  ctx.restore();

  // The jet: x = vt, y = ½gt², until it reaches the ground.
  const fallTime = Math.sqrt((2 * (FLOW_TANK_HEIGHT - h)) / FLOW_GRAVITY);
  const at = (t: number): [number, number] => [holeX + v * t * s, holeY + 0.5 * FLOW_GRAVITY * t * t * s];
  ctx.save();
  ctx.strokeStyle = theme.sine;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const [x, y] = at((fallTime * i) / 40);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  const phase = (r("clock") % fallTime) / fallTime;
  for (let i = 0; i < 4; i++) {
    const [x, y] = at(fallTime * ((phase + i / 4) % 1));
    disc(ctx, x, y, 3, theme.sine);
  }
  const [landX] = at(fallTime);

  // h from the surface down to the hole.
  arrow(ctx, holeX + 10, surface, holeX + 10, holeY, { color: theme.angle, width: 1.5, head: 6, double: true });
  text(`h = ${fixed(h, 2)} m`, holeX + 16, surface + (holeY - surface) / 2, theme.angle, "left", true);
  text("1 m", tankLeft + tankW / 2, surface - 26, theme.muted, "center");

  if (labels) {
    text(`v = ${fixed(v, 2)} m/s`, holeX + 16, holeY + 14, theme.sine);
    text(`${fixed(r("jetRange"), 2)} m`, landX, ground + 14, theme.text, "center");
    caption(`v = √(2gh) = ${fixed(v, 2)} m/s, lands ${fixed(r("jetRange"), 2)} m away`);
  }
}

// ── Shear ───────────────────────────────────────────────────────────────────

function drawShear({ ctx, layout, theme, r, labels, title, caption, text }: Draw) {
  const { width } = layout;
  const liquid = FLOW_LIQUIDS[FLOW_LIQUID_ORDER[Math.round(r("liquid"))] ?? "glycerine"];
  title(`A plate dragged over ${liquid.label.toLowerCase()}`);
  const gap = r("gap", 2);
  const speed = r("plateSpeed", 10);
  const left = 24;
  const right = width - 24;
  const top = 112;
  const thick = gap * 20;
  const bottom = top + thick;
  box(ctx, left, top, right - left, thick, theme.angle, 0.3);
  box(ctx, left, bottom, right - left, 10, theme.neutral, 0.7);
  box(ctx, left + 20, top - 12, right - left - 60, 12, theme.neutral);
  text("fixed", left + 4, bottom + 22, theme.muted);

  // Velocity of each layer, from 0 at the bottom to v at the plate.
  const longest = Math.min(150, right - left - 40);
  const length = (speed / 50) * longest;
  const layers = 6;
  for (let i = 1; i <= layers; i++) {
    const f = i / layers;
    const y = bottom - f * thick + (i === layers ? 3 : 0);
    if (f * length > 3) arrow(ctx, left + 8, y, left + 8 + f * length, y, { color: theme.tangent, width: 1.5, head: 6 });
  }
  line(ctx, left + 8, bottom, left + 8 + length, top, theme.tangent, 1, [3, 3]);
  arrow(ctx, right - 70, top - 24, right - 70 + 50, top - 24, { color: theme.secant, width: 2.5, head: 8 });
  text("F", right - 14, top - 24, theme.secant, "left", true);
  text(`v = ${fixed(speed, 0)} cm/s`, left + 20, top - 26, theme.tangent);
  arrow(ctx, right - 10, top, right - 10, bottom, { color: theme.angle, width: 1.5, head: 5, double: true });
  text(`d = ${fixed(gap, 1)} mm`, right - 16, bottom + 22, theme.angle, "right");

  if (labels) {
    caption(`dv/dx = ${fixed(r("gradient"), 0)} /s · F = ηA dv/dx = ${flowSig(r("dragForce"))} N`);
  }
}

// ── Fall ────────────────────────────────────────────────────────────────────

function drawFall({ ctx, layout, theme, r, labels, title, caption, text }: Draw, graph: boolean) {
  const { width, height } = layout;
  const liquid = FLOW_LIQUIDS[FLOW_LIQUID_ORDER[Math.round(r("liquid"))] ?? "glycerine"];
  const ball = FLOW_BALLS[FLOW_BALL_ORDER[Math.round(r("ball"))] ?? "steel"];
  const radius = r("ballRadius", 1);
  title(`${ball.label} ball, r = ${fixed(radius, 1)} mm, in ${liquid.label.toLowerCase()}`);
  const colLeft = 18;
  const colW = 64;
  const colTop = 52;
  const colBottom = height - 92;
  box(ctx, colLeft, colTop, colW, colBottom - colTop, theme.angle, 0.3);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(colLeft, colTop - 10);
  ctx.lineTo(colLeft, colBottom);
  ctx.lineTo(colLeft + colW, colBottom);
  ctx.lineTo(colLeft + colW, colTop - 10);
  ctx.stroke();
  ctx.restore();

  const px = Math.max(3, radius * 3);
  const depth = r("fallDepth") / (FLOW_COLUMN_DEPTH * 100);
  const by = colTop + px + depth * (colBottom - colTop - 2 * px);
  const bx = colLeft + colW / 2;
  disc(ctx, bx, by, px, theme.neutral);

  // Forces, to scale against the weight.
  const weight = r("weight");
  const scale = weight > 0 ? 28 / weight : 0;
  arrow(ctx, bx, by + px, bx, by + px + weight * scale, { color: theme.secant, width: 2, head: 6 });
  const up = r("upthrust") * scale;
  const drag = r("stokesDrag") * scale;
  arrow(ctx, bx - 8, by - px, bx - 8, by - px - up, { color: theme.sine, width: 2, head: 5 });
  if (drag > 1) arrow(ctx, bx + 8, by - px, bx + 8, by - px - drag, { color: theme.tangent, width: 2, head: 5 });
  text("weight", 18, colBottom + 44, theme.secant, "left", true);
  text("upthrust", 72, colBottom + 44, theme.sine, "left", true);
  text("drag", 140, colBottom + 44, theme.tangent, "left", true);

  if (graph) {
    const vt = r("terminalVelocity");
    const tau = r("timeConstant");
    const rect = { x: colLeft + colW + 46, y: colTop + 10, width: width - (colLeft + colW + 46) - 12, height: colBottom - colTop - 40 };
    const plane = createPlane(rect, [0, 6 * Math.max(tau, 1e-9)], [0, 1.2 * Math.max(vt, 1e-9)]);
    drawPlane(ctx, plane, theme, { showLabels: labels });
    text("v", rect.x + 4, rect.y - 8, theme.text);
    text("t / ms", rect.x + rect.width, rect.y + rect.height + 26, theme.text, "right");
    const [, vy] = plane.toPx(0, vt);
    line(ctx, rect.x, vy, rect.x + rect.width, vy, theme.angle, 1.5, [5, 4]);
    text("v_t", rect.x + rect.width - 2, vy - 9, theme.angle, "right", true);
    ctx.save();
    ctx.strokeStyle = theme.curve;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const t = (6 * tau * i) / 80;
      const [x, y] = plane.toPx(t, vt * (1 - Math.exp(-t / tau)));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    const now = Math.min(r("t") * 1000, 6 * tau);
    const [nx, ny] = plane.toPx(now, r("atBottom") === 1 ? vt : vt * (1 - Math.exp(-now / tau)));
    disc(ctx, nx, ny, 4.5, theme.text);
  }

  if (labels) {
    if (r("stokesHolds") === 1) {
      caption(`now ${fixed(r("fallSpeed"), 2)} cm/s, ${fixed(r("fallDepth"), 1)} cm down`, 1);
      caption(`v_t = ${fixed(r("terminalVelocity"), 2)} cm/s; 99% of it within ${fixed(r("settleTime"), 1)} ms`);
    } else {
      caption(`Stokes' law gives v_t = ${flowSig(r("terminalVelocity") / 100)} m/s`, 1);
      caption(`but Re ≈ ${flowSig(r("ballReynolds"), 2)}: too fast for Stokes' law`);
    }
  }
}

// ── Reynolds ────────────────────────────────────────────────────────────────

const REGIMES = ["streamline", "unsteady", "turbulent"] as const;

function drawReynolds({ ctx, layout, theme, r, labels, title, caption, text }: Draw) {
  const { width, height } = layout;
  const liquid = FLOW_LIQUIDS[FLOW_LIQUID_ORDER[Math.round(r("liquid"))] ?? "water"];
  title(`${liquid.label} along a pipe, with a streak of dye`);
  const d = r("pipeDiameter", 10);
  const regime = Math.round(r("regime"));
  const left = 16;
  const right = width - 16;
  const cy = (height - 60) / 2 + 20;
  const half = 6 + d * 1.6;
  box(ctx, left, cy - half, right - left, 2 * half, theme.sine, 0.2);
  line(ctx, left, cy - half, right, cy - half, theme.axis, 2);
  line(ctx, left, cy + half, right, cy + half, theme.axis, 2);
  line(ctx, left + 4, cy - 14, left + 4, cy, theme.cosine, 3);

  const clock = r("clock");
  const start = left + 4;
  const calm = 0.35 * (right - start);
  ctx.save();
  ctx.strokeStyle = theme.cosine;
  ctx.lineWidth = 2;
  for (let strand = 0; strand < (regime === 2 ? 4 : 1); strand++) {
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = start + ((right - start) * i) / 120;
      const past = Math.max(0, x - start - (regime === 0 ? Infinity : calm)) / (right - start - calm);
      const amp = regime === 0 ? 0 : regime === 1 ? 0.35 * half * past : 0.85 * half * Math.min(1, 2.5 * past);
      const wave = regime === 1 ? Math.sin(x / 9 - clock * 4) : wobble(x / 11 + strand * 1.9, clock * 3 + strand);
      const y = cy + Math.max(-0.9 * half, Math.min(0.9 * half, amp * wave));
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  text(`d = ${fixed(d, 0)} mm`, left, cy + half + 16, theme.muted);
  text(`v = ${fixed(r("pipeSpeed"), 2)} m/s`, right, cy + half + 16, theme.tangent, "right");

  // Where the flow sits on NCERT's scale.
  const barY = height - 62;
  const barW = right - left;
  const toX = (re: number) => left + (Math.min(re, 3000) / 3000) * barW;
  box(ctx, left, barY, toX(1000) - left, 8, theme.tangent, 0.7);
  box(ctx, toX(1000), barY, toX(2000) - toX(1000), 8, theme.angle, 0.7);
  box(ctx, toX(2000), barY, right - toX(2000), 8, theme.secant, 0.7);
  text("1000", toX(1000), barY + 20, theme.muted, "center");
  text("2000", toX(2000), barY + 20, theme.muted, "center");
  text("Re", left, barY - 10, theme.muted);
  if (labels) {
    const mx = toX(r("reynolds"));
    ctx.save();
    ctx.fillStyle = theme.text;
    ctx.beginPath();
    ctx.moveTo(mx, barY - 1);
    ctx.lineTo(mx - 5, barY - 9);
    ctx.lineTo(mx + 5, barY - 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    caption(`Re = ρvd/η = ${flowSig(r("reynolds"))}: ${REGIMES[regime] ?? "streamline"}`);
  }
}

// ── Drops ───────────────────────────────────────────────────────────────────

function drawDrops({ ctx, layout, theme, r, labels, title, caption, text }: Draw) {
  const { width, height } = layout;
  const film = FLOW_FILMS[FLOW_FILM_ORDER[Math.round(r("film"))] ?? "water"];
  const bubble = r("surfaces") === 2;
  title(bubble ? `A bubble of ${film.label.toLowerCase()} in air` : `A drop of ${film.label.toLowerCase()}`);
  const radius = r("dropRadius", 1);
  const cx = width / 2;
  const cy = (height - 40) / 2 + 12;
  const max = Math.min(width / 2 - 40, (height - 150) / 2);
  const rpx = Math.max(5, (radius / 10) * max);
  if (bubble) {
    disc(ctx, cx, cy, rpx, theme.sine, 0.08);
    ring(ctx, cx, cy, rpx, theme.sine, 2);
    ring(ctx, cx, cy, Math.max(2, rpx - 4), theme.sine, 2);
  } else {
    disc(ctx, cx, cy, rpx, film.label === "Mercury" ? theme.neutral : theme.sine, 0.55);
  }
  // The surface pulls inwards all round.
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const ox = cx + Math.cos(a) * (rpx + 22);
    const oy = cy + Math.sin(a) * (rpx + 22);
    arrow(ctx, ox, oy, cx + Math.cos(a) * (rpx + 4), cy + Math.sin(a) * (rpx + 4), { color: theme.angle, width: 1.5, head: 5 });
  }
  text(`r = ${fixed(radius, 1)} mm`, cx, cy + rpx + 36, theme.text, "center");
  text(`S = ${flowSig(film.tension)} N/m`, 16, 40, theme.muted);
  text(bubble ? "two surfaces" : "one surface", width - 16, 40, theme.muted, "right");
  if (labels) {
    caption(`P inside − P outside = ${bubble ? "4" : "2"}S/r = ${fixed(r("excessPressure"), 1)} Pa`);
  }
}

// ── Capillary ───────────────────────────────────────────────────────────────

function drawCapillary({ ctx, layout, theme, r, labels, title, caption, text }: Draw) {
  const { width, height } = layout;
  const film = FLOW_FILMS[FLOW_FILM_ORDER[Math.round(r("film"))] ?? "water"];
  title(`A glass tube dipped in ${film.label.toLowerCase()}`);
  const rise = r("capillaryRise");
  const radius = r("tubeRadius", 0.5);
  const perCm = 11;
  const surface = height - 118;
  const trayTop = surface - 4;
  const left = 30;
  const right = width - 30;
  const fill = film.label === "Mercury" ? theme.neutral : theme.sine;
  box(ctx, left, surface, right - left, height - 52 - surface, fill, 0.45);
  line(ctx, left, trayTop - 20, left, height - 52, theme.axis, 2);
  line(ctx, right, trayTop - 20, right, height - 52, theme.axis, 2);
  line(ctx, left, height - 52, right, height - 52, theme.axis, 2);

  const cx = width / 2;
  const inner = Math.max(2, radius * 10);
  const tubeTop = 44;
  const tubeBottom = height - 56;
  const level = surface - rise * perCm;
  // Clear the tube, then fill it to its own level.
  box(ctx, cx - inner, tubeTop, 2 * inner, tubeBottom - tubeTop, theme.background);
  box(ctx, cx - inner, level, 2 * inner, tubeBottom - level, fill, 0.6);
  // Meniscus: hollow for a wetting liquid, domed for mercury.
  ctx.save();
  ctx.strokeStyle = fill;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - inner, level);
  ctx.quadraticCurveTo(cx, level + (rise >= 0 ? 1 : -1) * Math.min(10, inner), cx + inner, level);
  ctx.stroke();
  ctx.restore();
  line(ctx, cx - inner - 2, tubeTop, cx - inner - 2, tubeBottom, theme.axis, 2);
  line(ctx, cx + inner + 2, tubeTop, cx + inner + 2, tubeBottom, theme.axis, 2);
  line(ctx, left, surface, right, surface, theme.muted, 1, [4, 4]);

  if (Math.abs(rise) * perCm > 6) {
    arrow(ctx, cx + inner + 16, surface, cx + inner + 16, level, { color: theme.angle, width: 1.5, head: 5, double: true });
    text("h", cx + inner + 22, (surface + level) / 2, theme.angle, "left", true);
  }
  text(`r = ${fixed(radius, 2)} mm`, cx - inner - 10, tubeTop + 12, theme.text, "right");
  text(`θ = ${fixed(film.contact, 0)}°`, cx + inner + 10, tubeTop + 12, theme.text);
  text(`S = ${flowSig(film.tension)} N/m`, left + 4, height - 38, theme.muted);
  if (labels) {
    caption(rise >= 0 ? `h = 2S cos θ / ρgr: rises ${fixed(rise, 2)} cm` : `cos θ < 0: pushed down ${fixed(-rise, 2)} cm`);
  }
}

export const flowRenderer: SimulationRenderer<FlowLayout> = {
  id: "flow",
  layout: (width) => computeFlowLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, captionY } = layout;
    ctx.clearRect(0, 0, width, height);
    const d: Draw = {
      ctx,
      layout,
      theme,
      r: (key, fallback = 0) => num(results[key], fallback),
      labels: has("labels"),
      title: (words) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" }),
      caption: (words, up = 0) => label(ctx, words, width / 2, captionY - 18 * up, { color: theme.text, font: theme.font, align: "center" }),
      text: (words, x, y, colour, align = "left", strong = false) => label(ctx, words, x, y, { color: colour, font: strong ? theme.fontStrong : theme.font, align }),
    };
    if (has("lift")) drawLift(d);
    if (has("pipe")) drawPipe(d, has("streamlines"));
    if (has("tank")) drawTank(d);
    if (has("shear")) drawShear(d);
    if (has("fall")) drawFall(d, has("graph"));
    if (has("reynolds")) drawReynolds(d);
    if (has("drops")) drawDrops(d);
    if (has("capillary")) drawCapillary(d);
  },
};
