import {
  NUC_NUCLIDE_ORDER,
  NUC_PARENT_ORDER,
  NUC_REACTION_ORDER,
  NUC_SAMPLE,
  nucleusModel,
  type NucleusParams,
  type NucleusState,
} from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeNucleusLayout, nucleusRenderer, scientific } from "./nucleus/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: NucleusState = { curveA: 20, halfLife: 30, t: 0, k: 2, generation: 4 };
const results = (params: Partial<NucleusParams> = {}, state: Partial<NucleusState> = {}) =>
  nucleusModel.derive({ ...base, ...state }, { ...nucleusModel.defaultParams, ...params });

type Text = { text: string; x: number; y: number; align: string };

const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  // Note each text with the alignment in force when it was drawn.
  const placed: Text[] = [];
  const ctx = new Proxy(rec.ctx, {
    get(target, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          placed.push({ text, x, y, align: String(target.textAlign ?? "left") });
          target.fillText(text, x, y);
        };
      }
      return target[key as keyof CanvasRenderingContext2D];
    },
  });
  nucleusRenderer.draw(ctx, computeNucleusLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, placed, texts: placed.map((p) => p.text), all: placed.map((p) => p.text).join(" | ") };
};

/** Every text inside the canvas, at about 6.5 px a character. */
function expectInside(placed: Text[], width: number, height: number) {
  for (const p of placed) {
    const w = p.text.length * 6.5;
    const left = p.align === "center" ? p.x - w / 2 : p.align === "right" ? p.x - w : p.x;
    expect(left, `"${p.text}" left`).toBeGreaterThanOrEqual(0);
    expect(left + w, `"${p.text}" right`).toBeLessThanOrEqual(width);
    expect(p.y, `"${p.text}" y`).toBeGreaterThanOrEqual(0);
    expect(p.y, `"${p.text}" y`).toBeLessThanOrEqual(height);
    expect(p.text.length, `"${p.text}" is a short caption`).toBeLessThanOrEqual(55);
  }
}

const VIEWS: string[][] = [
  ["nucleus", "size", "labels"],
  ["nucleus", "defect", "labels"],
  ["curve", "reactions", "labels"],
  ["grid", "law", "labels"],
  ["emission", "labels"],
  ["reaction", "labels"],
  ["chain", "labels"],
];

describe("the nucleus", () => {
  it("names the nuclide and draws one ball per nucleon", () => {
    const { texts, rec } = render(results({ nuclide: 56 }), ["nucleus"]);
    expect(texts).toEqual(expect.arrayContaining(["⁵⁶Fe: 26 protons, 30 neutrons", "proton", "neutron"]));
    // 56 nucleons and the two key discs.
    expect(rec.of("arc").length).toBe(56 + 1 + 2);
    expect(render(results({ nuclide: 1 }), ["nucleus"]).texts).toContain("¹H: 1 proton, 0 neutrons");
  });

  it("gives the radius and density only with the words", () => {
    const shown = render(results({ nuclide: 56 }), ["nucleus", "size", "labels"]).all;
    expect(shown).toContain("R = 4.59 fm");
    expect(shown).toContain("2.29 × 10¹⁷ kg/m³");
    expect(shown).toContain("1.0 × 10³ kg/m³");
    const hidden = render(results({ nuclide: 56 }), ["nucleus", "size"]).all;
    expect(hidden).not.toMatch(/fm|kg\/m³/);
    expect(hidden).toContain("nucleus");
  });

  it("draws a bigger nucleus for a bigger A", () => {
    const radius = (A: number) => {
      const arcs = render(results({ nuclide: A }), ["nucleus"]).rec.of("arc");
      return arcs.length ? Number(arcs[A]!.args[2]) : 0;
    };
    // The dashed rim drawn after the A balls.
    expect(radius(238)).toBeGreaterThan(radius(56));
    expect(radius(56)).toBeGreaterThan(radius(4));
  });

  it("shows the mass defect and binding energy of helium-4", () => {
    const { all } = render(results({ nuclide: 4 }), ["nucleus", "defect", "labels"]);
    expect(all).toContain("2 p + 2 n apart: 4.032980 u");
    expect(all).toContain("⁴He atom: 4.002603 u");
    expect(all).toContain("Δm = 0.030377 u · Eb = 28.30 MeV");
    expect(all).toContain("7.07 MeV per nucleon");
    const hidden = render(results({ nuclide: 4 }), ["nucleus", "defect"]).all;
    expect(hidden).not.toMatch(/MeV|0\.03|4\.0/);
    expect(render(results({ nuclide: 1 }), ["nucleus", "defect", "labels"]).all).toContain("nothing to bind");
  });
});

describe("the binding-energy curve", () => {
  it("draws every real nuclide, a dashed model and the marker", () => {
    const { texts, rec } = render(results({ nuclide: 56 }, { curveA: 61 }), ["curve", "labels"]);
    expect(texts).toEqual(expect.arrayContaining(["⁴He", "⁵⁶Fe", "²³⁸U", "²H", "Binding energy per nucleon"]));
    expect(texts.join(" ")).toContain("model at A = 61: 8.84 MeV · ⁵⁶Fe 8.79");
    // One disc per nuclide, plus the marker.
    expect(rec.of("arc").length).toBe(NUC_NUCLIDE_ORDER.length + 1);
    expect(rec.of("setLineDash").some((c) => (c.args[0] as number[]).length > 0)).toBe(true);
  });

  it("marks fission and fusion climbing towards the peak", () => {
    expect(render(results(), ["curve", "reactions"]).texts).toEqual(expect.arrayContaining(["fission", "fusion"]));
    expect(render(results(), ["curve"]).texts).not.toContain("fission");
  });
});

