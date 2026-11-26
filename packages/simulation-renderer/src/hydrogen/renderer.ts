/**
 * The Bohr atom, three ways at once: the energy levels with the jump drawn as
 * an arrow, the atom itself with the photon leaving it, and the spectrum strip
 * where that photon lands as a single line.
 *
 * Every number comes from the model. The diagram squeezes the higher levels
 * together less than a linear energy scale would — they would otherwise be a
 * smear near zero — and says so; the orbit radii, by contrast, are drawn to
 * scale (r ∝ n²), so the ground state really is tiny.
 */

import { levelEnergy, lineWavelength, MAX_LEVEL, SERIES_NAMES, VISIBLE_NM } from "@ise/chemistry-engine";
import type { Rect } from "@ise/graph-engine";
import type { Results } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { SimulationRenderer } from "../types";
import type { LabTheme } from "../theme";

export interface HydrogenLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The energy-level diagram. */
  levels: Rect;
  /** The atom, orbits to scale. */
  atom: Rect;
  /** The spectrum, 80 nm to 8 µm on a log scale. */
  spectrum: Rect;
}

export const SPECTRUM_NM: readonly [number, number] = [80, 8000];

export function computeHydrogenLayout(width: number, showAtom = true, showSpectrum = true): HydrogenLayout {
  const compact = width < 620;
  const pad = compact ? 6 : 14;
  const inner = Math.max(200, width - 2 * pad);
  const spectrumHeight = showSpectrum ? 76 : 0;
  if (compact) {
    const levelsHeight = clamp(inner * 0.78, 250, 320);
    const atomHeight = showAtom ? clamp(inner * 0.55, 170, 230) : 0;
    const levels = { x: pad, y: pad, width: inner, height: levelsHeight };
    const atom = { x: pad, y: pad + levelsHeight + 8, width: inner, height: atomHeight };
    const spectrum = { x: pad + 8, y: atom.y + atomHeight + 14, width: inner - 16, height: spectrumHeight };
    return { width, height: Math.ceil(spectrum.y + spectrumHeight + 22), compact, levels, atom, spectrum };
  }
  const top = clamp(inner * 0.42, 280, 360);
  const levelsWidth = showAtom ? Math.round(inner * 0.58) : inner;
  const levels = { x: pad, y: pad, width: levelsWidth, height: top };
  const atom = { x: pad + levelsWidth + 16, y: pad, width: showAtom ? inner - levelsWidth - 16 : 0, height: showAtom ? top : 0 };
  const spectrum = { x: pad + 10, y: pad + top + 18, width: inner - 20, height: spectrumHeight };
  return { width, height: Math.ceil(spectrum.y + spectrumHeight + 24), compact, levels, atom, spectrum };
}

/** Where the diagram's plotting area sits inside its box: room for n on the left and energies on the right. */
function diagramArea(layout: HydrogenLayout) {
  const { levels } = layout;
  return { left: levels.x + 44, right: levels.x + levels.width - 78, top: levels.y + 38, bottom: levels.y + levels.height - 30 };
}

/** How strongly the drawing evens out the levels: 1 would be true to 1/n, smaller spreads the top ones. */
const SPREAD = 0.4;

/**
 * Height of level n in the diagram. Energy goes as −1/n², which would crush
 * n ≥ 3 into the top tenth. Instead the diagram uses (1/n)^0.4, rescaled so
 * the level above the highest shown sits at the top: the order and the
 * crowding towards zero survive, and every level has room to be read and
 * clicked. n = ∞ is drawn just above, where the crowding would end.
 */
export function levelY(layout: HydrogenLayout, n: number): number {
  const area = diagramArea(layout);
  const top = (1 / (MAX_LEVEL + 1)) ** SPREAD;
  const f = Number.isFinite(n) ? ((1 / n) ** SPREAD - top) / (1 - top) : 0;
  return area.top + (area.bottom - area.top) * f;
}

/** Horizontal position of a wavelength on the spectrum strip (log scale). */
export function wavelengthX(layout: HydrogenLayout, nm: number): number {
  const { spectrum } = layout;
  const [lo, hi] = SPECTRUM_NM;
  const t = (Math.log10(clamp(nm, lo, hi)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo));
  return spectrum.x + t * spectrum.width;
}

/**
 * The colour of light of a given wavelength, as the eye sees it. Outside the
 * visible band there is no colour to see, so ultraviolet and infrared borrow
 * two theme colours and are labelled as what they are.
 */
