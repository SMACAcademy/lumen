/**
 * A wire on the left, its stress–strain curve on the right, and one point
 * belonging to both.
 *
 * The stretch a wire actually suffers before it yields is far too small to
 * see — a steel wire is 0.1% longer and no more — so the drawing magnifies it
 * by a round factor and says which one it used. The alternative is a picture
 * that either shows nothing or lies about the scale.
 */

import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane } from "../shared/plane";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface MaterialsLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The hanging wire. */
  scene: Rect;
  /** The stress–strain curve. */
  chart: Rect;
}

/** The factors the stretch may be magnified by, so the label stays a round number. */
export const MAGNIFICATIONS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000] as const;

export function computeMaterialsLayout(width: number, showChart = true): MaterialsLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(120, width - 2 * pad);
  if (!showChart) {
    const height = clamp(inner * 0.5, 260, 360);
    return {
      width,
      height: Math.ceil(height + 24),
      compact,
      scene: { x: pad, y: pad, width: inner, height },
      chart: { x: pad, y: pad + height, width: inner, height: 0 },
    };
  }
  if (compact) {
    const sceneHeight = clamp(inner * 0.75, 220, 300);
    const chartHeight = clamp(inner * 0.62, 180, 240);
    return {
      width,
      height: Math.ceil(sceneHeight + chartHeight + 56),
      compact,
      scene: { x: pad, y: pad, width: inner, height: sceneHeight },
      chart: { x: pad + 44, y: pad + sceneHeight + 28, width: inner - 56, height: chartHeight },
    };
  }
  const sceneWidth = Math.round(inner * 0.36);
  const height = clamp(sceneWidth * 1.05, 260, 360);
  return {
    width,
    height: Math.ceil(height + 44),
    compact,
    scene: { x: pad, y: pad, width: sceneWidth, height },
    chart: { x: pad + sceneWidth + 48, y: pad + 12, width: inner - sceneWidth - 60, height: height - 40 },
  };
}

/** The other materials, for the faint comparison curves. */
const OTHERS: { id: string; label: string; youngsModulus: number; yieldStress: number; ultimateStress: number; breakStrain: number }[] = [
  { id: "steel", label: "steel", youngsModulus: 200e9, yieldStress: 250e6, ultimateStress: 400e6, breakStrain: 0.15 },
  { id: "copper", label: "copper", youngsModulus: 110e9, yieldStress: 70e6, ultimateStress: 220e6, breakStrain: 0.3 },
  { id: "aluminium", label: "aluminium", youngsModulus: 70e9, yieldStress: 95e6, ultimateStress: 110e6, breakStrain: 0.12 },
  { id: "nylon", label: "nylon", youngsModulus: 3e9, yieldStress: 45e6, ultimateStress: 75e6, breakStrain: 0.6 },
  { id: "glass", label: "glass", youngsModulus: 70e9, yieldStress: 50e6, ultimateStress: 50e6, breakStrain: 50e6 / 70e9 },
];

/**
 * The magnification used to draw the stretch: the largest round factor that
 * keeps the drawn extension inside `room` pixels.
 */
export function magnificationFor(extensionPx: number, room: number): number {
  if (extensionPx <= 0) return 1;
  let chosen = 1;
  for (const factor of MAGNIFICATIONS) {
    if (extensionPx * factor <= room) chosen = factor;
  }
  return chosen;
}

/** Where the wire hangs, in pixels. */
function wireGeometry(layout: MaterialsLayout) {
  const { scene } = layout;
  const x = scene.x + scene.width * 0.42;
  const top = scene.y + 26;
  const restLength = scene.height * 0.44;
  return { x, top, restLength, room: scene.height * 0.2 };
}

