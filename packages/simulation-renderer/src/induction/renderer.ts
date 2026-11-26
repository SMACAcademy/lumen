/**
 * Electromagnetic induction, in seven pictures.
 *
 * Flux: field lines crossing a coil seen edge on, its normal at θ to the
 * field. The lines that thread the coil are bright; the coil's shadow across
 * the field, A cos θ, is marked beside it.
 *
 * Magnet: a bar magnet moving along a coil's axis, the induced current on the
 * coil, the pole that current makes on the near face, a galvanometer, and
 * the push or pull on the magnet. Underneath, the flux linkage against time
 * with its tangent, and the EMF against time: the EMF is minus that slope.
 *
 * Rod: a rod sliding on rails in a field into the page, the current round
 * the loop, the + end of the rod, its velocity and the force holding it back.
 *
 * Eddy: a metal plate on a pendulum swinging through a magnet's gap.
 *
 * Solenoid: its turns, the field inside growing with the current, and the
 * back EMF opposing any change. Secondary: a second coil round the middle.
 *
 * Generator: the coil end on between the poles, the current in its two sides
 * (⊙ out of the page, ⊗ into it), and the EMF against time.
 */

import {
  INDUCTION_MAGNET_FAR,
  INDUCTION_PLATE_ORDER,
  INDUCTION_RAIL_END,
  INDUCTION_SWING,
  inductionCoilRadius,
  inductionDipoleFlux,
  inductionDipoleFluxSlope,
  inductionGeneratorAt,
  inductionMagnetAt,
  inductionMagnetPosition,
  inductionModel,
  type InductionParams,
} from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface InductionLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The picture when a graph shares the canvas, and when it has the canvas to itself. */
  scene: Box;
  tall: Box;
  /** Two stacked graphs (flux, EMF), or one big one. */
  upper: Box;
  lower: Box;
  graph: Box;
}

export function computeInductionLayout(width: number): InductionLayout {
  const compact = width < 560;
  const height = 400;
  const left = compact ? 30 : 44;
  const right = 14;
  return {
    width,
    height,
    compact,
    scene: { x: 12, y: 28, width: width - 24, height: 132 },
    tall: { x: 12, y: 28, width: width - 24, height: height - 28 - 50 },
    upper: { x: left, y: 180, width: width - left - right, height: 78 },
    lower: { x: left, y: 280, width: width - left - right, height: 72 },
    graph: { x: left, y: 180, width: width - left - right, height: 172 },
  };
}

