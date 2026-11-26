/**
 * Orbitals, two ways.
 *
 * Filling: the subshells as rows of boxes on an energy ladder, lowest at the
 * bottom in the order they fill, with an up or down arrow for each electron —
 * singly first, then paired. The configuration is written across the top.
 *
 * Shapes: one orbital drawn on x, y, z axes (y in perspective). An s orbital
 * is a sphere with rings where its radial nodes are; p is two lobes; d four,
 * or two and a ring for d_z². Lobes are coloured by the sign of the wave
 * (+ and −), and the angular nodes — planes or cones — are dashed.
 */

import { boxesFor, configurationOf, configurationText, legalOrbital, SUBSHELL_ORDER, SYMBOLS } from "@ise/chemistry-engine";
import { label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface OrbitalsLayout {
  width: number;
  height: number;
  compact: boolean;
  box: number;
  rowHeight: number;
}

export function computeOrbitalsLayout(width: number): OrbitalsLayout {
  const compact = width < 560;
  const rowHeight = compact ? 30 : 34;
  return { width, height: 84 + SUBSHELL_ORDER.length * rowHeight + 40, compact, box: compact ? 24 : 28, rowHeight };
}

type Vec = readonly [number, number];
/** Screen directions of the axes: x right, z up, y towards the viewer (drawn down-left, foreshortened). */
const AXES: Record<"x" | "y" | "z", Vec> = { x: [1, 0], z: [0, -1], y: [-0.55, 0.42] };
const add = (a: Vec, b: Vec, s = 1): Vec => [a[0] + b[0] * s, a[1] + b[1] * s];
const norm = (v: Vec) => Math.hypot(v[0], v[1]);

/** The conventional name of an orbital, e.g. "2p_z", "3d_xy". */
export function orbitalName(n: number, l: number, m: number): string {
  if (l === 0) return `${n}s`;
  if (l === 1) return `${n}p${["_y", "_z", "_x"][m + 1]}`;
  if (l === 2) return `${n}d${["_xy", "_yz", "_z²", "_xz", "_x²−y²"][m + 2]}`;
  return `${n}f (m = ${m})`;
}

/** The lobes of an orbital: direction, relative length, and sign of the wave. */
export function lobesOf(l: number, m: number): { dir: Vec; length: number; sign: 1 | -1 }[] {
  const along = (v: Vec, sign: 1 | -1, length = 1) => ({ dir: v, length, sign });
  const between = (a: Vec, b: Vec, sa: 1 | -1, sb: 1 | -1): Vec => add([a[0] * sa, a[1] * sa], b, sb);
  if (l === 1) {
    const axis = [AXES.y, AXES.z, AXES.x][m + 1]!;
    return [along(axis, 1), along([-axis[0], -axis[1]], -1)];
  }
  if (l === 2) {
    if (m === 0) return [along(AXES.z, 1), along([0, 1], 1)];
    const pair: [Vec, Vec] = m === 2 || m === -2 ? [AXES.x, AXES.y] : m === 1 ? [AXES.x, AXES.z] : [AXES.y, AXES.z];
    const [a, b] = pair;
    if (m === 2) return [along(a, 1), along([-a[0], -a[1]], 1), along(b, -1), along([-b[0], -b[1]], -1)];
    return [
      along(between(a, b, 1, 1), 1),
      along(between(a, b, -1, -1), 1),
      along(between(a, b, 1, -1), -1),
      along(between(a, b, -1, 1), -1),
    ];
  }
  if (l === 3) {
    return Array.from({ length: 6 }, (_, i) => {
      const t = (i * Math.PI) / 3 + Math.PI / 6;
      return along([Math.cos(t), -Math.sin(t)], i % 2 === 0 ? 1 : -1, 0.85);
    });
  }
  return [];
}

function drawLobe(ctx: CanvasRenderingContext2D, c: Vec, dir: Vec, reach: number, sign: 1 | -1, theme: LabTheme) {
  const k = norm(dir) || 1;
  const unit: Vec = [dir[0] / k, dir[1] / k];
  // A foreshortened axis draws a shorter lobe.
  const length = reach * Math.min(1, k > 1 ? 1 : k);
  const centre = add(c, unit, length / 2);
  const colour = sign > 0 ? theme.sine : theme.cosine;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centre[0], centre[1], length / 2, length / 4.2, Math.atan2(unit[1], unit[0]), 0, Math.PI * 2);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  label(ctx, sign > 0 ? "+" : "−", centre[0], centre[1], { color: theme.text, font: theme.fontStrong, align: "center" });
}

