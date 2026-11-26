import { describe, expect, it } from "vitest";
import {
  metalAcidDisplacementEquation,
  METALACID_COMPOUND_ORDER,
  METALACID_COMPOUNDS,
  METALACID_ELEMENT_ORDER,
  METALACID_LIQUID_ORDER,
  METALACID_METAL_ORDER,
  METALACID_METALS,
  METALACID_REDOX,
  METALACID_REDOX_ORDER,
  METALACID_SALT_ORDER,
  METALACID_SALTS,
  METALACID_SUBSTANCE_ORDER,
  metalAcidEquationText,
  metalAcidHydrogenEquation,
  metalAcidModel as model,
  metalAcidInLiquid,
  metalAcidWaterEquation,
  type MetalAcidEquation,
  type MetalAcidParams,
  type MetalAcidState,
} from "./metalacid";

const derive = (params: Partial<MetalAcidParams> = {}, state: Partial<MetalAcidState> = {}) =>
  model.derive({ time: 0, days: 0, ...state }, { ...model.defaultParams, ...params });

// ── A small atom counter, so every equation can be checked ──────────────────

const SUBS = "₀₁₂₃₄₅₆₇₈₉";

/** Reads a leading count: "2", "10", "½", "1½". */
function leadingNumber(text: string): { value: number; rest: string } {
  const match = /^(\d*)(½?)/.exec(text)!;
  const whole = match[1] ? Number(match[1]) : 0;
  const half = match[2] ? 0.5 : 0;
  const value = whole + half || 1;
  return { value, rest: text.slice(match[0].length) };
}

function addAtoms(formula: string, times: number, into: Map<string, number>) {
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
      if (i < formula.length && /[a-z]/.test(formula[i]!)) symbol += formula[i++];
      const n = readSub();
      const top = stack[stack.length - 1]!;
      top.set(symbol, (top.get(symbol) ?? 0) + n);
    } else throw new Error(`cannot read "${formula}" at ${i}`);
  }
  for (const [k, v] of stack[0]!) into.set(k, (into.get(k) ?? 0) + v * times);
}

/** Atoms on one side of "2Al + 3CuSO₄", hydrates and ½ included. */
function atoms(side: string): Record<string, number> {
  const into = new Map<string, number>();
  for (const raw of side.split(" + ")) {
    const { value, rest } = leadingNumber(raw.trim());
    const [main, ...hydrates] = rest.split("·");
    addAtoms(main!, value, into);
    for (const h of hydrates) {
      const water = leadingNumber(h);
      addAtoms(water.rest, value * water.value, into);
    }
  }
  return Object.fromEntries([...into.entries()].sort());
}

function expectBalanced(text: string) {
  const bare = text.replace(/\s*\(.*\)\s*$/, "");
  const [lhs, rhs] = bare.split(" → ");
  expect(rhs, text).toBeDefined();
  expect(atoms(lhs!), text).toEqual(atoms(rhs!));
}

const show = (eq: MetalAcidEquation | null) => (eq ? metalAcidEquationText(eq) : "");

describe("the atom counter itself", () => {
  it("reads brackets, hydrates and halves", () => {
    expect(atoms("Al₂(SO₄)₃")).toEqual({ Al: 2, O: 12, S: 3 });
    expect(atoms("2Na₂CO₃·10H₂O")).toEqual({ C: 2, H: 40, Na: 4, O: 26 });
    expect(atoms("CaSO₄·½H₂O + 1½H₂O")).toEqual({ Ca: 1, H: 4, O: 6, S: 1 });
  });
  it("catches an unbalanced equation", () => {
    expect(atoms("H₂ + O₂")).not.toEqual(atoms("H₂O"));
  });
});

