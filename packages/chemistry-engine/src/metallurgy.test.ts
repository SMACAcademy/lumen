import { describe, expect, it } from "vitest";
import { METALACID_SERIES } from "./metalacid";
import {
  MET_ALLOY_ORDER,
  MET_ALLOYS,
  MET_EQUATIONS,
  MET_FORM_ORDER,
  MET_IONIC,
  MET_IONIC_ORDER,
  MET_ORE_ORDER,
  MET_ORES,
  metAlloyPercents,
  metIonShells,
  metIonText,
  metMethodForMetal,
  metOuter,
  metShellText,
  metallurgyModel as model,
  type MetallurgyParams,
  type MetallurgyState,
} from "./metallurgy";

const derive = (params: Partial<MetallurgyParams> = {}, state: Partial<MetallurgyState> = {}) =>
  model.derive({ ...model.initialize(model.defaultParams), ...state }, { ...model.defaultParams, ...params });

// ── A small atom and charge counter, so every equation can be checked ───────

const SUBS = "₀₁₂₃₄₅₆₇₈₉";
const SUPS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

interface Tally {
  atoms: Map<string, number>;
  charge: number;
}

/** Counts one term such as "2Cu₂O", "Ca(OH)₂", "Mg²⁺" or "2e⁻" into the tally. */
function addTerm(term: string, into: Tally) {
  const coefficient = /^(\d*)/.exec(term)![1];
  const times = coefficient ? Number(coefficient) : 1;
  const formula = term.slice(coefficient!.length);
  if (formula === "e⁻") {
    into.charge -= times;
    return;
  }
  const stack: Map<string, number>[] = [new Map()];
  let i = 0;
  const readSub = () => {
    let digits = "";
    while (i < formula.length && SUBS.includes(formula[i]!)) digits += SUBS.indexOf(formula[i++]!);
    return digits ? Number(digits) : 1;
  };
  while (i < formula.length) {
    const ch = formula[i]!;
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
      let symbol = ch;
      i++;
      while (i < formula.length && /[a-z]/.test(formula[i]!)) symbol += formula[i++];
      const n = readSub();
      const top = stack[stack.length - 1]!;
      top.set(symbol, (top.get(symbol) ?? 0) + n);
    } else if (SUPS.includes(ch) || ch === "⁺" || ch === "⁻") {
      let digits = "";
      while (i < formula.length && SUPS.includes(formula[i]!)) digits += SUPS.indexOf(formula[i++]!);
      const sign = formula[i++] === "⁺" ? 1 : -1;
      into.charge += sign * (digits ? Number(digits) : 1) * times;
    } else {
      throw new Error(`cannot read "${ch}" in ${term}`);
    }
  }
  for (const [k, v] of stack[0]!) into.atoms.set(k, (into.atoms.get(k) ?? 0) + v * times);
}

function tally(side: string): { atoms: Record<string, number>; charge: number } {
  const t: Tally = { atoms: new Map(), charge: 0 };
  for (const term of side.split(" + ")) addTerm(term.trim(), t);
  return { atoms: Object.fromEntries([...t.atoms].sort(([a], [b]) => a.localeCompare(b))), charge: t.charge };
}

function expectBalanced(equation: string) {
  const [lhs, rhs] = equation.split(" → ");
  expect(rhs, equation).toBeDefined();
  expect(tally(lhs!), equation).toEqual(tally(rhs!));
}

describe("the counter itself", () => {
  it("reads formulae, brackets and charges", () => {
    expect(tally("Ca(OH)₂")).toEqual({ atoms: { Ca: 1, H: 2, O: 2 }, charge: 0 });
    expect(tally("2Cu₂O + Cu₂S")).toEqual({ atoms: { Cu: 6, O: 2, S: 1 }, charge: 0 });
    expect(tally("Mg²⁺ + 2e⁻")).toEqual({ atoms: { Mg: 1 }, charge: 0 });
    expect(tally("2Cl⁻")).toEqual({ atoms: { Cl: 2 }, charge: -2 });
  });
  it("catches an unbalanced equation", () => {
    expect(tally("ZnS + O₂")).not.toEqual(tally("ZnO + SO₂"));
    expect(tally("Cu")).not.toEqual(tally("Cu²⁺ + e⁻"));
  });
});

