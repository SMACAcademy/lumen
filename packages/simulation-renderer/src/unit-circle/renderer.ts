/**
 * Canvas renderer for the unit-circle construction. It draws only what the
 * model's results say — it never computes sin or cos of the current angle.
 */

import { drawGraph, drawMarker, type GraphFrame } from "@ise/graph-engine";
import { cosOf, sinOf } from "@ise/mathematics-engine";
import { type Results } from "@ise/science-engine";
import { formatAngle, formatNumber, degToRad } from "@ise/units";
import type { LabTheme } from "../theme";
import { type RenderInput, type SimulationRenderer, resolveGuides } from "../types";
import { frameFor, pickTheta, toPixel } from "./geometry";
import { type ConstructionLayout, computeConstructionLayout } from "./layout";

interface CircleView {
  thetaNorm: number;
  sin: number;
  cos: number;
  tan: number;
  x: number;
  y: number;
  /** r·θ from the model, in units of the radius. */
  arcLength: number;
}

function num(results: Results, key: string): number {
  const v = results[key];
  return typeof v === "number" ? v : 0;
}

function readView(results: Results): CircleView {
  return {
    thetaNorm: num(results, "thetaNorm"),
    sin: num(results, "sin"),
    cos: num(results, "cos"),
    tan: typeof results.tan === "number" ? results.tan : Number.NaN,
    // Normalise to the unit circle; the drawing is scaled by the layout radius.
    x: num(results, "cos"),
    y: num(results, "sin"),
    arcLength: num(results, "arcLength"),
  };
}

const SPECIAL_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330].map(degToRad);

