/**
 * Shapes on a grid of unit squares, and boxes of unit cubes.
 *
 * A rectangle's area is the squares it covers; a right triangle sits in its
 * rectangle (dashed) and covers half of it; a parallelogram leans but keeps
 * its base and height; a circle's inside squares are shaded to show why its
 * area is about three radius-squares. A cuboid is drawn in simple 3D, its
 * faces ruled into unit squares so the layers of cubes can be counted.
 *
 * The net layer unfolds a cuboid flat: top, front, bottom and back down the
 * middle, the two ends either side of the front. Matching faces share a
 * colour — l × b, l × h, b × h — and are ruled into unit squares, so the
 * surface area 2(lb + bh + hl) can be counted square by square.
 */

import { SHAPE_ORDER } from "@ise/mathematics-engine";
import type { Rect } from "@ise/graph-engine";
import { formatNumber } from "@ise/units";
import { label, num, segment } from "../shared/draw";
import type { PickResult, SimulationRenderer } from "../types";

export interface ShapesLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Pixels per unit. */
  unit: number;
  /** 13 × 12 units of grid; shapes sit on its bottom-left corner. */
  grid: Rect;
}

export function computeShapesLayout(width: number): ShapesLayout {
  const compact = width < 560;
  const unit = Math.floor(Math.min(compact ? 24 : 30, (width - 32) / 13));
  const grid = { x: Math.round((width - 13 * unit) / 2), y: 16, width: 13 * unit, height: 12 * unit };
  return { width, height: grid.y + grid.height + 58, compact, unit, grid };
}

/** Whole unit squares fully inside a circle of radius r, as (i, j) offsets from its centre. */
export function insideCircle(r: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = -r; i < r; i++) {
    for (let j = -r; j < r; j++) {
      const far = Math.max(Math.hypot(i, j), Math.hypot(i + 1, j), Math.hypot(i, j + 1), Math.hypot(i + 1, j + 1));
      if (far <= r + 1e-9) cells.push([i, j]);
    }
  }
  return cells;
}

export type NetFace = { x: number; y: number; width: number; height: number; pair: "lb" | "lh" | "bh" };

/** The six faces of a cuboid's net, in pixels, scaled to fit inside the grid and centred across the canvas. */
export function cuboidNet(layout: ShapesLayout, l: number, b: number, h: number): { faces: NetFace[]; scale: number } {
  const { grid } = layout;
  const across = l + 2 * b;
  const down = 2 * b + 2 * h;
  const scale = Math.min(layout.unit, (layout.width - 32) / across, grid.height / down);
  const left = (layout.width - across * scale) / 2;
  const top = grid.y + (grid.height - down * scale) / 2;
  const mid = left + b * scale;
  const face = (x: number, y: number, w: number, hh: number, pair: NetFace["pair"]): NetFace => ({ x, y, width: w * scale, height: hh * scale, pair });
  const frontY = top + b * scale;
  return {
    scale,
    faces: [
      face(mid, top, l, b, "lb"), // top
      face(mid, frontY, l, h, "lh"), // front
      face(left, frontY, b, h, "bh"), // left end
      face(mid + l * scale, frontY, b, h, "bh"), // right end
      face(mid, frontY + h * scale, l, b, "lb"), // bottom
      face(mid, frontY + (h + b) * scale, l, h, "lh"), // back
    ],
  };
}

const nice = (value: number) => formatNumber(value, Number.isInteger(value) ? 0 : 1);

