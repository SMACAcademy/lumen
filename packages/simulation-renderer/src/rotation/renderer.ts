/**
 * A rigid body on an axle. The shape is drawn as what it is — a solid disc, a
 * bare ring, a rod, a sphere — because where the mass sits is the whole
 * lesson, and a ring that is obviously hollow explains its own inertia.
 *
 * A marker on the rim makes the turning visible; the applied force is drawn
 * as a tangential arrow at its actual lever arm.
 */

import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface RotationLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The wheel and its axle. */
  scene: Rect;
  /** The comparison of moments of inertia. */
  bars: Rect;
}

/**
 * `showCompare` is taken from the visible layers: without the comparison
 * there is no reason to reserve space for it, and the wheel gets the room.
 */
export function computeRotationLayout(width: number, showCompare = true): RotationLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(120, width - 2 * pad);
  if (!showCompare) {
    const height = clamp(inner * 0.62, 240, 380);
    return {
      width,
      height: Math.ceil(height + 30),
      compact,
      scene: { x: pad, y: pad + 14, width: inner, height },
      bars: { x: pad, y: pad + 14 + height, width: inner, height: 0 },
    };
  }
  if (compact) {
    const sceneHeight = clamp(inner * 0.8, 200, 300);
    return {
      width,
      height: Math.ceil(sceneHeight + 190),
      compact,
      scene: { x: pad, y: pad + 14, width: inner, height: sceneHeight },
      bars: { x: pad, y: pad + 14 + sceneHeight + 26, width: inner, height: 140 },
    };
  }
  const sceneWidth = Math.round(inner * 0.56);
  const height = clamp(sceneWidth * 0.82, 240, 340);
  return {
    width,
    height: Math.ceil(height + 60),
    compact,
    scene: { x: pad, y: pad + 14, width: sceneWidth, height },
    bars: { x: pad + sceneWidth + 20, y: pad + 26, width: inner - sceneWidth - 20, height: height - 20 },
  };
}

/** How the five shapes compare, for the bars beside the wheel. */
const SHAPES: { id: string; label: string; factor: number }[] = [
  { id: "rod", label: "rod", factor: 1 / 3 },
  { id: "sphere", label: "sphere", factor: 0.4 },
  { id: "disc", label: "disc", factor: 0.5 },
  { id: "shell", label: "shell", factor: 2 / 3 },
  { id: "ring", label: "ring", factor: 1 },
];

function wheelGeometry(layout: RotationLayout) {
  const { scene } = layout;
  const cx = scene.x + scene.width / 2;
  const cy = scene.y + scene.height * 0.5;
  const radius = Math.min(scene.width, scene.height) * 0.34;
  return { cx, cy, radius };
}