describe("displacement: the more reactive metal wins", () => {
  it("writes the NCERT equations, balanced", () => {
    const m = METALACID_METALS;
    expect(metalAcidEquationText(metalAcidDisplacementEquation(m.iron, m.copper, "sulphate"))).toBe("Fe + CuSO₄ → FeSO₄ + Cu");
    expect(metalAcidEquationText(metalAcidDisplacementEquation(m.zinc, m.copper, "sulphate"))).toBe("Zn + CuSO₄ → ZnSO₄ + Cu");
    expect(metalAcidEquationText(metalAcidDisplacementEquation(m.aluminium, m.copper, "sulphate"))).toBe("2Al + 3CuSO₄ → Al₂(SO₄)₃ + 3Cu");
    expect(metalAcidEquationText(metalAcidDisplacementEquation(m.copper, m.silver, "nitrate"))).toBe("Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag");
    expect(metalAcidEquationText(metalAcidDisplacementEquation(m.aluminium, m.silver, "nitrate"))).toBe("Al + 3AgNO₃ → Al(NO₃)₃ + 3Ag");
    expect(metalAcidEquationText(metalAcidDisplacementEquation(m.aluminium, m.zinc, "sulphate"))).toBe("2Al + 3ZnSO₄ → Al₂(SO₄)₃ + 3Zn");
  });

  it("happens only when the strip is above the metal in the solution", () => {
    expect(derive({ metal: "iron", liquid: "cuso4" })).toMatchObject({ displaces: 1, reaction: 1 });
    expect(derive({ metal: "copper", liquid: "feso4" })).toMatchObject({ displaces: 0, reaction: 0 });
    expect(derive({ metal: "zinc", liquid: "feso4" }).displaces).toBe(1);
    expect(derive({ metal: "iron", liquid: "znso4" }).displaces).toBe(0);
    expect(derive({ metal: "copper", liquid: "agno3" }).displaces).toBe(1);
    expect(derive({ metal: "silver", liquid: "cuso4" }).displaces).toBe(0);
    expect(derive({ metal: "gold", liquid: "agno3" }).displaces).toBe(0);
    expect(derive({ metal: "zinc", liquid: "znso4" }).displaces).toBe(0);
  });

  it("fades the blue of copper sulphate as an iron nail turns brown", () => {
    // τ = 8 min: after 20 min, 1 − e^(−2.5) = 0.918 has reacted.
    const r = derive({ metal: "iron", liquid: "cuso4" }, { time: 20 });
    expect(r.progress).toBeCloseTo(0.9179, 4);
    expect(r.coating).toBeCloseTo(0.9179, 4);
    expect(r.blueness).toBeCloseTo(0.0821, 4);
    expect(r.greenness).toBeCloseTo(0.9179, 4);
    expect(derive({ metal: "copper", liquid: "feso4" }, { time: 20 })).toMatchObject({ progress: 0, coating: 0, blueness: 0, greenness: 1 });
  });

  it("turns silver nitrate blue when copper goes in", () => {
    expect(derive({ metal: "copper", liquid: "agno3" }, { time: 10 }).blueness).toBeCloseTo(1 - Math.exp(-1), 6);
  });

  it("has the top three metals react with the water instead", () => {
    const r = metalAcidInLiquid("sodium", "cuso4");
    expect(r.kind).toBe(3);
    expect(show(r.equation)).toBe("2Na + 2H₂O → 2NaOH + H₂");
    expect(derive({ metal: "sodium", liquid: "cuso4" })).toMatchObject({ displaces: 0, violent: 1 });
  });
});

