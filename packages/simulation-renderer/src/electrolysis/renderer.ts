/**
 * Electrolysis, and conductance.
 *
 * The cell: a battery drives current into two electrodes in a beaker.
 * Cations drift to the cathode (−) and anions to the anode (+). A metal
 * builds up as a layer on the cathode, thicker with the mass deposited; a gas
 * rises as bubbles, more with the volume made.
 *
 * The plot: molar conductivity against √c for every solute. Strong
 * electrolytes are straight lines, extrapolated (dashed) back to Λ°m at
 * √c = 0; the weak acid rises steeply only at great dilution. The chosen
 * solute is drawn bold with its current point.
 */

import { ELECTROLYTE_ORDER, ELECTROLYTES, IONIC_SOLUTE_ORDER, IONIC_SOLUTES, MAX_C, MIN_C, molarConductivity } from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import { createPlane, drawPlane, type Plane } from "../shared/plane";
import type { SimulationRenderer } from "../types";

export interface ElectrolysisLayout {
  width: number;
  height: number;
  compact: boolean;
  plane: Plane;
}

export const PLOT_SQRT_C = 0.33;
export const PLOT_LAMBDA = 450;

export function computeElectrolysisLayout(width: number): ElectrolysisLayout {
  const compact = width < 560;
  const height = compact ? 330 : 360;
  const left = compact ? 44 : 60;
  const plane = createPlane({ x: left, y: 16, width: width - left - 16, height: height - 70 }, [0, PLOT_SQRT_C], [0, PLOT_LAMBDA]);
  return { width, height, compact, plane };
}

const METAL_COLOUR: Record<string, string> = { Cu: "#b45309", Ag: "#cbd5e1", Na: "#a3a3a3" };

