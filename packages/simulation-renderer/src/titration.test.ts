import { titrationModel, type TitrationParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeTitrationLayout, solutionColour, titrationCurve, titrationRenderer } from "./titration/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["apparatus", "solution", "curve", "equivalence", "indicator-band", "buffer", "labels"];
const STRONG: TitrationParams = { acid: "hcl", Ca: 0.1, Cb: 0.1, indicator: "phenolphthalein" };
const WEAK: TitrationParams = { ...STRONG, acid: "ethanoic" };
const layout = computeTitrationLayout(900);
const results = (Vb: number, p = STRONG) => titrationModel.derive({ Vb }, p);

const render = (r = results(10), layers = ALL, at = layout) => {
  const rec = recordingContext();
  titrationRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("titration layout", () => {
  it("puts the curve beside the apparatus on a desk, below it on a phone", () => {
    expect(layout.chart.x).toBeGreaterThan(layout.apparatus.x + layout.apparatus.width);
    const phone = computeTitrationLayout(375);
    expect(phone.chart.y).toBeGreaterThan(phone.apparatus.y + phone.apparatus.height);
    expect(phone.chart.x + phone.chart.width).toBeLessThanOrEqual(375);
  });
});

describe("the solution's colour", () => {
  it("is colourless in acid and pink in alkali with phenolphthalein", () => {
    expect(solutionColour(0, 3)).not.toBe(solutionColour(0, 12));
    expect(solutionColour(0, 12)).toBe("#ec4899");
  });

  it("goes red to yellow with methyl orange", () => {
    expect(solutionColour(1, 2)).toBe("#ef4444");
    expect(solutionColour(1, 6)).toBe("#facc15");
  });
});

describe("the titration curve", () => {
  it("rises all the way and includes points right at the jump", () => {
    const points = titrationCurve(STRONG);
    for (let i = 1; i < points.length; i++) expect(points[i]![1]).toBeGreaterThanOrEqual(points[i - 1]![1] - 1e-9);
    expect(points.some(([v]) => Math.abs(v - 25) < 1e-9)).toBe(true);
  });
});

describe("what the titration renderer draws", () => {
  it("reads out the pH and the volumes", () => {
    const texts = render(results(10)).texts().join(" ");
    expect(texts).toContain("pH 1.37");
    expect(texts).toContain("10.00 mL added");
    expect(texts).toContain("25.00 mL to neutralise");
    expect(texts).toContain("equivalence: pH 7.00");
  });

  it("marks the buffer region and pH = pKa for a weak acid, and not for a strong one", () => {
    expect(render(results(10, WEAK)).texts().join(" ")).toContain("half-way: pH = pKa = 4.76");
    expect(render(results(10)).texts().join(" ")).not.toContain("buffer region");
  });

  it("names the indicator whose band is drawn", () => {
    expect(render(results(10)).texts().join(" ")).toContain("Phenolphthalein changes here");
  });

  it("draws nothing it was not asked for", () => {
    expect(render(results(10), []).texts()).toEqual([]);
  });
});

describe("titrationRenderer.pick", () => {
  it("adds as much base as the click on the curve says", () => {
    const x = layout.chart.x + layout.chart.width / 2;
    const hit = titrationRenderer.pick!(layout, x, layout.chart.y + 30, undefined, results(0));
    expect(hit!.writes[0]!.variable).toBe("Vb");
    expect(hit!.writes[0]!.value).toBeCloseTo(25, 6);
  });

  it("ignores clicks on the flask", () => {
    expect(titrationRenderer.pick!(layout, layout.apparatus.x + 30, layout.apparatus.y + 250, undefined, results(0))).toBeNull();
  });
});
