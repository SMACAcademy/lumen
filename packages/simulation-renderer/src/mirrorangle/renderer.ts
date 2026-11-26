/**
 * Reflections and images, class 8, seen from above or from the side.
 *
 * Surface: seven parallel rays land on a surface. Smooth, it is one flat
 * line and the reflected rays stay parallel; rough, it is a row of small
 * tilted bits and the rays leave in different directions. The middle ray's
 * bit has its own normal drawn, with i and r measured from it.
 *
 * Mirrors at an angle: two mirrors meet at a corner, a letter F stands
 * halfway between them, and every image the model traces is drawn where it
 * lands — flipped and turned exactly as the reflections that made it, so an
 * image from one reflection reads backwards and one from two reads right.
 *
 * Kaleidoscope: three mirrors at 60° round some beads; the beads' triangle
 * is reflected again and again across its sides, so the pattern repeats.
 *
 * Periscope: a tube with a mirror at each end. A level ray from beyond a
 * wall turns down the tube at the top mirror and level again at the bottom
 * one, into your eye — or, with the mirrors tilted, into the tube's side.
 */

import {
  MIRROR_SCENE_ORDER,
  MIRROR_WATCHED_RAY,
  PERISCOPE_MAX_HEIGHT,
  PERISCOPE_WIDTH,
  type MirrorImage,
  mirrorFacetTilts,
  traceMirrorImages,
} from "@ise/physics-engine";
import type { Rect } from "@ise/graph-engine";
import { formatNumber } from "@ise/units";
import { arrow, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface MirrorAngleLayout {
  width: number;
  height: number;
  compact: boolean;
  scene: Rect;
  /** Baselines of the two caption lines under the drawing. */
  caption: [number, number];
}

export function computeMirrorAngleLayout(width: number): MirrorAngleLayout {
  const compact = width < 560;
  const pad = compact ? 10 : 24;
  const scene = { x: pad, y: 12, width: width - 2 * pad, height: compact ? 290 : 320 };
  const below = scene.y + scene.height;
  return { width, height: below + 44, compact, scene, caption: [below + 14, below + 32] };
}

const DEG = Math.PI / 180;

type Point = { x: number; y: number };
/** A 2 × 2 matrix [a b; c d] acting on (x, y) with y up. */
type Matrix = [number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1];
/** Reflection in a line through the corner at `beta` degrees (y up). */
const reflectIn = (beta: number): Matrix => {
  const c = Math.cos(2 * beta * DEG);
  const s = Math.sin(2 * beta * DEG);
  return [c, s, s, -c];
};
const times = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
];
const apply = (m: Matrix, p: Point): Point => ({ x: m[0] * p.x + m[1] * p.y, y: m[2] * p.x + m[3] * p.y });

/**
 * Mirrors at angle θ drawn with the corner at the origin and the gap
 * opening upwards: the first mirror at 90° − θ/2, the second at 90° + θ/2.
 * Returns each traced image's flip-and-turn, applied to the object at 90°.
 */
export function mirrorImageMaps(theta: number): { image: MirrorImage; map: Matrix }[] {
  const beta = { 1: 90 - theta / 2, 2: 90 + theta / 2 } as const;
  return traceMirrorImages(theta).map((image) => ({
    image,
    map: image.sequence.reduce<Matrix>((m, mirror) => times(reflectIn(beta[mirror]), m), IDENTITY),
  }));
}

/** The letter F, centred on the origin, y up — it reads differently when flipped, so it shows lateral inversion. */
const LETTER_F: readonly (readonly Point[])[] = [
  [
    { x: -0.35, y: -1 },
    { x: -0.35, y: 1 },
    { x: 0.5, y: 1 },
  ],
  [
    { x: -0.35, y: 0.1 },
    { x: 0.3, y: 0.1 },
  ],
];

/** How far (px) from (x, y) along (dx, dy) before leaving the rectangle shrunk by `inset`. */
function toEdge(rect: Rect, x: number, y: number, dx: number, dy: number, inset = 4): number {
  const lo = { x: rect.x + inset, y: rect.y + inset };
  const hi = { x: rect.x + rect.width - inset, y: rect.y + rect.height - inset };
  let s = Infinity;
  if (dx > 1e-9) s = Math.min(s, (hi.x - x) / dx);
  if (dx < -1e-9) s = Math.min(s, (lo.x - x) / dx);
  if (dy > 1e-9) s = Math.min(s, (hi.y - y) / dy);
  if (dy < -1e-9) s = Math.min(s, (lo.y - y) / dy);
  return Math.max(0, s);
}

