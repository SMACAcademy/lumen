import { measureModel, type MeasureParams, type MeasureState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { baseUnitText, computeMeasureLayout, dimText, measureRenderer, measureSup, significantMask } from "./measure/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = measureModel.initialize(measureModel.defaultParams);
const results = (params: Partial<MeasureParams> = {}, state: Partial<MeasureState> = {}) =>
  measureModel.derive({ ...base, ...state }, { ...measureModel.defaultParams, ...params });

/** Draws, and notes where each piece of text reaches (6 px a character, as the recorder measures). */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const spans: { text: string; left: number; right: number; y: number }[] = [];
  const ctx = new Proxy(rec.ctx, {
    get(target, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          const w = String(text).length * 6;
          const align = (target as unknown as { textAlign?: string }).textAlign ?? "left";
          const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
          spans.push({ text: String(text), left, right: left + w, y });
          return target.fillText(text, x, y);
        };
      }
      return target[key as keyof CanvasRenderingContext2D];
    },
    set(target, key: string, value) {
      (target as unknown as Record<string, unknown>)[key] = value;
      return true;
    },
  });
  const layout = computeMeasureLayout(width);
  measureRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  const text = rec.texts().join(" | ");
  return { rec, spans, text, layout };
};

describe("writing powers and dimensions", () => {
  it("writes superscripts, halves included", () => {
    expect([measureSup(2), measureSup(-2), measureSup(0.5), measureSup(-0.5), measureSup(-1.5)]).toEqual(["²", "⁻²", "½", "⁻½", "⁻³ᐟ²"]);
    expect(dimText([1, 1, -2])).toBe("[M L T⁻²]");
    expect(dimText([0, 0, 0])).toBe("[M⁰ L⁰ T⁰]");
    expect(baseUnitText([1, 2, -3])).toBe("kg m² s⁻³");
  });

  it("picks out significant digits", () => {
    const mark = (t: string) => significantMask(t).map((b) => (b ? "x" : ".")).join("");
    expect(mark("0.2370")).toBe("..xxxx");
    expect(mark("4700")).toBe("xx..");
    expect(mark("0.007")).toBe("....x");
    expect(mark("2.64 × 10²⁴")).toBe("x.xx.......");
  });
});

describe("the units bench", () => {
  it("shows the seven base units and the unit built so far", () => {
    const { text } = render(results({ unit: "newton" }, { mExp: 1, lExp: 1, tExp: -2 }), ["units", "labels"]);
    for (const s of ["m", "kg", "s", "A", "K", "mol", "cd"]) expect(text.split(" | ")).toContain(s);
    expect(text).toContain("your tiles: kg m s⁻²");
    expect(text).toContain("1 N = 10⁵ dyne");
    expect(text).toContain("kg m s⁻² is the newton");
  });

  it("gives the CGS conversion and the target only with the words", () => {
    const hidden = render(results({ unit: "joule" }), ["units"]);
    expect(hidden.text).not.toContain("10⁷");
    expect(hidden.rec.of("strokeRect").length).toBe(7);
    const shown = render(results({ unit: "joule" }), ["units", "labels"]);
    expect(shown.text).toContain("1 J = 10⁷ erg");
    expect(shown.rec.of("strokeRect").length).toBe(7 + 3);
  });
});

describe("the dimension benches", () => {
  it("names the term that breaks an equation", () => {
    expect(render(results({ equation: "velocity-t2" }), ["check", "labels"]).text).toContain("at² is [L], not [L T⁻¹]: wrong");
    expect(render(results({ equation: "squares" }), ["check", "labels"]).text).toContain("every term is [L² T⁻²]: consistent");
    expect(render(results({ equation: "fraction" }), ["check", "labels"]).text).toContain("consistent, yet wrong");
  });

  it("draws three bars per term", () => {
    expect(render(results({ equation: "kinetic-ma" }), ["check"]).rec.of("fillRect").length).toBe(3 + 3 + 3);
  });

  it("shows the trial formula and says when the powers match", () => {
    const off = render(results({ derivation: "pendulum" }, { powA: 1, powB: 0, powC: 0 }), ["derive", "labels"]).text;
    expect(off).toContain("T = k · m¹ l⁰ g⁰");
    expect(off).toContain("you have [M]; match every bar");
    const on = render(results({ derivation: "pendulum" }, { powA: 0, powB: 0.5, powC: -0.5 }), ["derive", "labels"]).text;
    expect(on).toContain("powers match: T = k√(l/g)");
    expect(render(results({ derivation: "pendulum" }), ["derive"]).text).not.toContain("√(l/g)");
  });
});

