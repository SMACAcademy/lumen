import { integersModel, type IntegersParams, type IntegersState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeIntegersLayout, hopsLineY, integersFraction, integersRenderer, integersX, integerWindow, ratLineY } from "./integers/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: IntegersState = { start: 3, p: 3, p2: 1, hop: 0 };
const results = (params: Partial<IntegersParams> = {}, state: Partial<IntegersState> = {}) =>
  integersModel.derive({ ...base, ...state }, { ...integersModel.defaultParams, ...params });

interface Text {
  text: string;
  x: number;
  y: number;
  align: string;
}

/** Render, also keeping each text's alignment so its box can be checked. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const texts: Text[] = [];
  let align = "left";
  const target = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(target, {
    get(t, key: string) {
      if (key === "fillText") return (text: string, x: number, y: number) => {
        texts.push({ text, x, y, align });
        return (t.fillText as (...a: unknown[]) => void)(text, x, y);
      };
      return t[key];
    },
    set(t, key: string, value) {
      if (key === "textAlign") align = value;
      t[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const on = new Set(layers);
  const layout = computeIntegersLayout(width, on);
  integersRenderer.draw(ctx, layout, { results: r, trace: null, layers: on, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, texts, layout, joined: texts.map((t) => t.text).join(" | ") };
};

/** Every text and every circle stays on a canvas this wide; captions stay short. */
function expectInside(out: ReturnType<typeof render>, width: number) {
  for (const t of out.texts) {
    const w = t.text.length * 6;
    const left = t.align === "center" ? t.x - w / 2 : t.align === "right" ? t.x - w : t.x;
    expect(left, `"${t.text}" left`).toBeGreaterThanOrEqual(0);
    expect(left + w, `"${t.text}" right`).toBeLessThanOrEqual(width);
    expect(t.text.length, `"${t.text}" length`).toBeLessThanOrEqual(55);
    expect(t.y).toBeGreaterThanOrEqual(0);
    expect(t.y).toBeLessThanOrEqual(out.layout.height);
  }
  for (const c of out.rec.of("arc")) {
    const [x, y, radius] = c.args as number[];
    expect(x! - radius!).toBeGreaterThanOrEqual(0);
    expect(x! + radius!).toBeLessThanOrEqual(width);
    expect(y! - radius!).toBeGreaterThanOrEqual(0);
  }
}

describe("integers layout", () => {
  it("stacks one panel per shown layer, and fits a phone", () => {
    const one = computeIntegersLayout(325, new Set(["hops", "labels"]));
    expect(one.panels.map((p) => p.id)).toEqual(["hops"]);
    expect(one.height).toBeGreaterThanOrEqual(330);
    expect(one.height).toBeLessThanOrEqual(420);
    expect(one.x0).toBeGreaterThan(0);
    expect(one.x1).toBeLessThan(325);
    expect(computeIntegersLayout(800, new Set(["labels"])).panels.map((p) => p.id)).toEqual(["hops"]);
    expect(integersX(one, 0, 10)).toBeCloseTo((one.x0 + one.x1) / 2, 9);
  });

  it("widens the line only when a number needs it", () => {
    expect(integerWindow(3, -2)).toBe(10);
    expect(integerWindow(-14)).toBe(20);
    expect(integerWindow(25)).toBe(25);
  });

  it("writes fractions the way a book does", () => {
    expect(integersFraction(-3, 4)).toBe("−3/4");
    expect(integersFraction(3, -4)).toBe("3/(−4)");
    expect(integersFraction(-2, 1)).toBe("−2");
  });
});