describe("metals with acid and water", () => {
  it("gives hydrogen only for metals above hydrogen", () => {
    for (const id of METALACID_METAL_ORDER) {
      const r = derive({ metal: id, liquid: "hcl" });
      expect(r.givesHydrogen, id).toBe(r.aboveHydrogen);
    }
    expect(derive({ metal: "copper", liquid: "hcl" }).givesHydrogen).toBe(0);
    expect(derive({ metal: "zinc", liquid: "hcl" }).givesHydrogen).toBe(1);
  });

  it("writes metal + acid → salt + hydrogen", () => {
    expect(metalAcidEquationText(metalAcidHydrogenEquation(METALACID_METALS.zinc))).toBe("Zn + 2HCl → ZnCl₂ + H₂");
    expect(metalAcidEquationText(metalAcidHydrogenEquation(METALACID_METALS.aluminium))).toBe("2Al + 6HCl → 2AlCl₃ + 3H₂");
    expect(metalAcidEquationText(metalAcidHydrogenEquation(METALACID_METALS.sodium))).toBe("2Na + 2HCl → 2NaCl + H₂");
    expect(metalAcidEquationText(metalAcidHydrogenEquation(METALACID_METALS.iron))).toBe("Fe + 2HCl → FeCl₂ + H₂");
  });

  it("has only potassium, sodium and calcium react with cold water", () => {
    const reacting = METALACID_METAL_ORDER.filter((id) => derive({ metal: id, liquid: "water" }).reaction === 3);
    expect(reacting).toEqual(["potassium", "sodium", "calcium"]);
    expect(metalAcidEquationText(metalAcidWaterEquation(METALACID_METALS.calcium))).toBe("Ca + 2H₂O → Ca(OH)₂ + H₂");
    expect(metalAcidEquationText(metalAcidWaterEquation(METALACID_METALS.potassium))).toBe("2K + 2H₂O → 2KOH + H₂");
    expect(derive({ metal: "magnesium", liquid: "water" }).reaction).toBe(0);
  });

  it("balances every metal in every liquid", () => {
    for (const metal of METALACID_METAL_ORDER) {
      for (const liquid of METALACID_LIQUID_ORDER) {
        const r = metalAcidInLiquid(metal, liquid);
        if (r.equation) expectBalanced(show(r.equation));
        expect(r.note.length, `${metal} ${liquid}`).toBeLessThanOrEqual(55);
      }
    }
  });

  it("ranks the series K > Na > Ca > Mg > Al > Zn > Fe > Pb > Cu > Hg > Ag > Au", () => {
    const values = METALACID_METAL_ORDER.map((metal) => derive({ metal }).reactivity);
    expect(values).toEqual([13, 12, 11, 10, 9, 8, 7, 6, 4, 3, 2, 1]);
  });
});

describe("corrosion", () => {
  it("rusts iron half way in about five days in moist air", () => {
    // τ = 7 days: 1 − e^(−5/7) = 0.5105.
    expect(derive({ metal: "iron" }, { days: 5 }).corrosion).toBeCloseTo(0.5105, 4);
    expect(derive({ metal: "iron" }, { days: 4 }).corrosion).toBeCloseTo(0.4353, 4);
  });

  it("gives each metal its own coat, and gold none", () => {
    expect(derive({ metal: "iron" })).toMatchObject({ coatingColour: 1, layerStays: 0 });
    expect(derive({ metal: "copper" }).coatingColour).toBe(2);
    expect(derive({ metal: "silver" }).coatingColour).toBe(3);
    expect(derive({ metal: "aluminium" })).toMatchObject({ coatingColour: 4, layerStays: 1 });
    expect(derive({ metal: "gold" }, { days: 100 })).toMatchObject({ corrosion: 0, coatingColour: 0 });
  });

  it("is faster for iron than silver, and silver than copper", () => {
    const at = (metal: MetalAcidParams["metal"]) => derive({ metal }, { days: 30 }).corrosion;
    expect(at("iron")).toBeGreaterThan(at("silver"));
    expect(at("silver")).toBeGreaterThan(at("copper"));
  });
});

