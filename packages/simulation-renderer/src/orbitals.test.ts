import { orbitalsModel, type OrbitalsState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeOrbitalsLayout, lobesOf, orbitalName, orbitalsRenderer } from "./orbitals/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (over: Partial<OrbitalsState> = {}) => orbitalsModel.derive({ ...orbitalsModel.initialize(orbitalsModel.defaultParams), ...over }, orbitalsModel.defaultParams);
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  orbitalsRenderer.draw(rec.ctx, computeOrbitalsLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const FILLING = ["config", "ladder", "labels"];
const SHAPES = ["axes", "orbital", "nodes", "labels"];

describe("what the orbitals renderer draws", () => {
  it("writes the configuration and draws a box per orbital, an arrow per electron", () => {
    const nitrogen = render(results({ Z: 7 }), FILLING);
    expect(nitrogen.texts()).toContain("1s² 2s² 2p³");
    expect(nitrogen.texts().join(" ")).toContain("3 unpaired electrons");
    // 1 + 1 + 3 + 1 + 3 + 1 + 5 + 3 boxes to krypton.
    expect(nitrogen.of("strokeRect")).toHaveLength(18);
    expect(render(results({ Z: 10 }), FILLING).texts().join(" ")).toContain("diamagnetic");
    expect(render(results({ Z: 24 }), FILLING).texts().join(" ")).toContain("An exception");
  });

  it("names orbitals the textbook way", () => {
    expect([orbitalName(1, 0, 0), orbitalName(2, 1, 0), orbitalName(2, 1, 1), orbitalName(3, 2, -2), orbitalName(3, 2, 0)]).toEqual(["1s", "2p_z", "2p_x", "3d_xy", "3d_z²"]);
  });

  it("gives p two lobes of opposite sign and d four, alternating", () => {
    expect(lobesOf(1, 0).map((l) => l.sign)).toEqual([1, -1]);
    expect(lobesOf(2, -2).map((l) => l.sign)).toEqual([1, 1, -1, -1]);
    expect(lobesOf(2, 2)).toHaveLength(4);
    expect(lobesOf(0, 0)).toHaveLength(0);
  });

  it("draws the nodes and counts them", () => {
    const threeP = render(results({ n: 3, l: 1, m: 1 }), SHAPES);
    expect(threeP.texts().join(" ")).toContain("1 radial node + 1 angular node = 2");
    expect(threeP.of("ellipse")).toHaveLength(2);
    expect(render(results({ n: 3, l: 0, m: 0 }), SHAPES).texts().join(" ")).toContain("2 radial nodes + 0 angular nodes");
  });

  it("fits every subshell row on a phone", () => {
    const layout = computeOrbitalsLayout(375);
    const widest = 40 + 18 + 5 * (layout.box + 4);
    expect(widest).toBeLessThanOrEqual(375);
  });
});
