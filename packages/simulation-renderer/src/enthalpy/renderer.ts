/**
 * Energy diagrams for a reaction.
 *
 * Hess: the reactants and the products at their enthalpies, with the
 * elements at zero. The direct arrow is ΔH; the other route goes down (or
 * up) to the elements and back — and arrives at the same place.
 *
 * Bonds: from the reactants, up by the energy needed to break every bond
 * into separate atoms, then down by the energy released forming the
 * products' bonds. Where it ends is the estimate of ΔH.
 */

import { ENTHALPY_ORDER, ENTHALPY_REACTIONS, reactionEquation } from "@ise/chemistry-engine";
import { arrow, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface EnthalpyLayout {
  width: number;
  height: number;
  compact: boolean;
  top: number;
  bottom: number;
}

export function computeEnthalpyLayout(width: number): EnthalpyLayout {
  const compact = width < 560;
  const height = compact ? 340 : 360;
  return { width, height, compact, top: 52, bottom: height - 62 };
}

/** A y for each enthalpy, fitting the given values between top and bottom (higher enthalpy higher up). */
export function enthalpyScale(layout: EnthalpyLayout, values: readonly number[]): (h: number) => number {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(hi - lo, 1);
  return (h) => layout.bottom - ((h - lo) / span) * (layout.bottom - layout.top);
}

const kJ = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(Math.round(v * 10) / 10)} kJ`;

function level(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, colour: string, text: string, theme: LabTheme, dashed = false) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  if (dashed) ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
  // Names sit under their line, clear of the arrows' numbers above.
  label(ctx, text, (x1 + x2) / 2, y + 13, { color: theme.text, font: theme.font, align: "center" });
}

/** Text on a small background patch, so a line running behind it does not cross it out. */
function badge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, colour: string, font: string, theme: LabTheme) {
  ctx.save();
  ctx.font = font;
  const w = ctx.measureText(text).width + 8;
  ctx.fillStyle = theme.background;
  ctx.fillRect(x - w / 2, y - 9, w, 18);
  ctx.restore();
  label(ctx, text, x, y, { color: colour, font, align: "center" });
}

export const enthalpyRenderer: SimulationRenderer<EnthalpyLayout> = {
  id: "enthalpy",
  layout: (width) => computeEnthalpyLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, compact } = layout;
    ctx.clearRect(0, 0, width, height);

    const r = ENTHALPY_REACTIONS[ENTHALPY_ORDER[Math.round(num(results.reaction))] ?? "methane-liquid"];
    const deltaH = num(results.deltaH);
    label(ctx, reactionEquation(r), width / 2, 18, { color: theme.text, font: compact ? theme.font : theme.fontStrong, align: "center" });
    const colW = compact ? 88 : 130;
    const leftX = 16;
    const rightX = width - 16 - colW;

    if (has("hess")) {
      const rH = num(results.reactantsH);
      const pH = num(results.productsH);
      const y = enthalpyScale(layout, [rH, pH, 0]);
      const midX = width / 2;
      level(ctx, midX - colW / 2, midX + colW / 2, y(0), theme.muted, "elements (0)", theme, true);
      level(ctx, leftX, leftX + colW, y(rH), theme.sine, "reactants", theme);
      level(ctx, rightX, rightX + colW, y(pH), theme.cosine, "products", theme);
      // The direct route.
      arrow(ctx, leftX + colW, y(rH), rightX, y(pH), { color: theme.angle, width: 2.5, head: 9 });
      if (has("labels")) badge(ctx, `ΔH = ${kJ(deltaH)}`, midX, (y(rH) + y(pH)) / 2, theme.angle, theme.fontStrong, theme);
      // The Hess route, through the elements.
      if (Math.abs(rH) > 0.05) arrow(ctx, leftX + colW / 2, y(rH), midX - colW / 2, y(0), { color: theme.muted, width: 1.5, head: 7 });
      if (Math.abs(pH) > 0.05) arrow(ctx, midX + colW / 2, y(0), rightX + colW / 2, y(pH), { color: theme.muted, width: 1.5, head: 7 });
      if (has("labels")) {
        if (Math.abs(rH) > 0.05) badge(ctx, kJ(-rH), (leftX + colW / 2 + midX - colW / 2) / 2, (y(rH) + y(0)) / 2 - 12, theme.muted, theme.font, theme);
        if (Math.abs(pH) > 0.05) badge(ctx, kJ(pH), (midX + colW / 2 + rightX + colW / 2) / 2 + 14, (y(pH) + y(0)) / 2, theme.muted, theme.font, theme);
      }
    }

    if (has("bonds")) {
      if (num(results.hasBonds) !== 1) {
        label(ctx, "Bond enthalpies are for gases — this reaction has a solid or liquid in it", width / 2, height / 2, { color: theme.muted, font: theme.font, align: "center" });
      } else {
        const broken = num(results.bondsBroken);
        const est = num(results.bondEstimate);
        const y = enthalpyScale(layout, [0, broken, est]);
        const midX = width / 2;
        level(ctx, leftX, leftX + colW, y(0), theme.sine, "reactants", theme);
        level(ctx, midX - colW / 2, midX + colW / 2, y(broken), theme.muted, "separate atoms", theme, true);
        level(ctx, rightX, rightX + colW, y(est), theme.cosine, "products", theme);
        arrow(ctx, leftX + colW / 2, y(0), leftX + colW / 2, y(broken) + 4, { color: theme.secant, width: 2.5, head: 9 });
        arrow(ctx, rightX + colW / 2, y(broken) + 4, rightX + colW / 2, y(est), { color: theme.tangent, width: 2.5, head: 9 });
        if (has("labels")) {
          label(ctx, `break: ${kJ(broken)}`, leftX + colW / 2 + 8, (y(0) + y(broken)) / 2, { color: theme.secant, font: theme.font, align: "left" });
          label(ctx, `form: ${kJ(-num(results.bondsFormed))}`, rightX + colW / 2 - 8, (y(broken) + y(est)) / 2, { color: theme.tangent, font: theme.font, align: "right" });
        }
      }
    }

    if (has("labels")) {
      const n = num(results.n, 1);
      const heat = num(results.heat);
      let words: string;
      if (has("bonds") && num(results.hasBonds) === 1) words = `Estimate ${kJ(num(results.bondEstimate))}/mol from bonds; from formation enthalpies ${kJ(deltaH)}/mol`;
      else words = `${deltaH < 0 ? "Exothermic" : "Endothermic"}: ${n} mol of reaction ${heat >= 0 ? `releases ${Math.abs(heat)}` : `takes in ${Math.abs(heat)}`} kJ`;
      label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
