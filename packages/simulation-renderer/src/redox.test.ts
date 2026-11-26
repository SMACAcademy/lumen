import { REDOX_REACTIONS, redoxModel, type RedoxParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeRedoxLayout, oxLine, redoxRenderer, signed } from "./redox/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (reaction: RedoxParams["reaction"], c: number[] = [1, 1, 1, 1]) =>
  redoxModel.derive({ c1: c[0] ?? 1, c2: c[1] ?? 1, c3: c[2] ?? 1, c4: c[3] ?? 1, clock: 0 }, { reaction });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  redoxRenderer.draw(rec.ctx, computeRedoxLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const ALL = ["equation", "ox", "electrons", "tally", "labels"];

describe("what the redox renderer draws", () => {
  it("writes oxidation numbers with their signs", () => {
    expect([signed(2), signed(-1), signed(0)]).toEqual(["+2", "−1", "0"]);
    const fe2o3 = REDOX_REACTIONS["iron-ore"].reactants[0]!;
    expect(oxLine(fe2o3)).toBe("+3 −2");
  });

  it("writes the equation with its numbers, and the electron bookkeeping", () => {
    const texts = render(results("copper-silver", [1, 2, 1, 2]), ALL).texts();
    expect(texts).toEqual(expect.arrayContaining(["Cu", "2 Ag⁺", "Cu²⁺", "2 Ag"]));
    expect(texts.join(" ")).toContain("Cu: 0 → +2, oxidised, loses 2 e⁻ per atom");
    expect(texts.join(" ")).toContain("electrons lost 2, gained 2 ✓");
  });

  it("says what to fix, and whether it goes", () => {
    expect(render(results("copper-silver"), ALL).texts().join(" ")).toContain("Balance the electrons first");
    expect(render(results("zinc-copper"), ALL).texts().join(" ")).toContain("E°cell = +1.1 V: it goes");
    expect(render(results("copper-zinc"), ALL).texts().join(" ")).toContain("it does not go");
  });

  it("tallies the charge as well as the atoms", () => {
    const texts = render(results("copper-silver"), ALL).texts();
    expect(texts).toContain("charge");
    expect(texts).toEqual(expect.arrayContaining(["+1", "+2"]));
  });
});
