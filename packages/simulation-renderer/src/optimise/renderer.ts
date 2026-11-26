/**
 * What derivatives are for, in four pictures.
 *
 * Design: the thing being designed — the sheet with its corners cut, the pen
 * against its wall, the can — above a graph of the quantity to optimise.
 * The tangent on the graph goes flat at the best choice.
 *
 * Rising: a curve, a point and its tangent, over a strip coloured by the
 * sign of f′: where the curve climbs and where it drops.
 *
 * Mean value: the same curve with a chord between two points, and the
 * tangent to slide until it is parallel to the chord.
 *
 * Rates: the ladder, the balloon or the ripple, with an arrow for each of
 * the two rates tied together.
 */

import {
  DESIGN_PROBLEM_ORDER,
  DESIGN_PROBLEMS,
  FENCE,
  LADDER,
  RATE_SCENE_ORDER,
  SHEET,
  STUDY_CURVE_ORDER,
  STUDY_CURVES,
} from "@ise/mathematics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface OptimiseLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where the designed object is drawn, and its graph underneath. */
  picture: Box;
  graph: Box;
  /** The single plot of the rising and mean-value views. */
  plot: Box;
}

export function computeOptimiseLayout(width: number): OptimiseLayout {
  const compact = width < 560;
  const height = compact ? 390 : 420;
  const left = compact ? 40 : 52;
  return {
    width,
    height,
    compact,
    picture: { x: 16, y: 30, width: width - 32, height: 112 },
    graph: { x: left, y: 166, width: width - left - 14, height: height - 166 - 54 },
    plot: { x: left, y: 30, width: width - left - 14, height: height - 30 - 78 },
  };
}

const fixed = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const signed = (v: number, digits = 1) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;

