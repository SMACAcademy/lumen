import { moduliModel, type ModuliParams, type ModuliState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeModuliLayout, moduliFigures, moduliMagnification, moduliRenderer } from "./moduli/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const zero: ModuliState = { pressure: 0, shearForce: 0, tension: 0 };
const results = (params: Partial<ModuliParams> = {}, state: Partial<ModuliState> = {}) =>
  moduliModel.derive({ ...zero, ...state }, { ...moduliModel.defaultParams, ...params });
const ALL = ["body", "forces", "original", "compare", "labels"];
const render = (r: ReturnType<typeof results>, layers: string[] = ALL, width = 800) => {
  const rec = recordingContext();
  moduliRenderer.draw(rec.ctx, computeModuliLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

describe("number formatting", () => {
  it("gives three figures, with powers of ten when small", () => {
    expect(moduliFigures(160)).toBe("160");
    expect(moduliFigures(2.2)).toBe("2.20");
    expect(moduliFigures(1.336)).toBe("1.34");
    expect(moduliFigures(1e-4)).toBe("1.00 × 10⁻⁴");
    expect(moduliFigures(0.0002)).toBe("2.00 × 10⁻⁴");
    expect(moduliFigures(10000)).toBe("1.00 × 10⁴");
    expect(moduliFigures(0)).toBe("0");
  });

  it("magnifies a tiny strain by a power of ten", () => {
    expect(moduliMagnification(0)).toBe(1);
    expect(moduliMagnification(0.5)).toBe(1);
    expect(moduliMagnification(1e-4)).toBe(1000);
  });
});

describe("the squeeze", () => {
  it("names the cube and gives the compression only with labels", () => {
    const r = results({ material: "water" }, { pressure: 29.4 });
    const shown = text(render(r));
    expect(shown).toContain("A 10 cm cube of water, pressed on every face");
    expect(shown).toContain("Δp 29.4 MPa · B 2.20 GPa");
    expect(shown).toContain("volume down 1.34% (13.4 cm³)");
    const hidden = text(render(r, ["body", "forces", "original"]));
    expect(hidden).not.toContain("1.34");
    expect(hidden).not.toContain("B 2.20");
  });

  it("shows air's bulk modulus rising as it is squeezed", () => {
    expect(text(render(results({ material: "air" }, { pressure: 0.1 })))).toContain("B 2.00 × 10⁻⁴ GPa");
    expect(text(render(results({ material: "air" }, { pressure: 0.1 })))).toContain("volume down 50.0% (500 cm³)");
  });

  it("says how much the change is magnified", () => {
    expect(text(render(results({ material: "steel" }, { pressure: 100 }), ["body"]))).toContain("change drawn ×1000");
    expect(text(render(results({ material: "air" }, { pressure: 0.1 }), ["body"]))).toContain("true scale");
  });

  it("pushes on all four faces, two arrows each", () => {
    // Arrows are a stroke and a filled head each.
    expect(render(results({}, { pressure: 50 }), ["forces"]).of("fill")).toHaveLength(8);
    expect(render(results({}, { pressure: 0 }), ["forces"]).of("fill")).toHaveLength(0);
  });

  it("compares compressibility, with values only with labels", () => {
    const shown = text(render(results({}, { pressure: 10 })));
    expect(shown).toContain("compressibility 1/B, per GPa (log scale)");
    expect(shown).toContain("6.25 × 10⁻³");
    expect(shown).toContain("1.00 × 10⁴");
    expect(text(render(results({}, { pressure: 10 }), ["compare"]))).not.toContain("6.25");
  });
});

describe("the shear", () => {
  it("gives stress, strain and the slide of the top face", () => {
    const shown = text(render(results({ setup: "shear", material: "steel" }, { shearForce: 84 })));
    expect(shown).toContain("A 10 cm cube of steel, base held, top pushed");
    expect(shown).toContain("F/A 8.40 MPa · θ 1.00 × 10⁻⁴ rad");
    expect(shown).toContain("top slides Δx = 10.0 µm");
    expect(shown).toEqual(expect.stringContaining("θ"));
    expect(text(render(results({ setup: "shear" }, { shearForce: 84 }), ["body", "forces"]))).not.toContain("µm");
  });

  it("lets a fluid flow instead", () => {
    const shown = text(render(results({ setup: "shear", material: "water" }, { shearForce: 20 })));
    expect(shown).toContain("Water has no shear modulus: it flows");
    expect(shown).not.toContain("top slides");
    expect(shown).toContain("flows");
  });
});

describe("the stretch", () => {
  it("gives both strains, Poisson's ratio and the narrowing", () => {
    const shown = text(render(results({ setup: "stretch", material: "steel" }, { tension: 157 })));
    expect(shown).toContain("A 1.0 mm steel wire, 2.0 m long, pulled");
    expect(shown).toContain("Δl/l 9.99 × 10⁻⁴ · Δd/d 2.90 × 10⁻⁴ · σ 0.29");
    expect(shown).toContain("thinner by 0.290 µm · volume up 0.0420%");
    expect(shown).not.toContain("elastic limit");
    const hidden = text(render(results({ setup: "stretch" }, { tension: 157 }), ["body", "forces", "original", "compare"]));
    expect(hidden).not.toContain("0.29");
  });

  it("warns past the elastic limit", () => {
    expect(text(render(results({ setup: "stretch", material: "copper" }, { tension: 250 })))).toContain("past the elastic limit: Hooke's law fails");
  });
});

describe("on a phone", () => {
  it("keeps every word and every shape inside a 325 px canvas", () => {
    const cases: [Partial<ModuliParams>, Partial<ModuliState>][] = [
      [{ setup: "squeeze", material: "aluminium", size: 20 }, { pressure: 100 }],
      [{ setup: "squeeze", material: "air" }, { pressure: 100 }],
      [{ setup: "shear", material: "aluminium", size: 5 }, { shearForce: 100 }],
      [{ setup: "shear", material: "water" }, { shearForce: 100 }],
      [{ setup: "stretch", material: "aluminium", diameter: 0.5 }, { tension: 300 }],
    ];
    for (const [params, state] of cases) {
      const rec = recordingContext();
      const placed: { words: string; x: number; y: number; align: string }[] = [];
      (rec.ctx as unknown as { fillText: (w: string, x: number, y: number) => void }).fillText = (words, x, y) => {
        placed.push({ words, x, y, align: String(rec.ctx.textAlign ?? "left") });
        rec.calls.push({ method: "fillText", args: [words, x, y] });
      };
      const layout = computeModuliLayout(325);
      moduliRenderer.draw(rec.ctx, layout, { results: results(params, state), trace: null, layers: new Set(ALL), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
      expect(placed.length).toBeGreaterThan(5);
      for (const { words, x, y, align } of placed) {
        expect(words.length, words).toBeLessThanOrEqual(55);
        const w = words.length * 6;
        const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
        expect(left, words).toBeGreaterThanOrEqual(0);
        expect(left + w, words).toBeLessThanOrEqual(325);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(layout.height);
      }
      for (const call of [...rec.of("moveTo"), ...rec.of("lineTo")]) {
        const [x, y] = call.args as [number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(325);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(layout.height);
      }
    }
  });
});
