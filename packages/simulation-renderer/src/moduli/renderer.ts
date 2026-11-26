/**
 * Three ways to deform a solid.
 *
 * Squeeze: a cube seen face-on with a pressure arrow on every side; the
 * dashed square is where it started.
 *
 * Shear: the same cube from the side, base held on a hatched floor, a force
 * along the top face. Its layers slide over one another like the pages of a
 * book, and the angle θ opens at the fixed corner.
 *
 * Stretch: a piece of wire pulled from both ends grows longer and thinner.
 *
 * The real changes are microscopic, so the change is drawn magnified by a
 * stated power of ten. Below, the materials side by side on the modulus that
 * matters for the setup. Numbers that a level asks for appear only with the
 * labels layer.
 */

import { MODULI_MATERIAL_ORDER, MODULI_MATERIALS, MODULI_SETUP_ORDER } from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface ModuliLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where the specimen is drawn. */
  picture: Box;
  /** The materials compared, one row each. */
  compare: Box;
}

export function computeModuliLayout(width: number): ModuliLayout {
  const compact = width < 560;
  const height = 390;
  return {
    width,
    height,
    compact,
    picture: { x: 16, y: 28, width: width - 32, height: 190 },
    compare: { x: 16, y: 226, width: width - 32, height: 108 },
  };
}

const SUPERSCRIPT: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** Three significant figures, with a power of ten for very small or large numbers. */
export function moduliFigures(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 0.01 && a < 1e4) {
    const digits = Math.max(0, 2 - Math.floor(Math.log10(a)));
    return sign + a.toFixed(digits);
  }
  const power = Math.floor(Math.log10(a));
  let mantissa = a / 10 ** power;
  let p = power;
  if (Number(mantissa.toFixed(2)) >= 10) {
    mantissa /= 10;
    p += 1;
  }
  const sup = String(p).split("").map((c) => SUPERSCRIPT[c] ?? c).join("");
  return `${sign}${mantissa.toFixed(2)} × 10${sup}`;
}

/** The power of ten the change is drawn magnified by, so that it shows without swamping the shape. */
export function moduliMagnification(strain: number, most = 0.25): number {
  if (!(strain > 0)) return 1;
  const k = Math.floor(Math.log10(most / strain));
  return k <= 0 ? 1 : 10 ** Math.min(k, 6);
}

const magnifiedNote = (m: number) => (m > 1 ? `change drawn ×${m >= 1e4 ? `10${String(Math.log10(m)).split("").map((c) => SUPERSCRIPT[c] ?? c).join("")}` : m}` : "true scale");

function outline(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[], colour: string, lineWidth: number, fill?: string, dash?: number[]) {
  ctx.save();
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.globalAlpha = 0.25;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, colour: string, lineWidth = 1.5, dash?: number[]) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

const square = (cx: number, cy: number, side: number) =>
  [[cx - side / 2, cy - side / 2], [cx + side / 2, cy - side / 2], [cx + side / 2, cy + side / 2], [cx - side / 2, cy + side / 2]] as const;

/** One row per material: its name, a bar, and (with labels) the value. */
function drawCompare(
  ctx: CanvasRenderingContext2D,
  box: Box,
  theme: LabTheme,
  current: number,
  heading: string,
  value: (id: (typeof MODULI_MATERIAL_ORDER)[number]) => { fraction: number; text: string },
  showValues: boolean,
) {
  label(ctx, heading, box.x, box.y + 4, { color: theme.muted, font: theme.font });
  const rowH = (box.height - 14) / MODULI_MATERIAL_ORDER.length;
  const nameW = 70;
  const valueW = showValues ? 64 : 0;
  const barX = box.x + nameW;
  const barW = Math.max(20, box.width - nameW - valueW - 6);
  MODULI_MATERIAL_ORDER.forEach((id, i) => {
    const y = box.y + 14 + i * rowH + rowH / 2;
    const on = i === current;
    const { fraction, text } = value(id);
    label(ctx, MODULI_MATERIALS[id].label, box.x, y, { color: on ? theme.text : theme.muted, font: on ? theme.fontStrong : theme.font });
    ctx.save();
    ctx.fillStyle = on ? theme.curve : theme.reference;
    ctx.globalAlpha = on ? 0.9 : 0.55;
    ctx.fillRect(barX, y - 4, Math.max(1, Math.min(1, fraction) * barW), 8);
    ctx.restore();
    if (showValues) label(ctx, text, box.x + box.width, y, { color: on ? theme.text : theme.muted, font: theme.font, align: "right" });
  });
}

