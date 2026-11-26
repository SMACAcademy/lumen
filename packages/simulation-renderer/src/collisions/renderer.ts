/**
 * Two carts and a collision. Momentum and kinetic energy are shown as bars
 * before and after, side by side, because the whole lesson is that one of
 * them always matches and the other often does not.
 *
 * Each cart's width tracks its mass, so a heavy cart looks heavy, and its
 * velocity arrow is drawn from its centre.
 */

import type { Rect } from "@ise/graph-engine";
import { CART_HALF } from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface CollisionsLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The track the carts run on. */
  track: Rect;
  /** Momentum and energy, before and after. */
  bars: Rect;
}

/** Metres shown across the track. */
const VIEW = 14;

export function computeCollisionsLayout(width: number): CollisionsLayout {
  const compact = width < 560;
  const pad = compact ? 6 : 16;
  const inner = Math.max(120, width - 2 * pad);
  const trackHeight = compact ? 118 : 140;
  return {
    width,
    height: Math.ceil(trackHeight + (compact ? 190 : 210) + pad),
    compact,
    track: { x: pad, y: pad + 18, width: inner, height: trackHeight },
    bars: { x: pad, y: pad + 18 + trackHeight + (compact ? 34 : 44), width: inner, height: compact ? 130 : 145 },
  };
}

/** Metres → pixels across the track, centred on the middle of the view. */
function mapX(layout: CollisionsLayout, metres: number): number {
  return layout.track.x + layout.track.width * (0.5 + metres / VIEW);
}

