import { BONDED_MOLECULE_ORDER, BONDED_MOLECULES, overlapModel, type OverlapParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeOverlapLayout, fitMolecule, overlapRenderer } from "./overlap/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (params: Partial<OverlapParams> = {}, distance = 74) => overlapModel.derive({ distance }, { ...overlapModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  overlapRenderer.draw(rec.ctx, computeOverlapLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const CURVE = ["atoms", "curve", "labels"];

describe("the energy curve", () => {
  it("says what is happening at the minimum, far out and too close", () => {
    expect(render(results({}, 74), CURVE).texts().join(" ")).toContain("74 pm: the lowest energy, −436 kJ/mol. This is the bond");
    expect(render(results({}, 150), CURVE).texts().join(" ")).toContain("Attraction is winning: E = −177 kJ/mol");
    expect(render(results({}, 30), CURVE).texts().join(" ")).toContain("Too close: the nuclei repel. E = +");
  });

  it("gives the distance always and the well's depth only with the words on", () => {
    const hidden = render(results({}, 74), ["atoms", "curve"]).texts();
    expect(hidden).toContain("H   74 pm   H");
    expect(hidden.join(" ")).not.toMatch(/−436|lowest/);
    expect(render(results({}, 74), CURVE).texts()).toContain("−436");
  });

  it("draws the clouds closer as the atoms approach, and keeps them on a phone's canvas", () => {
    const centres = (distance: number) => render(results({}, distance), ["atoms"], 325).of("arc").map((c) => c.args[0] as number);
    const near = centres(74);
    const far = centres(400);
    expect(Math.max(...far) - Math.min(...far)).toBeGreaterThan(Math.max(...near) - Math.min(...near));
    expect(Math.min(...far) - 36).toBeGreaterThanOrEqual(0);
    expect(Math.max(...far) + 36).toBeLessThanOrEqual(325);
  });
});

describe("the overlap view", () => {
  it("names the overlap and the bond it makes", () => {
    const words = (overlapType: OverlapParams["overlapType"]) => render(results({ overlapType }), ["orbitals", "labels"]).texts().join(" ");
    expect(words("ss")).toContain("s with s");
    expect(words("ss")).toContain("a sigma (σ) bond");
    expect(words("pp-head")).toContain("a sigma (σ) bond");
    expect(words("pp-side")).toContain("a pi (π) bond");
    expect(words("sp-side")).toContain("zero overlap, no bond");
    expect(render(results({ overlapType: "pp-side" }), ["orbitals"]).texts().join(" ")).not.toMatch(/sigma|pi \(/);
  });

  it("draws an s orbital as one circle and a p orbital as two lobes", () => {
    const lobes = (overlapType: OverlapParams["overlapType"]) => render(results({ overlapType }), ["orbitals"]).of("ellipse").length;
    expect(lobes("ss")).toBe(0);
    expect(lobes("sp")).toBe(2);
    expect(lobes("pp-head")).toBe(4);
    expect(lobes("pp-side")).toBe(4);
  });
});

describe("the structure view", () => {
  it("draws one line for a single bond, two for a double and three for a triple", () => {
    const lines = (molecule: OverlapParams["molecule"]) => render(results({ molecule }), ["structure"]).of("stroke").length;
    expect(lines("ethane")).toBe(7);
    expect(lines("ethene")).toBe(6);
    expect(lines("ethyne")).toBe(5);
    expect(lines("benzene")).toBe(15);
  });

  it("counts the bonds in words, and only with the words on", () => {
    const shown = render(results({ molecule: "ethene" }), ["structure", "labels"]).texts();
    expect(shown).toEqual(expect.arrayContaining(["Ethene  C₂H₄", "σ bond", "π bond"]));
    expect(shown.join(" ")).toContain("5 σ bonds + 1 π bond");
    expect(render(results({ molecule: "ethane" }), ["structure", "labels"]).texts().join(" ")).toContain("7 σ bonds + 0 π bonds");
    expect(render(results({ molecule: "ethene" }), ["structure"]).texts().join(" ")).not.toContain("σ");
  });

  it("fits every molecule inside a phone's canvas", () => {
    const layout = computeOverlapLayout(325);
    for (const id of BONDED_MOLECULE_ORDER) {
      const molecule = BONDED_MOLECULES[id];
      const place = fitMolecule(molecule, 325 / 2, (layout.height - 40) / 2 + 12, 325 - 70, layout.height - 130);
      for (const atom of molecule.atoms) {
        const [x, y] = place(atom.x, atom.y);
        expect(x, id).toBeGreaterThanOrEqual(12);
        expect(x, id).toBeLessThanOrEqual(325 - 12);
        expect(y, id).toBeGreaterThanOrEqual(34);
        expect(y, id).toBeLessThanOrEqual(layout.height - 56);
      }
    }
  });
});
