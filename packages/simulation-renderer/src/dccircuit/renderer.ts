/**
 * Current electricity, one circuit diagram per layer.
 *
 * drift — a copper wire with its free electrons drifting against the current
 * wire — a wire to scale (length and thickness), and ρ/ρ₀ against temperature
 * network — three resistors in series, parallel or mixed, with a table of I, V, P
 * cells — one or two cells (with internal resistance) driving a load, and P against R
 * kirchhoff — the two-loop circuit with its junction and loop equations
 * wheatstone — the bridge P, Q, R, S with its galvanometer
 * meterbridge — the wire X against the box S, a jockey on a 100 cm wire
 * potentiometer — a 10 m wire at 1 V/m balancing a cell
 * rc — a capacitor charging or discharging through R, and q against t/RC
 *
 * Numbers a level might ask for are drawn only with the "labels" layer.
 */

import { DC_BRIDGE_LENGTH, DC_MATERIAL_ORDER, DC_MATERIALS, DC_POT_LENGTH } from "@ise/physics-engine";
import { arrow, label, num } from "../shared/draw";
import { clipToPlane, createPlane, drawPlane, type Plane } from "../shared/plane";
import type { LabTheme } from "../theme";
import type { SimulationRenderer } from "../types";

export interface DcCircuitLayout {
  width: number;
  height: number;
  compact: boolean;
  /** Left and right edges of the circuits. */
  left: number;
  right: number;
}

export function computeDcCircuitLayout(width: number): DcCircuitLayout {
  return { width, height: 400, compact: width < 560, left: 24, right: width - 24 };
}

type Pt = readonly [number, number];

// ── Numbers ──────────────────────────────────────────────────────────────────

const SUPERSCRIPT: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** Fixed decimals with a proper minus, and no "−0.00". */
export function dcFixed(v: number, digits = 2): string {
  const body = Math.abs(v).toFixed(digits);
  return v < 0 && Number(body) !== 0 ? `−${body}` : body;
}

/** Scientific notation, e.g. 1.70 × 10⁻⁸. */
export function dcSci(v: number, figures = 3): string {
  if (v === 0 || !Number.isFinite(v)) return "0";
  let exp = Math.floor(Math.log10(Math.abs(v)));
  let mantissa = Math.abs(v) / 10 ** exp;
  if (Number(mantissa.toFixed(figures - 1)) >= 10) {
    exp += 1;
    mantissa /= 10;
  }
  const power = String(exp).split("").map((c) => SUPERSCRIPT[c] ?? c).join("");
  return `${v < 0 ? "−" : ""}${mantissa.toFixed(figures - 1)} × 10${power}`;
}

/** Up to `digits` decimals, trailing zeros dropped: 10 → "10", 2.5 → "2.5". */
const trim = (v: number, digits = 2) => {
  const s = dcFixed(Number(v.toFixed(digits)), digits);
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
};
/** Three significant figures, in powers of ten only when very large or small. */
const smart = (v: number) => (v !== 0 && (Math.abs(v) >= 1e4 || Math.abs(v) < 0.01) ? dcSci(v) : dcFixed(v, Math.max(0, 2 - Math.floor(Math.log10(Math.abs(v) || 1)))));
/** A value in brackets when negative, for substituting into an equation. */
const paren = (v: number, digits = 2) => (v < 0 && Number(Math.abs(v).toFixed(digits)) !== 0 ? `(${dcFixed(v, digits)})` : dcFixed(v, digits));

// ── Circuit symbols ──────────────────────────────────────────────────────────

