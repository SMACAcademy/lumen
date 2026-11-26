/**
 * Wave optics, one picture per mode.
 *
 * Huygens: plane wavefronts crossing from air into glass, closer together
 * and turned in the glass, with the construction — the wavelet from A and
 * the tangent from C — that proves Snell's law.
 *
 * Double and single slit: the apparatus from the side (not to scale), the
 * screen seen face on in the light's own colour, and the intensity across
 * it, with a probe to read the path difference and brightness anywhere.
 *
 * Resolving: two stars through a telescope objective, their blurred images,
 * and the brightness across them — two humps or one.
 *
 * Polaroids: unpolarised light through a polariser and an analyser, and
 * Malus's cos² curve. Brewster: rays at a glass surface, with dots (s) and
 * strokes (p) for the two polarisations. Thin film: the two reflected rays,
 * the colours white light reflects at every thickness, and one wavelength's
 * brightness.
 *
 * Numbers an estimate might ask for — the fringe width, the probe's
 * brightness, the central maximum's width, θ_min, Brewster's angle — are
 * drawn only with the labels layer.
 */

import {
  WAVE_OPTICS_BELOW_INDEX,
  WAVE_OPTICS_BELOW_ORDER,
  WAVE_OPTICS_WHITE,
  waveOpticsAiry,
  waveOpticsFilm,
  waveOpticsSinc2,
  waveOpticsTwoSlit,
} from "@ise/physics-engine";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface WaveOpticsLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The apparatus, side on. */
  scene: Box;
  /** The screen (or image, or colour band) seen face on. */
  strip: Box;
  /** The intensity graph. */
  graph: Box;
  /** The whole drawing area, for the full-size pictures (Huygens, Brewster). */
  full: Box;
}

export function computeWaveOpticsLayout(width: number): WaveOpticsLayout {
  const compact = width < 560;
  const height = 390;
  const left = compact ? 40 : 52;
  return {
    width,
    height,
    compact,
    scene: { x: 16, y: 22, width: width - 32, height: 112 },
    strip: { x: left, y: 148, width: width - left - 16, height: 30 },
    graph: { x: left, y: 196, width: width - left - 16, height: 136 },
    full: { x: 16, y: 26, width: width - 32, height: height - 26 - 40 },
  };
}

// ── Colour of light ─────────────────────────────────────────────────────────

/** Red, green, blue (0–1) of light of one wavelength, as the eye sees it. */
export function waveOpticsRgb(nm: number): [number, number, number] {
  let rgb: [number, number, number];
  if (nm < 440) rgb = [(440 - nm) / 60, 0, 1];
  else if (nm < 490) rgb = [0, (nm - 440) / 50, 1];
  else if (nm < 510) rgb = [0, 1, (510 - nm) / 20];
  else if (nm < 580) rgb = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) rgb = [1, (645 - nm) / 65, 0];
  else rgb = [1, 0, 0];
  const edge = nm < 420 ? 0.45 + (0.55 * (nm - 380)) / 40 : nm > 700 ? 0.45 + (0.55 * (750 - nm)) / 50 : 1;
  return [rgb[0] * edge, rgb[1] * edge, rgb[2] * edge];
}

const SPECTRUM = WAVE_OPTICS_WHITE.filter((_, i) => i % 3 === 0).map((nm) => ({ nm, rgb: waveOpticsRgb(nm) }));
const WHITE_SUM = SPECTRUM.reduce<[number, number, number]>((s, { rgb }) => [s[0] + rgb[0], s[1] + rgb[1], s[2] + rgb[2]], [0, 0, 0]);

const css = (rgb: readonly number[], k = 1) => {
  const c = (v: number) => Math.round(255 * clamp(v * k, 0, 1) ** 0.8);
  return `rgb(${c(rgb[0]!)}, ${c(rgb[1]!)}, ${c(rgb[2]!)})`;
};

/** The colour of white light after each wavelength is dimmed to `brightness(λ)` (0–1). */
export function waveOpticsMix(brightness: (nm: number) => number): [number, number, number] {
  const sum: [number, number, number] = [0, 0, 0];
  for (const { nm, rgb } of SPECTRUM) {
    const b = brightness(nm);
    sum[0] += b * rgb[0];
    sum[1] += b * rgb[1];
    sum[2] += b * rgb[2];
  }
  return [sum[0] / WHITE_SUM[0], sum[1] / WHITE_SUM[1], sum[2] / WHITE_SUM[2]];
}

// ── Small helpers ───────────────────────────────────────────────────────────

const fixed = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const DEG = Math.PI / 180;

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, width = 1.5, dash?: number[], alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.setLineDash(dash ?? []);
  segment(ctx, x1, y1, x2, y2);
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function clipBox(ctx: CanvasRenderingContext2D, box: Box) {
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
}

/** Columns of colour across a strip: `colour(f)` for f from 0 at the left to 1 at the right. */
function paintStrip(ctx: CanvasRenderingContext2D, strip: Box, colour: (f: number) => string, theme: LabTheme) {
  ctx.save();
  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.fillRect(strip.x, strip.y, strip.width, strip.height);
  const columns = Math.max(1, Math.round(strip.width / 2));
  const w = strip.width / columns;
  for (let i = 0; i < columns; i++) {
    ctx.fillStyle = colour((i + 0.5) / columns);
    ctx.fillRect(strip.x + i * w, strip.y, w + 0.5, strip.height);
  }
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(strip.x, strip.y, strip.width, strip.height);
  ctx.restore();
}

