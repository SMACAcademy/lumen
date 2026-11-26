/**
 * Chemical effects of electric current: three scenes, picked by the layers
 * on show.
 *
 * - "tester": cells, a bulb, an LED or a compass, and two bare ends dipped
 *   into a beaker of liquid. The bulb and LED glow, and the needle turns,
 *   with the current the model works out.
 * - "electrolysis": two carbon rods in copper sulphate solution or in water,
 *   joined to a battery. Copper grows on the − rod, bubbles rise from the
 *   rods, and the blue fades as the copper leaves the solution.
 * - "plating": a copper plate and an iron key in copper sulphate. Whatever
 *   is on − gets the copper coat; on + the plate thins, or the key is eaten.
 *
 * Numbers a level asks the learner to estimate (the oxygen collected, the
 * coat's thickness) are written only with "labels".
 */

import { CCHEM_LIQUID_ORDER, CCHEM_LIQUIDS, CCHEM_TESTER_ORDER } from "@ise/physics-engine";
import type { Rect } from "@ise/graph-engine";
import { formatNumber, formatSignificant } from "@ise/units";
import { clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface CurrentChemLayout {
  width: number;
  height: number;
  compact: boolean;
  cx: number;
  /** The wires along the top run at this height. */
  wireY: number;
  beaker: Rect;
  /** Height of the liquid's surface. */
  surface: number;
  /** The line of names under the beaker. */
  nameY: number;
  /** The line of numbers under the names. */
  numbersY: number;
  captionY: number;
  /** x of the electrode joined to −, and of the one joined to +. */
  minusX: number;
  plusX: number;
}

export function computeCurrentChemLayout(width: number): CurrentChemLayout {
  const compact = width < 560;
  const height = 390;
  const beakerWidth = clamp(width - 80, 200, 320);
  const beaker = { x: (width - beakerWidth) / 2, y: 170, width: beakerWidth, height: 140 };
  const cx = width / 2;
  return {
    width,
    height,
    compact,
    cx,
    wireY: 56,
    beaker,
    surface: beaker.y + 24,
    nameY: beaker.y + beaker.height + 18,
    numbersY: beaker.y + beaker.height + 38,
    captionY: height - 18,
    minusX: cx - beakerWidth * 0.25,
    plusX: cx + beakerWidth * 0.25,
  };
}

const COPPER = "#c2703d";
const BLUE = "#2f7fd8";
const IRON = "#94a3b8";
const CARBON = "#3f4652";

/** Liquid colour and how strongly it shows. */
const LIQUID_TINT: Record<string, [string, number]> = {
  distilled: ["sky", 0.16],
  tap: ["sky", 0.2],
  lemon: ["#facc15", 0.32],
  vinegar: ["#fde68a", 0.28],
  sugar: ["sky", 0.18],
  oil: ["#d97706", 0.45],
  copperSulphate: [BLUE, 0.55],
};

/** A current in mA, to three significant figures. */
export function currentChemMilliamps(mA: number): string {
  return `${formatSignificant(Math.max(0, mA), 3)} mA`;
}

/** A tiny repeatable scatter for bubbles: 0 ≤ value < 1. */
function scatter(i: number, salt: number): number {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Cells drawn side by side: a long thin plate (+) and a short thick one (−) each. Returns the two ends. */
function drawBattery(ctx: CanvasRenderingContext2D, x: number, y: number, cells: number, theme: LabTheme): [number, number] {
  const pitch = 16;
  const width = cells * pitch;
  const left = x - width / 2;
  ctx.save();
  ctx.strokeStyle = theme.text;
  for (let i = 0; i < cells; i++) {
    const px = left + i * pitch + 5;
    ctx.lineWidth = 5;
    segment(ctx, px, y - 7, px, y + 7);
    ctx.lineWidth = 2;
    segment(ctx, px + 7, y - 14, px + 7, y + 14);
    if (i > 0) {
      ctx.lineWidth = 2;
      segment(ctx, px - 9, y, px, y);
    }
  }
  ctx.restore();
  // The short thick plate on the left end is −, the long thin one on the right is +.
  label(ctx, "−", left + 5, y - 24, { color: theme.muted, font: theme.fontStrong, align: "center" });
  label(ctx, "+", left + width - 4, y - 24, { color: theme.muted, font: theme.fontStrong, align: "center" });
  return [left + 5, left + width - 4];
}

function drawBeaker(ctx: CanvasRenderingContext2D, layout: CurrentChemLayout, theme: LabTheme, tint: [string, number] | null): void {
  const { beaker, surface } = layout;
  const bottom = beaker.y + beaker.height;
  if (tint) {
    ctx.save();
    ctx.fillStyle = tint[0] === "sky" ? theme.sine : tint[0];
    ctx.globalAlpha = tint[1];
    ctx.fillRect(beaker.x + 3, surface, beaker.width - 6, bottom - surface - 3);
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(beaker.x, beaker.y);
  ctx.lineTo(beaker.x, bottom);
  ctx.lineTo(beaker.x + beaker.width, bottom);
  ctx.lineTo(beaker.x + beaker.width, beaker.y);
  ctx.stroke();
  ctx.restore();
}

function glowRings(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, strength: number, color: string): void {
  ctx.save();
  for (let ring = 3; ring >= 1; ring--) {
    ctx.globalAlpha = Math.min(0.5, 0.15 * strength) * (4 - ring) * 0.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r + ring * 5 * strength, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Rising bubbles beside a rod: `count` of them, moving up as the minutes pass. */
function bubbles(ctx: CanvasRenderingContext2D, layout: CurrentChemLayout, x: number, count: number, phase: number, seed: number, color: string): void {
  const top = layout.surface + 6;
  const bottom = layout.beaker.y + layout.beaker.height - 14;
  const span = bottom - top;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const bx = x + side * (10 + scatter(i, seed) * 8);
    const by = bottom - ((scatter(i + 50, seed) * span + phase) % span);
    ctx.beginPath();
    ctx.arc(bx, by, 2.5 + scatter(i + 99, seed) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTester(ctx: CanvasRenderingContext2D, layout: CurrentChemLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean): void {
  const { cx, wireY, beaker } = layout;
  const liquidId = CCHEM_LIQUID_ORDER[Math.round(num(results.liquid))] ?? "distilled";
  const liquid = CCHEM_LIQUIDS[liquidId];
  const tester = CCHEM_TESTER_ORDER[Math.round(num(results.tester))] ?? "bulb";
  const cells = Math.round(num(results.cells, 2));
  const salt = Math.round(num(results.salt));
  const shows = num(results.shows) === 1;
  const joined = liquidId === "joined";
  const spread = Math.min(40, beaker.width * 0.16);
  const leftLead = cx - spread;
  const rightLead = cx + spread;
  const bendY = 124;
  const tipY = joined ? bendY + 30 : layout.surface + 50;
  const batteryX = cx - Math.min(90, layout.width * 0.24);
  const indicatorX = cx + Math.min(90, layout.width * 0.24);
  const r = tester === "compass" ? 22 : 14;

  drawBeaker(ctx, layout, theme, joined ? null : (LIQUID_TINT[liquidId] ?? null));

  // ── Wires: − end round to the left lead, + end through the indicator to the right lead ──
  const [minusEnd, plusEnd] = drawBattery(ctx, batteryX, wireY, cells, theme);
  const outer = indicatorX + r + 14;
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(minusEnd - 8, wireY);
  ctx.lineTo(minusEnd - 8, bendY);
  ctx.lineTo(leftLead, bendY);
  ctx.lineTo(joined ? cx - 2 : leftLead, tipY);
  ctx.stroke();
  segment(ctx, plusEnd, wireY, indicatorX - r, wireY);
  ctx.beginPath();
  ctx.moveTo(indicatorX + r, wireY);
  ctx.lineTo(outer, wireY);
  ctx.lineTo(outer, bendY);
  ctx.lineTo(rightLead, bendY);
  ctx.lineTo(joined ? cx + 2 : rightLead, tipY);
  ctx.stroke();
  ctx.restore();
  // The bare metal ends.
  ctx.save();
  ctx.fillStyle = theme.text;
  for (const x of joined ? [cx - 2, cx + 2] : [leftLead, rightLead]) {
    ctx.beginPath();
    ctx.arc(x, tipY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ── What shows the current ─────────────────────────────────────────────
  if (tester === "bulb") {
    const brightness = num(results.brightness);
    if (shows) glowRings(ctx, indicatorX, wireY, r, Math.min(2, 0.8 + Math.sqrt(brightness)), theme.angle);
    ctx.save();
    ctx.fillStyle = shows ? theme.angle : theme.surface2;
    ctx.globalAlpha = shows ? Math.min(1, 0.4 + 0.3 * brightness) : 1;
    ctx.beginPath();
    ctx.arc(indicatorX, wireY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = shows ? theme.text : theme.muted;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(indicatorX - r, wireY);
    for (let k = -2; k <= 2; k++) ctx.lineTo(indicatorX + k * 4, wireY + (k % 2 === 0 ? -4 : 4));
    ctx.lineTo(indicatorX + r, wireY);
    ctx.stroke();
    ctx.restore();
  } else if (tester === "led") {
    const glow = num(results.ledGlow);
    if (shows) glowRings(ctx, indicatorX, wireY - 3, 9, 1 + glow, theme.cosine);
    ctx.save();
    ctx.fillStyle = shows ? theme.cosine : theme.surface2;
    ctx.globalAlpha = shows ? 0.55 + 0.45 * glow : 1;
    ctx.beginPath();
    ctx.arc(indicatorX, wireY - 3, 9, Math.PI, 0);
    ctx.lineTo(indicatorX + 9, wireY + 8);
    ctx.lineTo(indicatorX - 9, wireY + 8);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
    // The LED's legs reach the wires either side.
    ctx.save();
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 2;
    segment(ctx, indicatorX - r, wireY, indicatorX - 6, wireY);
    segment(ctx, indicatorX + 6, wireY, indicatorX + r, wireY);
    ctx.restore();
  } else {
    const turn = num(results.deflection);
    ctx.save();
    ctx.fillStyle = theme.surface2;
    ctx.strokeStyle = theme.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(indicatorX, wireY, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const dx = Math.sin(turn) * (r - 5);
    const dy = -Math.cos(turn) * (r - 5);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = theme.cosine;
    segment(ctx, indicatorX, wireY, indicatorX + dx, wireY + dy);
    ctx.strokeStyle = theme.neutral;
    segment(ctx, indicatorX, wireY, indicatorX - dx, wireY - dy);
    // A few turns of wire wound round the compass.
    ctx.strokeStyle = theme.axis;
    ctx.lineWidth = 1.5;
    for (const k of [-6, 0, 6]) segment(ctx, indicatorX - r, wireY + k, indicatorX + r, wireY + k);
    ctx.restore();
    label(ctx, "N", indicatorX, wireY - r - 9, { color: theme.muted, font: theme.font, align: "center" });
  }

  // ── Words ─────────────────────────────────────────────────────────────
  const name = joined ? "The two ends touch" : salt > 0 ? `${liquid.label} + ${salt} pinch${salt > 1 ? "es" : ""} of salt` : liquid.label;
  label(ctx, name, cx, layout.nameY, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (!words) return;
  label(ctx, `${formatNumber(num(results.voltage), 1)} V`, batteryX, wireY + 26, { color: theme.muted, font: theme.font, align: "center" });
  label(ctx, currentChemMilliamps(num(results.testerCurrent)), cx, layout.numbersY, { color: theme.sine, font: theme.font, align: "center" });
  const kind = Math.round(num(results.liquidKind));
  const sign = tester === "bulb" ? "the bulb glows" : tester === "led" ? "the LED glows" : "the needle turns";
  const caption = shows
    ? joined
      ? "The ends touch: the tester works."
      : `It conducts: ${sign}.`
    : kind === 0
      ? "It does not conduct: no current flows."
      : tester === "led" && num(results.voltage) < 1.8
        ? "One cell is too little push for an LED."
        : kind === 1
          ? "It hardly conducts: far too little current."
          : "Too little current to light the bulb.";
  label(ctx, caption, cx, layout.captionY, { color: shows ? theme.tangent : theme.muted, font: theme.font, align: "center" });
}

/** The battery across the top, joined to the − electrode on the left and the + one on the right. */
function drawBathWires(ctx: CanvasRenderingContext2D, layout: CurrentChemLayout, theme: LabTheme, topOfElectrodes: number): void {
  const [minusEnd, plusEnd] = drawBattery(ctx, layout.cx, layout.wireY, 2, theme);
  ctx.save();
  ctx.strokeStyle = theme.axis;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(minusEnd, layout.wireY);
  ctx.lineTo(layout.minusX, layout.wireY);
  ctx.lineTo(layout.minusX, topOfElectrodes);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(plusEnd, layout.wireY);
  ctx.lineTo(layout.plusX, layout.wireY);
  ctx.lineTo(layout.plusX, topOfElectrodes);
  ctx.stroke();
  ctx.restore();
  label(ctx, "−", layout.minusX - 14, topOfElectrodes + 8, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "+", layout.plusX + 14, topOfElectrodes + 8, { color: theme.text, font: theme.fontStrong, align: "center" });
}

function drawElectrolysis(ctx: CanvasRenderingContext2D, layout: CurrentChemLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean): void {
  const { beaker, minusX, plusX } = layout;
  const water = Math.round(num(results.bath)) === 1;
  const blueLeft = num(results.blueLeft) / 100;
  const deposit = num(results.copperDeposit);
  const hydrogen = num(results.hydrogen);
  const oxygen = num(results.oxygen);
  const minutes = num(results.minutes);
  const flowing = num(results.current) > 0 && minutes > 0;
  const rodTop = beaker.y - 26;
  const rodBottom = beaker.y + beaker.height - 22;

  drawBeaker(ctx, layout, theme, water ? ["sky", 0.18] : [BLUE, 0.1 + 0.5 * blueLeft]);
  drawBathWires(ctx, layout, theme, rodTop);

  // Carbon rods, with copper growing on the − one.
  const coat = Math.min(5, deposit / 120);
  ctx.save();
  if (coat > 0) {
    ctx.fillStyle = COPPER;
    ctx.fillRect(minusX - 6 - coat, layout.surface + 2, 12 + 2 * coat, rodBottom - layout.surface - 2 + coat);
  }
  ctx.fillStyle = CARBON;
  for (const x of [minusX, plusX]) ctx.fillRect(x - 6, rodTop, 12, rodBottom - rodTop);
  ctx.restore();

  // Bubbles: one for every 2 mL of gas, up to 16 a rod.
  if (flowing) {
    const phase = minutes * 40;
    if (hydrogen > 0) bubbles(ctx, layout, minusX, Math.min(16, Math.ceil(hydrogen / 2)), phase, 1, theme.text);
    if (oxygen > 0) bubbles(ctx, layout, plusX, Math.min(16, Math.ceil(oxygen / 2)), phase, 2, theme.text);
  }

  label(ctx, water ? "Water with a little acid · carbon rods" : "Copper sulphate solution · carbon rods", layout.cx, layout.nameY, {
    color: theme.text,
    font: theme.fontStrong,
    align: "center",
  });
  if (!words) return;
  const fmt = (x: number) => formatNumber(x, 1);
  label(ctx, water ? `hydrogen ${fmt(hydrogen)} mL` : `copper ${fmt(deposit)} mg`, minusX, layout.numbersY, { color: water ? theme.sine : theme.secant, font: theme.font, align: "center" });
  label(ctx, `oxygen ${fmt(oxygen)} mL`, plusX, layout.numbersY, { color: theme.cosine, font: theme.font, align: "center" });
  const caption = !flowing
    ? "Switch on to pass a current."
    : water
      ? "Hydrogen at −, oxygen at +: twice as much at −."
      : `Copper coats the − rod; ${formatNumber(blueLeft * 100, 0)}% of the blue is left.`;
  label(ctx, caption, layout.cx, layout.captionY, { color: flowing ? theme.tangent : theme.muted, font: theme.font, align: "center" });
}

function drawKey(ctx: CanvasRenderingContext2D, x: number, top: number, bottom: number, shrink: number, coat: number): void {
  const w = 10 * (1 - shrink);
  const head = 11 * (1 - shrink * 0.5);
  const paint = (color: string, extra: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2 - extra, top + head * 2 - 2, w + 2 * extra, bottom - top - head * 2 + 2 + extra);
    // Teeth on one side near the bottom.
    ctx.fillRect(x + w / 2, bottom - 26, 7 * (1 - shrink) + extra, 6 + extra);
    ctx.fillRect(x + w / 2, bottom - 12, 9 * (1 - shrink) + extra, 6 + extra);
    ctx.beginPath();
    ctx.arc(x, top + head, head + extra, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.save();
  if (coat > 0) paint(COPPER, Math.min(3, 0.5 + coat / 15));
  paint(coat > 0 ? COPPER : IRON, 0);
  ctx.restore();
}

function drawPlating(ctx: CanvasRenderingContext2D, layout: CurrentChemLayout, results: Record<string, unknown>, theme: LabTheme, words: boolean): void {
  const { beaker, minusX, plusX } = layout;
  const keyOnPlus = Math.round(num(results.keyOn)) === 1;
  const coat = num(results.coatThickness);
  const moved = num(results.copperMoved);
  const plateLoss = num(results.plateLoss);
  const keyLoss = num(results.keyLoss);
  const minutes = num(results.minutes);
  const flowing = num(results.current) > 0 && minutes > 0;
  const top = beaker.y - 26;
  const bottom = beaker.y + beaker.height - 22;

  drawBeaker(ctx, layout, theme, [BLUE, 0.1 + 0.5 * (num(results.plateBlue, 100) / 100)]);
  drawBathWires(ctx, layout, theme, top);

  const keyX = keyOnPlus ? plusX : minusX;
  const plateX = keyOnPlus ? minusX : plusX;
  // The plate thins as it gives up copper, or thickens when it is the one on −. Drawn larger than life.
  const plateWidth = keyOnPlus ? 18 + Math.min(8, moved / 150) : 18 - Math.min(10, plateLoss / 120);
  ctx.save();
  ctx.fillStyle = COPPER;
  ctx.fillRect(plateX - plateWidth / 2, top, plateWidth, bottom - top);
  ctx.restore();
  drawKey(ctx, keyX, top, bottom, keyOnPlus ? Math.min(0.5, keyLoss / 1200) : 0, coat);

  label(ctx, "iron key", keyX, layout.nameY, { color: theme.text, font: theme.fontStrong, align: "center" });
  label(ctx, "copper plate", plateX, layout.nameY, { color: theme.text, font: theme.fontStrong, align: "center" });
  if (!words) return;
  const fmt = (x: number) => formatNumber(x, 1);
  if (keyOnPlus) {
    label(ctx, `key −${fmt(keyLoss)} mg`, keyX, layout.numbersY, { color: theme.cosine, font: theme.font, align: "center" });
    label(ctx, `plate +${fmt(moved)} mg`, plateX, layout.numbersY, { color: theme.secant, font: theme.font, align: "center" });
  } else {
    label(ctx, `coat ${fmt(coat)} µm`, keyX, layout.numbersY, { color: theme.secant, font: theme.font, align: "center" });
    label(ctx, `plate −${fmt(plateLoss)} mg`, plateX, layout.numbersY, { color: theme.cosine, font: theme.font, align: "center" });
  }
  const caption = keyOnPlus
    ? "Wrong way round: the key is eaten away."
    : flowing
      ? "Copper leaves the plate and coats the key."
      : "Switch on to coat the key with copper.";
  label(ctx, caption, layout.cx, layout.captionY, { color: keyOnPlus ? theme.cosine : flowing ? theme.tangent : theme.muted, font: theme.font, align: "center" });
}

export const currentChemRenderer: SimulationRenderer<CurrentChemLayout> = {
  id: "currentchem",
  layout: (width) => computeCurrentChemLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const words = layers.has("labels");
    if (layers.has("plating")) drawPlating(ctx, layout, results, theme, words);
    else if (layers.has("electrolysis")) drawElectrolysis(ctx, layout, results, theme, words);
    else if (layers.has("tester")) drawTester(ctx, layout, results, theme, words);
  },
};
