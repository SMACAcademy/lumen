/**
 * Vapour pressure against composition, and a gas dissolving in water.
 *
 * Raoult: x_A runs from pure B on the left to pure A on the right. The two
 * partial pressures and their total are drawn solid; Raoult's ideal straight
 * lines dashed behind them, so a deviation shows as a bulge above or a sag
 * below. The chosen mixture is marked, and an azeotrope where the total
 * turns over.
 *
 * Henry: a flask of water under a gas; more pressure pushes more molecules
 * into the water, and a more soluble gas (CO₂) sends far more.
 */

import { HENRY_GAS_ORDER, HENRY_GASES, LIQUID_PAIR_ORDER, LIQUID_PAIRS, vapourPressures } from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import { createPlane, drawPlane, type Plane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

export interface RaoultLayout {
  width: number;
  height: number;
  compact: boolean;
  rect: { x: number; y: number; width: number; height: number };
}

export function computeRaoultLayout(width: number): RaoultLayout {
  const compact = width < 560;
  const height = compact ? 330 : 360;
  const left = compact ? 44 : 60;
  return { width, height, compact, rect: { x: left, y: 20, width: width - left - 24, height: height - 80 } };
}

/** Deterministic scatter, 0–1 in each direction. */
function scatter(i: number): [number, number] {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return [a - Math.floor(a), b - Math.floor(b)];
}

export const raoultRenderer: SimulationRenderer<RaoultLayout> = {
  id: "raoult",
  layout: (width) => computeRaoultLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height } = layout;
    ctx.clearRect(0, 0, width, height);

    if (has("curves")) {
      const pair = LIQUID_PAIRS[LIQUID_PAIR_ORDER[Math.round(num(results.pair))] ?? "benzene-toluene"];
      let top = Math.max(pair.pA, pair.pB);
      for (let i = 0; i <= 50; i++) top = Math.max(top, vapourPressures(pair, i / 50).total);
      const plane: Plane = createPlane(layout.rect, [0, 1], [0, Math.ceil((top * 1.15) / 5) * 5]);
      drawPlane(ctx, plane, theme, { xLabel: `x(${pair.a})`, yLabel: "p / kPa" });
      const line = (f: (x: number) => number, colour: string, width: number, dashed: boolean) => {
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        if (dashed) ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const [px, py] = plane.toPx(i / 60, f(i / 60));
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      };
      if (pair.margules !== 0) {
        line((x) => x * pair.pA, theme.sine, 1, true);
        line((x) => (1 - x) * pair.pB, theme.cosine, 1, true);
        line((x) => x * pair.pA + (1 - x) * pair.pB, theme.angle, 1, true);
      }
      line((x) => vapourPressures(pair, x).pA, theme.sine, 2, false);
      line((x) => vapourPressures(pair, x).pB, theme.cosine, 2, false);
      line((x) => vapourPressures(pair, x).total, theme.angle, 3, false);

      const xA = num(results.xA);
      const [mx] = plane.toPx(xA, 0);
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(mx, layout.rect.y);
      ctx.lineTo(mx, layout.rect.y + layout.rect.height);
      ctx.stroke();
      ctx.restore();
      for (const [value, colour] of [[num(results.pA), theme.sine], [num(results.pB), theme.cosine], [num(results.pTotal), theme.angle]] as const) {
        const [px, py] = plane.toPx(xA, value);
        ctx.save();
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (num(results.azeotrope) === 1) {
        const ax = num(results.azeotropeX);
        const [px, py] = plane.toPx(ax, vapourPressures(pair, ax).total);
        ctx.save();
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        label(ctx, "azeotrope", px, py + (pair.margules > 0 ? -16 : 18), { color: theme.text, font: theme.font, align: "center" });
      }
      label(ctx, `pure ${pair.b}`, layout.rect.x, layout.rect.y + layout.rect.height + 24, { color: theme.cosine, font: theme.font, align: "left" });
      label(ctx, `pure ${pair.a}`, layout.rect.x + layout.rect.width, layout.rect.y + layout.rect.height + 24, { color: theme.sine, font: theme.font, align: "right" });

      if (has("labels")) {
        const sign = num(results.deviationSign);
        // Short enough for a phone.
        const kind = sign === 0 ? "ideal" : sign > 0 ? "positive deviation" : "negative deviation";
        const words = `p = ${num(results.pTotal).toFixed(1)} kPa · ${kind} · vapour ${Math.round(num(results.yA) * 100)}% ${pair.a}`;
        label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
      }
    }

    if (has("flask")) {
      const gas = HENRY_GASES[HENRY_GAS_ORDER[Math.round(num(results.gas))] ?? "o2"];
      const pressure = num(results.pressure, 1);
      const fw = Math.min(200, width * 0.5);
      const fx = (width - fw) / 2;
      const top = 40;
      const bottom = height - 60;
      const waterTop = top + (bottom - top) * 0.45;
      ctx.save();
      ctx.fillStyle = theme.sine;
      ctx.globalAlpha = 0.18;
      ctx.fillRect(fx, waterTop, fw, bottom - waterTop);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.strokeRect(fx, top, fw, bottom - top);
      // The piston pressing down.
      ctx.fillStyle = theme.reference;
      ctx.fillRect(fx - 4, top - 10, fw + 8, 10);
      ctx.restore();
      // Gas above: more molecules for more pressure.
      const above = clamp(Math.round(pressure * 4), 1, 40);
      for (let i = 0; i < above; i++) {
        const [u, v] = scatter(i + 1);
        ctx.save();
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.arc(fx + 8 + u * (fw - 16), top + 8 + v * (waterTop - top - 16), 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Dissolved: in proportion to the mole fraction.
      const dissolved = clamp(Math.round(num(results.solubility) * 0.04), 0, 60);
      for (let i = 0; i < dissolved; i++) {
        const [u, v] = scatter(i + 200);
        ctx.save();
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.arc(fx + 8 + u * (fw - 16), waterTop + 8 + v * (bottom - waterTop - 16), 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      label(ctx, `${gas.formula} at ${pressure.toFixed(1)} bar`, width / 2, top - 22, { color: theme.text, font: theme.fontStrong, align: "center" });
      label(ctx, "water", fx + fw + 8, (waterTop + bottom) / 2, { color: theme.muted, font: theme.font, align: "left" });
      if (has("labels")) {
        const words = `x = p / K_H = ${pressure.toFixed(1)} / ${Math.round(gas.kH * 1000)} bar → ${num(results.mmolPerL).toFixed(2)} mmol per litre`;
        label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
      }
    }
  },
};
