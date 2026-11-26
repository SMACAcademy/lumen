/**
 * Is matter around us pure? Six small benches, one per layer.
 *
 * sample   a magnifying circle on the particles: one kind of atom (an
 *          element), one kind of molecule (a compound), two kinds spread
 *          evenly (homogeneous) or in clumps (heterogeneous).
 * iron     a dish of iron filings and sulphur — or, heated, black iron
 *          sulphide — and the test beside it: a magnet with the iron it
 *          picks up, a tube of carbon disulphide, or a tube of acid.
 * beaker   solute in water: the dissolved part tints the water, the rest
 *          lies at the bottom.
 * flask    a volumetric flask made up to its mark.
 * beam     a torch shining through a beaker: the beam's path shows only
 *          where particles scatter it; a suspension's grains sink as it
 *          stands, leaving clear water above.
 * colloid  a zoomed-in box: the dispersed bits (drops, grains or bubbles)
 *          spread through the medium (gas, liquid or solid).
 *
 * Numbers a level asks the learner to estimate (a concentration, the iron
 * sulphide made, iron left for the magnet) are drawn only with "labels".
 * Chemistry colours (sulphur, iron sulphide, copper sulphate, mud) are real
 * colours; everything else comes from the theme.
 */

import {
  PURE_COLLOID_ORDER,
  PURE_COLLOIDS,
  PURE_FES_TEST_ORDER,
  PURE_LIQUID_ORDER,
  PURE_LIQUIDS,
  PURE_SAMPLE_ORDER,
  PURE_SAMPLES,
  PURE_SOLUTE_NAMES,
  PURE_SOLUTE_ORDER,
  type PureLiquidId,
} from "@ise/chemistry-engine";
import { clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface MixtureLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The magnifying circle of the particle view. */
  lens: { cx: number; cy: number; r: number };
  /** The dish and the test beside it. */
  dish: { cx: number; cy: number; rx: number; ry: number };
  test: { cx: number; top: number; bottom: number };
  /** The beaker of the strength and beam benches. */
  beaker: { x: number; y: number; width: number; height: number };
  /** The torch, left of the beaker. */
  torch: { x: number; y: number };
  /** The volumetric flask: bulb centre and radius, neck top and the mark. */
  flask: { cx: number; cy: number; r: number; neckTop: number; mark: number };
  /** The zoomed-in colloid box. */
  box: { x: number; y: number; width: number; height: number };
  /** Baselines of the two caption lines. */
  caption: [number, number];
}

export function computeMixtureLayout(width: number): MixtureLayout {
  const compact = width < 560;
  const height = 380;
  const mid = width / 2;
  const bw = compact ? 130 : 170;
  return {
    width,
    height,
    compact,
    lens: { cx: mid, cy: 170, r: Math.min(118, width / 2 - 40) },
    dish: { cx: compact ? 92 : Math.round(width * 0.3), cy: 236, rx: compact ? 70 : 100, ry: compact ? 22 : 28 },
    test: { cx: compact ? 245 : Math.round(width * 0.7), top: 70, bottom: 270 },
    beaker: { x: Math.round(mid - bw / 2), y: 70, width: bw, height: 220 },
    torch: { x: Math.max(16, Math.round(mid - bw / 2) - 90), y: 180 },
    flask: { cx: mid, cy: 222, r: 62, neckTop: 52, mark: 104 },
    box: { x: 24, y: 48, width: width - 48, height: 220 },
    caption: [height - 52, height - 26],
  };
}

const SULPHUR = "#facc15";
const IRON = "#94a3b8";
const FES = "#27272a";
const COPPER_SULPHATE = "rgba(37,99,235,0.55)";

/** What each liquid looks like in the beaker: its colour and how cloudy it is. */
const LIQUID_LOOK: Record<PureLiquidId, { fill: string; alpha: number; grain?: string }> = {
  "salt-solution": { fill: "rgba(186,230,253,1)", alpha: 0.18 },
  "sugar-solution": { fill: "rgba(186,230,253,1)", alpha: 0.18 },
  "copper-sulphate": { fill: COPPER_SULPHATE, alpha: 1 },
  soap: { fill: "#e2e8f0", alpha: 0.3 },
  starch: { fill: "#f1f5f9", alpha: 0.4 },
  milk: { fill: "#f8fafc", alpha: 0.5 },
  chalk: { fill: "#f8fafc", alpha: 0.55, grain: "#f8fafc" },
  mud: { fill: "#92400e", alpha: 0.6, grain: "#78350f" },
  sand: { fill: "#d6a35c", alpha: 0.45, grain: "#d6a35c" },
};

