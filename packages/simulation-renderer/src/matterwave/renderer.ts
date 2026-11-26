/**
 * Three pictures on the way to the quantum atom.
 *
 * Scattering: alpha particles coming in from the left past a nucleus. A fan
 * of faint paths shows the pattern — most barely turn, the few aimed close
 * swing right round — and the chosen one is bold. For Thomson's atom the
 * charge is a faint cloud filling the view and every path runs straight.
 *
 * Waves: a wave train whose drawn wavelength follows λ on a log scale, and
 * a ruler of sizes from far below a nucleus up to visible light, so λ can
 * be read against things it might diffract from.
 *
 * Uncertainty: a blur in position above a blur in velocity. Narrow one and
 * the other spreads.
 */

import { alphaPath, ATOM_MODEL_ORDER, MATTER_PARTICLE_ORDER, MATTER_PARTICLES, SCATTER_TARGET_ORDER, SCATTER_TARGETS } from "@ise/chemistry-engine";
import { formatSignificant } from "@ise/units";
import { arrow, clamp, label, num } from "../shared/draw";
import type { SimulationRenderer } from "../types";

export interface MatterWaveLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The scattering view: its centre, and pixels per femtometre. */
  cx: number;
  cy: number;
  perFm: number;
  /** The ruler of sizes. */
  ruler: { x1: number; x2: number; y: number };
}

/** Half the height of the scattering view, fm: room for the widest miss. */
export const SCATTER_VIEW_FM = 230;

export function computeMatterWaveLayout(width: number): MatterWaveLayout {
  const compact = width < 560;
  const height = compact ? 330 : 360;
  const cy = (height - 40) / 2;
  return { width, height, compact, cx: width / 2, cy, perFm: (cy - 8) / SCATTER_VIEW_FM, ruler: { x1: 34, x2: width - 34, y: height - 84 } };
}

/** The ruler runs from 10⁻³⁶ m to 10⁻⁶ m. */
export const SIZE_DECADES: readonly [number, number] = [-36, -6];

export function rulerX(layout: MatterWaveLayout, logMetres: number): number {
  const f = clamp((logMetres - SIZE_DECADES[0]) / (SIZE_DECADES[1] - SIZE_DECADES[0]), 0, 1);
  return layout.ruler.x1 + f * (layout.ruler.x2 - layout.ruler.x1);
}

/** The drawn wavelength, px: longer for a longer λ, though nothing like to scale. */
export function drawnWavelength(logWavelength: number): number {
  return 8 + clamp((logWavelength - SIZE_DECADES[0]) / (SIZE_DECADES[1] - SIZE_DECADES[0]), 0, 1) * 110;
}

