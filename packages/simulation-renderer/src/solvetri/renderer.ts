/**
 * Solving triangles, in four pictures.
 *
 * The triangle: ABC from two sides and the angle between them, side a
 * opposite A and so on. With the circle layer, the circle through all three
 * corners, whose diameter is the sine rule's common ratio. With the cosine
 * layer, the angle C — squared off when it is 90° and the rule becomes
 * Pythagoras. With the centres layer, the circumcentre O, incentre I,
 * centroid G and orthocentre H, the two circles, and Euler's line.
 *
 * The ambiguous case: angle A and side b drawn, and side a swung about C
 * as a circle — it meets the base in no, one or two places.
 *
 * Heights and distances: a tower and its observer (or two), or a
 * lighthouse and two ships, to scale, with the angles marked.
 *
 * Values the learner is asked to work out are written only with the
 * labels layer on; the given ones (angles and distances in the question)
 * are always shown in the heights view.
 */

import { SOLVETRI_SIGHT_ORDER } from "@ise/mathematics-engine";
import { label, num } from "../shared/draw";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface SolveTriLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where the figure is drawn, between the title and the caption. */
  stage: Box;
}

export function computeSolveTriLayout(width: number): SolveTriLayout {
  const compact = width < 560;
  const height = compact ? 380 : 420;
  return { width, height, compact, stage: { x: 16, y: 34, width: width - 32, height: height - 34 - 52 } };
}

const DEG = Math.PI / 180;
const fixed = (v: number, digits = 2) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
const degrees = (v: number) => `${Math.round(v * 10) / 10}°`;

type ToPx = (x: number, y: number) => [number, number];

/** Fit model points (y up) into a box, keeping their shape. */
function fit(box: Box, points: readonly (readonly [number, number])[], pad: number): { k: number; toPx: ToPx } {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((box.width - 2 * pad) / Math.max(x1 - x0, 1e-6), (box.height - 2 * pad) / Math.max(y1 - y0, 1e-6));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { k, toPx: (x, y) => [box.x + box.width / 2 + (x - cx) * k, box.y + box.height / 2 - (y - cy) * k] };
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

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, colour: string, lineWidth = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function polygon(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], fill: string, alpha: number) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** An arc for an angle at (x, y), from screen direction `from` to `to` (radians, clockwise on screen). */
function angleArc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, from: number, to: number, colour: string) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, from, to);
  ctx.stroke();
  ctx.restore();
}

function clipTo(ctx: CanvasRenderingContext2D, box: Box) {
  ctx.beginPath();
  ctx.rect(box.x - 12, box.y - 6, box.width + 24, box.height + 12);
  ctx.clip();
}