/** Atoms of one particle of each compound: dx, dy, radius, colour (0, 1 or 2 — one per element). */
const COMPOUND_SHAPES: Partial<Record<string, readonly (readonly [number, number, number, number])[]>> = {
  water: [[0, 1, 8, 0], [-8, -6, 5, 1], [8, -6, 5, 1]],
  salt: [[-5, 0, 8, 0], [6, 0, 6, 1]],
  sugar: [[-6, 0, 6, 0], [3, -4, 6, 2], [7, 5, 4, 1]],
  "carbon-dioxide": [[-9, 0, 5, 2], [0, 0, 6, 0], [9, 0, 5, 2]],
  "iron-sulphide": [[-5, 0, 7, 0], [6, 0, 7, 1]],
};

const KIND_WORDS = ["An element: pure, one kind of atom", "A compound: pure, elements joined", "A homogeneous mixture: the same all through", "A heterogeneous mixture: not the same all through"];
const LIQUID_KIND_WORDS = ["A solution", "A colloid", "A suspension"];
const PHASES = ["solid", "liquid", "gas"];
const DISPERSED_WORDS = ["Tiny solid bits", "Tiny liquid drops", "Bubbles of gas"];
const COLLOID_TYPES = ["an aerosol", "a foam", "an emulsion", "a sol", "a gel", "a solid sol"];