export const materialsRenderer: SimulationRenderer<MaterialsLayout> = {
  id: "materials",
  layout: (width, _graphs, layers) => computeMaterialsLayout(width, layers.has("curve")),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const broken = num(results.broken) > 0.5;
    const strain = num(results.strain);
    const { x, top, restLength, room } = wireGeometry(layout);
    // The wire is drawn at its true length; only the stretch is magnified.
    const stretchPx = strain * restLength;
    const magnification = magnificationFor(stretchPx, room);
    const shownStretch = stretchPx * magnification;
    const bottom = top + restLength + shownStretch;

    // ── The wire, its clamp and its load ──────────────────────────────────
    if (has("wire")) {
      ctx.save();
      ctx.globalAlpha = dim("wire");
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      segment(ctx, x - 34, top, x + 34, top);
      const thickness = clamp(num(results.diameter, 1) * 2.5, 2, 12);
      ctx.strokeStyle = broken ? theme.muted : theme.curve;
      ctx.lineWidth = thickness;
      if (broken) {
        // Two pieces, sprung apart: the break is the whole point.
        const gap = 18;
        segment(ctx, x, top, x, top + restLength * 0.45);
        segment(ctx, x, top + restLength * 0.45 + gap, x, bottom);
      } else {
        segment(ctx, x, top, x, bottom);
      }
      ctx.restore();
    }

    if (has("weight")) {
      const size = 34;
      ctx.save();
      ctx.globalAlpha = dim("weight");
      ctx.fillStyle = theme.reference;
      ctx.strokeStyle = theme.neutral;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - size / 2, bottom, size, size * 0.7, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (has("labels")) {
        label(ctx, `${formatNumber(num(results.load), 0)} N`, x, bottom + size * 0.35, {
          color: theme.text,
          font: theme.fontStrong,
          align: "center",
        });
      }
    }

    // ── How far it has stretched ──────────────────────────────────────────
    if (has("ruler") && !broken) {
      const rest = top + restLength;
      ctx.save();
      ctx.globalAlpha = 0.8 * dim("ruler");
      ctx.strokeStyle = theme.reference;
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      segment(ctx, x - 46, rest, x + 46, rest);
      ctx.restore();
      if (shownStretch > 1) {
        ctx.save();
        ctx.globalAlpha = dim("ruler");
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 3;
        segment(ctx, x + 40, rest, x + 40, bottom);
        ctx.restore();
      }
      if (has("labels")) {
        label(ctx, `Δl = ${formatNumber(num(results.extension), 2)} mm`, x + 48, (rest + bottom) / 2, {
          color: theme.angle,
          font: theme.fontStrong,
          background: theme.background,
        });
        if (magnification > 1) {
          label(ctx, `stretch shown ×${magnification}`, layout.scene.x + 4, layout.scene.y + layout.scene.height - 8, {
            color: theme.muted,
            font: theme.font,
          });
        }
      }
    }

    // ── What the wire is doing, in words and numbers ──────────────────────
    if (has("labels")) {
      const { scene } = layout;
      const state = broken
        ? "broken"
        : num(results.plastic) > 0.5
          ? "past its elastic limit — it will not spring back"
          : "elastic — it springs back";
      const lines: [string, string][] = [
        [`σ = ${formatNumber(num(results.stress) / 1e6, 1)} MPa`, theme.cosine],
        [`ε = ${formatNumber(num(results.strainPercent), 3)} %`, theme.tangent],
        [state, broken ? theme.cosine : num(results.plastic) > 0.5 ? theme.angle : theme.sine],
      ];
      lines.forEach(([text, color], i) => {
        label(ctx, text, scene.x + 4, scene.y + 10 + i * 15, { color, font: theme.font, background: theme.background });
      });
    }

    // ── The stress–strain curve ───────────────────────────────────────────
    if (has("curve") && layout.chart.height > 0) {
      const ultimate = num(results.ultimateStress, 1) / 1e6;
      const yieldStress = num(results.yieldStress, 1) / 1e6;
      const modulus = num(results.youngsModulus, 1);
      const breakStrainPercent = num(results.breakStrainPercent, 1);
      const endStrain = Math.max(num(results.strainPercent), breakStrainPercent, 0.01);
      const xMax = endStrain * 1.15;
      const plane = createPlane(layout.chart, [0, xMax], [0, ultimate * 1.25]);
      drawPlane(ctx, plane, theme, { xLabel: "strain %", yLabel: "stress MPa" });

      const yieldPercent = num(results.yieldStrainPercent);
      const curveOf = (m: { youngsModulus: number; yieldStress: number; ultimateStress: number; breakStrain: number }) => {
        const ey = (m.yieldStress / m.youngsModulus) * 100;
        const brittle = m.ultimateStress <= m.yieldStress || m.breakStrain * 100 <= ey;
        return brittle
          ? [
              [0, 0],
              [m.breakStrain * 100, m.ultimateStress / 1e6],
            ]
          : [
              [0, 0],
              [ey, m.yieldStress / 1e6],
              [m.breakStrain * 100, m.ultimateStress / 1e6],
            ];
      };

      if (has("compare")) {
        ctx.save();
        clipToPlane(ctx, plane);
        ctx.globalAlpha = 0.35 * dim("compare");
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = theme.reference;
        for (const other of OTHERS) {
          // The wire's own material is already drawn solid; no ghost behind it.
          if (Math.abs(other.youngsModulus - modulus) < 1 && Math.abs(other.ultimateStress / 1e6 - ultimate) < 1e-6) continue;
          const points = curveOf(other);
          ctx.beginPath();
          points.forEach(([sx, sy], i) => {
            const [px, py] = plane.toPx(sx!, sy!);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          ctx.stroke();
          if (has("labels")) {
            const last = points[points.length - 1]!;
            const [px, py] = plane.toPx(Math.min(last[0]!, xMax * 0.97), last[1]!);
            // A curve that ends hard against the left edge is named to its right.
            const onTheLeft = px < plane.rect.x + plane.rect.width * 0.2;
            label(ctx, other.label, px + (onTheLeft ? 6 : 0), py - 8, {
              color: theme.muted,
              font: theme.font,
              align: onTheLeft ? "left" : "right",
            });
          }
        }
        ctx.restore();
      }

      // This material's own curve, drawn solid.
      const own = curveOf({
        youngsModulus: modulus,
        yieldStress: yieldStress * 1e6,
        ultimateStress: ultimate * 1e6,
        breakStrain: breakStrainPercent / 100,
      });
      ctx.save();
      clipToPlane(ctx, plane);
      ctx.globalAlpha = dim("curve");
      ctx.strokeStyle = theme.curve;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      own.forEach(([sx, sy], i) => {
        const [px, py] = plane.toPx(sx!, sy!);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();

      if (has("points")) {
        const marks: [number, number, string, string][] = [
          [yieldPercent, yieldStress, "elastic limit", theme.angle],
          [breakStrainPercent, ultimate, "breaks", theme.cosine],
        ];
        for (const [mx, my, name, color] of marks) {
          if (own.length < 3 && name === "elastic limit") continue; // brittle: the two coincide
          const [px, py] = plane.toPx(mx, my);
          ctx.save();
          ctx.globalAlpha = dim("points");
          ctx.strokeStyle = color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, 4.5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          if (has("labels")) {
            label(ctx, name, clamp(px, plane.rect.x + 40, plane.rect.x + plane.rect.width - 40), py - 12, {
              color,
              font: theme.font,
              align: "center",
              background: theme.background,
            });
          }
        }
      }

      // Where the wire is now.
      const [cx, cy] = plane.toPx(
        Math.min(num(results.strainPercent), xMax),
        Math.min(num(results.stress) / 1e6, ultimate * 1.25),
      );
      ctx.save();
      ctx.globalAlpha = 0.55 * dim("curve");
      ctx.strokeStyle = theme.point;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      segment(ctx, plane.rect.x, cy, cx, cy);
      segment(ctx, cx, plane.rect.y + plane.rect.height, cx, cy);
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = dim("curve");
      ctx.fillStyle = broken ? theme.cosine : theme.point;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  /** Clicking the curve hangs on whatever load puts the wire at that stress. */
  pick(layout, x, y, locked, results) {
    if (layout.chart.height <= 0) return null;
    const ultimate = num(results.ultimateStress, 1) / 1e6;
    const plane = createPlane(layout.chart, [0, 1], [0, ultimate * 1.25]);
    if (locked !== "curve" && (locked || !plane.contains(x, y, 8))) return null;
    const [, stressMPa] = plane.fromPx(x, y);
    const load = Math.max(0, stressMPa * 1e6 * num(results.area, 1));
    return { writes: [{ variable: "load", value: load }], region: "curve", press: "sweep" };
  },
};

/** The wire carries no graphs today; this keeps the descriptor type referenced. */
export type MaterialsGraphs = readonly GraphDescriptor[];