function dashed(ctx: CanvasRenderingContext2D, from: Vec, to: Vec, colour: string) {
  ctx.save();
  ctx.setLineDash([5, 4]);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();
  ctx.restore();
}

function drawShapes(ctx: CanvasRenderingContext2D, layout: OrbitalsLayout, input: Parameters<SimulationRenderer<OrbitalsLayout>["draw"]>[2]) {
  const { theme, layers, results } = input;
  const has = (layer: string) => layers.has(layer);
  const { n, l, m } = legalOrbital(num(results.n, 2), num(results.l, 1), num(results.m));
  const c: Vec = [layout.width / 2, (layout.height - 30) / 2 + 6];
  const reach = Math.min(layout.width, layout.height - 40) * 0.38;

  if (has("axes")) {
    for (const [name, v] of Object.entries(AXES) as ["x" | "y" | "z", Vec][]) {
      const k = name === "y" ? 1.1 : 1.15;
      const end = add(c, v, reach * k);
      const start = add(c, v, -reach * k);
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(start[0], start[1]);
      ctx.lineTo(end[0], end[1]);
      ctx.stroke();
      ctx.restore();
      label(ctx, name, end[0] + (name === "x" ? 8 : name === "y" ? -8 : 0), end[1] + (name === "z" ? -8 : name === "y" ? 8 : 0), { color: theme.muted, font: theme.font, align: "center" });
    }
  }

  if (has("orbital")) {
    if (l === 0) {
      // Rings of alternating sign, one boundary per radial node.
      const rings = n;
      for (let i = rings; i >= 1; i--) {
        const r = (reach * 0.75 * i) / rings;
        ctx.save();
        ctx.beginPath();
        ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = (rings - i) % 2 === 0 ? theme.sine : theme.cosine;
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = theme.sine;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c[0], c[1], reach * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    } else {
      if (l === 2 && m === 0) {
        // d_z²: the ring round the middle, of the opposite sign.
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], reach * 0.42, reach * 0.14, 0, 0, Math.PI * 2);
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = theme.cosine;
        ctx.fill();
        ctx.restore();
      }
      for (const lobe of lobesOf(l, m)) drawLobe(ctx, c, lobe.dir, reach * lobe.length, lobe.sign, theme);
    }
  }

  if (has("nodes")) {
    // Radial nodes: dashed spheres (circles) inside the orbital.
    const radial = n - l - 1;
    for (let i = 1; i <= radial; i++) {
      const r = l === 0 ? (reach * 0.75 * i) / n : reach * 0.18 * i;
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = theme.angle;
      ctx.beginPath();
      ctx.arc(c[0], c[1], r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Angular nodes: the planes (or cones) between lobes of opposite sign.
    const planes: Vec[] =
      l === 1
        ? [[AXES.y, AXES.x, AXES.z][m + 1]!]
        : l === 2
          ? m === 0
            ? [[Math.sin(0.955), -Math.cos(0.955)], [-Math.sin(0.955), -Math.cos(0.955)]]
            : m === 2
              ? [add(AXES.x, AXES.y), add(AXES.x, AXES.y, -1)]
              : m === 1
                ? [AXES.x, AXES.z]
                : m === -1
                  ? [AXES.y, AXES.z]
                  : [AXES.x, AXES.y]
          : l === 3
            ? [[1, 0], [0.5, -0.87], [-0.5, -0.87]]
            : [];
    for (const p of planes) {
      const k = norm(p) || 1;
      const u: Vec = [p[0] / k, p[1] / k];
      dashed(ctx, add(c, u, -reach * 1.05), add(c, u, reach * 1.05), theme.angle);
    }
  }

  if (has("labels")) {
    // "2p_z" is written 2p with a subscript z.
    const [main, subscript] = orbitalName(n, l, m).split("_");
    label(ctx, main!, 14, 18, { color: theme.text, font: theme.fontStrong, align: "left" });
    if (subscript) {
      ctx.font = theme.fontStrong;
      label(ctx, subscript, 14 + ctx.measureText(main!).width + 1, 23, { color: theme.text, font: theme.font, align: "left" });
    }
    const radial = n - l - 1;
    const words = `${radial} radial node${radial === 1 ? "" : "s"} + ${l} angular node${l === 1 ? "" : "s"} = ${n - 1}, which is n − 1`;
    label(ctx, words, layout.width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawFilling(ctx: CanvasRenderingContext2D, layout: OrbitalsLayout, input: Parameters<SimulationRenderer<OrbitalsLayout>["draw"]>[2]) {
  const { theme, layers, results } = input;
  const has = (layer: string) => layers.has(layer);
  const Z = Math.round(num(results.Z, 1));
  const config = configurationOf(Z);
  const { box, rowHeight } = layout;
  const lastId = `${num(results.lastN)}${["s", "p", "d", "f"][num(results.lastL)]}`;

  if (has("config")) {
    label(ctx, `${SYMBOLS[Z] ?? ""}  Z = ${Z}`, 14, 18, { color: theme.text, font: theme.fontStrong, align: "left" });
    label(ctx, configurationText(Z), 14, 40, { color: theme.angle, font: theme.fontStrong, align: "left" });
  }

  if (has("ladder")) {
    const bottom = layout.height - 50;
    const labelX = layout.compact ? 40 : 60;
    const boxX = labelX + 18;
    // The energy arrow up the side.
    const top = bottom - (SUBSHELL_ORDER.length - 1) * rowHeight - 20;
    ctx.save();
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(12, bottom + 4);
    ctx.lineTo(12, top);
    ctx.moveTo(8, top + 6);
    ctx.lineTo(12, top);
    ctx.lineTo(16, top + 6);
    ctx.stroke();
    ctx.restore();
    label(ctx, "energy", 20, top - 6, { color: theme.muted, font: theme.font, align: "left" });

    SUBSHELL_ORDER.forEach((s, i) => {
      const y = bottom - i * rowHeight;
      const electrons = config[s.id] ?? 0;
      const current = s.id === lastId;
      label(ctx, s.id, labelX, y, { color: current ? theme.angle : electrons > 0 ? theme.text : theme.muted, font: theme.fontStrong, align: "right" });
      boxesFor(s.l, electrons).forEach(([up, down], k) => {
        const x = boxX + k * (box + 4);
        ctx.save();
        ctx.strokeStyle = current ? theme.angle : theme.axis;
        ctx.lineWidth = current ? 2 : 1.2;
        ctx.strokeRect(x, y - box / 2, box, box);
        ctx.restore();
        if (up) arrowGlyph(ctx, x + box * 0.33, y, box * 0.34, 1, theme.sine);
        if (down) arrowGlyph(ctx, x + box * 0.67, y, box * 0.34, -1, theme.cosine);
      });
    });
  }

  if (has("labels")) {
    const unpaired = num(results.unpaired);
    const words =
      num(results.exception) === 1
        ? `An exception: a half-full or full 3d is so stable that 4s gives one electron up`
        : unpaired === 0
          ? "Every electron paired: diamagnetic"
          : `${unpaired} unpaired electron${unpaired === 1 ? "" : "s"}: paramagnetic`;
    label(ctx, words, layout.width / 2, layout.height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

/** An electron's spin: a half-headed arrow, up or down. */
function arrowGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, half: number, dir: 1 | -1, colour: string) {
  const tip = y - dir * half;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + dir * half);
  ctx.lineTo(x, tip);
  ctx.lineTo(x - dir * 4, tip + dir * 5);
  ctx.stroke();
  ctx.restore();
}

export const orbitalsRenderer: SimulationRenderer<OrbitalsLayout> = {
  id: "orbitals",
  layout: (width) => computeOrbitalsLayout(width),

  draw(ctx, layout, input) {
    ctx.clearRect(0, 0, layout.width, layout.height);
    if (input.layers.has("orbital") || input.layers.has("axes")) drawShapes(ctx, layout, input);
    else drawFilling(ctx, layout, input);
  },
};
