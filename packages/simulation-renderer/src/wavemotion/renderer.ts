/**
 * Waves, in nine pictures, one per mode.
 *
 * Travelling: a sine wave running along a string, one bit of it marked to
 * show it only moves up and down; or, in air, rows of particles crowding into
 * compressions, one marked swinging back and forth along the way the wave goes.
 *
 * Speeds: the speed of sound against temperature, Laplace's curve above
 * Newton's. Superpose: two waves and their sum. Reflect: a pulse meeting a
 * fixed or a free end. Standing: a string or a pipe in one of its modes, with
 * nodes and antinodes. Tube: the resonance tube, a fork over a column of air
 * and a loudness meter. Beats: two close notes and the swelling sum. Doppler:
 * wavefronts bunching ahead of a moving source. Decibel: a source, a listener
 * and a sound-level meter.
 *
 * All motion is slowed down; the drawings are not to scale in time.
 * Numbers a level asks for are drawn only with the labels layer.
 */

import { WAVE_AIR_VIEW, WAVE_STRING_VIEW, WAVE_SYSTEM_ORDER, waveSoundSpeed } from "@ise/physics-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface WaveMotionLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right edges of the drawing, and the top of the scene below the title. */
  left: number;
  right: number;
  top: number;
}

export function computeWaveMotionLayout(width: number): WaveMotionLayout {
  const compact = width < 560;
  return { width, height: compact ? 380 : 400, compact, left: 16, right: width - 16, top: 34 };
}

const TAU = Math.PI * 2;
const MINUS = "−";

/** A fixed number of digits, with a true minus sign and no −0. */
export function waveFixed(v: number, digits = 1): string {
  const text = Math.abs(v).toFixed(digits);
  return `${v < 0 && Number(text) !== 0 ? MINUS : ""}${text}`;
}

/** A small or large number as a × 10ⁿ. */
export function waveScientific(v: number, figures = 3): string {
  if (v === 0 || !Number.isFinite(v)) return "0";
  const power = Math.floor(Math.log10(Math.abs(v)));
  const mantissa = v / 10 ** power;
  if (power >= -2 && power <= 3) return v.toPrecision(figures);
  const sup = String(power).replace(/-/g, "⁻").replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]!);
  return `${mantissa.toPrecision(figures)} × 10${sup}`;
}

/** "343 + 20" or "343 − 20": a speed added to v, with the sign written out. */
const plus = (v: number, w: number) => `${waveFixed(v, 0)} ${w < 0 ? MINUS : "+"} ${waveFixed(Math.abs(w), 0)}`;
const minus = (v: number, w: number) => `${waveFixed(v, 0)} ${w < 0 ? "+" : MINUS} ${waveFixed(Math.abs(w), 0)}`;
const ordinal = (n: number) => `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`;

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, width = 1.5, dash?: number[]) {
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

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** A curve y(x) for x from x0 to x1, in pixels. */
function curve(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: (x: number) => number, colour: string, width = 2.5, dash?: number[]) {
  const steps = Math.max(2, Math.ceil((x1 - x0) / 2));
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    if (i === 0) ctx.moveTo(x, y(x));
    else ctx.lineTo(x, y(x));
  }
  ctx.stroke();
  ctx.restore();
}

/** A measuring bracket: a double arrow with a word under or over it. */
function bracket(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, words: string, theme: LabTheme, colour = theme.angle) {
  arrow(ctx, x1, y, x2, y, { color: colour, width: 1.5, head: 6, double: true });
  line(ctx, x1, y - 5, x1, y + 5, colour, 1.5);
  line(ctx, x2, y - 5, x2, y + 5, colour, 1.5);
  label(ctx, words, (x1 + x2) / 2, y + 12, { color: colour, font: theme.font, align: "center" });
}

