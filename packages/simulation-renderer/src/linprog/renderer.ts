/**
 * Linear inequalities and linear programming, in three pictures.
 *
 * Number line: each inequality's answer as a ray — an open dot for < and >,
 * a closed one for ≤ and ≥ — with a third line for the numbers on both
 * rays. A marker shows the number being tried.
 *
 * Half-plane: the boundary px + qy = r, solid when it belongs and dashed
 * when it does not, with the solutions' side shaded and a point to test.
 *
 * Region: the constraints of a linear programming problem, the feasible
 * region they cut out of the first quadrant, its corners lettered A, B, C…,
 * a trial point, and the iso-profit line Z = k.
 *
 * Answers — solved forms, corner values, the best value — are written only
 * with the words layer on, so an estimate can hide them.
 */

import {
  LP_NUMBER_LIMIT,
  LP_PLANE_LIMIT,
  LP_PROBLEM_ORDER,
  LP_PROBLEMS,
  LP_RELATION_ORDER,
  LP_SYMBOL,
  lpConstraintText,
  lpFractionText,
  lpHalfPlane,
  lpIntegerCount,
  lpIntersect,
  lpIntervalOf,
  lpLinearText,
  lpOneSideText,
  lpProblemRegion,
  lpSolveOne,
  lpValue,
  lpVisibleRegion,
  type LpInterval,
  type LpRelation,
  type LpSolution,
} from "@ise/mathematics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface LinprogLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The number lines run from left to right. */
  numberLeft: number;
  numberRight: number;
  /** A square plane for the half-plane, and the plot of a linear programming problem. */
  square: Box;
  plot: Box;
}

export function computeLinprogLayout(width: number): LinprogLayout {
  const compact = width < 560;
  const height = compact ? 400 : 430;
  const left = compact ? 40 : 52;
  const top = 50;
  const bottom = 58;
  const side = Math.min(width - left - 16, height - top - bottom);
  return {
    width,
    height,
    compact,
    numberLeft: 22,
    numberRight: width - 22,
    square: { x: Math.max(left, (width - side) / 2), y: top, width: side, height: side },
    plot: { x: left, y: top, width: width - left - 16, height: height - top - bottom },
  };
}

const fmt = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return Object.is(r, -0) || r === 0 ? "0" : String(r).replace("-", "−");
};
const relAt = (v: unknown): LpRelation => LP_RELATION_ORDER[Math.round(num(v))] ?? "le";
const LETTERS = "ABCDEF";

/** As NCERT letters them: O for the origin, then A, B, C… round the region. */
export function cornerNames(corners: readonly { x: number; y: number }[]): string[] {
  let next = 0;
  return corners.map((k) => (k.x === 0 && k.y === 0 ? "O" : (LETTERS[next++] ?? "?")));
}

/** "x < 4", "x ≥ −3/2", "every x", "no x". */
export function solvedText(s: LpSolution, rel: LpRelation): string {
  if (s.kind === "all") return "every x";
  if (s.kind === "none") return "no x";
  const strict = rel === "lt" || rel === "gt";
  const sign = s.kind === "above" ? (strict ? ">" : "≥") : strict ? "<" : "≤";
  return `x ${sign} ${lpFractionText(s.bound)}`;
}

