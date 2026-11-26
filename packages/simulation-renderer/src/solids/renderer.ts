/**
 * Round solids and similar shapes, drawn flat and simple for school.
 *
 * Solids: a wheel rolling along the ground and laying out its rim; a
 * cylinder whose label peels off into a rectangle; a cone pouring water into
 * the cylinder with the same base and height; a sphere and a hemisphere; and
 * three shapes glued together — a capsule, a tent and an ice-cream cone.
 * And a circle cut into sectors that slide into a row, point up and point
 * down, to make a near-rectangle πr long and r tall: its area is πr².
 *
 * Similar shapes: triangle ABC beside its copy PQR; a line DE across a
 * triangle, parallel to BC or not; a pole and a tower with their shadows; two
 * points on a grid with the right triangle between them.
 *
 * Every answer a level asks the learner to estimate is drawn only when the
 * labels layer is on.
 */

import { SIMILAR_FIGURE_ORDER, SOLID_ORDER, type SolidId } from "@ise/mathematics-engine";
import { label, num } from "../shared/draw";
import { createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface SolidsLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The drawing area between the title and the captions. */
  picture: Box;
}

export function computeSolidsLayout(width: number): SolidsLayout {
  const compact = width < 560;
  const height = compact ? 380 : 400;
  return { width, height, compact, picture: { x: 16, y: 40, width: width - 32, height: height - 40 - 52 } };
}

/** A number as a student would write it: at most `dp` decimals, no trailing zeros. */
export function solidsNumber(v: number, dp = 2): string {
  const rounded = Number(v.toFixed(dp));
  const text = String(Math.abs(rounded));
  return `${rounded < 0 ? "−" : ""}${text}`;
}

const deg = (rad: number) => `${((rad * 180) / Math.PI).toFixed(1)}°`;

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

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A closed outline through the points, filled faintly and stroked. */
function shape(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], stroke: string, fill?: string, alpha = 0.25) {
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** An ellipse — the rim of a circle seen from a little above. */
function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, stroke: string, options: { fill?: string; dash?: number[]; from?: number; to?: number } = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, Math.max(rx, 0.1), Math.max(ry, 0.1), 0, options.from ?? 0, options.to ?? Math.PI * 2);
  if (options.fill) {
    ctx.fillStyle = options.fill;
    ctx.globalAlpha = 0.3;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (options.dash) ctx.setLineDash(options.dash);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** Where a circle's sector sits: its point (apex), and the direction its middle points. */
export type SectorPlace = { x: number; y: number; angle: number; up: boolean };

/**
 * The circle's sectors, `t` of the way (0–1) from their places in the circle to
 * a row below it: even ones point up, odd ones down, so the rim is shared
 * equally between the row's top and bottom edges.
 */
export function circleSectors(box: Box, width: number, count: number, t: number) {
  const R = Math.max(10, Math.min((box.width - 24) / (Math.PI + 0.7), (box.height - 46) / 3, 78));
  const theta = (2 * Math.PI) / count;
  const cx = width / 2;
  const cy = box.y + 4 + R;
  const chord = 2 * R * Math.sin(theta / 2);
  const depth = R * Math.cos(theta / 2);
  const span = (count / 2 + 0.5) * chord;
  const left = width / 2 - span / 2;
  const yTop = cy + R + 26;
  const yBottom = yTop + depth;
  const places: SectorPlace[] = [];
  for (let k = 0; k < count; k++) {
    const up = k % 2 === 0;
    const i = Math.floor(k / 2);
    const start = (k + 0.5) * theta;
    const end = up ? -Math.PI / 2 : Math.PI / 2;
    // Turn the short way round.
    const turn = end - start - 2 * Math.PI * Math.round((end - start) / (2 * Math.PI));
    const to = up ? { x: left + chord / 2 + i * chord, y: yBottom } : { x: left + chord + i * chord, y: yTop };
    places.push({ x: cx + (to.x - cx) * t, y: cy + (to.y - cy) * t, angle: start + turn * t, up });
  }
  return { R, theta, cx, cy, left, span, yTop, yBottom, places };
}

/** An upright cylinder drawn from the side: body, bottom rim, top ellipse. */
function cylinderSide(ctx: CanvasRenderingContext2D, left: number, top: number, w: number, tall: number, theme: LabTheme, dash?: number[]) {
  const ry = Math.min(8, w * 0.15);
  ctx.save();
  if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + tall);
  ctx.moveTo(left + w, top);
  ctx.lineTo(left + w, top + tall);
  ctx.stroke();
  ctx.restore();
  ellipse(ctx, left + w / 2, top + tall, w / 2, ry, theme.neutral, { from: 0, to: Math.PI, dash });
  ellipse(ctx, left + w / 2, top, w / 2, ry, theme.neutral, { dash });
  return ry;
}

