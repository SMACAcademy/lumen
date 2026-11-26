/**
 * Chance made precise, in three pictures.
 *
 * Dice: the 36 outcomes of two dice as a 6 × 6 grid, the cells of event A
 * and event B coloured, with a Venn diagram counting each region. Given B,
 * every cell outside B is dimmed: the sample space has shrunk to B.
 *
 * Bayes: a tree from 1000 people, split by the disease and then by the
 * test, over 1000 squares — one per person — coloured by what happened.
 *
 * Distribution: a random variable's probabilities as bars, with the mean
 * and one standard deviation either side, and the relative frequencies of
 * the simulated trials as narrow bars that settle onto the exact ones.
 */

import {
  PROBABILITY_DIST_ORDER,
  PROBABILITY_EVENT_ORDER,
  probabilityDistribution,
  probabilityEventHolds,
  probabilityEventLabel,
  probabilitySimulate,
} from "@ise/mathematics-engine";
import { arrow, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface ProbabilityLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Top-left of the dice grid and the side of one cell. */
  grid: { x: number; y: number; cell: number };
  /** Where the names of A and B are written. */
  legend: { x: number; y: number };
  venn: Box;
  tree: Box;
  people: Box;
  /** The bars of the distribution. */
  plot: Box;
}

export function computeProbabilityLayout(width: number): ProbabilityLayout {
  const compact = width < 560;
  const height = compact ? 410 : 400;
  if (compact) {
    const cell = Math.min(30, Math.floor((width - 70) / 6));
    const gx = Math.round((width - 6 * cell) / 2 + 8);
    const gy = 56;
    const bottom = gy + 6 * cell;
    return {
      width,
      height,
      compact,
      grid: { x: gx, y: gy, cell },
      legend: { x: 16, y: bottom + 14 },
      venn: { x: 16, y: bottom + 46, width: width - 32, height: height - (bottom + 46) - 32 },
      tree: { x: 16, y: 30, width: width - 32, height: 150 },
      people: { x: 16, y: 196, width: width - 32, height: 160 },
      plot: { x: 40, y: 46, width: width - 54, height: height - 46 - 76 },
    };
  }
  const cell = 38;
  const gx = 56;
  const gy = 54;
  return {
    width,
    height,
    compact,
    grid: { x: gx, y: gy, cell },
    legend: { x: gx - 24, y: gy + 6 * cell + 18 },
    venn: { x: gx + 6 * cell + 40, y: gy, width: width - (gx + 6 * cell + 40) - 20, height: 6 * cell },
    tree: { x: 24, y: 30, width: width * 0.48 - 24, height: height - 30 - 40 },
    people: { x: width * 0.52, y: 50, width: width * 0.48 - 20, height: height - 50 - 70 },
    plot: { x: 52, y: 46, width: width - 52 - 20, height: height - 46 - 76 },
  };
}

