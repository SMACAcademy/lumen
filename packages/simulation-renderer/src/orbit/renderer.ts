/**
 * A satellite around a planet.
 *
 * The path on screen is the conic the model solved for — r = p / (1 + e cos ν)
 * — not a trail of remembered dots, so the ellipse is exact from the first
 * frame and an escape opens into a real hyperbola instead of wandering off.
 *
 * Beneath the sky sits a speed gauge: the launch speed against the circular
 * speed and the escape speed, which is the whole of "how fast is fast enough".
 */

import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num } from "../shared/draw";
import type { GraphDescriptor, SimulationRenderer } from "../types";

export interface OrbitLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The planet and the orbit around it. */
  scene: Rect;
  /** The launch-speed gauge; zero height when it is hidden. */
  gauge: Rect;
}

/** How far the gauge runs, in circular speeds — a little past escape. */
export const GAUGE_MAX = 1.6;

export function computeOrbitLayout(width: number, showGauge = true): OrbitLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 16;
  const inner = Math.max(120, width - 2 * pad);
  const sceneHeight = clamp(inner * (compact ? 0.86 : 0.58), 240, 420);
  const gaugeHeight = showGauge ? 56 : 0;
  return {
    width,
    height: Math.ceil(sceneHeight + gaugeHeight + 24),
    compact,
    scene: { x: pad, y: pad, width: inner, height: sceneHeight },
    gauge: { x: pad, y: pad + sceneHeight + 12, width: inner, height: gaugeHeight },
  };
}

/** The conic, in planet radii, as the renderer needs it. */
interface Conic {
  eccentricity: number;
  semiLatus: number;
  /** Screen angle of the perigee direction: 0 or π. */
  rotation: number;
  bound: boolean;
}

function conicOf(results: Results): Conic {
  return {
    eccentricity: Math.max(0, num(results.eccentricity)),
    semiLatus: Math.max(1e-6, num(results.semiLatusRectum, 1)),
    rotation: num(results.launchAtPerigee, 1) >= 0.5 ? 0 : Math.PI,
    bound: num(results.escapes) < 0.5,
  };
}

/** Distance from the planet at true anomaly ν; Infinity past the asymptote. */
function radiusAt(conic: Conic, trueAnomaly: number): number {
  const denominator = 1 + conic.eccentricity * Math.cos(trueAnomaly);
  return denominator <= 1e-3 ? Number.POSITIVE_INFINITY : conic.semiLatus / denominator;
}

export interface OrbitView {
  scale: number;
  originX: number;
  originY: number;
  /** How far out the view reaches, in planet radii. */
  limit: number;
}

/**
 * Fit the whole orbit in the box. A bound orbit is framed by its own extent,
 * so a wide ellipse fills the sky; an escape is framed around the planet.
 */
export function orbitView(results: Results, scene: Rect): OrbitView {
  const conic = conicOf(results);
  const here = Math.hypot(num(results.x), num(results.y));
  let xMin = -1.3;
  let xMax = 1.3;
  let yExtent = 1.3;
  if (conic.bound) {
    const perigee = num(results.perigee, 1);
    const apogee = num(results.apogee, 1);
    const semiMajor = num(results.semiMajor, 1);
    const semiMinor = semiMajor * Math.sqrt(Math.max(0, 1 - conic.eccentricity ** 2));
    // The perigee lies along the rotation, the apogee opposite it.
    const toPerigee = conic.rotation === 0 ? perigee : -perigee;
    const toApogee = conic.rotation === 0 ? -apogee : apogee;
    xMin = Math.min(xMin, toPerigee, toApogee);
    xMax = Math.max(xMax, toPerigee, toApogee);
    yExtent = Math.max(yExtent, semiMinor);
  } else {
    const reach = Math.max(3 * num(results.launchRadius, 2), here * 1.15);
    xMin = Math.min(xMin, -reach);
    xMax = Math.max(xMax, reach);
    yExtent = Math.max(yExtent, reach);
  }
  const spanX = Math.max(1e-6, xMax - xMin);
  const spanY = Math.max(1e-6, 2 * yExtent);
  const scale = Math.min(scene.width / spanX, scene.height / spanY) * 0.92;
  return {
    scale,
    originX: scene.x + scene.width / 2 - ((xMin + xMax) / 2) * scale,
    originY: scene.y + scene.height / 2,
    limit: Math.max(spanX, spanY) / 2,
  };
}

const toPx = (view: OrbitView, x: number, y: number): [number, number] => [
  view.originX + x * view.scale,
  view.originY - y * view.scale,
];

