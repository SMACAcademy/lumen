import { colligativeModel, T_RANGE, type ColligativeParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { beakerGeometry, colligativeRenderer, computeColligativeLayout, stripX } from "./colligative/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["beakers", "particles", "strip", "labels"];
const WATER: ColligativeParams = { solvent: "water", solute: "glucose", m: 1 };
const layout = computeColligativeLayout(900);
const results = (T = 20, params = WATER) => colligativeModel.derive({ T }, params);

const render = (r = results(), layers = ALL, at = layout) => {
  const rec = recordingContext();
  colligativeRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("colligative layout", () => {
  it("sets the beakers side by side with the strip below", () => {
    const g = beakerGeometry(layout);
    expect(g.solutionX).toBeGreaterThan(g.pureX + g.w);
    expect(layout.strip.y).toBeGreaterThan(layout.beakers.y + layout.beakers.height);
  });

  it("makes room for the vapour-pressure plot only when it is shown", () => {
    expect(layout.vapour.height).toBe(0);
    expect(computeColligativeLayout(900, true).vapour.height).toBeGreaterThan(0);
  });

  it("spans the whole temperature range along the strip", () => {
    expect(stripX(layout, T_RANGE[0])).toBeCloseTo(layout.strip.x, 9);
    expect(stripX(layout, T_RANGE[1])).toBeCloseTo(layout.strip.x + layout.strip.width, 9);
  });
});

describe("what the colligative renderer draws", () => {
  it("names each beaker's state at the current temperature", () => {
    const texts = render(results(-1)).texts();
    expect(texts).toContain("pure water · frozen");
    expect(texts).toContain("solution · liquid");
    expect(texts).toContain("−1.0 °C");
  });

  it("labels the shifts on the strip", () => {
    const texts = render().texts().join(" ");
    expect(texts).toContain("ΔTf = 1.86 K");
    expect(texts).toContain("ΔTb = 0.52 K");
  });

  it("counts particles: salt as two ions each, ethanoic acid in benzene as pairs", () => {
    expect(render(results(20, { ...WATER, solute: "nacl" })).texts().join(" ")).toContain("i = 2 (2 ions each)");
    expect(render(results(20, { solvent: "benzene", solute: "ethanoic", m: 1 })).texts().join(" ")).toContain("i = 0.5 (dimers)");
    const salt = render(results(20, { ...WATER, solute: "nacl" }), ["particles"]).of("arc").length;
    const sugar = render(results(20), ["particles"]).of("arc").length;
    expect(salt).toBe(2 * sugar);
  });

  it("draws the vapour-pressure curves when asked", () => {
    const withVapour = computeColligativeLayout(900, true);
    expect(render(results(99), [...ALL, "vapour"], withVapour).texts()).toContain("1 atm: boiling");
  });

  it("draws nothing it was not asked for", () => {
    expect(render(results(), []).texts()).toEqual([]);
  });
});

describe("colligativeRenderer.pick", () => {
  it("sets the temperature from a drag along the strip", () => {
    const x = stripX(layout, 50);
    const hit = colligativeRenderer.pick!(layout, x, layout.strip.y + 20, undefined, results());
    expect(hit!.writes[0]!.variable).toBe("T");
    expect(hit!.writes[0]!.value).toBeCloseTo(50, 6);
  });

  it("ignores clicks on the beakers", () => {
    const g = beakerGeometry(layout);
    expect(colligativeRenderer.pick!(layout, g.pureX + 10, g.y + 40, undefined, results())).toBeNull();
  });
});
