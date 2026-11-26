/**
 * Air pressure, winds and storms for class 7, seen from the side.
 *
 * Can: a tin can with the air outside pressing in on every side and the air
 * left inside pressing out; it crumples once the outside wins. Patch: the air
 * pressing down on an area, and the weight that would push as hard. Bag: two
 * paper bags on a balance, one over a candle. Moving air: two balloons, a
 * paper strip, or a roof under a storm wind. Winds: India's land and sea, or
 * the Earth with its warm equator. Cyclone: a cross-section, with the calm
 * eye, the wall of cloud, and the wind speed drawn underneath. Tracking: a
 * cyclone heading for the coast, and the alert or warning that has gone out.
 *
 * Answers asked for in the levels (the push in tonnes, the pressure drop, the
 * wind in the eye wall) are written only with the "labels" layer on.
 */

import { AIRWIND_SCENES, AIRWIND_SETUPS, airWindCyclone } from "@ise/physics-engine";
import { formatNumber } from "@ise/units";
import { arrow, clamp, label, num, segment } from "../shared/draw";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface AirWindLayout {
  width: number;
  height: number;
  compact: boolean;
  /** The bench everything stands in. */
  scene: { x: number; y: number; width: number; height: number };
  /** Baseline of the caption under the bench. */
  captionY: number;
}

export function computeAirWindLayout(width: number): AirWindLayout {
  const compact = width < 560;
  const height = compact ? 380 : 400;
  const pad = compact ? 12 : 24;
  const top = 30;
  return { width, height, compact, scene: { x: pad, y: top, width: width - 2 * pad, height: height - top - 34 }, captionY: height - 14 };
}