describe("oxidation and reduction", () => {
  it("names what is oxidised and what is reduced", () => {
    // CuO + H₂ → Cu + H₂O: copper oxide loses oxygen, hydrogen gains it.
    expect(derive({ redox: "copper-oxide" })).toMatchObject({ oxidised: 1, reduced: 0, oxidisingAgent: 0, reducingAgent: 1, oxidisedBy: 0, reducedBy: 0 });
    // H₂S + Cl₂ → 2HCl + S: hydrogen sulphide loses hydrogen, chlorine gains it.
    expect(derive({ redox: "hydrogen-sulphide" })).toMatchObject({ oxidised: 8, reduced: 9, oxidisedBy: 1, reducedBy: 1 });
    expect(derive({ redox: "thermit" })).toMatchObject({ oxidised: 5, reduced: 4 });
    expect(derive({ redox: "manganese-dioxide" })).toMatchObject({ oxidised: 7, reduced: 6, oxidisedBy: 1, reducedBy: 0 });
  });

  it("balances every redox equation", () => {
    for (const id of METALACID_REDOX_ORDER) expectBalanced(metalAcidEquationText(METALACID_REDOX[id].equation));
    expect(metalAcidEquationText(METALACID_REDOX["manganese-dioxide"].equation)).toBe("MnO₂ + 4HCl → MnCl₂ + 2H₂O + Cl₂");
  });

  it("goes on as the tube is heated", () => {
    expect(derive({}, { time: 2 }).redoxProgress).toBeCloseTo(1 - Math.exp(-1), 6);
  });
});

describe("acids with metals, carbonates, an oxide and a base", () => {
  it("balances every equation", () => {
    for (const id of METALACID_COMPOUND_ORDER) expectBalanced(metalAcidEquationText(METALACID_COMPOUNDS[id].equation));
  });

  it("starts at pH 1 and rises as the acid is used up", () => {
    // 10 mmol HCl in 100 mL is 0.1 mol/L.
    expect(derive({ compound: "marble" }).beakerPH).toBeCloseTo(1, 10);
    // 4 mmol CaCO₃ uses 8 mmol HCl: 2 mmol left in 100 mL → 0.02 mol/L → pH 1.70.
    const end = derive({ compound: "marble" }, { time: 30 });
    expect(end.acidLeft).toBeCloseTo(2, 3);
    expect(end.beakerPH).toBeCloseTo(1.699, 3);
    // 4 mmol NaHCO₃ uses 4 mmol: 6 left → pH 1.22.
    expect(derive({ compound: "baking-soda" }, { time: 30 }).beakerPH).toBeCloseTo(1.222, 3);
  });

  it("passes the gas tests: limewater milky for carbon dioxide, a pop for hydrogen", () => {
    expect(derive({ compound: "marble" }, { time: 0 }).gasTest).toBe(0);
    expect(derive({ compound: "marble" }, { time: 1 }).gasTest).toBe(2);
    expect(derive({ compound: "baking-soda" }, { time: 1 }).gasTest).toBe(2);
    expect(derive({ compound: "zinc" }, { time: 1 }).gasTest).toBe(1);
    expect(derive({ compound: "copper-oxide" }, { time: 10 })).toMatchObject({ gasTest: 0, acidGas: 0, bubbling: 0 });
    expect(derive({ compound: "caustic-soda" }, { time: 10 }).gasTest).toBe(0);
  });

  it("bubbles less as the solid runs out", () => {
    expect(derive({ compound: "marble" }, { time: 1 }).bubbling).toBeGreaterThan(derive({ compound: "marble" }, { time: 5 }).bubbling);
  });
});