describe("equations", () => {
  it.each(Object.entries(MET_EQUATIONS))("%s is balanced in atoms and charge", (_id, equation) => {
    expectBalanced(equation);
  });

  it("writes NCERT's equations", () => {
    expect(MET_EQUATIONS["roast-zns"]).toBe("2ZnS + 3O₂ → 2ZnO + 2SO₂");
    expect(MET_EQUATIONS["calcine-znco3"]).toBe("ZnCO₃ → ZnO + CO₂");
    expect(MET_EQUATIONS["reduce-zno"]).toBe("ZnO + C → Zn + CO");
    expect(MET_EQUATIONS["roast-hgs"]).toBe("2HgS + 3O₂ → 2HgO + 2SO₂");
    expect(MET_EQUATIONS["heat-hgo"]).toBe("2HgO → 2Hg + O₂");
    expect(MET_EQUATIONS["self-cu"]).toBe("2Cu₂O + Cu₂S → 6Cu + SO₂");
    expect(MET_EQUATIONS.thermit).toBe("Fe₂O₃ + 2Al → 2Fe + Al₂O₃");
  });
});

describe("giving electrons", () => {
  it("gives the shells of atoms and ions", () => {
    expect(metShellText(metIonShells("Na", 1))).toBe("2,8");
    expect(metShellText(metIonShells("Cl", -1))).toBe("2,8,8");
    expect(metShellText(metIonShells("Mg", 2))).toBe("2,8");
    expect(metShellText(metIonShells("O", -2))).toBe("2,8");
    expect(metShellText(metIonShells("Ca", 2))).toBe("2,8,8");
    expect(metShellText(metIonShells("Li", 1))).toBe("2");
    expect(metIonText("Mg", 2)).toBe("Mg²⁺");
    expect(metIonText("Cl", -1)).toBe("Cl⁻");
    expect(metIonText("O", -2)).toBe("O²⁻");
  });

  it("balances the electrons: what the metal gives, the non-metals take", () => {
    for (const id of MET_IONIC_ORDER) {
      const c = MET_IONIC[id];
      expect(metOuter(c.metal), id).toBe(c.nonMetals * (8 - metOuter(c.nonMetal)));
      // Every ion ends with a full outer shell of 8 (or 2, for Li⁺).
      const metalIon = metIonShells(c.metal, metOuter(c.metal));
      expect([2, 8], id).toContain(metalIon[metalIon.length - 1]);
      expect(metIonShells(c.nonMetal, -(8 - metOuter(c.nonMetal))).at(-1), id).toBe(8);
      expectBalanced(MET_EQUATIONS[c.formation]);
    }
  });

  it("moves sodium's one electron to chlorine", () => {
    expect(derive({ compound: "nacl" }, { transfer: 0 })).toMatchObject({ valency: 1, gainEach: 1, electronsTotal: 1, electronsMoved: 0, metalCharge: 0, ionsFormed: 0 });
    expect(derive({ compound: "nacl" }, { transfer: 1 })).toMatchObject({ electronsMoved: 1, metalCharge: 1, nonMetalCharge: 1, ionsFormed: 1 });
  });

  it("moves magnesium's two electrons one at a time, to one oxygen or two chlorines", () => {
    expect(derive({ compound: "mgcl2" }, { transfer: 0.5 })).toMatchObject({ electronsTotal: 2, electronsMoved: 1, metalCharge: 1, ionsFormed: 0, nonMetalAtoms: 2, gainEach: 1 });
    expect(derive({ compound: "mgcl2" }, { transfer: 1 })).toMatchObject({ electronsMoved: 2, metalCharge: 2, ionsFormed: 1 });
    expect(derive({ compound: "mgo" }, { transfer: 1 })).toMatchObject({ nonMetalAtoms: 1, gainEach: 2, metalCharge: 2, nonMetalCharge: 2 });
  });

  it("keeps the total charge zero all the way", () => {
    for (const compound of MET_IONIC_ORDER) {
      for (const transfer of [0, 0.3, 0.5, 0.9, 1]) {
        expect(Object.is(derive({ compound }, { transfer }).totalCharge, 0)).toBe(true);
      }
    }
  });

  it("uses NCERT's melting and boiling points, and oxides melt far higher", () => {
    expect(derive({ compound: "nacl" })).toMatchObject({ meltingPoint: 1074, boilingPoint: 1686 });
    expect(derive({ compound: "cacl2" })).toMatchObject({ meltingPoint: 1045, boilingPoint: 1900 });
    expect(derive({ compound: "cao" })).toMatchObject({ meltingPoint: 2850, boilingPoint: 3120 });
    expect(derive({ compound: "mgcl2" })).toMatchObject({ meltingPoint: 981, boilingPoint: 1685 });
    expect(derive({ compound: "licl" })).toMatchObject({ meltingPoint: 887, boilingPoint: 1600 });
    for (const id of MET_IONIC_ORDER) {
      const r = derive({ compound: id });
      expect(Number(r.boilingPoint)).toBeGreaterThan(Number(r.meltingPoint));
      expect(Number(r.meltingPoint) > 2000, id).toBe(MET_IONIC[id].nonMetal === "O");
    }
  });

  it("conducts only when the ions can move", () => {
    for (const compound of MET_IONIC_ORDER) {
      expect(derive({ compound, form: "solid" }).conducts).toBe(0);
      expect(derive({ compound, form: "molten" }).conducts).toBe(1);
      expect(derive({ compound, form: "kerosene" }).conducts).toBe(0);
    }
    expect(derive({ compound: "nacl", form: "water" }).conducts).toBe(1);
    expect(derive({ compound: "mgo", form: "water" }).conducts).toBe(0);
    expect(derive({ compound: "nacl" }).inKerosene).toBe(0);
    expect(MET_FORM_ORDER).toHaveLength(4);
  });
});

