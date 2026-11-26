import { balancingModel, BALANCING_ORDER, BALANCING_REACTIONS, type BalancingParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { balancingRenderer, computeBalancingLayout } from "./balancing/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (reaction: BalancingParams["reaction"], c: number[] = [1, 1, 1, 1]) =>
  balancingModel.derive({ c1: c[0] ?? 1, c2: c[1] ?? 1, c3: c[2] ?? 1, c4: c[3] ?? 1, clock: 0 }, { reaction });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  balancingRenderer.draw(rec.ctx, computeBalancingLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const ALL = ["equation", "molecules", "tally", "labels"];

describe("what the balancing renderer draws", () => {
  it("writes the equation with its numbers", () => {
    const texts = render(results("water", [2, 1, 2]), ALL).texts();
    expect(texts).toEqual(expect.arrayContaining(["2 H₂", "1 O₂", "2 H₂O", "+"]));
  });

  it("draws one cluster of atoms per molecule", () => {
    // 2 H₂ + 1 O₂ → 2 H₂O: 4 + 2 + 6 atoms.
    expect(render(results("water", [2, 1, 2]), ["molecules"]).of("arc")).toHaveLength(12);
  });

  it("says which element is out, and when it is balanced", () => {
    expect(render(results("water"), ALL).texts().join(" ")).toContain("Not yet: 2 O on the left, 1 on the right");
    expect(render(results("water", [2, 1, 2]), ALL).texts().join(" ")).toContain("Balanced!");
    expect(render(results("water", [4, 2, 4]), ALL).texts().join(" ")).toContain("divided down");
  });

  it("fits the widest reaction, six of everything, on a phone", () => {
    const layout = computeBalancingLayout(375);
    for (const id of BALANCING_ORDER) {
      const reaction = BALANCING_REACTIONS[id];
      const perSide = Math.max(reaction.reactants.length, reaction.products.length);
      const widest = Math.max(...[...reaction.reactants, ...reaction.products].map((s) => Object.values(s.atoms).reduce((a, b) => a + b, 0)));
      const columnWidth = (375 / 2 - 14 - 8) / perSide;
      expect(widest * layout.atomRadius * 1.6 + layout.atomRadius, id).toBeLessThanOrEqual(columnWidth);
    }
  });
});
