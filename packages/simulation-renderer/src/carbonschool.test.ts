import {
  CARBON_MOLECULE_ORDER,
  CARBON_REACTION_ORDER,
  carbonMolecule,
  carbonSchoolModel,
  type CarbonSchoolParams,
  type CarbonSchoolState,
} from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import {
  bowlGeometry,
  carbonChainSketch,
  carbonDotPlacement,
  carbonSchoolRenderer,
  computeCarbonSchoolLayout,
  diamondPoints,
} from "./carbonschool/renderer";
import { chainMolecule, implicitHydrogens } from "./shared/molecule";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: CarbonSchoolState = carbonSchoolModel.initialize(carbonSchoolModel.defaultParams);
const results = (state: Partial<CarbonSchoolState> = {}, params: Partial<CarbonSchoolParams> = {}) =>
  carbonSchoolModel.derive({ ...base, ...state }, { ...carbonSchoolModel.defaultParams, ...params });

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
  const layout = computeCarbonSchoolLayout(width);
  carbonSchoolRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, extents, layout, text: () => rec.texts().join(" | ") };
};

const W = (layer: string) => [layer, "labels"];

const VIEWS: [string, Partial<CarbonSchoolState>, Partial<CarbonSchoolParams>, string[]][] = [
  ...CARBON_MOLECULE_ORDER.map((molecule) => [`dots ${molecule}`, {}, { molecule }, W("dots")] as [string, Partial<CarbonSchoolState>, Partial<CarbonSchoolParams>, string[]]),
  ["diamond", {}, { allotrope: "diamond" }, W("allotropes")],
  ["graphite", {}, { allotrope: "graphite" }, W("allotropes")],
  ["fullerene", {}, { allotrope: "fullerene" }, W("allotropes")],
  ["methane", { carbons: 1 }, {}, W("chain")],
  ["decanoic acid", { carbons: 10, group: 6 }, {}, W("chain")],
  ["decanol", { carbons: 10, group: 3 }, {}, W("chain")],
  ["pentan-2-one", { carbons: 5, group: 5 }, {}, W("chain")],
  ["chloro", { carbons: 3, group: 1 }, {}, W("chain")],
  ["chain problem", { carbons: 1, bond: 1 }, {}, W("chain")],
  ["burning octane", { carbons: 8, air: 80 }, { reaction: "combustion" }, W("reaction")],
  ["burning decane", { carbons: 10 }, { reaction: "combustion" }, W("reaction")],
  ["burning chloro", { carbons: 3, group: 1 }, { reaction: "combustion" }, W("reaction")],
  ...CARBON_REACTION_ORDER.filter((r) => r !== "combustion").map(
    (reaction) => [reaction, {}, { reaction }, W("reaction")] as [string, Partial<CarbonSchoolState>, Partial<CarbonSchoolParams>, string[]],
  ),
  ["soap, hard", { soap: 10, hardness: 3 }, {}, W("soap")],
  ["soap, a little", { soap: 1, hardness: 6 }, {}, W("soap")],
  ["detergent", { soap: 20, hardness: 6 }, { cleaner: "detergent" }, W("soap")],
];

