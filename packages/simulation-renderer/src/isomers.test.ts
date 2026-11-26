import { isomersModel, type IsomersParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeIsomersLayout, isomersRenderer } from "./isomers/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (params: Partial<IsomersParams>, isomer = 0) =>
  isomersModel.derive({ isomer, clock: 0 }, { ...isomersModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  isomersRenderer.draw(rec.ctx, computeIsomersLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the isomers renderer draws", () => {
  it("builds the name from its parts and shows the working", () => {
    const texts = render(results({ compound: "ferricyanide" }), ["naming", "working"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["K₃[Fe(CN)₆]", "potassium", "hexacyanido", "ferrate", "(III)"]));
    expect(texts.join(" ")).toContain("Metal: −3 − (−6) = +3");
  });

  it("draws six ligands on an octahedron, four on a square", () => {
    const atoms = (type: IsomersParams["type"]) => render(results({ type }), ["isomers"]).of("arc").length;
    expect(atoms("ma4b2")).toBe(7);
    expect(atoms("ma2b2-square")).toBe(5);
  });

  it("names cis and trans, and shows a chiral isomer beside its mirror image", () => {
    const names = [0, 1].map((i) => render(results({ type: "ma4b2" }, i), ["isomers"]).texts().find((t) => t.includes("MA₄B₂")));
    expect(names.sort()).toEqual(["cis-[MA₄B₂], octahedral", "trans-[MA₄B₂], octahedral"]);
    const chiral = render(results({ type: "maa3" }), ["isomers", "labels"]);
    expect(chiral.texts()).toContain("mirror");
    expect(chiral.texts().join(" ")).toContain("Chiral");
    expect(chiral.of("quadraticCurveTo")).toHaveLength(6);
  });

  it("fits a phone", () => {
    expect(computeIsomersLayout(375).height).toBeGreaterThan(0);
  });
});
