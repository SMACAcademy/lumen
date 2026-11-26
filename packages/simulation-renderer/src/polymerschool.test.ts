import {
  POLYMER_FIBRE_ORDER,
  POLYMER_ORDER,
  POLYMER_PLASTIC_ORDER,
  POLYMER_WASTE_ORDER,
  POLYMERS,
  polymerSchoolModel,
  type PolymerSchoolParams,
  type PolymerSchoolState,
} from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import {
  computePolymerSchoolLayout,
  pitGeometry,
  plasticGeometry,
  polymerBeads,
  polymerSchoolRenderer,
  polymerUnitMolecule,
  threadGeometry,
} from "./polymerschool/renderer";
import { implicitHydrogens } from "./shared/molecule";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: PolymerSchoolState = polymerSchoolModel.initialize(polymerSchoolModel.defaultParams);
const results = (state: Partial<PolymerSchoolState> = {}, params: Partial<PolymerSchoolParams> = {}) =>
  polymerSchoolModel.derive({ ...base, ...state }, { ...polymerSchoolModel.defaultParams, ...params });

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
  const layout = computePolymerSchoolLayout(width);
  polymerSchoolRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, extents, layout, text: () => rec.texts().join(" | ") };
};

const W = (layer: string) => [layer, "labels"];

type View = [string, Partial<PolymerSchoolState>, Partial<PolymerSchoolParams>, string[]];
const VIEWS: View[] = [
  ...POLYMER_ORDER.flatMap((polymer) => [1, 7, 1000].map((units): View => [`chain ${polymer} ${units}`, { units }, { polymer }, W("chain")])),
  ...POLYMER_FIBRE_ORDER.flatMap((fibre) => [0, 800].map((load): View => [`thread ${fibre} ${load}`, { load }, { fibre }, W("fibres")])),
  ...POLYMER_PLASTIC_ORDER.flatMap((plastic) => [20, 250].map((heat): View => [`plastic ${plastic} ${heat}`, { heat }, { plastic }, W("plastics")])),
  ...POLYMER_WASTE_ORDER.flatMap((waste) => [0, 30, 730].map((days): View => [`waste ${waste} ${days}`, { days }, { waste }, W("waste")])),
];

describe("fits a phone", () => {
  it.each(VIEWS)("%s: every word and shape stays on a 325 px canvas", (_name, state, params, layers) => {
    for (const width of [325, 800]) {
      const r = render(results(state, params), layers, width);
      for (const e of r.extents) {
        expect(e.left, e.text).toBeGreaterThanOrEqual(0);
        expect(e.right, e.text).toBeLessThanOrEqual(width);
        expect(e.y, e.text).toBeGreaterThan(0);
        expect(e.y, e.text).toBeLessThan(r.layout.height);
        expect(e.text.length, e.text).toBeLessThanOrEqual(55);
      }
      for (const c of [...r.of("lineTo"), ...r.of("moveTo"), ...r.of("arc")]) {
        const [x, y] = c.args as number[];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(r.layout.height);
      }
    }
  });

  it("keeps lines of words apart", () => {
    for (const [name, state, params, layers] of VIEWS) {
      const r = render(results(state, params), layers, 325);
      for (let i = 0; i < r.extents.length; i++) {
        for (let j = i + 1; j < r.extents.length; j++) {
          const a = r.extents[i]!;
          const b = r.extents[j]!;
          const overlap = Math.abs(a.y - b.y) < 12 && a.left < b.right && b.left < a.right;
          expect(overlap, `${name}: "${a.text}" and "${b.text}"`).toBe(false);
        }
      }
    }
  });
});

describe("chain view", () => {
  it("draws polythene, PVC and acrylic units with the right hydrogens", () => {
    for (const id of ["polythene", "pvc", "acrylic"] as const) {
      const mol = polymerUnitMolecule(id)!;
      const H = mol.atoms.reduce((s, _, i) => s + implicitHydrogens(mol, i), 0);
      expect(H, id).toBe(POLYMERS[id].atoms.H);
    }
    expect(polymerUnitMolecule("nylon")).toBeNull();
  });

  it("writes the bigger units as a formula", () => {
    expect(render(results({}, { polymer: "nylon" }), ["chain"]).text()).toContain("[–NH(CH₂)₆NH–CO(CH₂)₄CO–]ₙ");
    const t = render(results({}, { polymer: "polythene" }), ["chain"]).texts();
    expect(t).toEqual(expect.arrayContaining(["[", "]ₙ", "C", "H₂"]));
  });

  it("draws one bead a unit, up to forty", () => {
    const l = computePolymerSchoolLayout(325);
    expect(polymerBeads(l, 7)).toHaveLength(7);
    expect(polymerBeads(l, 1000)).toHaveLength(40);
    expect(render(results({ units: 1000 }), ["chain"]).text()).toContain("1000 units (only 40 drawn)");
  });

  it("counts the carbons with words, and hides them without", () => {
    const shown = render(results({ units: 100 }, { polymer: "nylon" }), W("chain")).text();
    expect(shown).toContain("12 carbon atoms, 38 atoms in all");
    expect(shown).toContain("chain: 1200 carbon atoms");
    const hidden = render(results({ units: 100 }, { polymer: "nylon" }), ["chain"]).text();
    expect(hidden).not.toContain("1200");
    expect(hidden).toContain("chain: ? carbon atoms");
  });
});

