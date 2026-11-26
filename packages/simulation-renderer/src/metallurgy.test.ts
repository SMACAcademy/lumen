import {
  MET_ALLOY_ORDER,
  MET_FORM_ORDER,
  MET_IONIC_ORDER,
  MET_ORE_ORDER,
  metallurgyModel,
  type MetallurgyParams,
  type MetallurgyState,
} from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { alloyAtoms, caratGrid, computeMetallurgyLayout, ionsGeometry, ladderBoxes, metallurgyRenderer, refiningGeometry, temperatureX } from "./metallurgy/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (params: Partial<MetallurgyParams> = {}, state: Partial<MetallurgyState> = {}) =>
  metallurgyModel.derive({ transfer: 0, stage: 0, carat: 22, ...state }, { ...metallurgyModel.defaultParams, ...params });

interface Placed {
  text: string;
  x: number;
  y: number;
  align: string;
}

/** Render, recording every text with the alignment it was drawn in. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const placed: Placed[] = [];
  const target = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(target, {
    get(t, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          placed.push({ text, x, y, align: String(t.textAlign ?? "left") });
          (t.fillText as (...a: unknown[]) => void)(text, x, y);
        };
      }
      return t[key];
    },
    set(t, key: string, value) {
      t[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeMetallurgyLayout(width);
  metallurgyRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, placed, layout, texts: rec.texts() };
};

/** Left and right edge of a placed text, at the recorder's 6 px per character (a little more for bold). */
const extent = (p: Placed): [number, number] => {
  const w = [...p.text].length * 6.5;
  if (p.align === "center") return [p.x - w / 2, p.x + w / 2];
  if (p.align === "right") return [p.x - w, p.x];
  return [p.x, p.x + w];
};

const MODES: Record<string, string[]> = {
  ions: ["ions", "labels"],
  properties: ["properties", "labels"],
  extraction: ["extraction", "labels"],
  refining: ["refining", "labels"],
  alloys: ["alloys", "labels"],
  carat: ["carat", "labels"],
};

