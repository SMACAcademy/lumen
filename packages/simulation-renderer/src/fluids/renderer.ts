/**
 * A tank on the left, pressure against depth on the right.
 *
 * The probe can be dragged anywhere in the fluid and the graph follows it, so
 * "pressure rises with depth" is something the learner does rather than reads.
 * The block is drawn where it actually floats — the density ratio, to the
 * pixel — with the two forces on it as arrows whose lengths are their sizes.
 */

import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import { createPlane, drawPlane } from "../shared/plane";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface FluidsLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The tank of fluid. */
  scene: Rect;
  /** Pressure against depth. */
  chart: Rect;
}

export function computeFluidsLayout(width: number, showChart = true): FluidsLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(120, width - 2 * pad);
  if (!showChart) {
    const height = clamp(inner * 0.55, 260, 380);
    return {
      width,
      height: Math.ceil(height + 24),
      compact,
      scene: { x: pad, y: pad, width: inner, height },
      chart: { x: pad, y: pad + height, width: inner, height: 0 },
    };
  }
  if (compact) {
    const sceneHeight = clamp(inner * 0.7, 220, 300);
    const chartHeight = clamp(inner * 0.55, 160, 220);
    return {
      width,
      height: Math.ceil(sceneHeight + chartHeight + 60),
      compact,
      scene: { x: pad, y: pad, width: inner, height: sceneHeight },
      chart: { x: pad + 48, y: pad + sceneHeight + 30, width: inner - 60, height: chartHeight },
    };
  }
  const sceneWidth = Math.round(inner * 0.46);
  const height = clamp(sceneWidth * 0.78, 260, 360);
  return {
    width,
    height: Math.ceil(height + 46),
    compact,
    scene: { x: pad, y: pad, width: sceneWidth, height },
    chart: { x: pad + sceneWidth + 52, y: pad + 10, width: inner - sceneWidth - 64, height: height - 44 },
  };
}

/** The fluid's colour, taken from its density — the one thing the renderer knows. */
function fluidColour(density: number, theme: { sine: string; angle: string; tangent: string; neutral: string }): string {
  if (density > 5000) return theme.neutral; // mercury
  if (density < 900) return theme.angle; // oil
  if (density > 1010) return theme.tangent; // sea water
  return theme.sine;
}

/** Where the tank is, in pixels, and how depths map into it. */
export function tankGeometry(layout: FluidsLayout, tankDepth: number) {
  const { scene } = layout;
  // Room down the left-hand side for the depth labels, which hang off it.
  const left = scene.x + 64;
  const right = scene.x + scene.width - 14;
  const surface = scene.y + 34;
  const floor = scene.y + scene.height - 18;
  const perMetre = (floor - surface) / Math.max(0.01, tankDepth);
  return { left, right, surface, floor, perMetre, yAt: (depth: number) => surface + depth * perMetre };
}

