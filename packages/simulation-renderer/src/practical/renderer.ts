/**
 * The practical chemistry bench.
 *
 * Titrate: a burette over a conical flask, with a magnified window on the
 * burette scale around the meniscus — graduations every 0.1 mL, numbers
 * every millilitre, increasing downwards as on a real burette. The flask
 * stays colourless until the end point, turns the first permanent pale pink
 * at it, and goes deep pink if the learner runs past.
 *
 * Salt, Elements, Groups: the mystery sample, the reagent, and the tube (or
 * flame) showing what happens. The sample is never named — only the
 * learner's own answer is. Scheme: the cation group reagents as a flowchart,
 * filled in down to the stage reached.
 *
 * Chemistry colours (flames, precipitates, indicator) are real colours, not
 * theme roles; everything else comes from the theme.
 */

import {
  PRACTICAL_COMPOUND_ORDER,
  PRACTICAL_COMPOUNDS,
  PRACTICAL_FUSION_TEST_ORDER,
  PRACTICAL_GROUP_REAGENTS,
  PRACTICAL_GROUP_TEST_ORDER,
  PRACTICAL_OBSERVATIONS,
  PRACTICAL_ORGANIC_ORDER,
  PRACTICAL_ORGANICS,
  PRACTICAL_PIPETTE,
  PRACTICAL_REAGENT_ORDER,
  PRACTICAL_SALT_ORDER,
  PRACTICAL_SALTS,
  PRACTICAL_TITRATION_ORDER,
  PRACTICAL_TITRATIONS,
  type PracticalColour,
  type PracticalObservation,
} from "@ise/chemistry-engine";
import { clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface PracticalLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The burette tube: centre x, the 0 mL and 50 mL marks. */
  burette: { x: number; zero: number; fifty: number; width: number };
  /** The conical flask under the burette tip. */
  flask: { cx: number; top: number; bottom: number; half: number };
  /** The magnified window on the scale. */
  glass: { x: number; y: number; width: number; height: number };
  /** The test tube, or the burner, in the centre of a test scene. */
  tube: { x: number; y: number; width: number; height: number };
  /** The sample on its watch glass. */
  sample: { cx: number; cy: number };
  /** Flowchart rows for the cation scheme. */
  rows: { x1: number; x2: number; top: number; height: number };
}

export function computePracticalLayout(width: number): PracticalLayout {
  const compact = width < 560;
  const height = 380;
  const bx = compact ? 64 : Math.round(width * 0.2);
  const glassX = compact ? 130 : Math.round(width * 0.42);
  return {
    width,
    height,
    compact,
    burette: { x: bx, zero: 58, fifty: 238, width: 16 },
    flask: { cx: bx, top: 262, bottom: 330, half: 42 },
    glass: { x: glassX, y: 58, width: Math.min(width - 16 - glassX, 220), height: 200 },
    tube: { x: Math.round(width / 2) - 18, y: 100, width: 36, height: 150 },
    sample: { cx: compact ? 50 : Math.round(width * 0.22), cy: 200 },
    rows: { x1: 16, x2: width - 16, top: 44, height: 36 },
  };
}

/** Real colours of what is seen in the tube. */
export const PRACTICAL_PAINT: Record<PracticalColour, string> = {
  none: "rgba(125,170,255,0.45)",
  colourless: "rgba(203,213,225,0.16)",
  white: "#f1f5f9",
  milky: "#e2e8f0",
  blue: "#3b82f6",
  "deep-blue": "#1d4ed8",
  "yellow-brown": "#b7791f",
  "pale-pink": "#f9a8d4",
  pink: "#ec4899",
  "golden-yellow": "#facc15",
  lilac: "#c084fc",
  "brick-red": "#c2410c",
  crimson: "#dc143c",
  "apple-green": "#84cc16",
  "blue-green": "#14b8a6",
  black: "#111827",
  "reddish-brown": "#9a3412",
  "red-brown": "#a0391f",
  "dirty-white": "#d6d3c4",
  "prussian-blue": "#1e3a8a",
  violet: "#7c3aed",
  "pale-yellow": "#fef08a",
  yellow: "#eab308",
  orange: "#f97316",
  brown: "#78350f",
  silver: "#cbd5e1",
};

