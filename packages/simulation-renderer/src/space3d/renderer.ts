/**
 * Vectors and geometry in three dimensions, drawn in a fixed orthographic
 * view: the camera looks down at 25° from an azimuth the learner can turn
 * (the yaw). z is up; x and y run across the floor.
 *
 * One picture per mode:
 * points — A, B and the point P dividing AB in m : n;
 * shadow — a and b, the angle between them, and a's shadow along b;
 * area — the parallelogram on a and b, and a × b standing up from it;
 * box — the parallelepiped on a, b and c;
 * cosines — a, and the angles α, β, γ it makes with the axes;
 * lines — L₁: r = a + λb and L₂: r = c + μe, with their shortest segment;
 * plane — a patch of Ax + By + Cz = D, the point A, its perpendicular, and L₁.
 *
 * Numbers appear only with the labels layer.
 */

import { arrow, label, num } from "../shared/draw";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };
type V3 = readonly [number, number, number];

export interface Space3dLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where the scene is drawn; nothing in space is drawn outside it. */
  view: Box;
  /** Where the origin sits on screen, and pixels per unit. */
  ox: number;
  oy: number;
  scale: number;
}

/** The camera's fixed elevation above the floor. */
export const SPACE3D_ELEVATION = (25 * Math.PI) / 180;
/** World units from the origin to the edge of the view. */
const REACH = 6.2;
const AXIS = 5;

export function computeSpace3dLayout(width: number): Space3dLayout {
  const compact = width < 560;
  const height = compact ? 390 : 420;
  const view = { x: 8, y: 26, width: width - 16, height: height - 26 - 46 };
  const scale = Math.min(view.width, view.height) / (2 * REACH);
  return { width, height, compact, view, ox: view.x + view.width / 2, oy: view.y + view.height / 2 + scale * 0.6, scale };
}

/** Screen position of a point in space, seen from azimuth `yaw`. */
export function space3dProject(layout: Space3dLayout, yaw: number, p: V3): [number, number] {
  const s = Math.sin(SPACE3D_ELEVATION);
  const c = Math.cos(SPACE3D_ELEVATION);
  const u = -p[0] * Math.sin(yaw) + p[1] * Math.cos(yaw);
  const v = -s * (p[0] * Math.cos(yaw) + p[1] * Math.sin(yaw)) + c * p[2];
  return [layout.ox + layout.scale * u, layout.oy - layout.scale * v];
}

const add = (u: V3, v: V3): V3 => [u[0] + v[0], u[1] + v[1], u[2] + v[2]];
const sub = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const times = (k: number, u: V3): V3 => [k * u[0], k * u[1], k * u[2]];
const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cross = (u: V3, v: V3): V3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const mag = (u: V3) => Math.hypot(u[0], u[1], u[2]);
const unit = (u: V3): V3 => {
  const m = mag(u);
  return m > 1e-9 ? times(1 / m, u) : [0, 0, 0];
};
const O: V3 = [0, 0, 0];

/** A number to fixed places, with a true minus sign and never "−0.00". */
const fixed = (v: number, digits = 2) => {
  const text = Math.abs(v).toFixed(digits);
  return `${v < 0 && Number(text) !== 0 ? "−" : ""}${text}`;
};
/** A coordinate: whole numbers bare, others to two places. */
const coord = (v: number) => (Math.abs(v - Math.round(v)) < 1e-9 ? fixed(Math.round(v), 0) : fixed(v));
const triple = (v: V3) => `(${v.map(coord).join(", ")})`;

const MAIN = ["points", "shadow", "area", "box", "cosines", "lines", "plane"] as const;
const TITLES: Record<(typeof MAIN)[number], string> = {
  points: "Dividing AB in the ratio m : n",
  shadow: "a·b, and the shadow of a on b",
  area: "a × b and the parallelogram on a, b",
  box: "[a b c] and the parallelepiped",
  cosines: "Direction cosines of a",
  lines: "Two lines in space",
  plane: "The plane Ax + By + Cz = D",
};

