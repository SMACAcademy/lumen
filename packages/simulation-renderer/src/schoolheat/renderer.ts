/**
 * Heat for class 7, seen from the side.
 *
 * Touch: three bowls; the two hands that were in the outer bowls dip into the
 * middle one and say what they feel. Thermometer: a clinical or laboratory
 * thermometer laid across the top, with a magnified window of its scale
 * underneath for reading it. Conduction: a rod with one end in a flame and
 * pins stuck on with wax, dropping one by one. Convection: a beaker heated at
 * one corner with a purple streak going round. Radiation: a black and a white
 * can of water in the sun. Breeze: land and sea through the day, with the
 * loop of moving air between them.
 *
 * Answers asked for in the levels (the reading, the temperatures, the
 * feelings, the pins) are written only with the "labels" layer on. The two
 * cans are drawn in real black and white, since their colour is the point.
 */

import {
  SCHOOLHEAT_MATERIAL_ORDER,
  SCHOOLHEAT_MATERIALS,
  SCHOOLHEAT_PINS,
  SCHOOLHEAT_SCENES,
  SCHOOLHEAT_THERMOMETER_ORDER,
  SCHOOLHEAT_THERMOMETERS,
  schoolHeatRodTemp,
} from "@ise/physics-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface SchoolHeatLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The bench everything stands in. */
  scene: { x: number; y: number; width: number; height: number };
  /** Baseline of the caption under the bench. */
  captionY: number;
}

export function computeSchoolHeatLayout(width: number): SchoolHeatLayout {
  const compact = width < 560;
  const height = compact ? 370 : 400;
  const pad = compact ? 12 : 24;
  const top = 30;
  return { width, height, compact, scene: { x: pad, y: top, width: width - 2 * pad, height: height - top - 34 }, captionY: height - 14 };
}

/** Rod length drawn, cm (the last pin is at 15 cm). */
const ROD_CM = 16;
const BLACK_CAN = "#1c1917";
const WHITE_CAN = "#f5f5f4";

