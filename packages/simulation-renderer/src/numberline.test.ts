import { numberLineModel, type NumberLineParams } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeNumberLineLayout, numberLineRenderer, rulerMarks, tickPositions, xOf } from "./numberline/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const P = numberLineModel.defaultParams;
const results = (n: number, over: Partial<NumberLineParams> = {}, n2 = 0) => numberLineModel.derive({ n, n2 }, { ...P, ...over });
const layers = (...ids: string[]) => new Set(ids);
const render = (r: ReturnType<typeof results>, on: Set<string>) => {
  const layout = computeNumberLineLayout(800, on);
  const rec = recordingContext();
  numberLineRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: on, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("number line layout", () => {
  it("puts a tick at every piece, and makes room for a second line only when shown", () => {
    const one = computeNumberLineLayout(800, layers("line"));
    expect(tickPositions(one, 4, 1)).toHaveLength(5);
    expect(tickPositions(one, 3, 2)).toHaveLength(7);
    expect(xOf(one, 0.5, 1)).toBeCloseTo((one.x0 + one.x1) / 2, 9);
    expect(one.line2).toBeNull();
    const two = computeNumberLineLayout(800, layers("line", "second"));
    expect(two.line2).toBeGreaterThan(two.line1);
    expect(two.height).toBeGreaterThan(one.height);
  });
});

describe("what the number line draws", () => {
  it("shades exactly n pieces of the bar", () => {
    expect(render(results(3, { d: 4 }), layers("bars")).of("fillRect")).toHaveLength(3);
    expect(render(results(0, { d: 4 }), layers("bars")).of("fillRect")).toHaveLength(0);
  });

  it("names the point, and links two names for the same point", () => {
    const same = render(results(3, { d: 4, d2: 8 }, 6), layers("line", "second", "labels")).texts();
    expect(same).toEqual(expect.arrayContaining(["3/4 = 0.75", "6/8 = 0.75", "same point!"]));
    const different = render(results(3, { d: 4, d2: 8 }, 5), layers("line", "second", "labels")).texts();
    expect(different).not.toContain("same point!");
  });

  it("snaps a drag to the nearest piece, on whichever line it is on", () => {
    const on = layers("line", "second");
    const layout = computeNumberLineLayout(800, on);
    const r = results(1, { d: 4, d2: 8 });
    const hit = numberLineRenderer.pick!(layout, xOf(layout, 0.74, 1), layout.line1, undefined, r);
    expect(hit?.writes).toEqual([{ variable: "n", value: 3 }]);
    const hit2 = numberLineRenderer.pick!(layout, xOf(layout, 0.76, 1), layout.line2!, undefined, r);
    expect(hit2?.writes).toEqual([{ variable: "n2", value: 6 }]);
  });
});

describe("whole numbers and the decimal ruler", () => {
  const withDec = (dec: number, n: number, over: Partial<NumberLineParams> = {}) => numberLineModel.derive({ n, n2: 0, dec }, { ...P, ...over });
  const renderAt = (r: ReturnType<typeof withDec>, on: Set<string>, width: number) => {
    const layout = computeNumberLineLayout(width, on);
    const rec = recordingContext();
    numberLineRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: on, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
    return { rec, layout };
  };

  it("names a whole number plainly, and numbers the line 0 to 10", () => {
    const texts = render(results(7, { d: 1, max: 10 }), layers("line", "labels")).texts();
    expect(texts).toContain("7");
    expect(texts).not.toContain("7/1 = 7");
    expect(texts).toEqual(expect.arrayContaining(["0", "5", "10"]));
  });

  it("marks wholes, tenths and hundredths, and drops marks too close to see", () => {
    const one = computeNumberLineLayout(800, layers("line", "decimal"));
    expect(rulerMarks(one, 1)).toHaveLength(101);
    expect(rulerMarks(one, 1).filter((m) => m.size === "tenth")).toHaveLength(9);
    const phone = computeNumberLineLayout(325, layers("line", "decimal"));
    // On a phone, 0 to 3 has room for tenths but not hundredths.
    expect(rulerMarks(phone, 3).some((m) => m.size === "hundredth")).toBe(false);
    expect(rulerMarks(phone, 3).filter((m) => m.size === "tenth")).toHaveLength(27);
    expect(one.ruler).toBeGreaterThan(one.line1);
    expect(computeNumberLineLayout(800, layers("line")).ruler).toBeNull();
  });

  it("names the decimal, its place value, and how it compares with the fraction", () => {
    const on = layers("line", "decimal", "labels");
    const texts = renderAt(withDec(45, 5, { d: 10 }), on, 800).rec.texts();
    expect(texts).toEqual(expect.arrayContaining(["5/10 = 0.5", "0.45", "0 ones · 4 tenths · 5 hundredths", "5/10 = 0.5  >  0.45", "0.1", "0.9"]));
    expect(renderAt(withDec(50, 5, { d: 10 }), on, 800).rec.texts()).toContain("5/10 = 0.5  =  0.5");
    // Without the labels the ruler shows only its scale.
    const bare = renderAt(withDec(45, 5, { d: 10 }), layers("line", "decimal"), 800).rec.texts();
    expect(bare).not.toContain("0.45");
    expect(bare.join(" ")).not.toContain("hundredths");
  });

  it("drags the decimal point to the nearest hundredth", () => {
    const on = layers("line", "decimal");
    const layout = computeNumberLineLayout(800, on);
    const hit = numberLineRenderer.pick!(layout, xOf(layout, 0.372, 1), layout.ruler!, undefined, withDec(0, 0));
    expect(hit?.writes).toEqual([{ variable: "dec", value: 37 }]);
    expect(numberLineRenderer.pick!(layout, xOf(layout, 0.5, 1), layout.line1, undefined, withDec(0, 0))?.writes[0]?.variable).toBe("n");
  });

  it("fits a 325 px phone, every word inside the canvas", () => {
    const on = layers("bars", "line", "decimal", "labels");
    for (const [dec, n, over] of [[0, 0, { d: 10, max: 1 }], [100, 10, { d: 10, max: 1 }], [37, 1, { d: 1, max: 10 }], [999, 120, { d: 12, max: 10 }]] as const) {
      const { rec, layout } = renderAt(withDec(dec, n, over), on, 325);
      expect(layout.height).toBeLessThanOrEqual(420);
      for (const call of rec.of("fillText")) {
        const [text, x, y] = call.args as [string, number, number];
        expect(text.length, text).toBeLessThanOrEqual(55);
        expect(x - (text.length * 6) / 2, text).toBeGreaterThanOrEqual(0);
        expect(x + (text.length * 6) / 2, text).toBeLessThanOrEqual(325);
        expect(y, text).toBeGreaterThanOrEqual(0);
        expect(y, text).toBeLessThanOrEqual(layout.height);
      }
    }
  });
});
