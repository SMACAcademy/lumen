/**
 * Moving charges and magnetism, one picture per mode.
 *
 * Orbit: looking along B (⊗ into the page or ⊙ out of it), the charge goes
 * round its circle with its velocity along the path and the force towards
 * the centre. The circle is drawn to a scale chosen to fit, so its radius is
 * read from the words, not the screen.
 *
 * Helix: from the side, with B to the right — the circle stretched out along
 * B, the near half solid and the far half faint.
 *
 * Selector: plates with E down the page and ⊗ B, the two forces on the charge
 * drawn to scale against each other, and the path straight or bent.
 *
 * Cyclotron: the two dees, ⊗ B, and the ion's growing semicircles (a
 * schematic: at most forty of them however many crossings there are).
 *
 * Wire: B to the right, the wire at θ to it, and the force ⊗ or ⊙.
 * Parallel: two wires, the field of the first at the second, and the pair of
 * forces. Torque: a coil seen from above, edge-on. Galvanometer: the radial
 * field between curved poles and a centre-zero scale.
 *
 * Source: a current element, a long wire, a loop or solenoid side-on, or a
 * toroid — with the field point or Amperian circle.
 */

import { LORENTZ_DIRECTION, LORENTZ_FULL_SCALE, LORENTZ_ION_ORDER, LORENTZ_IONS, LORENTZ_PARTICLE_ORDER, LORENTZ_PARTICLES, LORENTZ_SOURCE_ORDER, LORENTZ_TOROID_INNER, LORENTZ_TOROID_OUTER } from "@ise/physics-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface LorentzLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where the picture goes, between the title and the captions. */
  box: Box;
}

export function computeLorentzLayout(width: number): LorentzLayout {
  const compact = width < 560;
  const height = compact ? 390 : 420;
  return { width, height, compact, box: { x: 16, y: 30, width: width - 32, height: height - 30 - 50 } };
}

