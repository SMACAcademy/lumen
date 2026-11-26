/**
 * Straight-line motion: a body on a track, the ghosts it left behind at equal
 * time intervals, and the position, velocity and acceleration graphs being
 * drawn as it goes. The area under the velocity graph is shaded, because that
 * area is the displacement.
 */

import {
  type GraphFrame,
  type Rect,
  createGraphFrame,
  drawAxes,
  drawMarker,
  drawTrace,
  linearTicks,
} from "@ise/graph-engine";
import { T_MAX, positionAt, velocityAt } from "@ise/physics-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, graphStyle, label, num, segment } from "../shared/draw";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface KinematicsLayout {
  width: number;
  height: number;
  compact: boolean;
  track: Rect;
  graphs: { graph: GraphDescriptor; rect: Rect }[];
}

const TRACK_HEIGHT = 96;

export function computeKinematicsLayout(width: number, graphs: readonly GraphDescriptor[]): KinematicsLayout {
  const compact = width < 560;
  const pad = compact ? 6 : 16;
  const left = pad + (compact ? 34 : 44);
  const trackTop = pad + 18;
  const track: Rect = { x: left, y: trackTop, width: Math.max(80, width - left - pad - 10), height: TRACK_HEIGHT };

  const graphHeight = compact ? 118 : 140;
  const gap = compact ? 34 : 40;
  let y = trackTop + TRACK_HEIGHT + gap;
  const placed = graphs.map((graph) => {
    const rect: Rect = { x: left, y, width: track.width, height: graphHeight };
    y += graphHeight + gap;
    return { graph, rect };
  });
  const bottom = placed.length > 0 ? y - gap + 26 : trackTop + TRACK_HEIGHT + 20;
  return { width, height: Math.ceil(bottom + pad), compact, track, graphs: placed };
}

/** The window of positions the track shows: the whole journey, with a margin. */
function trackDomain(results: Results): readonly [number, number] {
  const lo = num(results.xMin);
  const hi = num(results.xMax);
  const span = Math.max(1, hi - lo);
  const margin = span * 0.12;
  return [lo - margin, hi + margin];
}

/** Each graph is scaled to the run it is showing, so it always fills its box. */
function valueDomain(graph: GraphDescriptor, results: Results): readonly [number, number] {
  const channel = graph.series[0]?.channel;
  const pad = (lo: number, hi: number, least: number) => {
    const span = Math.max(hi - lo, least);
    const mid = (lo + hi) / 2;
    return [mid - span * 0.6, mid + span * 0.6] as const;
  };
  if (channel === "x") return pad(num(results.xMin), num(results.xMax), 2);
  if (channel === "v") return pad(num(results.vMin), num(results.vMax), 2);
  if (channel === "a") return pad(Math.min(0, num(results.a)), Math.max(0, num(results.a)), 2);
  return graph.yDomain;
}

function frameFor(rect: Rect, graph: GraphDescriptor, results: Results): GraphFrame {
  return createGraphFrame({
    rect,
    orientation: "right",
    coordinateDomain: [0, T_MAX],
    valueDomain: valueDomain(graph, results),
  });
}

/** Position on the track, in pixels. */
function trackX(layout: KinematicsLayout, results: Results, x: number): number {
  const [lo, hi] = trackDomain(results);
  return layout.track.x + ((x - lo) / (hi - lo)) * layout.track.width;
}

