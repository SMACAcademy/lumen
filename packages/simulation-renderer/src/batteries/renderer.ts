/**
 * Batteries, and a rusting nail.
 *
 * Cells: the chosen cells in a row, joined in series to a meter that reads
 * their total voltage; a bar for the charge left and, for a lead–acid
 * battery, the density of its acid, which falls as it discharges.
 *
 * Corrosion: an iron nail in a test tube — with water or a drying agent,
 * with air or an oil layer that keeps it out, with salt or without — and
 * its coating of paint, zinc or tin, perhaps scratched. Rust spreads in
 * blotches as the days pass; a zinc coat fades instead, sacrificed.
 */

import { CELL_ORDER, CELLS, COATING_ORDER } from "@ise/chemistry-engine";
import { clamp, label, num } from "../shared/draw";
import type { SimulationRenderer } from "../types";

export interface BatteriesLayout {
  width: number;
  height: number;
  compact: boolean;
}

export function computeBatteriesLayout(width: number): BatteriesLayout {
  const compact = width < 560;
  return { width, height: compact ? 320 : 340, compact };
}

const COATING_COLOUR: Record<string, string> = { paint: "#16a34a", zinc: "#94a3b8", tin: "#e2e8f0" };
const RUST = "#b45309";

/** Deterministic blotch positions along the nail, 0–1 in each direction. */
function blotch(i: number): [number, number] {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return [a - Math.floor(a), b - Math.floor(b)];
}

