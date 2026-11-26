import {
  METALACID_COMPOUND_ORDER,
  METALACID_ELEMENT_ORDER,
  METALACID_LIQUID_ORDER,
  METALACID_METAL_ORDER,
  METALACID_REDOX_ORDER,
  METALACID_SALT_ORDER,
  METALACID_SUBSTANCE_ORDER,
  metalAcidModel,
  type MetalAcidParams,
  type MetalAcidState,
} from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeMetalAcidLayout, metalAcidRenderer, universalColour } from "./metalacid/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (params: Partial<MetalAcidParams> = {}, state: Partial<MetalAcidState> = {}) =>
  metalAcidModel.derive({ time: 0, days: 0, ...state }, { ...metalAcidModel.defaultParams, ...params });

interface Placed {
  text: string;
  x: number;
  y: number;
  align: string;
  font: string;
}

/** Render, recording every text with the alignment and font it was drawn in. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const placed: Placed[] = [];
  const target = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(target, {
    get(t, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          placed.push({ text, x, y, align: String(t.textAlign ?? "left"), font: String(t.font ?? "") });
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
  const layout = computeMetalAcidLayout(width);
  metalAcidRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, placed, layout, texts: rec.texts() };
};

const MODES: Record<string, string[]> = {
  element: ["element", "labels"],
  corrosion: ["corrosion", "labels"],
  series: ["series", "beaker", "labels"],
  redox: ["redox", "labels"],
  acid: ["acid", "labels"],
  ph: ["phscale", "indicators", "labels"],
  salts: ["salts", "labels"],
};

/** Typical widths: 6.2 px a character for 12 px text, 7.2 for bold 13 px, 11 for 18 px. */
const charWidth = (font: string) => (font.includes("18px") || font.includes("20px") ? 11 : font.startsWith("600") ? 7.2 : 6.2);
function extent(p: Placed): [number, number] {
  const w = [...p.text].length * charWidth(p.font);
  if (p.align === "center") return [p.x - w / 2, p.x + w / 2];
  if (p.align === "right") return [p.x - w, p.x];
  return [p.x, p.x + w];
}