export const electrolysisRenderer: SimulationRenderer<ElectrolysisLayout> = {
  id: "electrolysis",
  layout: (width) => computeElectrolysisLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, compact } = layout;
    ctx.clearRect(0, 0, width, height);

    if (has("cell")) {
      const cell = ELECTROLYTES[ELECTROLYTE_ORDER[Math.round(num(results.electrolyte))] ?? "copper-sulfate"];
      const L = width * (compact ? 0.1 : 0.2);
      const R = width - L;
      const top = 100;
      const bottom = height - 64;
      const cathodeX = L + (R - L) * 0.22;
      const anodeX = R - (R - L) * 0.22;
      const time = num(results.time);

      // Beaker and liquid.
      ctx.save();
      ctx.fillStyle = cell.label.startsWith("Molten") ? theme.secant : theme.sine;
      ctx.globalAlpha = 0.14;
      ctx.fillRect(L, top + 14, R - L, bottom - top - 14);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(L, top);
      ctx.lineTo(L, bottom);
      ctx.lineTo(R, bottom);
      ctx.lineTo(R, top);
      ctx.stroke();
      ctx.restore();

      // Battery and wires.
      const bx = width / 2;
      const by = 40;
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cathodeX, top + 20);
      ctx.lineTo(cathodeX, by);
      ctx.lineTo(bx - 8, by);
      ctx.moveTo(bx + 8, by);
      ctx.lineTo(anodeX, by);
      ctx.lineTo(anodeX, top + 20);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - 8, by - 12);
      ctx.lineTo(bx - 8, by + 12);
      ctx.moveTo(bx + 8, by - 7);
      ctx.lineTo(bx + 8, by + 7);
      ctx.stroke();
      ctx.restore();
      label(ctx, `I = ${num(results.current).toFixed(1)} A`, bx + 18, by + 18, { color: theme.text, font: theme.fontStrong, align: "left" });

      // Electrodes.
      for (const [x, name] of [[cathodeX, "cathode (−)"], [anodeX, "anode (+)"]] as const) {
        ctx.save();
        ctx.fillStyle = theme.reference;
        ctx.fillRect(x - 6, top + 20, 12, bottom - top - 40);
        ctx.restore();
        label(ctx, name, x, top + 8, { color: theme.muted, font: theme.font, align: "center" });
      }

      if (has("ions")) {
        const n = compact ? 8 : 10;
        for (let i = 0; i < n; i++) {
          const phase = (((time * 0.08 + i / n) % 1) + 1) % 1;
          const y = top + 34 + ((i * 37) % Math.max(20, bottom - top - 70));
          const plusX = anodeX - 14 - phase * (anodeX - cathodeX - 28);
          const minusX = cathodeX + 14 + phase * (anodeX - cathodeX - 28);
          for (const [x, sign, colour] of [[plusX, "+", theme.sine], [minusX, "−", theme.cosine]] as const) {
            ctx.save();
            ctx.fillStyle = colour;
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            label(ctx, sign, x, y, { color: theme.background, font: theme.fontStrong, align: "center" });
          }
        }
      }

      if (has("products")) {
        const drawGas = (x: number, litres: number, side: 1 | -1) => {
          const bubbles = clamp(Math.round(litres * 12), litres > 0 ? 1 : 0, 16);
          for (let i = 0; i < bubbles; i++) {
            const rise = (((time * 0.15 + i / bubbles) % 1) + 1) % 1;
            const y = bottom - 26 - rise * (bottom - top - 60);
            ctx.save();
            ctx.strokeStyle = theme.text;
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(x + side * (10 + (i % 3) * 4), y, 3 + (i % 2), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        };
        const mass = num(results.cathodeMass);
        if (num(results.cathodeIsGas) === 1) drawGas(cathodeX, num(results.cathodeGas), 1);
        else if (mass > 0) {
          const thick = clamp(1 + mass * 1.5, 1, 12);
          ctx.save();
          ctx.fillStyle = METAL_COLOUR[cell.cathode.formula] ?? theme.neutral;
          ctx.fillRect(cathodeX + 6, top + 40, thick, bottom - top - 60);
          ctx.restore();
        }
        drawGas(anodeX, num(results.anodeGas), -1);
        // Amounts only with the words on, so an estimate can hide them; the names always.
        const words = has("labels");
        const cathodeAmount = cell.cathode.kind === "metal" ? `${num(results.cathodeMass).toFixed(3)} g` : `${num(results.cathodeGas).toFixed(3)} L`;
        label(ctx, words ? `${cell.cathode.formula}: ${cathodeAmount}` : cell.cathode.formula, cathodeX, bottom + 14, { color: theme.text, font: theme.fontStrong, align: "center" });
        label(ctx, words ? `${cell.anode.formula}: ${num(results.anodeGas).toFixed(3)} L` : cell.anode.formula, anodeX, bottom + 14, { color: theme.text, font: theme.fontStrong, align: "center" });
      }

      if (has("labels")) {
        label(ctx, `Q = It = ${num(results.current).toFixed(1)} A × ${time.toFixed(1)} min × 60 = ${Math.round(num(results.charge))} C`, 12, 14, { color: theme.muted, font: theme.font, align: "left" });
        const product = cell.cathode.kind === "metal" ? `${num(results.cathodeMass).toFixed(3)} g of ${cell.cathode.name}` : `${num(results.cathodeGas).toFixed(3)} L of ${cell.cathode.name}`;
        label(ctx, `${num(results.molesElectrons).toFixed(4)} mol of electrons → ${product}`, width / 2, height - 16, { color: theme.text, font: theme.font, align: "center" });
      }
    }

    if (has("plot")) {
      const { plane } = layout;
      drawPlane(ctx, plane, theme, { xLabel: "√c", yLabel: "Λm" });
      const chosen = IONIC_SOLUTE_ORDER[Math.round(num(results.solute))] ?? "kcl";
      for (const id of IONIC_SOLUTE_ORDER) {
        const solute = IONIC_SOLUTES[id];
        const bold = id === chosen;
        const colour = bold ? theme.angle : theme.muted;
        const points: [number, number][] = [];
        for (let i = 0; i <= 60; i++) {
          const s = Math.sqrt(MIN_C) + ((Math.sqrt(MAX_C) - Math.sqrt(MIN_C)) * i) / 60;
          points.push(plane.toPx(s, molarConductivity(solute, s * s)));
        }
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.lineWidth = bold ? 3 : 1.5;
        ctx.beginPath();
        points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
        if (solute.Ka === null) {
          // Kohlrausch: extrapolate the straight line back to infinite dilution.
          const [x0, y0] = plane.toPx(0, solute.lambdaZero);
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(points[0]![0], points[0]![1]);
          ctx.lineTo(x0, y0);
          ctx.stroke();
        }
        ctx.restore();
        // The weak acid's curve hugs the axis at the right, so it is named further up its rise.
        const [lx, ly] = points[solute.Ka === null ? points.length - 1 : 12]!;
        label(ctx, solute.formula, Math.min(lx + 4, width - 4), ly - 8, { color: colour, font: bold ? theme.fontStrong : theme.font, align: solute.Ka === null ? "right" : "left" });
      }
      const [px, py] = plane.toPx(num(results.sqrtC), num(results.lambda));
      ctx.save();
      ctx.fillStyle = theme.angle;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (has("labels")) {
        const solute = IONIC_SOLUTES[chosen];
        const alpha = num(results.alpha, 1);
        const words = `${solute.formula}: Λm = ${num(results.lambda).toFixed(1)} S cm² mol⁻¹, ${solute.Ka === null ? "fully ionised" : `α = ${alpha.toFixed(3)}`}`;
        label(ctx, words, width / 2, height - 16, { color: theme.text, font: theme.font, align: "center" });
      }
    }
  },
};
