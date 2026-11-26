import { GASBOX_GAS_ORDER, gasboxModel, type GasboxParams, type GasboxState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import {
  computeGasboxLayout,
  gasboxDrawnCount,
  gasboxFold,
  gasboxPistonX,
  gasboxPositions,
  gasboxRenderer,
  gasboxScientific,
  gasboxSpeedWindow,
} from "./gasbox/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: GasboxState = { temperature: 300, volume: 25, amount: 1, t: 0 };
const results = (gas: GasboxParams["gas"] = "n2", state: Partial<GasboxState> = {}) => gasboxModel.derive({ ...base, ...state }, { gas });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  gasboxRenderer.draw(rec.ctx, computeGasboxLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");
const BOX = ["box", "labels"];
const SPEEDS = ["maxwell", "labels"];
const FREEDOM = ["molecule", "labels"];
const PATH = ["box", "path", "labels"];

describe("the box", () => {
  it("shows the two routes to the pressure agreeing, and the average kinetic energy", () => {
    const words = text(render(results(), BOX));
    expect(words).toContain("Nitrogen, N₂");
    expect(words).toContain("1.0 mol · 25.0 L · 300 K");
    expect(words).toContain("P = nRT / V = 99.8 kPa");
    expect(words).toContain("⅓ρv²rms = ⅓ × 1.12 × 517² Pa = 99.8 kPa");
    expect(words).toContain("average KE = (3/2)k_BT = 6.21 × 10⁻²¹ J");
  });

  it("hides every number that a level asks for when the words are off", () => {
    const words = text(render(results(), ["box"]));
    expect(words).not.toMatch(/kPa|10⁻|517/);
  });

  it("draws twenty molecules a mole, and the piston where the volume puts it", () => {
    expect(gasboxDrawnCount(1)).toBe(20);
    expect(gasboxDrawnCount(0.1)).toBe(2);
    expect(gasboxDrawnCount(2)).toBe(40);
    // The molecules, and the two discs of the colour key.
    expect(render(results("n2", { amount: 2 }), ["box"]).of("arc")).toHaveLength(42);
    expect(render(results("n2", { amount: 0.5 }), ["box"]).of("arc")).toHaveLength(12);
    const layout = computeGasboxLayout(800);
    expect(gasboxPistonX(layout, 50) - layout.box.x).toBeCloseTo(layout.box.width, 9);
    expect(gasboxPistonX(layout, 25) - layout.box.x).toBeCloseTo(layout.box.width / 2, 9);
  });

  it("bounces molecules between the walls and moves them faster when hotter", () => {
    expect([gasboxFold(3, 10), gasboxFold(13, 10), gasboxFold(-3, 10), gasboxFold(27, 10)]).toEqual([3, 7, 3, 7]);
    const layout = computeGasboxLayout(325);
    const cold = gasboxPositions(layout, 25, 1, 300, 0.5, 3);
    const start = gasboxPositions(layout, 25, 1, 300, 0, 3);
    const hot = gasboxPositions(layout, 25, 1, 600, 0.5, 3);
    const moved = (a: typeof start) => a.reduce((s, p, i) => s + Math.hypot(p.x - start[i]!.x, p.y - start[i]!.y), 0);
    expect(moved(hot)).toBeGreaterThan(moved(cold));
  });

  it("keeps every molecule, the piston and the words on a phone's canvas", () => {
    const layout = computeGasboxLayout(325);
    for (const volume of [5, 25, 50]) {
      for (const t of [0, 1.7, 42.3, 599]) {
        for (const p of gasboxPositions(layout, volume, 2, 3531, t, 4)) {
          expect(p.x).toBeGreaterThanOrEqual(layout.box.x);
          expect(p.x).toBeLessThanOrEqual(gasboxPistonX(layout, volume));
          expect(p.y).toBeGreaterThanOrEqual(layout.box.y);
          expect(p.y).toBeLessThanOrEqual(layout.box.y + layout.box.height);
        }
      }
      expect(gasboxPistonX(layout, volume) + 16).toBeLessThanOrEqual(325);
    }
    const rec = render(results("h2", { temperature: 1000, volume: 5, amount: 2 }), BOX, 325);
    for (const call of rec.of("fillText")) {
      const [words, x] = call.args as [string, number];
      expect(words.length, words).toBeLessThanOrEqual(55);
      expect(x - (words.length * 6) / 2, words).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("the speeds", () => {
  it("marks the three speeds and gives them with the words", () => {
    const words = text(render(results(), SPEEDS));
    expect(words).toContain("Nitrogen: molecular speeds at 300 K");
    expect(words).toContain("mp 422 · avg 476 · rms 517 m/s");
    expect(words).toContain("peak 19.7% per 100 m/s · 1.1% above 1 km/s");
    expect(render(results(), ["maxwell"]).texts()).toEqual(expect.arrayContaining(["mp", "avg", "rms"]));
    expect(text(render(results(), ["maxwell"]))).not.toMatch(/422|476|517/);
  });

  it("draws the 300 K curve dashed behind a hotter one", () => {
    expect(text(render(results("n2", { temperature: 900 }), SPEEDS))).toContain("dashed: 300 K");
    expect(text(render(results(), SPEEDS))).not.toContain("dashed");
  });

  it("fits the hottest curve across and the coldest peak inside, for every gas", () => {
    for (const gas of GASBOX_GAS_ORDER) {
      const hot = results(gas, { temperature: 1000 });
      const cold = results(gas, { temperature: 100 });
      const window = gasboxSpeedWindow(cold.molarMass);
      expect(hot.vrms * 2.5, gas).toBeLessThan(window.x[1]);
      expect(cold.peakShare, gas).toBeLessThan(window.y[1]);
    }
  });

  it("keeps the markers' tags and the words on a phone's canvas", () => {
    for (const gas of GASBOX_GAS_ORDER) {
      for (const temperature of [100, 1000]) {
        const rec = render(results(gas, { temperature }), SPEEDS, 325);
        for (const call of rec.of("fillText")) {
          const [words, x] = call.args as [string, number];
          expect(words.length, words).toBeLessThanOrEqual(55);
          if (["mp", "avg", "rms"].includes(words)) {
            expect(x + words.length * 7, `${gas} ${words}`).toBeLessThanOrEqual(325);
            expect(x).toBeGreaterThanOrEqual(0);
          }
        }
      }
    }
  });
});

describe("the degrees of freedom", () => {
  it("counts the tiles and gives Cv, Cp and γ", () => {
    const n2 = render(results("n2"), FREEDOM);
    expect(n2.of("fillRect")).toHaveLength(5);
    const words = text(n2);
    expect(words).toContain("Nitrogen, N₂: diatomic");
    expect(words).toContain("f = 3 moving + 2 turning = 5");
    expect(words).toContain("Cv = (f/2)R = 20.8 J/(mol K)");
    expect(words).toContain("Cp = Cv + R = 29.1 J/(mol K)");
    expect(words).toContain("γ = 1 + 2/f = 1.40 · measured 1.40");
    expect(words).toContain("U = (f/2)nRT = 6.24 kJ");
    expect(render(results("he"), FREEDOM).of("fillRect")).toHaveLength(3);
    expect(text(render(results("he"), FREEDOM))).toContain("γ = 1 + 2/f = 1.67");
    expect(render(results("ch4"), FREEDOM).of("fillRect")).toHaveLength(6);
  });

  it("says why CO₂ has only two ways to turn, and hides the numbers with the words", () => {
    expect(text(render(results("co2"), FREEDOM))).toContain("Straight, so no turning about its own axis");
    expect(text(render(results("n2"), ["molecule"]))).not.toMatch(/Cv|γ|20\.8|1\.40/);
  });

  it("keeps the molecule's labels on a phone's canvas", () => {
    for (const gas of GASBOX_GAS_ORDER) {
      for (const call of render(results(gas), FREEDOM, 325).of("fillText")) {
        const [words, x] = call.args as [string, number];
        expect(words.length, words).toBeLessThanOrEqual(55);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(325);
      }
    }
  });
});

describe("the mean free path", () => {
  it("draws a zig-zag of runs as long as the free path, and names it with the words", () => {
    const rec = render(results(), PATH);
    const words = text(rec);
    expect(words).toContain("mean free path λ = 68.2 nm");
    expect(words).toContain("≈ 184 molecule diameters (d = 0.37 nm)");
    expect(words).not.toContain("kPa");
    expect(text(render(results(), ["box", "path"]))).not.toMatch(/68|nm/);
  });

  it("keeps the whole path inside the cylinder", () => {
    const layout = computeGasboxLayout(325);
    for (const volume of [5, 50]) {
      const rec = render(results("he", { volume, amount: 0.1 }), PATH, 325);
      for (const call of rec.of("lineTo")) {
        const [x, y] = call.args as [number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(325);
        expect(y).toBeGreaterThanOrEqual(layout.box.y - 1);
        expect(y).toBeLessThanOrEqual(layout.box.y + layout.box.height + 1);
      }
    }
  });
});

describe("numbers", () => {
  it("writes powers of ten", () => {
    expect(gasboxScientific(6.21e-21)).toBe("6.21 × 10⁻²¹");
    expect(gasboxScientific(9.996e-21)).toBe("1.00 × 10⁻²⁰");
    expect(gasboxScientific(2.4e25)).toBe("2.40 × 10²⁵");
  });
});
