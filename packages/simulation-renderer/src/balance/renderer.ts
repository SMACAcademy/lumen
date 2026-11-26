/**
 * An equation on a see-saw scale.
 *
 * Boxes of the unknown weight x and unit weights sit on two pans; the beam
 * tips towards the heavier side, and lies level when the guess is right.
 * The equation is written underneath, exactly as the pans stand now — so
 * taking the same off both sides visibly shortens both sides of it.
 */

import { sideText } from "@ise/mathematics-engine";
import { formatNumber } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import type { SimulationRenderer } from "../types";

export interface BalanceLayout {
  width: number;
  height: number;
  compact: boolean;
  pivot: { x: number; y: number };
  beam: number;
  pan: number;
}

export function computeBalanceLayout(width: number): BalanceLayout {
  const compact = width < 560;
  // Pans first, then the beam gets what is left, so both pans stay on screen.
  const pan = compact ? Math.min(130, (width - 24) * 0.36) : 190;
  const beam = Math.min(width - pan - 24, 600);
  return { width, height: compact ? 360 : 380, compact, pivot: { x: width / 2, y: 70 }, beam, pan };
}

/** How far the beam tips, in radians: towards the heavier side, and never more than 10°. */
export function tiltAngle(leftWeight: number, rightWeight: number): number {
  return clamp((leftWeight - rightWeight) * 0.03, -0.175, 0.175);
}

/** A weight as a child would write it: whole numbers without decimals. */
const amount = (w: number) => formatNumber(w, Number.isInteger(w) ? 0 : 1);

const BOX = 24;
const UNIT = 13;

export const balanceRenderer: SimulationRenderer<BalanceLayout> = {
  id: "balance",
  layout: (width) => computeBalanceLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const left = { boxes: Math.round(num(results.leftBoxes)), units: Math.round(num(results.leftUnits)), weight: num(results.leftWeight) };
    const right = { boxes: Math.round(num(results.rightBoxes)), units: Math.round(num(results.rightUnits)), weight: num(results.rightWeight) };
    const balanced = num(results.balanced) === 1;
    const x = num(results.x);
    const theta = tiltAngle(left.weight, right.weight);
    const { pivot, beam, pan } = layout;
    const half = beam / 2;
    // Left heavier (theta > 0): the left end goes down.
    const ends = [
      { side: left, x: pivot.x - half * Math.cos(theta), y: pivot.y + half * Math.sin(theta) },
      { side: right, x: pivot.x + half * Math.cos(theta), y: pivot.y - half * Math.sin(theta) },
    ];
    const hang = 150;

    if (has("scale")) {
      ctx.save();
      // The stand and the pivot.
      ctx.fillStyle = theme.neutral;
      ctx.beginPath();
      ctx.moveTo(pivot.x, pivot.y);
      ctx.lineTo(pivot.x - 22, pivot.y + hang + 40);
      ctx.lineTo(pivot.x + 22, pivot.y + hang + 40);
      ctx.closePath();
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      // The beam.
      ctx.strokeStyle = balanced ? theme.tangent : theme.text;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      segment(ctx, ends[0]!.x, ends[0]!.y, ends[1]!.x, ends[1]!.y);
      ctx.fillStyle = theme.text;
      ctx.beginPath();
      ctx.arc(pivot.x, pivot.y, 6, 0, Math.PI * 2);
      ctx.fill();
      // The pans, hanging straight down from each end.
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = theme.muted;
      for (const end of ends) {
        const panY = end.y + hang;
        segment(ctx, end.x, end.y, end.x - pan / 2, panY);
        segment(ctx, end.x, end.y, end.x + pan / 2, panY);
        ctx.fillStyle = theme.surface2;
        ctx.fillRect(end.x - pan / 2, panY, pan, 8);
        ctx.strokeRect(end.x - pan / 2, panY, pan, 8);
      }
      ctx.restore();
    }

    if (has("weights")) {
      for (const end of ends) {
        const panY = end.y + hang;
        const left0 = end.x - pan / 2 + 6;
        let rowY = panY;
        // Boxes first, on the pan.
        const boxesPerRow = Math.max(1, Math.floor((pan - 12) / (BOX + 4)));
        for (let i = 0; i < end.side.boxes; i++) {
          const col = i % boxesPerRow;
          if (col === 0) rowY -= BOX + 2;
          const bx = left0 + col * (BOX + 4);
          ctx.save();
          ctx.fillStyle = theme.curve;
          ctx.fillRect(bx, rowY, BOX, BOX);
          ctx.restore();
          label(ctx, "x", bx + BOX / 2, rowY + BOX / 2, { color: theme.background, font: theme.fontStrong, align: "center" });
        }
        // Then the unit weights, stacked above.
        const unitsPerRow = Math.max(1, Math.floor((pan - 12) / (UNIT + 3)));
        for (let i = 0; i < end.side.units; i++) {
          const col = i % unitsPerRow;
          if (col === 0) rowY -= UNIT + 2;
          const ux = left0 + col * (UNIT + 3);
          ctx.save();
          ctx.fillStyle = theme.angle;
          ctx.fillRect(ux, rowY, UNIT, UNIT);
          ctx.restore();
        }
      }
    }

    if (has("labels")) {
      const equation = `${sideText(left.boxes, left.units)} = ${sideText(right.boxes, right.units)}`;
      const eqY = layout.height - 58;
      label(ctx, equation, layout.width / 2, eqY, { color: theme.text, font: theme.fontStrong.replace(/\d+px/, layout.compact ? "20px" : "24px"), align: "center" });
      const guess = amount(x);
      const status = balanced
        ? `Balanced with x = ${guess}`
        : `x = ${guess}: left ${amount(left.weight)}, right ${amount(right.weight)} — ${left.weight > right.weight ? "left" : "right"} side heavier`;
      label(ctx, status, layout.width / 2, eqY + 30, { color: balanced ? theme.tangent : theme.muted, font: theme.font, align: "center" });
      label(ctx, "each ■ is 1", layout.width - 8, 16, { color: theme.angle, font: theme.font, align: "right" });
    }
  },
};
