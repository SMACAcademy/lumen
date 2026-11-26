/**
 * Alternating current and electromagnetic waves, in pictures.
 *
 * Phase: a rotating phasor diagram (V and I, or V_R, V_L, V_C and V for the
 * series LCR circuit), a small schematic, and v(t) and i(t) over two cycles
 * with a marker at the present instant. With the power layer, p = vi joins
 * them, with its average drawn as a dashed line.
 *
 * Resonance: the rms current against frequency for the present R, L and C,
 * with a dot at the present frequency.
 *
 * Transformer: a core with two coils, their turns drawn in the right ratio,
 * and a bar for the share of 10 kW lost in a 2 Ω line at the secondary voltage.
 *
 * LC: the capacitor's charge and the coil's field, with two bars for where
 * the energy is.
 *
 * Capacitor: a charging capacitor with the current in the wires, the field
 * between the plates and the displacement current across the gap.
 *
 * Wave and spectrum: E and B at right angles, travelling along x; a log
 * scale of wavelength with NCERT's bands.
 *
 * Numbers that a level asks the learner to work out appear only with the
 * labels layer.
 */

import { acCurrentAt, AC_CIRCUIT_ORDER, EM_BANDS, type AcCircuitKind } from "@ise/physics-engine";
import { VISIBLE_NM } from "@ise/chemistry-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";
import { wavelengthColor } from "../hydrogen/renderer";

type Box = { x: number; y: number; width: number; height: number };

export interface AcLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The upper band: phasors and schematic, or the wave. */
  top: Box;
  /** The lower plot: traces or the resonance curve. */
  plot: Box;
  /** Centre and radius of the phasor diagram. */
  phasor: { x: number; y: number; r: number };
  /** Where the schematic sits, right of the phasors. */
  schematic: Box;
  /** The spectrum bar. */
  spectrum: Box;
}

export const AC_LAMBDA_RANGE = [-14, 3] as const;

export function computeAcLayout(width: number): AcLayout {
  const compact = width < 560;
  const height = 400;
  const r = compact ? 56 : 64;
  const px = compact ? 16 + r + 8 : 40 + r + 20;
  const sx = px + r + (compact ? 18 : 40);
  const left = compact ? 32 : 44;
  return {
    width,
    height,
    compact,
    top: { x: 12, y: 28, width: width - 24, height: 150 },
    plot: { x: left, y: 214, width: width - left - 16, height: 132 },
    phasor: { x: px, y: 28 + 74, r },
    schematic: { x: sx, y: 36, width: Math.min(width - 12 - sx, 260), height: 66 },
    spectrum: { x: 14, y: 250, width: width - 28, height: 18 },
  };
}

/** A tidy number: three or so significant figures, no trailing exponent for everyday sizes. */
export function acNice(v: number): string {
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 100) return v.toFixed(0);
  if (a >= 10) return v.toFixed(1);
  if (a >= 1) return v.toFixed(2);
  if (a >= 0.01) return v.toFixed(3);
  return acSci(v);
}

const SUP: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** v as m × 10ⁿ. */
export function acSci(v: number, figures = 3): string {
  if (v === 0 || !Number.isFinite(v)) return "0";
  let e = Math.floor(Math.log10(Math.abs(v)));
  let m = v / 10 ** e;
  if (Math.abs(Number(m.toFixed(figures - 1))) >= 10) {
    e += 1;
    m /= 10;
  }
  return `${m.toFixed(figures - 1)} × 10${String(e).split("").map((c) => SUP[c] ?? c).join("")}`;
}

/** A wavelength in the unit that suits it. */
export function acWavelength(metres: number): string {
  const units: [number, string][] = [[1e3, "km"], [1, "m"], [1e-2, "cm"], [1e-3, "mm"], [1e-6, "µm"], [1e-9, "nm"], [1e-12, "pm"]];
  for (const [size, unit] of units) if (metres >= size) return `${acNice(metres / size)} ${unit}`;
  return `${acNice(metres / 1e-12)} pm`;
}

