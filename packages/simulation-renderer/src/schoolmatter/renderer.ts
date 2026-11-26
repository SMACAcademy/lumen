/**
 * Materials, mixtures and particles: seven small benches, one per layer.
 *
 * materials  the object dropped in a tank of water, and a torch shone at it.
 * beaker     solute stirred into water: what dissolves tints the water, the
 *            rest lies at the bottom; beside it, the solubility curve.
 * separate   the mixture, the method, and — with the words — whether it splits.
 * tubes      NCERT's three test tubes, each with a nail; the chosen one ringed.
 * particles  water's particles: in rows, jumbled, or far apart and flying.
 * ink        a drop of ink spreading in a beaker of water.
 * evaporate  an open dish in the sun and wind, and a wet clay pot beside it.
 *
 * Numbers a level asks the learner to estimate (how much can dissolve, how
 * cool the pot gets) are drawn only with the "labels" layer.
 */

import {
  SCHOOL_COATING_ORDER,
  SCHOOL_COATINGS,
  SCHOOL_METHOD_ORDER,
  SCHOOL_METHODS,
  SCHOOL_MIXTURE_ORDER,
  SCHOOL_MIXTURES,
  SCHOOL_OBJECT_ORDER,
  SCHOOL_OBJECTS,
  SCHOOL_SOLUBILITY_TEMPS,
  SCHOOL_SOLUTE_ORDER,
  SCHOOL_SOLUTES,
  SCHOOL_TUBE_ORDER,
  SCHOOL_TUBES,
  schoolRustCover,
  schoolSolubility,
  separationReason,
} from "@ise/chemistry-engine";
import { arrow, clamp, label, num } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

type Box = { x: number; y: number; width: number; height: number };

export interface SchoolMatterLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Where each bench is drawn: between the title and the caption. */
  stage: Box;
}

export function computeSchoolMatterLayout(width: number): SchoolMatterLayout {
  const compact = width < 560;
  const height = compact ? 360 : 380;
  const side = compact ? 16 : 28;
  return { width, height, compact, stage: { x: side, y: 34, width: width - 2 * side, height: height - 34 - 52 } };
}

const WATER = "rgba(56,189,248,0.28)";
const RUST = "#b45309";
const IRON = "#94a3b8";

const fixed = (v: number, digits = 0) => {
  const s = Math.abs(v).toFixed(digits);
  return `${v < 0 && Number(s) !== 0 ? "−" : ""}${s}`;
};

/** The same scatter every frame: a pseudo-random number in [0, 1) for each i. */
const scatter = (i: number) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

function rect(ctx: CanvasRenderingContext2D, b: Box, fill: string | null, stroke: string | null, lineWidth = 1.5, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(b.x, b.y, b.width, b.height);
  }
  ctx.restore();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** An open glass: three sides, no top. */
function glass(ctx: CanvasRenderingContext2D, b: Box, theme: LabTheme) {
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x, b.y + b.height);
  ctx.lineTo(b.x + b.width, b.y + b.height);
  ctx.lineTo(b.x + b.width, b.y);
  ctx.stroke();
  ctx.restore();
}

/** A thermometer from `lo` to `hi` °C, filled to `value`. */
function thermometer(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, value: number, lo: number, hi: number, theme: LabTheme) {
  const f = clamp((value - lo) / (hi - lo), 0, 1);
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - 4, top, 8, bottom - top);
  ctx.fillStyle = theme.secant;
  ctx.fillRect(x - 2, bottom - f * (bottom - top), 4, f * (bottom - top));
  ctx.restore();
  dot(ctx, x, bottom + 6, 7, theme.secant);
}

/** Short words on pills, laid left to right and wrapped to the box. */
function chips(ctx: CanvasRenderingContext2D, words: readonly string[], b: Box, colour: string, theme: LabTheme) {
  let x = b.x;
  let y = b.y;
  for (const w of words) {
    const width = w.length * 6.5 + 14;
    if (x + width > b.x + b.width) {
      x = b.x;
      y += 22;
    }
    label(ctx, w, x + 7, y, { color: colour, font: theme.font, background: theme.surface2 });
    x += width + 8;
  }
}

// ── The benches ──────────────────────────────────────────────────────────────

