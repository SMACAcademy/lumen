/**
 * A box of gas, in four pictures.
 *
 * Box: a cylinder closed by a piston, with molecules flying about and
 * bouncing off the walls. Their speeds follow the Maxwell distribution, so
 * a few are much faster than the rest (drawn in a second colour); the whole
 * crowd speeds up as √T and slows down for a heavier gas. The piston sits
 * where the volume puts it, to scale; more gas means more molecules drawn.
 *
 * Speeds: the Maxwell curve for the gas at its temperature, with the most
 * probable, average and rms speeds marked, over the curve at 300 K so the
 * spreading and flattening with temperature can be seen.
 *
 * Freedom: the molecule, the directions it can move and the axes it can
 * turn about, and one tile per degree of freedom; Cv, Cp and γ follow.
 *
 * Path: one molecule's zig-zag through the crowd, each straight run drawn
 * in proportion to the mean free path.
 */

import { GASBOX_GAS_ORDER, GASBOX_GASES, GASBOX_MOLECULES, GASBOX_T_RANGE, GASBOX_V_RANGE, gasboxMaxwell, gasboxSpeeds } from "@ise/physics-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface GasboxLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The inside of the cylinder when the piston is pulled right out. */
  box: Box;
  /** The speed graph. */
  plot: Box;
}

export function computeGasboxLayout(width: number): GasboxLayout {
  const compact = width < 560;
  const height = compact ? 380 : 400;
  const left = compact ? 40 : 52;
  return {
    width,
    height,
    compact,
    box: { x: 16, y: 50, width: width - 40, height: compact ? 180 : 200 },
    plot: { x: left, y: 50, width: width - left - 16, height: height - 50 - 96 },
  };
}

/** Molecules drawn: twenty per mole, between 2 and 40. */
export function gasboxDrawnCount(amount: number): number {
  return clamp(Math.round(20 * amount), 2, GASBOX_MOLECULES.length);
}

/** Drawn speed, px/s, for a real speed in m/s: N₂ at 300 K drifts about 60 px a second. */
export const GASBOX_PX_PER_MS = 0.12;

/** Fold a coordinate back and forth into [0, length], as a ball bouncing between two walls. */
export function gasboxFold(u: number, length: number): number {
  if (!(length > 0)) return 0;
  const period = 2 * length;
  const m = ((u % period) + period) % period;
  return m <= length ? m : period - m;
}

/** Where the piston face is, px, for a volume in litres. */
export function gasboxPistonX(layout: GasboxLayout, volume: number): number {
  const v = clamp(volume, GASBOX_V_RANGE[0], GASBOX_V_RANGE[1]);
  return layout.box.x + (layout.box.width * v) / GASBOX_V_RANGE[1];
}

/** Each molecule's drawn position at time t: the seeded start, carried along and bounced off the walls. */
export function gasboxPositions(layout: GasboxLayout, volume: number, amount: number, vrms: number, t: number, radius: number) {
  const { box } = layout;
  const inner = gasboxPistonX(layout, volume) - 5 - box.x - 2 * radius;
  const tall = box.height - 2 * radius;
  return GASBOX_MOLECULES.slice(0, gasboxDrawnCount(amount)).map((m) => {
    const travel = m.speed * vrms * GASBOX_PX_PER_MS * t;
    return {
      x: box.x + radius + gasboxFold(m.x * inner + Math.cos(m.angle) * travel, inner),
      y: box.y + radius + gasboxFold(m.y * tall + Math.sin(m.angle) * travel, tall),
      fast: m.speed > 1,
    };
  });
}

/** Directions and run lengths (multiples of λ) of the drawn zig-zag: fixed, so the picture is steady. */
const PATH_RUNS = [1.3, 0.4, 2.1, 0.8, 1.6, 0.3, 1.0, 0.6, 1.9, 0.5, 1.2, 0.9, 0.7, 0.7];
const PATH_TURNS = [0.3, 2.4, 4.4, 1.2, 3.3, 5.6, 0.8, 2.9, 4.9, 1.9, 3.8, 5.2, 0.1, 2.2];