const deg = (rad: number) => Math.abs((rad * 180) / Math.PI).toFixed(1);

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

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 1) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function curve(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, colour: string, lineWidth = 2.25, dash?: number[]) {
  const [x0, x1] = plane.xDomain;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  for (let k = 0; k <= 240; k++) {
    const x = x0 + ((x1 - x0) * k) / 240;
    const [px, py] = plane.toPx(x, f(x));
    if (k === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

const COLOURS = (theme: LabTheme) => ({ V: theme.sine, I: theme.cosine, R: theme.angle, L: theme.tangent, C: theme.secant, P: theme.curve });

/** A loop with the source on the bottom wire and the elements along the top. */
function drawSchematic(ctx: CanvasRenderingContext2D, box: Box, kind: AcCircuitKind, theme: LabTheme) {
  const c = COLOURS(theme);
  const top = box.y + 8;
  const bottom = box.y + box.height - 8;
  const x0 = box.x + 4;
  const x1 = box.x + box.width - 4;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0, top, x1 - x0, bottom - top);
  ctx.restore();
  // The source.
  const sx = (x0 + x1) / 2;
  ctx.save();
  ctx.fillStyle = theme.background;
  ctx.beginPath();
  ctx.arc(sx, bottom, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ring(ctx, sx, bottom, 10, c.V, 1.75);
  label(ctx, "~", sx, bottom, { color: c.V, font: theme.fontStrong, align: "center" });

  const parts: ("R" | "L" | "C")[] = kind === "LCR" ? ["R", "L", "C"] : [kind];
  const gap = (x1 - x0) / (parts.length + 1);
  parts.forEach((part, k) => {
    const cx = x0 + gap * (k + 1);
    ctx.save();
    ctx.fillStyle = theme.background;
    ctx.fillRect(cx - 14, top - 6, 28, 12);
    ctx.restore();
    if (part === "R") {
      ctx.save();
      ctx.strokeStyle = c.R;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - 12, top - 5, 24, 10);
      ctx.restore();
    } else if (part === "L") {
      ctx.save();
      ctx.strokeStyle = c.L;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let b = 0; b < 4; b++) ctx.arc(cx - 9 + b * 6, top, 3, Math.PI, 0);
      ctx.stroke();
      ctx.restore();
      line(ctx, cx - 14, top, cx - 12, top, theme.axis, 1.5);
      line(ctx, cx + 12, top, cx + 14, top, theme.axis, 1.5);
    } else {
      line(ctx, cx - 14, top, cx - 4, top, theme.axis, 1.5);
      line(ctx, cx + 4, top, cx + 14, top, theme.axis, 1.5);
      line(ctx, cx - 4, top - 9, cx - 4, top + 9, c.C, 2.5);
      line(ctx, cx + 4, top - 9, cx + 4, top + 9, c.C, 2.5);
    }
    label(ctx, part, cx, top + 17, { color: c[part], font: theme.fontStrong, align: "center" });
  });
}

/** The rotating phasors. V at angle θ; I at θ − φ; for LCR, V_R along I, V_L and V_C at right angles to it. */
function drawPhasors(ctx: CanvasRenderingContext2D, layout: AcLayout, results: Record<string, unknown>, kind: AcCircuitKind, theme: LabTheme) {
  const c = COLOURS(theme);
  const { x: cx, y: cy, r } = layout.phasor;
  const theta = num(results.theta);
  const phase = num(results.phase);
  const at = (angle: number, length: number): [number, number] => [cx + length * Math.cos(angle), cy - length * Math.sin(angle)];
  ring(ctx, cx, cy, r, theme.grid, 1);
  line(ctx, cx - r - 6, cy, cx + r + 6, cy, theme.grid, 1);
  line(ctx, cx, cy - r - 6, cx, cy + r + 6, theme.grid, 1);
  const iAngle = theta - phase;

  if (kind === "LCR") {
    const vrms = num(results.vrms, 1);
    const vr = num(results.vr);
    const vl = num(results.vl);
    const vc = num(results.vc);
    const k = r / Math.max(vrms, vr, vl, vc, 1e-9);
    const [lx, ly] = at(iAngle + Math.PI / 2, vl * k);
    const [kx, ky] = at(iAngle - Math.PI / 2, vc * k);
    arrow(ctx, cx, cy, lx, ly, { color: c.L, width: 2, head: 7, alpha: 0.75 });
    arrow(ctx, cx, cy, kx, ky, { color: c.C, width: 2, head: 7, alpha: 0.75 });
    const [rx, ry] = at(iAngle, vr * k);
    arrow(ctx, cx, cy, rx, ry, { color: c.R, width: 2.5, head: 8 });
    // V_L − V_C, head to tail from V_R, reaches the tip of V.
    const [tx, ty] = at(theta, vrms * k);
    line(ctx, rx, ry, tx, ty, theme.muted, 1.5, [3, 3]);
    arrow(ctx, cx, cy, tx, ty, { color: c.V, width: 3, head: 9 });
    label(ctx, "V_L", lx + (lx - cx) * 0.12, ly + (ly - cy) * 0.12 - 2, { color: c.L, font: theme.font, align: "center" });
    label(ctx, "V_C", kx + (kx - cx) * 0.12, ky + (ky - cy) * 0.12 + 2, { color: c.C, font: theme.font, align: "center" });
    label(ctx, "V_R", rx + (rx - cx) * 0.18, ry + (ry - cy) * 0.18, { color: c.R, font: theme.font, align: "center" });
    label(ctx, "V", tx + (tx - cx) * 0.14, ty + (ty - cy) * 0.14, { color: c.V, font: theme.fontStrong, align: "center" });
    return;
  }

  const [vx, vy] = at(theta, r);
  const [ix, iy] = at(iAngle, r * 0.62);
  arrow(ctx, cx, cy, vx, vy, { color: c.V, width: 3, head: 9 });
  arrow(ctx, cx, cy, ix, iy, { color: c.I, width: 3, head: 9 });
  label(ctx, "V", vx + (vx - cx) * 0.16, vy + (vy - cy) * 0.16, { color: c.V, font: theme.fontStrong, align: "center" });
  label(ctx, "I", ix + (ix - cx) * 0.3, iy + (iy - cy) * 0.3, { color: c.I, font: theme.fontStrong, align: "center" });
  if (Math.abs(phase) > 1e-6) {
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    // Canvas angles run clockwise, so negate.
    ctx.arc(cx, cy, 16, -Math.max(theta, iAngle), -Math.min(theta, iAngle));
    ctx.stroke();
    ctx.restore();
  }
}

export const acCircuitRenderer: SimulationRenderer<AcLayout> = {
  id: "accircuit",
  layout: (width) => computeAcLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, plot, schematic } = layout;
    const c = COLOURS(theme);
    ctx.clearRect(0, 0, width, height);
    const caption = (text: string) => label(ctx, text, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const kind = AC_CIRCUIT_ORDER[Math.round(num(results.circuit))] ?? "L";
    const theta = num(results.theta);
    const phase = num(results.phase);
    const irms = num(results.irms);

    // ── Phasors, schematic and traces ────────────────────────────────────────
    if (has("phasors") || has("circuit")) {
      title(kind === "LCR" ? "Series LCR circuit" : kind === "R" ? "AC through a resistor" : kind === "L" ? "AC through an inductor" : "AC through a capacitor");
    }
    if (has("phasors")) drawPhasors(ctx, layout, results, kind, theme);
    if (has("circuit")) {
      drawSchematic(ctx, schematic, kind, theme);
      if (words) {
        const lines =
          kind === "LCR"
            ? [`X_L ${acNice(num(results.xl))} Ω, X_C ${acNice(num(results.xc))} Ω`, `Z = ${acNice(num(results.z))} Ω`, `I = ${acNice(irms)} A rms`]
            : kind === "R"
              ? [`R = ${acNice(num(results.resistance))} Ω`, `I = ${acNice(irms)} A rms`, `V peak ${acNice(num(results.vpeak))} V`]
              : [kind === "L" ? `X_L = ωL = ${acNice(num(results.xl))} Ω` : `X_C = 1/ωC = ${acNice(num(results.xc))} Ω`, `I = ${acNice(irms)} A rms`, `V peak ${acNice(num(results.vpeak))} V`];
        lines.forEach((text, k) => label(ctx, text, schematic.x + 4, schematic.y + schematic.height + 16 + k * 16, { color: theme.text, font: theme.font }));
      }
    }

    if (has("traces")) {
      const plane = createPlane(plot, [0, 4 * Math.PI], [-1.3, 1.3]);
      drawPlane(ctx, plane, theme, { gridStep: Math.PI / 2, showLabels: false });
      curve(ctx, plane, (x) => Math.sin(x), c.V);
      curve(ctx, plane, (x) => 0.62 * Math.sin(x - phase), c.I);
      if (has("power")) {
        const pf = kind === "LCR" ? num(results.powerFactor) : kind === "R" ? 1 : 0;
        curve(ctx, plane, (x) => Math.sin(x) * Math.sin(x - phase), c.P, 2);
        const [ax, ay] = plane.toPx(0, pf / 2);
        line(ctx, ax, ay, plot.x + plot.width, ay, c.P, 1.5, [5, 4]);
        label(ctx, "average p", plot.x + plot.width - 2, ay - 9, { color: c.P, font: theme.font, align: "right" });
      }
      const [mx] = plane.toPx(theta, 0);
      line(ctx, mx, plot.y, mx, plot.y + plot.height, theme.muted, 1, [2, 3]);
      disc(ctx, mx, plane.toPx(0, Math.sin(theta))[1], 4, c.V);
      disc(ctx, mx, plane.toPx(0, 0.62 * Math.sin(theta - phase))[1], 4, c.I);
      label(ctx, "v", plot.x + 4, plot.y + 8, { color: c.V, font: theme.fontStrong });
      label(ctx, "i", plot.x + 18, plot.y + 8, { color: c.I, font: theme.fontStrong });
      if (has("power")) label(ctx, "p = vi", plot.x + 32, plot.y + 8, { color: c.P, font: theme.fontStrong });
      label(ctx, "ωt →", plot.x + plot.width - 2, plot.y + plot.height + 10, { color: theme.muted, font: theme.font, align: "right" });
      label(ctx, "(two cycles, slowed down)", plot.x, plot.y + plot.height + 10, { color: theme.muted, font: theme.font });

      if (words && has("power")) {
        caption(`P = V I cos φ = ${acNice(num(results.power))} W · cos φ = ${num(results.powerFactor).toFixed(2)}`);
      } else if (words) {
        if (kind === "R") caption("R: the current keeps step with the voltage");
        else if (kind === "L") caption("L: current lags the voltage by 90° (ELI)");
        else if (kind === "C") caption("C: current leads the voltage by 90° (ICE)");
        else {
          const lag = num(results.lagLead);
          caption(lag === 0 ? "In step: resonance, Z = R" : `current ${lag > 0 ? "lags" : "leads"} the voltage by ${deg(phase)}°`);
        }
      }
    }

    // ── Resonance curve ──────────────────────────────────────────────────────
    if (has("resonance")) {
      if (kind !== "LCR") {
        label(ctx, "Choose Series LCR to see resonance", width / 2, plot.y + plot.height / 2, { color: theme.muted, font: theme.font, align: "center" });
      } else {
        const vrms = num(results.vrms, 1);
        const R = num(results.resistance, 1);
        const Lmh = num(results.inductance, 100);
        const Cuf = num(results.capacitance, 10);
        const f = num(results.freq, 50);
        const f0 = num(results.f0, 159);
        const top = (vrms / R) * 1.15;
        const fmax = Math.max(2.5 * f0, 1.15 * f);
        const plane = createPlane(plot, [0, fmax], [0, top]);
        drawPlane(ctx, plane, theme, { showLabels: words });
        label(ctx, "I rms against frequency", plot.x + 4, plot.y - 10, { color: theme.muted, font: theme.font });
        curve(ctx, plane, (x) => acCurrentAt(x, vrms, R, Lmh, Cuf), theme.curve, 2.5);
        if (words) {
          const [fx] = plane.toPx(f0, 0);
          line(ctx, fx, plot.y, fx, plot.y + plot.height, theme.muted, 1, [4, 4]);
          label(ctx, `f₀ ${acNice(f0)} Hz`, clamp(fx + 4, plot.x, plot.x + plot.width - 70), plot.y + 10, { color: theme.muted, font: theme.font });
        }
        const [px, py] = plane.toPx(f, irms);
        disc(ctx, px, py, 5, theme.angle);
        if (words) {
          const lag = num(results.lagLead);
          const state = lag === 0 ? "at resonance" : lag > 0 ? `lags ${deg(phase)}°` : `leads ${deg(phase)}°`;
          caption(`f ${acNice(f)} Hz · I ${acNice(irms)} A · Q ${acNice(num(results.q))} · ${state}`);
        }
      }
    }

    // ── Transformer ──────────────────────────────────────────────────────────
    if (has("transformer")) {
      title("An ideal transformer");
      const np = num(results.np, 1);
      const ns = num(results.ns, 1);
      const most = Math.max(np, ns);
      const cx = width / 2;
      const half = layout.compact ? 56 : 80;
      const coreTop = 48;
      const coreBottom = 208;
      const thick = 16;
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = thick;
      ctx.strokeRect(cx - half + thick / 2, coreTop + thick / 2, 2 * half - thick, coreBottom - coreTop - thick);
      ctx.restore();
      const coil = (limbX: number, turns: number, colour: string) => {
        const n = Math.max(2, Math.round((18 * turns) / most));
        const y0 = coreTop + thick + 8;
        const y1 = coreBottom - thick - 8;
        for (let k = 0; k < n; k++) {
          const y = y0 + ((y1 - y0) * (k + 0.5)) / n;
          line(ctx, limbX - thick / 2 - 6, y + 3, limbX + thick / 2 + 6, y - 3, colour, 2);
        }
        return [y0, y1] as const;
      };
      const leftLimb = cx - half + thick / 2;
      const rightLimb = cx + half - thick / 2;
      const [p0, p1] = coil(leftLimb, np, c.V);
      coil(rightLimb, ns, c.I);
      const outerL = layout.compact ? 30 : 60;
      const outerR = width - outerL;
      // Primary leads to the source, secondary leads to the load.
      line(ctx, leftLimb - thick / 2 - 6, p0, outerL, p0, c.V, 1.5);
      line(ctx, leftLimb - thick / 2 - 6, p1, outerL, p1, c.V, 1.5);
      line(ctx, outerL, p0, outerL, p1, c.V, 1.5);
      line(ctx, rightLimb + thick / 2 + 6, p0, outerR, p0, c.I, 1.5);
      line(ctx, rightLimb + thick / 2 + 6, p1, outerR, p1, c.I, 1.5);
      line(ctx, outerR, p0, outerR, p1, c.I, 1.5);
      const mid = (p0 + p1) / 2;
      ctx.save();
      ctx.fillStyle = theme.background;
      ctx.beginPath();
      ctx.arc(outerL, mid, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(outerR - 6, mid - 14, 12, 28);
      ctx.restore();
      ring(ctx, outerL, mid, 11, c.V, 1.75);
      label(ctx, "~", outerL, mid, { color: c.V, font: theme.fontStrong, align: "center" });
      ctx.save();
      ctx.strokeStyle = c.I;
      ctx.lineWidth = 2;
      ctx.strokeRect(outerR - 6, mid - 14, 12, 28);
      ctx.restore();
      label(ctx, `Np = ${Math.round(np)}`, leftLimb, coreBottom + 12, { color: c.V, font: theme.font, align: "center" });
      label(ctx, `Ns = ${Math.round(ns)}`, rightLimb, coreBottom + 12, { color: c.I, font: theme.font, align: "center" });
      label(ctx, "load R", outerR, p1 + 12, { color: theme.muted, font: theme.font, align: "right" });
      if (words) {
        label(ctx, `Vp ${acNice(num(results.vrms))} V`, 8, 34, { color: c.V, font: theme.font });
        label(ctx, `Ip ${acNice(num(results.ip))} A`, 8, coreBottom + 30, { color: c.V, font: theme.font });
        label(ctx, `Vs ${acNice(num(results.vs))} V`, width - 8, 34, { color: c.I, font: theme.font, align: "right" });
        label(ctx, `Is ${acNice(num(results.is))} A`, width - 8, coreBottom + 30, { color: c.I, font: theme.font, align: "right" });
      }
      // The transmission line.
      const barY = 290;
      const barW = width - 32;
      const loss = clamp(num(results.lineLoss), 0, 100);
      label(ctx, "Share of 10 kW lost in a 2 Ω line at Vs", 16, barY - 14, { color: theme.muted, font: theme.font });
      ctx.save();
      ctx.fillStyle = theme.grid;
      ctx.fillRect(16, barY, barW, 12);
      ctx.fillStyle = theme.secant;
      ctx.fillRect(16, barY, Math.max(1, (barW * loss) / 100), 12);
      ctx.restore();
      if (words) {
        const lost = loss >= 100 ? "all of it, and more" : `${loss < 1 ? loss.toPrecision(2) : loss.toFixed(1)}%`;
        label(ctx, `I = P/Vs = ${acNice(num(results.lineCurrent))} A · lost: ${lost}`, 16, barY + 26, { color: theme.text, font: theme.font });
        const up = num(results.stepUp);
        caption(`${up > 0 ? "step-up" : up < 0 ? "step-down" : "1 : 1"} · Vs/Vp = Ns/Np = ${acNice(num(results.turnsRatio))}`);
      }
    }

    // ── LC oscillations ──────────────────────────────────────────────────────
    if (has("lc")) {
      title("A charged capacitor across a coil");
      const share = clamp(num(results.lcShare), 0, 1);
      const charge = Math.cos(theta);
      const current = -Math.sin(theta);
      const capX = width * 0.3;
      const coilX = width * 0.7;
      const top = 56;
      const bottom = 196;
      const mid = (top + bottom) / 2;
      // Wires.
      line(ctx, capX, top, coilX, top, theme.axis, 1.5);
      line(ctx, capX, bottom, coilX, bottom, theme.axis, 1.5);
      line(ctx, capX, top, capX, mid - 12, theme.axis, 1.5);
      line(ctx, capX, mid + 12, capX, bottom, theme.axis, 1.5);
      line(ctx, coilX, top, coilX, mid - 34, theme.axis, 1.5);
      line(ctx, coilX, mid + 34, coilX, bottom, theme.axis, 1.5);
      // The capacitor and its charges.
      line(ctx, capX - 30, mid - 12, capX + 30, mid - 12, c.C, 3);
      line(ctx, capX - 30, mid + 12, capX + 30, mid + 12, c.C, 3);
      const signs = Math.round(5 * Math.abs(charge));
      for (let k = 0; k < signs; k++) {
        const x = capX - 24 + k * 12;
        label(ctx, charge > 0 ? "+" : "−", x, mid - 22, { color: c.C, font: theme.fontStrong, align: "center" });
        label(ctx, charge > 0 ? "−" : "+", x, mid + 22, { color: c.C, font: theme.fontStrong, align: "center" });
      }
      // The coil and its field.
      ctx.save();
      ctx.strokeStyle = c.L;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let b = 0; b < 5; b++) ctx.arc(coilX, mid - 28 + b * 14, 7, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = c.L;
      ctx.globalAlpha = 0.6 * Math.abs(current);
      ctx.lineWidth = 1.25;
      for (const w of [20, 30]) {
        ctx.beginPath();
        ctx.ellipse(coilX, mid, w, 50, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      if (Math.abs(current) > 0.05) {
        // Positive current here drains the top plate: round the top wire towards the coil.
        const dir = current < 0 ? 1 : -1;
        const len = 14 + 22 * Math.abs(current);
        arrow(ctx, (capX + coilX) / 2 - (dir * len) / 2, top - 10, (capX + coilX) / 2 + (dir * len) / 2, top - 10, { color: c.I, width: 2, head: 7 });
      }
      label(ctx, "C", capX - 40, mid, { color: c.C, font: theme.fontStrong, align: "right" });
      label(ctx, "L", coilX + 58, mid, { color: c.L, font: theme.fontStrong, align: "right" });
      // Where the energy is.
      const barX = layout.compact ? 96 : 150;
      const barW = width - barX - 20;
      const bars: [string, number, string][] = [["electric, in C", share, c.C], ["magnetic, in L", 1 - share, c.L]];
      bars.forEach(([name, part, colour], k) => {
        const y = 236 + k * 30;
        label(ctx, name, barX - 8, y + 6, { color: colour, font: theme.font, align: "right" });
        ctx.save();
        ctx.fillStyle = theme.grid;
        ctx.fillRect(barX, y, barW, 12);
        ctx.fillStyle = colour;
        ctx.fillRect(barX, y, barW * part, 12);
        ctx.restore();
      });
      label(ctx, "energy, slowed down; the total never changes", width / 2, 312, { color: theme.muted, font: theme.font, align: "center" });
      if (words) {
        caption(`f₀ = ${acNice(num(results.f0))} Hz · T = ${acNice(num(results.lcPeriod) * 1000)} ms · total ${acNice(num(results.lcEnergy) * 1000)} mJ`);
      }
    }

    // ── Displacement current ─────────────────────────────────────────────────
    if (has("capacitor")) {
      title("Charging and discharging a capacitor");
      if (kind !== "C" && kind !== "LCR") {
        label(ctx, "Choose a circuit with a capacitor", width / 2, 120, { color: theme.muted, font: theme.font, align: "center" });
      } else {
        const ipeak = Math.max(num(results.ipeak), 1e-12);
        const i = num(results.i) / ipeak;
        const vcapPeak = Math.max(ipeak * num(results.xc), 1e-12);
        const field = num(results.vcap) / vcapPeak;
        const cx = width / 2;
        const top = 52;
        const bottom = 172;
        const mid = (top + bottom) / 2;
        line(ctx, 16, mid, cx - 18, mid, theme.axis, 2);
        line(ctx, cx + 18, mid, width - 16, mid, theme.axis, 2);
        line(ctx, cx - 18, top, cx - 18, bottom, c.C, 4);
        line(ctx, cx + 18, top, cx + 18, bottom, c.C, 4);
        // The field between the plates, left to right when the left plate is positive.
        for (let k = 0; k < 5; k++) {
          const y = top + 12 + k * 24;
          if (Math.abs(field) > 0.05) {
            const len = 28 * Math.abs(field);
            arrow(ctx, cx - (Math.sign(field) * len) / 2, y, cx + (Math.sign(field) * len) / 2, y, { color: theme.sine, width: 1.5, head: 5, alpha: 0.8 });
          }
        }
        if (Math.abs(i) > 0.05) {
          const len = 16 + 26 * Math.abs(i);
          const s = Math.sign(i);
          for (const x of [width * 0.2, width * 0.8]) arrow(ctx, x - (s * len) / 2, mid - 12, x + (s * len) / 2, mid - 12, { color: c.I, width: 2.5, head: 8 });
          arrow(ctx, cx - (s * len) / 2, bottom + 18, cx + (s * len) / 2, bottom + 18, { color: c.I, width: 2, head: 7, dash: [4, 3] });
        }
        label(ctx, "i", width * 0.2, mid + 14, { color: c.I, font: theme.fontStrong, align: "center" });
        label(ctx, "i", width * 0.8, mid + 14, { color: c.I, font: theme.fontStrong, align: "center" });
        label(ctx, "i_d", cx, bottom + 34, { color: c.I, font: theme.fontStrong, align: "center" });
        label(ctx, "E", cx, top - 10, { color: theme.sine, font: theme.fontStrong, align: "center" });

        // Charge (∝ the capacitor's voltage) and current over two cycles.
        const plane = createPlane({ ...plot, y: plot.y + 12, height: plot.height - 12 }, [0, 4 * Math.PI], [-1.3, 1.3]);
        drawPlane(ctx, plane, theme, { gridStep: Math.PI / 2, showLabels: false });
        // The current is i_m sin(ωt − φ); the charge, like the capacitor's voltage, is a quarter cycle behind it.
        curve(ctx, plane, (x) => Math.sin(x - phase - Math.PI / 2), theme.sine);
        curve(ctx, plane, (x) => 0.75 * Math.sin(x - phase), c.I);
        const [mx] = plane.toPx(theta, 0);
        line(ctx, mx, plane.rect.y, mx, plane.rect.y + plane.rect.height, theme.muted, 1, [2, 3]);
        label(ctx, "q (so E)", plot.x + 4, plot.y + 4, { color: theme.sine, font: theme.fontStrong });
        label(ctx, "i = i_d", plot.x + 72, plot.y + 4, { color: c.I, font: theme.fontStrong });
        if (words) caption(`i = i_d = ε₀ dΦ_E/dt = ${acNice(num(results.dispCurrent))} A rms`);
      }
    }

    // ── The wave ─────────────────────────────────────────────────────────────
    if (has("wave")) {
      title("An electromagnetic wave");
      const axisY = 112;
      const x0 = 24;
      const x1 = width - 34;
      const amp = 52;
      const k = (2 * Math.PI) / ((x1 - x0) / 2);
      const nm = num(results.wavelength) * 1e9;
      const visible = nm >= 400 && nm < 700;
      const eColour = visible ? wavelengthColor(clamp(nm, VISIBLE_NM[0], VISIBLE_NM[1]), theme) : theme.sine;
      // B is drawn along a slanted axis standing for z, out of the page (down and to the left), so E × B points along +x.
      const bx = -0.55;
      const by = 0.42;
      for (let x = x0; x <= x1; x += 8) {
        const s = Math.sin(k * (x - x0) - theta);
        line(ctx, x, axisY, x, axisY - amp * s, eColour, 1, undefined);
        line(ctx, x, axisY, x + bx * amp * 0.75 * s, axisY + by * amp * 0.75 * s, theme.cosine, 1);
      }
      ctx.save();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = eColour;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) {
        const y = axisY - amp * Math.sin(k * (x - x0) - theta);
        if (x === x0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.strokeStyle = theme.cosine;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 2) {
        const s = Math.sin(k * (x - x0) - theta);
        const px = x + bx * amp * 0.75 * s;
        const py = axisY + by * amp * 0.75 * s;
        if (x === x0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
      arrow(ctx, x0, axisY, x1 + 22, axisY, { color: theme.axis, width: 1.5, head: 8 });
      label(ctx, "c", x1 + 16, axisY - 10, { color: theme.text, font: theme.fontStrong, align: "center" });
      label(ctx, "E", x0 - 2, axisY - amp - 6, { color: eColour, font: theme.fontStrong });
      label(ctx, "B", x0 + 6, axisY + amp * 0.62, { color: theme.cosine, font: theme.fontStrong });
      label(ctx, "E ⊥ B ⊥ direction of travel, in step", width / 2, axisY + amp + 30, { color: theme.muted, font: theme.font, align: "center" });

      if (words && !has("spectrum")) {
        const rows = [
          `E₀ = ${acNice(num(results.e0))} V/m · B₀ = E₀/c = ${acNice(num(results.b0))} µT`,
          `energy density ½ε₀E₀² = ${acSci(num(results.energyDensity))} J/m³`,
          `intensity I = ${acNice(num(results.intensity))} W/m²`,
          `pressure I/c = ${acSci(num(results.pressure))} Pa`,
        ];
        rows.forEach((text, j) => label(ctx, text, 16, 236 + j * 20, { color: theme.text, font: theme.font }));
        caption(`c = 1/√(μ₀ε₀) = ${acSci(num(results.cFromConstants))} m/s`);
      }
    }

    // ── The spectrum ─────────────────────────────────────────────────────────
    if (has("spectrum")) {
      const bar = layout.spectrum;
      const [lo, hi] = AC_LAMBDA_RANGE;
      const toX = (exp: number) => bar.x + ((clamp(exp, lo, hi) - lo) / (hi - lo)) * bar.width;
      let from: number = lo;
      EM_BANDS.forEach((band, j) => {
        const to = Math.min(band.upTo, hi);
        const xa = toX(from);
        const xb = toX(to);
        if (band.id === "visible") {
          for (let x = xa; x < xb; x += 1) {
            const nmHere = 1e9 * 10 ** (lo + ((x - bar.x) / bar.width) * (hi - lo));
            ctx.save();
            ctx.fillStyle = wavelengthColor(clamp(nmHere, VISIBLE_NM[0], VISIBLE_NM[1]), theme);
            ctx.fillRect(x, bar.y, 1.2, bar.height);
            ctx.restore();
          }
          line(ctx, (xa + xb) / 2, bar.y - 4, (xa + xb) / 2, bar.y - 22, theme.muted, 1);
          label(ctx, band.short, (xa + xb) / 2, bar.y - 30, { color: theme.text, font: theme.font, align: "center" });
        } else {
          ctx.save();
          ctx.fillStyle = j % 2 === 0 ? theme.curve : theme.sine;
          ctx.globalAlpha = 0.18 + 0.08 * (j % 3);
          ctx.fillRect(xa, bar.y, xb - xa, bar.height);
          ctx.restore();
          label(ctx, band.short, (xa + xb) / 2, bar.y - 12, { color: theme.text, font: theme.font, align: "center" });
        }
        from = to;
      });
      const ticks: [number, string][] = [[-12, "1 pm"], [-9, "1 nm"], [-6, "1 µm"], [-3, "1 mm"], [0, "1 m"], [3, "1 km"]];
      for (const [exp, text] of ticks) {
        const x = toX(exp);
        line(ctx, x, bar.y + bar.height, x, bar.y + bar.height + 4, theme.axis, 1);
        label(ctx, text, clamp(x, bar.x + 12, bar.x + bar.width - 12), bar.y + bar.height + 13, { color: theme.muted, font: theme.font, align: "center" });
      }
      label(ctx, "wavelength →", bar.x + bar.width, bar.y + bar.height + 28, { color: theme.muted, font: theme.font, align: "right" });
      const exp = num(results.lambdaExp, -6.27);
      const mx = toX(exp);
      line(ctx, mx, bar.y - 2, mx, bar.y + bar.height + 2, theme.text, 2);
      ctx.save();
      ctx.fillStyle = theme.text;
      ctx.beginPath();
      ctx.moveTo(mx, bar.y - 2);
      ctx.lineTo(mx - 5, bar.y - 9);
      ctx.lineTo(mx + 5, bar.y - 9);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const band = EM_BANDS[clamp(Math.round(num(results.band)), 0, EM_BANDS.length - 1)]!;
      label(ctx, band.label, 16, bar.y + 56, { color: theme.text, font: theme.fontStrong });
      label(ctx, `Source: ${band.source}`, 16, bar.y + 76, { color: theme.muted, font: theme.font });
      label(ctx, `Use: ${band.use}`, 16, bar.y + 94, { color: theme.muted, font: theme.font });
      if (words) caption(`λ = ${acWavelength(num(results.wavelength))} · f = c/λ = ${acSci(num(results.emFreq))} Hz`);
    }
  },
};
