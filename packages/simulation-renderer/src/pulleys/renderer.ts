/**
 * Connected bodies and accelerating frames, in five pictures.
 *
 * Rig: an Atwood machine, a block on a table pulled by a hanging block, or a
 * movable pulley — the blocks drop when Play is pressed. Each block carries
 * its free-body diagram; with the pairs layer on, each force's third-law
 * partner is drawn dashed in the same colour on the *other* body (the string,
 * the table).
 *
 * Lift: a person on a bathroom scale, the normal force and the weight, and
 * the lift's acceleration. Car: a bob hanging in an accelerating car, seen
 * from the ground (net force ma) or from inside (pseudo force −ma). Road: a
 * banked curve in cross-section with N, mg, the friction it needs and the
 * centripetal force they must add up to. Cone: a conical pendulum going round.
 *
 * Numbers are drawn only with the labels layer, so estimates stay honest.
 */

import { PULLEY_BOB_MASS, PULLEY_CAR_MASS, PULLEY_G, PULLEY_RIG_ORDER } from "@ise/physics-engine";
import type { AngleUnit } from "@ise/units";
import { arrow, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface PulleysLayout {
  width: number;
  height: number;
  compact: boolean;
}

export function computePulleysLayout(width: number): PulleysLayout {
  const compact = width < 560;
  return { width, height: compact ? 380 : 400, compact };
}

/** Pixels per metre of block travel, the same for every rig. */
const METRE = 45;
/** Longest force arrow, px. */
const LONGEST = 44;

const fx = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const angleText = (rad: number, unit: AngleUnit) => (unit === "rad" ? `${fx(rad, 2)} rad` : `${fx((rad * 180) / Math.PI, 1)}°`);
const blockSide = (m: number) => 24 + 2.8 * m;

type Side = "left" | "right" | "above" | "below";

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, width = 2, dash?: number[]) {
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

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, fill = false) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) ctx.fill();
  else ctx.stroke();
  ctx.restore();
}

function pulley(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, theme: LabTheme) {
  circle(ctx, x, y, r, theme.axis);
  circle(ctx, x, y, 3, theme.axis, true);
}