describe("electron-dot view", () => {
  it("draws one mark for every outer electron, and only inside the canvas", () => {
    for (const width of [325, 800]) {
      const l = computeCarbonSchoolLayout(width);
      for (const id of CARBON_MOLECULE_ORDER) {
        const m = carbonMolecule(id);
        const placed = carbonDotPlacement(m, { x: l.left, y: 34, width: l.right - l.left, height: l.height - 118 });
        expect(placed.electrons, id).toHaveLength(m.atoms.reduce((s, a) => s + a.valence, 0));
        for (const e of placed.electrons) {
          expect(e.x, id).toBeGreaterThan(4);
          expect(e.x, id).toBeLessThan(width - 4);
          expect(e.y, id).toBeGreaterThan(24);
          expect(e.y, id).toBeLessThan(l.height - 70);
        }
      }
    }
  });

  it("draws methane as one carbon's four dots and four hydrogens' crosses", () => {
    const r = render(results({}, { molecule: "ch4" }), ["dots"]);
    // Four dots (arcs) plus five faint shell rings; four crosses of two strokes each.
    expect(r.of("arc")).toHaveLength(4 + 5);
    expect(r.texts().filter((t) => t === "H")).toHaveLength(4);
    expect(r.text()).not.toContain("shared pairs");
    const words = render(results({}, { molecule: "ch4" }), W("dots")).text();
    expect(words).toContain("4 shared pairs · 0 lone pairs");
    expect(words).toContain("4 single bonds · 8 round each (H: 2)");
  });

  it("puts nitrogen's lone pairs on the outside of the triple bond", () => {
    const m = carbonMolecule("n2");
    const placed = carbonDotPlacement(m, { x: 0, y: 0, width: 300, height: 200 });
    const lone = placed.electrons.slice(6);
    expect(lone).toHaveLength(4);
    expect(lone[0]!.x).toBeLessThan(placed.atoms[0]!.x);
    expect(lone[2]!.x).toBeGreaterThan(placed.atoms[1]!.x);
  });
});

describe("allotropes view", () => {
  it("draws diamond as a carbon with four neighbours, each with three more", () => {
    const d = diamondPoints();
    expect(d.atoms).toHaveLength(17);
    expect(d.bonds.filter(([a]) => a === 0)).toHaveLength(4);
    const t = render(results({}, { allotrope: "diamond" }), W("allotropes")).text();
    expect(t).toContain("each carbon bonded to 4 others");
    expect(t).toContain("hardest natural substance · conducts: no");
  });

  it("says graphite conducts, and hides it without words", () => {
    expect(render(results({}, { allotrope: "graphite" }), W("allotropes")).text()).toContain("conducts: yes");
    expect(render(results({}, { allotrope: "graphite" }), ["allotropes"]).text()).not.toContain("conducts");
  });
});

describe("chain view", () => {
  it("names the compound and gives formula and mass with words; hides them without", () => {
    const r = render(results({ carbons: 4, group: 3 }), W("chain"));
    expect(r.texts()).toEqual(expect.arrayContaining(["butanol", "C₄H₁₀O · alcohol · 74 u", "CH₃CH₂CH₂CH₂OH", "class 11 name: butan-1-ol"]));
    const hidden = render(results({ carbons: 4, group: 3 }), ["chain"]).text();
    expect(hidden).toContain("name: ?");
    expect(hidden).not.toContain("74 u");
    expect(hidden).not.toContain("butanol");
  });

  it("explains a chain it cannot make", () => {
    expect(render(results({ carbons: 2, group: 5 }), W("chain")).text()).toContain("a ketone needs at least three carbons");
  });

  it("sketches every chain with sensible hydrogens", () => {
    for (let n = 1; n <= 10; n++) {
      for (const group of [0, 1, 2, 3, 4, 5, 6]) {
        if (group === 5 && n < 3) continue;
        const mol = chainMolecule(carbonChainSketch({ carbons: n, bond: 0, group }));
        mol.atoms.forEach((_, i) => expect(implicitHydrogens(mol, i), `${n} ${group} ${i}`).toBeGreaterThanOrEqual(0));
        const H = mol.atoms.reduce((s, _, i) => s + implicitHydrogens(mol, i), 0);
        expect(H, `${n} ${group}`).toBe(results({ carbons: n, group }).hydrogens);
      }
      if (n >= 2) {
        for (const bond of [1, 2]) {
          const mol = chainMolecule(carbonChainSketch({ carbons: n, bond, group: 0 }));
          expect(mol.atoms.reduce((s, _, i) => s + implicitHydrogens(mol, i), 0)).toBe(results({ carbons: n, bond }).hydrogens);
        }
      }
    }
  });
});

