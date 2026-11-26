/**
 * Heat transfer and thermal expansion, one bench at a time.
 *
 * Scales: three thermometers side by side — Celsius, Fahrenheit, Kelvin —
 * with one column of mercury, because it is one hotness read three ways.
 *
 * Expansion: a bar beside its cold self, the stretch drawn 50 times larger,
 * and a brass–steel strip that curls as it warms or cools.
 *
 * Water: density against temperature from 0 to 20 °C, with its peak.
 *
 * Rod: a lagged rod between a hot and a cold reservoir, coloured by its
 * temperature, with the straight-line temperature profile underneath.
 *
 * Slabs: two slabs in series, the profile kinking at the joint — steepest in
 * the slab that resists most.
 *
 * Breeze: land, sea, and the loop of air between them, by day or by night.
 *
 * Spectrum: a glowing body in roughly the colour it would look, above
 * Planck's curve with the visible band marked.
 *
 * Cooling: Newton's cooling curve, settling towards room temperature.
 *
 * Numbers a level asks the learner to estimate — readings on other scales,
 * the stretch, the heat current, the joint temperature, the peak wavelength,
 * the temperature of the cooling cup — are drawn only with the labels layer.
 */

import { HEATFLOW_ABS_ZERO, HEATFLOW_EXPANDER_ORDER, HEATFLOW_EXPANDERS, HEATFLOW_CONDUCTOR_ORDER, HEATFLOW_CONDUCTORS, HEATFLOW_VISIBLE, heatflowCooling, heatflowPlanckShape, heatflowWaterDensity } from "@ise/physics-engine";
import { formatNumber, formatSignificant } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface HeatflowLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The whole drawing area inside the margins. */
  box: Box;
  /** Upper and lower halves, for benches drawn as two pictures. */
  top: Box;
  bottom: Box;
}

export function computeHeatflowLayout(width: number): HeatflowLayout {
  const compact = width < 560;
  const height = compact ? 380 : 400;
  const pad = compact ? 10 : 16;
  const box = { x: pad, y: pad, width: Math.max(120, width - 2 * pad), height: height - 2 * pad };
  const split = Math.round(box.height * 0.46);
  return {
    width,
    height,
    compact,
    box,
    top: { x: box.x, y: box.y, width: box.width, height: split },
    bottom: { x: box.x, y: box.y + split, width: box.width, height: box.height - split },
  };
}

/** How many times larger the stretch of the bar is drawn. */
export const HEATFLOW_DRAW_STRETCH = 50;

const minus = (text: string) => text.replace(/^-/, "−");
const signed = (v: number, digits: number) => `${v > 0 ? "+" : ""}${formatNumber(v, digits)}`;

function caption(ctx: CanvasRenderingContext2D, theme: LabTheme, text: string, x: number, y: number, color = theme.muted) {
  label(ctx, text, x, y, { color, font: theme.font, align: "center" });
}

/** The colour a hot body looks, roughly (a fit to the blackbody colours). */
export function heatflowBodyColor(kelvin: number, theme: LabTheme): string {
  if (kelvin < 800) return theme.reference;
  const t = kelvin / 100;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  // A dull red glow is dim as well as red.
  const bright = clamp((kelvin - 600) / 1200, 0.35, 1);
  const c = (v: number) => Math.round(clamp(v, 0, 255) * bright);
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

/** The colour of visible light of a wavelength, for the band under the spectrum. */
function bandColor(nm: number): string {
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) [r, g, b] = [(440 - nm) / 60, 0, 1];
  else if (nm < 490) [r, g, b] = [0, (nm - 440) / 50, 1];
  else if (nm < 510) [r, g, b] = [0, 1, (510 - nm) / 20];
  else if (nm < 580) [r, g, b] = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) [r, g, b] = [1, (645 - nm) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  const c = (v: number) => Math.round(255 * clamp(v, 0, 1));
  return `rgb(${c(r)}, ${c(g)}, ${c(b)})`;
}

