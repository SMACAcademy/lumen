/**
 * Rolling and equilibrium, in four pictures.
 *
 * Axes: a rod, ring, disc or sphere seen face-on, with the axis through its
 * centre and the parallel axis a distance d away. With the words on, a bar
 * splits I into I_cm and Md², and a line checks I_x + I_y = I_z.
 *
 * Race: one incline with four lanes — ring, hollow sphere, disc, solid
 * sphere — let go together. A spoke on each shows how much it has turned.
 * With the words on, a bar splits the chosen roller's energy into moving,
 * turning and (if it slips) heat.
 *
 * Wheel: a wheel on level ground with a marked point on its rim. The centre
 * moves at v; with the words on, the top, the bottom and the marked point
 * get their velocity arrows v + ω × r.
 *
 * Balance: a see-saw, a ladder against a smooth wall, or a couple, with every
 * force drawn where it acts.
 */

import {
  ROLL_BEAM_HALF,
  ROLL_BODY_LABELS,
  ROLL_BODY_ORDER,
  ROLL_LADDER_LENGTH,
  ROLL_SCENE_ORDER,
  ROLLER_ORDER,
  ROLLERS,
  rollDownIncline,
  type RollerId,
} from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface RollingLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The picture. */
  scene: Box;
  /** Bars and lines of numbers under it. */
  info: Box;
}

export function computeRollingLayout(width: number): RollingLayout {
  const compact = width < 560;
  const height = compact ? 390 : 420;
  const sceneHeight = height - 30 - 96;
  return {
    width,
    height,
    compact,
    scene: { x: 16, y: 30, width: width - 32, height: sceneHeight },
    info: { x: 16, y: 30 + sceneHeight + 6, width: width - 32, height: 96 - 6 - 28 },
  };
}

const DEG = 180 / Math.PI;
const fixed = (v: number, digits = 2) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
/** Moments of inertia: three significant figures below 1 kg m², two decimals above. */
export function rollingInertiaText(v: number): string {
  if (v === 0) return "0";
  if (v >= 100) return v.toFixed(0);
  if (v >= 1) return v.toFixed(2);
  return String(Number(v.toPrecision(3)));
}
const I = rollingInertiaText;

const ROLLER_SHORT: Record<RollerId, string> = { ring: "Ring", hollow: "Hollow", disc: "Disc", solid: "Solid" };

function rollerColour(id: RollerId, theme: LabTheme): string {
  return id === "ring" ? theme.secant : id === "hollow" ? theme.cosine : id === "disc" ? theme.sine : theme.tangent;
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

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, style: { fill?: string; stroke?: string; width?: number; alpha?: number; dash?: number[] }) {
  ctx.save();
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.width ?? 2;
    if (style.dash) ctx.setLineDash(style.dash);
    ctx.stroke();
  }
  ctx.restore();
}

