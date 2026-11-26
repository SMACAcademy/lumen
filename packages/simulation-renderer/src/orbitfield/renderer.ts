/**
 * The Earth's field, in five pictures.
 *
 * Distance (gcurve): g against r/R, a straight line up through the Earth and
 * an inverse square outside it, with the small-height formula dashed beside
 * it (approx) and the probe marked on the curve.
 *
 * Latitude (globe): the spinning Earth, a point at latitude λ, and the small
 * pull towards the axis that spin takes out of g.
 *
 * Field: the Earth and the Moon on one line, arrows for the force on each
 * kilogram all around them, and the probe with its net arrow.
 *
 * Weightless (balance): a person on a weighing machine — on the ground, in a
 * lift, or in an orbiting station — with the machine's reading.
 *
 * Orbit energy (orbit, bars): the orbit and the one to move to, beside bars
 * for KE, PE and the total, and the gap that is the cost of climbing.
 *
 * Numbers a level asks for are written only with the labels layer.
 */

import { gAtRadius, OF_FRAME_ORDER, OF_G0, OF_MOON_DISTANCE_KM, OF_MOON_MASS, OF_EARTH_MASS, OF_RADIUS_KM } from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface OrbitFieldLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The graph of g, and the main picture of every other view. */
  plot: Box;
  /** The orbit picture and the energy bars of the energy view. */
  sky: Box;
  bars: Box;
}

export function computeOrbitFieldLayout(width: number): OrbitFieldLayout {
  const compact = width < 560;
  const height = compact ? 400 : 420;
  const left = compact ? 42 : 52;
  const top = 44;
  const plot = { x: left, y: top, width: width - left - 16, height: height - top - 72 };
  const sky = compact
    ? { x: 16, y: 30, width: width - 32, height: 150 }
    : { x: 16, y: 34, width: width / 2 - 24, height: height - 34 - 50 };
  const bars = compact
    ? { x: 16, y: 196, width: width - 32, height: height - 196 - 48 }
    : { x: width / 2 + 8, y: 44, width: width / 2 - 24, height: height - 44 - 60 };
  return { width, height, compact, plot, sky, bars };
}

// ── Number formatting ───────────────────────────────────────────────────────

const SUPER: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
const minus = (s: string) => s.replace("-", "−");
const fixed = (v: number, digits: number) => minus((Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits));

/** Three significant figures, with a power of ten when the number is very large or small. */
export function orbitFieldSci(v: number, figures = 3): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(v)));
  if (exponent >= -2 && exponent <= 3) return minus(v.toPrecision(figures));
  let mantissa = v / 10 ** exponent;
  let e = exponent;
  if (Math.abs(Number(mantissa.toFixed(figures - 1))) >= 10) {
    mantissa /= 10;
    e += 1;
  }
  const power = String(e).split("").map((c) => SUPER[c] ?? c).join("");
  return `${minus(mantissa.toFixed(figures - 1))} × 10${power}`;
}

/** Whole kilometres with thin groups: 345 710. */
const km = (v: number) => Math.round(v).toLocaleString("en-US").replace(/,/g, " ");