const fixed = (v: number, digits = 3) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
/** An expected count: whole when it is whole, else to one decimal. */
const count = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : v.toFixed(1));

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

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, alpha: number) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, fillAlpha: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = colour;
  ctx.globalAlpha = fillAlpha;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawDice(ctx: CanvasRenderingContext2D, layout: ProbabilityLayout, input: Parameters<SimulationRenderer<ProbabilityLayout>["draw"]>[2], caption: (w: string) => void) {
  const { theme, layers, results } = input;
  const has = (layer: string) => layers.has(layer);
  const both = has("venn") || has("shrink");
  const shrink = has("shrink");
  const eventA = PROBABILITY_EVENT_ORDER[Math.round(num(results.eventA))] ?? "sum";
  const eventB = PROBABILITY_EVENT_ORDER[Math.round(num(results.eventB))] ?? "atLeast";
  const s = Math.round(num(results.s, 7));
  const t = Math.round(num(results.t, 10));
  const { x: gx, y: gy, cell } = layout.grid;

  label(ctx, "first die →", gx + 3 * cell, gy - 24, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "second ↓", gx - 22, gy - 24, { color: theme.muted, font: theme.font, align: "center" });
  for (let i = 1; i <= 6; i++) {
    label(ctx, String(i), gx + (i - 0.5) * cell, gy - 9, { color: theme.muted, font: theme.font, align: "center" });
    label(ctx, String(i), gx - 10, gy + (i - 0.5) * cell, { color: theme.muted, font: theme.font, align: "right" });
  }

  for (let first = 1; first <= 6; first++) {
    for (let second = 1; second <= 6; second++) {
      const x = gx + (first - 1) * cell;
      const y = gy + (second - 1) * cell;
      const inA = probabilityEventHolds(eventA, first, second, s);
      const inB = both && probabilityEventHolds(eventB, first, second, t);
      const dimmed = shrink && !inB;
      if (inA && inB) rect(ctx, x + 1, y + 1, cell - 2, cell - 2, theme.angle, 0.85);
      else if (inA) rect(ctx, x + 1, y + 1, cell - 2, cell - 2, theme.sine, dimmed ? 0.15 : 0.6);
      else if (inB) rect(ctx, x + 1, y + 1, cell - 2, cell - 2, theme.cosine, 0.45);
      label(ctx, String(first + second), x + cell / 2, y + cell / 2, { color: dimmed ? theme.muted : theme.text, font: theme.font, align: "center" });
    }
  }
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 6; i++) {
    ctx.beginPath();
    ctx.moveTo(gx + i * cell, gy);
    ctx.lineTo(gx + i * cell, gy + 6 * cell);
    ctx.moveTo(gx, gy + i * cell);
    ctx.lineTo(gx + 6 * cell, gy + i * cell);
    ctx.stroke();
  }
  ctx.restore();

  // The names of the events, with their colours.
  const { x: lx, y: ly } = layout.legend;
  rect(ctx, lx, ly - 5, 10, 10, theme.sine, 0.8);
  label(ctx, `A: ${probabilityEventLabel(eventA, s)}`, lx + 16, ly, { color: theme.text, font: theme.font });
  if (both) {
    const bx = lx + Math.max(130, (layout.compact ? layout.width - 32 : 6 * cell + 48) / 2);
    rect(ctx, bx, ly - 5, 10, 10, theme.cosine, 0.8);
    label(ctx, `B: ${probabilityEventLabel(eventB, t)}`, bx + 16, ly, { color: theme.text, font: theme.font });
    rect(ctx, lx, ly + 11, 10, 10, theme.angle, 0.85);
    label(ctx, "A and B", lx + 16, ly + 16, { color: theme.text, font: theme.font });
  }

  const countA = num(results.countA);
  const countB = num(results.countB);
  const countBoth = num(results.countBoth);

  if (has("venn")) {
    const v = layout.venn;
    const r = Math.max(14, Math.min(v.height / 2 - 6, v.width / 4.4));
    const cy = v.y + v.height / 2;
    const ax = v.x + v.width / 2 - r * 0.6;
    const bx = v.x + v.width / 2 + r * 0.6;
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1;
    ctx.strokeRect(v.x, v.y, v.width, v.height);
    ctx.restore();
    label(ctx, "S", v.x + 6, v.y + 9, { color: theme.muted, font: theme.fontStrong });
    circle(ctx, ax, cy, r, theme.sine, shrink ? 0.06 : 0.18);
    circle(ctx, bx, cy, r, theme.cosine, shrink ? 0.3 : 0.18);
    label(ctx, "A", ax - r * 0.75, cy - r * 0.8, { color: theme.sine, font: theme.fontStrong, align: "center" });
    label(ctx, "B", bx + r * 0.75, cy - r * 0.8, { color: theme.cosine, font: theme.fontStrong, align: "center" });
    if (has("labels")) {
      const style = { color: theme.text, font: theme.fontStrong, align: "center" as const };
      label(ctx, String(countA - countBoth), ax - r * 0.5, cy, style);
      label(ctx, String(countBoth), (ax + bx) / 2, cy, style);
      label(ctx, String(countB - countBoth), bx + r * 0.5, cy, style);
      label(ctx, String(36 - num(results.countEither)), v.x + v.width - 8, v.y + v.height - 10, { color: theme.muted, font: theme.font, align: "right" });
    }
  }

  if (!has("labels")) return;
  if (shrink) {
    const verdict = num(results.independent) === 1 ? "= P(A): independent" : "≠ P(A)";
    caption(countB > 0 ? `P(A|B) = ${countBoth}/${countB} = ${fixed(num(results.pAgivenB))} ${verdict}` : "B cannot happen");
  } else if (has("venn")) {
    caption(`P(A ∪ B) = (${countA} + ${countB} − ${countBoth})/36 = ${fixed(num(results.pEither))}`);
  } else {
    caption(`P(A) = ${countA}/36 = ${fixed(num(results.pA))}`);
  }
}

