/**
 * Conic sections, in three pictures.
 *
 * Cone: a double cone seen from the side, cut by a plane at an angle β to its
 * axis; the part of the plane inside the cone is drawn thick, and beside it
 * the shape of the cut — circle, ellipse, parabola or hyperbola.
 *
 * Locus: a focus F, a directrix, and a point P with PF = e·PM, the two
 * distances drawn in two colours; the whole curve P can trace is drawn too.
 *
 * Curve: a parabola, ellipse or hyperbola in standard form, to scale (equal
 * units on both axes), with its focus or foci, directrix, the distances from
 * P, the asymptotes of a hyperbola, the tangent and normal at P, and the
 * reflected rays.
 */

import {
  CONE_HALF_ANGLE,
  CONIC_KIND_ORDER,
  CONIC_OPENING_ORDER,
  CONIC_SHAPE_LABELS,
  LOCUS_FOCUS_DIRECTRIX,
  conicOrient,
  conicPolarRadius,
  type ConicKind,
  type ConicOpening,
} from "@ise/mathematics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };
type Pt = readonly [number, number];

export interface ConicLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The plane of the locus and standard-form views. */
  plot: Box;
  /** The cone, and the shape of its section beside it. */
  cone: Box;
  section: Box;
  /** Baselines of the two caption lines. */
  caption1: number;
  caption2: number;
}

export function computeConicLayout(width: number): ConicLayout {
  const compact = width < 560;
  const height = compact ? 400 : 420;
  const half = (width - 24) / 2;
  return {
    width,
    height,
    compact,
    plot: { x: 12, y: 30, width: width - 24, height: height - 30 - 50 },
    cone: { x: 12, y: 34, width: half, height: height - 34 - 54 },
    section: { x: 12 + half, y: 34, width: half, height: height - 34 - 54 },
    caption1: height - 32,
    caption2: height - 13,
  };
}

const DEG = Math.PI / 180;
const fixed = (v: number, digits = 2) => `${v < -0.5 * 10 ** -digits ? "−" : ""}${Math.abs(v).toFixed(digits)}`;
/** A coefficient for an equation: at most two decimals, trailing zeros dropped. */
const coef = (v: number) => fixed(v, 2).replace(/\.?0+$/, "");

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

/** A polyline in plane units, clipped to the plane, broken wherever a point is missing. */
function polyline(ctx: CanvasRenderingContext2D, plane: Plane, points: readonly (Pt | null)[], colour: string, lineWidth = 2.5, dash?: number[]) {
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  let pen = false;
  for (const p of points) {
    if (!p) {
      pen = false;
      continue;
    }
    const [x, y] = plane.toPx(p[0], p[1]);
    if (pen) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    pen = true;
  }
  ctx.stroke();
  ctx.restore();
}

/** A straight line through (x, y) with direction (dx, dy), as long as the plane, clipped to it. */
function infiniteLine(ctx: CanvasRenderingContext2D, plane: Plane, x: number, y: number, dx: number, dy: number, colour: string, lineWidth = 2, dash?: number[]) {
  const n = Math.hypot(dx, dy) || 1;
  const reach = (plane.xDomain[1] - plane.xDomain[0]) + (plane.yDomain[1] - plane.yDomain[0]);
  const ux = (dx / n) * reach;
  const uy = (dy / n) * reach;
  polyline(ctx, plane, [[x - ux, y - uy], [x + ux, y + uy]], colour, lineWidth, dash);
}

/** Text kept inside a box (the recorder measures 6 px a character; real fonts are close). */
function tag(ctx: CanvasRenderingContext2D, box: Box, words: string, x: number, y: number, colour: string, font: string, background: string) {
  const w = words.length * 6.5;
  const left = Math.min(Math.max(x, box.x + 6), box.x + box.width - w - 6);
  const top = Math.min(Math.max(y, box.y + 9), box.y + box.height - 9);
  // A pill behind the letters keeps them clear of grid numbers and lines.
  label(ctx, words, left, top, { color: colour, font, background });
}

/** A plane with equal units on both axes, holding every point given (and the origin) with a margin. */
function fitPlane(box: Box, points: readonly Pt[]): Plane {
  let [x0, x1, y0, y1] = [0, 0, 0, 0];
  for (const [x, y] of points) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const pad = 0.12 * Math.max(x1 - x0, y1 - y0, 1);
  x0 -= pad;
  x1 += pad;
  y0 -= pad;
  y1 += pad;
  const scale = Math.min(box.width / (x1 - x0), box.height / (y1 - y0));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hx = box.width / (2 * scale);
  const hy = box.height / (2 * scale);
  return createPlane(box, [cx - hx, cx + hx], [cy - hy, cy + hy]);
}

