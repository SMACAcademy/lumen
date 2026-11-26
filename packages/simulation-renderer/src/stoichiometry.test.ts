import { stoichiometryModel, type StoichParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { ATOMS, computeStoichLayout, stoichiometryRenderer } from "./stoichiometry/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const ALL = ["molecules", "bars", "mass", "labels"];
const WATER: StoichParams = { reaction: "water", massA: 8, massB: 32 };
const layout = computeStoichLayout(900);
const results = (params = WATER, progress = 0) => stoichiometryModel.derive({ progress }, params);

const render = (r = results(), layers = ALL, at = layout) => {
  const rec = recordingContext();
  stoichiometryRenderer.draw(rec.ctx, at, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("stoichiometry layout", () => {
  it("puts the bars beside the flask on a desk and below it on a phone", () => {
    expect(layout.bars.x).toBeGreaterThan(layout.flask.x + layout.flask.width);
    const phone = computeStoichLayout(375);
    expect(phone.bars.y).toBeGreaterThan(phone.flask.y + phone.flask.height);
  });

  it("knows the atoms of every molecule in every reaction", () => {
    for (const formula of ["H₂", "O₂", "N₂", "H₂O", "NH₃", "CH₄", "CO₂"]) expect(ATOMS[formula]!.length).toBeGreaterThan(1);
  });
});

describe("what the stoichiometry renderer draws", () => {
  it("tags the limiting reagent before anything has reacted", () => {
    const texts = render().texts().join(" ");
    expect(texts).toContain("2H₂ + O₂ → 2H₂O");
    expect(texts).toContain("1.00 mol · limiting"); // the oxygen
  });

  it("leaves the excess behind at the end, and keeps the total mass", () => {
    const texts = render(results(WATER, 1)).texts().join(" ");
    expect(texts).toContain("2.00 mol"); // hydrogen left over
    expect(texts).toContain("total mass 40.00 g — the same at every stage");
  });

  it("draws molecules atom by atom: water has three", () => {
    // 36 g of water from 4 g H₂ + 32 g O₂: all product, no reactant left.
    const done = results({ reaction: "water", massA: 4, massB: 32 }, 1);
    const arcs = render(done, ["molecules"]).of("arc").length;
    expect(arcs % 3).toBe(0);
    expect(arcs).toBeGreaterThan(0);
  });

  it("draws nothing it was not asked for", () => {
    expect(render(results(), []).texts()).toEqual([]);
  });
});
