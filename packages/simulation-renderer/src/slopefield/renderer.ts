/**
 * Differential equations, in three pictures.
 *
 * Field: a short line of slope f(x, y) at every point of a grid, faint
 * members of the solution family, the solution through the starting point,
 * and Euler's stepped walk from it to x = X.
 *
 * Clock: growth, decay or a cooling cup of tea against time — the exact
 * exponential beside Euler's steps in time, with a bar showing the amount or
 * temperature now.
 *
 * Order: one differential equation, written large, with its order and
 * degree when the words are on.
 */

import {
  SLOPE_FIELD_EQUATION_ORDER,
  SLOPE_FIELD_EQUATIONS,
  SLOPE_FIELD_EXAMPLE_ORDER,
  SLOPE_FIELD_EXAMPLES,
  SLOPE_FIELD_PROCESS_ORDER,
  SLOPE_FIELD_T_MAX,
  slopeFieldEuler,
  slopeFieldExact,
  slopeFieldTimeEuler,
  type SlopeFieldEquation,
} from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface SlopeFieldLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The slope field's plane. */
  plot: Box;
  /** The clock view's graph against time, and the bar beside it. */
  graph: Box;
  bar: Box;
}

export function computeSlopeFieldLayout(width: number): SlopeFieldLayout {
  const compact = width < 560;
  const height = compact ? 400 : 420;
  const left = compact ? 34 : 46;
  const barWidth = compact ? 22 : 30;
  const graphRight = width - 12 - barWidth - 22;
  return {
    width,
    height,
    compact,
    plot: { x: left, y: 30, width: width - left - 12, height: height - 30 - 62 },
    graph: { x: left, y: 46, width: graphRight - left, height: height - 46 - 76 },
    bar: { x: width - 12 - barWidth, y: 46, width: barWidth, height: height - 46 - 76 },
  };
}

