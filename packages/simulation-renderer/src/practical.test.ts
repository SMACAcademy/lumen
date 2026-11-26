import { practicalModel, type PracticalParams, type PracticalState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { buretteY, computePracticalLayout, glassY, PRACTICAL_SCENE_REAGENTS, practicalRenderer } from "./practical/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = practicalModel.initialize(practicalModel.defaultParams);
const results = (params: Partial<PracticalParams> = {}, state: Partial<PracticalState> = {}) =>
  practicalModel.derive({ ...base, ...state }, { ...practicalModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  practicalRenderer.draw(rec.ctx, computePracticalLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const TITRATE = ["burette", "labels"];

describe("the titration bench", () => {
  it("names the titration and its indicator", () => {
    const texts = render(results({ titration: "oxalic-naoh" }), TITRATE).texts();
    expect(texts).toEqual(expect.arrayContaining(["NaOH → 10 mL of 0.1 M oxalic acid", "Indicator: phenolphthalein in the flask"]));
    const kmno4 = render(results({ titration: "kmno4-mohr" }), TITRATE).texts();
    expect(kmno4).toEqual(expect.arrayContaining(["KMnO₄ → 10 mL of 0.05 M Mohr's salt", "dark KMnO₄: read the upper rim"]));
  });

  it("numbers the magnified scale every millilitre, increasing downwards", () => {
    const rec = render(results({}, { initial: 1.2, added: 20 }), ["burette"], 325);
    const numbers = rec.of("fillText").filter((c) => /^\d+$/.test(String(c.args[0])));
    expect(numbers.map((c) => c.args[0])).toEqual(["21", "22"]);
    expect(Number(numbers[1]!.args[2])).toBeGreaterThan(Number(numbers[0]!.args[2]));
  });

  it("says where the titration stands, with the words on", () => {
    expect(render(results({ titration: "hcl-naoh" }, { strength: 0.1, added: 6 }), TITRATE).texts()).toContain("Titre 6.0 mL: still colourless");
    expect(render(results({ titration: "oxalic-naoh" }, { strength: 0.08, added: 25 }), TITRATE).texts()).toContain("End point: titre 25.0 mL, M = 0.080 M");
    expect(render(results({ titration: "hcl-naoh" }, { strength: 0.1, added: 11 }), TITRATE).texts()).toContain("Overshot by 1.0 mL: too pink");
  });

  it("keeps the reading and the molarity off the drawing when the words are hidden", () => {
    const texts = render(results({ titration: "oxalic-naoh" }, { strength: 0.08, initial: 1.2, added: 25 }), ["burette"]).texts().join(" ");
    expect(texts).not.toMatch(/26\.2|0\.080|End point|now/);
  });

  it("puts 0 mL at the top of the burette and 50 mL at the bottom", () => {
    const layout = computePracticalLayout(325);
    expect(buretteY(layout, 0)).toBeLessThan(buretteY(layout, 50));
    expect(glassY(layout, 21.2, 21.2)).toBeCloseTo(layout.glass.y + layout.glass.height / 2, 9);
  });
});

describe("the test benches", () => {
  it("shows the observation and the learner's answer, never the mystery's name", () => {
    const texts = render(results({ salt: "cuso4", reagent: "flame" }, { saltGuess: 0 }), ["salt", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["Mystery salt", "Flame test", "Blue-green flame", "Sample: blue crystals", "Your answer: NH₄Cl"]));
    expect(texts.join(" ")).not.toContain("CuSO₄");
    const fusion = render(results({ compound: "iodoform", fusionTest: "silver" }), ["fusion", "labels"]).texts();
    expect(fusion).toEqual(expect.arrayContaining(["HNO₃, then AgNO₃", "Yellow AgI, insoluble in NH₄OH", "Your answer: Urea"]));
    const organic = render(results({ organic: "ethanal", groupTest: "tollens" }, { organicGuess: 2 }), ["organic", "labels"]).texts();
    expect(organic).toEqual(expect.arrayContaining(["Tollens' reagent", "Silver mirror on the tube", "Your answer: Ethanal"]));
  });

  it("draws a flame for the flame test and a tube otherwise", () => {
    expect(render(results({ salt: "bacl2", reagent: "flame" }), ["salt"]).of("quadraticCurveTo").length).toBeGreaterThanOrEqual(3);
    const tube = render(results({ salt: "mgso4", reagent: "bacl2" }), ["salt"]);
    expect(tube.of("ellipse").length).toBeGreaterThanOrEqual(2); // the watch glass and the precipitate
  });

  it("lines its reagent names up with the engine's tests", () => {
    for (const [order, names] of Object.values(PRACTICAL_SCENE_REAGENTS)) expect(names).toHaveLength(order.length);
  });
});

describe("the cation scheme", () => {
  it("fills in the flowchart down to the stage reached", () => {
    const texts = render(results({ salt: "fecl3" }, { stage: 3 }), ["scheme"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["NH₄OH with NH₄Cl", "no NH₃", "no ppt", "brown Fe(OH)₃", "Reddish-brown ppt of Fe(OH)₃"]));
    expect(texts).not.toContain("white BaCO₃");
  });
});

describe("on a 325 px phone", () => {
  const scenes: [string, ReturnType<typeof results>, string[]][] = [
    ["titrate", results({ titration: "kmno4-mohr" }, { strength: 0.01, initial: 0.5, added: 10 }), TITRATE],
    ["salt", results({ salt: "fecl3", reagent: "agno3" }, { saltGuess: 9 }), ["salt", "labels"]],
    ["flame", results({ salt: "kno3", reagent: "flame" }), ["salt", "labels"]],
    ["scheme", results({ salt: "mgso4" }, { stage: 6 }), ["scheme", "labels"]],
    ["fusion", results({ compound: "bromobenzene", fusionTest: "silver" }, { compoundGuess: 5 }), ["fusion", "labels"]],
    ["organic", results({ organic: "phenol", groupTest: "bromine-water" }), ["organic", "labels"]],
  ];

  it.each(scenes)("keeps the %s scene on the canvas", (_name, r, layers) => {
    const layout = computePracticalLayout(325);
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

  it("fits the glass, flask and tube inside", () => {
    const l = computePracticalLayout(325);
    expect(l.glass.x + l.glass.width).toBeLessThanOrEqual(325 - 16);
    expect(l.flask.cx - l.flask.half).toBeGreaterThanOrEqual(0);
    expect(l.flask.cx + l.flask.half).toBeLessThan(l.glass.x);
    expect(l.tube.x).toBeGreaterThan(l.sample.cx + 30);
    expect(l.rows.top + 7 * l.rows.height).toBeLessThan(l.height - 30);
  });
});
