/**
 * Ray optics, in five pictures.
 *
 * Bench: a mirror, a lens or one glass surface on an optical axis, the object
 * as an arrow on the left (drag it to change u), its image, and the three
 * principal rays traced through the element. A virtual image is dashed, and
 * so are the backward extensions of the rays that seem to come from it.
 * Heights are stretched against distances so a 2 cm object can be seen; the
 * rays stay straight and still meet where the formula puts the image.
 *
 * Interface: a ray meets a flat boundary — reflected and refracted, or
 * totally reflected beyond the critical angle.
 *
 * Prism: a ray through a prism, the spread of white light, and the graph of
 * deviation against the angle of incidence with its minimum.
 *
 * Sky: sunlight crossing the air to an observer, with the scattering of each
 * colour as 1/λ⁴.
 *
 * Instrument: a magnifying glass, a microscope, a telescope, or an eye with
 * its spectacle lens — schematic, not to scale.
 */

import {
  RAY_ELEMENT_ORDER,
  RAY_ELEMENTS,
  RAY_INSTRUMENT_ORDER,
  RAY_INSTRUMENTS,
  RAY_MEDIUM_ORDER,
  RAY_MEDIA,
  RAY_NEAR_POINT,
  RAY_OBJECT_HEIGHT,
  RAY_PRISM_I_RANGE,
  RAY_U_RANGE,
  rayBend,
  rayCrownIndex,
  rayPrism,
  rayRayleigh,
  raySunlight,
} from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };
export type RayOpticsView = "bench" | "interface" | "prism" | "sky" | "instrument";

export interface RayOpticsLayout {
  width: number;
  height: number;
  compact: boolean;
  view: RayOpticsView;
  /** The ray diagram, or the interface, prism, sky or instrument picture. */
  scene: Box;
  /** The deviation graph under the prism, or the scattering bars under the sky. */
  graph: Box;
}

/** The bench shows this window of the axis, cm either side of the element. */
export const RAY_BENCH_SPAN = 100;
/** The object arrow is this fraction of the bench's height. */
const OBJECT_FRACTION = 0.16;

const VIEWS: readonly RayOpticsView[] = ["bench", "interface", "prism", "sky", "instrument"];

export function computeRayOpticsLayout(width: number, layers?: ReadonlySet<string>): RayOpticsLayout {
  const compact = width < 560;
  const height = compact ? 380 : 400;
  const view = (layers && VIEWS.find((v) => layers.has(v))) || "bench";
  const split = view === "prism" || view === "sky";
  const sceneHeight = split ? (view === "prism" ? 152 : 168) : height - 30 - 42;
  const graphTop = 30 + sceneHeight + 26;
  return {
    width,
    height,
    compact,
    view,
    scene: { x: 8, y: 30, width: width - 16, height: sceneHeight },
    graph: { x: view === "sky" ? 24 : 40, y: graphTop, width: width - (view === "sky" ? 24 : 40) - 14, height: height - graphTop - 56 },
  };
}

const minus = (text: string) => text.replace(/-/g, "−");
const fixed = (v: number, digits = 1) => minus((Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits));
const signed = (v: number, digits = 1) => (v > 0.5 * 10 ** -digits ? "+" : "") + fixed(v, digits);

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

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function clipTo(ctx: CanvasRenderingContext2D, box: Box) {
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
}