/** A ring is all rim; a hollow sphere a rim with an equator; a disc is filled; a solid sphere filled with an equator. */
function roller(ctx: CanvasRenderingContext2D, id: RollerId, x: number, y: number, r: number, turned: number, colour: string, strong: boolean) {
  const alpha = strong ? 1 : 0.75;
  if (id === "disc" || id === "solid") circle(ctx, x, y, r, { fill: colour, alpha: 0.4 * alpha });
  circle(ctx, x, y, r, { stroke: colour, width: id === "ring" || id === "hollow" ? (strong ? 3.5 : 2.5) : 1.5, alpha });
  if (id === "hollow" || id === "solid") {
    ctx.save();
    ctx.globalAlpha = 0.6 * alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // A spoke from the centre, turned clockwise with the roll.
  line(ctx, x, y, x + r * Math.sin(turned), y - r * Math.cos(turned), colour, strong ? 2 : 1.5);
}

function drawInertia(ctx: CanvasRenderingContext2D, layout: RollingLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean, title: (t: string) => void, caption: (t: string) => void) {
  const { scene, info } = layout;
  const shape = ROLL_BODY_ORDER[Math.round(num(results.shape))] ?? "disc";
  const zAxis = num(results.axis) === 0;
  const iCentre = num(results.iCentre);
  const shift = num(results.shift);
  const iShifted = num(results.iShifted);
  const d = num(results.offset);
  const half = num(results.half, 0.5);
  const R = num(results.radius, 0.5);
  title(shape === "sphere" ? "Solid sphere, axis along a diameter" : `${ROLL_BODY_LABELS[shape]}, axis ${zAxis ? "perpendicular to its plane" : "in its plane"}`);

  const right = Math.max(half, d);
  const tall = shape === "rod" ? 0 : R;
  const k = Math.min((scene.width - 40) / (half + right), tall > 0 ? (scene.height - 40) / (2 * tall) : Infinity);
  const cx = scene.x + scene.width / 2 + ((half - right) * k) / 2;
  const cy = scene.y + scene.height / 2;
  const colour = theme.curve;
  if (shape === "rod") {
    ctx.save();
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(cx - half * k, cy - 5, 2 * half * k, 10);
    ctx.restore();
  } else if (shape === "ring") {
    circle(ctx, cx, cy, R * k - 3, { stroke: colour, width: 6 });
  } else if (shape === "disc") {
    circle(ctx, cx, cy, R * k, { fill: colour, alpha: 0.45 });
    circle(ctx, cx, cy, R * k, { stroke: colour, width: 1.5 });
  } else {
    circle(ctx, cx, cy, R * k, { fill: colour, alpha: 0.4 });
    circle(ctx, cx, cy, R * k, { stroke: colour, width: 1.5 });
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * k, R * k * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // The axis through the centre (faint) and the chosen parallel axis.
  const ax = cx + d * k;
  const drawAxis = (x: number, colourOf: string, strong: boolean) => {
    if (zAxis || shape === "sphere") {
      if (shape === "sphere") line(ctx, x, scene.y + 6, x, scene.y + scene.height - 6, colourOf, strong ? 2 : 1, strong ? undefined : [4, 4]);
      else {
        circle(ctx, x, cy, 7, { stroke: colourOf, width: strong ? 2 : 1 });
        circle(ctx, x, cy, 2.2, { fill: colourOf });
      }
    } else line(ctx, x, scene.y + 6, x, scene.y + scene.height - 6, colourOf, strong ? 2 : 1, strong ? undefined : [4, 4]);
  };
  if (d > 1e-9) drawAxis(cx, theme.muted, false);
  drawAxis(ax, theme.angle, true);
  if (d > 1e-9) {
    const y = cy + Math.max(tall * k, 10) + 14 > scene.y + scene.height - 8 ? scene.y + 14 : cy + Math.max(tall * k, 10) + 14;
    arrow(ctx, cx, y, ax, y, { color: theme.angle, width: 1.5, head: 6, double: true });
    label(ctx, `d = ${fixed(d)} m`, (cx + ax) / 2, y - 10, { color: theme.angle, font: theme.font, align: "center" });
  }

  if (!words) return;
  // I = I_cm + Md², as a split bar.
  const barY = info.y + 4;
  const full = info.width;
  const scale = iShifted > 0 ? full / iShifted : 0;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = theme.curve;
  ctx.fillRect(info.x, barY, iCentre * scale, 12);
  ctx.fillStyle = theme.angle;
  ctx.fillRect(info.x + iCentre * scale, barY, shift * scale, 12);
  ctx.restore();
  label(ctx, `I_cm ${I(iCentre)}`, info.x, barY + 24, { color: theme.curve, font: theme.font });
  if (shift > 0) label(ctx, `Md² ${I(shift)}`, info.x + info.width, barY + 24, { color: theme.angle, font: theme.font, align: "right" });
  const ix = num(results.ix);
  const iy = num(results.iy);
  const iz = num(results.iz);
  const perp =
    num(results.planar) === 1
      ? `I_x + I_y = ${I(ix)} + ${I(iy)} = ${I(ix + iy)} = I_z`
      : `Not flat: I_x + I_y = ${I(ix + iy)} ≠ I_z = ${I(iz)}`;
  label(ctx, perp, info.x + info.width / 2, barY + 44, { color: theme.muted, font: theme.font, align: "center" });
  caption(d > 1e-9 ? `I = ${I(iCentre)} + ${I(shift)} = ${I(iShifted)} kg m²` : `I = I_cm = ${I(iCentre)} kg m²`);
}

function drawRace(ctx: CanvasRenderingContext2D, layout: RollingLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean, title: (t: string) => void, caption: (t: string) => void) {
  const { scene, info } = layout;
  const theta = num(results.angle, 0.5);
  const mu = num(results.mu, 0.4);
  const height = num(results.height, 1);
  const t = num(results.t);
  const chosen = ROLLER_ORDER[Math.round(num(results.roller))] ?? "disc";
  title(`Let go from ${fixed(height, 1)} m up a ${Math.round(theta * DEG)}° slope`);

  // The incline: top-left to bottom-right, leaving room for four lanes above it.
  const lanes = ROLLER_ORDER.length;
  const gap = layout.compact ? 15 : 18;
  const r = layout.compact ? 6 : 8;
  const outward = (lanes - 1) * gap + 2 * r;
  const legendSpace = 22;
  const maxBase = scene.width - 16 - outward * Math.sin(theta);
  const maxRise = scene.height - legendSpace - 10 - outward * Math.cos(theta);
  const base = Math.min(maxBase, maxRise / Math.tan(theta));
  const rise = base * Math.tan(theta);
  const x0 = scene.x + 8;
  const yTop = scene.y + outward * Math.cos(theta) + 4;
  const yBase = yTop + rise;
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.moveTo(x0, yTop);
  ctx.lineTo(x0 + base, yBase);
  ctx.lineTo(x0, yBase);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  line(ctx, x0, yBase, scene.x + scene.width, yBase, theme.axis, 1.5);

  const slopePx = Math.hypot(base, rise);
  const ux = Math.cos(theta);
  const uy = Math.sin(theta);
  const nx = Math.sin(theta);
  const ny = -Math.cos(theta);
  const length = height / Math.sin(theta);
  const pxPerM = slopePx / length;
  ROLLER_ORDER.forEach((id, i) => {
    const off = i * gap;
    line(ctx, x0 + nx * off, yTop + ny * off, x0 + base + nx * off, yBase + ny * off, theme.axis, 1, i === 0 ? undefined : [3, 4]);
    const down = rollDownIncline(ROLLERS[id].beta, theta, mu);
    const tEnd = Math.sqrt((2 * length) / down.accel);
    const run = Math.min(t, tEnd);
    const s = t >= tEnd ? length : 0.5 * down.accel * run * run;
    const turnedPx = 0.5 * down.spinAccel * run * run * pxPerM;
    const along = s * pxPerM;
    const px = x0 + ux * along + nx * (off + r);
    const py = yTop + uy * along + ny * (off + r);
    roller(ctx, id, px, py, r, turnedPx / r, rollerColour(id, theme), id === chosen);
  });

  // The legend, one quarter of the width each, the chosen one in bold.
  const slot = scene.width / lanes;
  ROLLER_ORDER.forEach((id, i) => {
    const lx = scene.x + slot * i + 6;
    const ly = scene.y + scene.height - 8;
    circle(ctx, lx + 4, ly, 4, { fill: rollerColour(id, theme) });
    label(ctx, ROLLER_SHORT[id], lx + 12, ly, { color: id === chosen ? theme.text : theme.muted, font: id === chosen ? theme.fontStrong : theme.font });
  });

  if (!words) return;
  const keTrans = num(results.keTrans);
  const keRot = num(results.keRot);
  const heat = num(results.heat);
  const potential = Math.max(1e-9, num(results.potential));
  const scale = info.width / potential;
  const y = info.y + 4;
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = theme.sine;
  ctx.fillRect(info.x, y, keTrans * scale, 12);
  ctx.fillStyle = theme.cosine;
  ctx.fillRect(info.x + keTrans * scale, y, keRot * scale, 12);
  ctx.fillStyle = theme.secant;
  ctx.fillRect(info.x + (keTrans + keRot) * scale, y, heat * scale, 12);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(info.x, y, info.width, 12);
  ctx.restore();
  const percent = num(results.rotPercent);
  label(ctx, `moving ${fixed(100 - percent, 0)}% · turning ${fixed(percent, 0)}% of the KE`, info.x, y + 24, { color: theme.text, font: theme.font });
  const name = ROLLERS[chosen].label;
  if (num(results.slips) === 1) {
    label(ctx, `${name} slips: μ ${fixed(mu)} < ${fixed(num(results.muNeeded))} needed`, info.x, y + 42, { color: theme.secant, font: theme.font });
  } else {
    label(ctx, `${name} rolls: friction ${fixed(num(results.friction), 1)} N, needs μ ≥ ${fixed(num(results.muNeeded))}`, info.x, y + 42, { color: theme.muted, font: theme.font });
  }
  caption(`a = ${fixed(num(results.accel))} m/s² · at the bottom ${fixed(num(results.vBottom))} m/s`);
}

function drawWheel(ctx: CanvasRenderingContext2D, layout: RollingLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean, title: (t: string) => void, caption: (t: string) => void) {
  const { scene, info } = layout;
  const id = ROLLER_ORDER[Math.round(num(results.roller))] ?? "disc";
  const v = num(results.vcm);
  const omega = num(results.omega);
  const R = num(results.radius, 0.5);
  const phi = num(results.phi);
  const top = num(results.topSpeed);
  const slip = num(results.wheelSlip);
  const rolls = num(results.wheelRolls) === 1;
  title(`${ROLLERS[id].label} on level ground`);

  const Rp = Math.min(56, (scene.height - 70) / 2.6);
  const ground = scene.y + scene.height - 34;
  const track = scene.width - 2 * Rp - 8;
  const travelled = (num(results.wheelX) * Rp) / R;
  const cx = scene.x + Rp + 4 + (((travelled % track) + track) % track);
  const cy = ground - Rp;
  line(ctx, scene.x, ground, scene.x + scene.width, ground, theme.axis, 2);
  roller(ctx, id, cx, cy, Rp, phi, theme.sine, true);
  line(ctx, cx, cy, cx - Rp * Math.sin(phi), cy + Rp * Math.cos(phi), theme.sine, 2);
  const mx = cx + Rp * Math.sin(phi);
  const my = cy - Rp * Math.cos(phi);
  circle(ctx, mx, my, 5, { fill: theme.angle });
  circle(ctx, cx, ground, 3.5, { fill: rolls ? theme.tangent : theme.secant });

  const biggest = Math.max(Math.abs(top), Math.abs(v), Math.abs(slip), num(results.pointSpeed), 0.5);
  const k = Math.min(16, (scene.width / 2 - Rp - 12) / biggest);
  arrow(ctx, cx, cy, cx + v * k, cy, { color: theme.text, width: 2, head: 7 });
  if (Math.abs(slip) > 0.05 && num(results.mu) > 0) {
    // Kinetic friction at the contact point opposes its sliding.
    const dir = -Math.sign(slip);
    arrow(ctx, cx, ground + 8, cx + dir * 26, ground + 8, { color: theme.secant, width: 2, head: 6 });
    label(ctx, "f", cx + dir * 32, ground + 8, { color: theme.secant, font: theme.fontStrong, align: "center" });
  }
  if (!words) return;

  arrow(ctx, cx, cy - Rp, cx + top * k, cy - Rp, { color: theme.tangent, width: 2.5, head: 7 });
  arrow(ctx, cx, ground, cx + slip * k, ground, { color: theme.secant, width: 2.5, head: 7 });
  arrow(ctx, mx, my, mx + num(results.pointVx) * k, my - num(results.pointVy) * k, { color: theme.angle, width: 2, head: 7 });
  const at = (x: number) => Math.min(scene.x + scene.width - 4, Math.max(scene.x + 4, x));
  label(ctx, `top ${fixed(top, 1)} m/s`, at(cx - 4), cy - Rp - 12, { color: theme.tangent, font: theme.font, align: cx - 4 < scene.x + 90 ? "left" : "right" });
  label(ctx, `v = ${fixed(v, 1)} m/s`, at(cx + 6), cy + 14, { color: theme.text, font: theme.font, align: cx + 96 > scene.x + scene.width ? "right" : "left" });
  label(ctx, `marked point ${fixed(num(results.pointSpeed))} m/s`, info.x, info.y + 8, { color: theme.angle, font: theme.font });
  label(ctx, `ω = ${fixed(omega, 1)} rad/s · ωR = ${fixed(omega * R)} m/s`, info.x, info.y + 28, { color: theme.muted, font: theme.font });
  caption(rolls ? "Rolling: v = ωR, the contact point is at rest" : `Contact point slides at ${fixed(slip)} m/s`);
}

function drawBalance(ctx: CanvasRenderingContext2D, layout: RollingLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean, title: (t: string) => void, caption: (t: string) => void) {
  const { scene, info } = layout;
  const sceneId = ROLL_SCENE_ORDER[Math.round(num(results.scene))] ?? "seesaw";

  if (sceneId === "ladder") {
    title("A 3 m, 20 kg ladder against a smooth wall");
    const foot = num(results.foot, 1);
    const rise = num(results.ladderHeight, 2.8);
    const k = Math.min((scene.height - 30) / ROLL_LADDER_LENGTH, (scene.width - 120) / 2.5);
    const wall = scene.x + 40;
    const floor = scene.y + scene.height - 18;
    line(ctx, wall, scene.y + 4, wall, floor, theme.neutral, 4);
    line(ctx, wall, floor, scene.x + scene.width, floor, theme.neutral, 4);
    const fx = wall + foot * k;
    const ty = floor - rise * k;
    line(ctx, fx, floor, wall, ty, theme.angle, 5);
    const mx = (fx + wall) / 2;
    const my = (floor + ty) / 2;
    const n = 70 / 196;
    const wallF = num(results.wallForce);
    const friction = num(results.floorFriction);
    arrow(ctx, mx, my, mx, my + 196 * n, { color: theme.cosine, width: 2.5, head: 8 });
    arrow(ctx, fx, floor, fx, floor - num(results.floorNormal) * n, { color: theme.sine, width: 2.5, head: 8 });
    arrow(ctx, wall, ty, wall + Math.max(8, wallF * n), ty, { color: theme.tangent, width: 2.5, head: 7 });
    arrow(ctx, fx, floor + 8, fx - Math.max(8, friction * n), floor + 8, { color: theme.secant, width: 2.5, head: 7 });
    label(ctx, "W", mx + 8, my + 60, { color: theme.cosine, font: theme.fontStrong });
    label(ctx, "N", fx + 8, floor - 60, { color: theme.sine, font: theme.fontStrong });
    label(ctx, "F₁", wall + Math.max(8, wallF * n) + 6, ty, { color: theme.tangent, font: theme.fontStrong });
    label(ctx, "f", fx - Math.max(8, friction * n) - 6, floor + 8, { color: theme.secant, font: theme.fontStrong, align: "right" });
    label(ctx, `${fixed(foot, 1)} m`, (wall + fx) / 2, floor - 10, { color: theme.muted, font: theme.font, align: "center" });
    if (!words) return;
    label(ctx, `F₁ = ${fixed(wallF, 1)} N · N = ${fixed(num(results.floorNormal), 0)} N`, info.x, info.y + 8, { color: theme.text, font: theme.font });
    label(ctx, `floor's total push ${fixed(num(results.floorForce), 0)} N`, info.x, info.y + 28, { color: theme.muted, font: theme.font });
    const mu = num(results.mu);
    caption(
      num(results.stands) === 1
        ? `Needs μ ≥ ${fixed(num(results.ladderMuNeeded))}, floor has ${fixed(mu)}: it stands`
        : `Needs μ ≥ ${fixed(num(results.ladderMuNeeded))}, floor has ${fixed(mu)}: it slips`,
    );
    return;
  }

  const cx = scene.x + scene.width / 2;
  const cy = scene.y + scene.height * 0.5;
  const k = (scene.width - 36) / (2 * ROLL_BEAM_HALF);
  const x1 = num(results.x1);
  const x2 = num(results.x2);
  const tilt = num(results.tilt);
  const angle = sceneId === "seesaw" ? (tilt * 8) / DEG : 0;
  // Positions along the plank, turned with it (left end down for a positive tilt).
  const at = (x: number): [number, number] => [cx + x * k * Math.cos(angle), cy - x * k * Math.sin(-angle)];
  const [lx, ly] = at(-ROLL_BEAM_HALF);
  const [rx, ry] = at(ROLL_BEAM_HALF);
  line(ctx, lx, ly, rx, ry, theme.neutral, 6);

  if (sceneId === "couple") {
    title("A couple: two equal, opposite forces");
    const force = num(results.force, 20);
    const len = 20 + (force / 100) * 50;
    const [ax, ay] = at(-x1);
    const [bx, by] = at(x2);
    arrow(ctx, ax, ay, ax, ay - len, { color: theme.tangent, width: 2.5, head: 8 });
    arrow(ctx, bx, by, bx, by + len, { color: theme.tangent, width: 2.5, head: 8 });
    label(ctx, `F = ${fixed(force, 0)} N`, ax, ay - len - 10, { color: theme.tangent, font: theme.font, align: "center" });
    label(ctx, `F = ${fixed(force, 0)} N`, bx, by + len + 10, { color: theme.tangent, font: theme.font, align: "center" });
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.restore();
    arrow(ctx, cx + 22 * Math.cos(Math.PI * 1.8), cy + 22 * Math.sin(Math.PI * 1.8), cx + 22 * Math.cos(Math.PI * 1.88), cy + 22 * Math.sin(Math.PI * 1.88), { color: theme.angle, width: 2, head: 7 });
    label(ctx, `${fixed(x1 + x2, 1)} m apart`, cx, cy + 22, { color: theme.muted, font: theme.font, align: "center" });
    if (!words) return;
    label(ctx, "ΣF = 0: the centre does not move", info.x, info.y + 8, { color: theme.text, font: theme.font });
    caption(`τ = F × ${fixed(x1 + x2, 1)} m = ${fixed(num(results.coupleTorque), 0)} N m: it turns`);
    return;
  }

  title("A 4 m see-saw, pivoted at its middle");
  const m1 = num(results.m1, 30);
  const m2 = num(results.m2, 40);
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 3);
  ctx.lineTo(cx - 16, cy + 34);
  ctx.lineTo(cx + 16, cy + 34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const load = (x: number, m: number, colour: string) => {
    const [px, py] = at(x);
    const side = 12 + (m / 60) * 18;
    ctx.save();
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(px - side / 2, py - 3 - side, side, side);
    ctx.restore();
    label(ctx, `${fixed(m, 0)} kg`, px, py - side - 14, { color: colour, font: theme.font, align: "center" });
    arrow(ctx, px, py + 4, px, py + 4 + 14 + (m / 60) * 40, { color: colour, width: 2, head: 6 });
    label(ctx, `${fixed(Math.abs(x), 1)} m`, px, py + 66, { color: theme.muted, font: theme.font, align: "center" });
  };
  load(-x1, m1, theme.sine);
  load(x2, m2, theme.cosine);
  if (!words) return;
  const pivot = num(results.pivotForce);
  arrow(ctx, cx, cy + 34 + 40, cx, cy + 36, { color: theme.tangent, width: 2, head: 7 });
  label(ctx, `${fixed(pivot, 0)} N`, cx + 8, cy + 62, { color: theme.tangent, font: theme.font });
  const left = num(results.torqueLeft);
  const rightT = num(results.torqueRight);
  label(ctx, `left ${fixed(left, 0)} N m · right ${fixed(rightT, 0)} N m`, info.x, info.y + 8, { color: theme.text, font: theme.font });
  label(ctx, `centre of gravity ${fixed(num(results.cgX))} m from the pivot`, info.x, info.y + 28, { color: theme.muted, font: theme.font });
  caption(tilt === 0 ? "Balanced: m₁x₁ = m₂x₂, Στ = 0" : tilt > 0 ? "The left turns it more: the left end goes down" : "The right turns it more: the right end goes down");
}

export const rollingRenderer: SimulationRenderer<RollingLayout> = {
  id: "rolling",
  layout: (width) => computeRollingLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (text: string) => label(ctx, text, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const r = results as Record<string, unknown>;
    if (has("inertia")) drawInertia(ctx, layout, r, theme, words, title, caption);
    else if (has("race")) drawRace(ctx, layout, r, theme, words, title, caption);
    else if (has("wheel")) drawWheel(ctx, layout, r, theme, words, title, caption);
    else if (has("balance")) drawBalance(ctx, layout, r, theme, words, title, caption);
  },
};
