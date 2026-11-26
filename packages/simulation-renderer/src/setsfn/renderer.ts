/**
 * Sets, relations and functions, in five pictures.
 *
 * Venn: the universal set as a box, two (or three) circles, every element
 * written in its region, and the chosen operation shaded.
 *
 * Relation: the relation on {1, …, 5} as a grid of ordered pairs (row a,
 * column b) and as an arrow diagram, with the pairs a closure added in a
 * second colour.
 *
 * Arrows: a function from A = {1, 2, 3, 4} to B as arrows between two
 * ovals; elements with no arrow or two arrows are ringed. The "reverse"
 * layer turns every arrow round, to show when f⁻¹ exists.
 *
 * Graph: one function on its domain, the codomain and the range as bars
 * beside the y-axis, and a horizontal line y = k with its crossings. The
 * "mirror" layer reflects the graph in y = x.
 *
 * Chain: g∘f as two arrow diagrams end to end, A → f(A) → g(f(A)).
 */

import {
  SETSFN_CODOMAIN_ORDER,
  SETSFN_CODOMAINS,
  SETSFN_CURVE_ORDER,
  SETSFN_CURVES,
  SETSFN_DOMAIN_ORDER,
  SETSFN_DOMAINS,
  SETSFN_INPUTS,
  SETSFN_OP_LABELS,
  SETSFN_OP_ORDER,
  SETSFN_RELATION_ORDER,
  SETSFN_RELATIONS,
  SETSFN_RULE_ORDER,
  SETSFN_RULES,
  SETSFN_THREE,
  SETSFN_UNIVERSE,
  SETSFN_X,
  type SetsfnInterval,
  setsfnClasses,
  setsfnElements,
  setsfnRelationNow,
  setsfnRelationTable,
  setsfnShaded,
  setsfnTwoSets,
} from "@ise/mathematics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface SetsFnLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The drawing area under the title and above the captions. */
  stage: Box;
}

/** Three caption lines fit under the stage. */
const CAPTION_ROOM = 58;

export function computeSetsFnLayout(width: number): SetsFnLayout {
  const compact = width < 560;
  const height = compact ? 390 : 420;
  return { width, height, compact, stage: { x: 16, y: 28, width: width - 32, height: height - 28 - CAPTION_ROOM } };
}