export function wavelengthColor(nm: number, theme: LabTheme): string {
  if (nm < VISIBLE_NM[0]) return theme.curve;
  if (nm > VISIBLE_NM[1]) return theme.secant;
  let r = 0;
  let g = 0;
  let b = 0;
  if (nm < 440) [r, g, b] = [(440 - nm) / 60, 0, 1];
  else if (nm < 490) [r, g, b] = [0, (nm - 440) / 50, 1];
  else if (nm < 510) [r, g, b] = [0, 1, (510 - nm) / 20];
  else if (nm < 580) [r, g, b] = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) [r, g, b] = [1, (645 - nm) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  // Dim towards both ends of the band, where the eye is least sensitive — but never to black.
  const edge = nm < 420 ? 0.45 + (0.55 * (nm - 380)) / 40 : nm > 700 ? 0.45 + (0.55 * (750 - nm)) / 50 : 1;
  const to255 = (c: number) => Math.round(255 * clamp(c * edge, 0, 1) ** 0.8);
  return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
}

function formatWavelength(nm: number): string {
  return nm >= 1000 ? `${formatNumber(nm / 1000, 2)} µm` : `${formatNumber(nm, 1)} nm`;
}

const REGION_NAMES = ["ultraviolet", "visible", "infrared"] as const;