interface Axes {
  box: Box;
  x0: number;
  x1: number;
  yMax: number;
  px(x: number): number;
  py(y: number): number;
}

function axes(box: Box, x0: number, x1: number, yMax: number): Axes {
  return {
    box,
    x0,
    x1,
    yMax,
    px: (x) => box.x + ((x - x0) / (x1 - x0)) * box.width,
    py: (y) => box.y + box.height - (y / yMax) * box.height,
  };
}

/** The graph's frame and x ticks (labelled `tickLabel(v)` when `showTicks`). */
function drawAxes(ctx: CanvasRenderingContext2D, a: Axes, ticks: number[], tickLabel: (v: number) => string, theme: LabTheme, showTicks = true) {
  const { box } = a;
  line(ctx, box.x, box.y + box.height, box.x + box.width, box.y + box.height, theme.axis, 1.25);
  line(ctx, box.x, box.y, box.x, box.y + box.height, theme.axis, 1.25);
  for (const t of ticks) {
    const x = a.px(t);
    line(ctx, x, box.y + box.height, x, box.y + box.height + 4, theme.axis, 1);
    if (showTicks) label(ctx, tickLabel(t), x, box.y + box.height + 7, { color: theme.muted, font: theme.font, align: "center", baseline: "top" });
  }
}