/** The marked bit of the medium, and the track it moves along. */
function marked(ctx: CanvasRenderingContext2D, x: number, y: number, theme: LabTheme) {
  disc(ctx, x, y, 6, theme.angle);
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function scaleBar(ctx: CanvasRenderingContext2D, x: number, y: number, pxPerM: number, theme: LabTheme) {
  line(ctx, x, y, x + pxPerM, y, theme.text, 2);
  line(ctx, x, y - 4, x, y + 4, theme.text, 1.5);
  line(ctx, x + pxPerM, y - 4, x + pxPerM, y + 4, theme.text, 1.5);
  label(ctx, "1 m", x + pxPerM + 6, y, { color: theme.muted, font: theme.font });
}

export const waveMotionRenderer: SimulationRenderer<WaveMotionLayout> = {
  id: "wavemotion",
  layout: (width) => computeWaveMotionLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, left, right, top } = layout;
    const span = right - left;
    ctx.clearRect(0, 0, width, height);
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    /** Line 0 is the bottom line; line 1 sits above it. */
    const caption = (text: string, row = 0, colour = theme.text) => label(ctx, text, width / 2, height - 14 - row * 18, { color: colour, font: theme.font, align: "center" });
    const phase = num(results.cyclePhase);
    const f = num(results.frequency, 50);
    const A = num(results.amplitude, 10);

    if (has("string")) {
      const air = num(results.medium) === 1;
      const view = air ? WAVE_AIR_VIEW : WAVE_STRING_VIEW;
      const pxPerM = span / view;
      const lambda = num(results.wavelength, 1);
      const drawn = lambda * pxPerM;
      const big = Math.max(drawn, 24);
      const theta = (x: number) => (TAU * (x - left)) / big - phase;
      const mid = top + 84;
      const xp = left + pxPerM * (view / 4);
      title(air ? "Longitudinal wave: sound in air" : "Transverse wave on a string");
      arrow(ctx, right - 64, top - 4, right - 8, top - 4, { color: theme.tangent, width: 2, head: 7 });
      label(ctx, "wave travels", right - 70, top - 4, { color: theme.tangent, font: theme.font, align: "right" });

      let bracketY: number;
      if (!air) {
        const aPx = A * 3;
        line(ctx, left, mid, right, mid, theme.reference, 1, [4, 4]);
        curve(ctx, left, right, (x) => mid - aPx * Math.sin(theta(x)), theme.sine);
        line(ctx, xp, mid - aPx, xp, mid + aPx, theme.muted, 1, [2, 3]);
        marked(ctx, xp, mid - aPx * Math.sin(theta(xp)), theme);
        label(ctx, "this bit only moves up and down", xp + 12, mid - aPx - 10, { color: theme.angle, font: theme.font });
        bracketY = mid + aPx + 16;
      } else {
        const sAmp = big * Math.min(0.15, 0.011 * A);
        const gap = 8;
        const columns = Math.floor(span / gap);
        const nearest = Math.round((xp - left - gap / 2) / gap);
        for (let row = -2; row <= 2; row++) {
          for (let i = 0; i <= columns - 1; i++) {
            const x0 = left + gap / 2 + i * gap;
            const x = x0 + sAmp * Math.sin(theta(x0));
            const y = mid + row * 17;
            if (row === 0 && i === nearest) {
              line(ctx, x0 - sAmp, y, x0 + sAmp, y, theme.muted, 1, [2, 3]);
              marked(ctx, x, y, theme);
            } else disc(ctx, x, y, 2.4, theme.sine, 0.85);
          }
        }
        label(ctx, "this one swings back and forth", clamp(xp - 20, left, right - 190), mid - 50, { color: theme.angle, font: theme.font });
        // Particles crowd together where the phase kx − ωt is π, and spread out where it is 0.
        const first = (offset: number) => {
          const x = left + big * (((phase + offset) / TAU) % 1);
          return x < left + 6 ? x + big : x;
        };
        const c = first(Math.PI);
        const r = first(0);
        for (const [x, mark] of [[c, "C"], [r, "R"]] as const) {
          if (x > left + 6 && x < right - 6) label(ctx, mark, x, mid + 50, { color: mark === "C" ? theme.cosine : theme.muted, font: theme.fontStrong, align: "center" });
        }
        label(ctx, "C compression · R rarefaction", left, mid + 70, { color: theme.muted, font: theme.font });
        bracketY = mid + 92;
      }
      // One wavelength, crest to crest (or compression to compression).
      const start = air ? left + big * (((phase + Math.PI) / TAU) % 1) : left + big * (((phase + Math.PI / 2) / TAU) % 1);
      if (start + big <= right) bracket(ctx, start, start + big, bracketY, words ? `λ = ${waveFixed(lambda, 2)} m` : "λ", theme);
      scaleBar(ctx, left, top + 222, pxPerM, theme);
      if (drawn < 24) label(ctx, "(wave drawn longer than to scale)", right, top + 222, { color: theme.muted, font: theme.font, align: "right" });
      if (words) {
        const v = num(results.speed);
        caption(air ? `v = √(γP/ρ) = ${waveFixed(v, 0)} m/s · λ = v/f = ${waveFixed(lambda, 2)} m` : `v = √(T/μ) = ${waveFixed(v, 0)} m/s · λ = v/f = ${waveFixed(lambda, 2)} m`, 1);
        caption(air ? "the particles swing along the way the wave goes" : `each bit moves at most Aω = ${waveFixed(num(results.maxParticleSpeed), 2)} m/s`, 0, theme.muted);
      }
    }

    if (has("speeds")) {
      title("Speed of sound in air");
      const box = { x: left + 30, y: top + 14, w: span - 34, h: 190 };
      const tx = (t: number) => box.x + ((t + 20) / 70) * box.w;
      const vy = (v: number) => box.y + ((370 - v) / 110) * box.h;
      const pressure = num(results.pressure, 101.3);
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.restore();
      for (const v of [280, 300, 320, 340, 360]) {
        line(ctx, box.x, vy(v), box.x + box.w, vy(v), theme.grid, 1);
        label(ctx, String(v), box.x - 4, vy(v), { color: theme.muted, font: theme.font, align: "right" });
      }
      for (const t of [-20, 0, 20, 40]) {
        line(ctx, tx(t), box.y, tx(t), box.y + box.h, theme.grid, 1);
        label(ctx, String(t).replace("-", MINUS), tx(t), box.y + box.h + 10, { color: theme.muted, font: theme.font, align: "center" });
      }
      label(ctx, "v / m/s", box.x + 4, box.y - 8, { color: theme.muted, font: theme.font });
      label(ctx, "θ / °C", box.x + box.w, box.y + box.h + 24, { color: theme.muted, font: theme.font, align: "right" });
      curve(ctx, box.x, box.x + box.w, (x) => vy(waveSoundSpeed(((x - box.x) / box.w) * 70 - 20, pressure)), theme.curve);
      curve(ctx, box.x, box.x + box.w, (x) => vy(waveSoundSpeed(((x - box.x) / box.w) * 70 - 20, pressure, 1)), theme.secant, 2, [6, 4]);
      label(ctx, "Laplace: √(γP/ρ)", box.x + 6, vy(330) - 14, { color: theme.curve, font: theme.font });
      label(ctx, "Newton: √(P/ρ)", box.x + box.w - 4, vy(280), { color: theme.secant, font: theme.font, align: "right" });
      const t = num(results.temperature, 20);
      const v = num(results.soundSpeed, 343);
      const vn = num(results.newtonSpeed, 290);
      line(ctx, tx(t), box.y, tx(t), box.y + box.h, theme.angle, 1, [3, 3]);
      disc(ctx, tx(t), vy(v), 5, theme.curve);
      disc(ctx, tx(t), vy(vn), 5, theme.secant);
      label(ctx, `P = ${waveFixed(pressure, 1)} kPa · ρ = ${waveFixed(num(results.airDensity), 3)} kg/m³`, width / 2, box.y + box.h + 44, { color: theme.text, font: theme.font, align: "center" });
      if (words) {
        caption(`at ${waveFixed(t, 0)} °C: Laplace ${waveFixed(v, 0)} m/s, Newton ${waveFixed(vn, 0)} m/s`, 1);
        caption("ρ = PM/RT, so P/ρ and v do not depend on P", 0, theme.muted);
      }
    }

    if (has("superpose")) {
      const phi = num(results.phaseDifference);
      title("Two waves, a phase φ apart, added");
      const aPx = A * 1.2;
      const big = span / 2;
      const theta = (x: number) => (TAU * (x - left)) / big - phase;
      const rad = (phi * Math.PI) / 180;
      const rows = [
        { y: top + 30, text: "y₁ = A sin(kx − ωt)", f: (x: number) => aPx * Math.sin(theta(x)), colour: theme.sine },
        { y: top + 92, text: `y₂, φ = ${waveFixed(phi, 0)}° ahead`, f: (x: number) => aPx * Math.sin(theta(x) + rad), colour: theme.cosine },
        { y: top + 182, text: "y₁ + y₂", f: (x: number) => aPx * (Math.sin(theta(x)) + Math.sin(theta(x) + rad)), colour: theme.curve },
      ];
      for (const row of rows) {
        line(ctx, left, row.y, right, row.y, theme.reference, 1, [4, 4]);
        curve(ctx, left, right, (x) => row.y - row.f(x), row.colour);
        label(ctx, row.text, left, row.y - (row === rows[2] ? 2 * aPx : aPx) - 10, { color: row.colour, font: theme.font });
      }
      if (words) {
        const kind = ["destructive: they cancel", "partial", "constructive: they add up"][Math.round(num(results.interference))] ?? "partial";
        caption(`resultant 2A|cos(φ/2)| = ${waveFixed(num(results.resultant), 1)} mm`, 1);
        caption(kind, 0, theme.muted);
      }
    }

    if (has("reflect")) {
      const fixed = num(results.end) === 0;
      const sign = num(results.reflectedSign, -1);
      const c = num(results.pulseCentre);
      title(fixed ? "A pulse meets a fixed end" : "A pulse meets a free end");
      const x0 = left + 6;
      const x1 = right - 26;
      const mid = top + 110;
      const H = 44;
      const g = (u: number) => H * Math.exp(-((u / 0.06) ** 2));
      const y = (x: number) => {
        const u = (x - x0) / (x1 - x0);
        return mid - (g(u - c) + sign * g(u - (2 - c)));
      };
      line(ctx, x0, mid, x1, mid, theme.reference, 1, [4, 4]);
      curve(ctx, x0, x1, y, theme.sine);
      if (fixed) {
        ctx.save();
        ctx.fillStyle = theme.neutral;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(x1, mid - 70, 12, 140);
        ctx.restore();
        for (let k = 0; k < 7; k++) line(ctx, x1 + 12, mid - 66 + k * 20, x1 + 2, mid - 56 + k * 20, theme.text, 1);
      } else {
        line(ctx, x1, mid - 70, x1, mid + 70, theme.neutral, 3);
        ctx.save();
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x1, y(x1), 5, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      label(ctx, fixed ? "tied to a wall" : "ring free to slide", x1 + 6, mid + 84, { color: theme.muted, font: theme.font, align: "right" });
      const back = c > 1;
      const at = x0 + (x1 - x0) * clamp(back ? 2 - c : c, 0, 1);
      const ay = back && sign < 0 ? mid + H + 22 : mid - H - 22;
      if (c > -0.05 && c < 2.05) {
        arrow(ctx, at - (back ? -18 : 18), ay, at + (back ? -18 : 18), ay, { color: theme.tangent, width: 2, head: 7 });
        label(ctx, back ? "reflected" : "incident", clamp(at, x0 + 30, x1 - 30), ay + (ay > mid ? 14 : -14), { color: theme.tangent, font: theme.font, align: "center" });
      }
      if (words) {
        caption(fixed ? "fixed end: back upside down, a phase change of π" : "free end: back the right way up, no phase change", 1);
        caption(fixed ? "y = −A sin(kx + ωt): the end itself never moves" : "y = A sin(kx + ωt): the end swings twice as far", 0, theme.muted);
      }
    }

    if (has("standing")) {
      const system = WAVE_SYSTEM_ORDER[Math.round(num(results.system))] ?? "string";
      const n = Math.round(num(results.harmonic, 1));
      const h = Math.round(num(results.harmonicNumber, 1));
      title(system === "string" ? "A string fixed at both ends" : system === "open" ? "A pipe open at both ends" : "A pipe closed at one end");
      const x0 = left + 14;
      const x1 = right - 14;
      const mid = top + 96;
      const aPx = system === "string" ? 44 : 34;
      // Displacement along the string or pipe: nodes where it is zero.
      const shape = (u: number) =>
        system === "string" ? Math.sin(n * Math.PI * u) : system === "open" ? Math.cos(n * Math.PI * u) : Math.sin(((2 * n - 1) * Math.PI * u) / 2);
      const at = (x: number) => (x - x0) / (x1 - x0);
      if (system === "string") {
        for (const x of [x0 - 8, x1]) {
          ctx.save();
          ctx.fillStyle = theme.neutral;
          ctx.fillRect(x, mid - 16, 8, 32);
          ctx.restore();
        }
      } else {
        line(ctx, x0, mid - aPx - 8, x1, mid - aPx - 8, theme.neutral, 3);
        line(ctx, x0, mid + aPx + 8, x1, mid + aPx + 8, theme.neutral, 3);
        if (system === "closed") line(ctx, x0, mid - aPx - 9, x0, mid + aPx + 9, theme.neutral, 6);
        label(ctx, system === "closed" ? "closed" : "open", x0, mid - aPx - 20, { color: theme.muted, font: theme.font });
        label(ctx, "open", x1, mid - aPx - 20, { color: theme.muted, font: theme.font, align: "right" });
      }
      line(ctx, x0, mid, x1, mid, theme.reference, 1, [4, 4]);
      curve(ctx, x0, x1, (x) => mid - aPx * shape(at(x)), theme.muted, 1, [3, 4]);
      curve(ctx, x0, x1, (x) => mid + aPx * shape(at(x)), theme.muted, 1, [3, 4]);
      curve(ctx, x0, x1, (x) => mid - aPx * shape(at(x)) * Math.cos(phase), theme.sine);
      // Nodes and antinodes, where there is room to name them.
      const nodes: number[] = [];
      const antinodes: number[] = [];
      if (system === "string") {
        for (let j = 0; j <= n; j++) nodes.push(j / n);
        for (let j = 0; j < n; j++) antinodes.push((j + 0.5) / n);
      } else if (system === "open") {
        for (let j = 0; j < n; j++) nodes.push((j + 0.5) / n);
        for (let j = 0; j <= n; j++) antinodes.push(j / n);
      } else {
        for (let j = 0; j < n; j++) nodes.push((2 * j) / (2 * n - 1));
        for (let j = 0; j < n; j++) antinodes.push((2 * j + 1) / (2 * n - 1));
      }
      const room = (x1 - x0) / Math.max(1, nodes.length + antinodes.length - 1) >= 14;
      for (const u of nodes) {
        const x = x0 + u * (x1 - x0);
        disc(ctx, x, mid, 3.5, theme.cosine);
        if (room) label(ctx, "N", x, mid + aPx + 24, { color: theme.cosine, font: theme.fontStrong, align: "center" });
      }
      for (const u of antinodes) {
        const x = x0 + u * (x1 - x0);
        if (room) label(ctx, "A", x, mid + aPx + 24, { color: theme.tangent, font: theme.fontStrong, align: "center" });
      }
      label(ctx, "N node · A antinode (of displacement)", left, mid + aPx + 44, { color: theme.muted, font: theme.font });
      bracket(ctx, x0, x1, top + 222, `L = ${waveFixed(num(results.length, 1), 2)} m`, theme, theme.text);
      if (words) {
        const rule = system === "closed" ? `${h}v/4L` : `${h}v/2L`;
        const name = system === "closed" ? `${ordinal(h)} harmonic (n = ${n})` : `${ordinal(h)} harmonic`;
        caption(`${name} · f = ${rule} = ${waveFixed(num(results.standingFrequency), 0)} Hz`, 1);
        caption(`λ = ${waveFixed(num(results.standingWavelength), 2)} m · v = ${waveFixed(num(results.standingSpeed), 0)} m/s`, 0, theme.muted);
      }
    }

    if (has("tube")) {
      title(`Resonance tube over a ${waveFixed(f, 0)} Hz fork`);
      const scale = 2;
      const tx = left + 76;
      const half = 18;
      const ty = top + 34;
      const column = num(results.column, 30);
      const response = clamp(num(results.response), 0, 1);
      const water = ty + column * scale;
      const bottom = ty + 110 * scale;
      ctx.save();
      ctx.fillStyle = theme.sine;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(tx - half, water, half * 2, bottom - water);
      ctx.restore();
      line(ctx, tx - half, ty, tx - half, bottom, theme.neutral, 2.5);
      line(ctx, tx + half, ty, tx + half, bottom, theme.neutral, 2.5);
      line(ctx, tx - half, bottom, tx + half, bottom, theme.neutral, 2.5);
      line(ctx, tx - half, water, tx + half, water, theme.sine, 2);
      // The fork, ringing over the open end.
      line(ctx, tx - 7, ty - 26, tx - 7, ty - 10, theme.text, 3);
      line(ctx, tx + 7, ty - 26, tx + 7, ty - 10, theme.text, 3);
      line(ctx, tx - 7, ty - 10, tx + 7, ty - 10, theme.text, 3);
      line(ctx, tx, ty - 10, tx, ty - 2, theme.text, 3);
      // Inside the column: the displacement envelope, a node at the water and an antinode e above the top.
      if (response > 0.05) {
        const lambdaCm = (num(results.soundSpeed, 343) / f) * 100;
        const e = num(results.endCorrection);
        const w = (y: number) => (half - 3) * response * Math.abs(Math.cos((TAU * ((y - ty) / scale + e)) / lambdaCm));
        ctx.save();
        ctx.strokeStyle = theme.curve;
        ctx.lineWidth = 2;
        for (const side of [-1, 1]) {
          ctx.beginPath();
          for (let y = ty; y <= water; y += 2) {
            if (y === ty) ctx.moveTo(tx + side * w(y), y);
            else ctx.lineTo(tx + side * w(y), y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      // How long the column is.
      const bx = tx - half - 14;
      arrow(ctx, bx, ty, bx, water, { color: theme.angle, width: 1.5, head: 6, double: true });
      label(ctx, `l = ${waveFixed(column, 1)} cm`, tx + half + 8, water, { color: theme.angle, font: theme.font });
      label(ctx, `d = ${waveFixed(num(results.diameter), 1)} cm`, tx + half + 8, ty - 16, { color: theme.muted, font: theme.font });
      // The loudness meter.
      const mx = right - 34;
      const mh = 150;
      const my = ty + 20;
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, 18, mh);
      ctx.fillStyle = response > 0.5 ? theme.tangent : theme.secant;
      ctx.fillRect(mx, my + mh * (1 - response), 18, mh * response);
      ctx.restore();
      label(ctx, "loudness", mx + 9, my + mh + 14, { color: theme.muted, font: theme.font, align: "center" });
      const order = Math.round(num(results.resonanceOrder));
      if (words) {
        if (order > 0) label(ctx, `${ordinal(order)} resonance`, mx + 18, my - 12, { color: theme.tangent, font: theme.fontStrong, align: "right" });
        caption(`l₁ = ${waveFixed(num(results.firstResonance), 1)} cm · l₂ = ${waveFixed(num(results.secondResonance), 1)} cm · e = ${waveFixed(num(results.endCorrection), 2)} cm`, 1);
        caption(`v = 2f(l₂ − l₁) = ${waveFixed(num(results.tubeSpeed), 0)} m/s`, 0, theme.muted);
      }
    }

    if (has("beats")) {
      const f2 = num(results.frequency2, 54);
      const beat = num(results.beatFrequency);
      title(`Two notes: ${waveFixed(f, 0)} Hz and ${waveFixed(f2, 0)} Hz`);
      // One second, with the notes slowed to a few dozen shown cycles; the beat is drawn true up to 16 Hz.
      const shown = 24;
      const d = Math.sign(f2 - f) * Math.min(beat, 16);
      const aPx = 15;
      const t = (x: number) => (x - left) / span;
      const rows = [
        { y: top + 22, text: `${waveFixed(f, 0)} Hz`, g: (x: number) => aPx * Math.sin(TAU * (shown - d / 2) * t(x)), colour: theme.sine },
        { y: top + 66, text: `${waveFixed(f2, 0)} Hz`, g: (x: number) => aPx * Math.sin(TAU * (shown + d / 2) * t(x)), colour: theme.cosine },
        { y: top + 152, text: "together", g: (x: number) => aPx * (Math.sin(TAU * (shown - d / 2) * t(x)) + Math.sin(TAU * (shown + d / 2) * t(x))), colour: theme.curve },
      ];
      for (const row of rows) {
        curve(ctx, left, right, (x) => row.y - row.g(x), row.colour, 1.5);
        label(ctx, row.text, right, row.y - (row === rows[2] ? 2 * aPx : aPx) - 8, { color: row.colour, font: theme.font, align: "right" });
      }
      const envelope = (x: number) => 2 * aPx * Math.abs(Math.cos(Math.PI * d * t(x)));
      curve(ctx, left, right, (x) => rows[2]!.y - envelope(x), theme.angle, 1.5, [4, 3]);
      curve(ctx, left, right, (x) => rows[2]!.y + envelope(x), theme.angle, 1.5, [4, 3]);
      const axis = top + 200;
      line(ctx, left, axis, right, axis, theme.axis, 1);
      for (const s of [0, 0.5, 1]) {
        const x = left + s * span;
        line(ctx, x, axis - 4, x, axis + 4, theme.axis, 1);
        label(ctx, `${s} s`, clamp(x, left + 10, right - 10), axis + 14, { color: theme.muted, font: theme.font, align: "center" });
      }
      label(ctx, "slowed down: the notes are drawn far lower", left, axis + 34, { color: theme.muted, font: theme.font });
      if (beat > 16) label(ctx, "the real beats are faster than drawn", left, axis + 52, { color: theme.secant, font: theme.font });
      if (words) {
        caption(`f_beat = |${waveFixed(f, 0)} − ${waveFixed(f2, 0)}| = ${waveFixed(beat, 0)} Hz`, 1);
        caption(`heard as ${waveFixed(num(results.averageFrequency), 1)} Hz, swelling ${waveFixed(beat, 0)} times a second`, 0, theme.muted);
      }
    }

    if (has("doppler")) {
      const vs = num(results.sourceSpeed);
      const vo = num(results.observerSpeed);
      const v = num(results.soundSpeed, 343);
      title("A moving source and a listener");
      const box = { x: left, y: top + 6, w: span, h: 206 };
      const mid = box.y + box.h / 2;
      const sx = left + span * 0.36;
      const ox = right - 66;
      const c = 50;
      const every = 0.5;
      const u = c * num(results.mach);
      const clock = num(results.clock);
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.w, box.h);
      ctx.clip();
      ctx.strokeStyle = theme.sine;
      ctx.lineWidth = 1.5;
      // A front sent out `age` seconds ago left the source where it was then.
      for (let k = 0; k < 12; k++) {
        const age = (clock % every) + k * every;
        ctx.globalAlpha = Math.max(0.15, 1 - age / 6.5);
        ctx.beginPath();
        ctx.arc(sx - u * age, mid, c * age, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
      disc(ctx, sx, mid, 8, theme.secant);
      label(ctx, "S", sx, mid, { color: theme.background, font: theme.fontStrong, align: "center" });
      disc(ctx, ox, mid, 8, theme.tangent);
      label(ctx, "O", ox, mid, { color: theme.background, font: theme.fontStrong, align: "center" });
      if (Math.abs(vs) >= 1) arrow(ctx, sx, mid + 24, sx + vs * 0.6, mid + 24, { color: theme.secant, width: 2, head: 7 });
      if (Math.abs(vo) >= 1) arrow(ctx, ox, mid + 24, ox - vo * 0.6, mid + 24, { color: theme.tangent, width: 2, head: 7 });
      label(ctx, `v_s = ${waveFixed(vs, 0)} m/s`, sx, mid + 42, { color: theme.secant, font: theme.font, align: "center" });
      label(ctx, `v_o = ${waveFixed(vo, 0)} m/s`, ox + 8, mid - 24, { color: theme.tangent, font: theme.font, align: "right" });
      label(ctx, "+ means moving towards the other", left, box.y + box.h + 12, { color: theme.muted, font: theme.font });
      if (words) {
        const fo = num(results.observedFrequency);
        const change = Math.round(num(results.pitchChange));
        caption(`f′ = ${waveFixed(f, 0)} × (${plus(v, vo)})/(${minus(v, vs)}) = ${waveFixed(fo, 0)} Hz`, 1);
        caption(change > 0 ? "higher than the source: the waves arrive more often" : change < 0 ? "lower than the source: the waves arrive less often" : "no change in pitch", 0, theme.muted);
      }
    }

    if (has("decibel")) {
      title("Intensity and the decibel");
      const r = num(results.distance, 10);
      const level = num(results.level);
      const sy = top + 46;
      const sx = left + 14;
      const lx = left + 50 + (Math.log10(r) / 2) * (span - 70);
      disc(ctx, sx, sy, 9, theme.secant);
      ctx.save();
      ctx.strokeStyle = theme.secant;
      ctx.lineWidth = 1.5;
      for (const ring of [18, 28, 38]) {
        ctx.globalAlpha = 1 - ring / 50;
        ctx.beginPath();
        ctx.arc(sx, sy, ring, -Math.PI / 4, Math.PI / 4);
        ctx.stroke();
      }
      ctx.restore();
      line(ctx, sx, sy + 30, right, sy + 30, theme.axis, 1);
      for (const [m, text] of [[1, "1 m"], [10, "10 m"], [100, "100 m"]] as const) {
        const x = left + 50 + (Math.log10(m) / 2) * (span - 70);
        line(ctx, x, sy + 26, x, sy + 34, theme.axis, 1);
        label(ctx, text, clamp(x, left + 20, right - 20), sy + 44, { color: theme.muted, font: theme.font, align: "center" });
      }
      disc(ctx, lx, sy, 7, theme.tangent);
      label(ctx, `r = ${waveFixed(r, 0)} m`, clamp(lx, left + 40, right - 30), sy - 18, { color: theme.tangent, font: theme.font, align: "center" });
      label(ctx, `source ${waveFixed(num(results.power), 2)} W`, sx - 8, sy + 60, { color: theme.secant, font: theme.font });
      // The sound-level meter: 0 to 140 dB.
      const my = top + 140;
      const dbx = (db: number) => left + 4 + (clamp(db, 0, 140) / 140) * (span - 8);
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(dbx(0), my, dbx(140) - dbx(0), 14);
      ctx.restore();
      for (const [db, name] of [[0, "hearing"], [30, "whisper"], [60, "talk"], [90, "traffic"], [120, "pain"]] as const) {
        const x = dbx(db);
        line(ctx, x, my, x, my + 14, theme.axis, 1);
        label(ctx, String(db), x, my + 24, { color: theme.muted, font: theme.font, align: db === 0 ? "left" : "center" });
        label(ctx, name, x, my + 40, { color: theme.muted, font: theme.font, align: db === 0 ? "left" : "center" });
      }
      label(ctx, "dB", dbx(140), my + 24, { color: theme.muted, font: theme.font, align: "right" });
      if (words) {
        const x = dbx(level);
        ctx.save();
        ctx.fillStyle = theme.angle;
        ctx.fillRect(dbx(0), my, x - dbx(0), 14);
        ctx.restore();
        label(ctx, `${waveFixed(level, 1)} dB`, clamp(x, left + 30, right - 30), my - 12, { color: theme.angle, font: theme.fontStrong, align: "center" });
        caption(`I = P/4πr² = ${waveScientific(num(results.intensity))} W/m²`, 1);
        caption(`β = 10 log₁₀(I/I₀) = ${waveFixed(level, 1)} dB, I₀ = 10⁻¹² W/m²`, 0, theme.muted);
      }
    }
  },
};