export const moduliRenderer: SimulationRenderer<ModuliLayout> = {
  id: "moduli",
  layout: (width) => computeModuliLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { width, height, picture, compare } = layout;
    ctx.clearRect(0, 0, width, height);
    const setup = MODULI_SETUP_ORDER[Math.round(num(results.setup))] ?? "squeeze";
    const index = Math.round(num(results.material));
    const id = MODULI_MATERIAL_ORDER[index] ?? "steel";
    const material = MODULI_MATERIALS[id];
    const name = material.label.toLowerCase();
    const fluid = num(results.fluid) === 1;
    const showValues = has("labels");
    const title = (words: string) => label(ctx, words, width / 2, 12, { color: theme.text, font: theme.fontStrong, align: "center" });
    const caption = (words: string, row: 0 | 1) => label(ctx, words, width / 2, height - (row === 0 ? 34 : 14), { color: theme.text, font: theme.font, align: "center" });
    const note = (words: string) => label(ctx, words, picture.x + picture.width, picture.y + picture.height - 6, { color: theme.muted, font: theme.font, align: "right" });
    const cx = picture.x + picture.width / 2;
    const cy = picture.y + picture.height / 2;
    const side = Math.min(118, picture.height - 56, picture.width - 110);
    const size = num(results.size, 10);

    if (setup === "squeeze") {
      const p = num(results.pressure);
      const compression = num(results.compression);
      // The side shrinks by the cube root of the volume's shrink.
      const linear = 1 - Math.cbrt(Math.max(0, 1 - compression));
      const m = moduliMagnification(linear);
      const drawn = side * (1 - Math.min(0.9, linear * m));
      title(`A ${size} cm cube of ${name}, pressed on every face`);
      if (has("original")) outline(ctx, square(cx, cy, side), theme.muted, 1.2, undefined, [4, 4]);
      if (has("body")) outline(ctx, square(cx, cy, drawn), theme.axis, 2, fluid ? theme.sine : theme.neutral);
      if (has("forces") && p > 0) {
        const len = 12 + 24 * Math.min(1, p / 100);
        const gap = 6;
        const h = drawn / 2;
        for (const k of [-0.25, 0.25]) {
          arrow(ctx, cx - h - gap - len, cy + k * drawn, cx - h - gap, cy + k * drawn, { color: theme.cosine, width: 2, head: 7 });
          arrow(ctx, cx + h + gap + len, cy + k * drawn, cx + h + gap, cy + k * drawn, { color: theme.cosine, width: 2, head: 7 });
          arrow(ctx, cx + k * drawn, cy - h - gap - len, cx + k * drawn, cy - h - gap, { color: theme.cosine, width: 2, head: 7 });
          arrow(ctx, cx + k * drawn, cy + h + gap + len, cx + k * drawn, cy + h + gap, { color: theme.cosine, width: 2, head: 7 });
        }
        label(ctx, "Δp", cx - h - gap - len - 4, cy - drawn * 0.25 - 12, { color: theme.cosine, font: theme.fontStrong, align: "center" });
      }
      if (has("body")) note(magnifiedNote(m));
      if (has("compare")) {
        // Compressibility 1/B on a logarithmic bar, from 10⁻³ to 10⁵ per GPa.
        drawCompare(ctx, compare, theme, index, "compressibility 1/B, per GPa (log scale)", (mid) => {
          const k = 1e9 / MODULI_MATERIALS[mid].bulk;
          return { fraction: (Math.log10(k) + 3) / 8, text: moduliFigures(k) };
        }, showValues);
      }
      if (showValues) {
        caption(`Δp ${p.toFixed(1)} MPa · B ${moduliFigures(num(results.measuredBulkGPa))} GPa`, 0);
        caption(`volume down ${moduliFigures(num(results.compressionPercent))}% (${moduliFigures(num(results.volumeDecrease))} cm³)`, 1);
      }
      return;
    }

    if (setup === "shear") {
      const F = num(results.shearForce);
      const strain = num(results.shearStrain);
      const m = moduliMagnification(strain, 0.35);
      const shift = side * Math.min(0.6, strain * m);
      const floor = cy + side / 2;
      const left = cx - side / 2;
      title(`A ${size} cm cube of ${name}, base held, top pushed`);
      // The floor the base is fixed to.
      line(ctx, left - 24, floor, left + side + 24, floor, theme.neutral, 3);
      for (let x = left - 20; x < left + side + 24; x += 10) line(ctx, x, floor + 2, x - 7, floor + 10, theme.muted, 1);
      if (has("original")) outline(ctx, square(cx, cy, side), theme.muted, 1.2, undefined, [4, 4]);
      if (has("body")) {
        if (fluid) {
          outline(ctx, square(cx, cy, side), theme.axis, 1.5, theme.sine);
          caption(`${material.label} has no shear modulus: it flows`, 0);
        } else {
          const corners = [[left, floor], [left + side, floor], [left + side + shift, floor - side], [left + shift, floor - side]] as const;
          outline(ctx, corners, theme.axis, 2, theme.neutral);
          // The book-stack: each layer slides a little more than the one below.
          for (let k = 1; k < 6; k++) {
            const y = floor - (side * k) / 6;
            const dx = (shift * k) / 6;
            line(ctx, left + dx, y, left + side + dx, y, theme.muted, 1);
          }
          if (shift > 6) {
            // θ at the fixed corner, between the upright and the slanted side.
            ctx.save();
            ctx.strokeStyle = theme.angle;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(left, floor, 34, -Math.PI / 2, -Math.PI / 2 + Math.atan2(shift, side));
            ctx.stroke();
            ctx.restore();
            line(ctx, left, floor, left, floor - side, theme.angle, 1, [3, 3]);
            label(ctx, "θ", left + 8, floor - 44, { color: theme.angle, font: theme.fontStrong });
            label(ctx, "Δx", left + side + shift / 2, floor - side - 10, { color: theme.angle, font: theme.fontStrong, align: "center" });
          }
        }
      }
      if (has("forces") && F > 0) {
        const len = 18 + 40 * Math.min(1, F / 100);
        const x0 = left + (fluid ? 0 : shift) + side / 2 - len / 2;
        arrow(ctx, x0, floor - side - 26, x0 + len, floor - side - 26, { color: theme.cosine, width: 2.5, head: 8 });
        label(ctx, "F", x0 - 8, floor - side - 26, { color: theme.cosine, font: theme.fontStrong, align: "right" });
      }
      if (has("body") && !fluid) note(magnifiedNote(m));
      if (has("compare")) {
        drawCompare(ctx, compare, theme, index, "shear modulus G, GPa", (mid) => {
          const g = MODULI_MATERIALS[mid].shear / 1e9;
          return { fraction: g / 90, text: g > 0 ? moduliFigures(g) : "flows" };
        }, showValues);
      }
      if (showValues && !fluid) {
        caption(`F/A ${moduliFigures(num(results.shearStress))} MPa · θ ${moduliFigures(strain)} rad`, 0);
        caption(`top slides Δx = ${moduliFigures(num(results.shearDisplacement))} µm`, 1);
      }
      return;
    }

    // Stretch.
    const strain = num(results.longStrain);
    const lateral = num(results.lateralStrain);
    const m = moduliMagnification(strain, 0.3);
    const L0 = Math.min(picture.width - 120, 200);
    const D0 = 46;
    const Ld = L0 * (1 + Math.min(0.5, strain * m));
    const Dd = D0 * (1 - Math.min(0.5, lateral * m));
    const diameter = num(results.diameter, 1);
    const wireLength = num(results.length, 1);
    title(`A ${diameter.toFixed(1)} mm ${name} wire, ${wireLength.toFixed(1)} m long, pulled`);
    if (has("original")) outline(ctx, [[cx - L0 / 2, cy - D0 / 2], [cx + L0 / 2, cy - D0 / 2], [cx + L0 / 2, cy + D0 / 2], [cx - L0 / 2, cy + D0 / 2]], theme.muted, 1.2, undefined, [4, 4]);
    if (has("body")) {
      if (fluid) {
        caption(`${material.label} cannot be pulled into a wire`, 0);
      } else {
        outline(ctx, [[cx - Ld / 2, cy - Dd / 2], [cx + Ld / 2, cy - Dd / 2], [cx + Ld / 2, cy + Dd / 2], [cx - Ld / 2, cy + Dd / 2]], theme.axis, 2, theme.neutral);
        label(ctx, "l", cx, cy - D0 / 2 - 12, { color: theme.tangent, font: theme.fontStrong, align: "center" });
        label(ctx, "d", cx - L0 / 2 + 10, cy, { color: theme.angle, font: theme.fontStrong });
        note(`a short piece, ${magnifiedNote(m)}`);
      }
    }
    if (has("forces") && !fluid && num(results.tension) > 0) {
      const len = 14 + 26 * Math.min(1, num(results.tension) / 300);
      arrow(ctx, cx + Ld / 2 + 4, cy, cx + Ld / 2 + 4 + len, cy, { color: theme.cosine, width: 2.5, head: 8 });
      arrow(ctx, cx - Ld / 2 - 4, cy, cx - Ld / 2 - 4 - len, cy, { color: theme.cosine, width: 2.5, head: 8 });
      label(ctx, "F", cx + Ld / 2 + 8, cy - 14, { color: theme.cosine, font: theme.fontStrong });
    }
    if (!fluid && num(results.overLimit) === 1) {
      label(ctx, "past the elastic limit: Hooke's law fails", cx, picture.y + 12, { color: theme.secant, font: theme.font, align: "center" });
    }
    if (has("compare")) {
      drawCompare(ctx, compare, theme, index, "Poisson's ratio σ (0 to 0.5)", (mid) => {
        const s = MODULI_MATERIALS[mid].poisson;
        return { fraction: s / 0.5, text: MODULI_MATERIALS[mid].fluid ? "—" : s.toFixed(2) };
      }, showValues);
    }
    if (showValues && !fluid) {
      caption(`Δl/l ${moduliFigures(strain)} · Δd/d ${moduliFigures(lateral)} · σ ${num(results.measuredPoisson).toFixed(2)}`, 0);
      caption(`thinner by ${moduliFigures(num(results.diameterDecrease))} µm · volume up ${moduliFigures(num(results.wireVolumeStrain) * 100)}%`, 1);
    }
  },
};
