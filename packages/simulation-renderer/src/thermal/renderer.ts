/**
 * A vessel on a heater, a thermometer beside it, and the heating curve.
 *
 * The curve is drawn from the model's own milestones, so the two flat
 * stretches are exactly mL long and the two slopes exactly mcΔθ. Meanwhile
 * the vessel shows what those flat parts mean: heat still pouring in, the
 * thermometer stuck fast, and the solid quietly turning into liquid.
 */

import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import { createPlane, drawPlane } from "../shared/plane";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface ThermalLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The vessel, its heater and the thermometer. */
  scene: Rect;
  /** Temperature against heat put in. */
  chart: Rect;
}

export function computeThermalLayout(width: number, showChart = true): ThermalLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(120, width - 2 * pad);
  if (!showChart) {
    const height = clamp(inner * 0.5, 240, 340);
    return {
      width,
      height: Math.ceil(height + 24),
      compact,
      scene: { x: pad, y: pad, width: inner, height },
      chart: { x: pad, y: pad + height, width: inner, height: 0 },
    };
  }
  if (compact) {
    const sceneHeight = clamp(inner * 0.62, 200, 280);
    const chartHeight = clamp(inner * 0.55, 160, 220);
    return {
      width,
      height: Math.ceil(sceneHeight + chartHeight + 60),
      compact,
      scene: { x: pad, y: pad, width: inner, height: sceneHeight },
      chart: { x: pad + 46, y: pad + sceneHeight + 30, width: inner - 58, height: chartHeight },
    };
  }
  const sceneWidth = Math.round(inner * 0.38);
  const height = clamp(sceneWidth * 1.0, 250, 340);
  return {
    width,
    height: Math.ceil(height + 46),
    compact,
    scene: { x: pad, y: pad, width: sceneWidth, height },
    chart: { x: pad + sceneWidth + 50, y: pad + 10, width: inner - sceneWidth - 62, height: height - 44 },
  };
}

/** Where the vessel and the thermometer sit, in pixels. */
export function vesselGeometry(layout: ThermalLayout) {
  const { scene } = layout;
  const left = scene.x + 10;
  const width = Math.min(120, scene.width * 0.5);
  const bottom = scene.y + scene.height - 34;
  const height = Math.min(scene.height * 0.52, 150);
  const top = bottom - height;
  const tube = { x: left + width + 34, top: scene.y + 18, bottom: bottom - 6 };
  return { left, right: left + width, width, top, bottom, height, tube };
}

/** Phase names, in the order the model numbers them. */
const PHASES = ["solid", "melting", "liquid", "boiling", "gas"] as const;

