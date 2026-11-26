import { batteriesModel, type BatteriesParams, type BatteriesState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { batteriesRenderer, computeBatteriesLayout } from "./batteries/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (state: Partial<BatteriesState> = {}, params: Partial<BatteriesParams> = {}) =>
  batteriesModel.derive({ ...batteriesModel.initialize(batteriesModel.defaultParams), ...state }, { ...batteriesModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  batteriesRenderer.draw(rec.ctx, computeBatteriesLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const CELLS = ["cells", "gauge", "labels"];
const TUBE = ["tube", "contents", "labels"];

describe("what the batteries renderer draws", () => {
  it("draws a cell per cell in series, and the total voltage", () => {
    const six = render(results({ cells: 6 }, { cell: "lead-acid" }), CELLS);
    expect(six.texts()).toContain("12.30 V");
    expect(six.texts().filter((t) => t === "2 V")).toHaveLength(6);
    expect(six.texts().join(" ")).toContain("acid 1.28 g/mL");
  });

  it("works out ΔG, and says when a cell is flat", () => {
    expect(render(results({}, { cell: "fuel" }), CELLS).texts().join(" ")).toContain("ΔG = −nFE = −2 × 96 500 × 1.23 V = −237.4 kJ mol⁻¹");
    expect(render(results({ charge: 0 }, { cell: "lead-acid" }), CELLS).texts().join(" ")).toContain("can be recharged");
    expect(render(results({ charge: 0 }, { cell: "dry" }), CELLS).texts().join(" ")).toContain("cannot be recharged");
  });

  it("explains why the nail does or does not rust", () => {
    const words = (params: Partial<BatteriesParams>, days = 10) => render(results({ days }, params), TUBE).texts().join(" ");
    expect(words({ water: "no" })).toContain("No water: no rust");
    expect(words({ air: "no" })).toContain("No oxygen");
    expect(words({ coating: "zinc", scratched: "yes" })).toContain("zinc corrodes instead");
    expect(words({ coating: "tin", scratched: "yes" })).toContain("Scratched tin");
    expect(words({})).toContain("20% rusted after 10 days");
  });

  it("draws more rust as it spreads", () => {
    const blotches = (days: number) => render(results({ days }), ["tube"]).of("arc").length;
    expect(blotches(20)).toBeGreaterThan(blotches(2));
  });
});
