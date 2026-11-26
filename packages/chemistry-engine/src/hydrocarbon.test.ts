import { describe, expect, it } from "vitest";
import {
  HYDROCARBON_ALKENE_REAGENTS,
  HYDROCARBON_ALKENES,
  HYDROCARBON_ALKYNE_REAGENTS,
  HYDROCARBON_ALKYNES,
  HYDROCARBON_EAS_REACTIONS,
  HYDROCARBON_MECHANISMS,
  HYDROCARBON_RINGS,
  HYDROCARBON_SUBSTITUENTS,
  hydrocarbonAcidicH,
  hydrocarbonActivation,
  hydrocarbonAdd,
  hydrocarbonAlkyneReact,
  hydrocarbonConformation,
  hydrocarbonDirects,
  hydrocarbonHuckel,
  hydrocarbonModel as model,
  hydrocarbonTorsionalEnergy,
  type HydrocarbonParams,
  type HydrocarbonState,
} from "./hydrocarbon";
import { nameOrganic, organicGraphFromSketch, organicShortName, type OrganicSketch } from "./organic";

const base: HydrocarbonState = model.initialize(model.defaultParams);
const derive = (state: Partial<HydrocarbonState> = {}, params: Partial<HydrocarbonParams> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

/** The IUPAC name by the organic namer, in NCERT's locant-free form where there is one. */
const organicName = (s: OrganicSketch) => {
  const name = nameOrganic(organicGraphFromSketch(s)).name;
  return organicShortName(name) ?? name;
};

const STEM = ["", "meth", "eth", "prop", "but", "pent"];
const MULT = ["", "", "di", "tri", "tetra"];
const PREFIX: Readonly<Record<string, string>> = { Br: "bromo", Cl: "chloro", C: "methyl" };

/**
 * An independent namer for the saturated halogen products: the drawn main
 * chain is the parent; number it from whichever end gives the lower set of
 * locants (then the lower locant to the prefix cited first), prefixes A→Z.
 */
function haloName(s: OrganicSketch): string {
  const n = s.atoms.length;
  const subs = (s.branches ?? []).map((b) => ({ at: b.at, name: PREFIX[b.atoms[0]!]! }));
  const numbered = (flip: boolean) => subs.map((x) => ({ name: x.name, locant: flip ? n - x.at : x.at + 1 }));
  const set = (xs: { locant: number }[]) => xs.map((x) => x.locant).sort((a, b) => a - b);
  const alpha = (xs: { name: string; locant: number }[]) => [...xs].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.locant - b.locant));
  const cmp = (a: number[], b: number[]) => a.findIndex((v, i) => v !== b[i]);
  const forward = numbered(false);
  const backward = numbered(true);
  const fa = set(forward);
  const ba = set(backward);
  const k = cmp(fa, ba);
  let chosen = forward;
  if (k >= 0) chosen = fa[k]! < ba[k]! ? forward : backward;
  else if (alpha(backward)[0]!.locant < alpha(forward)[0]!.locant) chosen = backward;
  const groups = new Map<string, number[]>();
  for (const x of alpha(chosen)) groups.set(x.name, [...(groups.get(x.name) ?? []), x.locant]);
  const needsLocants = n > 2 || subs.length > 1;
  const prefix = [...groups.entries()].map(([name, locants]) => (needsLocants ? `${locants.join(",")}-` : "") + `${MULT[locants.length]}${name}`).join("-");
  return `${prefix}${STEM[n]}ane`;
}

describe("conformations of ethane", () => {
  it("has its 12.5 kJ/mol maximum when eclipsed and zero when staggered", () => {
    expect(hydrocarbonTorsionalEnergy(0)).toBeCloseTo(12.5, 9);
    expect(hydrocarbonTorsionalEnergy(120)).toBeCloseTo(12.5, 9);
    expect(hydrocarbonTorsionalEnergy(60)).toBe(0);
    expect(hydrocarbonTorsionalEnergy(180)).toBe(0);
    expect(hydrocarbonTorsionalEnergy(30)).toBeCloseTo(6.25, 9);
    expect(Object.is(hydrocarbonTorsionalEnergy(300), -0)).toBe(false);
  });

  it("names eclipsed, staggered and skew forms", () => {
    expect([0, 60, 120, 180, 240, 300, 360].map(hydrocarbonConformation)).toEqual([0, 1, 0, 1, 0, 1, 0]);
    expect(hydrocarbonConformation(45)).toBe(2);
    expect(hydrocarbonConformation(119.8)).toBe(0);
  });

  it("turns under Play and steps 60° at a time", () => {
    const s = model.advance({ ...base, dihedral: 340 }, 0.5, model.defaultParams);
    expect(s.dihedral).toBeCloseTo(10, 9);
    expect(model.step({ ...base, dihedral: 50 }, model.defaultParams, 1).dihedral).toBe(120);
    expect(model.step({ ...base, dihedral: 0 }, model.defaultParams, -1).dihedral).toBe(0);
  });
});

