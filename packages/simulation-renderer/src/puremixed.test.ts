import { mixtureModel, type PureMixedParams, type PureMixedState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeMixtureLayout, lensPoints, mixtureRenderer, mixtureSizeWords } from "./puremixed/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = mixtureModel.initialize(mixtureModel.defaultParams);
const results = (params: Partial<PureMixedParams> = {}, state: Partial<PureMixedState> = {}) =>
  mixtureModel.derive({ ...base, ...state }, { ...mixtureModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  mixtureRenderer.draw(rec.ctx, computeMixtureLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("the particle view", () => {
  it("names the substance and what its particles are, and the kind with the numbers on", () => {
    const texts = render(results({ sample: "water" }), ["sample", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["Distilled water (H₂O)", "Only water molecules: H₂O, all alike", "A compound: pure, elements joined"]));
    expect(render(results({ sample: "soil" }), ["sample"]).texts()).not.toContain("A heterogeneous mixture: not the same all through");
  });

  it("draws three atoms for each water molecule and one for each gold atom", () => {
    const points = lensPoints(computeMixtureLayout(800)).length;
    expect(render(results({ sample: "water" }), ["sample"]).of("arc").length).toBe(3 * points + 2);
    expect(render(results({ sample: "gold" }), ["sample"]).of("arc").length).toBe(points + 2);
  });
});

describe("iron and sulphur", () => {
  it("shows the magnet's catch only with the numbers on", () => {
    expect(render(results({ fes: "mixed" }, { iron: 7, sulphur: 4 }), ["iron", "labels"]).texts()).toEqual(
      expect.arrayContaining(["7.0 g iron + 4.0 g sulphur, just mixed", "The magnet pulls out 7.0 g of iron", "A mixture: each part keeps its properties"]),
    );
    const spare = render(results({ fes: "heated" }, { iron: 10, sulphur: 4 }), ["iron", "labels"]).texts();
    expect(spare).toEqual(expect.arrayContaining(["The magnet pulls out 3.0 g of iron", "11.0 g of iron sulphide, 3.0 g iron spare"]));
  });

  it("keeps the iron sulphide's mass off the drawing while it is being estimated", () => {
    const texts = render(results({ fes: "heated" }, { iron: 10, sulphur: 4 }), ["iron"]).texts().join(" ");
    expect(texts).not.toMatch(/11\.0|3\.0 g/);
    expect(texts).toContain("The magnet pulls out grey iron filings");
  });

  it("names the gas from the acid", () => {
    expect(render(results({ fes: "mixed", fesTest: "acid" }), ["iron"]).texts()).toContain("Gas: hydrogen, with no smell");
    expect(render(results({ fes: "heated", fesTest: "acid" }, { iron: 7, sulphur: 4 }), ["iron"]).texts()).toContain("Gas: hydrogen sulphide, smells of rotten eggs");
    expect(render(results({ fes: "heated", fesTest: "cs2" }, { iron: 7, sulphur: 4 }), ["iron"]).texts()).toContain("Nothing dissolves");
  });
});

describe("the strength of a solution", () => {
  it("writes NCERT's example out, and its concentration only with the numbers on", () => {
    const r = results({ solute: "salt" }, { soluteMass: 40, water: 320, temp: 20 });
    expect(render(r, ["beaker", "labels"]).texts()).toEqual(expect.arrayContaining(["40 g of salt in 320 g of water at 20 °C", "Solution: 360.0 g", "11.1% by mass; strongest here 26.5%"]));
    expect(render(r, ["beaker"]).texts().join(" ")).not.toMatch(/11\.1|26\.5|360/);
  });

  it("says when the solution is saturated", () => {
    expect(render(results({}, { soluteMass: 50, water: 100 }), ["beaker", "labels"]).texts()).toContain("Saturated: 14.0 g stays at the bottom");
    expect(render(results({}, { soluteMass: 36, water: 100 }), ["beaker"]).texts()).toContain("Saturated: some stays at the bottom");
  });

  it("makes up the flask to its mark", () => {
    const texts = render(results({}, { flaskMass: 4.5, volume: 500 }), ["flask", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["4.5 g of salt, made up to 500 mL", "500 mL mark", "0.90 g in every 100 mL: 0.90%"]));
    expect(render(results({}, { flaskMass: 4.5, volume: 500 }), ["flask"]).texts().join(" ")).not.toContain("0.90");
  });
});

describe("the light beam", () => {
  it("shows the beam's path only where particles scatter it", () => {
    expect(render(results({ liquid: "salt-solution" }), ["beam"]).texts()).toContain("The beam passes unseen");
    expect(render(results({ liquid: "milk" }), ["beam"]).texts()).toContain("The beam's path shows: the Tyndall effect");
  });

  it("writes particle sizes as people do", () => {
    expect([0.3, 5, 150, 10_000, 60_000].map(mixtureSizeWords)).toEqual(["0.3", "5", "150", "10 000", "60 000"]);
    expect(render(results({ liquid: "chalk" }, { minutes: 3 }), ["beam", "labels"]).texts()).toEqual(
      expect.arrayContaining(["A suspension: particles about 10 000 nm", "33% settled; clears in 9.0 min", "Standing for 3 min"]),
    );
    expect(render(results({ liquid: "chalk" }, { minutes: 10 }), ["beam", "labels"]).texts()).toContain("All settled");
  });

  it("names the colloid's kind with the numbers on", () => {
    expect(render(results({ colloid: "fog" }), ["colloid", "labels"]).texts()).toEqual(expect.arrayContaining(["Fog", "Tiny liquid drops spread through a gas", "Liquid in gas: an aerosol"]));
    expect(render(results({ colloid: "sponge" }), ["colloid"]).texts()).not.toContain("Gas in solid: a foam");
  });
});

describe("on a 325 px phone", () => {
  const scenes: [string, ReturnType<typeof results>, string[]][] = [
    ["sample", results({ sample: "iron-sulphur" }), ["sample", "labels"]],
    ["sample-air", results({ sample: "air" }), ["sample", "labels"]],
    ["magnet", results({ fes: "heated" }, { iron: 14, sulphur: 0.5 }), ["iron", "labels"]],
    ["acid", results({ fes: "heated", fesTest: "acid" }, { iron: 10, sulphur: 4 }), ["iron", "labels"]],
    ["cs2", results({ fes: "heated", fesTest: "cs2" }, { iron: 1, sulphur: 14 }), ["iron", "labels"]],
    ["beaker", results({ solute: "kno3" }, { soluteMass: 200, water: 500, temp: 80 }), ["beaker", "labels"]],
    ["flask", results({}, { flaskMass: 12.5, volume: 1000 }), ["flask", "labels"]],
    ["beam", results({ liquid: "copper-sulphate" }, { minutes: 60 }), ["beam", "labels"]],
    ["mud", results({ liquid: "mud" }, { minutes: 1 }), ["beam", "labels"]],
    ["colloid", results({ colloid: "milk-of-magnesia" }), ["colloid", "labels"]],
  ];

  it.each(scenes)("keeps the %s scene on the canvas", (_name, r, layers) => {
    const layout = computeMixtureLayout(325);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const rec = render(r, layers, 325);
    for (const call of rec.of("fillText")) {
      const [words, x, y] = call.args as [string, number, number];
      expect(words.length, words).toBeLessThanOrEqual(55);
      expect(x, words).toBeGreaterThanOrEqual(0);
      expect(x, words).toBeLessThanOrEqual(325);
      expect(y, words).toBeGreaterThan(0);
      expect(y, words).toBeLessThan(layout.height);
    }
  });

  it("fits the lens, dish, tube, beaker, flask and box inside", () => {
    const l = computeMixtureLayout(325);
    expect(l.lens.cx - l.lens.r).toBeGreaterThanOrEqual(16);
    expect(l.lens.cx + l.lens.r).toBeLessThanOrEqual(325 - 16);
    expect(l.dish.cx - l.dish.rx).toBeGreaterThanOrEqual(8);
    expect(l.dish.cx + l.dish.rx).toBeLessThan(l.test.cx - 40);
    expect(l.test.cx + 40).toBeLessThanOrEqual(325);
    expect(l.torch.x).toBeGreaterThanOrEqual(0);
    expect(l.torch.x + 44).toBeLessThan(l.beaker.x);
    expect(l.beaker.x + l.beaker.width).toBeLessThanOrEqual(325 - 16);
    expect(l.flask.cy + l.flask.r).toBeLessThan(l.caption[0] - 12);
    expect(l.box.x + l.box.width).toBeLessThanOrEqual(325);
    expect(l.box.y + l.box.height).toBeLessThan(l.caption[0] - 12);
  });
});