describe("what the metals, acids and salts renderer draws", () => {
  it("lists an element's properties and names the exceptions", () => {
    const { texts } = render(results({ element: "mercury" }), MODES.element!);
    expect(texts).toEqual(expect.arrayContaining(["Mercury (Hg)", "Shiny (lustre)", "liquid", "Mercury is a metal, yet it is a liquid"]));
    expect(render(results({ element: "graphite" }), MODES.element!).texts).toContain("Graphite is a non-metal that conducts");
    expect(render(results({ element: "sulphur" }), MODES.element!).texts).toEqual(expect.arrayContaining(["Sulphur is a non-metal", "acidic", "oxide: SO₂"]));
  });

  it("draws the reactivity series and writes the displacement", () => {
    const { texts } = render(results({ metal: "iron", liquid: "cuso4" }, { time: 20 }), MODES.series!);
    expect(texts).toEqual(expect.arrayContaining(["K", "(H)", "Au", "Iron + CuSO₄ solution", "Fe + CuSO₄ → FeSO₄ + Cu", "Iron is above copper, so it pushes copper out", "Cu coats the strip"]));
    expect(render(results({ metal: "copper", liquid: "feso4" }), MODES.series!).texts).toEqual(expect.arrayContaining(["No reaction", "Copper is below iron: no change"]));
  });

  it("hides the equation and the verdict without labels", () => {
    const { texts } = render(results({ metal: "iron", liquid: "cuso4" }), ["series", "beaker"]);
    expect(texts.join(" ")).not.toContain("→");
    expect(texts.join(" ")).not.toContain("pushes");
  });

  it("bubbles hydrogen from a metal above hydrogen in acid", () => {
    const zinc = render(results({ metal: "zinc", liquid: "hcl" }, { time: 0.5 }), MODES.series!);
    expect(zinc.texts).toEqual(expect.arrayContaining(["Zn + 2HCl → ZnCl₂ + H₂", "H₂"]));
    const copper = render(results({ metal: "copper", liquid: "hcl" }, { time: 0.5 }), MODES.series!);
    expect(copper.texts).toContain("Copper is below hydrogen: no gas");
    expect(copper.texts).not.toContain("H₂");
  });

  it("shows the coat growing on corroding iron, and says rust flakes", () => {
    const { texts } = render(results({ metal: "iron" }, { days: 5 }), MODES.corrosion!);
    expect(texts).toEqual(expect.arrayContaining(["Iron in moist air: day 5", "Coated: 51%, reddish-brown rust", "Rust flakes off, so the iron keeps rusting"]));
    expect(render(results({ metal: "iron" }, { days: 5 }), ["corrosion"]).texts.join(" ")).not.toContain("51%");
    expect(render(results({ metal: "gold" }, { days: 100 }), MODES.corrosion!).texts).toContain("Gold does not corrode");
  });

  it("brackets what is oxidised and what is reduced", () => {
    const { texts } = render(results({ redox: "copper-oxide" }), MODES.redox!);
    expect(texts).toEqual(expect.arrayContaining(["CuO", "H₂", "Cu", "H₂O", "oxidised: gains oxygen", "reduced: loses oxygen", "Oxidising agent: CuO", "Reducing agent: H₂"]));
    expect(render(results({ redox: "hydrogen-sulphide" }), MODES.redox!).texts).toEqual(expect.arrayContaining(["oxidised: loses hydrogen", "reduced: gains hydrogen"]));
  });

  it("turns limewater milky for carbon dioxide and pops for hydrogen", () => {
    expect(render(results({ compound: "marble" }, { time: 5 }), MODES.acid!).texts).toEqual(
      expect.arrayContaining(["CaCO₃ + 2HCl → CaCl₂ + CO₂ + H₂O", "Carbon dioxide turns limewater milky", "limewater"]),
    );
    expect(render(results({ compound: "zinc" }, { time: 5 }), MODES.acid!).texts).toEqual(expect.arrayContaining(["pop!", "Hydrogen burns with a pop"]));
    expect(render(results({ compound: "marble" }), MODES.acid!).texts).toContain("pH 1.00");
  });

  it("puts the pH on the scale only with labels, and colours the indicators", () => {
    const shown = render(results({ substance: "lemon" }), MODES.ph!);
    expect(shown.texts).toEqual(expect.arrayContaining(["Lemon juice", "pH 2.2", "pH 2.2: acidic", "Litmus: red", "Phenolphthalein: colourless", "Methyl orange: red", "Turmeric: yellow"]));
    const hidden = render(results({ substance: "lemon" }), ["phscale", "indicators"]);
    expect(hidden.texts.join(" ")).not.toContain("2.2");
    expect(render(results({ substance: "baking-soda" }), MODES.ph!).texts).toEqual(expect.arrayContaining(["Litmus: blue", "Phenolphthalein: pink", "Turmeric: reddish-brown"]));
    expect(universalColour(7)).toBe("#22c55e");
  });

  it("shows a salt's water of crystallisation only with labels", () => {
    const washing = render(results({ salt: "washing-soda" }), MODES.salts!);
    expect(washing.texts).toEqual(expect.arrayContaining(["Washing soda", "Na₂CO₃·10H₂O", "Water of crystallisation: 10 H₂O", "Its solution is basic"]));
    expect(washing.rec.of("arc").length).toBe(10);
    const plaster = render(results({ salt: "plaster" }), ["salts"]);
    expect(plaster.texts.join(" ")).not.toContain("crystallisation");
    expect(plaster.rec.of("arc")).toHaveLength(0);
  });

  it("keeps every text and shape inside a 325 px phone canvas", () => {
    const cases: [Partial<MetalAcidParams>, Partial<MetalAcidState>, string[]][] = [
      ...METALACID_ELEMENT_ORDER.map((element) => [{ element }, {}, MODES.element!] as [Partial<MetalAcidParams>, Partial<MetalAcidState>, string[]]),
      ...METALACID_METAL_ORDER.flatMap((metal) => [
        [{ metal }, { days: 50 }, MODES.corrosion!] as [Partial<MetalAcidParams>, Partial<MetalAcidState>, string[]],
        ...METALACID_LIQUID_ORDER.map((liquid) => [{ metal, liquid }, { time: 5 }, MODES.series!] as [Partial<MetalAcidParams>, Partial<MetalAcidState>, string[]]),
      ]),
      ...METALACID_REDOX_ORDER.map((redox) => [{ redox }, { time: 3 }, MODES.redox!] as [Partial<MetalAcidParams>, Partial<MetalAcidState>, string[]]),
      ...METALACID_COMPOUND_ORDER.map((compound) => [{ compound }, { time: 2 }, MODES.acid!] as [Partial<MetalAcidParams>, Partial<MetalAcidState>, string[]]),
      ...METALACID_SUBSTANCE_ORDER.map((substance) => [{ substance }, {}, MODES.ph!] as [Partial<MetalAcidParams>, Partial<MetalAcidState>, string[]]),
      ...METALACID_SALT_ORDER.map((salt) => [{ salt }, {}, MODES.salts!] as [Partial<MetalAcidParams>, Partial<MetalAcidState>, string[]]),
    ];
    for (const [params, state, layers] of cases) {
      const { placed, rec, layout } = render(results(params, state), layers, 325);
      expect(layout.height).toBeGreaterThanOrEqual(330);
      expect(layout.height).toBeLessThanOrEqual(420);
      for (const p of placed) {
        const [l, r] = extent(p);
        const where = `${JSON.stringify(params)} "${p.text}"`;
        expect(l, where).toBeGreaterThanOrEqual(0);
        expect(r, where).toBeLessThanOrEqual(325);
        expect(p.y, where).toBeGreaterThanOrEqual(0);
        expect(p.y, where).toBeLessThanOrEqual(layout.height);
      }
      for (const call of rec.of("arc")) {
        const [x, y] = call.args as [number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(325);
        expect(y).toBeLessThanOrEqual(layout.height);
      }
      for (const call of rec.of("roundRect")) {
        const [x, , w] = call.args as [number, number, number];
        expect(x, JSON.stringify(params)).toBeGreaterThanOrEqual(0);
        expect(x + w, JSON.stringify(params)).toBeLessThanOrEqual(325);
      }
    }
  });

  it("keeps captions short", () => {
    for (const metal of METALACID_METAL_ORDER) {
      for (const liquid of METALACID_LIQUID_ORDER) {
        const { placed, layout } = render(results({ metal, liquid }), MODES.series!, 325);
        for (const p of placed.filter((q) => q.y === layout.captionY)) expect([...p.text].length, p.text).toBeLessThanOrEqual(55);
      }
    }
  });
});