describe("the reading bench", () => {
  it("reads a vernier and states the figures, only with the words", () => {
    const r = results({ instrument: 0.01 }, { length: 3.47 });
    const shown = render(r, ["reading", "labels"]).text;
    expect(shown).toContain("Vernier calliper: least count 0.01 cm");
    expect(shown).toContain("3.4 cm + 7 × 0.01 cm = 3.47 cm");
    expect(shown).toContain("reading 3.47 cm · 3 significant figures");
    expect(render(r, ["reading"]).text).not.toContain("3.47");
    expect(render(results({ instrument: 0.001 }), ["reading"]).text).not.toContain("least count");
  });

  it("reads a metre scale and a screw gauge", () => {
    expect(render(results({ instrument: 0.1 }, { length: 4.273 }), ["reading", "labels"]).text).toContain("reading 4.3 cm · 2 significant figures");
    const screw = render(results({ instrument: 0.001 }, { length: 4.273 }), ["reading", "labels"]).text;
    expect(screw).toContain("4.25 cm + 23 × 0.001 cm = 4.273 cm");
    expect(screw).toContain("reading 4.273 cm · 4 significant figures");
  });
});

describe("the figures bench", () => {
  it("rounds 2.745 to 2.74 and says why, only with the words", () => {
    const shown = render(results({ numeral: "i" }, { keep: 3 }), ["figures", "labels"]).text;
    expect(shown).toContain("→ 2.74");
    expect(shown).toContain("dropped a 5 after an even digit: leave");
    expect(shown).toContain("2.745 has 4 significant figures");
    expect(render(results({ numeral: "j" }, { keep: 3 }), ["figures", "labels"]).text).toContain("dropped a 5 after an odd digit: raise");
    expect(render(results({ numeral: "i" }, { keep: 3 }), ["figures"]).text).not.toContain("2.74 ");
    expect(render(results({ numeral: "i" }, { keep: 3 }), ["figures"]).text).not.toContain("→");
  });

  it("keeps a power of ten", () => {
    expect(render(results({ numeral: "b" }, { keep: 2 }), ["figures", "labels"]).text).toContain("→ 2.6 × 10²⁴");
  });

  it("states a sum to the fewest decimal places and a quotient to the fewest figures", () => {
    expect(render(results({ calc: "masses" }), ["calc", "labels"]).text).toContain("fewest decimal places: 1 → 663.8 g");
    expect(render(results({ calc: "density" }), ["calc", "labels"]).text).toContain("fewest figures: 3 → 1.69 g/cm³");
    expect(render(results({ calc: "masses" }), ["calc"]).text).not.toContain("663.8");
    expect(render(results({ calc: "density" }), ["calc"]).text).not.toContain("1.69");
  });
});