describe("extracting metals", () => {
  it("balances every route", () => {
    for (const id of MET_ORE_ORDER) {
      for (const stage of MET_ORES[id].stages) {
        if (stage.equation) expectBalanced(MET_EQUATIONS[stage.equation]);
        expect(stage.equation ?? stage.note, `${id}: ${stage.title}`).toBeTruthy();
      }
    }
  });

  it("matches each mineral's formula to its atoms", () => {
    for (const id of MET_ORE_ORDER) {
      const ore = MET_ORES[id];
      expect(tally(ore.mineral).atoms, id).toEqual(Object.fromEntries(Object.entries(ore.composition).sort(([a], [b]) => a.localeCompare(b))));
    }
  });

  it("picks the route the reactivity series says", () => {
    for (const id of MET_ORE_ORDER) {
      const r = derive({ ore: id });
      if (id === "thermit") expect(r.method).toBe(4);
      else expect(r.method, id).toBe(r.seriesMethod);
    }
    expect(metMethodForMetal("K")).toBe(0);
    expect(metMethodForMetal("Al")).toBe(0);
    expect(metMethodForMetal("Zn")).toBe(1);
    expect(metMethodForMetal("Pb")).toBe(1);
    expect(metMethodForMetal("Cu")).toBe(2);
    expect(metMethodForMetal("Hg")).toBe(2);
    expect(metMethodForMetal("Au")).toBe(3);
    expect(derive({ ore: "rock-salt" }).reactivity).toBe(METALACID_SERIES.length - 1);
    expect(derive({ ore: "native-gold" }).reactivity).toBe(1);
  });

  it("gives sulphur dioxide when a sulphide is roasted, carbon dioxide when a carbonate is calcined", () => {
    for (const id of MET_ORE_ORDER) {
      const ore = MET_ORES[id];
      expect(ore.firstGas, id).toBe(ore.kind === 2 ? 1 : ore.kind === 3 ? 2 : 0);
    }
  });

  it("works out the metal in each mineral from school atomic masses", () => {
    expect(derive({ ore: "haematite" }).metalPercent).toBeCloseTo(70, 6);
    expect(derive({ ore: "zinc-blende" }).metalPercent).toBeCloseTo((100 * 65) / 97, 6);
    expect(derive({ ore: "calamine" }).metalPercent).toBeCloseTo(52, 6);
    expect(derive({ ore: "rock-salt" }).metalPercent).toBeCloseTo((100 * 23) / 58.5, 6);
    expect(derive({ ore: "copper-glance" }).metalPercent).toBeCloseTo((100 * 127) / 159, 6);
    expect(derive({ ore: "native-gold" }).metalPercent).toBe(100);
  });

  it("walks through the stages", () => {
    const at = (stage: number, ore: MetallurgyParams["ore"] = "zinc-blende") => derive({ ore }, { stage });
    expect(at(0)).toMatchObject({ stageIndex: 0, gangueLeft: 1, metalFormed: 0, refined: 0 });
    expect(at(1)).toMatchObject({ stageIndex: 1, gangueLeft: 0, metalFormed: 0 });
    expect(at(2.5)).toMatchObject({ stageIndex: 2, metalFormed: 0.5 });
    expect(at(4)).toMatchObject({ stageIndex: 3, metalFormed: 1, refined: 1 });
    expect(at(4, "haematite")).toMatchObject({ refined: 0, stageSkipped: 1 });
    expect(at(1.5, "haematite").stageSkipped).toBe(1);
    expect(at(2, "native-gold").metalFormed).toBe(1);
    expect(at(3, "native-gold").metalFormed).toBe(1);
    expect(at(0.5, "thermit").gangueLeft).toBe(0);
  });
});