const fixed = (v: number, digits = 1) => (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toFixed(digits);

/** A particle size in nanometres, as a person would write it: 0.3, 150, 10 000. */
export function mixtureSizeWords(nm: number): string {
  if (nm < 1) return nm.toFixed(1);
  return Math.round(nm)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** A steady pseudo-random number in [0, 1) for particle positions. */
function scatter(i: number): number {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
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

function title(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, words: string) {
  label(ctx, words, layout.width / 2, 22, { color: theme.text, font: theme.fontStrong, align: "center" });
}

function caption(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, line: 0 | 1, words: string, color?: string) {
  label(ctx, words, layout.width / 2, layout.caption[line], { color: color ?? theme.muted, font: line === 0 ? theme.font : theme.fontStrong, align: "center" });
}

// ── Particles ───────────────────────────────────────────────────────────────

/** Grid points inside the lens, a little jiggled. */
export function lensPoints(layout: MixtureLayout, spacing = 30): { x: number; y: number; i: number }[] {
  const { cx, cy, r } = layout.lens;
  const points: { x: number; y: number; i: number }[] = [];
  let i = 0;
  for (let y = cy - r + spacing / 2; y < cy + r; y += spacing) {
    for (let x = cx - r + spacing / 2; x < cx + r; x += spacing) {
      const jx = x + (scatter(i) - 0.5) * 6;
      const jy = y + (scatter(i + 500) - 0.5) * 6;
      if (Math.hypot(jx - cx, jy - cy) < r - 14) points.push({ x: jx, y: jy, i: i });
      i++;
    }
  }
  return points;
}

function drawSample(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, results: Record<string, unknown>, words: boolean) {
  const id = PURE_SAMPLE_ORDER[Math.round(num(results.sample))] ?? "gold";
  const sample = PURE_SAMPLES[id];
  title(ctx, layout, theme, sample.formula ? `${sample.label} (${sample.formula})` : sample.label);
  const { cx, cy, r } = layout.lens;
  const a = id === "iron-sulphur" ? IRON : theme.angle;
  const b = id === "iron-sulphur" ? SULPHUR : theme.sine;
  const c = theme.cosine;

  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  for (const p of lensPoints(layout)) {
    switch (sample.kind) {
      case 0:
        if (id === "oxygen") {
          dot(ctx, p.x - 5, p.y, 6, a);
          dot(ctx, p.x + 5, p.y, 6, a);
        } else dot(ctx, p.x, p.y, 9, a);
        break;
      case 1: {
        // One kind of molecule: every particle has the same atoms joined the same way.
        const colours = [a, b, c];
        for (const atom of COMPOUND_SHAPES[id] ?? COMPOUND_SHAPES.salt!) dot(ctx, p.x + atom[0], p.y + atom[1], atom[2], colours[atom[3]]!);
        break;
      }
      case 2:
        // Two kinds, spread evenly.
        dot(ctx, p.x, p.y, 7, (p.i + Math.floor(p.y / 30)) % 3 === 0 ? b : a);
        break;
      default: {
        // Two kinds, in clumps: one kind gathers in the lower right.
        const inClump = Math.hypot(p.x - (cx + r * 0.35), p.y - (cy + r * 0.3)) < r * 0.5;
        dot(ctx, p.x, p.y, 7, inClump ? b : a);
      }
    }
  }

  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  caption(ctx, layout, theme, 0, sample.parts);
  if (words) caption(ctx, layout, theme, 1, KIND_WORDS[sample.kind]!, theme.tangent);
}

// ── Iron and sulphur ────────────────────────────────────────────────────────

function drawTube(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, fill: string, alpha: number, bubbles: boolean) {
  const { cx, top, bottom } = layout.test;
  const w = 34;
  const x = cx - w / 2;
  const y = top + 40;
  const h = bottom - y;
  const r = w / 2;
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h - r);
    ctx.arc(x + r, y + h - r, r, Math.PI, 0, true);
    ctx.lineTo(x + w, y);
  };
  const surface = y + h * 0.35;
  ctx.save();
  outline();
  ctx.clip();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "rgba(186,230,253,1)";
  ctx.fillRect(x, surface, w, h);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.fillRect(x, surface, w, h);
  ctx.restore();
  if (bubbles) {
    ctx.save();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(x + 7 + ((i * 11) % (w - 12)), surface + 10 + ((i * 23) % (h * 0.5)), 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  outline();
  ctx.stroke();
  ctx.restore();
}

function drawMagnet(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, pulled: number) {
  const { cx, top } = layout.test;
  const y = top + 20;
  ctx.save();
  ctx.lineWidth = 14;
  ctx.lineCap = "butt";
  ctx.strokeStyle = theme.secant;
  ctx.beginPath();
  ctx.arc(cx, y + 30, 26, Math.PI, 0);
  ctx.stroke();
  ctx.strokeStyle = theme.secant;
  segment(ctx, cx - 26, y + 30, cx - 26, y + 80);
  ctx.strokeStyle = theme.sine;
  segment(ctx, cx + 26, y + 30, cx + 26, y + 80);
  ctx.restore();
  // Iron filings cling to the poles: more iron, longer whiskers.
  const filings = Math.round(clamp(pulled * 3, 0, 42));
  ctx.save();
  ctx.strokeStyle = IRON;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < filings; i++) {
    const pole = i % 2 === 0 ? cx - 26 : cx + 26;
    const dx = (scatter(i) - 0.5) * 18;
    const len = 4 + scatter(i + 7) * 6;
    const dy = 84 + scatter(i + 40) * Math.min(40, 6 + pulled * 3);
    segment(ctx, pole + dx, y + dy, pole + dx + (scatter(i + 3) - 0.5) * 4, y + dy + len);
  }
  ctx.restore();
}

function drawIron(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, results: Record<string, unknown>, words: boolean) {
  const heated = num(results.heated) === 1;
  const iron = num(results.iron, 7);
  const sulphur = num(results.sulphur, 4);
  const ironLeft = num(results.ironLeft);
  const sulphurLeft = num(results.sulphurLeft);
  const fes = num(results.fesMass);
  const test = PURE_FES_TEST_ORDER[Math.round(num(results.fesTest))] ?? "magnet";
  title(ctx, layout, theme, `${fixed(iron)} g iron + ${fixed(sulphur)} g sulphur, ${heated ? "heated" : "just mixed"}`);

  // The dish.
  const { cx, cy, rx, ry } = layout.dish;
  ctx.save();
  ctx.fillStyle = heated ? FES : theme.surface2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Free iron and free sulphur show as grey and yellow specks; joined, they are gone.
  const total = Math.max(iron + sulphur, 1e-9);
  const specks = 70;
  const greys = Math.round((specks * ironLeft) / total);
  const yellows = Math.round((specks * sulphurLeft) / total);
  for (let i = 0; i < greys + yellows; i++) {
    const t = scatter(i * 3 + 1) * Math.PI * 2;
    const d = Math.sqrt(scatter(i * 3 + 2)) * 0.85;
    dot(ctx, cx + Math.cos(t) * rx * d, cy + Math.sin(t) * ry * d, 2.2, i < greys ? IRON : SULPHUR);
  }
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  label(ctx, heated ? "Black iron sulphide" : "Grey iron, yellow sulphur", cx, cy + ry + 18, { color: theme.muted, font: theme.font, align: "center" });

  // The test.
  const tx = layout.test.cx;
  if (test === "magnet") {
    drawMagnet(ctx, layout, theme, ironLeft);
    label(ctx, "Magnet", tx, layout.test.bottom + 18, { color: theme.muted, font: theme.font, align: "center" });
    if (words) caption(ctx, layout, theme, 0, `The magnet pulls out ${fixed(ironLeft)} g of iron`);
    else caption(ctx, layout, theme, 0, ironLeft > 0 ? "The magnet pulls out grey iron filings" : "The magnet pulls out nothing");
  } else if (test === "cs2") {
    drawTube(ctx, layout, theme, SULPHUR, clamp(sulphurLeft / 8, 0, 0.7), false);
    label(ctx, "Carbon disulphide", tx, layout.test.bottom + 18, { color: theme.muted, font: theme.font, align: "center" });
    if (words) caption(ctx, layout, theme, 0, `${fixed(sulphurLeft)} g of sulphur dissolves`);
    else caption(ctx, layout, theme, 0, sulphurLeft > 0 ? "The yellow sulphur dissolves" : "Nothing dissolves");
  } else {
    drawTube(ctx, layout, theme, "rgba(203,213,225,1)", 0.15, true);
    label(ctx, "Dilute acid", tx, layout.test.bottom + 18, { color: theme.muted, font: theme.font, align: "center" });
    const gas = num(results.acidGas, 1);
    caption(ctx, layout, theme, 0, gas === 1 ? "Gas: hydrogen, with no smell" : gas === 2 ? "Gas: hydrogen sulphide, smells of rotten eggs" : "Hydrogen sulphide, and hydrogen from spare iron");
  }

  if (heated && words) {
    const spare = ironLeft > 0 ? `, ${fixed(ironLeft)} g iron spare` : sulphurLeft > 0 ? `, ${fixed(sulphurLeft)} g sulphur spare` : ", nothing spare";
    caption(ctx, layout, theme, 1, `${fixed(fes)} g of iron sulphide${spare}`, theme.secant);
  } else if (!heated) caption(ctx, layout, theme, 1, "A mixture: each part keeps its properties", theme.tangent);
}

// ── Beaker and flask ────────────────────────────────────────────────────────

function glass(ctx: CanvasRenderingContext2D, b: { x: number; y: number; width: number; height: number }, theme: LabTheme) {
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y);
  ctx.lineTo(b.x, b.y + b.height);
  ctx.lineTo(b.x + b.width, b.y + b.height);
  ctx.lineTo(b.x + b.width, b.y);
  ctx.stroke();
  ctx.restore();
}

function drawBeaker(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, results: Record<string, unknown>, words: boolean) {
  const id = PURE_SOLUTE_ORDER[Math.round(num(results.solute))] ?? "salt";
  const soluteMass = num(results.soluteMass);
  const water = num(results.water, 100);
  const temp = num(results.temp, 20);
  const dissolved = num(results.dissolved);
  const undissolved = num(results.undissolved);
  const percent = num(results.massPercent);
  title(ctx, layout, theme, `${fixed(soluteMass, 0)} g of ${PURE_SOLUTE_NAMES[id]} in ${fixed(water, 0)} g of water at ${fixed(temp, 0)} °C`);

  const b = layout.beaker;
  const level = b.y + b.height * (1 - (0.3 + 0.6 * ((water - 50) / 450)));
  const liquid = { x: b.x, y: level, width: b.width, height: b.y + b.height - level };
  ctx.save();
  ctx.fillStyle = "rgba(56,189,248,0.25)";
  ctx.fillRect(liquid.x, liquid.y, liquid.width, liquid.height);
  ctx.globalAlpha = clamp(percent / 60, 0, 0.5);
  ctx.fillStyle = theme.sine;
  ctx.fillRect(liquid.x, liquid.y, liquid.width, liquid.height);
  ctx.restore();
  const specks = Math.round(clamp(percent * 2, 0, 60));
  for (let i = 0; i < specks; i++) {
    dot(ctx, b.x + 6 + scatter(i) * (b.width - 12), level + 6 + scatter(i + 99) * (liquid.height - 12), 1.6, theme.point, 0.8);
  }
  if (undissolved > 0.01) {
    const pile = clamp(4 + Math.sqrt(undissolved) * 2.2, 4, 36);
    ctx.save();
    ctx.fillStyle = theme.point;
    ctx.beginPath();
    ctx.moveTo(b.x + 4, b.y + b.height);
    ctx.quadraticCurveTo(b.x + b.width / 2, b.y + b.height - 2 * pile, b.x + b.width - 4, b.y + b.height);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  glass(ctx, b, theme);

  if (num(results.saturated) === 1) caption(ctx, layout, theme, 0, words ? `Saturated: ${fixed(undissolved)} g stays at the bottom` : "Saturated: some stays at the bottom", theme.secant);
  else caption(ctx, layout, theme, 0, "All of it has dissolved");
  if (words) {
    label(ctx, `Solution: ${fixed(dissolved + water)} g`, layout.width / 2, b.y - 16, { color: theme.muted, font: theme.font, align: "center" });
    caption(ctx, layout, theme, 1, `${fixed(percent)}% by mass; strongest here ${fixed(num(results.maxPercent))}%`, theme.tangent);
  }
}

function drawFlask(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, results: Record<string, unknown>, words: boolean) {
  const mass = num(results.flaskMass);
  const volume = num(results.volume, 100);
  title(ctx, layout, theme, `${fixed(mass)} g of salt, made up to ${fixed(volume, 0)} mL`);
  const { cx, cy, r, neckTop, mark } = layout.flask;
  const neck = 12;
  const outline = () => {
    const start = Math.asin(neck / r);
    ctx.beginPath();
    ctx.moveTo(cx - neck, neckTop);
    ctx.lineTo(cx - neck, cy - r * Math.cos(start));
    ctx.arc(cx, cy, r, -Math.PI / 2 - start, -Math.PI / 2 + start, true);
    ctx.lineTo(cx + neck, neckTop);
  };
  ctx.save();
  outline();
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "rgba(56,189,248,0.3)";
  ctx.fillRect(cx - r, mark, 2 * r, cy + r - mark);
  ctx.globalAlpha = clamp(num(results.massByVolume) / 8, 0, 0.5);
  ctx.fillStyle = theme.sine;
  ctx.fillRect(cx - r, mark, 2 * r, cy + r - mark);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  outline();
  ctx.stroke();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  segment(ctx, cx - neck - 6, mark, cx + neck + 6, mark);
  ctx.restore();
  label(ctx, `${fixed(volume, 0)} mL mark`, cx + neck + 12, mark, { color: theme.text, font: theme.font });
  caption(ctx, layout, theme, 0, "Volume of the whole solution, up to the mark");
  if (words) caption(ctx, layout, theme, 1, `${fixed(num(results.massByVolume), 2)} g in every 100 mL: ${fixed(num(results.massByVolume), 2)}%`, theme.tangent);
}

// ── Light beam ──────────────────────────────────────────────────────────────

function drawBeam(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, results: Record<string, unknown>, words: boolean) {
  const id = PURE_LIQUID_ORDER[Math.round(num(results.liquid))] ?? "salt-solution";
  const liquid = PURE_LIQUIDS[id];
  const look = LIQUID_LOOK[id];
  const kind = clamp(Math.round(num(results.liquidKind)), 0, 2);
  const scatters = num(results.scatters) === 1;
  const settled = clamp(num(results.settled), 0, 100) / 100;
  title(ctx, layout, theme, liquid.label);

  const b = layout.beaker;
  const top = b.y + 30;
  const bottom = b.y + b.height;
  const depth = bottom - top;
  const sediment = kind === 2 ? 14 * settled : 0;
  const front = top + settled * (depth - sediment);

  // The liquid: a suspension clears from the top down as its grains sink.
  ctx.save();
  ctx.fillStyle = "rgba(56,189,248,0.18)";
  ctx.fillRect(b.x, top, b.width, depth);
  ctx.globalAlpha = look.alpha;
  ctx.fillStyle = look.fill;
  if (kind === 2) ctx.fillRect(b.x, front, b.width, bottom - sediment - front);
  else ctx.fillRect(b.x, top, b.width, depth);
  ctx.restore();
  if (kind === 2) {
    ctx.save();
    ctx.fillStyle = look.grain ?? theme.point;
    ctx.fillRect(b.x, bottom - sediment, b.width, sediment);
    ctx.restore();
    const grains = 50;
    for (let i = 0; i < grains; i++) {
      const y = front + scatter(i + 200) * (bottom - sediment - front);
      if (bottom - sediment - front > 2) dot(ctx, b.x + 4 + scatter(i) * (b.width - 8), y, 2, look.grain ?? theme.point);
    }
  }

  // The torch and its beam. Inside the liquid the path shows only if something scatters it.
  const { x: tx, y: ty } = layout.torch;
  ctx.save();
  ctx.fillStyle = theme.neutral;
  ctx.fillRect(tx, ty - 9, 34, 18);
  ctx.fillRect(tx + 34, ty - 13, 10, 26);
  ctx.restore();
  const beamTop = ty - 6;
  ctx.save();
  ctx.fillStyle = theme.angle;
  ctx.globalAlpha = 0.12;
  ctx.fillRect(tx + 44, beamTop, b.x - tx - 44, 12);
  ctx.fillRect(b.x + b.width, beamTop, Math.max(0, layout.width - 16 - b.x - b.width), 12);
  // Where the beam is scattered: the clear part of a settled suspension shows nothing.
  if (scatters) {
    const from = kind === 2 ? Math.max(b.y, front) : top;
    const y0 = Math.max(beamTop, from);
    const y1 = Math.min(beamTop + 12, kind === 2 ? bottom - sediment : bottom);
    if (y1 > y0) {
      ctx.globalAlpha = 0.85;
      ctx.fillRect(b.x, y0, b.width, y1 - y0);
    }
  }
  ctx.restore();
  glass(ctx, b, theme);
  label(ctx, `Standing for ${fixed(num(results.minutes), 0)} min`, layout.width / 2, bottom + 16, { color: theme.muted, font: theme.font, align: "center" });

  caption(ctx, layout, theme, 0, scatters ? "The beam's path shows: the Tyndall effect" : "The beam passes unseen");
  if (words) {
    const sizes = `${LIQUID_KIND_WORDS[kind]}: particles about ${mixtureSizeWords(liquid.size)} nm`;
    caption(ctx, layout, theme, 1, sizes, theme.tangent);
    if (kind === 2) {
      const status = num(results.clear) === 1 ? "All settled" : `${fixed(settled * 100, 0)}% settled; clears in ${fixed(num(results.settleMinutes))} min`;
      label(ctx, status, layout.width / 2, b.y + 8, { color: theme.secant, font: theme.font, align: "center" });
    }
  }
}

// ── Kinds of colloid ────────────────────────────────────────────────────────

function drawColloid(ctx: CanvasRenderingContext2D, layout: MixtureLayout, theme: LabTheme, results: Record<string, unknown>, words: boolean) {
  const id = PURE_COLLOID_ORDER[Math.round(num(results.colloid))] ?? "fog";
  const colloid = PURE_COLLOIDS[id];
  title(ctx, layout, theme, colloid.label);
  const box = layout.box;
  const medium = colloid.medium;
  const dispersed = colloid.dispersed;

  ctx.save();
  ctx.fillStyle = medium === 2 ? theme.surface2 : medium === 1 ? "rgba(56,189,248,0.3)" : theme.neutral;
  ctx.globalAlpha = medium === 0 ? 0.45 : 1;
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.width, box.height, 12);
  ctx.fill();
  ctx.restore();

  const count = 26;
  for (let i = 0; i < count; i++) {
    const x = box.x + 16 + scatter(i * 2 + 1) * (box.width - 32);
    const y = box.y + 16 + scatter(i * 2 + 2) * (box.height - 32);
    const r = 4 + scatter(i + 60) * 5;
    ctx.save();
    if (dispersed === 2) {
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (dispersed === 1) {
      ctx.fillStyle = theme.sine;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = theme.secant;
      ctx.fillRect(x - r * 0.8, y - r * 0.8, r * 1.6, r * 1.6);
    }
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.width, box.height, 12);
  ctx.stroke();
  ctx.restore();

  caption(ctx, layout, theme, 0, `${DISPERSED_WORDS[dispersed]} spread through a ${PHASES[medium]}`);
  if (words) {
    const type = clamp(Math.round(num(results.colloidType)), 0, 5);
    caption(ctx, layout, theme, 1, `${PHASES[dispersed]![0]!.toUpperCase()}${PHASES[dispersed]!.slice(1)} in ${PHASES[medium]}: ${COLLOID_TYPES[type]}`, theme.tangent);
  }
}

export const mixtureRenderer: SimulationRenderer<MixtureLayout> = {
  id: "mixture",
  layout: (width) => computeMixtureLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    ctx.clearRect(0, 0, layout.width, layout.height);
    if (has("iron")) drawIron(ctx, layout, theme, results, words);
    else if (has("beaker")) drawBeaker(ctx, layout, theme, results, words);
    else if (has("flask")) drawFlask(ctx, layout, theme, results, words);
    else if (has("beam")) drawBeam(ctx, layout, theme, results, words);
    else if (has("colloid")) drawColloid(ctx, layout, theme, results, words);
    else if (has("sample")) drawSample(ctx, layout, theme, results, words);
  },
};
