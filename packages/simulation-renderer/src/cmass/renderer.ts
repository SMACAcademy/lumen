/**
 * Systems of particles and energy, in eight pictures — one per layer.
 *
 * Rod: three masses on a light rod, with the balance point (the centre of
 * mass) marked when the words are on.
 *
 * Shell: the parabola the unburst shell would follow, the two pieces after
 * the burst, and the centre of mass still riding the parabola.
 *
 * Pucks: two pucks seen from above, the directions they leave in, and the
 * momentum triangle: p₁′ and p₂′ tip to tail make the momentum before.
 *
 * Rocket: the rocket with its fuel draining and its flame, beside its v–t graph.
 *
 * Spring: a block on a spring, and the force–displacement graph with the
 * work shaded as an area.
 *
 * Car: a car on a hill (or speeding up on the level) with its forces, and,
 * with the words, the power against time.
 *
 * Loop: a ball on a string in a vertical circle, the string going slack if
 * it is too slow.
 *
 * Well: a ball on a potential-energy curve, with its energy line, the force
 * −dU/dx, and the equilibrium points named.
 */

import { CMASS_PUCK_RADIUS, CMASS_ROCKET_MASS, cmassRocket, cmassWellU } from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface CmassLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Everything between the title and the two caption lines. */
  full: Box;
  /** Left margin for graphs with tick labels. */
  left: number;
}

export function computeCmassLayout(width: number): CmassLayout {
  const compact = width < 560;
  const height = compact ? 400 : 430;
  return {
    width,
    height,
    compact,
    full: { x: 14, y: 30, width: width - 28, height: height - 30 - 48 },
    left: compact ? 44 : 56,
  };
}

const fixed = (v: number, digits = 2) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const degrees = (rad: number, digits = 1) => `${fixed((rad * 180) / Math.PI, digits)}°`;
const bottom = (b: Box) => b.y + b.height;

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 2) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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

/** A curve through points given in plane units, clipped to the plane. */
function path(ctx: CanvasRenderingContext2D, plane: Plane, points: readonly (readonly [number, number])[], colour: string, lineWidth = 2, dash?: number[]) {
  if (points.length < 2) return;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
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

function polygon(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], fill: string, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const samples = (from: number, to: number, n: number) => Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);

type Draw = (ctx: CanvasRenderingContext2D, layout: CmassLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean, captions: (a: string, b?: string) => void) => void;

// ── Rod ──────────────────────────────────────────────────────────────────────

const drawRod: Draw = (ctx, layout, r, theme, words, captions) => {
  const { full } = layout;
  const rodY = full.y + full.height * 0.45;
  const x0 = full.x + 26;
  const x1 = full.x + full.width - 26;
  const toX = (x: number) => x0 + (x1 - x0) * x;
  line(ctx, x0, rodY, x1, rodY, theme.neutral, 5);
  for (const tick of [0, 0.25, 0.5, 0.75, 1]) {
    line(ctx, toX(tick), rodY + 36, toX(tick), rodY + 42, theme.axis, 1.25);
    label(ctx, tick === 1 ? "1 m" : String(tick), toX(tick), rodY + 54, { color: theme.muted, font: theme.font, align: "center" });
  }
  line(ctx, x0, rodY + 39, x1, rodY + 39, theme.axis, 1);
  const masses = [
    { name: "A", m: num(r.mA), x: 0, colour: theme.sine, high: false },
    { name: "B", m: num(r.mB), x: num(r.xB), colour: theme.angle, high: true },
    { name: "C", m: num(r.mC), x: 1, colour: theme.cosine, high: false },
  ];
  for (const { name, m, x, colour, high } of masses) {
    if (m <= 0) continue;
    const radius = 6 + 4 * Math.sqrt(m);
    disc(ctx, toX(x), rodY, radius, colour, 0.9);
    label(ctx, `${name} ${fixed(m, 1)} kg`, toX(x), high ? rodY - 46 : rodY - radius - 12, { color: colour, font: theme.fontStrong, align: "center" });
  }
  if (words) {
    const xcm = num(r.xcm, 0.5);
    const cx = toX(xcm);
    polygon(ctx, [[cx, rodY + 4], [cx - 9, rodY + 22], [cx + 9, rodY + 22]], theme.tangent, 0.9);
    ring(ctx, cx, rodY, 5, theme.text, 2);
    captions(`x_cm = Σmx ÷ Σm = ${fixed(num(r.rodMoment))} ÷ ${fixed(num(r.rodMass), 1)} = ${fixed(xcm)} m`, "It balances on a support at the centre of mass");
  }
};