describe("alloys and carats", () => {
  it("adds every alloy up to 100%", () => {
    for (const id of MET_ALLOY_ORDER) {
      const sum = Object.values(metAlloyPercents(MET_ALLOYS[id])).reduce((a, b) => a + b, 0);
      expect(sum, id).toBeCloseTo(100, 9);
    }
  });

  it("knows what each alloy is made of", () => {
    expect(derive({ alloy: "brass" })).toMatchObject({ copperPercent: 70, zincPercent: 30, tinPercent: 0, alloyMetals: 2 });
    expect(derive({ alloy: "bronze" })).toMatchObject({ copperPercent: 90, tinPercent: 10 });
    expect(derive({ alloy: "solder" })).toMatchObject({ leadPercent: 37, tinPercent: 63 });
    expect(derive({ alloy: "stainless" })).toMatchObject({ ironPercent: 74, chromiumPercent: 18, nickelPercent: 8, alloyMetals: 3, rusts: 0 });
    expect(derive({ alloy: "steel" })).toMatchObject({ hasNonMetal: 1, rusts: 1, alloyMetals: 1 });
    expect(derive({ alloy: "steel" }).carbonPercent).toBeCloseTo(0.05, 9);
    expect(derive({ alloy: "gold22" }).alloyGoldPercent).toBeCloseTo((100 * 22) / 24, 9);
    expect(MET_ALLOYS.solder.note).toBe("Melts at 456 K; tin 505 K, lead 601 K");
  });

  it("counts gold in 24 parts", () => {
    expect(derive({}, { carat: 24 })).toMatchObject({ goldPercent: 100, otherParts: 0 });
    expect(derive({}, { carat: 18 })).toMatchObject({ goldPercent: 75, otherParts: 6 });
    expect(derive({}, { carat: 22 }).goldPercent).toBeCloseTo(91.6667, 3);
  });
});

describe("the model", () => {
  it("clamps what it is given", () => {
    const s = model.initialize(model.defaultParams);
    expect(model.setVariable(s, "transfer", 3, model.defaultParams).transfer).toBe(1);
    expect(model.setVariable(s, "stage", -2, model.defaultParams).stage).toBe(0);
    expect(model.setVariable(s, "carat", 40, model.defaultParams).carat).toBe(24);
    expect(model.setVariable(s, "carat", 0, model.defaultParams).carat).toBe(1);
    expect(model.setVariable(s, "nope", 3, model.defaultParams)).toBe(s);
  });

  it("plays and steps", () => {
    const s = model.initialize(model.defaultParams);
    const later = model.advance(s, 1, model.defaultParams);
    expect(later.transfer).toBeCloseTo(0.5, 9);
    expect(later.stage).toBeCloseTo(0.5, 9);
    expect(model.advance(later, 100, model.defaultParams)).toMatchObject({ transfer: 1, stage: 4, carat: 22 });
    expect(model.step(s, model.defaultParams, 1)).toMatchObject({ transfer: 0.25, stage: 1, carat: 23 });
  });

  it("gives finite numbers for every output, in every case", () => {
    for (const compound of MET_IONIC_ORDER)
      for (const form of MET_FORM_ORDER)
        for (const ore of MET_ORE_ORDER)
          for (const alloy of MET_ALLOY_ORDER)
            for (const stage of [0, 2.5, 4]) {
              const r = derive({ compound, form, ore, alloy }, { stage, transfer: stage / 4, carat: 1 + stage * 5 });
              for (const key of model.outputs) expect(Number.isFinite(r[key]), `${key}`).toBe(true);
            }
  });

  it("falls back on unknown choices", () => {
    const r = model.derive(model.initialize(model.defaultParams), { compound: "x", form: "y", ore: "z", alloy: "w" } as unknown as MetallurgyParams);
    expect(r).toMatchObject({ compound: 0, form: 0, ore: MET_ORE_ORDER.indexOf("zinc-blende"), alloy: 0 });
  });
});
