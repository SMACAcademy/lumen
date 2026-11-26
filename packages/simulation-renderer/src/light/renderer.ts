/**
 * Light in straight lines, seen from the side.
 *
 * Shadow: a lamp, a card and a screen; two rays graze the card's edges and
 * carry straight on, and the shadow fills the space between them. Pinhole:
 * rays from a candle cross at a tiny hole and land upside down on the back of
 * the box. Mirror: a ray comes in at an angle to the normal and leaves at the
 * same angle, and an object's image stands as far behind the glass as the
 * object stands in front.
 */

import { MATERIAL_ORDER, MEDIUM_ORDER, SCENE_ORDER } from "@ise/physics-engine";
import type { Rect } from "@ise/graph-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { SimulationRenderer } from "../types";

export interface LightLayout {
  width: number;
  height: number;
  compact: boolean;
  scene: Rect;
}

export function computeLightLayout(width: number): LightLayout {
  const compact = width < 560;
  const pad = compact ? 12 : 28;
  const scene = { x: pad, y: 20, width: width - 2 * pad, height: compact ? 250 : 290 };
  return { width, height: Math.ceil(scene.y + scene.height + 44), compact, scene };
}

/** Pixels per centimetre along the bench, and up and down. */
export function lightScale(layout: LightLayout, sceneIndex: number): { sx: number; sy: number } {
  // The pinhole and the lens have the bench on both sides of the middle.
  const wide = sceneIndex === 1 || sceneIndex === 4;
  const across = wide ? 200 : 105;
  const sx = (layout.scene.width - 30) / across;
  // Up and down, fit ±40 cm; the pinhole's bench is twice as long, so it is not tied to the width.
  const fit = (layout.scene.height / 2 - 18) / 40;
  const sy = wide ? fit : Math.min(sx * 1.4, fit);
  return { sx, sy };
}

const DEG = Math.PI / 180;