function drawBayes(ctx: CanvasRenderingContext2D, layout: ProbabilityLayout, input: Parameters<SimulationRenderer<ProbabilityLayout>["draw"]>[2], caption: (w: string) => void) {
  const { theme, layers, results } = input;
  const has = (layer: string) => layers.has(layer);
  const words = has("labels");
  const prevalence = num(results.prevalence);
  const sensitivity = num(results.sensitivity);
  const falsePositive = num(results.falsePositive);
  const sick = num(results.sick);
  const healthy = num(results.healthy);
  const tp = num(results.truePositives);
  const fn = num(results.falseNegatives);
  const fp = num(results.falsePositives);
  const tn = num(results.trueNegatives);

  if (has("tree")) {
    const b = layout.tree;
    const root = { x: b.x + 22, y: b.y + b.height / 2 };
    const midX = b.x + b.width * 0.4;
    const leafX = b.x + b.width * 0.72;
    const ill = { x: midX, y: b.y + b.height * 0.25 };
    const well = { x: midX, y: b.y + b.height * 0.75 };
    const leaves = [
      { x: leafX, y: b.y + 8, from: ill, p: sensitivity, sign: "+", n: tp, colour: theme.tangent },
      { x: leafX, y: b.y + b.height * 0.36, from: ill, p: 1 - sensitivity, sign: "−", n: fn, colour: theme.muted },
      { x: leafX, y: b.y + b.height * 0.64, from: well, p: falsePositive, sign: "+", n: fp, colour: theme.secant },
      { x: leafX, y: b.y + b.height - 8, from: well, p: 1 - falsePositive, sign: "−", n: tn, colour: theme.muted },
    ];
    const branch = (from: { x: number; y: number }, to: { x: number; y: number }, p: number, colour: string) => {
      line(ctx, from.x + 6, from.y, to.x - 6, to.y, colour, 2);
      const above = to.y < from.y;
      label(ctx, fixed(p, 3).replace(/0+$/, "").replace(/\.$/, ""), (from.x + to.x) / 2, (from.y + to.y) / 2 + (above ? -9 : 9), { color: theme.muted, font: theme.font, align: "center" });
    };
    branch(root, ill, prevalence, theme.cosine);
    branch(root, well, 1 - prevalence, theme.neutral);
    for (const leaf of leaves) branch(leaf.from, leaf, leaf.p, leaf.colour);
    label(ctx, "1000", root.x, root.y, { color: theme.text, font: theme.fontStrong, align: "center" });
    label(ctx, words ? `ill ${count(sick)}` : "ill", ill.x, ill.y, { color: theme.cosine, font: theme.fontStrong, align: "center", background: theme.background });
    label(ctx, words ? `well ${count(healthy)}` : "well", well.x, well.y, { color: theme.neutral, font: theme.fontStrong, align: "center", background: theme.background });
    for (const leaf of leaves) {
      label(ctx, words ? `${leaf.sign} ${count(leaf.n)}` : leaf.sign, leaf.x, leaf.y, { color: leaf.sign === "+" ? leaf.colour : theme.text, font: theme.fontStrong });
    }
  }

  if (has("people")) {
    const b = layout.people;
    const columns = 40;
    const rows = 25;
    const pitch = Math.min(b.width / columns, b.height / rows);
    const size = Math.max(2, pitch - 1.5);
    const left = b.x + (b.width - pitch * columns) / 2;
    // The ill first (caught, then missed), then the false alarms, then everyone else.
    const groups = [
      { n: Math.round(tp), colour: theme.tangent, alpha: 1 },
      { n: Math.round(sick) - Math.round(tp), colour: theme.cosine, alpha: 0.9 },
      { n: Math.round(fp), colour: theme.secant, alpha: 1 },
    ];
    ctx.save();
    let k = 0;
    for (const g of groups) {
      ctx.fillStyle = g.colour;
      ctx.globalAlpha = g.alpha;
      for (let i = 0; i < g.n && k < columns * rows; i++, k++) ctx.fillRect(left + (k % columns) * pitch, b.y + Math.floor(k / columns) * pitch, size, size);
    }
    ctx.fillStyle = theme.neutral;
    ctx.globalAlpha = 0.18;
    for (; k < columns * rows; k++) ctx.fillRect(left + (k % columns) * pitch, b.y + Math.floor(k / columns) * pitch, size, size);
    ctx.restore();
    const ly = b.y + rows * pitch + 12;
    const keys = [
      { text: "ill, +", colour: theme.tangent },
      { text: "ill, −", colour: theme.cosine },
      { text: "well, +", colour: theme.secant },
    ];
    const step = Math.min(84, b.width / 3);
    keys.forEach((key, i) => {
      rect(ctx, left + i * step, ly - 4, 8, 8, key.colour, 1);
      label(ctx, key.text, left + i * step + 12, ly, { color: theme.text, font: theme.font });
    });
  }

  if (words) caption(`P(ill | +) = ${count(tp)}/${count(tp + fp)} = ${fixed(num(results.posterior))}`);
}

