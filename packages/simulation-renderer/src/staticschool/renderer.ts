/**
 * Charges and lightning for class 8, in five scenes chosen by layer.
 *
 * Rub: the rubbed thing on the left, the cloth it was rubbed with on the
 * right, each dotted with + or − marks, and ten bits of paper on the table —
 * the ones it picks up cling under it. Pair: two things hung on threads that
 * swing together or apart. Electroscope: a jar with a paper clip through its
 * lid and two foil strips that open with the charge; a hand on the clip
 * sends it to the earth. Storm: a thundercloud, − below and + above, the +
 * gathering on the ground, a building with or without a lightning conductor,
 * and a bolt just after each flash. Shelter: a person in one of NCERT's
 * places.
 *
 * Answers asked for in the levels (the strips' angle, the distance of the
 * flash, whether a place is safe, the numbers of charge) are written only
 * with the "labels" layer on.
 */

import {
  STATIC_FLASH_CHARGE,
  STATIC_ITEM_ORDER,
  STATIC_ITEMS,
  STATIC_PAPER_BITS,
  STATIC_PARTNER_ORDER,
  STATIC_PARTNERS,
  STATIC_PLACE_ORDER,
  STATIC_PLACES,
  type StaticItem,
  type StaticPlace,
} from "@ise/physics-engine";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface StaticSchoolLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Middle of the canvas, across. */
  cx: number;
}

export function computeStaticSchoolLayout(width: number): StaticSchoolLayout {
  const compact = width < 560;
  return { width, height: compact ? 370 : 400, compact, cx: width / 2 };
}

/** "+16", "−16" or "0". */
export function staticSigned(value: number): string {
  const v = Math.round(num(value));
  return v > 0 ? `+${v}` : v < 0 ? `−${-v}` : "0";
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Spread n marks of one kind of charge between x0 and x1 on a row. */
function marks(ctx: CanvasRenderingContext2D, sign: number, n: number, x0: number, x1: number, y: number, theme: LabTheme) {
  if (sign === 0 || n <= 0) return;
  const text = sign > 0 ? "+" : "−";
  const color = sign > 0 ? theme.cosine : theme.sine;
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? (x0 + x1) / 2 : x0 + ((x1 - x0) * i) / (n - 1);
    label(ctx, text, x, y, { color, font: theme.fontStrong, align: "center" });
  }
}

/** How many marks to draw for a charge: one for every 4 units, at least one. */
const markCount = (charge: number, most = 10) => (Math.abs(charge) < 1e-9 ? 0 : clamp(Math.round(Math.abs(charge) / 4), 1, most));

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, stroke: string) {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string | null, stroke: string, width = 1.5) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 1.5) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  segment(ctx, x1, y1, x2, y2);
  ctx.restore();
}

/** The rubbed thing, drawn lying across (x, y), about `size` wide. Returns its bottom edge. */
function drawItem(ctx: CanvasRenderingContext2D, item: StaticItem, x: number, y: number, size: number, theme: LabTheme): number {
  const half = size / 2;
  switch (item) {
    case "balloon": {
      const r = size * 0.32;
      circle(ctx, x, y, r, theme.secant, theme.text);
      line(ctx, x, y + r, x, y + r + 10, theme.text);
      return y + r + 4;
    }
    case "refill":
      rect(ctx, x - half, y - 4, size, 8, theme.surface2, theme.text);
      rect(ctx, x + half - 10, y - 4, 10, 8, theme.sine, theme.text);
      return y + 6;
    case "glass":
      rect(ctx, x - half, y - 7, size, 14, theme.surface2, theme.neutral);
      return y + 9;
    case "comb": {
      rect(ctx, x - half, y - 12, size, 10, theme.surface2, theme.text);
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 1;
      for (let tx = x - half + 4; tx < x + half; tx += 6) segment(ctx, tx, y - 2, tx, y + 10);
      ctx.restore();
      return y + 12;
    }
    case "spoon":
      circle(ctx, x - half + 16, y, 14, theme.neutral, theme.text);
      rect(ctx, x - half + 30, y - 3, size - 30, 6, theme.neutral, theme.text);
      return y + 16;
  }
}

