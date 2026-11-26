/**
 * Magnetism and matter, in five pictures.
 *
 * Dipole: a short bar magnet with its field lines — closed loops, out of N,
 * round, into S and back through the magnet — and a probe on its axis or
 * its equator with the field there. The magnet is drawn larger than to scale.
 *
 * Torque: the magnet in a uniform field, the torque turning it back into
 * line, and its energy −mB cos θ against θ underneath.
 *
 * Earth: a dip circle seen from the side — the needle at the apparent dip,
 * with B split into B_H and B_V — over a compass showing the declination.
 *
 * Material: a sample in a uniform H, with the field lines pulled in (para,
 * ferro) or pushed out (dia), exaggerated so the weak cases can be seen.
 *
 * Loop: B against H round the hysteresis loop, with the other core's loop
 * on the same axes for comparison.
 */

import {
  MAGMATTER_CORE_ORDER,
  MAGMATTER_CORES,
  MAGMATTER_MATERIAL_ORDER,
  MAGMATTER_MATERIALS,
  MAGMATTER_PLACE_ORDER,
  MAGMATTER_PLACES,
  magmatterLoopPoint,
} from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface MagmatterLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where the magnet, the dip circle or the sample is drawn. */
  stage: Box;
  /** The energy graph under the torque picture. */
  energy: Box;
  /** The compass under the dip circle. */
  compass: Box;
  /** The B–H plot. */
  plot: Box;
}

export function computeMagmatterLayout(width: number): MagmatterLayout {
  const compact = width < 560;
  const height = compact ? 400 : 420;
  const left = compact ? 46 : 58;
  return {
    width,
    height,
    compact,
    stage: { x: 12, y: 30, width: width - 24, height: height - 76 },
    energy: { x: 40, y: 262, width: width - 64, height: height - 262 - 60 },
    compass: { x: 12, y: 268, width: width - 24, height: height - 268 - 34 },
    plot: { x: left, y: 32, width: width - left - 14, height: height - 32 - 66 },
  };
}

const N_COLOUR = "#ef4444";
const S_COLOUR = "#3b82f6";
const SUPERSCRIPTS: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

const minus = (text: string) => text.replace("-", "−");
const fixed = (v: number, digits = 1) => minus((Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits));
/** Three significant figures, with a power of ten for the very small or very large. */
export function magmatterSig(v: number, figures = 3): string {
  if (v === 0 || !Number.isFinite(v)) return "0";
  const a = Math.abs(v);
  if (a >= 0.01 && a < 1e5) return minus(Number(v.toPrecision(figures)).toString());
  const exp = Math.floor(Math.log10(a));
  let mantissa = v / 10 ** exp;
  let e = exp;
  if (Math.abs(Number(mantissa.toFixed(figures - 1))) >= 10) {
    mantissa /= 10;
    e += 1;
  }
  const power = String(e).split("").map((ch) => SUPERSCRIPTS[ch] ?? ch).join("");
  return `${minus(mantissa.toFixed(figures - 1))}×10${power}`;
}
const degrees = (rad: number, digits = 1) => `${fixed((rad * 180) / Math.PI, digits)}°`;

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

function clipBox(ctx: CanvasRenderingContext2D, box: Box) {
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.width, box.height);
  ctx.clip();
}

/** A bar magnet centred at (x, y), turned `angle` (rad, anticlockwise on screen), S at the tail and N at the head. */
function bar(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, thickness: number, angle: number, theme: LabTheme) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-angle);
  ctx.fillStyle = S_COLOUR;
  ctx.fillRect(-length / 2, -thickness / 2, length / 2, thickness);
  ctx.fillStyle = N_COLOUR;
  ctx.fillRect(0, -thickness / 2, length / 2, thickness);
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-length / 2, -thickness / 2, length, thickness);
  ctx.restore();
  const along = (d: number): [number, number] => [x + d * Math.cos(angle), y - d * Math.sin(angle)];
  const [sx, sy] = along(-length / 4);
  const [nx, ny] = along(length / 4);
  label(ctx, "S", sx, sy, { color: "#ffffff", font: theme.fontStrong, align: "center" });
  label(ctx, "N", nx, ny, { color: "#ffffff", font: theme.fontStrong, align: "center" });
}

