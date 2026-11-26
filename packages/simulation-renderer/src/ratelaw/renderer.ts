/**
 * Three pictures of how fast A → products goes.
 *
 * Rate: the rate against [A] for orders 0, 1 and 2 at the same k — flat,
 * a straight line through the origin, a parabola — with the chosen order
 * bold and the reaction's own point on it.
 *
 * Time: [A], ln[A] or 1/[A] against time. A dashed ruler joins the ends of
 * the curve, so a plot that is not straight visibly bows away from it. On
 * the [A] plot the successive halvings are marked: evenly spaced only at
 * first order.
 *
 * Collisions: the Maxwell–Boltzmann spread of energies at T, with the tail
 * beyond Eₐ shaded — the collisions with enough energy to react.
 */

import { boltzmannDensity, halvingTimes, orderConcentration, RATE_LAW_RUN, RATE_PLOT_IDS, ratePlotValue, type RatePlotId } from "@ise/chemistry-engine";
import { label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

export interface RateLawLayout {
  width: number;
  height: number;
  compact: boolean;
  rect: { x: number; y: number; width: number; height: number };
}

export function computeRateLawLayout(width: number): RateLawLayout {
  const compact = width < 560;
  const height = compact ? 330 : 360;
  const left = compact ? 44 : 60;
  return { width, height, compact, rect: { x: left, y: 20, width: width - left - 24, height: height - 80 } };
}

/** The energy axis, kJ/mol, and the coolest temperature the curve is drawn for. */
export const ENERGY_AXIS = 40;
const COOLEST = 250;

/** The y-range a plot of this kind needs for a run that starts at a0. */
export function ratePlotDomain(plot: RatePlotId, order: number, a0: number, k: number): [number, number] {
  if (plot === "concentration") return [0, a0 * 1.1];
  const end = ratePlotValue(plot, orderConcentration(order, a0, k, RATE_LAW_RUN));
  if (plot === "log") return [Math.max(end, Math.log(a0) - 3.5) - 0.2, Math.max(0.2, Math.log(a0) + 0.2)];
  return [0, Math.min(end, 12 / a0) * 1.1];
}

const ORDER_WORDS = ["zero", "first", "second"] as const;
const PLOT_AXIS: Record<RatePlotId, string> = { concentration: "[A]", log: "ln[A]", inverse: "1/[A]" };
const minus = (v: number, digits: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

function curve(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, colour: string, width: number, dashed = false) {
  const [x0, x1] = plane.xDomain;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  if (dashed) ctx.setLineDash([5, 5]);
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const x = x0 + ((x1 - x0) * i) / 240;
    const [px, py] = plane.toPx(x, f(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, colour: string) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function guide(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export const rateLawRenderer: SimulationRenderer<RateLawLayout> = {
  id: "ratelaw",
  layout: (width) => computeRateLawLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, rect } = layout;
    ctx.clearRect(0, 0, width, height);

    const order = Math.round(num(results.order, 1));
    const a0 = num(results.a0, 1);
    const k = num(results.k, 0.05);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const bottom = rect.y + rect.height;
    // Under the axis, clear of curves that end in the bottom corner.
    const xAxisName = (words: string) => label(ctx, words, rect.x + rect.width, bottom + 28, { color: theme.muted, font: theme.font, align: "right" });

    if (has("rate")) {
      const plane = createPlane(rect, [0, 2], [0, k * 4.4]);
      drawPlane(ctx, plane, theme, { yLabel: "rate" });
      xAxisName("[A] / mol L⁻¹");
      for (const n of [0, 1, 2]) {
        const chosen = n === order;
        curve(ctx, plane, (x) => k * x ** n, chosen ? theme.sine : theme.muted, chosen ? 3 : 1, !chosen);
        // The parabola is steep at the right edge, so its name sits beside it further down.
        const [px, py] = n === 2 ? plane.toPx(1.7, k * 1.7 ** 2) : plane.toPx(2, k * 2 ** n);
        label(ctx, `n = ${n}`, px - (n === 2 ? 10 : 4), py - 9, { color: chosen ? theme.sine : theme.muted, font: theme.font, align: "right" });
      }
      const initial = num(results.initialRate);
      const [px, py] = plane.toPx(a0, initial);
      guide(ctx, px, py, px, bottom, theme.muted);
      guide(ctx, rect.x, py, px, py, theme.muted);
      dot(ctx, px, py, theme.angle);
      if (has("labels")) {
        const power = order === 0 ? "" : order === 1 ? ` × ${a0.toFixed(2)}` : ` × ${a0.toFixed(2)}²`;
        caption(`rate = k[A]${["⁰", "", "²"][order] ?? ""} = ${k.toFixed(2)}${power} = ${initial.toFixed(3)} mol L⁻¹ min⁻¹`);
      }
    }

    if (has("time")) {
      const plot = RATE_PLOT_IDS[Math.round(num(results.plot))] ?? "concentration";
      const plane = createPlane(rect, [0, RATE_LAW_RUN], ratePlotDomain(plot, order, a0, k));
      drawPlane(ctx, plane, theme, { yLabel: PLOT_AXIS[plot] });
      xAxisName("t / min");
      const y = (t: number) => ratePlotValue(plot, orderConcentration(order, a0, k, t));
      // The ruler: a straight line through the first stretch of the curve.
      const slope = (y(0.5) - y(0)) / 0.5;
      curve(ctx, plane, (t) => y(0) + slope * t, theme.muted, 1, true);
      curve(ctx, plane, y, theme.sine, 3);

      const t = num(results.t);
      const [mx, my] = plane.toPx(t, num(results.plotY));
      guide(ctx, mx, rect.y, mx, bottom, theme.muted);
      if (plane.contains(mx, my, 2)) dot(ctx, mx, my, theme.angle);

      if (has("labels")) {
        if (plot === "concentration") {
          const names = ["½", "¼", "⅛"];
          halvingTimes(order, a0, k).forEach((time, i) => {
            if (time > RATE_LAW_RUN) return;
            const [hx, hy] = plane.toPx(time, a0 / 2 ** (i + 1));
            guide(ctx, hx, hy, hx, bottom, theme.angle);
            label(ctx, names[i] ?? "", hx + 4, hy - 9, { color: theme.angle, font: theme.font });
          });
          caption(`[A] = ${num(results.concentration).toFixed(2)} mol/L at ${t.toFixed(0)} min · first t½ = ${num(results.halfLife).toFixed(1)} min`);
        } else if (num(results.straight) === 1) {
          caption(`${PLOT_AXIS[plot]} against t is straight: ${ORDER_WORDS[order] ?? ""} order, slope ${minus(num(results.slope), 3)}`);
        } else {
          caption(`${PLOT_AXIS[plot]} against t bends away from the ruler: not this order's plot`);
        }
      }
    }

    if (has("energy")) {
      const T = num(results.T, 300);
      const Ea = num(results.Ea, 10);
      const peak = boltzmannDensity((8.314 * COOLEST) / 2000, COOLEST);
      const plane = createPlane(rect, [0, ENERGY_AXIS], [0, peak * 1.05]);
      drawPlane(ctx, plane, theme, { yLabel: "share of molecules" });
      xAxisName("energy / kJ mol⁻¹");
      // The tail with enough energy.
      ctx.save();
      clipToPlane(ctx, plane);
      ctx.fillStyle = theme.angle;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      const [sx, sy] = plane.toPx(Ea, 0);
      ctx.moveTo(sx, sy);
      for (let i = 0; i <= 80; i++) {
        const e = Ea + ((ENERGY_AXIS - Ea) * i) / 80;
        const [px, py] = plane.toPx(e, boltzmannDensity(e, T));
        ctx.lineTo(px, py);
      }
      ctx.lineTo(...plane.toPx(ENERGY_AXIS, 0));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (Math.abs(T - 300) > 1) curve(ctx, plane, (e) => boltzmannDensity(e, 300), theme.muted, 1, true);
      curve(ctx, plane, (e) => boltzmannDensity(e, T), theme.sine, 3);
      const [ex] = plane.toPx(Ea, 0);
      guide(ctx, ex, rect.y + 24, ex, bottom, theme.angle);
      const nearEdge = Ea > ENERGY_AXIS * 0.8;
      label(ctx, "Eₐ", ex + (nearEdge ? -6 : 6), rect.y + 34, { color: theme.angle, font: theme.fontStrong, align: nearEdge ? "right" : "left" });
      label(ctx, `${T.toFixed(0)} K`, rect.x + rect.width - 4, rect.y + 64, { color: theme.sine, font: theme.font, align: "right" });
      if (Math.abs(T - 300) > 1) label(ctx, "300 K", rect.x + rect.width - 4, rect.y + 80, { color: theme.muted, font: theme.font, align: "right" });

      if (has("labels")) {
        const fraction = num(results.energyFraction);
        const steric = num(results.steric, 1);
        const shown = fraction >= 0.001 ? fraction.toFixed(3) : `10^${minus(num(results.log10Fraction), 1)}`;
        const react = num(results.effectivePerThousand);
        const count = react >= 10 ? react.toFixed(0) : react >= 0.1 ? react.toFixed(1) : "under 0.1";
        caption(`e^(−Eₐ/RT) = ${shown} · P = ${steric.toFixed(2)} → ${count} in 1000 react`);
      }
    }
  },
};
