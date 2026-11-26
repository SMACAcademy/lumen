/**
 * A block on a tilted surface, with its free-body diagram drawn on it.
 *
 * Every arrow is scaled from the same newton-per-pixel factor, so their
 * lengths can be compared by eye — which is the point of a free-body diagram.
 * The weight is drawn straight down and, when asked, also split into the
 * along-slope and into-surface components the working actually uses.
 */

import type { Rect } from "@ise/graph-engine";
import { TRACK_LIMIT } from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface ForcesLayout {
  width: number;
  height: number;
  compact: boolean;
  scene: Rect;
}

export function computeForcesLayout(width: number): ForcesLayout {
  const compact = width < 560;
  const pad = compact ? 6 : 16;
  const inner = Math.max(120, width - 2 * pad);
  const height = clamp(inner * 0.5, 220, 360);
  return { width, height: Math.ceil(height + 74), compact, scene: { x: pad, y: pad + 16, width: inner, height } };
}

/** Where the slope pivots, and how long it is drawn. */
function geometry(layout: ForcesLayout, results: Results) {
  const incline = num(results.incline);
  const { scene } = layout;
  const pivotX = scene.x + scene.width * 0.5;
  const pivotY = scene.y + scene.height * 0.72;
  const halfLength = Math.min(scene.width * 0.42, scene.height * 0.9);
  // Metres along the slope → pixels.
  const metre = halfLength / TRACK_LIMIT;
  const along = (s: number): [number, number] => [pivotX + s * metre * Math.cos(incline), pivotY - s * metre * Math.sin(incline)];
  return { incline, pivotX, pivotY, halfLength, metre, along };
}

/** Newtons → pixels, from the largest force on show, so nothing runs off the scene. */
function forceScale(layout: ForcesLayout, results: Results): number {
  const largest = Math.max(
    1,
    Math.abs(num(results.weight)),
    Math.abs(num(results.normal)),
    Math.abs(num(results.applied)),
    Math.abs(num(results.friction)),
  );
  return (layout.scene.height * 0.3) / largest;
}

export const forcesRenderer: SimulationRenderer<ForcesLayout> = {
  id: "forces-block",
  layout: (width) => computeForcesLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.25 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const { incline, pivotX, pivotY, halfLength, along } = geometry(layout, results);
    const scale = forceScale(layout, results);
    const [bx, by] = along(num(results.s));
    const blockSize = layout.compact ? 26 : 32;

    // ── The surface, and the angle it makes with the horizontal ───────────
    if (has("surface")) {
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 3;
      const [x1, y1] = along(-TRACK_LIMIT);
      const [x2, y2] = along(TRACK_LIMIT);
      segment(ctx, x1, y1, x2, y2);
      if (incline > 0.01) {
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        segment(ctx, pivotX - halfLength, pivotY, pivotX + halfLength, pivotY);
        ctx.setLineDash([]);
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 34, -incline, 0);
        ctx.stroke();
        if (has("labels")) {
          label(ctx, `${formatNumber((incline * 180) / Math.PI, 0)}°`, pivotX + 44, pivotY - 14, {
            color: theme.angle,
            font: theme.fontStrong,
          });
        }
      }
      ctx.restore();
    }

    // ── The block ─────────────────────────────────────────────────────────
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
    }

    // ── The free-body diagram ─────────────────────────────────────────────
    const centreX = bx - (blockSize / 2) * Math.sin(incline);
    const centreY = by - (blockSize / 2) * Math.cos(incline);
    const alongDirection = (magnitude: number): [number, number] => [
      centreX + magnitude * scale * Math.cos(incline),
      centreY - magnitude * scale * Math.sin(incline),
    ];
    const force = (to: [number, number], color: string, layer: string, text: string, magnitude: number) => {
      if (Math.abs(magnitude) < 0.05) return;
      arrow(ctx, centreX, centreY, to[0], to[1], { color, width: 3, alpha: dim(layer), head: 9 });
      if (has("labels")) {
        const dx = to[0] - centreX;
        const dy = to[1] - centreY;
        const gap = 14;
        const length = Math.max(1, Math.hypot(dx, dy));
        label(ctx, `${text} ${formatNumber(Math.abs(magnitude), 1)} N`, to[0] + (dx / length) * gap, to[1] + (dy / length) * gap, {
          color,
          font: theme.fontStrong,
          align: dx < -0.1 ? "right" : dx > 0.1 ? "left" : "center",
          background: theme.background,
        });
      }
    };

    if (has("weight")) {
      const weight = num(results.weight);
      force([centreX, centreY + weight * scale], theme.sine, "weight", "W", weight);
    }
    if (has("weightComponents") && incline > 0.01) {
      const alongMagnitude = num(results.weightAlong);
      const into = num(results.weightInto);
      ctx.save();
      ctx.setLineDash([4, 4]);
      arrow(ctx, centreX, centreY, ...alongDirection(alongMagnitude), {
        color: theme.sine,
        width: 2,
        alpha: 0.75 * dim("weightComponents"),
        head: 7,
      });
      arrow(
        ctx,
        centreX,
        centreY,
        centreX + into * scale * Math.sin(incline),
        centreY + into * scale * Math.cos(incline),
        { color: theme.sine, width: 2, alpha: 0.75 * dim("weightComponents"), head: 7 },
      );
      ctx.restore();
    }
    if (has("normal")) {
      const normal = num(results.normal);
      force(
        [centreX - normal * scale * Math.sin(incline), centreY - normal * scale * Math.cos(incline)],
        theme.tangent,
        "normal",
        "N",
        normal,
      );
    }
    if (has("applied")) {
      const applied = num(results.applied);
      force(alongDirection(applied), theme.cosine, "applied", "F", applied);
    }
    if (has("friction")) {
      const friction = num(results.friction);
      force(alongDirection(friction), theme.secant, "friction", "f", friction);
    }

    // ── What it all adds up to ────────────────────────────────────────────
    if (has("labels")) {
      const { scene } = layout;
      const motion = String(results.motion ?? "");
      const a = num(results.a);
      const lines: [string, string][] = [
        [`net force = ${formatNumber(num(results.netForce), 1)} N`, theme.point],
        [`a = ${formatNumber(a, 2)} m/s²`, Math.abs(a) < 1e-9 ? theme.muted : theme.angle],
        [motion, num(results.held) === 1 ? theme.tangent : theme.muted],
      ];
      lines.forEach(([text, color], i) => {
        label(ctx, text, scene.x + 6, scene.y + 14 + i * 17, { color, font: theme.fontStrong, background: theme.background });
      });
      if (has("friction")) {
        label(
          ctx,
          `friction can reach ${formatNumber(num(results.maxStatic), 1)} N before it gives way`,
          scene.x + 6,
          scene.y + scene.height + 16,
          { color: theme.secant, font: theme.font },
        );
      }
    }
  },

  pick(layout, x, y, locked, results) {
    const { scene } = layout;
    const inScene = y >= scene.y && y <= scene.y + scene.height;
    if (locked === "block" || (!locked && inScene)) {
      // Slide the block along the surface, wherever the pointer is.
      const { pivotX, pivotY, metre, incline } = geometry(layout, results);
      const s = ((x - pivotX) * Math.cos(incline) - (y - pivotY) * Math.sin(incline)) / metre;
      return { writes: [{ variable: "s", value: clamp(s, -TRACK_LIMIT, TRACK_LIMIT) }], region: "block" };
    }
    return null;
  },
};

/** The scene carries no graphs today; this keeps the descriptor type referenced. */
export type ForcesGraphs = readonly GraphDescriptor[];