export const batteriesRenderer: SimulationRenderer<BatteriesLayout> = {
  id: "batteries",
  layout: (width) => computeBatteriesLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, compact } = layout;
    ctx.clearRect(0, 0, width, height);

    if (has("cells")) {
      const cell = CELLS[CELL_ORDER[Math.round(num(results.cell))] ?? "dry"];
      const n = clamp(Math.round(num(results.cells, 1)), 1, 6);
      const gap = 8;
      const w = Math.min(64, (width - 40 - gap * 5) / 6);
      const total = n * w + (n - 1) * gap;
      const x0 = (width - total) / 2;
      const y = 70;
      const h = compact ? 56 : 64;
      for (let i = 0; i < n; i++) {
        const x = x0 + i * (w + gap);
        ctx.save();
        ctx.fillStyle = theme.surface;
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1.5;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
        // The + terminal on the right.
        ctx.fillStyle = theme.text;
        ctx.fillRect(x + w, y + h / 2 - 5, 3, 10);
        ctx.restore();
        label(ctx, `${cell.emf} V`, x + w / 2, y + h / 2, { color: theme.text, font: theme.font, align: "center" });
      }
      // Series wire round to the meter below.
      const meterY = y + h + 60;
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, y + h / 2);
      ctx.lineTo(x0 - 14, y + h / 2);
      ctx.lineTo(x0 - 14, meterY);
      ctx.lineTo(width / 2 - 24, meterY);
      ctx.moveTo(width / 2 + 24, meterY);
      ctx.lineTo(x0 + total + 17, meterY);
      ctx.lineTo(x0 + total + 17, y + h / 2);
      ctx.lineTo(x0 + total + 3, y + h / 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(width / 2, meterY, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      label(ctx, `${num(results.voltage).toFixed(2)} V`, width / 2, meterY, { color: num(results.flat) ? theme.secant : theme.angle, font: theme.fontStrong, align: "center" });
      label(ctx, cell.label, width / 2, 20, { color: theme.text, font: theme.fontStrong, align: "center" });
      label(ctx, cell.reaction, width / 2, 42, { color: theme.muted, font: theme.font, align: "center" });

      if (has("gauge")) {
        const gy = meterY + 42;
        const gw = Math.min(260, width - 60);
        const gx = (width - gw) / 2;
        const q = clamp(num(results.charge) / 100, 0, 1);
        ctx.save();
        ctx.strokeStyle = theme.axis;
        ctx.strokeRect(gx, gy, gw, 12);
        ctx.fillStyle = q > 0.2 ? theme.tangent : theme.secant;
        ctx.fillRect(gx + 1, gy + 1, (gw - 2) * q, 10);
        ctx.restore();
        const density = num(results.acidDensity);
        const words = `charge ${Math.round(q * 100)}%${density > 0 ? ` · acid ${density.toFixed(2)} g/mL` : ""}`;
        label(ctx, words, width / 2, gy + 26, { color: theme.muted, font: theme.font, align: "center" });
      }

      if (has("labels")) {
        const words =
          num(results.flat) === 1
            ? num(results.rechargeable) === 1
              ? "Flat — but a lead–acid battery can be recharged: the reaction runs backwards"
              : "Flat: this cell cannot be recharged"
            : `ΔG = −nFE = −${cell.electrons} × 96 500 × ${cell.emf} V = −${Math.abs(num(results.deltaG)).toFixed(1)} kJ mol⁻¹`;
        label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
      }
    }

    if (has("tube")) {
      const coating = COATING_ORDER[Math.round(num(results.coating))] ?? "none";
      const tubeW = compact ? 90 : 110;
      const tx = width / 2 - tubeW / 2;
      const top = 30;
      const bottom = height - 50;
      const waterTop = top + (bottom - top) * 0.35;

      // Test tube.
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tx, top);
      ctx.lineTo(tx, bottom - tubeW / 2);
      ctx.arc(tx + tubeW / 2, bottom - tubeW / 2, tubeW / 2, Math.PI, 0, true);
      ctx.lineTo(tx + tubeW, top);
      ctx.stroke();
      ctx.restore();

      // The nail.
      const nx = width / 2 - 5;
      const nailTop = top + 16;
      const nailBottom = bottom - 14;
      ctx.save();
      ctx.fillStyle = theme.reference;
      ctx.fillRect(nx, nailTop, 10, nailBottom - nailTop);
      ctx.fillRect(nx - 8, nailTop - 4, 26, 5);
      ctx.restore();

      if (coating !== "none") {
        const fade = coating === "zinc" ? 1 - clamp(num(results.zincCorroded), 0, 0.9) : 1;
        ctx.save();
        ctx.strokeStyle = COATING_COLOUR[coating] ?? theme.neutral;
        ctx.globalAlpha = fade;
        ctx.lineWidth = 3;
        ctx.strokeRect(nx - 1.5, nailTop - 1.5, 13, nailBottom - nailTop + 3);
        ctx.restore();
        if (num(results.ironExposed) === 1) {
          // The scratch: a gap in the coat, halfway down.
          const sy = (nailTop + nailBottom) / 2;
          ctx.save();
          ctx.strokeStyle = theme.background;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(nx - 3, sy - 6);
          ctx.lineTo(nx + 13, sy + 6);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Rust blotches, more as it spreads.
      const blotches = Math.round(clamp(num(results.rusted), 0, 1) * 30);
      for (let i = 0; i < blotches; i++) {
        const [u, v] = blotch(i + 1);
        const low = coating === "none" ? waterTop - 20 : (nailTop + nailBottom) / 2 - 20;
        const y = low + v * (nailBottom - low);
        ctx.save();
        ctx.fillStyle = RUST;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(nx + u * 10, y, 3 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (has("contents")) {
        const water = num(results.hasWater) === 1;
        const air = num(results.hasAir) === 1;
        const salt = num(results.hasSalt) === 1;
        if (water) {
          ctx.save();
          ctx.fillStyle = theme.sine;
          ctx.globalAlpha = 0.18;
          ctx.fillRect(tx + 1, waterTop, tubeW - 2, bottom - tubeW / 2 - waterTop);
          ctx.beginPath();
          ctx.arc(tx + tubeW / 2, bottom - tubeW / 2, tubeW / 2 - 1, 0, Math.PI);
          ctx.fill();
          ctx.restore();
          if (!air) {
            ctx.save();
            ctx.fillStyle = theme.angle;
            ctx.globalAlpha = 0.45;
            ctx.fillRect(tx + 1, waterTop - 12, tubeW - 2, 12);
            ctx.restore();
            label(ctx, "oil", tx + tubeW + 8, waterTop - 6, { color: theme.angle, font: theme.font, align: "left" });
          }
          if (salt) for (let i = 0; i < 8; i++) {
            const [u] = blotch(i + 40);
            ctx.save();
            ctx.fillStyle = theme.point;
            ctx.fillRect(tx + 8 + u * (tubeW - 16), bottom - 18 - (i % 2) * 6, 4, 4);
            ctx.restore();
          }
        } else {
          for (let i = 0; i < 10; i++) {
            const [u] = blotch(i + 70);
            ctx.save();
            ctx.fillStyle = theme.neutral;
            ctx.beginPath();
            ctx.arc(tx + 10 + u * (tubeW - 20), bottom - 16 - (i % 3) * 5, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          label(ctx, "drying agent", tx + tubeW + 8, bottom - 16, { color: theme.muted, font: theme.font, align: "left" });
        }
        label(ctx, `day ${Math.round(num(results.days))}`, tx - 10, top + 8, { color: theme.muted, font: theme.font, align: "right" });
      }

      if (has("labels")) {
        const rusted = Math.round(num(results.rusted) * 100);
        let words: string;
        if (num(results.sacrificial) === 1) words = "The zinc corrodes instead: the iron stays safe, even where scratched";
        else if (num(results.hasWater) !== 1) words = "No water: no rust";
        else if (num(results.hasAir) !== 1) words = "No oxygen: no rust";
        else if (num(results.ironExposed) !== 1) words = "The coating keeps water and air off the iron";
        else if (coating === "tin") words = `Scratched tin: iron gives its electrons to tin and rusts faster — ${rusted}% rusted`;
        else words = `Water + oxygen: ${rusted}% rusted after ${Math.round(num(results.days))} days`;
        label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
      }
    }
  },
};