export const thermalRenderer: SimulationRenderer<ThermalLayout> = {
  id: "thermal",
  layout: (width, _graphs, layers) => computeThermalLayout(width, layers.has("curve")),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const vessel = vesselGeometry(layout);
    const phase = Math.round(num(results.phase));
    const melted = clamp(num(results.meltedFraction), 0, 1);
    const boiled = clamp(num(results.boiledFraction), 0, 1);

    // ── What is in the vessel ─────────────────────────────────────────────
    if (has("contents")) {
      const remaining = 1 - boiled;
      const contentHeight = vessel.height * 0.8 * remaining;
      const contentTop = vessel.bottom - contentHeight;
      // Solid below, liquid above it: the two live together while it melts.
      const solidShare = 1 - melted;
      ctx.save();
      ctx.globalAlpha = dim("contents");
      if (melted > 0 && remaining > 0) {
        ctx.fillStyle = theme.sine;
        ctx.globalAlpha = 0.45 * dim("contents");
        ctx.beginPath();
        ctx.rect(vessel.left + 3, contentTop, vessel.width - 6, contentHeight);
        ctx.fill();
      }
      if (solidShare > 0.001) {
        ctx.globalAlpha = dim("contents");
        ctx.fillStyle = theme.reference;
        ctx.strokeStyle = theme.point;
        ctx.lineWidth = 1.5;
        const solidHeight = contentHeight * solidShare;
        ctx.beginPath();
        ctx.roundRect(vessel.left + 8, vessel.bottom - solidHeight, vessel.width - 16, solidHeight, 3);
        ctx.fill();
        ctx.stroke();
      }
      // Vapour leaving, once any of it has boiled away.
      if (boiled > 0.001) {
        ctx.globalAlpha = clamp(boiled, 0.2, 0.8) * dim("contents");
        ctx.fillStyle = theme.neutral;
        for (let i = 0; i < 7; i++) {
          const t = (i + 1) / 8;
          ctx.beginPath();
          ctx.arc(vessel.left + vessel.width * t, vessel.top - 8 - (i % 3) * 9, 3 + (i % 2), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    if (has("vessel")) {
      ctx.save();
      ctx.globalAlpha = dim("vessel");
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(vessel.left, vessel.top);
      ctx.lineTo(vessel.left, vessel.bottom);
      ctx.lineTo(vessel.right, vessel.bottom);
      ctx.lineTo(vessel.right, vessel.top);
      ctx.stroke();
      ctx.restore();
    }

    // ── The heater underneath ─────────────────────────────────────────────
    if (has("heater")) {
      const y = vessel.bottom + 10;
      ctx.save();
      ctx.globalAlpha = dim("heater");
      ctx.strokeStyle = theme.cosine;
      ctx.lineWidth = 3;
      segment(ctx, vessel.left + 6, y, vessel.right - 6, y);
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const x = vessel.left + vessel.width * (0.25 + i * 0.25);
        arrow(ctx, x, y + 8, x, vessel.bottom + 2, { color: theme.cosine, width: 2, alpha: 0.9 * dim("heater"), head: 6 });
      }
      if (has("labels")) {
        label(ctx, `${formatNumber(num(results.power) / 1000, 1)} kW`, vessel.left + vessel.width / 2, y + 20, {
          color: theme.cosine,
          font: theme.font,
          align: "center",
        });
      }
    }

    // ── The thermometer ───────────────────────────────────────────────────
    if (has("thermometer")) {
      const { tube } = vessel;
      const start = num(results.startTemperature);
      const top = num(results.boilingPoint) + 100;
      const span = Math.max(1, top - start);
      const yFor = (t: number) => tube.bottom - ((clamp(t, start, top) - start) / span) * (tube.bottom - tube.top);
      ctx.save();
      ctx.globalAlpha = dim("thermometer");
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(tube.x - 7, tube.top, 14, tube.bottom - tube.top + 10, 7);
      ctx.stroke();
      // The column, in the colour of the change of state it is sitting at.
      ctx.fillStyle = num(results.changingState) > 0.5 ? theme.angle : theme.cosine;
      const columnTop = yFor(num(results.temperature));
      ctx.beginPath();
      ctx.roundRect(tube.x - 4, columnTop, 8, tube.bottom - columnTop + 8, 4);
      ctx.fill();
      // Ticks at the two temperatures that matter.
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1;
      for (const t of [num(results.meltingPoint), num(results.boilingPoint)]) {
        segment(ctx, tube.x + 8, yFor(t), tube.x + 14, yFor(t));
      }
      ctx.restore();
      if (has("labels")) {
        label(ctx, `${formatNumber(num(results.temperature), 1)} °C`, tube.x + 12, columnTop - 10, {
          color: theme.cosine,
          font: theme.fontStrong,
          background: theme.background,
        });
        label(ctx, `melts ${formatNumber(num(results.meltingPoint), 0)}`, tube.x + 16, yFor(num(results.meltingPoint)), {
          color: theme.muted,
          font: theme.font,
        });
        label(ctx, `boils ${formatNumber(num(results.boilingPoint), 0)}`, tube.x + 16, yFor(num(results.boilingPoint)), {
          color: theme.muted,
          font: theme.font,
        });
      }
    }

    // ── What is going on, in words ────────────────────────────────────────
    if (has("labels")) {
      const { scene } = layout;
      const name = PHASES[phase] ?? "solid";
      const verdict =
        phase === 1
          ? `melting — ${formatNumber(melted * 100, 0)} % of it has turned to liquid`
          : phase === 3
            ? `boiling — ${formatNumber(boiled * 100, 0)} % of it has boiled away`
            : name;
      const lines: [string, string][] = [
        [verdict, num(results.changingState) > 0.5 ? theme.angle : theme.sine],
        [`${formatNumber(num(results.heatKJ), 1)} kJ in`, theme.tangent],
      ];
      lines.forEach(([text, color], i) => {
        label(ctx, text, scene.x + 4, scene.y + 8 + i * 15, { color, font: theme.font, background: theme.background });
      });
    }

    // ── The heating curve ─────────────────────────────────────────────────
    if (has("curve") && layout.chart.height > 0) {
      const start = num(results.startTemperature);
      const melt = num(results.meltingPoint);
      const boil = num(results.boilingPoint);
      const totalKJ = Math.max(0.001, num(results.totalHeatKJ, 1));
      const plane = createPlane(layout.chart, [0, totalKJ], [start, boil + 110]);
      drawPlane(ctx, plane, theme, { xLabel: "heat in kJ", yLabel: "°C" });

      const points: [number, number][] = [
        [0, start],
        [num(results.heatToMelting) / 1000, melt],
        [num(results.heatMelted) / 1000, melt],
        [num(results.heatToBoiling) / 1000, boil],
        [num(results.heatBoiled) / 1000, boil],
        [totalKJ, num(results.boilingPoint) + 100],
      ];
      ctx.save();
      ctx.globalAlpha = dim("curve");
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      points.forEach(([hx, hy], i) => {
        const [px, py] = plane.toPx(hx, hy);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();

      // The two flat stretches, named and measured.
      if (has("plateaus")) {
        const flats: [number, number, number, string][] = [
          [points[1]![0], points[2]![0], melt, "melting"],
          [points[3]![0], points[4]![0], boil, "boiling"],
        ];
        for (const [from, to, temp, name] of flats) {
          const [fx, fy] = plane.toPx(from, temp);
          const [tx] = plane.toPx(to, temp);
          ctx.save();
          ctx.globalAlpha = 0.9 * dim("plateaus");
          ctx.strokeStyle = theme.angle;
          ctx.lineWidth = 3.5;
          segment(ctx, fx, fy, tx, fy);
          ctx.restore();
          if (has("labels")) {
            label(ctx, `${name}: ${formatNumber(to - from, 0)} kJ`, (fx + tx) / 2, fy - 12, {
              color: theme.angle,
              font: theme.font,
              align: "center",
              background: theme.background,
            });
          }
        }
      }

      const [cx, cy] = plane.toPx(clamp(num(results.heatKJ), 0, totalKJ), num(results.temperature));
      ctx.save();
      ctx.globalAlpha = dim("curve");
      ctx.fillStyle = theme.point;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  /** Clicking the curve puts that many joules in. */
  pick(layout, x, y, locked, results) {
    if (layout.chart.height <= 0) return null;
    const totalKJ = Math.max(0.001, num(results.totalHeatKJ, 1));
    const plane = createPlane(layout.chart, [0, totalKJ], [0, 1]);
    if (locked !== "curve" && (locked || !plane.contains(x, y, 8))) return null;
    const [kilojoules] = plane.fromPx(x, y);
    return { writes: [{ variable: "heat", value: clamp(kilojoules, 0, totalKJ) * 1000 }], region: "curve", press: "sweep" };
  },
};

/** The vessel carries no graphs today; this keeps the descriptor type referenced. */
export type ThermalGraphs = readonly GraphDescriptor[];
