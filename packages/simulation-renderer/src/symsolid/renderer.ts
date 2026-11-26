/**
 * Symmetry, polygons and solid shapes, one picture at a time.
 *
 * Mirror: the shape, a dashed mirror line through its centre, and the
 * shape's reflection in that line drawn over it — when the reflection sits
 * exactly on the shape, the line is a line of symmetry.
 *
 * Turn: a tracing of the shape where it started, and the shape turned about
 * its centre, with one corner marked so the turn can be followed.
 *
 * Polygon: a polygon cut into triangles by the diagonals from corner A, and
 * (on its own layer) the exterior angle at each corner.
 *
 * Solid: the solid in a fixed slanted (cabinet) projection — the front face
 * true to shape, depth drawn up and to the right at half size — with hidden
 * edges dashed; on the views layer, its top, front and side views below.
 *
 * Net: six squares folding up about their shared edges, in the same
 * projection.
 *
 * Counts, angle sizes and the verdicts that state them are drawn only with
 * the words layer on, so a level's estimate can hide them.
 */

import {
  SYMSOLID_BASE_NAMES,
  SYMSOLID_ENDLESS,
  SYMSOLID_NET_ORDER,
  SYMSOLID_NETS,
  SYMSOLID_POLYGON_NAMES,
  SYMSOLID_SHAPE_ORDER,
  SYMSOLID_SHAPES,
  SYMSOLID_SOLID_HEIGHT,
  SYMSOLID_BASE_RADIUS,
  SYMSOLID_SOLID_LABELS,
  SYMSOLID_SOLID_ORDER,
  SYMSOLID_SYMMETRY,
  SYMSOLID_VIEW_LABELS,
  symSolidFoldNet,
  symSolidMesh,
  symSolidPolygon,
  symSolidReflect,
  symSolidRotate,
  type SymShape,
  type SymSolidId,
} from "@ise/mathematics-engine";
import { label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { PickResult, SimulationRenderer } from "../types";

export type SymSolidView = "mirror" | "turn" | "polygon" | "solid" | "net";
const VIEWS: readonly SymSolidView[] = ["mirror", "turn", "polygon", "solid", "net"];

type Box = { x: number; y: number; width: number; height: number };
type P2 = readonly [number, number];
type P3 = readonly [number, number, number];

export interface SymSolidLayout {
  width: number;
  height: number;
  compact: boolean;
  view: SymSolidView;
  /** Centre of the flat shapes, and pixels per unit of the shape. */
  centre: P2;
  scale: number;
  /** Where the solid or the net goes: the whole figure, or the top part when the views are shown. */
  figure: Box;
  solidWithViews: Box;
  /** The top, front and side view boxes. */
  views: readonly [Box, Box, Box];
  /** Baselines of the title and the two caption lines. */
  title: number;
  lines: readonly [number, number];
}

export function symSolidView(layers: ReadonlySet<string>): SymSolidView {
  return VIEWS.find((v) => layers.has(v)) ?? "mirror";
}

/** The flat shapes reach at most this far from their centre (the foot of the T), in shape units. */
const REACH = 1.45;

export function computeSymSolidLayout(width: number, layers: ReadonlySet<string> = new Set()): SymSolidLayout {
  const compact = width < 560;
  const height = compact ? 380 : 420;
  const lines = [height - 32, height - 13] as const;
  const top = 30;
  const bottom = lines[0] - 16;
  const figure: Box = { x: 16, y: top, width: width - 32, height: bottom - top };
  const scale = Math.min((width - 40) / 2 / REACH, figure.height / 2 / REACH);
  const viewHeight = compact ? 92 : 110;
  const viewTop = bottom - viewHeight;
  const gapX = 10;
  const viewWidth = Math.min(150, (width - 32 - 2 * gapX) / 3);
  const left = width / 2 - (3 * viewWidth + 2 * gapX) / 2;
  const views = [0, 1, 2].map((i) => ({ x: left + i * (viewWidth + gapX), y: viewTop + 16, width: viewWidth, height: viewHeight - 16 })) as unknown as readonly [Box, Box, Box];
  return {
    width,
    height,
    compact,
    view: symSolidView(layers),
    centre: [width / 2, top + figure.height / 2],
    scale,
    figure,
    solidWithViews: { x: 16, y: top, width: width - 32, height: viewTop - top - 8 },
    views,
    title: 14,
    lines,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEG = Math.PI / 180;
/** A number as words show it: whole when it is whole, else one decimal. */
const deg = (v: number) => {
  const r = Math.round(v * 10) / 10;
  return `${Number.isInteger(r) ? r.toFixed(0) : r.toFixed(1)}°`;
};
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function path(ctx: CanvasRenderingContext2D, points: readonly P2[], close: boolean) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (close) ctx.closePath();
}

function line(ctx: CanvasRenderingContext2D, a: P2, b: P2, colour: string, width = 2, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.restore();
}

function disc(ctx: CanvasRenderingContext2D, p: P2, r: number, fill: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

interface ShapeStyle {
  stroke: string;
  fill?: string;
  width: number;
  dash?: number[];
  alpha?: number;
}

/** Draw a flat shape, each of its points first moved by `map` (shape units) and then put on the canvas by `toPx`. */
function drawShape(ctx: CanvasRenderingContext2D, shape: SymShape, map: (p: P2) => P2, toPx: (p: P2) => P2, radius: number, style: ShapeStyle) {
  ctx.save();
  ctx.globalAlpha = style.alpha ?? 1;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (style.dash) ctx.setLineDash(style.dash);
  if (shape.kind === "circle") {
    const c = toPx(map([0, 0]));
    ctx.beginPath();
    ctx.arc(c[0], c[1], radius, 0, Math.PI * 2);
    if (style.fill) {
      ctx.fillStyle = style.fill;
      ctx.globalAlpha = (style.alpha ?? 1) * 0.25;
      ctx.fill();
      ctx.globalAlpha = style.alpha ?? 1;
    }
    ctx.stroke();
  } else if (shape.kind === "outline") {
    path(ctx, shape.points.map((p) => toPx(map(p))), true);
    if (style.fill) {
      ctx.fillStyle = style.fill;
      ctx.globalAlpha = (style.alpha ?? 1) * 0.25;
      ctx.fill();
      ctx.globalAlpha = style.alpha ?? 1;
    }
    ctx.stroke();
  } else {
    for (const [a, b] of shape.segments) {
      const pa = toPx(map(a));
      const pb = toPx(map(b));
      ctx.beginPath();
      ctx.moveTo(pa[0], pa[1]);
      ctx.lineTo(pb[0], pb[1]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The corner (or stroke end, or rim point) that is marked so a turn can be followed. */
function markedPoint(shape: SymShape): P2 {
  if (shape.kind === "outline") return shape.points[0]!;
  if (shape.kind === "strokes") return shape.segments[0]![0];
  return [1, 0];
}

const linesWords = (lines: number) => (lines === SYMSOLID_ENDLESS ? "endless lines" : lines === 0 ? "no line" : lines === 1 ? "1 line" : `${lines} lines`);

// ── Mirror and turn ──────────────────────────────────────────────────────────

function flatFrame(layout: SymSolidLayout, centre: P2) {
  const [cx, cy] = layout.centre;
  const s = layout.scale;
  return (p: P2): P2 => [cx + (p[0] - centre[0]) * s, cy - (p[1] - centre[1]) * s];
}

function drawMirror(ctx: CanvasRenderingContext2D, layout: SymSolidLayout, results: Record<string, unknown>, words: boolean, theme: LabTheme): [string, string] {
  const id = SYMSOLID_SHAPE_ORDER[Math.round(num(results.shape))] ?? "rectangle";
  const shape = SYMSOLID_SHAPES[id];
  const sym = SYMSOLID_SYMMETRY[id];
  const toPx = flatFrame(layout, sym.centre);
  const s = layout.scale;
  const mirror = num(results.mirror, 90);
  const folds = num(results.folds) === 1;
  const thick = shape.kind === "strokes" ? Math.max(6, s * 0.13) : 3;
  label(ctx, shape.label, layout.width / 2, layout.title, { color: theme.text, font: theme.fontStrong, align: "center" });

  drawShape(ctx, shape, (p) => p, toPx, s, { stroke: theme.sine, fill: theme.sine, width: thick });
  // The shape folded over the mirror: where each half lands.
  drawShape(ctx, shape, (p) => symSolidReflect(p, sym.centre, mirror), toPx, s, { stroke: folds ? theme.tangent : theme.cosine, width: 2.5, dash: [7, 5] });

  const [cx, cy] = layout.centre;
  const half = REACH * s;
  const ux = Math.cos(mirror * DEG) * half;
  const uy = -Math.sin(mirror * DEG) * half;
  line(ctx, [cx - ux, cy - uy], [cx + ux, cy + uy], theme.angle, 2.5, [9, 6]);
  disc(ctx, [cx + ux, cy + uy], 5, theme.angle);
  disc(ctx, [cx - ux, cy - uy], 5, theme.angle);
  if (!words) return ["", ""];
  return [`mirror at ${deg(mirror)} · ${folds ? "it folds onto itself" : "the two halves do not match"}`, `${shape.label}: ${linesWords(sym.lines)} of symmetry`];
}

function drawTurn(ctx: CanvasRenderingContext2D, layout: SymSolidLayout, results: Record<string, unknown>, words: boolean, theme: LabTheme): [string, string] {
  const id = SYMSOLID_SHAPE_ORDER[Math.round(num(results.shape))] ?? "rectangle";
  const shape = SYMSOLID_SHAPES[id];
  const sym = SYMSOLID_SYMMETRY[id];
  const toPx = flatFrame(layout, sym.centre);
  const s = layout.scale;
  const turn = num(results.turn);
  const fits = num(results.turnFits) === 1;
  const thick = shape.kind === "strokes" ? Math.max(6, s * 0.13) : 3;
  const turned = (p: P2) => symSolidRotate(p, sym.centre, turn);
  label(ctx, shape.label, layout.width / 2, layout.title, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The tracing of where it started.
  drawShape(ctx, shape, (p) => p, toPx, s, { stroke: theme.muted, width: 2, dash: [5, 5] });
  drawShape(ctx, shape, turned, toPx, s, { stroke: fits && turn > 0.5 ? theme.tangent : theme.sine, fill: theme.sine, width: thick, alpha: 0.9 });
  disc(ctx, toPx(turned(markedPoint(shape))), 6, theme.angle);
  disc(ctx, toPx(markedPoint(shape)), 3.5, theme.muted);

  // The turn so far, as an arc about the centre.
  const [cx, cy] = layout.centre;
  disc(ctx, [cx, cy], 3.5, theme.text);
  if (turn > 0.5) {
    ctx.save();
    ctx.strokeStyle = theme.angle;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.22, 0, -Math.min(turn, 359.9) * DEG, true);
    ctx.stroke();
    ctx.restore();
  }
  if (!words) return ["", ""];
  const first = turn < 0.5 ? "turned 0° · not turned yet" : `turned ${deg(turn)} · ${fits ? "it fits!" : "it does not fit"}`;
  if (sym.order === SYMSOLID_ENDLESS) return [first, "a circle fits after any turn at all"];
  const counted = Math.round(num(results.fitsCounted));
  return [first, `fits so far: ${counted} · order of rotational symmetry ${sym.order}`];
}

// ── Polygon ──────────────────────────────────────────────────────────────────

function drawPolygon(ctx: CanvasRenderingContext2D, layout: SymSolidLayout, results: Record<string, unknown>, exterior: boolean, words: boolean, theme: LabTheme): [string, string] {
  const n = Math.round(num(results.sides, 5));
  const pull = num(results.pull);
  const [cx, cy] = layout.centre;
  // Push the drawing down a little so a pulled-out A keeps clear of the title.
  const s = layout.scale * 0.95;
  const oy = cy + 0.12 * s;
  const toPx = (p: P2): P2 => [cx + p[0] * s, oy - p[1] * s];
  const pts = symSolidPolygon(n, pull).map(toPx);
  const name = SYMSOLID_POLYGON_NAMES[n] ?? `${n}-gon`;
  label(ctx, `${capital(name)} · ${n} sides`, layout.width / 2, layout.title, { color: theme.text, font: theme.fontStrong, align: "center" });

  const A = pts[0]!;
  for (let k = 1; k <= n - 2; k++) {
    ctx.save();
    ctx.fillStyle = k % 2 === 1 ? theme.sine : theme.cosine;
    ctx.globalAlpha = 0.2;
    path(ctx, [A, pts[k]!, pts[k + 1]!], true);
    ctx.fill();
    ctx.restore();
  }
  for (let k = 2; k <= n - 2; k++) line(ctx, A, pts[k]!, theme.muted, 1.5, [5, 4]);
  ctx.save();
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  path(ctx, pts, true);
  ctx.stroke();
  ctx.restore();

  if (exterior) {
    // Carry each side on past its corner, and mark the turn to the next side.
    const arm = s * 0.32;
    pts.forEach((p, i) => {
      const prev = pts[(i + n - 1) % n]!;
      const next = pts[(i + 1) % n]!;
      const d = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      const out: P2 = [p[0] + ((p[0] - prev[0]) / d) * arm, p[1] + ((p[1] - prev[1]) / d) * arm];
      line(ctx, p, out, theme.angle, 1.5, [3, 3]);
      const a0 = Math.atan2(out[1] - p[1], out[0] - p[0]);
      const a1 = Math.atan2(next[1] - p[1], next[0] - p[0]);
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      // On the canvas (y down) the polygon runs clockwise, so each turn to the next side is clockwise too.
      ctx.arc(p[0], p[1], 13, a0, a1, false);
      ctx.stroke();
      ctx.restore();
    });
  }

  for (const p of pts) disc(ctx, p, 3, theme.text);
  disc(ctx, A, 5, theme.angle);
  label(ctx, "A", A[0] + 10, A[1] - 6, { color: theme.angle, font: theme.fontStrong });
  if (!words) return ["", ""];

  const angleA = num(results.angleA);
  label(ctx, deg(angleA), A[0], A[1] + 24, { color: theme.angle, font: theme.font, align: "center", background: theme.background });
  const sum = num(results.angleSum);
  const first = `${n - 2} triangles · angle sum ${n - 2} × 180° = ${deg(sum)}`;
  if (exterior) return [first, `each exterior ${deg(num(results.eachExterior))} · all together ${deg(num(results.exteriorSum))}`];
  if (num(results.isRegular) === 1) return [first, `each angle ${deg(num(results.eachInterior))} · each exterior ${deg(num(results.eachExterior))}`];
  return [first, `angle A is now ${deg(angleA)} · the sum is still ${deg(num(results.measuredSum))}`];
}

// ── Solids ───────────────────────────────────────────────────────────────────

/** The slanted projection: depth (y) goes up and to the right at half size. */
const DEPTH = 0.5;
const SLANT = 35 * DEG;
const cabinet = (p: P3): P2 => [p[0] + DEPTH * p[1] * Math.cos(SLANT), p[2] + DEPTH * p[1] * Math.sin(SLANT)];
/** The direction the projection looks along: points this far apart land on the same spot. */
const LOOK: P3 = [-DEPTH * Math.cos(SLANT), 1, -DEPTH * Math.sin(SLANT)];

/** A fit of 2D points into a box: uniform scale, centred, y up. */
function fitter(points: readonly P2[], box: Box, pad = 8) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const k = Math.min((box.width - 2 * pad) / Math.max(x1 - x0, 1e-6), (box.height - 2 * pad) / Math.max(y1 - y0, 1e-6));
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  return { k, to: (p: P2): P2 => [box.x + box.width / 2 + (p[0] - mx) * k, box.y + box.height / 2 - (p[1] - my) * k] };
}

/** Points round a horizontal circle of radius r at height z. */
const ring = (r: number, z: number, count = 48): P3[] =>
  Array.from({ length: count + 1 }, (_, i) => {
    const t = (2 * Math.PI * i) / count;
    return [r * Math.cos(t), r * Math.sin(t), z] as const;
  });

/** Where a cylinder's or cone's sides touch its base ellipse in the slanted picture. */
const SILHOUETTE = Math.atan(DEPTH * Math.cos(SLANT));

function drawSolid(ctx: CanvasRenderingContext2D, box: Box, solid: SymSolidId, n: number, theme: LabTheme) {
  const mesh = symSolidMesh(solid, n);
  if (mesh) {
    const flat = mesh.vertices.map(cabinet);
    const { to } = fitter(flat, box);
    const px = flat.map(to);
    const facing = mesh.normals.map((nv) => nv[0] * LOOK[0] + nv[1] * LOOK[1] + nv[2] * LOOK[2] < -1e-9);
    mesh.faces.forEach((face, i) => {
      if (!facing[i]) return;
      ctx.save();
      ctx.fillStyle = theme.sine;
      ctx.globalAlpha = mesh.normals[i]![2] > 0.5 ? 0.25 : 0.15;
      path(ctx, face.map((v) => px[v]!), true);
      ctx.fill();
      ctx.restore();
    });
    const seen = (a: number, b: number) => mesh.faces.some((face, i) => facing[i] && face.includes(a) && face.includes(b));
    const hidden = mesh.edges.filter(([a, b]) => !seen(a, b));
    const shown = mesh.edges.filter(([a, b]) => seen(a, b));
    for (const [a, b] of hidden) line(ctx, px[a]!, px[b]!, theme.muted, 1.5, [5, 4]);
    for (const [a, b] of shown) line(ctx, px[a]!, px[b]!, theme.text, 2);
    for (const p of px) disc(ctx, p, 3.5, theme.angle);
    return;
  }

  const r = SYMSOLID_BASE_RADIUS;
  const h = SYMSOLID_SOLID_HEIGHT;
  if (solid === "sphere") {
    const { to, k } = fitter([[-r, -r], [r, r]], box);
    const c = to([0, 0]);
    ctx.save();
    ctx.fillStyle = theme.sine;
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(c[0], c[1], r * k, 0, Math.PI * 2);
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    // The equator: its back half dashed.
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(c[0], c[1], r * k, r * k * 0.3, 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = theme.muted;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.ellipse(c[0], c[1], r * k, r * k * 0.3, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const bottom = ring(r, 0).map(cabinet);
  const top = solid === "cylinder" ? ring(r, h).map(cabinet) : [];
  const apex = cabinet([0, 0, h]);
  const { to } = fitter([...bottom, ...top, apex], box);
  const left = to(cabinet([r * Math.cos(SILHOUETTE + Math.PI), r * Math.sin(SILHOUETTE + Math.PI), 0]));
  const right = to(cabinet([r * Math.cos(SILHOUETTE), r * Math.sin(SILHOUETTE), 0]));
  // The base's front half (nearer the viewer, y < 0) is seen; the back half is hidden.
  const half = (front: boolean, z: number) =>
    Array.from({ length: 25 }, (_, i) => {
      const t = SILHOUETTE + Math.PI + (front ? 1 : -1) * ((Math.PI * i) / 24);
      return to(cabinet([r * Math.cos(t), r * Math.sin(t), z]));
    });
  ctx.save();
  ctx.fillStyle = theme.sine;
  ctx.globalAlpha = 0.2;
  if (solid === "cylinder") {
    const lt = to(cabinet([r * Math.cos(SILHOUETTE + Math.PI), r * Math.sin(SILHOUETTE + Math.PI), h]));
    const rt = to(cabinet([r * Math.cos(SILHOUETTE), r * Math.sin(SILHOUETTE), h]));
    path(ctx, [...half(true, 0), rt, ...half(false, h).reverse(), lt], true);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.fillStyle = theme.sine;
    ctx.globalAlpha = 0.25;
    path(ctx, top.map(to), true);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 2;
    path(ctx, top.map(to), true);
    ctx.stroke();
    ctx.restore();
    line(ctx, left, lt, theme.text, 2);
    line(ctx, right, rt, theme.text, 2);
  } else {
    const a = to(apex);
    path(ctx, [...half(true, 0), a], true);
    ctx.fill();
    ctx.restore();
    line(ctx, left, a, theme.text, 2);
    line(ctx, right, a, theme.text, 2);
    disc(ctx, a, 3.5, theme.angle);
  }
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  path(ctx, half(false, 0), false);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 2;
  path(ctx, half(true, 0), false);
  ctx.stroke();
  ctx.restore();
}

/** Orthographic views: from above (front at the bottom), from the front, and from the right (front on the left). */
const VIEW_AXES: readonly { name: string; flat: (p: P3) => P2; look: P3 }[] = [
  { name: "Top", flat: (p) => [p[0], p[1]], look: [0, 0, -1] },
  { name: "Front", flat: (p) => [p[0], p[2]], look: [0, 1, 0] },
  { name: "Side", flat: (p) => [p[1], p[2]], look: [-1, 0, 0] },
];

function drawViews(ctx: CanvasRenderingContext2D, boxes: readonly Box[], solid: SymSolidId, n: number, results: Record<string, unknown>, words: boolean, theme: LabTheme) {
  const mesh = symSolidMesh(solid, n);
  const r = SYMSOLID_BASE_RADIUS;
  const h = SYMSOLID_SOLID_HEIGHT;
  // One scale for all three views, so they match.
  const extent = mesh ? Math.max(...mesh.vertices.flatMap((v) => [Math.abs(v[0]) * 2, Math.abs(v[1]) * 2, v[2]])) : solid === "sphere" ? 2 * r : Math.max(2 * r, h);
  const k = Math.min(...boxes.map((b) => Math.min(b.width, b.height) - 16)) / extent;
  const codes = [results.topView, results.frontView, results.sideView].map((c) => Math.round(num(c)));

  VIEW_AXES.forEach((axis, i) => {
    const box = boxes[i]!;
    ctx.save();
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    ctx.restore();
    label(ctx, axis.name, box.x + box.width / 2, box.y - 8, { color: theme.muted, font: theme.font, align: "center" });
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    if (mesh) {
      const flat = mesh.vertices.map(axis.flat);
      const xs = flat.map((p) => p[0]);
      const ys = flat.map((p) => p[1]);
      const mx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const my = (Math.min(...ys) + Math.max(...ys)) / 2;
      const to = (p: P2): P2 => [cx + (p[0] - mx) * k, cy - (p[1] - my) * k];
      const facing = mesh.normals.map((nv) => nv[0] * axis.look[0] + nv[1] * axis.look[1] + nv[2] * axis.look[2] < -1e-9);
      const seen = (a: number, b: number) => mesh.faces.some((face, j) => facing[j] && face.includes(a) && face.includes(b));
      for (const [a, b] of mesh.edges) if (!seen(a, b)) line(ctx, to(flat[a]!), to(flat[b]!), theme.muted, 1.2, [4, 3]);
      for (const [a, b] of mesh.edges) if (seen(a, b)) line(ctx, to(flat[a]!), to(flat[b]!), theme.text, 1.8);
    } else {
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      if (i === 0 || solid === "sphere") ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
      else if (solid === "cylinder") ctx.rect(cx - r * k, cy - (h * k) / 2, 2 * r * k, h * k);
      else {
        ctx.moveTo(cx - r * k, cy + (h * k) / 2);
        ctx.lineTo(cx + r * k, cy + (h * k) / 2);
        ctx.lineTo(cx, cy - (h * k) / 2);
        ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
      if (i === 0 && solid === "cone") disc(ctx, [cx, cy], 3, theme.text);
    }
    if (words) label(ctx, SYMSOLID_VIEW_LABELS[String(codes[i])] ?? "", cx, box.y + box.height + 9, { color: theme.angle, font: theme.font, align: "center" });
  });
}

function solidTitle(solid: SymSolidId, n: number): string {
  if (solid === "prism" || solid === "pyramid") return `${capital(SYMSOLID_BASE_NAMES[n] ?? "")} ${solid}`;
  return SYMSOLID_SOLID_LABELS[solid];
}

function solidWords(results: Record<string, unknown>): [string, string] {
  const F = Math.round(num(results.faces));
  const E = Math.round(num(results.edges));
  const V = Math.round(num(results.vertices));
  if (num(results.isPolyhedron) === 1) return [`faces ${F} · edges ${E} · vertices ${V}`, `F + V − E = ${F} + ${V} − ${E} = ${Math.round(num(results.eulerSum))}`];
  const C = Math.round(num(results.curved));
  const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  return [
    `${plural(F, "flat face", "flat faces")} · ${C} curved surface · ${plural(E, "edge", "edges")} · ${plural(V, "vertex", "vertices")}`,
    "not a polyhedron: Euler's formula is not for it",
  ];
}

// ── Nets ─────────────────────────────────────────────────────────────────────

function drawNet(ctx: CanvasRenderingContext2D, box: Box, results: Record<string, unknown>, words: boolean, theme: LabTheme): [string, string] {
  const id = SYMSOLID_NET_ORDER[Math.round(num(results.net))] ?? "cross";
  const fold = num(results.fold);
  // Card thumbnails are too narrow for the name; the card carries it.
  if (box.width >= 200) label(ctx, `Net: ${SYMSOLID_NETS[id].label}`, box.x + box.width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });
  // One scale for the whole fold, so the picture does not jump as it folds.
  const every = [0, 0.5, 1].flatMap((f) => symSolidFoldNet(id, f).flatMap((sq) => sq.corners.map(cabinet)));
  const { to } = fitter(every, box, 12);
  const squares = symSolidFoldNet(id, fold)
    .map((sq) => ({ ...sq, depth: sq.corners.reduce((d, p) => d + p[1], 0) / 4 }))
    .sort((a, b) => b.depth - a.depth);
  for (const sq of squares) {
    const pts = sq.corners.map((p) => to(cabinet(p)));
    ctx.save();
    ctx.fillStyle = sq.base ? theme.angle : theme.sine;
    ctx.globalAlpha = 0.35;
    path(ctx, pts, true);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }
  if (!words) return ["", ""];
  const first = fold < 1e-9 ? "flat: press play to fold it up" : `folded ${Math.round(fold * 90)}°`;
  if (fold < 1 - 1e-9) return [first, "fold it right up to see if it closes"];
  const covered = Math.round(num(results.facesCovered));
  return [first, num(results.netFolds) === 1 ? "6 squares on 6 different faces: a closed cube" : `only ${covered} of the 6 faces covered: not a cube`];
}

// ── The renderer ─────────────────────────────────────────────────────────────

export const symSolidRenderer: SimulationRenderer<SymSolidLayout> = {
  id: "symsolid",
  layout: (width, _graphs, layers) => computeSymSolidLayout(width, layers),

  draw(ctx, layout, input) {
    const { theme, layers } = input;
    const results = input.results as Record<string, unknown>;
    const words = layers.has("labels");
    ctx.clearRect(0, 0, layout.width, layout.height);
    let lines: [string, string] = ["", ""];
    switch (symSolidView(layers)) {
      case "mirror":
        lines = drawMirror(ctx, layout, results, words, theme);
        break;
      case "turn":
        lines = drawTurn(ctx, layout, results, words, theme);
        break;
      case "polygon":
        lines = drawPolygon(ctx, layout, results, layers.has("exterior"), words, theme);
        break;
      case "solid": {
        const solid = SYMSOLID_SOLID_ORDER[Math.round(num(results.solid))] ?? "cube";
        const n = Math.round(num(results.baseSides, 4)) || 4;
        const views = layers.has("views");
        label(ctx, solidTitle(solid, n), layout.width / 2, layout.title, { color: theme.text, font: theme.fontStrong, align: "center" });
        drawSolid(ctx, views ? layout.solidWithViews : layout.figure, solid, n, theme);
        if (views) drawViews(ctx, layout.views, solid, n, results, words, theme);
        if (words) lines = views ? ["", ""] : solidWords(results);
        break;
      }
      case "net":
        lines = drawNet(ctx, layout.figure, results, words, theme);
        break;
    }
    lines.forEach((text, i) => {
      if (text) label(ctx, text, layout.width / 2, layout.lines[i]!, { color: i === 0 ? theme.text : theme.muted, font: i === 0 ? theme.fontStrong : theme.font, align: "center" });
    });
  },

  pick(layout, x, y, locked): PickResult | null {
    const [cx, cy] = layout.centre;
    const angle = Math.atan2(-(y - cy), x - cx) / DEG;
    const reach = layout.scale * REACH + 20;
    switch (layout.view) {
      case "mirror": {
        if (locked !== "mirror" && Math.hypot(x - cx, y - cy) > reach) return null;
        const d = Math.round((((angle % 180) + 180) % 180) * 2) / 2;
        return { writes: [{ variable: "mirror", value: d >= 180 ? 0 : d }], region: "mirror" };
      }
      case "turn": {
        if (locked !== "turn" && Math.hypot(x - cx, y - cy) > reach) return null;
        const d = Math.round(((angle % 360) + 360) % 360);
        return { writes: [{ variable: "turn", value: d >= 360 ? 0 : d }], region: "turn" };
      }
      default:
        return null;
    }
  },
};