/** Points of a standard-form conic, sampled far enough to leave the plane. */
function curvePoints(kind: ConicKind, opens: ConicOpening, a: number, b: number, reach: number): (Pt | null)[] {
  const points: (Pt | null)[] = [];
  if (kind === "parabola") {
    const T = Math.sqrt(reach / a) + 1;
    for (let i = 0; i <= 300; i++) {
      const t = -T + (2 * T * i) / 300;
      points.push(conicOrient(opens, a * t * t, 2 * a * t));
    }
  } else if (kind === "ellipse") {
    for (let i = 0; i <= 240; i++) points.push([a * Math.cos((i * 2 * Math.PI) / 240), b * Math.sin((i * 2 * Math.PI) / 240)]);
  } else {
    const U = Math.acosh(reach / a + 1) + 0.3;
    for (const side of [1, -1]) {
      for (let i = 0; i <= 200; i++) {
        const u = -U + (2 * U * i) / 200;
        points.push([side * a * Math.cosh(u), b * Math.sinh(u)]);
      }
      points.push(null);
    }
  }
  return points;
}

/** The section's shape for an eccentricity, in units about 2 across, centred near the origin. */
function sectionPoints(e: number): (Pt | null)[] {
  const points: (Pt | null)[] = [];
  if (e < 1 - 1e-9) {
    const b = Math.sqrt(1 - e * e);
    for (let i = 0; i <= 160; i++) points.push([Math.cos((i * 2 * Math.PI) / 160), b * Math.sin((i * 2 * Math.PI) / 160)]);
  } else if (Math.abs(e - 1) <= 1e-9) {
    for (let i = 0; i <= 120; i++) {
      const t = -2 + (4 * i) / 120;
      points.push([0.25 * t * t - 0.6, 0.5 * t]);
    }
  } else {
    const a = 0.45;
    const b = a * Math.sqrt(e * e - 1);
    for (const side of [1, -1]) {
      for (let i = 0; i <= 100; i++) {
        const u = -1.4 + (2.8 * i) / 100;
        points.push([side * a * Math.cosh(u), b * Math.sinh(u)]);
      }
      points.push(null);
    }
  }
  return points;
}

function drawCone(ctx: CanvasRenderingContext2D, layout: ConicLayout, tilt: number, theme: LabTheme) {
  const { cone } = layout;
  const tanA = Math.tan(CONE_HALF_ANGLE * DEG);
  const H = Math.min(cone.height / 2 - 8, (cone.width / 2 - 8) / tanA);
  const cx = cone.x + cone.width / 2;
  const cy = cone.y + cone.height / 2;
  const w = H * tanA;
  // The two nappes.
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.14;
  for (const s of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - w, cy - s * H);
    ctx.lineTo(cx + w, cy - s * H);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  line(ctx, cx - w, cy - H, cx + w, cy + H, theme.sine, 1.5);
  line(ctx, cx + w, cy - H, cx - w, cy + H, theme.sine, 1.5);
  line(ctx, cx, cy - H - 4, cx, cy + H + 4, theme.muted, 1, [3, 4]);

  // The plane: a line at β to the axis, a fixed distance from the vertex, on the lower nappe's side.
  const beta = tilt * DEG;
  const D = 0.32 * H;
  const ux = Math.sin(beta);
  const uy = -Math.cos(beta);
  // Screen y runs down; the normal points down-right, into the lower nappe.
  const ox = cx + D * Math.cos(beta);
  const oy = cy + D * Math.sin(beta);
  const inside = (x: number, y: number) => Math.abs(x - cx) <= Math.abs(y - cy) * tanA + 1e-6 && Math.abs(y - cy) <= H;
  const inBox = (x: number, y: number) => x >= cone.x && x <= cone.x + cone.width && y >= cone.y && y <= cone.y + cone.height;
  const reach = 2 * (H + w);
  const samples: [number, number][] = [];
  for (let i = 0; i <= 400; i++) {
    const s = -reach + (2 * reach * i) / 400;
    samples.push([ox + s * ux, oy + s * uy]);
  }
  const visible = samples.filter(([x, y]) => inBox(x, y));
  if (visible.length > 1) line(ctx, visible[0]![0], visible[0]![1], visible[visible.length - 1]![0], visible[visible.length - 1]![1], theme.angle, 1.5, [5, 4]);
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  let pen = false;
  for (const [x, y] of samples) {
    if (inside(x, y)) {
      if (pen) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
      pen = true;
    } else pen = false;
  }
  ctx.stroke();
  ctx.restore();
  label(ctx, "axis", cx + 5, cone.y + 4, { color: theme.muted, font: theme.font });
  label(ctx, "β", ox + 10, oy + 2, { color: theme.angle, font: theme.fontStrong });
}

