/**
 * Relative and circular motion, one picture per layer.
 *
 * Fall: a ball thrown up from a tower (or the ground), with its velocity and
 * acceleration arrows, beside v–t and height–t graphs drawn as time runs.
 *
 * Cars: two cars on a two-lane road and, below, the gap from A to B against
 * time — its slope is B's velocity relative to A.
 *
 * Push: a cart on a track, the a–t graph shaded from 0 to now (that area is
 * Δv) and, with words on, the v–t graph it builds.
 *
 * River: a top-down view to scale. The boat's own velocity, the river's, and
 * the resultant that it actually follows.
 *
 * Rain: a person under an umbrella. With words on, the rain as the person
 * sees it (relative velocity) and the vector triangle; with words off, the
 * rain as seen from the ground.
 *
 * Circle: a point going round with its velocity, centripetal, tangential and
 * total acceleration arrows.
 *
 * Incline: a slope at α, the throw at θ, and the path drawn as it flies.
 */

import { REL_G, REL_LOOP, REL_PUSH_T, relPushState } from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface RelmotionLayout {
  width: number;
  height: number;
  compact: boolean;
}

export function computeRelmotionLayout(width: number): RelmotionLayout {
  const compact = width < 560;
  return { width, height: compact ? 400 : 420, compact };
}

const DEG = Math.PI / 180;
const fixed = (v: number, digits = 1) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const signed = (v: number, digits = 1) => {
  const text = Math.abs(v).toFixed(digits);
  return Number(text) === 0 ? text : `${v > 0 ? "+" : "−"}${text}`;
};

/** The smallest of 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ at least v. */
export function niceCeil(v: number): number {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v - 1e-9) return m * p;
  return 10 * p;
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
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