// ── Shell ────────────────────────────────────────────────────────────────────

const drawShell: Draw = (ctx, layout, r, theme, words, captions) => {
  const { full, left, width } = layout;
  const range = Math.max(1, num(r.shellRange, 40));
  const height = Math.max(0.5, num(r.shellHeight, 10));
  const flight = num(r.shellFlight, 1);
  const vx = num(r.shellVx);
  const t = num(r.t);
  const box = { x: left, y: full.y + 14, width: width - left - 14, height: full.height - 24 };
  const plane = createPlane(box, [-0.25 * range, 1.75 * range], [0, 1.3 * height]);
  drawPlane(ctx, plane, theme);
  label(ctx, "height / m against distance / m", box.x + 4, full.y + 4, { color: theme.muted, font: theme.font });
  const g = 9.8;
  const vy = (g * flight) / 2;
  const arc = (from: number, to: number) => samples(from, to, 80).map((s) => [vx * s, Math.max(0, vy * s - 0.5 * g * s * s)] as const);
  // The path the whole shell would take — and its centre of mass does take.
  path(ctx, plane, arc(0, flight), theme.muted, 1.5, [5, 5]);
  const top = flight / 2;
  const share = num(r.fragShare, 0.5);
  if (num(r.shellExploded) === 1) {
    path(ctx, plane, arc(0, top), theme.curve, 2);
    const tau = Math.min(t, flight) - top;
    const piece = (v: number) => samples(0, tau, 40).map((s) => [range / 2 + v * s, Math.max(0, height - 0.5 * g * s * s)] as const);
    path(ctx, plane, piece(num(r.fragVelocity)), theme.sine, 2);
    path(ctx, plane, piece(num(r.frag2Velocity)), theme.cosine, 2);
    const y = num(r.fragY);
    const [p1x, p1y] = plane.toPx(num(r.frag1X), y);
    const [p2x, p2y] = plane.toPx(num(r.frag2X), y);
    if (plane.contains(p1x, p1y, 4)) disc(ctx, p1x, p1y, 3 + 5 * share, theme.sine);
    if (plane.contains(p2x, p2y, 4)) disc(ctx, p2x, p2y, 3 + 5 * (1 - share), theme.cosine);
  } else {
    path(ctx, plane, arc(0, Math.min(t, flight)), theme.curve, 2);
    const [sx, sy] = plane.toPx(num(r.cmX), num(r.cmY));
    disc(ctx, sx, sy, 7, theme.curve);
  }
  const [cx, cy] = plane.toPx(num(r.cmX), num(r.cmY));
  ring(ctx, cx, cy, 5, theme.angle, 2);
  line(ctx, cx - 7, cy, cx + 7, cy, theme.angle, 1.5);
  line(ctx, cx, cy - 7, cx, cy + 7, theme.angle, 1.5);
  label(ctx, "CM", cx, cy - 14, { color: theme.angle, font: theme.fontStrong, align: "center" });
  if (words) {
    const first = `R = ${fixed(range, 1)} m: where the whole shell would land`;
    if (num(r.shellLanded) === 1) {
      captions(`pieces land at ${fixed(num(r.land1), 1)} m and ${fixed(num(r.land2), 1)} m`, `their centre of mass lands at ${fixed(num(r.cmLand), 1)} m = R`);
    } else captions(first, num(r.shellExploded) === 1 ? "burst: the centre of mass keeps to the parabola" : "it bursts at the top, x = R/2");
  }
};

// ── Pucks ────────────────────────────────────────────────────────────────────