export const hydrogenRenderer: SimulationRenderer<HydrogenLayout> = {
  id: "hydrogen",
  layout: (width, _graphs, layers) => computeHydrogenLayout(width, layers.has("atom"), layers.has("spectrum")),

  draw(ctx, layout, input) {
    const { theme, layers, results, highlight } = input;
    const has = (layer: string) => layers.has(layer);
    const dim = (layer: string) => (highlight && highlight !== layer ? 0.3 : 1);
    ctx.clearRect(0, 0, layout.width, layout.height);

    const Z = Math.round(num(results.Z, 1));
    const upper = Math.round(num(results.upper, 3));
    const lower = Math.round(num(results.lower, 2));
    const wavelength = num(results.wavelength);
    const photon = wavelengthColor(wavelength, theme);
    const area = diagramArea(layout);

    // ── The energy levels ─────────────────────────────────────────────────
    if (has("levels")) {
      ctx.save();
      ctx.globalAlpha = dim("levels");
      // n = ∞: the electron is free, at zero energy.
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1;
      segment(ctx, area.left, area.top - 12, area.right, area.top - 12);
      ctx.setLineDash([]);
      for (let n = 1; n <= MAX_LEVEL; n++) {
        const y = levelY(layout, n);
        const active = n === upper || n === lower;
        ctx.strokeStyle = active ? theme.point : theme.neutral;
        ctx.lineWidth = active ? 2.5 : 1.25;
        segment(ctx, area.left, y, area.right, y);
      }
      ctx.restore();
      if (has("labels")) {
        label(ctx, "n = ∞", area.left - 6, area.top - 12, { color: theme.muted, font: theme.font, align: "right" });
        label(ctx, "0 eV", area.right + 6, area.top - 12, { color: theme.muted, font: theme.font });
        for (let n = 1; n <= MAX_LEVEL; n++) {
          const y = levelY(layout, n);
          const active = n === upper || n === lower;
          const energy = levelEnergy(n, Z);
          label(ctx, `n = ${n}`, area.left - 6, y, { color: active ? theme.text : theme.muted, font: active ? theme.fontStrong : theme.font, align: "right" });
          label(ctx, `${formatNumber(energy, 2)} eV`, area.right + 6, y, { color: active ? theme.text : theme.muted, font: theme.font });
        }
      }
    }

    // ── The rest of the series, faintly, so the family is visible ─────────
    if (has("series")) {
      const count = MAX_LEVEL - lower;
      const span = (area.right - area.left) * 0.62;
      for (let i = 0; i < count; i++) {
        const n = lower + 1 + i;
        if (n === upper) continue;
        const x = area.left + 24 + (span * (i + 0.5)) / Math.max(1, count);
        arrow(ctx, x, levelY(layout, n), x, levelY(layout, lower), {
          color: wavelengthColor(lineWavelength(n, lower, Z), theme),
          width: 1.5,
          head: 7,
          alpha: 0.35 * dim("series"),
        });
      }
    }

    // ── The jump itself ───────────────────────────────────────────────────
    if (has("transition")) {
      const x = area.left + (area.right - area.left) * 0.8;
      const y1 = levelY(layout, upper);
      const y2 = levelY(layout, lower);
      arrow(ctx, x, y1, x, y2, { color: photon, width: 4, head: 12, alpha: dim("transition") });
      if (has("labels")) {
        label(ctx, `${upper} → ${lower}`, x - 10, (y1 + y2) / 2, { color: theme.text, font: theme.fontStrong, align: "right", background: theme.background });
        label(ctx, `${formatNumber(num(results.photonEnergy), 2)} eV`, x + 10, (y1 + y2) / 2, { color: photon, font: theme.fontStrong, background: theme.background });
      }
    }

    if (has("labels")) {
      const series = SERIES_NAMES[lower] ?? "";
      label(ctx, `${series} series · ${formatWavelength(wavelength)} · ${REGION_NAMES[num(results.region)] ?? ""}`, layout.levels.x + 4, layout.levels.y + 6, {
        color: photon,
        font: theme.fontStrong,
        baseline: "top",
      });
      label(ctx, "levels spaced to be readable, not to scale", layout.levels.x + layout.levels.width - 4, layout.levels.y + layout.levels.height, {
        color: theme.muted,
        font: theme.font,
        align: "right",
        baseline: "bottom",
      });
    }

    // ── The atom ──────────────────────────────────────────────────────────
    if (has("atom") && layout.atom.width > 0) {
      const { atom } = layout;
      const cx = atom.x + atom.width / 2;
      const cy = atom.y + atom.height / 2 + 6;
      const R = Math.max(20, Math.min(atom.width, atom.height) / 2 - 18);
      const radius = (n: number) => R * (n / upper) ** 2;
      ctx.save();
      ctx.globalAlpha = dim("atom");
      for (let n = 1; n <= upper; n++) {
        const active = n === upper || n === lower;
        ctx.strokeStyle = active ? theme.neutral : theme.grid;
        ctx.lineWidth = active ? 1.5 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1.5, radius(n)), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = theme.angle;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + Z, 0, Math.PI * 2);
      ctx.fill();
      const dropped = num(results.dropped) > 0.5;
      const angle = num(results.electronAngle);
      const r = radius(dropped ? lower : upper);
      const ex = cx + Math.max(3, r) * Math.cos(angle);
      const ey = cy + Math.max(3, r) * Math.sin(angle);
      ctx.fillStyle = theme.sine;
      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // The photon: a little wave packet heading out from where the electron fell.
      const progress = num(results.photonProgress);
      if (dropped && progress > 0) {
        const reach = Math.hypot(atom.width, atom.height) / 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        const start = Math.max(3, r) + progress * reach * 0.9;
        const length = 46;
        ctx.save();
        ctx.globalAlpha = (1 - progress * 0.6) * dim("atom");
        ctx.strokeStyle = photon;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let s = 0; s <= length; s += 2) {
          const along = start + s;
          const wiggle = Math.sin((s / length) * Math.PI * 6) * 5 * Math.sin((s / length) * Math.PI);
          const px = cx + dx * along - dy * wiggle;
          const py = cy + dy * along + dx * wiggle;
          if (s === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      }
      if (has("labels")) {
        label(ctx, `orbits to scale: r ∝ n²/Z`, atom.x + atom.width / 2, atom.y + 4, { color: theme.muted, font: theme.font, align: "center", baseline: "top" });
        label(ctx, `r${upper} is ${formatNumber(num(results.radiusRatio), 2)} × r${lower}`, atom.x + atom.width / 2, atom.y + atom.height, {
          color: theme.text,
          font: theme.font,
          align: "center",
          baseline: "bottom",
        });
      }
    }

    // ── The spectrum ──────────────────────────────────────────────────────
    if (has("spectrum") && layout.spectrum.height > 0) {
      const { spectrum } = layout;
      const bandTop = spectrum.y + 14;
      const bandHeight = spectrum.height - 34;
      ctx.save();
      ctx.globalAlpha = dim("spectrum");
      ctx.fillStyle = theme.surface2;
      ctx.fillRect(spectrum.x, bandTop, spectrum.width, bandHeight);
      // The visible band, painted a sliver at a time.
      for (let nm = VISIBLE_NM[0]; nm < VISIBLE_NM[1]; nm += 5) {
        const x1 = wavelengthX(layout, nm);
        const x2 = wavelengthX(layout, nm + 5);
        ctx.fillStyle = wavelengthColor(nm + 2.5, theme);
        ctx.globalAlpha = 0.28 * dim("spectrum");
        ctx.fillRect(x1, bandTop, x2 - x1 + 0.5, bandHeight);
      }
      ctx.globalAlpha = dim("spectrum");
      // The whole series, and the limit it crowds towards.
      for (let n = lower + 1; n <= MAX_LEVEL; n++) {
        const nm = lineWavelength(n, lower, Z);
        const x = wavelengthX(layout, nm);
        ctx.strokeStyle = wavelengthColor(nm, theme);
        ctx.lineWidth = n === upper ? 4 : 1.5;
        ctx.globalAlpha = (n === upper ? 1 : 0.55) * dim("spectrum");
        segment(ctx, x, bandTop, x, bandTop + bandHeight);
      }
      const limitX = wavelengthX(layout, num(results.seriesLimit));
      ctx.globalAlpha = 0.8 * dim("spectrum");
      ctx.strokeStyle = theme.muted;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      segment(ctx, limitX, bandTop - 4, limitX, bandTop + bandHeight + 4);
      ctx.setLineDash([]);
      ctx.restore();

      if (has("labels")) {
        const lineX = wavelengthX(layout, wavelength);
        label(ctx, formatWavelength(wavelength), clamp(lineX, spectrum.x + 34, spectrum.x + spectrum.width - 34), spectrum.y + 4, {
          color: photon,
          font: theme.fontStrong,
          align: "center",
          baseline: "middle",
          background: theme.background,
        });
        for (const tick of [100, 200, 500, 1000, 2000, 5000]) {
          const x = wavelengthX(layout, tick);
          label(ctx, tick >= 1000 ? `${tick / 1000} µm` : `${tick}`, x, bandTop + bandHeight + 4, { color: theme.muted, font: theme.font, align: "center", baseline: "top" });
        }
        const mid = (a: number, b: number) => (wavelengthX(layout, a) + wavelengthX(layout, b)) / 2;
        label(ctx, "UV", mid(SPECTRUM_NM[0], VISIBLE_NM[0]), bandTop + bandHeight / 2, { color: theme.muted, font: theme.font, align: "center" });
        label(ctx, "IR", mid(VISIBLE_NM[1], SPECTRUM_NM[1]), bandTop + bandHeight / 2, { color: theme.muted, font: theme.font, align: "center" });
        label(ctx, "limit", limitX, bandTop + bandHeight + 16, { color: theme.muted, font: theme.font, align: "center", baseline: "top" });
      }
    }
  },

  /**
   * Drag either end of the jump to another level, or click a line in the
   * spectrum to make that the transition.
   */
  pick(layout, x, y, locked, results: Results) {
    const inside = (r: Rect, slack = 6) => x >= r.x - slack && x <= r.x + r.width + slack && y >= r.y - slack && y <= r.y + r.height + slack;
    const nearestLevel = () => {
      let best = 1;
      for (let n = 1; n <= MAX_LEVEL; n++) if (Math.abs(levelY(layout, n) - y) < Math.abs(levelY(layout, best) - y)) best = n;
      return best;
    };

    if (locked === "upper" || locked === "lower") return { writes: [{ variable: locked, value: nearestLevel() }], region: locked };
    if (locked === "spectrum" || (!locked && layout.spectrum.height > 0 && inside(layout.spectrum))) {
      const lower = Math.round(num(results.lower, 2));
      const Z = Math.round(num(results.Z, 1));
      let best = lower + 1;
      for (let n = lower + 1; n <= MAX_LEVEL; n++) {
        if (Math.abs(wavelengthX(layout, lineWavelength(n, lower, Z)) - x) < Math.abs(wavelengthX(layout, lineWavelength(best, lower, Z)) - x)) best = n;
      }
      return { writes: [{ variable: "upper", value: best }], region: "spectrum", press: "jump" };
    }
    if (locked || !inside(layout.levels)) return null;
    // Grab whichever end of the arrow is nearer the pointer.
    const toUpper = Math.abs(levelY(layout, num(results.upper, 3)) - y);
    const toLower = Math.abs(levelY(layout, num(results.lower, 2)) - y);
    const end = toUpper <= toLower ? "upper" : "lower";
    return { writes: [{ variable: end, value: nearestLevel() }], region: end, press: "jump" };
  },
};