/** Equilateral triangles tiling outwards from one, each with the map that carries the first onto it. */
export function kaleidoscopeTiles(center: Point, side: number, radius: number, limit = 90): { corners: Point[]; map: Matrix; shift: Point }[] {
  const h = (side * Math.sqrt(3)) / 2;
  const first = [
    { x: center.x, y: center.y + (2 * h) / 3 },
    { x: center.x - side / 2, y: center.y - h / 3 },
    { x: center.x + side / 2, y: center.y - h / 3 },
  ];
  type Tile = { corners: Point[]; map: Matrix; shift: Point };
  const tiles: Tile[] = [{ corners: first, map: IDENTITY, shift: { x: 0, y: 0 } }];
  const key = (ps: Point[]) => {
    const c = { x: (ps[0]!.x + ps[1]!.x + ps[2]!.x) / 3, y: (ps[0]!.y + ps[1]!.y + ps[2]!.y) / 3 };
    return `${Math.round(c.x * 10)},${Math.round(c.y * 10)}`;
  };
  const seen = new Set([key(first)]);
  for (let i = 0; i < tiles.length && tiles.length < limit; i++) {
    const tile = tiles[i]!;
    for (let e = 0; e < 3; e++) {
      const p = tile.corners[e]!;
      const q = tile.corners[(e + 1) % 3]!;
      const beta = Math.atan2(q.y - p.y, q.x - p.x) / DEG;
      const r = reflectIn(beta);
      // Reflect X in the line through p: p + R(X − p).
      const across = (x: Point) => {
        const d = apply(r, { x: x.x - p.x, y: x.y - p.y });
        return { x: p.x + d.x, y: p.y + d.y };
      };
      const corners = tile.corners.map(across);
      const k = key(corners);
      if (seen.has(k)) continue;
      const far = Math.max(...corners.map((c) => Math.hypot(c.x - center.x, c.y - center.y)));
      if (far > radius) continue;
      seen.add(k);
      // New map: X ↦ across(tile.map·X + tile.shift).
      const map = times(r, tile.map);
      const moved = across(tile.shift);
      tiles.push({ corners, map, shift: moved });
    }
  }
  return tiles;
}

export const mirrorAngleRenderer: SimulationRenderer<MirrorAngleLayout> = {
  id: "mirrorangle",
  layout: (width) => computeMirrorAngleLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const scene = MIRROR_SCENE_ORDER[Math.round(num(results.scene))] ?? "surface";
    const has = (layer: string) => layers.has(layer);
    const draw = { ctx, layout, theme, has, results };
    if (scene === "angle") drawAngle(draw);
    else if (scene === "kaleidoscope") drawKaleidoscope(draw);
    else if (scene === "periscope") drawPeriscope(draw);
    else drawSurface(draw);
  },
};

interface Draw {
  ctx: CanvasRenderingContext2D;
  layout: MirrorAngleLayout;
  theme: LabTheme;
  has: (layer: string) => boolean;
  results: Record<string, unknown>;
}

const caption = ({ ctx, layout, theme }: Draw, line: 0 | 1, text: string, strong = line === 0) =>
  label(ctx, text, layout.width / 2, layout.caption[line], { color: strong ? theme.text : theme.muted, font: strong ? theme.fontStrong : theme.font, align: "center" });

const deg = (v: unknown) => `${formatNumber(num(v), 0)}°`;