export const solidsRenderer: SimulationRenderer<SolidsLayout> = {
  id: "solids",
  layout: (width) => computeSolidsLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, picture: box } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const note = (text: string) => label(ctx, text, width / 2, 31, { color: theme.muted, font: theme.font, align: "center" });
    const caption = (text: string, row = 0) => label(ctx, text, width / 2, height - 14 - row * 18, { color: theme.text, font: theme.font, align: "center" });
    const n = (key: string, dp = 2) => solidsNumber(num(results[key]), dp);

    if (has("solid")) {
      const id: SolidId = SOLID_ORDER[Math.round(num(results.solid))] ?? "wheel";
      const r = num(results.r, 1);
      const h = num(results.h, 1);
      const piNote = `π taken as ${num(results.piChoice) === 1 ? "3.14" : "22/7"}`;
      // Drawn with the same π as the numbers, so a 44 cm rim is 44 cm of ground.
      const pi = num(results.piValue, 22 / 7);
      if (words) note(piNote);

      if (id === "wheel") {
        title(`A wheel of radius ${n("r")} cm`);
        const turns = num(results.turns);
        const R = Math.max(4, Math.min((box.width - 8) / (2 + 4 * pi), box.height / 2 - 30, 60));
        const ground = box.y + box.height - 34;
        const x0 = box.x + R + 4;
        const cx = x0 + turns * 2 * pi * R;
        const cy = ground - R;
        line(ctx, box.x, ground, box.x + box.width, ground, theme.axis, 1.5);
        // The rim, laid out along the ground as the wheel rolls.
        line(ctx, x0, ground, cx, ground, theme.sine, 4);
        for (let turn = 0; turn <= 2; turn++) {
          const tx = x0 + turn * 2 * pi * R;
          line(ctx, tx, ground - 5, tx, ground + 5, theme.muted, 1.5);
          if (turn > 0) label(ctx, turn === 1 ? "1 turn" : "2 turns", tx, ground + 14, { color: theme.muted, font: theme.font, align: "center" });
        }
        ellipse(ctx, cx, cy, R, R, theme.neutral, { fill: theme.neutral });
        const spin = Math.PI / 2 + turns * 2 * Math.PI;
        line(ctx, cx, cy, cx + R * Math.cos(spin), cy + R * Math.sin(spin), theme.angle, 2);
        disc(ctx, cx + R * Math.cos(spin), cy + R * Math.sin(spin), 4, theme.angle);
        label(ctx, "r", cx, cy - R - 10, { color: theme.text, font: theme.font, align: "center" });
        if (words) caption(`${solidsNumber(turns)} ${turns === 1 ? "turn" : "turns"} → rolled ${n("rolled", 1)} cm · C ÷ d = ${num(results.ratio).toFixed(3)}`);
        return;
      }

      if (id === "cylinder") {
        title(`A cylinder: r = ${n("r")} cm, h = ${n("h")} cm`);
        const open = num(results.open);
        const s = Math.min((box.width - 30) / ((2 + 2 * pi) * r), (box.height - 40) / h);
        const w = 2 * r * s;
        const tall = h * s;
        const left = box.x + 4;
        const top = box.y + 12 + (box.height - 40 - tall) / 2;
        cylinderSide(ctx, left, top, w, tall, theme);
        label(ctx, "h", left + w / 2, top + tall / 2, { color: theme.text, font: theme.font, align: "center" });
        // The label, peeled off and laid flat: 2πr wide, h tall.
        const sheetLeft = left + w + 14;
        const sheetWidth = num(results.circumference) * s;
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1;
        ctx.strokeRect(sheetLeft, top, sheetWidth, tall);
        ctx.restore();
        ctx.save();
        ctx.fillStyle = theme.sine;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(sheetLeft, top, sheetWidth * open, tall);
        ctx.restore();
        label(ctx, words ? `2πr = ${n("circumference", 1)} cm` : "2πr", sheetLeft + sheetWidth / 2, top + tall + 18, { color: theme.sine, font: theme.font, align: "center" });
        if (words) caption(`curved ${n("csa", 1)} cm² · total ${n("tsa", 1)} cm² · V ${n("volume", 1)} cm³`);
        return;
      }

      if (id === "cone") {
        title(`A cone and a cylinder: r = ${n("r")}, h = ${n("h")}`);
        const pours = num(results.pours);
        const fill = num(results.fill);
        const s = Math.min((box.width - 50) / (4 * r), (box.height - 40) / h);
        const w = 2 * r * s;
        const tall = h * s;
        const top = box.y + 12 + (box.height - 40 - tall) / 2;
        const gap = Math.max(20, (box.width - 2 * w) / 3);
        const coneLeft = box.x + gap;
        const cylLeft = coneLeft + w + gap;
        const ry = Math.min(8, w * 0.15);
        // The cone, full of water until the third one is poured.
        shape(ctx, [[coneLeft + w / 2, top], [coneLeft + w, top + tall], [coneLeft, top + tall]], theme.neutral, num(results.full) === 1 ? undefined : theme.sine, 0.35);
        ellipse(ctx, coneLeft + w / 2, top + tall, w / 2, ry, theme.neutral, { from: 0, to: Math.PI });
        line(ctx, coneLeft + w / 2, top, coneLeft + w / 2, top + tall, theme.muted, 1, [3, 3]);
        // The slant height along the cone's left side.
        line(ctx, coneLeft + w / 2, top, coneLeft, top + tall, theme.angle, 3);
        label(ctx, words ? `l = ${n("slant")}` : "l", coneLeft + w / 4 - 6, top + tall / 2, { color: theme.angle, font: theme.font, align: "right" });
        // The cylinder, filling a third at a time.
        ctx.save();
        ctx.fillStyle = theme.sine;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(cylLeft, top + tall * (1 - fill), w, tall * fill);
        ctx.restore();
        cylinderSide(ctx, cylLeft, top, w, tall, theme);
        for (const third of [1, 2]) line(ctx, cylLeft, top + (tall * third) / 3, cylLeft + w, top + (tall * third) / 3, theme.muted, 1, [3, 3]);
        label(ctx, `${Math.floor(pours + 1e-9)} of 3 cones poured`, width / 2, top + tall + ry + 14, { color: theme.text, font: theme.font, align: "center" });
        if (words) caption(`cone ${n("coneVolume", 1)} cm³ = ⅓ × cylinder ${n("cylinderVolume", 1)} cm³`);
        return;
      }

      if (id === "sphere" || id === "hemisphere") {
        title(`A ${id} of radius ${n("r")} cm`);
        const R = Math.min(box.width / 2 - 20, (box.height - 30) / 2);
        const cx = width / 2;
        const cy = id === "sphere" ? box.y + box.height / 2 - 6 : box.y + box.height / 2 + R / 2 - 6;
        ellipse(ctx, cx, cy, R, R, theme.neutral, { fill: theme.cosine, from: id === "sphere" ? 0 : Math.PI, to: Math.PI * 2 });
        ellipse(ctx, cx, cy, R, R * 0.25, theme.neutral, id === "sphere" ? { dash: [4, 4] } : { fill: theme.cosine });
        line(ctx, cx, cy, cx + R, cy, theme.angle, 2);
        disc(ctx, cx, cy, 3, theme.angle);
        label(ctx, "r", cx + R / 2, cy - 10, { color: theme.angle, font: theme.fontStrong, align: "center" });
        if (words) {
          caption(
            id === "sphere"
              ? `surface ${n("tsa", 1)} cm² · volume ${n("volume", 1)} cm³`
              : `curved ${n("csa", 1)} · total ${n("tsa", 1)} cm² · V ${n("volume", 1)} cm³`,
          );
        }
        return;
      }

      if (id === "circle") {
        const count = Math.max(4, Math.round(num(results.sectors, 8)));
        const t = Math.min(1, Math.max(0, num(results.cut)));
        title(`A circle of radius ${n("r")} cm in ${count} sectors`);
        const { R, theta, cx, cy, left, span, yTop, yBottom, places } = circleSectors(box, width, count, t);
        // The circle they came from stays as a dashed outline, with its radius.
        ellipse(ctx, cx, cy, R, R, theme.muted, { dash: [4, 4] });
        line(ctx, cx, cy, cx + R, cy, theme.angle, 1.5, [3, 3]);
        label(ctx, "r", cx + R / 2, cy - 9, { color: theme.angle, font: theme.font, align: "center" });
        for (const place of places) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(place.x, place.y);
          ctx.arc(place.x, place.y, R, place.angle - theta / 2, place.angle + theta / 2);
          ctx.closePath();
          ctx.fillStyle = place.up ? theme.sine : theme.cosine;
          ctx.globalAlpha = 0.45;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = theme.neutral;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        }
        if (t >= 1) {
          // Laid out: half the rim along the bottom, the radius up the side.
          label(ctx, words ? `πr = ${n("halfCircumference")} cm` : "πr", left + span / 2, yTop + R + 12, { color: theme.sine, font: theme.fontStrong, align: "center" });
          label(ctx, "r", left - 8, (yTop + yBottom) / 2, { color: theme.angle, font: theme.fontStrong, align: "right" });
        }
        if (words) {
          caption(`area = πr × r = ${n("halfCircumference")} × ${n("r")} = ${n("baseArea")} cm²`, 1);
          caption(`circumference 2πr = ${n("circumference")} cm`);
        }
        return;
      }

      // Combined solids.
      const top = num(results.top, 1);
      const parts = { capsule: ["cylinder", "two hemispheres"], tent: ["cylinder", "cone"], icecream: ["cone", "hemisphere"] }[id];
      title(`${id === "icecream" ? "An ice-cream cone" : id === "tent" ? "A tent" : "A capsule"}: ${parts[0]} + ${parts[1]}`);
      const space = { x: box.x + 10, y: box.y + 8, width: box.width - 20, height: box.height - 36 };
      if (id === "capsule") {
        const s = Math.min(space.width / (h + 2 * r), space.height / (2 * r));
        const R = r * s;
        const L = h * s;
        const left = width / 2 - L / 2;
        const cy = space.y + space.height / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(left, cy, R, Math.PI / 2, (3 * Math.PI) / 2);
        ctx.lineTo(left + L, cy - R);
        ctx.arc(left + L, cy, R, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = theme.cosine;
        ctx.globalAlpha = 0.25;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        line(ctx, left, cy - R, left, cy + R, theme.muted, 1, [3, 3]);
        line(ctx, left + L, cy - R, left + L, cy + R, theme.muted, 1, [3, 3]);
        line(ctx, left + L, cy, left + L + R, cy, theme.angle, 2);
        label(ctx, "r", left + L + R / 2, cy - 9, { color: theme.angle, font: theme.fontStrong, align: "center" });
        label(ctx, "h", width / 2, cy + R + 12, { color: theme.text, font: theme.font, align: "center" });
      } else if (id === "tent") {
        const s = Math.min(space.width / (2 * r), space.height / (h + top));
        const w = 2 * r * s;
        const body = h * s;
        const roof = top * s;
        const left = width / 2 - w / 2;
        const base = space.y + (space.height + body + roof) / 2;
        shape(ctx, [[left, base], [left + w, base], [left + w, base - body], [left, base - body]], theme.neutral, theme.tangent);
        shape(ctx, [[left, base - body], [left + w, base - body], [width / 2, base - body - roof]], theme.neutral, theme.secant);
        label(ctx, "h", left + w + 8, base - body / 2, { color: theme.text, font: theme.font });
        label(ctx, "l", left + (3 * w) / 4 + 8, base - body - roof / 2, { color: theme.angle, font: theme.fontStrong });
        line(ctx, width / 2, base, left + w, base, theme.angle, 2);
        label(ctx, "r", left + (3 * w) / 4, base + 10, { color: theme.angle, font: theme.fontStrong, align: "center" });
      } else {
        const s = Math.min(space.width / (2 * r), space.height / (h + r));
        const R = r * s;
        const cone = h * s;
        const rim = space.y + (space.height - cone - R) / 2 + R;
        ctx.save();
        ctx.beginPath();
        ctx.arc(width / 2, rim, R, Math.PI, Math.PI * 2);
        ctx.closePath();
        ctx.fillStyle = theme.cosine;
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        shape(ctx, [[width / 2 - R, rim], [width / 2 + R, rim], [width / 2, rim + cone]], theme.neutral, theme.angle);
        line(ctx, width / 2, rim, width / 2 + R, rim, theme.angle, 2);
        label(ctx, "r", width / 2 + R / 2, rim - 9, { color: theme.angle, font: theme.fontStrong, align: "center" });
        label(ctx, "h", width / 2 + 8, rim + cone / 2, { color: theme.text, font: theme.font });
      }
      if (words) {
        const names = { capsule: ["cylinder", "ends"], tent: ["cylinder", "cone"], icecream: ["cone", "hemisphere"] }[id];
        caption(`${names[0]} ${n("partA", 1)} + ${names[1]} ${n("partB", 1)} = ${n("volume", 1)} cm³`, 1);
        caption(`outer surface ${n("tsa", 1)} cm²`);
      }
      return;
    }

    if (has("figure")) {
      const figure = SIMILAR_FIGURE_ORDER[Math.round(num(results.figure))] ?? "copy";

      if (figure === "copy") {
        title("Triangle ABC and its copy PQR");
        const angleB = num(results.angleB);
        const angleQ = num(results.angleQ);
        const pq = num(results.pq);
        const qr = num(results.qr);
        const A: [number, number] = [4 * Math.cos(angleB), 4 * Math.sin(angleB)];
        const P: [number, number] = [pq * Math.cos(angleQ), pq * Math.sin(angleQ)];
        const baseSpan = [Math.min(0, A[0]), Math.max(6, A[0])] as const;
        const copySpan = [Math.min(0, P[0]), Math.max(qr, P[0])] as const;
        const tallest = Math.max(A[1], P[1]);
        const s = Math.min((box.width - 40) / (baseSpan[1] - baseSpan[0] + copySpan[1] - copySpan[0]), (box.height - 70) / tallest);
        const ground = box.y + 14 + tallest * s;
        const bx = box.x + 10 - baseSpan[0] * s;
        const qx = bx + baseSpan[1] * s + 20 - copySpan[0] * s;
        const at = (ox: number, [x, y]: readonly [number, number]): [number, number] => [ox + x * s, ground - y * s];
        const [a, b, c] = [at(bx, A), at(bx, [0, 0]), at(bx, [6, 0])];
        const [p, q, rr] = [at(qx, P), at(qx, [0, 0]), at(qx, [qr, 0])];
        shape(ctx, [a, b, c], theme.neutral, theme.sine);
        shape(ctx, [p, q, rr], num(results.similar) === 1 ? theme.tangent : theme.secant, num(results.similar) === 1 ? theme.tangent : theme.secant);
        const letter = (text: string, [x, y]: readonly [number, number], dx: number, dy: number) => label(ctx, text, x + dx, y + dy, { color: theme.text, font: theme.fontStrong, align: "center" });
        letter("A", a, 0, -10);
        letter("B", b, -8, 8);
        letter("C", c, 8, 8);
        letter("P", p, 0, -10);
        letter("Q", q, -8, 8);
        letter("R", rr, 8, 8);
        const side = (text: string, [x1, y1]: readonly [number, number], [x2, y2]: readonly [number, number], dy: number) =>
          label(ctx, text, (x1 + x2) / 2, (y1 + y2) / 2 + dy, { color: theme.muted, font: theme.font, align: "center" });
        side("6", b, c, 12);
        if (words) side(n("qr"), q, rr, 12);
        const rows = ground + 34;
        label(ctx, `∠A, ∠B, ∠C = ${deg(num(results.angleA))}, ${deg(angleB)}, ${deg(num(results.angleC))}`, width / 2, rows, { color: theme.text, font: theme.font, align: "center" });
        if (words) {
          label(ctx, `∠P, ∠Q, ∠R = ${deg(num(results.angleP))}, ${deg(angleQ)}, ${deg(num(results.angleR))}`, width / 2, rows + 18, { color: theme.text, font: theme.font, align: "center" });
          caption(`PQ ${n("pq")}, QR ${n("qr")}, RP ${n("rp")} (AB 4, BC 6, CA 5)`, 1);
          caption(`sides × ${num(results.ratioPQ).toFixed(2)}, × ${num(results.ratioQR).toFixed(2)}, × ${num(results.ratioRP).toFixed(2)}: ${num(results.similar) === 1 ? "similar" : "not similar"}`);
        }
        return;
      }

      if (figure === "bpt") {
        title("A line DE across triangle ABC");
        const ax = (36 - 81 + 64) / 16;
        const ay = Math.sqrt(36 - ax * ax);
        const s = Math.min((box.width - 60) / 8, (box.height - 40) / ay);
        const left = width / 2 - 4 * s;
        const ground = box.y + 14 + ay * s;
        const at = (x: number, y: number): [number, number] => [left + x * s, ground - y * s];
        const t = num(results.ad) / 6;
        const u = num(results.ae) / 9;
        const A = at(ax, ay);
        const B = at(0, 0);
        const C = at(8, 0);
        const D = at(ax * (1 - t), ay * (1 - t));
        const E = at(ax + u * (8 - ax), ay * (1 - u));
        const parallel = num(results.parallel) === 1;
        shape(ctx, [A, B, C], theme.neutral, theme.sine, 0.15);
        line(ctx, D[0], D[1], E[0], E[1], parallel ? theme.tangent : theme.secant, 3);
        for (const point of [D, E]) disc(ctx, point[0], point[1], 4.5, theme.angle);
        const letter = (text: string, [x, y]: readonly [number, number], dx: number, dy: number) => label(ctx, text, x + dx, y + dy, { color: theme.text, font: theme.fontStrong, align: "center" });
        letter("A", A, 0, -10);
        letter("B", B, -8, 8);
        letter("C", C, 8, 8);
        letter("D", D, -12, 0);
        letter("E", E, 12, 0);
        if (words) {
          const mid = (p1: readonly [number, number], p2: readonly [number, number], dx: number, text: string) =>
            label(ctx, text, (p1[0] + p2[0]) / 2 + dx, (p1[1] + p2[1]) / 2, { color: theme.muted, font: theme.font, align: dx < 0 ? "right" : "left" });
          mid(A, D, -10, n("ad"));
          mid(D, B, -10, n("db"));
          mid(A, E, 10, n("ae"));
          mid(E, C, 10, n("ec"));
          caption(`AD/DB = ${num(results.ratioD).toFixed(2)} · AE/EC = ${num(results.ratioE).toFixed(2)}: ${parallel ? "DE ∥ BC" : "not parallel"}`);
        }
        return;
      }

      if (figure === "shadow") {
        title("A pole and a tower in the same sunlight");
        const pole = num(results.pole, 1);
        const poleShadow = num(results.poleShadow, 1);
        const towerShadow = num(results.towerShadow, 1);
        const tower = num(results.tower, 1);
        const s = Math.min((box.width - 40) / (poleShadow + towerShadow), (box.height - 50) / Math.max(pole, tower));
        const ground = box.y + box.height - 30;
        const poleX = box.x + 6;
        const towerX = poleX + poleShadow * s + 28;
        line(ctx, box.x, ground, box.x + box.width, ground, theme.axis, 1.5);
        const post = (x: number, tall: number, shadow: number, colour: string) => {
          line(ctx, x, ground, x, ground - tall * s, colour, 4);
          line(ctx, x, ground, x + shadow * s, ground, theme.muted, 5);
          line(ctx, x, ground - tall * s, x + shadow * s, ground, theme.angle, 1.5, [4, 4]);
        };
        post(poleX, pole, poleShadow, theme.cosine);
        post(towerX, tower, towerShadow, theme.sine);
        label(ctx, `${n("pole")} m`, poleX + 6, ground - (pole * s) / 2, { color: theme.cosine, font: theme.font });
        label(ctx, `${n("poleShadow")} m`, poleX + (poleShadow * s) / 2, ground + 12, { color: theme.muted, font: theme.font, align: "center" });
        label(ctx, `${n("towerShadow")} m`, towerX + (towerShadow * s) / 2, ground + 12, { color: theme.muted, font: theme.font, align: "center" });
        label(ctx, words ? `${n("tower", 1)} m` : "?", towerX + 6, ground - (tower * s) / 2, { color: theme.sine, font: theme.fontStrong });
        if (words) caption(`tower ÷ ${n("towerShadow")} = ${n("pole")} ÷ ${n("poleShadow")}, so the tower is ${n("tower", 1)} m`);
        return;
      }

      // Distance between two grid points.
      title("Two points on a grid");
      const side = Math.min(box.width - 20, box.height - 10);
      const plane = createPlane({ x: width / 2 - side / 2, y: box.y, width: side, height: side }, [-8, 8], [-8, 8]);
      drawPlane(ctx, plane, theme, { gridStep: 1, showLabels: true });
      const x1 = num(results.x1);
      const y1 = num(results.y1);
      const x2 = num(results.x2);
      const y2 = num(results.y2);
      const [px, py] = plane.toPx(x1, y1);
      const [qx, qy] = plane.toPx(x2, y2);
      const [cx, cy] = plane.toPx(x2, y1);
      line(ctx, px, py, cx, cy, theme.cosine, 2, [5, 4]);
      line(ctx, cx, cy, qx, qy, theme.cosine, 2, [5, 4]);
      line(ctx, px, py, qx, qy, theme.sine, 3);
      disc(ctx, px, py, 5, theme.angle);
      disc(ctx, qx, qy, 5, theme.angle);
      // Each name sits on the side of its point facing the middle, above the higher point and below the lower.
      const tag = (text: string, x: number, y: number, otherY: number) => {
        const toRight = x < width / 2;
        label(ctx, text, x + (toRight ? 8 : -8), y + (y <= otherY ? -12 : 12), { color: theme.text, font: theme.fontStrong, align: toRight ? "left" : "right", background: theme.background });
      };
      tag(`P(${n("x1")}, ${n("y1")})`, px, py, qy);
      tag(`Q(${n("x2")}, ${n("y2")})`, qx, qy, py);
      if (words) {
        if (num(results.runX) > 0) label(ctx, n("runX"), (px + cx) / 2, cy + (qy < cy ? 12 : -12), { color: theme.cosine, font: theme.fontStrong, align: "center", background: theme.background });
        if (num(results.runY) > 0) label(ctx, n("runY"), cx + (qx > px ? 10 : -10), (cy + qy) / 2, { color: theme.cosine, font: theme.fontStrong, align: qx > px ? "left" : "right", background: theme.background });
        caption(`PQ = √(${n("runX")}² + ${n("runY")}²) = ${n("distance")}`);
      }
    }
  },
};