const drawPucks: Draw = (ctx, layout, r, theme, words, captions) => {
  const { full } = layout;
  const table: Box = { x: full.x, y: full.y, width: full.width, height: full.height * 0.58 };
  const scale = Math.min(table.width / 2.8, table.height / 1.4);
  const cx = table.x + table.width / 2;
  const cy = table.y + table.height / 2;
  const toPx = (x: number, y: number) => [cx + x * scale, cy - y * scale] as const;
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.fillRect(table.x, table.y, table.width, table.height);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(table.x, table.y, table.width, table.height);
  ctx.clip();
  const R = CMASS_PUCK_RADIUS;
  const s = num(r.puckOffset);
  const c = Math.sqrt(Math.max(0, 1 - s * s));
  const contact1 = toPx(-2 * R * c, 2 * R * s);
  const origin = toPx(0, 0);
  line(ctx, table.x, contact1[1], contact1[0], contact1[1], theme.muted, 1.5, [5, 5]);
  // The directions they leave in.
  const along = (from: readonly [number, number], vx: number, vy: number, colour: string) => {
    const speed = Math.hypot(vx, vy);
    if (speed < 1e-9) return;
    line(ctx, from[0], from[1], from[0] + (vx / speed) * 2 * scale, from[1] - (vy / speed) * 2 * scale, colour, 1.5, [3, 5]);
  };
  along(contact1, num(r.puckV1x), num(r.puckV1y), theme.sine);
  along(origin, num(r.puckV2x), num(r.puckV2y), theme.cosine);
  const p1 = toPx(num(r.puck1X), num(r.puck1Y));
  const p2 = toPx(num(r.puck2X), num(r.puck2Y));
  const onTable = ([x, y]: readonly [number, number]) => x > table.x && x < table.x + table.width && y > table.y && y < bottom(table);
  for (const [at, name, colour] of [[p1, "1", theme.sine], [p2, "2", theme.cosine]] as const) {
    if (!onTable(at)) continue;
    disc(ctx, at[0], at[1], R * scale, colour, 0.9);
    label(ctx, name, at[0], at[1], { color: theme.background, font: theme.fontStrong, align: "center" });
  }
  ctx.restore();

  // Momentum, tip to tail.
  const diagram: Box = { x: full.x, y: bottom(table) + 6, width: full.width, height: bottom(full) - bottom(table) - 6 };
  label(ctx, "momentum: p₁′ + p₂′ = p (tip to tail)", diagram.x, diagram.y + 8, { color: theme.muted, font: theme.font });
  const m1 = num(r.puckM1, 1);
  const m2 = num(r.puckM2, 1);
  const p = num(r.pxBefore, 1);
  const a = [m1 * num(r.puckV1x), m1 * num(r.puckV1y)] as const;
  const xs = [0, a[0], p];
  const ys = [0, a[1]];
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const k = Math.min((diagram.width - 60) / Math.max(spanX, 1e-6), (diagram.height - 40) / Math.max(spanY, 1e-6), 400);
  const ox = diagram.x + diagram.width / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * k;
  const oy = diagram.y + 20 + (diagram.height - 20) / 2 + ((Math.max(...ys) + Math.min(...ys)) / 2) * k;
  const A = [ox + a[0] * k, oy - a[1] * k] as const;
  const B = [ox + p * k, oy] as const;
  arrow(ctx, ox, oy, B[0], B[1], { color: theme.text, width: 2.5, head: 9 });
  arrow(ctx, ox, oy, A[0], A[1], { color: theme.sine, width: 2, head: 8 });
  arrow(ctx, A[0], A[1], B[0], B[1], { color: theme.cosine, width: 2, head: 8 });
  label(ctx, "p", (ox + B[0]) / 2, oy + 11, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "p₁′", (ox + A[0]) / 2 - 8, (oy + A[1]) / 2 - 4, { color: theme.sine, font: theme.fontStrong, align: "right" });
  label(ctx, "p₂′", (A[0] + B[0]) / 2 + 8, (A[1] + B[1]) / 2 - 4, { color: theme.cosine, font: theme.fontStrong });
  if (words) {
    const second =
      num(r.puckSeparation) > 0
        ? `puck 1 at ${degrees(num(r.puckDir1))}, puck 2 at ${degrees(-num(r.puckDeflect2))}: ${degrees(num(r.puckSeparation))} apart`
        : `head on: puck 1 at ${fixed(num(r.puckV1x))} m/s, puck 2 at ${fixed(num(r.puckV2x))} m/s`;
    captions(`KE ${fixed(num(r.keBefore))} J → ${fixed(num(r.keAfter))} J: ${fixed(num(r.keLost))} J lost`, second);
  }
};

