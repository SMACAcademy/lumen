/**
 * Energy on a slope: the block on its track, and beside it the bars that say
 * where its energy currently is.
 *
 * The bars are stacked against a fixed ceiling — the energy the block started
 * with — so "kinetic plus potential stays level" is something you watch
 * rather than something you are told. Friction's share is drawn in the same
 * stack, which is how it becomes obvious that the missing energy went to heat.
 */

import type { Rect } from "@ise/graph-engine";
import { ENERGY_TRACK_LIMIT } from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface EnergyLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The slope and the block. */
  scene: Rect;
  /** The energy bars. */
  bars: Rect;
}

export function computeEnergyLayout(width: number): EnergyLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(120, width - 2 * pad);
  if (compact) {
    const sceneHeight = clamp(inner * 0.5, 170, 260);
    return {
      width,
      height: Math.ceil(sceneHeight + 210),
      compact,
      scene: { x: pad, y: pad + 16, width: inner, height: sceneHeight },
      bars: { x: pad, y: pad + 16 + sceneHeight + 34, width: inner, height: 150 },
    };
  }
  const sceneWidth = Math.round(inner * 0.62);
  const height = clamp(sceneWidth * 0.52, 220, 330);
  return {
    width,
    height: Math.ceil(height + 70),
    compact,
    scene: { x: pad, y: pad + 16, width: sceneWidth, height },
    bars: { x: pad + sceneWidth + 24, y: pad + 24, width: inner - sceneWidth - 24, height: height - 18 },
  };
}

/** Where the slope sits, and how metres along it map to pixels. */
function geometry(layout: EnergyLayout, results: Results) {
  const incline = num(results.incline);
  const { scene } = layout;
  const startX = scene.x + scene.width * 0.16;
  const startY = scene.y + scene.height * 0.78;
  const metre = Math.min((scene.width * 0.8) / ENERGY_TRACK_LIMIT, (scene.height * 0.62) / Math.max(1, ENERGY_TRACK_LIMIT * Math.sin(incline)));
  const along = (s: number): [number, number] => [startX + s * metre * Math.cos(incline), startY - s * metre * Math.sin(incline)];
  return { incline, startX, startY, metre, along };
}

