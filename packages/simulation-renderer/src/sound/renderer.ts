/**
 * A loudspeaker, the particles it pushes, and a wall to bounce off.
 *
 * In front of the speaker, rows of particles swing back and forth: where they
 * crowd together is a compression, where they spread out a rarefaction. Below
 * them, a pressure trace rises at every compression, so a higher frequency
 * crowds the crests and a larger amplitude makes them taller. The wavelength
 * drawn follows the real one, squeezed to fit.
 *
 * With the wall showing, a clap goes out as a ring of arcs, bounces, and
 * comes home — the echo — with a clock that stops the moment it arrives.
 */

import { SOUND_MEDIA, SOUND_MEDIUM_ORDER } from "@ise/physics-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface SoundLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Front of the speaker cone. */
  mouth: { x: number; y: number };
  /** Right edge of the medium. */
  right: number;
  /** Half the height of the band of particles. */
  band: number;
  /** Baseline of the pressure trace. */
  traceY: number;
}

export function computeSoundLayout(width: number): SoundLayout {
  const compact = width < 560;
  const height = compact ? 300 : 340;
  const band = compact ? 48 : 60;
  return { width, height, compact, mouth: { x: compact ? 52 : 72, y: band + 36 }, right: width - 16, band, traceY: band * 2 + (compact ? 96 : 116) };
}

/** Speed shown on screen: the particles swing this many times a second whatever the real frequency. */
const SHOWN_HZ = 1.5;

/** How long one wavelength is drawn, px: the real one scaled, kept visible. */
export function shownWavelength(wavelength: number): number {
  return clamp(wavelength * 40, 18, 260);
}

/** The swing phase at `x` px from the speaker at time `t`. */
function phaseAt(x: number, lambda: number, t: number): number {
  return 2 * Math.PI * (x / lambda - SHOWN_HZ * t);
}