describe("the decay", () => {
  it("draws all 400 atoms and the law, with numbers only in words", () => {
    const { rec, all } = render(results({}, { halfLife: 20, t: 60 }), ["grid", "law", "labels"]);
    expect(rec.of("arc").length).toBe(NUC_SAMPLE + 1);
    expect(all).toContain("400 atoms, half-life 20 s");
    expect(all).toContain("t = 60 s = 3.00 T½ · law N = 50.0");
    expect(all).toContain("R = λN = 1.73 Bq");
    expect(all).toContain("T½");
    const hidden = render(results({}, { halfLife: 20, t: 60 }), ["grid", "law"]).all;
    expect(hidden).not.toMatch(/50\.0|counted|Bq/);
  });

  it("shrinks the decayed atoms", () => {
    const sizes = (t: number) => render(results({}, { t }), ["grid"]).rec.of("arc").map((c) => Number(c.args[2]));
    const big = (t: number) => sizes(t).filter((r) => r > 3).length;
    expect(big(0)).toBe(NUC_SAMPLE);
    expect(big(30)).toBe(results({}, { t: 30 }).counted);
  });
});

describe("decays and reactions", () => {
  it("writes each decay in nuclide notation", () => {
    expect(render(results({ parent: "u238" }), ["emission"]).all).toContain("²³⁸₉₂U → ²³⁴₉₀Th + ⁴₂He");
    expect(render(results({ parent: "c14" }), ["emission"]).all).toContain("¹⁴₆C → ¹⁴₇N + ⁰₋₁e + ν̄");
    expect(render(results({ parent: "na22" }), ["emission"]).all).toContain("²²₁₁Na → ²²₁₀Ne + ⁰₊₁e + ν");
    const gamma = render(results({ parent: "ni60" }), ["emission", "labels"]).all;
    expect(gamma).toContain("⁶⁰₂₈Ni* → ⁶⁰₂₈Ni + γ");
    expect(gamma).toContain("A: 60 → 60 (unchanged)");
    expect(gamma).toContain("Q = 1.33 MeV");
    expect(render(results({ parent: "u238" }), ["emission", "labels"]).all).toContain("Z: 92 → 90 (down 2)");
    expect(render(results({ parent: "u238" }), ["emission"]).all).not.toContain("MeV");
  });

  it("gives the energy of fission and fusion only with the words", () => {
    const fission = render(results({ reaction: "fission" }), ["reaction", "labels"]).all;
    expect(fission).toContain("n + ²³⁵U → ¹⁴¹Ba + ⁹²Kr + 3n");
    expect(fission).toContain("Δm = 0.186024 u → Q = 173.28 MeV");
    expect(fission).toContain("0.73 MeV per nucleon of fuel");
    expect(render(results({ reaction: "sun" }), ["reaction", "labels"]).all).toContain("Q = 26.73 MeV");
    expect(render(results({ reaction: "sun" }), ["reaction"]).all).not.toMatch(/MeV|26\./);
  });

  it("says whether a chain reaction dies out, holds steady or runs away", () => {
    expect(render(results({}, { k: 1, generation: 6 }), ["chain"]).all).toContain("critical: steady");
    expect(render(results({}, { k: 0.7 }), ["chain"]).all).toContain("subcritical");
    const runaway = render(results({}, { k: 2, generation: 10 }), ["chain", "labels"]);
    expect(runaway.all).toContain("supercritical");
    expect(runaway.all).toContain("generation 10: kⁿ = 1024 fissions per first one");
    expect(runaway.rec.of("fillRect")).toHaveLength(11);
  });

  it("formats powers of ten", () => {
    expect(scientific(2.294e17)).toBe("2.29 × 10¹⁷");
    expect(scientific(9.996e3, 2)).toBe("1.00 × 10⁴");
  });
});

describe("on a phone", () => {
  it("keeps every text inside a 325 px canvas, in every view and for every choice", () => {
    const width = 325;
    const { height } = computeNucleusLayout(width);
    for (const view of VIEWS) {
      for (const nuclide of NUC_NUCLIDE_ORDER) {
        for (const parent of NUC_PARENT_ORDER) {
          for (const reaction of NUC_REACTION_ORDER) {
            for (const state of [base, { curveA: 240, halfLife: 10, t: 400, k: 2.5, generation: 10 }, { curveA: 4, halfLife: 100, t: 77, k: 0.5, generation: 0 }]) {
              expectInside(render(results({ nuclide, parent, reaction }, state), view, width).placed, width, height);
            }
          }
        }
      }
    }
  });

  it("keeps the nucleus, the curve's points and the atoms on the canvas", () => {
    const width = 325;
    const { height } = computeNucleusLayout(width);
    for (const view of VIEWS) {
      for (const nuclide of [1, 4, 238]) {
        const { rec } = render(results({ nuclide }, { curveA: 240, t: 0 }), view, width);
        for (const c of rec.of("arc")) {
          const [x, y, r] = c.args as number[];
          expect(x! - r!, `${view} arc left`).toBeGreaterThanOrEqual(0);
          expect(x! + r!, `${view} arc right`).toBeLessThanOrEqual(width);
          expect(y! - r!, `${view} arc top`).toBeGreaterThanOrEqual(0);
          expect(y! + r!, `${view} arc bottom`).toBeLessThanOrEqual(height);
        }
        for (const c of rec.of("fillRect")) {
          const [x, , w] = c.args as number[];
          expect(x!, `${view} bar left`).toBeGreaterThanOrEqual(0);
          expect(x! + w!, `${view} bar right`).toBeLessThanOrEqual(width);
        }
      }
    }
  });
});