describe("reaction view", () => {
  it("burns methane cleanly, and octane sootily in too little air", () => {
    const clean = render(results({ carbons: 1, air: 120 }, { reaction: "combustion" }), W("reaction"));
    expect(clean.text()).toContain("CH₄ + 2O₂ → CO₂ + 2H₂O");
    expect(clean.text()).toContain("clean blue flame");
    const sooty = render(results({ carbons: 8, air: 80 }, { reaction: "combustion" }), W("reaction")).text();
    expect(sooty).toContain("2C₈H₁₈ + 25O₂ → 16CO₂ + 18H₂O");
    expect(sooty).toContain("too little air");
    expect(render(results({ carbons: 2, bond: 1, air: 120 }, { reaction: "combustion" }), W("reaction")).text()).toContain("sooty yellow flame: unsaturated");
    expect(render(results({ carbons: 8 }, { reaction: "combustion" }), ["reaction"]).text()).toContain("fuel + O₂ → CO₂ + H₂O");
  });

  it("gives each reaction's equation, condition and gas", () => {
    const t = render(results({}, { reaction: "esterification" }), W("reaction")).text();
    expect(t).toContain("CH₃COOH + CH₃CH₂OH → CH₃COOCH₂CH₃ + H₂O");
    expect(t).toContain("with: a few drops of conc. H₂SO₄, warm");
    expect(t).toContain("carbon product: ester");
    expect(render(results({}, { reaction: "sodium" }), W("reaction")).text()).toContain("gas given off: hydrogen");
    expect(render(results({}, { reaction: "sodium" }), ["reaction"]).text()).not.toContain("gas given off");
  });
});

describe("soap view", () => {
  it("shows scum and free soap with words", () => {
    const t = render(results({ soap: 10, hardness: 3 }), W("soap")).text();
    expect(t).toContain("scum: 3.0 mmol · used up: 6.0 mmol");
    expect(t).toContain("free: 4.0 mmol · micelles: yes");
    expect(t).toContain("oil lifted: 50%");
    expect(render(results({ soap: 10, hardness: 3 }), ["soap"]).text()).not.toContain("used up");
  });

  it("floats scum only for soap, and keeps micelles in the bowl", () => {
    const soap = render(results({ soap: 10, hardness: 3 }), ["soap"]);
    const detergent = render(results({ soap: 10, hardness: 3 }, { cleaner: "detergent" }), ["soap"]);
    expect(soap.of("fillRect").length).toBeGreaterThan(detergent.of("fillRect").length);
    expect(detergent.text()).toContain("–SO₃⁻Na⁺");
    const l = computeCarbonSchoolLayout(325);
    const b = bowlGeometry(l);
    const full = render(results({ soap: 20 }), ["soap"], 325);
    for (const c of full.of("arc")) {
      const [x, y] = c.args as number[];
      if (y! > b.surface && y! < b.floor) {
        expect(x!).toBeGreaterThan(b.left);
        expect(x!).toBeLessThan(b.right);
      }
    }
  });
});

describe("on a phone", () => {
  it.each(VIEWS)("keeps the %s view inside a 325 px canvas", (_name, state, params, layers) => {
    const r = render(results(state, params), layers, 325);
    expect(r.extents.length).toBeGreaterThan(0);
    for (const e of r.extents) {
      expect(e.left, e.text).toBeGreaterThanOrEqual(0);
      expect(e.right, e.text).toBeLessThanOrEqual(325);
      expect(e.y, e.text).toBeGreaterThanOrEqual(0);
      expect(e.y, e.text).toBeLessThanOrEqual(r.layout.height);
      expect(e.text.length, e.text).toBeLessThanOrEqual(55);
    }
    for (const c of r.of("arc")) {
      const [x, y, rad] = c.args as number[];
      expect(x! - rad!, _name).toBeGreaterThanOrEqual(0);
      expect(x! + rad!, _name).toBeLessThanOrEqual(325);
      expect(y! - rad!, _name).toBeGreaterThanOrEqual(0);
      expect(y! + rad!, _name).toBeLessThanOrEqual(r.layout.height);
    }
  });

  it("has a phone-sized height", () => {
    expect(computeCarbonSchoolLayout(325).height).toBeGreaterThanOrEqual(330);
    expect(computeCarbonSchoolLayout(325).height).toBeLessThanOrEqual(420);
  });
});