function drawSurface(d: Draw): void {
  const { ctx, layout, theme, has, results } = d;
  const { scene } = layout;
  const incidence = num(results.incidence, 30);
  const roughness = num(results.roughness);
  const tilts = mirrorFacetTilts(roughness);
  const cx = scene.x + scene.width / 2;
  const sy = scene.y + scene.height - 40;
  const span = Math.min(scene.width * 0.6, 260);
  const step = span / (tilts.length - 1);
  const half = step / 2;
  const xs = tilts.map((_, k) => cx - span / 2 + k * step);

  if (has("scene")) {
    // The surface: one flat line when smooth, a row of tilted bits when rough.
    const outline: Point[] = [];
    tilts.forEach((t, k) => {
      const c = Math.cos(t * DEG);
      const s = Math.sin(t * DEG);
      outline.push({ x: xs[k]! - half * c, y: sy - half * s }, { x: xs[k]! + half * c, y: sy + half * s });
    });
    ctx.save();
    ctx.fillStyle = theme.neutral;
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.moveTo(outline[0]!.x, sy + 26);
    for (const p of outline) ctx.lineTo(p.x, p.y);
    ctx.lineTo(outline[outline.length - 1]!.x, sy + 26);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.sine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.restore();
  }

  if (has("rays")) {
    tilts.forEach((t, k) => {
      const x = xs[k]!;
      const watched = k === MIRROR_WATCHED_RAY;
      const color = watched ? theme.tangent : theme.angle;
      // In from the upper left at angle i to the vertical.
      const inDir = { x: -Math.sin(incidence * DEG), y: -Math.cos(incidence * DEG) };
      const back = Math.min(sy - scene.y - 10, toEdge(scene, x, sy, inDir.x, inDir.y));
      arrow(ctx, x + inDir.x * back, sy + inDir.y * back, x, sy, { color, width: watched ? 2.25 : 1.5, head: 8, alpha: 0.9 });
      // Out at i + 2t from the vertical, mirrored about the bit's own normal.
      const out = (incidence + 2 * t) * DEG;
      const outDir = { x: Math.sin(out), y: -Math.cos(out) };
      const reach = Math.min(sy - scene.y - 10, toEdge(scene, x, sy, outDir.x, outDir.y));
      arrow(ctx, x, sy, x + outDir.x * reach, sy + outDir.y * reach, { color, width: watched ? 2.25 : 1.5, head: 8, alpha: 0.9 });
      if (watched) {
        // The normal to this bit of surface.
        const n = { x: Math.sin(t * DEG), y: -Math.cos(t * DEG) };
        ctx.save();
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        segment(ctx, x, sy, x + n.x * 70, sy + n.y * 70);
        ctx.restore();
      }
    });
  }

  if (has("labels")) {
    const rough = num(results.diffuse) === 1;
    label(ctx, rough ? "rough surface" : "smooth surface", scene.x + 4, sy + 16, { color: theme.muted, font: theme.font });
    caption(d, 0, rough ? `Diffuse reflection: rays spread over ${deg(results.spread)}` : "Regular reflection: rays stay parallel");
    caption(d, 1, `Marked bit: i = ${deg(results.facetIn)}, r = ${deg(results.facetOut)} from its normal`, false);
  }
}