const GLOW_NAMES = ["no visible glow", "a dull red glow", "an orange glow", "a yellow-white glow", "a white glow", "a bluish-white glow"];

// ── Scales ─────────────────────────────────────────────────────────────────

function drawScales(ctx: CanvasRenderingContext2D, layout: HeatflowLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { box } = layout;
  const c = num(r.celsius);
  const top = box.y + 50;
  const bulb = box.y + box.height - 62;
  const columnBottom = bulb - 12;
  const yFor = (celsius: number) => columnBottom - ((clamp(celsius, HEATFLOW_ABS_ZERO, 300) - HEATFLOW_ABS_ZERO) / (300 - HEATFLOW_ABS_ZERO)) * (columnBottom - top);
  const level = yFor(c);

  label(ctx, "One hotness, three scales", box.x + box.width / 2, box.y + 8, { color: theme.text, font: theme.fontStrong, align: "center" });

  const scales = [
    { name: "Celsius", ticks: [["−273", HEATFLOW_ABS_ZERO], ["0", 0], ["100", 100]] as const, reading: `${formatNumber(c, 1)} °C` },
    { name: "Fahrenheit", ticks: [["−460", HEATFLOW_ABS_ZERO], ["32", 0], ["212", 100]] as const, reading: `${formatNumber(num(r.fahrenheit), 1)} °F` },
    { name: "Kelvin", ticks: [["0", HEATFLOW_ABS_ZERO], ["273", 0], ["373", 100]] as const, reading: `${formatNumber(num(r.kelvin), 2)} K` },
  ];

  // One level, one hotness: a dashed line across all three.
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.globalAlpha = 0.6;
  ctx.setLineDash([4, 4]);
  segment(ctx, box.x + 4, level, box.x + box.width - 4, level);
  ctx.restore();

  scales.forEach((s, i) => {
    const cx = box.x + (box.width * (i + 0.5)) / 3;
    label(ctx, s.name, cx, box.y + 30, { color: theme.text, font: theme.font, align: "center" });
    ctx.save();
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - 6, top - 6, 12, bulb - top + 6, 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, bulb, 11, 0, Math.PI * 2);
    ctx.fillStyle = theme.secant;
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.secant;
    ctx.fillRect(cx - 3, level, 6, bulb - level);
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1;
    for (const [, at] of s.ticks) segment(ctx, cx - 10, yFor(at), cx - 6, yFor(at));
    ctx.restore();
    for (const [text, at] of s.ticks) label(ctx, text, cx - 12, yFor(at), { color: theme.muted, font: theme.font, align: "right" });
    if (words) label(ctx, s.reading, cx, bulb + 24, { color: theme.secant, font: theme.fontStrong, align: "center" });
  });

  caption(ctx, theme, "F = 9C/5 + 32   ·   K = C + 273.15", box.x + box.width / 2, box.y + box.height - 6);
}

// ── Expansion ──────────────────────────────────────────────────────────────