function drawSection(ctx: CanvasRenderingContext2D, layout: ConicLayout, shape: number, e: number, theme: LabTheme) {
  const { section } = layout;
  const side = Math.min(section.width, section.height - 30);
  const box = { x: section.x + (section.width - side) / 2, y: section.y + Math.max(4, (section.height - side - 24) / 2), width: side, height: side };
  const plane = createPlane(box, [-1.25, 1.25], [-1.25, 1.25]);
  ctx.save();
  ctx.strokeStyle = theme.grid;
  ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();
  polyline(ctx, plane, sectionPoints(e), theme.angle, 3);
  label(ctx, `the cut: ${CONIC_SHAPE_LABELS[shape] ?? "ellipse"}`, section.x + section.width / 2, box.y + side + 16, { color: theme.text, font: theme.fontStrong, align: "center" });
}

export const conicRenderer: SimulationRenderer<ConicLayout> = {
  id: "conic",
  layout: (width) => computeConicLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, plot } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (text: string, second = false) =>
      label(ctx, text, width / 2, second ? layout.caption2 : layout.caption1, { color: theme.text, font: theme.font, align: "center" });

    if (has("cone")) {
      const tilt = num(results.tilt, 45);
      const shape = Math.round(num(results.sliceKind, 1));
      const e = num(results.sliceE);
      title(`A double cone (α = ${CONE_HALF_ANGLE}°) cut by a plane`);
      drawCone(ctx, layout, tilt, theme);
      drawSection(ctx, layout, shape, e, theme);
      if (words) {
        const compare = shape === 0 ? "= 90°" : shape === 2 ? "= α" : shape === 1 ? "> α" : "< α";
        caption(`β = ${tilt.toFixed(0)}° ${compare}: ${CONIC_SHAPE_LABELS[shape]}`);
        caption(`e = cos β / cos α = ${fixed(e)}`, true);
      }
    }

    if (has("locus")) {
      const e = num(results.locusE, 0.5);
      const shape = Math.round(num(results.locusKind, 1));
      const p = LOCUS_FOCUS_DIRECTRIX;
      const lx = num(results.lx);
      const ly = num(results.ly);
      title(`PF = e · PM, with e = ${fixed(e)}`);
      const plane = fitPlane(plot, [[-p - 1, 0], [6.2, 6.2], [6.2, -6.2]]);
      drawPlane(ctx, plane, theme, { showLabels: words });
      const points: (Pt | null)[] = [];
      let last = 0;
      for (let i = 0; i <= 1440; i++) {
        const phi = -180 + i / 4;
        const r = conicPolarRadius(e, phi, p);
        if (!Number.isFinite(r) || Math.abs(r) > 60 || (last !== 0 && Math.sign(r) !== Math.sign(last))) points.push(null);
        if (Number.isFinite(r) && Math.abs(r) <= 60) points.push([r * Math.cos(phi * DEG), r * Math.sin(phi * DEG)]);
        last = Number.isFinite(r) ? r : 0;
      }
      polyline(ctx, plane, points, theme.curve, 2.5);
      // The directrix x = −p.
      infiniteLine(ctx, plane, -p, 0, 0, 1, theme.secant, 2, [6, 4]);
      const [fx, fy] = plane.toPx(0, 0);
      const [Px, Py] = plane.toPx(lx, ly);
      const [Mx, My] = plane.toPx(-p, ly);
      line(ctx, Px, Py, fx, fy, theme.sine, 2.5);
      line(ctx, Px, Py, Mx, My, theme.cosine, 2.5);
      disc(ctx, fx, fy, 5, theme.angle);
      disc(ctx, Mx, My, 4, theme.cosine);
      disc(ctx, Px, Py, 5.5, theme.point);
      tag(ctx, plot, "F", fx + 7, fy + 11, theme.angle, theme.fontStrong, theme.background);
      tag(ctx, plot, "P", Px + 8, Py - 10, theme.point, theme.fontStrong, theme.background);
      tag(ctx, plot, "M", Mx - 16, My - 10, theme.cosine, theme.fontStrong, theme.background);
      tag(ctx, plot, "directrix", plane.toPx(-p, 0)[0] + 6, plot.y + 10, theme.secant, theme.font, theme.background);
      if (words) {
        caption(`PF ${fixed(num(results.lpf))} = ${fixed(e)} × PM ${fixed(num(results.lpm))}`);
        caption(`e ${shape === 2 ? "= 1" : shape === 1 ? "< 1" : "> 1"}: ${shape === 2 ? "a parabola" : shape === 1 ? "an ellipse" : "a hyperbola"}`, true);
      }
    }

    if (has("curve")) {
      const kind = CONIC_KIND_ORDER[Math.round(num(results.kind))] ?? "parabola";
      const opens = CONIC_OPENING_ORDER[Math.round(num(results.opens))] ?? "right";
      const a = num(results.a, 2);
      const b = num(results.b, 1.5);
      const c = num(results.c);
      const px = num(results.px);
      const py = num(results.py);
      const f1: Pt = [num(results.f1x), num(results.f1y)];
      const f2: Pt = [num(results.f2x), num(results.f2y)];
      const two = num(results.focusCount) === 2;

      const frame: Pt[] = [[px, py], f1, f2];
      if (kind === "parabola") {
        // The directrix, a stretch of curve either side of the focus, and P's mirror image across the axis.
        const [u, v] = conicOrientInverse(opens, px, py);
        frame.push(conicOrient(opens, -a, 0), conicOrient(opens, 4 * a, 4 * a), conicOrient(opens, 4 * a, -4 * a), conicOrient(opens, u, -v));
      } else if (kind === "ellipse") {
        frame.push([a, 0], [-a, 0], [0, b], [0, -b]);
        // Bring the directrix into view when it is not far off (it runs away as e → 0).
        const d = num(results.directrix);
        if (has("focus") && num(results.hasDirectrix) === 1 && d <= 1.6 * Math.max(a, b)) {
          frame.push(num(results.directrixVertical) === 1 ? [d, py] : [px, d]);
        }
      } else {
        frame.push([-px, py], [0, b], [0, -b], [a, 0], [-a, 0], [-px, -py], [px, -py]);
      }
      const plane = fitPlane(plot, frame);
      const reach = Math.max(...plane.xDomain.map(Math.abs), ...plane.yDomain.map(Math.abs));

      if (kind === "parabola") title(parabolaEquation(opens, a));
      else if (kind === "ellipse") title(`x²/${coef(a * a)} + y²/${coef(b * b)} = 1`);
      else title(`x²/${coef(a * a)} − y²/${coef(b * b)} = 1`);

      drawPlane(ctx, plane, theme, { showLabels: words });
      if (kind === "hyperbola") {
        infiniteLine(ctx, plane, 0, 0, a, b, theme.muted, 1.5, [4, 4]);
        infiniteLine(ctx, plane, 0, 0, a, -b, theme.muted, 1.5, [4, 4]);
      }
      polyline(ctx, plane, curvePoints(kind, opens, a, b, reach), theme.curve, 2.5);
      const [Px, Py] = plane.toPx(px, py);
      const [F1x, F1y] = plane.toPx(f1[0], f1[1]);
      const [F2x, F2y] = plane.toPx(f2[0], f2[1]);

      if (has("focus") && num(results.hasDirectrix) === 1) {
        const d = num(results.directrix);
        const vertical = num(results.directrixVertical) === 1;
        if (vertical) infiniteLine(ctx, plane, d, 0, 0, 1, theme.secant, 2, [6, 4]);
        else infiniteLine(ctx, plane, 0, d, 1, 0, theme.secant, 2, [6, 4]);
        const [Mx, My] = vertical ? plane.toPx(d, py) : plane.toPx(px, d);
        if (plane.contains(Mx, My)) {
          line(ctx, Px, Py, Mx, My, theme.cosine, 2.5);
          disc(ctx, Mx, My, 4, theme.cosine);
          tag(ctx, plot, "M", Mx + (vertical ? (d < px ? -16 : 7) : 7), My + (vertical ? -10 : d < py ? 12 : -12), theme.cosine, theme.fontStrong, theme.background);
        }
      }

      if (has("string")) {
        line(ctx, Px, Py, F1x, F1y, theme.sine, 2.5);
        if (two) line(ctx, Px, Py, F2x, F2y, theme.angle, 2.5);
      }

      if (has("tangent")) {
        const vertical = num(results.tangentVertical) === 1;
        const flat = num(results.normalVertical) === 1;
        const m = num(results.tangentSlope);
        const [tx, ty] = vertical ? [0, 1] : [1, m];
        infiniteLine(ctx, plane, px, py, tx, ty, theme.tangent, 2.5);
        infiniteLine(ctx, plane, px, py, -ty, tx, theme.cosine, 1.5, [5, 4]);
        if (words) {
          const tangentWords = vertical ? "tangent vertical" : flat ? "tangent flat" : `tangent slope ${fixed(m)}`;
          const normalWords = vertical ? "normal flat" : flat ? "normal vertical" : `normal slope ${fixed(num(results.normalSlope))}`;
          caption(`${tangentWords} · ${normalWords}`);
        }
      }

      if (has("rays")) {
        if (kind === "parabola") {
          // A ray parallel to the axis comes in from the open side, bounces at P and passes through the focus.
          const [ax, ay] = conicOrient(opens, 1, 0);
          const edgeX = ax > 0 ? plane.xDomain[1] : ax < 0 ? plane.xDomain[0] : px;
          const edgeY = ay > 0 ? plane.yDomain[1] : ay < 0 ? plane.yDomain[0] : py;
          const [Sx, Sy] = plane.toPx(ax !== 0 ? edgeX : px, ay !== 0 ? edgeY : py);
          arrow(ctx, Sx, Sy, Px, Py, { color: theme.angle, width: 2, head: 8 });
          arrow(ctx, Px, Py, F1x, F1y, { color: theme.angle, width: 2, head: 8 });
          if (words) caption(`ray and PF each meet the tangent at ${num(results.angle1).toFixed(1)}°`, true);
        } else if (kind === "ellipse") {
          arrow(ctx, F1x, F1y, Px, Py, { color: theme.angle, width: 2, head: 8 });
          arrow(ctx, Px, Py, F2x, F2y, { color: theme.angle, width: 2, head: 8 });
          if (words) caption(`PF₁ and PF₂ each meet the tangent at ${num(results.angle1).toFixed(1)}°`, true);
        } else {
          line(ctx, Px, Py, F1x, F1y, theme.angle, 1.5, [4, 3]);
          line(ctx, Px, Py, F2x, F2y, theme.angle, 1.5, [4, 3]);
          if (words) caption(`tangent bisects ∠F₁PF₂:${num(results.angle1).toFixed(1)}° each side`, true);
        }
      }

      if (has("focus") || has("string") || has("rays")) {
        disc(ctx, F1x, F1y, 5, theme.angle);
        if (two && c > 1e-9) disc(ctx, F2x, F2y, 5, theme.angle);
        const f1Name = two ? (c > 1e-9 ? "F₁" : "C") : "F";
        tag(ctx, plot, words && !two ? `F(${coef(f1[0])}, ${coef(f1[1])})` : f1Name, F1x + 7, F1y + 12, theme.angle, theme.fontStrong, theme.background);
        if (two && c > 1e-9) tag(ctx, plot, "F₂", F2x + 7, F2y + 12, theme.angle, theme.fontStrong, theme.background);
      }

      disc(ctx, Px, Py, 5.5, theme.point);
      tag(ctx, plot, "P", Px + 8, Py - 11, theme.point, theme.fontStrong, theme.background);

      if (words && has("focus")) {
        const e = num(results.ecc);
        if (kind === "parabola") {
          caption(`PF = PM = ${fixed(num(results.pf1))} · e = 1`);
          caption(`latus rectum 4a = ${coef(num(results.latusRectum))}`, true);
        } else if (kind === "ellipse") {
          const major = num(results.majorVertical) === 1 ? "2b" : "2a";
          caption(`PF₁ + PF₂ = ${fixed(num(results.sumDist))} = ${major}`);
          caption(c > 1e-9 ? `c = ${fixed(c)} · e = c/${major.slice(1)} = ${fixed(e)}` : "a = b: a circle, both foci at the centre, e = 0", true);
        } else {
          caption(`|PF₁ − PF₂| = ${fixed(num(results.diffDist))} = 2a`);
          caption(`c = ${fixed(c)} · e = ${fixed(e)} · asymptotes y = ±${fixed(num(results.asymptoteSlope))}x`, true);
        }
      }
    }
  },
};

/** Back from x and y to the parabola's own frame (u along the axis, v across). */
function conicOrientInverse(opens: ConicOpening, x: number, y: number): [number, number] {
  switch (opens) {
    case "left": return [-x, y];
    case "up": return [y, x];
    case "down": return [-y, x];
    default: return [x, y];
  }
}

function parabolaEquation(opens: ConicOpening, a: number): string {
  const k = coef(4 * a);
  switch (opens) {
    case "left": return `y² = −${k}x`;
    case "up": return `x² = ${k}y`;
    case "down": return `x² = −${k}y`;
    default: return `y² = ${k}x`;
  }
}
