/**
 * Lines and circles on one square plane from −10 to 10.
 *
 * Lines: L₁ and L₂ right across the plane, with the acute angle θ marked
 * where they meet. Distance: a point P, the perpendicular from it to L₁ and
 * its foot. Family: one member of L₁ + λL₂ = 0, turning about the meeting
 * point as λ changes.
 *
 * Circle: the circle with its centre. Meet: L₁ against the circle, the
 * perpendicular from the centre, and the points where they cut or touch.
 * Tangent: the tangent and normal at a point of the circle, and the two
 * tangents from P when P is outside. Second: another circle and, with the
 * words on, the radical axis S₁ − S₂ = 0. Circle family: one member of
 * S + λL₁ = 0.
 *
 * Forms: the line through two draggable points A and B, with — when the
 * words are on — its general form, slope, inclination, the intercepts marked
 * on the axes and the perpendicular from the origin (the normal form's p and
 * ω). Collinear: a third point P, also draggable, and whether it lies on AB.
 *
 * Numbers a level may ask for — θ, distances, chord, slopes, tangent length,
 * where the radical axis crosses — are written only when the labels layer is on.
 */

import { CIRCLE_LINE_EXTENT } from "@ise/mathematics-engine";
import type { Results } from "@ise/science-engine";
import { label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

export interface CircleLineLayout {
  width: number;
  height: number;
  compact: boolean;
  plane: Plane;
  /** Middles of the two title lines above the plane and the two caption lines under it. */
  title1: number;
  title2: number;
  caption1: number;
  caption2: number;
  /** Whether A and B (and with `collinear`, P) can be dragged: only while the forms layer shows. */
  forms: boolean;
  collinear: boolean;
}

export function computeCircleLineLayout(width: number, layers: ReadonlySet<string> = new Set()): CircleLineLayout {
  const compact = width < 560;
  const side = Math.min(width - 32, compact ? 300 : 330);
  const top = 44;
  const plane = createPlane({ x: (width - side) / 2, y: top, width: side, height: side }, [-CIRCLE_LINE_EXTENT, CIRCLE_LINE_EXTENT], [-CIRCLE_LINE_EXTENT, CIRCLE_LINE_EXTENT]);
  return {
    width,
    height: top + side + 44,
    compact,
    plane,
    title1: 12,
    title2: 29,
    caption1: top + side + 15,
    caption2: top + side + 33,
    forms: layers.has("forms"),
    collinear: layers.has("forms") && layers.has("collinear"),
  };
}

/** −0.75, 5.00: fixed digits with a true minus sign. */
const fixed = (v: number, digits = 2) => {
  const text = Math.abs(v).toFixed(digits);
  return `${v < 0 && Number(text) !== 0 ? "−" : ""}${text}`;
};
/** 2, −0.5, 1.25: up to two decimals, no trailing zeros. */
const trim = (v: number) => {
  const r = Math.round(v * 100) / 100;
  return `${r < 0 ? "−" : ""}${Math.abs(r)}`;
};
const point = (x: number, y: number) => `(${trim(x)}, ${trim(y)})`;

/** "3x + 4y − 25 = 0", "x − 2 = 0", "2y − 4 = 0", with the signs a textbook uses. */
export function circleLineLineEquation(a: number, b: number, c: number): string {
  const terms: string[] = [];
  const add = (coef: number, symbol: string) => {
    const r = Math.round(coef * 100) / 100;
    if (r === 0) return;
    const size = Math.abs(r) === 1 && symbol ? symbol : `${Math.abs(r)}${symbol}`;
    terms.push(terms.length === 0 ? `${r < 0 ? "−" : ""}${size}` : `${r < 0 ? "− " : "+ "}${size}`);
  };
  add(a, "x");
  add(b, "y");
  add(c, "");
  return `${terms.length ? terms.join(" ") : "0"} = 0`;
}

/** x² + y² + 2gx + 2fy + c = 0 written out: "x² + y² − 4x + 6y − 12 = 0". */
export function circleLineGeneralEquation(g: number, f: number, c: number): string {
  const rest = circleLineLineEquation(2 * g, 2 * f, c).replace(/ = 0$/, "");
  if (rest === "0") return "x² + y² = 0";
  return `x² + y² ${rest.startsWith("−") ? `− ${rest.slice(1)}` : `+ ${rest}`} = 0`;
}

/** (x − h)² + (y − k)² = r²: "(x − 2)² + (y + 1)² = 9", "x² + y² = 25". */
export function circleLineCentreEquation(h: number, k: number, rSquared: number): string {
  const part = (v: number, s: string) => (Math.abs(v) < 1e-9 ? `${s}²` : `(${s} ${v > 0 ? "−" : "+"} ${trim(Math.abs(v))})²`);
  return `${part(h, "x")} + ${part(k, "y")} = ${trim(rSquared)}`;
}

/** Clip the line Ax + By + C = 0 to the plane's square; null when it misses it or is not a line. */
function lineEnds(a: number, b: number, c: number, lim = CIRCLE_LINE_EXTENT): [number, number, number, number] | null {
  const n = a * a + b * b;
  if (n < 1e-12) return null;
  const x0 = (-a * c) / n;
  const y0 = (-b * c) / n;
  const dx = -b / Math.sqrt(n);
  const dy = a / Math.sqrt(n);
  let lo = -1e6;
  let hi = 1e6;
  for (const [p, d] of [[x0, dx], [y0, dy]] as const) {
    if (Math.abs(d) < 1e-12) {
      if (p < -lim || p > lim) return null;
      continue;
    }
    const t1 = (-lim - p) / d;
    const t2 = (lim - p) / d;
    lo = Math.max(lo, Math.min(t1, t2));
    hi = Math.min(hi, Math.max(t1, t2));
  }
  if (hi - lo < 1e-9) return null;
  return [x0 + lo * dx, y0 + lo * dy, x0 + hi * dx, y0 + hi * dy];
}

function drawLine(ctx: CanvasRenderingContext2D, plane: Plane, a: number, b: number, c: number, colour: string, width = 2.5, dash?: number[]) {
  const ends = lineEnds(a, b, c);
  if (!ends) return null;
  const [x1, y1] = plane.toPx(ends[0], ends[1]);
  const [x2, y2] = plane.toPx(ends[2], ends[3]);
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
  return ends;
}

/** A name for a line, placed 80% along its visible piece and kept inside the plane. */
function nameLine(ctx: CanvasRenderingContext2D, plane: Plane, ends: [number, number, number, number] | null, text: string, colour: string, theme: LabTheme, at = 0.82) {
  if (!ends) return;
  const [x, y] = plane.toPx(ends[0] + (ends[2] - ends[0]) * at, ends[1] + (ends[3] - ends[1]) * at);
  const { rect } = plane;
  const lx = Math.min(rect.x + rect.width - 20, Math.max(rect.x + 4, x + 6));
  const ly = Math.min(rect.y + rect.height - 8, Math.max(rect.y + 8, y - 10));
  label(ctx, text, lx, ly, { color: colour, font: theme.fontStrong, background: theme.background });
}

function segment(ctx: CanvasRenderingContext2D, plane: Plane, x1: number, y1: number, x2: number, y2: number, colour: string, width = 2, dash?: number[]) {
  const [ax, ay] = plane.toPx(x1, y1);
  const [bx, by] = plane.toPx(x2, y2);
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, plane: Plane, x: number, y: number, r: number, fill: string) {
  const [px, py] = plane.toPx(x, y);
  if (!plane.contains(px, py, 2)) return;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, plane: Plane, x: number, y: number, radius: number, colour: string, width = 2.5, dash?: number[]) {
  const [px, py] = plane.toPx(x, y);
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.arc(px, py, radius * plane.sx, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A small name beside a point, kept inside the plane. */
function tag(ctx: CanvasRenderingContext2D, plane: Plane, x: number, y: number, text: string, colour: string, theme: LabTheme) {
  const [px, py] = plane.toPx(x, y);
  if (!plane.contains(px, py, 2)) return;
  const { rect } = plane;
  label(ctx, text, Math.min(rect.x + rect.width - 14, px + 7), Math.max(rect.y + 8, py - 10), { color: colour, font: theme.fontStrong });
}

/** The acute angle between the two lines, as an arc at their meeting point. */
function angleArc(ctx: CanvasRenderingContext2D, plane: Plane, r: Results, theme: LabTheme) {
  let d1x = -num(r.b1);
  let d1y = num(r.a1);
  let d2x = -num(r.b2);
  let d2y = num(r.a2);
  if (d1x * d2x + d1y * d2y < 0) {
    d2x = -d2x;
    d2y = -d2y;
  }
  // Canvas angles: y runs down the screen.
  const from = Math.atan2(-d1y, d1x);
  let sweep = Math.atan2(-d2y, d2x) - from;
  while (sweep > Math.PI) sweep -= 2 * Math.PI;
  while (sweep <= -Math.PI) sweep += 2 * Math.PI;
  const [mx, my] = plane.toPx(num(r.meetX), num(r.meetY));
  if (!plane.contains(mx, my)) return;
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.fillStyle = theme.angle;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(mx, my, 24, from, from + sweep, sweep < 0);
  ctx.stroke();
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.arc(mx, my, 24, from, from + sweep, sweep < 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const circleLineRenderer: SimulationRenderer<CircleLineLayout> = {
  id: "circleline",
  layout: (width, _graphs, layers) => computeCircleLineLayout(width, layers),

  draw(ctx, layout, input) {
    const { theme, layers, results: r } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, plane } = layout;
    const words = has("labels");
    ctx.clearRect(0, 0, width, height);
    drawPlane(ctx, plane, theme, { gridStep: 1 });

    const heads: { text: string; colour: string }[] = [];
    const captions: string[] = [];

    const [a1, b1, c1, a2, b2, c2] = [r.a1, r.b1, r.c1, r.a2, r.b2, r.c2].map((v) => num(v));
    const L1 = circleLineLineEquation(a1!, b1!, c1!);
    const L2 = circleLineLineEquation(a2!, b2!, c2!);
    const valid1 = num(r.line1Valid) === 1;
    const valid2 = num(r.line2Valid) === 1;
    const relation = num(r.lineRelation);
    const meets = num(r.meets) === 1;
    const lineMode = has("lines");
    const circleMode = has("circle");

    // ── Circle ───────────────────────────────────────────────────────────
    const kind = num(r.circleKind);
    const cx = num(r.cx);
    const cy = num(r.cy);
    const radius = num(r.radius);
    const general = num(r.form) === 1;
    const circleName = general ? circleLineGeneralEquation(num(r.circleG), num(r.circleF), num(r.circleC)) : circleLineCentreEquation(cx, cy, num(r.rSquared));
    if (circleMode) {
      if (kind === 1) ring(ctx, plane, cx, cy, radius, theme.curve, 2.5);
      if (kind >= 0) dot(ctx, plane, cx, cy, 4, theme.curve);
      if (kind === 1) tag(ctx, plane, cx, cy, "C", theme.curve, theme);
    }

    // ── Lines ────────────────────────────────────────────────────────────
    if (lineMode) {
      nameLine(ctx, plane, drawLine(ctx, plane, a1!, b1!, c1!, theme.sine), "L₁", theme.sine, theme, 0.82);
      nameLine(ctx, plane, drawLine(ctx, plane, a2!, b2!, c2!, theme.cosine), "L₂", theme.cosine, theme, 0.18);
      if (meets) dot(ctx, plane, num(r.meetX), num(r.meetY), 4.5, theme.text);
      heads.push({ text: `L₁: ${L1}`, colour: theme.sine }, { text: `L₂: ${L2}`, colour: theme.cosine });
    }

    if (has("angle") && meets) {
      angleArc(ctx, plane, r, theme);
      if (words) {
        const [mx, my] = plane.toPx(num(r.meetX), num(r.meetY));
        if (plane.contains(mx, my)) label(ctx, `θ = ${fixed(num(r.angleDeg), 1)}°`, Math.min(plane.rect.x + plane.rect.width - 70, mx + 28), Math.max(plane.rect.y + 10, my - 26), { color: theme.angle, font: theme.fontStrong, background: theme.background });
      }
    }
    if (has("angle") && words) {
      if (!valid1 || !valid2) captions.push("A and B cannot both be 0: that is not a line");
      else if (relation === 3) captions.push("the same line, written twice");
      else if (relation === 1) captions.push("parallel: same slope, the angle is 0°");
      else if (relation === 2) captions.push(num(r.vertical1) || num(r.vertical2) ? "perpendicular: one vertical, one horizontal" : "perpendicular: m₁m₂ = −1");
      else {
        const slopes = num(r.vertical1) ? "L₁ vertical" : num(r.vertical2) ? "L₂ vertical" : `m₁ = ${trim(num(r.m1))}, m₂ = ${trim(num(r.m2))}`;
        captions.push(`${slopes} · tan θ = ${fixed(num(r.tanAngle))} · θ = ${fixed(num(r.angleDeg), 1)}°`);
      }
      if (meets) captions.push(`they meet at ${point(num(r.meetX), num(r.meetY))}`);
    }

    if (has("distance")) {
      const px = num(r.px);
      const py = num(r.py);
      const fx = num(r.footX);
      const fy = num(r.footY);
      if (valid1) {
        segment(ctx, plane, px, py, fx, fy, theme.angle, 2, [5, 4]);
        dot(ctx, plane, fx, fy, 4, theme.angle);
        if (words) tag(ctx, plane, fx, fy, "M", theme.angle, theme);
      }
      dot(ctx, plane, px, py, 5, theme.point);
      tag(ctx, plane, px, py, "P", theme.point, theme);
      if (words) {
        captions.push(valid1 ? `P to L₁: ${fixed(num(r.distance))} · foot M ${point(fx, fy)}` : "L₁ is not a line");
        if (relation === 1) captions.push(`L₁ ∥ L₂: they are ${fixed(num(r.parallelDistance))} apart`);
        else if (relation === 3) captions.push("L₁ and L₂ are the same line");
      }
    }

    if (has("family")) {
      const ends = drawLine(ctx, plane, num(r.famA), num(r.famB), num(r.famC), theme.tangent, 3);
      nameLine(ctx, plane, ends, "L₁ + λL₂", theme.tangent, theme, 0.5);
      if (meets) dot(ctx, plane, num(r.meetX), num(r.meetY), 5, theme.tangent);
      if (words) {
        const lam = trim(num(r.lam));
        captions.push(num(r.famValid) ? `λ = ${lam}: ${circleLineLineEquation(num(r.famA), num(r.famB), num(r.famC))}` : `λ = ${lam}: A and B are both 0, no line`);
        if (meets) captions.push(`every member passes through ${point(num(r.meetX), num(r.meetY))}`);
        else if (relation === 1) captions.push("L₁ ∥ L₂: every member is parallel to them");
      }
    }

    // ── Circle views ─────────────────────────────────────────────────────
    if (circleMode && !lineMode) heads.push({ text: has("second") ? `S₁: ${circleName}` : circleName, colour: theme.curve });

    if (has("circle") && !has("meet") && !has("tangent") && !has("second") && !has("circle-family") && words) {
      const rSq = num(r.rSquared);
      if (kind === 1) captions.push(`centre ${point(cx, cy)} · radius ${fixed(radius)}`);
      else if (kind === 0) captions.push(`g² + f² − c = 0: a point circle at ${point(cx, cy)}`);
      else captions.push(`g² + f² − c = ${trim(rSq)} < 0: not a real circle`);
      if (general) captions.push(`centre (−g, −f), r² = g² + f² − c = ${trim(rSq)}`);
      else captions.push(`general form: ${circleLineGeneralEquation(num(r.circleG), num(r.circleF), num(r.circleC))}`);
    }

    if (has("meet")) {
      const ends = drawLine(ctx, plane, a1!, b1!, c1!, theme.sine);
      nameLine(ctx, plane, ends, "L", theme.sine, theme, 0.85);
      if (!lineMode) heads.push({ text: `L: ${L1}`, colour: theme.sine });
      const count = num(r.meetCount);
      if (kind === 1 && valid1) {
        // The perpendicular from the centre to the line.
        const n = a1! * a1! + b1! * b1!;
        const t = (a1! * cx + b1! * cy + c1!) / n;
        const fx = cx - a1! * t;
        const fy = cy - b1! * t;
        segment(ctx, plane, cx, cy, fx, fy, theme.angle, 2, [5, 4]);
        if (count === 2) segment(ctx, plane, num(r.cut1x), num(r.cut1y), num(r.cut2x), num(r.cut2y), theme.tangent, 4);
        if (count >= 1) {
          dot(ctx, plane, num(r.cut1x), num(r.cut1y), 5, theme.tangent);
          dot(ctx, plane, num(r.cut2x), num(r.cut2y), 5, theme.tangent);
        }
        if (!has("circle-family") && words) {
          const d = fixed(num(r.centreDistance));
          const rr = fixed(radius);
          captions.push(count === 2 ? `d = ${d} < r = ${rr}: cuts, chord ${fixed(num(r.chord))}` : count === 1 ? `d = r = ${rr}: touches at ${point(num(r.cut1x), num(r.cut1y))}` : `d = ${d} > r = ${rr}: misses`);
          captions.push(`discriminant ${fixed(num(r.discriminant), 1)}: ${count === 2 ? "two" : count === 1 ? "one repeated" : "no real"} root${count === 1 ? "" : "s"}`);
        }
      } else if (words && !has("circle-family")) {
        captions.push(kind !== 1 ? "no real circle for the line to meet" : "L is not a line");
      }
    }

    if (has("tangent") && kind === 1) {
      const tx = num(r.tx);
      const ty = num(r.ty);
      drawLine(ctx, plane, num(r.tangentA), num(r.tangentB), num(r.tangentC), theme.tangent, 2.5);
      // The normal: through the point and the centre.
      drawLine(ctx, plane, ty - cy, cx - tx, tx * cy - cx * ty, theme.cosine, 1.5, [6, 5]);
      segment(ctx, plane, cx, cy, tx, ty, theme.curve, 2);
      dot(ctx, plane, tx, ty, 5, theme.tangent);
      tag(ctx, plane, tx, ty, "T", theme.tangent, theme);
      const px = num(r.px);
      const py = num(r.py);
      const position = num(r.pointPosition);
      if (position === 1) {
        for (const [x, y] of [[num(r.contact1x), num(r.contact1y)], [num(r.contact2x), num(r.contact2y)]] as const) {
          segment(ctx, plane, px, py, x, y, theme.angle, 2);
          dot(ctx, plane, x, y, 3.5, theme.angle);
        }
      }
      dot(ctx, plane, px, py, 5, theme.point);
      tag(ctx, plane, px, py, "P", theme.point, theme);
      if (words) {
        const tangent = num(r.tangentVertical) ? "tangent vertical" : `tangent slope ${fixed(num(r.tangentSlope))}`;
        const normal = num(r.normalVertical) ? "normal vertical" : `normal slope ${fixed(num(r.normalSlope))}`;
        const full = `at T ${point(tx, ty)}: ${tangent} · ${normal}`;
        captions.push(full.length <= 55 ? full : `${tangent} · ${normal}`);
        captions.push(position === 1 ? `P outside: S₁ = ${fixed(num(r.s1))}, tangent √S₁ = ${fixed(num(r.tangentLength))}` : position === 0 ? "P is on the circle: S₁ = 0" : `P inside: S₁ = ${fixed(num(r.s1))} < 0, no tangent`);
      }
    } else if (has("tangent") && words) {
      captions.push("no real circle, so no tangent");
    }

    if (has("second")) {
      const cx2 = num(r.cx2);
      const cy2 = num(r.cy2);
      ring(ctx, plane, cx2, cy2, num(r.radius2), theme.secant, 2.5);
      dot(ctx, plane, cx2, cy2, 4, theme.secant);
      tag(ctx, plane, cx2, cy2, "C₂", theme.secant, theme);
      if (kind === 1) segment(ctx, plane, cx, cy, cx2, cy2, theme.muted, 1.5, [3, 4]);
      if (!lineMode) heads.push({ text: `S₂: ${circleLineCentreEquation(cx2, cy2, num(r.radius2) ** 2)}`, colour: theme.secant });
      if (words && kind === 1) {
        if (num(r.radicalExists)) {
          const ends = drawLine(ctx, plane, num(r.radicalA), num(r.radicalB), num(r.radicalC), theme.vector, 2.5, [8, 5]);
          nameLine(ctx, plane, ends, "S₁ − S₂ = 0", theme.vector, theme, 0.12);
        }
        const rel = num(r.circlesRelation);
        const names = ["apart", "touching outside", "cutting", "touching inside", "one inside the other", "the same circle"];
        const tangents = num(r.commonTangents);
        captions.push(`gap ${fixed(num(r.centreGap))}, r₁ + r₂ = ${fixed(radius + num(r.radius2))}: ${names[rel] ?? "apart"}`);
        captions.push(num(r.radicalExists) ? `radical axis ${circleLineLineEquation(num(r.radicalA), num(r.radicalB), num(r.radicalC))} · ${tangents} common tangent${tangents === 1 ? "" : "s"}` : `concentric: no radical axis · ${tangents} common tangents`);
      } else if (words) {
        captions.push("S₁ is not a real circle");
      }
    }

    if (has("circle-family")) {
      const famKind = num(r.famKind);
      const fx = num(r.famCx);
      const fy = num(r.famCy);
      if (famKind === 1) ring(ctx, plane, fx, fy, num(r.famR), theme.tangent, 2.5, [7, 5]);
      if (famKind >= 0) dot(ctx, plane, fx, fy, 4, theme.tangent);
      if (words) {
        const equation = circleLineGeneralEquation(-fx, -fy, num(r.famConst));
        captions.push(`λ = ${trim(num(r.lam))}: ${equation}`);
        captions.push(famKind === 1 ? `centre ${point(fx, fy)}, radius ${fixed(num(r.famR))}` : famKind === 0 ? "this member shrinks to a point" : "this member is not a real circle");
      }
    }

    // ── The line through A and B, in its forms ───────────────────────────
    if (has("forms")) {
      const ax = num(r.ax);
      const ay = num(r.ay);
      const bx = num(r.bx);
      const by = num(r.by);
      const valid = num(r.abValid) === 1;
      if (valid) {
        const ends = drawLine(ctx, plane, num(r.abA), num(r.abB), num(r.abC), theme.sine);
        nameLine(ctx, plane, ends, "AB", theme.sine, theme, 0.88);
        const p = num(r.abNormalP);
        if (p > 1e-9) {
          segment(ctx, plane, 0, 0, num(r.abFootX), num(r.abFootY), theme.angle, 2, [5, 4]);
          dot(ctx, plane, num(r.abFootX), num(r.abFootY), 3.5, theme.angle);
        }
        if (words) {
          if (p > 1e-9) tag(ctx, plane, num(r.abFootX), num(r.abFootY), "N", theme.angle, theme);
          if (num(r.abHasXIntercept)) dot(ctx, plane, num(r.abXIntercept), 0, 4.5, theme.cosine);
          if (num(r.abHasYIntercept)) dot(ctx, plane, 0, num(r.abYIntercept), 4.5, theme.cosine);
        }
      }
      for (const [x, y, name] of [[ax, ay, "A"], [bx, by, "B"]] as const) {
        dot(ctx, plane, x, y, 6, theme.point);
        tag(ctx, plane, x, y, name, theme.point, theme);
      }
      heads.push({ text: `A ${point(ax, ay)} · B ${point(bx, by)}`, colour: theme.point });
      if (words && valid) heads.push({ text: circleLineLineEquation(num(r.abA), num(r.abB), num(r.abC)), colour: theme.sine });
      if (words) {
        if (!valid) captions.push("A and B are one point: they fix no line");
        else if (num(r.abVertical)) captions.push("x₂ = x₁: vertical, θ = 90°, slope undefined");
        else captions.push(`slope m = ${fixed(num(r.abSlope))} · inclination θ = ${fixed(num(r.abInclination), 1)}°`);
        if (valid && !has("collinear")) {
          const xi = num(r.abHasXIntercept) ? `x-int ${trim(num(r.abXIntercept))}` : "no x-int";
          const yi = num(r.abHasYIntercept) ? `y-int ${trim(num(r.abYIntercept))}` : "no y-int";
          captions.push(`${xi} · ${yi} · p = ${fixed(num(r.abNormalP))}, ω = ${fixed(num(r.abNormalDeg), 1)}°`);
        }
      }
    }

    if (has("forms") && has("collinear")) {
      const px = num(r.px);
      const py = num(r.py);
      const on = num(r.abCollinear) === 1;
      if (num(r.abValid)) segment(ctx, plane, num(r.ax), num(r.ay), px, py, on ? theme.sine : theme.muted, 1.5, [3, 4]);
      dot(ctx, plane, px, py, 6, theme.angle);
      tag(ctx, plane, px, py, "P", theme.angle, theme);
      if (words) captions.push(on ? `P ${point(px, py)} is on AB: slope AP = slope AB` : `P ${point(px, py)} is off AB: triangle ABP has area ${trim(num(r.abpArea))}`);
    }

    heads.slice(0, 2).forEach((head, i) => label(ctx, head.text, width / 2, i === 0 ? layout.title1 : layout.title2, { color: head.colour, font: theme.fontStrong, align: "center" }));
    const lines = captions.slice(0, 2);
    if (lines[0]) label(ctx, lines[0], width / 2, layout.caption1, { color: theme.text, font: theme.font, align: "center" });
    if (lines[1]) label(ctx, lines[1], width / 2, layout.caption2, { color: theme.muted, font: theme.font, align: "center" });
  },

  /** Drag A or B (and P when the collinear layer shows), snapped to halves; only in the forms view. */
  pick(layout, x, y, lockedRegion, results): PickResult | null {
    if (!layout.forms) return null;
    const { plane } = layout;
    const handles: [string, string, string][] = [["A", "ax", "ay"], ["B", "bx", "by"]];
    if (layout.collinear) handles.push(["P", "px", "py"]);
    let handle = lockedRegion ? handles.find(([region]) => region === lockedRegion) : undefined;
    if (!lockedRegion) {
      let best = 24;
      for (const candidate of handles) {
        const [hx, hy] = plane.toPx(num(results[candidate[1]]), num(results[candidate[2]]));
        const gap = Math.hypot(hx - x, hy - y);
        if (gap <= best) {
          best = gap;
          handle = candidate;
        }
      }
    }
    if (!handle) return null;
    const [wx, wy] = plane.fromPx(x, y);
    const snap = (v: number) => Math.min(CIRCLE_LINE_EXTENT, Math.max(-CIRCLE_LINE_EXTENT, Math.round(v * 2) / 2)) || 0;
    return {
      writes: [
        { variable: handle[1], value: snap(wx) },
        { variable: handle[2], value: snap(wy) },
      ],
      region: handle[0],
    };
  },
};