export const shapesRenderer: SimulationRenderer<ShapesLayout> = {
  id: "shapes",
  layout: (width) => computeShapesLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { grid, unit: u } = layout;
    ctx.clearRect(0, 0, layout.width, layout.height);

    const shape = SHAPE_ORDER[Math.round(num(results.shape))] ?? "rectangle";
    const l = Math.round(num(results.length, 4));
    const b = Math.round(num(results.breadth, 3));
    const h = Math.round(num(results.height, 2));
    const r = Math.round(num(results.radius, 3));
    const ox = grid.x;
    const oy = grid.y + grid.height;

    if (has("grid") && shape !== "cuboid") {
      ctx.save();
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      for (let i = 0; i <= 13; i++) segment(ctx, grid.x + i * u, grid.y, grid.x + i * u, oy);
      for (let j = 0; j <= 12; j++) segment(ctx, grid.x, grid.y + j * u, grid.x + grid.width, grid.y + j * u);
      ctx.restore();
    }

    const fillAndStroke = (points: [number, number][]) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0]![0], points[0]![1]);
      for (const [px, py] of points.slice(1)) ctx.lineTo(px, py);
      ctx.closePath();
      ctx.fillStyle = theme.sine;
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.sine;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    };

    if (has("shape")) {
      if (shape === "rectangle") {
        fillAndStroke([[ox, oy], [ox + l * u, oy], [ox + l * u, oy - b * u], [ox, oy - b * u]]);
      } else if (shape === "triangle") {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ox, oy - b * u, l * u, b * u);
        ctx.restore();
        fillAndStroke([[ox, oy], [ox + l * u, oy], [ox, oy - b * u]]);
      } else if (shape === "parallelogram") {
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1.5;
        segment(ctx, ox + u, oy, ox + u, oy - b * u);
        ctx.restore();
        fillAndStroke([[ox, oy], [ox + l * u, oy], [ox + (l + 1) * u, oy - b * u], [ox + u, oy - b * u]]);
      } else if (shape === "circle") {
        const cx = grid.x + 6 * u;
        const cy = grid.y + 6 * u;
        ctx.save();
        ctx.fillStyle = theme.angle;
        ctx.globalAlpha = 0.35;
        for (const [i, j] of insideCircle(r)) ctx.fillRect(cx + i * u, cy + j * u, u, u);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = theme.sine;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r * u, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1.5;
        segment(ctx, cx, cy, cx + r * u, cy);
        ctx.restore();
        label(ctx, `r = ${r}`, cx + (r * u) / 2, cy - 10, { color: theme.text, font: theme.fontStrong, align: "center" });
      } else {
        // A cuboid in simple 3D: front face l × h, receding b units at half scale.
        const c = Math.min(u, (layout.width - 32) / (l + 0.5 * b + 0.5), (grid.height - 8) / (h + 0.5 * b + 0.5));
        const dx = 0.5 * c;
        const dy = -0.5 * c;
        const fx = Math.round((layout.width - (l + 0.5 * b) * c) / 2);
        const fy = oy;
        const face = (points: [number, number][], alpha: number) => {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(points[0]![0], points[0]![1]);
          for (const [px, py] of points.slice(1)) ctx.lineTo(px, py);
          ctx.closePath();
          ctx.fillStyle = theme.sine;
          ctx.globalAlpha = alpha;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = theme.sine;
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        };
        const topY = fy - h * c;
        face([[fx, fy], [fx + l * c, fy], [fx + l * c, topY], [fx, topY]], 0.3);
        face([[fx, topY], [fx + l * c, topY], [fx + l * c + b * dx, topY + b * dy], [fx + b * dx, topY + b * dy]], 0.45);
        face([[fx + l * c, fy], [fx + l * c + b * dx, fy + b * dy], [fx + l * c + b * dx, topY + b * dy], [fx + l * c, topY]], 0.18);
        // Rule the faces into unit squares so the cubes can be counted.
        ctx.save();
        ctx.strokeStyle = theme.sine;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        for (let i = 1; i < l; i++) {
          segment(ctx, fx + i * c, fy, fx + i * c, topY);
          segment(ctx, fx + i * c, topY, fx + i * c + b * dx, topY + b * dy);
        }
        for (let k = 1; k < h; k++) {
          segment(ctx, fx, fy - k * c, fx + l * c, fy - k * c);
          segment(ctx, fx + l * c, fy - k * c, fx + l * c + b * dx, fy - k * c + b * dy);
        }
        for (let j = 1; j < b; j++) {
          segment(ctx, fx + j * dx, topY + j * dy, fx + l * c + j * dx, topY + j * dy);
          segment(ctx, fx + l * c + j * dx, fy + j * dy, fx + l * c + j * dx, topY + j * dy);
        }
        ctx.restore();
      }
    }

    const net = has("net") && shape === "cuboid";
    if (net) {
      const { faces, scale } = cuboidNet(layout, l, b, h);
      const colour = { lb: theme.sine, lh: theme.cosine, bh: theme.tangent };
      for (const f of faces) {
        ctx.save();
        ctx.fillStyle = colour[f.pair];
        ctx.globalAlpha = 0.3;
        ctx.fillRect(f.x, f.y, f.width, f.height);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = colour[f.pair];
        ctx.lineWidth = 1;
        // Unit squares, so the surface can be counted.
        for (let x = f.x + scale; x < f.x + f.width - 0.5; x += scale) segment(ctx, x, f.y, x, f.y + f.height);
        for (let y = f.y + scale; y < f.y + f.height - 0.5; y += scale) segment(ctx, f.x, y, f.x + f.width, y);
        ctx.globalAlpha = 1;
        ctx.lineWidth = 2;
        ctx.strokeRect(f.x, f.y, f.width, f.height);
        ctx.restore();
      }
      if (has("labels")) {
        const area = { lb: l * b, lh: l * h, bh: b * h };
        for (const f of faces) {
          const text = String(area[f.pair]);
          if (f.width >= text.length * 6 + 6 && f.height >= 16) {
            label(ctx, text, f.x + f.width / 2, f.y + f.height / 2, { color: theme.text, font: theme.fontStrong, align: "center", background: theme.background });
          }
        }
      }
    }

    if (has("labels")) {
      const at = { color: theme.text, font: theme.fontStrong };
      const summaryY = layout.height - 22;
      if (net) {
        const sum = `2(${nice(num(results.faceLB))} + ${nice(num(results.faceBH))} + ${nice(num(results.faceLH))})`;
        label(ctx, `${sum} = ${nice(num(results.surfaceArea))} squares · volume ${nice(num(results.volume))} cubes`, layout.width / 2, summaryY, { ...at, align: "center" });
      } else if (shape === "cuboid") {
        label(ctx, `${l} × ${b} × ${h} = ${nice(num(results.volume))} cubes · surface ${nice(num(results.surfaceArea))} squares`, layout.width / 2, summaryY, { ...at, align: "center" });
      } else {
        if (shape !== "circle") {
          label(ctx, String(l), ox + (l * u) / 2, oy + 14, { color: theme.muted, font: theme.font, align: "center" });
          label(ctx, String(b), ox - 8, oy - (b * u) / 2, { color: theme.muted, font: theme.font, align: "right" });
        }
        const area = num(results.area);
        const areaText = shape === "circle" ? `area ≈ ${formatNumber(area, 1)} squares` : `area = ${nice(area)} squares`;
        label(ctx, `${areaText} · perimeter ${shape === "rectangle" ? "=" : "≈"} ${nice(Number(num(results.perimeter).toFixed(1)))}`, layout.width / 2, summaryY, { ...at, align: "center" });
      }
    }
  },

  /** Drag a flat shape's corner to resize it, or a circle's edge to change its radius. */
  pick(layout, x, y, _locked, results): PickResult | null {
    const shape = SHAPE_ORDER[Math.round(num(results.shape))] ?? "rectangle";
    const { grid, unit: u } = layout;
    if (shape === "cuboid") return null;
    if (shape === "circle") {
      const radius = Math.round(Math.hypot(x - (grid.x + 6 * u), y - (grid.y + 6 * u)) / u);
      return { writes: [{ variable: "radius", value: radius }], region: "circle" };
    }
    const length = Math.round((x - grid.x) / u);
    const breadth = Math.round((grid.y + grid.height - y) / u);
    return { writes: [{ variable: "length", value: length }, { variable: "breadth", value: breadth }], region: "corner" };
  },
};