function drawAngle(d: Draw): void {
  const { ctx, layout, theme, has, results } = d;
  const { scene } = layout;
  const theta = num(results.mirrorAngle, 90);
  const cx = scene.x + scene.width / 2;
  const cy = scene.y + scene.height / 2;
  const R = Math.min(scene.width, scene.height) / 2 - 14;
  const rObject = R * 0.55;
  const rEye = R * 0.9;
  const glyph = 10;
  const screen = (p: Point): Point => ({ x: cx + p.x, y: cy - p.y });
  const along = (beta: number, r: number): Point => ({ x: r * Math.cos(beta * DEG), y: r * Math.sin(beta * DEG) });
  const betas = [90 - theta / 2, 90 + theta / 2];
  const object: Point = { x: 0, y: rObject };
  const maps = mirrorImageMaps(theta);

  const letter = (map: Matrix, at: Point, color: string, alpha: number) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of LETTER_F) {
      ctx.beginPath();
      stroke.forEach((q, i) => {
        const turned = apply(map, { x: q.x * glyph, y: q.y * glyph });
        const p = screen({ x: at.x + turned.x, y: at.y + turned.y });
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }
    ctx.restore();
  };

  if (has("rays")) {
    // Behind both mirrors: their lines carried on through the corner. No image there is reflected again.
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    for (const b of betas) {
      const far = screen(along(b + 180, R));
      segment(ctx, cx, cy, far.x, far.y);
    }
    ctx.restore();
  }

  if (has("scene")) {
    // The two mirrors, shiny side in, with hatching on their backs.
    ctx.save();
    betas.forEach((b, i) => {
      const end = screen(along(b, R));
      ctx.strokeStyle = theme.sine;
      ctx.lineWidth = 4;
      segment(ctx, cx, cy, end.x, end.y);
      const back = i === 0 ? b - 90 : b + 90;
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1;
      for (let r = 12; r < R; r += 12) {
        const p = screen(along(b, r));
        const q = screen({ x: along(b, r).x + along(back, 6).x, y: along(b, r).y + along(back, 6).y });
        segment(ctx, p.x, p.y, q.x, q.y);
      }
    });
    ctx.restore();
    for (const { image, map } of maps) {
      letter(map, apply(map, object), image.reflections % 2 === 1 ? theme.cosine : theme.sine, 0.6);
    }
    letter(IDENTITY, object, theme.tangent, 1);
  }

  if (has("rays")) {
    // How you see an image in one mirror: light from F bounces at P into your eye, and seems to come from the image.
    const eye = { x: 0, y: rEye };
    for (const { image, map } of maps) {
      if (image.reflections !== 1) continue;
      const img = apply(map, object);
      const u = along(betas[image.sequence[0]! - 1]!, 1);
      // Solve eye + s(img − eye) = t·u.
      const dx = img.x - eye.x;
      const dy = img.y - eye.y;
      const det = dx * -u.y - dy * -u.x;
      if (Math.abs(det) < 1e-9) continue;
      const s = (-eye.x * -u.y - -eye.y * -u.x) / det;
      const t = (dx * -eye.y - dy * -eye.x) / det;
      if (s <= 0 || s >= 1 || t < 0 || t > R) continue;
      const P = screen({ x: t * u.x, y: t * u.y });
      const O = screen(object);
      const E = screen(eye);
      const I = screen(img);
      arrow(ctx, O.x, O.y, P.x, P.y, { color: theme.angle, width: 1.5, head: 8 });
      arrow(ctx, P.x, P.y, E.x, E.y, { color: theme.angle, width: 1.5, head: 8 });
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      segment(ctx, P.x, P.y, I.x, I.y);
      ctx.restore();
    }
    // The eye.
    const E = screen(eye);
    ctx.save();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(E.x, E.y, 9, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = theme.text;
    ctx.beginPath();
    ctx.arc(E.x, E.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (has("labels")) {
    const n = Math.round(num(results.images));
    const whole = num(results.wholeFit) === 1;
    label(ctx, `mirrors at ${deg(theta)}`, scene.x + 2, scene.y + 8, { color: theme.text, font: theme.fontStrong, background: theme.background });
    caption(d, 0, whole ? `${n} images: 360° ÷ ${deg(theta)} − 1 = ${n}` : `${n} images (360° ÷ ${deg(theta)} is not whole)`);
    caption(d, 1, `${Math.round(num(results.reversedImages))} reversed, ${Math.round(num(results.uprightImages))} the right way round`, false);
  }
}

/** Where the three beads sit inside the first triangle, as the kaleidoscope turns. */
export function beadSpots(turn: number): { a: number; b: number; c: number }[] {
  return [0, 1, 2].map((j) => {
    const w = [0, 1, 2].map((k) => 1.2 + Math.sin(turn * (1 + 0.3 * j) + (2 * Math.PI * (k + j)) / 3 + j));
    const sum = w[0]! + w[1]! + w[2]!;
    return { a: w[0]! / sum, b: w[1]! / sum, c: w[2]! / sum };
  });
}

function drawKaleidoscope(d: Draw): void {
  const { ctx, layout, theme, has, results } = d;
  const { scene } = layout;
  const center = { x: scene.x + scene.width / 2, y: scene.y + scene.height / 2 };
  const radius = Math.min(scene.width, scene.height) / 2 - 6;
  const side = radius * 0.62;
  const tiles = kaleidoscopeTiles(center, side, radius);
  const first = tiles[0]!.corners;
  const beads = beadSpots(num(results.turn)).map((w) => ({
    x: w.a * first[0]!.x + w.b * first[1]!.x + w.c * first[2]!.x,
    y: w.a * first[0]!.y + w.b * first[1]!.y + w.c * first[2]!.y,
  }));
  const colors = [theme.cosine, theme.tangent, theme.angle];

  if (has("scene")) {
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    tiles.forEach((tile, i) => {
      ctx.globalAlpha = i === 0 ? 1 : 0.55;
      ctx.strokeStyle = i === 0 ? theme.sine : theme.muted;
      ctx.lineWidth = i === 0 ? 3 : 1;
      ctx.beginPath();
      tile.corners.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
      beads.forEach((b, j) => {
        const p = apply(tile.map, b);
        ctx.fillStyle = colors[j]!;
        ctx.beginPath();
        ctx.arc(p.x + tile.shift.x, p.y + tile.shift.y, 4 + j, 0, Math.PI * 2);
        ctx.fill();
      });
    });
    ctx.restore();
  }

  if (has("labels")) {
    caption(d, 0, `Three mirrors at 60°: ${Math.round(num(results.kaleidoImages))} images round each corner`);
    caption(d, 1, "Press play to turn it", false);
  }
}

function drawPeriscope(d: Draw): void {
  const { ctx, layout, theme, has, results } = d;
  const { scene } = layout;
  const H = num(results.tubeHeight, 50);
  const alpha = num(results.tilt, 45);
  const k = (scene.height - 50) / PERISCOPE_MAX_HEIGHT;
  const halfW = (PERISCOPE_WIDTH / 2) * k;
  const tx = scene.x + scene.width * 0.66;
  const by = scene.y + scene.height - 24;
  const ty = by - H * k;
  const sees = num(results.sees) === 1;
  const landX = tx + num(results.landing) * k;
  const landY = by - num(results.landY) * k;
  const eyeX = scene.x + scene.width - 14;
  const wallX = scene.x + scene.width * 0.3;
  const wallTop = by - 16 * k;
  const objectX = scene.x + 14;

  if (has("scene")) {
    ctx.save();
    // The ground and a wall too high to see over.
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1;
    segment(ctx, scene.x, by + halfW + 2, scene.x + scene.width, by + halfW + 2);
    ctx.fillStyle = theme.secant;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(wallX - 8, wallTop, 16, by + halfW + 2 - wallTop);
    ctx.globalAlpha = 1;
    // What is over the wall: a flag at the height of the top mirror.
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    segment(ctx, objectX, ty + 12, objectX, by + halfW + 2);
    ctx.fillStyle = theme.tangent;
    ctx.beginPath();
    ctx.moveTo(objectX, ty - 6);
    ctx.lineTo(objectX + 14, ty);
    ctx.lineTo(objectX, ty + 6);
    ctx.closePath();
    ctx.fill();
    // The tube, open on the left at the top and on the right at the bottom.
    ctx.strokeStyle = theme.neutral;
    ctx.lineWidth = 2;
    const top = ty - halfW - 4;
    const bottom = by + halfW + 2;
    segment(ctx, tx - halfW, top, tx + halfW, top);
    segment(ctx, tx - halfW, bottom, tx + halfW, bottom);
    segment(ctx, tx - halfW, ty + halfW, tx - halfW, bottom);
    segment(ctx, tx + halfW, top, tx + halfW, by - halfW);
    // The two mirrors, both tilted α from the horizontal, sloping down to the right.
    const L = halfW / Math.cos(alpha * DEG);
    const dx = L * Math.cos(alpha * DEG);
    const dy = L * Math.sin(alpha * DEG);
    ctx.strokeStyle = theme.sine;
    ctx.lineWidth = 4;
    segment(ctx, tx - dx, ty - dy, tx + dx, ty + dy);
    segment(ctx, tx - dx, by - dy, tx + dx, by + dy);
    ctx.restore();
  }

  if (has("rays")) {
    const color = theme.angle;
    arrow(ctx, objectX + 16, ty, tx, ty, { color, width: 1.75, head: 8 });
    const dir = { x: Math.cos(2 * alpha * DEG), y: Math.sin(2 * alpha * DEG) };
    if (sees) {
      arrow(ctx, tx, ty, landX, landY, { color, width: 1.75, head: 8 });
      arrow(ctx, landX, landY, eyeX - 10, landY, { color, width: 1.75, head: 8 });
    } else {
      // It runs into the side of the tube before it reaches the bottom mirror.
      const s = Math.abs(dir.x) > 1e-9 ? halfW / Math.abs(dir.x) : 0;
      const hit = { x: tx + dir.x * s, y: ty + dir.y * s };
      arrow(ctx, tx, ty, hit.x, hit.y, { color, width: 1.75, head: 8 });
      ctx.save();
      ctx.strokeStyle = theme.cosine;
      ctx.lineWidth = 2;
      segment(ctx, hit.x - 5, hit.y - 5, hit.x + 5, hit.y + 5);
      segment(ctx, hit.x - 5, hit.y + 5, hit.x + 5, hit.y - 5);
      ctx.restore();
    }
    // The eye at the bottom opening.
    const ey = sees ? landY : by;
    ctx.save();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(eyeX, ey, 9, 5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = theme.text;
    ctx.beginPath();
    ctx.arc(eyeX - 4, ey, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (has("labels")) {
    label(ctx, `mirrors at ${deg(alpha)}`, tx - halfW - 6, ty + halfW + 14, { color: theme.text, font: theme.font, align: "right", background: theme.background });
    label(ctx, `turns ${deg(results.turnAngle)}`, tx + halfW + 6, ty - 10, { color: theme.text, font: theme.font, background: theme.background });
    label(ctx, "wall", wallX, wallTop - 10, { color: theme.muted, font: theme.font, align: "center" });
    caption(d, 0, sees ? `You see over the wall, ${formatNumber(num(results.lift), 0)} cm higher` : "The light hits the side of the tube");
    caption(d, 1, `Tube ${formatNumber(H, 0)} cm tall · each mirror at ${deg(alpha)}`, false);
  }
}