/** A thundercloud of overlapping puffs, about `w` wide. */
function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, theme: LabTheme) {
  const r = Math.min(w / 6, 30);
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.strokeStyle = theme.muted;
  ctx.lineWidth = 1.5;
  for (const [dx, dy, k] of [
    [-2, 0.3, 0.9],
    [-1, -0.3, 1.1],
    [0, -0.5, 1.2],
    [1, -0.2, 1.1],
    [2, 0.3, 0.9],
  ] as const) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, r * k, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** A zigzag bolt from (x1, y1) to (x2, y2). */
function bolt(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, theme: LabTheme) {
  ctx.save();
  ctx.strokeStyle = theme.angle;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  const n = 6;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    ctx.lineTo(x1 + (x2 - x1) * t + (i % 2 === 0 ? -9 : 9), y1 + (y2 - y1) * t);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** A stick figure standing with its feet at (x, y), `h` tall. */
function person(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, theme: LabTheme, crouched = false) {
  if (crouched) {
    circle(ctx, x, y - 26, 7, theme.surface, theme.text);
    line(ctx, x, y - 19, x - 4, y - 8, theme.text, 2);
    line(ctx, x - 4, y - 8, x - 9, y, theme.text, 2);
    line(ctx, x - 4, y - 8, x + 1, y, theme.text, 2);
    line(ctx, x, y - 16, x + 7, y - 9, theme.text, 2);
    return;
  }
  const head = h * 0.14;
  circle(ctx, x, y - h + head, head, theme.surface, theme.text);
  line(ctx, x, y - h + 2 * head, x, y - h * 0.4, theme.text, 2);
  line(ctx, x, y - h * 0.4, x - 8, y, theme.text, 2);
  line(ctx, x, y - h * 0.4, x + 8, y, theme.text, 2);
  line(ctx, x, y - h * 0.68, x - 10, y - h * 0.5, theme.text, 2);
  line(ctx, x, y - h * 0.68, x + 10, y - h * 0.5, theme.text, 2);
}

function house(ctx: CanvasRenderingContext2D, x: number, ground: number, theme: LabTheme) {
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 55, ground - 80, 110, 80);
  ctx.beginPath();
  ctx.moveTo(x - 65, ground - 80);
  ctx.lineTo(x, ground - 125);
  ctx.lineTo(x + 65, ground - 80);
  ctx.stroke();
  ctx.restore();
}

function drawRub(ctx: CanvasRenderingContext2D, layout: StaticSchoolLayout, r: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width, height } = layout;
  const item = STATIC_ITEM_ORDER[Math.round(num(r.item))] ?? "balloon";
  const info = STATIC_ITEMS[item];
  const rubs = Math.round(num(r.rubs));
  const itemCharge = num(r.itemCharge);
  const clothCharge = num(r.clothCharge);
  const bits = clamp(Math.round(num(r.paperBits)), 0, STATIC_PAPER_BITS);
  const verb = item === "comb" ? "run through" : "rubbed with";
  label(ctx, `${info.label} ${verb} ${info.cloth}, ${plural(rubs, "time", "times")}`, layout.cx, 16, { color: theme.text, font: theme.fontStrong, align: "center" });

  const ix = width * 0.3;
  const iy = 110;
  const size = Math.min(130, width * 0.38);
  const bottom = drawItem(ctx, item, ix, iy, size, theme);
  marks(ctx, Math.sign(itemCharge), markCount(itemCharge), ix - size * 0.35, ix + size * 0.35, iy - 28, theme);

  // The cloth it was rubbed with.
  const clothX = width * 0.76;
  const clothW = Math.min(90, width * 0.26);
  rect(ctx, clothX - clothW / 2, iy - 30, clothW, 60, theme.surface2, theme.muted);
  label(ctx, info.cloth, clothX, iy + 44, { color: theme.muted, font: theme.font, align: "center" });
  const clothMarks = markCount(clothCharge);
  const rows = clothMarks > 5 ? 2 : 1;
  const firstRow = Math.min(clothMarks, 5);
  marks(ctx, Math.sign(clothCharge), firstRow, clothX - clothW * 0.36, clothX + clothW * 0.36, iy - (rows === 2 ? 10 : 0), theme);
  if (rows === 2) marks(ctx, Math.sign(clothCharge), clothMarks - firstRow, clothX - clothW * 0.36, clothX + clothW * 0.36, iy + 12, theme);

  if (num(r.leaks) === 1 && rubs > 0) {
    arrow(ctx, ix, bottom + 4, ix, bottom + 40, { color: theme.tangent, width: 2, head: 8 });
    label(ctx, "Charge flows away through your hand", layout.cx, bottom + 54, { color: theme.tangent, font: theme.font, align: "center" });
  }

  // Ten bits of paper: the ones picked up cling under the item.
  const table = height - 90;
  line(ctx, 12, table, width - 12, table, theme.axis, 2);
  const bit = 8;
  for (let i = 0; i < STATIC_PAPER_BITS; i++) {
    const lifted = i < bits;
    const x = lifted ? ix - size * 0.3 + ((size * 0.6) / Math.max(1, bits - 1 || 1)) * i : 20 + ((width - 40 - bit) * i) / (STATIC_PAPER_BITS - 1);
    const y = lifted ? bottom + 6 + (i % 2) * 6 : table - bit - 1;
    ctx.save();
    ctx.fillStyle = theme.point;
    ctx.fillRect(x - bit / 2 + (lifted ? 0 : bit / 2), y, bit, bit - 2);
    ctx.restore();
  }

  if (labels) {
    const cloth = info.cloth.charAt(0).toUpperCase() + info.cloth.slice(1);
    label(ctx, `${info.label} ${staticSigned(itemCharge)} units · ${cloth} ${staticSigned(clothCharge)} units`, layout.cx, height - 50, { color: theme.text, font: theme.font, align: "center" });
    label(ctx, bits > 0 ? `It picks up ${plural(bits, "bit", "bits")} of paper` : "It picks up no paper", layout.cx, height - 28, { color: theme.text, font: theme.fontStrong, align: "center" });
  }
}

