import {
  SCHOOL_COATING_ORDER,
  SCHOOL_METHOD_ORDER,
  SCHOOL_MIXTURE_ORDER,
  SCHOOL_OBJECT_ORDER,
  SCHOOL_SOLUTE_ORDER,
  SCHOOL_TUBE_ORDER,
  type SchoolMatterParams,
  type SchoolMatterState,
  schoolMatterModel,
} from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeSchoolMatterLayout, schoolMatterRenderer } from "./schoolmatter/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = schoolMatterModel.initialize(schoolMatterModel.defaultParams);
const results = (params: Partial<SchoolMatterParams> = {}, state: Partial<SchoolMatterState> = {}) =>
  schoolMatterModel.derive({ ...base, ...state }, { ...schoolMatterModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const layout = computeSchoolMatterLayout(width);
  schoolMatterRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[]) => render(r, layers).texts().join(" | ");

describe("the materials bench", () => {
  it("names the object and, with the words, its properties", () => {
    const nail = render(results({ object: "nail" }), ["materials", "labels"]).texts();
    expect(nail).toEqual(expect.arrayContaining(["Iron nail (iron)", "In water", "Torch light", "shiny", "hard", "blocks light", "sinks"]));
    expect(nail.join(" ")).toContain("density 7.90 g/cm³: more than water's 1");
    const cork = render(results({ object: "cork" }), ["materials", "labels"]).texts();
    expect(cork).toEqual(expect.arrayContaining(["dull", "soft", "floats"]));
    expect(render(results({ object: "frosted" }), ["materials", "labels"]).texts()).toContain("lets some light");
    expect(render(results({ object: "marble" }), ["materials", "labels"]).texts()).toContain("see-through");
  });

  it("keeps the properties to itself without the words", () => {
    expect(text(results({ object: "cork" }), ["materials"])).not.toMatch(/floats|soft|density/);
  });
});

describe("the dissolving beaker", () => {
  it("says how much dissolved and how much more will go", () => {
    const t = text(results({ solute: "salt" }, { added: 30 }), ["beaker", "labels"]);
    expect(t).toContain("Salt in 100 g of water");
    expect(t).toContain("30.0 g dissolved; 6.0 g more will go");
    expect(t).toContain("30 g added");
  });

  it("calls a solution saturated once no more will dissolve", () => {
    expect(text(results({ solute: "salt" }, { added: 40 }), ["beaker", "labels"])).toContain("Saturated: 4.0 g stays at the bottom");
    expect(text(results({ solute: "sand" }, { added: 20 }), ["beaker", "labels"])).toContain("Sand does not dissolve: it stays as it is");
  });

  it("marks the solubility on its curve only with the words", () => {
    const t = render(results({ solute: "kno3" }, { waterTemp: 40, water: 50 }), ["beaker", "labels"]).texts();
    expect(t).toEqual(expect.arrayContaining(["g in 100 g water", "62", "Potassium nitrate in 50 g of water"]));
    const hidden = text(results({ solute: "kno3" }, { waterTemp: 40, water: 50 }), ["beaker"]);
    expect(hidden).not.toMatch(/62|31|dissolved|Saturated/);
  });
});

describe("the separating bench", () => {
  it("splits the mixture when the method suits it, and says why", () => {
    const t = text(results({ mixture: "salt-water", method: "evaporate" }), ["separate", "labels"]);
    expect(t).toContain("Salt in water");
    expect(t).toContain("Evaporating");
    expect(t).toContain("split!");
    expect(t).toContain("The water dries up and the salt is left behind.");
  });

  it("suggests the right method when the choice is wrong", () => {
    const t = text(results({ mixture: "salt-water", method: "filter" }), ["separate", "labels"]);
    expect(t).toContain("still mixed");
    expect(t).toContain("Try: evaporating");
  });

  it("hides the verdict without the words", () => {
    const t = text(results({ mixture: "sand-water", method: "filter" }), ["separate"]);
    expect(t).toContain("?");
    expect(t).not.toMatch(/split|mixed|Try/);
  });
});

describe("the rusting tubes", () => {
  it("draws all three tubes, ringing the chosen one", () => {
    const rec = render(results({ tube: "open" }, { days: 8 }), ["tubes", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Bare iron nails", "Dry air", "Boiled water", "Water + air", "air ✓ water ✗", "air ✗ water ✓", "air ✓ water ✓"]));
    expect(rec.texts().join(" ")).toContain("Day 8: 63% of the nail has rusted");
    expect(rec.of("strokeRect").length).toBeGreaterThanOrEqual(1);
  });

  it("says why a nail stays bright", () => {
    expect(text(results({ tube: "dry" }, { days: 8 }), ["tubes", "labels"])).toContain("Day 8: no rust: no water");
    expect(text(results({ tube: "boiled" }, { days: 8 }), ["tubes", "labels"])).toContain("Day 8: no rust: no air");
    expect(text(results({ tube: "open", coating: "zinc" }, { days: 8 }), ["tubes", "labels"])).toContain("no rust: the coat keeps it off");
  });

  it("paints rust only on a bare nail with air and water", () => {
    const rusty = render(results({ tube: "open" }, { days: 8 }), ["tubes"]);
    const painted = render(results({ tube: "open", coating: "paint" }, { days: 8 }), ["tubes"]);
    expect(rusty.of("fillRect").length).toBe(painted.of("fillRect").length + 1);
  });
});

describe("the particles", () => {
  it("names the state and the speed", () => {
    const steam = text(results({}, { temp: 100 }), ["particles", "labels"]);
    expect(steam).toContain("Water at 100 °C: steam");
    expect(steam).toContain("far apart, flying about freely");
    expect(steam).toContain("speed about 662 m/s · 13 widths apart");
    expect(text(results({}, { temp: -10 }), ["particles", "labels"])).toContain("packed in rows, shaking in place");
    expect(text(results({}, { temp: 20 }), ["particles", "labels"])).toContain("speed about 587 m/s");
  });

  it("draws many particles for a solid or liquid and few for a gas", () => {
    const ice = render(results({}, { temp: -10 }), ["particles"]).of("arc").length;
    const steam = render(results({}, { temp: 120 }), ["particles"]).of("arc").length;
    expect(ice).toBeGreaterThan(50);
    expect(steam).toBeLessThan(15);
  });
});

describe("ink and evaporation", () => {
  it("compares the ink's spreading with 20 °C", () => {
    expect(text(results({}, { inkTemp: 80 }), ["ink", "labels"])).toContain("spreads 3.4× as fast as at 20 °C");
    expect(text(results({}, { inkTemp: 80 }), ["ink"])).not.toContain("spreads");
  });

  it("gives the rate and the pot's coolest only with the words", () => {
    const t = text(results({}, { airTemp: 40, humidity: 20 }), ["evaporate", "labels"]);
    expect(t).toContain("cools to 22.7 °C");
    expect(t).toContain("wind 0.0 m/s · humidity 20%");
    const base = text(results(), ["evaporate", "labels"]);
    expect(base).toContain("2.04 g an hour: 100 g goes in 49 h");
    const hidden = text(results({}, { airTemp: 40, humidity: 20 }), ["evaporate"]);
    expect(hidden).not.toMatch(/cools|g an hour/);
  });
});

describe("on a phone", () => {
  it("keeps every word and shape on a 325 px canvas", () => {
    const layout = computeSchoolMatterLayout(325);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const cases: [Partial<SchoolMatterParams>, Partial<SchoolMatterState>, string][] = [];
    for (const object of SCHOOL_OBJECT_ORDER) cases.push([{ object }, {}, "materials"]);
    for (const solute of SCHOOL_SOLUTE_ORDER) for (const added of [0, 30, 400]) cases.push([{ solute }, { added, water: 200, waterTemp: 80 }, "beaker"]);
    for (const mixture of SCHOOL_MIXTURE_ORDER) for (const method of SCHOOL_METHOD_ORDER) cases.push([{ mixture, method }, {}, "separate"]);
    for (const tube of SCHOOL_TUBE_ORDER) for (const coating of SCHOOL_COATING_ORDER) cases.push([{ tube, coating }, { days: 30 }, "tubes"]);
    for (const temp of [-20, 20, 150]) cases.push([{}, { temp }, "particles"]);
    for (const inkTemp of [5, 90]) cases.push([{}, { inkTemp, clock: 60 }, "ink"]);
    for (const [area, wind] of [[10, 0], [1000, 5]] as const) cases.push([{}, { area, wind, airTemp: 45, humidity: 10 }, "evaporate"]);

    for (const [params, state, layer] of cases) {
      const rec = render(results(params, state), [layer, "labels"], 325);
      const where = `${layer} ${JSON.stringify(params)} ${JSON.stringify(state)}`;
      for (const call of rec.of("fillText")) {
        const [words, x, y] = call.args as [string, number, number];
        // Every text here is at most 50 characters; at about 6 px each, a centred one stays on.
        expect(words.length, `${where}: ${words}`).toBeLessThanOrEqual(50);
        expect(x, `${where}: ${words}`).toBeGreaterThanOrEqual(0);
        expect(x, `${where}: ${words}`).toBeLessThanOrEqual(325);
        expect(y, `${where}: ${words}`).toBeGreaterThan(0);
        expect(y, `${where}: ${words}`).toBeLessThan(layout.height);
      }
      for (const call of rec.of("arc")) {
        const [x, y, r] = call.args as [number, number, number];
        if (layer === "ink") continue; // the ink cloud is clipped to its beaker
        expect(x - r, where).toBeGreaterThanOrEqual(-1);
        expect(x + r, where).toBeLessThanOrEqual(326);
        expect(y + r, where).toBeLessThanOrEqual(layout.height);
      }
      for (const call of rec.of("fillRect")) {
        const [x, y, w, h] = call.args as [number, number, number, number];
        expect(x, where).toBeGreaterThanOrEqual(0);
        expect(x + w, where).toBeLessThanOrEqual(325);
        expect(y + h, where).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("keeps the centred captions inside the canvas", () => {
    const captions = [
      text(results({ mixture: "husk-wheat", method: "winnow" }), ["separate", "labels"]),
      text(results({ object: "butter-paper" }), ["materials", "labels"]),
    ];
    for (const t of captions) expect(t.length).toBeGreaterThan(0);
    const rec = render(results({ mixture: "stones-rice", method: "handpick" }), ["separate", "labels"], 325);
    const caption = rec.texts().find((w) => w.startsWith("The stones"))!;
    const call = rec.of("fillText").find((c) => c.args[0] === caption)!;
    const x = call.args[1] as number;
    expect(x - (caption.length * 6) / 2).toBeGreaterThanOrEqual(0);
    expect(x + (caption.length * 6) / 2).toBeLessThanOrEqual(325);
  });
});