function drawBar(ctx: CanvasRenderingContext2D, area: Box, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const material = HEATFLOW_EXPANDERS[HEATFLOW_EXPANDER_ORDER[Math.round(num(r.material))] ?? "steel"];
  const dT = num(r.deltaT);
  const strain = num(r.lengthChangePct) / 100;
  const x0 = area.x + 10;
  const length = area.width * 0.68;
  const hot = length * (1 + HEATFLOW_DRAW_STRETCH * strain);
  const colour = dT > 0 ? theme.secant : dT < 0 ? theme.sine : theme.neutral;

  label(ctx, `${material.label} bar, ΔT = ${signed(dT, 0)} K`, area.x + 4, area.y + 8, { color: theme.text, font: theme.fontStrong });
  // The wall it is fixed to.
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 2;
  segment(ctx, x0 - 2, area.y + 26, x0 - 2, area.y + 82);
  ctx.restore();

  const coldY = area.y + 32;
  const hotY = area.y + 60;
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x0, coldY, length, 14);
  ctx.setLineDash([]);
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(x0, hotY, hot, 14);
  ctx.restore();
  // Where the cold bar ended, carried down to the warm one.
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.setLineDash([2, 3]);
  segment(ctx, x0 + length, coldY, x0 + length, hotY + 14);
  ctx.restore();

  label(ctx, "cold", x0 + length + 6, coldY + 7, { color: theme.muted, font: theme.font });
  label(ctx, dT >= 0 ? "warmed" : "cooled", x0 + Math.max(hot, length) + 6, hotY + 7, { color: colour, font: theme.font });
  if (words) {
    label(ctx, `L₀ = ${formatNumber(num(r.barLength), 0)} m · ΔL = ${minus(formatNumber(num(r.deltaL), 2))} mm`, x0, area.y + 92, {
      color: theme.angle,
      font: theme.font,
    });
  }
  caption(ctx, theme, `ΔL = αL₀ΔT, stretch drawn ${HEATFLOW_DRAW_STRETCH} × larger`, area.x + area.width / 2, area.y + area.height - 10);
}

/** Points along the strip's centre line, bent through `turn` radians. */
export function heatflowStripPoints(x0: number, y0: number, length: number, turn: number, n = 32): [number, number][] {
  if (Math.abs(turn) < 1e-6) return Array.from({ length: n + 1 }, (_, i) => [x0 + (length * i) / n, y0]);
  const radius = length / Math.abs(turn);
  const down = turn > 0 ? 1 : -1;
  return Array.from({ length: n + 1 }, (_, i) => {
    const phi = (Math.abs(turn) * i) / n;
    return [x0 + radius * Math.sin(phi), y0 + down * radius * (1 - Math.cos(phi))];
  });
}