/** The dipole's field lines, r = k sin²θ: out of N (right), round, back into S (left), and through the magnet. */
function fieldLines(ctx: CanvasRenderingContext2D, box: Box, cx: number, cy: number, reach: number, theme: LabTheme) {
  ctx.save();
  clipBox(ctx, box);
  ctx.strokeStyle = theme.curve;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.4;
  const sizes = [0.2, 0.34, 0.52, 0.78, 1.12, 1.6].map((f) => f * reach);
  for (const k of sizes) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const th = (Math.PI * i) / 160;
        const r = k * Math.sin(th) ** 2;
        const px = cx + r * Math.cos(th);
        const py = cy - side * r * Math.sin(th);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
  // Through the magnet the lines run from S to N, closing every loop.
  ctx.beginPath();
  ctx.moveTo(cx - reach * 0.16, cy);
  ctx.lineTo(cx + reach * 0.16, cy);
  ctx.stroke();
  ctx.restore();
  // The loops cross the equator heading from N back towards S.
  for (const k of sizes) {
    for (const side of [-1, 1]) {
      const y = cy - side * k;
      if (y > box.y + 6 && y < box.y + box.height - 6) arrow(ctx, cx + 6, y, cx - 6, y, { color: theme.curve, width: 1.4, head: 7, alpha: 0.9 });
    }
  }
}