/** "−1 ≤ x < 2", "x > 5", "every x", "no x". */
export function intervalText(set: LpInterval): string {
  if (set.empty) return "no x";
  const lo = set.lo ? `${lpFractionText(set.lo)} ${set.loClosed ? "≤" : "<"} ` : "";
  const hi = set.hi ? ` ${set.hiClosed ? "≤" : "<"} ${lpFractionText(set.hi)}` : "";
  if (!lo && !hi) return "every x";
  if (set.lo && set.hi && lpValue(set.lo) === lpValue(set.hi)) return `x = ${lpFractionText(set.lo)}`;
  if (!lo) return `x${hi}`;
  if (!hi) return `x ${set.loClosed ? "≥" : ">"} ${lpFractionText(set.lo!)}`;
  return `${lo}x${hi}`;
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
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

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, fill?: string) {
  ctx.save();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function fillPolygon(ctx: CanvasRenderingContext2D, plane: Plane, points: readonly (readonly [number, number])[], colour: string, alpha: number) {
  if (points.length < 3) return;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.fillStyle = colour;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  points.forEach(([x, y], i) => {
    const [px, py] = plane.toPx(x, y);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** The line a·x + b·y = c across a plane, clipped to it. */
function boundary(ctx: CanvasRenderingContext2D, plane: Plane, a: number, b: number, c: number, colour: string, lineWidth: number, dash?: number[]) {
  if (a === 0 && b === 0) return;
  const [x0, x1] = plane.xDomain;
  const [y0, y1] = plane.yDomain;
  const ends: [number, number][] =
    Math.abs(b) >= Math.abs(a)
      ? [[x0, (c - a * x0) / b], [x1, (c - a * x1) / b]]
      : [[(c - b * y0) / a, y0], [(c - b * y1) / a, y1]];
  const [p, q] = ends.map(([x, y]) => plane.toPx(x, y));
  ctx.save();
  clipToPlane(ctx, plane);
  line(ctx, p![0], p![1], q![0], q![1], colour, lineWidth, dash);
  ctx.restore();
}

// ── Number line ──────────────────────────────────────────────────────────────

function numberAxis(ctx: CanvasRenderingContext2D, layout: LinprogLayout, y: number, theme: LabTheme, ticks: boolean) {
  const { numberLeft: x0, numberRight: x1, compact } = layout;
  const at = (x: number) => x0 + ((x + LP_NUMBER_LIMIT) / (2 * LP_NUMBER_LIMIT)) * (x1 - x0);
  line(ctx, x0, y, x1, y, theme.axis, 1.5);
  for (let x = -LP_NUMBER_LIMIT; x <= LP_NUMBER_LIMIT; x++) {
    const big = x % 5 === 0;
    line(ctx, at(x), y - (big ? 5 : 3), at(x), y + (big ? 5 : 3), theme.axis, 1);
    if (ticks && x % (compact ? 5 : 2) === 0) label(ctx, fmt(x), at(x), y + 14, { color: theme.muted, font: theme.font, align: "center" });
  }
  return at;
}

/** A set of numbers on the line: a thick bar, a dot at each finite end, an arrowhead where it runs off. */
function drawSet(ctx: CanvasRenderingContext2D, layout: LinprogLayout, y: number, set: LpInterval, colour: string, theme: LabTheme, at: (x: number) => number) {
  if (set.empty) return;
  const lim = LP_NUMBER_LIMIT;
  const lo = set.lo ? lpValue(set.lo) : -Infinity;
  const hi = set.hi ? lpValue(set.hi) : Infinity;
  const from = Math.max(lo, -lim);
  const to = Math.min(hi, lim);
  if (from > to) return;
  const [px, qx] = [at(from), at(to)];
  ctx.save();
  ctx.globalAlpha = 0.85;
  line(ctx, px, y, qx, y, colour, 6);
  ctx.restore();
  if (!set.lo) arrow(ctx, px + 4, y, layout.numberLeft - 8, y, { color: colour, width: 3, head: 9 });
  if (!set.hi) arrow(ctx, qx - 4, y, layout.numberRight + 8, y, { color: colour, width: 3, head: 9 });
  for (const [end, closed] of [[set.lo, set.loClosed], [set.hi, set.hiClosed]] as const) {
    if (!end || Math.abs(lpValue(end)) > lim) continue;
    if (closed) disc(ctx, at(lpValue(end)), y, 6, colour);
    else ring(ctx, at(lpValue(end)), y, 6, colour, theme.background);
  }
}

function inequalityText(a: number, b: number, rel: LpRelation, c: number) {
  return `${lpOneSideText(a, b)} ${LP_SYMBOL[rel]} ${fmt(c)}`;
}

function drawNumberLines(ctx: CanvasRenderingContext2D, layout: LinprogLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean, caption: (t: string, row: 0 | 1) => void) {
  const { height, width } = layout;
  const second = has("second");
  const words = has("labels");
  const ineq = [
    { a: num(results.a), b: num(results.b), c: num(results.c), rel: relAt(results.rel1), colour: theme.sine },
    { a: num(results.a2), b: num(results.b2), c: num(results.c2), rel: relAt(results.rel2), colour: theme.cosine },
  ];
  const solutions = ineq.map((q) => lpSolveOne(q.a, q.b, q.rel, q.c));
  const rows = second ? [0.25, 0.47, 0.69].map((f) => Math.round(height * f)) : [Math.round(height * 0.42)];
  const t = num(results.t);
  const shown = second ? 2 : 1;

  for (let i = 0; i < shown; i++) {
    const q = ineq[i]!;
    const y = rows[i]!;
    const at = numberAxis(ctx, layout, y, theme, true);
    label(ctx, inequalityText(q.a, q.b, q.rel, q.c), 16, y - 26, { color: q.colour, font: theme.fontStrong });
    if (words) {
      const s = solutions[i]!;
      const flip = s.flipped ? `÷ (${fmt(q.a)}) flips: ` : "";
      label(ctx, `${flip}${solvedText(s, q.rel)}`, width - 16, y - 26, { color: theme.text, font: theme.font, align: "right" });
    }
    drawSet(ctx, layout, y, lpIntervalOf(solutions[i]!), q.colour, theme, at);
    // The number being tried: a small marker above the line.
    const mx = at(t);
    ctx.save();
    ctx.fillStyle = theme.point;
    ctx.beginPath();
    ctx.moveTo(mx, y - 9);
    ctx.lineTo(mx - 5, y - 17);
    ctx.lineTo(mx + 5, y - 17);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (second) {
    const y = rows[2]!;
    const both = lpIntersect(lpIntervalOf(solutions[0]!), lpIntervalOf(solutions[1]!));
    const at = numberAxis(ctx, layout, y, theme, true);
    label(ctx, "both at once", 16, y - 26, { color: theme.curve, font: theme.fontStrong });
    drawSet(ctx, layout, y, both, theme.curve, theme, at);
    if (words) {
      label(ctx, intervalText(both), width - 16, y - 26, { color: theme.text, font: theme.font, align: "right" });
      // The whole numbers of a bounded answer, as dots under the line.
      if (both.lo && both.hi) {
        for (let x = -LP_NUMBER_LIMIT; x <= LP_NUMBER_LIMIT; x++) {
          const inside = lpIntegerCount(lpIntersect(both, { empty: false, lo: { n: x, d: 1 }, loClosed: true, hi: { n: x, d: 1 }, hiClosed: true })) === 1;
          if (inside) disc(ctx, at(x), y + 26, 3.5, theme.curve);
        }
      }
      const holds = [num(results.holds1), num(results.holds2)];
      const verdict = holds[0] && holds[1] ? "satisfies both" : holds[0] ? "fails the second" : holds[1] ? "fails the first" : "fails both";
      caption(`x = ${fmt(t)} ${verdict}`, 0);
      const count = num(results.integers);
      caption(`both: ${intervalText(both)}${both.lo && both.hi ? ` · ${count} whole number${count === 1 ? "" : "s"}` : ""}`, 1);
    }
  } else if (words) {
    const q = ineq[0]!;
    const value = q.a * t + q.b;
    caption(`at x = ${fmt(t)}: ${lpOneSideText(q.a, q.b)} = ${fmt(value)}, and ${fmt(value)} ${LP_SYMBOL[q.rel]} ${fmt(q.c)} is ${num(results.holds1) ? "true" : "false"}`, 1);
  }
}

// ── Half-plane ───────────────────────────────────────────────────────────────

function drawHalfPlane(ctx: CanvasRenderingContext2D, layout: LinprogLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean, caption: (t: string, row: 0 | 1) => void, title: (t: string) => void) {
  const lim = LP_PLANE_LIMIT;
  const plane = createPlane(layout.square, [-lim, lim], [-lim, lim]);
  const p = num(results.p);
  const q = num(results.q);
  const r = num(results.r);
  const rel = relAt(results.rel);
  const strict = rel === "lt" || rel === "gt";
  title(`${lpLinearText(p, q)} ${LP_SYMBOL[rel]} ${fmt(r)}`);
  drawPlane(ctx, plane, theme, { gridStep: 1 });
  if (has("shade")) fillPolygon(ctx, plane, lpHalfPlane(p, q, rel, r, lim), theme.sine, 0.28);
  boundary(ctx, plane, p, q, r, theme.sine, 2.5, strict ? [8, 6] : undefined);

  const [ox, oy] = plane.toPx(0, 0);
  const [px, py] = plane.toPx(num(results.u), num(results.v));
  disc(ctx, px, py, 6, theme.point);
  if (has("labels")) {
    ring(ctx, ox, oy, 7, theme.angle);
    if (num(results.degenerate)) {
      caption(`no line: 0 ${LP_SYMBOL[rel]} ${fmt(r)} is ${num(results.originHolds) ? "always true" : "never true"}`, 1);
      return;
    }
    const u = num(results.u);
    const v = num(results.v);
    const lhs = num(results.lhs);
    caption(`(${fmt(u)}, ${fmt(v)}): ${lpLinearText(p, q)} = ${fmt(lhs)}, ${num(results.holds) ? "a solution" : "not a solution"}`, 0);
    const origin = num(results.originHolds);
    caption(
      r === 0
        ? "(0, 0) is on the line: test another point to choose the side"
        : `(0, 0) gives 0 ${LP_SYMBOL[rel]} ${fmt(r)}: ${origin ? "true, shade its side" : "false, shade the other side"}`,
      1,
    );
  }
}

// ── Linear programming ───────────────────────────────────────────────────────

function drawRegion(ctx: CanvasRenderingContext2D, layout: LinprogLayout, results: Record<string, unknown>, theme: LabTheme, has: (l: string) => boolean, caption: (t: string, row: 0 | 1) => void, title: (t: string) => void) {
  const id = LP_PROBLEM_ORDER[Math.round(num(results.problem))] ?? "furniture";
  const problem = LP_PROBLEMS[id];
  const region = lpProblemRegion(id);
  const plane = createPlane(layout.plot, [0, problem.view[0]], [0, problem.view[1]]);
  const max = problem.goal === "max";
  const words = has("labels");
  title(`${problem.label} · ${max ? "max" : "min"} Z = ${lpLinearText(problem.p, problem.q)}`);
  label(ctx, problem.constraints.map(lpConstraintText).join(" · "), layout.width / 2, 32, { color: theme.muted, font: theme.font, align: "center" });
  drawPlane(ctx, plane, theme);

  fillPolygon(ctx, plane, lpVisibleRegion(problem.constraints, problem.view[0], problem.view[1]), theme.tangent, 0.3);
  for (const k of problem.constraints) boundary(ctx, plane, k.a, k.b, k.c, theme.neutral, 1.5);

  const corners = region.corners.map((k) => ({ x: lpValue(k.x), y: lpValue(k.y), z: lpValue(k.z) }));
  const names = cornerNames(corners);
  const name = (i: number) => names[i] ?? "?";
  const where = (i: number) => `${name(i)} (${fmt(corners[i]!.x)}, ${fmt(corners[i]!.y)})`;

  if (has("iso")) {
    const k = num(results.k);
    const meets = num(results.isoMeets) === 1;
    boundary(ctx, plane, problem.p, problem.q, k, theme.angle, 2.5, [9, 6]);
    if (words) {
      const at = num(results.isoAtBest) === 1 ? "touches the region at its best" : meets ? "crosses the region" : "misses the region";
      caption(`Z = ${fmt(k)}: the line ${at}`, 0);
    }
  }

  if (has("corners") && corners.length) {
    const cx = corners.reduce((s, k) => s + k.x, 0) / corners.length;
    const cy = corners.reduce((s, k) => s + k.y, 0) / corners.length;
    const [ccx, ccy] = plane.toPx(cx, cy);
    const selected = Math.round(num(results.corner)) - 1;
    corners.forEach((k, i) => {
      const [px, py] = plane.toPx(k.x, k.y);
      disc(ctx, px, py, 5, theme.angle);
      if (i === selected) ring(ctx, px, py, 9, theme.text);
      const dx = px - ccx;
      const dy = py - ccy;
      const len = Math.hypot(dx, dy) || 1;
      const lx = Math.min(layout.plot.x + layout.plot.width - 6, Math.max(layout.plot.x + 8, px + (dx / len) * 15));
      const ly = Math.min(layout.plot.y + layout.plot.height - 6, Math.max(layout.plot.y + 8, py + (dy / len) * 15));
      label(ctx, name(i), lx, ly, { color: theme.angle, font: theme.fontStrong, align: "center", background: theme.background });
    });
    if (words && !has("iso") && selected >= 0) caption(`${where(selected)}: Z = ${fmt(corners[selected]!.z)}`, 0);
  }

  if (has("point")) {
    const [px, py] = plane.toPx(num(results.rx), num(results.ry));
    disc(ctx, px, py, 6, theme.point);
    if (words) {
      const broken = num(results.broken);
      const verdict = broken === 0 ? "inside the region" : `breaks ${broken} constraint${broken === 1 ? "" : "s"}`;
      caption(`(${fmt(num(results.rx))}, ${fmt(num(results.ry))}): Z = ${fmt(num(results.pointZ))}, ${verdict}`, 0);
    }
  }

  if (!words) return;
  if (!region.feasible) {
    caption("no point satisfies every constraint", 1);
    return;
  }
  if (!has("corners") && !has("iso")) {
    caption(region.bounded ? `a bounded region with ${corners.length} corners` : "an unbounded region: it runs on for ever", 1);
    return;
  }
  const goal = max ? "maximum" : "minimum";
  if (num(results.hasBest) !== 1) {
    caption(`no ${goal}: Z ${max ? ">" : "<"} ${fmt(max ? num(results.zHigh) : num(results.zLow))} still meets the region`, 1);
    return;
  }
  const best = num(results.best);
  const winners = corners.map((k, i) => (Math.abs(k.z - best) < 1e-9 ? i : -1)).filter((i) => i >= 0);
  caption(
    winners.length > 1 ? `${goal} Z = ${fmt(best)} all along ${winners.map(name).join("")}` : `${goal} Z = ${fmt(best)} at ${where(winners[0] ?? 0)}`,
    1,
  );
}

export const linprogRenderer: SimulationRenderer<LinprogLayout> = {
  id: "linprog",
  layout: (width) => computeLinprogLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string, row: 0 | 1) => label(ctx, words, width / 2, height - (row === 0 ? 34 : 14), { color: theme.text, font: theme.font, align: "center" });
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

    if (has("numberline")) {
      title(has("second") ? "Two inequalities in x" : "An inequality in x");
      drawNumberLines(ctx, layout, results, theme, has, caption);
    }
    if (has("plane")) drawHalfPlane(ctx, layout, results, theme, has, caption, title);
    if (has("region")) drawRegion(ctx, layout, results, theme, has, caption, title);
  },
};