/** "2:00 pm" from an hour of the day. */
export function schoolHeatClock(hour: number): string {
  let h = Math.floor(hour);
  let m = Math.round((hour - h) * 60);
  if (m === 60) {
    h += 1;
    m = 0;
  }
  h %= 24;
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** Temperatures to one decimal, without a needless ".0". */
export function schoolHeatDegrees(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${formatNumber(rounded, Number.isInteger(rounded) ? 0 : 1)} °C`;
}

const FEELS: Record<string, string> = { "-1": "feels cold", "0": "feels the same", "1": "feels warm" };
const feelWord = (value: number) => FEELS[String(Math.round(value))] ?? FEELS["0"]!;

/** A water colour for a temperature: cold blue, lukewarm amber, hot orange. */
const waterColour = (theme: LabTheme, t: number) => (t >= 35 ? theme.secant : t <= 20 ? theme.sine : theme.angle);

export const schoolHeatRenderer: SimulationRenderer<SchoolHeatLayout> = {
  id: "schoolheat",
  layout: (width) => computeSchoolHeatLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { scene: S, compact } = layout;
    ctx.clearRect(0, 0, layout.width, layout.height);

    const sceneId = SCHOOLHEAT_SCENES[Math.round(num(results.scene))] ?? "touch";
    const text = { color: theme.text, font: theme.font };
    const bold = { color: theme.text, font: theme.fontStrong };
    const muted = { color: theme.muted, font: theme.font };
    const centreX = S.x + S.width / 2;
    const title = (words: string) => label(ctx, words, S.x, 14, bold);
    const caption = (words: string, color = theme.muted) => label(ctx, words, centreX, layout.captionY, { color, font: theme.font, align: "center" });
    const table = S.y + S.height - 8;
    const flame = (x: number, y: number, size = 14) => {
      ctx.save();
      ctx.fillStyle = theme.secant;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.quadraticCurveTo(x + size * 0.6, y - size * 0.2, x, y);
      ctx.quadraticCurveTo(x - size * 0.6, y - size * 0.2, x, y - size);
      ctx.fill();
      ctx.fillStyle = theme.angle;
      ctx.beginPath();
      ctx.arc(x, y - size * 0.3, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    const tableTop = () => {
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1.5;
      segment(ctx, S.x, table, S.x + S.width, table);
      ctx.restore();
    };

    if (sceneId === "touch") {
      const left = num(results.leftHand, 45);
      const right = num(results.rightHand, 10);
      const middle = num(results.bowlTemp, 27);
      const bw = Math.min(90, S.width / 3 - 14);
      const bh = 46;
      const bowlTop = table - bh;
      const centres = [S.x + S.width / 6, centreX, S.x + (5 * S.width) / 6];
      const temps = [left, middle, right];
      const names = ["Left bowl", "Middle", "Right bowl"];
      title("Three bowls of water");
      if (has("scene")) {
        tableTop();
        centres.forEach((cx, i) => {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx - bw / 2, bowlTop);
          ctx.lineTo(cx + bw / 2, bowlTop);
          ctx.lineTo(cx + bw * 0.36, table);
          ctx.lineTo(cx - bw * 0.36, table);
          ctx.closePath();
          ctx.fillStyle = waterColour(theme, temps[i]!);
          ctx.globalAlpha = 0.45;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = theme.neutral;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          label(ctx, names[i]!, cx, table + 12, { ...muted, align: "center" });
        });
        // Two hands in the middle bowl, each tinted by the bowl it came from.
        const hand = (x: number, colour: string) => {
          ctx.save();
          ctx.fillStyle = colour;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.roundRect(x - 9, bowlTop - 64, 18, 78, 8);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = theme.text;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
        };
        hand(centreX - 14, waterColour(theme, left));
        hand(centreX + 14, waterColour(theme, right));
        label(ctx, "L", centreX - 14, bowlTop - 52, { ...bold, align: "center" });
        label(ctx, "R", centreX + 14, bowlTop - 52, { ...bold, align: "center" });
      }
      if (has("flow")) {
        // Where each hand was before.
        const lift = bowlTop - 90;
        arrow(ctx, centres[0]!, bowlTop - 22, centreX - 26, lift + 10, { color: theme.muted, width: 1.5, head: 8, dash: [4, 4] });
        arrow(ctx, centres[2]!, bowlTop - 22, centreX + 26, lift + 10, { color: theme.muted, width: 1.5, head: 8, dash: [4, 4] });
      }
      if (has("labels")) {
        centres.forEach((cx, i) => label(ctx, schoolHeatDegrees(temps[i]!), cx, table - bh / 2, { ...bold, align: "center" }));
        const y = S.y + 22;
        label(ctx, `Left hand ${feelWord(num(results.leftFeels))}`, S.x, y, { ...text });
        label(ctx, `Right hand ${feelWord(num(results.rightFeels))}`, S.x + S.width, y + 20, { ...text, align: "right" });
        caption(num(results.handsAgree) === 1 ? "Both hands agree this time" : "Same water, but the hands disagree");
      }
      return;
    }

    if (sceneId === "thermometer") {
      const kind = SCHOOLHEAT_THERMOMETER_ORDER[Math.round(num(results.thermometer))] ?? "clinical";
      const spec = SCHOOLHEAT_THERMOMETERS[kind];
      const reading = num(results.reading, spec.min);
      const lc = spec.leastCount;
      const divisions = Math.round((spec.max - spec.min) / lc);
      const takenOut = num(results.takenOut) === 1;
      const outOfRange = num(results.outOfRange) === 1;
      title(`${spec.label} thermometer${takenOut ? " (taken out)" : ""}`);

      // The whole thermometer across the top.
      const tubeY = S.y + 34;
      const bulbX = S.x + 12;
      const x0 = bulbX + 26;
      const x1 = S.x + S.width - 14;
      const at = (t: number) => x0 + ((t - spec.min) / (spec.max - spec.min)) * (x1 - x0);
      const numberEvery = kind === "clinical" ? 1 : compact ? 20 : 10;
      if (has("scene")) {
        ctx.save();
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(bulbX + 6, tubeY - 5, x1 + 8 - bulbX - 6, 10, 5);
        ctx.stroke();
        ctx.fillStyle = theme.neutral;
        ctx.beginPath();
        ctx.arc(bulbX, tubeY, 9, 0, Math.PI * 2);
        ctx.fill();
        // Mercury from the bulb up to the reading.
        ctx.fillRect(bulbX, tubeY - 2.5, Math.max(0, at(reading) - bulbX), 5);
        if (kind === "clinical") {
          // The kink: a narrow neck just above the bulb.
          ctx.fillStyle = theme.background;
          ctx.beginPath();
          ctx.moveTo(bulbX + 14, tubeY - 6);
          ctx.lineTo(bulbX + 18, tubeY - 1.5);
          ctx.lineTo(bulbX + 22, tubeY - 6);
          ctx.closePath();
          ctx.moveTo(bulbX + 14, tubeY + 6);
          ctx.lineTo(bulbX + 18, tubeY + 1.5);
          ctx.lineTo(bulbX + 22, tubeY + 6);
          ctx.closePath();
          ctx.fill();
        }
        // Small marks every least count, numbers on the round values.
        ctx.strokeStyle = theme.muted;
        for (let i = 0; i <= divisions; i++) {
          const t = spec.min + i * lc;
          const major = i % 5 === 0;
          ctx.lineWidth = major ? 1 : 0.6;
          segment(ctx, at(t), tubeY + 7, at(t), tubeY + (major ? 14 : 10));
        }
        ctx.restore();
        for (let t = Math.ceil(spec.min / numberEvery) * numberEvery; t <= spec.max + 1e-9; t += numberEvery) {
          label(ctx, formatNumber(t, 0), at(t), tubeY + 24, { ...muted, align: "center" });
        }
        if (kind === "clinical") {
          // Normal body temperature is marked with an arrow on a clinical thermometer.
          arrow(ctx, at(37), tubeY - 22, at(37), tubeY - 8, { color: theme.angle, width: 1.5, head: 6 });
        }
      }

      // The magnified window: twelve small marks around the end of the mercury.
      const box = { x: S.x, y: S.y + 78, width: S.width, height: 96 };
      const span = 12 * lc;
      const start = clamp((Math.round(reading / lc) - 6) * lc, spec.min, spec.max - span);
      const zoom = (t: number) => box.x + 10 + ((t - start) / span) * (box.width - 20);
      if (has("scene")) {
        const bandY = box.y + 30;
        ctx.save();
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 1;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = theme.neutral;
        ctx.globalAlpha = 0.25;
        ctx.fillRect(box.x + 1, bandY - 9, box.width - 2, 18);
        ctx.globalAlpha = 1;
        ctx.fillRect(box.x + 1, bandY - 5, clamp(zoom(reading), box.x + 1, box.x + box.width - 1) - box.x - 1, 10);
        ctx.strokeStyle = theme.text;
        for (let i = 0; i <= 12; i++) {
          const t = start + i * lc;
          const steps = Math.round(t / lc);
          const major = steps % 5 === 0;
          ctx.lineWidth = major ? 1.5 : 1;
          segment(ctx, zoom(t), bandY + 11, zoom(t), bandY + (major ? 30 : 20));
        }
        ctx.restore();
        const numbered = kind === "clinical" ? 10 : 5;
        for (let i = 0; i <= 12; i++) {
          const steps = Math.round((start + i * lc) / lc);
          if (steps % numbered === 0) label(ctx, formatNumber(steps * lc, 0), zoom(start + i * lc), bandY + 42, { ...bold, align: "center" });
        }
        label(ctx, "Magnified", box.x + 6, box.y + 10, muted);
        if (outOfRange) label(ctx, "Off the scale!", box.x + box.width - 6, box.y + 10, { color: theme.secant, font: theme.fontStrong, align: "right" });
      }
      if (has("labels")) {
        const y = box.y + box.height + 24;
        label(ctx, `Reading ${formatNumber(reading, kind === "clinical" ? 1 : 0)} °C`, S.x, y, bold);
        label(ctx, `Each small mark = ${formatNumber(lc, kind === "clinical" ? 1 : 0)} °C`, S.x, y + 22, text);
        label(ctx, `Range ${formatNumber(spec.min, 0)} to ${formatNumber(spec.max, 0)} °C`, S.x, y + 44, muted);
        if (takenOut) {
          caption(kind === "clinical" ? "The kink holds the reading" : "It falls back to the room's 25 °C");
        } else if (kind === "clinical") {
          const vs = Math.round(num(results.vsNormal));
          caption(vs > 0 ? "Above normal body temperature, 37 °C" : vs < 0 ? "Below normal body temperature, 37 °C" : "Normal body temperature, 37 °C");
        } else {
          caption("Keep the bulb in the water while reading");
        }
      }
      return;
    }

    if (sceneId === "conduction") {
      const material = SCHOOLHEAT_MATERIAL_ORDER[Math.round(num(results.material))] ?? "copper";
      const minutes = num(results.heatTime);
      const fallen = Math.round(num(results.pinsFallen));
      const rodY = S.y + 60;
      const rx0 = S.x + 26;
      const rx1 = S.x + S.width - 18;
      const at = (cm: number) => rx0 + (cm / ROD_CM) * (rx1 - rx0);
      title(`${SCHOOLHEAT_MATERIALS[material].label} rod in a flame`);
      if (has("scene")) {
        tableTop();
        // A stand holding the far end, and the flame under the near end.
        ctx.save();
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 3;
        segment(ctx, rx1 + 6, rodY - 8, rx1 + 6, table);
        ctx.restore();
        flame(rx0 + 6, rodY + 30, 26);
        // The rod, glowing where it is hot.
        ctx.save();
        ctx.fillStyle = theme.neutral;
        ctx.fillRect(rx0 - 10, rodY - 4, rx1 - rx0 + 16, 8);
        ctx.fillStyle = theme.secant;
        const pieces = 32;
        for (let i = 0; i < pieces; i++) {
          const cm = ((i + 0.5) / pieces) * ROD_CM;
          ctx.globalAlpha = clamp((schoolHeatRodTemp(material, cm, minutes) - 25) / 175, 0, 1);
          ctx.fillRect(at((i / pieces) * ROD_CM), rodY - 4, (rx1 - rx0) / pieces + 0.5, 8);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        // Pins: hanging on their wax, or fallen to the table.
        SCHOOLHEAT_PINS.forEach((cm, i) => {
          const x = at(cm);
          ctx.save();
          ctx.strokeStyle = theme.text;
          ctx.lineWidth = 1.5;
          if (i < fallen) {
            segment(ctx, x - 9, table - 3, x + 9, table - 5);
          } else {
            ctx.fillStyle = theme.point;
            ctx.beginPath();
            ctx.arc(x, rodY + 7, 4, 0, Math.PI * 2);
            ctx.fill();
            segment(ctx, x, rodY + 10, x, rodY + 34);
          }
          ctx.restore();
        });
      }
      if (has("flow")) {
        arrow(ctx, at(1), rodY - 18, at(11), rodY - 18, { color: theme.secant, width: 2, head: 9 });
        label(ctx, "heat flows", at(11) + 6, rodY - 18, { color: theme.secant, font: theme.font });
      }
      if (has("labels")) {
        const y = rodY + 62;
        label(ctx, `Time ${formatNumber(minutes, 1)} min`, S.x, y, text);
        label(ctx, `Pins fallen: ${fallen} of ${SCHOOLHEAT_PINS.length}`, S.x, y + 20, bold);
        label(ctx, `Far end ${schoolHeatDegrees(num(results.farTemp, 25))}`, S.x, y + 40, text);
        caption(num(results.goodConductor) === 1 ? "A metal: a good conductor of heat" : "A poor conductor (an insulator)");
      }
      return;
    }

    if (sceneId === "convection") {
      const minutes = num(results.heatTime);
      const streak = clamp(num(results.streak), 0, 1);
      const bx0 = S.x + S.width * 0.18;
      const bx1 = S.x + S.width * 0.82;
      const top = S.y + 26;
      const bottom = table - 34;
      const lx = bx0 + (bx1 - bx0) * 0.25;
      const rx = bx0 + (bx1 - bx0) * 0.75;
      const hiY = top + 22;
      const loY = bottom - 12;
      title("Heating water at one side");
      if (has("scene")) {
        tableTop();
        ctx.save();
        ctx.fillStyle = theme.sine;
        ctx.globalAlpha = 0.22;
        ctx.fillRect(bx0, top + 10, bx1 - bx0, bottom - top - 10);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx0, top);
        ctx.lineTo(bx0, bottom);
        ctx.lineTo(bx1, bottom);
        ctx.lineTo(bx1, top);
        ctx.stroke();
        // Legs of the tripod.
        segment(ctx, bx0 + 6, bottom, bx0 - 4, table);
        segment(ctx, bx1 - 6, bottom, bx1 + 4, table);
        ctx.restore();
        flame(lx, table - 2, 26);
        // The potassium permanganate streak, as far round the loop as it has gone.
        const loop: [number, number][] = [[lx, loY], [lx, hiY], [rx, hiY], [rx, loY], [lx, loY]];
        const lengths = loop.slice(1).map((p, i) => Math.hypot(p[0] - loop[i]![0], p[1] - loop[i]![1]));
        let left = streak * lengths.reduce((a, b) => a + b, 0);
        ctx.save();
        ctx.strokeStyle = theme.vector;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(lx, loY);
        for (let i = 0; i < lengths.length && left > 0; i++) {
          const f = Math.min(1, left / lengths[i]!);
          const [ax, ay] = loop[i]!;
          const [bx, by] = loop[i + 1]!;
          ctx.lineTo(ax + (bx - ax) * f, ay + (by - ay) * f);
          left -= lengths[i]!;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = theme.vector;
        ctx.beginPath();
        ctx.arc(lx, loY + 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (has("flow")) {
        const style = { color: theme.angle, width: 1.5, head: 8 };
        arrow(ctx, lx - 16, loY - 10, lx - 16, hiY + 12, style);
        arrow(ctx, lx + 12, hiY - 12, rx - 12, hiY - 12, style);
        arrow(ctx, rx + 16, hiY + 12, rx + 16, loY - 10, style);
        label(ctx, "rises", bx0 - 4, (hiY + loY) / 2, { ...muted, align: "right" });
        label(ctx, "sinks", bx1 + 4, (hiY + loY) / 2, { ...muted, align: "left" });
      }
      if (has("labels")) {
        label(ctx, `Time ${formatNumber(minutes, 1)} min`, S.x, S.y + 4, text);
        label(ctx, `Water ${schoolHeatDegrees(num(results.waterTemp, 25))}`, S.x + S.width, S.y + 4, { ...bold, align: "right" });
        caption("Hot water rises; cooler water sinks");
      }
      return;
    }

    if (sceneId === "radiation") {
      const minutes = num(results.sunTime);
      const sun = { x: S.x + 22, y: S.y + 24 };
      const canW = compact ? 54 : 64;
      const canH = 76;
      const cans = [
        { x: S.x + S.width * 0.45, fill: BLACK_CAN, name: "Black can", temp: num(results.blackCanTemp, 25) },
        { x: S.x + S.width * 0.8, fill: WHITE_CAN, name: "White can", temp: num(results.whiteCanTemp, 25) },
      ];
      title("Two cans of water in the sun");
      if (has("scene")) {
        tableTop();
        ctx.save();
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.arc(sun.x, sun.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = theme.angle;
        ctx.lineWidth = 2;
        for (let k = 0; k < 8; k++) {
          const a = (k * Math.PI) / 4;
          segment(ctx, sun.x + 19 * Math.cos(a), sun.y + 19 * Math.sin(a), sun.x + 25 * Math.cos(a), sun.y + 25 * Math.sin(a));
        }
        for (const can of cans) {
          ctx.fillStyle = can.fill;
          ctx.fillRect(can.x - canW / 2, table - canH, canW, canH);
          ctx.strokeStyle = theme.muted;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(can.x - canW / 2, table - canH, canW, canH);
        }
        ctx.restore();
        for (const can of cans) label(ctx, can.name, can.x, table - canH - 12, { ...muted, align: "center" });
      }
      if (has("flow")) {
        for (const can of cans) {
          arrow(ctx, sun.x + 20, sun.y + 18, can.x - 6, table - canH - 26, { color: theme.angle, width: 1.5, head: 8, dash: [6, 5] });
        }
        label(ctx, "no medium needed", sun.x + 30, sun.y, { ...muted });
      }
      if (has("labels")) {
        for (const can of cans) label(ctx, schoolHeatDegrees(can.temp), can.x, table - canH / 2, { color: can.fill === BLACK_CAN ? WHITE_CAN : BLACK_CAN, font: theme.fontStrong, align: "center" });
        label(ctx, `In the sun ${formatNumber(minutes, 0)} min`, S.x + S.width, S.y + 4, { ...text, align: "right" });
        caption("Dark things absorb more of the sun's heat");
      }
      return;
    }

    // Breeze: land on the left, sea on the right, and the air between.
    const hour = num(results.hour, 12);
    const breeze = Math.round(num(results.breeze));
    const day = num(results.daytime) === 1;
    const shore = S.x + S.width * 0.5;
    const ground = S.y + S.height - 46;
    title(`At the seaside, ${schoolHeatClock(hour)}`);
    if (has("scene")) {
      ctx.save();
      ctx.fillStyle = theme.secant;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(S.x, ground, shore - S.x, S.y + S.height - ground);
      ctx.fillStyle = theme.sine;
      ctx.fillRect(shore, ground + 8, S.x + S.width - shore, S.y + S.height - ground - 8);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = theme.sine;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = shore; x <= S.x + S.width; x += 4) {
        const y = ground + 8 + 2 * Math.sin((x - shore) / 6);
        if (x === shore) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // The sun crosses the sky by day; the moon is out at night.
      if (day) {
        const f = clamp((hour - 6) / 12, 0, 1);
        const sx = S.x + 20 + f * (S.width - 40);
        const sy = S.y + 34 - 18 * Math.sin(f * Math.PI);
        ctx.fillStyle = theme.angle;
        ctx.beginPath();
        ctx.arc(sx, sy, 11, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = theme.neutral;
        ctx.beginPath();
        ctx.arc(S.x + S.width - 26, S.y + 20, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = theme.background;
        ctx.beginPath();
        ctx.arc(S.x + S.width - 21, S.y + 17, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      label(ctx, "Land", S.x + 6, S.y + S.height - 14, { ...bold });
      label(ctx, "Sea", S.x + S.width - 6, S.y + S.height - 14, { ...bold, align: "right" });
    }
    if (has("flow") && breeze !== 0) {
      // The loop of air: rising over the warmer side, along the ground from the cooler side.
      const landX = S.x + S.width * 0.22;
      const seaX = S.x + S.width * 0.78;
      const low = ground - 18;
      const high = S.y + 66;
      const style = { color: theme.text, width: 2, head: 9 };
      const faint = { color: theme.muted, width: 1.5, head: 8, dash: [5, 4] };
      const [warmX, coolX] = breeze > 0 ? [landX, seaX] : [seaX, landX];
      arrow(ctx, coolX, low, warmX, low, style);
      arrow(ctx, warmX, low - 10, warmX, high + 8, faint);
      arrow(ctx, warmX, high, coolX, high, faint);
      arrow(ctx, coolX, high + 8, coolX, low - 10, faint);
      label(ctx, "warm air rises", warmX + (breeze > 0 ? 6 : -6), (low + high) / 2, { ...muted, align: breeze > 0 ? "left" : "right" });
    }
    if (has("labels")) {
      label(ctx, `Land ${schoolHeatDegrees(num(results.landTemp))}`, S.x + 6, ground - 40, bold);
      label(ctx, `Sea ${schoolHeatDegrees(num(results.seaTemp))}`, S.x + S.width - 6, ground - 40, { ...bold, align: "right" });
      caption(
        breeze > 0 ? "Sea breeze: cool air comes in from the sea" : breeze < 0 ? "Land breeze: air flows from land to sea" : "Calm: land and sea are about as warm",
      );
    }
  },
};