// ── Rocket ───────────────────────────────────────────────────────────────────

const drawRocket: Draw = (ctx, layout, r, theme, words, captions) => {
  const { full, width } = layout;
  const column: Box = { x: full.x, y: full.y + 10, width: 64, height: full.height - 20 };
  const bodyW = 22;
  const bodyH = Math.min(120, column.height * 0.5);
  const bx = column.x + column.width / 2 - bodyW / 2;
  const by = column.y + 64;
  const fuel = num(r.fuel, 500);
  const dry = CMASS_ROCKET_MASS - fuel;
  const left = Math.max(0, num(r.rocketMass, CMASS_ROCKET_MASS) - dry);
  const tank = bodyH * 0.8 * (fuel / CMASS_ROCKET_MASS);
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bodyW, bodyH);
  ctx.restore();
  polygon(ctx, [[bx, by], [bx + bodyW / 2, by - 20], [bx + bodyW, by]], theme.neutral, 0.9);
  // The fuel still on board.
  const fill = fuel > 0 ? tank * (left / fuel) : 0;
  ctx.save();
  ctx.fillStyle = theme.secant;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(bx + 3, by + bodyH - 3 - fill, bodyW - 6, fill);
  ctx.restore();
  if (num(r.rocketBurning) === 1) {
    const flame = 18 + 30 * (num(r.exhaust, 2000) / 3000);
    polygon(ctx, [[bx + 3, by + bodyH], [bx + bodyW / 2, by + bodyH + flame], [bx + bodyW - 3, by + bodyH]], theme.angle, 0.85);
  }
  arrow(ctx, bx + bodyW / 2, by - 26, bx + bodyW / 2, by - 50, { color: theme.tangent, width: 2.5, head: 8 });
  label(ctx, "v", bx + bodyW / 2 + 8, by - 44, { color: theme.tangent, font: theme.fontStrong });
  label(ctx, num(r.gravity) === 1 ? "g on" : "no g", column.x + column.width / 2, bottom(column) - 6, { color: theme.muted, font: theme.font, align: "center" });

  const gx = column.x + column.width + 44;
  const graph: Box = { x: gx, y: full.y + 18, width: width - gx - 14, height: full.height - 40 };
  const plane = createPlane(graph, [0, 20], [-1000, 7000]);
  drawPlane(ctx, plane, theme);
  label(ctx, "v / m s⁻¹ against t / s", graph.x + 4, full.y + 6, { color: theme.muted, font: theme.font });
  const t = num(r.t);
  const u = num(r.exhaust, 2000);
  const rate = num(r.burnRate, 50);
  const gravity = num(r.gravity) === 1;
  path(ctx, plane, samples(0, t, 120).map((s) => [s, cmassRocket(u, rate, fuel, gravity, s).v] as const), theme.tangent, 2.5);
  const [px, py] = plane.toPx(t, num(r.rocketSpeed));
  if (plane.contains(px, py, 2)) disc(ctx, px, py, 4.5, theme.tangent);
  if (words) {
    const burn = num(r.burnTime);
    if (burn <= 20) {
      const [x] = plane.toPx(burn, 0);
      line(ctx, x, graph.y, x, bottom(graph), theme.angle, 1.25, [4, 4]);
    }
    captions(
      `m = ${fixed(num(r.rocketMass), 0)} kg · v = ${fixed(num(r.rocketSpeed), 0)} m/s · a = ${fixed(num(r.rocketAccel), 1)} m/s²`,
      `thrust u·dm/dt = ${fixed(num(r.thrust), 1)} kN · burn-out ${fixed(num(r.burnoutSpeed), 0)} m/s`,
    );
  }
};