export const fluidsRenderer: SimulationRenderer<FluidsLayout> = {
  id: "fluids",
  layout: (width, _graphs, layers) => computeFluidsLayout(width, layers.has("chart")),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const tankDepth = num(results.tankDepth, 1.5);
    const tank = tankGeometry(layout, tankDepth);
    const colour = fluidColour(num(results.fluidDensity, 1000), theme);

    // ── The tank and what is in it ────────────────────────────────────────
    if (has("fluid")) {
      ctx.save();
      ctx.globalAlpha = 0.28 * dim("fluid");
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.rect(tank.left, tank.surface, tank.right - tank.left, tank.floor - tank.surface);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = dim("fluid");
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2;
      segment(ctx, tank.left, tank.surface, tank.right, tank.surface);
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 2.5;
      // Walls and floor: a tank open at the top.
      ctx.beginPath();
      ctx.moveTo(tank.left, tank.surface - 22);
      ctx.lineTo(tank.left, tank.floor);
      ctx.lineTo(tank.right, tank.floor);
      ctx.lineTo(tank.right, tank.surface - 22);
      ctx.stroke();
      ctx.restore();
      if (has("labels")) {
        // Inside the tank, clear of the probe's own readout at the surface.
        label(ctx, `ρ = ${formatNumber(num(results.fluidDensity), 0)} kg/m³`, tank.left + 8, tank.surface + 16, {
          color: colour,
          font: theme.font,
        });
      }
    }

    // ── The block, where it actually floats ───────────────────────────────
    if (has("block")) {
      const side = num(results.blockSide, 0.2) * tank.perMetre;
      const top = tank.yAt(num(results.blockTopDepth));
      const x = tank.left + (tank.right - tank.left) * 0.32 - side / 2;
      ctx.save();
      ctx.globalAlpha = dim("block");
      ctx.fillStyle = theme.curve;
      ctx.strokeStyle = theme.point;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x, top, side, side, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (has("labels")) {
        // Beside the block, not inside it: a 20 L cube is not 60 pixels wide.
        label(ctx, `${formatNumber(num(results.blockDensity), 0)} kg/m³`, x - 8, top + side / 2, {
          color: theme.curve,
          font: theme.fontStrong,
          align: "right",
          background: theme.background,
        });
      }

      // The two forces on it, drawn to scale against each other.
      if (has("forces")) {
        const weight = num(results.weight);
        const buoyant = num(results.buoyantForce);
        const biggest = Math.max(weight, buoyant, 1e-6);
        const full = Math.min(56, side * 1.6 + 20);
        const centre = x + side / 2;
        arrow(ctx, centre, top + side, centre, top + side + (weight / biggest) * full, {
          color: theme.cosine,
          width: 2.5,
          alpha: dim("forces"),
          head: 7,
        });
        arrow(ctx, centre, top, centre, top - (buoyant / biggest) * full, {
          color: theme.tangent,
          width: 2.5,
          alpha: dim("forces"),
          head: 7,
        });
        if (has("labels")) {
          label(ctx, `W = ${formatNumber(weight, 1)} N`, centre + 8, top + side + (weight / biggest) * full, {
            color: theme.cosine,
            font: theme.font,
            background: theme.background,
          });
          label(ctx, `F = ${formatNumber(buoyant, 1)} N`, centre + 8, top - (buoyant / biggest) * full, {
            color: theme.tangent,
            font: theme.font,
            background: theme.background,
          });
        }
      }
    }

    // ── The pressure probe ────────────────────────────────────────────────
    if (has("probe")) {
      const depth = clamp(num(results.depth), 0, tankDepth);
      const y = tank.yAt(depth);
      const x = tank.left + (tank.right - tank.left) * 0.74;
      ctx.save();
      ctx.globalAlpha = 0.5 * dim("probe");
      ctx.strokeStyle = theme.point;
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 1;
      segment(ctx, tank.left, y, tank.right, y);
      ctx.restore();
      // Pressure pushes on every face alike: four little arrows, all inwards.
      if (has("push")) {
        const reach = clamp(14 + (num(results.gaugePressure) / Math.max(1, num(results.bottomPressure, 1))) * 22, 10, 36);
        for (const [dx, dy] of [
          [0, -1],
          [0, 1],
          [-1, 0],
          [1, 0],
        ] as const) {
          arrow(ctx, x + dx * reach, y + dy * reach, x + dx * 7, y + dy * 7, {
            color: theme.angle,
            width: 2,
            alpha: dim("push"),
            head: 6,
          });
        }
      }
      ctx.save();
      ctx.globalAlpha = dim("probe");
      ctx.fillStyle = theme.point;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (has("labels")) {
        label(ctx, `${formatNumber(num(results.gaugePressure) / 1000, 2)} kPa`, x + 12, y - 16, {
          color: theme.angle,
          font: theme.fontStrong,
          background: theme.background,
        });
        label(ctx, `h = ${formatNumber(depth, 2)} m`, tank.left - 6, y, {
          color: theme.muted,
          font: theme.font,
          align: "right",
          background: theme.background,
        });
      }
    }

    // ── What the block is doing, in words ─────────────────────────────────
    if (has("labels")) {
      const { scene } = layout;
      const floats = num(results.floats) > 0.5;
      const verdict = floats
        ? `floats, ${formatNumber(num(results.submergedFraction) * 100, 0)} % under`
        : `sinks — it weighs ${formatNumber(num(results.apparentWeight), 1)} N in the fluid`;
      label(ctx, verdict, scene.x + 4, scene.y + 10, {
        color: floats ? theme.tangent : theme.cosine,
        font: theme.font,
        background: theme.background,
      });
    }

    // ── Pressure against depth ────────────────────────────────────────────
    if (has("chart") && layout.chart.height > 0) {
      const bottom = num(results.bottomPressure, 1) / 1000;
      const plane = createPlane(layout.chart, [0, tankDepth], [0, Math.max(1, bottom * 1.1)]);
      drawPlane(ctx, plane, theme, { xLabel: "depth m", yLabel: "pressure kPa" });
      ctx.save();
      ctx.globalAlpha = dim("chart");
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const [x0, y0] = plane.toPx(0, 0);
      const [x1, y1] = plane.toPx(tankDepth, bottom);
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      const [cx, cy] = plane.toPx(clamp(num(results.depth), 0, tankDepth), num(results.gaugePressure) / 1000);
      ctx.fillStyle = theme.angle;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (has("labels")) {
        label(ctx, "p = ρgh", plane.rect.x + plane.rect.width - 6, plane.rect.y + 10, {
          color: colour,
          font: theme.fontStrong,
          align: "right",
          background: theme.background,
        });
      }
    }
  },

  /** Dragging anywhere in the tank moves the probe to that depth. */
  pick(layout, x, y, locked, results) {
    const tankDepth = num(results.tankDepth, 1.5);
    const tank = tankGeometry(layout, tankDepth);
    const inside = x >= tank.left - 12 && x <= tank.right + 12 && y >= tank.surface - 12 && y <= tank.floor + 12;
    if (locked !== "probe" && (locked || !inside)) return null;
    const depth = clamp((y - tank.surface) / tank.perMetre, 0, tankDepth);
    return { writes: [{ variable: "depth", value: depth }], region: "probe", press: "sweep" };
  },
};

/** The tank carries no graphs today; this keeps the descriptor type referenced. */
export type FluidsGraphs = readonly GraphDescriptor[];