export const kinematicsRenderer: SimulationRenderer<KinematicsLayout> = {
  id: "kinematics-1d",
  layout: computeKinematicsLayout,

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const { track } = layout;
    const laneY = track.y + track.height * 0.62;
    const t = num(results.t);
    const x = num(results.x);
    const x0 = num(results.x0);
    const params = { u: num(results.u), a: num(results.a), x0 };
    const px = trackX(layout, results, x);
    const startPx = trackX(layout, results, x0);

    // ── The track: a metre rule the motion happens on ─────────────────────
    if (has("track")) {
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 2;
      segment(ctx, track.x, laneY, track.x + track.width, laneY);
      const [lo, hi] = trackDomain(results);
      for (const tick of linearTicks([lo, hi], layout.compact ? 5 : 9)) {
        const tx = trackX(layout, results, tick.value);
        ctx.strokeStyle = theme.grid;
        ctx.lineWidth = 1;
        segment(ctx, tx, laneY - 6, tx, laneY + 6);
        if (has("labels")) {
          label(ctx, tick.label, tx, laneY + 18, { color: theme.muted, font: theme.font, align: "center" });
        }
      }
      ctx.restore();
      if (has("labels")) {
        label(ctx, "position (m)", track.x, track.y - 4, { color: theme.muted, font: theme.font });
      }
    }

    // ── Ghosts: where the body was at equal time steps ────────────────────
    if (has("ghosts")) {
      const strobe = Math.max(0.1, num(results.strobe, 0.5));
      ctx.save();
      ctx.globalAlpha = 0.45 * dim("ghosts");
      for (let g = 0; g <= t + 1e-9; g += strobe) {
        const gx = trackX(layout, results, positionAt(params, g));
        drawMarker(ctx, gx, laneY, theme.reference, 1, 4);
      }
      ctx.restore();
    }

    // ── Displacement: start to now, as one arrow ──────────────────────────
    if (has("displacement") && Math.abs(px - startPx) > 2) {
      arrow(ctx, startPx, laneY - 26, px, laneY - 26, { color: theme.sine, width: 2.5, alpha: dim("displacement"), head: 9 });
      if (has("labels")) {
        label(ctx, `s = ${formatNumber(num(results.displacement), 2)} m`, (startPx + px) / 2, laneY - 38, {
          color: theme.sine,
          font: theme.fontStrong,
          align: "center",
          background: theme.background,
        });
      }
    }

    // ── The body, and the velocity arrow it carries ───────────────────────
    if (has("body")) {
      ctx.save();
      ctx.globalAlpha = dim("body");
      drawMarker(ctx, startPx, laneY, theme.neutral, 0.9, 5);
      const v = num(results.v);
      if (has("velocity") && Math.abs(v) > 1e-6) {
        const scale = layout.track.width / 40;
        arrow(ctx, px, laneY, px + clamp(v * scale, -90, 90), laneY, { color: theme.cosine, width: 3, head: 9 });
      }
      ctx.beginPath();
      ctx.fillStyle = theme.point;
      ctx.strokeStyle = theme.angle;
      ctx.lineWidth = 3;
      ctx.arc(px, laneY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (has("labels")) {
        label(ctx, `t = ${formatNumber(t, 2)} s`, track.x + track.width, track.y - 4, {
          color: theme.angle,
          font: theme.fontStrong,
          align: "right",
        });
      }
    }

    // ── The three graphs, drawn as the run is recorded ────────────────────
    for (const { graph, rect } of layout.graphs) {
      const frame = frameFor(rect, graph, results);
      drawAxes(ctx, frame, {
        style: graphStyle(theme),
        angleUnit: input.angleUnit,
        xAxis: graph.xAxis,
        xLabel: graph.xLabel,
        yLabel: graph.yLabel,
      });

      const channel = graph.series[0]?.channel;
      if (channel === "v" && has("area") && t > 0) fillVelocityArea(ctx, frame, params, t, theme.sine);
      if (input.trace) drawTrace(ctx, frame, input.trace, graph.series, graph.traceOffset ?? 0);

      // Where the run has got to: a line down the graph and a dot on the curve.
      const value = channel ? num(results[channel]) : Number.NaN;
      const [cx] = frame.point(t, value);
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.globalAlpha = 0.55;
      ctx.setLineDash([4, 4]);
      segment(ctx, cx, rect.y, cx, rect.y + rect.height);
      ctx.restore();
      if (Number.isFinite(value)) {
        const [mx, my] = frame.point(t, value);
        if (frame.contains(mx, my)) drawMarker(ctx, mx, my, graph.series[0]?.color ?? theme.point, 1, 5);
        if (has("labels")) {
          label(ctx, `${graph.yLabel} = ${formatNumber(value, 2)}`, rect.x + 8, rect.y + 12, {
            color: graph.series[0]?.color ?? theme.point,
            font: theme.fontStrong,
            background: theme.background,
          });
        }
      }
    }
  },

  pick(layout, x, y, locked, results) {
    for (const { graph, rect } of layout.graphs) {
      const frame = frameFor(rect, graph, results);
      const region = `graph:${graph.id}`;
      if (locked === region || (!locked && frame.contains(x, y))) {
        return { writes: [{ variable: "t", value: frame.coordinateAt(x, y) }], region, press: "jump" };
      }
    }
    const { track } = layout;
    const near = y > track.y - 10 && y < track.y + track.height + 10;
    if (locked === "track" || (!locked && near && x > track.x - 20 && x < track.x + track.width + 20)) {
      return { writes: [{ variable: "t", value: timeNearestTo(layout, results, x) }], region: "track" };
    }
    return null;
  },
};

/** Shade between the velocity curve and the axis: that area is the displacement. */
function fillVelocityArea(
  ctx: CanvasRenderingContext2D,
  frame: GraphFrame,
  params: { u: number; a: number },
  until: number,
  color: string,
): void {
  const steps = 120;
  ctx.save();
  ctx.beginPath();
  ctx.rect(frame.rect.x, frame.rect.y, frame.rect.width, frame.rect.height);
  ctx.clip();
  ctx.beginPath();
  const [startX, zeroY] = frame.point(0, 0);
  ctx.moveTo(startX, zeroY);
  for (let i = 0; i <= steps; i++) {
    const t = (until * i) / steps;
    const [px, py] = frame.point(t, velocityAt(params, t));
    ctx.lineTo(px, py);
  }
  ctx.lineTo(frame.point(until, 0)[0], zeroY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.18;
  ctx.fill();
  ctx.restore();
}

/** Dragging the body means "show me the moment it was here". */
function timeNearestTo(layout: KinematicsLayout, results: Results, pixelX: number): number {
  const params = { u: num(results.u), a: num(results.a), x0: num(results.x0) };
  const steps = 240;
  let best = 0;
  let bestGap = Number.POSITIVE_INFINITY;
  for (let i = 0; i <= steps; i++) {
    const t = (T_MAX * i) / steps;
    const gap = Math.abs(trackX(layout, results, positionAt(params, t)) - pixelX);
    if (gap < bestGap) {
      bestGap = gap;
      best = t;
    }
  }
  return best;
}