// ── Small drawing helpers ───────────────────────────────────────────────────

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 1.5, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 1.5, dash?: number[]) {
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

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

/** Arrow length for a field strength: logarithmic, so 1 m/s² and 10⁻⁴ m/s² both show. */
export function orbitFieldArrowLength(strength: number, longest = 20): number {
  if (!(strength > 0)) return 0;
  return Math.min(longest, Math.max(3, 4 + 4 * Math.log10(strength / 1e-5)));
}

// ── The views ───────────────────────────────────────────────────────────────

function drawDistance(ctx: CanvasRenderingContext2D, layout: OrbitFieldLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { plot, width, height } = layout;
  const plane = createPlane(plot, [0, 4], [0, 11]);
  drawPlane(ctx, plane, theme, { xLabel: "r / R", yLabel: "g / m s⁻²" });

  // The Earth's interior, from the centre to the surface.
  const [ex0, ey0] = plane.toPx(0, 11);
  const [ex1, ey1] = plane.toPx(1, 0);
  rect(ctx, ex0, ey0, ex1 - ex0, ey1 - ey0, theme.neutral, 0.12);
  label(ctx, "Earth", (ex0 + ex1) / 2, ey1 - 12, { color: theme.muted, font: theme.font, align: "center" });

  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const x = (4 * i) / 240;
    const [px, py] = plane.toPx(x, gAtRadius(x * OF_RADIUS_KM));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();

  const inside = num(results.inside) === 1;
  if (has("approx")) {
    // g₀(1 − 2h/R): the tangent to the curve at the surface, reaching zero at h = R/2.
    const [ax, ay] = plane.toPx(1, OF_G0);
    const [bx, by] = plane.toPx(1.5, 0);
    line(ctx, ax, ay, bx, by, theme.secant, 2, [6, 4]);
    label(ctx, "g₀(1 − 2h/R)", bx + 4, by - 14, { color: theme.secant, font: theme.font });
  }

  const x = num(results.rOverR);
  const g = num(results.g);
  const [px, py] = plane.toPx(x, g);
  const [, base] = plane.toPx(x, 0);
  line(ctx, px, base, px, py, theme.angle, 1.5, [3, 3]);
  disc(ctx, px, py, 5, theme.angle);

  if (has("labels")) {
    const where = inside ? `d = ${km(num(results.depth))} km` : `h = ${km(num(results.height))} km`;
    label(ctx, `${where} · g = ${fixed(g, 2)} m/s² (${fixed(num(results.gRatio), 3)} g₀)`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    if (has("approx") && !inside) {
      label(ctx, `small-h formula: ${fixed(num(results.gApprox), 2)} m/s² (${fixed(num(results.approxError), 1)} %)`, width / 2, height - 32, { color: theme.secant, font: theme.font, align: "center" });
    }
  }
}

function drawGlobe(ctx: CanvasRenderingContext2D, layout: OrbitFieldLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { width, height } = layout;
  const cx = width / 2;
  const cy = (height - 30) / 2 + 12;
  const rr = Math.min(width * 0.3, (height - 140) / 2);
  disc(ctx, cx, cy, rr, theme.sine, 0.18);
  ring(ctx, cx, cy, rr, theme.sine, 2);
  // Spin axis and equator.
  line(ctx, cx, cy - rr - 22, cx, cy + rr + 14, theme.muted, 1.5, [5, 4]);
  arrow(ctx, cx - 14, cy - rr - 18, cx + 14, cy - rr - 18, { color: theme.muted, width: 1.5, head: 6 });
  label(ctx, "ω", cx + 20, cy - rr - 18, { color: theme.muted, font: theme.fontStrong });
  line(ctx, cx - rr, cy, cx + rr, cy, theme.muted, 1, [2, 4]);
  label(ctx, "equator", cx - rr + 4, cy + 10, { color: theme.muted, font: theme.font });

  const lat = (num(results.latitude) * Math.PI) / 180;
  const px = cx + rr * Math.cos(lat);
  const py = cy - rr * Math.sin(lat);
  line(ctx, cx, cy, px, py, theme.neutral, 1.5);
  // The circle this point is carried round on: radius R cos λ, about the axis.
  line(ctx, cx, py, px, py, theme.cosine, 1.5, [4, 3]);
  // g points to the centre; spin needs ω²R cos λ towards the axis, which comes out of it.
  const gx = cx - px;
  const gy = cy - py;
  const glen = Math.hypot(gx, gy) || 1;
  arrow(ctx, px, py, px + (gx / glen) * 52, py + (gy / glen) * 52, { color: theme.angle, width: 2.5, head: 8 });
  const pull = 34 * Math.cos(lat);
  if (pull > 2) arrow(ctx, px, py - 6, px - pull, py - 6, { color: theme.cosine, width: 2, head: 6 });
  disc(ctx, px, py, 5, theme.text);
  label(ctx, `λ = ${Math.round(num(results.latitude))}°`, Math.min(px + 10, width - 60), py - 14, { color: theme.text, font: theme.fontStrong });
  label(ctx, "g", px + (gx / glen) * 52 + 6, py + (gy / glen) * 52 + 8, { color: theme.angle, font: theme.fontStrong });

  if (has("labels")) {
    label(ctx, `ω²R cos²λ = ${fixed(num(results.latitudeDrop), 4)} m/s² · g′ = ${fixed(num(results.gLatitude), 3)} m/s²`, width / 2, height - 14, {
      color: theme.text,
      font: theme.font,
      align: "center",
    });
  }
}

function drawField(ctx: CanvasRenderingContext2D, layout: OrbitFieldLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { width, height } = layout;
  const cy = (height - 40) / 2 + 14;
  const left = 30;
  const right = width - 26;
  const kmPerPx = OF_MOON_DISTANCE_KM / (right - left);
  const toX = (xKm: number) => left + xKm / kmPerPx;
  const partner = num(results.partnerMass, 1);
  const earthR = 18;
  const moonR = Math.min(18, 8 * Math.cbrt(partner));

  // Arrows: the force on a kilogram at each point, from both bodies, drawn on a grid.
  const gmE = 1;
  const gmM = (partner * OF_MOON_MASS) / OF_EARTH_MASS;
  const cols = layout.compact ? 9 : 14;
  for (const dy of [-96, -48, 0, 48, 96]) {
    for (let i = 0; i < cols; i++) {
      const sx = left + earthR + 14 + ((right - left - earthR - moonR - 28) * (i + 0.5)) / cols;
      const sy = cy + dy;
      if (dy === 0) continue;
      const xKm = (sx - left) * kmPerPx;
      const yKm = dy * kmPerPx;
      const dE = Math.hypot(xKm, yKm) * 1000;
      const dM = Math.hypot(OF_MOON_DISTANCE_KM - xKm, yKm) * 1000;
      // Accelerations in units of GM_E; scaled to m/s² by g₀R².
      const scale = OF_G0 * (OF_RADIUS_KM * 1000) ** 2;
      const fx = scale * ((-gmE * xKm * 1000) / dE ** 3 + (gmM * (OF_MOON_DISTANCE_KM - xKm) * 1000) / dM ** 3);
      const fy = scale * ((-gmE * yKm * 1000) / dE ** 3 + (-gmM * yKm * 1000) / dM ** 3);
      const mag = Math.hypot(fx, fy);
      const len = orbitFieldArrowLength(mag, 18);
      if (len <= 0) continue;
      // Canvas y runs down, the same way as dy.
      arrow(ctx, sx - (fx / mag) * len * 0.5, sy - (fy / mag) * len * 0.5, sx + (fx / mag) * len * 0.5, sy + (fy / mag) * len * 0.5, {
        color: theme.reference,
        width: 1.5,
        head: 5,
      });
    }
  }

  line(ctx, left, cy, right, cy, theme.axis, 1);
  disc(ctx, toX(0), cy, earthR, theme.sine);
  disc(ctx, toX(OF_MOON_DISTANCE_KM), cy, moonR, theme.neutral);
  label(ctx, "Earth", toX(0), cy + earthR + 12, { color: theme.sine, font: theme.font, align: "left" });
  const moonName = Math.abs(partner - 1) < 1e-9 ? "Moon" : `Moon × ${fixed(partner, 1)}`;
  label(ctx, moonName, toX(OF_MOON_DISTANCE_KM) + 6, cy + moonR + 12, { color: theme.neutral, font: theme.font, align: "right" });

  if (has("labels")) {
    const nx = toX(num(results.nullPoint));
    line(ctx, nx, cy - 30, nx, cy + 30, theme.angle, 1.5, [3, 3]);
    label(ctx, "null point", nx, cy - 38, { color: theme.angle, font: theme.font, align: nx > width - 40 ? "right" : "center" });
  }

  // The probe and its net arrow along the line.
  const x = num(results.fieldX);
  const px = toX(x);
  const net = num(results.netField);
  const len = orbitFieldArrowLength(Math.abs(net), 34);
  if (len > 0 && num(results.atNull) !== 1) arrow(ctx, px, cy, px - Math.sign(net) * (len + 6), cy, { color: theme.tangent, width: 3, head: 9 });
  disc(ctx, px, cy, 5, theme.tangent);
  label(ctx, "1 kg", px, cy + 16, { color: theme.tangent, font: theme.font, align: "center" });

  if (has("labels")) {
    const towards = num(results.towards);
    const where = towards === 0 ? "no net pull: the null point" : `${orbitFieldSci(Math.abs(net))} N/kg to ${towards > 0 ? "Earth" : "Moon"}`;
    label(ctx, `x = ${km(x)} km · ${where}`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawPerson(ctx: CanvasRenderingContext2D, x: number, feet: number, theme: LabTheme) {
  // A simple figure 46 px tall standing at (x, feet).
  disc(ctx, x, feet - 40, 6, theme.point);
  line(ctx, x, feet - 34, x, feet - 16, theme.point, 3);
  line(ctx, x - 10, feet - 28, x + 10, feet - 28, theme.point, 3);
  line(ctx, x, feet - 16, x - 6, feet, theme.point, 3);
  line(ctx, x, feet - 16, x + 6, feet, theme.point, 3);
}

function drawBalance(ctx: CanvasRenderingContext2D, layout: OrbitFieldLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { width, height } = layout;
  const frame = OF_FRAME_ORDER[Math.round(num(results.frame))] ?? "ground";
  const floating = num(results.floating) === 1;
  const phase = num(results.phase);
  const cx = width / 2;
  const cabinW = Math.min(150, width * 0.42);
  const cabinH = 150;
  const top = 64;
  const floor = top + cabinH;

  if (frame === "station") {
    // The Earth's limb below and the orbit the station follows, kept inside the canvas.
    const limb = 2 * width;
    const centreY = floor + 40 + limb;
    const spread = (radius: number) => Math.asin(Math.min(1, (width / 2 - 4) / radius));
    ctx.save();
    ctx.fillStyle = theme.sine;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(cx, centreY, limb, Math.PI * 1.5 - spread(limb), Math.PI * 1.5 + spread(limb));
    ctx.lineTo(cx, centreY);
    ctx.fill();
    ctx.restore();
    const orbit = limb + 40 + cabinH / 2;
    ctx.save();
    ctx.strokeStyle = theme.reference;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, centreY, orbit, Math.PI * 1.5 - spread(orbit), Math.PI * 1.5 + spread(orbit));
    ctx.stroke();
    ctx.restore();
  }

  // The cabin: a lift on its cable, a station, or just the floor.
  if (frame !== "ground") {
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - cabinW / 2, top, cabinW, cabinH);
    ctx.restore();
    if (frame === "lift") line(ctx, cx, 30, cx, top, theme.axis, 1.5);
  }
  line(ctx, cx - cabinW / 2 - (frame === "ground" ? 30 : 0), floor, cx + cabinW / 2 + (frame === "ground" ? 30 : 0), floor, theme.neutral, 3);

  // The weighing machine and the person: lifted clear of it when nothing presses down.
  const scaleW = 44;
  rect(ctx, cx - scaleW / 2, floor - 8, scaleW, 8, theme.neutral, 0.8);
  const lift = floating ? 14 + 4 * Math.sin(phase * Math.PI * 2) : 0;
  drawPerson(ctx, cx, floor - 8 - lift, theme);

  // Arrows beside the cabin: gravity on the person, and the floor's acceleration.
  const g = num(results.localG);
  const ax = cx + cabinW / 2 + 22;
  arrow(ctx, ax, top + 40, ax, top + 40 + 6 * g, { color: theme.angle, width: 2.5, head: 8 });
  label(ctx, "mg", ax + 8, top + 30, { color: theme.angle, font: theme.fontStrong });
  const a = num(results.frameAccel);
  if (Math.abs(a) > 0.05) {
    const bx = cx - cabinW / 2 - 22;
    arrow(ctx, bx, top + 75, bx, top + 75 + 6 * a, { color: theme.tangent, width: 2.5, head: 8 });
    label(ctx, "a", bx - 8, top + 64, { color: theme.tangent, font: theme.fontStrong, align: "right" });
  }

  const title =
    frame === "ground" ? "On the ground" : frame === "lift" ? "In a lift" : `In a station ${km(num(results.orbitHeight))} km up`;
  label(ctx, title, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  if (has("labels")) {
    const reading = num(results.reading);
    label(ctx, `scale reads ${fixed(reading, 0)} N (${fixed(num(results.readingKg), 1)} kg)`, width / 2, height - 32, {
      color: floating ? theme.tangent : theme.text,
      font: theme.fontStrong,
      align: "center",
    });
    label(ctx, `gravity here ${fixed(g, 2)} m/s² · floor falls at ${fixed(a, 2)} m/s²`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawEnergy(ctx: CanvasRenderingContext2D, layout: OrbitFieldLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean) {
  const { sky, bars, width, height } = layout;
  const r1 = num(results.orbitRadius, OF_RADIUS_KM);
  const r2 = num(results.targetHeight) + OF_RADIUS_KM;
  const cx = sky.x + sky.width / 2;
  const cy = sky.y + sky.height / 2;
  const k = (Math.min(sky.width, sky.height) / 2 - 8) / Math.max(r1, r2);

  if (has("orbit")) {
    disc(ctx, cx, cy, OF_RADIUS_KM * k, theme.sine, 0.85);
    ring(ctx, cx, cy, r2 * k, theme.reference, 1.5, [5, 4]);
    ring(ctx, cx, cy, r1 * k, theme.curve, 2);
    const angle = num(results.phase) * Math.PI * 2;
    disc(ctx, cx + r1 * k * Math.cos(angle), cy - r1 * k * Math.sin(angle), 5, theme.point);
  }

  if (has("bars")) {
    const ke = num(results.kinetic);
    const pe = num(results.potential);
    const e = num(results.total);
    const e2 = num(results.targetTotal);
    const deepest = Math.max(Math.abs(pe), 2 * Math.abs(e2), 1);
    const zero = bars.y + bars.height / 3;
    const s = ((2 * bars.height) / 3 - 4) / deepest;
    const slot = bars.width / 4;
    const items: [string, number, string][] = [
      ["KE", ke, theme.tangent],
      ["PE", pe, theme.cosine],
      ["E", e, theme.angle],
      ["E′", e2, theme.reference],
    ];
    line(ctx, bars.x, zero, bars.x + bars.width, zero, theme.axis, 1.25);
    label(ctx, "0", bars.x - 4, zero, { color: theme.muted, font: theme.font, align: "right" });
    items.forEach(([name, value, colour], i) => {
      const bx = bars.x + slot * i + slot * 0.2;
      const bw = slot * 0.6;
      const h = value * s;
      rect(ctx, bx, value >= 0 ? zero - h : zero, bw, Math.abs(h), colour, i === 3 ? 0.45 : 0.85);
      label(ctx, name, bx + bw / 2, value >= 0 ? zero + 10 : zero - 10, { color: colour, font: theme.fontStrong, align: "center" });
    });
    // The climb from E to E′, beside the two bars.
    const gapX = bars.x + slot * 3 + 4;
    if (Math.abs(e2 - e) * s > 6) arrow(ctx, gapX, zero - e * s, gapX, zero - e2 * s, { color: theme.secant, width: 2, head: 7 });
  }

  if (has("labels")) {
    label(ctx, `v = ${fixed(num(results.orbitalSpeed), 2)} km/s · T = ${fixed(num(results.period), 1)} min`, width / 2, height - 32, {
      color: theme.text,
      font: theme.font,
      align: "center",
    });
    label(ctx, `ΔE = ${orbitFieldSci(num(results.transferEnergy))} J · binding ${orbitFieldSci(num(results.binding))} J`, width / 2, height - 14, {
      color: theme.text,
      font: theme.font,
      align: "center",
    });
  }
}

export const orbitFieldRenderer: SimulationRenderer<OrbitFieldLayout> = {
  id: "orbitfield",
  layout: (width) => computeOrbitFieldLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);
    const title = (words: string) => label(ctx, words, layout.width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

    if (has("gcurve")) {
      title("g against distance from the Earth's centre");
      drawDistance(ctx, layout, results, theme, has);
    } else if (has("globe")) {
      title("The spinning Earth takes a little off g");
      drawGlobe(ctx, layout, results, theme, has);
    } else if (has("field")) {
      title("The field between the Earth and the Moon");
      drawField(ctx, layout, results, theme, has);
    } else if (has("balance")) {
      drawBalance(ctx, layout, results, theme, has);
    } else if (has("orbit") || has("bars")) {
      title(`An orbit ${km(num(results.orbitHeight))} km up, and one ${km(num(results.targetHeight))} km up`);
      drawEnergy(ctx, layout, results, theme, has);
    }
  },
};