function drawDistribution(ctx: CanvasRenderingContext2D, layout: ProbabilityLayout, input: Parameters<SimulationRenderer<ProbabilityLayout>["draw"]>[2], caption: (w: string) => void, title: (w: string) => void) {
  const { theme, layers, results } = input;
  const has = (layer: string) => layers.has(layer);
  const words = has("labels");
  const distId = PROBABILITY_DIST_ORDER[Math.round(num(results.dist))] ?? "binomial";
  const n = Math.round(num(results.n, 4));
  const p = num(results.p, 0.5);
  const r = Math.round(num(results.r));
  const trials = Math.round(num(results.trials));
  const { min, probs } = probabilityDistribution(distId, n, p);
  const simulate = has("simulation") && trials > 0;
  const freqs = simulate ? probabilitySimulate(distId, n, p, trials).map((c) => c / trials) : [];

  title(distId === "binomial" ? `X ~ B(${n}, ${p.toFixed(2)}): successes in ${n} trials` : distId === "diceSum" ? "X = the sum of two dice" : "X = the larger of two dice");

  const b = layout.plot;
  const top = Math.max(0.1, ...probs, ...freqs) * 1.12;
  const yMax = Math.ceil(top / 0.05) * 0.05;
  const slots = probs.length;
  const slot = b.width / slots;
  const xOf = (x: number) => b.x + (x - min + 0.5) * slot;
  const yOf = (q: number) => b.y + b.height - (q / yMax) * b.height;

  // Gridlines every 0.1 (or 0.05 on a short axis), labelled on the left.
  const tick = yMax > 0.3 ? 0.1 : 0.05;
  for (let q = 0; q <= yMax + 1e-9; q += tick) {
    const y = yOf(q);
    line(ctx, b.x, y, b.x + b.width, y, theme.grid, 1);
    label(ctx, q.toFixed(tick < 0.1 ? 2 : 1), b.x - 6, y, { color: theme.muted, font: theme.font, align: "right" });
  }
  line(ctx, b.x, b.y + b.height, b.x + b.width, b.y + b.height, theme.axis, 1.25);
  label(ctx, "P(X = x)", b.x - 4, b.y - 12, { color: theme.muted, font: theme.font });

  probs.forEach((q, i) => {
    const x = min + i;
    const cx = xOf(x);
    const h = (q / yMax) * b.height;
    const chosen = x === r;
    rect(ctx, cx - slot * 0.36, b.y + b.height - h, slot * 0.72, h, chosen ? theme.tangent : theme.curve, chosen ? 0.75 : 0.45);
    label(ctx, String(x), cx, b.y + b.height + 12, { color: chosen ? theme.tangent : theme.muted, font: chosen ? theme.fontStrong : theme.font, align: "center" });
  });
  if (simulate) {
    freqs.forEach((f, i) => {
      const cx = xOf(min + i);
      const h = (f / yMax) * b.height;
      rect(ctx, cx - slot * 0.12, b.y + b.height - h, slot * 0.24, h, theme.angle, 0.95);
    });
  }

  if (words) {
    const mean = num(results.mean);
    const sd = num(results.sd);
    const mx = xOf(mean);
    line(ctx, mx, b.y, mx, b.y + b.height, theme.cosine, 2, [5, 4]);
    label(ctx, "μ", mx + 5, b.y + 26, { color: theme.cosine, font: theme.fontStrong });
    if (sd > 0) {
      const y = b.y + 8;
      arrow(ctx, xOf(mean - sd), y, xOf(mean + sd), y, { color: theme.cosine, width: 1.5, head: 6, double: true });
      label(ctx, "σ", xOf(mean + sd) + 8, y, { color: theme.cosine, font: theme.font });
    }
    caption(`μ = ${fixed(mean, 2)} · σ² = ${fixed(num(results.variance), 2)} · P(X = ${r}) = ${fixed(num(results.pAt))}`);
  }
  if (has("simulation")) {
    const sim = trials === 0 ? "Press play to repeat the experiment" : words ? `${trials} trials: average X = ${fixed(num(results.simMean), 2)}` : `${trials} trials`;
    label(ctx, sim, layout.width / 2, layout.height - 34, { color: trials > 0 ? theme.angle : theme.muted, font: theme.font, align: "center" });
  }
}

export const probabilityRenderer: SimulationRenderer<ProbabilityLayout> = {
  id: "probability",
  layout: (width) => computeProbabilityLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
    const title = (words: string) => label(ctx, words, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

    if (has("grid")) {
      title("Two dice: 36 equally likely outcomes");
      drawDice(ctx, layout, input, caption);
    }
    if (has("tree") || has("people")) {
      title("A test for a disease, on 1000 people");
      drawBayes(ctx, layout, input, caption);
    }
    if (has("bars")) drawDistribution(ctx, layout, input, caption, title);
  },
};