describe("mechanisms", () => {
  it("chlorination of methane: one initiation, two propagation, three termination steps", () => {
    const kinds = HYDROCARBON_MECHANISMS[0]!.stages.map((s) => s.kind);
    expect(kinds).toEqual([0, 1, 1, 2, 2, 2]);
    expect(HYDROCARBON_MECHANISMS[0]!.stages.map((s) => s.radicalChange)).toEqual([2, 0, 0, -2, -2, -2]);
  });

  it("propagation steps keep the number of radicals; the two propagation steps add up to the overall reaction", () => {
    for (const m of HYDROCARBON_MECHANISMS) for (const s of m.stages) if (s.kind === 1) expect(s.radicalChange).toBe(0);
  });

  it("HBr goes by the 2° carbocation; with peroxide by the 2° radical", () => {
    expect(derive({ stage: 0 }, { mechanism: 1 })).toMatchObject({ mechIntermediate: 1, mechDegree: 2, stageKind: 3, stageCount: 2 });
    expect(derive({ stage: 2 }, { mechanism: 2 })).toMatchObject({ mechIntermediate: 2, mechDegree: 2, stageKind: 1 });
  });

  it("clamps the stage to the mechanism's last", () => {
    expect(derive({ stage: 5 }, { mechanism: 1 }).stage).toBe(1);
    expect(derive({ stage: 5 }, { mechanism: 0 }).stage).toBe(5);
  });
});

describe("additions to alkenes", () => {
  const known: Record<string, string[]> = {
    ethene: ["ethane", "1,2-dibromoethane", "bromoethane", "bromoethane", "chloroethane", "ethanol", "ethane-1,2-diol", "methanal + methanal"],
    propene: ["propane", "1,2-dibromopropane", "2-bromopropane", "1-bromopropane", "2-chloropropane", "propan-2-ol", "propane-1,2-diol", "methanal + ethanal"],
    "but-1-ene": ["butane", "1,2-dibromobutane", "2-bromobutane", "1-bromobutane", "2-chlorobutane", "butan-2-ol", "butane-1,2-diol", "methanal + propanal"],
    "but-2-ene": ["butane", "2,3-dibromobutane", "2-bromobutane", "2-bromobutane", "2-chlorobutane", "butan-2-ol", "butane-2,3-diol", "ethanal + ethanal"],
    "2-methylpropene": [
      "2-methylpropane",
      "1,2-dibromo-2-methylpropane",
      "2-bromo-2-methylpropane",
      "1-bromo-2-methylpropane",
      "2-chloro-2-methylpropane",
      "2-methylpropan-2-ol",
      "2-methylpropane-1,2-diol",
      "methanal + propanone",
    ],
  };

  it("names every product as NCERT would", () => {
    for (const alkene of HYDROCARBON_ALKENES) {
      const names = HYDROCARBON_ALKENE_REAGENTS.map((r) => hydrocarbonAdd(alkene, r).names.join(" + "));
      expect(names, alkene.id).toEqual(known[alkene.id]);
    }
  });

  it("builds each product's structure by rule, and the structure matches its name", () => {
    for (const alkene of HYDROCARBON_ALKENES) {
      for (const reagent of HYDROCARBON_ALKENE_REAGENTS) {
        const added = hydrocarbonAdd(alkene, reagent);
        added.sketches.forEach((s, k) => {
          const label = `${alkene.id} + ${reagent.id}`;
          const halogen = (s.branches ?? []).some((b) => b.atoms[0] === "Br" || b.atoms[0] === "Cl");
          expect(halogen ? haloName(s) : organicName(s), label).toBe(added.names[k]);
        });
      }
    }
  });

  it("orients HX and water by Markovnikov's rule, and HBr with peroxide the other way", () => {
    const o = (alkene: number, reagent: number) => derive({}, { alkene, reagent }).orientation;
    expect(o(1, 2)).toBe(1);
    expect(o(1, 3)).toBe(2);
    expect(o(1, 4)).toBe(1); // no peroxide effect with HCl
    expect(o(1, 5)).toBe(1);
    expect(o(3, 2)).toBe(0); // but-2-ene: both ends alike
    expect(o(3, 3)).toBe(0);
    expect(o(0, 3)).toBe(0);
    expect(o(1, 0)).toBe(0);
  });

  it("gives the locant of X and the degree of the intermediate", () => {
    expect(derive({}, { alkene: 1, reagent: 2 })).toMatchObject({ xLocant: 2, addDegree: 2, addIntermediate: 1 });
    expect(derive({}, { alkene: 1, reagent: 3 })).toMatchObject({ xLocant: 1, addDegree: 2, addIntermediate: 2 });
    expect(derive({}, { alkene: 4, reagent: 2 })).toMatchObject({ xLocant: 2, addDegree: 3 });
    expect(derive({}, { alkene: 0, reagent: 2 })).toMatchObject({ xLocant: 1, addDegree: 1 });
    expect(derive({}, { alkene: 1, reagent: 1 })).toMatchObject({ xLocant: 0, addDegree: 0, addIntermediate: 0 });
  });

  it("knows only but-2-ene has cis and trans forms, and ozonolysis gives two products", () => {
    expect(HYDROCARBON_ALKENES.map((_, alkene) => derive({}, { alkene }).alkeneCisTrans)).toEqual([0, 0, 0, 1, 0]);
    expect(derive({}, { reagent: 7 }).productCount).toBe(2);
    expect(derive({}, { reagent: 1 }).productCount).toBe(1);
  });
});

