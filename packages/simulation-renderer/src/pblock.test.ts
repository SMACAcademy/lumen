import { pBlockModel, type PBlockParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computePBlockLayout, pBlockRenderer } from "./pblock/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (group: number, period: number, property: PBlockParams["property"] = "character") =>
  pBlockModel.derive({ group, period, clock: 0 }, { property });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  pBlockRenderer.draw(rec.ctx, computePBlockLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the p-block renderer draws", () => {
  it("draws all thirty elements with a legend, and describes the chosen one", () => {
    const table = render(results(14, 6), ["table", "labels"]);
    expect(table.of("strokeRect")).toHaveLength(30);
    expect(table.texts()).toEqual(expect.arrayContaining(["B", "Pb", "Rn", "metal", "metalloid", "non-metal"]));
    expect(table.texts().join(" ")).toContain("Lead: metal · electronegativity 1.9 · amphoteric oxide · prefers +2 (inert pair)");
  });

  it("changes the legend with the property", () => {
    expect(render(results(15, 2, "oxide"), ["table"]).texts()).toEqual(expect.arrayContaining(["basic", "amphoteric", "acidic"]));
  });

  it("plots the hydrides and flags the hydrogen-bonded ones", () => {
    const plot = render(results(16, 2), ["hydrides", "labels"]);
    expect(plot.texts()).toEqual(expect.arrayContaining(["H₂O", "H₂S", "H₂Te", "NH₃", "HF", "CH₄"]));
    expect(plot.texts().join(" ")).toContain("H₂O: boils at 373 K, bond angle 104.5°, E–H 463 kJ/mol — hydrogen bonded");
    expect(render(results(14, 6), ["hydrides", "labels"]).texts().join(" ")).toContain("no stable hydride");
  });

  it("fits the grid on a phone", () => {
    const layout = computePBlockLayout(375);
    expect(layout.gridX + 6 * layout.cell).toBeLessThanOrEqual(375);
  });
});