const PERMANGANATE = "#7e22ce";
const SALT_COLOURS = ["#f1f5f9", "#3b82f6", "#b7791f"];
const SALT_LOOKS = ["a white solid", "blue crystals", "a yellowish-brown solid"];
const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI"];

/** The reagent each test-scene shows, in the engine's test order. */
const SALT_REAGENTS = ["Flame test", "dil H₂SO₄", "AgNO₃ in dil HNO₃", "BaCl₂, then HCl", "FeSO₄ + conc H₂SO₄"];
const FUSION_REAGENTS = ["FeSO₄, FeCl₃, H₂SO₄", "Sodium nitroprusside", "Lead acetate", "HNO₃, then AgNO₃"];
const ORGANIC_REAGENTS = ["Bromine water", "Ceric ammonium nitrate", "Tollens' reagent", "Fehling's solution", "NaHCO₃ solution", "Neutral FeCl₃"];

/** Short words for a flowchart row. */
const SCHEME_SHORT: Record<number, string> = {
  15: "NH₃ given off",
  16: "no NH₃",
  17: "no ppt",
  18: "white PbCl₂",
  19: "black CuS",
  20: "brown Fe(OH)₃",
  21: "white Al(OH)₃",
  22: "dirty-white ZnS",
  23: "white BaCO₃",
  24: "white SrCO₃",
  25: "white CaCO₃",
  26: "white MgNH₄PO₄",
};

const fixed = (v: number, d: number) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);

/** Where a burette reading (mL) sits on the drawn tube. */
export function buretteY(layout: PracticalLayout, reading: number): number {
  const { zero, fifty } = layout.burette;
  return zero + (clamp(reading, 0, 50) / 50) * (fifty - zero);
}

/** Where a reading sits in the magnified window, which shows ±1 mL about the meniscus. */
export function glassY(layout: PracticalLayout, reading: number, centre: number): number {
  const { y, height } = layout.glass;
  return y + height / 2 + (reading - centre) * (height / 2);
}

function observation(code: number): PracticalObservation {
  return PRACTICAL_OBSERVATIONS[Math.round(code)] ?? PRACTICAL_OBSERVATIONS[0]!;
}