export const lightRenderer: SimulationRenderer<LightLayout> = {
  id: "light",
  layout: (width) => computeLightLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { scene } = layout;
    ctx.clearRect(0, 0, layout.width, layout.height);

    const sceneIndex = Math.round(num(results.scene));
    const sceneId = SCENE_ORDER[sceneIndex] ?? "shadow";
    const d = num(results.objectDistance, 30);
    const D = num(results.screenDistance, 80);
    const h = num(results.objectHeight, 10);
    const H = num(results.imageHeight, (h * D) / d);
    const darkness = num(results.darkness);
    const material = MATERIAL_ORDER[Math.round(num(results.material))] ?? "opaque";
    const { sx, sy } = lightScale(layout, sceneIndex);
    const cy = scene.y + scene.height / 2;
    const top = scene.y + 6;
    const bottom = scene.y + scene.height - 6;
    const bold = { color: theme.text, font: theme.fontStrong };

    const lamp = (x: number, y: number) => {
      ctx.save();
      ctx.fillStyle = theme.angle;
      for (let ring = 3; ring >= 1; ring--) {
        ctx.globalAlpha = 0.12 * (4 - ring);
        ctx.beginPath();
        ctx.arc(x, y, 6 + ring * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    const ray = (x1: number, y1: number, x2: number, y2: number, alpha = 0.85) => {
      ctx.save();
      ctx.strokeStyle = theme.angle;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.75;
      segment(ctx, x1, y1, x2, y2);
      ctx.restore();
    };

    if (sceneId === "shadow") {
      const lx = scene.x + 16;
      const ox = lx + d * sx;
      const screenX = lx + D * sx;
      const half = (h / 2) * sy;
      const shadowTop = clamp(cy - (H / 2) * sy, top, bottom);
      const shadowBottom = clamp(cy + (H / 2) * sy, top, bottom);

      if (has("scene")) {
        // The screen, lit where the shadow is not.
        ctx.save();
        ctx.fillStyle = theme.angle;
        ctx.globalAlpha = 0.55;
        ctx.fillRect(screenX, top, 14, bottom - top);
        if (darkness > 0) {
          // The shadow: the lit screen dimmed by how much light the object stops.
          ctx.globalAlpha = 1;
          ctx.fillStyle = theme.background;
          ctx.fillRect(screenX, shadowTop, 14, shadowBottom - shadowTop);
          ctx.globalAlpha = 0.55 * (1 - darkness);
          ctx.fillStyle = theme.angle;
          ctx.fillRect(screenX, shadowTop, 14, shadowBottom - shadowTop);
        }
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(screenX, top, 14, bottom - top);
        // The object: solid, frosted or clear.
        ctx.fillStyle = theme.neutral;
        ctx.globalAlpha = material === "opaque" ? 1 : material === "translucent" ? 0.45 : 0.08;
        ctx.fillRect(ox - 3, cy - half, 6, 2 * half);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.text;
        ctx.strokeRect(ox - 3, cy - half, 6, 2 * half);
        ctx.restore();
        lamp(lx, cy);
      }
      if (has("rays")) {
        // Rays grazing the top and bottom edges, carried straight on to the screen.
        const edge = (dir: 1 | -1) => {
          const yAtObject = cy + dir * half;
          const yAtScreen = cy + dir * (H / 2) * sy;
          const clampedT = Math.abs(yAtScreen - cy) > bottom - cy ? (bottom - cy) / Math.abs(yAtScreen - cy) : 1;
          ray(lx, cy, ox, yAtObject);
          ray(ox, yAtObject, lx + (screenX - lx) * clampedT, cy + (yAtScreen - cy) * clampedT, material === "opaque" ? 0.35 : 0.85);
        };
        edge(-1);
        edge(1);
      }
      if (has("labels")) {
        label(ctx, "lamp", lx, cy + 26, { color: theme.muted, font: theme.font, align: "center" });
        const word = darkness === 0 ? "no shadow" : `shadow ${formatNumber(H, 0)} cm${H * sy > bottom - top ? " (taller than the screen)" : ""}`;
        label(ctx, word, clamp(screenX, scene.x + 90, scene.x + scene.width - 4), layout.height - 18, { ...bold, align: "right" });
        label(ctx, `${formatNumber(d, 0)} cm from the lamp`, ox, bottom + 16, { color: theme.muted, font: theme.font, align: "center" });
      }
    } else if (sceneId === "pinhole") {
      const hole = scene.x + scene.width / 2;
      const candleX = hole - d * sx;
      const screenX = hole + D * sx;
      const flameY = cy - h * sy;
      const imageY = clamp(cy + H * sy, top, bottom);
      if (has("scene")) {
        ctx.save();
        // The box, with the hole in its front and the screen at its back.
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 2;
        segment(ctx, hole, top, hole, cy - 4);
        segment(ctx, hole, cy + 4, hole, bottom);
        ctx.strokeRect(hole, top, screenX - hole, bottom - top);
        ctx.fillStyle = theme.angle;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(screenX - 6, top, 6, bottom - top);
        ctx.globalAlpha = 1;
        // The candle, and its upside-down image.
        ctx.fillStyle = theme.neutral;
        ctx.fillRect(candleX - 5, flameY + 8, 10, cy - flameY - 8);
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.arc(candleX, flameY + 4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = theme.neutral;
        ctx.fillRect(screenX - 10, cy, 6, Math.max(0, imageY - cy - 8));
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.arc(screenX - 7, imageY - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (has("rays")) {
        ray(candleX, flameY, screenX - 6, imageY);
        ray(candleX, cy, screenX - 6, cy);
      }
      if (has("labels")) {
        label(ctx, "pinhole", hole, top - 8, { color: theme.muted, font: theme.font, align: "center" });
        label(ctx, `image upside down, ${formatNumber(H, 0)} cm`, scene.x + scene.width, layout.height - 18, { ...bold, align: "right" });
      }
    } else if (sceneId === "refraction") {
      // A flat surface across the middle: air above, the medium below.
      const px = scene.x + scene.width / 2;
      const i = num(results.incidence) * DEG;
      const r = num(results.refracted) * DEG;
      const reach = Math.min(scene.height / 2 - 12, scene.width / 2 - 20);
      const medium = MEDIUM_ORDER[Math.round(num(results.medium))] ?? "glass";
      if (has("scene")) {
        ctx.save();
        ctx.fillStyle = theme.sine;
        ctx.globalAlpha = 0.16;
        ctx.fillRect(scene.x, cy, scene.width, bottom - cy);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.sine;
        ctx.lineWidth = 2;
        segment(ctx, scene.x, cy, scene.x + scene.width, cy);
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        segment(ctx, px, top, px, bottom);
        ctx.setLineDash([]);
        ctx.restore();
      }
      if (has("rays")) {
        arrow(ctx, px - reach * Math.sin(i), cy - reach * Math.cos(i), px, cy, { color: theme.angle, width: 1.75, head: 9 });
        arrow(ctx, px, cy, px + reach * Math.sin(r), cy + reach * Math.cos(r), { color: theme.angle, width: 1.75, head: 9 });
        ctx.save();
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(px, cy, 34, -Math.PI / 2 - i, -Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, cy, 40, Math.PI / 2 - r, Math.PI / 2);
        ctx.stroke();
        ctx.restore();
      }
      if (has("labels")) {
        label(ctx, "air", scene.x + 8, top + 10, { color: theme.muted, font: theme.font });
        label(ctx, `${medium} (n = ${formatNumber(num(results.index), 2)})`, scene.x + 8, bottom - 10, { color: theme.muted, font: theme.font });
        label(ctx, `i = ${formatNumber(num(results.incidence), 0)}°`, px - 42, cy - 50, { ...bold, align: "right" });
        label(ctx, `r = ${formatNumber(num(results.refracted), 0)}°`, px + 42, cy + 50, bold);
        const words = num(results.incidence) === 0 ? "Straight along the normal: no bending" : "It bends towards the normal as it slows down";
        label(ctx, words, scene.x + scene.width / 2, layout.height - 18, { color: theme.text, font: theme.font, align: "center" });
      }
    } else if (sceneId === "lens") {
      // A convex lens in the middle, the principal axis through it, F on both sides.
      const lensX = scene.x + scene.width / 2;
      const f = num(results.focal, 10);
      const u = d;
      const v = num(results.lensImage, 15);
      // Scale to what is on the bench — the object, the image and 2F — so a phone still shows it all.
      const reach = Math.max(u, Math.min(Math.abs(v), 150), 2 * f) * 1.1;
      const sx = (scene.width / 2 - 12) / reach;
      const m = num(results.lensMagnification, 1);
      const real = num(results.real) === 1;
      const objX = lensX - u * sx;
      const objTop = cy - h * sy;
      const imgX = clamp(lensX + v * sx, scene.x + 4, scene.x + scene.width - 4);
      const imgTip = clamp(real ? cy + h * m * sy : cy - h * m * sy, top, bottom);
      if (has("scene")) {
        ctx.save();
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1;
        segment(ctx, scene.x, cy, scene.x + scene.width, cy);
        ctx.strokeStyle = theme.sine;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(lensX, cy, 8, scene.height / 2 - 14, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = theme.text;
        for (const fx of [lensX - f * sx, lensX + f * sx]) {
          ctx.beginPath();
          ctx.arc(fx, cy, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        arrow(ctx, objX, cy, objX, objTop, { color: theme.tangent, width: 3, head: 9 });
        arrow(ctx, imgX, cy, imgX, imgTip, { color: theme.cosine, width: 3, head: 9, dash: real ? undefined : [5, 4] });
      }
      if (has("rays")) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(scene.x, top, scene.width, bottom - top);
        ctx.clip();
        // One ray parallel to the axis, bent through F; one straight through the middle.
        ray(objX, objTop, lensX, objTop);
        const slope = (cy - objTop) / (f * sx);
        const farX = scene.x + scene.width;
        ray(lensX, objTop, farX, objTop + slope * (farX - lensX));
        ray(objX, objTop, farX, cy + ((cy - objTop) / (lensX - objX)) * (farX - lensX));
        if (!real) {
          // Traced back, the rays seem to come from the virtual image.
          ctx.save();
          ctx.setLineDash([4, 4]);
          ray(lensX, objTop, imgX, imgTip, 0.5);
          ray(objX, objTop, imgX, imgTip, 0.5);
          ctx.restore();
        }
        ctx.restore();
      }
      if (has("labels")) {
        label(ctx, "F", lensX - f * sx, cy + 16, { color: theme.muted, font: theme.font, align: "center" });
        label(ctx, "F", lensX + f * sx, cy + 16, { color: theme.muted, font: theme.font, align: "center" });
        const size = m > 1.02 ? "bigger" : m < 0.98 ? "smaller" : "the same size";
        const words = real
          ? `Real image, upside down, ${formatNumber(v, 0)} cm behind the lens, ${size}`
          : v >= 999
            ? "At F: the rays come out parallel — no image"
            : `Virtual image, upright and ${size}, on the object's side`;
        label(ctx, words, scene.x + scene.width / 2, layout.height - 18, { color: theme.text, font: theme.font, align: "center" });
      }
    } else {
      const mirrorX = scene.x + scene.width * 0.62;
      const angle = num(results.incidence, 30) * DEG;
      const reach = Math.min(scene.height / 2 - 10, mirrorX - scene.x - 20);
      const inX = mirrorX - reach * Math.cos(angle);
      const inY = cy - reach * Math.sin(angle);
      const outY = cy + reach * Math.sin(angle);
      if (has("scene")) {
        ctx.save();
        ctx.strokeStyle = theme.sine;
        ctx.lineWidth = 4;
        segment(ctx, mirrorX, top, mirrorX, bottom);
        ctx.strokeStyle = theme.muted;
        ctx.lineWidth = 1;
        for (let y = top; y < bottom; y += 10) segment(ctx, mirrorX + 2, y, mirrorX + 9, y + 7);
        // The normal: square to the mirror where the ray lands.
        ctx.setLineDash([5, 5]);
        segment(ctx, mirrorX - reach, cy, mirrorX, cy);
        ctx.setLineDash([]);
        ctx.restore();
        // An object in front, its image behind: the same distance each side.
        const u = num(results.imageDistance, d) * sx * 0.55;
        const baseY = bottom - 14;
        ctx.save();
        ctx.fillStyle = theme.tangent;
        ctx.beginPath();
        ctx.arc(mirrorX - u, baseY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(mirrorX + Math.min(u, scene.x + scene.width - mirrorX - 8), baseY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (has("rays")) {
        // Arrowheads say which way the light goes: in to the mirror, then out.
        arrow(ctx, inX, inY, mirrorX, cy, { color: theme.angle, width: 1.75, head: 9 });
        arrow(ctx, mirrorX, cy, inX, outY, { color: theme.angle, width: 1.75, head: 9 });
        ctx.save();
        ctx.strokeStyle = theme.text;
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.arc(mirrorX, cy, 34, Math.PI, Math.PI + angle);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mirrorX, cy, 40, Math.PI - angle, Math.PI);
        ctx.stroke();
        ctx.restore();
      }
      if (has("labels")) {
        const deg = formatNumber(num(results.incidence), 0);
        label(ctx, `i = ${deg}°`, mirrorX - 54, cy - 18, { ...bold, align: "right" });
        label(ctx, `r = ${deg}°`, mirrorX - 54, cy + 18, { ...bold, align: "right" });
        label(ctx, `object ${formatNumber(num(results.imageDistance, d), 0)} cm in front · image ${formatNumber(num(results.imageDistance, d), 0)} cm behind`, scene.x + scene.width / 2, layout.height - 18, {
          color: theme.muted,
          font: theme.font,
          align: "center",
        });
      }
    }
  },
};
