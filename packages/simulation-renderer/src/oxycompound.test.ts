import {
  OXY_ACIDS,
  OXY_ALCOHOLS,
  OXY_ALKOXIDES,
  OXY_BOILING,
  OXY_ETHERS,
  OXY_HALIDES,
  OXY_PHENOL_REACTIONS,
  OXY_REAGENTS,
  OXY_SUBSTRATES,
  oxycompoundModel,
  type OxyParams,
  type OxyState,
} from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import {
  additionPicture,
  boilingBarEnd,
  computeOxyLayout,
  lucasTubeX,
  oxycompoundRenderer,
  oxyPKaX,
  oxyRingMolecule,
  oxySketchMolecule,
  oxyTubeColour,
  williamsonPicture,
} from "./oxycompound/renderer";
import { implicitHydrogens } from "./shared/molecule";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const model = oxycompoundModel;
const base: OxyState = model.initialize(model.defaultParams);
const results = (state: Partial<OxyState> = {}, params: Partial<OxyParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

interface Extent {
  text: string;
  left: number;
  right: number;
  y: number;
}

/** Render, and record where every piece of text lands (the recorder measures 6 px a character). */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const extents: Extent[] = [];
  let align = "left";
  const target = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(target, {
    set(t, key: string, value) {
      if (key === "textAlign") align = String(value);
      t[key] = value;
      return true;
    },
    get(t, key: string) {
      const value = t[key] as (...args: unknown[]) => unknown;
      if (key !== "fillText") return value;
      return (s: string, x: number, y: number) => {
        const w = String(s).length * 6;
        const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
        extents.push({ text: String(s), left, right: left + w, y });
        return value(s, x, y);
      };
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeOxyLayout(width);
  oxycompoundRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, extents, layout, text: () => rec.texts().join(" | ") };
};

const W = (layer: string) => [layer, "labels"];

describe("alcohol view", () => {
  it("gives the degree, Lucas result, oxidation and dehydration with words", () => {
    const t = render(results({ alcohol: 5 }), W("alcohol")).text();
    expect(t).toContain("butan-2-ol · CH₃CH(OH)CH₂CH₃");
    expect(t).toContain("2° alcohol · Lucas: turbid in ~5 min");
    expect(t).toContain("[O]: → butanone");
    expect(t).toContain("−H₂O, 85% H₃PO₄, 440 K → but-2-ene");
    expect(t).toContain("Has CH₃CH(OH)–: gives iodoform");
    expect(render(results({ alcohol: 2 }), W("alcohol")).text()).toContain("[O]: propanal → propanoic acid");
    expect(render(results({ alcohol: 7 }), W("alcohol")).text()).toContain("[O]: no reaction — no H on the C–OH carbon");
    expect(render(results({ alcohol: 0 }), W("alcohol")).text()).toContain("No alkene: no carbon next to C–OH");
  });

  it("hides every answer without words, but still shows the clock", () => {
    const t = render(results({ alcohol: 5, minutes: 3 }), ["alcohol"]).text();
    expect(t).toContain("3.0 min");
    expect(t).not.toMatch(/2°|butanone|440 K|turbid|clear/);
  });

  it("clouds the tube once the clock passes the onset", () => {
    const fills = (minutes: number) => render(results({ alcohol: 5, minutes }), ["alcohol"]).of("arc").length;
    expect(fills(6)).toBeGreaterThan(fills(4));
    expect(render(results({ alcohol: 5, minutes: 6 }), W("alcohol")).text()).toContain("6.0 min · turbid");
    expect(render(results({ alcohol: 1, minutes: 10 }), W("alcohol")).text()).toContain("10.0 min · clear");
  });
});

describe("boiling view", () => {
  it("draws every boiling point with words, none without", () => {
    const t = render(results({}, { bpCompound: 2 }), W("boiling")).texts();
    expect(t).toEqual(expect.arrayContaining(["ethanol · CH₃CH₂OH", "351 K", "231 K", "390 K", "O–H: its molecules hydrogen-bond"]));
    expect(render(results({}, { bpCompound: 2 }), ["boiling"]).text()).not.toMatch(/\d K/);
    const l = computeOxyLayout(325);
    expect(boilingBarEnd(l, 455)).toBeGreaterThan(boilingBarEnd(l, 231));
    expect(boilingBarEnd(l, 455) + 4 + 30).toBeLessThanOrEqual(325);
  });
});

describe("acidity view", () => {
  it("places the acid on the pKa scale and explains its anion", () => {
    const t = render(results({}, { acid: 7 }), W("acids")).text();
    expect(t).toContain("4-nitrophenol");
    expect(t).toContain("pKa = 7.10");
    expect(t).toContain("Anion: charge spread round the ring (o, p)");
    expect(render(results({}, { acid: 4 }), W("acids")).texts().filter((s) => s === "δ−")).toHaveLength(3);
    expect(render(results({}, { acid: 14 }), W("acids")).text()).toContain("shared by two equal O");
    const l = computeOxyLayout(325);
    expect(oxyPKaX(l, 0.23)).toBeLessThan(oxyPKaX(l, 18));
    expect(oxyPKaX(l, 40)).toBe(oxyPKaX(l, 18));
  });

  it("hides pKa without words", () => {
    const t = render(results({}, { acid: 7 }), ["acids"]).text();
    expect(t).not.toMatch(/pKa =|δ−|Anion/);
  });
});

describe("phenol view", () => {
  it("shows the product with words and a question mark without", () => {
    expect(render(results({}, { phenolReaction: 0 }), W("phenol")).text()).toContain("2,4,6-tribromophenol");
    const two = render(results({}, { phenolReaction: 1 }), W("phenol")).texts();
    expect(two).toEqual(expect.arrayContaining(["4-bromophenol (major)", "2-bromophenol (minor)"]));
    const hidden = render(results({}, { phenolReaction: 4 }), ["phenol"]).text();
    expect(hidden).toContain("?");
    expect(hidden).not.toContain("hydroxybenzoic");
  });

  it("builds rings with sensible hydrogens", () => {
    const m = oxyRingMolecule([{ pos: 1, group: "OH" }, { pos: 2, group: "Br" }, { pos: 4, group: "NO2" }]);
    expect([0, 1, 2, 3, 4, 5].map((i) => implicitHydrogens(m, i))).toEqual([0, 0, 1, 0, 1, 1]);
    expect(implicitHydrogens(m, 6)).toBe(1); // –OH
    expect(implicitHydrogens(oxyRingMolecule([{ pos: 1, group: "O-" }]), 6)).toBe(0);
    expect(oxyRingMolecule([{ pos: 6, group: "NO2" }]).atoms[6]!.label).toBe("O₂N");
  });
});

describe("ether views", () => {
  it("draws SN2 arrows for an ether and E2 arrows for an alkene", () => {
    const sn2 = render(results({ halide: 0, alkoxide: 2 }), W("williamson"));
    expect(sn2.text()).toContain("→ (CH₃)₃C–O–CH₃");
    expect(sn2.text()).toContain("2-methoxy-2-methylpropane");
    expect(sn2.of("quadraticCurveTo")).toHaveLength(2);
    const e2 = render(results({ halide: 3, alkoxide: 0 }), W("williamson"));
    expect(e2.text()).toContain("alkene only (elimination)");
    expect(e2.of("quadraticCurveTo")).toHaveLength(3);
    expect(render(results({ halide: 4, alkoxide: 0 }), W("williamson")).of("quadraticCurveTo")).toHaveLength(0);
    expect(render(results({ halide: 3, alkoxide: 0 }), ["williamson"]).of("quadraticCurveTo")).toHaveLength(0);
  });

  it("gives every carbon in the Williamson picture its right hydrogens", () => {
    const tert = williamsonPicture(3, 0, true);
    expect(implicitHydrogens(tert.molecule, tert.alpha)).toBe(0);
    expect(implicitHydrogens(tert.molecule, tert.beta!)).toBe(2);
    const methyl = williamsonPicture(0, 3, false);
    expect(implicitHydrogens(methyl.molecule, methyl.alpha)).toBe(3);
  });

  it("splits ethers with HI", () => {
    expect(render(results({}, { ether: 2 }), W("cleavage")).text()).toContain("→ (CH₃)₃CI + CH₃OH");
    expect(render(results({}, { ether: 3 }), W("cleavage")).text()).toContain("The O–aryl bond is not broken: phenol forms");
    expect(render(results({}, { ether: 0 }), ["cleavage"]).text()).not.toContain("CH₃I");
  });
});

describe("carbonyl views", () => {
  it("draws the attack with two curly arrows and δ charges", () => {
    const r = render(results({}, { substrate: 4, reagent: 9 }), W("addition"));
    expect(r.of("quadraticCurveTo")).toHaveLength(2);
    expect(r.texts()).toEqual(expect.arrayContaining(["δ+", "δ−", "→ (H₃O⁺) (CH₃)₃COH"]));
    expect(render(results({}, { substrate: 7 }), W("addition")).text()).toContain("An alcohol: no aldehyde or ketone C=O");
    const pic = additionPicture(["CH₃", "H"], "CN");
    expect(implicitHydrogens(pic.molecule, pic.carbon)).toBe(0);
  });

  it("shows products and test colours only with words", () => {
    const t = render(results({}, { substrate: 1, reagent: 2 }), W("reaction")).text();
    expect(t).toContain("→ CHI₃ + HCOO⁻Na⁺");
    expect(t).toContain("aldehyde · α-H: 3");
    expect(render(results({}, { substrate: 4, reagent: 0 }), W("reaction")).text()).toContain("Negative: no change");
    expect(render(results({}, { substrate: 1, reagent: 2 }), ["reaction"]).text()).not.toMatch(/CHI₃|α-H/);
    expect(oxyTubeColour(fallbackTheme, 3)).toBe(fallbackTheme.angle);
    expect(oxyTubeColour(fallbackTheme, 0)).toBeNull();
  });

  it("turns Ph into a C₆H₅ label", () => {
    const m = oxySketchMolecule({ atoms: ["Ph", "C", "O"], orders: [1, 2] });
    expect(m.atoms[0]!.label).toBe("C₆H₅");
    expect(implicitHydrogens(m, 1)).toBe(1);
  });
});

describe("on a phone", () => {
  const cases: [string, Partial<OxyState>, Partial<OxyParams>, string[]][] = [];
  for (const words of [true, false]) {
    const L = (layer: string) => (words ? [layer, "labels"] : [layer]);
    OXY_ALCOHOLS.forEach((_, i) => cases.push([`alcohol ${i}`, { alcohol: i, minutes: 10 }, {}, L("alcohol")]));
    OXY_BOILING.forEach((_, i) => cases.push([`boiling ${i}`, {}, { bpCompound: i }, L("boiling")]));
    OXY_ACIDS.forEach((_, i) => cases.push([`acid ${i}`, {}, { acid: i }, L("acids")]));
    OXY_PHENOL_REACTIONS.forEach((_, i) => cases.push([`phenol ${i}`, {}, { phenolReaction: i }, L("phenol")]));
    OXY_HALIDES.forEach((_, h) => OXY_ALKOXIDES.forEach((_, o) => cases.push([`williamson ${h},${o}`, { halide: h, alkoxide: o }, {}, L("williamson")])));
    OXY_ETHERS.forEach((_, i) => cases.push([`cleavage ${i}`, {}, { ether: i }, L("cleavage")]));
    OXY_SUBSTRATES.forEach((_, s) => OXY_REAGENTS.forEach((_, r) => cases.push([`reaction ${s},${r}`, {}, { substrate: s, reagent: r }, L("reaction")])));
    OXY_SUBSTRATES.forEach((_, s) => [8, 9, 0].forEach((r) => cases.push([`addition ${s},${r}`, {}, { substrate: s, reagent: r }, L("addition")])));
  }

  it.each(cases)("keeps %s inside a 325 px canvas", (_name, state, params, layers) => {
    const r = render(results(state, params), layers, 325);
    expect(r.extents.length).toBeGreaterThan(0);
    for (const e of r.extents) {
      expect(e.left, e.text).toBeGreaterThanOrEqual(0);
      expect(e.right, e.text).toBeLessThanOrEqual(325);
      expect(e.y, e.text).toBeGreaterThanOrEqual(0);
      expect(e.y, e.text).toBeLessThanOrEqual(r.layout.height);
      expect(e.text.length, e.text).toBeLessThanOrEqual(55);
    }
    for (const c of [...r.of("moveTo"), ...r.of("lineTo"), ...r.of("arc")]) {
      const [px, py] = c.args as number[];
      expect(px!, `${c.method} x`).toBeGreaterThanOrEqual(-1);
      expect(px!, `${c.method} x`).toBeLessThanOrEqual(326);
      expect(py!, `${c.method} y`).toBeGreaterThanOrEqual(-1);
      expect(py!, `${c.method} y`).toBeLessThanOrEqual(r.layout.height + 1);
    }
  });

  it("keeps the Lucas tube on the canvas and the layout tall enough", () => {
    const l = computeOxyLayout(325);
    expect(lucasTubeX(l) + 13).toBeLessThanOrEqual(325);
    expect(l.height).toBeGreaterThanOrEqual(330);
    expect(l.height).toBeLessThanOrEqual(420);
  });
});