function drawTube(ctx: CanvasRenderingContext2D, layout: PracticalLayout, theme: LabTheme, obs: PracticalObservation) {
  const { x, y, width: w, height: h } = layout.tube;
  const r = w / 2;
  const outline = () => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h - r);
    ctx.arc(x + r, y + h - r, r, Math.PI, 0, true);
    ctx.lineTo(x + w, y);
  };
  const surface = y + h * 0.4;
  ctx.save();
  outline();
  ctx.clip();
  ctx.fillStyle = PRACTICAL_PAINT[obs.liquid];
  ctx.globalAlpha = obs.liquid === "colourless" ? 1 : 0.75;
  ctx.fillRect(x, surface, w, h);
  ctx.globalAlpha = 1;
  if (obs.solid) {
    ctx.fillStyle = PRACTICAL_PAINT[obs.solid];
    ctx.beginPath();
    ctx.ellipse(x + r, y + h - r * 0.6, r, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (obs.effect === "ring") {
    ctx.fillStyle = PRACTICAL_PAINT.brown;
    ctx.fillRect(x, surface + (y + h - surface) * 0.45, w, 7);
  }
  if (obs.effect === "mirror") {
    ctx.strokeStyle = PRACTICAL_PAINT.silver;
    ctx.lineWidth = 6;
    outline();
    ctx.stroke();
  }
  ctx.restore();
  if (obs.effect === "bubbles") {
    ctx.save();
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.arc(x + 8 + ((i * 11) % (w - 14)), surface + 10 + ((i * 17) % (h * 0.45)), 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (obs.effect === "gas") {
    // A strip of moist red litmus held at the mouth, turned blue.
    ctx.save();
    ctx.fillStyle = PRACTICAL_PAINT.blue;
    ctx.fillRect(x + w / 2 - 4, y - 34, 8, 26);
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  outline();
  ctx.stroke();
  ctx.restore();
}

function drawFlame(ctx: CanvasRenderingContext2D, layout: PracticalLayout, theme: LabTheme, obs: PracticalObservation) {
  const { x, y, width: w, height: h } = layout.tube;
  const cx = x + w / 2;
  const base = y + h - 40;
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.axis;
  ctx.fillRect(cx - 8, base, 16, 40);
  ctx.strokeRect(cx - 8, base, 16, 40);
  ctx.fillStyle = PRACTICAL_PAINT[obs.liquid];
  ctx.beginPath();
  ctx.moveTo(cx - 14, base);
  ctx.quadraticCurveTo(cx - 18, base - 60, cx, base - 104);
  ctx.quadraticCurveTo(cx + 18, base - 60, cx + 14, base);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // The platinum wire with the salt paste, held in the flame.
  ctx.save();
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1.5;
  segment(ctx, cx + 4, base - 40, cx + 60, base - 90);
  ctx.restore();
}

function drawSample(ctx: CanvasRenderingContext2D, layout: PracticalLayout, theme: LabTheme, fill: string, words: string) {
  label(ctx, `Sample: ${words}`, layout.width / 2, 60, { color: theme.muted, font: theme.font, align: "center" });
  const { cx, cy } = layout.sample;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 30, 8, 0, 0, Math.PI);
  ctx.stroke();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy + 2);
  ctx.quadraticCurveTo(cx, cy - 22, cx + 18, cy + 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBench(
  ctx: CanvasRenderingContext2D,
  layout: PracticalLayout,
  theme: LabTheme,
  title: string,
  reagent: string,
  obs: PracticalObservation,
  answer: string,
) {
  const { width, height, tube } = layout;
  label(ctx, title, width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, reagent, width / 2, 40, { color: theme.cosine, font: theme.font, align: "center" });
  if (obs.effect === "flame") drawFlame(ctx, layout, theme, obs);
  else drawTube(ctx, layout, theme, obs);
  label(ctx, `Your answer: ${answer}`, width / 2, tube.y + tube.height + 30, { color: theme.angle, font: theme.font, align: "center" });
  label(ctx, obs.text, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
}

function drawTitration(ctx: CanvasRenderingContext2D, layout: PracticalLayout, theme: LabTheme, results: Record<string, unknown>, words: boolean) {
  const { width, height, burette, flask, glass } = layout;
  const id = PRACTICAL_TITRATION_ORDER[Math.round(num(results.titration))] ?? "hcl-naoh";
  const t = PRACTICAL_TITRATIONS[id];
  const self = t.indicator === "self";
  const initial = num(results.initialReading);
  const reading = num(results.finalReading);
  const colour = Math.round(num(results.flaskColour));
  const solution = self ? PERMANGANATE : "rgba(203,213,225,0.35)";

  label(ctx, `${t.burette} → ${PRACTICAL_PIPETTE} mL of ${t.flaskMolarity} M ${t.flask}`, width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, self ? "KMnO₄ is its own indicator; dil H₂SO₄ in the flask" : "Indicator: phenolphthalein in the flask", width / 2, 36, { color: theme.muted, font: theme.font, align: "center" });

  // The burette: liquid from the meniscus down to the tap.
  const bw = burette.width;
  const level = buretteY(layout, reading);
  ctx.save();
  ctx.fillStyle = solution;
  ctx.fillRect(burette.x - bw / 2, level, bw, burette.fifty + 10 - level);
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(burette.x - bw / 2, burette.zero - 8, bw, burette.fifty + 18 - burette.zero);
  for (let mL = 0; mL <= 50; mL += 10) segment(ctx, burette.x - bw / 2, buretteY(layout, mL), burette.x - bw / 2 + 6, buretteY(layout, mL));
  // Tap and tip.
  ctx.fillStyle = theme.surface2;
  ctx.fillRect(burette.x - 10, burette.fifty + 10, 20, 6);
  segment(ctx, burette.x, burette.fifty + 16, burette.x, flask.top - 4);
  ctx.restore();

  // The conical flask.
  const flaskPaint = colour === 0 ? "rgba(203,213,225,0.16)" : colour === 1 ? PRACTICAL_PAINT["pale-pink"] : self ? "#a21caf" : PRACTICAL_PAINT.pink;
  const neck = 9;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(flask.cx - neck, flask.top);
  ctx.lineTo(flask.cx - neck, flask.top + 16);
  ctx.lineTo(flask.cx - flask.half, flask.bottom);
  ctx.lineTo(flask.cx + flask.half, flask.bottom);
  ctx.lineTo(flask.cx + neck, flask.top + 16);
  ctx.lineTo(flask.cx + neck, flask.top);
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2;
  ctx.stroke();
  const fillTop = flask.top + 40;
  const spread = ((fillTop - flask.top - 16) / (flask.bottom - flask.top - 16)) * (flask.half - neck) + neck;
  ctx.beginPath();
  ctx.moveTo(flask.cx - spread, fillTop);
  ctx.lineTo(flask.cx - flask.half + 1, flask.bottom - 1);
  ctx.lineTo(flask.cx + flask.half - 1, flask.bottom - 1);
  ctx.lineTo(flask.cx + spread, fillTop);
  ctx.closePath();
  ctx.fillStyle = flaskPaint;
  ctx.fill();
  ctx.restore();

  // The magnified scale about the meniscus.
  const centre = reading;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 1;
  ctx.strokeRect(glass.x, glass.y, glass.width, glass.height);
  ctx.beginPath();
  ctx.rect(glass.x, glass.y, glass.width, glass.height);
  ctx.clip();
  const meniscus = glassY(layout, reading, centre);
  ctx.fillStyle = solution;
  ctx.beginPath();
  // The surface curves down in the middle. The bottom of the curve is at the
  // reading — except for dark KMnO₄, where only the upper rim can be seen.
  const rim = self ? 0 : -9;
  ctx.moveTo(glass.x, meniscus + rim);
  ctx.quadraticCurveTo(glass.x + glass.width / 2, meniscus + rim + 18, glass.x + glass.width, meniscus + rim);
  ctx.lineTo(glass.x + glass.width, glass.y + glass.height);
  ctx.lineTo(glass.x, glass.y + glass.height);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1;
  for (let k = Math.ceil((centre - 1.05) * 10); k <= Math.floor((centre + 1.05) * 10); k++) {
    const mL = k / 10;
    if (mL < 0 || mL > 50) continue;
    const y = glassY(layout, mL, centre);
    const whole = k % 10 === 0;
    const half = k % 5 === 0;
    segment(ctx, glass.x, y, glass.x + (whole ? 34 : half ? 24 : 14), y);
    if (whole) label(ctx, String(mL), glass.x + 40, y, { color: theme.text, font: theme.font });
  }
  ctx.restore();
  // Eye level with the meniscus.
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.setLineDash([4, 4]);
  segment(ctx, glass.x + 66, meniscus, glass.x + glass.width - 4, meniscus);
  ctx.restore();
  label(ctx, "eye level", glass.x + glass.width - 6, meniscus - 12, { color: theme.angle, font: theme.font, align: "right" });
  label(ctx, self ? "dark KMnO₄: read the upper rim" : "read the bottom of the curve", glass.x + glass.width / 2, glass.y + glass.height + 14, { color: theme.muted, font: theme.font, align: "center" });

  if (words) {
    const titre = num(results.titre);
    label(ctx, `initial ${fixed(initial, 2)} mL`, glass.x, flask.top + 30, { color: theme.muted, font: theme.font });
    label(ctx, `now ${fixed(reading, 2)} mL`, glass.x, flask.top + 50, { color: theme.text, font: theme.font });
    const verdict =
      colour === 0
        ? `Titre ${fixed(titre, 1)} mL: still colourless`
        : colour === 1
          ? `End point: titre ${fixed(titre, 1)} mL, M = ${fixed(num(results.foundMolarity), 3)} M`
          : `Overshot by ${fixed(num(results.overshoot), 1)} mL: too pink`;
    label(ctx, verdict, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
  }
}

function drawScheme(ctx: CanvasRenderingContext2D, layout: PracticalLayout, theme: LabTheme, results: Record<string, unknown>) {
  const { width, height, rows } = layout;
  const salt = PRACTICAL_SALTS[PRACTICAL_SALT_ORDER[Math.round(num(results.salt))] ?? "nh4cl"];
  const stage = Math.round(num(results.stage));
  label(ctx, "Cation groups: add each reagent in turn", width / 2, 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  PRACTICAL_GROUP_REAGENTS.forEach((reagent, i) => {
    const y = rows.top + i * rows.height + rows.height / 2;
    const done = i <= stage;
    const here = i === stage;
    if (here) {
      ctx.save();
      ctx.fillStyle = theme.surface2;
      ctx.fillRect(rows.x1, y - rows.height / 2 + 2, rows.x2 - rows.x1, rows.height - 4);
      ctx.restore();
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(rows.x1 + 10, y, 6, 0, Math.PI * 2);
    if (done) {
      ctx.fillStyle = theme.sine;
      ctx.fill();
    } else {
      ctx.strokeStyle = theme.muted;
      ctx.stroke();
    }
    ctx.restore();
    label(ctx, ROMAN[i] ?? "", rows.x1 + 24, y, { color: theme.muted, font: theme.font });
    label(ctx, reagent, rows.x1 + 46, y, { color: done ? theme.text : theme.muted, font: theme.font });
    if (!done) return;
    const code = i === salt.group ? salt.groupObservation : i === 0 ? 16 : 17;
    const obs = observation(code);
    const words = SCHEME_SHORT[code] ?? "";
    if (obs.solid) {
      ctx.save();
      ctx.fillStyle = PRACTICAL_PAINT[obs.solid];
      ctx.strokeStyle = theme.axis;
      ctx.beginPath();
      ctx.arc(rows.x2 - 8, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    label(ctx, words, rows.x2 - 20, y, { color: obs.change ? theme.angle : theme.muted, font: theme.font, align: "right" });
  });
  label(ctx, observation(num(results.schemeObservation)).text, width / 2, height - 14, { color: theme.text, font: theme.font, align: "center" });
}

export const practicalRenderer: SimulationRenderer<PracticalLayout> = {
  id: "practical",
  layout: (width) => computePracticalLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    ctx.clearRect(0, 0, layout.width, layout.height);

    if (has("burette")) {
      drawTitration(ctx, layout, theme, results, has("labels"));
      return;
    }
    if (has("scheme")) {
      drawScheme(ctx, layout, theme, results);
      return;
    }
    if (has("salt")) {
      const colour = clamp(Math.round(num(results.saltColour)), 0, 2);
      const guess = PRACTICAL_SALTS[PRACTICAL_SALT_ORDER[Math.round(num(results.saltGuess))] ?? "nh4cl"];
      drawSample(ctx, layout, theme, SALT_COLOURS[colour]!, SALT_LOOKS[colour]!);
      drawBench(ctx, layout, theme, "Mystery salt", SALT_REAGENTS[Math.round(num(results.reagent))] ?? "", observation(num(results.saltObservation)), guess.formula);
      return;
    }
    if (has("fusion")) {
      const guess = PRACTICAL_COMPOUNDS[PRACTICAL_COMPOUND_ORDER[Math.round(num(results.compoundGuess))] ?? "urea"];
      drawBench(ctx, layout, theme, "Sodium fusion extract of the mystery", FUSION_REAGENTS[Math.round(num(results.fusionTest))] ?? "", observation(num(results.fusionObservation)), guess.name);
      return;
    }
    if (has("organic")) {
      const guess = PRACTICAL_ORGANICS[PRACTICAL_ORGANIC_ORDER[Math.round(num(results.organicGuess))] ?? "ethanol"];
      drawBench(ctx, layout, theme, "Mystery organic liquid", ORGANIC_REAGENTS[Math.round(num(results.groupTest))] ?? "", observation(num(results.organicObservation)), guess.name);
    }
  },
};

/** Reagent names in the engine's order — exported so tests can check they line up. */
export const PRACTICAL_SCENE_REAGENTS = {
  salt: [PRACTICAL_REAGENT_ORDER, SALT_REAGENTS],
  fusion: [PRACTICAL_FUSION_TEST_ORDER, FUSION_REAGENTS],
  organic: [PRACTICAL_GROUP_TEST_ORDER, ORGANIC_REAGENTS],
} as const;
