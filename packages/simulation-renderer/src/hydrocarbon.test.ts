import { HYDROCARBON_MECHANISMS, HYDROCARBON_RINGS, hydrocarbonModel, type HydrocarbonParams, type HydrocarbonState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import {
  benzeneMolecule,
  bondBars,
  computeHydrocarbonLayout,
  easPicture,
  energyPlot,
  hydrocarbonRenderer,
  mechanismPicture,
  newmanAngles,
  newmanGeometry,
  ringMolecule,
} from "./hydrocarbon/renderer";
import { implicitHydrogens } from "./shared/molecule";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: HydrocarbonState = hydrocarbonModel.initialize(hydrocarbonModel.defaultParams);
const results = (state: Partial<HydrocarbonState> = {}, params: Partial<HydrocarbonParams> = {}) =>
  hydrocarbonModel.derive({ ...base, ...state }, { ...hydrocarbonModel.defaultParams, ...params });

interface Extent {
  text: string;
  left: number;
  right: number;
  y: number;
}

/** Render, recording where text lands (the recorder measures 6 px a character) and every point drawn. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const extents: Extent[] = [];
  const points: { x: number; y: number; method: string }[] = [];
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
      if (key === "moveTo" || key === "lineTo" || key === "arc") {
        return (...args: number[]) => {
          const pad = key === "arc" ? args[2]! : 0;
          points.push({ x: args[0]! - pad, y: args[1]! - pad, method: key }, { x: args[0]! + pad, y: args[1]! + pad, method: key });
          return value(...args);
        };
      }
      return value;
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeHydrocarbonLayout(width);
  hydrocarbonRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, extents, points, layout, text: () => rec.texts().join(" | ") };
};

const VIEWS: [string, Partial<HydrocarbonState>, Partial<HydrocarbonParams>, string[]][] = [
  ["newman, eclipsed", { dihedral: 0 }, {}, ["newman", "labels"]],
  ["newman, skew", { dihedral: 200 }, {}, ["newman", "labels"]],
  ...HYDROCARBON_MECHANISMS.flatMap((m, mechanism) =>
    m.stages.map((_, stage) => [`mechanism ${m.id} ${stage}`, { stage }, { mechanism }, ["mechanism", "labels"]] as [string, Partial<HydrocarbonState>, Partial<HydrocarbonParams>, string[]]),
  ),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((reagent) => [`addition 2-methylpropene ${reagent}`, {}, { alkene: 4, reagent }, ["addition", "labels"]] as [string, Partial<HydrocarbonState>, Partial<HydrocarbonParams>, string[]]),
  ["addition but-1-ene ozone", {}, { alkene: 2, reagent: 7 }, ["addition", "labels"]],
  ...[0, 1, 2, 3, 4, 5, 6].map((alkyneReagent) => [`alkynes but-1-yne ${alkyneReagent}`, {}, { alkyne: 2, alkyneReagent }, ["alkynes", "labels"]] as [string, Partial<HydrocarbonState>, Partial<HydrocarbonParams>, string[]]),
  ["alkynes but-2-yne nanh2", {}, { alkyne: 3, alkyneReagent: 0 }, ["alkynes", "labels"]],
  ["alkynes ethyne nanh2", {}, { alkyne: 0, alkyneReagent: 0 }, ["alkynes", "labels"]],
  ...HYDROCARBON_RINGS.map((_, ring) => [`rings ${ring}`, {}, { ring }, ["rings", "labels"]] as [string, Partial<HydrocarbonState>, Partial<HydrocarbonParams>, string[]]),
  ["kekule", {}, {}, ["kekule", "labels"]],
  ...[0, 1, 2].flatMap((easStage) => [0, 3, 5].map((reaction) => [`eas ${reaction} ${easStage}`, { easStage }, { reaction }, ["eas", "labels"]] as [string, Partial<HydrocarbonState>, Partial<HydrocarbonParams>, string[]])),
  ...[0, 3, 5, 10].flatMap((substituent) => [2, 3, 4].map((position) => [`directing ${substituent} ${position}`, { position }, { substituent }, ["directing", "labels"]] as [string, Partial<HydrocarbonState>, Partial<HydrocarbonParams>, string[]])),
];

describe("Newman projection", () => {
  it("turns the back bonds by θ", () => {
    expect(newmanAngles(0).back).toEqual([-90, 30, 150]);
    expect(newmanAngles(60).back).toEqual([-30, 90, 210]);
  });

  it("gives θ always, the conformation and energy only with words", () => {
    const t = render(results({ dihedral: 0 }), ["newman", "labels"]).texts();
    expect(t).toEqual(expect.arrayContaining(["θ = 0°", "eclipsed", "E = 12.5 kJ/mol", "12.5", "Eclipsed: C–H bond pairs repel (torsional strain)"]));
    expect(render(results({ dihedral: 60 }), ["newman", "labels"]).texts()).toEqual(expect.arrayContaining(["staggered", "E = 0.0 kJ/mol"]));
    const hidden = render(results({ dihedral: 0 }), ["newman"]).texts();
    expect(hidden).toContain("θ = 0°");
    expect(hidden.join(" ")).not.toMatch(/12\.5|kJ|eclipsed/);
  });

  it("puts the marker on the energy curve", () => {
    const r = render(results({ dihedral: 0 }), ["newman"]);
    const p = energyPlot(r.layout);
    const marker = r.of("arc").find((c) => c.args[2] === 4.5)!;
    expect(marker.args[0]).toBeCloseTo(p.left, 6);
    expect(marker.args[1]).toBeCloseTo(p.bottom - (12.5 / p.eMax) * (p.bottom - p.top), 6);
  });

  it("keeps the projection on a phone", () => {
    const l = computeHydrocarbonLayout(325);
    const g = newmanGeometry(l);
    expect(g.cx - g.reach - 30).toBeGreaterThan(l.left + 48);
    expect(g.cy - g.reach - 26).toBeGreaterThan(24);
  });
});

describe("mechanism view", () => {
  it("draws fishhook arrows for the radical steps and full arrows for the ionic ones", () => {
    const r = render(results({ stage: 1 }, { mechanism: 0 }), ["mechanism", "labels"]);
    expect(r.of("quadraticCurveTo")).toHaveLength(3);
    expect(r.texts()).toEqual(expect.arrayContaining(["Step 2 of 6 · propagation", "→ •CH₃ + H–Cl", "Radicals: one in, one out", "Leaves a methyl free radical"]));
    expect(mechanismPicture(0, 1).arrows.every((a) => a.fishhook)).toBe(true);
    expect(mechanismPicture(1, 0).arrows.every((a) => !a.fishhook)).toBe(true);
    expect(render(results({ stage: 0 }, { mechanism: 1 }), ["mechanism", "labels"]).texts()).toContain("Leaves a 2° carbocation");
    expect(render(results({ stage: 3 }, { mechanism: 0 }), ["mechanism", "labels"]).texts()).toContain("Radicals used up: 2");
  });

  it("draws each species with the right hydrogens", () => {
    // •CH₃ and the carbocation CH₃C⁺HCH₃.
    expect(implicitHydrogens(mechanismPicture(0, 2).molecule, 0)).toBe(3);
    expect(implicitHydrogens(mechanismPicture(1, 1).molecule, 1)).toBe(1);
    expect(implicitHydrogens(mechanismPicture(1, 0).molecule, 2)).toBe(2);
    expect(implicitHydrogens(mechanismPicture(2, 3).molecule, 2)).toBe(1);
    expect(render(results({ stage: 1 }, { mechanism: 1 }), ["mechanism"]).texts()).toEqual(expect.arrayContaining(["C", "H", "⁺", "Br", "⁻"]));
  });

  it("hides the radical count without words", () => {
    expect(render(results({ stage: 0 }, { mechanism: 0 }), ["mechanism"]).text()).not.toContain("Radicals made");
  });
});

describe("addition view", () => {
  it("names the product and says how it is oriented", () => {
    const t = render(results({}, { alkene: 1, reagent: 2 }), ["addition", "labels"]).texts();
    expect(t).toEqual(expect.arrayContaining(["CH₂=CHCH₃ + HBr", "2-bromopropane", "Markovnikov: Br goes to the C with fewer H", "By way of a 2° carbocation, the more stable"]));
    const p = render(results({}, { alkene: 1, reagent: 3 }), ["addition", "labels"]).texts();
    expect(p).toEqual(expect.arrayContaining(["1-bromopropane", "Peroxide effect: Br goes to the C with more H", "By way of a 2° free radical, the more stable"]));
    expect(render(results({}, { alkene: 4, reagent: 7 }), ["addition", "labels"]).texts()).toContain("methanal + propanone");
  });

  it("hides the product's name and the intermediate without words", () => {
    const t = render(results({}, { alkene: 4, reagent: 2 }), ["addition"]).text();
    expect(t).toContain("product: ?");
    expect(t).not.toMatch(/2-bromo|3°|Markovnikov/);
  });

  it("draws the added bromine", () => {
    expect(render(results({}, { alkene: 1, reagent: 1 }), ["addition"]).texts().filter((s) => s === "Br")).toHaveLength(2);
  });
});

describe("alkyne view", () => {
  it("names products, the stereochemistry and the acidic H", () => {
    expect(render(results({}, { alkyne: 3, alkyneReagent: 1 }), ["alkynes", "labels"]).texts()).toEqual(
      expect.arrayContaining(["cis-but-2-ene", "cis: both H add from the same side", "Acidic H on but-2-yne: 0"]),
    );
    expect(render(results({}, { alkyne: 3, alkyneReagent: 2 }), ["alkynes", "labels"]).texts()).toContain("trans-but-2-ene");
    const anion = render(results({}, { alkyne: 1, alkyneReagent: 0 }), ["alkynes", "labels"]).texts();
    expect(anion).toEqual(expect.arrayContaining(["sodium propynide", "Na", "⁺", "⁻"]));
    expect(render(results({}, { alkyne: 3, alkyneReagent: 0 }), ["alkynes", "labels"]).texts()).toContain("no reaction");
  });

  it("hides the product's name without words", () => {
    expect(render(results({}, { alkyne: 3, alkyneReagent: 1 }), ["alkynes"]).text()).not.toContain("cis");
  });
});

describe("rings view", () => {
  it("counts π electrons and gives Hückel's verdict with words", () => {
    const t = render(results({}, { ring: 1 }), ["rings", "labels"]).texts();
    expect(t).toEqual(expect.arrayContaining(["cyclopentadienyl anion, C₅H₅⁻", "6 π electrons = 4(1) + 2", "Aromatic, by Hückel's rule"]));
    expect(render(results({}, { ring: 4 }), ["rings", "labels"]).texts()).toEqual(expect.arrayContaining(["4 π electrons = 4(1)", "Not aromatic: 4n π electrons, not 4n + 2"]));
    expect(render(results({}, { ring: 5 }), ["rings", "labels"]).texts()).toEqual(expect.arrayContaining(["✗ planar (it is tub-shaped)"]));
    expect(render(results({}, { ring: 6 }), ["rings", "labels"]).texts()).toEqual(expect.arrayContaining(["C", "H₂", "Not aromatic: an sp³ carbon breaks the ring"]));
  });

  it("hides the count and the circle without words", () => {
    const r = render(results({}, { ring: 0 }), ["rings"]);
    expect(r.text()).not.toMatch(/π electrons =|Aromatic/);
    expect(r.of("setLineDash")).toHaveLength(0);
    expect(render(results({}, { ring: 3 }), ["rings", "labels"]).of("setLineDash")).toHaveLength(2);
  });

  it("builds rings whose carbons all have four bonds", () => {
    for (const ring of HYDROCARBON_RINGS) {
      const mol = ringMolecule(ring);
      mol.atoms.forEach((a, i) => {
        const bonds = mol.bonds.reduce((s, b) => s + (b.a === i || b.b === i ? b.order : 0), 0);
        const h = implicitHydrogens(mol, i);
        expect(bonds + h + (a.charge ? 1 : 0), `${ring.id} C${i}`).toBe(4);
      });
    }
  });
});

describe("Kekulé view", () => {
  it("draws two Kekulé structures and the hybrid, and hides benzene's bond length without words", () => {
    expect(benzeneMolecule(0).bonds.filter((b) => b.order === 2)).toHaveLength(3);
    expect(benzeneMolecule("hybrid").bonds.every((b) => b.order === 1)).toBe(true);
    expect(render(results(), ["kekule", "labels"]).texts()).toEqual(expect.arrayContaining(["139 pm", "154 pm", "134 pm", "120 pm"]));
    const hidden = render(results(), ["kekule"]).texts();
    expect(hidden).toContain("? pm");
    expect(hidden).not.toContain("139 pm");
  });

  it("draws bars in proportion to the bond lengths", () => {
    const bars = bondBars(computeHydrocarbonLayout(325));
    const len = (k: number) => bars[k]!.x1 - bars[k]!.x0;
    expect(len(1) / len(0)).toBeCloseTo(139 / 154, 9);
    expect(bars[0]!.x1 + 6 + 6 * 6).toBeLessThanOrEqual(325);
  });
});

describe("substitution views", () => {
  it("shows E⁺ attacking, the σ-complex, and the product", () => {
    const t0 = render(results({ easStage: 0 }, { reaction: 0 }), ["eas", "labels"]);
    expect(t0.texts()).toEqual(expect.arrayContaining(["HNO₃ + 2H₂SO₄ → NO₂⁺ + H₃O⁺ + 2HSO₄⁻", "Electrophile: NO₂⁺"]));
    expect(t0.of("quadraticCurveTo")).toHaveLength(1);
    const sigma = easPicture("NO₂", "NO₂⁺", 1, 1).molecule;
    expect(implicitHydrogens(sigma, 0)).toBe(0); // the sp³ carbon: two ring bonds, H and NO₂ drawn
    expect(implicitHydrogens(sigma, 1)).toBe(1); // C⁺
    expect(render(results({ easStage: 2 }, { reaction: 4 }), ["eas", "labels"]).texts()).toContain("→ toluene (methylbenzene) + H⁺");
  });

  it("marks δ− at ortho and para for a donor, δ+ for an acceptor, only with words", () => {
    const donor = render(results({ position: 4 }, { substituent: 1 }), ["directing", "labels"]).texts();
    expect(donor.filter((s) => s === "δ−")).toHaveLength(3);
    expect(donor).toEqual(expect.arrayContaining(["–OH: ortho and para, activating", "Attack at para: favoured"]));
    const acceptor = render(results({ position: 4 }, { substituent: 7 }), ["directing", "labels"]).texts();
    expect(acceptor.filter((s) => s === "δ+")).toHaveLength(3);
    expect(acceptor).toEqual(expect.arrayContaining(["–NO₂: meta, deactivating", "Attack at para: not favoured"]));
    expect(render(results({ position: 2 }, { substituent: 5 }), ["directing", "labels"]).texts()).toContain("–Cl: ortho and para, deactivating");
    const hidden = render(results({ position: 3 }, { substituent: 7 }), ["directing"]).text();
    expect(hidden).not.toMatch(/δ|favoured|deactivating/);
    expect(hidden).toContain("meta");
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
    for (const p of r.points) {
      expect(p.x, `${p.method} x`).toBeGreaterThanOrEqual(0);
      expect(p.x, `${p.method} x`).toBeLessThanOrEqual(325);
      expect(p.y, `${p.method} y`).toBeGreaterThanOrEqual(0);
      expect(p.y, `${p.method} y`).toBeLessThanOrEqual(r.layout.height);
    }
  });

  it("is between 330 and 420 px tall", () => {
    const h = computeHydrocarbonLayout(325).height;
    expect(h).toBeGreaterThanOrEqual(330);
    expect(h).toBeLessThanOrEqual(420);
  });
});