export const magmatterRenderer: SimulationRenderer<MagmatterLayout> = {
  id: "magmatter",
  layout: (width) => computeMagmatterLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, stage } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (text: string, y = height - 14) => label(ctx, text, width / 2, y, { color: theme.text, font: theme.font, align: "center" });
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const cx = stage.x + stage.width / 2;

    if (has("dipole")) {
      const cy = stage.y + stage.height / 2;
      const reach = Math.min(stage.width / 2 - 6, stage.height / 2 - 6);
      // The probe's arrow must still fit at the farthest r.
      const scale = (reach - 40) / 50;
      const r = num(results.r, 20);
      const onAxis = num(results.probe) === 0;
      title(onAxis ? "A short bar magnet: probe on its axis" : "A short bar magnet: probe on its equator");
      fieldLines(ctx, stage, cx, cy, reach, theme);

      if (has("gauss")) {
        // A closed surface round the N pole: every line that leaves comes back in.
        ctx.save();
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(cx + 14, cy, 26, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        label(ctx, "net flux out = 0", cx + 14, cy + 40, { color: theme.angle, font: theme.font, align: "center", background: theme.background });
      }

      bar(ctx, cx, cy, 36, 13, 0, theme);
      const px = onAxis ? cx + r * scale : cx;
      const py = onAxis ? cy : cy - r * scale;
      line(ctx, cx, cy, px, py, theme.muted, 1, [3, 4]);
      const dir = onAxis ? 1 : -1;
      arrow(ctx, px, py, px + dir * 34, py, { color: theme.tangent, width: 3, head: 9 });
      disc(ctx, px, py, 5, theme.angle);
      const rText = `r = ${fixed(r, 0)} cm`;
      if (onAxis) label(ctx, rText, Math.min((cx + px) / 2, width - 40), cy - 14, { color: theme.text, font: theme.font, align: "center", background: theme.background });
      else label(ctx, rText, cx + 10, (cy + py) / 2, { color: theme.text, font: theme.font, background: theme.background });
      label(ctx, "magnet not to scale", stage.x + 2, stage.y + stage.height + 8, { color: theme.muted, font: theme.font });
      if (words) {
        const b = num(results.bProbe);
        caption(`B = ${magmatterSig(b)} µT, ${onAxis ? "along m (axis)" : "against m (equator)"}`);
      }
    }

    if (has("torque")) {
      const cy = stage.y + 108;
      const theta = num(results.theta);
      title("A magnet in a uniform field B");
      // The uniform field: evenly spaced, parallel lines.
      for (let i = -2; i <= 2; i++) {
        const y = cy + i * 40;
        arrow(ctx, stage.x + 6, y, stage.x + stage.width - 6, y, { color: theme.sine, width: 1.2, head: 7, alpha: 0.55 });
      }
      label(ctx, "B", stage.x + stage.width - 10, cy - 92, { color: theme.sine, font: theme.fontStrong, align: "right" });
      const length = Math.min(130, stage.width * 0.42);
      bar(ctx, cx, cy, length, 18, theta, theme);
      // m from S to N.
      const tipX = cx + (length / 2 + 26) * Math.cos(theta);
      const tipY = cy - (length / 2 + 26) * Math.sin(theta);
      arrow(ctx, cx + (length / 2) * Math.cos(theta), cy - (length / 2) * Math.sin(theta), tipX, tipY, { color: theme.angle, width: 3, head: 9 });
      label(ctx, "m", tipX + 8 * Math.cos(theta) + 4, tipY - 8 * Math.sin(theta) - 4, { color: theme.angle, font: theme.fontStrong, align: "center" });
      // θ between the field and the magnet.
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, -theta, 0);
      ctx.stroke();
      ctx.restore();
      if (theta > 0.2) label(ctx, "θ", cx + 40 * Math.cos(theta / 2), cy - 40 * Math.sin(theta / 2), { color: theme.text, font: theme.fontStrong, align: "center" });
      // The torque turns m back towards B.
      if (Math.sin(theta) > 0.05) {
        const rr = length / 2 + 6;
        const from = theta;
        const to = Math.max(0, theta - 0.55);
        ctx.save();
        ctx.strokeStyle = theme.tangent;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, -from, -to);
        ctx.stroke();
        ctx.restore();
        const hx = cx + rr * Math.cos(to);
        const hy = cy - rr * Math.sin(to);
        arrow(ctx, hx - 6 * Math.sin(to), hy - 6 * Math.cos(to), hx, hy, { color: theme.tangent, width: 2.5, head: 9 });
        label(ctx, "τ", cx + (rr + 14) * Math.cos((from + to) / 2), cy - (rr + 14) * Math.sin((from + to) / 2), { color: theme.tangent, font: theme.fontStrong, align: "center" });
      }

      // U = −mB cos θ against θ.
      const e = layout.energy;
      const toPx = (t: number, u: number): [number, number] => [e.x + (t / Math.PI) * e.width, e.y + e.height / 2 - (u * e.height) / 2.4];
      line(ctx, e.x, e.y + e.height / 2, e.x + e.width, e.y + e.height / 2, theme.axis, 1);
      line(ctx, e.x, e.y, e.x, e.y + e.height, theme.axis, 1);
      ctx.save();
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const t = (Math.PI * i) / 90;
        const [x, y] = toPx(t, -Math.cos(t));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      const [dx, dy] = toPx(theta, -Math.cos(theta));
      disc(ctx, dx, dy, 5, theme.angle);
      label(ctx, "U", e.x - 8, e.y + 4, { color: theme.curve, font: theme.fontStrong, align: "right" });
      label(ctx, "−mB", e.x - 6, toPx(0, -1)[1], { color: theme.muted, font: theme.font, align: "right" });
      label(ctx, "+mB", e.x - 6, toPx(0, 1)[1], { color: theme.muted, font: theme.font, align: "right" });
      for (const [t, text] of [[Math.PI / 2, "90°"], [Math.PI, "θ = 180°"]] as const) {
        label(ctx, text, toPx(t, 0)[0], e.y + e.height + 10, { color: theme.muted, font: theme.font, align: t === Math.PI ? "right" : "center" });
      }
      if (words) {
        caption(`τ = ${magmatterSig(num(results.torque))} N m · U = ${magmatterSig(num(results.energy))} J`, height - 30);
        caption(`small swings: T = ${magmatterSig(num(results.period))} s`);
      }
    }

    if (has("earth")) {
      const place = MAGMATTER_PLACES[MAGMATTER_PLACE_ORDER[Math.round(num(results.place))] ?? "delhi"];
      const total = num(results.total, 1);
      const dip = num(results.dip);
      const apparent = num(results.apparentDip);
      const tilt = num(results.tilt);
      title(`${place.label}: the Earth's field is ${fixed(total, 0)} µT`);

      // The dip circle, side on, magnetic north to the right.
      const cy = stage.y + 116;
      const radius = Math.min(stage.width / 2 - 40, 92);
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      line(ctx, cx - radius - 10, cy, cx + radius + 10, cy, theme.muted, 1, [4, 4]);
      label(ctx, "horizontal", cx - radius - 8, cy - 9, { color: theme.muted, font: theme.font });

      // B and its parts, in the magnetic meridian.
      const k = (radius * 0.9) / 60;
      const bh = num(results.bH) * k;
      const bv = num(results.bV) * k;
      arrow(ctx, cx, cy, cx + bh, cy, { color: theme.sine, width: 2.5, head: 8 });
      arrow(ctx, cx + bh, cy, cx + bh, cy + bv, { color: theme.cosine, width: 2.5, head: 8 });
      label(ctx, "B_H", cx + bh / 2, cy - 10, { color: theme.sine, font: theme.fontStrong, align: "center" });
      if (bv > 14) label(ctx, "B_V", cx + bh + 8, cy + bv / 2, { color: theme.cosine, font: theme.fontStrong });

      // The needle, at the dip it shows in this plane.
      const nx = Math.cos(apparent) * radius * 0.82;
      const ny = Math.sin(apparent) * radius * 0.82;
      line(ctx, cx - nx, cy - ny, cx, cy, S_COLOUR, 5);
      line(ctx, cx, cy, cx + nx, cy + ny, N_COLOUR, 5);
      disc(ctx, cx, cy, 4, theme.text);
      label(ctx, "N", cx + nx + 10 * Math.cos(apparent), cy + ny + 10 * Math.sin(apparent), { color: N_COLOUR, font: theme.fontStrong, align: "center" });
      if (tilt > 0.01) label(ctx, `circle turned ${degrees(tilt, 0)} from the meridian`, cx, cy + radius + 14, { color: theme.text, font: theme.font, align: "center" });
      else label(ctx, "circle in the magnetic meridian", cx, cy + radius + 14, { color: theme.text, font: theme.font, align: "center" });

      // A compass from above: true north up, magnetic north off it by the declination.
      const box = layout.compass;
      const ccy = box.y + box.height / 2;
      const cr = Math.min(box.height / 2 - 4, 40);
      const ccx = box.x + cr + 8;
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      arrow(ctx, ccx, ccy, ccx, ccy - cr + 2, { color: theme.neutral, width: 1.5, head: 7, dash: [3, 3] });
      const usable = num(results.compass) === 1;
      const tx = box.x + 2 * cr + 22;
      if (usable) {
        const d = num(results.declination);
        arrow(ctx, ccx, ccy, ccx + (cr - 4) * Math.sin(d), ccy - (cr - 4) * Math.cos(d), { color: N_COLOUR, width: 3, head: 8 });
        label(ctx, "dashed: true north", tx, ccy - 10, { color: theme.muted, font: theme.font });
        label(ctx, "red: where the compass points", tx, ccy + 8, { color: theme.text, font: theme.font });
        if (words) label(ctx, `declination ${fixed(Math.abs((d * 180) / Math.PI), 1)}° ${d >= 0 ? "E" : "W"}`, tx, ccy + 26, { color: theme.angle, font: theme.font });
      } else {
        label(ctx, "no horizontal field:", tx, ccy - 8, { color: theme.text, font: theme.font });
        label(ctx, "a compass cannot point", tx, ccy + 10, { color: theme.text, font: theme.font });
      }
      if (words) caption(`B_H = ${fixed(num(results.bH))} µT · B_V = ${fixed(num(results.bV))} µT · dip ${degrees(dip)}`);
      else caption("The needle's N end dips below the horizontal");
    }

    if (has("material")) {
      const material = MAGMATTER_MATERIALS[MAGMATTER_MATERIAL_ORDER[Math.round(num(results.material))] ?? "iron"];
      const kind = Math.round(num(results.kind));
      const temperature = num(results.temperature, 300);
      title(`${material.label} at ${fixed(temperature, 0)} K, inside a solenoid`);
      const cy = stage.y + stage.height / 2 - 10;
      const sw = Math.min(140, stage.width * 0.38);
      const sh = Math.min(96, stage.height * 0.36);
      // Lines pulled in by a para- or ferromagnet, pushed out by a diamagnet — exaggerated for the weak ones.
      const pull = kind === 2 ? 0.55 : kind === 1 ? 0.2 : -0.2;
      ctx.save();
      clipBox(ctx, stage);
      ctx.fillStyle = theme.neutral;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.roundRect(cx - sw / 2, cy - sh / 2, sw, sh, 10);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - sw / 2, cy - sh / 2, sw, sh, 10);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      clipBox(ctx, stage);
      ctx.strokeStyle = theme.sine;
      ctx.lineWidth = 1.4;
      for (let i = -4; i <= 4; i++) {
        const y0 = cy + i * 26;
        ctx.beginPath();
        for (let j = 0; j <= 120; j++) {
          const x = stage.x + (stage.width * j) / 120;
          const g = Math.exp(-(((x - cx) / (sw * 0.6)) ** 2));
          const y = y0 + (cy - y0) * pull * g;
          if (j === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
      arrow(ctx, stage.x + 8, stage.y + 12, stage.x + 56, stage.y + 12, { color: theme.sine, width: 2.5, head: 8 });
      label(ctx, "H", stage.x + 62, stage.y + 12, { color: theme.sine, font: theme.fontStrong });
      // M inside the sample: along H, or (diamagnet) against it.
      const mLength = kind === 2 ? sw * 0.6 : 16;
      const mDir = kind === 0 ? -1 : 1;
      arrow(ctx, cx - (mDir * mLength) / 2, cy + sh / 2 - 14, cx + (mDir * mLength) / 2, cy + sh / 2 - 14, { color: theme.angle, width: 3, head: 8 });
      label(ctx, "M", cx, cy + sh / 2 - 28, { color: theme.angle, font: theme.fontStrong, align: "center" });
      label(ctx, "lines bent more than they really are", stage.x + stage.width - 2, stage.y + 12, { color: theme.muted, font: theme.font, align: "right" });
      if (words) {
        const what = kind === 2 ? "ferromagnetic" : kind === 1 ? "paramagnetic" : "diamagnetic";
        label(ctx, what, cx, cy - sh / 2 - 12, { color: theme.angle, font: theme.fontStrong, align: "center", background: theme.background });
        caption(`H = ${magmatterSig(num(results.hField))} A/m · M = ${magmatterSig(num(results.magnetisation))} A/m`, height - 30);
        caption(`χ = ${magmatterSig(num(results.chi))} · B = μ₀(H + M) = ${magmatterSig(num(results.bInside))} T`);
      }
    }

    if (has("loop")) {
      const coreId = MAGMATTER_CORE_ORDER[Math.round(num(results.core))] ?? "steel";
      const core = MAGMATTER_CORES[coreId];
      const hMax = core.maxField;
      title(`${core.label}: B against H, round and round`);
      const plane = createPlane(layout.plot, [-1.1 * hMax, 1.1 * hMax], [-1.8, 1.8]);
      drawPlane(ctx, plane, theme, { xLabel: "H / (A/m)", yLabel: "B / T" });
      const trace = (id: typeof coreId, colour: string, width: number, alpha: number, dash?: number[]) => {
        const c = MAGMATTER_CORES[id];
        ctx.save();
        clipToPlane(ctx, plane);
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.globalAlpha = alpha;
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        for (let i = 0; i <= 400; i++) {
          const p = magmatterLoopPoint(c, i / 400);
          const [x, y] = plane.toPx(p.h, p.b);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      };
      if (has("compare")) {
        const other = coreId === "steel" ? "soft-iron" : "steel";
        trace(other, theme.secant, 1.5, 0.7, [5, 4]);
        label(ctx, `dashed: ${MAGMATTER_CORES[other].label.toLowerCase()}, same axes`, layout.plot.x + 4, layout.plot.y + layout.plot.height + 30, { color: theme.secant, font: theme.font });
      }
      trace(coreId, theme.curve, 2.5, 1);
      const [px, py] = plane.toPx(num(results.hLoop), num(results.bLoop));
      disc(ctx, px, py, 5.5, theme.angle);
      const falling = num(results.falling) === 1;
      label(ctx, falling ? "H falling" : "H rising", px, py + (num(results.bLoop) > 0 ? 16 : -16), { color: theme.angle, font: theme.font, align: "center", background: theme.background });
      if (words) {
        const [, by] = plane.toPx(0, core.retentivity);
        const [ox] = plane.toPx(0, 0);
        disc(ctx, ox, by, 4, theme.tangent);
        label(ctx, `B_r = ${fixed(core.retentivity, 1)} T`, ox + 8, by - 10, { color: theme.tangent, font: theme.font, background: theme.background });
        const [hx, oy] = plane.toPx(-core.coercivity, 0);
        disc(ctx, hx, oy, 4, theme.cosine);
        label(ctx, `−H_c = −${core.coercivity} A/m`, Math.max(hx, layout.plot.x + 60), oy + 16, { color: theme.cosine, font: theme.font, align: "center", background: theme.background });
        caption(`H = ${fixed(num(results.hLoop), 0)} A/m · B = ${fixed(num(results.bLoop), 2)} T`);
      }
    }
  },
};