/** Pixels per nanometre of free path, and the shortest and longest run drawn. */
export function gasboxRunPx(freePath: number, layout: GasboxLayout): number {
  return clamp(freePath * 0.6, 3, 0.45 * layout.box.height);
}

const fixed = (v: number, digits = 1) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const SUPERSCRIPT: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** 6.21 × 10⁻²¹ */
export function gasboxScientific(v: number, figures = 3): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(v)));
  let mantissa = v / 10 ** exponent;
  let e = exponent;
  if (Math.abs(Number(mantissa.toFixed(figures - 1))) >= 10) {
    mantissa /= 10;
    e += 1;
  }
  const power = String(e).split("").map((c) => SUPERSCRIPT[c] ?? c).join("");
  return `${mantissa.toFixed(figures - 1)} × 10${power}`;
}

/** Round up to a whole number of `step`s. */
const ceilTo = (v: number, step: number) => Math.ceil(v / step) * step;

/** The speed graph's window for a gas: wide enough for the hottest curve, tall enough for the coldest. */
export function gasboxSpeedWindow(M: number): { x: [number, number]; y: [number, number] } {
  const hot = gasboxSpeeds(GASBOX_T_RANGE[1], M).vmp;
  const cold = gasboxSpeeds(GASBOX_T_RANGE[0], M).vmp;
  return { x: [0, ceilTo(3.2 * hot, 500)], y: [0, ceilTo(gasboxMaxwell(cold, cold) * 1e4 * 1.08, 5)] };
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

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, width = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** The Maxwell curve in % per 100 m/s. */
function curve(ctx: CanvasRenderingContext2D, plane: Plane, vmp: number, colour: string, width: number, options: { dash?: number[]; fill?: boolean } = {}) {
  const [x0, x1] = plane.xDomain;
  const points: [number, number][] = [];
  for (let i = 0; i <= 200; i++) {
    const v = x0 + ((x1 - x0) * i) / 200;
    points.push(plane.toPx(v, gasboxMaxwell(v, vmp) * 1e4));
  }
  ctx.save();
  clipToPlane(ctx, plane);
  if (options.fill) {
    ctx.fillStyle = colour;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    const [bx, by] = plane.toPx(x0, 0);
    ctx.moveTo(bx, by);
    for (const [px, py] of points) ctx.lineTo(px, py);
    ctx.lineTo(plane.toPx(x1, 0)[0], by);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  if (options.dash) ctx.setLineDash(options.dash);
  ctx.beginPath();
  points.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
  ctx.stroke();
  ctx.restore();
}

/** The atoms of a molecule, offsets from its centre, px. */
function atoms(shape: number): { dx: number; dy: number; r: number; centre: boolean }[] {
  switch (shape) {
    case 0: return [{ dx: 0, dy: 0, r: 14, centre: true }];
    case 1: return [{ dx: -15, dy: 0, r: 13, centre: false }, { dx: 15, dy: 0, r: 13, centre: false }];
    case 2: return [{ dx: -26, dy: 0, r: 11, centre: false }, { dx: 0, dy: 0, r: 12, centre: true }, { dx: 26, dy: 0, r: 11, centre: false }];
    default: return [
      { dx: 0, dy: -24, r: 8, centre: false },
      { dx: -23, dy: 13, r: 8, centre: false },
      { dx: 23, dy: 13, r: 8, centre: false },
      { dx: 0, dy: 0, r: 13, centre: true },
      { dx: 7, dy: 9, r: 7, centre: false },
    ];
  }
}

const SHAPE_WORD = ["monatomic", "diatomic", "linear", "non-linear"];

function drawBox(ctx: CanvasRenderingContext2D, layout: GasboxLayout, results: Record<string, unknown>, theme: LabTheme, faded: boolean) {
  const { box } = layout;
  const volume = num(results.volume, 25);
  const amount = num(results.amount, 1);
  const vrms = num(results.vrms);
  const t = num(results.t);
  const pressure = num(results.pressure);
  const radius = 2 + 5 * num(results.diameter, 0.3);
  const px = gasboxPistonX(layout, volume);

  // The gas, the cylinder walls and the piston with its rod.
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.07;
  ctx.fillRect(box.x, box.y, px - box.x, box.height);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(box.x + box.width + 8, box.y);
  ctx.lineTo(box.x, box.y);
  ctx.lineTo(box.x, box.y + box.height);
  ctx.lineTo(box.x + box.width + 8, box.y + box.height);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.fillRect(px - 5, box.y + 1, 10, box.height - 2);
  ctx.restore();
  line(ctx, px + 5, box.y + box.height / 2, box.x + box.width + 16, box.y + box.height / 2, theme.neutral, 4);

  for (const m of gasboxPositions(layout, volume, amount, vrms, t, radius)) disc(ctx, m.x, m.y, radius, m.fast ? theme.cosine : theme.sine, faded ? 0.25 : 1);

  // The push of the molecules on the piston: longer arrows for a higher pressure, no numbers.
  if (!faded) {
    const push = clamp(6 + (pressure / 100) * 12, 6, 34);
    for (const k of [0.25, 0.5, 0.75]) {
      const y = box.y + box.height * k + (k === 0.5 ? 14 : 0);
      arrow(ctx, px - 6 - push, y, px - 6, y, { color: theme.angle, width: 2, head: 6, alpha: 0.85 });
    }
  }
}

function drawPath(ctx: CanvasRenderingContext2D, layout: GasboxLayout, results: Record<string, unknown>, theme: LabTheme) {
  const { box } = layout;
  const px = gasboxPistonX(layout, num(results.volume, 25));
  const inner = px - 5 - box.x - 8;
  const tall = box.height - 8;
  const run = gasboxRunPx(num(results.freePath), layout);
  let x = inner / 2;
  let y = tall / 2;
  const at = (u: number, v: number): [number, number] => [box.x + 4 + gasboxFold(u, inner), box.y + 4 + gasboxFold(v, tall)];
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(...at(x, y));
  const hits: [number, number][] = [];
  PATH_RUNS.forEach((length, i) => {
    const dx = Math.cos(PATH_TURNS[i]!) * length * run;
    const dy = Math.sin(PATH_TURNS[i]!) * length * run;
    // Small pieces, each folded into the box, so a run that meets a wall bounces off it.
    for (let k = 1; k <= 12; k++) ctx.lineTo(...at(x + (dx * k) / 12, y + (dy * k) / 12));
    x += dx;
    y += dy;
    hits.push(at(x, y));
  });
  ctx.stroke();
  ctx.restore();
  hits.forEach(([hx, hy], i) => disc(ctx, hx, hy, i === hits.length - 1 ? 5 : 3, i === hits.length - 1 ? theme.text : theme.angle));
  disc(ctx, ...at(inner / 2, tall / 2), 4, theme.tangent);
}

export const gasboxRenderer: SimulationRenderer<GasboxLayout> = {
  id: "gasbox",
  layout: (width) => computeGasboxLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, box, plot } = layout;
    ctx.clearRect(0, 0, width, height);
    const gas = GASBOX_GASES[GASBOX_GAS_ORDER[Math.round(num(results.gas, 2))] ?? "n2"];
    const T = num(results.temperature, 300);
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const row = (words: string, y: number, colour = theme.text) => label(ctx, words, width / 2, y, { color: colour, font: theme.font, align: "center" });

    if (has("box")) {
      title(`${gas.name}, ${gas.formula}`);
      row(`${fixed(num(results.amount, 1))} mol · ${fixed(num(results.volume, 25))} L · ${Math.round(T)} K`, 33, theme.muted);
      const path = has("path");
      drawBox(ctx, layout, results, theme, path);
      const below = box.y + box.height + 22;
      if (path) {
        drawPath(ctx, layout, results, theme);
        if (has("labels")) {
          row(`mean free path λ = ${fixed(num(results.freePath))} nm`, below);
          row(`≈ ${Math.round(num(results.freePathRatio))} molecule diameters (d = ${num(results.diameter).toFixed(2)} nm)`, below + 20, theme.muted);
          row(`neighbours about ${fixed(num(results.spacing))} nm apart`, below + 40, theme.muted);
        }
        row("one molecule's path: a collision at each dot", height - 14, theme.angle);
      } else {
        if (has("labels")) {
          const p = num(results.pressure);
          row(`P = nRT / V = ${fixed(p)} kPa`, below);
          row(`⅓ρv²rms = ⅓ × ${num(results.density).toFixed(2)} × ${Math.round(num(results.vrms))}² Pa = ${fixed(num(results.pressureKinetic) / 1000)} kPa`, below + 20, theme.muted);
          row(`average KE = (3/2)k_BT = ${gasboxScientific(num(results.ke))} J`, below + 40, theme.muted);
        }
        // A key to the two colours of molecule.
        const y = height - 14;
        const x = width / 2 - 110;
        disc(ctx, x, y, 4, theme.cosine);
        label(ctx, "faster than v_rms", x + 9, y, { color: theme.muted, font: theme.font });
        disc(ctx, x + 132, y, 4, theme.sine);
        label(ctx, "slower", x + 141, y, { color: theme.muted, font: theme.font });
      }
    }

    if (has("maxwell")) {
      title(`${gas.name}: molecular speeds at ${Math.round(T)} K`);
      const window = gasboxSpeedWindow(gas.M);
      const plane = createPlane(plot, window.x, window.y);
      drawPlane(ctx, plane, theme);
      label(ctx, "% of molecules per 100 m/s", plot.x - 4, plot.y - 12, { color: theme.muted, font: theme.font });
      label(ctx, "speed / (m/s)", plot.x + plot.width, plot.y + plot.height + 26, { color: theme.muted, font: theme.font, align: "right" });
      const vmp = num(results.vmp);
      const reference = gasboxSpeeds(300, gas.M).vmp;
      if (Math.abs(T - 300) > 0.5) curve(ctx, plane, reference, theme.muted, 1.5, { dash: [5, 4] });
      curve(ctx, plane, vmp, theme.curve, 2.5, { fill: true });
      const marks = [
        { v: vmp, tag: "mp", colour: theme.angle },
        { v: num(results.vavg), tag: "avg", colour: theme.tangent },
        { v: num(results.vrms), tag: "rms", colour: theme.cosine },
      ];
      marks.forEach(({ v, tag, colour }, i) => {
        const [mx, my] = plane.toPx(v, gasboxMaxwell(v, vmp) * 1e4);
        const [, base] = plane.toPx(v, 0);
        line(ctx, mx, base, mx, Math.max(plot.y, my), colour, 2);
        const tagY = plot.y + 10 + 15 * i;
        line(ctx, mx, Math.max(plot.y, my), mx, tagY, colour, 1, [2, 3]);
        label(ctx, tag, Math.min(mx + 3, plot.x + plot.width - 22), tagY, { color: colour, font: theme.fontStrong });
      });
      const key = Math.abs(T - 300) > 0.5 ? " · dashed: 300 K" : "";
      if (has("labels")) {
        row(`mp ${Math.round(vmp)} · avg ${Math.round(num(results.vavg))} · rms ${Math.round(num(results.vrms))} m/s${key}`, height - 36);
        row(`peak ${fixed(num(results.peakShare))}% per 100 m/s · ${fixed(num(results.fastShare))}% above 1 km/s`, height - 14, theme.muted);
      } else {
        row(`most probable < average < rms${key}`, height - 36, theme.muted);
      }
    }

    if (has("molecule")) {
      const shape = Math.round(num(results.shape, 1));
      const rotational = Math.round(num(results.dofRot));
      const f = Math.round(num(results.dof, 5));
      title(`${gas.name}, ${gas.formula}: ${SHAPE_WORD[shape] ?? "diatomic"}`);
      const cx = width / 2;
      const cy = 86;
      // The molecule, its three directions of motion (left) and the axes it can turn about (right).
      if (shape >= 1) for (const a of atoms(shape).filter((a) => !a.centre)) line(ctx, cx, cy, cx + a.dx, cy + a.dy, theme.muted, 3);
      for (const a of atoms(shape)) disc(ctx, cx + a.dx, cy + a.dy, a.r, a.centre ? theme.neutral : theme.reference);
      const ox = cx - 92;
      const oy = cy + 22;
      arrow(ctx, ox, oy, ox + 34, oy, { color: theme.sine, width: 2, head: 7 });
      arrow(ctx, ox, oy, ox, oy - 34, { color: theme.sine, width: 2, head: 7 });
      arrow(ctx, ox, oy, ox - 20, oy + 18, { color: theme.sine, width: 2, head: 7 });
      label(ctx, "x", ox + 38, oy, { color: theme.sine, font: theme.font });
      label(ctx, "y", ox, oy - 42, { color: theme.sine, font: theme.font, align: "center" });
      label(ctx, "z", ox - 24, oy + 24, { color: theme.sine, font: theme.font, align: "right" });
      for (let i = 0; i < rotational; i++) {
        const rx = cx + 84;
        const ry = cy - 30 + 24 * i;
        ctx.save();
        ctx.strokeStyle = theme.cosine;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(rx, ry, 16, 7, 0, 0.3, Math.PI * 1.75);
        ctx.stroke();
        ctx.restore();
        arrow(ctx, rx + 10, ry - 6, rx + 16, ry - 1, { color: theme.cosine, width: 2, head: 6 });
      }
      if (rotational === 0) label(ctx, "a point: no turning", cx + 84, cy, { color: theme.muted, font: theme.font, align: "center" });

      // One tile per degree of freedom.
      const tile = 28;
      const gap = 6;
      const left = cx - (f * (tile + gap) - gap) / 2;
      const ty = 150;
      for (let i = 0; i < f; i++) {
        const turning = i >= 3;
        ctx.save();
        ctx.fillStyle = turning ? theme.cosine : theme.sine;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(left + i * (tile + gap), ty, tile, tile);
        ctx.restore();
        label(ctx, turning ? "R" : "xyz"[i]!, left + i * (tile + gap) + tile / 2, ty + tile / 2, { color: theme.background, font: theme.fontStrong, align: "center" });
      }
      row(`f = 3 moving + ${rotational} turning = ${f}`, ty + tile + 18);
      row("each holds ½k_BT per molecule", ty + tile + 38, theme.muted);
      const lines = ty + tile + 64;
      if (has("labels")) {
        row(`Cv = (f/2)R = ${fixed(num(results.cv))} J/(mol K)`, lines);
        row(`Cp = Cv + R = ${fixed(num(results.cp))} J/(mol K)`, lines + 20);
        row(`γ = 1 + 2/f = ${num(results.gamma).toFixed(2)} · measured ${num(results.gammaMeasured).toFixed(2)}`, lines + 40);
        row(`U = (f/2)nRT = ${(num(results.internalEnergy) / 1000).toFixed(2)} kJ`, lines + 60, theme.muted);
      }
      if (shape === 2) row("Straight, so no turning about its own axis", height - 14, theme.muted);
      if (shape === 3) row("Not straight, so it turns about all three axes", height - 14, theme.muted);
    }
  },
};