describe("the errors benches", () => {
  it("gives the mean and mean absolute error of the readings only with the words", () => {
    const shown = render(results({}, { lastReading: 2.8 }), ["errors", "labels"]).text;
    expect(shown).toContain("mean 2.62 s · mean |Δ| 0.108 s");
    expect(shown).toContain("relative 0.041 → 4.1 %");
    expect(render(results({}, { lastReading: 2.8 }), ["errors"]).text).not.toContain("mean");
  });

  it("combines errors, showing the radius counted three times", () => {
    const sphere = render(results({ rule: "sphere" }, { errA: 0.1, errB: 0.5 }), ["propagate", "labels"]).text;
    expect(sphere).toContain("×3");
    expect(sphere).toContain("ρ = 7.85 ± 0.126 g/cm³ (1.6 %)");
    expect(render(results({ rule: "series" }, { errA: 3, errB: 2 }), ["propagate", "labels"]).text).toContain("R = 300 ± 7.00 Ω (2.3 %)");
    const hidden = render(results({ rule: "series" }, { errA: 3, errB: 2 }), ["propagate"]).text;
    expect(hidden).not.toContain("2.3 %");
    expect(hidden).toContain("R₁ = 100 Ω ± 3.00 Ω (3.0 %)");
  });
});

describe("on a phone", () => {
  const cases: [Partial<MeasureParams>, Partial<MeasureState>, string][] = [
    [{ unit: "density" }, { mExp: -3, lExp: 3, tExp: -3 }, "units"],
    [{ unit: "watt" }, { mExp: 3, lExp: 3, tExp: 3 }, "units"],
    [{ equation: "kinetic-ma" }, {}, "check"],
    [{ equation: "velocity-t2" }, {}, "check"],
    [{ derivation: "circle" }, { powA: -2, powB: -1.5, powC: 2 }, "derive"],
    [{ instrument: 0.1 }, { length: 9.8 }, "reading"],
    [{ instrument: 0.01 }, { length: 9.8 }, "reading"],
    [{ instrument: 0.01 }, { length: 0.2 }, "reading"],
    [{ instrument: 0.001 }, { length: 9.8 }, "reading"],
    [{ instrument: 0.001 }, { length: 0.2 }, "reading"],
    [{ numeral: "f" }, { keep: 2 }, "figures"],
    [{ numeral: "b" }, { keep: 1 }, "figures"],
    [{ calc: "box" }, {}, "calc"],
    [{ calc: "gold" }, {}, "calc"],
    [{ calc: "sheet" }, {}, "calc"],
    [{}, { lastReading: 3 }, "errors"],
    [{}, { lastReading: 2.3 }, "errors"],
    [{ rule: "sphere" }, { errA: 10, errB: 10 }, "propagate"],
    [{ rule: "pendulum" }, { errA: 0, errB: 10 }, "propagate"],
    [{ rule: "difference" }, { errA: 10, errB: 10 }, "propagate"],
  ];

  it.each(cases.map(([p, s, layer]) => [`${layer} ${JSON.stringify(p)} ${JSON.stringify(s)}`, p, s, layer] as const))("keeps every word on a 325 px canvas: %s", (_name, p, s, layer) => {
    const { spans, layout } = render(results(p, s), [layer, "labels"], 325);
    expect(spans.length).toBeGreaterThan(3);
    for (const span of spans) {
      expect(span.left, span.text).toBeGreaterThanOrEqual(0);
      expect(span.right, span.text).toBeLessThanOrEqual(325);
      expect(span.y, span.text).toBeGreaterThan(0);
      expect(span.y, span.text).toBeLessThan(layout.height);
    }
  });

  it("keeps captions short", () => {
    for (const [p, s, layer] of cases) {
      const { spans, layout } = render(results(p, s), [layer, "labels"], 325);
      for (const span of spans.filter((t) => t.y > layout.height - 50)) expect(span.text.length, span.text).toBeLessThanOrEqual(52);
    }
  });

  it("keeps the shapes on the canvas", () => {
    for (const [p, s, layer] of cases) {
      const { rec } = render(results(p, s), [layer, "labels"], 325);
      for (const call of [...rec.of("fillRect"), ...rec.of("strokeRect")]) {
        const [x, y, w, h] = call.args as number[];
        expect(x!, layer).toBeGreaterThanOrEqual(0);
        expect(x! + w!, layer).toBeLessThanOrEqual(325 + 0.5);
        expect(y!, layer).toBeGreaterThanOrEqual(0);
        expect(y! + h!, layer).toBeLessThanOrEqual(380);
      }
    }
  });
});