describe("what the metallurgy renderer draws", () => {
  it("moves sodium's electron to chlorine, then brackets the ions", () => {
    const before = render(results({ compound: "nacl" }, { transfer: 0 }), MODES.ions!);
    expect(before.texts).toEqual(expect.arrayContaining(["Sodium chloride, NaCl", "Na 2,8,1", "Cl 2,8,7", "0 of 1 electron moved"]));
    const after = render(results({ compound: "nacl" }, { transfer: 1 }), MODES.ions!);
    expect(after.texts).toEqual(expect.arrayContaining(["Na⁺ 2,8", "Cl⁻ 2,8,8", "opposite charges attract", "Na → Na⁺ + e⁻;  Cl + e⁻ → Cl⁻"]));
    // Seven dots on chlorine, one cross (two strokes) for sodium's electron.
    expect(after.rec.of("arc").length).toBeGreaterThanOrEqual(7);
  });

  it("shares magnesium's two electrons between two chlorines", () => {
    const half = render(results({ compound: "mgcl2" }, { transfer: 0.5 }), MODES.ions!);
    expect(half.texts).toEqual(expect.arrayContaining(["Mg⁺ 2,8,1", "Cl⁻ 2,8,8", "Cl 2,8,7", "1 of 2 electrons moved"]));
    const done = render(results({ compound: "mgcl2" }, { transfer: 1 }), MODES.ions!);
    expect(done.texts.filter((t) => t === "Cl⁻ 2,8,8")).toHaveLength(2);
    expect(done.texts).toEqual(expect.arrayContaining(["Mg²⁺ 2,8", "2+"]));
    const oxide = render(results({ compound: "mgo" }, { transfer: 1 }), MODES.ions!);
    expect(oxide.texts).toEqual(expect.arrayContaining(["Mg²⁺ 2,8", "O²⁻ 2,8", "2−"]));
  });

  it("keeps the shells off the picture when the labels are hidden", () => {
    const texts = render(results({ compound: "nacl" }, { transfer: 1 }), ["ions"]).texts;
    expect(texts.join(" ")).not.toContain("2,8");
  });

  it("lights the bulb only when the ions can move", () => {
    const glow = (form: MetallurgyParams["form"]) => render(results({ compound: "nacl", form }), MODES.properties!).texts;
    expect(glow("solid")).toEqual(expect.arrayContaining(["Bulb stays dark", "ions held in place"]));
    expect(glow("molten")).toContain("Bulb glows");
    expect(glow("water")).toContain("Bulb glows");
    expect(glow("kerosene")).toContain("Bulb stays dark");
    expect(glow("solid")).toEqual(expect.arrayContaining(["melts 1074 K", "boils 1686 K", "Water: dissolves", "Kerosene: insoluble"]));
    expect(render(results({ compound: "mgo", form: "water" }), MODES.properties!).texts).toContain("Water: hardly dissolves");
    expect(render(results({ compound: "nacl" }), ["properties"]).texts.join(" ")).not.toContain("1074");
  });

  it("places melting points on the temperature scale", () => {
    const layout = computeMetallurgyLayout(325);
    expect(temperatureX(layout, 0)).toBe(20);
    expect(temperatureX(layout, 4000)).toBe(305);
    expect(temperatureX(layout, 9000)).toBe(305);
  });

  it("walks an ore through its stages, and shows the series", () => {
    const zinc = render(results({ ore: "zinc-blende" }, { stage: 1.5 }), MODES.extraction!);
    expect(zinc.texts).toEqual(expect.arrayContaining([
      "Zinc blende, ZnS → zinc",
      "Roast: heat strongly in air",
      "2ZnS + 3O₂ → 2ZnO + 2SO₂",
      "ZnO + C → Zn + CO",
      "ZnS is 67.0% zinc by mass",
      "electrolysis",
      "carbon",
      "K",
      "Au",
    ]));
    const iron = render(results({ ore: "haematite" }), MODES.extraction!);
    expect(iron.texts).toEqual(expect.arrayContaining(["Fe₂O₃ + 3C → 2Fe + 3CO", "Already an oxide: nothing to do", "Fe₂O₃ is 70.0% iron by mass"]));
    expect(render(results({ ore: "cinnabar" }), MODES.extraction!).texts).toEqual(expect.arrayContaining(["2HgS + 3O₂ → 2HgO + 2SO₂", "2HgO → 2Hg + O₂"]));
    expect(render(results({ ore: "thermit" }), MODES.extraction!).texts).toContain("Fe₂O₃ + 2Al → 2Fe + Al₂O₃");
    const bare = render(results({ ore: "haematite" }), ["extraction"]).texts;
    expect(bare.join(" ")).not.toContain("70.0");
    expect(bare).not.toContain("electrolysis");
  });

  it("refines copper with an impure anode and a pure cathode", () => {
    const cell = render(results({ ore: "copper-glance" }, { stage: 3.5 }), MODES.refining!);
    expect(cell.texts).toEqual(expect.arrayContaining(["Anode: Cu → Cu²⁺ + 2e⁻", "Cathode: Cu²⁺ + 2e⁻ → Cu", "anode mud", "impure Cu", "pure Cu", "In acidified copper sulphate: 50% refined"]));
    const layout = computeMetallurgyLayout(325);
    expect(refiningGeometry(layout, 1).anodeWidth).toBeLessThan(refiningGeometry(layout, 0).anodeWidth);
    expect(refiningGeometry(layout, 1).cathodeWidth).toBeGreaterThan(refiningGeometry(layout, 0).cathodeWidth);
    expect(render(results({ ore: "haematite" }), MODES.refining!).texts).toContain("Iron is not refined by electrolysis");
  });

  it("shows what an alloy is made of", () => {
    const brass = render(results({ alloy: "brass" }), MODES.alloys!);
    expect(brass.texts).toEqual(expect.arrayContaining(["Brass = copper + zinc", "Copper (Cu)  70%", "Zinc (Zn)  30%", "pure copper", "brass"]));
    expect(render(results({ alloy: "solder" }), MODES.alloys!).texts).toContain("Melts at 456 K; tin 505 K, lead 601 K");
    expect(render(results({ alloy: "steel" }), MODES.alloys!).texts).toEqual(expect.arrayContaining(["Carbon (C)  0.05%", "Still rusts in moist air"]));
    expect(render(results({ alloy: "brass" }), ["alloys"]).texts).toContain("Copper (Cu)");
    const atoms = alloyAtoms({ Cu: 70, Zn: 30, Sn: 0, Pb: 0, Fe: 0, Cr: 0, Ni: 0, C: 0, Au: 0 });
    expect(atoms).toEqual([{ element: "Cu", count: 20 }, { element: "Zn", count: 8 }]);
    expect(alloyAtoms({ Cu: 0, Zn: 0, Sn: 0, Pb: 0, Fe: 99.95, Cr: 0, Ni: 0, C: 0.05, Au: 0 })[1]).toEqual({ element: "C", count: 1 });
  });

  it("counts carats in 24 squares, and keeps the percentage for the labels", () => {
    const gold = render(results({}, { carat: 18 }), MODES.carat!);
    expect(gold.texts).toEqual(expect.arrayContaining(["18 carat gold", "18 parts gold, 6 parts other metal", "18/24 of it is gold: 75.0%"]));
    expect(gold.rec.of("roundRect").length).toBeGreaterThanOrEqual(24);
    expect(render(results({}, { carat: 22 }), ["carat"]).texts.join(" ")).not.toContain("%");
  });

  it("keeps every text and shape inside a 325 px phone canvas", () => {
    const cases: [Partial<MetallurgyParams>, Partial<MetallurgyState>, string[]][] = [];
    for (const compound of MET_IONIC_ORDER) {
      for (const transfer of [0, 0.4, 0.75, 1]) cases.push([{ compound }, { transfer }, MODES.ions!]);
      for (const form of MET_FORM_ORDER) cases.push([{ compound, form }, {}, MODES.properties!]);
    }
    for (const ore of MET_ORE_ORDER) for (const stage of [0, 1.5, 2.5, 4]) {
      cases.push([{ ore }, { stage }, MODES.extraction!]);
      cases.push([{ ore }, { stage }, MODES.refining!]);
    }
    for (const alloy of MET_ALLOY_ORDER) cases.push([{ alloy }, {}, MODES.alloys!]);
    for (const carat of [1, 14, 22, 24]) cases.push([{}, { carat }, MODES.carat!]);

    for (const [params, state, layers] of cases) {
      const { placed, rec, layout } = render(results(params, state), layers, 325);
      const where = (text: string) => `${JSON.stringify(params)} ${JSON.stringify(state)} "${text}"`;
      expect(layout.height).toBeGreaterThanOrEqual(330);
      expect(layout.height).toBeLessThanOrEqual(420);
      for (const p of placed) {
        const [l, r] = extent(p);
        expect(l, where(p.text)).toBeGreaterThanOrEqual(0);
        expect(r, where(p.text)).toBeLessThanOrEqual(325);
        expect(p.y, where(p.text)).toBeGreaterThanOrEqual(0);
        expect(p.y, where(p.text)).toBeLessThanOrEqual(layout.height);
        if (p.y === layout.captionY) expect([...p.text].length, p.text).toBeLessThanOrEqual(55);
      }
      for (const call of rec.of("arc")) {
        const [x, y, radius] = call.args as [number, number, number];
        expect(x - radius, where("arc")).toBeGreaterThanOrEqual(0);
        expect(x + radius, where("arc")).toBeLessThanOrEqual(325);
        expect(y, where("arc")).toBeLessThanOrEqual(layout.height);
      }
      for (const call of [...rec.of("roundRect"), ...rec.of("fillRect")]) {
        const [x, y, w, h] = call.args as [number, number, number, number];
        expect(x, where("rect")).toBeGreaterThanOrEqual(0);
        expect(x + w, where("rect")).toBeLessThanOrEqual(325);
        expect(y + h, where("rect")).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("lays out the atoms, the series and the carat grid inside a phone canvas", () => {
    const layout = computeMetallurgyLayout(325);
    for (const n of [1, 2]) {
      const g = ionsGeometry(layout, n);
      for (const p of [g.metal, ...g.nonMetals]) {
        expect(p.x - g.r - 8).toBeGreaterThanOrEqual(0);
        expect(p.x + g.r + 8).toBeLessThanOrEqual(325);
      }
    }
    const boxes = ladderBoxes(layout);
    expect(boxes).toHaveLength(13);
    expect(boxes[0]!.x).toBe(10);
    expect(boxes[12]!.x + boxes[12]!.w).toBeCloseTo(315, 9);
    const grid = caratGrid(layout);
    expect(grid.x).toBeGreaterThanOrEqual(0);
    expect(grid.x + 12 * grid.size).toBeLessThanOrEqual(325);
  });
});