// ── Spring ───────────────────────────────────────────────────────────────────

const drawSpring: Draw = (ctx, layout, r, theme, words, captions) => {
  const { full, left, width } = layout;
  const top: Box = { x: full.x, y: full.y + 4, width: full.width, height: 84 };
  const k = num(r.springK, 200);
  const x1 = num(r.springX1);
  const x2 = num(r.springX2);
  const lo = top.x + 120;
  const hi = top.x + top.width - 40;
  const toX = (x: number) => lo + ((x + 0.4) / 0.8) * (hi - lo);
  const floor = top.y + 62;
  line(ctx, top.x + 4, top.y + 8, top.x + 4, floor, theme.neutral, 5);
  line(ctx, top.x + 4, floor, top.x + top.width, floor, theme.neutral, 2);
  line(ctx, toX(0), top.y + 4, toX(0), floor, theme.muted, 1, [3, 4]);
  label(ctx, "x = 0", toX(0), top.y - 2, { color: theme.muted, font: theme.font, align: "center" });
  const block = toX(x2);
  const midY = floor - 16;
  // The spring, from the wall to the block's left face.
  ctx.save();
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const start = top.x + 6;
  const end = block - 15;
  const coils = 12;
  ctx.moveTo(start, midY);
  for (let i = 1; i < coils * 2; i++) ctx.lineTo(start + ((end - start) * i) / (coils * 2), midY + (i % 2 === 0 ? -8 : 8));
  ctx.lineTo(end, midY);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(block - 15, floor - 30, 30, 30);
  ctx.restore();
  line(ctx, toX(x1), floor + 2, toX(x1), floor + 10, theme.angle, 2);
  label(ctx, "x₁", toX(x1), floor + 18, { color: theme.angle, font: theme.font, align: "center" });
  label(ctx, "x₂", block, floor - 38, { color: theme.text, font: theme.font, align: "center" });
  const force = num(r.springForce);
  if (Math.abs(force) > 1e-9) {
    const len = (force / (k * 0.4)) * 50;
    arrow(ctx, block, midY - 4, block + len, midY - 4, { color: theme.secant, width: 2.5, head: 8 });
  }

  const graph: Box = { x: left, y: bottom(top) + 30, width: width - left - 14, height: bottom(full) - bottom(top) - 30 };
  const plane = createPlane(graph, [-0.45, 0.45], [-0.45 * k, 0.45 * k]);
  drawPlane(ctx, plane, theme);
  label(ctx, "spring force F / N against x / m", graph.x + 4, graph.y - 10, { color: theme.muted, font: theme.font });
  const work = num(r.workSpring);
  const corners = [[x1, 0], [x1, -k * x1], [x2, -k * x2], [x2, 0]].map(([x, y]) => plane.toPx(x!, y!));
  if (Math.abs(work) > 1e-9) polygon(ctx, corners, work > 0 ? theme.tangent : theme.secant, 0.35);
  path(ctx, plane, [[-0.45, 0.45 * k], [0.45, -0.45 * k]], theme.curve, 2.5);
  const [fx, fy] = plane.toPx(x2, -k * x2);
  disc(ctx, fx, fy, 4.5, theme.text);
  if (words) {
    captions(`by the spring ${fixed(work)} J · by your hand ${fixed(num(r.workHand))} J`, `F = −kx = ${fixed(force, 1)} N at x₂ = ${fixed(x2)} m`);
  }
};

// ── Car ──────────────────────────────────────────────────────────────────────