function drawMaterials(ctx: CanvasRenderingContext2D, s: Box, results: Record<string, unknown>, words: boolean, theme: LabTheme) {
  const id = SCHOOL_OBJECT_ORDER[Math.round(num(results.object))] ?? "nail";
  const object = SCHOOL_OBJECTS[id];
  const floats = num(results.floats) === 1;
  const see = Math.round(num(results.see));
  const lustrous = num(results.lustrous) === 1;
  const colour = lustrous ? IRON : object.material === "glass" ? "rgba(186,230,253,0.55)" : object.material === "paper" ? "rgba(254,243,199,0.6)" : "#a16207";

  const half = (s.width - 16) / 2;
  const top = s.y + 20;
  const h = Math.min(130, s.height - 70);
  // The tank of water.
  const tank = { x: s.x, y: top, width: half, height: h };
  label(ctx, "In water", tank.x + half / 2, s.y + 6, { color: theme.muted, font: theme.font, align: "center" });
  rect(ctx, { x: tank.x, y: tank.y + 20, width: half, height: h - 20 }, WATER, null);
  glass(ctx, tank, theme);
  const ow = Math.min(54, half * 0.45);
  const oh = 22;
  const ox = tank.x + half / 2 - ow / 2;
  const oy = floats ? tank.y + 20 - oh * Math.min(0.9, Math.max(0.1, 1 - object.density)) : tank.y + h - oh - 2;
  rect(ctx, { x: ox, y: oy, width: ow, height: oh }, colour, theme.text, 1);
  if (lustrous) {
    // A glint: lustre.
    ctx.save();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox + 6, oy + 5);
    ctx.lineTo(ox + 16, oy + 5);
    ctx.stroke();
    ctx.restore();
  }

  // The torch, the object, and the light that gets through.
  const lx = s.x + half + 16;
  label(ctx, "Torch light", lx + half / 2, s.y + 6, { color: theme.muted, font: theme.font, align: "center" });
  const cy = top + h / 2;
  rect(ctx, { x: lx, y: cy - 9, width: 22, height: 18 }, theme.neutral, null);
  const panel = lx + half * 0.55;
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(lx + 22, cy - 8);
  ctx.lineTo(panel, cy - 22);
  ctx.lineTo(panel, cy + 22);
  ctx.lineTo(lx + 22, cy + 8);
  ctx.closePath();
  ctx.fill();
  // Through it: all, some, or none of the light.
  ctx.globalAlpha = [0, 0.15, 0.45][see] ?? 0;
  ctx.beginPath();
  ctx.moveTo(panel, cy - 22);
  ctx.lineTo(lx + half, cy - 30);
  ctx.lineTo(lx + half, cy + 30);
  ctx.lineTo(panel, cy + 22);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  rect(ctx, { x: panel - 5, y: cy - 30, width: 10, height: 60 }, colour, theme.text, 1);

  if (words) {
    const seeWord = ["blocks light", "lets some light", "see-through"][see] ?? "blocks light";
    chips(
      ctx,
      [lustrous ? "shiny" : "dull", num(results.hard) === 1 ? "hard" : "soft", seeWord, floats ? "floats" : "sinks"],
      { x: s.x, y: top + h + 18, width: s.width, height: 44 },
      theme.text,
      theme,
    );
  }
}