function drawBimetal(ctx: CanvasRenderingContext2D, area: Box, r: Record<string, unknown>, theme: LabTheme) {
  const mismatch = num(r.bimetalMismatch);
  const curl = Math.round(num(r.bimetalCurl));
  // 1.2 mm per metre of mismatch (ΔT = 200 K) turns the strip through 60°.
  const turn = clamp((mismatch / 1.2) * (Math.PI / 3), -Math.PI / 3, Math.PI / 3);
  const x0 = area.x + 24;
  const y0 = area.y + area.height * 0.42;
  const length = Math.min(area.width * 0.55, 200);
  const pts = heatflowStripPoints(x0, y0, length, turn);

  label(ctx, "Bimetallic strip: brass on top of steel", area.x + 4, area.y + 10, { color: theme.text, font: theme.fontStrong });
  ctx.save();
  ctx.fillStyle = theme.muted;
  ctx.fillRect(x0 - 12, y0 - 12, 12, 24);
  const offsetLine = (offset: number, colour: string) => {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 4;
    ctx.lineCap = "butt";
    ctx.beginPath();
    pts.forEach(([px, py], i) => {
      const [qx, qy] = pts[Math.min(pts.length - 1, i + 1)]!;
      const [ox, oy] = pts[Math.max(0, i - 1)]!;
      const dx = qx - ox;
      const dy = qy - oy;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const x = px + nx * offset;
      const y = py + ny * offset;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };
  offsetLine(-2.5, theme.angle); // brass, on top
  offsetLine(2.5, theme.neutral); // steel, underneath
  ctx.restore();
  label(ctx, "brass", x0 + 4, y0 - 14, { color: theme.angle, font: theme.font });
  label(ctx, "steel", x0 + 4, y0 + 15, { color: theme.neutral, font: theme.font });

  const verdict =
    curl > 0
      ? "Heated: brass grows more; it curls towards steel"
      : curl < 0
        ? "Cooled: brass shrinks more; it curls towards brass"
        : "No temperature change: the strip stays straight";
  caption(ctx, theme, verdict, area.x + area.width / 2, area.y + area.height - 10, curl === 0 ? theme.muted : theme.text);
}

// ── Water ──────────────────────────────────────────────────────────────────

function drawWater(ctx: CanvasRenderingContext2D, layout: HeatflowLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { box } = layout;
  const left = layout.compact ? 44 : 56;
  const rect = { x: box.x + left, y: box.y + 34, width: box.width - left - 8, height: box.height - 34 - 58 };
  const plane = createPlane(rect, [0, 20], [998, 1000.2]);
  label(ctx, "Density of water, kg/m³, against °C", box.x + box.width / 2, box.y + 8, { color: theme.text, font: theme.fontStrong, align: "center" });
  drawPlane(ctx, plane, theme, { xLabel: "°C" });

  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.sine;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const t = (20 * i) / 200;
    const [px, py] = plane.toPx(t, heatflowWaterDensity(t));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  const t = num(r.waterTemp);
  const [px, py] = plane.toPx(t, num(r.waterDensity));
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (words) {
    const [mx, my] = plane.toPx(4, heatflowWaterDensity(4));
    ctx.save();
    ctx.strokeStyle = theme.tangent;
    ctx.setLineDash([3, 3]);
    segment(ctx, mx, my, mx, rect.y + rect.height);
    ctx.restore();
    label(ctx, "densest, 4 °C", mx + 6, my - 10, { color: theme.tangent, font: theme.font });
    label(ctx, `${formatNumber(t, 1)} °C: ${formatNumber(num(r.waterDensity), 2)} kg/m³`, box.x + box.width / 2, rect.y + rect.height + 26, {
      color: theme.angle,
      font: theme.font,
      align: "center",
    });
    const trend = Math.round(num(r.waterTrend));
    const verdict =
      trend < 0
        ? "Below 4 °C water expands as it cools — anomalous"
        : trend > 0
          ? "Above 4 °C water expands as it warms, as usual"
          : "At 4 °C water is at its densest";
    caption(ctx, theme, verdict, box.x + box.width / 2, box.y + box.height - 6, theme.text);
  }
}

// ── Conduction ─────────────────────────────────────────────────────────────

/** The two reservoirs and the stretch between them where the rod or slabs go. */
function reservoirs(ctx: CanvasRenderingContext2D, area: Box, hot: number, cold: number, theme: LabTheme, y: number, h: number) {
  const w = 40;
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = theme.secant;
  ctx.fillRect(area.x, y, w, h);
  ctx.fillStyle = theme.sine;
  ctx.fillRect(area.x + area.width - w, y, w, h);
  ctx.restore();
  label(ctx, "T₁", area.x + w / 2, y + h / 2 - 9, { color: theme.background, font: theme.fontStrong, align: "center" });
  label(ctx, `${formatNumber(hot, 0)}°`, area.x + w / 2, y + h / 2 + 9, { color: theme.background, font: theme.font, align: "center" });
  label(ctx, "T₂", area.x + area.width - w / 2, y + h / 2 - 9, { color: theme.background, font: theme.fontStrong, align: "center" });
  label(ctx, `${formatNumber(cold, 0)}°`, area.x + area.width - w / 2, y + h / 2 + 9, { color: theme.background, font: theme.font, align: "center" });
  return { left: area.x + w, right: area.x + area.width - w };
}

/** A strip shaded from cold blue to hot orange by temperature. */
function shade(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, tempAt: (f: number) => number, theme: LabTheme) {
  const n = 24;
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = theme.secant;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = clamp(tempAt((i + 0.5) / n) / 300, 0, 1) * 0.95;
    ctx.fillRect(x + (w * i) / n, y, w / n + 0.5, h);
  }
  ctx.restore();
}

function profileTop(hot: number, cold: number): number {
  return Math.max(100, Math.ceil(Math.max(hot, cold) / 50) * 50);
}

function drawRod(ctx: CanvasRenderingContext2D, layout: HeatflowLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { top, bottom, box } = layout;
  const material = HEATFLOW_CONDUCTORS[HEATFLOW_CONDUCTOR_ORDER[Math.round(num(r.rodMaterial))] ?? "copper"];
  const hot = num(r.hotEnd);
  const cold = num(r.coldEnd);
  const L = num(r.rodLength, 0.5);
  const H = num(r.heatCurrent);

  label(ctx, `${material.label} rod, k = ${formatSignificant(material.k, 3)} W/(m·K)`, box.x + 4, top.y + 8, { color: theme.text, font: theme.fontStrong });
  label(ctx, `L = ${formatNumber(L, 2)} m · A = ${formatNumber(num(r.area), 0)} cm² · lagged`, box.x + 4, top.y + 26, { color: theme.muted, font: theme.font });

  const y = top.y + 56;
  const { left, right } = reservoirs(ctx, top, hot, cold, theme, y - 18, 54);
  const rodY = y;
  shade(ctx, left, rodY, right - left, 18, (f) => hot + (cold - hot) * f, theme);
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(left, rodY - 5, right - left, 28);
  ctx.restore();

  if (Math.abs(H) > 1e-12) {
    const [from, to] = H > 0 ? [left + 12, right - 12] : [right - 12, left + 12];
    arrow(ctx, from, rodY + 44, to, rodY + 44, { color: theme.angle, width: 2, head: 8 });
  }
  if (words) {
    label(ctx, `H = ${minus(formatSignificant(H, 3))} W`, (left + right) / 2, rodY + 58, { color: theme.angle, font: theme.fontStrong, align: "center", background: theme.background });
  }

  // Temperature along the rod: a straight line in the steady state.
  const yMax = profileTop(hot, cold);
  const rect = { x: bottom.x + 38, y: bottom.y + 26, width: bottom.width - 46, height: bottom.height - 56 };
  const plane = createPlane(rect, [0, L], [0, yMax]);
  drawPlane(ctx, plane, theme, { xLabel: "x / m", yLabel: "T / °C" });
  const [ax, ay] = plane.toPx(0, hot);
  const [bx, by] = plane.toPx(L, cold);
  ctx.save();
  ctx.strokeStyle = theme.secant;
  ctx.lineWidth = 2.5;
  segment(ctx, ax, ay, bx, by);
  ctx.restore();
  if (words) {
    caption(ctx, theme, `temperature gradient ${minus(formatSignificant(num(r.gradient), 3))} K/m`, box.x + box.width / 2, box.y + box.height - 6, theme.text);
  } else {
    caption(ctx, theme, "H = kA(T₁ − T₂)/L in the steady state", box.x + box.width / 2, box.y + box.height - 6);
  }
}

function drawSlabs(ctx: CanvasRenderingContext2D, layout: HeatflowLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { box } = layout;
  const first = HEATFLOW_CONDUCTORS[HEATFLOW_CONDUCTOR_ORDER[Math.round(num(r.rodMaterial))] ?? "copper"];
  const second = HEATFLOW_CONDUCTORS[HEATFLOW_CONDUCTOR_ORDER[Math.round(num(r.secondMaterial))] ?? "steel"];
  const hot = num(r.hotEnd);
  const cold = num(r.coldEnd);
  const L1 = num(r.rodLength, 0.5);
  const L2 = num(r.secondLength, 0.5);
  const joint = num(r.interfaceTemp);

  label(ctx, "Two slabs in series", box.x + box.width / 2, box.y + 8, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, `A: ${first.label} ${formatNumber(L1, 2)} m · B: ${second.label} ${formatNumber(L2, 2)} m`, box.x + box.width / 2, box.y + 26, {
    color: theme.muted,
    font: theme.font,
    align: "center",
  });

  const slabY = box.y + 46;
  const slabH = Math.min(170, box.height - 46 - 92);
  const { left, right } = reservoirs(ctx, { x: box.x, y: box.y, width: box.width, height: box.height }, hot, cold, theme, slabY, slabH);
  const mid = left + ((right - left) * L1) / (L1 + L2);
  ctx.save();
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = theme.angle;
  ctx.fillRect(left, slabY, mid - left, slabH);
  ctx.fillStyle = theme.curve;
  ctx.fillRect(mid, slabY, right - mid, slabH);
  ctx.restore();
  label(ctx, "A", (left + mid) / 2, slabY + slabH - 10, { color: theme.angle, font: theme.fontStrong, align: "center" });
  label(ctx, "B", (mid + right) / 2, slabY + slabH - 10, { color: theme.curve, font: theme.fontStrong, align: "center" });

  // The temperature across them: straight in each slab, kinked at the joint.
  const yMax = profileTop(hot, cold);
  const yAt = (T: number) => slabY + slabH - (clamp(T, 0, yMax) / yMax) * slabH;
  ctx.save();
  ctx.strokeStyle = theme.secant;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(left, yAt(hot));
  ctx.lineTo(mid, yAt(joint));
  ctx.lineTo(right, yAt(cold));
  ctx.stroke();
  ctx.fillStyle = theme.point;
  ctx.beginPath();
  ctx.arc(mid, yAt(joint), 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const below = slabY + slabH + 18;
  if (words) {
    label(ctx, `joint at ${formatNumber(joint, 1)} °C`, mid, yAt(joint) + (joint > yMax / 2 ? 16 : -14), { color: theme.text, font: theme.font, align: "center", background: theme.background });
    label(
      ctx,
      `R_A = ${formatSignificant(num(r.rodResistance), 3)}, R_B = ${formatSignificant(num(r.secondResistance), 3)} K/W`,
      box.x + box.width / 2,
      below,
      { color: theme.text, font: theme.font, align: "center" },
    );
    label(
      ctx,
      `H = ${minus(formatSignificant(num(r.seriesHeat), 3))} W in series, ${minus(formatSignificant(num(r.parallelHeat), 3))} W side by side`,
      box.x + box.width / 2,
      below + 18,
      { color: theme.angle, font: theme.font, align: "center" },
    );
  }
  caption(ctx, theme, "In series R = R_A + R_B; the same H crosses both", box.x + box.width / 2, box.y + box.height - 6);
}

// ── Convection ─────────────────────────────────────────────────────────────

function drawBreeze(ctx: CanvasRenderingContext2D, layout: HeatflowLayout, r: Record<string, unknown>, theme: LabTheme) {
  const { box } = layout;
  const day = Math.round(num(r.daytime)) === 0;
  const ground = box.y + box.height * 0.68;
  const midX = box.x + box.width / 2;

  label(ctx, day ? "By day: a sea breeze" : "By night: a land breeze", midX, box.y + 8, { color: theme.text, font: theme.fontStrong, align: "center" });
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.globalAlpha = 0.35;
  ctx.fillRect(box.x, ground, box.width / 2, box.y + box.height - 40 - ground);
  ctx.fillStyle = theme.sine;
  ctx.fillRect(midX, ground + 6, box.width / 2, box.y + box.height - 46 - ground);
  ctx.restore();
  // Sun or moon over the land.
  ctx.save();
  ctx.fillStyle = day ? theme.angle : theme.neutral;
  ctx.beginPath();
  ctx.arc(box.x + 26, box.y + 40, 13, 0, Math.PI * 2);
  ctx.fill();
  if (!day) {
    ctx.fillStyle = theme.background;
    ctx.beginPath();
    ctx.arc(box.x + 32, box.y + 36, 11, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const landX = box.x + box.width * 0.25;
  const seaX = box.x + box.width * 0.75;
  const low = ground - 18;
  const high = box.y + 70;
  const loop = { color: theme.tangent, width: 2.5, head: 9 };
  // Warm air rises over whichever side is warmer; the surface wind blows towards it.
  const [warmX, coolX] = day ? [landX, seaX] : [seaX, landX];
  arrow(ctx, coolX, low, warmX, low, loop);
  arrow(ctx, warmX, low - 8, warmX, high + 8, loop);
  arrow(ctx, warmX, high, coolX, high, { ...loop, alpha: 0.6 });
  arrow(ctx, coolX, high + 8, coolX, low - 8, { ...loop, alpha: 0.6 });
  label(ctx, "warm air rises", warmX, high - 14, { color: theme.text, font: theme.font, align: "center" });

  const groundLabel = box.y + box.height - 54;
  label(ctx, day ? "land: warmer" : "land: cooler", landX, groundLabel, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, day ? "sea: cooler" : "sea: warmer", seaX, groundLabel, { color: theme.text, font: theme.font, align: "center" });
  caption(
    ctx,
    theme,
    day ? "Land warms faster than the sea; sea air flows in" : "Land cools faster than the sea; land air flows out",
    midX,
    box.y + box.height - 24,
    theme.text,
  );
  caption(ctx, theme, "Convection: warm fluid rises, cool fluid sinks", midX, box.y + box.height - 6);
}

// ── Radiation ──────────────────────────────────────────────────────────────

function drawSpectrum(ctx: CanvasRenderingContext2D, layout: HeatflowLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean, showBody: boolean) {
  const { box } = layout;
  const T = num(r.bodyTemp, 1000);
  const peak = num(r.peakWavelength);
  const headerH = showBody ? 76 : 24;

  if (showBody) {
    ctx.save();
    ctx.fillStyle = heatflowBodyColor(T, theme);
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(box.x + 30, box.y + 32, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    const glow = GLOW_NAMES[Math.round(num(r.glow))] ?? GLOW_NAMES[0]!;
    label(ctx, `${formatNumber(T, 0)} K: ${glow}`, box.x + 64, box.y + 14, { color: theme.text, font: theme.fontStrong });
    if (words) {
      label(ctx, `σeT⁴ = ${formatSignificant(num(r.radiatedPower), 3)} W/m²`, box.x + 64, box.y + 33, { color: theme.secant, font: theme.font });
      const where = peak >= 1000 ? `${formatNumber(peak / 1000, 2)} µm` : `${formatNumber(peak, 0)} nm`;
      const band = ["infrared", "visible", "ultraviolet"][Math.round(num(r.peakBand))] ?? "infrared";
      label(ctx, `peak λ_max = ${where}, ${band}`, box.x + 64, box.y + 51, { color: theme.curve, font: theme.font });
    }
  }

  const left = layout.compact ? 30 : 40;
  const rect = { x: box.x + left, y: box.y + headerH + 10, width: box.width - left - 8, height: box.height - headerH - 10 - 46 };
  const plane = createPlane(rect, [0, 3000], [0, 1.1]);
  drawPlane(ctx, plane, theme, { xLabel: "λ / nm", showLabels: true });
  label(ctx, "intensity, scaled to its peak", rect.x + 6, rect.y - 4, { color: theme.muted, font: theme.font, baseline: "bottom" });

  // The visible band, under the curve.
  ctx.save();
  for (let nm = HEATFLOW_VISIBLE[0]; nm < HEATFLOW_VISIBLE[1]; nm += 10) {
    const [x0] = plane.toPx(nm, 0);
    const [x1] = plane.toPx(nm + 10, 0);
    ctx.fillStyle = bandColor(nm + 5);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(x0, rect.y + rect.height - 8, x1 - x0 + 0.5, 8);
  }
  ctx.restore();

  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const nm = 10 + (2990 * i) / 240;
    const [px, py] = plane.toPx(nm, heatflowPlanckShape(nm, T));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  if (words && peak <= 3000) {
    const [px, py] = plane.toPx(peak, 1);
    ctx.save();
    ctx.strokeStyle = theme.tangent;
    ctx.setLineDash([3, 3]);
    segment(ctx, px, py, px, rect.y + rect.height);
    ctx.restore();
  }
  caption(
    ctx,
    theme,
    peak > 3000 ? "The peak is off to the right, far in the infrared" : "Hotter: the peak moves to shorter λ (Wien)",
    box.x + box.width / 2,
    box.y + box.height - 6,
  );
}

// ── Cooling ────────────────────────────────────────────────────────────────

function drawCooling(ctx: CanvasRenderingContext2D, layout: HeatflowLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { box } = layout;
  const start = num(r.startTemp, 90);
  const room = num(r.roomTemp, 25);
  const k = num(r.coolingConstant, 0.1);
  const t = num(r.coolTime);
  const T = num(r.coolTemp);

  label(ctx, "A cup cooling in a room", box.x + box.width / 2, box.y + 8, { color: theme.text, font: theme.fontStrong, align: "center" });
  const left = layout.compact ? 36 : 44;
  const rect = { x: box.x + left, y: box.y + 30, width: box.width - left - 10, height: box.height - 30 - 74 };
  const plane = createPlane(rect, [0, 60], [0, 100]);
  drawPlane(ctx, plane, theme, { xLabel: "t / min", yLabel: "T / °C" });

  const [rx0, ry] = plane.toPx(0, room);
  const [rx1] = plane.toPx(60, room);
  ctx.save();
  ctx.strokeStyle = theme.sine;
  ctx.setLineDash([5, 4]);
  segment(ctx, rx0, ry, rx1, ry);
  ctx.restore();
  label(ctx, `room ${formatNumber(room, 0)} °C`, rx1 - 2, ry + 10, { color: theme.sine, font: theme.font, align: "right" });

  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.secant;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const time = (60 * i) / 120;
    const [px, py] = plane.toPx(time, heatflowCooling(start, room, k, time));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  const [px, py] = plane.toPx(t, T);
  ctx.save();
  ctx.fillStyle = theme.point;
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const below = rect.y + rect.height + 28;
  if (words) {
    // The tangent: its slope is the rate of cooling, k(T − Tₛ).
    const rate = num(r.coolingRate);
    const dt = 6;
    const [ax, ay] = plane.toPx(t - dt, T + rate * dt);
    const [bx, by] = plane.toPx(t + dt, T - rate * dt);
    ctx.save();
    ctx.strokeStyle = theme.tangent;
    ctx.lineWidth = 1.5;
    segment(ctx, ax, ay, bx, by);
    ctx.restore();
    label(ctx, `t = ${formatNumber(t, 0)} min: T = ${formatNumber(T, 1)} °C, ${rate < 0 ? "warming" : "cooling"} at ${formatNumber(Math.abs(rate), 2)} °C/min`, box.x + box.width / 2, below, {
      color: theme.text,
      font: theme.font,
      align: "center",
    });
  }
  caption(ctx, theme, "−dT/dt = k(T − Tₛ): fastest while it is hottest", box.x + box.width / 2, box.y + box.height - 6);
}

export const heatflowRenderer: SimulationRenderer<HeatflowLayout> = {
  id: "heatflow",
  layout: (width) => computeHeatflowLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const r = results as Record<string, unknown>;
    ctx.clearRect(0, 0, layout.width, layout.height);

    if (has("thermometers")) drawScales(ctx, layout, r, theme, words);
    if (has("bar") || has("bimetal")) {
      const both = has("bar") && has("bimetal");
      if (has("bar")) drawBar(ctx, both ? layout.top : layout.box, r, theme, words);
      if (has("bimetal")) drawBimetal(ctx, both ? layout.bottom : layout.box, r, theme);
    }
    if (has("water")) drawWater(ctx, layout, r, theme, words);
    if (has("rod")) drawRod(ctx, layout, r, theme, words);
    if (has("slabs")) drawSlabs(ctx, layout, r, theme, words);
    if (has("breeze")) drawBreeze(ctx, layout, r, theme);
    if (has("spectrum")) drawSpectrum(ctx, layout, r, theme, words, has("body"));
    if (has("cooling")) drawCooling(ctx, layout, r, theme, words);
  },
};