const drawCar: Draw = (ctx, layout, r, theme, words, captions) => {
  const { full, left, width } = layout;
  const speeding = num(r.drive) === 1;
  const theta = speeding ? 0 : num(r.slope);
  const scene: Box = { x: full.x, y: full.y, width: full.width, height: words ? full.height * 0.48 : full.height };
  const maxRise = scene.height - 50;
  // Drawn at the true angle: a steep hill is drawn shorter rather than flatter.
  const run = Math.tan(theta) * (scene.width - 20) > maxRise ? maxRise / Math.tan(theta) : scene.width - 20;
  const rise = Math.tan(theta) * run;
  const x0 = scene.x + 10;
  const y0 = bottom(scene) - 10;
  const along = Math.hypot(run, rise);
  const ux = run / along;
  const uy = -rise / along;
  line(ctx, x0, y0, x0 + run, y0 - rise, theme.neutral, 3);
  if (theta > 0) {
    line(ctx, x0, y0, x0 + run, y0, theme.axis, 1, [3, 4]);
    label(ctx, "θ", x0 + 46, y0 - 8, { color: theme.angle, font: theme.fontStrong });
  }
  const t = num(r.t);
  const travelled = speeding ? 0.5 * num(r.carAccel) * t * t : num(r.carV) * t;
  const frac = 0.35 + 0.4 * ((travelled / 200) % 1);
  const carX = x0 + ux * along * frac;
  const carY = y0 + uy * along * frac;
  ctx.save();
  ctx.translate(carX, carY);
  ctx.rotate(Math.atan2(uy, ux));
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-22, -18, 44, 16);
  ctx.restore();
  const force = num(r.carForce);
  const mass = num(r.carMass, 1000);
  const down = speeding ? 0 : mass * 9.8 * Math.sin(theta);
  const resistance = speeding ? 0 : num(r.resistance);
  const biggest = Math.max(force, 1);
  const head = [carX, carY - 30] as const;
  arrow(ctx, head[0], head[1], head[0] + ux * (60 * force) / biggest, head[1] + uy * (60 * force) / biggest, { color: theme.tangent, width: 2.5, head: 8 });
  label(ctx, "F", head[0] + ux * 64 + 4, head[1] + uy * 64 - 8, { color: theme.tangent, font: theme.fontStrong });
  if (down > 0) {
    arrow(ctx, carX, carY + 4, carX - (ux * 60 * down) / biggest, carY + 4 - (uy * 60 * down) / biggest, { color: theme.secant, width: 2, head: 7 });
    label(ctx, "mg sin θ", carX + 10, carY + 18, { color: theme.secant, font: theme.font });
  }
  if (resistance > 0) {
    arrow(ctx, carX - ux * 22, carY - 10, carX - ux * 22 - (ux * 60 * resistance) / biggest, carY - 10 - (uy * 60 * resistance) / biggest, { color: theme.cosine, width: 2, head: 7 });
    label(ctx, "f", Math.max(full.x + 6, carX - ux * 22 - (ux * 60 * resistance) / biggest - 10), carY - 20, { color: theme.cosine, font: theme.fontStrong, align: "right" });
  }

  if (!words) return;
  const graph: Box = { x: left, y: bottom(scene) + 26, width: width - left - 14, height: bottom(full) - bottom(scene) - 26 };
  const power = num(r.carPower);
  const peak = speeding ? (num(r.driveForce) ** 2 * 20) / mass / 1000 : power;
  const plane = createPlane(graph, [0, 20], [0, Math.max(1, peak * 1.2)]);
  drawPlane(ctx, plane, theme);
  label(ctx, "P / kW against t / s", graph.x + 4, graph.y - 10, { color: theme.muted, font: theme.font });
  if (speeding) {
    const slope = peak / 20;
    path(ctx, plane, [[0, 0], [20, peak]], theme.curve, 1.5, [4, 4]);
    path(ctx, plane, [[0, 0], [t, slope * t]], theme.curve, 2.5);
    path(ctx, plane, [[0, (slope * t) / 2], [t, (slope * t) / 2]], theme.angle, 2, [6, 4]);
  } else path(ctx, plane, [[0, power], [20, power]], theme.curve, 2.5);
  const [px, py] = plane.toPx(t, power);
  disc(ctx, px, py, 4.5, theme.curve);
  if (speeding) {
    captions(`F = ${fixed(force, 0)} N at v = ${fixed(num(r.carV), 1)} m/s: P = Fv = ${fixed(power, 1)} kW`, `average so far = W ÷ t = ${fixed(num(r.carAvgPower), 1)} kW`);
  } else {
    captions(`F = mg sin θ + f = ${fixed(force, 0)} N · P = Fv = ${fixed(power, 1)} kW`, `steady speed: the average power is the same, ${fixed(num(r.carAvgPower), 1)} kW`);
  }
};