function plot(ctx: CanvasRenderingContext2D, a: Axes, f: (x: number) => number, colour: string, width = 2, dash?: number[]) {
  const { box } = a;
  const n = Math.max(60, Math.round(box.width));
  ctx.save();
  clipBox(ctx, { x: box.x, y: box.y - 4, width: box.width, height: box.height + 6 });
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.setLineDash(dash ?? []);
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = a.x0 + ((a.x1 - a.x0) * i) / n;
    const px = a.px(x);
    const py = a.py(f(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function caption(ctx: CanvasRenderingContext2D, layout: WaveOpticsLayout, text: string, theme: LabTheme) {
  label(ctx, text, layout.width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
}

// ── Double and single slit ──────────────────────────────────────────────────

/** Half-width of the screen shown, mm. */
export const WAVE_OPTICS_SCREEN_HALF = { double: 10, single: 20 } as const;

const SLIT_WORDS = ["", "S₂ covered", "two lamps"];

function slitScene(ctx: CanvasRenderingContext2D, layout: WaveOpticsLayout, results: Record<string, unknown>, single: boolean, theme: LabTheme) {
  const { scene } = layout;
  const lambda = num(results.wavelength, 600);
  const light = num(results.light) === 1 && !single;
  const slits = single ? 0 : Math.round(num(results.slits));
  const colour = light ? theme.point : css(waveOpticsRgb(lambda));
  const half = single ? WAVE_OPTICS_SCREEN_HALF.single : WAVE_OPTICS_SCREEN_HALF.double;
  const mid = scene.y + scene.height / 2 - 6;
  const sourceX = scene.x + 8;
  const firstX = scene.x + scene.width * 0.16;
  const barrierX = scene.x + scene.width * 0.36;
  const screenX = scene.x + scene.width - 6;
  const reach = scene.height / 2 - 18;

  // Openings in the barrier, pixel offsets from the axis.
  const gap = single ? 4 + 22 * ((num(results.slitWidth, 0.1) - 0.05) / 0.45) : 0;
  const sep = single ? 0 : 8 + 24 * ((num(results.slitSep, 0.5) - 0.1) / 0.9);
  const openings = single ? [0] : [-sep, sep];

  // The wavelets spreading from each opening towards the screen.
  ctx.save();
  clipBox(ctx, { x: barrierX, y: scene.y, width: screenX - barrierX, height: scene.height - 14 });
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.2;
  const phase = ((num(results.t) * 0.5) % 1) * 14;
  for (const o of openings) {
    if (slits === 1 && o > 0) continue;
    for (let r = phase + 6; r < screenX - barrierX; r += 14) {
      ctx.globalAlpha = 0.45 * (1 - r / (screenX - barrierX));
      ctx.beginPath();
      ctx.arc(barrierX, mid + o, r, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Source and first slit (or two lamps, one behind each slit).
  if (slits === 2) {
    for (const o of openings) dot(ctx, barrierX - 22, mid + o, 4, colour);
  } else {
    dot(ctx, sourceX, mid, 4, colour);
    line(ctx, sourceX, mid, firstX, mid, colour, 1.5, undefined, 0.6);
    line(ctx, firstX, mid - reach, firstX, mid - 3, theme.neutral, 3);
    line(ctx, firstX, mid + 3, firstX, mid + reach, theme.neutral, 3);
    if (!single) {
      line(ctx, firstX, mid, barrierX, mid - sep, colour, 1, undefined, 0.5);
      line(ctx, firstX, mid, barrierX, mid + sep, colour, 1, undefined, 0.5);
    } else line(ctx, firstX, mid, barrierX, mid, colour, 1, undefined, 0.5);
  }

  // The barrier with its slits.
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 3;
  const edges = single ? [-gap, gap] : [-sep - 2.5, -sep + 2.5, sep - 2.5, sep + 2.5];
  const ys = [mid - reach, ...edges.map((e) => mid + e), mid + reach];
  for (let i = 0; i < ys.length; i += 2) segment(ctx, barrierX, ys[i]!, barrierX, ys[i + 1]!);
  ctx.restore();
  if (slits === 1) {
    ctx.save();
    ctx.fillStyle = theme.reference;
    ctx.fillRect(barrierX - 5, mid + sep - 7, 10, 14);
    ctx.restore();
  }

  // The screen and the probe point on it.
  line(ctx, screenX, mid - reach, screenX, mid + reach, theme.text, 2.5);
  const probe = clamp(num(results.probe), -half, half);
  const py = mid - (probe / half) * reach;
  if (!single) {
    for (const o of openings) {
      if (slits === 1 && o > 0) continue;
      line(ctx, barrierX, mid + o, screenX, py, o < 0 ? theme.sine : theme.cosine, 1.25, [4, 3]);
    }
  } else line(ctx, barrierX, mid, screenX, py, theme.sine, 1.25, [4, 3]);
  dot(ctx, screenX, py, 4, theme.angle);

  // Names and sizes (all variables the learner sets).
  const below = mid + reach + 10;
  arrow(ctx, barrierX, below, screenX, below, { color: theme.muted, width: 1, head: 5, double: true });
  label(ctx, `D = ${num(results.screenDist, 1).toFixed(1)} m`, (barrierX + screenX) / 2, below + 1, { color: theme.text, font: theme.font, align: "center", baseline: "bottom", background: theme.background });
  const sizeText = single ? `a = ${num(results.slitWidth, 0.1).toFixed(2)} mm` : `d = ${num(results.slitSep, 0.5).toFixed(2)} mm`;
  label(ctx, sizeText, barrierX + 6, scene.y + 4, { color: theme.text, font: theme.font, baseline: "top" });
  if (!single && slits !== 1 && slits !== 2) {
    label(ctx, "S₁", barrierX - 6, mid - sep, { color: theme.sine, font: theme.font, align: "right" });
    label(ctx, "S₂", barrierX - 6, mid + sep, { color: theme.cosine, font: theme.font, align: "right" });
  }
  if (slits > 0) label(ctx, SLIT_WORDS[slits]!, scene.x, scene.y + 4, { color: theme.muted, font: theme.font, baseline: "top" });
  else label(ctx, light ? "white light" : `${Math.round(lambda)} nm`, scene.x, scene.y + 4, { color: colour, font: theme.font, baseline: "top" });
}

function slitPattern(ctx: CanvasRenderingContext2D, layout: WaveOpticsLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, single: boolean, theme: LabTheme) {
  const lambda = num(results.wavelength, 600);
  const d = num(results.slitSep, 0.5);
  const D = num(results.screenDist, 1);
  const a = num(results.slitWidth, 0.1);
  const white = num(results.light) === 1 && !single;
  const slits = single ? 0 : Math.round(num(results.slits));
  const half = single ? WAVE_OPTICS_SCREEN_HALF.single : WAVE_OPTICS_SCREEN_HALF.double;
  const labels = layers.has("labels");
  const rgb = waveOpticsRgb(lambda);
  const yMax = single ? 1 : 4;

  // Brightness (in the curve's units) at y mm up the screen, for one wavelength.
  const at = (y: number, nm: number) => {
    if (single) return waveOpticsSinc2((Math.PI * a * y * 1000) / (nm * D));
    if (slits === 1) return 1;
    if (slits === 2) return 2;
    return waveOpticsTwoSlit(((d * y) / D) * 1000, nm);
  };
  const curve = (y: number) => (white ? SPECTRUM.reduce((s, { nm }) => s + at(y, nm), 0) / SPECTRUM.length : at(y, lambda));

  if (layers.has("screen")) {
    paintStrip(
      ctx,
      layout.strip,
      (f) => {
        const y = -half + 2 * half * f;
        return white ? css(waveOpticsMix((nm) => at(y, nm) / yMax)) : css(rgb, at(y, lambda) / yMax);
      },
      theme,
    );
    label(ctx, "screen", layout.strip.x - 4, layout.strip.y + layout.strip.height / 2, { color: theme.muted, font: theme.font, align: "right" });
  }

  const ax = axes(layout.graph, -half, half, yMax * 1.1);
  if (layers.has("curve")) {
    const ticks = single ? [-20, -10, 0, 10, 20] : [-10, -5, 0, 5, 10];
    drawAxes(ctx, ax, ticks, (v) => (v === 0 ? "0" : `${fixed(v, 0)}`), theme);
    label(ctx, "y / mm", layout.graph.x + layout.graph.width, layout.graph.y + layout.graph.height + 20, { color: theme.muted, font: theme.font, align: "right", baseline: "top" });
    plot(ctx, ax, curve, white ? theme.point : css(rgb), 2);
    if (labels) {
      const marks = single ? [[1, "I₀"]] : [[4, "4I₀"], [2, "2I₀"]];
      for (const [v, text] of marks as [number, string][]) {
        line(ctx, ax.px(-half), ax.py(v), ax.px(half), ax.py(v), theme.grid, 1);
        label(ctx, text, layout.graph.x - 4, ax.py(v), { color: theme.muted, font: theme.font, align: "right" });
      }
    }
  }

  // The probe, on the screen and on the curve.
  const probe = num(results.probe);
  if (Math.abs(probe) <= half) {
    const x = ax.px(probe);
    if (layers.has("screen")) line(ctx, x, layout.strip.y - 4, x, layout.strip.y + layout.strip.height + 4, theme.angle, 2);
    if (layers.has("curve")) {
      line(ctx, x, layout.graph.y, x, layout.graph.y + layout.graph.height, theme.angle, 1, [3, 3]);
      dot(ctx, x, ax.py(curve(probe)), 4, theme.angle);
    }
  }

  if (!labels) return;
  // A measuring arrow above the screen: one fringe width, or the central maximum.
  const arrowY = layout.strip.y - 9;
  if (single) {
    const w = num(results.firstMinimum);
    if (w < half) {
      arrow(ctx, ax.px(-w), arrowY, ax.px(w), arrowY, { color: theme.angle, width: 1.5, head: 5, double: true });
      label(ctx, `2λD/a = ${num(results.centralWidth).toFixed(1)} mm`, ax.px(0), arrowY - 1, { color: theme.angle, font: theme.font, align: "center", baseline: "bottom", background: theme.background });
    }
  } else if (slits === 0) {
    const beta = num(results.fringeWidth);
    if (beta < half && !white) {
      arrow(ctx, ax.px(0), arrowY, ax.px(beta), arrowY, { color: theme.angle, width: 1.5, head: 5, double: true });
      label(ctx, `β = ${beta.toFixed(2)} mm`, ax.px(beta) + 6, arrowY - 1, { color: theme.angle, font: theme.font, baseline: "bottom", background: theme.background });
    }
  }

  let words: string;
  if (single) {
    const waves = num(results.slitWaves);
    const dark = waves > 0.5 && Math.abs(waves - Math.round(waves)) <= 0.05;
    words = dark
      ? `a·y/D = ${Math.round(waves)}λ: dark, I = 0`
      : `a·y/D = ${waves.toFixed(2)}λ: I = ${num(results.singleIntensity).toFixed(3)} × centre`;
  } else if (slits === 1) words = "One slit: even light, I = I₀ — no fringes";
  else if (slits === 2) words = "Two lamps are not coherent: I₀ + I₀ = 2I₀";
  else if (white) words = "White centre, coloured fringes that soon blur";
  else {
    const fringe = Math.round(num(results.fringe));
    const kind = fringe === 2 ? "bright" : fringe === 1 ? "dark" : "between";
    words = `Δ = ${num(results.pathWaves).toFixed(2)}λ: ${kind}, I = ${num(results.intensity).toFixed(2)} I₀`;
  }
  caption(ctx, layout, words, theme);
}

// ── Huygens ─────────────────────────────────────────────────────────────────

function huygens(ctx: CanvasRenderingContext2D, layout: WaveOpticsLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const { full, compact } = layout;
  const i = num(results.incidence, 30) * DEG;
  const r = num(results.refraction, 19.5) * DEG;
  const n = num(results.index, 1.5);
  const y0 = full.y + full.height / 2;
  const cx = full.x + full.width / 2;
  const top: Box = { x: full.x, y: full.y, width: full.width, height: y0 - full.y };
  const bottom: Box = { x: full.x, y: y0, width: full.width, height: full.y + full.height - y0 };
  const colour = css(waveOpticsRgb(num(results.wavelength, 600)));

  ctx.save();
  ctx.globalAlpha = 0.08 + 0.2 * (n - 1);
  ctx.fillStyle = theme.sine;
  ctx.fillRect(bottom.x, bottom.y, bottom.width, bottom.height);
  ctx.restore();
  line(ctx, full.x, y0, full.x + full.width, y0, theme.axis, 1.5);
  label(ctx, "air, n = 1", full.x + 4, full.y + 8, { color: theme.muted, font: theme.font });
  label(ctx, `glass, n = ${n.toFixed(2)}`, full.x + 4, full.y + full.height - 8, { color: theme.muted, font: theme.font });

  // Plane wavefronts, one wavelength apart, marching on with the clock.
  const s1 = compact ? 30 : 38;
  const tau = (num(results.t) * 0.5) % 1;
  const fronts = (box: Box, angle: number, spacing: number) => {
    const k = [Math.sin(angle), Math.cos(angle)];
    const u = [Math.cos(angle), -Math.sin(angle)];
    const reach = layout.width * 2;
    ctx.save();
    clipBox(ctx, box);
    ctx.strokeStyle = colour;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.5;
    const count = Math.ceil(layout.height / spacing) + 2;
    for (let m = -count; m <= count; m++) {
      const px = cx + k[0]! * spacing * (m + tau);
      const py = y0 + k[1]! * spacing * (m + tau);
      segment(ctx, px - u[0]! * reach, py - u[1]! * reach, px + u[0]! * reach, py + u[1]! * reach);
    }
    ctx.restore();
  };
  fronts(top, i, s1);
  fronts(bottom, r, s1 / n);

  // Huygens' construction: the wavelet from A and the new wavefront CE.
  if (layers.has("wavelets") && i > 2 * DEG) {
    const L = Math.min(full.width * 0.6, 280);
    const A = [cx - L / 2, y0];
    const C = [cx + L / 2, y0];
    const BC = L * Math.sin(i);
    const B = [C[0]! - Math.sin(i) * BC, C[1]! - Math.cos(i) * BC];
    const R = BC / n;
    const E = [A[0]! + Math.sin(r) * R, A[1]! + Math.cos(r) * R];
    line(ctx, A[0]!, A[1]! - 40, A[0]!, A[1]! + 40, theme.muted, 1, [3, 3]);
    line(ctx, B[0]!, B[1]!, C[0]!, C[1]!, theme.muted, 1.25, [5, 4]);
    line(ctx, A[0]!, A[1]!, E[0]!, E[1]!, theme.muted, 1.25, [5, 4]);
    ctx.save();
    ctx.strokeStyle = theme.cosine;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(A[0]!, A[1]!, R, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
    line(ctx, A[0]!, A[1]!, B[0]!, B[1]!, theme.angle, 2.5);
    line(ctx, C[0]!, C[1]!, E[0]!, E[1]!, theme.tangent, 2.5);
    for (const [p, name, dx, dy] of [
      [A, "A", -8, 10],
      [B, "B", -4, -10],
      [C, "C", 8, -10],
      [E, "E", -10, 8],
    ] as const) {
      dot(ctx, p[0]!, p[1]!, 3, theme.point);
      label(ctx, name, p[0]! + dx, p[1]! + dy, { color: theme.text, font: theme.fontStrong, align: "center" });
    }
    label(ctx, "i", A[0]! + 30 * Math.cos(i / 2), A[1]! - 30 * Math.sin(i / 2) - 2, { color: theme.angle, font: theme.fontStrong, align: "center" });
    label(ctx, "r", C[0]! - 30 * Math.cos(r / 2), C[1]! + 30 * Math.sin(r / 2) + 2, { color: theme.tangent, font: theme.fontStrong, align: "center" });
  }

  if (layers.has("labels")) {
    const v = num(results.speedIn) / 1e8;
    label(ctx, `λ in glass = ${num(results.wavelengthIn).toFixed(0)} nm`, full.x + full.width - 4, full.y + full.height - 8, { color: theme.text, font: theme.font, align: "right" });
    caption(ctx, layout, `sin i / sin r = ${num(results.sinRatio).toFixed(2)} = c/v, v = ${v.toFixed(2)}×10⁸ m/s`, theme);
  }
}

// ── Resolving power ─────────────────────────────────────────────────────────

function rayleigh(ctx: CanvasRenderingContext2D, layout: WaveOpticsLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const { scene } = layout;
  const lambda = num(results.wavelength, 550);
  const D = num(results.aperture, 10);
  const sep = num(results.separation, 10);
  const thetaMin = num(results.thetaMin, 6.71);
  const labels = layers.has("labels");
  const rgb = waveOpticsRgb(lambda);
  const colour = css(rgb);
  const mid = scene.y + scene.height / 2 - 4;

  {
    const starX = scene.x + 10;
    const lensX = scene.x + scene.width * 0.5;
    const imageX = scene.x + scene.width - 10;
    const lensH = 14 + 30 * (Math.log(D / 2) / Math.log(50));
    for (const s of [-1, 1]) {
      dot(ctx, starX, mid + s * 7, 3, colour);
      line(ctx, starX, mid + s * 7, lensX, mid - lensH, colour, 1, undefined, 0.45);
      line(ctx, starX, mid + s * 7, lensX, mid + lensH, colour, 1, undefined, 0.45);
      line(ctx, lensX, mid - lensH, imageX, mid - s * 5, colour, 1, undefined, 0.45);
      line(ctx, lensX, mid + lensH, imageX, mid - s * 5, colour, 1, undefined, 0.45);
    }
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = theme.sine;
    ctx.beginPath();
    ctx.ellipse(lensX, mid, 6, lensH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    line(ctx, imageX, mid - 30, imageX, mid + 30, theme.muted, 1.5);
    label(ctx, "two stars", starX - 4, scene.y + 4, { color: theme.muted, font: theme.font, baseline: "top" });
    label(ctx, `D = ${Math.round(D)} cm`, lensX, mid + lensH + 4, { color: theme.text, font: theme.font, align: "center", baseline: "top" });
    label(ctx, "image", imageX, scene.y + 4, { color: theme.muted, font: theme.font, align: "right", baseline: "top" });
  }

  // Each star's Airy pattern, in µrad from the axis; x = π·D·θ/λ with D in cm, θ in µrad, λ in nm.
  const star = (theta: number, centre: number) => waveOpticsAiry((10 * Math.PI * D * (theta - centre)) / lambda);
  const total = (theta: number) => star(theta, -sep / 2) + star(theta, sep / 2);
  const peak = 1 + star(sep / 2, -sep / 2);
  const half = Math.max(2.2 * thetaMin, sep / 2 + 1.6 * thetaMin);

  if (layers.has("image")) {
    paintStrip(ctx, layout.strip, (f) => css(rgb, total(-half + 2 * half * f) / peak), theme);
  }
  const ax = axes(layout.graph, -half, half, 2.1);
  if (layers.has("curve")) {
    const step = half > 20 ? 10 : half > 8 ? 5 : half > 3 ? 2 : 1;
    const ticks: number[] = [];
    for (let v = -Math.floor(half / step) * step; v <= half + 1e-9; v += step) ticks.push(v);
    drawAxes(ctx, ax, ticks, (v) => fixed(v, 0), theme, labels);
    if (labels) label(ctx, "θ / µrad", layout.graph.x + layout.graph.width, layout.graph.y + layout.graph.height + 20, { color: theme.muted, font: theme.font, align: "right", baseline: "top" });
    plot(ctx, ax, (x) => star(x, -sep / 2), theme.sine, 1.25, [4, 3]);
    plot(ctx, ax, (x) => star(x, sep / 2), theme.cosine, 1.25, [4, 3]);
    plot(ctx, ax, total, colour, 2.5);
    if (labels && thetaMin < half) {
      const y = ax.py(1.6);
      arrow(ctx, ax.px(-sep / 2), y, ax.px(-sep / 2 + thetaMin), y, { color: theme.angle, width: 1.5, head: 5, double: true });
      label(ctx, `θmin = ${thetaMin.toFixed(2)} µrad`, ax.px(-sep / 2) - 2, y - 4, { color: theme.angle, font: theme.font, align: layout.compact ? "left" : "right", baseline: "bottom", background: theme.background });
    }
  }

  if (labels) {
    const resolved = num(results.resolved) === 1;
    caption(
      ctx,
      layout,
      resolved
        ? `Resolved: ${sep.toFixed(1)} ≥ 1.22λ/D = ${thetaMin.toFixed(2)} µrad`
        : `One blur: ${sep.toFixed(1)} < 1.22λ/D = ${thetaMin.toFixed(2)} µrad`,
      theme,
    );
  }
}

// ── Polaroids ───────────────────────────────────────────────────────────────

function polaroids(ctx: CanvasRenderingContext2D, layout: WaveOpticsLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const { scene } = layout;
  const theta = num(results.analyser) * DEG;
  const out = num(results.transmitted, 0.5);
  const labels = layers.has("labels");
  const mid = scene.y + scene.height / 2;
  const lampX = scene.x + 8;
  const p1 = scene.x + scene.width * 0.32;
  const p2 = scene.x + scene.width * 0.62;
  const screenX = scene.x + scene.width - 14;
  const beam = theme.angle;

  {
    // The beam, dimmer after each polaroid.
    for (const [x1, x2, k] of [
      [lampX, p1, 1],
      [p1, p2, 0.5],
      [p2, screenX, out],
    ] as const) {
      ctx.save();
      ctx.globalAlpha = 0.15 + 0.6 * k;
      ctx.fillStyle = beam;
      ctx.fillRect(x1, mid - 7, x2 - x1, 14);
      ctx.restore();
    }
    dot(ctx, lampX, mid, 6, beam);

    // What the light's vibration looks like in each stretch.
    const glyph = (x: number, angle: number, length: number) => {
      const dx = Math.sin(angle) * length * 0.35;
      const dy = -Math.cos(angle) * length;
      if (length > 1) arrow(ctx, x - dx, mid - dy, x + dx, mid + dy, { color: theme.text, width: 1.5, head: 5, double: true });
    };
    const unpolX = (lampX + p1) / 2;
    for (const a of [0, 45, 90, 135]) glyph(unpolX, a * DEG, 16);
    glyph((p1 + p2) / 2, 0, 18);
    glyph((p2 + screenX) / 2, theta, 18 * Math.abs(Math.cos(theta)));

    // The two polaroids, with their transmission axes.
    for (const [x, angle, name] of [
      [p1, 0, "polariser"],
      [p2, theta, "analyser"],
    ] as const) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = theme.sine;
      ctx.beginPath();
      ctx.ellipse(x, mid, 10, 38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      line(ctx, x - Math.sin(angle) * 9, mid + Math.cos(angle) * 34, x + Math.sin(angle) * 9, mid - Math.cos(angle) * 34, theme.sine, 2.5);
      label(ctx, name, x, scene.y + scene.height - 2, { color: theme.muted, font: theme.font, align: "center", baseline: "bottom" });
    }
    label(ctx, `θ = ${Math.round(num(results.analyser))}°`, p2 + 14, scene.y + 4, { color: theme.text, font: theme.font, baseline: "top" });

    ctx.save();
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.fillRect(screenX, mid - 24, 10, 48);
    ctx.globalAlpha = clamp(out / 0.5, 0, 1);
    ctx.fillStyle = beam;
    ctx.fillRect(screenX, mid - 24, 10, 48);
    ctx.restore();

    if (labels) {
      label(ctx, "I₀", unpolX, scene.y + 4, { color: theme.text, font: theme.font, align: "center", baseline: "top" });
      label(ctx, "I₀/2", (p1 + p2) / 2, scene.y + 4, { color: theme.text, font: theme.font, align: "center", baseline: "top" });
    }
  }

  if (layers.has("curve")) {
    const ax = axes(layout.graph, 0, 180, 0.55);
    drawAxes(ctx, ax, [0, 45, 90, 135, 180], (v) => `${v}°`, theme);
    plot(ctx, ax, (deg) => 0.5 * Math.cos(deg * DEG) ** 2, theme.angle, 2);
    const x = ax.px(num(results.analyser));
    line(ctx, x, layout.graph.y, x, layout.graph.y + layout.graph.height, theme.sine, 1, [3, 3]);
    dot(ctx, x, ax.py(out), 4, theme.sine);
    label(ctx, "I/I₀", layout.graph.x + 6, layout.graph.y - 6, { color: theme.muted, font: theme.font });
    if (labels) label(ctx, "½", layout.graph.x - 4, ax.py(0.5), { color: theme.muted, font: theme.font, align: "right" });
  }

  if (labels) caption(ctx, layout, `I = ½I₀ cos²${Math.round(num(results.analyser))}° = ${out.toFixed(3)} I₀`, theme);
}

// ── Brewster ────────────────────────────────────────────────────────────────

function brewster(ctx: CanvasRenderingContext2D, layout: WaveOpticsLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const { full } = layout;
  const i = num(results.incidence, 30) * DEG;
  const r = num(results.refraction, 19.5) * DEG;
  const n = num(results.index, 1.5);
  const Rs = num(results.reflectS);
  const Rp = num(results.reflectP);
  const labels = layers.has("labels");
  const y0 = full.y + full.height / 2;
  const ox = full.x + full.width * (layout.compact ? 0.42 : 0.45);
  const L = Math.min(full.height / 2 - 8, full.width * 0.4);
  const beam = theme.angle;

  ctx.save();
  ctx.globalAlpha = 0.08 + 0.2 * (n - 1);
  ctx.fillStyle = theme.sine;
  ctx.fillRect(full.x, y0, full.width, full.y + full.height - y0);
  ctx.restore();
  line(ctx, full.x, y0, full.x + full.width, y0, theme.axis, 1.5);
  line(ctx, ox, y0 - L, ox, y0 + L, theme.muted, 1, [3, 3]);
  label(ctx, `glass, n = ${n.toFixed(2)}`, full.x + 4, full.y + full.height - 8, { color: theme.muted, font: theme.font });

  const start = [ox - L * Math.sin(i), y0 - L * Math.cos(i)];
  const refl = [ox + L * Math.sin(i), y0 - L * Math.cos(i)];
  const refr = [ox + L * Math.sin(r), y0 + L * Math.cos(r)];
  arrow(ctx, start[0]!, start[1]!, ox, y0, { color: beam, width: 2.5, head: 9 });
  arrow(ctx, ox, y0, refl[0]!, refl[1]!, { color: beam, width: 2.5, head: 9, alpha: 0.4 + 0.6 * Math.sqrt(clamp(Rs, 0, 1)) });
  arrow(ctx, ox, y0, refr[0]!, refr[1]!, { color: beam, width: 2.5, head: 9, alpha: 0.85 });

  // Polarisation marks: dots for s (across the page), strokes for p (in the page, across the ray).
  const marks = (x1: number, y1: number, x2: number, y2: number, sAmp: number, pAmp: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ux = (x2 - x1) / len;
    const uy = (y2 - y1) / len;
    for (const f of [0.3, 0.55, 0.8]) {
      const x = x1 + (x2 - x1) * f;
      const y = y1 + (y2 - y1) * f;
      if (sAmp > 0.02) dot(ctx, x + ux * 6, y + uy * 6, 1.5 + 1.5 * sAmp, theme.cosine);
      if (pAmp > 0.02) line(ctx, x - uy * 8 * pAmp, y + ux * 8 * pAmp, x + uy * 8 * pAmp, y - ux * 8 * pAmp, theme.sine, 2);
    }
  };
  if (layers.has("polarisation")) {
    marks(start[0]!, start[1]!, ox, y0, 1, 1);
    marks(ox, y0, refl[0]!, refl[1]!, Rs > 1e-9 ? 1 : 0, Rs > 1e-9 ? Math.sqrt(Rp / Rs) : 0);
    marks(ox, y0, refr[0]!, refr[1]!, 1, 1);
    label(ctx, "• s   | p", full.x + full.width - 4, full.y + 8, { color: theme.muted, font: theme.font, align: "right" });
  }

  label(ctx, "i", ox - 14 * Math.sin(i / 2) - 4, y0 - 26 * Math.cos(i / 2), { color: theme.angle, font: theme.fontStrong, align: "center" });
  label(ctx, "r", ox + 14 * Math.sin(r / 2) + 4, y0 + 26 * Math.cos(r / 2), { color: theme.angle, font: theme.fontStrong, align: "center" });
  label(ctx, `i = ${Math.round(num(results.incidence))}°`, full.x + 4, full.y + 8, { color: theme.text, font: theme.font });

  // Reflectance bars for the two polarisations.
  const barX = full.x + full.width - 44;
  const barBase = y0 - 8;
  for (const [k, R, name, colour] of [
    [0, Rs, "Rs", theme.cosine],
    [1, Rp, "Rp", theme.sine],
  ] as const) {
    const h = 70 * clamp(R, 0, 1);
    ctx.save();
    ctx.fillStyle = colour;
    ctx.fillRect(barX + k * 20, barBase - h, 12, h);
    ctx.restore();
    label(ctx, name, barX + k * 20 + 6, barBase + 9, { color: theme.muted, font: theme.font, align: "center" });
  }

  if (!labels) return;
  if (num(results.atBrewster) === 1) {
    // The reflected and refracted rays are at right angles.
    const a1 = Math.atan2(refl[1]! - y0, refl[0]! - ox);
    const a2 = Math.atan2(refr[1]! - y0, refr[0]! - ox);
    ctx.save();
    ctx.strokeStyle = theme.tangent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ox, y0, 22, a1, a2);
    ctx.stroke();
    ctx.restore();
    label(ctx, "90°", ox + 30, y0 - 4, { color: theme.tangent, font: theme.font });
  }
  const thetaB = num(results.brewsterAngle).toFixed(1);
  caption(
    ctx,
    layout,
    num(results.atBrewster) === 1
      ? `θB = tan⁻¹ ${n.toFixed(2)} = ${thetaB}°: fully polarised`
      : `Reflected light ${Math.round(100 * num(results.polarisedReflect))}% polarised · θB = ${thetaB}°`,
    theme,
  );
}

// ── Thin film ───────────────────────────────────────────────────────────────

/** Thickness shown along the colour band and graph, nm. */
export const WAVE_OPTICS_FILM_MAX = 1000;

function thinFilm(ctx: CanvasRenderingContext2D, layout: WaveOpticsLayout, results: Record<string, unknown>, layers: ReadonlySet<string>, theme: LabTheme) {
  const { scene } = layout;
  const n = num(results.index, 1.33);
  const below = WAVE_OPTICS_BELOW_ORDER[Math.round(num(results.below))] ?? "air";
  const nBelow = WAVE_OPTICS_BELOW_INDEX[below];
  const incidence = num(results.incidence);
  const lambda = num(results.wavelength, 550);
  const thickness = num(results.thickness, 300);
  const labels = layers.has("labels");
  const rgb = waveOpticsRgb(lambda);
  const at = (t: number, nm: number) => waveOpticsFilm(n, t, incidence, nBelow, nm).intensity;

  {
    const topY = scene.y + 40;
    const botY = topY + 30;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = theme.cosine;
    ctx.fillRect(scene.x, topY, scene.width, botY - topY);
    if (nBelow > 1) {
      ctx.globalAlpha = 0.1 + 0.25 * (nBelow - 1);
      ctx.fillStyle = theme.sine;
      ctx.fillRect(scene.x, botY, scene.width, scene.y + scene.height - botY);
    }
    ctx.restore();
    line(ctx, scene.x, topY, scene.x + scene.width, topY, theme.axis, 1);
    line(ctx, scene.x, botY, scene.x + scene.width, botY, theme.axis, 1);
    label(ctx, `film n = ${n.toFixed(2)}, t = ${Math.round(thickness)} nm`, scene.x + 4, (topY + botY) / 2, { color: theme.text, font: theme.font });
    label(ctx, `${below} n = ${nBelow.toFixed(2)}`, scene.x + 4, botY + 14, { color: theme.muted, font: theme.font });

    // Rays drawn at a slant (at least 15°) so the two reflections can be told apart.
    const shown = clamp(incidence, 15, 50) * DEG;
    const inside = Math.asin(Math.sin(shown) / n);
    const ax = scene.x + scene.width * (layout.compact ? 0.62 : 0.55);
    const rise = topY - scene.y - 4;
    const start = [ax - rise * Math.tan(shown), scene.y + 4];
    const run = (botY - topY) * Math.tan(inside);
    const bx = ax + run;
    const c = ax + 2 * run;
    arrow(ctx, start[0]!, start[1]!, ax, topY, { color: css(rgb), width: 2, head: 7 });
    line(ctx, ax, topY, bx, botY, css(rgb), 1.5, undefined, 0.8);
    line(ctx, bx, botY, c, topY, css(rgb), 1.5, undefined, 0.8);
    arrow(ctx, ax, topY, ax + rise * Math.tan(shown), scene.y + 4, { color: theme.sine, width: 2, head: 7 });
    arrow(ctx, c, topY, c + rise * Math.tan(shown), scene.y + 4, { color: theme.cosine, width: 2, head: 7 });
    label(ctx, "1", ax + rise * Math.tan(shown) - 8, scene.y + 10, { color: theme.sine, font: theme.fontStrong, align: "center" });
    label(ctx, "2", c + rise * Math.tan(shown) + 8, scene.y + 10, { color: theme.cosine, font: theme.fontStrong, align: "center" });
    // A reflection off a denser medium flips the phase by π.
    if (n > 1) label(ctx, "π", ax - 10, topY - 8, { color: theme.angle, font: theme.fontStrong, align: "center" });
    if (nBelow > n) label(ctx, "π", bx, botY + 10, { color: theme.angle, font: theme.fontStrong, align: "center" });
  }

  if (layers.has("colours")) {
    paintStrip(ctx, layout.strip, (f) => css(waveOpticsMix((nm) => at(f * WAVE_OPTICS_FILM_MAX, nm))), theme);
    label(ctx, "white", layout.strip.x - 4, layout.strip.y + layout.strip.height / 2, { color: theme.muted, font: theme.font, align: "right" });
  }
  const gx = axes(layout.graph, 0, WAVE_OPTICS_FILM_MAX, 1.1);
  if (layers.has("curve")) {
    drawAxes(ctx, gx, [0, 250, 500, 750, 1000], (v) => `${v}`, theme);
    label(ctx, "t / nm", layout.graph.x + layout.graph.width, layout.graph.y + layout.graph.height + 20, { color: theme.muted, font: theme.font, align: "right", baseline: "top" });
    label(ctx, `${Math.round(lambda)} nm reflected`, layout.graph.x + 6, layout.graph.y - 6, { color: css(rgb), font: theme.font });
    plot(ctx, gx, (t) => at(t, lambda), css(rgb), 2);
  }
  const x = gx.px(clamp(thickness, 0, WAVE_OPTICS_FILM_MAX));
  if (layers.has("colours")) line(ctx, x, layout.strip.y - 4, x, layout.strip.y + layout.strip.height + 4, theme.point, 2);
  if (layers.has("curve")) dot(ctx, x, gx.py(num(results.filmIntensity)), 4, theme.point);

  if (labels) {
    const fringe = Math.round(num(results.filmFringe));
    const kind = fringe === 2 ? "bright" : fringe === 1 ? "dark" : "partly";
    const half = num(results.phaseFlips) === 1 ? " + λ/2" : "";
    caption(ctx, layout, `2nt cos r${half} = ${num(results.filmOrder).toFixed(2)}λ: ${kind}`, theme);
  }
}

// ── The renderer ────────────────────────────────────────────────────────────

export const waveOpticsRenderer: SimulationRenderer<WaveOpticsLayout> = {
  id: "waveoptics",
  layout: (width) => computeWaveOpticsLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers } = input;
    const results = input.results as Record<string, unknown>;
    ctx.clearRect(0, 0, layout.width, layout.height);
    if (layers.has("huygens")) huygens(ctx, layout, results, layers, theme);
    else if (layers.has("double")) {
      slitScene(ctx, layout, results, false, theme);
      slitPattern(ctx, layout, results, layers, false, theme);
    } else if (layers.has("single")) {
      slitScene(ctx, layout, results, true, theme);
      slitPattern(ctx, layout, results, layers, true, theme);
    } else if (layers.has("rayleigh")) rayleigh(ctx, layout, results, layers, theme);
    else if (layers.has("polarise")) polaroids(ctx, layout, results, layers, theme);
    else if (layers.has("brewster")) brewster(ctx, layout, results, layers, theme);
    else if (layers.has("thinfilm")) thinFilm(ctx, layout, results, layers, theme);
  },
};