function drawBeaker(ctx: CanvasRenderingContext2D, s: Box, results: Record<string, unknown>, words: boolean, theme: LabTheme) {
  const id = SCHOOL_SOLUTE_ORDER[Math.round(num(results.solute))] ?? "salt";
  const added = num(results.added);
  const water = num(results.water, 100);
  const dissolved = num(results.dissolved);
  const undissolved = num(results.undissolved);
  const strength = num(results.strength);
  const temp = num(results.waterTemp, 20);
  const soluble = num(results.soluble) === 1;

  const bw = Math.min(120, s.width * 0.38);
  const beaker = { x: s.x + 18, y: s.y + 14, width: bw, height: s.height - 24 };
  const level = beaker.y + beaker.height * (1 - (0.35 + 0.55 * (water / 200)));
  const tint = id === "kno3" || id === "salt" || id === "sugar" ? theme.sine : theme.neutral;
  rect(ctx, { x: beaker.x, y: level, width: bw, height: beaker.y + beaker.height - level }, WATER, null);
  // The dissolved part tints the water — the stronger, the deeper the tint.
  rect(ctx, { x: beaker.x, y: level, width: bw, height: beaker.y + beaker.height - level }, tint, null, 0, clamp(strength / 120, 0, 0.5));
  // Specks of solute spread through the water.
  const specks = Math.round(clamp(dissolved / 4, 0, 40));
  for (let i = 0; i < specks; i++) {
    dot(ctx, beaker.x + 6 + scatter(i) * (bw - 12), level + 6 + scatter(i + 99) * (beaker.y + beaker.height - level - 12), 1.6, tint, 0.8);
  }
  // What did not dissolve lies at the bottom.
  if (undissolved > 0.01) {
    const pile = clamp(4 + Math.sqrt(undissolved) * 2.2, 4, 40);
    ctx.save();
    ctx.fillStyle = id === "sand" ? "#d6a35c" : theme.point;
    ctx.beginPath();
    ctx.moveTo(beaker.x + 4, beaker.y + beaker.height);
    ctx.quadraticCurveTo(beaker.x + bw / 2, beaker.y + beaker.height - 2 * pile, beaker.x + bw - 4, beaker.y + beaker.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  glass(ctx, beaker, theme);
  thermometer(ctx, beaker.x - 10, beaker.y + 6, beaker.y + beaker.height - 10, temp, 0, 90, theme);
  label(ctx, `${fixed(temp)} °C`, beaker.x + bw / 2, beaker.y - 6, { color: theme.secant, font: theme.font, align: "center" });
  label(ctx, `${fixed(added)} g added`, beaker.x + bw / 2, beaker.y + beaker.height + 10, { color: theme.text, font: theme.font, align: "center" });

  if (!words) return;
  // The solubility curve: grams in 100 g of water against temperature.
  const g = { x: beaker.x + bw + 34, y: s.y + 22, width: s.x + s.width - (beaker.x + bw + 34) - 4, height: s.height - 58 };
  const ts = SCHOOL_SOLUBILITY_TEMPS;
  const t0 = ts[0]!;
  const t1 = ts[ts.length - 1]!;
  const top = Math.max(40, ...SCHOOL_SOLUTES[id].perHundred) * 1.1;
  const px = (t: number) => g.x + ((t - t0) / (t1 - t0)) * g.width;
  const py = (v: number) => g.y + g.height - (v / top) * g.height;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(g.x, g.y + g.height);
  ctx.lineTo(g.x + g.width, g.y + g.height);
  ctx.stroke();
  ctx.strokeStyle = theme.curve;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 35; i++) {
    const t = t0 + ((t1 - t0) * i) / 35;
    const [x, y] = [px(t), py(schoolSolubility(id, t))];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
  const solubility = num(results.solubility);
  dot(ctx, px(clamp(temp, t0, t1)), py(solubility), 4, theme.angle);
  label(ctx, "g in 100 g water", g.x, g.y - 12, { color: theme.muted, font: theme.font });
  label(ctx, `${t0}`, g.x, g.y + g.height + 10, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, `${t1} °C`, g.x + g.width, g.y + g.height + 10, { color: theme.muted, font: theme.font, align: "right" });
  label(ctx, fixed(solubility), px(clamp(temp, t0, t1)) + 6, py(solubility) - 10, { color: theme.angle, font: theme.font, align: "left" });
  const room = num(results.canDissolve) - dissolved;

  const caption = !soluble
    ? `${SCHOOL_SOLUTES[id].label} does not dissolve: it stays as it is`
    : num(results.saturated) === 1
      ? `Saturated: ${fixed(undissolved, 1)} g stays at the bottom`
      : `${fixed(dissolved, 1)} g dissolved; ${fixed(room, 1)} g more will go`;
  label(ctx, caption, s.x + s.width / 2, s.y + s.height + 30, { color: theme.text, font: theme.font, align: "center" });
}

/** A heap of two kinds of bits, mixed, or split into two heaps. */
function heap(ctx: CanvasRenderingContext2D, cx: number, cy: number, colours: readonly [string, string], split: boolean, wet: boolean) {
  if (wet) {
    rect(ctx, { x: cx - 30, y: cy - 22, width: 60, height: 30 }, WATER, null);
  }
  for (let i = 0; i < 26; i++) {
    const which = i % 3 === 0 ? 1 : 0;
    const spread = split ? (which ? 16 : -16) : 0;
    const x = cx + spread + (scatter(i) - 0.5) * (split ? 24 : 50);
    const y = cy + 2 - scatter(i + 40) * 14;
    dot(ctx, x, y, which ? 3.2 : 2.4, colours[which]);
  }
}

function drawSeparate(ctx: CanvasRenderingContext2D, s: Box, results: Record<string, unknown>, words: boolean, theme: LabTheme) {
  const mixtureId = SCHOOL_MIXTURE_ORDER[Math.round(num(results.mixture))] ?? "sand-water";
  const methodId = SCHOOL_METHOD_ORDER[Math.round(num(results.method))] ?? "filter";
  const mixture = SCHOOL_MIXTURES[mixtureId];
  const suits = num(results.suits) === 1;
  const colours: Record<string, readonly [string, string]> = {
    "stones-rice": ["#f8fafc", "#78716c"],
    "husk-wheat": ["#d97706", "#fde68a"],
    "bran-flour": ["#f8fafc", "#a16207"],
    "pebbles-sand": ["#e5c07b", "#78716c"],
    "sand-water": [WATER, "#d6a35c"],
    "salt-water": [WATER, "#f8fafc"],
    "iron-sand": ["#e5c07b", "#475569"],
  };
  const pair = colours[mixtureId] ?? ["#cbd5e1", "#64748b"];
  const cy = s.y + s.height * 0.42;
  const left = s.x + s.width * 0.18;
  const right = s.x + s.width * 0.82;
  label(ctx, "the mixture", left, s.y + 8, { color: theme.muted, font: theme.font, align: "center" });
  heap(ctx, left, cy, pair, false, mixture.wet);
  arrow(ctx, left + 40, cy, right - 40, cy, { color: theme.tangent, width: 2.5 });
  label(ctx, SCHOOL_METHODS[methodId], s.x + s.width / 2, cy - 36, { color: theme.tangent, font: theme.fontStrong, align: "center" });
  if (!words) {
    label(ctx, "?", right, cy, { color: theme.muted, font: theme.fontStrong, align: "center" });
    return;
  }
  label(ctx, suits ? "split!" : "still mixed", right, s.y + 8, { color: suits ? theme.tangent : theme.secant, font: theme.fontStrong, align: "center" });
  heap(ctx, right, cy, pair, suits, mixture.wet && !(suits && methodId === "evaporate"));
  label(ctx, separationReason(mixtureId, methodId), s.x + s.width / 2, s.y + s.height + 30, { color: theme.text, font: theme.font, align: "center" });
  if (!suits) {
    label(ctx, `Try: ${SCHOOL_METHODS[mixture.suits[0]!].toLowerCase()}`, s.x + s.width / 2, s.y + s.height - 4, { color: theme.muted, font: theme.font, align: "center" });
  }
}

function drawTubes(ctx: CanvasRenderingContext2D, s: Box, results: Record<string, unknown>, words: boolean, theme: LabTheme) {
  const chosen = Math.round(num(results.tube));
  const coatingId = SCHOOL_COATING_ORDER[Math.round(num(results.coating))] ?? "none";
  const days = num(results.days);
  const short = ["Dry air", "Boiled water", "Water + air"];
  const slot = s.width / 3;
  const th = s.height - 52;
  SCHOOL_TUBE_ORDER.forEach((id, i) => {
    const tube = SCHOOL_TUBES[id];
    const cx = s.x + slot * (i + 0.5);
    const tw = Math.min(40, slot * 0.45);
    const box = { x: cx - tw / 2, y: s.y + 14, width: tw, height: th };
    if (tube.water) {
      const surface = box.y + th * 0.35;
      rect(ctx, { x: box.x, y: surface, width: tw, height: box.y + th - surface }, WATER, null);
      // Boiled water keeps the air out under a layer of oil.
      if (!tube.air) rect(ctx, { x: box.x, y: surface - 8, width: tw, height: 8 }, "#facc15", null, 0, 0.7);
    } else {
      // Calcium chloride at the bottom soaks up the moisture.
      rect(ctx, { x: box.x, y: box.y + th - 16, width: tw, height: 16 }, theme.point, null, 0, 0.8);
    }
    glass(ctx, box, theme);
    // NCERT corks the dry-air tube (so damp air cannot get in) and the boiled-water tube (so no air gets back in).
    if (!(tube.air && tube.water)) rect(ctx, { x: box.x - 2, y: box.y - 8, width: tw + 4, height: 8 }, "#a16207", null);
    // The nail, and its rust.
    const rusts = tube.air && tube.water && coatingId === "none";
    const cover = rusts ? schoolRustCover(days) / 100 : 0;
    const nail = { x: cx - 3, y: box.y + th * 0.2, width: 6, height: th * 0.7 };
    const coat = coatingId === "paint" ? theme.tangent : coatingId === "grease" ? "#facc15" : coatingId === "zinc" ? "#e2e8f0" : IRON;
    rect(ctx, nail, coat, null);
    if (cover > 0) rect(ctx, { x: nail.x, y: nail.y + nail.height * (1 - cover), width: nail.width, height: nail.height * cover }, RUST, null);
    if (i === chosen) rect(ctx, { x: box.x - 8, y: box.y - 12, width: tw + 16, height: th + 18 }, null, theme.angle, 2);
    label(ctx, short[i]!, cx, box.y + th + 16, { color: i === chosen ? theme.angle : theme.text, font: theme.font, align: "center" });
    if (words) {
      label(ctx, `air ${tube.air ? "✓" : "✗"} water ${tube.water ? "✓" : "✗"}`, cx, box.y + th + 32, { color: theme.muted, font: theme.font, align: "center" });
    }
  });
  if (words) {
    const tube = SCHOOL_TUBES[SCHOOL_TUBE_ORDER[chosen] ?? "open"];
    const cover = num(results.rustCover);
    const caption =
      num(results.rusts) === 1
        ? `Day ${fixed(days)}: ${fixed(cover)}% of the nail has rusted`
        : !tube.air || !tube.water
          ? `Day ${fixed(days)}: no rust: ${tube.air ? "no water" : "no air"}`
          : `Day ${fixed(days)}: no rust: the coat keeps it off`;
    label(ctx, caption, s.x + s.width / 2, s.y + s.height + 30, { color: theme.text, font: theme.font, align: "center" });
  } else {
    label(ctx, `Day ${fixed(days)}`, s.x + s.width / 2, s.y + s.height + 30, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, s: Box, results: Record<string, unknown>, words: boolean, theme: LabTheme) {
  const phase = Math.round(num(results.phase, 1));
  const temp = num(results.temp, 20);
  const speed = num(results.speed, 587);
  const size = Math.min(s.height - 20, s.width - 60);
  const box = { x: s.x + (s.width - size) / 2 + 14, y: s.y + 6, width: size, height: size };
  rect(ctx, box, null, theme.neutral, 1.5);
  thermometer(ctx, box.x - 26, box.y + 6, box.y + box.height - 14, temp, -20, 150, theme);
  const r = 6;
  // Faster particles shake further: a jiggle scaled by the speed.
  const jiggle = (speed - 500) / 60;
  if (phase === 0) {
    const n = Math.floor(size / (2 * r + 2));
    for (let i = 0; i < n; i++) {
      for (let j = Math.floor(n / 2); j < n; j++) {
        const k = i * n + j;
        dot(ctx, box.x + r + 1 + i * (2 * r + 2) + (scatter(k) - 0.5) * jiggle, box.y + r + 1 + j * (2 * r + 2) + (scatter(k + 7) - 0.5) * jiggle, r, theme.sine);
      }
    }
  } else if (phase === 1) {
    const n = Math.floor(size / (2 * r + 2));
    for (let i = 0; i < n * n * 0.42; i++) {
      const col = i % n;
      const row = n - 1 - Math.floor(i / n);
      dot(ctx, box.x + r + 1 + col * (2 * r + 2) + (scatter(i) - 0.5) * (r + jiggle), box.y + r + 1 + row * (2 * r + 2) + (scatter(i + 3) - 0.5) * (r + jiggle), r, theme.sine);
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const x = box.x + 14 + scatter(i) * (size - 28);
      const y = box.y + 14 + scatter(i + 50) * (size - 28);
      const a = scatter(i + 90) * Math.PI * 2;
      dot(ctx, x, y, r, theme.sine);
      arrow(ctx, x, y, x + Math.cos(a) * (14 + jiggle * 2), y + Math.sin(a) * (14 + jiggle * 2), { color: theme.muted, width: 1.5, head: 6 });
    }
  }
  if (words) {
    const how = ["packed in rows, shaking in place", "touching, sliding past each other", "far apart, flying about freely"][phase] ?? "";
    label(ctx, how, s.x + s.width / 2, s.y + s.height + 12, { color: theme.muted, font: theme.font, align: "center" });
    const gap = phase === 2 ? ` · ${fixed(num(results.spacing), 0)} widths apart` : "";
    label(ctx, `speed about ${fixed(speed)} m/s${gap}`, s.x + s.width / 2, s.y + s.height + 30, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawInk(ctx: CanvasRenderingContext2D, s: Box, results: Record<string, unknown>, words: boolean, theme: LabTheme) {
  const temp = num(results.inkTemp, 20);
  const spread = clamp(num(results.inkSpread), 0, 1);
  const bw = Math.min(160, s.width * 0.55);
  const beaker = { x: s.x + (s.width - bw) / 2 + 10, y: s.y + 10, width: bw, height: s.height - 24 };
  rect(ctx, { x: beaker.x, y: beaker.y + 16, width: bw, height: beaker.height - 16 }, WATER, null);
  const cx = beaker.x + bw / 2;
  const cy = beaker.y + beaker.height - 10;
  const radius = 6 + spread * (Math.max(bw, beaker.height) - 6);
  ctx.save();
  ctx.beginPath();
  ctx.rect(beaker.x, beaker.y + 16, bw, beaker.height - 16);
  ctx.clip();
  ctx.fillStyle = theme.curve;
  ctx.globalAlpha = 0.25 + 0.5 * (1 - spread);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  glass(ctx, beaker, theme);
  thermometer(ctx, beaker.x - 14, beaker.y + 20, beaker.y + beaker.height - 12, temp, 0, 100, theme);
  label(ctx, `${fixed(temp)} °C`, beaker.x - 14, beaker.y + 6, { color: theme.secant, font: theme.font, align: "center" });
  label(ctx, `${fixed(num(results.clock))} s`, beaker.x + bw + 8, beaker.y + 22, { color: theme.text, font: theme.font });
  if (words) {
    label(ctx, `spreads ${fixed(num(results.diffusion), 1)}× as fast as at 20 °C`, s.x + s.width / 2, s.y + s.height + 30, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawEvaporate(ctx: CanvasRenderingContext2D, s: Box, results: Record<string, unknown>, words: boolean, theme: LabTheme) {
  const area = num(results.area, 100);
  const wind = num(results.wind);
  const humidity = num(results.humidity, 60);
  const rate = num(results.evapRate);
  const temp = num(results.airTemp, 25);
  const left = s.width * 0.62;
  // The dish: wider for a bigger surface.
  const dw = 30 + (left - 50) * Math.sqrt((area - 10) / 990);
  const dx = s.x + (left - dw) / 2;
  const dy = s.y + s.height - 30;
  rect(ctx, { x: dx, y: dy, width: dw, height: 12 }, WATER, theme.neutral, 1.5);
  // Rising vapour: more arrows for a faster rate (on a log scale).
  const arrows = Math.round(clamp(2 + 2.2 * Math.log10(Math.max(rate, 0.01) * 10), 1, 10));
  for (let i = 0; i < arrows; i++) {
    const x = dx + 6 + ((i + 0.5) / arrows) * (dw - 12);
    arrow(ctx, x, dy - 4, x + wind * 3, dy - 34 - scatter(i) * 18, { color: theme.sine, width: 1.5, head: 6, alpha: 0.8 });
  }
  // Wind from the left.
  for (let i = 0; i < Math.round(wind); i++) {
    const y = s.y + 30 + i * 14;
    arrow(ctx, s.x, y, s.x + 34, y, { color: theme.muted, width: 1.5, head: 6 });
  }
  thermometer(ctx, s.x + left - 14, s.y + 8, s.y + s.height - 40, temp, 0, 50, theme);
  label(ctx, `air ${fixed(temp)} °C`, s.x + 2, s.y + 6, { color: theme.secant, font: theme.font });
  label(ctx, `wind ${fixed(wind, 1)} m/s · humidity ${fixed(humidity)}%`, s.x + 2, s.y + s.height + 12, { color: theme.muted, font: theme.font });

  // The wet clay pot, cooled by its own evaporation.
  const px = s.x + left + (s.width - left) / 2 + 4;
  const py = s.y + s.height - 52;
  ctx.save();
  ctx.fillStyle = "#c2410c";
  ctx.beginPath();
  ctx.ellipse(px, py, 30, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  rect(ctx, { x: px - 10, y: py - 44, width: 20, height: 12 }, "#c2410c", null);
  for (let i = 0; i < 5; i++) dot(ctx, px - 20 + i * 10, py + 10 + scatter(i) * 14, 2, theme.sine, 0.9);
  label(ctx, "wet clay pot", px, s.y + 8, { color: theme.muted, font: theme.font, align: "center" });
  if (words) {
    label(ctx, `cools to ${fixed(num(results.wetBulb), 1)} °C`, px, s.y + 26, { color: theme.sine, font: theme.font, align: "center" });
    const hours = num(results.dryTime);
    const dry = hours >= 9999 ? "almost never" : `in ${fixed(hours, hours < 10 ? 1 : 0)} h`;
    label(ctx, `${fixed(rate, rate < 10 ? 2 : 1)} g an hour: 100 g goes ${dry}`, s.x + s.width / 2, s.y + s.height + 30, { color: theme.text, font: theme.font, align: "center" });
  }
}

// ── The renderer ─────────────────────────────────────────────────────────────

export const schoolMatterRenderer: SimulationRenderer<SchoolMatterLayout> = {
  id: "schoolmatter",
  layout: (width) => computeSchoolMatterLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width, height, stage } = layout;
    ctx.clearRect(0, 0, width, height);
    const title = (text: string) => label(ctx, text, width / 2, 14, { color: theme.text, font: theme.fontStrong, align: "center" });

    if (has("materials")) {
      const object = SCHOOL_OBJECTS[SCHOOL_OBJECT_ORDER[Math.round(num(results.object))] ?? "nail"];
      title(`${object.label} (${object.material})`);
      drawMaterials(ctx, stage, results, words, theme);
      if (words) {
        const d = num(results.density);
        label(ctx, `density ${fixed(d, 2)} g/cm³: ${d < 1 ? "less" : "more"} than water's 1`, width / 2, height - 22, { color: theme.text, font: theme.font, align: "center" });
      }
    }
    if (has("beaker")) {
      const id = SCHOOL_SOLUTE_ORDER[Math.round(num(results.solute))] ?? "salt";
      title(`${SCHOOL_SOLUTES[id].label} in ${fixed(num(results.water, 100))} g of water`);
      drawBeaker(ctx, stage, results, words, theme);
    }
    if (has("separate")) {
      title(SCHOOL_MIXTURES[SCHOOL_MIXTURE_ORDER[Math.round(num(results.mixture))] ?? "sand-water"].label);
      drawSeparate(ctx, stage, results, words, theme);
    }
    if (has("tubes")) {
      title(`${SCHOOL_COATINGS[SCHOOL_COATING_ORDER[Math.round(num(results.coating))] ?? "none"]} nails`);
      drawTubes(ctx, stage, results, words, theme);
    }
    if (has("particles")) {
      const phase = Math.round(num(results.phase, 1));
      title(`Water at ${fixed(num(results.temp, 20))} °C: ${["ice", "liquid water", "steam"][phase] ?? "water"}`);
      drawParticles(ctx, stage, results, words, theme);
    }
    if (has("ink")) {
      title("A drop of ink in still water");
      drawInk(ctx, stage, results, words, theme);
    }
    if (has("evaporate")) {
      title(`An open dish of water: ${fixed(num(results.area, 100))} cm²`);
      drawEvaporate(ctx, stage, results, words, theme);
    }
  },
};
