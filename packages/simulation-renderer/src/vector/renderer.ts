/**
 * Renderer for a 2D vector and its components on a coordinate plane.
 * vₓ uses the cosine colour and v_y the sine colour — the same projections
 * the learner met on the unit circle.
 *
 * Further layers:
 * - triangle / parallelogram / resultant / between: a second vector B added
 *   tip to tail or from the same tail, R = A + B (or A − B) and the angle φ
 *   between A and B. The plane zooms out to ±10 so R always fits.
 * - tiltedAxes: axes x′, y′ turned through α, with A's parts along them.
 * - incline: a slope at α with a block, its weight mg and the two parts
 *   mg sin α down the slope and mg cos α into it (drawn instead of the plane).
 * - path / velocity / chord / acceleration: A as a position vector going
 *   round, v along the tangent, the chord Δr over a finite Δt, and a pointing
 *   to the centre. v and a are drawn to their own scales.
 * These views add a two-line caption under the drawing; numbers appear in it
 * only with the labels layer.
 */

import { drawMarker } from "@ise/graph-engine";
import { cosOf, sinOf } from "@ise/mathematics-engine";
import { TAU, formatAngle, formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import { type Plane, clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { PickResult, RendererOptions, SimulationRenderer } from "../types";

export interface VectorLayout {
  width: number;
  height: number;
  compact: boolean;
  plane: Plane;
  /** Components snap to this grid when dragging (units). */
  snap: number;
  /** The concept's extent: A's head is kept within ±limit. */
  limit: number;
  /** Which way B is drawn, when B is shown. */
  addView: "triangle" | "parallelogram" | null;
  /** Draw the slope scene instead of the plane. */
  incline: boolean;
  /** Baselines of the two caption lines, or null when no caption is drawn. */
  caption: readonly [number, number] | null;
}

const ADD_LAYERS = ["triangle", "parallelogram"];
const CAPTIONED = [...ADD_LAYERS, "tiltedAxes", "incline", "path", "velocity", "chord", "acceleration"];
/** Display scales of v (units per m/s) and a (units per m/s²), and the longest arrow drawn (units). */
const V_SCALE = 0.5;
const A_SCALE = 0.25;
const MAX_ARROW = 5;

export function computeVectorLayout(
  width: number,
  _graphs: unknown = [],
  layers: ReadonlySet<string> = new Set(),
  options: RendererOptions = {},
): VectorLayout {
  const compact = width < 560;
  const limit = typeof options.extent === "number" ? options.extent : 6;
  const snap = typeof options.snap === "number" ? options.snap : 0.1;
  const addView = layers.has("triangle") ? "triangle" : layers.has("parallelogram") ? "parallelogram" : null;
  // A (up to 6) plus B (up to 4) reaches 10.
  const extent = addView ? Math.max(limit, 10) : limit;
  const captioned = CAPTIONED.some((l) => layers.has(l));
  // The captioned views leave room for the end tick labels (−10) on a phone.
  const size = compact ? width - (captioned ? 28 : 8) : clamp(width - 40, 280, captioned ? 520 : 560);
  const rect = { x: (width - size) / 2, y: 10, width: size, height: size };
  const extra = captioned ? 42 : 0;
  return {
    width,
    height: Math.ceil(size + 24 + extra),
    compact,
    plane: createPlane(rect, [-extent, extent], [-extent, extent]),
    snap,
    limit,
    addView,
    incline: layers.has("incline"),
    caption: captioned ? [rect.y + size + 20, rect.y + size + 38] : null,
  };
}

/** A fixed number of decimals, with a true minus sign and never "−0.00". */
const fixed = (v: number, digits = 2) => {
  const text = Math.abs(v).toFixed(digits);
  return `${v < 0 && Number(text) !== 0 ? "−" : ""}${text}`;
};
const degrees = (v: number) => `${fixed(v, Math.abs(v - Math.round(v)) < 0.05 ? 0 : 1)}°`;

/** Where B is drawn from, and where its head lands: from A's head (triangle) or from the origin (parallelogram). */
function bPlacement(layout: VectorLayout, results: Record<string, unknown>) {
  const sign = num(results.operation) === 1 ? -1 : 1;
  const ax = num(results.vx);
  const ay = num(results.vy);
  const bx = sign * num(results.bx);
  const by = sign * num(results.by);
  const [tailX, tailY] = layout.addView === "triangle" ? [ax, ay] : [0, 0];
  return { sign, tail: [tailX, tailY] as const, head: [tailX + bx, tailY + by] as const };
}

/** Scale an arrow to its display length, never longer than MAX_ARROW. */
function capped(x: number, y: number, scale: number): [number, number] {
  const length = Math.hypot(x, y) * scale;
  const k = length > MAX_ARROW ? MAX_ARROW / length : 1;
  return [x * scale * k, y * scale * k];
}

function rightAngle(ctx: CanvasRenderingContext2D, x: number, y: number, ux: number, uy: number, vx: number, vy: number, colour: string, s = 9) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(x + ux * s, y + uy * s);
  ctx.lineTo(x + ux * s + vx * s, y + uy * s + vy * s);
  ctx.lineTo(x + vx * s, y + vy * s);
  ctx.stroke();
  ctx.restore();
}

/** A slope at α with a block on it: mg straight down, mg sin α down the slope, mg cos α into it. */
function drawIncline(ctx: CanvasRenderingContext2D, layout: VectorLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean) {
  const { rect } = layout.plane;
  const alpha = (num(results.tiltDeg) * Math.PI) / 180;
  const c = Math.cos(alpha);
  const s = Math.sin(alpha);
  // The slope: its foot at the bottom left, rising to the right. mg is drawn a
  // fixed length W from the block's centre, so the slope sits high enough for
  // the arrow and its label to stay inside the drawing.
  const side = 30;
  const W = Math.min(100, rect.height * 0.3);
  const left = rect.x + 16;
  const bottom = rect.y + rect.height;
  const run = rect.width - 32;
  let length = Math.min(run / Math.max(c, 0.2), (rect.height - 40) / Math.max(s, 0.2));
  let base = bottom - 20;
  for (let i = 0; i < 4; i++) {
    base = Math.min(bottom - 20, bottom - 30 - W + (length / 2) * s + (side / 2) * c);
    if (base - length * s < rect.y + 8) length = (base - rect.y - 8) / Math.max(s, 1e-6);
  }
  const footX = left;
  const topX = left + length * c;
  const topY = base - length * s;
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.globalAlpha = 0.14;
  ctx.beginPath();
  ctx.moveTo(footX, base);
  ctx.lineTo(topX, base);
  ctx.lineTo(topX, topY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  segment(ctx, footX, base, topX, topY);
  segment(ctx, rect.x, base, rect.x + rect.width, base);
  ctx.restore();
  // α at the foot.
  const arcR = 34;
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(footX, base, arcR, 0, -alpha, true);
  ctx.stroke();
  ctx.restore();
  label(ctx, words ? `α = ${degrees(num(results.tiltDeg))}` : "α", footX + arcR + 8, base - 10, { color: theme.angle, font: theme.fontStrong });

  // The block, halfway up, and its centre.
  const up = [c, -s] as const; // up the slope, canvas coordinates
  const out = [-s, -c] as const; // away from the slope
  const midX = footX + (length / 2) * c;
  const midY = base - (length / 2) * s;
  const cx = midX + out[0] * (side / 2);
  const cy = midY + out[1] * (side / 2);
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const corner = (a: number, b: number) => [midX + up[0] * a + out[0] * b, midY + up[1] * a + out[1] * b] as const;
  const corners = [corner(-side / 2, 0), corner(side / 2, 0), corner(side / 2, side), corner(-side / 2, side)];
  ctx.moveTo(corners[0]![0], corners[0]![1]);
  for (const [x, y] of corners.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // mg drawn a fixed length; its parts in proportion.
  const down = [-c, s] as const; // down the slope
  const into = [s, c] as const; // into the slope
  const [dx, dy] = [cx + down[0] * W * s, cy + down[1] * W * s];
  const [ix, iy] = [cx + into[0] * W * c, cy + into[1] * W * c];
  const wx = cx;
  const wy = cy + W;
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.setLineDash([4, 5]);
  segment(ctx, dx, dy, wx, wy);
  segment(ctx, ix, iy, wx, wy);
  ctx.restore();
  arrow(ctx, cx, cy, dx, dy, { color: theme.cosine, width: 4, head: 11 });
  arrow(ctx, cx, cy, ix, iy, { color: theme.sine, width: 4, head: 11 });
  arrow(ctx, cx, cy, wx, wy, { color: theme.vector, width: 4, head: 13 });
  if (s > 0.05 && c > 0.05) rightAngle(ctx, ix, iy, -into[0], -into[1], down[0], down[1], theme.muted);
  // α again, between mg and the into-slope part.
  if (alpha > 0.05) {
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, Math.PI / 2 - alpha, Math.PI / 2, false);
    ctx.stroke();
    ctx.restore();
  }
  const bg = theme.background;
  const strong = theme.fontStrong;
  const keep = (x: number, chars: number) => clamp(x, 4 + chars * 3.5, layout.width - 4 - chars * 3.5);
  const mg = words ? `mg = ${fixed(num(results.weight), 1)} N` : "mg";
  label(ctx, mg, keep(wx + 8 + mg.length * 3.5, mg.length), wy + 12, { color: theme.vector, font: strong, align: "center", background: bg });
  const sinText = "mg sin α";
  label(ctx, sinText, keep(dx - 6 - sinText.length * 3.5, sinText.length), dy - 12, { color: theme.cosine, font: strong, align: "center", background: bg });
  const cosText = "mg cos α";
  label(ctx, cosText, keep(ix + 8 + cosText.length * 3.5, cosText.length), iy, { color: theme.sine, font: strong, align: "center", background: bg });
}

function caption(ctx: CanvasRenderingContext2D, layout: VectorLayout, theme: LabTheme, lines: readonly (string | null)[]) {
  if (!layout.caption) return;
  lines.forEach((text, i) => {
    if (text) label(ctx, text, layout.width / 2, layout.caption![i]!, { color: theme.text, font: theme.font, align: "center" });
  });
}

const round = (value: number, step: number) => Math.round(value / step) * step;

export const vectorRenderer: SimulationRenderer<VectorLayout> = {
  id: "vector-2d",
  layout: computeVectorLayout,

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight, angleUnit } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.35 : 1);
    const { plane } = layout;
    const words = has("labels");
    ctx.clearRect(0, 0, layout.width, layout.height);

    if (layout.incline) {
      drawIncline(ctx, layout, results, theme, words);
      caption(ctx, layout, theme, [
        words ? `mg = ${fixed(num(results.mass), 1)} × 9.8 = ${fixed(num(results.weight), 1)} N` : "Weight split along and into the slope",
        words ? `mg sin α = ${fixed(num(results.downSlope))} N, mg cos α = ${fixed(num(results.intoSlope))} N` : null,
      ]);
      return;
    }

    const extent = plane.xDomain[1];
    drawPlane(ctx, plane, theme, { gridStep: extent > 6 ? 2 : 1, xLabel: "x", yLabel: "y" });

    const vx = num(results.vx);
    const vy = num(results.vy);
    const r = num(results.magnitude);
    const theta = num(results.thetaNorm);
    const [ox, oy] = plane.toPx(0, 0);
    const [hx, hy] = plane.toPx(vx, vy);
    const [fx, fy] = plane.toPx(vx, 0); // foot of the vertical component
    const bg = theme.background;
    const strong = theme.fontStrong;

    // Unit circle and unit vector r̂ = (cos θ, sin θ).
    if (has("unitCircle")) {
      ctx.save();
      ctx.strokeStyle = theme.neutral;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox, oy, plane.sx, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // ── A second vector B, and R = A + B (or A − B) ──
    if (layout.addView) {
      const { sign, tail, head } = bPlacement(layout, results);
      const [tx, ty] = plane.toPx(tail[0], tail[1]);
      const [bhx, bhy] = plane.toPx(head[0], head[1]);
      const [rx, ry] = plane.toPx(num(results.resX), num(results.resY));
      ctx.save();
      clipToPlane(ctx, plane);
      if (layout.addView === "parallelogram") {
        // The other two sides, dashed: a copy of B from A's head, a copy of A from B's head.
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.setLineDash([5, 5]);
        segment(ctx, hx, hy, rx, ry);
        segment(ctx, bhx, bhy, rx, ry);
        ctx.restore();
      }
      if (sign < 0) {
        // B itself, faint, and −B drawn solid.
        const [ox2, oy2] = plane.toPx(tail[0] + num(results.bx), tail[1] + num(results.by));
        arrow(ctx, tx, ty, ox2, oy2, { color: theme.secant, width: 2, head: 9, alpha: 0.4, dash: [5, 4] });
      }
      arrow(ctx, tx, ty, bhx, bhy, { color: theme.secant, width: 4, head: 13 });
      if (has("resultant") && num(results.resultant) > 0) arrow(ctx, ox, oy, rx, ry, { color: theme.tangent, width: 4.5, head: 14 });
      ctx.restore();
      const bName = sign < 0 ? "−B" : "B";
      label(ctx, bName, (tx + bhx) / 2 + 10, (ty + bhy) / 2 - 10, { color: theme.secant, font: theme.fontStrong, align: "center", background: bg });
      if (has("resultant") && num(results.resultant) > 0) {
        const rName = sign < 0 ? "A − B" : "R";
        label(ctx, rName, clamp((ox + rx) / 2 - 14, 20, layout.width - 30), (oy + ry) / 2 + 12, { color: theme.tangent, font: theme.fontStrong, align: "center", background: bg });
      }
      // B's drag handle.
      ctx.save();
      ctx.fillStyle = theme.secant;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(bhx, bhy, 13, 0, TAU);
      ctx.fill();
      ctx.restore();

      if (has("between") && r > 0 && num(results.bMagnitude) > 0) {
        // φ between A and B, both from the origin.
        const a0 = Math.atan2(vy, vx);
        const b0 = Math.atan2(num(results.by), num(results.bx));
        let delta = b0 - a0;
        while (delta > Math.PI) delta -= TAU;
        while (delta < -Math.PI) delta += TAU;
        const arcR = 22;
        ctx.save();
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ox, oy, arcR, -a0, -(a0 + delta), delta > 0);
        ctx.stroke();
        if (layout.addView === "triangle") {
          // In the triangle B starts at A's head: show its direction from the origin, faint.
          const [gx, gy] = plane.toPx(num(results.bx), num(results.by));
          ctx.globalAlpha = 0.45;
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = theme.secant;
          segment(ctx, ox, oy, ox + ((gx - ox) / Math.max(1, Math.hypot(gx - ox, gy - oy))) * 40, oy + ((gy - oy) / Math.max(1, Math.hypot(gx - ox, gy - oy))) * 40);
        }
        ctx.restore();
        const mid = a0 + delta / 2;
        label(ctx, "φ", ox + Math.cos(mid) * (arcR + 10), oy - Math.sin(mid) * (arcR + 10), { color: theme.angle, font: theme.fontStrong, align: "center" });
      }
      const opText = sign < 0 ? "|A − B| = √(A² + B² − 2AB cos φ)" : "|A + B| = √(A² + B² + 2AB cos φ)";
      caption(ctx, layout, theme, [
        words ? `${opText.split(" = ")[0]} = ${fixed(num(results.resultant))}, φ = ${degrees(num(results.angleBetweenDeg))}` : opText,
        words ? `${sign < 0 ? "A − B" : "R"} is ${degrees(Math.abs(num(results.resultantFromADeg)))} ${num(results.resultantFromADeg) < 0 ? "clockwise" : "anticlockwise"} from A` : null,
      ]);
    }

    // ── Axes turned through α, and A's parts along them ──
    if (has("tiltedAxes")) {
      const alpha = (num(results.tiltDeg) * Math.PI) / 180;
      const ux = Math.cos(alpha);
      const uy = Math.sin(alpha);
      const reach = extent * 1.5;
      ctx.save();
      clipToPlane(ctx, plane);
      ctx.strokeStyle = theme.reference;
      ctx.lineWidth = 1.75;
      const [p1x, p1y] = plane.toPx(-ux * reach, -uy * reach);
      const [p2x, p2y] = plane.toPx(ux * reach, uy * reach);
      segment(ctx, p1x, p1y, p2x, p2y);
      const [q1x, q1y] = plane.toPx(uy * reach, -ux * reach);
      const [q2x, q2y] = plane.toPx(-uy * reach, ux * reach);
      segment(ctx, q1x, q1y, q2x, q2y);
      ctx.restore();
      const edge = extent * 0.88;
      const [lx, ly] = plane.toPx(ux * edge, uy * edge);
      label(ctx, "x′", lx, ly - 12, { color: theme.text, font: theme.fontStrong, align: "center", background: bg });
      const [mx, my] = plane.toPx(-uy * edge, ux * edge);
      label(ctx, "y′", mx + 12, my, { color: theme.text, font: theme.fontStrong, align: "center", background: bg });
      if (alpha > 0.02) {
        ctx.save();
        ctx.strokeStyle = theme.reference;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ox, oy, 58, 0, -alpha, true);
        ctx.stroke();
        ctx.restore();
        label(ctx, "α", ox + Math.cos(alpha / 2) * 70, oy - Math.sin(alpha / 2) * 70, { color: theme.text, font: theme.fontStrong, align: "center" });
      }
      if (r > 0) {
        const along = num(results.alongAxis);
        const across = num(results.acrossAxis);
        const [fx2, fy2] = plane.toPx(ux * along, uy * along);
        arrow(ctx, ox, oy, fx2, fy2, { color: theme.cosine, width: 5, head: 11 });
        arrow(ctx, fx2, fy2, hx, hy, { color: theme.sine, width: 5, head: 11 });
        if (Math.abs(along) > 0.2 && Math.abs(across) > 0.2) {
          const sa = along > 0 ? -1 : 1;
          const sc = across > 0 ? 1 : -1;
          rightAngle(ctx, fx2, fy2, sa * ux, -sa * uy, -sc * uy, -sc * ux, theme.muted);
        }
      }
      caption(ctx, layout, theme, [
        words ? `along x′: r cos(θ − α) = ${fixed(num(results.alongAxis))}` : "Parts of A along the turned axes x′ and y′",
        words ? `along y′: r sin(θ − α) = ${fixed(num(results.acrossAxis))}` : null,
      ]);
    }

    // ── A as a position vector going round: v, Δr and a ──
    if (has("path") && r > 0) {
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(ox, oy, r * plane.sx, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (has("chord") && r > 0) {
      // Where the head is Δt later, and the chord Δr between the two.
      const turn = Math.atan2(num(results.velY), num(results.velX)) - Math.atan2(vy, vx); // ±π/2: the sense of turning
      const sense = Math.sin(turn) >= 0 ? 1 : -1;
      const omega = num(results.speed) / r;
      const later = Math.atan2(vy, vx) + sense * omega * num(results.deltaT);
      const [lx, ly] = plane.toPx(r * Math.cos(later), r * Math.sin(later));
      arrow(ctx, ox, oy, lx, ly, { color: theme.vector, width: 2, head: 10, alpha: 0.55, dash: [6, 4] });
      arrow(ctx, hx, hy, lx, ly, { color: theme.angle, width: 3, head: 10 });
      label(ctx, "Δr", (hx + lx) / 2 + (lx - ox) * 0.08, (hy + ly) / 2 + (ly - oy) * 0.08, { color: theme.angle, font: theme.fontStrong, align: "center", background: bg });
    }
    const rates = has("velocity") || has("acceleration");
    const pr = plane.rect;
    /** Keep a name on the plane even when its arrow runs off it. */
    const onPlane = (x: number, y: number): [number, number] => [clamp(x, pr.x + 10, pr.x + pr.width - 10), clamp(y, pr.y + 10, pr.y + pr.height - 10)];
    if (rates && r > 0) {
      ctx.save();
      clipToPlane(ctx, plane);
      if (has("velocity")) {
        const [dx, dy] = capped(num(results.velX), num(results.velY), V_SCALE);
        const [ex, ey] = plane.toPx(vx + dx, vy + dy);
        arrow(ctx, hx, hy, ex, ey, { color: theme.sine, width: 4, head: 12 });
        const [vlx, vly] = onPlane(ex + (ex - hx) * 0.12 + 6, ey + (ey - hy) * 0.12);
        label(ctx, "v", vlx, vly, { color: theme.sine, font: theme.fontStrong, align: "center", background: bg });
        if (Math.hypot(dx, dy) > 0.3) {
          const lr = Math.hypot(hx - ox, hy - oy);
          const lv = Math.hypot(ex - hx, ey - hy);
          rightAngle(ctx, hx, hy, (ox - hx) / lr, (oy - hy) / lr, (ex - hx) / lv, (ey - hy) / lv, theme.muted);
        }
      }
      if (has("acceleration")) {
        const [dx, dy] = capped(num(results.accX), num(results.accY), A_SCALE);
        const [ex, ey] = plane.toPx(vx + dx, vy + dy);
        arrow(ctx, hx, hy, ex, ey, { color: theme.secant, width: 4, head: 12 });
        const [alx, aly] = onPlane(ex + 10, ey - 10);
        label(ctx, "a", alx, aly, { color: theme.secant, font: theme.fontStrong, align: "center", background: bg });
      }
      ctx.restore();
    }
    if (has("path") || rates || has("chord")) {
      caption(ctx, layout, theme, [
        words
          ? `|v| = rω = ${fixed(num(results.speed))}; |Δr|/Δt = ${fixed(num(results.chordRate))} (Δt = ${fixed(num(results.deltaT))} s)`
          : "v and a are drawn to their own scales",
        words ? `|a| = rω² = ${fixed(num(results.accMagnitude))}, pointing to the centre` : null,
      ]);
    }

    // Projections: the vector's shadows on both axes.
    if (has("projections") && r > 0) {
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([4, 5]);
      segment(ctx, hx, hy, hx, oy);
      segment(ctx, hx, hy, ox, hy);
      ctx.restore();
      const [, py] = plane.toPx(0, vy);
      arrow(ctx, ox, oy, hx, oy, { color: theme.cosine, width: 5, alpha: dim("projections"), head: 11 });
      arrow(ctx, ox, oy, ox, py, { color: theme.sine, width: 5, alpha: dim("projections"), head: 11 });
      if (has("labels")) {
        label(ctx, `vₓ = ${formatNumber(vx, 2)}`, (ox + hx) / 2, oy + (vy >= 0 ? 18 : -18), { color: theme.cosine, font: strong, align: "center", background: bg });
        label(ctx, `v_y = ${formatNumber(vy, 2)}`, ox + (vx >= 0 ? -10 : 10), (oy + py) / 2, { color: theme.sine, font: strong, align: vx >= 0 ? "right" : "left", background: bg });
      }
    }

    // Components as a right triangle: vₓ along the axis, then v_y up to the head.
    if (has("components") && r > 0) {
      arrow(ctx, ox, oy, fx, fy, { color: theme.cosine, width: 5, alpha: dim("components"), head: 11 });
      arrow(ctx, fx, fy, hx, hy, { color: theme.sine, width: 5, alpha: dim("components"), head: 11 });
      if (has("rightAngle") && Math.abs(vx) > 0.2 && Math.abs(vy) > 0.2) {
        const s = 10;
        const dx = vx > 0 ? -s : s;
        const dy = vy > 0 ? -s : s;
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(fx + dx, fy);
        ctx.lineTo(fx + dx, fy + dy);
        ctx.lineTo(fx, fy + dy);
        ctx.stroke();
        ctx.restore();
      }
      if (has("labels")) {
        label(ctx, `vₓ = r cos θ = ${formatNumber(vx, 2)}`, (ox + fx) / 2, oy + (vy >= 0 ? 18 : -18), { color: theme.cosine, font: strong, align: "center", background: bg });
        label(ctx, `v_y = r sin θ = ${formatNumber(vy, 2)}`, fx + (vx >= 0 ? 10 : -10), (fy + hy) / 2, { color: theme.sine, font: strong, align: vx >= 0 ? "left" : "right", background: bg });
      }
    }

    // Angle arc from the positive x-axis.
    if (has("angleArc") && r > 0) {
      const arcR = clamp(Math.min(r * plane.sx * 0.35, 46), 18, 46);
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.globalAlpha = dim("angleArc");
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(ox, oy, arcR, 0, -theta, true);
      ctx.stroke();
      ctx.restore();
      if (has("labels")) {
        const mid = theta / 2;
        label(ctx, `θ = ${formatAngle(theta, angleUnit)}`, ox + cosOf(mid) * (arcR + 26), oy - sinOf(mid) * (arcR + 14), { color: theme.angle, font: strong, align: "center", background: bg });
      }
    }

    // The vector itself.
    if (has("vector") && r > 0) {
      arrow(ctx, ox, oy, hx, hy, { color: theme.vector, width: 4, alpha: dim("vector"), head: 14 });
      if (has("labels")) {
        // Label beside the midpoint, on the side away from the components.
        const nx = -(hy - oy) / Math.max(1, Math.hypot(hx - ox, hy - oy));
        const ny = (hx - ox) / Math.max(1, Math.hypot(hx - ox, hy - oy));
        const side = vx * vy >= 0 ? 1 : -1;
        label(ctx, `r = ${formatNumber(r, 2)}`, (ox + hx) / 2 + nx * 16 * side, (oy + hy) / 2 + ny * 16 * side, { color: theme.vector, font: strong, align: "center", background: bg });
      }
    }

    if (has("unitVector") && r > 0) {
      const [ux, uy] = plane.toPx(num(results.cosTheta), num(results.sinTheta));
      arrow(ctx, ox, oy, ux, uy, { color: theme.angle, width: 3, head: 10 });
      if (has("labels")) label(ctx, "r̂", ux + 8, uy - 8, { color: theme.angle, font: strong });
    }

    // Drag handle at the head (or the origin for the zero vector).
    if (has("handle")) {
      ctx.save();
      ctx.fillStyle = theme.vector;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(hx, hy, 15, 0, TAU);
      ctx.fill();
      ctx.restore();
      drawMarker(ctx, hx, hy, theme.vector, 1, 5);
    }
  },

  /** Anywhere on the plane places the head there (snapped), as vₓ then v_y. */
  pick(layout, x, y, lockedRegion, results): PickResult | null {
    const { plane, snap } = layout;
    if (layout.incline || !plane.contains(x, y, 12)) return null;
    const [px, py] = plane.fromPx(x, y);
    if (layout.addView && results) {
      // Near B's head (or already dragging it): move B so its head follows the pointer.
      const { sign, tail, head } = bPlacement(layout, results);
      const [bhx, bhy] = plane.toPx(head[0], head[1]);
      if (lockedRegion === "b" || (lockedRegion === undefined && Math.hypot(x - bhx, y - bhy) <= 18)) {
        return {
          writes: [
            { variable: "bx", value: round(sign * (px - tail[0]), snap) },
            { variable: "by", value: round(sign * (py - tail[1]), snap) },
          ],
          region: "b",
        };
      }
    }
    const lim = Math.min(Math.abs(plane.xDomain[0]), layout.limit);
    const vx = clamp(round(px, snap), -lim, lim);
    const vy = clamp(round(py, snap), -lim, lim);
    return {
      writes: [
        { variable: "vx", value: vx },
        { variable: "vy", value: vy },
      ],
      region: "plane",
    };
  },
};