export const collisionsRenderer: SimulationRenderer<CollisionsLayout> = {
  id: "collisions",
  layout: (width) => computeCollisionsLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const { track } = layout;
    const railY = track.y + track.height * 0.66;
    const metre = track.width / VIEW;

    if (has("track")) {
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 3;
      segment(ctx, track.x, railY, track.x + track.width, railY);
      ctx.restore();
    }

    // ── The two carts ─────────────────────────────────────────────────────
    const carts = [
      { x: num(results.x1), v: num(results.v1), mass: num(results.m1, 1), color: theme.cosine, name: "1" },
      { x: num(results.x2), v: num(results.v2), mass: num(results.m2, 1), color: theme.vector, name: "2" },
    ];
    if (has("carts")) {
      ctx.save();
      // Keep a fast cart's arrow and label from spilling past the track.
      ctx.beginPath();
      ctx.rect(track.x, track.y, track.width, track.height);
      ctx.clip();
      for (const cart of carts) {
        const centre = mapX(layout, cart.x);
        const halfWidth = CART_HALF * metre;
        // A heavier cart is drawn taller: mass you can see.
        const height = clamp(18 + cart.mass * 5, 20, 54);
        ctx.save();
        ctx.globalAlpha = dim("carts");
        ctx.fillStyle = cart.color;
        ctx.strokeStyle = theme.point;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(centre - halfWidth, railY - height, halfWidth * 2, height, 4);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        if (has("labels")) {
          label(ctx, `${formatNumber(cart.mass, 1)} kg`, centre, railY - height - 8, {
            color: cart.color,
            font: theme.fontStrong,
            align: "center",
            background: theme.background,
          });
        }
        if (has("velocities") && Math.abs(cart.v) > 0.02) {
          const scale = metre * 0.45;
          arrow(ctx, centre, railY + 14, centre + cart.v * scale, railY + 14, {
            color: cart.color,
            width: 2.5,
            alpha: dim("velocities"),
            head: 8,
          });
          if (has("labels")) {
            // Put the label on the inside when the arrow points at a nearby edge.
            const tip = centre + cart.v * scale;
            const room = 70;
            const outside = cart.v > 0 ? tip + room < track.x + track.width : tip - room > track.x;
            const side = outside === (cart.v > 0) ? 1 : -1;
            label(ctx, `${formatNumber(cart.v, 2)} m/s`, tip + side * 8, railY + 14, {
              color: cart.color,
              font: theme.font,
              align: side > 0 ? "left" : "right",
              background: theme.background,
            });
          }
        }
      }
      ctx.restore();
    }

    // A flash at the moment of impact, and a note once it has happened.
    if (has("labels")) {
      const collided = num(results.collided) === 1;
      const impact = num(results.collisionTime, Number.POSITIVE_INFINITY);
      const text = !Number.isFinite(impact)
        ? "these two never meet"
        : collided
          ? `they met at t = ${formatNumber(impact, 2)} s`
          : `they meet at t = ${formatNumber(impact, 2)} s`;
      label(ctx, text, track.x + track.width, track.y + 10, {
        color: collided ? theme.angle : theme.muted,
        font: theme.fontStrong,
        align: "right",
        background: theme.background,
      });
      label(ctx, `t = ${formatNumber(num(results.t), 2)} s`, track.x + 4, track.y + 10, {
        color: theme.angle,
        font: theme.fontStrong,
        background: theme.background,
      });
    }

    // ── Before and after, in bars ─────────────────────────────────────────
    if (has("bars")) {
      const { bars } = layout;
      const groups = [
        {
          title: "momentum",
          color: theme.tangent,
          before: num(results.momentumBefore),
          after: num(results.momentum),
          unit: "kg m/s",
        },
        {
          title: "kinetic energy",
          color: theme.curve,
          before: num(results.kineticBefore),
          after: num(results.kinetic),
          unit: "J",
        },
      ];
      const groupWidth = bars.width / groups.length;
      const floor = bars.y + bars.height - 24;
      const usable = bars.height - 48;

      groups.forEach((group, gi) => {
        const scale = usable / Math.max(0.5, Math.abs(group.before), Math.abs(group.after));
        const originX = bars.x + groupWidth * gi + 8;
        if (has("labels")) {
          label(ctx, group.title, originX, bars.y + 2, { color: group.color, font: theme.fontStrong });
        }
        ([["before", group.before], ["after", group.after]] as const).forEach(([name, value], i) => {
          const barWidth = Math.min(54, groupWidth * 0.3);
          const x = originX + i * (barWidth + 26);
          const height = Math.abs(value) * scale;
          ctx.save();
          ctx.globalAlpha = dim("bars") * (name === "before" ? 0.5 : 0.9);
          ctx.fillStyle = group.color;
          ctx.beginPath();
          ctx.roundRect(x, value >= 0 ? floor - height : floor, barWidth, height, 3);
          ctx.fill();
          ctx.restore();
          if (has("labels")) {
            label(ctx, name, x + barWidth / 2, floor + 12, { color: theme.muted, font: theme.font, align: "center" });
            label(ctx, `${formatNumber(value, 1)} ${group.unit}`, x + barWidth / 2, floor - height - 9, {
              color: group.color,
              font: theme.font,
              align: "center",
              background: theme.background,
            });
          }
        });
        ctx.save();
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        segment(ctx, originX - 4, floor, originX + groupWidth - 20, floor);
        ctx.restore();
      });

      if (has("labels") && num(results.energyLost) > 0.05) {
        label(ctx, `lost as heat and sound: ${formatNumber(num(results.energyLost), 1)} J`, bars.x + bars.width, bars.y + 2, {
          color: theme.secant,
          font: theme.fontStrong,
          align: "right",
        });
      }
    }
  },

  pick(layout, x, y, locked, results) {
    const { track } = layout;
    if (locked === "track" || (!locked && y >= track.y && y <= track.y + track.height)) {
      // Scrub through the run by dragging across the track.
      const fraction = clamp((x - track.x) / track.width, 0, 1);
      const limit = Math.max(0.1, Math.min(6, num(results.collisionTime, 3) * 2.2));
      return { writes: [{ variable: "t", value: fraction * limit }], region: "track" };
    }
    return null;
  },
};

/** The track carries no graphs today; this keeps the descriptor type referenced. */
export type CollisionsGraphs = readonly GraphDescriptor[];