function stroke(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, colour: string, lineWidth: number) {
  const [x0, x1] = plane.xDomain;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let i = 0; i <= 240; i++) {
    const x = x0 + ((x1 - x0) * i) / 240;
    const [px, py] = plane.toPx(x, f(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/** A tangent through (x, y) of the given slope, a fixed length on screen. */
function tangent(ctx: CanvasRenderingContext2D, plane: Plane, x: number, y: number, slope: number, colour: string, half = 44) {
  const run = half / Math.hypot(plane.sx, slope * plane.sy);
  const [x1, y1] = plane.toPx(x - run, y - slope * run);
  const [x2, y2] = plane.toPx(x + run, y + slope * run);
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
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

/** The sheet seen from above, with its four corner squares marked for cutting. */
function drawSheet(ctx: CanvasRenderingContext2D, box: Box, x: number, theme: LabTheme) {
  const side = Math.min(box.height, 110);
  const sx = box.x + box.width / 2 - side / 2;
  const sy = box.y + (box.height - side) / 2;
  const cut = (x / SHEET) * side;
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(sx, sy, side, side);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = theme.cosine;
  for (const [cx, cy] of [[sx, sy], [sx + side - cut, sy], [sx, sy + side - cut], [sx + side - cut, sy + side - cut]] as const) ctx.fillRect(cx, cy, cut, cut);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(sx, sy, side, side);
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(sx + cut, sy + cut, side - 2 * cut, side - 2 * cut);
  ctx.restore();
  label(ctx, "x", sx - 8, sy + cut / 2, { color: theme.cosine, font: theme.fontStrong, align: "right" });
  label(ctx, "12 − 2x", sx + side + 8, sy + side / 2, { color: theme.text, font: theme.font });
}

/** The pen seen from above: the wall along the top, fence on the other three sides. */
function drawPen(ctx: CanvasRenderingContext2D, box: Box, x: number, theme: LabTheme) {
  const k = Math.min((box.width - 90) / FENCE, (box.height - 22) / (FENCE / 2));
  const length = (FENCE - 2 * x) * k;
  const depth = x * k;
  const left = box.x + box.width / 2 - length / 2;
  const top = box.y + 8;
  line(ctx, box.x + 20, top, box.x + box.width - 20, top, theme.neutral, 5);
  ctx.save();
  ctx.fillStyle = theme.tangent;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(left, top, length, depth);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + depth);
  ctx.lineTo(left + length, top + depth);
  ctx.lineTo(left + length, top);
  ctx.stroke();
  ctx.restore();
  label(ctx, "wall", box.x + 22, top - 10, { color: theme.muted, font: theme.font });
  label(ctx, "x", left - 8, top + depth / 2, { color: theme.angle, font: theme.fontStrong, align: "right" });
  label(ctx, "40 − 2x", left + length / 2, top + depth + 11, { color: theme.text, font: theme.font, align: "center" });
}

/** The can from the side, to scale: tall and thin, or short and wide. */
function drawCan(ctx: CanvasRenderingContext2D, box: Box, r: number, h: number, theme: LabTheme) {
  const k = Math.min((box.width - 120) / (2 * r), (box.height - 14) / h);
  const w = 2 * r * k;
  const tall = h * k;
  const left = box.x + box.width / 2 - w / 2;
  const top = box.y + (box.height - tall) / 2;
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(left, top, w, tall);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(left, top, w, tall);
  ctx.restore();
  label(ctx, "2r", left + w / 2, top + tall + 10 > box.y + box.height ? top - 9 : top + tall + 10, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, "h", left + w + 8, top + tall / 2, { color: theme.text, font: theme.font });
}

export const optimiseRenderer: SimulationRenderer<OptimiseLayout> = {
  id: "optimise",
  layout: (width) => computeOptimiseLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, picture, graph, plot } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

    if (has("design")) {
      const id = DESIGN_PROBLEM_ORDER[Math.round(num(results.problem))] ?? "box";
      const problem = DESIGN_PROBLEMS[id];
      const x = num(results.x, 1);
      const value = num(results.value);
      const slope = num(results.slope);
      title(problem.label);
      if (id === "box") drawSheet(ctx, picture, x, theme);
      else if (id === "fence") drawPen(ctx, picture, x, theme);
      else drawCan(ctx, picture, x, num(results.other, 1), theme);

      const plane = createPlane(graph, problem.x, problem.y);
      drawPlane(ctx, plane, theme);
      // One line above the graph names both axes, leaving the space below for the caption.
      label(ctx, `${problem.valueName} / ${problem.unit}, against ${problem.xName}`, graph.x + 6, graph.y - 9, { color: theme.muted, font: theme.font });
      stroke(ctx, plane, problem.f, theme.curve, 2.5);
      const [px, py] = plane.toPx(x, value);
      if (has("labels")) {
        tangent(ctx, plane, x, value, slope, theme.tangent);
        const better = problem.maximum ? slope > 0 : slope < 0;
        const verdict = num(results.atBest) === 1 ? "flat: this is the best" : better ? `slope ${signed(slope)}: a bigger x does better` : `slope ${signed(slope)}: a smaller x does better`;
        caption(`${problem.valueName} ${fixed(value, 1)} ${problem.unit} · ${verdict}`);
      }
      disc(ctx, px, py, 5, theme.angle);
    }

    if (has("curve")) {
      const curve = STUDY_CURVES[STUDY_CURVE_ORDER[Math.round(num(results.curve))] ?? "cubic"];
      const plane = createPlane(plot, curve.x, curve.y);
      const x = num(results.px);
      const y = num(results.py);
      const slope = num(results.curveSlope);
      title(`y = ${curve.label}`);
      drawPlane(ctx, plane, theme);
      stroke(ctx, plane, curve.f, theme.curve, 2.5);

      if (has("chord")) {
        const a = num(results.a);
        const b = num(results.b);
        const [ax, ay] = plane.toPx(a, curve.f(a));
        const [bx, by] = plane.toPx(b, curve.f(b));
        line(ctx, ax, ay, bx, by, theme.angle, 2.5);
        disc(ctx, ax, ay, 4.5, theme.angle);
        disc(ctx, bx, by, 4.5, theme.angle);
        label(ctx, "a", ax - 9, ay - 9, { color: theme.angle, font: theme.fontStrong, align: "center" });
        label(ctx, "b", bx + 9, by - 9, { color: theme.angle, font: theme.fontStrong, align: "center" });
      }

      tangent(ctx, plane, x, y, slope, theme.tangent, 50);
      const [px, py] = plane.toPx(x, y);
      disc(ctx, px, py, 5, theme.text);

      if (has("strip")) {
        // Under the plot: where f′ is positive and where it is negative.
        const sy = plot.y + plot.height + 26;
        const edges = [curve.x[0], ...curve.critical, curve.x[1]];
        for (let i = 0; i < edges.length - 1; i++) {
          const middle = (edges[i]! + edges[i + 1]!) / 2;
          const [x1] = plane.toPx(edges[i]!, 0);
          const [x2] = plane.toPx(edges[i + 1]!, 0);
          const up = curve.df(middle) > 0;
          ctx.save();
          ctx.fillStyle = up ? theme.tangent : theme.secant;
          ctx.globalAlpha = 0.75;
          ctx.fillRect(x1, sy, x2 - x1, 8);
          ctx.restore();
          if (x2 - x1 > 24) label(ctx, up ? "+" : "−", (x1 + x2) / 2, sy + 18, { color: up ? theme.tangent : theme.secant, font: theme.fontStrong, align: "center" });
        }
        for (const c of curve.critical) disc(ctx, plane.toPx(c, 0)[0], sy + 4, 4, theme.text);
        label(ctx, "f′", plot.x - 8, sy + 4, { color: theme.muted, font: theme.font, align: "right" });
        if (has("labels")) {
          const turning = num(results.turning);
          const what = turning === 1 ? "flat: a maximum" : turning === 2 ? "flat: a minimum" : slope > 0 ? "rising" : "falling";
          const normal = Math.abs(slope) < 1e-9 ? "normal vertical" : `normal slope ${fixed(num(results.normalSlope))}`;
          caption(`slope ${fixed(slope)}: ${what} · ${normal}`);
        }
      }

      if (has("chord") && has("labels")) {
        const verdict = num(results.parallel) === 1 ? "parallel" : "not parallel yet";
        caption(`chord slope ${fixed(num(results.chordSlope))} · tangent slope ${fixed(slope)}: ${verdict}`);
      }
    }

    if (has("scene")) {
      const id = RATE_SCENE_ORDER[Math.round(num(results.scene))] ?? "ladder";
      const size = num(results.size, 1);
      const linked = num(results.linked);
      const speed = num(results.linkedSpeed);
      const cy = (height - 50) / 2 + 20;
      if (id === "ladder") {
        title("A 5 m ladder against a wall");
        const k = Math.min((width - 120) / LADDER, (height - 130) / LADDER);
        const wx = width / 2 - (LADDER * k) / 2;
        const floor = 44 + LADDER * k + 16;
        line(ctx, wx, 40, wx, floor, theme.neutral, 4);
        line(ctx, wx, floor, wx + LADDER * k + 30, floor, theme.neutral, 4);
        const fx = wx + size * k;
        const ty = floor - linked * k;
        line(ctx, fx, floor, wx, ty, theme.angle, 4);
        arrow(ctx, fx, floor - 12, fx + 34, floor - 12, { color: theme.sine, width: 2, head: 7 });
        arrow(ctx, wx + 12, ty, wx + 12, ty + Math.min(60, 12 + speed * 26), { color: theme.cosine, width: 2, head: 7 });
        label(ctx, `x = ${fixed(size)} m`, fx, floor + 14, { color: theme.sine, font: theme.font, align: "center" });
        label(ctx, `y = ${fixed(linked)} m`, wx + 8, ty - 12, { color: theme.cosine, font: theme.font });
        if (has("labels")) caption(`foot out at 1 m/s → top falls at ${fixed(speed)} m/s`);
      } else if (id === "balloon") {
        title("A balloon filled at 100 cm³/s");
        const k = Math.min(width - 60, height - 110) / 20;
        ctx.save();
        ctx.fillStyle = theme.cosine;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(width / 2, cy, size * k, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        line(ctx, width / 2, cy, width / 2 + size * k, cy, theme.text, 1.5, [3, 4]);
        arrow(ctx, width / 2 + size * k, cy, width / 2 + size * k + Math.min(40, 8 + speed * 14), cy, { color: theme.cosine, width: 2, head: 7 });
        label(ctx, `r = ${fixed(size)} cm`, width / 2, cy - 12, { color: theme.text, font: theme.font, align: "center" });
        if (has("labels")) caption(`100 cm³/s in → radius grows at ${fixed(speed)} cm/s`);
      } else {
        title("A ripple spreading at 0.5 m/s");
        const k = Math.min(width - 60, height - 110) / 20;
        ctx.save();
        ctx.strokeStyle = theme.sine;
        for (let ring = size; ring > 0.2; ring -= 1.5) {
          ctx.lineWidth = ring === size ? 3 : 1;
          ctx.globalAlpha = ring === size ? 1 : 0.4;
          ctx.beginPath();
          ctx.arc(width / 2, cy, ring * k, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        line(ctx, width / 2, cy, width / 2 + size * k, cy, theme.text, 1.5, [3, 4]);
        arrow(ctx, width / 2 + size * k, cy, width / 2 + size * k + 18, cy, { color: theme.sine, width: 2, head: 7 });
        label(ctx, `r = ${fixed(size)} m`, width / 2, cy - 12, { color: theme.text, font: theme.font, align: "center" });
        if (has("labels")) caption(`edge out at 0.5 m/s → area grows at ${fixed(speed, 1)} m²/s`);
      }
    }
  },
};