// ── Loop ─────────────────────────────────────────────────────────────────────

const drawLoop: Draw = (ctx, layout, r, theme, words, captions) => {
  const { full } = layout;
  const cx = full.x + full.width / 2;
  const cy = full.y + full.height / 2 + 4;
  const perMetre = (Math.min(full.width, full.height) / 2 - 18) / 2;
  const radius = num(r.loopR, 1);
  ring(ctx, cx, cy, radius * perMetre, theme.axis, 1.25);
  disc(ctx, cx, cy, 3.5, theme.text);
  const toPx = (x: number, y: number) => [cx + x * perMetre, cy - y * perMetre] as const;
  const [bx, by] = toPx(num(r.loopX), num(r.loopY, -radius));
  const slack = num(r.loopSlack) === 1;
  const fate = num(r.loopFate);
  if (slack) {
    // The free flight from where the string went slack.
    const phi = num(r.leaveAngle);
    const lx = radius * Math.sin(phi);
    const ly = -radius * Math.cos(phi);
    const vl = Math.sqrt(Math.max(0, -9.8 * radius * Math.cos(phi)));
    const vx = vl * Math.cos(phi);
    const vy = vl * Math.sin(phi);
    if (Math.abs(vx) > 1e-6) {
      const tau = Math.max(0, (num(r.loopX) - lx) / vx);
      const points = samples(0, tau, 40).map((s) => toPx(lx + vx * s, ly + vy * s - 4.9 * s * s));
      ctx.save();
      ctx.strokeStyle = theme.secant;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();
      ctx.restore();
    }
    line(ctx, cx, cy, bx, by, theme.muted, 1, [2, 4]);
  } else line(ctx, cx, cy, bx, by, theme.neutral, 2);
  const tension = num(r.loopTension);
  const bottomT = Math.max(1e-6, num(r.tensionBottom, 1));
  const weight = num(r.loopMass, 0.5) * 9.8;
  const dist = Math.hypot(cx - bx, cy - by) || 1;
  if (tension > 1e-6) {
    const len = 50 * (tension / bottomT);
    arrow(ctx, bx, by, bx + ((cx - bx) / dist) * len, by + ((cy - by) / dist) * len, { color: theme.tangent, width: 2.5, head: 8 });
    label(ctx, "T", bx + ((cx - bx) / dist) * (len + 10) + 6, by + ((cy - by) / dist) * (len + 10), { color: theme.tangent, font: theme.fontStrong });
  }
  arrow(ctx, bx, by, bx, by + 50 * (weight / bottomT) + 4, { color: theme.secant, width: 2, head: 7 });
  label(ctx, "mg", bx + 6, by + 50 * (weight / bottomT) + 10, { color: theme.secant, font: theme.font });
  disc(ctx, bx, by, 7, theme.angle);
  if (words) {
    if (fate === 1) {
      const phi = num(r.leaveAngle);
      const [lx, ly] = toPx(radius * Math.sin(phi), -radius * Math.cos(phi));
      ring(ctx, lx, ly, 8, theme.secant, 2);
      label(ctx, "slack", lx > cx ? lx - 12 : lx + 12, ly - 12, { color: theme.secant, font: theme.fontStrong, align: lx > cx ? "right" : "left" });
    }
    const first =
      fate === 2
        ? `T bottom ${fixed(num(r.tensionBottom), 1)} N − T top ${fixed(num(r.tensionTop), 1)} N = ${fixed(num(r.tensionDiff), 1)} N = 6mg`
        : fate === 1
          ? `slack ${fixed(num(r.leaveHeight))} m above the bottom, ${degrees(num(r.leaveAngle))} round`
          : `never above the centre: swings to ${degrees(num(r.swingAngle))} and back`;
    captions(first, `loops if v ≥ √(5gr) = ${fixed(num(r.loopMinBottom))} m/s at the bottom`);
  }
};

// ── Well ─────────────────────────────────────────────────────────────────────