/** Widths of the position and velocity blurs, px: they trade off. */
export function blurWidths(logDx: number, room: number): { position: number; velocity: number } {
  const f = clamp((logDx + 15) / 12, 0, 1);
  return { position: 10 + f * (room - 20), velocity: 10 + (1 - f) * (room - 20) };
}

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻" };
const power = (n: number) => `10${String(n).split("").map((c) => SUPERSCRIPT[c] ?? c).join("")}`;
const sci = (v: number) => formatSignificant(v, 2);
/** A power of ten written plainly when the exponent is whole, e.g. 10⁻¹⁰, else as 3.2 × 10⁻¹¹. */
const tenTo = (log: number) => (Math.abs(log - Math.round(log)) < 1e-9 ? power(Math.round(log)) : sci(10 ** log));

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A bell-shaped blur centred on x, `spread` px wide at its base. */
function bell(ctx: CanvasRenderingContext2D, x: number, base: number, spread: number, tall: number, colour: string) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(x - spread, base);
  for (let i = 0; i <= 40; i++) {
    const u = -1 + (2 * i) / 40;
    ctx.lineTo(x + u * spread, base - tall * Math.exp(-4.5 * u * u));
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const matterWaveRenderer: SimulationRenderer<MatterWaveLayout> = {
  id: "matterwave",
  layout: (width) => computeMatterWaveLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, cx, cy, perFm } = layout;
    ctx.clearRect(0, 0, width, height);
    const caption = (words: string) => label(ctx, words, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });

    if (has("foil")) {
      const target = SCATTER_TARGETS[SCATTER_TARGET_ORDER[Math.round(num(results.target))] ?? "gold"];
      const pudding = ATOM_MODEL_ORDER[Math.round(num(results.atomModel))] === "pudding";
      const d = num(results.closest, 40);
      const impact = num(results.impact);
      // Far enough out that every path reaches the edges of the view, corners included.
      const extent = Math.hypot(width / 2, SCATTER_VIEW_FM * perFm) / perFm + 20;
      const top = cy - SCATTER_VIEW_FM * perFm;
      const bottom = cy + SCATTER_VIEW_FM * perFm;
      const trace = (b: number, colour: string, lineWidth: number, head: boolean) => {
        // y is up in the model and down on the canvas.
        const points: [number, number][] = pudding ? [[-extent, b], [extent, b]] : alphaPath(b, d, extent);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, top, width, bottom - top);
        ctx.clip();
        ctx.strokeStyle = colour;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        points.forEach(([x, y], i) => {
          const px = cx + x * perFm;
          const py = cy - y * perFm;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        ctx.restore();
        if (head && points.length > 1) {
          // An arrowhead where the path leaves the view.
          const inside = points.filter(([x, y]) => Math.abs(cx + x * perFm - cx) < width / 2 - 14 && Math.abs(y * perFm) < SCATTER_VIEW_FM * perFm - 10);
          const [x2, y2] = inside[inside.length - 1] ?? points[points.length - 1]!;
          const [x1, y1] = inside[Math.max(0, inside.length - 4)] ?? points[0]!;
          if (Math.hypot(x2 - x1, y2 - y1) > 1e-6) arrow(ctx, cx + x1 * perFm, cy - y1 * perFm, cx + x2 * perFm, cy - y2 * perFm, { color: colour, width: lineWidth, head: 9 });
        }
      };
      if (pudding) {
        ctx.save();
        ctx.fillStyle = theme.cosine;
        ctx.globalAlpha = 0.1;
        ctx.fillRect(0, top, width, bottom - top);
        ctx.restore();
        for (let i = 0; i < 14; i++) {
          const a = Math.sin((i + 1) * 12.9898) * 43758.5453;
          const b = Math.sin((i + 1) * 78.233) * 12345.6789;
          disc(ctx, 20 + (a - Math.floor(a)) * (width - 40), top + 10 + (b - Math.floor(b)) * (bottom - top - 20), 3, theme.sine);
        }
        label(ctx, "positive charge everywhere, electrons dotted in it", cx, bottom - 12, { color: theme.cosine, font: theme.font, align: "center", background: theme.background });
      }
      for (const b of [-200, -160, -120, -80, -40, 40, 80, 120, 160, 200]) trace(b, theme.muted, 1, false);
      trace(impact, theme.angle, 2.5, true);
      if (!pudding) {
        disc(ctx, cx, cy, 5, theme.cosine);
        label(ctx, target.symbol, cx, cy + 16, { color: theme.cosine, font: theme.fontStrong, align: "center" });
      }
      label(ctx, "α →", 10, top + 12, { color: theme.angle, font: theme.fontStrong, background: theme.background });
      if (has("labels")) {
        const turn = num(results.deflection);
        // Short enough for a phone.
        if (pudding) caption(`Thomson's atom: no alpha turns more than ${turn.toFixed(2)}°`);
        else caption(`${impact.toFixed(0)} fm off-centre: turned ${turn.toFixed(0)}° · head-on stop at ${d.toFixed(0)} fm`);
      }
    }

    if (has("wave")) {
      const particle = MATTER_PARTICLES[MATTER_PARTICLE_ORDER[Math.round(num(results.particle))] ?? "electron"];
      const logWavelength = num(results.logWavelength, -9);
      label(ctx, `${particle.name} at ${tenTo(num(results.logSpeed, 6))} m/s`, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
      // The wave train.
      const period = drawnWavelength(logWavelength);
      const wy = 86;
      ctx.save();
      ctx.strokeStyle = theme.sine;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 24; x <= width - 24; x += 1) {
        const y = wy - 26 * Math.sin(((x - 24) * 2 * Math.PI) / period);
        if (x === 24) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      disc(ctx, 24, wy, 6, theme.angle);
      // The ruler of sizes.
      const { x1, x2, y } = layout.ruler;
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      for (let n = SIZE_DECADES[0]; n <= SIZE_DECADES[1]; n += 3) {
        const x = rulerX(layout, n);
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + (n % 6 === 0 ? 7 : 4));
      }
      ctx.stroke();
      ctx.restore();
      for (let n = SIZE_DECADES[0]; n <= SIZE_DECADES[1]; n += 6) label(ctx, power(n), rulerX(layout, n), y + 17, { color: theme.muted, font: theme.font, align: "center" });
      label(ctx, "metres", x2, y + 33, { color: theme.muted, font: theme.font, align: "right" });
      for (const [log, name] of [[-15, "nucleus"], [-10, "atom"], [-6.3, "light"]] as const) {
        const x = rulerX(layout, log);
        ctx.save();
        ctx.strokeStyle = theme.cosine;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y - 10);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.restore();
        // The three sit close together on thirty powers of ten: light's name hangs right of its mark, the others left.
        const after = log > -8;
        label(ctx, name, x + (after ? -2 : 2), y - 19, { color: theme.cosine, font: theme.font, align: after ? "left" : "right" });
      }
      if (has("labels")) {
        const lx = rulerX(layout, logWavelength);
        ctx.save();
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.moveTo(lx, y - 30);
        ctx.lineTo(lx - 6, y - 42);
        ctx.lineTo(lx + 6, y - 42);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        label(ctx, "λ", clamp(lx, x1 + 4, x2 - 4), y - 52, { color: theme.angle, font: theme.fontStrong, align: "center" });
        const wavelength = num(results.wavelength);
        const verdict = wavelength >= 1e-12 ? "diffracts from crystals" : wavelength >= 1e-15 ? "smaller than any atom" : "far smaller than a nucleus";
        caption(`λ = h/mv = ${sci(wavelength)} m: ${verdict}`);
      }
    }

    if (has("blur")) {
      const particle = MATTER_PARTICLES[MATTER_PARTICLE_ORDER[Math.round(num(results.particle))] ?? "electron"];
      const logDx = num(results.logDx, -10);
      const room = Math.min(150, width / 2 - 30);
      const widths = blurWidths(logDx, room);
      label(ctx, `${particle.name}`, width / 2, 18, { color: theme.text, font: theme.fontStrong, align: "center" });
      const rows = [
        { base: 118, spread: widths.position, colour: theme.sine, name: "where it is", value: `Δx = ${tenTo(logDx)} m`, answer: false },
        { base: 226, spread: widths.velocity, colour: theme.cosine, name: "how fast it is going", value: `Δv ≥ ${sci(10 ** num(results.logDv))} m/s`, answer: true },
      ];
      for (const row of rows) {
        bell(ctx, width / 2, row.base, row.spread, 56, row.colour);
        ctx.save();
        ctx.strokeStyle = theme.axis;
        ctx.beginPath();
        ctx.moveTo(24, row.base);
        ctx.lineTo(width - 24, row.base);
        ctx.stroke();
        ctx.restore();
        label(ctx, row.name, 24, row.base - 66, { color: row.colour, font: theme.font });
        if (has("labels") || !row.answer) label(ctx, row.value, width - 24, row.base + 14, { color: theme.text, font: theme.font, align: "right" });
      }
      if (has("labels")) caption(`Δv ≥ h / 4πmΔx = ${sci(10 ** num(results.logDv))} m/s`);
    }
  },
};
