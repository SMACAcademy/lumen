/**
 * Projectile motion. The field shows the flight; the ghosts show why it works.
 *
 * Dropped at equal times, the ghosts are evenly spaced across and bunched at
 * the top — one motion uniform, the other accelerated. Their shadows on the
 * two axes make the same point again: the horizontal shadow marches steadily
 * while the vertical one slows, stops and falls back.
 */

import type { Rect } from "@ise/graph-engine";
import { FLIGHT_LIMIT, horizontalVelocity, projectilePositionAt, timeOfFlight, verticalVelocity } from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import { type Plane, clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface ProjectileLayout {
  width: number;
  height: number;
  compact: boolean;
  field: Rect;
}

export function computeProjectileLayout(width: number): ProjectileLayout {
  const compact = width < 560;
  const pad = compact ? 6 : 16;
  const left = pad + (compact ? 30 : 40);
  const fieldWidth = Math.max(120, width - left - pad - 12);
  const height = clamp(fieldWidth * 0.52, 200, 380);
  return { width, height: Math.ceil(height + 84), compact, field: { x: left, y: pad + 22, width: fieldWidth, height } };
}

/** Parameters the drawing needs, taken from the model's own outputs. */
function flightParams(results: Results) {
  return {
    u: num(results.u),
    angle: num(results.angle),
    h0: num(results.h0),
    g: num(results.g, 9.8),
    strobe: Math.max(0.05, num(results.strobe, 0.2)),
  };
}

/** The view fits the whole flight, with a margin, and never squashes it flat. */
function fieldPlane(layout: ProjectileLayout, results: Results): Plane {
  const range = Math.max(4, num(results.range));
  const top = Math.max(3, num(results.maxHeight), num(results.h0));
  const xDomain = [-range * 0.06, range * 1.1] as const;
  const yDomain = [-top * 0.1, top * 1.25] as const;
  return createPlane(layout.field, xDomain, yDomain);
}

export const projectileRenderer: SimulationRenderer<ProjectileLayout> = {
  id: "projectile",
  layout: (width) => computeProjectileLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const params = flightParams(results);
    const plane = fieldPlane(layout, results);
    const t = num(results.t);
    const flight = timeOfFlight({ ...params });
    const x = num(results.x);
    const y = num(results.y);
    const [px, py] = plane.toPx(x, y);
    const [originX, groundY] = plane.toPx(0, 0);

    drawPlane(ctx, plane, theme, { xLabel: "x (m)", yLabel: "y (m)", showLabels: has("labels") });

    ctx.save();
    clipToPlane(ctx, plane);

    // The ground, and the launch point above it.
    if (has("ground")) {
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 3;
      segment(ctx, plane.rect.x, groundY, plane.rect.x + plane.rect.width, groundY);
    }

    // The whole path, with the part already flown drawn solid.
    if (has("path")) {
      const curve = (from: number, to: number, alpha: number, dash: number[]) => {
        ctx.save();
        ctx.strokeStyle = theme.curve;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = alpha * dim("path");
        ctx.setLineDash(dash);
        ctx.beginPath();
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const at = from + ((to - from) * i) / steps;
          const point = projectilePositionAt({ ...params }, at);
          const [cx, cy] = plane.toPx(point.x, point.y);
          if (i === 0) ctx.moveTo(cx, cy);
          else ctx.lineTo(cx, cy);
        }
        ctx.stroke();
        ctx.restore();
      };
      curve(0, flight, 0.3, [5, 5]);
      if (t > 0) curve(0, t, 1, []);
    }

    // Ghosts at equal times: evenly spaced across, bunched at the top.
    if (has("ghosts")) {
      ctx.save();
      ctx.globalAlpha = 0.5 * dim("ghosts");
      for (let g = 0; g <= t + 1e-9; g += params.strobe) {
        const point = projectilePositionAt({ ...params }, g);
        const [gx, gy] = plane.toPx(point.x, point.y);
        ctx.fillStyle = theme.reference;
        ctx.beginPath();
        ctx.arc(gx, gy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        // Their shadows: one shadow marches, the other slows and falls back.
        if (has("shadows")) {
          ctx.fillStyle = theme.cosine;
          ctx.beginPath();
          ctx.arc(gx, groundY, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = theme.sine;
          ctx.beginPath();
          ctx.arc(originX, gy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // The apex, and where it lands.
    if (has("apex") && flight > 0) {
      const apex = projectilePositionAt({ ...params }, num(results.apexTime));
      const [ax, ay] = plane.toPx(apex.x, apex.y);
      ctx.save();
      ctx.strokeStyle = theme.tangent;
      ctx.globalAlpha = 0.7 * dim("apex");
      ctx.setLineDash([4, 4]);
      segment(ctx, ax, ay, ax, groundY);
      ctx.restore();
    }
    if (has("range")) {
      const [rx] = plane.toPx(num(results.range), 0);
      arrow(ctx, originX, groundY + 16, rx, groundY + 16, { color: theme.cosine, width: 2, alpha: dim("range"), head: 8 });
    }

    // The projectile, and the velocity it carries.
    if (has("projectile")) {
      const vx = num(results.vx);
      const vy = num(results.vy);
      const scale = plane.rect.width / (Math.max(6, num(results.u)) * 6);
      if (has("velocity")) {
        if (has("components")) {
          arrow(ctx, px, py, px + vx * scale, py, { color: theme.cosine, width: 2.5, alpha: dim("velocity"), head: 8 });
          arrow(ctx, px, py, px, py - vy * scale, { color: theme.sine, width: 2.5, alpha: dim("velocity"), head: 8 });
        }
        arrow(ctx, px, py, px + vx * scale, py - vy * scale, { color: theme.point, width: 3, alpha: dim("velocity"), head: 9 });
      }
      ctx.save();
      ctx.fillStyle = theme.angle;
      ctx.strokeStyle = theme.background;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // end clip

    if (has("labels")) {
      const { rect } = plane;
      const lines: [string, string][] = [
        [`u = ${formatNumber(params.u, 1)} m/s at ${formatNumber((params.angle * 180) / Math.PI, 0)}°`, theme.muted],
        [`t = ${formatNumber(t, 2)} s`, theme.angle],
      ];
      // Top right: the axis label already owns the top-left corner.
      lines.forEach(([text, color], i) => {
        label(ctx, text, rect.x + rect.width - 6, rect.y + 14 + i * 17, {
          color,
          font: theme.fontStrong,
          align: "right",
          background: theme.background,
        });
      });
      if (has("range")) {
        const [rx] = plane.toPx(num(results.range), 0);
        label(ctx, `range = ${formatNumber(num(results.range), 1)} m`, (originX + rx) / 2, groundY + 34, {
          color: theme.cosine,
          font: theme.fontStrong,
          align: "center",
          background: theme.background,
        });
      }
      if (has("apex")) {
        const apex = projectilePositionAt({ ...params }, num(results.apexTime));
        const [ax, ay] = plane.toPx(apex.x, apex.y);
        label(ctx, `max height = ${formatNumber(num(results.maxHeight), 1)} m`, ax, ay - 12, {
          color: theme.tangent,
          font: theme.fontStrong,
          align: "center",
          background: theme.background,
        });
      }
    }
  },

  pick(layout, x, y, locked, results) {
    const plane = fieldPlane(layout, results);
    if (locked === "field" || (!locked && plane.contains(x, y, 12))) {
      return { writes: [{ variable: "t", value: timeNearestTo(plane, results, x, y) }], region: "field" };
    }
    return null;
  },
};

/** Dragging the projectile means "show me the moment it was here". */
function timeNearestTo(plane: Plane, results: Results, pixelX: number, pixelY: number): number {
  const params = flightParams(results);
  const flight = Math.min(FLIGHT_LIMIT, timeOfFlight({ ...params }));
  const steps = 240;
  let best = 0;
  let bestGap = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= steps; i++) {
    const t = (flight * i) / steps;
    const point = projectilePositionAt({ ...params }, t);
    const [cx, cy] = plane.toPx(point.x, point.y);
    const gap = Math.hypot(cx - pixelX, cy - pixelY);
    if (gap < bestGap) {
      bestGap = gap;
      best = t;
    }
  }
  return best;
}

/** Velocity at a time, for tests and any view that wants the components. */
export function velocityAt(results: Results, t: number): { vx: number; vy: number } {
  const params = flightParams(results);
  return { vx: horizontalVelocity(params), vy: verticalVelocity(params, t) };
}

/** The field carries no graphs today; this keeps the descriptor type referenced. */
export type ProjectileGraphs = readonly GraphDescriptor[];