export const space3dRenderer: SimulationRenderer<Space3dLayout> = {
  id: "space3d",
  layout: (width) => computeSpace3dLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, view } = layout;
    const yaw = num(results.yaw, Math.PI / 6);
    const words = has("labels");
    const deg = input.angleUnit !== "rad";
    const angle = (rad: number) => (deg ? `${fixed((rad * 180) / Math.PI, 1)}°` : `${fixed(rad)} rad`);
    const V = (key: string): V3 => [num(results[`${key}x`]), num(results[`${key}y`]), num(results[`${key}z`])];
    const a = V("a");
    const b = V("b");
    const c = V("c");
    const e = V("e");
    const n = V("n");

    ctx.clearRect(0, 0, width, height);
    const main = MAIN.find((layer) => has(layer));
    if (main) label(ctx, TITLES[main], width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const captions: string[] = [];

    // ── Drawing in space ───────────────────────────────────────────────────
    const P = (p: V3) => space3dProject(layout, yaw, p);
    const inView = (x: number, y: number, slack = 0) => x >= view.x - slack && x <= view.x + view.width + slack && y >= view.y - slack && y <= view.y + view.height + slack;
    const segment = (p: V3, q: V3, colour: string, lineWidth = 2, dash?: number[], alpha = 1) => {
      const [x1, y1] = P(p);
      const [x2, y2] = P(q);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = colour;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(dash ?? []);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    };
    const vector = (from: V3, to: V3, colour: string, lineWidth = 2.5) => {
      const [x1, y1] = P(from);
      const [x2, y2] = P(to);
      arrow(ctx, x1, y1, x2, y2, { color: colour, width: lineWidth, head: 9 });
    };
    const disc = (p: V3, colour: string, r = 4.5) => {
      const [x, y] = P(p);
      ctx.save();
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    /** A name beside a point, only where it can be read. */
    const name = (p: V3, text: string, colour: string, dx = 8, dy = -9) => {
      const [x, y] = P(p);
      const tx = x + dx;
      const ty = y + dy;
      const w = text.length * 7;
      if (!inView(tx, ty) || tx + w > width - 2 || tx < 2) return;
      label(ctx, text, tx, ty, { color: colour, font: theme.fontStrong });
    };
    const polygon = (corners: readonly V3[], fill: string, alpha: number) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.beginPath();
      corners.forEach((corner, i) => {
        const [x, y] = P(corner);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };
    /** The arc of radius r from direction u towards direction v, in their plane. Returns its last two points. */
    const arc = (u: V3, v: V3, r: number, colour: string, to?: number): [number, number, number, number] | null => {
      const uh = unit(u);
      const w = sub(v, times(dot(v, uh), uh));
      if (mag(uh) < 0.5 || mag(w) < 1e-9 * Math.max(1, mag(v))) return null;
      const wh = unit(w);
      const sweep = to ?? Math.atan2(mag(cross(u, v)), dot(u, v));
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const steps = 24;
      let last: [number, number, number, number] = [0, 0, 0, 0];
      for (let i = 0; i <= steps; i++) {
        const t = (sweep * i) / steps;
        const [x, y] = P(add(times(r * Math.cos(t), uh), times(r * Math.sin(t), wh)));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        last = [last[2], last[3], x, y];
        if (i === 0) last = [x, y, x, y];
      }
      ctx.stroke();
      ctx.restore();
      return last;
    };
    /** A whole line through p along d, long enough to cross the view. */
    const longLine = (p: V3, d: V3, colour: string, lineWidth = 2.5) => {
      const dh = unit(d);
      segment(add(p, times(-14, dh)), add(p, times(14, dh)), colour, lineWidth);
    };

    ctx.save();
    ctx.beginPath();
    ctx.rect(view.x, view.y, view.width, view.height);
    ctx.clip();

    // Axes: the positive half solid with a tick at each unit, the negative half faint.
    const axes: [V3, string][] = [
      [[1, 0, 0], "x"],
      [[0, 1, 0], "y"],
      [[0, 0, 1], "z"],
    ];
    for (const [axis, letter] of axes) {
      segment(times(-4.5, axis), O, theme.axis, 1.2, [3, 4], 0.6);
      const [x0, y0] = P(O);
      const [x1, y1] = P(times(AXIS, axis));
      arrow(ctx, x0, y0, x1, y1, { color: theme.axis, width: 1.4, head: 7 });
      const length = Math.hypot(x1 - x0, y1 - y0);
      if (length > 1) {
        const nx = (-(y1 - y0) / length) * 3;
        const ny = ((x1 - x0) / length) * 3;
        ctx.save();
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 1;
        for (let k = 1; k < AXIS; k++) {
          const [tx, ty] = P(times(k, axis));
          ctx.beginPath();
          ctx.moveTo(tx - nx, ty - ny);
          ctx.lineTo(tx + nx, ty + ny);
          ctx.stroke();
        }
        ctx.restore();
      }
      const [lx, ly] = P(times(AXIS + 0.6, axis));
      label(ctx, letter, lx, ly, { color: theme.muted, font: theme.fontStrong, align: "center" });
    }
    const [ox, oy] = P(O);
    label(ctx, "O", ox - 6, oy + 9, { color: theme.muted, font: theme.font, align: "right" });

    if (main === "points") {
      const ok = num(results.sectionOk) === 1;
      const external = num(results.division) === 1;
      const p: V3 = [num(results.px), num(results.py), num(results.pz)];
      segment(O, a, theme.sine, 1.5, [4, 4], 0.7);
      segment(O, b, theme.cosine, 1.5, [4, 4], 0.7);
      segment(a, b, theme.text, 2.5);
      if (ok && external) {
        // P lies beyond B (m > n) or behind A (m < n): extend AB to reach it.
        const near = mag(sub(p, b)) < mag(sub(p, a)) ? b : a;
        segment(near, p, theme.text, 1.5, [5, 4]);
      }
      if (ok) segment(O, p, theme.angle, 1.5, [2, 3], 0.8);
      disc(a, theme.sine);
      disc(b, theme.cosine);
      name(a, "A", theme.sine);
      name(b, "B", theme.cosine);
      if (ok) {
        disc(p, theme.angle, 5.5);
        name(p, "P", theme.angle, 8, 10);
      }
      if (words) {
        if (!ok) captions.push("m = n: no point divides AB externally");
        else {
          const m = coord(num(results.m, 1));
          const k = coord(num(results.n, 1));
          captions.push(`P = ${triple(p)} divides AB ${m} : ${k} ${external ? "externally" : "internally"}`);
          captions.push(`AP = ${fixed(num(results.apLength))}, PB = ${fixed(num(results.pbLength))}: AP : PB = ${m} : ${k}`);
        }
      }
    }

    if (main === "shadow") {
      const defined = num(results.dotDefined) === 1;
      const shadow: V3 = [num(results.shadowX), num(results.shadowY), num(results.shadowZ)];
      if (mag(b) > 1e-9) longLine(O, b, theme.cosine, 1);
      if (defined) {
        // The shadow of a on b's line, and the drop from a's tip to it.
        segment(O, shadow, theme.angle, 7, undefined, 0.45);
        segment(a, shadow, theme.muted, 1.5, [4, 4]);
        disc(shadow, theme.angle, 3.5);
        const end = arc(a, b, 0.9, theme.tangent);
        if (end) label(ctx, "θ", end[2] + 6, end[3] - 6, { color: theme.tangent, font: theme.fontStrong });
      }
      vector(O, a, theme.sine);
      vector(O, b, theme.cosine);
      name(a, "a", theme.sine);
      name(b, "b", theme.cosine);
      if (words) {
        if (!defined) captions.push("a zero vector has no direction, so no angle");
        else {
          captions.push(`a·b = ${fixed(num(results.dot))} · θ = ${angle(num(results.angle))}`);
          captions.push(num(results.perpendicular) === 1 ? "a ⊥ b: a·b = 0, and a casts no shadow on b" : `shadow of a on b: a·b/|b| = ${fixed(num(results.projection))}`);
        }
      }
    }

    if (main === "area") {
      const axb: V3 = [num(results.crossX), num(results.crossY), num(results.crossZ)];
      const area = num(results.crossMag);
      polygon([O, a, add(a, b), b], theme.vector, 0.22);
      segment(a, add(a, b), theme.vector, 1, [3, 3]);
      segment(b, add(a, b), theme.vector, 1, [3, 3]);
      // The turn from a to b, which the right hand's fingers follow.
      const end = arc(a, b, 0.9, theme.tangent);
      if (end && Math.hypot(end[2] - end[0], end[3] - end[1]) > 0.1) arrow(ctx, end[0], end[1], end[2], end[3], { color: theme.tangent, width: 1.5, head: 6 });
      vector(O, a, theme.sine);
      vector(O, b, theme.cosine);
      name(a, "a", theme.sine);
      name(b, "b", theme.cosine);
      // a × b to scale while it fits; longer ones are shortened, and the caption says so.
      const shrink = area > 5 ? 5 / area : 1;
      if (area > 1e-9) {
        const tip = times(shrink, axb);
        vector(O, tip, theme.angle, 3);
        name(tip, "a × b", theme.angle);
      }
      if (words) {
        if (num(results.dotDefined) !== 1) captions.push("a zero vector: a × b = 0");
        else if (num(results.parallel) === 1) captions.push("a ∥ b: a × b = 0, no parallelogram");
        else {
          captions.push(`|a × b| = ${fixed(area)} = area of the parallelogram`);
          captions.push(`a × b = ${triple(axb)}${shrink < 1 ? ` · arrow drawn ×${shrink.toFixed(2)}` : ""}`);
        }
      }
    }

    if (main === "box") {
      const corners: V3[] = [O, a, b, c, add(a, b), add(a, c), add(b, c), add(add(a, b), c)];
      polygon([O, a, add(a, b), b], theme.curve, 0.2);
      const edges: [number, number][] = [[1, 4], [1, 5], [2, 4], [2, 6], [3, 5], [3, 6], [4, 7], [5, 7], [6, 7]];
      for (const [i, j] of edges) segment(corners[i]!, corners[j]!, theme.curve, 1.5, undefined, 0.85);
      vector(O, a, theme.sine);
      vector(O, b, theme.cosine);
      vector(O, c, theme.tangent);
      name(a, "a", theme.sine);
      name(b, "b", theme.cosine);
      name(c, "c", theme.tangent);
      if (words) {
        const handed = num(results.handed);
        captions.push(`[a b c] = ${fixed(num(results.triple))} · volume ${fixed(num(results.volume))}`);
        captions.push(handed === 0 ? "coplanar: the box is flat, volume 0" : handed > 0 ? "a, b, c right-handed: [a b c] positive" : "a, b, c left-handed: [a b c] negative");
      }
    }

    if (main === "cosines") {
      const defined = num(results.dirDefined) === 1;
      if (defined) {
        // Drops from a's tip to each axis: the feet are (aₓ, 0, 0), (0, a_y, 0), (0, 0, a_z).
        segment(a, [a[0], 0, 0], theme.muted, 1, [3, 4]);
        segment(a, [0, a[1], 0], theme.muted, 1, [3, 4]);
        segment(a, [0, 0, a[2]], theme.muted, 1, [3, 4]);
        const marks: [V3, string, string, number][] = [
          [[1, 0, 0], "α", theme.sine, 1.3],
          [[0, 1, 0], "β", theme.cosine, 1.0],
          [[0, 0, 1], "γ", theme.tangent, 1.6],
        ];
        for (const [axis, letter, colour, r] of marks) {
          const half = arc(axis, a, r, colour, Math.atan2(mag(cross(axis, a)), dot(axis, a)) / 2);
          // Name the arc at its middle.
          if (half) label(ctx, letter, half[2] + 4, half[3] - 5, { color: colour, font: theme.fontStrong });
          arc(axis, a, r, colour);
        }
      }
      vector(O, a, theme.angle, 3);
      name(a, "a", theme.angle);
      if (words) {
        if (!defined) captions.push("the zero vector has no direction cosines");
        else {
          captions.push(`l, m, n = ${fixed(num(results.dirL))}, ${fixed(num(results.dirM))}, ${fixed(num(results.dirN))} · l² + m² + n² = ${fixed(num(results.dirSum))}`);
          captions.push(`α, β, γ = ${angle(num(results.alpha))}, ${angle(num(results.beta))}, ${angle(num(results.gamma))} · |a| = ${fixed(num(results.magA))}`);
        }
      }
    }

    if (main === "lines") {
      const relation = num(results.linesRelation);
      const f1: V3 = [num(results.f1x), num(results.f1y), num(results.f1z)];
      const f2: V3 = [num(results.f2x), num(results.f2y), num(results.f2z)];
      if (mag(b) > 1e-9) longLine(a, b, theme.sine);
      if (mag(e) > 1e-9) longLine(c, e, theme.cosine);
      if (relation !== 4) {
        segment(f1, f2, theme.angle, 2.5, [5, 4]);
        disc(f1, theme.angle, 3.5);
        disc(f2, theme.angle, 3.5);
      }
      vector(a, add(a, unit(b)), theme.sine, 2);
      vector(c, add(c, unit(e)), theme.cosine, 2);
      disc(a, theme.sine);
      disc(c, theme.cosine);
      name(a, "A", theme.sine, -16, -9);
      name(c, "C", theme.cosine, -16, -9);
      if (mag(b) > 1e-9) name(add(a, times(3, unit(b))), "L₁", theme.sine);
      if (mag(e) > 1e-9) name(add(c, times(3, unit(e))), "L₂", theme.cosine);
      if (words) {
        const what = ["they meet", "parallel", "skew", "the same line", ""][relation] ?? "";
        if (relation === 4) captions.push("a line needs a non-zero direction");
        else {
          captions.push(`shortest distance ${fixed(num(results.shortestDistance))} · ${what}`);
          captions.push(`angle between the lines ${angle(num(results.linesAngle))}`);
        }
      }
    }

    if (main === "plane") {
      const defined = num(results.planeDefined) === 1;
      const foot: V3 = [num(results.footX), num(results.footY), num(results.footZ)];
      if (defined) {
        // A patch of the plane centred on the foot of the perpendicular from A.
        const nh = unit(n);
        const u = unit(Math.abs(nh[2]) < 0.9 ? cross(nh, [0, 0, 1]) : cross(nh, [1, 0, 0]));
        const w = cross(nh, u);
        const at = (i: number, j: number) => add(foot, add(times(3.2 * i, u), times(3.2 * j, w)));
        polygon([at(-1, -1), at(1, -1), at(1, 1), at(-1, 1)], theme.vector, 0.18);
        for (const [p, q] of [[at(-1, -1), at(1, -1)], [at(1, -1), at(1, 1)], [at(1, 1), at(-1, 1)], [at(-1, 1), at(-1, -1)]] as const) segment(p, q, theme.vector, 1, undefined, 0.6);
        // The normal stands up from the patch beside the foot, clear of A's perpendicular.
        const base = add(foot, times(2.2, u));
        vector(base, add(base, times(1.6, nh)), theme.vector, 2.5);
        name(add(base, times(1.6, nh)), "n", theme.vector);
        segment(a, foot, theme.angle, 2, [4, 3]);
        disc(foot, theme.angle, 3.5);
      }
      const meets = num(results.lineMeetsPlane);
      if (mag(b) > 1e-9) {
        longLine(a, b, theme.cosine, 2);
        name(add(a, times(4, unit(b))), "L₁", theme.cosine);
      }
      if (defined && meets === 1) disc([num(results.hitX), num(results.hitY), num(results.hitZ)], theme.cosine, 4);
      disc(a, theme.sine);
      name(a, "A", theme.sine);
      if (words) {
        if (!defined) captions.push("n = 0: Ax + By + Cz = D is not a plane");
        else {
          captions.push(`A is ${fixed(num(results.planeDistance))} from the plane · O is ${fixed(num(results.originDistance))}`);
          captions.push(
            meets === 1 ? `L₁ meets the plane at ${angle(num(results.linePlaneAngle))}` : meets === 2 ? "L₁ lies in the plane" : meets === 0 ? "L₁ is parallel to the plane" : "L₁ needs a non-zero direction",
          );
        }
      }
    }
    ctx.restore();

    captions.forEach((text, i) => {
      const y = height - (captions.length === 2 ? 30 - 17 * i : 14);
      label(ctx, text, width / 2, y, { color: theme.text, font: theme.font, align: "center" });
    });
  },
};