export const orbitRenderer: SimulationRenderer<OrbitLayout> = {
  id: "orbit",
  layout: (width, _graphs, layers) => computeOrbitLayout(width, layers.has("gauge")),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const conic = conicOf(results);
    const view = orbitView(results, layout.scene);
    const planetRadius = Math.max(6, view.scale);
    const [px, py] = toPx(view, 0, 0);

    // ── The sky ───────────────────────────────────────────────────────────
    if (has("sky")) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = theme.surface;
      ctx.beginPath();
      ctx.roundRect(layout.scene.x, layout.scene.y, layout.scene.width, layout.scene.height, 10);
      ctx.fill();
      ctx.restore();
    }

    // ── The circular orbit at the launch height, for comparison ───────────
    if (has("reference")) {
      ctx.save();
      ctx.globalAlpha = 0.45 * dim("reference");
      ctx.strokeStyle = theme.reference;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.arc(px, py, num(results.launchRadius, 2) * view.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // ── The orbit itself, straight from the conic ─────────────────────────
    if (has("orbit")) {
      ctx.save();
      ctx.globalAlpha = dim("orbit");
      ctx.strokeStyle = num(results.crashes) > 0.5 ? theme.cosine : theme.curve;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      const steps = 480;
      for (let i = 0; i <= steps; i++) {
        const nu = -Math.PI + (i / steps) * 2 * Math.PI;
        const r = radiusAt(conic, nu);
        if (!Number.isFinite(r) || r > view.limit * 2.5) {
          started = false;
          continue;
        }
        const angle = nu + conic.rotation;
        const [x, y] = toPx(view, r * Math.cos(angle), r * Math.sin(angle));
        if (started) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        started = true;
      }
      ctx.stroke();
      ctx.restore();
    }

    // ── The planet ────────────────────────────────────────────────────────
    if (has("planet")) {
      ctx.save();
      ctx.globalAlpha = dim("planet");
      ctx.fillStyle = theme.sine;
      ctx.beginPath();
      ctx.arc(px, py, planetRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = theme.point;
      ctx.beginPath();
      ctx.arc(px - planetRadius * 0.3, py - planetRadius * 0.32, planetRadius * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (has("labels")) {
        label(ctx, `${formatNumber(num(results.planetMass, 1), 1)} Earth masses`, px, py + planetRadius + 12, {
          color: theme.muted,
          font: theme.font,
          align: "center",
          background: theme.background,
        });
      }
    }

    // ── Closest and furthest approach ─────────────────────────────────────
    if (has("apses") && conic.bound) {
      const marks: [number, number, string][] = [
        [num(results.perigee, 1), conic.rotation, "perigee"],
        [num(results.apogee, 1), conic.rotation + Math.PI, "apogee"],
      ];
      for (const [r, angle, name] of marks) {
        if (!Number.isFinite(r)) continue;
        const [x, y] = toPx(view, r * Math.cos(angle), r * Math.sin(angle));
        ctx.save();
        ctx.globalAlpha = dim("apses");
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        if (has("labels")) {
          // Below the marker, and never off the edge of a narrow sky.
          const { scene } = layout;
          label(ctx, `${name} ${formatNumber(r, 2)} R`, clamp(x, scene.x + 48, scene.x + scene.width - 48), y + 18, {
            color: theme.angle,
            font: theme.font,
            align: "center",
            background: theme.background,
          });
        }
      }
    }

    // ── The satellite, and where it is heading ────────────────────────────
    if (has("satellite")) {
      const [sx, sy] = toPx(view, num(results.x), num(results.y));
      if (has("velocity")) {
        // Along the orbit: at an apse that is exactly across the radius, which
        // is where the arrow matters most, and close enough in between.
        const r = Math.max(1e-6, num(results.r, 1));
        const radial = [num(results.x) / r, num(results.y) / r] as const;
        const tangent = [-radial[1], radial[0]] as const;
        const length = clamp(num(results.speed, 1) * 26, 14, 70);
        arrow(ctx, sx, sy, sx + tangent[0] * length, sy - tangent[1] * length, {
          color: theme.tangent,
          width: 2.5,
          alpha: dim("satellite"),
          head: 8,
        });
      }
      ctx.save();
      ctx.globalAlpha = dim("satellite");
      ctx.fillStyle = theme.point;
      ctx.beginPath();
      ctx.arc(sx, sy, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (has("labels")) {
        // Read out to the right, unless the satellite is close to that edge.
        const { scene } = layout;
        const flip = sx + 80 > scene.x + scene.width;
        label(ctx, `r = ${formatNumber(num(results.r, 1), 2)} R`, flip ? sx - 10 : sx + 10, sy - 12, {
          color: theme.point,
          font: theme.fontStrong,
          align: flip ? "right" : "left",
          background: theme.background,
        });
      }
    }

    // ── What kind of orbit this is ────────────────────────────────────────
    if (has("labels")) {
      const { scene } = layout;
      const escapes = num(results.escapes) > 0.5;
      const crashes = num(results.crashes) > 0.5;
      const shape = escapes
        ? "escapes — it never comes back"
        : crashes
          ? "crashes into the planet"
          : conic.eccentricity < 0.01
            ? "a circle"
            : "an ellipse";
      const lines: [string, string][] = [
        [`e = ${formatNumber(conic.eccentricity, 3)} · ${shape}`, escapes || crashes ? theme.cosine : theme.curve],
        [escapes ? "T = ∞" : `T = ${formatNumber(num(results.period), 2)} s`, theme.angle],
        [
          `E = ${formatNumber(num(results.specificEnergy), 3)} J/kg`,
          num(results.specificEnergy) < 0 ? theme.tangent : theme.cosine,
        ],
        [`L = ${formatNumber(num(results.specificAngularMomentum), 3)}`, theme.muted],
      ];
      lines.forEach(([text, color], i) => {
        label(ctx, text, scene.x + 8, scene.y + 14 + i * 16, { color, font: theme.font, background: theme.background });
      });
    }

    // ── The speed gauge ───────────────────────────────────────────────────
    if (has("gauge") && layout.gauge.height > 0) {
      const { gauge } = layout;
      const track = { x: gauge.x + 8, y: gauge.y + 24, width: gauge.width - 16, height: 10 };
      const at = (factor: number) => track.x + (clamp(factor, 0, GAUGE_MAX) / GAUGE_MAX) * track.width;
      const factor = num(results.speedFactor, 1);
      ctx.save();
      ctx.globalAlpha = 0.35 * dim("gauge");
      ctx.fillStyle = theme.reference;
      ctx.beginPath();
      ctx.roundRect(track.x, track.y, track.width, track.height, 5);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = dim("gauge");
      ctx.fillStyle = factor >= Math.SQRT2 ? theme.cosine : theme.tangent;
      ctx.beginPath();
      ctx.roundRect(track.x, track.y, Math.max(3, at(factor) - track.x), track.height, 5);
      ctx.fill();
      // The two speeds that matter, marked on the track.
      const marks = [
        [1, "circular", theme.curve],
        [Math.SQRT2, "escape", theme.cosine],
      ] as const;
      for (const [mark, name, color] of marks) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(at(mark), track.y - 5);
        ctx.lineTo(at(mark), track.y + track.height + 5);
        ctx.stroke();
        if (has("labels")) {
          label(ctx, name, at(mark), track.y + track.height + 14, {
            color,
            font: theme.font,
            align: "center",
            background: theme.background,
          });
        }
      }
      ctx.restore();
      if (has("labels")) {
        label(ctx, `launch speed = ${formatNumber(factor, 2)} × circular`, track.x, gauge.y + 8, {
          color: theme.text,
          font: theme.fontStrong,
          background: theme.background,
        });
      }
    }
  },

  /**
   * Dragging the satellite walks it round the orbit: the pointer gives a true
   * anomaly, and Kepler's equation turns that back into a time.
   */
  pick(layout, x, y, locked, results) {
    const conic = conicOf(results);
    const period = num(results.period);
    if (!conic.bound || !Number.isFinite(period) || period <= 0) return null;
    const view = orbitView(results, layout.scene);
    const [px, py] = toPx(view, 0, 0);
    const distance = Math.hypot(x - px, y - py);
    const reach = Math.max(num(results.apogee, 1), num(results.perigee, 1)) * view.scale * 1.2;
    if (locked !== "orbit" && (locked || distance > reach || distance < view.scale * 0.6)) return null;

    const trueAnomaly = Math.atan2(py - y, x - px) - conic.rotation;
    const e = clamp(conic.eccentricity, 0, 0.999999);
    const eccentricAnomaly =
      2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(trueAnomaly / 2), Math.sqrt(1 + e) * Math.cos(trueAnomaly / 2));
    const meanAnomaly = eccentricAnomaly - e * Math.sin(eccentricAnomaly);
    const fraction = (((meanAnomaly / (2 * Math.PI)) % 1) + 1) % 1;
    return { writes: [{ variable: "t", value: fraction * period }], region: "orbit", press: "jump" };
  },
};

/** The sky carries no graphs today; this keeps the descriptor type referenced. */
export type OrbitGraphs = readonly GraphDescriptor[];