/** A number to a few decimals, without needless trailing zeros. */
export function airWindNumber(value: number, digits = 1): string {
  const factor = 10 ** digits;
  const rounded = Math.round(value * factor) / factor;
  if (Number.isInteger(rounded)) return formatNumber(rounded, 0);
  const text = formatNumber(rounded, digits);
  return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

/** Whole numbers with thin groups of three, e.g. "10 339". */
export function airWindWhole(value: number): string {
  const rounded = Math.round(value);
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return rounded < 0 ? `−${digits}` : digits;
}

const WARNINGS = ["No alert yet", "Cyclone alert (watch)", "Cyclone warning", "It has reached the coast"];

const fillCircle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) => {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

const flame = (ctx: CanvasRenderingContext2D, theme: LabTheme, x: number, y: number, size = 12) => {
  ctx.save();
  ctx.fillStyle = theme.secant;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.quadraticCurveTo(x + size * 0.6, y - size * 0.2, x, y);
  ctx.quadraticCurveTo(x - size * 0.6, y - size * 0.2, x, y - size);
  ctx.fill();
  ctx.restore();
};

export const airWindRenderer: SimulationRenderer<AirWindLayout> = {
  id: "airwind",
  layout: (width) => computeAirWindLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const { scene: S } = layout;
    ctx.clearRect(0, 0, layout.width, layout.height);

    const sceneId = AIRWIND_SCENES[Math.round(num(results.scene))] ?? "can";
    const text = { color: theme.text, font: theme.font };
    const bold = { color: theme.text, font: theme.fontStrong };
    const muted = { color: theme.muted, font: theme.font };
    const cx = S.x + S.width / 2;
    const right = S.x + S.width;
    const bottom = S.y + S.height;
    const title = (words: string) => label(ctx, words, S.x, 14, bold);
    const caption = (words: string, color = theme.muted) => label(ctx, words, cx, layout.captionY, { color, font: theme.font, align: "center" });
    const kPa = (value: number) => `${airWindNumber(value, 1)} kPa`;

    if (sceneId === "can") {
      const air = num(results.airInside, 100);
      const crushed = num(results.canCrushed) === 1;
      const side = Math.min(130, S.width * 0.42, S.height * 0.5);
      const cy = S.y + S.height * 0.5;
      const half = side / 2;
      // Crushed walls bow in, more the more the outside wins.
      const dent = crushed ? side * clamp(0.08 + num(results.pushDifference) / 400, 0.08, 0.3) : 0;
      title("A tin can with air pumped out");
      label(ctx, `Air left: ${airWindNumber(air, 0)} %`, right, S.y + 4, { ...text, align: "right" });
      if (has("scene")) {
        ctx.save();
        ctx.fillStyle = theme.surface2;
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 2;
        const [l, r, t, b] = [cx - half, cx + half, cy - half, cy + half];
        ctx.beginPath();
        ctx.moveTo(l, t);
        ctx.quadraticCurveTo(cx, t + dent, r, t);
        ctx.quadraticCurveTo(r - dent, cy, r, b);
        ctx.quadraticCurveTo(cx, b - dent, l, b);
        ctx.quadraticCurveTo(l + dent, cy, l, t);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // The pipe to the pump.
        ctx.strokeStyle = theme.muted;
        segment(ctx, cx + half * 0.5, t + dent * 0.5, cx + half * 0.5, t - 26);
        segment(ctx, cx + half * 0.5, t - 26, cx + half + 30, t - 26);
        ctx.restore();
        label(ctx, "to pump", cx + half + 34, t - 26, muted);
        // Dots for the air left inside.
        const dots = Math.round(air / 10);
        for (let k = 0; k < dots; k++) {
          const gx = cx - half * 0.5 + (k % 4) * (half / 3);
          const gy = cy - half * 0.45 + Math.floor(k / 4) * (half / 2.4);
          fillCircle(ctx, gx, gy, 2.5, theme.secant, 0.8);
        }
        if (crushed) label(ctx, "Crushed!", cx, b + 16, { ...bold, align: "center" });
      }
      if (has("arrows")) {
        const outside = { color: theme.sine, width: 2, head: 7 };
        const insideLength = 22 * (air / 100);
        const inside = { color: theme.secant, width: 2, head: 6 };
        for (const f of [-0.3, 0.3]) {
          // From outside, pressing in on all four sides.
          arrow(ctx, cx + f * side, cy - half - 28, cx + f * side, cy - half - 4 + dent * 0.6, outside);
          arrow(ctx, cx + f * side, cy + half + 28, cx + f * side, cy + half + 4 - dent * 0.6, outside);
          arrow(ctx, cx - half - 28, cy + f * side, cx - half - 4 + dent * 0.6, cy + f * side, outside);
          arrow(ctx, cx + half + 28, cy + f * side, cx + half + 4 - dent * 0.6, cy + f * side, outside);
          if (insideLength > 3) {
            arrow(ctx, cx + f * side * 0.6, cy, cx + f * side * 0.6 + Math.sign(f) * insideLength, cy, inside);
          }
        }
      }
      if (has("labels")) {
        label(ctx, `Outside ${kPa(num(results.outsidePressure))}`, S.x, S.y + 22, { ...text, color: theme.sine });
        label(ctx, `Inside ${kPa(num(results.insidePressure))}`, S.x, S.y + 40, { ...text, color: theme.secant });
        caption(
          crushed
            ? `The outside wins by ${kPa(num(results.pushDifference))}: crushed`
            : air >= 99.5
              ? "Same push inside and out: nothing happens"
              : `Outside wins by ${kPa(num(results.pushDifference))}: not enough yet`,
        );
      }
      return;
    }

    if (sceneId === "patch") {
      const area = num(results.area, 1);
      const ground = bottom - 40;
      const w = clamp(Math.sqrt(area / 25) * S.width * 0.8, 6, S.width * 0.8);
      title(`The air pressing on ${airWindNumber(area, 2)} m²`);
      if (has("scene")) {
        ctx.save();
        ctx.strokeStyle = theme.axis;
        ctx.lineWidth = 1.5;
        segment(ctx, S.x, ground, right, ground);
        ctx.fillStyle = theme.angle;
        ctx.globalAlpha = 0.6;
        ctx.fillRect(cx - w / 2, ground - 6, w, 6);
        ctx.restore();
        label(ctx, `${airWindNumber(area, 2)} m²`, cx, ground + 14, { ...muted, align: "center" });
      }
      if (has("arrows")) {
        const n = 5;
        for (let k = 0; k < n; k++) {
          const x = cx - w / 2 + (w * (k + 0.5)) / n;
          arrow(ctx, x, S.y + 40, x, ground - 10, { color: theme.sine, width: 2, head: 8 });
        }
        label(ctx, "the air above presses down", cx, S.y + 28, { ...muted, align: "center" });
      }
      if (has("labels")) {
        label(ctx, `Push ${airWindNumber(num(results.airForceKN), 1)} kN`, S.x, ground - 44, { ...bold, color: theme.sine });
        label(ctx, `= weight of ${airWindWhole(num(results.holdsUpKg))} kg`, S.x, ground - 26, { ...text, color: theme.angle });
        caption(`About ${airWindNumber(num(results.holdsUpTonnes), 1)} tonnes pressing down`);
      }
      return;
    }

    if (sceneId === "bag") {
      const temp = num(results.bagTemp, 25);
      const moves = Math.round(num(results.bagMoves));
      const pivotY = S.y + 70;
      const arm = Math.min(110, S.width * 0.36);
      const tilt = -moves * 0.12;
      const ends = [-1, 1].map((sgn) => ({ x: cx + sgn * arm * Math.cos(tilt), y: pivotY + sgn * arm * Math.sin(tilt) }));
      const bagW = 46;
      const bagH = 58;
      title(`Air in the bag ${airWindNumber(temp, 0)} °C, room 25 °C`);
      if (has("scene")) {
        ctx.save();
        ctx.strokeStyle = theme.neutral;
        ctx.lineWidth = 3;
        segment(ctx, ends[0]!.x, ends[0]!.y, ends[1]!.x, ends[1]!.y);
        ctx.lineWidth = 2;
        segment(ctx, cx, pivotY, cx, bottom - 6);
        segment(ctx, cx - 30, bottom - 6, cx + 30, bottom - 6);
        ctx.lineWidth = 1.5;
        ends.forEach((end, i) => {
          const top = end.y + 18;
          segment(ctx, end.x, end.y, end.x, top);
          // A paper bag hung upside down, open end at the bottom.
          ctx.fillStyle = i === 0 ? theme.secant : theme.surface2;
          ctx.globalAlpha = i === 0 ? 0.35 : 1;
          ctx.fillRect(end.x - bagW / 2, top, bagW, bagH);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = theme.neutral;
          ctx.strokeRect(end.x - bagW / 2, top, bagW, bagH);
        });
        // The candle under the left bag.
        const candleX = cx - arm;
        ctx.fillStyle = theme.point;
        ctx.fillRect(candleX - 5, bottom - 40, 10, 34);
        ctx.restore();
        if (temp > 25.5) flame(ctx, theme, candleX, bottom - 42);
        label(ctx, "warmed", ends[0]!.x, ends[0]!.y + 18 + bagH + 12, { ...muted, align: "center" });
        label(ctx, "room air", ends[1]!.x, ends[1]!.y + 18 + bagH + 12, { ...muted, align: "center" });
      }
      if (has("arrows") && moves !== 0) {
        const x = ends[0]!.x - bagW / 2 - 12;
        const y = ends[0]!.y + 18 + bagH / 2;
        arrow(ctx, x, y + moves * 20, x, y - moves * 20, { color: theme.tangent, width: 2, head: 8 });
      }
      if (has("labels")) {
        label(ctx, `Bag ${airWindNumber(num(results.bagDensity), 2)} kg/m³`, S.x, S.y + 22, { ...text, color: theme.secant });
        label(ctx, `Room ${airWindNumber(num(results.roomDensity), 2)} kg/m³`, right, S.y + 22, { ...text, color: theme.sine, align: "right" });
        caption(
          moves > 0
            ? `Warm air is lighter: the bag goes up (${airWindNumber(num(results.bagLift), 1)} g)`
            : moves < 0
              ? `Cold air is heavier: the bag goes down (${airWindNumber(-num(results.bagLift), 1)} g)`
              : "Same air in both bags: the beam stays level",
        );
      }
      return;
    }

    if (sceneId === "blow") {
      const setup = AIRWIND_SETUPS[Math.round(num(results.setup))] ?? "balloons";
      const speed = num(results.windSpeed);
      const drop = num(results.pressureDrop);
      const moved = num(results.drawnIn) === 1;
      const pull = clamp(drop / 60, 0, 1);
      const windStyle = { color: theme.tangent, width: 2, head: 8 };
      const stillStyle = { color: theme.sine, width: 2, head: 7 };
      label(ctx, `Air at ${airWindNumber(speed, 0)} km/h`, right, S.y + 4, { ...text, align: "right" });

      if (setup === "balloons") {
        title("Blowing between two balloons");
        const topY = S.y + 20;
        const r = Math.min(34, S.width * 0.11);
        const gap = r + 30 - 16 * pull;
        const ballY = S.y + S.height * 0.5;
        const centres = [cx - gap, cx + gap];
        if (has("scene")) {
          ctx.save();
          ctx.strokeStyle = theme.muted;
          ctx.lineWidth = 1;
          for (const x of centres) segment(ctx, x, topY, x, ballY - r);
          ctx.restore();
          fillCircle(ctx, centres[0]!, ballY, r, theme.cosine, 0.85);
          fillCircle(ctx, centres[1]!, ballY, r, theme.curve, 0.85);
          if (moved) label(ctx, "They move together!", cx, ballY + r + 22, { ...bold, align: "center" });
        }
        if (has("arrows") && moved) {
          arrow(ctx, cx, ballY + r + 8, cx, ballY - r - 8, windStyle);
          arrow(ctx, centres[0]! - r - 30, ballY, centres[0]! - r - 4, ballY, stillStyle);
          arrow(ctx, centres[1]! + r + 30, ballY, centres[1]! + r + 4, ballY, stillStyle);
        }
      } else if (setup === "strip") {
        title("Blowing over a paper strip");
        const lipX = S.x + 30;
        const lipY = S.y + S.height * 0.4;
        const len = Math.min(200, S.width * 0.65);
        const endY = lipY + 70 * (1 - pull);
        if (has("scene")) {
          fillCircle(ctx, lipX - 12, lipY - 4, 10, theme.cosine, 0.8);
          ctx.save();
          ctx.strokeStyle = theme.point;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lipX, lipY);
          ctx.quadraticCurveTo(lipX + len * 0.5, lipY + (endY - lipY) * 0.2, lipX + len, endY);
          ctx.stroke();
          ctx.restore();
          if (moved) label(ctx, "The strip rises!", lipX + len / 2, lipY + 92, { ...bold, align: "center" });
        }
        if (has("arrows") && moved) {
          arrow(ctx, lipX + 4, lipY - 22, lipX + len, lipY - 22, windStyle);
          arrow(ctx, lipX + len * 0.6, lipY + 70, lipX + len * 0.6, lipY + 30, stillStyle);
        }
      } else {
        title("A storm wind over a roof");
        const lifts = num(results.roofLifts) === 1;
        const houseW = Math.min(170, S.width * 0.55);
        const houseH = 70;
        const ground = bottom - 30;
        const left = cx - houseW / 2;
        const eave = ground - houseH;
        const peak = eave - 38;
        const lift = lifts ? 30 : 0;
        if (has("scene")) {
          ctx.save();
          ctx.strokeStyle = theme.axis;
          ctx.lineWidth = 1.5;
          segment(ctx, S.x, ground, right, ground);
          ctx.fillStyle = theme.surface2;
          ctx.strokeStyle = theme.neutral;
          ctx.fillRect(left, eave, houseW, houseH);
          ctx.strokeRect(left, eave, houseW, houseH);
          ctx.fillStyle = theme.secant;
          ctx.beginPath();
          ctx.moveTo(left - 10, eave - lift);
          ctx.lineTo(cx, peak - lift);
          ctx.lineTo(left + houseW + 10, eave - lift);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          label(ctx, "still air inside", cx, eave + houseH / 2 + 18, { ...muted, align: "center" });
          if (lifts) label(ctx, "The roof lifts off!", cx, ground + 16, { ...bold, align: "center" });
        }
        if (has("arrows")) {
          if (speed > 0) arrow(ctx, S.x + 4, peak - lift - 22, S.x + 4 + clamp(speed / 200, 0.15, 1) * (S.width - 8), peak - lift - 22, windStyle);
          if (moved) arrow(ctx, cx, eave + houseH / 2, cx, eave - lift + 4, stillStyle);
        }
        if (has("labels")) label(ctx, `Push up ${airWindWhole(num(results.upliftForce))} N`, S.x, S.y + 22, { ...text, color: theme.angle });
      }

      if (has("labels")) {
        const where = setup === "balloons" ? "between them" : setup === "strip" ? "above the strip" : "above the roof";
        caption(moved ? `Pressure ${where} is ${airWindWhole(drop)} Pa lower` : "No moving air, no pressure drop");
      }
      return;
    }

    if (sceneId === "wind") {
      const earth = Math.round(num(results.map)) === 1;
      const dir = Math.round(num(results.windDirection));
      const gap = num(results.pressureGap);
      const width = 1.5 + clamp(gap, 0, 3);
      const flow = { color: theme.text, width, head: 9 };
      const aloft = { color: theme.muted, width: 1.5, head: 8, dash: [5, 4] };

      if (earth) {
        title("The Sun heats the equator most");
        const r = Math.min(S.width * 0.32, S.height * 0.38);
        const cy = S.y + S.height * 0.5;
        if (has("scene")) {
          fillCircle(ctx, cx, cy, r, theme.sine, 0.25);
          ctx.save();
          ctx.fillStyle = theme.secant;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(cx - r * 0.98, cy - r * 0.16, r * 1.96, r * 0.32);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = theme.neutral;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([4, 4]);
          segment(ctx, cx - r, cy, cx + r, cy);
          ctx.restore();
          label(ctx, "Equator", cx + r + 6, cy, muted);
          label(ctx, "North Pole", cx, cy - r - 10, { ...muted, align: "center" });
          label(ctx, "South Pole", cx, cy + r + 12, { ...muted, align: "center" });
          if (dir !== 0) {
            label(ctx, "L", cx, cy, { ...bold, align: "center" });
            label(ctx, "H", cx, cy - r * 0.7, { ...bold, align: "center" });
            label(ctx, "H", cx, cy + r * 0.7, { ...bold, align: "center" });
          }
        }
        if (has("arrows") && dir !== 0) {
          for (const f of [-0.45, 0.45]) {
            const x = cx + f * r;
            arrow(ctx, x, cy - r * 0.62, x, cy - r * 0.22, flow);
            arrow(ctx, x, cy + r * 0.62, x, cy + r * 0.22, flow);
          }
        }
        if (has("labels")) {
          label(ctx, `Equator ${kPa(num(results.warmPressure))}`, S.x, S.y + 22, { ...text, color: theme.secant });
          label(ctx, `Poles ${kPa(num(results.coolPressure))}`, right, S.y + 22, { ...text, color: theme.sine, align: "right" });
          caption(dir !== 0 ? "Air flows in towards the low pressure at the equator" : "Evenly heated: no wind");
        }
        return;
      }

      const lead = num(results.landLead);
      title(lead >= 0.5 ? "Summer: the land is hotter than the sea" : lead <= -0.5 ? "Winter: the land is cooler than the sea" : "Land and sea equally warm");
      const shore = cx;
      const ground = bottom - 46;
      const landX = S.x + S.width * 0.22;
      const seaX = S.x + S.width * 0.78;
      if (has("scene")) {
        ctx.save();
        ctx.fillStyle = theme.tangent;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(S.x, ground, shore - S.x, bottom - ground);
        ctx.fillStyle = theme.sine;
        ctx.fillRect(shore, ground + 8, right - shore, bottom - ground - 8);
        ctx.restore();
        label(ctx, "Land", S.x + 6, bottom - 14, bold);
        label(ctx, "Sea", right - 6, bottom - 14, { ...bold, align: "right" });
        if (num(results.rain) === 1) {
          // A rain cloud over the land.
          for (const dx of [-20, 0, 20]) fillCircle(ctx, landX + dx, S.y + 56, 16, theme.neutral, 0.8);
          ctx.save();
          ctx.strokeStyle = theme.sine;
          ctx.lineWidth = 1.5;
          for (let k = 0; k < 5; k++) segment(ctx, landX - 24 + k * 12, S.y + 76, landX - 28 + k * 12, S.y + 92);
          ctx.restore();
        }
      }
      if (has("arrows") && dir !== 0) {
        const low = ground - 18;
        const high = S.y + 112;
        const [warmX, coolX] = dir > 0 ? [landX, seaX] : [seaX, landX];
        arrow(ctx, coolX, low, warmX, low, flow);
        arrow(ctx, warmX, low - 10, warmX, high + 8, aloft);
        arrow(ctx, warmX, high, coolX, high, aloft);
        arrow(ctx, coolX, high + 8, coolX, low - 10, aloft);
      }
      if (has("labels")) {
        const landP = lead >= 0 ? num(results.warmPressure) : num(results.coolPressure);
        const seaP = lead >= 0 ? num(results.coolPressure) : num(results.warmPressure);
        label(ctx, `Land ${kPa(landP)}`, S.x + 6, ground - 40, { ...text, color: theme.tangent });
        label(ctx, `Sea ${kPa(seaP)}`, right - 6, ground - 40, { ...text, color: theme.sine, align: "right" });
        caption(
          num(results.rain) === 1
            ? "Wind from the sea brings the monsoon rain"
            : dir < 0
              ? "A dry wind blows from the land out to sea"
              : "No pressure difference, no wind",
        );
      }
      return;
    }

    if (sceneId === "cyclone") {
      const drop = num(results.centralDrop, 5);
      const r = num(results.distance);
      const region = Math.round(num(results.region));
      const span = 300;
      const half = S.width / 2 - 4;
      const toX = (km: number) => cx + (km / span) * half;
      const sea = bottom - 58;
      const graphTop = sea + 10;
      const graphBottom = bottom - 4;
      title(`Inside a cyclone: centre ${airWindNumber(drop, 1)} kPa lower`);
      if (has("scene")) {
        // The sea, and the cloud towering around the eye.
        ctx.save();
        ctx.strokeStyle = theme.sine;
        ctx.lineWidth = 2;
        segment(ctx, S.x, sea, right, sea);
        ctx.fillStyle = theme.neutral;
        ctx.globalAlpha = 0.3;
        for (const sgn of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(toX(sgn * 10), sea);
          const steps = 28;
          for (let k = 0; k <= steps; k++) {
            const km = 10 + (140 * k) / steps;
            const h = (sea - S.y - 40) * (km < 20 ? 1 : Math.max(0.15, 1 - (km - 20) / 150));
            ctx.lineTo(toX(sgn * km), sea - h);
          }
          ctx.lineTo(toX(sgn * 150), sea);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        label(ctx, "eye", cx, S.y + 30, { ...muted, align: "center" });
        // Wind speed under the sea line: calm in the eye, fiercest at the wall.
        const scale = Math.max(1, num(results.maxWind));
        ctx.save();
        ctx.strokeStyle = theme.tangent;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k <= 120; k++) {
          const km = -span + (2 * span * k) / 120;
          const v = airWindCyclone(drop, Math.abs(km)).wind;
          const y = graphBottom - ((graphBottom - graphTop) * v) / scale;
          if (k === 0) ctx.moveTo(toX(km), y);
          else ctx.lineTo(toX(km), y);
        }
        ctx.stroke();
        ctx.restore();
        label(ctx, "wind", S.x, graphTop + 6, muted);
        // Where you are.
        const youX = toX(r);
        fillCircle(ctx, youX, sea - 6, 5, theme.angle);
        label(ctx, "you", clamp(youX, S.x + 12, right - 12), sea - 20, { ...text, align: "center" });
      }
      if (has("arrows")) {
        const style = { color: theme.text, width: 2, head: 8 };
        arrow(ctx, toX(-280), sea - 14, toX(-160), sea - 14, style);
        arrow(ctx, toX(280), sea - 14, toX(160), sea - 14, style);
        const up = { color: theme.muted, width: 1.5, head: 7, dash: [5, 4] };
        arrow(ctx, toX(-15), sea - 30, toX(-15), S.y + 70, up);
        arrow(ctx, toX(15), sea - 30, toX(15), S.y + 70, up);
      }
      if (has("labels")) {
        label(ctx, `Wind here ${airWindWhole(num(results.windHere))} km/h`, S.x, S.y + 4, { ...text, color: theme.tangent });
        label(ctx, `Pressure ${kPa(num(results.pressureHere))}`, right, S.y + 4, { ...text, color: theme.sine, align: "right" });
      }
      caption(
        region === 0 ? "The eye: calm, clear, lowest pressure" : region === 1 ? "In the storm clouds: fierce wind and rain" : "Outside the storm",
      );
      return;
    }

    // Tracking: the coast on the left, the cyclone out at sea.
    const distance = num(results.coastDistance);
    const speed = num(results.stormSpeed, 15);
    const warning = clamp(Math.round(num(results.warning)), 0, 3);
    const coastX = S.x + 36;
    const far = right - 22;
    const toX = (km: number) => coastX + (clamp(km, 0, 1000) / 1000) * (far - coastX);
    const y = S.y + S.height * 0.48;
    title("Tracking a cyclone towards the coast");
    if (has("scene")) {
      ctx.save();
      ctx.fillStyle = theme.tangent;
      ctx.globalAlpha = 0.35;
      ctx.fillRect(S.x, S.y + 30, coastX - S.x, S.height - 60);
      ctx.fillStyle = theme.sine;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(coastX, S.y + 30, right - coastX, S.height - 60);
      ctx.restore();
      label(ctx, "Coast", S.x + 2, S.y + 42, muted);
      const sx = toX(distance);
      fillCircle(ctx, sx, y, 16, theme.neutral, 0.6);
      ctx.save();
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, y, 10, 0.3, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, y, 10, Math.PI + 0.3, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      label(ctx, `${airWindWhole(distance)} km from the coast`, clamp(sx, coastX + 70, right - 70), y + 32, { ...text, align: "center" });
      const color = warning >= 2 ? theme.secant : warning === 1 ? theme.angle : theme.muted;
      label(ctx, WARNINGS[warning]!, cx, bottom - 12, { color, font: theme.fontStrong, align: "center" });
    }
    if (has("arrows") && distance >= 1) {
      const sx = toX(distance);
      arrow(ctx, sx - 20, y, Math.max(coastX + 2, sx - 60), y, { color: theme.text, width: 2, head: 8 });
      label(ctx, `${airWindNumber(speed, 0)} km/h`, clamp(sx - 40, coastX + 26, right - 26), y - 26, { ...muted, align: "center" });
    }
    if (has("labels")) {
      const marks: [number, string][] = [
        [speed * 24, "24 h"],
        [speed * 48, "48 h"],
      ];
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([4, 4]);
      for (const [km] of marks) if (km <= 1000) segment(ctx, toX(km), S.y + 52, toX(km), bottom - 50);
      ctx.restore();
      for (const [km, words] of marks) if (km <= 1000) label(ctx, words, toX(km), S.y + 44, { ...muted, align: "center" });
      caption(`${airWindWhole(num(results.hoursToCoast))} hours before it reaches the coast`);
    }
  },
};