function speaker(ctx: CanvasRenderingContext2D, mouth: { x: number; y: number }, size: number, push: number, theme: LabTheme) {
  const back = mouth.x - size * 0.9;
  ctx.save();
  ctx.fillStyle = theme.reference;
  ctx.fillRect(back - size * 0.5, mouth.y - size * 0.3, size * 0.5, size * 0.6);
  ctx.fillStyle = theme.neutral;
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(back, mouth.y - size * 0.3);
  ctx.lineTo(mouth.x + push, mouth.y - size);
  ctx.lineTo(mouth.x + push, mouth.y + size);
  ctx.lineTo(back, mouth.y + size * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

const PITCH_WORD = ["A low", "A middle", "A high"];

export const soundRenderer: SimulationRenderer<SoundLayout> = {
  id: "sound",
  layout: (width) => computeSoundLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { mouth, right, band, traceY, compact } = layout;
    ctx.clearRect(0, 0, layout.width, layout.height);

    const medium = SOUND_MEDIUM_ORDER[Math.round(num(results.medium))] ?? "air";
    const travels = num(results.travels) === 1;
    const t = num(results.t);
    const lambda = shownWavelength(num(results.wavelength));
    const swing = clamp(num(results.amplitude, 5), 0, 10) * (compact ? 0.7 : 0.9);
    const echo = has("wall");
    const push = travels && !echo ? swing * 0.4 * Math.sin(phaseAt(0, lambda, t)) : 0;

    if (has("speaker")) speaker(ctx, mouth, compact ? 22 : 28, push, theme);

    if (has("particles")) {
      if (travels) {
        const gapX = compact ? 9 : 11;
        const rows = 6;
        ctx.save();
        ctx.fillStyle = theme.sine;
        for (let row = 0; row < rows; row++) {
          const y = mouth.y - band + ((row + 0.5) * 2 * band) / rows;
          for (let x0 = gapX; mouth.x + x0 < right; x0 += gapX) {
            const x = mouth.x + x0 + swing * Math.sin(phaseAt(x0, lambda, t));
            ctx.beginPath();
            ctx.arc(x, y, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        ctx.restore();
      } else {
        label(ctx, "Empty space: no particles to pass the vibration on", (mouth.x + right) / 2, mouth.y, { color: theme.muted, font: theme.font, align: "center" });
      }
    }

    if (has("trace") && travels) {
      const height = swing * 3;
      ctx.save();
      ctx.strokeStyle = theme.reference;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mouth.x, traceY);
      ctx.lineTo(right, traceY);
      ctx.stroke();
      ctx.strokeStyle = theme.cosine;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x0 = 0; mouth.x + x0 <= right; x0 += 2) {
        // Particles crowd where their swing changes fastest backwards: pressure peaks there.
        const y = traceY + height * Math.cos(phaseAt(x0, lambda, t));
        if (x0 === 0) ctx.moveTo(mouth.x + x0, y);
        else ctx.lineTo(mouth.x + x0, y);
      }
      ctx.stroke();
      ctx.restore();
      label(ctx, "pressure", mouth.x - 6, traceY, { color: theme.muted, font: theme.font, align: "right" });
      // Mark one wavelength between two neighbouring crests.
      const first = ((((SHOWN_HZ * t) % 1) + 1) % 1) * lambda + lambda / 2;
      if (mouth.x + first + lambda <= right) {
        const y = traceY - height - 12;
        arrow(ctx, mouth.x + first, y, mouth.x + first + lambda, y, { color: theme.angle, width: 1.5, head: 6 });
        label(ctx, "λ", mouth.x + first + lambda / 2, y - 9, { color: theme.angle, font: theme.fontStrong, align: "center" });
      }
    }

    if (echo) {
      const wallX = right - 14;
      const d = num(results.wallDistance, 170);
      ctx.save();
      ctx.fillStyle = theme.reference;
      ctx.fillRect(wallX, mouth.y - band - 10, 14, 2 * band + 20);
      ctx.restore();
      const y = mouth.y + band + 26;
      arrow(ctx, mouth.x, y, wallX, y, { color: theme.muted, width: 1, head: 6 });
      label(ctx, `${Math.round(d)} m`, (mouth.x + wallX) / 2, y + 12, { color: theme.text, font: theme.font, align: "center" });

      const heading = num(results.heading);
      if (travels && heading !== 0) {
        const x = mouth.x + (num(results.pulse) / d) * (wallX - mouth.x);
        const colour = heading > 0 ? theme.sine : theme.cosine;
        ctx.save();
        ctx.strokeStyle = colour;
        ctx.lineWidth = 2.5;
        for (const [i, r] of [14, 24, 34].entries()) {
          ctx.globalAlpha = 1 - i * 0.28;
          ctx.beginPath();
          const back = heading > 0 ? 0 : Math.PI;
          ctx.arc(x - heading * r, mouth.y, r, back - 0.7, back + 0.7);
          ctx.stroke();
        }
        ctx.restore();
      }
      // The clock stops when the echo gets home.
      const clock = `t = ${(num(results.returned) === 1 ? num(results.echoTime) : t).toFixed(2)} s`;
      label(ctx, clock, mouth.x - 8, 16, { color: theme.text, font: theme.fontStrong, align: "left" });
    }

    if (has("labels")) {
      let words: string;
      const mediumLabel = SOUND_MEDIA[medium].label.toLowerCase();
      if (!travels) words = echo ? "No air, no sound: the clap never leaves the speaker" : "Sound cannot travel through a vacuum";
      else if (echo) {
        const echoTime = num(results.echoTime);
        words =
          num(results.echoHeard) === 0
            ? `Too close: the echo is back in ${echoTime.toFixed(2)} s and blurs into the clap`
            : num(results.returned) === 1
              ? `Echo! Back after ${echoTime.toFixed(2)} s — there and back at ${num(results.speed)} m/s`
              : `Through ${mediumLabel} at ${num(results.speed)} m/s: the echo will be back after ${echoTime.toFixed(2)} s`;
      } else {
        const pitch = PITCH_WORD[Math.round(num(results.pitch))] ?? PITCH_WORD[1];
        words = `${pitch} note, ${Math.round(num(results.frequency))} Hz: each wave ${num(results.wavelength).toFixed(2)} m long in ${mediumLabel}`;
      }
      label(ctx, words, layout.width / 2, layout.height - 16, { color: theme.text, font: theme.font, align: "center" });
    }
  },
};