export const unitCircleRenderer: SimulationRenderer<ConstructionLayout> = {
  id: "unit-circle",
  layout: computeConstructionLayout,
  pick: pickTheta,
  draw(ctx, layout, input) {
    const { theme, layers, highlight } = input;
    const view = readView(input.results);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const has = (layer: string) => layers.has(layer);
    const emphasis = (layer: string) => (highlight === layer ? 1 : highlight ? 0.45 : 1);
    const glow = (layer: string, color: string) => {
      if (highlight === layer) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
      }
    };

    const { circle } = layout;
    const [px, py] = toPixel(circle, view.x, view.y);
    const [ox, oy] = toPixel(circle, 0, 0);

    // ── Graphs and connectors (drawn first so the circle sits on top) ──
    for (const graph of input.graphs) {
      const frame = frameFor(layout, graph.id);
      if (!frame || !input.trace) continue;
      drawGraph(ctx, {
        frame,
        trace: input.trace,
        series: graph.series.map((s) => ({ ...s, dimmed: isDimmed(highlight, s.channel) })),
        style: { axis: theme.axis, grid: theme.grid, text: theme.text, muted: theme.muted, font: theme.font },
        angleUnit: input.angleUnit,
        xAxis: graph.xAxis,
        traceOffset: graph.traceOffset,
        guides: resolveGuides(graph, input.results),
        current: { coordinate: view.thetaNorm, values: { sin: view.sin, cos: view.cos } },
        xLabel: graph.xLabel,
        yLabel: graph.yLabel,
        showValueLabels: graph.role === "compare",
      });
      if (graph.connector) drawConnector(ctx, frame, graph.orientation, px, py, view, graph.series[0]?.color ?? theme.neutral);
    }

    // ── Axes ──
    if (has("axes")) {
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.25;
      const ext = circle.r + (layout.compact ? 10 : 16);
      line(ctx, ox - ext, oy, ox + ext, oy);
      line(ctx, ox, oy - ext, ox, oy + ext);
      ctx.fillStyle = theme.muted;
      ctx.font = theme.font;
      // "x" sits below the axis end so it never collides with a graph to the right.
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("x", ox + ext, oy + 4);
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("y", ox, oy - ext - 2);
      // Unit marks.
      ctx.textBaseline = "top";
      ctx.fillText("1", ox + circle.r - 7, oy + 3);
      ctx.fillText("−1", ox - circle.r + 10, oy + 3);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("1", ox - 5, oy - circle.r - 7);
      ctx.fillText("−1", ox - 5, oy + circle.r + 8);
      ctx.restore();
    }

    // ── Circle & special-angle ticks ──
    if (has("circle")) {
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.globalAlpha = 0.55 * emphasis("circle");
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox, oy, circle.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // ── Arc length: the stretch of circle the point has travelled (θ in radians = s ÷ r) ──
    if (has("arc") && view.thetaNorm > 0) {
      ctx.save();
      ctx.globalAlpha = 0.9 * emphasis("arc");
      glow("arc", theme.angle);
      ctx.strokeStyle = theme.angle;
      ctx.lineWidth = highlight === "arc" ? 7 : 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      // Canvas angles run clockwise, so negate.
      ctx.arc(ox, oy, circle.r, 0, -view.thetaNorm, true);
      ctx.stroke();
      ctx.restore();
      const mid = view.thetaNorm / 2;
      const labelR = circle.r + 12;
      ctx.save();
      ctx.fillStyle = theme.angle;
      ctx.font = theme.fontStrong;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("s", ox + cosOf(mid) * labelR, oy - sinOf(mid) * labelR);
      ctx.restore();
    }

    if (has("specialAngles")) {
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1;
      for (const a of SPECIAL_ANGLES) {
        const [x1, y1] = toPixel(circle, cosOf(a) * 0.95, sinOf(a) * 0.95);
        const [x2, y2] = toPixel(circle, cosOf(a) * 1.05, sinOf(a) * 1.05);
        line(ctx, x1, y1, x2, y2);
      }
      ctx.restore();
    }

    // ── Projections ──
    if (has("cosineProjection")) {
      ctx.save();
      ctx.globalAlpha = emphasis("cosineProjection");
      glow("cosineProjection", theme.cosine);
      ctx.strokeStyle = theme.cosine;
      ctx.lineWidth = highlight === "cosineProjection" ? 6 : 4.5;
      ctx.lineCap = "round";
      ctx.setLineDash([10, 6]);
      line(ctx, ox, oy, px, oy);
      ctx.restore();
      // Faint drop line so the foot of the projection is obvious.
      if (!has("sineProjection")) {
        ctx.save();
        ctx.strokeStyle = theme.cosine;
        ctx.globalAlpha = 0.4;
        ctx.setLineDash([2, 4]);
        line(ctx, px, py, px, oy);
        ctx.restore();
      }
    }
    if (has("sineProjection")) {
      ctx.save();
      ctx.globalAlpha = emphasis("sineProjection");
      glow("sineProjection", theme.sine);
      ctx.strokeStyle = theme.sine;
      ctx.lineCap = "round";
      ctx.lineWidth = highlight === "sineProjection" ? 6 : 4.5;
      line(ctx, px, oy, px, py);
      // The "shadow" on the y-axis — this is what the sine graph unrolls.
      ctx.globalAlpha = 0.45 * emphasis("sineProjection");
      ctx.lineWidth = 3;
      line(ctx, ox, oy, ox, py);
      ctx.restore();
    }

    // ── Tangent construction ──
    if (has("tangent") && Number.isFinite(view.tan)) {
      const clipped = Math.max(-2.2, Math.min(2.2, view.tan));
      const [tx, ty0] = toPixel(circle, 1, 0);
      const [, ty] = toPixel(circle, 1, clipped);
      ctx.save();
      ctx.globalAlpha = 0.9 * emphasis("tangent");
      glow("tangent", theme.tangent);
      ctx.strokeStyle = theme.tangent;
      ctx.lineWidth = 3;
      line(ctx, tx, ty0, tx, ty);
      ctx.globalAlpha = 0.35 * emphasis("tangent");
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      line(ctx, ox, oy, tx, ty);
      ctx.restore();
    }

    // ── Angle arc ──
    if (has("angleArc")) {
      ctx.save();
      ctx.globalAlpha = emphasis("angleArc");
      glow("angleArc", theme.angle);
      ctx.strokeStyle = theme.angle;
      ctx.lineWidth = 2.5;
      const arcR = circle.r * 0.24;
      ctx.beginPath();
      // Canvas angles run clockwise, so negate.
      ctx.arc(ox, oy, arcR, 0, -view.thetaNorm, true);
      ctx.stroke();
      ctx.fillStyle = theme.angle;
      ctx.font = theme.fontStrong;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const mid = view.thetaNorm / 2;
      const labelR = arcR + 13;
      ctx.fillText("θ", ox + cosOf(mid) * labelR, oy - sinOf(mid) * labelR);
      ctx.restore();
    }

    // ── Radius ──
    if (has("radius")) {
      ctx.save();
      ctx.globalAlpha = emphasis("radius");
      glow("radius", theme.point);
      ctx.strokeStyle = theme.point;
      ctx.lineWidth = highlight === "radius" ? 3.5 : 2.5;
      ctx.lineCap = "round";
      line(ctx, ox, oy, px, py);
      ctx.restore();
    }

    // ── Labels ──
    if (has("labels")) drawProjectionLabels(ctx, theme, layers, view, circle, px, py, ox, oy, input.angleUnit, layout.compact);

    // ── Point (drawn last; it is the drag handle) ──
    if (has("point")) {
      ctx.save();
      ctx.fillStyle = theme.point;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(px, py, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawMarker(ctx, px, py, theme.angle);
    }
  },
};

function isDimmed(highlight: string | null, channel: string): boolean {
  if (!highlight) return false;
  if (highlight === "sineProjection") return channel !== "sin";
  if (highlight === "cosineProjection") return channel !== "cos";
  return false;
}

function drawConnector(
  ctx: CanvasRenderingContext2D,
  frame: GraphFrame,
  orientation: "right" | "down",
  px: number,
  py: number,
  view: CircleView,
  color: string,
): void {
  const value = orientation === "right" ? view.sin : view.cos;
  const [gx, gy] = frame.point(view.thetaNorm, value);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1.25;
  ctx.setLineDash([4, 5]);
  line(ctx, px, py, gx, gy);
  // Mark θ on the graph's axis.
  const [ax, ay] = frame.point(view.thetaNorm, 0);
  ctx.globalAlpha = 0.35;
  line(ctx, gx, gy, ax, ay);
  ctx.restore();
}

function drawProjectionLabels(
  ctx: CanvasRenderingContext2D,
  theme: LabTheme,
  layers: ReadonlySet<string>,
  view: CircleView,
  circle: { r: number },
  px: number,
  py: number,
  ox: number,
  oy: number,
  angleUnit: "deg" | "rad",
  compact: boolean,
): void {
  ctx.save();
  ctx.font = compact ? theme.font : theme.fontStrong;
  ctx.textBaseline = "middle";

  if (layers.has("sineProjection") && Math.abs(view.sin) > 0.12) {
    ctx.fillStyle = theme.sine;
    const text = compact ? formatNumber(view.sin, 2) : `sin θ = ${formatNumber(view.sin, 3)}`;
    // Outside the circle, unless that would run off the canvas's left edge.
    const right = view.cos >= 0 || px - 9 - ctx.measureText(text).width < 4;
    ctx.textAlign = right ? "left" : "right";
    ctx.fillText(text, px + (right ? 9 : -9), (oy + py) / 2);
  }
  if (layers.has("cosineProjection") && Math.abs(view.cos) > 0.12) {
    ctx.fillStyle = theme.cosine;
    ctx.textAlign = "center";
    const below = view.sin >= 0;
    const text = compact ? formatNumber(view.cos, 2) : `cos θ = ${formatNumber(view.cos, 3)}`;
    ctx.fillText(text, (ox + px) / 2, oy + (below ? 14 : -14));
  }
  // Angle value near the top-left of the circle.
  ctx.fillStyle = theme.angle;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = theme.fontStrong;
  ctx.fillText(`θ = ${formatAngle(view.thetaNorm, angleUnit)}`, ox - circle.r - (compact ? 22 : 28), oy - circle.r - 30);
  // Arc length, on the same line at the right: on the unit circle it is θ in radians.
  if (layers.has("arc")) {
    ctx.textAlign = "right";
    ctx.fillText(`s = ${formatNumber(view.arcLength, 3)}`, ox + circle.r + (compact ? 22 : 28), oy - circle.r - 30);
  }
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