describe("alkynes", () => {
  const known: Record<string, string[]> = {
    ethyne: ["sodium ethynide", "ethene", "sodium ethynide", "ethane", "1,1,2,2-tetrabromoethane", "1,1-dibromoethane", "ethanal"],
    propyne: ["sodium propynide", "propene", "sodium propynide", "propane", "1,1,2,2-tetrabromopropane", "2,2-dibromopropane", "propanone"],
    "but-1-yne": ["sodium but-1-ynide", "but-1-ene", "sodium but-1-ynide", "butane", "1,1,2,2-tetrabromobutane", "2,2-dibromobutane", "butanone"],
    "but-2-yne": ["no reaction", "cis-but-2-ene", "trans-but-2-ene", "butane", "2,2,3,3-tetrabromobutane", "2,2-dibromobutane", "butanone"],
  };

  it("names every product", () => {
    for (const alkyne of HYDROCARBON_ALKYNES) {
      expect(HYDROCARBON_ALKYNE_REAGENTS.map((r) => hydrocarbonAlkyneReact(alkyne, r).name), alkyne.id).toEqual(known[alkyne.id]);
    }
  });

  it("builds each product by rule, and it matches its name", () => {
    for (const alkyne of HYDROCARBON_ALKYNES) {
      for (const reagent of HYDROCARBON_ALKYNE_REAGENTS) {
        const r = hydrocarbonAlkyneReact(alkyne, reagent);
        const label = `${alkyne.id} + ${reagent.id}`;
        if (r.reacts === 0 || r.anionAt >= 0) {
          expect(r.sketch, label).toEqual(alkyne.sketch);
          continue;
        }
        const halogen = (r.sketch.branches ?? []).some((b) => b.atoms[0] === "Br");
        const plain = r.name.replace(/^(cis|trans)-/, "");
        expect(halogen ? haloName(r.sketch) : organicName(r.sketch), label).toBe(plain);
        const stereo = r.name.startsWith("cis-") ? 1 : r.name.startsWith("trans-") ? 2 : 0;
        expect(r.stereo, label).toBe(stereo);
      }
    }
  });

  it("only terminal alkynes have acidic hydrogens to give to NaNH₂", () => {
    expect(HYDROCARBON_ALKYNES.map(hydrocarbonAcidicH)).toEqual([2, 1, 1, 0]);
    expect(HYDROCARBON_ALKYNES.map((_, alkyne) => derive({}, { alkyne, alkyneReagent: 0 }).reacts)).toEqual([1, 1, 1, 0]);
  });

  it("Lindlar's catalyst gives the cis alkene, Na in liquid NH₃ the trans", () => {
    expect(derive({}, { alkyne: 3, alkyneReagent: 1 })).toMatchObject({ stereo: 1, bondAfter: 2 });
    expect(derive({}, { alkyne: 3, alkyneReagent: 2 })).toMatchObject({ stereo: 2, bondAfter: 2 });
    expect(derive({}, { alkyne: 3, alkyneReagent: 3 })).toMatchObject({ stereo: 0, bondAfter: 1 });
    expect(derive({}, { alkyne: 1, alkyneReagent: 1 })).toMatchObject({ stereo: 0, bondAfter: 2 });
  });
});