export const energyRenderer: SimulationRenderer<EnergyLayout> = {
  id: "energy-track",
  layout: (width) => computeEnergyLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const { incline, startX, startY, along } = geometry(layout, results);
    const s = num(results.s);
    const [bx, by] = along(s);
    const blockSize = layout.compact ? 22 : 28;

    // ── The slope, the start line and the block ───────────────────────────
    if (has("track")) {
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 3;
      const [x1, y1] = along(-ENERGY_TRACK_LIMIT);
      const [x2, y2] = along(ENERGY_TRACK_LIMIT);
      segment(ctx, x1, y1, x2, y2);
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      segment(ctx, startX, startY, startX, layout.scene.y + 6);
      ctx.restore();
      if (has("labels")) {
        label(ctx, "start", startX, startY + 16, { color: theme.muted, font: theme.font, align: "center" });
      }
    }

    // The height it has gained, marked against the starting level.
    if (has("height") && Math.abs(num(results.height)) > 0.02) {
      ctx.save();
      ctx.strokeStyle = theme.sine;
      ctx.globalAlpha = 0.7 * dim("height");
      ctx.setLineDash([4, 4]);
      segment(ctx, bx, by, bx, startY);
      ctx.restore();
      arrow(ctx, bx, startY, bx, by, { color: theme.sine, width: 2, alpha: dim("height"), head: 7 });
      if (has("labels")) {
        label(ctx, `h = ${formatNumber(num(results.height), 2)} m`, bx + 8, (by + startY) / 2, {
          color: theme.sine,
          font: theme.fontStrong,
          background: theme.background,
        });
      }
    }

    if (has("block")) {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-incline);
      ctx.globalAlpha = dim("block");
      ctx.fillStyle = theme.curve;
      ctx.strokeStyle = theme.point;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-blockSize / 2, -blockSize, blockSize, blockSize, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      if (has("velocity") && Math.abs(num(results.v)) > 0.05) {
        const v = num(results.v);
        const scale = 6;
        arrow(ctx, bx, by - blockSize - 6, bx + v * scale * Math.cos(incline), by - blockSize - 6 - v * scale * Math.sin(incline), {
          color: theme.cosine,
          width: 2.5,
          alpha: dim("velocity"),
          head: 8,
        });
      }
    }

    // ── The energy bars ───────────────────────────────────────────────────
    if (has("bars")) {
      const kinetic = num(results.kinetic);
      const potential = Math.max(0, num(results.potential));
      const heat = num(results.heat);
      const ceiling = Math.max(1, num(results.mechanicalStart), kinetic + potential + heat);
      const parts: { label: string; value: number; color: string; layer: string }[] = [
        { label: "kinetic", value: kinetic, color: theme.cosine, layer: "bars" },
        { label: "potential", value: potential, color: theme.sine, layer: "bars" },
        { label: "heat", value: heat, color: theme.secant, layer: "bars" },
        { label: "total", value: kinetic + potential, color: theme.tangent, layer: "bars" },
      ];
      const { bars } = layout;
      const slot = bars.width / parts.length;
      const barWidth = Math.min(46, slot * 0.55);
      const floor = bars.y + bars.height - 22;
      const usable = bars.height - 46;

      // The energy it started with: the line everything is measured against.
      ctx.save();
      ctx.strokeStyle = theme.reference;
      ctx.globalAlpha = 0.8;
      ctx.setLineDash([5, 4]);
      const ceilingY = floor - usable;
      segment(ctx, bars.x, ceilingY, bars.x + bars.width, ceilingY);
      ctx.restore();
      parts.forEach((part, i) => {
        const x = bars.x + slot * i + (slot - barWidth) / 2;
        const barHeight = Math.max(0, (part.value / ceiling) * usable);
        ctx.save();
        ctx.globalAlpha = dim(part.layer);
        ctx.fillStyle = part.color;
        ctx.globalAlpha *= part.label === "total" ? 0.45 : 0.85;
        ctx.beginPath();
        ctx.roundRect(x, floor - barHeight, barWidth, barHeight, 3);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        segment(ctx, bars.x, floor, bars.x + bars.width, floor);
        ctx.restore();
        if (has("labels")) {
          label(ctx, part.label, x + barWidth / 2, floor + 12, { color: theme.muted, font: theme.font, align: "center" });
          label(ctx, `${formatNumber(part.value, 1)} J`, x + barWidth / 2, floor - barHeight - 9, {
            color: part.color,
            font: theme.fontStrong,
            align: "center",
            background: theme.background,
          });
        }
      });
    }

    // ── The working ───────────────────────────────────────────────────────
    if (has("labels")) {
      const { scene } = layout;
      const lines: [string, string][] = [
        // The dashed line across the bars is this number; naming it here keeps
        // the bar tops clear of text.
        [`started with ${formatNumber(num(results.mechanicalStart), 1)} J`, theme.reference],
        [`speed = ${formatNumber(num(results.speed), 2)} m/s`, theme.cosine],
        [`work by gravity = ${formatNumber(num(results.workGravity), 1)} J`, theme.sine],
      ];
      if (num(results.applied) !== 0) lines.push([`work by push = ${formatNumber(num(results.workApplied), 1)} J`, theme.point]);
      if (num(results.heat) > 0.01) lines.push([`lost to heat = ${formatNumber(num(results.heat), 1)} J`, theme.secant]);
      lines.forEach(([text, color], i) => {
        label(ctx, text, scene.x + 4, scene.y + 12 + i * 16, { color, font: theme.font, background: theme.background });
      });
    }
  },

  pick(layout, x, y, locked, results) {
    const { scene } = layout;
    if (locked === "block" || (!locked && y >= scene.y && y <= scene.y + scene.height && x <= scene.x + scene.width)) {
      const { startX, startY, metre, incline } = geometry(layout, results);
      const s = ((x - startX) * Math.cos(incline) - (y - startY) * Math.sin(incline)) / metre;
      return { writes: [{ variable: "s", value: clamp(s, -ENERGY_TRACK_LIMIT, ENERGY_TRACK_LIMIT) }], region: "block" };
    }
    return null;
  },
};

/** The scene carries no graphs today; this keeps the descriptor type referenced. */
export type EnergyGraphs = readonly GraphDescriptor[];