/** Half a turn of string round a pulley: over the top, or under the bottom. */
function wrap(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, over: boolean, theme: LabTheme) {
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (over) ctx.arc(x, y, r, Math.PI, 2 * Math.PI);
  else ctx.arc(x, y, r, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

function block(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, name: string, colour: string, theme: LabTheme) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.28;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  label(ctx, name, cx, cy, { color: theme.text, font: theme.fontStrong, align: "center" });
}

/** A force arrow from (x, y) by (dx, dy), named beside its middle. */
function force(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, colour: string, text: string, side: Side, theme: LabTheme, dashed = false) {
  if (Math.hypot(dx, dy) < 1) return;
  arrow(ctx, x, y, x + dx, y + dy, { color: colour, width: 2.5, head: 8, dash: dashed ? [5, 4] : undefined });
  if (!text) return;
  const mx = x + dx / 2;
  const my = y + dy / 2;
  const style = { color: colour, font: theme.font };
  if (side === "left") label(ctx, text, mx - 7, my, { ...style, align: "right" });
  else if (side === "right") label(ctx, text, mx + 7, my, { ...style, align: "left" });
  else if (side === "above") label(ctx, text, mx, Math.min(y, y + dy) - 9, { ...style, align: "center" });
  else label(ctx, text, mx, Math.max(y, y + dy) + 10, { ...style, align: "center" });
}

export const pulleysRenderer: SimulationRenderer<PulleysLayout> = {
  id: "pulleys",
  layout: (width) => computePulleysLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, angleUnit } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width: W, height: H } = layout;
    const cx = W / 2;
    ctx.clearRect(0, 0, W, H);
    const title = (text: string) => label(ctx, text, cx, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const readout = (text: string) => label(ctx, text, cx, 33, { color: theme.text, font: theme.font, align: "center" });
    const caption = (text: string, row = 0) => label(ctx, text, cx, H - 14 - 18 * row, { color: theme.muted, font: theme.font, align: "center" });
    /** A force's name, with its size when the words are on. */
    const named = (name: string, value: number) => (words ? `${name} ${value.toFixed(1)} N` : name);

    if (has("rig")) drawRig();
    else if (has("lift")) drawLift();
    else if (has("car")) drawCar();
    else if (has("road")) drawRoad();
    else if (has("cone")) drawCone();

    function drawRig() {
      const rig = PULLEY_RIG_ORDER[Math.round(num(results.rig))] ?? "atwood";
      const m1 = num(results.m1, 1);
      const m2 = num(results.m2, 1);
      const T = num(results.tension);
      const w1 = num(results.weight1);
      const w2 = num(results.weight2);
      const a1 = num(results.a1);
      const a2 = num(results.a2);
      const dir = num(results.direction);
      const s1 = num(results.travel1) * METRE * dir;
      const s2 = num(results.travel2) * METRE * dir;
      const moves = num(results.moves) === 1;
      const forces = has("forces");
      const pairs = has("pairs");
      const s1Side = blockSide(m1);
      const s2Side = blockSide(m2);

      if (rig === "table") {
        const N = num(results.tableNormal);
        const f = num(results.friction);
        const sc = LONGEST / Math.max(1, N, w1, w2, T, f);
        title("A block on a table, pulled by a hanging block");
        const tableY = 150;
        const edge = W - 90;
        const pr = 12;
        const px = edge + 10;
        const py = tableY - pr - 2;
        // The table: a top and two legs.
        ctx.save();
        ctx.fillStyle = theme.neutral;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(12, tableY, edge - 12, 8);
        ctx.fillRect(24, tableY + 8, 6, 150);
        ctx.fillRect(edge - 30, tableY + 8, 6, 150);
        ctx.restore();
        line(ctx, edge, tableY, px, py, theme.axis, 2);
        pulley(ctx, px, py, pr, theme);
        const h1 = Math.max(30, s1Side);
        const b1x = 70 + s1Side / 2 + s1;
        const b1y = tableY - h1 / 2;
        const stringY = py - pr;
        const b2x = px + pr;
        const b2y = 205 + s2;
        line(ctx, b1x + s1Side / 2, stringY, px, stringY, theme.neutral, 1.5);
        ctx.save();
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, pr, -Math.PI / 2, 0);
        ctx.stroke();
        ctx.restore();
        line(ctx, b2x, py, b2x, b2y - s2Side / 2, theme.neutral, 1.5);
        block(ctx, b1x, b1y, s1Side, h1, "m₁", theme.sine, theme);
        block(ctx, b2x, b2y, s2Side, s2Side, "m₂", theme.cosine, theme);
        if (forces) {
          force(ctx, b1x, b1y - h1 / 2, 0, -N * sc, theme.cosine, named("N", N), "right", theme);
          force(ctx, b1x - 8, b1y + h1 / 2, 0, w1 * sc, theme.sine, named("m₁g", w1), "below", theme);
          force(ctx, b1x + s1Side / 2, stringY - 6, T * sc, 0, theme.tangent, named("T", T), "above", theme);
          if (f > 1e-9) force(ctx, b1x - s1Side / 2, tableY - 5, -f * sc, 0, theme.secant, named("f", f), "above", theme);
          force(ctx, b2x, b2y - s2Side / 2, 0, -T * sc, theme.tangent, named("T", T), "right", theme);
          force(ctx, b2x, b2y + s2Side / 2, 0, w2 * sc, theme.sine, named("m₂g", w2), "right", theme);
        }
        if (pairs) {
          // The table is pushed down and dragged forwards; the string is pulled back and down.
          force(ctx, b1x + 8, tableY, 0, N * sc, theme.cosine, "", "right", theme, true);
          if (f > 1e-9) force(ctx, b1x - s1Side / 2, tableY + 14, f * sc, 0, theme.secant, "", "below", theme, true);
          force(ctx, b1x + s1Side / 2 + T * sc, stringY + 6, -T * sc, 0, theme.tangent, "", "below", theme, true);
          force(ctx, b2x - 7, b2y - s2Side / 2 - T * sc, 0, T * sc, theme.tangent, "", "left", theme, true);
        }
        if (words) {
          readout(moves ? `a = ${fx(a1)} m/s² · T = ${fx(T)} N · f = ${fx(f)} N` : `held by friction · T = ${fx(T)} N · f = ${fx(f)} N`);
          caption(`each block has moved ${fx(num(results.travel1))} m`, 1);
        }
      } else if (rig === "movable") {
        const sc = LONGEST / Math.max(1, w1, w2, 2 * T);
        title("A movable pulley: m₂ moves half as far");
        const top = 44;
        const R = 22;
        const r = 16;
        const fpx = cx - 30;
        const fpy = 72;
        const mpx = fpx + R + r;
        const mpy = 170 - s2;
        const anchor = mpx + r;
        const b1x = fpx - R;
        const b1y = 190 + s1;
        const b2y = mpy + 22 + s2Side / 2;
        line(ctx, 16, top, W - 16, top, theme.axis, 3);
        line(ctx, fpx, top, fpx, fpy, theme.axis, 2);
        pulley(ctx, fpx, fpy, R, theme);
        wrap(ctx, fpx, fpy, R, true, theme);
        line(ctx, b1x, fpy, b1x, b1y - s1Side / 2, theme.neutral, 1.5);
        line(ctx, fpx + R, fpy, fpx + R, mpy, theme.neutral, 1.5);
        pulley(ctx, mpx, mpy, r, theme);
        wrap(ctx, mpx, mpy, r, false, theme);
        line(ctx, anchor, mpy, anchor, top, theme.neutral, 1.5);
        line(ctx, mpx, mpy, mpx, b2y - s2Side / 2, theme.axis, 2);
        block(ctx, b1x, b1y, s1Side, s1Side, "m₁", theme.sine, theme);
        block(ctx, mpx, b2y, s2Side, s2Side, "m₂", theme.cosine, theme);
        if (forces) {
          force(ctx, b1x, b1y - s1Side / 2, 0, -T * sc, theme.tangent, named("T", T), "left", theme);
          force(ctx, b1x, b1y + s1Side / 2, 0, w1 * sc, theme.sine, named("m₁g", w1), "left", theme);
          const lx = anchor + 6;
          arrow(ctx, mpx, b2y - s2Side / 2, mpx, b2y - s2Side / 2 - 2 * T * sc, { color: theme.tangent, width: 2.5, head: 8 });
          label(ctx, words ? `2T ${(2 * T).toFixed(1)} N` : "2T", lx, b2y - s2Side / 2 - T * sc, { color: theme.tangent, font: theme.font });
          arrow(ctx, mpx, b2y + s2Side / 2, mpx, b2y + s2Side / 2 + w2 * sc, { color: theme.sine, width: 2.5, head: 8 });
          label(ctx, words ? `m₂g ${w2.toFixed(1)} N` : "m₂g", lx, b2y + s2Side / 2 + (w2 * sc) / 2, { color: theme.sine, font: theme.font });
        }
        if (pairs) force(ctx, b1x + 7, b1y - s1Side / 2 - T * sc, 0, T * sc, theme.tangent, "", "right", theme, true);
        if (words) {
          // Where each started: m₁ has gone x, the movable pulley x/2.
          const rest1 = 190;
          const rest2 = 170;
          if (Math.abs(s1) > 2) arrow(ctx, b1x - s1Side / 2 - 10, rest1, b1x - s1Side / 2 - 10, b1y, { color: theme.angle, width: 1.5, head: 6, double: true });
          if (Math.abs(s2) > 2) arrow(ctx, mpx - r - 8, rest2, mpx - r - 8, mpy, { color: theme.angle, width: 1.5, head: 6, double: true });
        }
        if (words) {
          readout(`a₁ = ${fx(a1)}, a₂ = ${fx(a2)} m/s² · T = ${fx(T)} N`);
          caption(`moved: x₁ = ${fx(num(results.travel1))} m, x₂ = ${fx(num(results.travel2))} m`, 1);
        }
      } else {
        const sc = LONGEST / Math.max(1, w1, w2, T);
        title("An Atwood machine");
        const R = 22;
        const py = 72;
        const x1 = cx - R;
        const x2 = cx + R;
        const y1 = 200 + s1;
        const y2 = 200 - s1;
        line(ctx, cx - 60, 44, cx + 60, 44, theme.axis, 3);
        line(ctx, cx, 44, cx, py, theme.axis, 2);
        pulley(ctx, cx, py, R, theme);
        wrap(ctx, cx, py, R, true, theme);
        line(ctx, x1, py, x1, y1 - s1Side / 2, theme.neutral, 1.5);
        line(ctx, x2, py, x2, y2 - s2Side / 2, theme.neutral, 1.5);
        block(ctx, x1, y1, s1Side, s1Side, "m₁", theme.sine, theme);
        block(ctx, x2, y2, s2Side, s2Side, "m₂", theme.cosine, theme);
        if (forces) {
          force(ctx, x1, y1 - s1Side / 2, 0, -T * sc, theme.tangent, named("T", T), "left", theme);
          force(ctx, x1, y1 + s1Side / 2, 0, w1 * sc, theme.sine, named("m₁g", w1), "left", theme);
          force(ctx, x2, y2 - s2Side / 2, 0, -T * sc, theme.tangent, named("T", T), "right", theme);
          force(ctx, x2, y2 + s2Side / 2, 0, w2 * sc, theme.sine, named("m₂g", w2), "right", theme);
        }
        if (pairs) {
          force(ctx, x1 + 7, y1 - s1Side / 2 - T * sc, 0, T * sc, theme.tangent, "", "right", theme, true);
          force(ctx, x2 - 7, y2 - s2Side / 2 - T * sc, 0, T * sc, theme.tangent, "", "left", theme, true);
        }
        if (words) {
          readout(moves ? `a = ${fx(a1)} m/s² · T = ${fx(T)} N` : `balanced: a = 0 · T = ${fx(T)} N`);
          caption(`each block has moved ${fx(num(results.travel1))} m`, 1);
        }
      }
      if (pairs) caption("Dashed: each reaction, acting on the other body");
    }

    function drawLift() {
      const M = num(results.personMass, 50);
      const a = num(results.liftAccel);
      const N = num(results.liftNormal);
      const Wt = num(results.personWeight);
      const feel = num(results.feel);
      const sc = 50 / Math.max(1, N, Wt);
      title("A person on a scale in a lift");
      const left = cx - 75;
      const top = 60;
      const floor = 300;
      line(ctx, cx, 44, cx, top, theme.axis, 2);
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.strokeRect(left, top, 150, floor - top);
      ctx.fillStyle = theme.neutral;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(cx - 24, floor - 14, 48, 14);
      ctx.restore();
      // The person, standing on the scale.
      const feet = floor - 14;
      const ink = theme.text;
      circle(ctx, cx, feet - 128, 12, ink);
      line(ctx, cx, feet - 116, cx, feet - 56, ink, 2.5);
      line(ctx, cx, feet - 56, cx - 12, feet, ink, 2.5);
      line(ctx, cx, feet - 56, cx + 12, feet, ink, 2.5);
      line(ctx, cx - 22, feet - 80, cx, feet - 104, ink, 2.5);
      line(ctx, cx + 22, feet - 80, cx, feet - 104, ink, 2.5);
      if (has("forces")) {
        force(ctx, cx + 22, feet, 0, -N * sc, theme.cosine, named("N", N), "right", theme);
        force(ctx, cx - 28, feet - 70, 0, Wt * sc, theme.sine, named("Mg", Wt), "left", theme);
      }
      if (has("pairs")) force(ctx, cx + 30, feet, 0, N * sc, theme.cosine, "", "right", theme, true);
      // The lift's acceleration, outside the cabin.
      const ax = left + 150 + 20;
      if (Math.abs(a) > 1e-9) arrow(ctx, ax, 180, ax, 180 - a * 7, { color: theme.angle, width: 2.5, head: 8 });
      label(ctx, words ? `a ${fx(Math.abs(a), 1)} m/s²` : "a", ax + 6, a >= 0 ? 196 : 164, { color: theme.angle, font: theme.font });
      if (words) {
        label(ctx, `${num(results.scaleReading).toFixed(1)} kg`, cx, floor - 7, { color: theme.text, font: theme.font, align: "center" });
        readout(`N = ${fx(N, 1)} N · Mg = ${fx(Wt, 1)} N (M = ${M.toFixed(0)} kg)`);
        const verdict = feel === -2 ? "free fall: N = 0, weightless" : feel === 1 ? "accelerating up: feels heavier" : feel === -1 ? "accelerating down: feels lighter" : "no acceleration: true weight";
        caption(verdict, 1);
      }
      if (has("pairs")) caption("Dashed: the person pushes the scale down");
    }

    function drawCar() {
      const a = num(results.carAccel);
      const tilt = num(results.tilt);
      const T = num(results.bobTension);
      const mg = num(results.bobWeight);
      const ma = num(results.pseudoForce);
      const inside = num(results.inCarFrame) === 1;
      const sc = 60 / Math.max(0.1, T, mg, ma);
      title("A pendulum hanging in an accelerating car");
      const half = Math.min(110, W / 2 - 24);
      line(ctx, 12, 300, W - 12, 300, theme.axis, 2);
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2;
      ctx.strokeRect(cx - half, 150, 2 * half, 120);
      ctx.restore();
      circle(ctx, cx - half * 0.62, 282, 16, theme.neutral);
      circle(ctx, cx + half * 0.62, 282, 16, theme.neutral);
      if (Math.abs(a) > 1e-9) arrow(ctx, cx - 30, 128, cx - 30 + a * 6, 128, { color: theme.angle, width: 2.5, head: 8 });
      label(ctx, words ? `a ${fx(a, 1)} m/s²` : "a", cx - 38, 128, { color: theme.angle, font: theme.font, align: "right" });
      const pivotY = 158;
      const len = 80;
      const bx = cx - len * Math.sin(tilt);
      const by = pivotY + len * Math.cos(tilt);
      line(ctx, cx, pivotY, bx, by, theme.neutral, 1.5);
      line(ctx, cx, pivotY, cx, pivotY + len + 8, theme.muted, 1, [3, 4]);
      circle(ctx, bx, by, 7, theme.text, true);
      if (has("forces")) {
        force(ctx, bx, by, T * sc * Math.sin(tilt), -T * sc * Math.cos(tilt), theme.tangent, "T", "right", theme);
        force(ctx, bx, by, 0, mg * sc, theme.sine, "mg", "right", theme);
        if (inside) force(ctx, bx, by, -ma * sc, 0, theme.vector, "−ma", "above", theme);
        else force(ctx, bx, by, ma * sc, 0, theme.angle, "ma (net)", "below", theme, true);
      }
      if (words) {
        readout(`θ = ${angleText(tilt, angleUnit)} · T = ${fx(T)} N · ma = ${fx(ma)} N`);
        caption(inside ? "Car frame: pseudo force −ma balances T and mg" : "Ground frame: T's sideways part gives the bob ma");
      }
    }

    function drawRoad() {
      const bank = num(results.bank);
      const N = num(results.roadNormal);
      const mg = PULLEY_CAR_MASS * PULLEY_G;
      const f = num(results.frictionNeeded);
      const need = num(results.centripetal);
      const sc = 70 / Math.max(1, N, mg, Math.abs(f), need);
      title("A car on a banked curve, seen end-on");
      const ox = cx;
      const oy = 230;
      const half = Math.min(120, W / 2 - 40);
      const u = [Math.cos(bank), -Math.sin(bank)] as const;
      const n = [-Math.sin(bank), -Math.cos(bank)] as const;
      line(ctx, ox - half * u[0], oy - half * u[1], ox + half * u[0], oy + half * u[1], theme.neutral, 4);
      line(ctx, ox - half * u[0], oy - half * u[1], ox + half * u[0] * 0.6, oy - half * u[1], theme.muted, 1, [3, 4]);
      label(ctx, "θ", ox - half * u[0] + 30, oy - half * u[1] - 8, { color: theme.angle, font: theme.font });
      const c = [ox + 15 * n[0], oy + 15 * n[1]] as const;
      const corner = (p: number, q: number) => [c[0] + p * 34 * u[0] + q * 15 * n[0], c[1] + p * 34 * u[1] + q * 15 * n[1]] as const;
      ctx.save();
      ctx.strokeStyle = theme.sine;
      ctx.fillStyle = theme.sine;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const ring = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
      ring.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.stroke();
      ctx.restore();
      label(ctx, "← centre of the curve", 14, H - 50, { color: theme.muted, font: theme.font });
      if (has("forces")) {
        force(ctx, c[0], c[1], N * sc * n[0], N * sc * n[1], theme.cosine, "N", "right", theme);
        force(ctx, c[0], c[1], 0, mg * sc, theme.sine, "mg", "right", theme);
        if (Math.abs(f) > 0.01 * mg) force(ctx, ox, oy, -f * sc * u[0], -f * sc * u[1], theme.secant, "f", "below", theme);
        force(ctx, c[0], c[1], -need * sc, 0, theme.angle, "mv²/r", "above", theme, true);
      }
      if (words) {
        readout(`v = ${fx(num(results.speed), 1)} · v₀ = ${fx(num(results.idealSpeed), 1)} · v_max = ${fx(num(results.maxSpeed), 1)} m/s`);
        const skid = num(results.skid);
        const mu = fx(num(results.muNeeded));
        const verdict =
          skid === 1 ? `too fast: skids outwards (needs μ ≥ ${mu})` : skid === -1 ? `too slow: slides down the bank (needs μ ≥ ${mu})` : Math.abs(f) <= 0.01 * mg ? "no friction needed: this is v₀" : `holds the road: needs μ ≥ ${mu}`;
        caption(verdict);
      }
    }

    function drawCone() {
      const L = num(results.stringLength, 1);
      const theta = num(results.coneAngle);
      const phase = num(results.phase);
      const T = num(results.coneTension);
      const mg = num(results.bobWeight, PULLEY_BOB_MASS * PULLEY_G);
      const k = Math.min(70, (W / 2 - 30) / 2);
      const top = 54;
      const lpx = L * k;
      const yc = top + lpx * Math.cos(theta);
      const rpx = lpx * Math.sin(theta);
      const e = 0.28 * rpx;
      title("A conical pendulum");
      line(ctx, cx - 40, top - 4, cx + 40, top - 4, theme.axis, 3);
      line(ctx, cx, top, cx, yc + 10, theme.muted, 1, [3, 4]);
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(cx, yc, Math.max(1, rpx), Math.max(1, e), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      const bx = cx + rpx * Math.cos(phase);
      const by = yc + e * Math.sin(phase);
      line(ctx, cx, top, bx, by, theme.neutral, 1.5);
      circle(ctx, bx, by, 7, theme.text, true);
      label(ctx, "θ", cx + 6, top + 26, { color: theme.angle, font: theme.font });
      if (has("forces")) {
        const sc = 55 / Math.max(0.1, T, mg);
        const d = Math.hypot(cx - bx, top - by) || 1;
        force(ctx, bx, by, ((cx - bx) / d) * T * sc, ((top - by) / d) * T * sc, theme.tangent, "T", bx >= cx ? "right" : "left", theme);
        force(ctx, bx, by, 0, mg * sc, theme.sine, "mg", bx >= cx ? "right" : "left", theme);
        // The resultant, T sin θ = mg tan θ, points at the centre of the circle.
        const dc = Math.hypot(cx - bx, yc - by);
        if (dc > 1) force(ctx, bx, by, ((cx - bx) / dc) * mg * Math.tan(theta) * sc, ((yc - by) / dc) * mg * Math.tan(theta) * sc, theme.angle, "mv²/r", "below", theme, true);
      }
      if (words) {
        readout(`r = ${fx(num(results.coneRadius))} m · v = ${fx(num(results.bobSpeed))} m/s · period ${fx(num(results.conePeriod))} s`);
        caption(`θ = ${angleText(theta, angleUnit)} · tension ${fx(T)} N = mg / cos θ`);
      }
    }
  },
};