export const solveTriRenderer: SimulationRenderer<SolveTriLayout> = {
  id: "solvetri",
  layout: (width) => computeSolveTriLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, stage } = layout;
    ctx.clearRect(0, 0, width, height);

    /** A centred label kept on the canvas whatever its length. */
    const tag = (text: string, x: number, y: number, colour: string, font = theme.font) => {
      ctx.save();
      ctx.font = font;
      const w = ctx.measureText(text).width;
      ctx.restore();
      const cx = Math.min(width - 4 - w / 2, Math.max(4 + w / 2, x));
      const cy = Math.min(height - 8, Math.max(8, y));
      label(ctx, text, cx, cy, { color: colour, font, align: "center" });
    };
    const title = (text: string) => tag(text, width / 2, 14, theme.text, theme.fontStrong);
    const caption = (text: string, row = 0) => tag(text, width / 2, height - 14 - row * 18, row === 0 ? theme.text : theme.muted);

    if (has("ambiguous")) return drawAmbiguous();
    if (has("sight")) return drawSight();
    if (has("triangle")) drawTriangle();
    return;

    function drawTriangle() {
      const a = num(results.a, 4);
      const ax = num(results.ax);
      const ay = num(results.ay, 1);
      const bx = num(results.bx, a);
      const C = num(results.angleC, 90);
      const R = num(results.circumR, 1);
      const ox = num(results.ox);
      const oy = num(results.oy);
      const corners: [number, number][] = [[0, 0], [bx, 0], [ax, ay]];
      const circle = has("circle") || has("centres");
      const hx = num(results.hx);
      const hy = num(results.hy);

      // Fit the triangle; take in the circle (and H) too unless that would shrink the triangle too far.
      const pad = 20;
      const own = fit(stage, corners, pad);
      let view = own;
      if (circle) {
        const extra: [number, number][] = [[ox - R, oy - R], [ox + R, oy + R]];
        if (has("centres")) extra.push([hx, hy]);
        const all = fit(stage, [...corners, ...extra], pad);
        view = all.k >= 0.45 * own.k ? all : fit(stage, corners, pad + ((1 - 0.45) * Math.min(stage.width, stage.height)) / 2);
      }
      const { k, toPx } = view;
      const P = { C: toPx(0, 0), B: toPx(bx, 0), A: toPx(ax, ay) };
      const centroid: [number, number] = [(P.A[0] + P.B[0] + P.C[0]) / 3, (P.A[1] + P.B[1] + P.C[1]) / 3];
      /** A point pushed `by` pixels away from the triangle's middle. */
      const out = (x: number, y: number, by: number): [number, number] => {
        const dx = x - centroid[0];
        const dy = y - centroid[1];
        const d = Math.hypot(dx, dy) || 1;
        return [x + (dx / d) * by, y + (dy / d) * by];
      };

      ctx.save();
      clipTo(ctx, stage);
      if (circle) {
        const [cx, cy] = toPx(ox, oy);
        ring(ctx, cx, cy, R * k, theme.curve, has("centres") ? 1.25 : 2, has("centres") ? [5, 5] : undefined);
      }
      polygon(ctx, [P.A, P.B, P.C], theme.sine, 0.1);
      line(ctx, P.B[0], P.B[1], P.C[0], P.C[1], theme.sine, 3);
      line(ctx, P.C[0], P.C[1], P.A[0], P.A[1], theme.cosine, 3);
      line(ctx, P.A[0], P.A[1], P.B[0], P.B[1], theme.tangent, 3);

      if (has("cosine")) {
        // Angle C: a square corner at 90°, an arc otherwise.
        if (Math.abs(C - 90) < 0.5) {
          const s = 14;
          const u = [(P.B[0] - P.C[0]) / Math.hypot(P.B[0] - P.C[0], P.B[1] - P.C[1]), 0] as const;
          const v = [(P.A[0] - P.C[0]) / Math.hypot(P.A[0] - P.C[0], P.A[1] - P.C[1]), (P.A[1] - P.C[1]) / Math.hypot(P.A[0] - P.C[0], P.A[1] - P.C[1])] as const;
          ctx.save();
          ctx.strokeStyle = theme.angle;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(P.C[0] + u[0] * s, P.C[1] + u[1] * s);
          ctx.lineTo(P.C[0] + (u[0] + v[0]) * s, P.C[1] + (u[1] + v[1]) * s);
          ctx.lineTo(P.C[0] + v[0] * s, P.C[1] + v[1] * s);
          ctx.stroke();
          ctx.restore();
        } else angleArc(ctx, P.C[0], P.C[1], 20, -C * DEG, 0, theme.angle);
      }

      if (has("circle")) {
        const [cx, cy] = toPx(ox, oy);
        line(ctx, cx, cy, P.A[0], P.A[1], theme.curve, 1.5, [4, 4]);
        disc(ctx, cx, cy, 4, theme.curve);
      }

      if (has("centres")) {
        const O = toPx(ox, oy);
        const I = toPx(num(results.ix), num(results.iy));
        const G = toPx(num(results.gx), num(results.gy));
        const H = toPx(hx, hy);
        ring(ctx, I[0], I[1], num(results.inR) * k, theme.tangent, 2);
        if (num(results.og) > 1e-6) {
          // Euler's line, drawn right across the stage through O and H.
          const dx = H[0] - O[0];
          const dy = H[1] - O[1];
          const d = Math.hypot(dx, dy) || 1;
          const reach = stage.width + stage.height;
          line(ctx, O[0] - (dx / d) * reach, O[1] - (dy / d) * reach, O[0] + (dx / d) * reach, O[1] + (dy / d) * reach, theme.secant, 1.5, [6, 4]);
        }
        const dots: [string, [number, number], string, number, number][] = [
          ["O", O, theme.curve, -10, -10],
          ["I", I, theme.tangent, 10, 10],
          ["G", G, theme.sine, 10, -10],
          ["H", H, theme.secant, -10, 10],
        ];
        ctx.restore();
        ctx.save();
        clipTo(ctx, stage);
        for (const [, [x, y], colour] of dots) disc(ctx, x, y, 4, colour);
        ctx.restore();
        for (const [name, [x, y], colour, dx, dy] of dots) {
          if (x >= stage.x - 12 && x <= stage.x + stage.width + 12 && y >= stage.y - 6 && y <= stage.y + stage.height + 6) tag(name, x + dx, y + dy, colour, theme.fontStrong);
        }
      } else ctx.restore();

      // Corners and sides.
      const A = num(results.angleA);
      const B = num(results.angleB);
      const sides: [string, number, [number, number], [number, number], string][] = [
        ["a", a, P.B, P.C, theme.sine],
        ["b", num(results.b), P.C, P.A, theme.cosine],
        ["c", num(results.c), P.A, P.B, theme.tangent],
      ];
      for (const [name, length, p, q, colour] of sides) {
        const [x, y] = out((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, 14);
        tag(words ? `${name} = ${fixed(length, 2)}` : name, x, y, colour);
      }
      const vertices: [string, number, [number, number]][] = [["A", A, P.A], ["B", B, P.B], ["C", C, P.C]];
      for (const [name, angle, p] of vertices) {
        const [x, y] = out(p[0], p[1], 16);
        tag(words ? `${name} ${degrees(angle)}` : name, x, y, theme.text, theme.fontStrong);
      }

      if (has("circle")) {
        title("The sine rule: one ratio, one circle");
        caption(words ? `a/sin A = b/sin B = c/sin C = 2R = ${fixed(num(results.twoR))}` : "a/sin A = b/sin B = c/sin C = 2R");
        if (words) caption(`R = ${fixed(R)} · the circle through A, B and C`, 1);
      } else if (has("cosine")) {
        title("The cosine rule");
        const term = num(results.cosTerm);
        if (words) {
          caption(`c² = ${fixed(num(results.cSquared))} = ${fixed(num(results.sumSquares))} ${term < 0 ? "+" : "−"} ${fixed(Math.abs(term))}`);
          caption(Math.abs(term) < 1e-9 ? "C = 90°: cos C = 0, so c² = a² + b²" : "c² = a² + b² − 2ab cos C", 1);
        } else caption("c² = a² + b² − 2ab cos C");
      } else if (has("centres")) {
        title("Centres of a triangle");
        if (words) {
          caption(`R ${fixed(R)} · r ${fixed(num(results.inR))} · area ${fixed(num(results.area))}`);
          caption(`OG ${fixed(num(results.og))} · GH ${fixed(num(results.gh))} · OI ${fixed(num(results.oi))}`, 1);
        } else caption("O circumcentre · I incentre · G centroid · H orthocentre");
      }
    }

    function drawAmbiguous() {
      const angleA = num(results.ssaA, 30);
      const b = num(results.ssaB, 10);
      const a = num(results.ssaSide, 7);
      const h = num(results.ssaHeight);
      const count = Math.round(num(results.ssaCount));
      const cx = b * Math.cos(angleA * DEG);
      const cy = b * Math.sin(angleA * DEG);
      const ends = [num(results.ssaC1), num(results.ssaC2)].slice(0, count);
      title("Given A, b and a: how many triangles?");

      const right = Math.max(cx + a, b, ...ends, 1);
      const left = Math.min(0, cx - a);
      const view = fit(stage, [[left, Math.min(0, cy - a)], [right, cy + a]], 18);
      const { k, toPx } = view;
      const pA = toPx(0, 0);
      const pC = toPx(cx, cy);
      const foot = toPx(cx, 0);

      ctx.save();
      clipTo(ctx, stage);
      // The base: a ray from A; the part behind A is no use for a triangle.
      line(ctx, toPx(left, 0)[0], pA[1], pA[0], pA[1], theme.muted, 1, [3, 4]);
      line(ctx, pA[0], pA[1], toPx(right, 0)[0] + 10, pA[1], theme.axis, 2);
      ring(ctx, pC[0], pC[1], a * k, theme.sine, 1.5, [5, 5]);
      const fills = [theme.tangent, theme.secant];
      ends.forEach((c, i) => {
        const pB = toPx(c, 0);
        polygon(ctx, [pA, pB, pC], fills[i]!, 0.18);
        line(ctx, pC[0], pC[1], pB[0], pB[1], theme.sine, 3);
        disc(ctx, pB[0], pB[1], 4.5, theme.text);
      });
      line(ctx, pC[0], pC[1], foot[0], foot[1], theme.muted, 1.5, [4, 4]);
      line(ctx, pA[0], pA[1], pC[0], pC[1], theme.cosine, 3);
      angleArc(ctx, pA[0], pA[1], 22, -angleA * DEG, 0, theme.angle);
      disc(ctx, pA[0], pA[1], 4, theme.text);
      disc(ctx, pC[0], pC[1], 4, theme.text);
      ctx.restore();

      tag("A", pA[0] - 10, pA[1] + 12, theme.text, theme.fontStrong);
      tag("C", pC[0], pC[1] - 14, theme.text, theme.fontStrong);
      tag(words ? `b = ${fixed(b, 1)}` : "b", (pA[0] + pC[0]) / 2 - 16, (pA[1] + pC[1]) / 2 - 8, theme.cosine);
      tag(words ? `h = ${fixed(h)}` : "h", foot[0] + 14, (foot[1] + pC[1]) / 2, theme.muted);
      ends.forEach((c, i) => {
        const pB = toPx(c, 0);
        tag(count === 2 ? `B${i === 0 ? "₁" : "₂"}` : "B", pB[0], pB[1] + 14, theme.text, theme.fontStrong);
      });
      tag(words ? `a = ${fixed(a, 1)}` : "a", pC[0] + 18, pC[1] - 14, theme.sine);
      const many = ["no triangle", "one triangle", "two triangles"][count] ?? "no triangle";
      if (words) {
        caption(`h = b sin A = ${fixed(h)} · a = ${fixed(a)}: ${many}`);
        caption(`A = ${degrees(angleA)}: swing a about C to meet the base`, 1);
      } else caption("Swing side a about C: where does it meet the base?");
    }

    function drawSight() {
      const id = SOLVETRI_SIGHT_ORDER[Math.round(num(results.sight))] ?? "tower";
      const elev = num(results.elev, 45);
      const far = num(results.far, 30);
      const H = num(results.sightHeight);
      const near = num(results.sightNear);
      const farD = num(results.sightFar);
      const ok = num(results.sightOk) === 1;
      const tall = (x: number, y: number, top: number, colour: string) => {
        ctx.save();
        ctx.fillStyle = colour;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(x - 4, top, 8, y - top);
        ctx.restore();
      };

      if (id === "tower") {
        title("A tower seen from the ground");
        const { toPx } = fit(stage, [[0, 0], [near, H]], 26);
        const O = toPx(0, 0);
        const foot = toPx(near, 0);
        const top = toPx(near, H);
        line(ctx, stage.x, O[1], stage.x + stage.width, O[1], theme.axis, 2);
        tall(foot[0], foot[1], top[1], theme.neutral);
        line(ctx, O[0], O[1], top[0], top[1], theme.angle, 2, [6, 4]);
        angleArc(ctx, O[0], O[1], 28, -elev * DEG, 0, theme.angle);
        disc(ctx, O[0], O[1], 4.5, theme.text);
        const mid = (-elev * DEG) / 2;
        tag(`${degrees(elev)}`, O[0] + 44 * Math.cos(mid), O[1] + 44 * Math.sin(mid), theme.angle, theme.fontStrong);
        tag(`${fixed(near, 0)} m`, (O[0] + foot[0]) / 2, O[1] + 14, theme.text);
        tag(words ? `h = ${fixed(H)} m` : "h = ?", foot[0] - 8, (foot[1] + top[1]) / 2, theme.neutral, theme.fontStrong);
        caption(words ? `h = d tan θ = ${fixed(near, 0)} × tan ${degrees(elev)} = ${fixed(H)} m` : "h = d tan θ");
        return;
      }

      if (id === "two-points") {
        title("A tower seen from two points");
        const gap = num(results.sightGap);
        if (!ok) {
          line(ctx, stage.x, stage.y + stage.height - 20, stage.x + stage.width, stage.y + stage.height - 20, theme.axis, 2);
          caption("The farther point must see the smaller angle");
          return;
        }
        // The far point at 0, the near point at gap, the tower at gap + near.
        const { toPx } = fit(stage, [[0, 0], [farD, H]], 26);
        const P = toPx(0, 0);
        const Q = toPx(gap, 0);
        const foot = toPx(farD, 0);
        const top = toPx(farD, H);
        line(ctx, stage.x, P[1], stage.x + stage.width, P[1], theme.axis, 2);
        tall(foot[0], foot[1], top[1], theme.neutral);
        line(ctx, P[0], P[1], top[0], top[1], theme.cosine, 2, [6, 4]);
        line(ctx, Q[0], Q[1], top[0], top[1], theme.angle, 2, [6, 4]);
        angleArc(ctx, P[0], P[1], 30, -far * DEG, 0, theme.cosine);
        angleArc(ctx, Q[0], Q[1], 22, -elev * DEG, 0, theme.angle);
        disc(ctx, P[0], P[1], 4.5, theme.text);
        disc(ctx, Q[0], Q[1], 4.5, theme.text);
        tag(degrees(far), P[0] + 46 * Math.cos((-far * DEG) / 2), P[1] + 46 * Math.sin((-far * DEG) / 2) + 4, theme.cosine, theme.fontStrong);
        tag(degrees(elev), Q[0] + 38 * Math.cos((-elev * DEG) / 2), Q[1] + 38 * Math.sin((-elev * DEG) / 2) - 4, theme.angle, theme.fontStrong);
        tag(`${fixed(gap, 0)} m`, (P[0] + Q[0]) / 2, P[1] + 14, theme.text);
        tag(words ? `x = ${fixed(near)} m` : "x", (Q[0] + foot[0]) / 2, P[1] + 30, theme.muted);
        tag(words ? `h = ${fixed(H)} m` : "h = ?", foot[0] - 8, (foot[1] + top[1]) / 2, theme.neutral, theme.fontStrong);
        caption(words ? `h = ${fixed(H)} m, its foot ${fixed(near)} m from the nearer point` : "h = x tan α = (x + gap) tan β");
        return;
      }

      title("Two ships seen from a lighthouse");
      // The lighthouse at 0, the ships at their distances out to sea.
      const { toPx } = fit(stage, [[0, 0], [Math.max(near, farD), H]], 26);
      const foot = toPx(0, 0);
      const top = toPx(0, H);
      const s1 = toPx(near, 0);
      const s2 = toPx(farD, 0);
      line(ctx, stage.x, foot[1], stage.x + stage.width, foot[1], theme.sine, 2);
      tall(foot[0], foot[1], top[1], theme.neutral);
      line(ctx, top[0], top[1], stage.x + stage.width, top[1], theme.muted, 1, [3, 4]);
      line(ctx, top[0], top[1], s1[0], s1[1], theme.angle, 2, [6, 4]);
      line(ctx, top[0], top[1], s2[0], s2[1], theme.cosine, 2, [6, 4]);
      angleArc(ctx, top[0], top[1], 26, 0, elev * DEG, theme.angle);
      angleArc(ctx, top[0], top[1], 40, 0, far * DEG, theme.cosine);
      for (const s of [s1, s2]) disc(ctx, s[0], s[1], 5, theme.text);
      tag(degrees(elev), top[0] + 40 * Math.cos((elev * DEG) / 2) + 6, top[1] + 40 * Math.sin((elev * DEG) / 2) + 8, theme.angle, theme.fontStrong);
      tag(degrees(far), top[0] + 58 * Math.cos((far * DEG) / 2) + 10, top[1] + 58 * Math.sin((far * DEG) / 2), theme.cosine, theme.fontStrong);
      tag(`${fixed(H, 0)} m`, foot[0] + 26, (foot[1] + top[1]) / 2, theme.neutral, theme.fontStrong);
      if (words) {
        tag(`${fixed(near, 1)} m`, s1[0], s1[1] + 14, theme.angle);
        tag(`${fixed(farD, 1)} m`, s2[0], s2[1] + 28, theme.cosine);
      }
      if (!ok) caption("The farther ship must be seen at the smaller angle");
      else caption(words ? `The ships are ${fixed(num(results.sightGap))} m apart` : "distance = height ÷ tan(depression)");
    }
  },
};