function wire(ctx: CanvasRenderingContext2D, points: readonly Pt[], colour: string, width = 2, dash?: number[]) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(points[0]![0], points[0]![1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.stroke();
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

const along = (a: Pt, b: Pt) => {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const ux = (b[0] - a[0]) / len;
  const uy = (b[1] - a[1]) / len;
  return { len, ux, uy, px: -uy, py: ux, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 };
};

/** A zigzag resistor between two terminals, with leads. */
function resistor(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, colour: string, lead: string) {
  const { len, ux, uy, px, py } = along(a, b);
  const body = Math.min(34, len * 0.7);
  const start = (len - body) / 2;
  wire(ctx, [a, [a[0] + ux * start, a[1] + uy * start]], lead);
  wire(ctx, [[a[0] + ux * (start + body), a[1] + uy * (start + body)], b], lead);
  const zig: Pt[] = [[a[0] + ux * start, a[1] + uy * start]];
  for (let k = 1; k < 6; k++) {
    const s = start + (body * k) / 6;
    const side = k % 2 === 1 ? 5 : -5;
    zig.push([a[0] + ux * s + px * side, a[1] + uy * s + py * side]);
  }
  zig.push([a[0] + ux * (start + body), a[1] + uy * (start + body)]);
  wire(ctx, zig, colour, 2);
}

/** A cell between two terminals: the long plate is +. */
function cell(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, plusAtA: boolean, colour: string, lead: string, faint = false) {
  const { ux, uy, px, py, mx, my } = along(a, b);
  const pa: Pt = [mx - ux * 3.5, my - uy * 3.5];
  const pb: Pt = [mx + ux * 3.5, my + uy * 3.5];
  const alpha = faint ? 0.35 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  wire(ctx, [a, pa], lead);
  wire(ctx, [pb, b], lead);
  const plate = (p: Pt, half: number, width: number) => wire(ctx, [[p[0] + px * half, p[1] + py * half], [p[0] - px * half, p[1] - py * half]], colour, width);
  plate(pa, plusAtA ? 12 : 6, plusAtA ? 2 : 4);
  plate(pb, plusAtA ? 6 : 12, plusAtA ? 4 : 2);
  ctx.restore();
}

/** Two equal plates. */
function capacitor(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, colour: string, lead: string) {
  const { ux, uy, px, py, mx, my } = along(a, b);
  const pa: Pt = [mx - ux * 4, my - uy * 4];
  const pb: Pt = [mx + ux * 4, my + uy * 4];
  wire(ctx, [a, pa], lead);
  wire(ctx, [pb, b], lead);
  for (const p of [pa, pb]) wire(ctx, [[p[0] + px * 13, p[1] + py * 13], [p[0] - px * 13, p[1] - py * 13]], colour, 3);
}

/** A galvanometer whose needle swings with the current through it (deflection −1 … 1). */
function galvanometer(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, deflection: number, theme: LabTheme) {
  const { ux, uy, mx, my } = along(a, b);
  const r = 12;
  wire(ctx, [a, [mx - ux * r, my - uy * r]], theme.neutral);
  wire(ctx, [[mx + ux * r, my + uy * r], b], theme.neutral);
  ctx.save();
  ctx.strokeStyle = theme.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(mx, my, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Zero mark, then the needle from a pivot near the bottom of the dial.
  wire(ctx, [[mx, my - r + 1], [mx, my - r + 4]], theme.muted, 1.5);
  const angle = Math.max(-1, Math.min(1, deflection)) * 1.0;
  const pivot: Pt = [mx, my + 6];
  const zero = Math.abs(deflection) < 0.02;
  wire(ctx, [pivot, [pivot[0] + Math.sin(angle) * 15, pivot[1] - Math.cos(angle) * 15]], zero ? theme.tangent : theme.secant, 2);
  dot(ctx, pivot[0], pivot[1], 2, theme.text);
}

/** How far a galvanometer needle swings for a current in mA. */
const swing = (mA: number) => Math.tanh(mA / 3);

// ── Graph helpers ────────────────────────────────────────────────────────────

function curve(ctx: CanvasRenderingContext2D, plane: Plane, f: (x: number) => number, colour: string) {
  const [x0, x1] = plane.xDomain;
  ctx.save();
  clipToPlane(ctx, plane);
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 200; i++) {
    const x = x0 + ((x1 - x0) * i) / 200;
    const [px, py] = plane.toPx(x, f(x));
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

// ── The renderer ─────────────────────────────────────────────────────────────

const NETWORK_TITLES = ["Three resistors in series", "Three resistors in parallel", "R₁ in series with R₂ and R₃ in parallel"];
const NETWORK_RULES = ["Series: one current; the voltages add up", "Parallel: one voltage; the currents add up", "R₂ and R₃ share the current through R₁"];
const CELLS_TITLES = ["One cell and a load", "Two cells in series", "Two cells in series, opposing", "Two cells in parallel"];

export const dcCircuitRenderer: SimulationRenderer<DcCircuitLayout> = {
  id: "dccircuit",
  layout: (width) => computeDcCircuitLayout(width),

  draw(ctx, layout, input) {
    const { theme, layers, results } = input;
    const has = (layer: string) => layers.has(layer);
    const words = has("labels");
    const { width: w, height: h, left: x0, right: x1 } = layout;
    const W = x1 - x0;
    const r = (key: string, fallback = 0) => num(results[key], fallback);
    ctx.clearRect(0, 0, w, h);

    const text = (t: string, x: number, y: number, colour = theme.text, align: CanvasTextAlign = "left", strong = false) =>
      label(ctx, t, x, y, { color: colour, font: strong ? theme.fontStrong : theme.font, align });
    const title = (t: string) => text(t, w / 2, 14, theme.text, "center", true);
    const caption = (t: string, line = 0) => text(t, w / 2, h - 14 - 18 * line, theme.text, "center");
    const lead = theme.neutral;

    // ── Drift ──
    if (has("drift")) {
      const I = r("current", 1.5);
      const vd = r("driftSpeed");
      const clock = r("clock");
      title("Electrons drifting in a copper wire");
      const top = 56;
      const bottom = 126;
      ctx.save();
      ctx.fillStyle = theme.secant;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x0, top, W, bottom - top);
      ctx.restore();
      wire(ctx, [[x0, top], [x1, top]], theme.axis, 1.5);
      wire(ctx, [[x0, bottom], [x1, bottom]], theme.axis, 1.5);
      // The fixed ions of the lattice.
      for (let gx = x0 + 12; gx < x1 - 4; gx += 24) for (let gy = top + 12; gy < bottom - 4; gy += 23) dot(ctx, gx, gy, 2.5, theme.muted, 0.5);
      // Free electrons: a fast random jiggle with a slow drift against the current, 14 px per mm.
      const shift = vd * clock * 14;
      const count = Math.max(12, Math.round(W / 12));
      for (let i = 0; i < count; i++) {
        const base = (i * 37.7) % W;
        const jx = 4 * Math.sin(clock * (6 + (i % 5)) + i * 1.7);
        const jy = 4 * Math.cos(clock * (5 + (i % 7)) + i * 2.3);
        const x = x0 + ((((base - shift + jx) % W) + W) % W);
        const y = top + 8 + ((i * 0.618034) % 1) * (bottom - top - 16) + jy;
        dot(ctx, x, y, 3, theme.sine);
      }
      arrow(ctx, x0 + 4, 42, x0 + 64, 42, { color: theme.angle, width: 2.5, head: 8 });
      text(`current I = ${trim(I, 1)} A`, x0 + 72, 42, theme.angle);
      arrow(ctx, x1 - 4, 142, x1 - 64, 142, { color: theme.sine, width: 2.5, head: 8 });
      text("electrons drift this way", x1 - 72, 142, theme.sine, "right");

      const lines: [string, string][] = [
        ["n = 8.5 × 10²⁸ free electrons per m³", ""],
        [`A = ${trim(r("area"), 2)} mm² = ${dcSci(r("area") * 1e-6, 2)} m²`, ""],
        ["v_d = I / (neA)", `v_d = I / (neA) = ${dcFixed(vd, 3)} mm/s`],
        ["J = I / A", `J = I / A = ${dcSci(r("currentDensity"))} A/m²`],
        ["E = ρJ, with ρ = 1.7 × 10⁻⁸ Ω m", `E = ρJ = ${dcFixed(r("driftField"), 3)} V/m`],
        ["μ = v_d / E", `μ = v_d / E = ${dcSci(r("mobility"))} m²/(V s)`],
        ["τ = m / (ne²ρ)", `τ = m / (ne²ρ) = ${dcSci(r("relaxation"))} s`],
      ];
      lines.forEach(([plain, worked], i) => text(words && worked ? worked : plain, x0, 172 + 20 * i, i < 2 ? theme.muted : theme.text));
      if (words) caption(`An electron takes ${dcFixed(r("driftTime") / 60, 1)} min to drift 1 m`);
    }

    // ── Wire ──
    if (has("wire")) {
      const material = DC_MATERIAL_ORDER[Math.round(r("material"))] ?? "nichrome";
      const m = DC_MATERIALS[material];
      const L = r("length", 1);
      const A = r("area", 0.1);
      const T = r("temp");
      title(`R = ρL/A: a ${m.label.toLowerCase()} wire at ${trim(T, 0)} °C`);
      const long = Math.max(24, (L / 5) * (W - 20));
      const thick = Math.max(4, Math.min(28, 4 + Math.sqrt(A) * 10));
      const cy = 64;
      ctx.save();
      ctx.fillStyle = theme.neutral;
      ctx.globalAlpha = 0.45;
      ctx.fillRect(x0 + 10, cy - thick / 2, long, thick);
      ctx.fillStyle = theme.secant;
      ctx.globalAlpha = Math.min(0.85, (T / 300) * 0.85);
      ctx.fillRect(x0 + 10, cy - thick / 2, long, thick);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = theme.axis;
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 10, cy - thick / 2, long, thick);
      ctx.restore();
      arrow(ctx, x0 + 10, 96, x0 + 10 + long, 96, { color: theme.muted, width: 1.2, head: 6, double: true });
      text(`L = ${trim(L, 2)} m`, x0 + 10 + long / 2, 108, theme.muted, "center");

      const lines: [string, string][] = [
        [`ρ₀ = ${dcSci(m.rho0, 2)} Ω m, α = ${m.alpha < 1e-4 ? dcSci(m.alpha, 1) : trim(m.alpha, 4)} per °C`, ""],
        [`A = ${trim(A, 2)} mm², T = ${trim(T, 0)} °C, V = ${trim(r("emf"), 1)} V`, ""],
        ["ρ = ρ₀[1 + α(T − T₀)], T₀ = 0 °C", `ρ = ρ₀[1 + α(T − T₀)] = ${dcSci(r("rho"))} Ω m`],
        ["R = ρL / A", `R = ρL / A = ${dcFixed(r("wireR"), r("wireR") < 1 ? 4 : 2)} Ω`],
        ["I = V / R", `I = V / R = ${smart(r("wireI"))} A`],
      ];
      lines.forEach(([plain, worked], i) => text(words && worked ? worked : plain, x0, 132 + 20 * i, i < 2 ? theme.muted : theme.text));

      const plane = createPlane({ x: 48, y: 252, width: w - 48 - 16, height: 100 }, [0, 300], [0, 3.2]);
      drawPlane(ctx, plane, theme);
      text("ρ/ρ₀ against T / °C, for this metal", 52, 240, theme.muted);
      curve(ctx, plane, (t) => 1 + m.alpha * t, theme.curve);
      const [px, py] = plane.toPx(T, r("wireRatio", 1));
      dot(ctx, px, py, 5, theme.angle);
      if (words) caption(`R rises ${dcFixed((r("wireRatio", 1) - 1) * 100, 1)} % from 0 °C to ${trim(T, 0)} °C`);
    }

    // ── Network ──
    if (has("network")) {
      const kind = Math.round(r("network"));
      title(NETWORK_TITLES[kind] ?? NETWORK_TITLES[0]!);
      const top = 60;
      const bottom = 186;
      const bx = x0 + 10;
      const rx = x1 - 6;
      const R = [r("r1"), r("r2"), r("r3")];
      cell(ctx, [bx, 140], [bx, 104], false, theme.angle, lead);
      text(`${trim(r("emf"), 1)} V`, bx + 16, 122, theme.angle);
      wire(ctx, [[bx, 104], [bx, top]], lead);
      wire(ctx, [[bx, 140], [bx, bottom]], lead);
      const name = (i: number, x: number, y: number, align: CanvasTextAlign = "left") => {
        text(`R${"₁₂₃"[i]}`, x, y - 8, theme.curve, align, true);
        text(`${trim(R[i]!, 0)} Ω`, x, y + 9, theme.text, align);
      };
      if (kind === 0) {
        const a = x0 + W * 0.36;
        const b = x0 + W * 0.66;
        wire(ctx, [[bx, top], [a, top]], lead);
        resistor(ctx, [a, top], [b, top], theme.curve, lead);
        wire(ctx, [[b, top], [rx, top], [rx, 92]], lead);
        resistor(ctx, [rx, 92], [rx, 154], theme.curve, lead);
        wire(ctx, [[rx, 154], [rx, bottom], [b, bottom]], lead);
        resistor(ctx, [b, bottom], [a, bottom], theme.curve, lead);
        wire(ctx, [[a, bottom], [bx, bottom]], lead);
        text(`R₁ = ${trim(R[0]!, 0)} Ω`, (a + b) / 2, top - 16, theme.curve, "center");
        name(1, rx - 14, 123, "right");
        text(`R₃ = ${trim(R[2]!, 0)} Ω`, (a + b) / 2, bottom + 16, theme.curve, "center");
      } else if (kind === 1) {
        const xs = [0.4, 0.63, 0.86].map((f) => x0 + W * f);
        wire(ctx, [[bx, top], [xs[2]!, top]], lead);
        wire(ctx, [[bx, bottom], [xs[2]!, bottom]], lead);
        xs.forEach((x, i) => {
          wire(ctx, [[x, top], [x, 92]], lead);
          resistor(ctx, [x, 92], [x, 154], theme.curve, lead);
          wire(ctx, [[x, 154], [x, bottom]], lead);
          name(i, x + 11, 123);
        });
      } else {
        const a = x0 + W * 0.22;
        const b = x0 + W * 0.48;
        const xs = [x0 + W * 0.64, x0 + W * 0.86];
        wire(ctx, [[bx, top], [a, top]], lead);
        resistor(ctx, [a, top], [b, top], theme.curve, lead);
        wire(ctx, [[b, top], [xs[1]!, top]], lead);
        wire(ctx, [[bx, bottom], [xs[1]!, bottom]], lead);
        xs.forEach((x, i) => {
          wire(ctx, [[x, top], [x, 92]], lead);
          resistor(ctx, [x, 92], [x, 154], theme.curve, lead);
          wire(ctx, [[x, 154], [x, bottom]], lead);
          name(i + 1, x + 11, 123);
        });
        text(`R₁ = ${trim(R[0]!, 0)} Ω`, (a + b) / 2, top - 16, theme.curve, "center");
      }
      if (words) {
        arrow(ctx, bx + 8, top - 12, bx + 40, top - 12, { color: theme.angle, width: 2, head: 7 });
      }

      // A table: each resistor's current, voltage and power.
      const cols = [x0 - 8, x0 + W * 0.17, x0 + W * 0.37, x0 + W * 0.6, x0 + W * 0.8];
      const row = (y: number, cells: string[], colour = theme.text) => cells.forEach((c, i) => text(c, cols[i]!, y, i === 0 ? theme.curve : colour));
      row(226, ["", "R", "I", "V", "P"], theme.muted);
      for (let i = 0; i < 3; i++) {
        const I = r(`netI${i + 1}`);
        const V = r(`netV${i + 1}`);
        row(246 + 20 * i, [`R${"₁₂₃"[i]}`, `${trim(R[i]!, 0)} Ω`, words ? `${dcFixed(I, 3)} A` : "?", words ? `${dcFixed(V, 2)} V` : "?", words ? `${dcFixed(r(`netP${i + 1}`), 3)} W` : "?"]);
      }
      row(312, ["all", words ? `${dcFixed(r("netReq"), 2)} Ω` : "R_eq?", words ? `${dcFixed(r("netI"), 3)} A` : "?", `${trim(r("emf"), 1)} V`, words ? `${dcFixed(r("netP"), 3)} W` : "?"]);
      caption(NETWORK_RULES[kind] ?? NETWORK_RULES[0]!);
    }

    // ── Cells ──
    if (has("cells")) {
      const kind = Math.round(r("cells"));
      title(CELLS_TITLES[kind] ?? CELLS_TITLES[0]!);
      const top = 68;
      const bottom = 164;
      const lx = x0;
      const rx = x1;
      const E = r("emf");
      const E2 = r("emf2");
      const box = { x: x0 + W * 0.12, y: 24, w: W * 0.76, h: 80 };
      ctx.save();
      ctx.strokeStyle = theme.muted;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.restore();
      const pair = (from: number, to: number, y: number, e: number, rr: number, plusLeft: boolean, tag: string) => {
        const span = to - from;
        const c1 = from + span * 0.1;
        const c2 = from + span * 0.36;
        const r1 = from + span * 0.5;
        const r2 = from + span * 0.92;
        wire(ctx, [[from, y], [c1, y]], lead);
        cell(ctx, [c1, y], [c2, y], plusLeft, theme.angle, lead);
        wire(ctx, [[c2, y], [r1, y]], lead);
        resistor(ctx, [r1, y], [r2, y], theme.cosine, lead);
        wire(ctx, [[r2, y], [to, y]], lead);
        text(`${tag}${trim(e, 1)} V`, (c1 + c2) / 2, y - 18, theme.angle, "center");
        text(`${trim(rr, 1)} Ω`, (r1 + r2) / 2, y - 14, theme.cosine, "center");
      };
      const bl = box.x;
      const br = box.x + box.w;
      if (kind === 0) {
        pair(bl, br, top, E, r("intR"), true, "E = ");
      } else if (kind === 3) {
        wire(ctx, [[bl, 52], [bl, 92]], lead);
        wire(ctx, [[br, 52], [br, 92]], lead);
        pair(bl, br, 52, E, r("intR"), true, "");
        pair(bl, br, 92, E2, r("intR2"), true, "");
      } else {
        const mid = bl + box.w / 2;
        pair(bl, mid, top, E, r("intR"), true, "");
        pair(mid, br, top, E2, r("intR2"), kind === 1, "");
      }
      const midY = kind === 3 ? 70 : top;
      wire(ctx, [[bl, midY], [lx, midY], [lx, bottom], [x0 + W * 0.36, bottom]], lead);
      wire(ctx, [[br, midY], [rx, midY], [rx, bottom], [x0 + W * 0.64, bottom]], lead);
      resistor(ctx, [x0 + W * 0.36, bottom], [x0 + W * 0.64, bottom], theme.curve, lead);
      text(`R = ${trim(r("load"), 1)} Ω`, x0 + W / 2, bottom + 17, theme.curve, "center");
      if (words) {
        const I = r("cellI");
        text(`I = ${dcFixed(I, 3)} A`, rx - 8, 118, theme.angle, "right");
        text(`V = ${dcFixed(r("terminal"), 2)} V`, lx + 8, 118, theme.text);
        if (Math.abs(I) > 1e-9) arrow(ctx, rx + 0, I > 0 ? 86 : 150, rx + 0, I > 0 ? 150 : 86, { color: theme.angle, width: 2, head: 8 });
      }

      const eqR = Math.max(r("eqR"), 1e-6);
      const eqE = r("eqEmf");
      const xMax = r("load") > 20 ? 50 : 20;
      const yMax = Math.max(0.1, r("maxP") * 1.2);
      const plane = createPlane({ x: 48, y: 222, width: w - 48 - 16, height: 112 }, [0, xMax], [0, yMax]);
      drawPlane(ctx, plane, theme);
      text("power in R / W, against R / Ω", 52, 210, theme.muted);
      curve(ctx, plane, (R) => (eqE * eqE * R) / ((R + eqR) * (R + eqR)), theme.curve);
      const [px, py] = plane.toPx(r("load"), r("loadP"));
      dot(ctx, px, py, 5, theme.angle);
      if (words) {
        const [mx] = plane.toPx(eqR, 0);
        wire(ctx, [[mx, plane.rect.y], [mx, plane.rect.y + plane.rect.height]], theme.tangent, 1.5, [4, 4]);
        caption(`${dcFixed(r("loadP"), 2)} W in R, ${dcFixed(r("lostP"), 2)} W lost inside`);
        if (kind !== 0) caption(`E_eq = ${dcFixed(eqE, 2)} V, r_eq = ${dcFixed(r("eqR"), 2)} Ω`, 1);
        else caption(`V = E − Ir = ${dcFixed(E, 1)} − ${dcFixed(r("cellI"), 2)} × ${trim(r("intR"), 1)}`, 1);
      }
    }

    // ── Kirchhoff ──
    if (has("kirchhoff")) {
      title("Kirchhoff's rules: two loops");
      const top = 54;
      const bottom = 176;
      const xl = x0 + 6;
      const xm = x0 + W / 2;
      const xr = x1 - 6;
      wire(ctx, [[xl, top], [xr, top]], lead);
      wire(ctx, [[xl, bottom], [xr, bottom]], lead);
      dot(ctx, xm, top, 3.5, theme.text);
      dot(ctx, xm, bottom, 3.5, theme.text);
      const branch = (x: number, withCell: boolean) => {
        if (withCell) {
          wire(ctx, [[x, bottom], [x, 160]], lead);
          cell(ctx, [x, 160], [x, 132], false, theme.angle, lead);
          wire(ctx, [[x, 132], [x, 112]], lead);
          resistor(ctx, [x, 112], [x, 70], theme.curve, lead);
          wire(ctx, [[x, 70], [x, top]], lead);
        } else {
          wire(ctx, [[x, bottom], [x, 140]], lead);
          resistor(ctx, [x, 140], [x, 90], theme.curve, lead);
          wire(ctx, [[x, 90], [x, top]], lead);
        }
      };
      branch(xl, true);
      branch(xm, false);
      branch(xr, true);
      const E1 = r("emf");
      const E2 = r("emf2");
      const [R1, R2, R3] = [r("r1"), r("r2"), r("r3")];
      text(`E₁ ${trim(E1, 1)} V`, xl + 15, 146, theme.angle);
      text(`R₁ ${trim(R1, 0)} Ω`, xl + 13, 91, theme.curve);
      text(`R₃ ${trim(R3, 0)} Ω`, xm + 13, 115, theme.curve);
      text(`E₂ ${trim(E2, 1)} V`, xr - 15, 146, theme.angle, "right");
      text(`R₂ ${trim(R2, 0)} Ω`, xr - 13, 91, theme.curve, "right");
      // The directions assumed for the three currents.
      arrow(ctx, xl - 9, 126, xl - 9, 96, { color: theme.sine, width: 2, head: 7 });
      arrow(ctx, xr + 9, 126, xr + 9, 96, { color: theme.sine, width: 2, head: 7 });
      arrow(ctx, xm - 10, 76, xm - 10, 104, { color: theme.sine, width: 2, head: 7 });
      text("I₁", xl - 4, top - 10, theme.sine);
      text("I₃", xm - 4, top - 10, theme.sine);
      text("I₂", xr + 4, top - 10, theme.sine, "right");

      const [I1, I2, I3] = [r("kI1"), r("kI2"), r("kI3")];
      const block: [string, string][] = [
        ["Junction: I₁ + I₂ = I₃", `${paren(I1)} + ${paren(I2)} = ${dcFixed(I3, 2)} A`],
        ["Loop 1: E₁ = I₁R₁ + I₃R₃", `${dcFixed(E1, 1)} = ${paren(I1)} × ${trim(R1, 0)} + ${paren(I3)} × ${trim(R3, 0)}`],
        ["Loop 2: E₂ = I₂R₂ + I₃R₃", `${dcFixed(E2, 1)} = ${paren(I2)} × ${trim(R2, 0)} + ${paren(I3)} × ${trim(R3, 0)}`],
      ];
      block.forEach(([rule, worked], i) => {
        text(rule, x0, 206 + 40 * i, theme.text, "left", true);
        if (words) text(worked, x0 + 12, 224 + 40 * i, theme.sine);
      });
      if (words) {
        const backward = [I1, I2, I3].findIndex((v) => v < -1e-9);
        caption(backward < 0 ? "Every current flows the way it is drawn" : `I${"₁₂₃"[backward]} < 0: it flows against its arrow`);
      }
    }

    // ── Wheatstone ──
    if (has("wheatstone")) {
      title("Wheatstone bridge");
      const cx = w / 2;
      const cy = 118;
      const hw = Math.min(110, W / 2 - 20);
      const hh = 66;
      const A: Pt = [cx - hw, cy];
      const B: Pt = [cx, cy - hh];
      const C: Pt = [cx + hw, cy];
      const D: Pt = [cx, cy + hh];
      resistor(ctx, A, B, theme.curve, lead);
      resistor(ctx, B, C, theme.curve, lead);
      resistor(ctx, A, D, theme.curve, lead);
      resistor(ctx, D, C, theme.curve, lead);
      galvanometer(ctx, B, D, swing(r("bridgeIg")), theme);
      const by = cy + hh + 34;
      wire(ctx, [A, [A[0], by], [cx - 14, by]], lead);
      wire(ctx, [C, [C[0], by], [cx + 14, by]], lead);
      cell(ctx, [cx - 14, by], [cx + 14, by], true, theme.angle, lead);
      text(`${trim(r("emf"), 1)} V`, cx, by + 18, theme.angle, "center");
      for (const [p, name, dx, dy] of [[A, "A", -10, 0], [B, "B", 0, -12], [C, "C", 10, 0], [D, "D", 0, 13]] as const) {
        dot(ctx, p[0], p[1], 3, theme.text);
        text(name, p[0] + dx, p[1] + dy, theme.muted, dx < 0 ? "right" : dx > 0 ? "left" : "center");
      }
      text("G", cx + 16, cy, theme.text);
      const arm = (a: Pt, b: Pt, name: string, value: number, out: 1 | -1) => {
        const mx = (a[0] + b[0]) / 2;
        const my = (a[1] + b[1]) / 2;
        text(`${name} ${trim(value, 1)} Ω`, mx + out * 10, my + (my < cy ? -12 : 12), theme.curve, out < 0 ? "right" : "left");
      };
      arm(A, B, "P", r("r1"), -1);
      arm(B, C, "Q", r("r2"), 1);
      arm(A, D, "R", r("r3"), -1);
      arm(D, C, "S", r("box"), 1);
      text(`P/Q = ${trim(r("r1"), 1)}/${trim(r("r2"), 1)}   R/S = ${trim(r("r3"), 1)}/${trim(r("box"), 1)}`, w / 2, 262, theme.text, "center");
      if (words) {
        text(`P/Q = ${dcFixed(r("ratioPQ"), 3)}   R/S = ${dcFixed(r("ratioRS"), 3)}`, w / 2, 282, theme.muted, "center");
        if (r("bridgeBalanced") === 1) caption("Balanced: P/Q = R/S, and no current in G");
        else {
          caption(`I_g = ${dcFixed(r("bridgeIg"), 2)} mA through G`, 1);
          caption(`S = ${dcFixed(r("balancingS"), 1)} Ω would balance it`);
        }
      } else caption(Math.abs(r("bridgeIg")) < 1e-9 ? "G reads zero" : "G deflects");
    }

    // ── Metre bridge ──
    if (has("meterbridge")) {
      const material = DC_MATERIAL_ORDER[Math.round(r("material"))] ?? "nichrome";
      title("Metre bridge");
      const strip = 84;
      const wy = 186;
      const toX = (cm: number) => x0 + (cm / DC_BRIDGE_LENGTH) * W;
      const B: Pt = [x0 + W / 2, strip];
      wire(ctx, [[x0, wy], [x0, strip], [x0 + W * 0.1, strip]], theme.neutral, 4);
      resistor(ctx, [x0 + W * 0.1, strip], [x0 + W * 0.4, strip], theme.secant, lead);
      wire(ctx, [[x0 + W * 0.4, strip], [x0 + W * 0.6, strip]], theme.neutral, 4);
      resistor(ctx, [x0 + W * 0.6, strip], [x0 + W * 0.9, strip], theme.curve, lead);
      wire(ctx, [[x0 + W * 0.9, strip], [x1, strip], [x1, wy]], theme.neutral, 4);
      text(`X: ${trim(r("length"), 2)} m of ${DC_MATERIALS[material].label.toLowerCase()}`, x0 + W * 0.25, strip - 22, theme.secant, "center");
      text(`S = ${trim(r("box"), 1)} Ω`, x0 + W * 0.75, strip - 22, theme.curve, "center");
      text("B", B[0], strip - 12, theme.muted, "center");
      // The bridge wire with its scale.
      wire(ctx, [[x0, wy], [x1, wy]], theme.secant, 2.5);
      for (let cm = 0; cm <= 100; cm += 10) {
        const x = toX(cm);
        wire(ctx, [[x, wy], [x, wy + (cm % 50 === 0 ? 8 : 5)]], theme.muted, 1);
        if (cm % 20 === 0 && cm > 0 && cm < 100) text(String(cm), x, wy + 16, theme.muted, "center");
      }
      text("A", x0 - 4, wy - 10, theme.muted, "right");
      text("C", x1 + 4, wy - 10, theme.muted, "left");
      const jx = toX(r("jockey", 50));
      galvanometer(ctx, B, [B[0], 150], swing(r("meterIg")), theme);
      wire(ctx, [[B[0], 150], [jx, wy - 6]], lead);
      ctx.save();
      ctx.fillStyle = theme.angle;
      ctx.beginPath();
      ctx.moveTo(jx, wy - 1);
      ctx.lineTo(jx - 6, wy - 11);
      ctx.lineTo(jx + 6, wy - 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      text("G", B[0] + 16, 117, theme.text);
      // Cell and key from A to C.
      const by = 232;
      wire(ctx, [[x0, wy], [x0, by], [x0 + W / 2 - 14, by]], lead);
      wire(ctx, [[x1, wy], [x1, by], [x0 + W / 2 + 14, by]], lead);
      cell(ctx, [x0 + W / 2 - 14, by], [x0 + W / 2 + 14, by], true, theme.angle, lead);

      const l = r("jockey", 50);
      text(`jockey at l = ${dcFixed(l, 1)} cm from A`, x0, 258, theme.angle);
      if (words) {
        text(`if G read 0 here: X = S·l/(100 − l) = ${dcFixed(r("meterReading"), 2)} Ω`, x0, 278);
        text(`and then ρ = XA/L = ${dcSci(r("rhoMeasured"))} Ω m`, x0, 298);
        text(`balance point: l = ${dcFixed(r("meterBalance"), 1)} cm`, x0, 318, theme.muted);
      }
      caption(r("meterNull") === 1 ? "G reads zero: the bridge is balanced" : "G deflects: slide the jockey");
    }

    // ── Potentiometer ──
    if (has("potentiometer")) {
      const which = Math.round(r("potCell"));
      title("Potentiometer: 10 m of wire at 1 V/m");
      const wy = 112;
      const toX = (cm: number) => x0 + (Math.max(0, Math.min(DC_POT_LENGTH, cm)) / DC_POT_LENGTH) * W;
      // Driver.
      wire(ctx, [[x0, wy], [x0, 54], [x0 + W / 2 - 14, 54]], lead);
      wire(ctx, [[x1, wy], [x1, 54], [x0 + W / 2 + 14, 54]], lead);
      cell(ctx, [x0 + W / 2 - 14, 54], [x0 + W / 2 + 14, 54], true, theme.angle, lead);
      text("driver 10 V", x0 + W / 2, 36, theme.angle, "center");
      // The wire and its scale in metres.
      wire(ctx, [[x0, wy], [x1, wy]], theme.secant, 2.5);
      for (let cm = 0; cm <= DC_POT_LENGTH; cm += 100) {
        const x = toX(cm);
        wire(ctx, [[x, wy], [x, wy + 6]], theme.muted, 1);
        if (cm % 200 === 0 && cm > 0 && cm < DC_POT_LENGTH) text(`${cm / 100} m`, x, wy - 12, theme.muted, "center");
      }
      text("A", x0 - 4, wy - 9, theme.muted, "right");
      text("C", x1 + 4, wy - 9, theme.muted, "left");
      // The cell under test: + to A, − through G to the jockey.
      const ty = 168;
      const c1 = x0 + W * 0.2;
      const c2 = x0 + W * 0.32;
      const g1 = x0 + W * 0.44;
      const g2 = x0 + W * 0.6;
      const jx = toX(r("potJockey"));
      wire(ctx, [[x0, wy], [x0, ty], [c1, ty]], lead);
      cell(ctx, [c1, ty], [c2, ty], true, theme.angle, lead);
      wire(ctx, [[c2, ty], [g1, ty]], lead);
      galvanometer(ctx, [g1, ty], [g2, ty], swing(r("potIg")), theme);
      wire(ctx, [[g2, ty], [g2 + 12, ty], [g2 + 12, 142], [jx, 142], [jx, wy + 10]], lead);
      ctx.save();
      ctx.fillStyle = theme.angle;
      ctx.beginPath();
      ctx.moveTo(jx, wy + 1);
      ctx.lineTo(jx - 6, wy + 11);
      ctx.lineTo(jx + 6, wy + 11);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      text(which === 2 ? "E₂" : "E₁", (c1 + c2) / 2, ty + 20, theme.angle, "center", true);
      if (which === 1) {
        // The resistance R across the cell, with its key closed.
        const sy = 206;
        wire(ctx, [[c1 - 8, ty], [c1 - 8, sy], [c1 + 2, sy]], lead);
        resistor(ctx, [c1 + 2, sy], [c2 + 20, sy], theme.curve, lead);
        wire(ctx, [[c2 + 20, sy], [c2 + 8, sy], [c2 + 8, ty]], lead);
        text(`R = ${trim(r("load"), 1)} Ω`, c2 + 30, sy, theme.curve);
      }
      text(which === 2 ? `E₂ = ${trim(r("emf2"), 1)} V, r₂ = ${trim(r("intR2"), 1)} Ω` : `E₁ = ${trim(r("emf"), 1)} V, r = ${trim(r("intR"), 1)} Ω`, x0, 242, theme.angle);
      text(`jockey at ${dcFixed(r("potJockey"), 0)} cm`, x0, 262, theme.angle);
      if (r("potOnWire") === 0) text("More than 10 V: no balance on the wire", x0, 284, theme.secant);
      else if (words) {
        if (which === 0) text(`balance at l = ${dcFixed(r("potBalance"), 1)} cm: E = φl`, x0, 284);
        if (which === 1) {
          text(`l₁ = ${dcFixed(r("potL1"), 1)} cm, l₂ = ${dcFixed(r("potL2"), 1)} cm`, x0, 284);
          text(`r = R(l₁/l₂ − 1) = ${dcFixed(r("potInternal"), 2)} Ω`, x0, 304);
        }
        if (which === 2) {
          text(`l₁ = ${dcFixed(r("potL1"), 1)} cm, l₂ = ${dcFixed(r("potLE2"), 1)} cm`, x0, 284);
          text(`E₁/E₂ = l₁/l₂ = ${dcFixed(r("potEmfRatio"), 3)}`, x0, 304);
        }
      }
      caption(r("potNull") === 1 ? "G reads zero: balanced" : "G deflects: slide the jockey");
    }

    // ── RC ──
    if (has("rc")) {
      const charging = Math.round(r("rcPhase")) === 0;
      title(charging ? "Charging a capacitor through R" : "Discharging a capacitor through R");
      const top = 56;
      const bottom = 142;
      const bx = x0 + 8;
      const cx = x1 - 30;
      const a: Pt = [x0 + W * 0.2, top];
      const pivot: Pt = [x0 + W * 0.38, top];
      const b: Pt = [x0 + W * 0.3, 84];
      wire(ctx, [a, [bx, top], [bx, 84]], lead);
      cell(ctx, [bx, 84], [bx, 116], true, theme.angle, lead, !charging);
      wire(ctx, [[bx, 116], [bx, bottom], [cx, bottom], [cx, 112]], lead);
      wire(ctx, [b, [b[0], bottom]], lead);
      dot(ctx, a[0], a[1], 3, theme.text);
      dot(ctx, b[0], b[1], 3, theme.text);
      dot(ctx, pivot[0], pivot[1], 3, theme.text);
      wire(ctx, [pivot, charging ? [a[0] + 3, a[1] - 5] : [b[0] + 3, b[1] - 3]], theme.text, 2.5);
      wire(ctx, [pivot, [x0 + W * 0.46, top]], lead);
      resistor(ctx, [x0 + W * 0.46, top], [x0 + W * 0.72, top], theme.curve, lead);
      wire(ctx, [[x0 + W * 0.72, top], [cx, top], [cx, 84]], lead);
      capacitor(ctx, [cx, 84], [cx, 112], theme.sine, lead);
      // Charge on the plates, as + and − signs.
      const signs = Math.round((r("rcFraction") / 100) * 4);
      for (let k = 0; k < signs; k++) {
        text("+", cx + 20 + 7 * k, 89, theme.angle, "center");
        text("−", cx + 20 + 7 * k, 108, theme.sine, "center");
      }
      text(`${trim(r("emf"), 1)} V`, bx + 16, 100, theme.angle);
      text(`R = ${trim(r("rcR"), 0)} kΩ`, x0 + W * 0.59, top - 18, theme.curve, "center");
      text(`C = ${trim(r("rcC"), 0)} µF`, cx - 18, 98, theme.sine, "right");
      text(`t = ${dcFixed(r("time"), 2)} s after the switch`, x0, 166, theme.muted);

      const plane = createPlane({ x: 48, y: 204, width: w - 48 - 16, height: 116 }, [0, 6], [0, 100]);
      drawPlane(ctx, plane, theme);
      text("q as % of CE, against t / RC", 52, 192, theme.muted);
      curve(ctx, plane, (x) => 100 * (charging ? 1 - Math.exp(-x) : Math.exp(-x)), theme.curve);
      if (words) {
        const [tx] = plane.toPx(1, 0);
        wire(ctx, [[tx, plane.rect.y], [tx, plane.rect.y + plane.rect.height]], theme.tangent, 1.5, [4, 4]);
        const [px, py] = plane.toPx(Math.min(6, r("rcTimes")), r("rcFraction"));
        dot(ctx, px, py, 5, theme.angle);
        caption(`τ = RC = ${dcFixed(r("tau"), 2)} s · q = ${dcFixed(r("rcQ"), 1)} µC (${dcFixed(r("rcFraction"), 1)} %)`, 1);
        caption(`I = ${dcFixed(r("rcI"), 3)} mA · V across C = ${dcFixed(r("rcV"), 2)} V`);
      }
    }
  },
};
