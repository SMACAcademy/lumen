/**
 * Dual nature of radiation and matter, in four pictures.
 *
 * Photocell: light of one colour falls on a metal plate in a vacuum tube;
 * electrons (if any) cross to the collector, and those too slow to climb a
 * negative collector turn back. Under it, either the I–V graph — current
 * against collector potential, saturating at 0 V and falling to zero at
 * −V₀ — or Millikan's graph of V₀ against ν: a straight line for each metal,
 * all of slope h/e, meeting the ν axis at each metal's threshold.
 *
 * Photons: the light drawn as a wave carrying photons, over a spectrum strip
 * with each metal's threshold wavelength marked.
 *
 * Electron waves: the Davisson–Germer apparatus — an electron gun, a nickel
 * crystal and a detector swung through an angle θ — over the counts against
 * angle, with the bump where D sin θ = λ.
 */

import {
  PHOTO_COLLECTOR_RANGE,
  PHOTO_H_OVER_E,
  PHOTO_HC_EV_NM,
  PHOTO_LOOP,
  PHOTO_METAL_ORDER,
  PHOTO_METALS,
  PHOTO_WAVELENGTH_RANGE,
  photoCurrentAt,
  photoScatter,
  photoThresholdFrequency,
} from "@ise/physics-engine";
import { wavelengthColor } from "../hydrogen/renderer";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface PhotoelectricLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The apparatus (or the beam of photons) at the top. */
  picture: Box;
  /** The graph (or the spectrum strip) underneath. */
  graph: Box;
}

export function computePhotoelectricLayout(width: number): PhotoelectricLayout {
  const compact = width < 560;
  const height = 400;
  const left = compact ? 40 : 52;
  return {
    width,
    height,
    compact,
    picture: { x: 12, y: 28, width: width - 24, height: 150 },
    graph: { x: left, y: 214, width: width - left - 16, height: height - 214 - 46 },
  };
}

/** The I–V graph's current axis, µA, and the V₀–ν graph's axes. */
export const PHOTO_IV_CURRENT = 10;
export const PHOTO_VNU_FREQUENCY: readonly [number, number] = [0, 2000];
export const PHOTO_VNU_POTENTIAL: readonly [number, number] = [0, 7];

const fixed = (v: number, digits = 2) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 2, dash?: number[], alpha = 1) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = alpha;
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
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function polyline(ctx: CanvasRenderingContext2D, plane: Plane, points: readonly (readonly [number, number])[], colour: string, lineWidth: number, dash?: number[], alpha = 1) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.globalAlpha = alpha;
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

/** Where electron `i` of `n` is at time t: its share of K_max, and how far across the gap (0–1) it has got. */
export function photoElectronPosition(i: number, n: number, t: number, stopping: number, collector: number): { share: number; across: number; returning: boolean } {
  const share = ((i * 0.618034) % 1) * 0.9 + 0.1;
  const phase = (t / PHOTO_LOOP + i / n) % 1;
  // On a negative collector an electron with energy share·eV₀ gets share·V₀/|V| of the way, then turns back.
  const reach = collector >= 0 ? 1 : Math.min(1, stopping > 0 ? (share * stopping) / -collector : 0);
  if (reach >= 1) return { share, across: phase, returning: false };
  return { share, across: reach * (1 - Math.abs(2 * phase - 1)), returning: phase > 0.5 };
}