/** f from t0 to t1 on a plane, clipped to it. */
function curve(ctx: CanvasRenderingContext2D, plane: Plane, f: (t: number) => number, t0: number, t1: number, colour: string, width = 2.5) {
  if (t1 <= t0) return;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const t = t0 + ((t1 - t0) * i) / 120;
    const [px, py] = plane.toPx(t, f(t));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/** A small graph: its plane, axes and one line naming what is plotted. */
function miniGraph(ctx: CanvasRenderingContext2D, box: Box, x: readonly [number, number], y: readonly [number, number], theme: LabTheme, name: string): Plane {
  const plane = createPlane(box, x, y);
  drawPlane(ctx, plane, theme);
  label(ctx, name, box.x + 4, box.y - 8, { color: theme.muted, font: theme.font });
  return plane;
}

// ── Free fall ────────────────────────────────────────────────────────────

function drawFall(ctx: CanvasRenderingContext2D, layout: RelmotionLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height, compact } = layout;
  const u = num(r.fallU);
  const h0 = num(r.fallH0);
  const t = num(r.fallT);
  const y = num(r.fallY);
  const v = num(r.fallV);
  const landed = num(r.fallLanded) === 1;
  const top = Math.max(5, num(r.hMax));
  const yMax = niceCeil(top * 1.08);

  // The scene: ground, tower and ball.
  const sceneW = compact ? 92 : 170;
  const ground = height - 44;
  const sky = 44;
  const k = (ground - sky) / yMax;
  const cx = 14 + sceneW / 2;
  line(ctx, 8, ground, 8 + sceneW, ground, theme.neutral, 3);
  if (h0 > 0) {
    ctx.save();
    ctx.fillStyle = theme.neutral;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(cx - 34, ground - h0 * k, 22, h0 * k);
    ctx.restore();
  }
  line(ctx, 8, ground - h0 * k, 8 + sceneW, ground - h0 * k, theme.muted, 1, [3, 4]);
  const by = ground - y * k - 7;
  disc(ctx, cx, by, 7, theme.angle);
  if (!landed) {
    const len = Math.min(70, Math.abs(v) * 2.2);
    if (len > 2) arrow(ctx, cx + 14, by, cx + 14, by - Math.sign(v) * len, { color: theme.sine, width: 2.5, head: 8 });
    arrow(ctx, cx - 14, by, cx - 14, by + 26, { color: theme.cosine, width: 2.5, head: 8 });
    label(ctx, "v", cx + 22, by - Math.sign(v || 1) * 12, { color: theme.sine, font: theme.fontStrong });
    label(ctx, "g", cx - 22, by + 22, { color: theme.cosine, font: theme.fontStrong, align: "right" });
  }

  // Two graphs drawn as time runs: v–t above, height–t below.
  const gx = 8 + sceneW + 34;
  const gw = width - gx - 10;
  const gh = (height - 36 - 54 - 30) / 2;
  const vMax = niceCeil(Math.max(u, num(r.vGround), 5));
  const tAxis = [0, 8] as const;
  const vPlane = miniGraph(ctx, { x: gx, y: 44, width: gw, height: gh }, tAxis, [-vMax, vMax], theme, "v / m/s, against t / s");
  const hPlane = miniGraph(ctx, { x: gx, y: 44 + gh + 30, width: gw, height: gh }, tAxis, [0, yMax], theme, "height / m, against t / s");
  curve(ctx, vPlane, (s) => u - REL_G * s, 0, t, theme.sine);
  curve(ctx, hPlane, (s) => h0 + u * s - 0.5 * REL_G * s * s, 0, t, theme.angle);
  const [vx, vy] = vPlane.toPx(t, landed ? u - REL_G * t : v);
  disc(ctx, vx, vy, 4, theme.sine);
  const [hx, hy] = hPlane.toPx(t, y);
  disc(ctx, hx, hy, 4, theme.angle);

  if (words) {
    if (t > 0.3) label(ctx, "slope −9.8 m/s²", gx + gw - 4, 44 + 12, { color: theme.cosine, font: theme.font, align: "right" });
    const caption = landed ? `landed at ${fixed(num(r.vGround))} m/s after ${fixed(num(r.tGround), 2)} s` : `t ${fixed(t, 2)} s · v ${signed(v)} m/s · a −9.8 · h ${fixed(y)} m`;
    label(ctx, caption, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── Two cars ─────────────────────────────────────────────────────────────

function car(ctx: CanvasRenderingContext2D, x: number, y: number, colour: string, name: string, theme: LabTheme) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.roundRect(x - 13, y - 7, 26, 14, 4);
  ctx.fill();
  ctx.restore();
  label(ctx, name, x, y, { color: theme.background, font: theme.fontStrong, align: "center" });
}

function drawCars(ctx: CanvasRenderingContext2D, layout: RelmotionLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const t = num(r.carT);
  const vA = num(r.carVA);
  const vB = num(r.carVB);
  const gap = num(r.carGap);
  const vBA = num(r.vBA);

  const ends = [0, gap, num(r.xA), num(r.xB)];
  const lo = Math.min(...ends, vA * REL_LOOP, gap + vB * REL_LOOP);
  const hi = Math.max(...ends, vA * REL_LOOP, gap + vB * REL_LOOP);
  const pad = Math.max(10, (hi - lo) * 0.06);
  const road: Box = { x: 22, y: 58, width: width - 44, height: 56 };
  const px = (x: number) => road.x + ((x - (lo - pad)) / (hi - lo + 2 * pad)) * road.width;
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(road.x - 12, road.y, road.width + 24, road.height);
  ctx.restore();
  line(ctx, road.x - 12, road.y + road.height / 2, road.x + road.width + 12, road.y + road.height / 2, theme.muted, 1, [8, 8]);
  const yA = road.y + road.height * 0.27;
  const yB = road.y + road.height * 0.73;
  const ax = px(num(r.xA));
  const bx = px(num(r.xB));
  car(ctx, ax, yA, theme.sine, "A", theme);
  car(ctx, bx, yB, theme.cosine, "B", theme);
  label(ctx, `A: ${signed(vA, 0)} m/s`, 12, 40, { color: theme.sine, font: theme.fontStrong });
  label(ctx, `B: ${signed(vB, 0)} m/s`, width - 12, 40, { color: theme.cosine, font: theme.fontStrong, align: "right" });

  // The gap from A to B against time.
  const seps = [gap, gap + vBA * REL_LOOP, 0];
  const sMin = Math.min(...seps);
  const sMax = Math.max(...seps);
  const span = niceCeil(Math.max(Math.abs(sMin), Math.abs(sMax), 10));
  const graph: Box = { x: 46, y: 146, width: width - 60, height: height - 146 - 52 };
  const plane = miniGraph(ctx, graph, [0, REL_LOOP], [sMin < 0 ? -span : 0, sMax > 0 ? span : 1], theme, "gap x_B − x_A / m, against t / s");
  curve(ctx, plane, (s) => gap + vBA * s, 0, t, theme.curve);
  const [gx, gy] = plane.toPx(t, gap + vBA * t);
  disc(ctx, gx, gy, 4, theme.curve);

  if (words) {
    const met = num(r.carsMet) === 1 && num(r.tMeet) > 0 ? ` · level at ${fixed(num(r.tMeet))} s` : "";
    label(ctx, `v_BA = v_B − v_A = ${signed(vBA)} m/s${met}`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── Changing acceleration ────────────────────────────────────────────────

function drawPush(ctx: CanvasRenderingContext2D, layout: RelmotionLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const drag = num(r.push) === 1;
  const push = drag ? "drag" : "ramp";
  const t = num(r.pushT);
  const v = num(r.pushV);
  const v0 = num(r.pushV0);
  const kk = num(r.pushK, 1) || 1;
  const at = (s: number) => relPushState(push, kk, v0, s);
  const xEnd = drag ? Math.max(5, v0 * REL_PUSH_T * 0.5) : Math.max(5, at(REL_PUSH_T).x);
  const track: Box = { x: 24, y: 44, width: width - 48, height: 20 };
  line(ctx, track.x, track.y + track.height, track.x + track.width, track.y + track.height, theme.neutral, 2);
  const cartX = track.x + Math.min(1, num(r.pushX) / niceCeil(xEnd)) * track.width;
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.fillRect(cartX - 10, track.y + 4, 20, track.height - 6);
  ctx.restore();

  const gh = (height - 60 - 96 - 34) / 2;
  const aLim = drag ? niceCeil(Math.max(kk * v0, 1)) : niceCeil(Math.max(kk * REL_PUSH_T, 1));
  const aPlane = miniGraph(ctx, { x: 46, y: 96, width: width - 60, height: gh }, [0, REL_PUSH_T], drag ? [-aLim, 0] : [0, aLim], theme, "a / m/s², against t / s");
  // The area under a–t from 0 to now: the change in velocity.
  if (t > 0) {
    ctx.save();
    clipToPlane(ctx, aPlane);
    ctx.fillStyle = theme.tangent;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    const [x0, y0] = aPlane.toPx(0, 0);
    ctx.moveTo(x0, y0);
    for (let i = 0; i <= 80; i++) {
      const s = (t * i) / 80;
      const [px, py] = aPlane.toPx(s, at(s).a);
      ctx.lineTo(px, py);
    }
    const [x1, y1] = aPlane.toPx(t, 0);
    ctx.lineTo(x1, y1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  curve(ctx, aPlane, (s) => at(s).a, 0, REL_PUSH_T, theme.cosine, 2);
  const vLim = niceCeil(Math.max(drag ? v0 : at(REL_PUSH_T).v, 1));
  const vPlane = miniGraph(ctx, { x: 46, y: 96 + gh + 34, width: width - 60, height: gh }, [0, REL_PUSH_T], [0, vLim], theme, "v / m/s, against t / s");
  const [sx, sy] = vPlane.toPx(0, v0);
  disc(ctx, sx, sy, 4, theme.sine);
  if (words) {
    curve(ctx, vPlane, (s) => at(s).v, 0, t, theme.sine);
    const [vx, vy] = vPlane.toPx(t, v);
    disc(ctx, vx, vy, 4, theme.sine);
    label(ctx, `area under a–t = Δv = ${signed(num(r.pushArea))} m/s`, width / 2, height - 30, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `t ${fixed(t)} s · v ${fixed(v)} m/s · x ${fixed(num(r.pushX))} m`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── River ────────────────────────────────────────────────────────────────

function drawRiver(ctx: CanvasRenderingContext2D, layout: RelmotionLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const across = num(r.acrossSpeed);
  const along = num(r.alongSpeed);
  const crossTime = num(r.crossTime, 1);
  const w = num(r.riverWidth, 100);
  const drift = num(r.drift);
  const heading = num(r.headingDeg) * DEG;
  const vb = num(r.boatSpeed);
  const vr = num(r.riverSpeed);

  const left = 16;
  const right = width - 16;
  const margin = 60;
  const s = Math.min(210 / w, (right - left - 2 * margin) / Math.max(Math.abs(drift), 1));
  const x0 = drift >= 0 ? left + margin : right - margin;
  const far = 74;
  const near = far + w * s;
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.16;
  ctx.fillRect(0, far, width, near - far);
  ctx.restore();
  line(ctx, 0, far, width, far, theme.neutral, 2);
  line(ctx, 0, near, width, near, theme.neutral, 2);
  for (const fx of [0.2, 0.55, 0.85]) arrow(ctx, width * fx - 14, (far + near) / 2, width * fx + 14, (far + near) / 2, { color: theme.sine, width: 1.5, head: 6, alpha: 0.6 });
  label(ctx, "flow →", width - 8, far - 10, { color: theme.sine, font: theme.font, align: "right" });
  line(ctx, x0, near, x0, far, theme.muted, 1, [3, 4]);
  label(ctx, "opposite", x0, far - 10, { color: theme.muted, font: theme.font, align: x0 > width / 2 ? "right" : "left" });
  const headingText = Math.abs(num(r.headingDeg)) < 0.5 ? "heading straight across" : `heading ${fixed(Math.abs(num(r.headingDeg)), 0)}° ${heading > 0 ? "upstream" : "downstream"}`;
  label(ctx, headingText, 12, 40, { color: theme.text, font: theme.fontStrong });

  const bx = x0 + num(r.boatAlong) * s;
  const by = near - num(r.boatAcross) * s;
  if (words) line(ctx, x0, near, x0 + drift * s, far, theme.angle, 1.5, [5, 5]);
  line(ctx, x0, near, bx, by, theme.angle, 2.5);
  disc(ctx, bx, by, 6, theme.angle);
  // The velocity triangle at the boat: its own, the river's, and the sum.
  // Arrows scaled to fit: every tip is the boat plus some multiple of k.
  const reach = [0, -vb * Math.sin(heading), along];
  const cMax = Math.max(...reach);
  const cMin = Math.min(...reach);
  let k = Math.min(9, 70 / Math.max(vb, vr, 1));
  if (cMax > 0) k = Math.min(k, (width - 52 - bx) / cMax);
  if (cMin < 0) k = Math.min(k, (bx - 34) / -cMin);
  if (across > 0) k = Math.min(k, (by - 52) / across);
  k = Math.max(k, 0.5);
  const hx = bx - vb * Math.sin(heading) * k;
  const hy = by - vb * Math.cos(heading) * k;
  arrow(ctx, bx, by, hx, hy, { color: theme.tangent, width: 2.5, head: 8 });
  arrow(ctx, hx, hy, hx + vr * k, hy, { color: theme.sine, width: 2, head: 7, dash: [4, 3] });
  arrow(ctx, bx, by, bx + along * k, by - across * k, { color: theme.cosine, width: 2.5, head: 8 });
  label(ctx, "boat", hx - 6, hy - 8, { color: theme.tangent, font: theme.font, align: "right" });
  label(ctx, "ground", bx + along * k + 6, by - across * k + 10, { color: theme.cosine, font: theme.font });

  if (words) {
    const where = num(r.straight) === 1 ? "lands straight opposite" : `drift ${fixed(Math.abs(drift))} m ${drift > 0 ? "downstream" : "upstream"}`;
    label(ctx, `crossing ${fixed(crossTime)} s · ${where}`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `ground speed ${fixed(num(r.groundSpeed), 2)} m/s`, width / 2, height - 30, { color: theme.cosine, font: theme.font, align: "center" });
  }
}

// ── Rain ─────────────────────────────────────────────────────────────────

function drawRain(ctx: CanvasRenderingContext2D, layout: RelmotionLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height, compact } = layout;
  const t = num(r.t);
  const relX = num(r.rainRelX);
  const vRain = num(r.rainSpeed);
  const walk = num(r.walkSpeed);
  const wind = num(r.windSpeed);
  // Words on: the rain as the walker sees it. Words off: as the ground sees it.
  const dx = words ? relX : wind;
  const speed = Math.hypot(dx, vRain) || 1;
  const ux = dx / speed;
  const uy = vRain / speed;
  const ground = height - 64;
  const px = compact ? width * 0.3 : width * 0.35;

  ctx.save();
  ctx.strokeStyle = theme.sine;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.5;
  const step = 34;
  const drift = (t * 60) % step;
  for (let gx = -40; gx < width + 40; gx += step) {
    for (let gy = 30; gy < ground - 10; gy += step) {
      const x = gx + ((gy * 0.37) % step) + ux * drift;
      const y = gy + uy * drift;
      if (x - ux * 12 < 2 || x > width - 2 || y > ground - 4 || y - uy * 12 < 26) continue;
      ctx.beginPath();
      ctx.moveTo(x - ux * 12, y - uy * 12);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  ctx.restore();
  line(ctx, 0, ground, width, ground, theme.neutral, 3);

  // The walker: head, body, legs, and an arm holding the umbrella.
  const hip = ground - 34;
  const neck = hip - 30;
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(px - 10, ground);
  ctx.lineTo(px, hip);
  ctx.lineTo(px + 10, ground);
  ctx.moveTo(px, hip);
  ctx.lineTo(px, neck);
  ctx.stroke();
  ctx.restore();
  disc(ctx, px, neck - 8, 7, theme.text);
  const tilt = words ? num(r.umbrellaAngle) * DEG : 0;
  const hx = px + 8;
  const hy = neck + 6;
  const topX = hx + Math.sin(tilt) * 58;
  const topY = hy - Math.cos(tilt) * 58;
  line(ctx, hx, hy, topX, topY, theme.angle, 2);
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.fillStyle = theme.angle;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(topX, topY, 30, Math.PI + tilt, 2 * Math.PI + tilt);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (Math.abs(walk) > 0.05) arrow(ctx, px, ground + 18, px + Math.sign(walk) * Math.min(60, 10 + Math.abs(walk) * 3), ground + 18, { color: theme.tangent, width: 2.5, head: 8 });
  label(ctx, `walking ${fixed(Math.abs(walk))} m/s`, px, ground + 36, { color: theme.tangent, font: theme.font, align: "center" });
  label(ctx, words ? "rain as the walker sees it" : "rain as seen from the ground", 12, 40, { color: theme.text, font: theme.fontStrong });

  if (words) {
    // v_rain relative to the walker = v_rain − v_walker, as a triangle.
    const k = Math.min(3, (compact ? 70 : 90) / Math.max(vRain, Math.abs(relX), Math.abs(wind), 1));
    const ox = Math.min(compact ? width - 60 : width * 0.75, width - 40 - Math.max(0, wind, relX) * k);
    const oy = 80;
    arrow(ctx, ox, oy, ox + wind * k, oy + vRain * k, { color: theme.sine, width: 2.5, head: 8 });
    arrow(ctx, ox + wind * k, oy + vRain * k, ox + relX * k, oy + vRain * k, { color: theme.tangent, width: 2, head: 7, dash: [4, 3] });
    arrow(ctx, ox, oy, ox + relX * k, oy + vRain * k, { color: theme.cosine, width: 2.5, head: 8 });
    label(ctx, "rain", ox + wind * k + 6, oy + vRain * k * 0.5, { color: theme.sine, font: theme.font });
    label(ctx, "−v_walker", ox + (wind + relX) * k * 0.5, oy + vRain * k + 12, { color: theme.tangent, font: theme.font, align: "center" });
    const angle = num(r.umbrellaAngle);
    // Forward or back for a walker; into the wind for someone standing still.
    const side = Math.abs(angle) < 0.05 ? "" : Math.abs(walk) > 0.05 ? (Math.sign(angle) === Math.sign(walk) ? " forward" : " back") : " into the wind";
    label(ctx, `rain at ${fixed(num(r.rainRelSpeed))} m/s, ${fixed(Math.abs(angle))}° off vertical`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, `tilt the umbrella ${fixed(Math.abs(angle))}°${side}`, px, 60, { color: theme.angle, font: theme.font, align: "center" });
  }
}

// ── Circle ───────────────────────────────────────────────────────────────

function drawCircle(ctx: CanvasRenderingContext2D, layout: RelmotionLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const v = num(r.circSpeed);
  const radius = num(r.circR, 2);
  const ac = num(r.ac);
  const aTan = num(r.aTan);
  const aNet = num(r.aNet);
  const phi = num(r.phi);
  const cx = width / 2;
  const cy = 52 + (height - 52 - 52) / 2;
  const big = Math.min(width / 2 - 72, (height - 104) / 2 - 58);
  const R = big * (0.3 + (0.7 * (Math.min(5, Math.max(0.5, radius)) - 0.5)) / 4.5);

  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  disc(ctx, cx, cy, 3, theme.muted);
  const px = cx + R * Math.cos(phi);
  const py = cy - R * Math.sin(phi);
  line(ctx, cx, cy, px, py, theme.muted, 1, [3, 4]);

  // Unit vectors on screen: along the motion (anticlockwise) and towards the centre.
  const tx = -Math.sin(phi);
  const ty = -Math.cos(phi);
  const nx = (cx - px) / R;
  const ny = (cy - py) / R;
  if (v > 0) {
    const kv = Math.min(8, 60 / v);
    arrow(ctx, px, py, px + tx * v * kv, py + ty * v * kv, { color: theme.sine, width: 2.5, head: 8 });
    label(ctx, "v", px + tx * (v * kv + 10), py + ty * (v * kv + 10), { color: theme.sine, font: theme.fontStrong, align: "center" });
  }
  if (aNet > 0) {
    const ka = Math.min(20, 56 / aNet);
    if (ac > 0) arrow(ctx, px, py, px + nx * ac * ka, py + ny * ac * ka, { color: theme.cosine, width: 2.5, head: 8 });
    if (Math.abs(aTan) > 0) {
      arrow(ctx, px, py, px + tx * aTan * ka, py + ty * aTan * ka, { color: theme.tangent, width: 2, head: 7 });
      const ex = px + (nx * ac + tx * aTan) * ka;
      const ey = py + (ny * ac + ty * aTan) * ka;
      arrow(ctx, px, py, ex, ey, { color: theme.angle, width: 2.5, head: 8 });
      label(ctx, "a", ex + (ex - px) * 0.15, ey + (ey - py) * 0.15, { color: theme.angle, font: theme.fontStrong, align: "center" });
    }
  }
  disc(ctx, px, py, 6, theme.text);
  label(ctx, `r = ${fixed(radius)} m`, 12, 40, { color: theme.text, font: theme.fontStrong });
  if (Math.abs(aTan) > 0) label(ctx, aTan > 0 ? "speeding up" : "slowing down", width - 12, 40, { color: theme.tangent, font: theme.fontStrong, align: "right" });
  else if (num(r.circStopped) === 1) label(ctx, "stopped", width - 12, 40, { color: theme.muted, font: theme.fontStrong, align: "right" });
  else label(ctx, "steady speed", width - 12, 40, { color: theme.muted, font: theme.fontStrong, align: "right" });

  const key = Math.abs(aTan) > 0 ? "v · a_c to centre · a_t along · a total" : "v along the circle · a_c to the centre";
  label(ctx, key, width / 2, height - 46, { color: theme.muted, font: theme.font, align: "center" });
  if (words) {
    label(ctx, `v ${fixed(v)} m/s · a_c = v²/r = ${fixed(ac, 2)} m/s² · T ${v > 0 ? `${fixed(num(r.period), 2)} s` : "—"}`, width / 2, height - 30, { color: theme.text, font: theme.font, align: "center" });
    if (Math.abs(aTan) > 0) label(ctx, `a_t ${signed(aTan)} · a ${fixed(aNet, 2)} m/s², ${fixed(num(r.aAngle))}° off the radius`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── Incline ──────────────────────────────────────────────────────────────

function drawIncline(ctx: CanvasRenderingContext2D, layout: RelmotionLayout, r: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { width, height } = layout;
  const theta = num(r.launchDeg) * DEG;
  const alpha = num(r.slopeDeg) * DEG;
  const U = num(r.incU);
  const rMax = num(r.incRmax);
  const valid = num(r.incValid) === 1;
  // A scale fixed by the speed and slope, not by this throw, so it shows nothing away.
  const reachX = rMax * Math.cos(alpha) * 1.08;
  const reachY = Math.max((U * U) / (2 * REL_G), rMax * Math.sin(alpha)) * 1.05;
  const ox = 26;
  const oy = height - 56;
  const s = Math.min((width - ox - 16) / Math.max(reachX, 1), (oy - 64) / Math.max(reachY, 1));
  const toPx = (x: number, y: number): [number, number] => [ox + x * s, oy - y * s];

  const xe = Math.min((width - ox - 10) / s, alpha > 0 ? (oy - 44) / (s * Math.tan(alpha)) : Number.POSITIVE_INFINITY);
  const slopeEnd = toPx(xe, xe * Math.tan(alpha));
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.moveTo(ox, oy);
  ctx.lineTo(slopeEnd[0], slopeEnd[1]);
  ctx.lineTo(slopeEnd[0], oy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  line(ctx, 6, oy, width - 6, oy, theme.neutral, 1.5);
  line(ctx, ox, oy, slopeEnd[0], slopeEnd[1], theme.neutral, 2.5);
  // The two angles, both from the horizontal.
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = theme.muted;
  ctx.beginPath();
  ctx.arc(ox, oy, 46, -alpha, 0);
  ctx.stroke();
  ctx.strokeStyle = theme.curve;
  ctx.beginPath();
  ctx.arc(ox, oy, 30, -theta, 0);
  ctx.stroke();
  ctx.restore();
  label(ctx, `α ${fixed(num(r.slopeDeg), 0)}°`, ox + 52, oy - 10, { color: theme.muted, font: theme.font });
  arrow(ctx, ox, oy, ox + Math.cos(theta) * 44, oy - Math.sin(theta) * 44, { color: theme.curve, width: 2, head: 7 });
  label(ctx, `θ ${fixed(num(r.launchDeg), 0)}°`, ox + Math.cos(theta) * 52, oy - Math.sin(theta) * 52 - 6, { color: theme.curve, font: theme.font });

  if (valid) {
    const T = num(r.incT);
    const ti = Math.min(T, num(r.t));
    const ux = U * Math.cos(theta);
    const uy = U * Math.sin(theta);
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const tt = (ti * i) / 80;
      const [x, y] = toPx(ux * tt, uy * tt - 0.5 * REL_G * tt * tt);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    const [bx, by] = toPx(num(r.incX), num(r.incY));
    disc(ctx, bx, by, 6, theme.angle);
    if (words) {
      const R = num(r.incR);
      const [lx, ly] = toPx(R * Math.cos(alpha), R * Math.sin(alpha));
      disc(ctx, lx, ly, 4, theme.cosine);
      label(ctx, `R ${fixed(R)} m up the slope · flight ${fixed(T, 2)} s`, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  } else {
    disc(ctx, ox, oy - 6, 6, theme.angle);
    label(ctx, "aim above the slope: θ must be more than α", width / 2, height - 14, { color: theme.secant, font: theme.font, align: "center" });
  }
  label(ctx, `thrown at ${fixed(U, 0)} m/s from the foot of the slope`, 12, 40, { color: theme.text, font: theme.fontStrong });
}

export const relmotionRenderer: SimulationRenderer<RelmotionLayout> = {
  id: "relmotion",
  layout: (width) => computeRelmotionLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const r = results as Record<string, unknown>;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const title = (text: string) => label(ctx, text, layout.width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    if (has("fall")) {
      title("Thrown up, falling back");
      drawFall(ctx, layout, r, theme, words);
    } else if (has("cars")) {
      title("Two cars on one road");
      drawCars(ctx, layout, r, theme, words);
    } else if (has("push")) {
      title(num(r.push) === 1 ? "Drag: a = −kv" : "A growing push: a = kt");
      drawPush(ctx, layout, r, theme, words);
    } else if (has("river")) {
      title("Crossing a river");
      drawRiver(ctx, layout, r, theme, words);
    } else if (has("rain")) {
      title("Walking in the rain");
      drawRain(ctx, layout, r, theme, words);
    } else if (has("circle")) {
      title("Going round a circle");
      drawCircle(ctx, layout, r, theme, words);
    } else if (has("incline")) {
      title("Thrown up a slope");
      drawIncline(ctx, layout, r, theme, words);
    }
  },
};
