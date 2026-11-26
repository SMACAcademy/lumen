import { moModel } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { atomicFilling, computeMOLayout, moRenderer } from "./mo/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (Z: number, charge = 0) => moModel.derive({ Z, charge, clock: 0 }, moModel.defaultParams);
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  moRenderer.draw(rec.ctx, computeMOLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the MO renderer draws", () => {
  it("fills the atoms' own orbitals", () => {
    expect(atomicFilling(8)).toEqual({ s1: 2, s2: 2, p2: [2, 1, 1] });
    expect(atomicFilling(1)).toEqual({ s1: 1, s2: 0, p2: [0, 0, 0] });
  });

  it("draws every molecular orbital in the order for the element", () => {
    const o2 = render(results(8), ["diagram"]).texts();
    expect(o2.indexOf("σ2p")).toBeLessThan(o2.indexOf("π2p"));
    const n2 = render(results(7), ["diagram"]).texts();
    expect(n2.indexOf("π2p")).toBeLessThan(n2.indexOf("σ2p"));
    // 10 MO boxes and 2 × 5 atomic boxes.
    expect(render(results(8), ["diagram"]).of("strokeRect")).toHaveLength(20);
  });

  it("works out the bond order and the magnetism", () => {
    expect(render(results(8), ["labels"]).texts().join(" ")).toContain("(10 − 6) / 2 → bond order 2 · 2 unpaired: paramagnetic");
    expect(render(results(2), ["labels"]).texts().join(" ")).toContain("bond order 0: no molecule");
    expect(render(results(7), ["labels"]).texts()).toContain("110 pm · 946 kJ/mol");
    expect(render(results(8, -1), ["diagram"]).texts()).toContain("O₂⁻");
  });
});
