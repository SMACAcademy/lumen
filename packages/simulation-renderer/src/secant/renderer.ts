/**
 * Renderer for secant → tangent: the curve with P, Q, the secant line, the
 * rise/run triangle and (once revealed) the tangent; beside it, the secant
 * slopes recorded against h, closing in on the tangent slope.
 */

import { type Rect, createGraphFrame, drawAxes, drawGuide, drawMarker, drawTrace } from "@ise/graph-engine";
import { H_SHIFT, familyOf } from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, graphStyle, label, num, segment } from "../shared/draw";
import { type Plane, clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { GraphDescriptor, PickResult, SimulationRenderer } from "../types";

export interface SecantLayout {
  width: number;
  height: number;
  compact: boolean;
  planeRect: Rect;
  graphRect: Rect | null;
  graph: GraphDescriptor | null;
}

export function computeSecantLayout(width: number, graphs: readonly GraphDescriptor[]): SecantLayout {
  const compact = width < 560;
  const side = width >= 760;
  const graph = graphs[0] ?? null;
  const pad = compact ? 4 : 14;
  if (side && graph) {
    const planeWidth = Math.round(width * 0.56);
    const h = clamp(planeWidth * 0.8, 260, 440);
    const planeRect = { x: pad, y: pad + 8, width: planeWidth - 2 * pad, height: h };
    const gx = planeWidth + 44;
    const graphRect = { x: gx, y: pad + 24, width: width - gx - 20, height: h - 30 };
    return { width, height: Math.ceil(planeRect.y + h + 28), compact, planeRect, graphRect, graph };
  }
  const planeHeight = clamp(width * 0.75, 240, 400);
  const planeRect = { x: pad, y: pad + 8, width: width - 2 * pad, height: planeHeight };
  const graphRect = graph ? { x: pad + 40, y: planeRect.y + planeHeight + 44, width: width - 2 * pad - 50, height: compact ? 170 : 200 } : null;
  const bottom = graphRect ? graphRect.y + graphRect.height + 30 : planeRect.y + planeHeight + 20;
  return { width, height: Math.ceil(bottom), compact, planeRect, graphRect, graph };
}

function planeFor(layout: SecantLayout, results: Results): Plane {
  const { view } = familyOf(results.family);
  return createPlane(layout.planeRect, view.x, view.y);
}

/** The slope graph keeps the concept's y-span but centres it on the limit being approached. */
function slopeFrame(layout: SecantLayout, results: Results) {
  if (!layout.graphRect || !layout.graph) return null;
  const [y0, y1] = layout.graph.yDomain;
  const half = (y1 - y0) / 2;
  const centre = num(results.tangentSlope);
  return createGraphFrame({
    rect: layout.graphRect,
    orientation: "right",
    coordinateDomain: layout.graph.xDomain,
    valueDomain: [centre - half, centre + half],
  });
}

export const secantRenderer: SimulationRenderer<SecantLayout> = {
  id: "secant-tangent",
  layout: computeSecantLayout,

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.35 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);
    const fam = familyOf(results.family);
    const plane = planeFor(layout, results);
    const bg = theme.background;
    const strong = theme.fontStrong;

    drawPlane(ctx, plane, theme, { xLabel: "x", yLabel: "y" });

    const x0 = num(results.x0);
    const y0 = num(results.y0);
    const x1 = num(results.x1);
    const y1 = num(results.y1);
    const mSec = num(results.secantSlope);
    const mTan = num(results.tangentSlope);
    const [px, py] = plane.toPx(x0, y0);
    const [qx, qy] = plane.toPx(x1, y1);
    const [xa, xb] = plane.xDomain;

    ctx.save();
    clipToPlane(ctx, plane);

    // The curve.
    if (has("curve")) {
      ctx.save();
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = dim("curve");
      ctx.lineJoin = "round";
      ctx.beginPath();
      const n = 300;
      for (let i = 0; i <= n; i++) {
        const x = xa + ((xb - xa) * i) / n;
        const [cx, cy] = plane.toPx(x, fam.f(x));
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
      ctx.restore();
    }

    // A straight line through (x, y) with slope m, across the whole plane.
    const lineThrough = (x: number, y: number, m: number) => {
      const [ax, ay] = plane.toPx(xa, y + m * (xa - x));
      const [bx, by] = plane.toPx(xb, y + m * (xb - x));
      segment(ctx, ax, ay, bx, by);
    };

    if (has("tangent")) {
      ctx.save();
      ctx.strokeStyle = theme.tangent;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.95 * dim("tangent");
      ctx.setLineDash([10, 6]);
      lineThrough(x0, y0, mTan);
      ctx.restore();
    }

    if (has("secant")) {
      ctx.save();
      ctx.strokeStyle = theme.secant;
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = dim("secant");
      lineThrough(x0, y0, mSec);
      ctx.restore();
    }

    // Rise over run.
    if (has("riseRun")) {
      const [cx, cy] = plane.toPx(x1, y0);
      arrow(ctx, px, py, cx, cy, { color: theme.cosine, width: 2.5, alpha: dim("riseRun"), head: 8 });
      arrow(ctx, cx, cy, qx, qy, { color: theme.sine, width: 2.5, alpha: dim("riseRun"), head: 8 });
    }
    ctx.restore(); // end clip

    if (has("riseRun") && has("labels") && Math.abs(qx - px) > 24) {
      const [cx, cy] = plane.toPx(x1, y0);
      label(ctx, `Δx = h = ${formatNumber(x1 - x0, 3)}`, (px + cx) / 2, cy + (y1 >= y0 ? 14 : -14), { color: theme.cosine, font: theme.font, align: "center", background: bg });
      // Outside the triangle, unless that would run off the plane.
      const { rect } = plane;
      const outsideRight = x1 >= x0;
      const right = outsideRight ? cx + 90 < rect.x + rect.width : cx - 90 < rect.x;
      label(ctx, `Δy = ${formatNumber(y1 - y0, 3)}`, cx + (right ? 8 : -8), (cy + qy) / 2, { color: theme.sine, font: theme.font, align: right ? "left" : "right", background: bg });
    }

    if (has("points")) {
      drawMarker(ctx, qx, qy, theme.secant, 1, 6.5);
      drawMarker(ctx, px, py, theme.angle, 1, 7);
      if (has("labels")) {
        label(ctx, "P", px - 10, py - 12, { color: theme.angle, font: strong, align: "right" });
        label(ctx, "Q", qx + 10, qy - 12, { color: theme.secant, font: strong });
      }
    }

    if (has("labels")) {
      const { rect } = plane;
      label(ctx, `f(x) = ${fam.label}`, rect.x + 10, rect.y + 14, { color: theme.curve, font: strong, background: bg });
      if (has("secant")) label(ctx, `secant slope = ${formatNumber(mSec, 4)}`, rect.x + 10, rect.y + 36, { color: theme.secant, font: strong, background: bg });
      if (has("tangent")) label(ctx, `tangent slope = ${formatNumber(mTan, 4)}`, rect.x + 10, rect.y + 58, { color: theme.tangent, font: strong, background: bg });
    }

    // Slope vs h: each recorded secant slope, closing in on the limit.
    const frame = slopeFrame(layout, results);
    if (frame && layout.graph) {
      const graph = layout.graph;
      drawAxes(ctx, frame, { style: graphStyle(theme), angleUnit: input.angleUnit, xAxis: graph.xAxis, xLabel: graph.xLabel, yLabel: graph.yLabel });
      ctx.save();
      ctx.beginPath();
      ctx.rect(frame.rect.x, frame.rect.y, frame.rect.width, frame.rect.height);
      ctx.clip();
      for (const g of graph.guides ?? []) {
        const value = results[g.result];
        drawGuide(ctx, frame, { value: typeof value === "number" ? value : Number.NaN, label: g.label, color: g.color }, graphStyle(theme));
      }
      ctx.restore();
      if (input.trace) drawTrace(ctx, frame, input.trace, graph.series, graph.traceOffset ?? -H_SHIFT);
      // h = 0 itself is undefined (0/0): an open circle at the limit.
      const [lx, ly] = frame.point(0, mTan);
      ctx.save();
      ctx.strokeStyle = theme.tangent;
      ctx.fillStyle = bg;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(lx, ly, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      const [hx, hy] = frame.point(num(results.h), mSec);
      if (frame.contains(hx, hy)) drawMarker(ctx, hx, hy, theme.secant, 1, 5.5);
      if (has("labels")) label(ctx, "h = 0 is undefined (0/0) — the limit", lx, frame.rect.y + frame.rect.height - 10, { color: theme.muted, font: theme.font, align: "center", background: bg });
    }
  },

  pick(layout, x, y, locked, results): PickResult | null {
    const plane = planeFor(layout, results);
    const x0 = num(results.x0);
    const [px, py] = plane.toPx(x0, num(results.y0));
    const [qx, qy] = plane.toPx(num(results.x1), num(results.y1));
    const frame = slopeFrame(layout, results);

    if (locked === "graph" || (!locked && frame && frame.contains(x, y))) {
      if (!frame) return null;
      return { writes: [{ variable: "h", value: frame.coordinateAt(x, y) }], region: "graph", press: "jump" };
    }
    const nearQ = Math.hypot(x - qx, y - qy) < 18 && Math.hypot(x - qx, y - qy) < Math.hypot(x - px, y - py);
    if (locked === "Q" || (!locked && nearQ)) {
      return { writes: [{ variable: "h", value: plane.fromPx(x, y)[0] - x0 }], region: "Q" };
    }
    if (locked === "P" || (!locked && plane.contains(x, y, 8))) {
      return { writes: [{ variable: "x0", value: plane.fromPx(x, y)[0] }], region: "P" };
    }
    return null;
  },
};
