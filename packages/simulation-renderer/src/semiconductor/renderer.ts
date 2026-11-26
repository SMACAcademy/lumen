/**
 * Semiconductor electronics, one picture per mode.
 *
 * Bands: copper, silicon, germanium and diamond side by side — valence band,
 * gap, conduction band — with free electrons and holes.
 *
 * Doping: a patch of the crystal with a dopant atom, its spare electron or
 * its hole, and bars comparing the electron and hole densities (log scale).
 *
 * Junction: the p and n sides, the depletion layer of fixed ions between
 * them, the battery and the barrier the carriers must climb.
 *
 * Curve: the diode's I–V characteristic, with NCERT's split scales — volts
 * and milliamperes forward, volts and microamperes (or, for the Zener,
 * milliamperes) in reverse — and the operating point.
 *
 * Rectifier: the input sine and the rectified (and smoothed) output.
 *
 * Zener: the regulator circuit and its output against its input.
 *
 * LED: an electron falling across the gap and the photon it gives, on a
 * spectrum. Photo: a photodiode's current, and a solar cell's I–V curve.
 *
 * Transistor: the common-emitter circuit and its transfer curve, with the
 * cut-off, active and saturation regions.
 *
 * Gates: the gate (or NAND network) with its inputs and output lamp, and the
 * truth table.
 */

import {
  SEMI_BIAS_RANGE,
  SEMI_COLOURS,
  SEMI_DEVICE_ORDER,
  SEMI_DIODES,
  SEMI_DOPANT_ORDER,
  SEMI_GATE_ORDER,
  SEMI_GATES,
  SEMI_MATERIAL_ORDER,
  SEMI_RECTIFIER_ORDER,
  SEMI_SERIES_R,
  SEMI_SOLID_ORDER,
  SEMI_SOLIDS,
  SEMI_THERMAL_VOLTAGE,
  SEMI_CELL_I0,
  SEMI_VCC,
  SEMI_ZENER_LOAD,
  SEMI_ZENER_VOLTAGE,
  semiDiodeCurrent,
  semiGateOutput,
  semiRectifierWave,
  type SemiGate,
} from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface SemiconductorLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The drawing area between the title and the caption. */
  body: Box;
}

export function computeSemiconductorLayout(width: number): SemiconductorLayout {
  const compact = width < 560;
  const height = compact ? 400 : 420;
  return { width, height, compact, body: { x: 14, y: 30, width: width - 28, height: height - 30 - 34 } };
}

// ── Small helpers ────────────────────────────────────────────────────────────

const fixed = (v: number, digits = 2) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