const SUPER = "⁰¹²³⁴⁵⁶⁷⁸⁹";
export const setsFnSup = (v: number) => [...String(Math.round(v))].map((d) => SUPER[Number(d)] ?? d).join("");
const minus = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v)}`;
const fixed = (v: number, digits = 1) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
export const setsFnList = (xs: readonly number[]) => (xs.length === 0 ? "∅" : `{${xs.map(minus).join(", ")}}`);

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 2) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
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

/** An arrow between two node centres, stopped short of each node's edge. */
function link(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, gap: number, colour: string, width = 1.75) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  if (d < 2 * gap + 2) return;
  const ux = (x2 - x1) / d;
  const uy = (y2 - y1) / d;
  arrow(ctx, x1 + ux * gap, y1 + uy * gap, x2 - ux * gap, y2 - uy * gap, { color: colour, width, head: 7 });
}

// ── Venn ─────────────────────────────────────────────────────────────────────

type Circle = { x: number; y: number; r: number; name: string };

function vennCircles(stage: Box, three: boolean): { box: Box; circles: Circle[] } {
  // The bottom strip of the box holds the elements outside every set.
  const box = { x: stage.x, y: stage.y + 4, width: stage.width, height: stage.height - 4 };
  const cx = box.x + box.width / 2;
  const room = box.height - 30;
  const cy = box.y + room / 2 + 4;
  if (!three) {
    const r = Math.min((box.width - 24) / 3.1, room / 2 - 6);
    return { box, circles: [{ x: cx - 0.55 * r, y: cy, r, name: "A" }, { x: cx + 0.55 * r, y: cy, r, name: "B" }] };
  }
  const r = Math.min((box.width - 24) / 3.04, (room - 8) / 2.9);
  const d = 0.6 * r;
  const top = cy - 0.15 * r;
  return {
    box,
    circles: [
      { x: cx - d * Math.cos(Math.PI / 6), y: top - d / 2, r, name: "A" },
      { x: cx + d * Math.cos(Math.PI / 6), y: top - d / 2, r, name: "B" },
      { x: cx, y: top + d, r, name: "C" },
    ],
  };
}

function circlePath(ctx: CanvasRenderingContext2D, c: Circle) {
  ctx.moveTo(c.x + c.r, c.y);
  ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
}

function shade(ctx: CanvasRenderingContext2D, box: Box, circles: Circle[], op: (typeof SETSFN_OP_ORDER)[number], colour: string) {
  const [A, B] = circles as [Circle, Circle];
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.32;
  const minus = (keep: Circle, drop: Circle) => {
    ctx.beginPath();
    circlePath(ctx, keep);
    ctx.clip();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.width, box.height);
    circlePath(ctx, drop);
    ctx.fill("evenodd");
  };
  switch (op) {
    case "union":
      ctx.beginPath();
      for (const c of circles) circlePath(ctx, c);
      ctx.fill();
      break;
    case "intersection":
      for (const c of circles.slice(0, -1)) {
        ctx.beginPath();
        circlePath(ctx, c);
        ctx.clip();
      }
      ctx.beginPath();
      circlePath(ctx, circles[circles.length - 1]!);
      ctx.fill();
      break;
    case "aMinusB":
      minus(A, B);
      break;
    case "bMinusA":
      minus(B, A);
      break;
    case "complementA":
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.width, box.height);
      circlePath(ctx, A);
      ctx.fill("evenodd");
      break;
  }
  ctx.restore();
}

/** The middle of each region, found by sampling: key is the membership bits (A = 1, B = 2, C = 4). */
function regionCentres(box: Box, circles: Circle[]): Map<number, [number, number]> {
  const sums = new Map<number, [number, number, number]>();
  const step = 3;
  for (let x = box.x + step / 2; x < box.x + box.width; x += step) {
    for (let y = box.y + step / 2; y < box.y + box.height - 26; y += step) {
      let key = 0;
      circles.forEach((c, i) => {
        if ((x - c.x) ** 2 + (y - c.y) ** 2 < (c.r - 9) ** 2) key |= 1 << i;
        else if ((x - c.x) ** 2 + (y - c.y) ** 2 < (c.r + 9) ** 2) key = -1000;
      });
      if (key <= 0) continue;
      const s = sums.get(key) ?? [0, 0, 0];
      sums.set(key, [s[0] + x, s[1] + y, s[2] + 1]);
    }
  }
  return new Map([...sums].map(([key, [sx, sy, n]]) => [key, [sx / n, sy / n] as [number, number]]));
}

function drawVenn(ctx: CanvasRenderingContext2D, layout: SetsFnLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const three = Math.round(num(results.sets)) === 1;
  const sets = three ? { ...SETSFN_THREE, common: 0 } : setsfnTwoSets(num(results.nA), num(results.nB), num(results.nAB));
  const op = SETSFN_OP_ORDER[Math.round(num(results.op))] ?? "union";
  const { box, circles } = vennCircles(layout.stage, three);
  const masks = three ? [sets.a, sets.b, sets.c] : [sets.a, sets.b];

  shade(ctx, box, circles, op, theme.sine);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();
  const colours = [theme.cosine, theme.angle, theme.tangent];
  circles.forEach((c, i) => {
    ring(ctx, c.x, c.y, c.r, colours[i]!, 2);
    const right = c.name === "B";
    const bottom = c.name === "C";
    const lx = bottom ? c.x + c.r * 0.82 : right ? c.x + c.r * 0.72 : c.x - c.r * 0.72;
    const ly = bottom ? c.y + c.r * 0.72 : c.y - c.r * 0.78;
    label(ctx, c.name, lx, ly, { color: colours[i]!, font: theme.fontStrong, align: "center" });
  });
  label(ctx, "U", box.x + 8, box.y + 11, { color: theme.text, font: theme.fontStrong });

  // Every element of U, in its region.
  const centres = regionCentres(box, circles);
  const groups = new Map<number, number[]>();
  for (let e = 1; e <= SETSFN_UNIVERSE; e++) {
    let key = 0;
    masks.forEach((m, i) => {
      if (m & (1 << e)) key |= 1 << i;
    });
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  for (const [key, elements] of groups) {
    if (key === 0) {
      // Outside every set: a row along the foot of the box.
      const gap = Math.min(22, (box.width - 40) / Math.max(1, elements.length));
      const x0 = box.x + box.width / 2 - (gap * (elements.length - 1)) / 2;
      elements.forEach((e, i) => label(ctx, String(e), x0 + gap * i, box.y + box.height - 13, { color: theme.text, font: theme.font, align: "center" }));
      continue;
    }
    const centre = centres.get(key);
    if (!centre) continue;
    const cols = Math.min(2, elements.length);
    const rows = Math.ceil(elements.length / cols);
    elements.forEach((e, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = centre[0] + (col - (cols - 1) / 2) * 18;
      const y = centre[1] + (row - (rows - 1) / 2) * 16;
      label(ctx, String(e), x, y, { color: theme.text, font: theme.font, align: "center" });
    });
  }

  const caption = (text: string, line: number) => label(ctx, text, layout.width / 2, layout.height - 14 - 18 * line, { color: theme.text, font: theme.font, align: "center" });
  const nA = num(results.nA);
  if (words) {
    const shaded = setsfnElements(setsfnShaded(sets, op, three ? "three" : "two"));
    const name = SETSFN_OP_LABELS[op][three ? "three" : "two"];
    if (three) {
      caption(`n(A ∪ B ∪ C) = ${nA} + ${num(results.nB)} + ${num(results.nC)} − ${num(results.nAB)} − ${num(results.nAC)} − ${num(results.nBC)} + ${num(results.nAllCommon)} = ${num(results.nAll)}`, 1);
    } else {
      caption(`n(A ∪ B) = ${nA} + ${num(results.nB)} − ${num(results.nAB)} = ${num(results.nAuB)}`, 1);
    }
    caption(`shaded ${name} = ${setsFnList(shaded)}`, 0);
  }
  const title = words ? `U = {1, …, ${SETSFN_UNIVERSE}} · A has 2${setsFnSup(nA)} = ${2 ** nA} subsets` : `U = {1, …, ${SETSFN_UNIVERSE}}`;
  label(ctx, title, layout.width / 2, 12, { color: theme.text, font: theme.fontStrong, align: "center" });
}

// ── Relation ─────────────────────────────────────────────────────────────────

function drawRelation(ctx: CanvasRenderingContext2D, layout: SetsFnLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const id = SETSFN_RELATION_ORDER[Math.round(num(results.relation))] ?? "near";
  const switches = { addR: num(results.addR), addS: num(results.addS), addT: num(results.addT) };
  const before = setsfnRelationTable(id);
  const now = setsfnRelationNow(id, switches);
  const { stage, width } = layout;
  const name = id === "chain" ? `R = ${SETSFN_RELATIONS[id].label}` : id === "empty" ? "R = ∅, the empty relation" : `a R b when ${SETSFN_RELATIONS[id].label}`;
  label(ctx, name, width / 2, 12, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The grid of ordered pairs: row a, column b.
  const cell = Math.max(20, Math.min(36, Math.floor((width - 32) / 13)));
  const gx = stage.x + 16;
  const gy = stage.y + 26;
  label(ctx, "b →", gx + (cell * SETSFN_X) / 2, stage.y + 6, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, "a", stage.x + 2, gy - 9, { color: theme.muted, font: theme.font });
  for (let i = 0; i < SETSFN_X; i++) {
    label(ctx, String(i + 1), gx + cell * (i + 0.5), gy - 9, { color: theme.muted, font: theme.font, align: "center" });
    label(ctx, String(i + 1), gx - 7, gy + cell * (i + 0.5), { color: theme.muted, font: theme.font, align: "center" });
    for (let j = 0; j < SETSFN_X; j++) {
      const x = gx + cell * j;
      const y = gy + cell * i;
      ctx.save();
      if (now[i]![j]) {
        ctx.fillStyle = before[i]![j] ? theme.sine : theme.angle;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
      }
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cell, cell);
      ctx.restore();
    }
  }
  // The diagonal, where the pairs (a, a) of a reflexive relation sit.
  line(ctx, gx, gy, gx + cell * SETSFN_X, gy + cell * SETSFN_X, theme.muted, 1, [3, 4]);

  // The arrow diagram: the five elements round a circle.
  const right = gx + cell * SETSFN_X + 12;
  const cx = right + (stage.x + stage.width - right) / 2;
  const cy = gy + (cell * SETSFN_X) / 2 + 4;
  const radius = Math.min((stage.x + stage.width - right) / 2 - 26, 84, (cell * SETSFN_X) / 2 + 14);
  const node = (i: number): [number, number] => {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / SETSFN_X;
    return [cx + radius * Math.cos(t), cy + radius * Math.sin(t)];
  };
  for (let i = 0; i < SETSFN_X; i++) {
    for (let j = 0; j < SETSFN_X; j++) {
      if (!now[i]![j]) continue;
      const colour = before[i]![j] ? theme.sine : theme.angle;
      const [x1, y1] = node(i);
      if (i === j) {
        // A loop on the outside of the node.
        const t = -Math.PI / 2 + (2 * Math.PI * i) / SETSFN_X;
        ring(ctx, x1 + 15 * Math.cos(t), y1 + 15 * Math.sin(t), 7, colour, 1.75);
        continue;
      }
      // When both (a, b) and (b, a) are in, each gets its own arrow, nudged apart.
      const [x2, y2] = node(j);
      const shift = now[j]![i] ? 3.5 : 0;
      const d = Math.hypot(x2 - x1, y2 - y1);
      const nx = (-(y2 - y1) / d) * shift;
      const ny = ((x2 - x1) / d) * shift;
      link(ctx, x1 + nx, y1 + ny, x2 + nx, y2 + ny, 11, colour, 1.5);
    }
  }
  for (let i = 0; i < SETSFN_X; i++) {
    const [x, y] = node(i);
    disc(ctx, x, y, 10, theme.surface2);
    ring(ctx, x, y, 10, theme.text, 1.5);
    label(ctx, String(i + 1), x, y, { color: theme.text, font: theme.fontStrong, align: "center" });
  }

  // A key for the two colours, under the grid.
  const keyY = gy + cell * SETSFN_X + 18;
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.fillRect(gx, keyY - 5, 10, 10);
  ctx.fillStyle = theme.angle;
  ctx.fillRect(gx, keyY + 13, 10, 10);
  ctx.restore();
  label(ctx, "in R", gx + 15, keyY, { color: theme.muted, font: theme.font });
  label(ctx, "added to close it", gx + 15, keyY + 18, { color: theme.muted, font: theme.font });

  if (words) {
    const tick = (v: unknown) => (num(v) === 1 ? "✓" : "✗");
    const caption = (text: string, line: number) => label(ctx, text, width / 2, layout.height - 14 - 18 * line, { color: theme.text, font: theme.font, align: "center" });
    caption(`reflexive ${tick(results.reflexive)} · symmetric ${tick(results.symmetric)} · transitive ${tick(results.transitive)}`, 1);
    const classes = setsfnClasses(now);
    caption(
      classes.length > 0 ? `equivalence: classes ${classes.map(setsFnList).join(", ")}` : `${num(results.pairs)} pairs · not an equivalence relation`,
      0,
    );
  }
}

// ── Arrows ───────────────────────────────────────────────────────────────────

function drawArrows(ctx: CanvasRenderingContext2D, layout: SetsFnLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean, reverse: boolean) {
  const { stage, width } = layout;
  const images = [num(results.img1), num(results.img2), num(results.img3), num(results.img4)];
  const extra = num(results.extraImg);
  const n = Math.max(2, Math.round(num(results.codomainSize, 5)));
  const ax = stage.x + stage.width * 0.22;
  const bx = stage.x + stage.width * 0.78;
  const top = stage.y + 34;
  const gap = Math.min(42, (stage.height - 60) / 5);
  const ay = (i: number) => top + gap * (i + 0.5) + (gap * (5 - 4)) / 2;
  const by = (j: number) => top + gap * (j + 0.5) + (gap * (5 - n)) / 2;
  const oval = (x: number, h: number, colour: string) => {
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, top + (gap * 5) / 2, 30, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  oval(ax, gap * 4 + 16, theme.cosine);
  oval(bx, gap * n + 16, theme.sine);
  label(ctx, "A", ax, stage.y + 10, { color: theme.cosine, font: theme.fontStrong, align: "center" });
  label(ctx, `B = {1, …, ${n}}`, bx, stage.y + 10, { color: theme.sine, font: theme.fontStrong, align: "center" });
  label(ctx, reverse ? "f⁻¹ : B → A?" : "f : A → B", width / 2, 12, { color: theme.text, font: theme.fontStrong, align: "center" });

  const into = new Map<number, number[]>();
  images.forEach((v, i) => {
    if (v > 0) into.set(v, [...(into.get(v) ?? []), i + 1]);
  });
  if (extra > 0) into.set(extra, [...(into.get(extra) ?? []), 1]);

  const colourOf = (j: number) => (reverse ? ((into.get(j)?.length ?? 0) === 1 ? theme.angle : theme.secant) : theme.text);
  const draw = (i: number, v: number, colour: string) => {
    const [x1, y1, x2, y2] = reverse ? [bx, by(v - 1), ax, ay(i)] : [ax, ay(i), bx, by(v - 1)];
    link(ctx, x1, y1, x2, y2, 12, colour, 2);
  };
  images.forEach((v, i) => {
    if (v > 0) draw(i, v, reverse ? colourOf(v) : theme.tangent);
  });
  if (extra > 0) draw(0, extra, reverse ? colourOf(extra) : theme.secant);

  for (let i = 0; i < 4; i++) {
    const problem = images[i] === 0 || (i === 0 && extra > 0);
    disc(ctx, ax, ay(i), 10, theme.surface2);
    ring(ctx, ax, ay(i), 10, problem && !reverse ? theme.secant : theme.cosine, problem && !reverse ? 2.5 : 1.5);
    label(ctx, String(i + 1), ax, ay(i), { color: theme.text, font: theme.fontStrong, align: "center" });
  }
  for (let j = 1; j <= n; j++) {
    const hit = (into.get(j)?.length ?? 0) > 0;
    const problem = reverse && (into.get(j)?.length ?? 0) !== 1;
    disc(ctx, bx, by(j - 1), 10, theme.surface2);
    ring(ctx, bx, by(j - 1), 10, problem ? theme.secant : hit ? theme.sine : theme.muted, problem ? 2.5 : 1.5);
    label(ctx, String(j), bx, by(j - 1), { color: hit ? theme.text : theme.muted, font: theme.fontStrong, align: "center" });
  }

  if (!words) return;
  const caption = (text: string, line: number) => label(ctx, text, width / 2, layout.height - 14 - 18 * line, { color: theme.text, font: theme.font, align: "center" });
  const isFunction = num(results.isFunction) === 1;
  const range = [...into.keys()].sort((p, q) => p - q);
  caption(`domain {1, 2, 3, 4} · range ${setsFnList(range)}`, 2);
  caption(`${n}⁴ = ${num(results.functionsCount)} functions A → B · ${num(results.oneOneCount)} one-one · ${num(results.ontoCount)} onto`, 1);
  let verdict: string;
  if (!isFunction) {
    const missing = images.flatMap((v, i) => (v === 0 ? [i + 1] : []));
    verdict = missing.length > 0 ? `not a function: ${missing.join(", ")} ${missing.length === 1 ? "has" : "have"} no image` : "not a function: 1 has two images";
  } else if (reverse) {
    const stuck = [...Array(n).keys()].map((j) => j + 1).find((j) => (into.get(j)?.length ?? 0) !== 1);
    verdict =
      stuck === undefined
        ? "one arrow back from each element of B: f⁻¹ exists"
        : (into.get(stuck)?.length ?? 0) === 0
          ? `no f⁻¹: nothing in A goes to ${stuck}`
          : `no f⁻¹: ${stuck} would go back to ${into.get(stuck)!.join(" and ")}`;
  } else {
    const one = num(results.oneOne) === 1;
    const onto = num(results.onto) === 1;
    verdict = one && onto ? "a function: one-one and onto — a bijection" : `a function: ${one ? "one-one" : "not one-one"}, ${onto ? "onto" : "not onto"}`;
  }
  caption(verdict, 0);
}

// ── Graph ────────────────────────────────────────────────────────────────────

function graphPlane(stage: Box): Plane {
  const rect = { x: stage.x + 26, y: stage.y + 6, width: stage.width - 30, height: stage.height - 8 };
  const s = Math.min(rect.width / 8, rect.height / 7.5);
  const halfX = rect.width / s / 2;
  const yLo = -3;
  return createPlane(rect, [-halfX, halfX], [yLo, yLo + rect.height / s]);
}

function intervalText(s: SetsfnInterval): string {
  return `${s.loOpen ? "(" : "["}${Number.isFinite(s.lo) ? fixed(s.lo, 2) : "−∞"}, ${Number.isFinite(s.hi) ? fixed(s.hi, 2) : "∞"}${s.hiOpen ? ")" : "]"}`;
}

function drawGraph(ctx: CanvasRenderingContext2D, layout: SetsFnLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean, mirror: boolean) {
  const curveId = SETSFN_CURVE_ORDER[Math.round(num(results.curve))] ?? "square";
  const domainId = SETSFN_DOMAIN_ORDER[Math.round(num(results.domain))] ?? "all";
  const codomainId = SETSFN_CODOMAIN_ORDER[Math.round(num(results.codomain))] ?? "all";
  const curve = SETSFN_CURVES[curveId];
  const domain = SETSFN_DOMAINS[domainId].set;
  const codomain = SETSFN_CODOMAINS[codomainId].set;
  const range = curve.range[domainId];
  const plane = graphPlane(layout.stage);
  const { width } = layout;
  label(ctx, `f(x) = ${curve.label} : ${SETSFN_DOMAINS[domainId].label} → ${SETSFN_CODOMAINS[codomainId].label}`, width / 2, 12, { color: theme.text, font: theme.fontStrong, align: "center" });
  drawPlane(ctx, plane, theme, { gridStep: 1, showLabels: true });

  // The graph, only over the domain.
  const lo = Math.max(plane.xDomain[0], domain.lo);
  const hi = Math.min(plane.xDomain[1], domain.hi);
  const points: [number, number][] = [];
  for (let i = 0; i <= 300; i++) {
    const x = lo + ((hi - lo) * i) / 300;
    points.push([x, curve.f(x)]);
  }
  const trace = (pts: [number, number][], colour: string, lineWidth: number, dash?: number[]) => {
    ctx.save();
    clipToPlane(ctx, plane);
    ctx.strokeStyle = colour;
    ctx.lineWidth = lineWidth;
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    pts.forEach(([x, y], i) => {
      const [px, py] = plane.toPx(x, Math.max(-50, Math.min(50, y)));
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.restore();
  };
  trace(points, theme.curve, 2.5);
  for (const end of [domain.lo, domain.hi]) {
    if (!Number.isFinite(end)) continue;
    const [px, py] = plane.toPx(end, curve.f(end));
    if (plane.contains(px, py)) disc(ctx, px, py, 4, theme.curve);
  }

  // The codomain and the range as bars by the left edge: onto when the range bar covers the codomain bar.
  const bar = (s: SetsfnInterval, x: number, colour: string) => {
    const top = Math.min(plane.yDomain[1], s.hi);
    const bottom = Math.max(plane.yDomain[0], s.lo);
    if (top <= bottom) return;
    const [, y1] = plane.toPx(0, top);
    const [, y2] = plane.toPx(0, bottom);
    line(ctx, x, y1, x, y2, colour, 5);
  };
  const barX = plane.rect.x + 8;
  bar(codomain, barX, theme.tangent);
  bar(range, barX + 9, theme.curve);
  if (words) {
    // Which bar is which: C for the codomain, R for the range, at the foot of the plot.
    const foot = plane.rect.y + plane.rect.height - 8;
    label(ctx, "C", barX - 4, foot, { color: theme.tangent, font: theme.fontStrong, align: "center" });
    label(ctx, "R", barX + 13, foot, { color: theme.curve, font: theme.fontStrong, align: "center" });
  }

  if (mirror) {
    const [x0, y0] = plane.toPx(Math.max(plane.xDomain[0], plane.yDomain[0]), Math.max(plane.xDomain[0], plane.yDomain[0]));
    const [x1, y1] = plane.toPx(Math.min(plane.xDomain[1], plane.yDomain[1]), Math.min(plane.xDomain[1], plane.yDomain[1]));
    line(ctx, x0, y0, x1, y1, theme.muted, 1.25, [5, 5]);
    trace(points.map(([x, y]) => [y, x] as [number, number]), theme.tangent, 2.5);
    label(ctx, "y = x", x1 - 4, y1 + 10, { color: theme.muted, font: theme.font, align: "right" });
  } else {
    const k = num(results.k);
    const [kx0, ky] = plane.toPx(plane.xDomain[0], k);
    const [kx1] = plane.toPx(plane.xDomain[1], k);
    line(ctx, kx0, ky, kx1, ky, theme.angle, 2, [6, 4]);
    // Where y = k meets the graph inside the window.
    const roots: number[] = [];
    for (let i = 1; i < points.length; i++) {
      const [xa, ya] = points[i - 1]!;
      const [xb, yb] = points[i]!;
      if (ya === k) roots.push(xa);
      else if ((ya - k) * (yb - k) < 0) roots.push(xa + ((k - ya) * (xb - xa)) / (yb - ya));
    }
    const last = points[points.length - 1]!;
    if (last[1] === k) roots.push(last[0]);
    const exact = curve.solve(k, domain);
    for (const x of exact === "many" ? roots : exact) {
      const [px, py] = plane.toPx(x, k);
      if (plane.contains(px, py)) disc(ctx, px, py, 5, theme.angle);
    }
  }

  if (!words) return;
  const caption = (text: string, line: number) => label(ctx, text, width / 2, layout.height - 14 - 18 * line, { color: theme.text, font: theme.font, align: "center" });
  caption(`range R = ${intervalText(range)} · codomain C = ${SETSFN_CODOMAINS[codomainId].label}`, 1);
  const valid = num(results.grValid) === 1;
  const one = num(results.grOneOne) === 1;
  const onto = num(results.grOnto) === 1;
  if (mirror) {
    caption(
      !valid
        ? "not a function into this codomain"
        : one && onto
          ? `a bijection: the mirror image is f⁻¹(x) = ${curve.inverse}`
          : !one
            ? "not one-one: the mirror image is not a function"
            : "not onto: f⁻¹ would miss part of the codomain",
      0,
    );
    return;
  }
  const crossings = Math.round(num(results.crossings));
  const times = ["never", "once", "twice", "infinitely often"][crossings] ?? "never";
  caption(`y = ${fixed(num(results.k))} meets the graph ${times}`, 2);
  caption(!valid ? "not a function: the range is not inside the codomain" : one && onto ? "one-one and onto: a bijection" : `${one ? "one-one" : "not one-one"}, ${onto ? "onto" : "not onto"}`, 0);
}

// ── Chain ────────────────────────────────────────────────────────────────────

function drawChain(ctx: CanvasRenderingContext2D, layout: SetsFnLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const fId = SETSFN_RULE_ORDER[Math.round(num(results.fRule))] ?? "square";
  const gId = SETSFN_RULE_ORDER[Math.round(num(results.gRule))] ?? "plus1";
  const f = SETSFN_RULES[fId];
  const g = SETSFN_RULES[gId];
  const { stage, width } = layout;
  const x = num(results.x);
  const A = [...SETSFN_INPUTS];
  const B = [...new Set(A.map(f.of))].sort((p, q) => p - q);
  const C = [...new Set(B.map(g.of))].sort((p, q) => p - q);
  const cols = [stage.x + stage.width * 0.14, stage.x + stage.width * 0.5, stage.x + stage.width * 0.86];
  const top = stage.y + 40;
  const gap = Math.min(44, (stage.height - 60) / 5);
  const y = (i: number, size: number) => top + gap * (i + 0.5) + (gap * (5 - size)) / 2;
  label(ctx, `f(x) = ${f.label}, g(x) = ${g.label}`, width / 2, 12, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "A", cols[0]!, stage.y + 8, { color: theme.cosine, font: theme.fontStrong, align: "center" });
  label(ctx, "f(A)", cols[1]!, stage.y + 8, { color: theme.sine, font: theme.fontStrong, align: "center" });
  label(ctx, "g(f(A))", cols[2]!, stage.y + 8, { color: theme.tangent, font: theme.fontStrong, align: "center" });
  label(ctx, "f", (cols[0]! + cols[1]!) / 2, stage.y + 24, { color: theme.muted, font: theme.fontStrong, align: "center" });
  label(ctx, "g", (cols[1]! + cols[2]!) / 2, stage.y + 24, { color: theme.muted, font: theme.fontStrong, align: "center" });

  const fx = f.of(x);
  const gfx = g.of(fx);
  A.forEach((a, i) => {
    const on = a === x;
    link(ctx, cols[0]!, y(i, A.length), cols[1]!, y(B.indexOf(f.of(a)), B.length), 14, on && words ? theme.angle : theme.muted, on && words ? 2.5 : 1.25);
  });
  B.forEach((b, i) => {
    const on = b === fx;
    link(ctx, cols[1]!, y(i, B.length), cols[2]!, y(C.indexOf(g.of(b)), C.length), 14, on && words ? theme.angle : theme.muted, on && words ? 2.5 : 1.25);
  });
  const nodes = (values: number[], col: number, colour: string, show: boolean, mark: number) =>
    values.forEach((v, i) => {
      const cy = y(i, values.length);
      disc(ctx, cols[col]!, cy, 13, theme.surface2);
      ring(ctx, cols[col]!, cy, 13, v === mark && (words || col === 0) ? theme.angle : colour, v === mark && (words || col === 0) ? 2.5 : 1.5);
      if (show) label(ctx, minus(v), cols[col]!, cy, { color: theme.text, font: theme.fontStrong, align: "center" });
    });
  nodes(A, 0, theme.cosine, true, x);
  nodes(B, 1, theme.sine, true, fx);
  // The last column is the answer to "what is (g∘f)(x)?", so it is written only with the words.
  nodes(C, 2, theme.tangent, words, gfx);

  if (!words) return;
  const caption = (text: string, line: number) => label(ctx, text, width / 2, layout.height - 14 - 18 * line, { color: theme.text, font: theme.font, align: "center" });
  const gx = g.of(x);
  const fgx = f.of(gx);
  caption(`(g∘f)(${minus(x)}) = g(${minus(fx)}) = ${minus(gfx)}`, 2);
  caption(`(f∘g)(${minus(x)}) = f(${minus(gx)}) = ${minus(fgx)}${gfx === fgx ? ": the same here" : ": different"}`, 1);
  caption(
    num(results.commute) === 1 ? "g∘f = f∘g at every x in A" : num(results.fOneOne) === 1 ? "g∘f ≠ f∘g · f is one-one on A, so f⁻¹ exists" : "g∘f ≠ f∘g · f is not one-one on A",
    0,
  );
}

export const setsFnRenderer: SimulationRenderer<SetsFnLayout> = {
  id: "setsfn",
  layout: (width) => computeSetsFnLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);
    const words = has("labels");
    if (has("venn")) drawVenn(ctx, layout, results, theme, words);
    if (has("relation")) drawRelation(ctx, layout, results, theme, words);
    if (has("arrows")) drawArrows(ctx, layout, results, theme, words, has("reverse"));
    if (has("graph")) drawGraph(ctx, layout, results, theme, words, has("mirror"));
    if (has("chain")) drawChain(ctx, layout, results, theme, words);
  },
};