const drawWell: Draw = (ctx, layout, r, theme, words, captions) => {
  const { full, left, width } = layout;
  const graph: Box = { x: left, y: full.y + 14, width: width - left - 14, height: full.height - 20 };
  const plane = createPlane(graph, [-1.9, 1.9], [-0.5, 8]);
  drawPlane(ctx, plane, theme);
  label(ctx, "U / J against x / m", graph.x + 4, full.y + 4, { color: theme.muted, font: theme.font });
  path(ctx, plane, samples(-1.9, 1.9, 240).map((x) => [x, cmassWellU(x)] as const), theme.curve, 2.5);
  const x = num(r.ballX);
  const [bx, by] = plane.toPx(x, cmassWellU(x));
  const force = num(r.ballForce);
  if (Math.abs(force) > 0.05) {
    const len = Math.max(-60, Math.min(60, force * 12));
    arrow(ctx, bx, by - 12, bx + len, by - 12, { color: theme.secant, width: 2.5, head: 8 });
    label(ctx, "F", bx + len + (len > 0 ? 6 : -6), by - 22, { color: theme.secant, font: theme.fontStrong, align: len > 0 ? "left" : "right" });
  }
  if (words) {
    const E = num(r.ballEnergy);
    const a = num(r.turnLeft);
    const b = num(r.turnRight);
    path(ctx, plane, [[a, E], [b, E]], theme.angle, 2, [6, 4]);
    for (const end of [a, b]) {
      const [tx, ty] = plane.toPx(end, E);
      line(ctx, tx, ty - 6, tx, ty + 6, theme.angle, 2);
    }
    const [ex, ey] = plane.toPx(b, E);
    if (plane.contains(ex, ey)) label(ctx, "E", Math.min(ex + 8, graph.x + graph.width - 10), ey - 10, { color: theme.angle, font: theme.fontStrong });
    for (const side of [-1, 1]) {
      const [sx, sy] = plane.toPx(side, 0);
      ring(ctx, sx, sy, 5, theme.tangent, 2);
      label(ctx, "stable", sx, sy + 16, { color: theme.tangent, font: theme.font, align: "center" });
    }
    const [hx, hy] = plane.toPx(0, 2);
    ring(ctx, hx, hy, 5, theme.cosine, 2);
    label(ctx, "unstable", hx, hy - 16, { color: theme.cosine, font: theme.font, align: "center" });
    const turns = num(r.ballCrosses) === 1 ? `over the hump, turns at ±${fixed(b)} m` : `turns at ${fixed(a)} m and ${fixed(b)} m`;
    captions(`E = ${fixed(E)} J · U = ${fixed(num(r.ballU))} J · KE = ${fixed(num(r.ballKE))} J`, `F = −dU/dx = ${fixed(force)} N · ${turns}`);
  }
  disc(ctx, bx, by, 7, theme.sine);
};

const SCENES: readonly [string, string, Draw][] = [
  ["rod", "Masses on a light 1 m rod", drawRod],
  ["shell", "A shell bursts at the top of its flight", drawShell],
  ["pucks", "Two pucks on smooth ice, from above", drawPucks],
  ["rocket", "A 1000 kg rocket throwing out its fuel", drawRocket],
  ["spring", "Stretching a spring, F = −kx", drawSpring],
  ["car", "Power: P = Fv", drawCar],
  ["loop", "A ball whirled in a vertical circle", drawLoop],
  ["well", "U(x) = 2(x² − 1)² J for a 1 kg ball", drawWell],
];

export const cmassRenderer: SimulationRenderer<CmassLayout> = {
  id: "cmass",
  layout: (width) => computeCmassLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const { width, height } = layout;
    ctx.clearRect(0, 0, width, height);
    const words = layers.has("labels");
    const captions = (a: string, b?: string) => {
      label(ctx, a, width / 2, height - 32, { color: theme.text, font: theme.font, align: "center" });
      if (b) label(ctx, b, width / 2, height - 13, { color: theme.muted, font: theme.font, align: "center" });
    };
    for (const [layer, title, draw] of SCENES) {
      if (!layers.has(layer)) continue;
      label(ctx, title, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
      draw(ctx, layout, results as Record<string, unknown>, theme, words, captions);
      break;
    }
  },
};
