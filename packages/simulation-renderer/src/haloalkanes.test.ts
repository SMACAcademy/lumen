import { HALO_TETRAHEDRON, haloMirrorPositions, haloModel, haloSn2Frame, type HaloParams, type HaloState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { bondLengthX, computeHaloLayout, frameMolecule, haloChooserReason, haloOblique, haloProject, haloRateText, haloRenderer, haloWrapName, ringMolecule } from "./haloalkanes/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: HaloState = haloModel.initialize(haloModel.defaultParams);
const results = (state: Partial<HaloState> = {}, params: Partial<HaloParams> = {}) => haloModel.derive({ ...base, ...state }, { ...haloModel.defaultParams, ...params });

interface Extent {
  text: string;
  left: number;
  right: number;
  y: number;
}

/** Render, recording where every piece of text lands (6 px a character) and every point drawn. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const extents: Extent[] = [];
  const points: { x: number; y: number }[] = [];
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
      if (key === "fillText") {
        return (s: string, x: number, y: number) => {
          const w = String(s).length * 6;
          const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
          extents.push({ text: String(s), left, right: left + w, y });
          return value(s, x, y);
        };
      }
      if (key === "moveTo" || key === "lineTo") {
        return (x: number, y: number) => {
          points.push({ x, y });
          return value(x, y);
        };
      }
      return value;
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeHaloLayout(width);
  haloRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, extents, points, layout, text: () => rec.texts().join(" | ") };
};

const W = (layer: string) => [layer, "labels"];
const VIEWS: [string, Partial<HaloState>, Partial<HaloParams>, string[]][] = [
  ["bond", { halogen: 3 }, {}, W("bond")],
  ["sn2 start", { degree: 2, progress: 0 }, {}, W("sn2")],
  ["sn2 transition state", { degree: 2, progress: 0.5 }, {}, W("sn2")],
  ["sn2 end", { degree: 2, progress: 1 }, {}, W("sn2")],
  ["sn2 blocked", { degree: 3, progress: 1 }, {}, W("sn2")],
  ["sn1 ionising", { degree: 3, progress: 0.2 }, {}, W("sn1")],
  ["sn1 products", { degree: 2, progress: 0.8 }, {}, W("sn1")],
  ["sn1 methyl", { degree: 0, progress: 1 }, {}, W("sn1")],
  ["chooser", { degree: 2 }, { nucleophile: 1, solvent: 1 }, W("chooser")],
  ["elimination", {}, { substrate: 5, reagent: 1 }, W("elimination")],
  ["elimination aqueous", {}, { substrate: 4, reagent: 0 }, W("elimination")],
  ["elimination ethyl", {}, { substrate: 0, reagent: 1 }, W("elimination")],
  ["mirror", { turn: 120, plus: 75 }, { molecule: 0 }, W("mirror")],
  ["mirror achiral", { turn: 180 }, { molecule: 3 }, W("mirror")],
  ["arene", {}, { arene: 3 }, W("arene")],
  ["eas", {}, { electrophile: 4 }, W("eas")],
];

describe("views", () => {
  it.each(VIEWS)("%s fits a 325 px phone canvas", (_name, state, params, layers) => {
    const r = render(results(state, params), layers, 325);
    expect(r.extents.length).toBeGreaterThan(3);
    for (const e of r.extents) {
      expect(e.text.length, e.text).toBeLessThanOrEqual(55);
      expect(e.left, e.text).toBeGreaterThanOrEqual(0);
      expect(e.right, e.text).toBeLessThanOrEqual(325);
      expect(e.y, e.text).toBeGreaterThanOrEqual(0);
      expect(e.y, e.text).toBeLessThanOrEqual(r.layout.height);
    }
    for (const p of r.points) {
      expect(p.x).toBeGreaterThanOrEqual(-1);
      expect(p.x).toBeLessThanOrEqual(326);
      expect(p.y).toBeGreaterThanOrEqual(-1);
      expect(p.y).toBeLessThanOrEqual(r.layout.height + 1);
    }
  });

  it.each(VIEWS)("%s draws at desktop width too", (_name, state, params, layers) => {
    expect(render(results(state, params), layers, 800).texts().length).toBeGreaterThan(3);
  });
});

describe("the C–X bond", () => {
  it("shows lengths and the reactivity order only with words", () => {
    const words = render(results({ halogen: 2 }), W("bond")).text();
    expect(words).toContain("193 pm");
    expect(words).toContain("Reactivity: R–I > R–Br > R–Cl > R–F");
    const bare = render(results({ halogen: 2 }), ["bond"]).text();
    expect(bare).not.toContain("193");
    expect(bare).not.toContain("kJ/mol");
  });

  it("puts the bond lengths on the ruler in proportion", () => {
    const l = computeHaloLayout(325);
    expect(bondLengthX(l, 250)).toBeLessThanOrEqual(l.right);
    expect(bondLengthX(l, 0)).toBeGreaterThanOrEqual(l.left);
    const k = (bondLengthX(l, 200) - bondLengthX(l, 0)) / 200;
    expect(bondLengthX(l, 100) - bondLengthX(l, 0)).toBeCloseTo(100 * k);
  });
});

describe("SN2 and SN1", () => {
  it("builds the frame as a molecule: full bonds only, wedges for groups towards the viewer", () => {
    const start = frameMolecule(haloSn2Frame(0, 2), ["H", "C₂H₅", "CH₃"]);
    expect(start.mol.bonds.find((b) => b.b === start.index.leaving)).toBeDefined();
    expect(start.mol.bonds.find((b) => b.b === start.index.nu)).toBeUndefined();
    expect(start.mol.bonds.filter((b) => b.stereo === "wedge")).toHaveLength(1);
    expect(start.mol.bonds.filter((b) => b.stereo === "dash")).toHaveLength(1);
    const end = frameMolecule(haloSn2Frame(1, 2), ["H", "C₂H₅", "CH₃"]);
    expect(end.mol.bonds.find((b) => b.b === end.index.nu)).toBeDefined();
    expect(end.mol.atoms[end.index.leaving]!.charge).toBe(-1);
    // The umbrella: groups on the left of C before, on the right after.
    const meanX = (f: typeof start) => f.index.groups.reduce((s, g) => s + f.mol.atoms[g]!.x, 0) / 3;
    expect(meanX(start)).toBeLessThan(0);
    expect(meanX(end)).toBeGreaterThan(0);
    // No group is drawn on top of the carbon.
    for (const f of [start, end]) for (const g of f.index.groups) expect(Math.hypot(f.mol.atoms[g]!.x, f.mol.atoms[g]!.y)).toBeGreaterThan(0.5);
  });

  it("projects along x with a turn, and draws a tetrahedron with no group on the carbon", () => {
    const p = haloProject({ x: 1, y: 0, z: 0 });
    expect(p.x).toBeCloseTo(Math.cos((40 * Math.PI) / 180));
    expect(p.y).toBe(0);
    for (const turn of [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330]) {
      for (const g of haloMirrorPositions(turn)) {
        const q = haloOblique(g);
        expect(Math.hypot(q.x, q.y), String(turn)).toBeGreaterThan(0.4);
      }
    }
    for (const g of HALO_TETRAHEDRON) expect(Math.hypot(haloOblique(g).x, haloOblique(g).y)).toBeGreaterThan(0.5);
  });

  it("names the stage, the rate law and, with words, the inversion", () => {
    const t = render(results({ degree: 2, progress: 1 }), W("sn2")).text();
    expect(t).toContain("Inverted, like an umbrella in the wind");
    expect(t).toContain("rate = k[RX][OH⁻]: one step, both collide");
    expect(t).toContain("(S)-2-bromobutane → (R)-butan-2-ol: inversion");
    expect(render(results({ degree: 3, progress: 1 }), W("sn2")).text()).toContain("Blocked: three CH₃ groups shield the back of C");
  });

  it("shows SN1's two products, half each, and its rate law", () => {
    const t = render(results({ degree: 2, progress: 1 }), W("sn1")).text();
    expect(t).toContain("inversion · 50%");
    expect(t).toContain("retention · 50%");
    expect(t).toContain("rate = k[RX]: only the slow step counts");
    expect(render(results({ degree: 2, progress: 1 }), ["sn1"]).text()).not.toContain("50%");
  });

  it("formats rough rates", () => {
    expect(haloRateText(1_200_000)).toBe("1 200 000");
    expect(haloRateText(0.02)).toBe("0.02");
    expect(haloRateText(0)).toBe("≈ 0");
  });
});

describe("chooser, elimination, chirality and arenes", () => {
  it("gives the mechanism only with words", () => {
    expect(render(results({ degree: 2 }, { nucleophile: 0, solvent: 1 }), W("chooser")).text()).toContain("Mechanism: SN1");
    expect(render(results({ degree: 2 }, { nucleophile: 0, solvent: 1 }), ["chooser"]).text()).toContain("Mechanism: ?");
    expect(haloChooserReason(2, 2)).toContain("mixture");
  });

  it("names the alkenes, major first, with words", () => {
    const t = render(results({}, { substrate: 4, reagent: 1 }), W("elimination")).texts();
    expect(t).toEqual(expect.arrayContaining(["pent-2-ene", "pent-1-ene", "major 81%", "minor 19%", "α", "β"]));
    expect(render(results({}, { substrate: 4, reagent: 0 }), W("elimination")).texts()).toContain("pentan-2-ol");
    expect(render(results({}, { substrate: 5, reagent: 1 }), ["elimination"]).text()).not.toContain("major");
  });

  it("keeps the mixture's rotation hidden without words", () => {
    const bare = render(results({ plus: 75 }, { molecule: 0 }), ["mirror"]).text();
    expect(bare).toContain("pure (+)-butan-2-ol: [α] = +13.5°");
    expect(bare).not.toContain("6.75");
    expect(render(results({ plus: 75 }, { molecule: 0 }), W("mirror")).text()).toContain("this mixture: +6.75°");
    expect(render(results({ plus: 50 }, { molecule: 1 }), W("mirror")).text()).toContain("racemic");
    expect(render(results({ turn: 180 }, { molecule: 2 }), W("mirror")).text()).toContain("B fits on A: the same molecule");
  });

  it("gives the conditions for Cl → OH only with words", () => {
    expect(render(results({}, { arene: 1 }), W("arene")).text()).toContain("NaOH, 443 K; then H⁺");
    expect(render(results({}, { arene: 1 }), ["arene"]).text()).not.toContain("443");
    const t = render(results({}, { electrophile: 1 }), W("eas")).texts();
    expect(t).toEqual(expect.arrayContaining(["1-chloro-2-nitrobenzene", "1-chloro-4-nitrobenzene", "major", "minor"]));
  });

  it("wraps long names evenly", () => {
    expect(haloWrapName("2-chlorobenzenesulphonic acid")).toEqual(["2-chlorobenzene-", "sulphonic acid"]);
    expect(haloWrapName("1-chloro-2-nitrobenzene")).toEqual(["1-chloro-", "2-nitrobenzene"]);
  });

  it("builds a benzene ring with alternating bonds and its groups outside", () => {
    const m = ringMolecule([{ at: 1, el: "Cl" }, { at: 4, el: "N", label: "NO₂" }]);
    expect(m.atoms).toHaveLength(8);
    expect(m.bonds.filter((b) => b.order === 2)).toHaveLength(3);
    expect(m.atoms[6]!.y).toBeLessThan(m.atoms[0]!.y);
    expect(m.atoms[7]!.y).toBeGreaterThan(m.atoms[3]!.y);
  });
});
