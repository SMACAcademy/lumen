import { describe, expect, it } from "vitest";
import {
  CARBON_ALKANE_BP,
  CARBON_MOLECULE_ORDER,
  CARBON_MOLECULES,
  CARBON_REACTION_ORDER,
  CARBON_REACTIONS,
  carbonBondsOf,
  carbonChainInfo,
  carbonCombustion,
  carbonElectronsAround,
  carbonEquationText,
  carbonReaction,
  carbonSchoolModel as model,
  carbonWash,
  type CarbonSchoolParams,
  type CarbonSchoolState,
  type CarbonTerm,
} from "./carbonschool";
import { organicFormula, nameOrganic } from "./organic";

const base = model.initialize(model.defaultParams);
const derive = (state: Partial<CarbonSchoolState> = {}, params: Partial<CarbonSchoolParams> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

// ── A small atom counter, so every formula and equation can be checked ──────

const SUBS = "₀₁₂₃₄₅₆₇₈₉";

function atomsOf(formula: string): Map<string, number> {
  const text = formula.replace(/[[\]=≡⁺⁻]/g, "");
  const stack: Map<string, number>[] = [new Map()];
  let i = 0;
  const readSub = () => {
    let digits = "";
    while (i < text.length && SUBS.includes(text[i]!)) digits += SUBS.indexOf(text[i++]!);
    return digits ? Number(digits) : 1;
  };
  while (i < text.length) {
    const ch = text[i]!;
    if (ch === "(") {
      stack.push(new Map());
      i++;
    } else if (ch === ")") {
      i++;
      const group = stack.pop()!;
      const n = readSub();
      const top = stack[stack.length - 1]!;
      for (const [k, v] of group) top.set(k, (top.get(k) ?? 0) + v * n);
    } else if (/[A-Z]/.test(ch)) {
      let el = ch;
      i++;
      if (i < text.length && /[a-z]/.test(text[i]!)) el += text[i++]!;
      const n = readSub();
      const top = stack[stack.length - 1]!;
      top.set(el, (top.get(el) ?? 0) + n);
    } else throw new Error(`unexpected "${ch}" in ${formula}`);
  }
  return stack[0]!;
}

function sideAtoms(terms: readonly CarbonTerm[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const term of terms) for (const [el, n] of atomsOf(term.formula)) total[el] = (total[el] ?? 0) + n * term.coef;
  return total;
}

const ALL_CHAINS = Array.from({ length: 10 }, (_, k) => k + 1).flatMap((carbons) =>
  [0, 1, 2].flatMap((bond) => [0, 1, 2, 3, 4, 5, 6].map((group) => ({ carbons, bond, group }))),
);

describe("electron-dot structures", () => {
  it("gives every atom an octet (hydrogen a pair) and uses each atom's own electrons", () => {
    for (const id of CARBON_MOLECULE_ORDER) {
      const m = CARBON_MOLECULES[id];
      m.atoms.forEach((a, i) => {
        expect(carbonElectronsAround(m, i), `${id} atom ${i}`).toBe(a.el === "H" ? 2 : 8);
        // Each shared pair holds one electron from each partner.
        expect(carbonBondsOf(m, i) + 2 * a.lone, `${id} atom ${i}`).toBe(a.valence);
      });
    }
  });

  it("counts shared pairs and bond types as NCERT draws them", () => {
    const of = (molecule: CarbonSchoolParams["molecule"]) => derive({}, { molecule });
    expect(of("h2")).toMatchObject({ sharedPairs: 1, lonePairs: 0, maxBondOrder: 1, valenceElectrons: 2 });
    expect(of("cl2")).toMatchObject({ sharedPairs: 1, lonePairs: 6, valenceElectrons: 14 });
    expect(of("o2")).toMatchObject({ sharedPairs: 2, doubleBonds: 1, lonePairs: 4, maxBondOrder: 2 });
    expect(of("n2")).toMatchObject({ sharedPairs: 3, tripleBonds: 1, lonePairs: 2, maxBondOrder: 3 });
    expect(of("h2o")).toMatchObject({ sharedPairs: 2, lonePairs: 2 });
    expect(of("nh3")).toMatchObject({ sharedPairs: 3, lonePairs: 1 });
    expect(of("ch4")).toMatchObject({ sharedPairs: 4, singleBonds: 4, lonePairs: 0, carbonBonds: 4 });
    expect(of("co2")).toMatchObject({ sharedPairs: 4, doubleBonds: 2, lonePairs: 4, carbonBonds: 4 });
    expect(of("c2h6")).toMatchObject({ sharedPairs: 7, singleBonds: 7, carbonBonds: 4 });
    expect(of("c2h4")).toMatchObject({ sharedPairs: 6, doubleBonds: 1, singleBonds: 4, carbonBonds: 4 });
    expect(of("c2h2")).toMatchObject({ sharedPairs: 5, tripleBonds: 1, carbonBonds: 4 });
  });

  it("matches the formula to the atoms", () => {
    for (const id of CARBON_MOLECULE_ORDER) {
      const m = CARBON_MOLECULES[id];
      const counted: Record<string, number> = {};
      for (const a of m.atoms) counted[a.el] = (counted[a.el] ?? 0) + 1;
      expect(Object.fromEntries(atomsOf(m.formula)), id).toEqual(counted);
    }
  });
});

describe("allotropes", () => {
  it("diamond: four neighbours, no conduction; graphite: three, conducts; C₆₀: sixty atoms", () => {
    expect(derive({}, { allotrope: "diamond" })).toMatchObject({ neighbours: 4, conducts: 0, atomsPerMolecule: 0 });
    expect(derive({}, { allotrope: "graphite" })).toMatchObject({ neighbours: 3, conducts: 1, atomsPerMolecule: 0 });
    expect(derive({}, { allotrope: "fullerene" })).toMatchObject({ neighbours: 3, atomsPerMolecule: 60 });
  });
});

describe("chains: names, formulae and masses", () => {
  it("names compounds the way NCERT's class 10 table does", () => {
    const name = (carbons: number, bond: number, group: number) => carbonChainInfo({ carbons, bond, group }).name;
    expect(name(1, 0, 0)).toBe("methane");
    expect(name(3, 0, 1)).toBe("chloropropane");
    expect(name(3, 0, 2)).toBe("bromopropane");
    expect(name(3, 0, 3)).toBe("propanol");
    expect(name(3, 0, 4)).toBe("propanal");
    expect(name(3, 0, 5)).toBe("propanone");
    expect(name(3, 0, 6)).toBe("propanoic acid");
    expect(name(3, 1, 0)).toBe("propene");
    expect(name(3, 2, 0)).toBe("propyne");
    expect(name(2, 0, 3)).toBe("ethanol");
    expect(name(2, 0, 6)).toBe("ethanoic acid");
    expect(name(1, 0, 4)).toBe("methanal");
    expect(name(1, 0, 6)).toBe("methanoic acid");
    expect(name(4, 0, 5)).toBe("butanone");
    expect(name(10, 0, 0)).toBe("decane");
  });

  it("gives the class 11 IUPAC name only where it differs", () => {
    const iupac = (carbons: number, bond: number, group: number) => carbonChainInfo({ carbons, bond, group }).iupac;
    expect(iupac(3, 0, 3)).toBe("propan-1-ol");
    expect(iupac(4, 1, 0)).toBe("but-1-ene");
    expect(iupac(5, 0, 5)).toBe("pentan-2-one");
    expect(iupac(5, 2, 0)).toBe("pent-1-yne");
    // NCERT's class 11 book also writes these without a locant.
    expect(iupac(4, 0, 5)).toBe("");
    expect(iupac(3, 0, 5)).toBe("");
    expect(iupac(3, 1, 0)).toBe("");
    expect(iupac(2, 0, 3)).toBe("");
    expect(iupac(3, 0, 6)).toBe("");
    expect(iupac(3, 0, 1)).toBe(""); // halogens: not covered by the namer
  });

  it("flags chains it cannot make", () => {
    expect(carbonChainInfo({ carbons: 1, bond: 1, group: 0 }).problem).toBe(1);
    expect(carbonChainInfo({ carbons: 2, bond: 0, group: 5 }).problem).toBe(2);
    expect(carbonChainInfo({ carbons: 3, bond: 1, group: 3 }).problem).toBe(3);
    expect(derive({ carbons: 1, bond: 2 })).toMatchObject({ valid: 0, fuelOk: 0, flame: 0 });
  });

  it("follows the general formulae CₙH₂ₙ₊₂, CₙH₂ₙ and CₙH₂ₙ₋₂", () => {
    for (let n = 1; n <= 10; n++) {
      expect(carbonChainInfo({ carbons: n, bond: 0, group: 0 }).H).toBe(2 * n + 2);
      if (n >= 2) {
        expect(carbonChainInfo({ carbons: n, bond: 1, group: 0 }).H).toBe(2 * n);
        expect(carbonChainInfo({ carbons: n, bond: 2, group: 0 }).H).toBe(2 * n - 2);
      }
    }
  });

  it("agrees with the class 11 namer's formula, and with its own condensed formula", () => {
    for (const c of ALL_CHAINS) {
      const info = carbonChainInfo(c);
      if (info.problem !== 0) continue;
      const counted = Object.fromEntries(atomsOf(info.condensed));
      expect(counted, info.name).toEqual(Object.fromEntries(atomsOf(info.formula)));
      if (!info.halogen) {
        const graph = {
          carbons: Array.from({ length: c.carbons }, (_, i) => ({ oh: (c.group === 3 || c.group === 6) && i === 0 ? 1 : 0, oxo: ((c.group === 4 || c.group === 6) && i === 0) || (c.group === 5 && i === 1) })),
          bonds: Array.from({ length: c.carbons - 1 }, (_, i) => ({ a: i, b: i + 1, order: (i === 0 && c.bond > 0 ? c.bond + 1 : 1) as 1 | 2 | 3 })),
        };
        expect(organicFormula(graph), info.name).toEqual({ C: info.C, H: info.H, O: info.O });
        expect(() => nameOrganic(graph), info.name).not.toThrow();
      }
    }
  });

  it("gives known formula masses, 14 u apart along a series", () => {
    const mass = (carbons: number, bond: number, group: number) => derive({ carbons, bond, group }).formulaMass;
    expect(mass(1, 0, 0)).toBe(16);
    expect(mass(2, 0, 3)).toBe(46); // ethanol
    expect(mass(2, 0, 6)).toBe(60); // ethanoic acid
    expect(mass(4, 0, 3)).toBe(74); // butanol
    expect(mass(3, 0, 5)).toBe(58); // propanone
    expect(mass(1, 0, 1)).toBe(50.5); // chloromethane
    expect(mass(2, 0, 2)).toBe(109); // bromoethane
    for (let n = 1; n < 10; n++) {
      for (const group of [0, 1, 3, 4, 6]) expect(mass(n + 1, 0, group) - mass(n, 0, group)).toBe(14);
    }
  });

  it("counts covalent bonds: pentane has 16", () => {
    expect(derive({ carbons: 5 }).chainPairs).toBe(16);
    expect(derive({ carbons: 1 }).chainPairs).toBe(4);
    expect(derive({ carbons: 2, bond: 1 }).chainPairs).toBe(6); // C=C counts two
    expect(derive({ carbons: 2, group: 3 }).chainPairs).toBe(8); // ethanol: 5 C–H, C–C, C–O, O–H
  });

  it("gives alkane boiling points that rise down the series; butane is a gas, pentane a liquid", () => {
    for (let n = 2; n <= 10; n++) expect(CARBON_ALKANE_BP[n]!).toBeGreaterThan(CARBON_ALKANE_BP[n - 1]!);
    expect(derive({ carbons: 4 }).alkaneGas).toBe(1);
    expect(derive({ carbons: 5 }).alkaneGas).toBe(0);
  });
});

describe("burning", () => {
  it("balances with whole numbers, as NCERT writes them", () => {
    expect(carbonCombustion(carbonChainInfo({ carbons: 1, bond: 0, group: 0 })).equation).toBe("CH₄ + 2O₂ → CO₂ + 2H₂O");
    expect(carbonCombustion(carbonChainInfo({ carbons: 2, bond: 0, group: 3 })).equation).toBe("CH₃CH₂OH + 3O₂ → 2CO₂ + 3H₂O");
    expect(carbonCombustion(carbonChainInfo({ carbons: 2, bond: 0, group: 0 })).equation).toBe("2CH₃CH₃ + 7O₂ → 4CO₂ + 6H₂O");
    expect(carbonCombustion(carbonChainInfo({ carbons: 8, bond: 0, group: 0 })).equation).toBe("2C₈H₁₈ + 25O₂ → 16CO₂ + 18H₂O");
    expect(carbonCombustion(carbonChainInfo({ carbons: 3, bond: 0, group: 1 })).ok).toBe(false);
  });

  it("balances every fuel it will burn", () => {
    for (const c of ALL_CHAINS) {
      const info = carbonChainInfo(c);
      const r = carbonReaction("combustion", info);
      if (!carbonCombustion(info).ok) {
        expect(r.reactants).toHaveLength(0);
        continue;
      }
      expect(sideAtoms(r.reactants), carbonEquationText(r)).toEqual(sideAtoms(r.products));
    }
  });

  it("burns clean and blue only when saturated with enough air", () => {
    expect(derive({ carbons: 1, air: 120 })).toMatchObject({ flame: 1, complete: 1, oxygenNeeded: 2, co2Made: 1, waterMade: 2 });
    expect(derive({ carbons: 1, air: 80 })).toMatchObject({ flame: 2, complete: 0 });
    expect(derive({ carbons: 2, bond: 1, air: 120 })).toMatchObject({ flame: 2, saturated: 0, complete: 0 });
    expect(derive({ carbons: 2, group: 3, air: 100 })).toMatchObject({ flame: 1, oxygenNeeded: 3 });
  });
});

describe("reactions", () => {
  it("balances every one", () => {
    for (const id of CARBON_REACTION_ORDER) {
      if (id === "combustion") continue;
      const r = CARBON_REACTIONS[id];
      expect(sideAtoms(r.reactants), id).toEqual(sideAtoms(r.products));
    }
  });

  it("has the right gases and products", () => {
    const of = (reaction: CarbonSchoolParams["reaction"]) => derive({}, { reaction });
    expect(of("sodium").gas).toBe(1);
    expect(of("carbonate").gas).toBe(2);
    expect(of("substitution")).toMatchObject({ gas: 3, productSeries: 3 });
    expect(of("oxidation")).toMatchObject({ gas: 0, productSeries: 7 });
    expect(of("addition").productSeries).toBe(0);
    expect(of("dehydration")).toMatchObject({ productSeries: 1, gas: 4 });
    expect(of("esterification").productSeries).toBe(8);
    expect(of("saponification").productSeries).toBe(4);
    expect(of("combustion")).toMatchObject({ gas: 2, productSeries: 10 }); // CO₂, not an alkane
    expect(carbonEquationText(CARBON_REACTIONS.esterification)).toBe("CH₃COOH + CH₃CH₂OH → CH₃COOCH₂CH₃ + H₂O");
    expect(carbonEquationText(CARBON_REACTIONS.carbonate)).toBe("2CH₃COOH + Na₂CO₃ → 2CH₃COONa + H₂O + CO₂");
  });

  it("keeps every equation and line short enough for a phone", () => {
    for (const c of ALL_CHAINS) {
      const r = carbonReaction("combustion", carbonChainInfo(c));
      expect(carbonEquationText(r).length).toBeLessThanOrEqual(55);
      expect(r.title.length).toBeLessThanOrEqual(55);
    }
    for (const id of CARBON_REACTION_ORDER) {
      if (id === "combustion") continue;
      const r = CARBON_REACTIONS[id];
      for (const text of [carbonEquationText(r), r.title, r.condition, r.observe]) expect(text.length, text).toBeLessThanOrEqual(55);
    }
  });
});

describe("soap and hard water", () => {
  it("loses two soap ions to scum for each calcium ion", () => {
    expect(carbonWash(10, 3, false)).toMatchObject({ scum: 3, wasted: 6, free: 4, micelles: true, toLather: 8 });
    expect(carbonWash(4, 3, false)).toMatchObject({ scum: 2, wasted: 4, free: 0, micelles: false });
    expect(carbonWash(10, 3, true)).toMatchObject({ scum: 0, wasted: 0, free: 10, micelles: true, toLather: 2 });
    expect(carbonWash(2, 0, false).micelles).toBe(false); // not enough soap yet
    expect(carbonWash(6, 0, false).cleaning).toBe(100);
  });

  it("reports it through the model", () => {
    expect(derive({ soap: 10, hardness: 3 })).toMatchObject({ scum: 3, soapWasted: 6, freeSoap: 4, micelles: 1, cleaning: 50, soapToLather: 8 });
    expect(derive({ soap: 10, hardness: 3 }, { cleaner: "detergent" })).toMatchObject({ scum: 0, freeSoap: 10, cleaning: 100 });
  });
});

describe("model", () => {
  it("clamps variables to their ranges", () => {
    let s = model.setVariable(base, "carbons", 40, model.defaultParams);
    expect(s.carbons).toBe(10);
    s = model.setVariable(s, "bond", -3, model.defaultParams);
    expect(s.bond).toBe(0);
    s = model.setVariable(s, "group", 9, model.defaultParams);
    expect(s.group).toBe(6);
    s = model.setVariable(s, "air", 500, model.defaultParams);
    expect(s.air).toBe(150);
    s = model.setVariable(s, "soap", -1, model.defaultParams);
    expect(s.soap).toBe(0);
    s = model.setVariable(s, "hardness", 99, model.defaultParams);
    expect(s.hardness).toBe(6);
  });

  it("pours soap on Play, and gives only finite numbers", () => {
    expect(model.advance({ ...base, soap: 3 }, 2, model.defaultParams).soap).toBe(5);
    for (const c of ALL_CHAINS) {
      const r = derive(c);
      for (const key of model.outputs) {
        expect(Number.isFinite(r[key]), `${key} ${JSON.stringify(c)}`).toBe(true);
        expect(Object.is(r[key], -0), key).toBe(false);
      }
    }
  });
});