/** The tube, plates, light, electrons and circuit. */
function drawCell(ctx: CanvasRenderingContext2D, box: Box, input: { results: Record<string, unknown>; theme: LabTheme; labels: boolean; electrons: boolean }) {
  const { results, theme, labels } = input;
  const metal = PHOTO_METALS[PHOTO_METAL_ORDER[Math.round(num(results.metal))] ?? "cs"];
  const nm = num(results.wavelength, 400);
  const power = num(results.power);
  const emits = num(results.emits) === 1;
  const stopping = num(results.stoppingPotential);
  const collector = num(results.collector);
  const t = num(results.t);

  const left = box.x + 50;
  const right = box.x + box.width - 26;
  const top = box.y + 22;
  const bottom = box.y + 92;
  const ex = left + 16;
  const cx = right - 16;
  const wireY = box.y + 122;

  // The evacuated tube.
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(left, top, right - left, bottom - top, 18);
  ctx.stroke();
  ctx.restore();

  // Light from the lamp at the top left onto the metal plate.
  const colour = wavelengthColor(nm, theme);
  const lamp: [number, number] = [box.x + 6, box.y + 2];
  if (power > 0) {
    for (const k of [-1, 0, 1]) {
      line(ctx, lamp[0], lamp[1] + k * 5, ex - 4, (top + bottom) / 2 + k * 14, colour, 3, undefined, 0.25 + (0.6 * power) / 2);
    }
  }
  disc(ctx, lamp[0], lamp[1], 5, colour);
  label(ctx, `${fixed(nm, 0)} nm${nm < 380 ? " (UV)" : ""}`, lamp[0] + 12, lamp[1] + 2, { color: theme.text, font: theme.font });

  // The plates.
  line(ctx, ex, top + 10, ex, bottom - 10, theme.neutral, 6);
  line(ctx, cx, top + 10, cx, bottom - 10, theme.neutral, 4);
  label(ctx, `${metal.symbol} plate`, ex, bottom + 12, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, "collector", cx, bottom + 12, { color: theme.text, font: theme.font, align: "center" });

  // The electrons: how many is set by the power, how far they get by the collector.
  if (input.electrons && emits && power > 0) {
    const n = Math.max(3, Math.round(4 + 8 * power));
    const gap = cx - ex - 10;
    for (let i = 0; i < n; i++) {
      const { across, returning } = photoElectronPosition(i, n, t, stopping, collector);
      const y = top + 14 + ((i * 37) % Math.max(1, bottom - top - 28));
      disc(ctx, ex + 6 + across * gap, y, 3, returning ? theme.secant : theme.sine);
    }
  }

  // The circuit underneath: emitter to ammeter to battery to collector.
  line(ctx, ex, bottom - 10, ex, wireY, theme.muted, 1.5);
  line(ctx, cx, bottom - 10, cx, wireY, theme.muted, 1.5);
  const ax = box.x + box.width * 0.36;
  const bx = box.x + box.width * 0.64;
  line(ctx, ex, wireY, ax - 9, wireY, theme.muted, 1.5);
  line(ctx, ax + 9, wireY, bx - 5, wireY, theme.muted, 1.5);
  line(ctx, bx + 5, wireY, cx, wireY, theme.muted, 1.5);
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(ax, wireY, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  label(ctx, "A", ax, wireY, { color: theme.text, font: theme.fontStrong, align: "center" });
  // A cell: long plate and short plate; the collector side is + when V > 0.
  const plus = collector >= 0 ? bx + 5 : bx - 5;
  const minus = collector >= 0 ? bx - 5 : bx + 5;
  line(ctx, plus, wireY - 10, plus, wireY + 10, theme.text, 1.5);
  line(ctx, minus, wireY - 5, minus, wireY + 5, theme.text, 3);
  label(ctx, `V = ${collector > 0 ? "+" : ""}${fixed(collector)} V`, bx, wireY + 20, { color: theme.angle, font: theme.font, align: "center" });
  if (labels) label(ctx, `I = ${fixed(num(results.current))} µA`, ax, wireY + 20, { color: theme.tangent, font: theme.font, align: "center" });
}

/** Current against collector potential: saturation for V ≥ 0, a straight fall to zero at −V₀. */
function drawIV(ctx: CanvasRenderingContext2D, box: Box, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const plane = createPlane(box, PHOTO_COLLECTOR_RANGE, [0, PHOTO_IV_CURRENT]);
  drawPlane(ctx, plane, theme);
  label(ctx, "I / µA against collector potential / V", box.x, box.y - 10, { color: theme.muted, font: theme.font });
  const saturation = num(results.saturationCurrent);
  const stopping = num(results.stoppingPotential);
  const collector = num(results.collector);
  const [lo, hi] = PHOTO_COLLECTOR_RANGE;
  const points: [number, number][] = saturation > 0 ? [[lo, 0], [-stopping, 0], [0, saturation], [hi, saturation]] : [[lo, 0], [hi, 0]];
  polyline(ctx, plane, points, theme.curve, 2.5);
  const [px, py] = plane.toPx(collector, photoCurrentAt(saturation, stopping, collector));
  disc(ctx, px, py, 5, theme.angle);
  if (labels && saturation > 0) {
    const [sx, sy] = plane.toPx(-stopping, 0);
    line(ctx, sx, sy, sx, sy - 18, theme.cosine, 2);
    const words = `−V₀ = ${fixed(-stopping)} V`;
    const roomLeft = sx - 6 - words.length * 6.5 >= box.x;
    label(ctx, words, roomLeft ? sx - 6 : sx + 6, sy - 26, { color: theme.cosine, font: theme.font, align: roomLeft ? "right" : "left" });
    const [, iy] = plane.toPx(0, saturation);
    label(ctx, `I_sat ${fixed(saturation)} µA`, box.x + box.width - 2, Math.max(box.y + 8, iy - 10), { color: theme.tangent, font: theme.font, align: "right" });
  }
}

/** Millikan's graph: V₀ against ν for every metal, the chosen one bold, all of slope h/e. */
function drawMillikan(ctx: CanvasRenderingContext2D, box: Box, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const plane = createPlane(box, PHOTO_VNU_FREQUENCY, PHOTO_VNU_POTENTIAL);
  drawPlane(ctx, plane, theme);
  label(ctx, "stopping potential V₀ / V against ν / THz", box.x, box.y - 10, { color: theme.muted, font: theme.font });
  const chosen = PHOTO_METAL_ORDER[Math.round(num(results.metal))] ?? "cs";
  const slope = PHOTO_H_OVER_E * 1e12; // V per THz
  const top = PHOTO_VNU_FREQUENCY[1];
  for (const id of PHOTO_METAL_ORDER) {
    if (id === chosen) continue;
    const nu0 = photoThresholdFrequency(PHOTO_METALS[id].workFunction);
    polyline(ctx, plane, [[nu0, 0], [top, slope * (top - nu0)]], theme.reference, 1.2, undefined, 0.8);
  }
  const nu0 = num(results.thresholdFrequency);
  polyline(ctx, plane, [[nu0, 0], [top, slope * (top - nu0)]], theme.curve, 2.5);
  const [zx, zy] = plane.toPx(nu0, 0);
  disc(ctx, zx, zy, 4, theme.cosine);
  const nu = num(results.frequency);
  const [px, py] = plane.toPx(nu, num(results.stoppingPotential));
  disc(ctx, px, py, 5, theme.angle);
  if (labels) {
    label(ctx, `ν₀ = ${fixed(nu0, 0)} THz`, zx, zy - 12, { color: theme.cosine, font: theme.font, align: zx > box.x + box.width / 2 ? "right" : "left" });
    label(ctx, "slope h/e, same for every metal", box.x + 6, box.y + 8, { color: theme.text, font: theme.font });
  }
}

/** The light as a travelling wave, with photon packets riding it. */
function drawBeam(ctx: CanvasRenderingContext2D, box: Box, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const nm = num(results.wavelength, 400);
  const colour = wavelengthColor(nm, theme);
  const t = num(results.t);
  const y = box.y + box.height / 2 - 6;
  const x0 = box.x + 8;
  const x1 = box.x + box.width - 8;
  // 0.12 px per nm: a 400 nm wave is drawn 48 px long, a 200 nm one 24 px.
  const lambdaPx = nm * 0.12;
  const shift = (t / PHOTO_LOOP) * 2 * lambdaPx;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 2) {
    const yy = y - 16 * Math.sin((2 * Math.PI * (x - x0 - shift)) / lambdaPx);
    if (x === x0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  ctx.restore();
  // Photons: more of them for more power at the same colour.
  const flux = num(results.photonFlux);
  const count = Math.min(14, Math.round(flux * 1.2));
  for (let i = 0; i < count; i++) {
    const x = x0 + (((i / Math.max(1, count)) + t / PHOTO_LOOP) % 1) * (x1 - x0);
    disc(ctx, x, y, 4, theme.point, 0.85);
  }
  arrow(ctx, x1 - 30, y + 30, x1, y + 30, { color: theme.muted, width: 1.5, head: 6 });
  label(ctx, `λ = ${fixed(nm, 0)} nm · ν = ${fixed(num(results.frequency), 0)} THz`, box.x + 8, box.y + 6, { color: theme.text, font: theme.font });
  if (labels) {
    label(ctx, `E = hν = ${fixed(num(results.photonEnergy))} eV = ${fixed(num(results.photonEnergyJ))} × 10⁻¹⁹ J`, box.x + 8, box.y + box.height - 26, { color: theme.angle, font: theme.font });
    label(ctx, `p = h/λ = ${fixed(num(results.photonMomentum))} × 10⁻²⁷ kg m/s`, box.x + 8, box.y + box.height - 8, { color: theme.tangent, font: theme.font });
  }
}

/** The spectrum from 150 to 750 nm, with the light's wavelength and each metal's threshold. */
function drawSpectrum(ctx: CanvasRenderingContext2D, box: Box, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const [lo, hi] = PHOTO_WAVELENGTH_RANGE;
  const toX = (nm: number) => box.x + ((nm - lo) / (hi - lo)) * box.width;
  const bandTop = box.y + 34;
  const bandHeight = 26;
  label(ctx, "λ₀ marks: shorter waves free electrons", box.x, box.y - 10, { color: theme.muted, font: theme.font });
  ctx.save();
  for (let nm = lo; nm < hi; nm += 5) {
    ctx.fillStyle = wavelengthColor(nm + 2.5, theme);
    ctx.globalAlpha = nm < 380 ? 0.35 : 0.85;
    ctx.fillRect(toX(nm), bandTop, toX(nm + 5) - toX(nm) + 0.5, bandHeight);
  }
  ctx.restore();
  for (const tick of [200, 300, 400, 500, 600, 700]) {
    line(ctx, toX(tick), bandTop + bandHeight, toX(tick), bandTop + bandHeight + 4, theme.axis, 1);
    label(ctx, String(tick), toX(tick), bandTop + bandHeight + 12, { color: theme.muted, font: theme.font, align: "center" });
  }
  label(ctx, "wavelength / nm", box.x + box.width, bandTop + bandHeight + 28, { color: theme.muted, font: theme.font, align: "right" });
  label(ctx, "UV", toX(260), bandTop + bandHeight / 2, { color: theme.text, font: theme.fontStrong, align: "center" });

  const chosen = PHOTO_METAL_ORDER[Math.round(num(results.metal))] ?? "cs";
  if (labels) {
    PHOTO_METAL_ORDER.forEach((id, i) => {
      const x = toX(PHOTO_HC_EV_NM / PHOTO_METALS[id].workFunction);
      const strong = id === chosen;
      line(ctx, x, bandTop - 2, x, bandTop + bandHeight + 2, strong ? theme.text : theme.muted, strong ? 2.5 : 1.5);
      label(ctx, PHOTO_METALS[id].symbol, x, bandTop - (i % 2 === 0 ? 10 : 22), { color: strong ? theme.text : theme.muted, font: strong ? theme.fontStrong : theme.font, align: "center" });
    });
  }
  // The light's own wavelength.
  const x = toX(num(results.wavelength, 400));
  arrow(ctx, x, bandTop + bandHeight + 34, x, bandTop + bandHeight + 2, { color: theme.angle, width: 2, head: 7 });
}

/** Davisson–Germer: gun above, nickel crystal below, detector at θ from the incident beam. */
function drawGun(ctx: CanvasRenderingContext2D, box: Box, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height - 20;
  const R = Math.min(box.height - 44, box.width / 2 - 44);
  const theta = (num(results.detector, 50) * Math.PI) / 180;
  // Gun and incident beam.
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.fillRect(cx - 6, box.y + 2, 12, 16);
  ctx.restore();
  arrow(ctx, cx, box.y + 20, cx, cy - 8, { color: theme.sine, width: 2, head: 7 });
  label(ctx, `electron gun, ${fixed(num(results.accel), 0)} V`, cx - 12, box.y + 10, { color: theme.text, font: theme.font, align: "right" });
  // The crystal.
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(cx - 34, cy, 68, 12);
  ctx.restore();
  label(ctx, "nickel", cx + 40, cy + 6, { color: theme.muted, font: theme.font });
  // The detector arm.
  const dx = cx + R * Math.sin(theta);
  const dy = cy - R * Math.cos(theta);
  const reading = num(results.detectorReading);
  line(ctx, cx, cy, dx, dy, theme.cosine, 1.5 + (2.5 * reading) / 100, [5, 4]);
  ctx.save();
  ctx.fillStyle = theme.cosine;
  ctx.translate(dx, dy);
  ctx.rotate(theta);
  ctx.fillRect(-7, -9, 14, 10);
  ctx.restore();
  if (theta < Math.PI / 3) label(ctx, "detector", dx + 10, dy, { color: theme.cosine, font: theme.font });
  else label(ctx, "detector", Math.min(dx, box.x + box.width - 28), dy - 18, { color: theme.cosine, font: theme.font, align: "center" });
  // θ between the incident beam (continued up) and the scattered beam.
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + theta);
  ctx.stroke();
  ctx.restore();
  const mid = theta / 2;
  label(ctx, `θ = ${fixed(num(results.detector), 0)}°`, cx + 40 * Math.sin(mid) + 4, cy - 40 * Math.cos(mid), { color: theme.angle, font: theme.font });
  if (labels) label(ctx, `λ = ${fixed(num(results.electronWavelength), 3)} nm`, box.x + 2, cy + 6, { color: theme.sine, font: theme.font });
}

/** Counts against detector angle at this voltage, with the detector's position. */
function drawScatter(ctx: CanvasRenderingContext2D, box: Box, results: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const plane = createPlane(box, [0, 90], [0, 100]);
  drawPlane(ctx, plane, theme);
  label(ctx, "counts against detector angle θ / °", box.x, box.y - 10, { color: theme.muted, font: theme.font });
  const volts = num(results.accel, 54);
  const points: [number, number][] = [];
  for (let a = 0; a <= 90; a += 0.5) points.push([a, photoScatter(volts, a)]);
  polyline(ctx, plane, points, theme.curve, 2.5);
  const detector = num(results.detector);
  const [px, py] = plane.toPx(detector, num(results.detectorReading));
  const [, by] = plane.toPx(detector, 0);
  line(ctx, px, by, px, py, theme.cosine, 1.5, [4, 4]);
  disc(ctx, px, py, 5, theme.cosine);
  if (labels && num(results.hasPeak) === 1) {
    const peak = num(results.peakAngle);
    const [qx, qy] = plane.toPx(peak, photoScatter(volts, peak));
    label(ctx, `peak ${fixed(peak, 1)}°`, qx, Math.max(box.y + 6, qy - 12), { color: theme.text, font: theme.font, align: "center" });
  }
}

export const photoelectricRenderer: SimulationRenderer<PhotoelectricLayout> = {
  id: "photoelectric",
  layout: (width) => computePhotoelectricLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers } = input;
    const results = input.results as Record<string, unknown>;
    const has = (layer: string) => layers.has(layer);
    const labels = has("labels");
    const { width, height, picture, graph } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const metal = PHOTO_METALS[PHOTO_METAL_ORDER[Math.round(num(results.metal))] ?? "cs"];
    const emits = num(results.emits) === 1;

    if (has("cell")) {
      title(`Photocell: ${metal.label}, φ = ${fixed(metal.workFunction)} eV`);
      drawCell(ctx, picture, { results, theme, labels, electrons: has("electrons") });
    }
    if (has("beam")) {
      title("Light as a stream of photons");
      drawBeam(ctx, picture, results, theme, labels);
    }
    if (has("gun")) {
      title("Davisson–Germer: electrons on nickel");
      drawGun(ctx, picture, results, theme, labels);
    }

    if (has("iv")) drawIV(ctx, graph, results, theme, labels);
    if (has("vnu")) drawMillikan(ctx, graph, results, theme, labels);
    if (has("spectrum")) drawSpectrum(ctx, graph, results, theme, labels);
    if (has("scatter")) drawScatter(ctx, graph, results, theme, labels);

    if (!labels) return;
    const energy = num(results.photonEnergy);
    if (has("cell")) {
      if (!emits) caption(`hν = ${fixed(energy)} eV < φ = ${fixed(metal.workFunction)} eV: no electrons`);
      else if (has("vnu")) caption(`ν = ${fixed(num(results.frequency), 0)} THz · V₀ = ${fixed(num(results.stoppingPotential))} V · h/e = ${fixed(num(results.hOverE))} × 10⁻¹⁵ V s`);
      else caption(`K_max = hν − φ = ${fixed(num(results.kMax))} eV · V₀ = ${fixed(num(results.stoppingPotential))} V`);
    } else if (has("beam")) {
      caption(`${fixed(num(results.photonFlux))} × 10¹⁵ photons/s at ${fixed(num(results.power))} mW`);
    } else if (has("gun")) {
      caption(`D sin θ = ${fixed(num(results.gratingWavelength), 3)} nm · reading ${fixed(num(results.detectorReading), 0)}`);
    }
  },
};