describe("the hops panel", () => {
  it("writes the sum, and subtraction as adding the opposite", () => {
    expect(render(results({ sign: 1, move: -5 }, { start: 3, hop: 5 }), ["hops", "labels"]).joined).toContain("3 + (−5) = −2");
    const minus = render(results({ sign: -1, move: -4 }, { start: 2 }), ["hops", "labels"]).joined;
    expect(minus).toContain("2 − (−4) = 2 + 4 = 6");
    expect(minus).toContain("Subtracting (−4) is adding 4");
  });

  it("hides the landing spot and the hops still to come without labels", () => {
    const hidden = render(results({ sign: 1, move: -5 }, { start: 3, hop: 0 }), ["hops"]);
    expect(hidden.joined).not.toContain("=");
    // Only the frog is drawn round: no ring on the landing spot.
    expect(hidden.rec.of("arc").filter((c) => c.args[2] === 7)).toHaveLength(0);
    expect(hidden.rec.of("quadraticCurveTo")).toHaveLength(0);
    expect(render(results({ sign: 1, move: -5 }, { start: 3, hop: 0 }), ["hops", "labels"]).rec.of("quadraticCurveTo")).toHaveLength(5);
    expect(render(results({ sign: 1, move: -5 }, { start: 3, hop: 2 }), ["hops"]).rec.of("quadraticCurveTo")).toHaveLength(2);
  });

  it("puts the frog at its position on the line", () => {
    const out = render(results({ sign: 1, move: -5 }, { start: 3, hop: 5 }), ["hops"], 800);
    const frog = out.rec.of("arc").find((c) => c.args[2] === 9)!;
    expect(frog.args[0]).toBeCloseTo(integersX(out.layout, -2, 10), 6);
    expect(frog.args[1] as number).toBeLessThan(hopsLineY(0));
  });

  it("drags the start along the line", () => {
    const layout = computeIntegersLayout(800, new Set(["hops"]));
    const hit = integersRenderer.pick!(layout, integersX(layout, -6.2, 10), hopsLineY(0), undefined, results());
    expect(hit?.writes).toEqual([{ variable: "start", value: -6 }]);
  });
});

describe("the life panel", () => {
  it("tells the sum in the scene's own words", () => {
    const temp = render(results({ scene: "temperature", sign: 1, move: -9 }, { start: 4 }), ["life", "labels"]).joined;
    expect(temp).toContain("4 °C, 9 °C colder: −5 °C");
    expect(temp).toContain("4 + (−9) = −5 steps");
    expect(render(results({ scene: "lift", sign: 1, move: -5 }, { start: 3 }), ["life", "labels"]).joined).toContain("floor 3, down 5 floors: basement 2");
    expect(render(results({ scene: "bank", sign: 1, move: -8 }, { start: 5 }), ["life", "labels"]).joined).toContain("₹500, spend ₹800: owes ₹300");
    expect(render(results({ scene: "sea", sign: 1, move: -5 }, { start: 3 }), ["life", "labels"]).joined).toContain("30 m, down 50 m: −20 m");
  });

  it("keeps the answer back without labels", () => {
    const hidden = render(results({ scene: "temperature", sign: 1, move: -9 }, { start: 4 }), ["life"]);
    expect(hidden.joined).not.toContain("−5 °C");
    expect(hidden.joined).toContain("below freezing");
    expect(hidden.joined).toContain("Temperature");
    // No arrow from start to the answer.
    expect(hidden.rec.of("closePath")).toHaveLength(1);
  });
});

describe("the times panel", () => {
  it("says why the sign comes out as it does", () => {
    expect(render(results({ times: 3, jump: -2 }, { hop: 3 }), ["times", "labels"]).joined).toContain("3 × (−2) = −6");
    const twice = render(results({ times: -3, jump: -2 }, { hop: 3 }), ["times", "labels"]).joined;
    expect(twice).toContain("(−3) × (−2) = 6");
    expect(twice).toContain("Two minus signs: turned round twice, so positive");
    expect(twice).toContain("and back again: 6 ÷ (−2) = −3");
    expect(twice).toContain("hops point left · turned round");
  });

  it("hides the product without labels", () => {
    const hidden = render(results({ times: -4, jump: -5 }, { hop: 0 }), ["times"]);
    expect(hidden.joined).not.toContain("= 20");
    expect(hidden.rec.of("quadraticCurveTo")).toHaveLength(0);
    expect(hidden.joined).toContain("(−4) × (−5): 4 hops of (−5)");
  });
});

describe("the rational panel", () => {
  it("names each point in standard form and compares them", () => {
    const out = render(results({ q: -4, q2: 2 }, { p: 3, p2: 1 }), ["rational", "labels"]).joined;
    expect(out).toContain("3/(−4) = −3/4");
    expect(out).toContain("1/2 = 0.5");
    expect(out).toContain("−3/4 < 1/2");
  });

  it("refuses a bottom of 0", () => {
    expect(render(results({ q: 0 }, { p: 3 }), ["rational"]).joined).toContain("3/0 is not a number: q can't be 0");
  });

  it("drags the nearer point, snapping to its pieces", () => {
    const layout = computeIntegersLayout(800, new Set(["rational"]));
    const r = results({ q: 4, q2: 2 }, { p: 1, p2: -1 });
    const hit = integersRenderer.pick!(layout, integersX(layout, 0.7, 1), ratLineY(0), undefined, r);
    expect(hit?.writes).toEqual([{ variable: "p", value: 3 }]);
    const hit2 = integersRenderer.pick!(layout, integersX(layout, -0.6, 1), ratLineY(0), undefined, r);
    expect(hit2?.writes).toEqual([{ variable: "p2", value: -1 }]);
  });
});