/** A hung thing on a thread: a balloon, a rod or a bit of paper. */
function hung(ctx: CanvasRenderingContext2D, kind: string, topX: number, x: number, y: number, sign: number, theme: LabTheme) {
  line(ctx, topX, 34, x, y - 26, theme.muted, 1);
  if (kind === "balloon") circle(ctx, x, y, 24, theme.secant, theme.text);
  else if (kind === "paper") rect(ctx, x - 9, y - 26, 18, 18, theme.point, theme.text);
  else rect(ctx, x - 6, y - 26, 12, 70, kind === "glass" ? theme.surface2 : theme.surface, kind === "glass" ? theme.neutral : theme.text);
  if (sign === 0) return;
  if (kind === "balloon") {
    marks(ctx, sign, 3, x - 12, x + 12, y - 6, theme);
    marks(ctx, sign, 2, x - 7, x + 7, y + 9, theme);
  } else for (const dy of [-12, 8, 28]) marks(ctx, sign, 1, x, x, y + dy, theme);
}

function drawPair(ctx: CanvasRenderingContext2D, layout: StaticSchoolLayout, r: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width, height } = layout;
  const item = STATIC_ITEM_ORDER[Math.round(num(r.item))] ?? "balloon";
  const partner = STATIC_PARTNER_ORDER[Math.round(num(r.partner))] ?? "balloon";
  const info = STATIC_ITEMS[item];
  const verb = item === "comb" ? "run through" : "rubbed with";
  const rubs = Math.round(num(r.rubs));
  const leftText = rubs > 0 ? `Left: ${info.label.toLowerCase()} ${verb} ${info.cloth}` : `Left: ${info.label.toLowerCase()}, not rubbed`;
  label(ctx, leftText, layout.cx, 14, { color: theme.text, font: theme.font, align: "center" });
  label(ctx, `Right: ${STATIC_PARTNERS[partner].label.toLowerCase()}`, layout.cx, 30, { color: theme.text, font: theme.font, align: "center" });

  const interaction = Math.round(num(r.interaction));
  const shift = interaction > 0 ? 16 : interaction < 0 ? -22 : 0;
  const lx = width * 0.36;
  const rx = width * 0.64;
  const y = 190;
  line(ctx, width * 0.2, 34, width * 0.8, 34, theme.axis, 3);
  hung(ctx, item, lx, lx + shift, y, Math.round(num(r.itemSign)), theme);
  hung(ctx, partner, rx, rx - shift, y, Math.round(num(r.partnerSign)), theme);

  if (interaction !== 0) {
    const ay = y + 70;
    const color = interaction > 0 ? theme.tangent : theme.cosine;
    const inner = interaction > 0;
    arrow(ctx, lx + shift, ay, lx + shift + (inner ? 28 : -28), ay, { color, width: 2.5, head: 9 });
    arrow(ctx, rx - shift, ay, rx - shift + (inner ? -28 : 28), ay, { color, width: 2.5, head: 9 });
  }

  if (labels) {
    const s1 = Math.round(num(r.itemSign));
    const s2 = Math.round(num(r.partnerSign));
    const words =
      interaction === 0
        ? "Neither is charged: nothing happens"
        : s1 === 0 || s2 === 0
          ? "A charged thing pulls an uncharged one"
          : interaction > 0
            ? "Unlike charges: they attract"
            : "Like charges: they repel";
    label(ctx, words, layout.cx, height - 28, { color: theme.text, font: theme.fontStrong, align: "center" });
  }
}