const MINUS = "−";
const fixed = (v: number, digits = 2) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? MINUS : ""}${Math.abs(v).toFixed(digits)}`;
/** Three significant figures, for values that run from thousandths to tens. */
const sig = (v: number) => {
  const a = Math.abs(v);
  if (a === 0) return "0";
  const digits = Math.max(0, Math.min(5, 2 - Math.floor(Math.log10(a))));
  return fixed(v, digits);
};

/** The params the model ran with, as far as the drawing needs them, read back from its outputs. */
function paramsOf(results: Results): InductionParams {
  return {
    ...inductionModel.defaultParams,
    turns: num(results.turns, 100),
    area: num(results.area, 100),
    field: num(results.field, 0.5),
    pole: num(results.poleSign, 1) < 0 ? "south" : "north",
    motion: num(results.inward, 1) === 1 ? "in" : "out",
    magnetSpeed: num(results.magnetSpeed, 0.5),
    spin: num(results.spin, 1),
  };
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

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, colour: string, lineWidth = 2, rotation = 0, fill?: string) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.globalAlpha = 0.18;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.restore();
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** A cross for a field into the page. */
function cross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(x - size, y - size);
  ctx.lineTo(x + size, y + size);
  ctx.moveTo(x + size, y - size);
  ctx.lineTo(x - size, y + size);
  ctx.stroke();
  ctx.restore();
}

/** ⊙ current out of the page, ⊗ into it. */
function endOn(ctx: CanvasRenderingContext2D, x: number, y: number, out: boolean, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 7, 0, Math.PI * 2);
  ctx.stroke();
  if (out) {
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 4.5, y - 4.5);
    ctx.lineTo(x + 4.5, y + 4.5);
    ctx.moveTo(x + 4.5, y - 4.5);
    ctx.lineTo(x - 4.5, y + 4.5);
    ctx.stroke();
  }
  ctx.restore();
}

/** A meter: a dial with a needle turned by `deflection` (−1 … 1). */
function meter(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, deflection: number, theme: LabTheme, name: string) {
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r, Math.PI, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
  const swing = Math.max(-1, Math.min(1, deflection)) * (Math.PI / 3);
  line(ctx, x, y, x + r * 0.85 * Math.sin(swing), y - r * 0.85 * Math.cos(swing), theme.angle, 2);
  label(ctx, name, x, y + 9, { color: theme.muted, font: theme.font, align: "center" });
}

function curve(ctx: CanvasRenderingContext2D, plane: Plane, f: (t: number) => number, colour: string, lineWidth = 2.2, dash?: number[]) {
  const [x0, x1] = plane.xDomain;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  for (let i = 0; i <= 300; i++) {
    const t = x0 + ((x1 - x0) * i) / 300;
    const [px, py] = plane.toPx(t, f(t));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function timeTicks(ctx: CanvasRenderingContext2D, plane: Plane, from: number, theme: LabTheme) {
  const { rect } = plane;
  const t1 = plane.xDomain[1];
  for (let t = Math.ceil(from); t <= t1 + 1e-9; t++) {
    const [px] = plane.toPx(t, 0);
    const last = t + 1 > t1 + 1e-9;
    label(ctx, last ? `${t} s` : `${t}`, last ? Math.min(px, rect.x + rect.width - 10) : px, rect.y + rect.height + 9, { color: theme.muted, font: theme.font, align: "center" });
  }
}

// ── The scenes ───────────────────────────────────────────────────────────────

function drawFlux(ctx: CanvasRenderingContext2D, area: Box, results: Results, theme: LabTheme) {
  const tilt = num(results.tilt);
  const theta = (tilt * Math.PI) / 180;
  const field = num(results.field, 0.5);
  const cx = area.x + area.width * 0.45;
  const cy = area.y + area.height * 0.48;
  const rMax = Math.min(area.height * 0.36, area.width * 0.3);
  const r = rMax * Math.sqrt(num(results.area, 100) / 400);
  const shadow = r * Math.abs(Math.cos(theta));

  // Field lines, closer together in a stronger field; those through the coil drawn bright.
  const lines = Math.round(4 + 12 * field);
  const top = area.y + 14;
  const bottom = area.y + area.height - 24;
  for (let i = 0; i < lines; i++) {
    const y = top + ((bottom - top) * (i + 0.5)) / lines;
    const through = Math.abs(y - cy) < shadow;
    arrow(ctx, area.x + 4, y, area.x + area.width - 30, y, { color: through ? theme.sine : theme.reference, width: through ? 2 : 1.2, head: 7, alpha: through ? 1 : 0.55 });
  }
  label(ctx, "B", area.x + area.width - 22, top + 2, { color: theme.sine, font: theme.fontStrong });

  // The coil edge on: its long axis at right angles to the normal.
  ring(ctx, cx, cy, Math.max(r, 2), Math.max(r * 0.22, 1.5), theme.secant, 3, Math.PI / 2 - theta, theme.secant);
  const nx = Math.cos(theta);
  const ny = -Math.sin(theta);
  const reach = Math.max(r, 24) + 22;
  arrow(ctx, cx, cy, cx + nx * reach, cy + ny * reach, { color: theme.angle, width: 2.5, head: 8 });
  label(ctx, "n", cx + nx * (reach + 10), cy + ny * (reach + 10), { color: theme.angle, font: theme.fontStrong, align: "center" });
  if (tilt > 0.5) {
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 20, -theta, 0);
    ctx.stroke();
    ctx.restore();
  }
  label(ctx, `θ = ${Math.round(tilt)}°`, area.x + 6, area.y + area.height - 8, { color: theme.angle, font: theme.font });

  // The coil's shadow across the field: the area the lines see.
  const sx = area.x + area.width - 14;
  line(ctx, sx, cy - shadow, sx, cy + shadow, theme.tangent, 3);
  label(ctx, "A cos θ", sx, Math.min(cy + shadow + 12, area.y + area.height - 8), { color: theme.tangent, font: theme.font, align: "right" });
}

function drawMagnet(ctx: CanvasRenderingContext2D, area: Box, results: Results, theme: LabTheme, emfScale: number) {
  const d = num(results.distance, INDUCTION_MAGNET_FAR);
  const north = num(results.poleSign, 1) > 0;
  const moving = num(results.moving) === 1;
  const inward = num(results.inward, 1) === 1;
  const ay = area.y + 46;
  const coilX = area.x + area.width * 0.72;
  const k = (coilX - area.x - 26) / INDUCTION_MAGNET_FAR;
  const rpx = Math.min(num(results.coilRadius, 5) * k, 40);

  // The coil: turns seen from the side.
  for (let i = -2; i <= 2; i++) ring(ctx, coilX + i * 6, ay, 5, rpx, theme.secant, 2);
  // Leads down to the galvanometer.
  const gy = area.y + area.height - 16;
  line(ctx, coilX - 12, ay + rpx, coilX - 12, gy, theme.secant, 1.5);
  line(ctx, coilX + 12, ay + rpx, coilX + 12, gy, theme.secant, 1.5);
  line(ctx, coilX - 12, gy, coilX - 14, gy, theme.secant, 1.5);
  meter(ctx, coilX, gy, 13, emfScale > 0 ? -num(results.magnetEmf) / emfScale : 0, theme, "G");

  // The magnet, its near pole facing the coil.
  const mx = coilX - d * k;
  const half = 22;
  const near = north ? theme.cosine : theme.sine;
  const far = north ? theme.sine : theme.cosine;
  box(ctx, mx - half, ay - 9, half, 18, far, 0.9);
  box(ctx, mx, ay - 9, half, 18, near, 0.9);
  label(ctx, north ? "S" : "N", mx - half / 2, ay, { color: theme.background, font: theme.fontStrong, align: "center" });
  label(ctx, north ? "N" : "S", mx + half / 2, ay, { color: theme.background, font: theme.fontStrong, align: "center" });

  // Its velocity, and the push or pull of the coil on it (Lenz).
  const vx = mx - half;
  if (moving) {
    const dir = inward ? 1 : -1;
    const start = Math.max(area.x + 30, Math.min(vx, area.x + area.width - 30));
    arrow(ctx, start, ay - 22, start + dir * 26, ay - 22, { color: theme.tangent, width: 2.5, head: 7 });
    label(ctx, "v", start - dir * 8, ay - 22, { color: theme.tangent, font: theme.fontStrong, align: "center" });
    const push = num(results.push);
    if (push !== 0) {
      // Repelled: pushed away from the coil (left); attracted: pulled towards it.
      const fdir = push > 0 ? -1 : 1;
      arrow(ctx, start, ay + 22, start + fdir * 26, ay + 22, { color: theme.vector, width: 2.5, head: 7 });
      label(ctx, "F", start - fdir * 8, ay + 22, { color: theme.vector, font: theme.fontStrong, align: "center" });
    }
  }

  // The induced current on the front of the coil, and the pole it makes on the near face.
  const face = num(results.facePole);
  if (face !== 0) {
    const up = face > 0;
    const fx = coilX + 18;
    arrow(ctx, fx, up ? ay + rpx * 0.5 : ay - rpx * 0.5, fx, up ? ay - rpx * 0.5 : ay + rpx * 0.5, { color: theme.angle, width: 2.5, head: 7 });
    label(ctx, "I", fx + 9, ay, { color: theme.angle, font: theme.fontStrong });
    label(ctx, up ? "N" : "S", coilX - 22, ay - rpx - 7, { color: up ? theme.cosine : theme.sine, font: theme.fontStrong, align: "center" });
  }
}

function drawRod(ctx: CanvasRenderingContext2D, area: Box, results: Results, theme: LabTheme) {
  const length = num(results.rodLength, 0.5);
  const top = area.y + 44;
  const gap = 40 + (170 * (length - 0.1)) / 0.9;
  const bottom = top + gap;
  const x0 = area.x + 26;
  const x1 = area.x + area.width - 6;
  const rodX = num(results.rodX, 0.3);
  const rx = x0 + (rodX / INDUCTION_RAIL_END) * (x1 - x0);
  const sense = num(results.rodSense);

  for (let y = area.y + 20; y <= bottom + 30; y += 28) for (let x = area.x + 14; x <= x1; x += 28) cross(ctx, x, y, 4, theme.reference);
  label(ctx, "B into the page", area.x + 4, area.y + 6, { color: theme.muted, font: theme.font });

  box(ctx, x0, top, rx - x0, gap, theme.tangent, 0.12);
  line(ctx, x0, top, x1, top, theme.neutral, 3);
  line(ctx, x0, bottom, x1, bottom, theme.neutral, 3);
  // The resistor, a zigzag joining the rails.
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, top);
  const zig = 8;
  for (let i = 1; i < zig; i++) ctx.lineTo(x0 + (i % 2 ? -6 : 6), top + (gap * i) / zig);
  ctx.lineTo(x0, bottom);
  ctx.stroke();
  ctx.restore();
  label(ctx, "R", x0 - 10, top - 10, { color: theme.muted, font: theme.fontStrong, align: "center" });

  // The rod.
  line(ctx, rx, top - 8, rx, bottom + 8, theme.secant, 5);
  label(ctx, "l", rx + 10, top + gap * 0.25, { color: theme.secant, font: theme.fontStrong });

  if (sense !== 0) {
    // Up the rod for anticlockwise, along the rails back through R.
    const up = sense > 0;
    const midY = (top + bottom) / 2;
    arrow(ctx, rx, up ? midY + 14 : midY - 14, rx, up ? midY - 14 : midY + 14, { color: theme.angle, width: 3, head: 8 });
    const mid = (x0 + rx) / 2;
    if (rx - x0 > 50) {
      arrow(ctx, mid + (up ? 10 : -10), top, mid + (up ? -10 : 10), top, { color: theme.angle, width: 3, head: 8 });
      arrow(ctx, mid + (up ? -10 : 10), bottom, mid + (up ? 10 : -10), bottom, { color: theme.angle, width: 3, head: 8 });
    }
    label(ctx, "+", rx - 12, up ? top - 10 : bottom + 12, { color: theme.text, font: theme.fontStrong, align: "center" });

    const dir = num(results.rodVelocity) > 0 ? 1 : -1;
    const start = dir > 0 ? Math.min(rx + 6, area.x + area.width - 40) : Math.max(rx - 6, area.x + 40);
    const vy = bottom + 26;
    arrow(ctx, start, vy, start + dir * 34, vy, { color: theme.tangent, width: 2.5, head: 7 });
    label(ctx, "v", start + dir * 42, vy, { color: theme.tangent, font: theme.fontStrong, align: "center" });
    const fstart = dir > 0 ? Math.max(rx - 6, area.x + 40) : Math.min(rx + 6, area.x + area.width - 40);
    arrow(ctx, fstart, vy + 22, fstart - dir * 34, vy + 22, { color: theme.vector, width: 2.5, head: 7 });
    label(ctx, "F", fstart - dir * 42, vy + 22, { color: theme.vector, font: theme.fontStrong, align: "center" });
  }
}

function drawPendulum(ctx: CanvasRenderingContext2D, area: Box, results: Results, theme: LabTheme) {
  const cx = area.x + area.width / 2;
  const py = area.y + 10;
  const length = area.height - 80;
  const plate = INDUCTION_PLATE_ORDER[Math.round(num(results.plate))] ?? "solid";
  const angle = (num(results.pendulumAngle) * Math.PI) / 180;
  const swing = (num(results.swing, INDUCTION_SWING) * Math.PI) / 180;

  // The magnet's gap at the bottom of the swing, field into the page.
  const gx = cx - 46;
  const gy = py + length - 28;
  box(ctx, gx, gy, 92, 64, theme.reference, 0.18);
  for (let x = gx + 12; x < gx + 92; x += 22) for (let y = gy + 12; y < gy + 64; y += 20) cross(ctx, x, y, 3.5, theme.reference);
  label(ctx, "magnet's gap", cx, gy + 76, { color: theme.muted, font: theme.font, align: "center" });

  // How far it now swings, either side.
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(cx, py, length, Math.PI / 2 - swing, Math.PI / 2 + swing);
  ctx.stroke();
  ctx.restore();

  const bx = cx + length * Math.sin(angle);
  const by = py + length * Math.cos(angle);
  line(ctx, cx, py, bx, by, theme.neutral, 2);
  disc(ctx, cx, py, 4, theme.neutral);

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-angle);
  const w = 60;
  const h = 40;
  if (plate === "plastic") box(ctx, -w / 2, 0, w, h, theme.neutral, 0.45);
  else if (plate === "solid") box(ctx, -w / 2, 0, w, h, theme.secant, 0.75);
  else for (let i = 0; i < 5; i++) box(ctx, -w / 2 + i * 13, 0, 8, h, theme.secant, 0.75);
  if (plate === "slotted") box(ctx, -w / 2, 0, w, 8, theme.secant, 0.75);
  ctx.restore();

  // Eddy currents swirl in the metal: one big loop in a solid plate, only small ones in the fingers of a slotted plate.
  const strength = num(results.eddyStrength);
  if (strength > 0 && plate !== "plastic") {
    const mx = bx - (h / 2) * Math.sin(angle);
    const my = by + (h / 2) * Math.cos(angle);
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 1.8;
    if (plate === "solid") {
      ctx.beginPath();
      ctx.arc(mx, my, 13, 0.3, Math.PI * 1.8);
      ctx.stroke();
    } else {
      for (const off of [-13, 0, 13]) {
        ctx.beginPath();
        ctx.arc(mx + off * Math.cos(angle), my + off * Math.sin(angle), 3.5, 0, Math.PI * 1.7);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawSolenoid(ctx: CanvasRenderingContext2D, area: Box, results: Results, theme: LabTheme, secondary: boolean) {
  const cx = area.x + area.width / 2;
  const cy = area.y + 112;
  const len = 100 + ((num(results.solLength, 25) - 10) / 40) * (area.width - 140);
  const r = 14 + 34 * Math.sqrt(num(results.solArea, 20) / 50);
  const loops = Math.max(6, Math.min(26, Math.round(num(results.solTurns, 1000) / 80)));
  const left = cx - len / 2;
  const right = cx + len / 2;
  const current = num(results.current);
  const changing = num(results.changing);

  // The field inside, growing with the current.
  if (current > 0.01) {
    const reach = (len - 20) * Math.min(1, current / 5);
    arrow(ctx, cx - reach / 2, cy, cx + reach / 2, cy, { color: theme.sine, width: 3, head: 9 });
    label(ctx, "B", cx, cy - 12, { color: theme.sine, font: theme.fontStrong, align: "center" });
  }
  for (let i = 0; i < loops; i++) ring(ctx, left + (len * (i + 0.5)) / loops, cy, 4, r, theme.secant, 1.8);

  // Leads to the supply below.
  const sy = cy + r + 70;
  line(ctx, left, cy + r, left, sy, theme.secant, 1.5);
  line(ctx, right, cy + r, right, sy, theme.secant, 1.5);
  line(ctx, left, sy, cx - 26, sy, theme.secant, 1.5);
  line(ctx, cx + 26, sy, right, sy, theme.secant, 1.5);
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - 26, sy - 12, 52, 24);
  ctx.restore();
  label(ctx, "supply", cx, sy, { color: theme.muted, font: theme.font, align: "center" });
  if (current > 0.01) arrow(ctx, left, sy - 30, left, cy + r + 8, { color: theme.angle, width: 2.5, head: 7 });
  if (current > 0.01) label(ctx, "I", left - 10, sy - 30, { color: theme.angle, font: theme.fontStrong, align: "center" });

  // The back EMF: against the current while it rises, along it while it falls.
  if (changing !== 0 && !secondary) {
    const y = cy + r + 26;
    const against = changing > 0;
    arrow(ctx, against ? cx + 34 : cx - 34, y, against ? cx - 34 : cx + 34, y, { color: theme.vector, width: 2.5, head: 8 });
    label(ctx, against ? "back EMF opposes the rise" : "back EMF opposes the fall", cx, y + 15, { color: theme.vector, font: theme.font, align: "center" });
  }

  if (secondary) {
    const inside = num(results.area, 100) < num(results.solArea, 20);
    const r2 = inside ? Math.max(6, r * Math.sqrt(num(results.area) / num(results.solArea, 20))) : r + 9;
    const turns = Math.max(3, Math.min(10, Math.round(num(results.turns, 100) / 25)));
    const width = turns * 7;
    for (let i = 0; i < turns; i++) ring(ctx, cx - width / 2 + 7 * (i + 0.5), cy, 3.5, r2, theme.cosine, 2.2);
    const my = area.y + 18;
    line(ctx, cx - width / 2, cy - r2, cx - width / 2, my + 4, theme.cosine, 1.5);
    line(ctx, cx + width / 2, cy - r2, cx + width / 2, my + 4, theme.cosine, 1.5);
    meter(ctx, cx, my + 4, 13, Math.max(-1, Math.min(1, num(results.secondaryEmfMilli) / 40)) * -Math.sign(num(results.secondaryEmf)), theme, "");
    label(ctx, "ε₂", cx + 22, my, { color: theme.cosine, font: theme.fontStrong });
  }
}

function drawGenerator(ctx: CanvasRenderingContext2D, area: Box, results: Results, theme: LabTheme) {
  const cx = area.x + area.width / 2;
  const cy = area.y + area.height / 2 + 4;
  const R = Math.min(area.height * 0.36, 52);
  const poleW = 26;
  const gapHalf = R + 26;
  box(ctx, cx - gapHalf - poleW, cy - R - 10, poleW, 2 * R + 20, theme.cosine, 0.85);
  box(ctx, cx + gapHalf, cy - R - 10, poleW, 2 * R + 20, theme.sine, 0.85);
  label(ctx, "N", cx - gapHalf - poleW / 2, cy, { color: theme.background, font: theme.fontStrong, align: "center" });
  label(ctx, "S", cx + gapHalf + poleW / 2, cy, { color: theme.background, font: theme.fontStrong, align: "center" });
  for (const dy of [-R * 0.75, 0, R * 0.75]) arrow(ctx, cx - gapHalf + 4, cy + dy, cx + gapHalf - 4, cy + dy, { color: theme.reference, width: 1.2, head: 6, alpha: 0.6 });

  const theta = (num(results.genAngle) * Math.PI) / 180;
  // The coil end on: its plane at right angles to the normal n.
  const px = -Math.sin(theta);
  const py = -Math.cos(theta);
  line(ctx, cx - px * R, cy - py * R, cx + px * R, cy + py * R, theme.secant, 4);
  arrow(ctx, cx, cy, cx + Math.cos(theta) * (R * 0.8), cy - Math.sin(theta) * (R * 0.8), { color: theme.angle, width: 2.2, head: 7 });
  const emf = num(results.genEmf);
  if (Math.abs(emf) > 1e-9) {
    // ε > 0 drives current out of the page in the side at (−sin θ, cos θ).
    endOn(ctx, cx + px * R, cy + py * R, emf > 0, theme.angle);
    endOn(ctx, cx - px * R, cy - py * R, emf < 0, theme.angle);
  } else {
    disc(ctx, cx + px * R, cy + py * R, 4, theme.secant);
    disc(ctx, cx - px * R, cy - py * R, 4, theme.secant);
  }
  // It turns anticlockwise.
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, R + 12, -Math.PI * 0.35, -Math.PI * 0.15);
  ctx.stroke();
  ctx.restore();
  label(ctx, `θ = ${Math.round(num(results.genAngle))}°`, area.x + 4, area.y + 6, { color: theme.angle, font: theme.font });
}

// ── Graphs ───────────────────────────────────────────────────────────────────

/** The largest EMF the magnet could make with this coil, at the top speed of 1 m/s. */
function magnetEmfScale(params: InductionParams): number {
  const a = inductionCoilRadius(params.area);
  return params.turns * Math.abs(inductionDipoleFluxSlope(a / 2, a)) * 1;
}

function drawMagnetGraphs(ctx: CanvasRenderingContext2D, layout: InductionLayout, results: Results, theme: LabTheme) {
  const params = paramsOf(results);
  const north = params.pole === "north";
  const a = inductionCoilRadius(params.area);
  const top = params.turns * inductionDipoleFlux(0, a) * 1.1;
  const emfTop = magnetEmfScale(params) * 1.1;
  const flux = createPlane(layout.upper, [0, 3], north ? [-0.15 * top, top] : [-top, 0.15 * top]);
  const emf = createPlane(layout.lower, [0, 3], [-emfTop, emfTop]);
  drawPlane(ctx, flux, theme, { showLabels: false });
  drawPlane(ctx, emf, theme, { showLabels: false });
  label(ctx, "flux linkage NΦ against time", layout.upper.x, layout.upper.y - 9, { color: theme.curve, font: theme.font });
  label(ctx, "EMF ε = −N dΦ/dt against time", layout.lower.x, layout.lower.y - 9, { color: theme.angle, font: theme.font });
  const at = (t: number) => inductionMagnetAt(inductionMagnetPosition(t, params), params);
  curve(ctx, flux, (t) => at(t).linkage, theme.curve);
  curve(ctx, emf, (t) => at(t).emf, theme.angle);
  timeTicks(ctx, emf, 1, theme);

  const t = Math.min(3, num(results.elapsed));
  const linkage = num(results.magnetLinkage);
  const slope = -num(results.magnetEmf);
  // The tangent to the flux curve: its slope is dΦ/dt, the EMF turned round.
  const run = 40 / Math.hypot(flux.sx, slope * flux.sy);
  const [x1, y1] = flux.toPx(t - run, linkage - slope * run);
  const [x2, y2] = flux.toPx(t + run, linkage + slope * run);
  ctx.save();
  clipToPlane(ctx, flux);
  line(ctx, x1, y1, x2, y2, theme.tangent, 2);
  ctx.restore();
  const [fx, fy] = flux.toPx(t, linkage);
  disc(ctx, fx, fy, 4.5, theme.text);
  const [ex, ey] = emf.toPx(t, num(results.magnetEmf));
  disc(ctx, ex, ey, 4.5, theme.text);
}

function drawGeneratorGraph(ctx: CanvasRenderingContext2D, layout: InductionLayout, results: Results, theme: LabTheme) {
  const params = paramsOf(results);
  const t = num(results.t);
  const start = Math.floor(t / 2) * 2;
  const peakTop = params.turns * params.field * params.area * 1e-4 * 2 * Math.PI * 5 * 1.1;
  const plane = createPlane(layout.graph, [start, start + 2], [-peakTop, peakTop]);
  drawPlane(ctx, plane, theme, { showLabels: false });
  label(ctx, "ε against time · dashed: ωNΦ", layout.graph.x, layout.graph.y - 9, { color: theme.angle, font: theme.font });
  const omega = 2 * Math.PI * params.spin;
  curve(ctx, plane, (s) => inductionGeneratorAt(s, params).linkage * omega, theme.curve, 1.6, [5, 4]);
  curve(ctx, plane, (s) => inductionGeneratorAt(s, params).emf, theme.angle);
  timeTicks(ctx, plane, start + 1, theme);
  const [px, py] = plane.toPx(t, num(results.genEmf));
  disc(ctx, px, py, 4.5, theme.text);
}

// ── The renderer ─────────────────────────────────────────────────────────────

export const inductionRenderer: SimulationRenderer<InductionLayout> = {
  id: "induction",
  layout: (width) => computeInductionLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height } = layout;
    const words = has("labels");
    const graphs = has("graphs");
    const area = graphs ? layout.scene : layout.tall;
    ctx.clearRect(0, 0, width, height);
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (text: string, row = 1) =>
      label(ctx, text, width / 2, height - 14 - (row - 1) * 18, { color: theme.text, font: theme.font, align: "center" });
    const mV = (v: number) => fixed(v * 1000, 1);

    if (has("field")) {
      title("A coil in a uniform field");
      drawFlux(ctx, area, results, theme);
      if (words) {
        caption(`Φ = BA cos θ = ${fixed(num(results.fluxPerTurnMilli))} mWb per turn`, 2);
        caption(`flux linkage NΦ = ${sig(num(results.linkage))} Wb`);
      }
    }

    if (has("magnet")) {
      const params = paramsOf(results);
      title("A magnet and a coil");
      drawMagnet(ctx, area, results, theme, magnetEmfScale(params));
      if (graphs) drawMagnetGraphs(ctx, layout, results, theme);
      if (words) {
        if (num(results.moving) !== 1) caption("magnet at rest: flux steady, so no EMF");
        else {
          const face = num(results.facePole) > 0 ? "N" : "S";
          const push = num(results.push) > 0 ? "repels" : "attracts";
          caption(`ε = ${mV(num(results.magnetEmf))} mV · near face ${face}: it ${push} the magnet`);
        }
      }
    }

    if (has("rails")) {
      title("A rod sliding on rails");
      drawRod(ctx, area, results, theme);
      if (words) {
        if (num(results.rodSense) === 0) caption("rod at rest: no EMF, no current, no force");
        else {
          caption(`ε = Bvl = ${sig(num(results.motionalEmf))} V · I = ${sig(num(results.rodCurrent))} A`, 2);
          caption(`F = BIl = ${sig(num(results.rodForce))} N · power to push ${sig(num(results.pushPower))} W`);
        }
      }
    }

    if (has("pendulum")) {
      const plate = INDUCTION_PLATE_ORDER[Math.round(num(results.plate))] ?? "solid";
      title(plate === "solid" ? "A solid copper plate swings" : plate === "slotted" ? "A slotted copper plate swings" : "A plastic plate swings");
      drawPendulum(ctx, area, results, theme);
      if (words) {
        const strength = num(results.eddyStrength);
        caption(strength === 0 ? "no eddy currents: only the air slows it" : strength === 1 ? "small eddy currents: weak braking" : "large eddy currents: strong braking", 2);
        caption(`swing ${fixed(num(results.swing), 1)}° · it halves every ${sig(num(results.halfTime))} s`);
      }
    }

    if (has("solenoid")) {
      const secondary = has("secondary");
      title(secondary ? "Two coils: mutual inductance" : "A solenoid: self-inductance");
      drawSolenoid(ctx, area, results, theme, secondary);
      if (words) {
        const changing = num(results.changing);
        const rate = Math.abs(num(results.currentRate));
        const state = changing > 0 ? `rising at ${rate} A/s` : changing < 0 ? `falling at ${rate} A/s` : "steady";
        if (secondary) {
          caption(`M = ${sig(num(results.mutualMilli))} mH · current ${state}`, 2);
          caption(`ε₂ = −M dI/dt = ${mV(num(results.secondaryEmf))} mV`);
        } else {
          caption(`L = ${sig(num(results.inductanceMilli))} mH · I = ${fixed(num(results.current))} A, ${state}`, 2);
          caption(`ε = −L dI/dt = ${sig(num(results.backEmf))} V · ½LI² = ${sig(num(results.energy))} J`);
        }
      }
    }

    if (has("generator")) {
      title("An AC generator");
      drawGenerator(ctx, area, results, theme);
      if (graphs) drawGeneratorGraph(ctx, layout, results, theme);
      if (words) caption(`ε = ${fixed(num(results.genEmf))} V · peak NBAω = ${fixed(num(results.peakEmf))} V`);
    }
  },
};