/** An approximate colour for light of wavelength λ (nm), for drawing spectra. */
export function rayWavelengthColour(wavelength: number): string {
  const w = clamp(wavelength, 380, 750);
  let r = 0;
  let g = 0;
  let b = 0;
  if (w < 440) [r, g, b] = [(440 - w) / 60, 0, 1];
  else if (w < 490) [r, g, b] = [0, (w - 440) / 50, 1];
  else if (w < 510) [r, g, b] = [0, 1, (510 - w) / 20];
  else if (w < 580) [r, g, b] = [(w - 510) / 70, 1, 0];
  else if (w < 645) [r, g, b] = [1, (645 - w) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  const to = (c: number) => Math.round(255 * clamp(c, 0, 1));
  return `rgb(${to(r)},${to(g)},${to(b)})`;
}

const rgb = (channels: readonly [number, number, number]) => {
  const top = Math.max(...channels, 1e-9);
  const [r, g, b] = channels.map((c) => Math.round((255 * c) / top));
  return `rgb(${r},${g},${b})`;
};

// ── Bench ────────────────────────────────────────────────────────────────────

interface Bench {
  toPx(x: number, y: number): [number, number];
  x0: number;
  cy: number;
  /** Pixels per cm along the axis and per cm of height. */
  sx: number;
  sy: number;
}

function benchOf(box: Box): Bench {
  const sx = box.width / (2 * RAY_BENCH_SPAN);
  const sy = (box.height * OBJECT_FRACTION) / RAY_OBJECT_HEIGHT;
  const x0 = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return { sx, sy, x0, cy, toPx: (x, y) => [x0 + x * sx, cy - y * sy] };
}

/** Where the drawn rays start: the slopes of the principal rays from the tip of the object. */
function principalRays(kind: "mirror" | "lens" | "surface", plane: boolean, afocal: boolean, u: number, h: number, f: number, R: number, n: number) {
  const through = (x: number) => (Math.abs(x - u) > 0.5 ? -h / (x - u) : null);
  const rays: { k: number; name: string }[] = [{ k: 0, name: "parallel" }];
  if (kind === "mirror") {
    if (plane) {
      rays.push({ k: h / u, name: "pole" }, { k: (2 * h) / u, name: "oblique" });
    } else {
      const viaF = through(f);
      const viaC = through(2 * f);
      if (viaF !== null) rays.push({ k: viaF, name: "focus" });
      if (viaC !== null) rays.push({ k: viaC, name: "centre" });
      else rays.push({ k: h / u, name: "pole" });
    }
  } else if (kind === "lens") {
    if (!afocal) {
      const viaF = through(-f);
      if (viaF !== null) rays.push({ k: viaF, name: "focus" });
    }
    rays.push({ k: h / u, name: "centre" });
  } else {
    const viaF = through(-R / (n - 1));
    if (viaF !== null) rays.push({ k: viaF, name: "focus" });
    rays.push({ k: -h / (R - u), name: "centre" });
  }
  return rays;
}

function drawElement(ctx: CanvasRenderingContext2D, bench: Bench, box: Box, element: string, partner: number, theme: LabTheme) {
  const { x0, cy } = bench;
  const half = box.height * 0.4;
  const top = cy - half;
  const bottom = cy + half;
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.fillStyle = theme.sine;
  ctx.lineWidth = 2.5;
  const kind = RAY_ELEMENTS[element as keyof typeof RAY_ELEMENTS]?.kind ?? "mirror";
  if (kind === "mirror") {
    const sag = element === "concave-mirror" ? -7 : element === "convex-mirror" ? 7 : 0;
    ctx.beginPath();
    ctx.moveTo(x0 + sag, top);
    ctx.quadraticCurveTo(x0 - sag, cy, x0 + sag, bottom);
    ctx.stroke();
    // Hatching on the back.
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    for (let y = top + 6; y < bottom; y += 10) {
      const t = (y - top) / (bottom - top);
      const xs = x0 + sag * (1 - 4 * t * (1 - t));
      ctx.beginPath();
      ctx.moveTo(xs + 1, y);
      ctx.lineTo(xs + 7, y - 5);
      ctx.stroke();
    }
  } else if (kind === "lens") {
    const lensShape = (x: number, convex: boolean) => {
      const w = 6;
      ctx.beginPath();
      if (convex) {
        ctx.moveTo(x, top);
        ctx.quadraticCurveTo(x - 3 * w, cy, x, bottom);
        ctx.quadraticCurveTo(x + 3 * w, cy, x, top);
      } else {
        ctx.moveTo(x - w, top);
        ctx.lineTo(x + w, top);
        ctx.quadraticCurveTo(x, cy, x + w, bottom);
        ctx.lineTo(x - w, bottom);
        ctx.quadraticCurveTo(x, cy, x - w, top);
      }
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    lensShape(x0, element === "convex-lens");
    if (Math.abs(partner) > 1e-9) lensShape(x0 + 13, partner > 0);
  } else {
    // A glass block whose left face is convex, bulging towards the object.
    const right = box.x + box.width;
    ctx.beginPath();
    ctx.moveTo(x0 + 10, top);
    ctx.quadraticCurveTo(x0 - 10, cy, x0 + 10, bottom);
    ctx.lineTo(right, bottom);
    ctx.lineTo(right, top);
    ctx.closePath();
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + 10, top);
    ctx.quadraticCurveTo(x0 - 10, cy, x0 + 10, bottom);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBench(ctx: CanvasRenderingContext2D, layout: RayOpticsLayout, results: Results, theme: LabTheme, has: (layer: string) => boolean) {
  const { scene: box, width, height } = layout;
  const bench = benchOf(box);
  const element = RAY_ELEMENT_ORDER[Math.round(num(results.element))] ?? "concave-mirror";
  const kind = RAY_ELEMENTS[element].kind;
  const u = num(results.u, -30);
  const v = num(results.v);
  const f = num(results.f);
  const R = num(results.radius);
  const n = num(results.index, 1.5);
  const m = num(results.m);
  const h = num(results.objectHeight, RAY_OBJECT_HEIGHT);
  const real = num(results.real) === 1;
  const infinite = num(results.atInfinity) === 1;
  const afocal = num(results.afocal) === 1;
  const plane = element === "plane-mirror";
  const words = has("labels");

  label(ctx, words && !plane ? `${RAY_ELEMENTS[element].label} · f = ${signed(f)} cm` : RAY_ELEMENTS[element].label, width / 2, 14, {
    color: theme.text,
    font: theme.fontStrong,
    align: "center",
  });

  // The axis.
  line(ctx, box.x, bench.cy, box.x + box.width, bench.cy, theme.axis, 1.25);
  drawElement(ctx, bench, box, element, num(results.power2), theme);
  if (kind === "surface") {
    label(ctx, "air", box.x + 6, box.y + 10, { color: theme.muted, font: theme.font });
    label(ctx, `glass, n = ${fixed(n, 2)}`, box.x + box.width - 6, box.y + 10, { color: theme.muted, font: theme.font, align: "right" });
  }

  // Focal points and centres of curvature.
  const marks: { x: number; name: string; above: boolean }[] = [];
  if (kind === "mirror" && !plane) marks.push({ x: f, name: "F", above: false }, { x: 2 * f, name: "C", above: true });
  if (kind === "lens" && !afocal) marks.push({ x: -f, name: "F", above: false }, { x: f, name: "F", above: false }, { x: -2 * f, name: "2F", above: true }, { x: 2 * f, name: "2F", above: true });
  if (kind === "surface") marks.push({ x: -R / (n - 1), name: "F₁", above: false }, { x: (n * R) / (n - 1), name: "F₂", above: false }, { x: R, name: "C", above: true });
  for (const mark of marks) {
    if (Math.abs(mark.x) > RAY_BENCH_SPAN - 2) continue;
    const [px, py] = bench.toPx(mark.x, 0);
    disc(ctx, px, py, 3, theme.text);
    label(ctx, mark.name, px, mark.above ? py - 10 : py + 11, { color: theme.muted, font: theme.font, align: "center" });
  }

  // The principal rays.
  if (has("rays")) {
    const colours: Record<string, string> = { parallel: theme.sine, focus: theme.angle, centre: theme.secant, pole: theme.secant, oblique: theme.secant };
    const bender = { kind, f: afocal || plane ? Infinity : f, n, R };
    const out = kind === "mirror" ? -1 : 1;
    ctx.save();
    clipTo(ctx, box);
    for (const ray of principalRays(kind, plane, afocal, u, h, f, R, n)) {
      const colour = colours[ray.name] ?? theme.sine;
      const y = h - ray.k * u;
      const k2 = rayBend(bender, y, ray.k);
      const [ax, ay] = bench.toPx(u, h);
      const [bx, by] = bench.toPx(0, y);
      const [cx, cy] = bench.toPx(out * RAY_BENCH_SPAN, y + k2 * out * RAY_BENCH_SPAN);
      line(ctx, ax, ay, bx, by, colour, 1.75);
      line(ctx, bx, by, cx, cy, colour, 1.75);
      // A virtual image: the rays only seem to come from it.
      if (!real && !infinite) {
        const [ix, iy] = bench.toPx(v, m * h);
        line(ctx, bx, by, ix, iy, colour, 1.25, [4, 4], 0.75);
      }
    }
    ctx.restore();
  }

  // Object and image.
  const [ox, oy] = bench.toPx(u, 0);
  arrow(ctx, ox, oy, ox, oy - h * bench.sy, { color: theme.tangent, width: 3, head: 9 });
  label(ctx, "O", ox, oy + 11, { color: theme.tangent, font: theme.fontStrong, align: "center" });
  if (!infinite) {
    const [ix, iy] = bench.toPx(v, 0);
    if (ix > box.x && ix < box.x + box.width) {
      ctx.save();
      clipTo(ctx, box);
      arrow(ctx, ix, iy, ix, iy - m * h * bench.sy, { color: theme.cosine, width: 3, head: 9, dash: real ? undefined : [5, 4] });
      ctx.restore();
      label(ctx, "I", ix, m > 0 ? iy + 11 : iy - 11, { color: theme.cosine, font: theme.fontStrong, align: "center" });
    }
  }

  if (words) {
    const nature = infinite ? "image at infinity · real · inverted · magnified" : [real ? "real" : "virtual", m > 0 ? "erect" : "inverted", num(results.size) === 2 ? "magnified" : num(results.size) === 1 ? "same size" : "diminished"].join(" · ");
    const first = infinite ? `u = ${fixed(u, 0)} cm: the object is at the focus` : `u = ${fixed(u, 0)} cm → v = ${signed(v)} cm · m = ${signed(m, 2)}`;
    label(ctx, first, width / 2, height - 28, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, nature, width / 2, height - 11, { color: theme.cosine, font: theme.font, align: "center" });
  }
}

// ── Interface ────────────────────────────────────────────────────────────────

function interfaceGeometry(box: Box) {
  const ox = box.x + box.width / 2;
  const oy = box.y + box.height / 2;
  const reach = Math.min(box.width / 2 - 14, box.height / 2 - 10);
  return { ox, oy, reach };
}

function drawInterface(ctx: CanvasRenderingContext2D, layout: RayOpticsLayout, results: Results, theme: LabTheme, has: (layer: string) => boolean) {
  const { scene: box, width, height } = layout;
  const { ox, oy, reach } = interfaceGeometry(box);
  const medium = RAY_MEDIUM_ORDER.find((m) => Math.abs(RAY_MEDIA[m].index - num(results.mediumIndex)) < 1e-9) ?? "glass";
  const into = num(results.n1) === 1;
  const i = num(results.incidence) * (Math.PI / 180);
  const r = num(results.refraction) * (Math.PI / 180);
  const tir = num(results.tir) === 1;
  const n = RAY_MEDIA[medium].index;
  label(ctx, into ? `Light going from air into ${medium}` : `Light going from ${medium} out into air`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The two media: the denser one shaded.
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.14;
  if (into) ctx.fillRect(box.x, oy, box.width, box.y + box.height - oy);
  else ctx.fillRect(box.x, box.y, box.width, oy - box.y);
  ctx.restore();
  line(ctx, box.x, oy, box.x + box.width, oy, theme.neutral, 2);
  line(ctx, ox, box.y + 4, ox, box.y + box.height - 4, theme.axis, 1.25, [5, 5]);
  const upper = into ? "air, n = 1" : `${medium}, n = ${fixed(n, 2)}`;
  const lower = into ? `${medium}, n = ${fixed(n, 2)}` : "air, n = 1";
  label(ctx, upper, box.x + 6, box.y + 10, { color: theme.muted, font: theme.font });
  label(ctx, lower, box.x + 6, box.y + box.height - 10, { color: theme.muted, font: theme.font });

  if (has("rays")) {
    const [sx, sy] = [ox - reach * Math.sin(i), oy - reach * Math.cos(i)];
    arrow(ctx, sx, sy, ox - (reach / 2) * Math.sin(i), oy - (reach / 2) * Math.cos(i), { color: theme.angle, width: 2.5, head: 9 });
    line(ctx, sx, sy, ox, oy, theme.angle, 2.5);
    // Some light is always reflected; all of it beyond the critical angle.
    arrow(ctx, ox, oy, ox + reach * Math.sin(i), oy - reach * Math.cos(i), { color: theme.secant, width: tir ? 2.5 : 1.5, head: 8, alpha: tir ? 1 : 0.4 });
    if (!tir) arrow(ctx, ox, oy, ox + reach * Math.sin(r), oy + reach * Math.cos(r), { color: theme.tangent, width: 2.5, head: 9 });
    label(ctx, "i", ox - 34 * Math.sin(i / 2), oy - 34 * Math.cos(i / 2), { color: theme.angle, font: theme.fontStrong, align: "center" });
    if (!tir) label(ctx, "r", ox + 34 * Math.sin(r / 2), oy + 34 * Math.cos(r / 2), { color: theme.tangent, font: theme.fontStrong, align: "center" });
  }

  if (has("labels")) {
    const C = num(results.critical);
    if (!into) {
      // The critical angle, for reference.
      const c = C * (Math.PI / 180);
      line(ctx, ox, oy, ox - reach * Math.sin(c), oy - reach * Math.cos(c), theme.muted, 1, [2, 4]);
      label(ctx, "C", ox - (reach + 8) * Math.sin(c), oy - (reach + 8) * Math.cos(c), { color: theme.muted, font: theme.font, align: "center" });
    }
    const first = tir
      ? `i = ${fixed(num(results.incidence), 0)}° is beyond C = ${fixed(C)}°`
      : `i = ${fixed(num(results.incidence), 0)}° → r = ${fixed(num(results.refraction))}°`;
    const second = tir ? "total internal reflection: no light escapes" : into ? "bent towards the normal" : `bent away from the normal · C = ${fixed(C)}°`;
    label(ctx, first, width / 2, height - 28, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, second, width / 2, height - 11, { color: tir ? theme.secant : theme.tangent, font: theme.font, align: "center" });
  }
}

// ── Prism ────────────────────────────────────────────────────────────────────

/** Draws one ray through the prism; returns nothing. Angles in degrees, positions in px (screen y down). */
function prismRay(ctx: CanvasRenderingContext2D, box: Box, apex: [number, number], side: number, A: number, n: number, i: number, colour: string, width: number, incoming: boolean) {
  const rad = Math.PI / 180;
  const half = (A / 2) * rad;
  // Maths directions (y up) turned into screen directions.
  const dir = (deg: number): [number, number] => [Math.cos(deg * rad), -Math.sin(deg * rad)];
  const dL: [number, number] = [-Math.sin(half), Math.cos(half)];
  const dR: [number, number] = [Math.sin(half), Math.cos(half)];
  const P: [number, number] = [apex[0] + 0.5 * side * dL[0], apex[1] + 0.5 * side * dL[1]];
  const path = rayPrism(A, n, i);
  const dIn = dir(-A / 2 + i);
  const dInside = dir(-A / 2 + path.r1);
  ctx.save();
  clipTo(ctx, box);
  if (incoming) line(ctx, P[0] - dIn[0] * box.width, P[1] - dIn[1] * box.width, P[0], P[1], colour, width);
  // Where the inside ray meets the right face: P + a·dInside = apex + t·dR.
  const det = dInside[0] * -dR[1] + dR[0] * dInside[1];
  const qx = apex[0] - P[0];
  const qy = apex[1] - P[1];
  const a = (qx * -dR[1] + dR[0] * qy) / det;
  const t = (dInside[0] * qy - dInside[1] * qx) / det;
  if (t > side || a <= 0) {
    // It runs into the base instead.
    const baseY = apex[1] + side * Math.cos(half);
    const s = dInside[1] > 0 ? (baseY - P[1]) / dInside[1] : box.width;
    line(ctx, P[0], P[1], P[0] + dInside[0] * s, P[1] + dInside[1] * s, colour, width);
  } else {
    const Q: [number, number] = [P[0] + a * dInside[0], P[1] + a * dInside[1]];
    line(ctx, P[0], P[1], Q[0], Q[1], colour, width);
    if (path.emerges) {
      const dOut = dir(A / 2 - path.e);
      line(ctx, Q[0], Q[1], Q[0] + dOut[0] * box.width, Q[1] + dOut[1] * box.width, colour, width);
    }
  }
  ctx.restore();
}

function prismGeometry(box: Box, A: number) {
  const half = (A / 2) * (Math.PI / 180);
  const side = Math.min((box.height - 22) / Math.cos(half), (box.width * 0.4) / (2 * Math.sin(half)));
  const apex: [number, number] = [box.x + box.width * 0.42, box.y + 14];
  return { half, side, apex };
}

const SPECTRUM = [690, 640, 590, 550, 510, 470, 430] as const;

function drawPrism(ctx: CanvasRenderingContext2D, layout: RayOpticsLayout, results: Results, theme: LabTheme, has: (layer: string) => boolean) {
  const { scene: box, graph, width, height } = layout;
  const A = num(results.prismAngle, 60);
  const i = num(results.prismIncidence, 40);
  const nYellow = num(results.index, 1.5);
  const nHere = num(results.prismIndex, 1.5);
  const wavelength = num(results.wavelength, 590);
  const emerges = num(results.emerges) === 1;
  const blocked = num(results.prismBlocked) === 1;
  const words = has("labels");
  const showGraph = has("deviation");
  label(ctx, `A ${fixed(A, 0)}° prism, n = ${fixed(nYellow, 2)} for yellow light`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  const { half, side, apex } = prismGeometry(box, A);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(apex[0], apex[1]);
  ctx.lineTo(apex[0] - side * Math.sin(half), apex[1] + side * Math.cos(half));
  ctx.lineTo(apex[0] + side * Math.sin(half), apex[1] + side * Math.cos(half));
  ctx.closePath();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.16;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
  label(ctx, "A", apex[0], apex[1] + 16, { color: theme.muted, font: theme.font, align: "center" });

  if (has("spectrum")) {
    prismRay(ctx, box, apex, side, A, nYellow, i, theme.point, 2.5, true);
    for (const w of SPECTRUM) prismRay(ctx, box, apex, side, A, rayCrownIndex(nYellow, w), i, rayWavelengthColour(w), 1.5, false);
    label(ctx, "white light", box.x + 4, box.y + box.height - 8, { color: theme.muted, font: theme.font });
  } else {
    prismRay(ctx, box, apex, side, A, nHere, i, rayWavelengthColour(wavelength), 2.5, true);
  }
  if (!emerges) label(ctx, blocked ? "no ray gets through: A is more than 2C" : "trapped at the second face", box.x + box.width - 4, box.y + box.height - 8, { color: theme.secant, font: theme.font, align: "right" });

  if (showGraph) {
    const curve: [number, number][] = [];
    for (let x = RAY_PRISM_I_RANGE[0]; x <= RAY_PRISM_I_RANGE[1]; x += 0.5) {
      const p = rayPrism(A, nHere, x);
      if (p.emerges) curve.push([x, p.deviation]);
    }
    const top = Math.max(40, Math.ceil((Math.max(0, ...curve.map((c) => c[1])) + 5) / 10) * 10);
    const plane = createPlane(graph, [0, 90], [0, top]);
    drawPlane(ctx, plane, theme);
    label(ctx, "deviation δ (°) against incidence i (°)", graph.x, graph.y - 10, { color: theme.muted, font: theme.font });
    if (curve.length > 1) {
      ctx.save();
      clipToPlane(ctx, plane);
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      curve.forEach(([x, y], k) => {
        const [px, py] = plane.toPx(x, y);
        if (k === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    }
    if (emerges) {
      const [px, py] = plane.toPx(i, num(results.deviation));
      disc(ctx, px, py, 5, theme.angle);
    }
    if (words && !blocked) {
      const [, my] = plane.toPx(0, num(results.minDeviation));
      line(ctx, graph.x, my, graph.x + graph.width, my, theme.tangent, 1.25, [4, 4]);
    }
  }

  if (words) {
    const first = emerges ? `i = ${fixed(i)}° → e = ${fixed(num(results.emergence))}° · δ = ${fixed(num(results.deviation))}°` : `i = ${fixed(i)}°: no ray comes out`;
    // Minimum deviation is class 12 work: name it only alongside the δ–i graph.
    const second = blocked || !showGraph ? `n = ${fixed(nHere, 3)} at ${fixed(wavelength, 0)} nm` : `D_m = ${fixed(num(results.minDeviation))}° at i = ${fixed(num(results.minIncidence))}° · n = ${fixed(nHere, 3)}`;
    label(ctx, first, width / 2, height - 28, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, second, width / 2, height - 11, { color: theme.tangent, font: theme.font, align: "center" });
  }
}

// ── Sky ──────────────────────────────────────────────────────────────────────

const BARS = [400, 450, 500, 550, 600, 650, 700] as const;

function drawSky(ctx: CanvasRenderingContext2D, layout: RayOpticsLayout, results: Results, theme: LabTheme, has: (layer: string) => boolean) {
  const { scene: box, graph, width, height } = layout;
  const altitude = num(results.sunAltitude, 60);
  const wavelength = num(results.wavelength, 590);
  label(ctx, `The sun ${fixed(altitude, 0)}° above the horizon`, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

  // Light scattered towards us is blue-rich, but it too is thinned by the air on the way.
  const T = [650, 550, 450].map((w) => raySunlight(w, altitude));
  const weight = [650, 550, 450].map((w) => (550 / w) ** 4);
  const sky = rgb([weight[0]! * T[0]! ** 2, weight[1]! * T[1]! ** 2, weight[2]! * T[2]! ** 2]);
  const sun = rgb([T[0]!, T[1]!, T[2]!]);
  const ground = box.y + box.height - 16;
  const air = 46;
  ctx.save();
  ctx.fillStyle = sky;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(box.x, ground - air, box.width, air);
  ctx.restore();
  line(ctx, box.x, ground, box.x + box.width, ground, theme.neutral, 2);
  label(ctx, "air", box.x + 6, ground - air + 10, { color: theme.text, font: theme.font });
  const eye: [number, number] = [box.x + box.width * 0.72, ground - 4];
  disc(ctx, eye[0], eye[1], 4, theme.text);
  label(ctx, "you", eye[0] + 8, ground + 9, { color: theme.muted, font: theme.font });
  const a = altitude * (Math.PI / 180);
  const reach = Math.min(box.width * 0.62, box.height - 34);
  const sx = eye[0] - reach * Math.cos(a);
  const sy = eye[1] - reach * Math.sin(a);
  if (has("rays")) {
    // The sunlight's path, and how much of it lies in the air.
    line(ctx, sx, sy, eye[0], eye[1], sun, 2.5);
    const inAir = air / Math.max(Math.sin(a), 0.02);
    const k = Math.min(1, inAir / reach);
    line(ctx, eye[0] - k * reach * Math.cos(a), eye[1] - k * reach * Math.sin(a), eye[0], eye[1], theme.angle, 4, undefined, 0.6);
  }
  disc(ctx, sx, sy, 10, sun);

  // Scattering of each colour, ∝ 1/λ⁴.
  const plane = createPlane(graph, [0, BARS.length], [0, rayRayleigh(BARS[0])]);
  label(ctx, "scattering, compared with red (700 nm)", graph.x, graph.y - 10, { color: theme.muted, font: theme.font });
  const slot = graph.width / BARS.length;
  BARS.forEach((w, k) => {
    const [x1, y1] = plane.toPx(k + 0.18, rayRayleigh(w));
    const [, y0] = plane.toPx(0, 0);
    ctx.save();
    ctx.fillStyle = rayWavelengthColour(w);
    ctx.globalAlpha = 0.8;
    ctx.fillRect(x1, y1, slot * 0.64, y0 - y1);
    ctx.restore();
    label(ctx, `${w}`, x1 + slot * 0.32, y0 + 9, { color: theme.muted, font: theme.font, align: "center" });
  });
  const [mx] = plane.toPx(((wavelength - 400) / 50) + 0.5, 0);
  const [, my] = plane.toPx(0, num(results.scattering));
  disc(ctx, mx, my, 5, theme.text);

  if (has("labels")) {
    label(ctx, `${fixed(wavelength, 0)} nm scatters ${fixed(num(results.scattering), 2)}× as much as red`, width / 2, height - 22, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `blue ${fixed(100 * num(results.blueReaching))}% · red ${fixed(100 * num(results.redReaching))}% of sunlight gets through`, width / 2, height - 7, { color: theme.angle, font: theme.font, align: "center" });
  }
}

// ── Instruments ──────────────────────────────────────────────────────────────

function lensOutline(ctx: CanvasRenderingContext2D, x: number, cy: number, half: number, convex: boolean, theme: LabTheme) {
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.fillStyle = theme.sine;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (convex) {
    ctx.moveTo(x, cy - half);
    ctx.quadraticCurveTo(x - 14, cy, x, cy + half);
    ctx.quadraticCurveTo(x + 14, cy, x, cy - half);
  } else {
    ctx.moveTo(x - 6, cy - half);
    ctx.lineTo(x + 6, cy - half);
    ctx.quadraticCurveTo(x, cy, x + 6, cy + half);
    ctx.lineTo(x - 6, cy + half);
    ctx.quadraticCurveTo(x, cy, x - 6, cy - half);
  }
  ctx.globalAlpha = 0.22;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.stroke();
  ctx.restore();
}

function drawInstrument(ctx: CanvasRenderingContext2D, layout: RayOpticsLayout, results: Results, theme: LabTheme, has: (layer: string) => boolean) {
  const { scene: box, width, height } = layout;
  const instrument = RAY_INSTRUMENT_ORDER[Math.round(num(results.instrument))] ?? "telescope";
  const fo = num(results.objective, 100);
  const fe = num(results.eyepiece, 5);
  const L = num(results.tube, 16);
  const cy = box.y + box.height / 2;
  const left = box.x + 20;
  const right = box.x + box.width - 20;
  const rays = has("rays");
  label(ctx, RAY_INSTRUMENTS[instrument], width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "schematic, not to scale", box.x + box.width - 4, box.y + box.height - 6, { color: theme.muted, font: theme.font, align: "right" });
  line(ctx, box.x, cy, box.x + box.width, cy, theme.axis, 1);

  ctx.save();
  clipTo(ctx, box);
  if (instrument === "telescope") {
    const k = (right - left - 30) / (fo + fe);
    const xo = left + 10;
    const xe = xo + (fo + fe) * k;
    const xf = xo + fo * k;
    lensOutline(ctx, xo, cy, 60, true, theme);
    lensOutline(ctx, xe, cy, 26, true, theme);
    disc(ctx, xf, cy, 3, theme.text);
    if (rays) {
      // Parallel light from a distant star, slope s; it focuses at the shared focus, then leaves parallel again.
      const s = Math.min(0.12, 30 / (fo * k));
      const fy = cy + fo * k * s;
      for (const h of [-40, 0, 40]) {
        const hy = cy + h;
        line(ctx, box.x, hy - (xo - box.x) * s, xo, hy, theme.sine, 1.5);
        const slope = (fy - hy) / (xf - xo);
        const ey = hy + slope * (xe - xo);
        line(ctx, xo, hy, xe, ey, theme.sine, 1.5);
        const outSlope = (cy - fy) / (xe - xf);
        line(ctx, xe, ey, box.x + box.width, ey + outSlope * (box.x + box.width - xe), theme.angle, 1.5);
      }
    }
    label(ctx, `objective, f_o = ${fixed(fo, 1)} cm`, xo + 6, box.y + 14, { color: theme.text, font: theme.font });
    label(ctx, `eyepiece, f_e = ${fixed(fe, 1)} cm`, box.x + box.width - 4, box.y + box.height - 22, { color: theme.text, font: theme.font, align: "right" });
  } else if (instrument === "microscope") {
    const total = fo + L + fe;
    const vo = fo + L;
    const uo = 1 / (1 / vo - 1 / fo);
    const k = (right - left - 40) / (total - uo);
    const xo = left + 10 - uo * k;
    const xe = xo + total * k;
    const ho = 8;
    const hi = (vo / uo) * ho;
    lensOutline(ctx, xo, cy, 30, true, theme);
    lensOutline(ctx, xe, cy, 40, true, theme);
    const objX = xo + uo * k;
    const imX = xo + vo * k;
    arrow(ctx, objX, cy, objX, cy - ho, { color: theme.tangent, width: 2.5, head: 6 });
    arrow(ctx, imX, cy, imX, cy - hi, { color: theme.cosine, width: 2, head: 7 });
    if (rays) {
      line(ctx, objX, cy - ho, xo, cy - ho, theme.sine, 1.5);
      line(ctx, xo, cy - ho, imX, cy - hi, theme.sine, 1.5);
      line(ctx, objX, cy - ho, imX, cy - hi, theme.secant, 1.5);
      // From the image at the eyepiece's focus the light leaves parallel.
      for (const [y, colour] of [[cy - hi, theme.angle]] as const) {
        const slope = (cy - y) / (xe - imX);
        line(ctx, imX, y, xe, cy, colour, 1.5);
        line(ctx, xe, cy, box.x + box.width, cy + slope * (box.x + box.width - xe), colour, 1.5);
      }
    }
    label(ctx, `objective, f_o = ${fixed(fo, 1)} cm`, box.x + 4, box.y + 14, { color: theme.text, font: theme.font });
    label(ctx, `eyepiece, f_e = ${fixed(fe, 1)} cm · L = ${fixed(L, 0)} cm`, box.x + box.width - 4, box.y + box.height - 22, { color: theme.text, font: theme.font, align: "right" });
  } else if (instrument === "magnifier") {
    // The object inside F, its image at the near point, 25 cm away.
    const u = -(RAY_NEAR_POINT * fe) / (RAY_NEAR_POINT + fe);
    const k = (box.width - 70) / RAY_NEAR_POINT;
    const xl = box.x + box.width - 40;
    const ho = 10;
    const hi = (-RAY_NEAR_POINT / u) * ho;
    lensOutline(ctx, xl, cy, 50, true, theme);
    const objX = xl + u * k;
    const imX = xl - RAY_NEAR_POINT * k;
    arrow(ctx, objX, cy, objX, cy - ho, { color: theme.tangent, width: 2.5, head: 6 });
    arrow(ctx, imX, cy, imX, cy - hi, { color: theme.cosine, width: 2, head: 8, dash: [5, 4] });
    disc(ctx, xl - fe * k, cy, 3, theme.text);
    disc(ctx, xl + fe * k, cy, 3, theme.text);
    if (rays) {
      line(ctx, objX, cy - ho, xl, cy - ho, theme.sine, 1.5);
      line(ctx, xl, cy - ho, box.x + box.width, cy - ho + (ho / (fe * k)) * (box.x + box.width - xl), theme.sine, 1.5);
      line(ctx, xl, cy - ho, imX, cy - hi, theme.sine, 1, [4, 4]);
      // Through the centre undeviated; traced back, it starts from the image.
      line(ctx, objX, cy - ho, box.x + box.width, cy - ho + (ho / (xl - objX)) * (box.x + box.width - objX), theme.secant, 1.5);
      line(ctx, objX, cy - ho, imX, cy - hi, theme.secant, 1, [4, 4]);
    }
    label(ctx, `f = ${fixed(fe, 1)} cm · image 25 cm away`, box.x + 4, box.y + 14, { color: theme.text, font: theme.font });
  } else {
    // An eye and its spectacle lens.
    const myopia = instrument === "myopia";
    const ex = box.x + box.width - 70;
    const er = Math.min(48, box.height / 3);
    ctx.save();
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ex, cy, er, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    const retina = ex + er;
    const xl = ex - er - 40;
    lensOutline(ctx, xl, cy, 40, !myopia, theme);
    lensOutline(ctx, ex - er + 6, cy, er * 0.6, true, theme);
    if (rays) {
      for (const h of [-24, 24]) {
        // Far light (short sight) or light from 25 cm (long sight), made to look as if it came from the eye's own range.
        const startY = myopia ? cy + h : cy + h * 0.15;
        const atLens = cy + h;
        line(ctx, box.x, myopia ? startY : cy, xl, atLens, theme.sine, 1.5);
        const atEye = cy + h * (myopia ? 1.25 : 0.95);
        line(ctx, xl, atLens, ex - er + 6, atEye, theme.sine, 1.5);
        line(ctx, ex - er + 6, atEye, retina, cy, theme.angle, 1.5);
      }
    }
    disc(ctx, retina, cy, 3.5, theme.cosine);
    const point = myopia ? `far point ${fixed(num(results.farPoint), 0)} cm` : `near point ${fixed(num(results.nearPoint), 0)} cm`;
    label(ctx, `${myopia ? "concave" : "convex"} lens · ${point}`, box.x + 4, box.y + 14, { color: theme.text, font: theme.font });
  }
  ctx.restore();

  if (has("labels")) {
    const m = num(results.magnifyingPower);
    const near = num(results.magnifyingNear);
    const P = num(results.correctivePower);
    const first =
      instrument === "telescope"
        ? `m = f_o/f_e = ${fixed(m)} · tube ${fixed(num(results.scopeLength), 1)} cm`
        : instrument === "microscope"
          ? `m = (L/f_o)(D/f_e) = ${fixed(m)}`
          : instrument === "magnifier"
            ? `m = 1 + D/f = ${fixed(near)} at the near point`
            : `P = ${signed(P, 2)} D, f = ${signed(num(results.correctiveFocal))} cm`;
    const second =
      instrument === "magnifier"
        ? `m = D/f = ${fixed(m)} with the image at infinity`
        : instrument === "myopia" || instrument === "hypermetropia"
          ? instrument === "myopia"
            ? "far things now seem to sit at the far point"
            : "a page at 25 cm now seems to sit at the near point"
          : `${fixed(near)} with the final image at 25 cm`;
    label(ctx, first, width / 2, height - 28, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, second, width / 2, height - 11, { color: theme.angle, font: theme.font, align: "center" });
  }
}

export const rayOpticsRenderer: SimulationRenderer<RayOpticsLayout> = {
  id: "rayoptics",
  layout: (width, _graphs, layers) => computeRayOpticsLayout(width, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);
    // The layers present decide the picture, whatever view the layout was made for.
    const view = VIEWS.find((v) => has(v)) ?? layout.view;
    const sized = view === layout.view ? layout : computeRayOpticsLayout(layout.width, layers);
    if (view === "bench") drawBench(ctx, sized, results, theme, has);
    else if (view === "interface") drawInterface(ctx, sized, results, theme, has);
    else if (view === "prism") drawPrism(ctx, sized, results, theme, has);
    else if (view === "sky") drawSky(ctx, sized, results, theme, has);
    else drawInstrument(ctx, sized, results, theme, has);
  },

  /** Drag the object along the axis, the incoming ray round the normal, or the marker along the deviation graph. */
  pick(layout, x, y, locked): PickResult | null {
    const { scene, graph, view } = layout;
    const inside = (b: Box, slack = 8) => x >= b.x - slack && x <= b.x + b.width + slack && y >= b.y - slack && y <= b.y + b.height + slack;
    if (view === "bench") {
      if (locked !== "object" && (locked || !inside(scene))) return null;
      const bench = benchOf(scene);
      const u = clamp((x - bench.x0) / bench.sx, RAY_U_RANGE[0], RAY_U_RANGE[1]);
      return { writes: [{ variable: "u", value: Math.round(u) }], region: "object", press: "sweep" };
    }
    if (view === "interface") {
      if (locked !== "ray" && (locked || !inside(scene))) return null;
      const { ox, oy } = interfaceGeometry(scene);
      const i = (Math.atan2(Math.abs(x - ox), Math.max(oy - y, 0.01)) * 180) / Math.PI;
      return { writes: [{ variable: "incidence", value: Math.round(clamp(i, 0, 89)) }], region: "ray", press: "sweep" };
    }
    if (view === "prism") {
      if (locked !== "graph" && (locked || !inside(graph))) return null;
      const i = ((clamp(x, graph.x, graph.x + graph.width) - graph.x) / graph.width) * 90;
      return { writes: [{ variable: "prismIncidence", value: Math.round(clamp(i, RAY_PRISM_I_RANGE[0], RAY_PRISM_I_RANGE[1]) * 2) / 2 }], region: "graph", press: "sweep" };
    }
    return null;
  },
};