describe("thread view", () => {
  it("hangs the weight on the thread, and drops it when the thread snaps", () => {
    const l = computePolymerSchoolLayout(325);
    const hanging = threadGeometry(l, 300, false);
    const fallen = threadGeometry(l, 400, true);
    expect(hanging.weight.y + hanging.weight.h).toBeLessThan(hanging.floor);
    expect(fallen.weight.y + fallen.weight.h).toBe(fallen.floor);
    expect(render(results({ load: 400 }, { fibre: "cotton" }), ["fibres"]).text()).toContain("snap!");
    expect(render(results({ load: 300 }, { fibre: "cotton" }), ["fibres"]).text()).not.toContain("snap!");
  });

  it("gives the breaking load and properties only with words", () => {
    const t = render(results({ load: 100 }, { fibre: "nylon" }), W("fibres")).text();
    expect(t).toContain("holds up to 650 g (illustrative)");
    expect(t).toContain("man-made · from petrochemicals");
    expect(t).toContain("melts when heated: not for the kitchen");
    expect(render(results({}, { fibre: "rayon" }), W("fibres")).text()).toContain("man-made · from wood pulp");
    const hidden = render(results({ load: 100 }, { fibre: "nylon" }), ["fibres"]).text();
    expect(hidden).not.toContain("650");
    expect(hidden).not.toContain("melts");
    expect(hidden).toContain("100 g");
  });
});

describe("plastic view", () => {
  it("sags a thermoplastic once it softens, never a thermoset", () => {
    const l = computePolymerSchoolLayout(325);
    expect(plasticGeometry(l, true).sag).toBeGreaterThan(0);
    expect(plasticGeometry(l, false).sag).toBe(0);
    expect(render(results({ heat: 100 }, { plastic: "polythene" }), W("plastics")).text()).toContain("soft now: it can be bent to a new shape");
    expect(render(results({ heat: 250 }, { plastic: "bakelite" }), W("plastics")).text()).toContain("stays hard, however hot");
  });

  it("draws cross-links only in thermosets", () => {
    const thermo = render(results({}, { plastic: "pvc" }), ["plastics"]);
    const set = render(results({}, { plastic: "melamine" }), ["plastics"]);
    // Cross-links are extra two-point strokes: three gaps × two links.
    expect(set.of("stroke").length - thermo.of("stroke").length).toBe(6);
    expect(render(results({}, { plastic: "melamine" }), W("plastics")).text()).toContain("cross-linked: the chains are tied together");
    expect(render(results({}, { plastic: "pvc" }), W("plastics")).text()).toContain("thermoplastic · softens at about 80 °C");
  });
});

describe("waste view", () => {
  it("shrinks rotting waste, and says when it is gone", () => {
    const l = computePolymerSchoolLayout(325);
    expect(pitGeometry(l).item.y).toBeGreaterThan(pitGeometry(l).surface);
    expect(render(results({ days: 30 }, { waste: "peels" }), ["waste"]).text()).toContain("gone: it has rotted away");
    expect(render(results({ days: 730 }, { waste: "bag" }), ["waste"]).text()).not.toContain("gone");
  });

  it("quotes NCERT's time only with words", () => {
    expect(render(results({}, { waste: "paper" }), W("waste")).text()).toContain("NCERT: 10 to 30 days (approximate)");
    expect(render(results({}, { waste: "bag" }), W("waste")).text()).toContain("NCERT: several years (approximate)");
    expect(render(results({ days: 10 }, { waste: "paper" }), W("waste")).text()).toContain("left: 50% (steady rotting, illustrative)");
    expect(render(results({}, { waste: "paper" }), ["waste"]).text()).not.toContain("10 to 30");
  });
});