describe("the zoom panel", () => {
  it("counts the fractions between 1/3 and 1/2 as the pieces get finer", () => {
    const coarse = render(results({ q: 3, q2: 2, zoom: 1 }, { p: 1, p2: 1 }), ["zoom", "labels"]);
    expect(coarse.joined).toContain("0 fractions fit between 1/3 and 1/2");
    expect(coarse.joined).toContain("Halfway: 5/12 · cut finer for more");
    const fine = render(results({ q: 3, q2: 2, zoom: 10 }, { p: 1, p2: 1 }), ["zoom", "labels"]);
    expect(fine.joined).toContain("9 fractions fit between 1/3 and 1/2");
    expect(fine.joined).toContain("20/60");
    // Nine small dots between, plus the two points themselves.
    expect(fine.rec.of("arc").filter((c) => c.args[2] === 3.5)).toHaveLength(9);
  });
});

describe("the bars panel", () => {
  it("adds over a common bottom, and keeps the common bottom back without labels", () => {
    const shown = render(results({ sign: 1, q: 3, q2: 4 }, { p: 1, p2: 1 }), ["bars", "labels"]);
    expect(shown.joined).toContain("1/3 + 1/4 = 4/12 + 3/12 = 7/12");
    expect(shown.joined).toContain("Both cut into 12ths, then add the tops");
    // 1 + 1 + 7 shaded pieces.
    expect(shown.rec.of("fillRect")).toHaveLength(9);
    const hidden = render(results({ sign: 1, q: 3, q2: 4 }, { p: 1, p2: 1 }), ["bars"]);
    expect(hidden.joined).not.toContain("12");
    expect(hidden.rec.of("fillRect")).toHaveLength(2);
    expect(render(results({ sign: 1, q: 4, q2: 3 }, { p: 2, p2: 1 }), ["bars", "labels"]).joined).toContain("2/4 + 1/3 = 6/12 + 4/12 = 10/12 = 5/6");
    expect(render(results({ sign: -1, q: 4, q2: 2 }, { p: 3, p2: 1 }), ["bars", "labels"]).joined).toContain("3/4 − 1/2 = 3/4 − 2/4 = 1/4");
  });
});

describe("on a 325 px phone", () => {
  const cases: [string, ReturnType<typeof results>][] = [
    ["hops", results({ sign: -1, move: -10 }, { start: 10, hop: 3 })],
    ["hops", results({ sign: 1, move: -10 }, { start: -10, hop: 20 })],
    ["life", results({ scene: "bank", sign: 1, move: -10 }, { start: 10 })],
    ["life", results({ scene: "lift", sign: 1, move: -10 }, { start: -10 })],
    ["life", results({ scene: "sea", sign: -1, move: -10 }, { start: 10 })],
    ["times", results({ times: -5, jump: -5 }, { hop: 5 })],
    ["times", results({ times: -5, jump: 5 }, { hop: 2.5 })],
    ["rational", results({ q: -7, q2: 1 }, { p: 12, p2: -12 })],
    ["rational", results({ q: 0, q2: 5 }, { p: -12, p2: 3 })],
    ["zoom", results({ q: 11, q2: 12, zoom: 10 }, { p: -12, p2: 12 })],
    ["zoom", results({ q: 3, q2: 2, zoom: 10 }, { p: 1, p2: 1 })],
    ["bars", results({ sign: 1, q: 11, q2: 12 }, { p: 10, p2: 11 })],
    ["bars", results({ sign: -1, q: 12, q2: 11 }, { p: -5, p2: 3 })],
  ];
  it.each(cases)("keeps the %s panel on the canvas", (panel, r) => {
    for (const labels of [true, false]) expectInside(render(r, labels ? [panel, "labels"] : [panel], 325), 325);
  });
});