function drawElectroscope(ctx: CanvasRenderingContext2D, layout: StaticSchoolLayout, r: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { cx, height } = layout;
  const item = STATIC_ITEM_ORDER[Math.round(num(r.item))] ?? "balloon";
  const info = STATIC_ITEMS[item];
  const rubs = Math.round(num(r.rubs));
  const earthed = num(r.earthed) === 1;
  const spread = clamp(num(r.foilSpread), 0, 90);
  const sign = Math.round(num(r.foilSign));
  label(ctx, `${info.label} rubbed ${plural(rubs, "time", "times")} touches the clip`, cx, 16, { color: theme.text, font: theme.fontStrong, align: "center" });

  // The jar, its card lid, and the clip through it.
  const lid = 130;
  const jarBottom = height - 80;
  ctx.save();
  ctx.strokeStyle = theme.neutral;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  ctx.strokeRect(cx - 62, lid, 124, jarBottom - lid);
  ctx.restore();
  rect(ctx, cx - 72, lid - 6, 144, 8, theme.surface2, theme.muted);
  const clipTop = 70;
  const clipBottom = 190;
  line(ctx, cx, clipTop, cx, clipBottom, theme.neutral, 3);
  circle(ctx, cx, clipTop - 6, 6, null, theme.neutral, 2);

  // The rubbed thing touching the top of the clip.
  if (!earthed) {
    drawItem(ctx, item, cx + 62, clipTop - 18, 96, theme);
  }

  // Two foil strips, opening symmetrically.
  const length = 80;
  const half = (spread * Math.PI) / 360;
  for (const side of [-1, 1]) {
    const ex = cx + side * length * Math.sin(half);
    const ey = clipBottom + length * Math.cos(half);
    line(ctx, cx, clipBottom, ex, ey, theme.angle, 5);
    if (sign !== 0) {
      const mx = cx + side * (length * 0.6 * Math.sin(half) + 10);
      const my = clipBottom + length * 0.6 * Math.cos(half);
      marks(ctx, sign, 1, mx, mx, my, theme);
    }
  }

  if (earthed) {
    // A hand on the clip, and the charge running down to the earth.
    circle(ctx, cx - 26, clipTop - 6, 12, theme.surface, theme.text);
    line(ctx, cx - 38, clipTop, cx - 70, clipTop + 40, theme.text, 3);
    arrow(ctx, cx - 92, clipTop + 30, cx - 92, clipTop + 96, { color: theme.tangent, width: 2, head: 8 });
    label(ctx, "Your hand: the charge flows to the earth", cx, height - 50, { color: theme.tangent, font: theme.font, align: "center" });
  }

  if (labels) {
    const words = spread > 0 ? `The strips open ${Math.round(spread)}° with ${Math.round(num(r.foilCharge))} units of charge` : "The strips hang shut: no charge on them";
    label(ctx, words, cx, height - 28, { color: theme.text, font: theme.fontStrong, align: "center" });
  }
}

