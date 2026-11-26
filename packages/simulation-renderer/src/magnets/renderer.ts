/**
 * Bar magnets, a thing to test, and a compass.
 *
 * The first magnet sits on the left; its partner — a second magnet or a small
 * object — sits across the gap, with arrows showing the pull or push. A
 * magnetic object close enough jumps across and sticks. Around the first
 * magnet, faint field loops run from N to S, and a compass needle lines up
 * with them wherever it is placed.
 */

import { FACING_ORDER, MAGNET_MATERIAL_ORDER, MAGNET_MATERIALS, MAX_GAP, PARTNER_ORDER } from "@ise/physics-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface MagnetsLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Centre of the first magnet. */
  center: { x: number; y: number };
  length: number;
  thickness: number;
  /** Pixels per centimetre of gap. */
  scale: number;
  /** Radius of the compass's path round the magnet. */
  orbit: number;
}

export function computeMagnetsLayout(width: number): MagnetsLayout {
  const compact = width < 560;
  const length = compact ? 96 : 130;
  const thickness = compact ? 26 : 32;
  const center = { x: compact ? width * 0.3 : width * 0.32, y: compact ? 150 : 170 };
  const scale = Math.max(4, (width - (center.x + length / 2) - length - 16) / MAX_GAP);
  return { width, height: compact ? 320 : 360, compact, center, length, thickness, scale, orbit: length / 2 + (compact ? 48 : 64) };
}

const N_COLOUR = "#ef4444";
const S_COLOUR = "#3b82f6";

/** A bar magnet with its left half one pole and its right half the other. */
function bar(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, thickness: number, leftPole: "N" | "S", theme: LabTheme) {
  const half = length / 2;
  ctx.save();
  ctx.fillStyle = leftPole === "N" ? N_COLOUR : S_COLOUR;
  ctx.fillRect(x - half, y - thickness / 2, half, thickness);
  ctx.fillStyle = leftPole === "N" ? S_COLOUR : N_COLOUR;
  ctx.fillRect(x, y - thickness / 2, half, thickness);
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - half, y - thickness / 2, length, thickness);
  ctx.restore();
  const font = theme.fontStrong;
  label(ctx, leftPole, x - half / 2, y, { color: "#ffffff", font, align: "center" });
  label(ctx, leftPole === "N" ? "S" : "N", x + half / 2, y, { color: "#ffffff", font, align: "center" });
}

export const magnetsRenderer: SimulationRenderer<MagnetsLayout> = {
  id: "magnets",
  layout: (width) => computeMagnetsLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { center, length, thickness, scale, orbit } = layout;
    ctx.clearRect(0, 0, layout.width, layout.height);

    const facing = FACING_ORDER[Math.round(num(results.facing))] ?? "N-S";
    const partner = PARTNER_ORDER[Math.round(num(results.partner))] ?? "magnet";
    const materialId = MAGNET_MATERIAL_ORDER[Math.round(num(results.material))] ?? "iron";
    const gap = num(results.gap, 8);
    const force = num(results.force);
    const pulled = num(results.pulled) === 1;
    // The first magnet shows N to the right, unless the two S poles face each other.
    const aLeft: "N" | "S" = facing === "S-S" ? "N" : "S";
    const aRight = aLeft === "N" ? "S" : "N";
    const rightEnd = center.x + length / 2;

    if (has("field")) {
      // Field loops from N round to S, above and below.
      const nX = aRight === "N" ? rightEnd : center.x - length / 2;
      const sX = aRight === "N" ? center.x - length / 2 : rightEnd;
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      for (const spread of [26, 52, 82]) {
        for (const sign of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(nX, center.y);
          ctx.bezierCurveTo(nX + (nX - sX) * 0.35, center.y + sign * spread * 1.6, sX - (nX - sX) * 0.35, center.y + sign * spread * 1.6, sX, center.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    if (has("magnet")) bar(ctx, center.x, center.y, length, thickness, aLeft, theme);

    if (has("partner")) {
      if (partner === "magnet") {
        // The second magnet's left end faces the first magnet's right end.
        const facingPole = facing === "N-S" ? "S" : facing === "N-N" ? "N" : "S";
        const bx = rightEnd + gap * scale + length / 2;
        bar(ctx, bx, center.y, length, thickness, facingPole, theme);
        const push = clamp(Math.abs(force) * 60, 14, 70);
        const dir = force > 0 ? -1 : 1;
        arrow(ctx, bx, center.y - thickness, bx + dir * push, center.y - thickness, { color: force > 0 ? theme.tangent : theme.cosine, width: 3, head: 10 });
      } else {
        const material = MAGNET_MATERIALS[materialId];
        const size = 24;
        const ox = pulled ? rightEnd + size / 2 + 1 : rightEnd + gap * scale + size / 2;
        ctx.save();
        ctx.fillStyle = material.magnetic ? theme.neutral : theme.secant;
        ctx.fillRect(ox - size / 2, center.y - size / 2, size, size);
        ctx.strokeStyle = theme.text;
        ctx.strokeRect(ox - size / 2, center.y - size / 2, size, size);
        ctx.restore();
        label(ctx, material.label, ox, center.y + size / 2 + 14, { color: theme.text, font: theme.font, align: "center" });
      }
    }

    if (has("compass")) {
      const phi = (num(results.around) * Math.PI) / 180;
      // "around" is measured from the N end of the first magnet.
      const nSide = aRight === "N" ? 1 : -1;
      const cx = center.x + nSide * orbit * Math.cos(phi);
      const cy = center.y - orbit * Math.sin(phi);
      const needle = (num(results.needle) * Math.PI) / 180;
      const nx = nSide * Math.cos(needle);
      const ny = -Math.sin(needle);
      const r = layout.compact ? 16 : 20;
      ctx.save();
      ctx.fillStyle = theme.surface;
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = N_COLOUR;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + nx * (r - 3), cy + ny * (r - 3));
      ctx.stroke();
      ctx.strokeStyle = theme.muted;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - nx * (r - 3), cy - ny * (r - 3));
      ctx.stroke();
      ctx.restore();
    }

    if (has("labels")) {
      let words = "";
      if (has("partner") && partner === "magnet") words = force > 0 ? `${facing.replace("-", " faces ")}: they pull together` : `${facing.replace("-", " faces ")}: they push apart`;
      else if (has("partner")) {
        const material = MAGNET_MATERIALS[materialId];
        words = !material.magnetic ? `${material.label} is not magnetic: nothing happens` : pulled ? `${material.label} is magnetic: it jumps to the magnet` : `${material.label} is magnetic, but too far away to jump`;
      } else if (has("compass")) words = "The red end of the needle lines up with the magnet's field";
      if (words) label(ctx, words, layout.width / 2, layout.height - 18, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