/** 5.0 × 10²² style. */
const SUPER: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
export function semiPowerOfTen(v: number, figures = 2): string {
  if (!(v > 0)) return "0";
  const exponent = Math.floor(Math.log10(v));
  let mantissa = v / 10 ** exponent;
  let e = exponent;
  if (Number(mantissa.toFixed(figures - 1)) >= 10) {
    mantissa /= 10;
    e += 1;
  }
  const power = String(e).split("").map((c) => SUPER[c] ?? c).join("");
  return `${mantissa.toFixed(figures - 1)} × 10${power}`;
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

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 1.5) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, alpha = 0.3) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function polyline(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], colour: string, lineWidth = 2, clip?: Box) {
  if (points.length < 2) return;
  ctx.save();
  if (clip) {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.width, clip.height);
    ctx.clip();
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

/** A resistor's zig-zag between two points (horizontal or vertical). */
function resistor(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const body = Math.min(34, length * 0.6);
  const start = (length - body) / 2;
  const pts: [number, number][] = [[x1, y1], [x1 + ux * start, y1 + uy * start]];
  for (let k = 1; k <= 6; k++) {
    const along = start + (body * (k - 0.5)) / 6;
    const side = k % 2 ? 5 : -5;
    pts.push([x1 + ux * along - uy * side, y1 + uy * along + ux * side]);
  }
  pts.push([x1 + ux * (start + body), y1 + uy * (start + body)], [x2, y2]);
  polyline(ctx, pts, colour, 1.8);
}

/** A diode symbol pointing from (x1, y1) to (x2, y2): a triangle then a bar (bent for a Zener). */
function diodeSymbol(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, zener = false) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const s = 8;
  line(ctx, x1, y1, mx - ux * s, my - uy * s, colour, 1.8);
  line(ctx, mx + ux * s, my + uy * s, x2, y2, colour, 1.8);
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(mx - ux * s - uy * s, my - uy * s + ux * s);
  ctx.lineTo(mx - ux * s + uy * s, my - uy * s - ux * s);
  ctx.lineTo(mx + ux * s, my + uy * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const bx = mx + ux * s;
  const by = my + uy * s;
  line(ctx, bx - uy * s, by + ux * s, bx + uy * s, by - ux * s, colour, 2);
  if (zener) {
    line(ctx, bx - uy * s, by + ux * s, bx - uy * s - ux * 4, by + ux * s - uy * 4, colour, 2);
    line(ctx, bx + uy * s, by - ux * s, bx + uy * s + ux * 4, by - ux * s + uy * 4, colour, 2);
  }
}

/** Approximate screen colour of light of wavelength λ nm (grey outside the visible). */
export function semiWavelengthColour(lambda: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  if (lambda >= 380 && lambda < 440) [r, g, b] = [(440 - lambda) / 60, 0, 1];
  else if (lambda >= 440 && lambda < 490) [r, g, b] = [0, (lambda - 440) / 50, 1];
  else if (lambda >= 490 && lambda < 510) [r, g, b] = [0, 1, (510 - lambda) / 20];
  else if (lambda >= 510 && lambda < 580) [r, g, b] = [(lambda - 510) / 70, 1, 0];
  else if (lambda >= 580 && lambda < 645) [r, g, b] = [1, (645 - lambda) / 65, 0];
  else if (lambda >= 645 && lambda <= 700) [r, g, b] = [1, 0, 0];
  else return "rgb(140,140,150)";
  const to = (c: number) => Math.round(255 * Math.min(1, Math.max(0, c)));
  return `rgb(${to(r)},${to(g)},${to(b)})`;
}

// ── Gate shapes ──────────────────────────────────────────────────────────────

type Shape = "and" | "or" | "not" | "nand" | "nor";

/** A gate symbol whose body spans (x, y−h/2)…(x+w, y+h/2); returns its input and output points. */
function gateShape(ctx: CanvasRenderingContext2D, shape: Shape, x: number, y: number, w: number, h: number, theme: LabTheme, lit: boolean) {
  const top = y - h / 2;
  const bubble = shape === "nand" || shape === "nor" || shape === "not";
  const bodyW = bubble ? w - 8 : w;
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.fillStyle = theme.surface2;
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (shape === "and" || shape === "nand") {
    ctx.moveTo(x, top);
    ctx.lineTo(x + bodyW - h / 2, top);
    ctx.arc(x + bodyW - h / 2, y, h / 2, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x, top + h);
    ctx.closePath();
  } else if (shape === "or" || shape === "nor") {
    ctx.moveTo(x, top);
    ctx.quadraticCurveTo(x + bodyW * 0.6, top, x + bodyW, y);
    ctx.quadraticCurveTo(x + bodyW * 0.6, top + h, x, top + h);
    ctx.quadraticCurveTo(x + bodyW * 0.3, y, x, top);
    ctx.closePath();
  } else {
    ctx.moveTo(x, top);
    ctx.lineTo(x + bodyW, y);
    ctx.lineTo(x, top + h);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (bubble) ring(ctx, x + bodyW + 4, y, 4, theme.text, 2);
  const inset = shape === "or" || shape === "nor" ? bodyW * 0.15 : 0;
  const ins: [number, number][] = shape === "not" ? [[x, y]] : [[x + inset, y - h / 4], [x + inset, y + h / 4]];
  const out: [number, number] = [x + w, y];
  if (lit) disc(ctx, out[0] + 2, out[1], 2.5, theme.angle);
  return { ins, out };
}

/** A wire drawn horizontal then vertical then horizontal, coloured by its logic level. */
function wire(ctx: CanvasRenderingContext2D, from: readonly [number, number], to: readonly [number, number], high: boolean, theme: LabTheme) {
  const mid = (from[0] + to[0]) / 2;
  polyline(ctx, [from, [mid, from[1]], [mid, to[1]], to], high ? theme.angle : theme.reference, high ? 2.5 : 2);
}

function lamp(ctx: CanvasRenderingContext2D, x: number, y: number, on: boolean, name: string, theme: LabTheme) {
  if (on) disc(ctx, x, y, 11, theme.angle);
  ring(ctx, x, y, 11, on ? theme.angle : theme.muted, 2);
  label(ctx, `${name} = ${on ? 1 : 0}`, x, y + 22, { color: theme.text, font: theme.fontStrong, align: "center" });
}

// ── The renderer ─────────────────────────────────────────────────────────────

export const semiconductorRenderer: SimulationRenderer<SemiconductorLayout> = {
  id: "semiconductor",
  layout: (width) => computeSemiconductorLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, body } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (text: string) => label(ctx, text, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const r = (key: string, fallback = 0) => num(results[key], fallback);

    // ── Bands ────────────────────────────────────────────────────────────────
    if (has("bands")) {
      const selected = Math.round(r("solid", 1));
      title("Energy bands at room temperature");
      const column = body.width / 4;
      const base = body.y + body.height - 30;
      const k = Math.min(30, (body.height - 50) / 8.6);
      const band = 1.5 * k;
      arrow(ctx, body.x + 2, base, body.x + 2, body.y + 6, { color: theme.muted, width: 1.5, head: 6 });
      label(ctx, "E", body.x + 8, body.y + 8, { color: theme.muted, font: theme.font });
      SEMI_SOLID_ORDER.forEach((id, i) => {
        const solid = SEMI_SOLIDS[id];
        const x = body.x + column * i + 12;
        const w = column - 18;
        const active = i === selected;
        const valenceTop = base - band;
        const conductionBottom = solid.gap > 0 ? valenceTop - solid.gap * k : valenceTop + 0.5 * k;
        box(ctx, x, valenceTop, w, band, theme.sine, active ? 0.55 : 0.25);
        box(ctx, x, conductionBottom - band, w, band, theme.cosine, active ? 0.45 : 0.18);
        if (active) {
          ctx.save();
          ctx.strokeStyle = theme.angle;
          ctx.lineWidth = 2;
          ctx.strokeRect(x - 4, conductionBottom - band - 4, w + 8, base - conductionBottom + band + 8);
          ctx.restore();
        }
        const free = id === "metal" ? 6 : id === "germanium" ? 4 : id === "silicon" ? 2 : 0;
        for (let n = 0; n < free; n++) {
          const ex = x + ((n + 0.5) * w) / Math.max(free, 1);
          disc(ctx, ex, conductionBottom - band * (id === "metal" ? 0.75 : 0.25), 3, theme.cosine);
          if (id !== "metal") ring(ctx, ex, valenceTop + band * 0.25, 3, theme.text);
        }
        const name = id === "metal" ? "Copper" : solid.label.split(" ")[0]!;
        label(ctx, name, x + w / 2, base + 12, { color: active ? theme.text : theme.muted, font: active ? theme.fontStrong : theme.font, align: "center" });
        if (words) {
          const text = solid.gap > 0 ? `${solid.gap.toFixed(1)} eV` : "overlap";
          const gy = solid.gap > 0 ? (valenceTop + conductionBottom) / 2 : conductionBottom - band - 9;
          label(ctx, text, x + w / 2, gy, { color: theme.angle, font: theme.font, align: "center" });
        }
      });
      if (words) {
        const cls = ["a conductor", "a semiconductor", "an insulator"][Math.round(r("solidClass"))] ?? "";
        const solid = SEMI_SOLIDS[SEMI_SOLID_ORDER[selected] ?? "silicon"];
        const name = selected === 0 ? "Copper" : solid.label.split(" ")[0]!;
        caption(selected === 0 ? "Copper: the bands overlap — a conductor" : `${name}: E_g = ${solid.gap.toFixed(1)} eV — ${cls}`);
      } else caption("conduction band (top) · valence band (bottom)");
    }

    // ── Doping ───────────────────────────────────────────────────────────────
    if (has("lattice")) {
      const material = SEMI_MATERIAL_ORDER[Math.round(r("material"))] ?? "silicon";
      const host = material === "germanium" ? "Ge" : "Si";
      const dopant = SEMI_DOPANT_ORDER[Math.round(r("dopant"))] ?? "none";
      const type = Math.round(r("semiType"));
      title(type === 1 ? `n-type ${material}` : type === 2 ? `p-type ${material}` : `Intrinsic (pure) ${material}`);
      const n = 5;
      const gap = Math.min((body.width - 30) / (n - 1), 40);
      const x0 = width / 2 - (gap * (n - 1)) / 2;
      const y0 = body.y + 14;
      for (let i = 0; i < n; i++) {
        line(ctx, x0, y0 + i * gap, x0 + (n - 1) * gap, y0 + i * gap, theme.reference, 1.5);
        line(ctx, x0 + i * gap, y0, x0 + i * gap, y0 + (n - 1) * gap, theme.reference, 1.5);
      }
      const centre = (i: number, j: number): [number, number] => [x0 + i * gap, y0 + j * gap];
      const dopedAt: [number, number][] = type === 0 ? [] : r("ppm") >= 5 ? [[1, 1], [3, 3]] : [[2, 2]];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const [cx, cy] = centre(i, j);
          const doped = dopedAt.some(([a, b]) => a === i && b === j);
          disc(ctx, cx, cy, 11, doped ? (type === 1 ? theme.tangent : theme.secant) : theme.surface2);
          ring(ctx, cx, cy, 11, theme.neutral, 1);
          label(ctx, doped ? (type === 1 ? "As" : "B") : host, cx, cy, { color: doped ? theme.background : theme.text, font: theme.font, align: "center" });
          if (doped && type === 1) disc(ctx, cx + gap / 2 - 2, cy - gap / 2 + 4, 4, theme.cosine);
          if (doped && type === 2) ring(ctx, cx + gap / 2, cy, 4, theme.text, 2);
        }
      }
      if (type === 0) {
        // One bond broken by heat: a free electron and the hole it leaves.
        const [cx, cy] = centre(2, 2);
        ring(ctx, cx + gap / 2, cy, 4, theme.text, 2);
        disc(ctx, cx + gap / 2 + 4, cy - gap / 2 + 6, 4, theme.cosine);
      }
      // Electron and hole densities on a log scale, 10⁰ to 10²⁴ per m³.
      const by = y0 + (n - 1) * gap + 30;
      const bx = body.x + 74;
      const bw = body.x + body.width - bx - 4;
      const bar = (y: number, value: number, colour: string, name: string) => {
        const fraction = value > 1 ? Math.min(1, Math.log10(value) / 24) : 0;
        box(ctx, bx, y - 7, bw, 14, theme.reference, 0.18);
        box(ctx, bx, y - 7, bw * fraction, 14, colour, 0.8);
        label(ctx, name, bx - 6, y, { color: theme.text, font: theme.font, align: "right" });
        if (words) label(ctx, `${semiPowerOfTen(value)} /m³`, bx + 6, y, { color: theme.text, font: theme.fontStrong });
      };
      bar(by, r("ne"), theme.cosine, "electrons");
      bar(by + 24, r("nh"), theme.sine, "holes");
      label(ctx, "log scale, 1 to 10²⁴ per m³", bx, by + 44, { color: theme.muted, font: theme.font });
      const kind = dopant === "pentavalent" ? "pentavalent As" : dopant === "trivalent" ? "trivalent B" : "no dopant";
      caption(type === 1 ? "As gives a spare electron: electrons are majority" : type === 2 ? "B leaves a hole: holes are the majority" : `${kind}: n_e = n_h = n_i`);
    }

    // ── Junction ─────────────────────────────────────────────────────────────
    if (has("junction")) {
      const device = SEMI_DEVICE_ORDER[Math.round(r("device"))] ?? "silicon";
      const bias = r("bias");
      const state = Math.round(r("biasState"));
      title(`${SEMI_DIODES[device].label}: ${state === 1 ? "forward bias" : state === -1 ? "reverse bias" : "no bias"}`);
      const left = body.x + 10;
      const w = body.width - 20;
      const top = body.y + 10;
      const h = 96;
      const mid = left + w / 2;
      box(ctx, left, top, w / 2, h, theme.secant, 0.18);
      box(ctx, mid, top, w / 2, h, theme.tangent, 0.18);
      const depletion = r("depletion");
      // 2 µm fills most of the bar; the Zener's thin layer still shows.
      const half = Math.min(w * 0.44, Math.max(depletion > 0 ? 3 : 0, (depletion / 2) * (w * 0.42)));
      box(ctx, mid - half, top, 2 * half, h, theme.background, 0.85);
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(left, top, w, h);
      ctx.restore();
      label(ctx, "p", left + 10, top + 12, { color: theme.secant, font: theme.fontStrong });
      label(ctx, "n", left + w - 10, top + 12, { color: theme.tangent, font: theme.fontStrong, align: "right" });
      // Fixed ions in the depletion layer.
      if (half > 6) {
        for (let row = 0; row < 3; row++) {
          const y = top + 22 + row * 26;
          label(ctx, "−", mid - half / 2, y, { color: theme.secant, font: theme.fontStrong, align: "center" });
          label(ctx, "+", mid + half / 2, y, { color: theme.tangent, font: theme.fontStrong, align: "center" });
        }
      }
      // Mobile carriers outside it: holes on the p side, electrons on the n side.
      for (let k = 0; k < 8; k++) {
        const row = k % 3;
        const y = top + 24 + row * 24;
        const pxHole = left + 16 + ((k * 23) % Math.max(10, w / 2 - half - 26));
        const pxElec = mid + half + 10 + ((k * 19) % Math.max(10, w / 2 - half - 26));
        if (pxHole < mid - half - 4) ring(ctx, pxHole, y, 4, theme.text, 1.8);
        if (pxElec < left + w - 6) disc(ctx, pxElec, y, 4, theme.cosine);
      }
      // The battery underneath, + to p in forward bias.
      const wy = top + h + 26;
      line(ctx, left + 4, top + h, left + 4, wy, theme.neutral, 1.5);
      line(ctx, left + w - 4, top + h, left + w - 4, wy, theme.neutral, 1.5);
      line(ctx, left + 4, wy, mid - 8, wy, theme.neutral, 1.5);
      line(ctx, mid + 8, wy, left + w - 4, wy, theme.neutral, 1.5);
      if (state !== 0) {
        const plusLeft = state === 1;
        line(ctx, mid + (plusLeft ? -6 : 6), wy - 11, mid + (plusLeft ? -6 : 6), wy + 11, theme.text, 2.5);
        line(ctx, mid + (plusLeft ? 6 : -6), wy - 6, mid + (plusLeft ? 6 : -6), wy + 6, theme.text, 4);
        label(ctx, "+", mid + (plusLeft ? -16 : 16), wy - 12, { color: theme.text, font: theme.fontStrong, align: "center" });
        label(ctx, `${fixed(Math.abs(bias))} V`, mid, wy + 22, { color: theme.text, font: theme.font, align: "center" });
      } else line(ctx, mid - 8, wy, mid + 8, wy, theme.neutral, 1.5);
      // The barrier the majority carriers must climb.
      const gy = wy + 60;
      const effective = r("effBarrier");
      const rise = 54 * (effective / (effective + 1));
      const pts: [number, number][] = [
        [left, gy + rise],
        [mid - half, gy + rise],
        [mid + half, gy],
        [left + w, gy],
      ];
      polyline(ctx, pts, theme.angle, 2.5);
      label(ctx, "potential (n side higher)", left, gy - 14, { color: theme.muted, font: theme.font });
      if (words) {
        caption(`barrier ${fixed(effective)} V · layer ${fixed(depletion)} µm · I ${fixed(r("current"), 2)} mA`);
        label(ctx, `${fixed(effective)} V`, left + w - 4, gy + rise / 2 + 6, { color: theme.angle, font: theme.fontStrong, align: "right" });
      } else caption("forward bias thins the layer; reverse widens it");
    }

    // ── The I–V curve ────────────────────────────────────────────────────────
    if (has("curve")) {
      const device = SEMI_DEVICE_ORDER[Math.round(r("device"))] ?? "silicon";
      const diode = SEMI_DIODES[device];
      const zener = device === "zener";
      title(`${diode.label}: I–V characteristic (model)`);
      const plot: Box = { x: body.x + 30, y: body.y + 16, width: body.width - 34, height: body.height - 44 };
      const ox = plot.x + plot.width * 0.6;
      const oy = plot.y + plot.height * 0.58;
      const [vMin, vMax] = SEMI_BIAS_RANGE;
      const forwardMax = 60;
      const reverseMax = zener ? 200 : 2;
      const toX = (v: number) => (v >= 0 ? ox + (v / vMax) * (plot.x + plot.width - ox) : ox - (v / vMin) * (ox - plot.x));
      const toY = (mA: number) => (mA >= 0 ? oy - (mA / forwardMax) * (oy - plot.y) : oy + (Math.abs(zener ? mA : mA * 1000) / reverseMax) * (plot.y + plot.height - oy));
      line(ctx, plot.x, oy, plot.x + plot.width, oy, theme.axis, 1.25);
      line(ctx, ox, plot.y, ox, plot.y + plot.height, theme.axis, 1.25);
      for (const v of [0.4, 0.8]) label(ctx, `${v}`, toX(v), oy + 10, { color: theme.muted, font: theme.font, align: "center" });
      for (const v of [-5, -10]) label(ctx, `−${Math.abs(v)}`, toX(v), oy - 10, { color: theme.muted, font: theme.font, align: "center" });
      for (const mA of [30, 60]) label(ctx, `${mA}`, ox - 4, toY(mA), { color: theme.muted, font: theme.font, align: "right" });
      const reverseTick = zener ? 100 : 1;
      label(ctx, `−${reverseTick}`, ox + 4, oy + (reverseTick / reverseMax) * (plot.y + plot.height - oy), { color: theme.muted, font: theme.font });
      label(ctx, "I / mA", ox + 6, plot.y + 2, { color: theme.text, font: theme.font });
      label(ctx, zener ? "I / mA" : "I / µA", ox + 6, plot.y + plot.height - 6, { color: theme.text, font: theme.font });
      label(ctx, "V / V", plot.x + plot.width, oy + 22, { color: theme.text, font: theme.font, align: "right" });
      label(ctx, "forward", ox + 6, oy - 12, { color: theme.muted, font: theme.font });
      label(ctx, "reverse", ox - 6, oy + 12, { color: theme.muted, font: theme.font, align: "right" });
      const pts: [number, number][] = [];
      for (let k = 0; k <= 400; k++) {
        const v = vMin + ((vMax - vMin) * k) / 400;
        pts.push([toX(v), toY(semiDiodeCurrent(diode, v) * 1000)]);
      }
      for (let k = 0; k <= 200; k++) {
        const v = (vMax * k) / 200;
        pts.push([toX(v), toY(semiDiodeCurrent(diode, v) * 1000)]);
      }
      pts.sort((a, b) => a[0] - b[0]);
      polyline(ctx, pts, theme.curve, 2.5, plot);
      const bias = r("bias");
      const current = r("current");
      const dot: [number, number] = [toX(bias), Math.min(plot.y + plot.height, Math.max(plot.y, toY(current)))];
      disc(ctx, dot[0], dot[1], 5, theme.angle);
      if (words) {
        const cut = r("cutIn");
        line(ctx, toX(cut), oy, toX(cut), plot.y, theme.tangent, 1.5, [4, 4]);
        const cutText = `cut-in ${fixed(cut)} V`;
        const before = toX(cut) - 4 - cutText.length * 6.5 > ox + 4;
        label(ctx, cutText, toX(cut) + (before ? -4 : 4), plot.y + 26, { color: theme.tangent, font: theme.font, align: before ? "right" : "left" });
        if (zener) {
          const vz = -diode.breakdown;
          line(ctx, toX(vz), oy, toX(vz), plot.y + plot.height, theme.secant, 1.5, [4, 4]);
          label(ctx, `V_Z = ${diode.breakdown.toFixed(1)} V`, toX(vz) + 4, plot.y + plot.height - 6, { color: theme.secant, font: theme.font });
        }
        const flag = r("overload") === 1 ? " — beyond its rating" : "";
        const value = bias < 0 && !zener ? `${fixed(r("currentMicro"), 3)} µA` : `${fixed(current, 2)} mA`;
        caption(`V = ${fixed(bias)} V · I = ${value}${flag}`);
      } else caption("forward: mA · reverse: tiny until breakdown");
    }

    // ── Rectifier ────────────────────────────────────────────────────────────
    if (has("rectifier")) {
      const kind = SEMI_RECTIFIER_ORDER[Math.round(r("rectifier"))] ?? "half";
      const filter = r("filter") === 1;
      title(`${kind === "full" ? "Full-wave" : "Half-wave"} rectifier${filter ? " + capacitor" : ""}`);
      const peak = r("peak", 10);
      const wave = semiRectifierWave(kind, peak, filter, r("capacitance", 100));
      const x0 = body.x + 34;
      const pw = body.x + body.width - x0 - 4;
      const inBox: Box = { x: x0, y: body.y + 14, width: pw, height: 120 };
      const outBox: Box = { x: x0, y: body.y + 170, width: pw, height: body.height - 186 };
      const tMax = wave.t[wave.t.length - 1] ?? 0.04;
      const sx = (t: number) => x0 + (t / tMax) * pw;
      const inY = (v: number) => inBox.y + inBox.height / 2 - (v / 20) * (inBox.height / 2);
      const outY = (v: number) => outBox.y + outBox.height - (v / 20) * outBox.height;
      line(ctx, x0, inY(0), x0 + pw, inY(0), theme.axis, 1.25);
      line(ctx, x0, inBox.y, x0, inBox.y + inBox.height, theme.axis, 1.25);
      line(ctx, x0, outY(0), x0 + pw, outY(0), theme.axis, 1.25);
      line(ctx, x0, outBox.y, x0, outY(0), theme.axis, 1.25);
      for (const v of [20, -20]) label(ctx, `${v}`, x0 - 5, inY(v), { color: theme.muted, font: theme.font, align: "right" });
      for (const v of [10, 20]) label(ctx, `${v}`, x0 - 5, outY(v), { color: theme.muted, font: theme.font, align: "right" });
      label(ctx, "input from the transformer, V", x0 + 6, inBox.y - 6, { color: theme.text, font: theme.font });
      label(ctx, "output across the 1 kΩ load, V", x0 + 6, outBox.y - 8, { color: theme.text, font: theme.font });
      line(ctx, sx(0.02), inBox.y + inBox.height - 4, sx(0.02), inBox.y + inBox.height + 2, theme.muted, 1.5);
      label(ctx, "20 ms", sx(0.02), inBox.y + inBox.height + 10, { color: theme.muted, font: theme.font, align: "center" });
      polyline(ctx, wave.t.map((t, i) => [sx(t), inY(wave.vin[i]!)] as [number, number]), theme.sine, 2);
      polyline(ctx, wave.t.map((t, i) => [sx(t), outY(wave.vout[i]!)] as [number, number]), theme.cosine, 2.5);
      const t = r("t");
      line(ctx, sx(t), inBox.y, sx(t), outY(0), theme.muted, 1, [3, 4]);
      disc(ctx, sx(t), inY(r("vinNow")), 4, theme.sine);
      disc(ctx, sx(t), outY(r("voutNow")), 4, theme.cosine);
      if (words) {
        const avg = r("outAverage");
        line(ctx, x0, outY(avg), x0 + pw, outY(avg), theme.tangent, 1.5, [5, 4]);
        caption(`DC ${fixed(avg)} V · ripple ${fixed(r("ripple"))} V at ${Math.round(r("rippleFreq"))} Hz`);
      } else caption(kind === "full" ? "both halves of each cycle pass" : "only one half of each cycle passes");
    }

    // ── Zener regulator ──────────────────────────────────────────────────────
    if (has("zener")) {
      title("Zener diode as a voltage regulator");
      const regulating = r("regulating") === 1;
      const left = body.x + 18;
      const right = body.x + body.width - 18;
      const top = body.y + 20;
      const bottom = body.y + 130;
      const node = left + (right - left) * 0.5;
      // Source on the left, R_S along the top, the Zener and the load down to the common line.
      ring(ctx, left, (top + bottom) / 2, 13, theme.sine, 2);
      label(ctx, "~", left, (top + bottom) / 2, { color: theme.sine, font: theme.fontStrong, align: "center" });
      line(ctx, left, top, left, (top + bottom) / 2 - 13, theme.neutral, 1.8);
      line(ctx, left, (top + bottom) / 2 + 13, left, bottom, theme.neutral, 1.8);
      resistor(ctx, left, top, node, top, theme.secant);
      line(ctx, node, top, right, top, theme.neutral, 1.8);
      line(ctx, left, bottom, right, bottom, theme.neutral, 1.8);
      diodeSymbol(ctx, node, bottom, node, top, regulating ? theme.angle : theme.neutral, true);
      resistor(ctx, right, top, right, bottom, theme.tangent);
      label(ctx, `R_S ${SEMI_SERIES_R} Ω`, (left + node) / 2, top - 14, { color: theme.secant, font: theme.font, align: "center" });
      label(ctx, `R_L ${SEMI_ZENER_LOAD / 1000} kΩ`, right - 8, (top + bottom) / 2, { color: theme.tangent, font: theme.font, align: "right" });
      label(ctx, `V_Z ${SEMI_ZENER_VOLTAGE.toFixed(1)} V`, node + 12, (top + bottom) / 2 - 22, { color: regulating ? theme.angle : theme.muted, font: theme.font });
      label(ctx, "V_in", left + 18, (top + bottom) / 2, { color: theme.sine, font: theme.font });
      if (words) {
        label(ctx, `I_S ${fixed(r("seriesCurrent"), 1)} mA`, (left + node) / 2, top + 16, { color: theme.secant, font: theme.font, align: "center" });
        label(ctx, `I_Z ${fixed(r("zenerCurrent"), 1)} mA`, node + 12, (top + bottom) / 2 + 18, { color: theme.angle, font: theme.font });
        label(ctx, `I_L ${fixed(r("loadCurrent"), 1)} mA`, right - 8, (top + bottom) / 2 + 36, { color: theme.tangent, font: theme.font, align: "right" });
      }
      // Output against input.
      const g: Box = { x: body.x + 34, y: bottom + 40, width: body.width - 40, height: body.y + body.height - bottom - 56 };
      const gx = (v: number) => g.x + (v / 20) * g.width;
      const gy = (v: number) => g.y + g.height - (v / 10) * g.height;
      line(ctx, g.x, g.y + g.height, g.x + g.width, g.y + g.height, theme.axis, 1.25);
      line(ctx, g.x, g.y, g.x, g.y + g.height, theme.axis, 1.25);
      label(ctx, "V_out / V against V_in / V", g.x + 6, g.y - 8, { color: theme.text, font: theme.font });
      for (const v of [10, 20]) label(ctx, `${v}`, gx(v), g.y + g.height + 10, { color: theme.muted, font: theme.font, align: "center" });
      for (const v of [6]) label(ctx, `${v}`, g.x - 5, gy(v), { color: theme.muted, font: theme.font, align: "right" });
      const knee = (SEMI_ZENER_VOLTAGE * (SEMI_SERIES_R + SEMI_ZENER_LOAD)) / SEMI_ZENER_LOAD;
      polyline(ctx, [[gx(0), gy(0)], [gx(knee), gy(SEMI_ZENER_VOLTAGE)], [gx(20), gy(SEMI_ZENER_VOLTAGE)]], theme.curve, 2.5);
      disc(ctx, gx(r("vin")), gy(r("vout")), 5, theme.angle);
      if (words) caption(`V_in ${fixed(r("vin"), 1)} V → V_out ${fixed(r("vout"))} V · I_Z ${fixed(r("zenerCurrent"), 1)} mA`);
      else caption(regulating ? "the Zener holds the output steady" : "too low: the Zener has not broken down");
    }

    // ── LED ──────────────────────────────────────────────────────────────────
    if (has("led")) {
      title("LED: an electron falls across the gap");
      const gap = r("gap", 1.9);
      const lambda = r("wavelength", 650);
      const colour = semiWavelengthColour(lambda);
      const left = body.x + 10;
      const bw = Math.min(110, body.width * 0.36);
      const base = body.y + 190;
      const k = 38;
      const valenceTop = base - 26;
      const conductionBottom = valenceTop - gap * k;
      box(ctx, left, valenceTop, bw, 26, theme.sine, 0.5);
      box(ctx, left, conductionBottom - 26, bw, 26, theme.cosine, 0.4);
      label(ctx, "conduction", left + bw / 2, conductionBottom - 13, { color: theme.text, font: theme.font, align: "center" });
      label(ctx, "valence", left + bw / 2, valenceTop + 13, { color: theme.text, font: theme.font, align: "center" });
      const ex = left + bw * 0.55;
      disc(ctx, ex, conductionBottom + 4, 4, theme.cosine);
      ring(ctx, ex, valenceTop - 4, 4, theme.text, 2);
      arrow(ctx, ex, conductionBottom + 10, ex, valenceTop - 10, { color: theme.cosine, width: 2, head: 7 });
      label(ctx, "E_g", ex - 10, (conductionBottom + valenceTop) / 2, { color: theme.angle, font: theme.fontStrong, align: "right" });
      // The photon: a wiggle whose wavelength on screen grows with λ.
      const px0 = left + bw + 10;
      const px1 = body.x + body.width - 6;
      const py = (conductionBottom + valenceTop) / 2;
      const pts: [number, number][] = [];
      const screenLambda = lambda / 30;
      for (let x = px0; x <= px1 - 10; x += 1.5) pts.push([x, py + 9 * Math.sin(((x - px0) / screenLambda) * 2 * Math.PI)]);
      polyline(ctx, pts, colour, 2.5);
      arrow(ctx, px1 - 14, py, px1, py, { color: colour, width: 2.5, head: 8 });
      // Spectrum strip 350–900 nm.
      const sy = base + 34;
      const sx0 = body.x + 10;
      const sw = body.width - 20;
      const toX = (nm: number) => sx0 + ((nm - 350) / 550) * sw;
      for (let nm = 350; nm < 900; nm += 5) box(ctx, toX(nm), sy, sw / 110 + 0.6, 16, semiWavelengthColour(nm + 2.5), 1);
      for (const nm of [400, 500, 600, 700, 800]) label(ctx, `${nm}`, toX(nm), sy + 28, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, "nm", sx0 + sw, sy + 42, { color: theme.muted, font: theme.font, align: "right" });
      const mx = Math.min(sx0 + sw, Math.max(sx0, toX(lambda)));
      // The marker would give the wavelength away, so it shows only with the numbers.
      if (words) {
        ctx.save();
        ctx.fillStyle = theme.text;
        ctx.beginPath();
        ctx.moveTo(mx, sy - 2);
        ctx.lineTo(mx - 6, sy - 12);
        ctx.lineTo(mx + 6, sy - 12);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      if (words) {
        const name = SEMI_COLOURS[Math.round(r("ledColour"))]?.name ?? "";
        caption(`E_g ${fixed(gap)} eV → λ = ${Math.round(lambda)} nm (${name})`);
      } else caption("a wider gap gives a shorter wavelength");
    }

    // ── Photodiode and solar cell ────────────────────────────────────────────
    if (has("photo")) {
      title("Photodiode and solar cell");
      const light = r("light");
      const rays = Math.round(light / 200);
      const left = body.x + 6;
      const top = body.y + 10;
      // Photodiode, reverse biased, with the light falling on it.
      label(ctx, "photodiode (reverse biased)", left, top, { color: theme.text, font: theme.fontStrong });
      const dx = left + 70;
      const dy = top + 50;
      diodeSymbol(ctx, dx - 40, dy, dx + 40, dy, theme.neutral);
      for (let k = 0; k < rays; k++) arrow(ctx, dx - 30 + k * 14, top + 14, dx - 14 + k * 10, dy - 12, { color: theme.angle, width: 1.8, head: 6 });
      const barX = dx + 60;
      const barW = body.x + body.width - barX - 6;
      box(ctx, barX, dy - 7, barW, 14, theme.reference, 0.18);
      box(ctx, barX, dy - 7, barW * Math.min(1, r("photoCurrent") / 500), 14, theme.sine, 0.85);
      label(ctx, "current", barX, dy + 18, { color: theme.muted, font: theme.font });
      if (words) label(ctx, `${fixed(r("photoCurrent"), 1)} µA`, barX + barW, dy + 18, { color: theme.text, font: theme.fontStrong, align: "right" });
      // Solar cell: its I–V curve in the fourth quadrant.
      const g: Box = { x: body.x + 34, y: top + 120, width: body.width - 44, height: body.y + body.height - top - 140 };
      label(ctx, "solar cell: current out against voltage", left, g.y - 28, { color: theme.text, font: theme.fontStrong });
      const isc = r("shortCircuit");
      const voc = r("openVoltage");
      const gx = (v: number) => g.x + (v / 0.7) * g.width;
      const gy = (amps: number) => g.y + (amps / 4) * g.height;
      line(ctx, g.x, g.y, g.x + g.width, g.y, theme.axis, 1.25);
      line(ctx, g.x, g.y, g.x, g.y + g.height, theme.axis, 1.25);
      label(ctx, "V →", g.x + g.width, g.y - 9, { color: theme.muted, font: theme.font, align: "right" });
      for (const v of [0.2, 0.4, 0.6]) label(ctx, `${v}`, gx(v), g.y - 9, { color: theme.muted, font: theme.font, align: "center" });
      for (const a of [2, 4]) label(ctx, `−${a} A`, g.x - 4, gy(a), { color: theme.muted, font: theme.font, align: "right" });
      if (isc > 0) {
        const pts: [number, number][] = [];
        for (let k = 0; k <= 120; k++) {
          const v = (voc * k) / 120;
          const i = isc - SEMI_CELL_I0 * (Math.exp(v / SEMI_THERMAL_VOLTAGE) - 1);
          pts.push([gx(v), gy(Math.max(0, i))]);
        }
        polyline(ctx, pts, theme.curve, 2.5);
        disc(ctx, gx(0), gy(isc), 4, theme.sine);
        disc(ctx, gx(voc), gy(0), 4, theme.cosine);
        label(ctx, "I_sc", gx(0) + 8, gy(isc) + 10, { color: theme.sine, font: theme.font });
        label(ctx, "V_oc", gx(voc) + 6, gy(0) + 12, { color: theme.cosine, font: theme.font });
      }
      if (words) caption(`I_sc ${fixed(isc)} A · V_oc ${fixed(voc, 3)} V · best ${fixed(r("maxPower"))} W`);
      else caption("more light: more current, barely more voltage");
    }

    // ── Transistor ───────────────────────────────────────────────────────────
    if (has("transistor")) {
      const region = Math.round(r("region"));
      title(`n-p-n transistor, common emitter: ${["cut off", "active", "saturated"][region] ?? ""}`);
      const left = body.x + 8;
      const top = body.y + 14;
      const tx = left + body.width * 0.5;
      const ty = top + 70;
      // Transistor symbol: base bar, collector and emitter legs.
      line(ctx, tx - 10, ty - 18, tx - 10, ty + 18, theme.text, 3);
      line(ctx, tx - 10, ty - 8, tx + 14, ty - 26, theme.text, 2);
      line(ctx, tx - 10, ty + 8, tx + 14, ty + 26, theme.text, 2);
      arrow(ctx, tx - 2, ty + 14, tx + 14, ty + 26, { color: theme.text, width: 2, head: 7 });
      // Base resistor from the input, collector resistor to V_CC, emitter to the common line.
      resistor(ctx, left + 20, ty, tx - 10, ty, theme.secant);
      label(ctx, "R_B 20 kΩ", (left + 20 + tx - 10) / 2, ty - 16, { color: theme.secant, font: theme.font, align: "center" });
      label(ctx, "V_i", left + 2, ty, { color: theme.sine, font: theme.fontStrong });
      resistor(ctx, tx + 14, top + 4, tx + 14, ty - 26, theme.tangent);
      label(ctx, "R_C 2 kΩ", tx + 22, top + 22, { color: theme.tangent, font: theme.font });
      label(ctx, `V_CC ${SEMI_VCC} V`, tx + 14, top - 6, { color: theme.text, font: theme.font, align: "center" });
      line(ctx, tx + 14, ty + 26, tx + 14, ty + 44, theme.neutral, 1.8);
      line(ctx, left + 20, ty + 44, body.x + body.width - 10, ty + 44, theme.neutral, 1.8);
      line(ctx, tx + 14, ty - 30, body.x + body.width - 30, ty - 30, theme.neutral, 1.5);
      label(ctx, "V_o", body.x + body.width - 28, ty - 30, { color: theme.cosine, font: theme.fontStrong });
      if (words) {
        label(ctx, `I_B ${fixed(r("baseCurrent"), 1)} µA`, left + 20, ty + 18, { color: theme.secant, font: theme.font });
        label(ctx, `I_C ${fixed(r("collectorCurrent"))} mA`, tx + 22, ty + 8, { color: theme.tangent, font: theme.font });
      }
      // Transfer curve: V_o = V_CE against V_i.
      const g: Box = { x: body.x + 34, y: ty + 74, width: body.width - 40, height: body.y + body.height - ty - 92 };
      const gx = (v: number) => g.x + (v / 5) * g.width;
      const gy = (v: number) => g.y + g.height - (v / SEMI_VCC) * g.height;
      label(ctx, "V_o / V against V_i / V", g.x + 6, g.y - 10, { color: theme.text, font: theme.font });
      line(ctx, g.x, g.y + g.height, g.x + g.width, g.y + g.height, theme.axis, 1.25);
      line(ctx, g.x, g.y, g.x, g.y + g.height, theme.axis, 1.25);
      for (const v of [1, 2, 3, 4, 5]) label(ctx, `${v}`, gx(v), g.y + g.height + 10, { color: theme.muted, font: theme.font, align: "center" });
      for (const v of [5, 10]) label(ctx, `${v}`, g.x - 5, gy(v), { color: theme.muted, font: theme.font, align: "right" });
      const beta = r("beta", 100);
      const sat = (SEMI_VCC - 0.2) / 2000;
      const viSat = 0.7 + (sat / beta) * 20000;
      polyline(ctx, [[gx(0), gy(SEMI_VCC)], [gx(0.7), gy(SEMI_VCC)], [gx(viSat), gy(0.2)], [gx(5), gy(0.2)]], theme.curve, 2.5);
      const bands: [number, number, string, string][] = [[0, 0.7, "cut-off", theme.sine], [0.7, viSat, "active", theme.tangent], [viSat, 5, "saturation", theme.secant]];
      for (const [a, b, name, colour] of bands) {
        box(ctx, gx(a), g.y, gx(b) - gx(a), g.height, colour, 0.08);
        if (gx(b) - gx(a) > name.length * 6 + 4) label(ctx, name, (gx(a) + gx(b)) / 2, g.y + 10, { color: colour, font: theme.font, align: "center" });
      }
      disc(ctx, gx(r("vi")), gy(r("vce")), 5, theme.angle);
      if (words) caption(`V_i ${fixed(r("vi"))} V → V_o ${fixed(r("vce"))} V · gain ${fixed(r("voltageGain"), 0)}`);
      else caption("small input change → large output change");
    }

    // ── Logic gates ──────────────────────────────────────────────────────────
    if (has("gates")) {
      const gateId: SemiGate = SEMI_GATE_ORDER[Math.round(r("gate"))] ?? "and";
      const gate = SEMI_GATES[gateId];
      const a = r("a") >= 0.5 ? 1 : 0;
      const b = r("b") >= 0.5 ? 1 : 0;
      const y = semiGateOutput(gateId, a, b);
      title(`${gate.label} gate`);
      const left = body.x + 18;
      const right = body.x + body.width - 20;
      const cy = body.y + 80;
      const twoInputs = gate.inputs === 2;
      const aPos: [number, number] = [left, twoInputs ? cy - 34 : cy];
      const bPos: [number, number] = [left, cy + 34];
      lamp(ctx, aPos[0], aPos[1], a === 1, "A", theme);
      if (twoInputs) lamp(ctx, bPos[0], bPos[1], b === 1, "B", theme);
      const outPos: [number, number] = [right, cy];
      const span = right - left - 40;
      const gw = Math.min(56, span / 3.2);
      const gh = 40;
      const nandOf = (p: number, q: number) => (p && q ? 0 : 1);
      if (gateId === "nand-not") {
        const g1 = gateShape(ctx, "nand", left + 20 + span / 2 - gw / 2, cy, gw, gh, theme, y === 1);
        wire(ctx, [aPos[0] + 11, aPos[1]], g1.ins[0]!, a === 1, theme);
        wire(ctx, [aPos[0] + 11, aPos[1]], g1.ins[1]!, a === 1, theme);
        wire(ctx, g1.out, [outPos[0] - 11, outPos[1]], y === 1, theme);
      } else if (gateId === "nand-and") {
        const mid = nandOf(a, b);
        const g1 = gateShape(ctx, "nand", left + 20 + span * 0.2, cy, gw, gh, theme, mid === 1);
        const g2 = gateShape(ctx, "nand", left + 20 + span * 0.62, cy, gw, gh, theme, y === 1);
        wire(ctx, [aPos[0] + 11, aPos[1]], g1.ins[0]!, a === 1, theme);
        wire(ctx, [bPos[0] + 11, bPos[1]], g1.ins[1]!, b === 1, theme);
        wire(ctx, g1.out, g2.ins[0]!, mid === 1, theme);
        wire(ctx, g1.out, g2.ins[1]!, mid === 1, theme);
        wire(ctx, g2.out, [outPos[0] - 11, outPos[1]], y === 1, theme);
      } else if (gateId === "nand-or") {
        const na = nandOf(a, a);
        const nb = nandOf(b, b);
        const g1 = gateShape(ctx, "nand", left + 20 + span * 0.2, cy - 34, gw, 32, theme, na === 1);
        const g2 = gateShape(ctx, "nand", left + 20 + span * 0.2, cy + 34, gw, 32, theme, nb === 1);
        const g3 = gateShape(ctx, "nand", left + 20 + span * 0.62, cy, gw, gh, theme, y === 1);
        wire(ctx, [aPos[0] + 11, aPos[1]], g1.ins[0]!, a === 1, theme);
        wire(ctx, [aPos[0] + 11, aPos[1]], g1.ins[1]!, a === 1, theme);
        wire(ctx, [bPos[0] + 11, bPos[1]], g2.ins[0]!, b === 1, theme);
        wire(ctx, [bPos[0] + 11, bPos[1]], g2.ins[1]!, b === 1, theme);
        wire(ctx, g1.out, g3.ins[0]!, na === 1, theme);
        wire(ctx, g2.out, g3.ins[1]!, nb === 1, theme);
        wire(ctx, g3.out, [outPos[0] - 11, outPos[1]], y === 1, theme);
      } else {
        const g1 = gateShape(ctx, gateId as Shape, left + 20 + span / 2 - gw / 2, cy, gw + 8, gh + 6, theme, y === 1);
        wire(ctx, [aPos[0] + 11, aPos[1]], g1.ins[0]!, a === 1, theme);
        if (twoInputs) wire(ctx, [bPos[0] + 11, bPos[1]], g1.ins[1]!, b === 1, theme);
        wire(ctx, g1.out, [outPos[0] - 11, outPos[1]], y === 1, theme);
      }
      lamp(ctx, outPos[0], outPos[1], y === 1, "Y", theme);
      // Truth table; the output column only with the words on.
      const rows: [number, number][] = twoInputs ? [[0, 0], [0, 1], [1, 0], [1, 1]] : [[0, 0], [1, 0]];
      const tw = Math.min(body.width - 40, 220);
      const tx = width / 2 - tw / 2;
      const ty = body.y + 158;
      const rowH = 24;
      const cols = twoInputs ? ["A", "B", "Y"] : ["A", "Y"];
      const colW = tw / cols.length;
      cols.forEach((c, i) => label(ctx, c, tx + colW * (i + 0.5), ty, { color: theme.text, font: theme.fontStrong, align: "center" }));
      line(ctx, tx, ty + 12, tx + tw, ty + 12, theme.axis, 1);
      rows.forEach(([p, q], k) => {
        const ry = ty + 12 + rowH * (k + 0.5);
        const current = p === a && (!twoInputs || q === b);
        if (current) box(ctx, tx, ry - rowH / 2, tw, rowH, theme.angle, 0.18);
        const cells = twoInputs ? [p, q] : [p];
        cells.forEach((v, i) => label(ctx, `${v}`, tx + colW * (i + 0.5), ry, { color: theme.text, font: theme.font, align: "center" }));
        if (words) label(ctx, `${semiGateOutput(gateId, p, q)}`, tx + colW * (cols.length - 0.5), ry, { color: theme.angle, font: theme.fontStrong, align: "center" });
        else label(ctx, "?", tx + colW * (cols.length - 0.5), ry, { color: theme.muted, font: theme.font, align: "center" });
      });
      caption(gate.nands > 1 || gateId === "nand-not" ? `built from ${gate.nands} NAND gate${gate.nands > 1 ? "s" : ""} alone` : "1 = high voltage, 0 = low");
    }
  },
};