const fixed = (v: number, digits = 2) => `${v < 0 && Math.abs(v) >= 0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const trim = (v: number, digits = 2) => fixed(v, digits).replace(/\.?0+$/, "");

const equationOf = (results: Results) => SLOPE_FIELD_EQUATION_ORDER[Math.round(num(results.equation))] ?? "growth";
const planeFor = (layout: SlopeFieldLayout, equation: SlopeFieldEquation) => createPlane(layout.plot, equation.x, equation.y);

/** A curve y = f(x), lifted where it is undefined or jumps across an asymptote. */
function strokeCurve(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, colour: string, lineWidth: number, alpha = 1) {
  const [x0, x1] = plane.xDomain;
  const [lo, hi] = plane.yDomain;
  const span = hi - lo;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  let pen = false;
  let previous = 0;
  for (let i = 0; i <= 320; i++) {
    const x = x0 + ((x1 - x0) * i) / 320;
    const y = f(x);
    if (!Number.isFinite(y) || y < lo - span || y > hi + span) {
      pen = false;
      continue;
    }
    const [px, py] = plane.toPx(x, y);
    if (pen && Math.abs(y - previous) < span) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
    pen = true;
    previous = y;
  }
  ctx.stroke();
  ctx.restore();
}

/** Half of the circle x² + y² = c: the upper half when side > 0. */
function strokeHalfCircle(ctx: CanvasRenderingContext2D, plane: Plane, c: number, side: number, colour: string, lineWidth: number, alpha = 1) {
  if (!(c > 0)) return;
  const r = Math.sqrt(c);
  const [cx, cy] = plane.toPx(0, 0);
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  // Canvas angles run clockwise with y down, so the upper half is π to 2π.
  if (side > 0) ctx.ellipse(cx, cy, r * plane.sx, r * plane.sy, 0, Math.PI, 2 * Math.PI);
  else ctx.ellipse(cx, cy, r * plane.sx, r * plane.sy, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();
}

/** The solution through (x₀, y₀), drawn exactly. */
function strokeSolution(ctx: CanvasRenderingContext2D, plane: Plane, id: string, equation: SlopeFieldEquation, x0: number, y0: number, colour: string, lineWidth: number, alpha = 1) {
  if (id === "circles") strokeHalfCircle(ctx, plane, equation.constant(x0, y0), Math.sign(y0), colour, lineWidth, alpha);
  else strokeCurve(ctx, plane, equation.through(x0, y0), colour, lineWidth, alpha);
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** A short line of the field's slope at each point of a grid. */
function drawField(ctx: CanvasRenderingContext2D, plane: Plane, equation: SlopeFieldEquation, compact: boolean, theme: LabTheme) {
  const { rect } = plane;
  const cols = compact ? 13 : 19;
  const rows = Math.max(6, Math.round((cols * rect.height) / rect.width));
  const cellW = rect.width / cols;
  const cellH = rect.height / rows;
  const half = Math.min(cellW, cellH) * 0.36;
  ctx.save();
  ctx.strokeStyle = theme.sine;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const px = rect.x + (i + 0.5) * cellW;
      const py = rect.y + (j + 0.5) * cellH;
      const [x, y] = plane.fromPx(px, py);
      const slope = equation.f(x, y);
      let dx = 0;
      let dy = 1;
      if (Number.isFinite(slope)) {
        // On screen the run is sx and the rise −slope·sy.
        const length = Math.hypot(plane.sx, slope * plane.sy);
        dx = plane.sx / length;
        dy = (-slope * plane.sy) / length;
      } else if (Number.isNaN(slope)) continue;
      ctx.moveTo(px - dx * half, py - dy * half);
      ctx.lineTo(px + dx * half, py + dy * half);
    }
  }
  ctx.stroke();
  ctx.restore();
}

const PROCESS_TEXT = {
  growth: { title: "Bacteria (thousands): dN/dt = kN", axis: "N / thousand, against t / min", symbol: "N", unit: "", half: "doubling time", verb: "growing" },
  decay: { title: "A radioactive sample: dN/dt = −kN", axis: "N / g, against t / min", symbol: "N", unit: " g", half: "half-life", verb: "decaying" },
  cooling: { title: "A cup of tea: dT/dt = −k(T − Tₛ)", axis: "T / °C, against t / min", symbol: "T", unit: " °C", half: "difference halves every", verb: "changing" },
} as const;

/** A round number at or above v, for the top of an axis. */
function niceTop(v: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(v, 1e-9)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

export const slopeFieldRenderer: SimulationRenderer<SlopeFieldLayout> = {
  id: "slopefield",
  layout: (width) => computeSlopeFieldLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, plot, graph, bar, compact } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (words: string, row: 0 | 1) => label(ctx, words, width / 2, height - (row === 0 ? 36 : 15), { color: theme.text, font: theme.font, align: "center" });

    if (has("field") || has("solution") || has("euler")) {
      const id = equationOf(results);
      const equation = SLOPE_FIELD_EQUATIONS[id];
      const plane = planeFor(layout, equation);
      const x0 = num(results.x0);
      const y0 = num(results.y0);
      const defined = num(results.slopeDefined) === 1;
      title(has("family") ? `${equation.label}:  ${equation.general}` : equation.label);
      drawPlane(ctx, plane, theme);
      if (has("field")) drawField(ctx, plane, equation, compact, theme);

      if (has("family")) {
        for (const [fx, fy] of equation.family) strokeSolution(ctx, plane, id, equation, fx, fy, theme.curve, 1.5, 0.4);
      }

      if (has("solution") && defined) strokeSolution(ctx, plane, id, equation, x0, y0, theme.tangent, 2.5);

      const X = num(results.xEnd);
      if (has("euler")) {
        const [ex, top] = plane.toPx(X, equation.y[1]);
        line(ctx, ex, top, ex, plot.y + plot.height, theme.muted, 1, [4, 4]);
        label(ctx, "X", ex, plot.y + plot.height + 10, { color: theme.muted, font: theme.fontStrong, align: "center" });
        const run = slopeFieldEuler(equation, x0, y0, X, num(results.h, 0.5));
        ctx.save();
        clipToPlane(ctx, plane);
        ctx.strokeStyle = theme.secant;
        ctx.lineWidth = 2;
        ctx.beginPath();
        run.points.forEach(([x, y], i) => {
          const [px, py] = plane.toPx(x, y);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
        if (run.points.length <= 41) {
          for (const [x, y] of run.points.slice(1)) {
            const [px, py] = plane.toPx(x, y);
            if (plane.contains(px, py)) disc(ctx, px, py, 2.5, theme.secant);
          }
        }
      }

      const [px, py] = plane.toPx(x0, y0);
      disc(ctx, px, py, 5.5, defined ? theme.angle : theme.secant);

      if (!defined) {
        caption(`no slope at (${trim(x0, 1)}, ${trim(y0, 1)}): dy/dx = ${equation.label.split("= ")[1]} is undefined`, 0);
      } else if (has("labels") && has("euler")) {
        const steps = num(results.steps);
        const run = steps === 1 ? "1 step" : `${steps} steps`;
        if (num(results.reaches) === 1 && num(results.eulerOk) === 1) {
          caption(`at X = ${trim(X, 1)}: exact ${fixed(num(results.yExact), 3)} · Euler ${fixed(num(results.yEuler), 3)}`, 0);
          caption(`${run} of ${trim(Math.abs(X - x0) / Math.max(1, steps), 3)} · error ${fixed(num(results.eulerError), 3)}`, 1);
        } else {
          caption(`the solution through this point does not reach X`, 0);
        }
      } else if (has("labels") && has("solution")) {
        const c = num(results.constantDefined) === 1 ? `C = ${fixed(num(results.constant))}` : "no C gives this one: y = 0";
        caption(`slope at the point ${fixed(num(results.slope))} · ${c}`, 0);
        caption(`${num(results.separable) ? "separable" : "not separable"} · ${num(results.linear) ? "linear" : "not linear"}`, 1);
      }
    }

    if (has("clock")) {
      const id = SLOPE_FIELD_PROCESS_ORDER[Math.round(num(results.process))] ?? "cooling";
      const text = PROCESS_TEXT[id];
      const t = num(results.t);
      const k = num(results.k, 0.05);
      const start = num(results.start, 90);
      const room = num(results.room, 25);
      const amount = num(results.amount);
      const peak = id === "growth" ? Math.min(slopeFieldExact(id, start, room, k, SLOPE_FIELD_T_MAX), 32 * start) : Math.max(start, room);
      const top = niceTop(peak * 1.08);
      const plane = createPlane(graph, [0, SLOPE_FIELD_T_MAX], [0, top]);
      title(text.title);
      drawPlane(ctx, plane, theme);
      label(ctx, text.axis, graph.x + 4, graph.y - 10, { color: theme.muted, font: theme.font });

      if (id === "cooling") {
        const [, ry] = plane.toPx(0, room);
        line(ctx, graph.x, ry, graph.x + graph.width, ry, theme.reference, 1.5, [5, 4]);
        label(ctx, `room ${trim(room, 0)} °C`, graph.x + graph.width - 4, ry - 9, { color: theme.muted, font: theme.font, align: "right" });
      }

      strokeCurve(ctx, plane, (time) => slopeFieldExact(id, start, room, k, time), theme.curve, 2.5);

      if (has("steps")) {
        const run = slopeFieldTimeEuler(id, start, room, k, t, num(results.tStep, 5));
        ctx.save();
        clipToPlane(ctx, plane);
        ctx.strokeStyle = theme.secant;
        ctx.lineWidth = 2;
        ctx.beginPath();
        run.points.forEach(([time, v], i) => {
          const [px, py] = plane.toPx(time, v);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
        for (const [time, v] of run.points.slice(1)) {
          const [px, py] = plane.toPx(time, v);
          if (plane.contains(px, py)) disc(ctx, px, py, 2.5, theme.secant);
        }
      }

      const [mx, my] = plane.toPx(t, Math.min(amount, top));
      line(ctx, mx, graph.y, mx, graph.y + graph.height, theme.muted, 1, [3, 4]);
      disc(ctx, mx, my, 5.5, theme.angle);

      // The bar: the amount or temperature now, on the graph's scale.
      const fill = Math.max(0, Math.min(1, amount / top)) * bar.height;
      ctx.save();
      ctx.fillStyle = id === "cooling" ? theme.cosine : theme.tangent;
      ctx.globalAlpha = 0.6;
      ctx.fillRect(bar.x, bar.y + bar.height - fill, bar.width, fill);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bar.x, bar.y, bar.width, bar.height);
      ctx.restore();
      label(ctx, text.symbol, bar.x + bar.width / 2, bar.y + bar.height + 12, { color: theme.text, font: theme.fontStrong, align: "center" });

      if (has("labels")) {
        const half = num(results.halfTime);
        const [hx] = plane.toPx(half, 0);
        if (half <= SLOPE_FIELD_T_MAX) line(ctx, hx, graph.y + graph.height - 10, hx, graph.y + graph.height, theme.angle, 2.5);
        const rate = num(results.rate);
        const words = id === "cooling" ? (rate < 0 ? "cooling" : rate > 0 ? "warming" : "steady") : text.verb;
        caption(`t = ${fixed(t, 1)} min · ${text.symbol} = ${fixed(amount, 1)}${text.unit} · ${words} at ${fixed(Math.abs(rate))}${text.unit}/min`, 0);
        const euler = has("steps") ? ` · Euler ${fixed(num(results.amountEuler), 1)}` : "";
        caption(`${text.half} ${fixed(half, 1)} min${euler}`, 1);
      }
    }

    if (has("order")) {
      const example = SLOPE_FIELD_EXAMPLES[SLOPE_FIELD_EXAMPLE_ORDER[Math.round(num(results.example))] ?? "first-linear"];
      title("Order and degree");
      const big = theme.fontStrong.replace(/\d+px/, compact ? "16px" : "20px");
      label(ctx, example.label, width / 2, height / 2 - 40, { color: theme.text, font: big, align: "center" });
      label(ctx, "y′ = dy/dx   y″ = d²y/dx²", width / 2, height / 2 + 10, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, "y‴ = d³y/dx³   y⁗ = d⁴y/dx⁴", width / 2, height / 2 + 30, { color: theme.muted, font: theme.font, align: "center" });
      if (has("labels")) {
        caption(`order ${example.order} · degree ${example.degree === 0 ? "not defined" : example.degree}`, 0);
        caption(example.degree === 0 ? "not a polynomial in its derivatives" : `highest derivative to the power ${example.degree}`, 1);
      }
    }
  },

  /** Drag on the field to choose the starting point. */
  pick(layout, x, y, locked, results): PickResult | null {
    const plane = planeFor(layout, SLOPE_FIELD_EQUATIONS[equationOf(results)]);
    if (locked === "start" || (!locked && plane.contains(x, y, 6))) {
      const [mx, my] = plane.fromPx(x, y);
      return {
        writes: [
          { variable: "x0", value: Math.round(mx * 10) / 10 },
          { variable: "y0", value: Math.round(my * 10) / 10 },
        ],
        region: "start",
        press: "jump",
      };
    }
    return null;
  },
};