describe("aromaticity", () => {
  it("counts π electrons from the structure", () => {
    expect(HYDROCARBON_RINGS.map((r) => hydrocarbonHuckel(r).piElectrons)).toEqual([6, 6, 6, 10, 4, 8, 4, 4]);
  });

  it("applies Hückel's rule", () => {
    const verdicts = Object.fromEntries(HYDROCARBON_RINGS.map((r) => [r.id, hydrocarbonHuckel(r)]));
    expect(verdicts.benzene).toMatchObject({ aromatic: true, n: 1 });
    expect(verdicts["cp-anion"]).toMatchObject({ aromatic: true, n: 1 });
    expect(verdicts.tropylium).toMatchObject({ aromatic: true, n: 1 });
    expect(verdicts.naphthalene).toMatchObject({ aromatic: true, n: 2 });
    expect(verdicts.cyclobutadiene).toMatchObject({ aromatic: false, reason: 3 });
    expect(verdicts.cot).toMatchObject({ aromatic: false, reason: 2 });
    expect(verdicts.cyclopentadiene).toMatchObject({ aromatic: false, reason: 1 });
    expect(verdicts["cp-cation"]).toMatchObject({ aromatic: false, reason: 3 });
  });

  it("every ring carbon in a Kekulé structure has four bonds", () => {
    for (const r of HYDROCARBON_RINGS) {
      if (r.id === "cot" || r.sp3At !== undefined) continue;
      for (let i = 0; i < r.atoms; i++) {
        const doubles = r.bonds.filter((b) => (b[0] === i || b[1] === i) && b[2] === 2).length;
        expect(doubles, `${r.id} C${i}`).toBe(i === r.chargeAt ? 0 : 1);
      }
    }
  });

  it("gives NCERT's bond lengths", () => {
    expect(derive()).toMatchObject({ bondSingle: 154, bondBenzene: 139, bondDouble: 134, bondTriple: 120 });
  });
});

describe("electrophilic substitution", () => {
  it("names the electrophile of each reaction", () => {
    expect(HYDROCARBON_EAS_REACTIONS.map((r) => r.electrophile)).toEqual(["NO₂⁺", "Cl⁺", "Br⁺", "SO₃", "CH₃⁺", "CH₃CO⁺"]);
  });

  it("the σ-complex has one sp³ carbon and has lost its aromaticity", () => {
    expect([0, 1, 2].map((easStage) => derive({ easStage }).ringSp3)).toEqual([0, 1, 0]);
    expect([0, 1, 2].map((easStage) => derive({ easStage }).ringIntact)).toEqual([1, 0, 1]);
  });

  it("sorts substituents into o/p and meta directors, activating and deactivating", () => {
    const by = (f: (s: (typeof HYDROCARBON_SUBSTITUENTS)[number]) => number, v: number) => HYDROCARBON_SUBSTITUENTS.filter((s) => f(s) === v).map((s) => s.id);
    expect(by(hydrocarbonDirects, 1)).toEqual(["oh", "nh2", "och3", "ch3", "cl", "br"]);
    expect(by(hydrocarbonDirects, 2)).toEqual(["no2", "cn", "cho", "cooh"]);
    expect(by(hydrocarbonActivation, 1)).toEqual(["oh", "nh2", "och3", "ch3"]);
    expect(by(hydrocarbonActivation, -1)).toEqual(["cl", "br", "no2", "cn", "cho", "cooh"]);
  });

  it("favours o/p for donors and meta for acceptors", () => {
    const fav = (substituent: number) => [2, 3, 4].map((position) => derive({ position }, { substituent }).favoured);
    expect(fav(1)).toEqual([1, 0, 1]);
    expect(fav(7)).toEqual([0, 1, 0]);
    expect(fav(5)).toEqual([1, 0, 1]);
    expect(fav(0)).toEqual([1, 1, 1]);
    expect(derive({ position: 4 }, { substituent: 1 }).positionCharge).toBe(-1);
    expect(derive({ position: 2 }, { substituent: 7 }).positionCharge).toBe(1);
    expect(derive({ position: 3 }, { substituent: 7 }).positionCharge).toBe(0);
  });
});

describe("the model", () => {
  it("lists every output it derives, all finite numbers", () => {
    const r = derive();
    expect(Object.keys(r).sort()).toEqual([...model.outputs].sort());
    for (const params of [model.defaultParams, { mechanism: 9, alkene: -3, reagent: 99, alkyne: NaN, alkyneReagent: 7, ring: 20, reaction: -1, substituent: 50 }]) {
      for (const v of Object.values(model.derive({ dihedral: NaN, stage: 99, easStage: -5, position: 9 }, params))) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Object.is(v, -0)).toBe(false);
      }
    }
  });

  it("clamps what it is set to", () => {
    expect(model.setVariable(base, "dihedral", 400, model.defaultParams).dihedral).toBe(360);
    expect(model.setVariable(base, "stage", 9, model.defaultParams).stage).toBe(5);
    expect(model.setVariable(base, "easStage", -1, model.defaultParams).easStage).toBe(0);
    expect(model.setVariable(base, "position", 1, model.defaultParams).position).toBe(2);
    expect(model.setVariable(base, "nothing", 1, model.defaultParams)).toBe(base);
  });
});