const SUPERSCRIPT: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** `figures` significant figures, with a power of ten when the number is very small or large. */
export function lorentzSig(v: number, figures = 3): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(v)));
  if (exponent >= -3 && exponent < 6) {
    const digits = clamp(figures - 1 - exponent, 0, 8);
    return `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
  }
  const mantissa = (Math.abs(v) / 10 ** exponent).toFixed(figures - 1);
  const power = String(exponent).split("").map((c) => SUPERSCRIPT[c] ?? c).join("");
  return `${v < 0 ? "−" : ""}${mantissa} × 10${power}`;
}

const degrees = (rad: number) => `${Math.round((rad * 180) / Math.PI)}°`;

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, width = 2, dash?: number[], alpha = 1) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, opts: { fill?: boolean; width?: number; dash?: number[]; alpha?: number } = {}) {
  ctx.save();
  ctx.globalAlpha = opts.alpha ?? 1;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2);
  if (opts.fill) {
    ctx.fillStyle = colour;
    ctx.fill();
  } else {
    ctx.strokeStyle = colour;
    ctx.lineWidth = opts.width ?? 1.5;
    if (opts.dash) ctx.setLineDash(opts.dash);
    ctx.stroke();
  }
  ctx.restore();
}

/** ⊙ (out of the page) or ⊗ (into it). */
function mark(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, out: boolean, colour: string, alpha = 1) {
  circle(ctx, x, y, r, colour, { width: 1.5, alpha });
  if (out) circle(ctx, x, y, Math.max(1.2, r * 0.28), colour, { fill: true, alpha });
  else {
    const k = r * 0.62;
    line(ctx, x - k, y - k, x + k, y + k, colour, 1.5, undefined, alpha);
    line(ctx, x - k, y + k, x + k, y - k, colour, 1.5, undefined, alpha);
  }
}

/** A faint grid of ⊙ or ⊗ across a box. */
function markGrid(ctx: CanvasRenderingContext2D, box: Box, out: boolean, colour: string, spacing = 40) {
  const cols = Math.max(1, Math.floor(box.width / spacing));
  const rows = Math.max(1, Math.floor(box.height / spacing));
  const dx = box.width / cols;
  const dy = box.height / rows;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) mark(ctx, box.x + dx * (i + 0.5), box.y + dy * (j + 0.5), 4.5, out, colour, 0.45);
}

/** Horizontal field lines across a box, arrows to the right. */
function fieldLines(ctx: CanvasRenderingContext2D, box: Box, colour: string, rows = 5) {
  for (let j = 0; j < rows; j++) {
    const y = box.y + (box.height * (j + 0.5)) / rows;
    line(ctx, box.x, y, box.x + box.width, y, colour, 1, undefined, 0.45);
    arrow(ctx, box.x + box.width * 0.5 - 8, y, box.x + box.width * 0.5 + 8, y, { color: colour, width: 1, head: 7, alpha: 0.6 });
  }
}

/** A curved arrow round (x, y): anticlockwise on screen when `anticlockwise`. */
function turnArrow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, anticlockwise: boolean, colour: string) {
  // Canvas angles grow clockwise on screen, so anticlockwise means decreasing angles.
  const start = Math.PI / 2;
  const end = anticlockwise ? start - 4.2 : start + 4.2;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, start, end, anticlockwise);
  ctx.stroke();
  ctx.restore();
  // The head at the end, along the direction of travel.
  const ex = x + r * Math.cos(end);
  const ey = y + r * Math.sin(end);
  const tx = anticlockwise ? Math.sin(end) : -Math.sin(end);
  const ty = anticlockwise ? -Math.cos(end) : Math.cos(end);
  arrow(ctx, ex - tx * 6, ey - ty * 6, ex + tx * 4, ey + ty * 4, { color: colour, width: 2, head: 8 });
}

const DIRECTION_WORDS: Record<number, string> = {
  [LORENTZ_DIRECTION.none]: "no field",
  [LORENTZ_DIRECTION.out]: "out of the page",
  [LORENTZ_DIRECTION.into]: "into the page",
  [LORENTZ_DIRECTION.anticlockwise]: "anticlockwise",
  [LORENTZ_DIRECTION.clockwise]: "clockwise",
  [LORENTZ_DIRECTION.right]: "to the right",
  [LORENTZ_DIRECTION.left]: "to the left",
};

/** A round 1, 2 or 5 × 10ⁿ at least as big as `v`. */
function niceAbove(v: number): number {
  if (!(v > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(v));
  for (const step of [1, 2, 5, 10]) if (step * power >= v - 1e-12) return step * power;
  return 10 * power;
}

export const lorentzRenderer: SimulationRenderer<LorentzLayout> = {
  id: "lorentz",
  layout: (width) => computeLorentzLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, box } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (text: string, row = 0) => label(ctx, text, width / 2, height - 14 - row * 18, { color: theme.text, font: theme.font, align: "center" });
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const B_COLOUR = theme.curve;
    const charge = num(results.chargeE, 1);
    const particle = LORENTZ_PARTICLES[LORENTZ_PARTICLE_ORDER[Math.round(num(results.particle))] ?? "proton"];

    if (has("orbit")) drawOrbit();
    if (has("helix")) drawHelix();
    if (has("selector")) drawSelector();
    if (has("cyclotron")) drawCyclotron();
    if (has("wire")) drawWire();
    if (has("parallel")) drawParallel();
    if (has("torque")) drawTorque();
    if (has("galvanometer")) drawGalvanometer();
    if (has("source")) drawSource();

    function chargeDot(x: number, y: number, positive = charge > 0) {
      circle(ctx, x, y, 8, positive ? theme.secant : theme.sine, { fill: true });
      label(ctx, positive ? "+" : "−", x, y, { color: theme.background, font: theme.fontStrong, align: "center" });
    }

    function drawOrbit() {
      const out = num(results.fieldDirection) === 1;
      const tilted = num(results.pitchAngle) < Math.PI / 2 - 1e-6;
      title(`${particle.label}, B ${out ? "out of" : "into"} page`);
      markGrid(ctx, box, out, B_COLOUR);
      if (tilted) label(ctx, "seen along B", box.x + 2, box.y + 6, { color: theme.muted, font: theme.font });
      const radius = num(results.radius);
      const sense = num(results.sense);
      if (radius <= 0 || sense === 0) {
        chargeDot(cx, cy);
        label(ctx, "moving along B: no force", cx, cy + 24, { color: theme.text, font: theme.font, align: "center" });
        return;
      }
      const maxR = Math.min(box.width, box.height) / 2 - 16;
      const R = (maxR * radius) / niceAbove(radius);
      circle(ctx, cx, cy, R, theme.tangent, { dash: [5, 5], alpha: 0.7 });
      const phi = 2 * Math.PI * num(results.turn);
      // Anticlockwise: start at the bottom moving right; clockwise: at the top moving right.
      const ox = R * Math.sin(phi);
      const oy = sense > 0 ? -R * Math.cos(phi) : R * Math.cos(phi);
      const px = cx + ox;
      const py = cy - oy;
      const vx = Math.cos(phi);
      const vy = sense > 0 ? Math.sin(phi) : -Math.sin(phi);
      line(ctx, cx, cy, px, py, theme.muted, 1, [3, 4]);
      circle(ctx, cx, cy, 2.5, theme.muted, { fill: true });
      const fLen = Math.min(34, R * 0.8);
      arrow(ctx, px, py, px - (ox / R) * fLen, py + (oy / R) * fLen, { color: theme.angle, width: 2.5, head: 8 });
      arrow(ctx, px, py, px + vx * 36, py - vy * 36, { color: theme.tangent, width: 2.5, head: 8 });
      label(ctx, "v", px + vx * 44, py - vy * 44, { color: theme.tangent, font: theme.fontStrong, align: "center" });
      label(ctx, "F", px - (ox / R) * (fLen + 9), py + (oy / R) * (fLen + 9), { color: theme.angle, font: theme.fontStrong, align: "center" });
      chargeDot(px, py);
      if (words) {
        caption(`r = ${lorentzSig(radius)} cm · T = ${lorentzSig(num(results.period))} µs`, 1);
        caption(`F = ${lorentzSig(num(results.force))} N · ${sense > 0 ? "anticlockwise" : "clockwise"}`);
      }
    }

    function drawHelix() {
      title(`${particle.label} spiralling along B`);
      fieldLines(ctx, box, B_COLOUR, 2);
      label(ctx, "B", box.x + box.width - 6, box.y + box.height * 0.25 - 10, { color: B_COLOUR, font: theme.fontStrong, align: "right" });
      const radius = num(results.radius);
      const pitch = num(results.pitch);
      const turns = 3;
      const k = Math.min(pitch > 0 ? (box.width - 60) / (turns * pitch) : Infinity, radius > 0 ? (box.height / 2 - 40) / radius : Infinity);
      const scale = Number.isFinite(k) ? k : 1;
      const r = radius * scale;
      const p = pitch * scale;
      const x0 = cx - (turns * p) / 2;
      const at = (phi: number) => ({ x: x0 + (p * phi) / (2 * Math.PI), y: cy - r * Math.cos(phi), front: Math.sin(phi) >= 0 });
      const N = 180;
      for (let i = 0; i < N; i++) {
        const a = at((2 * Math.PI * turns * i) / N);
        const b = at((2 * Math.PI * turns * (i + 1)) / N);
        line(ctx, a.x, a.y, b.x, b.y, theme.tangent, a.front ? 2.5 : 1.5, undefined, a.front ? 1 : 0.35);
      }
      line(ctx, x0 - 16, cy, x0 + turns * p + 16, cy, theme.muted, 1, [3, 4]);
      const here = at(2 * Math.PI * num(results.turn));
      chargeDot(here.x, here.y);
      // The velocity at the start: θ from B.
      const theta = num(results.pitchAngle);
      const start = at(0);
      arrow(ctx, start.x, start.y, start.x + 40 * Math.cos(theta), start.y - 40 * Math.sin(theta), { color: theme.angle, width: 2, head: 7 });
      label(ctx, `θ = ${degrees(theta)}`, start.x, start.y - 16, { color: theme.angle, font: theme.font, align: "center" });
      if (p > 4) {
        const top = cy - r - 14;
        arrow(ctx, at(0).x, top, at(2 * Math.PI).x, top, { color: theme.text, width: 1.5, head: 6, double: true });
        label(ctx, "p", (at(0).x + at(2 * Math.PI).x) / 2, top - 9, { color: theme.text, font: theme.fontStrong, align: "center" });
      }
      if (words) caption(`r = ${lorentzSig(radius)} cm · pitch p = ${lorentzSig(pitch)} cm`);
    }

    function drawSelector() {
      title(`${particle.label} in a velocity selector`);
      const top = box.y + 24;
      const bottom = box.y + box.height - 24;
      ctx.save();
      ctx.fillStyle = theme.neutral;
      ctx.fillRect(box.x, top - 6, box.width, 6);
      ctx.fillRect(box.x, bottom, box.width, 6);
      ctx.restore();
      label(ctx, "+ + + +", cx, top - 14, { color: theme.secant, font: theme.fontStrong, align: "center" });
      label(ctx, "− − − −", cx, bottom + 16, { color: theme.sine, font: theme.fontStrong, align: "center" });
      markGrid(ctx, { x: box.x, y: top, width: box.width, height: bottom - top }, false, B_COLOUR, 46);
      for (const fx of [0.12, 0.88]) arrow(ctx, box.x + box.width * fx, top + 8, box.x + box.width * fx, top + 40, { color: theme.reference, width: 1.5, head: 6 });
      label(ctx, "E", box.x + box.width * 0.12 + 8, top + 26, { color: theme.reference, font: theme.fontStrong });
      const mid = (top + bottom) / 2;
      const right = box.x + box.width - 8;
      // The exit slit, on the axis.
      line(ctx, right, top, right, mid - 9, theme.text, 3);
      line(ctx, right, mid + 9, right, bottom, theme.text, 3);
      const qE = num(results.electricForce);
      const qvB = num(results.magneticForce);
      const most = Math.max(qE, qvB, 1e-30);
      const deflect = num(results.selectorDeflect);
      const bend = deflect === 0 ? 0 : deflect * Math.min(1, Math.abs(qvB - qE) / most) * ((bottom - top) / 2 - 12);
      const length = box.width - 8;
      const path = (f: number) => ({ x: box.x + length * f, y: mid - bend * f * f });
      ctx.save();
      ctx.strokeStyle = theme.tangent;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      for (let i = 0; i <= 40; i++) {
        const { x, y } = path(i / 40);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      const here = path(0.4);
      // On a positive charge qE is down the page and qvB up; on a negative one, the reverse.
      const up = charge > 0 ? 1 : -1;
      const longest = Math.min(48, (bottom - top) / 2 - 14);
      arrow(ctx, here.x, here.y, here.x, here.y + up * longest * (qE / most), { color: theme.reference, width: 2.5, head: 8 });
      arrow(ctx, here.x, here.y, here.x, here.y - up * longest * (qvB / most), { color: theme.angle, width: 2.5, head: 8 });
      label(ctx, "qE", here.x + 12, here.y + up * longest * 0.6, { color: theme.reference, font: theme.fontStrong });
      label(ctx, "qvB", here.x + 12, here.y - up * longest * 0.6, { color: theme.angle, font: theme.fontStrong });
      chargeDot(here.x, here.y);
      if (words) {
        const verdict = deflect === 0 ? "passes" : deflect > 0 ? "bends up" : "bends down";
        caption(`E/B = ${lorentzSig(num(results.selectorSpeed))} km/s · v = ${lorentzSig(num(results.speed))} km/s: ${verdict}`);
      }
    }

    function drawCyclotron() {
      const ion = LORENTZ_IONS[LORENTZ_ION_ORDER[Math.round(num(results.ion))] ?? "proton"];
      title(`Cyclotron: ${ion.label.toLowerCase()}`);
      const R = Math.min(box.width, box.height) / 2 - 12;
      const gap = 12;
      for (const side of [-1, 1]) {
        const x = cx + (side * gap) / 2;
        ctx.save();
        ctx.fillStyle = theme.neutral;
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = theme.neutral;
        ctx.beginPath();
        if (side > 0) ctx.arc(x, cy, R, -Math.PI / 2, Math.PI / 2);
        else ctx.arc(x, cy, R, Math.PI / 2, (3 * Math.PI) / 2);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
      label(ctx, "D₁", cx - R * 0.75, cy - R * 0.75, { color: theme.muted, font: theme.fontStrong, align: "center" });
      label(ctx, "D₂", cx + R * 0.75, cy - R * 0.75, { color: theme.muted, font: theme.fontStrong, align: "center" });
      for (const [fx, fy] of [[-0.7, 0.55], [0.7, 0.55], [-0.45, -0.25], [0.45, -0.25]] as const) mark(ctx, cx + fx * R, cy + fy * R, 4.5, false, B_COLOUR, 0.6);
      label(ctx, "B ⊗", cx + R * 0.75, cy + R * 0.82, { color: B_COLOUR, font: theme.font, align: "center" });
      label(ctx, "~", cx, cy + R + 8, { color: theme.text, font: theme.fontStrong, align: "center" });

      const needed = Math.max(1, num(results.crossingsNeeded, 1));
      const shown = Math.min(needed, 40);
      const done = Math.round((num(results.crossings) / needed) * shown);
      // Semicircles in physics coordinates (y up); a positive ion in B into the page goes anticlockwise.
      let y = -R * Math.sqrt(1 / shown);
      let x = cx + gap / 2;
      ctx.save();
      ctx.strokeStyle = theme.tangent;
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= done; i++) {
        const r = R * Math.sqrt(i / shown);
        const right = i % 2 === 1;
        x = cx + ((right ? 1 : -1) * gap) / 2;
        ctx.beginPath();
        if (right) ctx.arc(x, cy - (y + r), r, Math.PI / 2, -Math.PI / 2, true);
        else ctx.arc(x, cy - (y - r), r, -Math.PI / 2, Math.PI / 2, true);
        ctx.stroke();
        y = right ? y + 2 * r : y - 2 * r;
      }
      ctx.restore();
      chargeDot(done === 0 ? cx : x, done === 0 ? cy : cy - y, true);
      if (num(results.exited) === 1) label(ctx, "beam out", cx, box.y + 4, { color: theme.tangent, font: theme.fontStrong, align: "center" });
      if (words) {
        caption(`R = ${lorentzSig(num(results.deeRadius))} cm · B = ${lorentzSig(num(results.cycField))} T · ${num(results.crossings)}/${needed} crossings`, 1);
        caption(`f = ${lorentzSig(num(results.cycFrequency))} MHz · K = ${lorentzSig(num(results.energyNow))} of ${lorentzSig(num(results.maxEnergy))} MeV`);
      }
    }

    function drawWire() {
      title("A current-carrying wire in a field");
      fieldLines(ctx, box, B_COLOUR, 6);
      label(ctx, "B", box.x + box.width - 4, box.y + box.height / 12 - 10, { color: B_COLOUR, font: theme.fontStrong, align: "right" });
      const theta = num(results.angle);
      const half = (Math.min(box.width, box.height) / 2 - 20) * clamp(num(results.length) / 100, 0.15, 1);
      const ux = Math.cos(theta);
      const uy = -Math.sin(theta);
      line(ctx, cx - ux * half, cy - uy * half, cx + ux * half, cy + uy * half, theme.neutral, 5);
      arrow(ctx, cx + ux * half * 0.3, cy + uy * half * 0.3, cx + ux * half * 0.85, cy + uy * half * 0.85, { color: theme.sine, width: 3, head: 10 });
      label(ctx, "I", cx + ux * half * 0.6 - uy * 14, cy + uy * half * 0.6 + ux * 14, { color: theme.sine, font: theme.fontStrong, align: "center" });
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, -theta, true);
      ctx.stroke();
      ctx.restore();
      label(ctx, "θ", cx + 32 * Math.cos(theta / 2), cy - 32 * Math.sin(theta / 2), { color: theme.text, font: theme.fontStrong, align: "center" });
      const dir = num(results.wireForceDir);
      const fx = cx - uy * 46;
      const fy = cy + ux * 46;
      if (dir === LORENTZ_DIRECTION.none) label(ctx, "F = 0", fx, fy, { color: theme.angle, font: theme.fontStrong, align: "center" });
      else {
        mark(ctx, fx, fy, 11, dir === LORENTZ_DIRECTION.out, theme.angle);
        label(ctx, "F", fx + 18, fy, { color: theme.angle, font: theme.fontStrong });
      }
      if (words) caption(`F = BIL sin θ = ${lorentzSig(num(results.wireForce))} N, ${DIRECTION_WORDS[dir]}`);
    }

    function drawParallel() {
      title("Two long parallel currents");
      const d = num(results.separation, 10);
      const gap = 24 + ((box.width - 110) * d) / 100;
      const x1 = cx - gap / 2;
      const x2 = cx + gap / 2;
      const top = box.y + 16;
      const bottom = box.y + box.height - 16;
      for (const x of [x1, x2]) line(ctx, x, top, x, bottom, theme.neutral, 4);
      const opposite = num(results.attract) === -1;
      arrow(ctx, x1, top + 70, x1, top + 20, { color: theme.sine, width: 3, head: 9 });
      if (opposite) arrow(ctx, x2, top + 20, x2, top + 70, { color: theme.sine, width: 3, head: 9 });
      else arrow(ctx, x2, top + 70, x2, top + 20, { color: theme.sine, width: 3, head: 9 });
      label(ctx, "I₁", x1 - 8, top + 44, { color: theme.sine, font: theme.fontStrong, align: "right" });
      label(ctx, "I₂", x2 + 8, top + 44, { color: theme.sine, font: theme.fontStrong });
      // Wire 1's current runs up the page, so its field at wire 2 (to its right) is into the page.
      if (num(results.current) > 0) {
        mark(ctx, x2 + 18, cy - 40, 7, false, B_COLOUR);
        label(ctx, "B₁", x2 + 30, cy - 40, { color: B_COLOUR, font: theme.fontStrong });
      }
      const attract = num(results.attract);
      if (attract !== 0) {
        const pull = attract > 0 ? 1 : -1;
        const len = Math.min(28, Math.max(12, gap / 2 - 4));
        arrow(ctx, x2, cy, x2 - pull * len, cy, { color: theme.angle, width: 2.5, head: 8 });
        arrow(ctx, x1, cy, x1 + pull * len, cy, { color: theme.angle, width: 2.5, head: 8 });
        label(ctx, "F", x2 - (pull * len) / 2, cy - 12, { color: theme.angle, font: theme.fontStrong, align: "center" });
      }
      arrow(ctx, x1, bottom - 16, x2, bottom - 16, { color: theme.text, width: 1.5, head: 6, double: true });
      label(ctx, "d", cx, bottom - 28, { color: theme.text, font: theme.fontStrong, align: "center" });
      if (words) {
        const verb = attract > 0 ? "attract" : attract < 0 ? "repel" : "no force";
        caption(`F/L = ${lorentzSig(num(results.forcePerLength))} N/m: ${verb}`);
      }
    }

    function drawTorque() {
      title("A coil in a uniform field, from above");
      fieldLines(ctx, box, B_COLOUR, 6);
      label(ctx, "B", box.x + box.width - 4, box.y + box.height / 12 - 10, { color: B_COLOUR, font: theme.fontStrong, align: "right" });
      const theta = num(results.angle);
      const half = Math.min(box.width, box.height) / 2 - 50;
      // The coil's plane is at right angles to m; the side at +t̂ carries current out of the page.
      const tx = -Math.sin(theta);
      const ty = Math.cos(theta);
      const ax = cx + tx * half;
      const ay = cy - ty * half;
      const bx = cx - tx * half;
      const by = cy + ty * half;
      line(ctx, ax, ay, bx, by, theme.neutral, 3);
      mark(ctx, ax, ay, 8, true, theme.sine);
      mark(ctx, bx, by, 8, false, theme.sine);
      if (num(results.sideForce) > 0) {
        // I ẑ × B x̂ = +ŷ on the ⊙ side, −ŷ on the ⊗ side.
        arrow(ctx, ax, ay - 10, ax, ay - 40, { color: theme.angle, width: 2.5, head: 8 });
        arrow(ctx, bx, by + 10, bx, by + 40, { color: theme.angle, width: 2.5, head: 8 });
        label(ctx, "F", ax + 10, ay - 32, { color: theme.angle, font: theme.fontStrong });
        label(ctx, "F", bx + 10, by + 32, { color: theme.angle, font: theme.fontStrong });
      }
      const mLen = 46;
      arrow(ctx, cx, cy, cx + Math.cos(theta) * mLen, cy - Math.sin(theta) * mLen, { color: theme.vector, width: 3, head: 9 });
      label(ctx, "m", cx + Math.cos(theta) * (mLen + 12), cy - Math.sin(theta) * (mLen + 12), { color: theme.vector, font: theme.fontStrong, align: "center" });
      const sense = num(results.torqueSense);
      if (sense !== 0) turnArrow(ctx, cx, cy, 22, sense > 0, theme.tangent);
      label(ctx, `θ = ${degrees(theta)}`, box.x + 4, box.y + box.height - 8, { color: theme.text, font: theme.font });
      if (words) {
        caption(`m = NIA = ${lorentzSig(num(results.moment))} A m²`, 1);
        caption(`τ = NIAB sin θ = ${lorentzSig(num(results.torque))} N m`);
      }
    }

    function drawGalvanometer() {
      title("Moving-coil galvanometer");
      // The magnet: concave poles round a soft-iron core, the field radial between them.
      const my = box.y + 62;
      const core = 22;
      const gapR = core + 16;
      for (const side of [-1, 1]) {
        // A curved pole piece: a thick arc round the core.
        const mid = side < 0 ? Math.PI : 0;
        ctx.save();
        ctx.strokeStyle = side < 0 ? theme.secant : theme.sine;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.arc(cx, my, gapR + 15, mid - Math.PI / 4, mid + Math.PI / 4);
        ctx.stroke();
        ctx.restore();
        label(ctx, side < 0 ? "N" : "S", cx + side * (gapR + 15), my, { color: theme.text, font: theme.fontStrong, align: "center" });
      }
      circle(ctx, cx, my, core, theme.neutral, { fill: true, alpha: 0.5 });
      for (const a of [-0.5, 0, 0.5, Math.PI - 0.5, Math.PI, Math.PI + 0.5]) {
        line(ctx, cx + Math.cos(a) * (core + 2), my + Math.sin(a) * (core + 2), cx + Math.cos(a) * (gapR - 2), my + Math.sin(a) * (gapR - 2), B_COLOUR, 1.2, undefined, 0.8);
      }
      const phi = num(results.deflection);
      // The coil's sides sit in the gap; it turns with the needle.
      const sx = Math.cos(phi) * (core + 8);
      const sy = Math.sin(phi) * (core + 8);
      mark(ctx, cx - sx, my - sy, 6, true, theme.sine);
      mark(ctx, cx + sx, my + sy, 6, false, theme.sine);
      label(ctx, "radial field", cx, my + 58, { color: B_COLOUR, font: theme.font, align: "center" });

      // The centre-zero scale.
      const pivotY = box.y + box.height - 8;
      const len = Math.min(box.width / 2 - 24, pivotY - (my + 78));
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, pivotY, len, -Math.PI / 2 - LORENTZ_FULL_SCALE, -Math.PI / 2 + LORENTZ_FULL_SCALE);
      ctx.stroke();
      ctx.restore();
      for (let tick = -6; tick <= 6; tick++) {
        const a = -Math.PI / 2 + (tick * LORENTZ_FULL_SCALE) / 6;
        const inner = tick % 3 === 0 ? len - 10 : len - 5;
        line(ctx, cx + Math.cos(a) * inner, pivotY + Math.sin(a) * inner, cx + Math.cos(a) * len, pivotY + Math.sin(a) * len, theme.text, 1.2);
      }
      label(ctx, "0", cx, pivotY - len - 9, { color: theme.text, font: theme.font, align: "center" });
      label(ctx, "−", cx + Math.cos(-Math.PI / 2 - LORENTZ_FULL_SCALE) * (len + 10), pivotY + Math.sin(-Math.PI / 2 - LORENTZ_FULL_SCALE) * (len + 10), { color: theme.text, font: theme.fontStrong, align: "center" });
      label(ctx, "+", cx + Math.cos(-Math.PI / 2 + LORENTZ_FULL_SCALE) * (len + 10), pivotY + Math.sin(-Math.PI / 2 + LORENTZ_FULL_SCALE) * (len + 10), { color: theme.text, font: theme.fontStrong, align: "center" });
      const needle = -Math.PI / 2 + phi;
      line(ctx, cx, pivotY, cx + Math.cos(needle) * (len - 4), pivotY + Math.sin(needle) * (len - 4), theme.angle, 2.5);
      circle(ctx, cx, pivotY, 4, theme.text, { fill: true });
      if (num(results.offScale) === 1) label(ctx, "off the scale!", cx, pivotY - len * 0.45, { color: theme.secant, font: theme.fontStrong, align: "center" });
      if (words) {
        caption(`I = ${lorentzSig(num(results.meterCurrent))} µA → φ = ${degrees(phi)} · ${lorentzSig(num(results.sensitivity))}° per µA`);
      }
    }

    function drawSource() {
      const id = LORENTZ_SOURCE_ORDER[Math.round(num(results.source))] ?? "wire";
      const reversed = num(results.flow) === 1;
      const dir = num(results.fieldDir);
      const k = (Math.min(box.width, box.height) / 2 - 18) / 50;
      const distance = num(results.distance, 10);
      const field = `B = ${lorentzSig(num(results.sourceField))} µT`;
      if (id === "element") {
        title("A current element (Biot–Savart)");
        const up = reversed ? 1 : -1;
        arrow(ctx, cx, cy - up * 12, cx, cy + up * 12, { color: theme.sine, width: 3, head: 8 });
        label(ctx, "I dl", cx - 10, cy, { color: theme.sine, font: theme.fontStrong, align: "right" });
        const theta = num(results.angle);
        const px = cx + distance * k * Math.sin(theta);
        const py = cy - distance * k * Math.cos(theta);
        line(ctx, cx, cy, px, py, theme.muted, 1.2, [4, 4]);
        line(ctx, cx, cy, cx, cy - 34, theme.muted, 1, [2, 3]);
        // θ runs from the element's direction to r; drawn for the element as first shown.
        if (!reversed) {
          ctx.save();
          ctx.strokeStyle = theme.text;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          if (Math.sin(theta) >= 0) ctx.arc(cx, cy, 26, -Math.PI / 2, theta - Math.PI / 2);
          else ctx.arc(cx, cy, 26, -Math.PI / 2, theta - Math.PI / 2 - 2 * Math.PI, true);
          ctx.stroke();
          ctx.restore();
          const half = Math.sin(theta) >= 0 ? theta / 2 : theta / 2 - Math.PI;
          label(ctx, "θ", cx + 38 * Math.sin(half), cy - 38 * Math.cos(half), { color: theme.text, font: theme.fontStrong, align: "center" });
        }
        label(ctx, "r", (cx + px) / 2 + 8, (cy + py) / 2, { color: theme.muted, font: theme.fontStrong });
        if (dir === LORENTZ_DIRECTION.none) circle(ctx, px, py, 4, theme.angle, { fill: true });
        else mark(ctx, px, py, 9, dir === LORENTZ_DIRECTION.out, theme.angle);
        label(ctx, "P", px + 14, py - 12, { color: theme.angle, font: theme.fontStrong, align: "center" });
        if (words) caption(`dB = ${field.slice(4)}, ${DIRECTION_WORDS[dir]}`);
        return;
      }
      if (id === "wire") {
        title("Field of a long straight wire");
        for (const ring of [12, 24, 36, 48]) circle(ctx, cx, cy, ring * k, B_COLOUR, { width: 1, alpha: 0.35 });
        mark(ctx, cx, cy, 9, !reversed, theme.sine);
        label(ctx, "I", cx + 14, cy + 12, { color: theme.sine, font: theme.fontStrong });
        amperian(dir === LORENTZ_DIRECTION.anticlockwise);
        if (words) {
          caption(`∮B·dl ÷ μ₀ = ${lorentzSig(num(results.lineIntegral))} A = I enclosed`, 1);
          caption(`${field} at r = ${lorentzSig(distance)} cm, ${DIRECTION_WORDS[dir]}`);
        }
        return;
      }
      if (id === "toroid") {
        title("Field of a toroid");
        ctx.save();
        ctx.fillStyle = theme.neutral;
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(cx, cy, LORENTZ_TOROID_OUTER * k, 0, Math.PI * 2);
        ctx.arc(cx, cy, LORENTZ_TOROID_INNER * k, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.restore();
        for (let i = 0; i < 10; i++) {
          const a = (2 * Math.PI * i) / 10;
          mark(ctx, cx + Math.cos(a) * LORENTZ_TOROID_INNER * k, cy + Math.sin(a) * LORENTZ_TOROID_INNER * k, 4, !reversed, theme.sine);
        }
        for (let i = 0; i < 16; i++) {
          const a = (2 * Math.PI * i) / 16;
          mark(ctx, cx + Math.cos(a) * LORENTZ_TOROID_OUTER * k, cy + Math.sin(a) * LORENTZ_TOROID_OUTER * k, 4, reversed, theme.sine);
        }
        amperian(dir === LORENTZ_DIRECTION.anticlockwise);
        if (words) {
          caption(`I enclosed = ${lorentzSig(num(results.enclosed))} A`, 1);
          caption(`${field} at r = ${lorentzSig(distance)} cm${dir === LORENTZ_DIRECTION.none ? "" : `, ${DIRECTION_WORDS[dir]}`}`);
        }
        return;
      }
      // Loop and solenoid, side-on: ⊙ along the top, ⊗ along the bottom, B along the axis.
      const right = dir === LORENTZ_DIRECTION.right || (dir === LORENTZ_DIRECTION.none && !reversed);
      if (id === "loop") {
        title("Field of a circular loop, side-on");
        const scale = Math.min((box.height / 2 - 16) / 50, (box.width * 0.62) / 50);
        const R = Math.max(8, distance * scale);
        const x0 = box.x + box.width * 0.3;
        line(ctx, box.x, cy, box.x + box.width, cy, theme.muted, 1, [3, 4]);
        ctx.save();
        ctx.strokeStyle = theme.neutral;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x0, cy, R * 0.25, R, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        mark(ctx, x0, cy - R, 7, right, theme.sine);
        mark(ctx, x0, cy + R, 7, !right, theme.sine);
        label(ctx, "R", x0 - 10, cy - R / 2, { color: theme.text, font: theme.fontStrong, align: "right" });
        const px = x0 + num(results.axial) * scale;
        circle(ctx, px, cy, 3.5, theme.angle, { fill: true });
        label(ctx, "P", px, cy + 14, { color: theme.angle, font: theme.fontStrong, align: "center" });
        if (dir !== LORENTZ_DIRECTION.none) arrow(ctx, px, cy - 16, px + (right ? 30 : -30), cy - 16, { color: B_COLOUR, width: 2.5, head: 8 });
        if (words) {
          caption(`at the centre B = μ₀NI/2R = ${lorentzSig(num(results.centreField))} µT`, 1);
          caption(`${field} at P, ${DIRECTION_WORDS[dir]}`);
        }
        return;
      }
      title("Field inside a solenoid");
      const left = box.x + 34;
      const end = box.x + box.width - 34;
      const halfH = 34;
      const count = clamp(Math.round(num(results.turns) / 10), 4, 14);
      for (let i = 0; i < count; i++) {
        const x = left + ((end - left) * (i + 0.5)) / count;
        mark(ctx, x, cy - halfH, 5, right, theme.sine);
        mark(ctx, x, cy + halfH, 5, !right, theme.sine);
      }
      line(ctx, left, cy - halfH, end, cy - halfH, theme.neutral, 1, undefined, 0.4);
      line(ctx, left, cy + halfH, end, cy + halfH, theme.neutral, 1, undefined, 0.4);
      if (dir !== LORENTZ_DIRECTION.none) {
        for (const dy of [-14, 0, 14]) {
          const a = right ? left + 20 : end - 20;
          const b = right ? end - 20 : left + 20;
          arrow(ctx, a, cy + dy, b, cy + dy, { color: B_COLOUR, width: 1.8, head: 8 });
        }
        label(ctx, right ? "S" : "N", left - 14, cy, { color: theme.text, font: theme.fontStrong, align: "center" });
        label(ctx, right ? "N" : "S", end + 14, cy, { color: theme.text, font: theme.fontStrong, align: "center" });
      }
      label(ctx, "L", (left + end) / 2, cy + halfH + 22, { color: theme.text, font: theme.fontStrong, align: "center" });
      if (words) {
        caption(`n = N/L = ${lorentzSig(num(results.turnsPerMetre))} turns per metre`, 1);
        caption(`B = μ₀nI = ${lorentzSig(num(results.sourceField))} µT, ${DIRECTION_WORDS[dir]}`);
      }

      /** The dashed Amperian circle of radius r, and B along it at its top. */
      function amperian(anticlockwise: boolean) {
        const r = distance * k;
        circle(ctx, cx, cy, r, theme.angle, { dash: [6, 4], width: 2 });
        label(ctx, "r", cx + r * 0.7 + 6, cy + r * 0.7 + 6, { color: theme.angle, font: theme.fontStrong });
        if (dir !== LORENTZ_DIRECTION.none) {
          // At the top of an anticlockwise circle B points left.
          const s = anticlockwise ? -1 : 1;
          arrow(ctx, cx - s * 14, cy - r, cx + s * 14, cy - r, { color: B_COLOUR, width: 2.5, head: 8 });
          label(ctx, "B", cx, cy - r - 13, { color: B_COLOUR, font: theme.fontStrong, align: "center" });
        }
      }
    }
  },
};