export const rotationRenderer: SimulationRenderer<RotationLayout> = {
  id: "rotation",
  layout: (width, _graphs, layers) => computeRotationLayout(width, layers.has("compare")),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const { cx, cy, radius } = wheelGeometry(layout);
    const theta = num(results.theta);
    const shape = String(results.shape ?? "disc");
    const leverFraction = clamp(num(results.leverFraction, 1), 0.1, 1);

    // ── The body itself ───────────────────────────────────────────────────
    if (has("body")) {
      ctx.save();
      ctx.globalAlpha = dim("body");
      ctx.translate(cx, cy);
      ctx.rotate(theta);
      ctx.strokeStyle = theme.point;
      ctx.lineWidth = 2;
      ctx.fillStyle = theme.curve;

      if (shape === "ring") {
        // A hoop: the hole is the point.
        ctx.globalAlpha *= 0.9;
        ctx.lineWidth = Math.max(6, radius * 0.16);
        ctx.strokeStyle = theme.curve;
        ctx.beginPath();
        ctx.arc(0, 0, radius - ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (shape === "shell") {
        ctx.globalAlpha *= 0.85;
        ctx.lineWidth = Math.max(4, radius * 0.1);
        ctx.strokeStyle = theme.curve;
        ctx.beginPath();
        ctx.arc(0, 0, radius - ctx.lineWidth / 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha *= 0.35;
        ctx.fillStyle = theme.curve;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === "rod") {
        const thickness = Math.max(10, radius * 0.22);
        ctx.beginPath();
        ctx.roundRect(-radius, -thickness / 2, radius * 2, thickness, thickness / 2);
        ctx.fill();
        ctx.stroke();
      } else {
        // Disc and sphere are both solid; the sphere gets a highlight.
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (shape === "sphere") {
          ctx.globalAlpha *= 0.5;
          ctx.fillStyle = theme.point;
          ctx.beginPath();
          ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.28, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // A mark on the rim, so the turning is visible at a glance.
      if (has("marker")) {
        ctx.globalAlpha = dim("body");
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.arc(radius * 0.82, 0, Math.max(4, radius * 0.08), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // The axle.
    if (has("axle")) {
      ctx.save();
      ctx.fillStyle = theme.neutral;
      ctx.strokeStyle = theme.background;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // ── The force, applied tangentially at its lever arm ──────────────────
    if (has("force") && Math.abs(num(results.force)) > 0.05) {
      const force = num(results.force);
      const armRadius = radius * leverFraction;
      const from = [cx + armRadius, cy] as const;
      const length = clamp(Math.abs(force) * 8, 18, radius * 1.5) * Math.sign(force);
      arrow(ctx, from[0], from[1], from[0], from[1] - length, { color: theme.cosine, width: 3, alpha: dim("force"), head: 9 });
      ctx.save();
      ctx.strokeStyle = theme.cosine;
      ctx.globalAlpha = 0.5 * dim("force");
      ctx.setLineDash([4, 4]);
      segment(ctx, cx, cy, from[0], from[1]);
      ctx.restore();
      if (has("labels")) {
        label(ctx, `F = ${formatNumber(force, 1)} N`, from[0] + 8, from[1] - length, {
          color: theme.cosine,
          font: theme.fontStrong,
          background: theme.background,
        });
        label(ctx, `r = ${formatNumber(num(results.lever), 2)} m`, (cx + from[0]) / 2, cy + 16, {
          color: theme.cosine,
          font: theme.font,
          align: "center",
          background: theme.background,
        });
      }
    }

    // ── Which way, and how fast, it is turning ────────────────────────────
    if (has("spin") && Math.abs(num(results.omega)) > 0.05) {
      const omega = num(results.omega);
      const sweep = clamp(Math.abs(omega) / 8, 0.3, 2.2);
      const start = theta;
      const end = theta + (omega > 0 ? sweep : -sweep);
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.lineWidth = 3;
      ctx.globalAlpha = dim("spin");
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.18, Math.min(start, end), Math.max(start, end));
      ctx.stroke();
      ctx.restore();
      if (has("labels")) {
        label(ctx, `ω = ${formatNumber(omega, 2)} rad/s`, cx, cy - radius * 1.32, {
          color: theme.angle,
          font: theme.fontStrong,
          align: "center",
          background: theme.background,
        });
      }
    }

    if (has("labels")) {
      const { scene } = layout;
      const lines: [string, string][] = [
        [`I = ${formatNumber(num(results.inertia), 3)} kg m²`, theme.tangent],
        [`τ = ${formatNumber(num(results.torque), 2)} N m`, theme.cosine],
        [`α = ${formatNumber(num(results.alpha), 2)} rad/s²`, theme.angle],
        [`${formatNumber(num(results.revolutions), 2)} turns`, theme.muted],
      ];
      lines.forEach(([text, color], i) => {
        label(ctx, text, scene.x + 4, scene.y + 12 + i * 16, { color, font: theme.font, background: theme.background });
      });
    }

    // ── How the shapes compare ────────────────────────────────────────────
    if (has("compare")) {
      const { bars } = layout;
      const barHeight = Math.min(26, (bars.height - 30) / SHAPES.length - 8);
      const mass = num(results.mass, 1);
      const r = num(results.radius, 1);
      if (has("labels")) {
        label(ctx, "moment of inertia, same mass and radius", bars.x, bars.y - 2, { color: theme.muted, font: theme.font });
      }
      SHAPES.forEach((entry, i) => {
        const value = entry.factor * mass * r * r;
        const y = bars.y + 14 + i * (barHeight + 10);
        const full = bars.width - 96;
        const isCurrent = entry.id === shape;
        ctx.save();
        ctx.globalAlpha = (isCurrent ? 0.95 : 0.4) * dim("compare");
        ctx.fillStyle = isCurrent ? theme.tangent : theme.reference;
        ctx.beginPath();
        ctx.roundRect(bars.x + 56, y, Math.max(2, full * entry.factor), barHeight, 3);
        ctx.fill();
        ctx.restore();
        if (has("labels")) {
          label(ctx, entry.label, bars.x + 50, y + barHeight / 2, {
            color: isCurrent ? theme.tangent : theme.muted,
            font: isCurrent ? theme.fontStrong : theme.font,
            align: "right",
          });
          label(ctx, formatNumber(value, 3), bars.x + 62 + full * entry.factor, y + barHeight / 2, {
            color: isCurrent ? theme.tangent : theme.muted,
            font: theme.font,
            background: theme.background,
          });
        }
      });
    }
  },

  pick(layout, x, y, locked, results) {
    const { cx, cy, radius } = wheelGeometry(layout);
    const distance = Math.hypot(x - cx, y - cy);
    if (locked === "wheel" || (!locked && distance < radius * 1.25 && distance > 6)) {
      // Turn the wheel by hand: follow the pointer, unwrapped so turns accumulate.
      const pointer = Math.atan2(y - cy, x - cx);
      const current = num(results.theta);
      const delta = Math.atan2(Math.sin(pointer - current), Math.cos(pointer - current));
      return {
        writes: [
          { variable: "theta", value: current + delta },
          { variable: "omega", value: 0 },
        ],
        region: "wheel",
      };
    }
    return null;
  },
};

/** The wheel carries no graphs today; this keeps the descriptor type referenced. */
export type RotationGraphs = readonly GraphDescriptor[];