function drawStorm(ctx: CanvasRenderingContext2D, layout: StaticSchoolLayout, r: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width, height, cx } = layout;
  const time = Math.round(num(r.stormTime));
  const strength = Math.round(num(r.stormStrength));
  const cloudCharge = clamp(num(r.cloudCharge), 0, STATIC_FLASH_CHARGE);
  const flashes = Math.round(num(r.flashes));
  const conductor = num(r.conductor) === 1;
  label(ctx, `Storm ${time} s in, building ${strength} units each second`, cx, 14, { color: theme.text, font: theme.font, align: "center" });

  const cloudY = 74;
  const cloudW = Math.min(width - 60, 300);
  cloud(ctx, cx, cloudY, cloudW, theme);
  const n = Math.round(cloudCharge / 10);
  marks(ctx, 1, n, cx - cloudW * 0.3, cx + cloudW * 0.3, cloudY - 22, theme);
  marks(ctx, -1, n, cx - cloudW * 0.32, cx + cloudW * 0.32, cloudY + 16, theme);
  if (labels) label(ctx, `Cloud ${Math.round(cloudCharge)} of ${STATIC_FLASH_CHARGE} units · Flashes so far ${flashes}`, cx, 124, { color: theme.text, font: theme.font, align: "center" });

  // The ground, with + charge gathering under the cloud.
  const ground = height - 96;
  ctx.save();
  ctx.fillStyle = theme.surface2;
  ctx.fillRect(0, ground, width, 26);
  ctx.restore();
  line(ctx, 0, ground, width, ground, theme.axis, 2);
  marks(ctx, 1, n, 24, width * 0.5, ground + 12, theme);

  // A building, with its conductor down the right-hand wall to a buried plate.
  const bx = width * 0.72;
  const bw = Math.min(60, width * 0.17);
  const roof = ground - 90;
  rect(ctx, bx - bw / 2, roof, bw, ground - roof, theme.surface, theme.muted);
  for (let wy = roof + 14; wy < ground - 14; wy += 22) rect(ctx, bx - bw / 4 - 5, wy, 10, 10, theme.surface2, theme.muted);
  const rodX = bx + bw / 2 + 4;
  const rodTop = roof - 24;
  if (conductor) {
    line(ctx, rodX, rodTop, rodX, ground + 20, theme.tangent, 3);
    rect(ctx, rodX - 9, ground + 18, 18, 5, theme.tangent, theme.tangent);
  }

  if (num(r.sparkNow) === 1) {
    if (conductor) bolt(ctx, cx - 10, cloudY + 30, rodX, rodTop, theme);
    else bolt(ctx, cx - 10, cloudY + 30, bx, roof, theme);
  }

  const delay = Math.round(num(r.thunderDelay));
  label(ctx, `Thunder ${delay} s after the flash`, cx, height - 54, { color: theme.text, font: theme.font, align: "center" });
  if (labels) {
    label(ctx, `That flash was about ${num(r.stormDistance).toFixed(1)} km away`, cx, height - 36, { color: theme.sine, font: theme.font, align: "center" });
    const result = Math.round(num(r.strikeResult));
    const words = result === 0 ? "Charge is building up in the cloud" : result === 2 ? "It ran down the conductor into the earth" : "It struck the building";
    label(ctx, words, cx, height - 16, { color: theme.text, font: theme.fontStrong, align: "center" });
  }
}