describe("the pH scale and indicators", () => {
  it("reads typical pH values and sorts acid, neutral and base", () => {
    expect(derive({ substance: "lemon" })).toMatchObject({ pH: 2.2, nature: 0 });
    expect(derive({ substance: "water" })).toMatchObject({ pH: 7, nature: 1 });
    expect(derive({ substance: "salt-water" }).nature).toBe(1);
    expect(derive({ substance: "magnesia" })).toMatchObject({ pH: 10, nature: 2 });
    expect(derive({ substance: "blood" }).nature).toBe(2);
  });

  it("orders the substances from most acidic to most basic", () => {
    const values = METALACID_SUBSTANCE_ORDER.map((substance) => derive({ substance }).pH);
    for (let i = 1; i < values.length; i++) expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]!);
  });

  it("colours the indicators", () => {
    expect(derive({ substance: "lemon" })).toMatchObject({ litmus: 0, phenolphthalein: 0, methylOrange: 0, turmeric: 0 });
    expect(derive({ substance: "baking-soda" })).toMatchObject({ litmus: 2, phenolphthalein: 1, methylOrange: 2, turmeric: 1 });
    expect(derive({ substance: "water" })).toMatchObject({ litmus: 1, phenolphthalein: 0, methylOrange: 2, turmeric: 0 });
    // Blood is just above 7: too little for phenolphthalein or turmeric to change.
    expect(derive({ substance: "blood" })).toMatchObject({ litmus: 1, phenolphthalein: 0, turmeric: 0 });
    expect(derive({ substance: "orange" }).methylOrange).toBe(1);
  });
});

describe("salts", () => {
  it("counts the water of crystallisation", () => {
    expect(derive({ salt: "washing-soda" }).water).toBe(10);
    expect(derive({ salt: "blue-vitriol" }).water).toBe(5);
    expect(derive({ salt: "gypsum" }).water).toBe(2);
    expect(derive({ salt: "plaster" }).water).toBe(0.5);
    expect(derive({ salt: "common-salt" }).water).toBe(0);
  });

  it("gives each salt solution its nature", () => {
    expect(derive({ salt: "common-salt" }).saltNature).toBe(1);
    expect(derive({ salt: "baking-soda" }).saltNature).toBe(2);
    expect(derive({ salt: "ammonium-chloride" }).saltNature).toBe(0);
  });

  it("balances every salt's equation", () => {
    for (const id of METALACID_SALT_ORDER) expectBalanced(METALACID_SALTS[id].reaction);
  });
});

describe("metal or non-metal", () => {
  it("knows the exceptions", () => {
    expect(derive({ element: "mercury" })).toMatchObject({ isMetal: 1, physicalState: 1, malleable: 0 });
    expect(derive({ element: "graphite" })).toMatchObject({ isMetal: 0, conducts: 1 });
    expect(derive({ element: "iodine" })).toMatchObject({ isMetal: 0, lustre: 1 });
    expect(derive({ element: "sodium" })).toMatchObject({ isMetal: 1, cutWithKnife: 1 });
    expect(derive({ element: "bromine" })).toMatchObject({ isMetal: 0, physicalState: 1 });
  });

  it("makes basic oxides of metals and acidic oxides of non-metals", () => {
    expect(derive({ element: "copper" }).oxideNature).toBe(1);
    expect(derive({ element: "sulphur" }).oxideNature).toBe(0);
    expect(derive({ element: "aluminium" }).oxideNature).toBe(2);
  });
});

describe("the model contract", () => {
  it("clamps the clocks", () => {
    expect(model.setVariable({ time: 0, days: 0 }, "time", 99, model.defaultParams).time).toBe(30);
    expect(model.setVariable({ time: 0, days: 0 }, "days", -5, model.defaultParams).days).toBe(0);
    expect(model.step({ time: 0, days: 0 }, model.defaultParams, -1)).toEqual({ time: 0, days: 0 });
    expect(model.advance({ time: 29.5, days: 99 }, 1, model.defaultParams)).toEqual({ time: 30, days: 100 });
  });

  it("gives a finite number for every output, everywhere", () => {
    for (const metal of METALACID_METAL_ORDER) {
      for (const liquid of METALACID_LIQUID_ORDER) {
        for (const time of [0, 30]) {
          const r = derive({ metal, liquid, element: METALACID_ELEMENT_ORDER[time ? 11 : 0] }, { time, days: time * 3 });
          for (const key of model.outputs) {
            expect(Number.isFinite(r[key]), `${metal} ${liquid} ${key}`).toBe(true);
            expect(Object.is(r[key], -0), `${key} is −0`).toBe(false);
          }
        }
      }
    }
  });
});