function drawSafety(ctx: CanvasRenderingContext2D, layout: StaticSchoolLayout, r: Record<string, unknown>, theme: LabTheme, labels: boolean) {
  const { width, height, cx } = layout;
  const place: StaticPlace = STATIC_PLACE_ORDER[Math.round(num(r.place))] ?? "house";
  const info = STATIC_PLACES[place];
  label(ctx, info.label, cx, 16, { color: theme.text, font: theme.fontStrong, align: "center" });

  const cloudW = Math.min(width * 0.5, 200);
  cloud(ctx, width * 0.28, 74, cloudW, theme);
  bolt(ctx, width * 0.22, 104, width * 0.12, 236, theme);

  const ground = 250;
  line(ctx, 0, ground, width, ground, theme.axis, 2);
  const px = cx + 20;
  const indoors = place === "house" || place === "wiredPhone" || place === "mobile";
  if (indoors) house(ctx, px, ground, theme);
  if (place === "car") {
    rect(ctx, px - 60, ground - 52, 120, 38, theme.surface2, theme.neutral);
    circle(ctx, px - 34, ground - 12, 11, theme.surface, theme.text);
    circle(ctx, px + 34, ground - 12, 11, theme.surface, theme.text);
    person(ctx, px, ground - 22, 34, theme);
  } else if (place === "bike") {
    circle(ctx, px - 26, ground - 13, 13, null, theme.text, 2);
    circle(ctx, px + 26, ground - 13, 13, null, theme.text, 2);
    line(ctx, px - 26, ground - 13, px + 26, ground - 13, theme.neutral, 3);
    person(ctx, px, ground - 20, 48, theme);
  } else if (place === "crouch") {
    person(ctx, px, ground, 60, theme, true);
  } else {
    person(ctx, px, ground, 60, theme);
  }
  if (place === "tree") {
    rect(ctx, px + 40, ground - 70, 12, 70, theme.surface2, theme.muted);
    circle(ctx, px + 46, ground - 100, 40, theme.surface2, theme.tangent);
  }
  if (place === "umbrella") {
    ctx.save();
    ctx.strokeStyle = theme.cosine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + 10, ground - 70, 28, Math.PI, 0);
    ctx.stroke();
    ctx.restore();
    line(ctx, px + 10, ground - 70, px + 10, ground - 30, theme.text, 2);
  }
  if (place === "water") {
    ctx.save();
    ctx.fillStyle = theme.sine;
    ctx.globalAlpha = 0.35;
    ctx.fillRect(px - 60, ground - 26, 120, 26);
    ctx.restore();
  }
  if (place === "wiredPhone") {
    rect(ctx, px + 22, ground - 34, 18, 12, theme.surface2, theme.text);
    line(ctx, px + 31, ground - 22, px + 31, ground, theme.muted, 1.5);
  }
  if (place === "mobile") rect(ctx, px + 10, ground - 34, 6, 10, theme.point, theme.text);

  if (labels) {
    const verdict = info.safety === 2 ? "Safe" : info.safety === 1 ? "Safer than standing, but not safe" : "Not safe";
    const color = info.safety === 2 ? theme.tangent : info.safety === 1 ? theme.angle : theme.cosine;
    label(ctx, verdict, cx, height - 54, { color, font: theme.fontStrong, align: "center" });
    label(ctx, info.reason, cx, height - 32, { color: theme.text, font: theme.font, align: "center" });
  }
}

export const staticSchoolRenderer: SimulationRenderer<StaticSchoolLayout> = {
  id: "staticschool",
  layout: (width) => computeStaticSchoolLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    ctx.clearRect(0, 0, layout.width, layout.height);
    const labels = layers.has("labels");
    const r = results as Record<string, unknown>;
    if (layers.has("rub")) drawRub(ctx, layout, r, theme, labels);
    else if (layers.has("pair")) drawPair(ctx, layout, r, theme, labels);
    else if (layers.has("electroscope")) drawElectroscope(ctx, layout, r, theme, labels);
    else if (layers.has("storm")) drawStorm(ctx, layout, r, theme, labels);
    else if (layers.has("safety")) drawSafety(ctx, layout, r, theme, labels);
  },
};
