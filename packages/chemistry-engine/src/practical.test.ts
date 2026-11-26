import { describe, expect, it } from "vitest";
import {
  PRACTICAL_COMPOUND_ORDER,
  PRACTICAL_FUSION_TEST_ORDER,
  PRACTICAL_GROUP_TEST_ORDER,
  PRACTICAL_OBSERVATIONS as OBS,
  PRACTICAL_ORGANIC_ORDER,
  PRACTICAL_REAGENT_ORDER,
  PRACTICAL_SALT_ORDER,
  PRACTICAL_SALTS,
  PRACTICAL_TITRATIONS,
  practicalConcordant,
  practicalEquivalence,
  practicalModel as model,
  type PracticalParams,
  type PracticalState,
} from "./practical";

const base = model.initialize(model.defaultParams);
const derive = (params: Partial<PracticalParams> = {}, state: Partial<PracticalState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const text = (code: number) => OBS[code]!.text;

describe("titration arithmetic, worked by hand", () => {
  it("HCl against NaOH: 10.0 mL of 0.1 M HCl needs 10.0 mL of 0.1 M NaOH", () => {
    // 1 × 0.1 × 10 = 1 × 0.1 × V  →  V = 10.0 mL
    expect(derive({ titration: "hcl-naoh" }, { strength: 0.1 }).equivalence).toBeCloseTo(10, 9);
    // 0.125 M NaOH: V = 1/0.125 = 8.0 mL
    expect(derive({ titration: "hcl-naoh" }, { strength: 0.125 }).equivalence).toBeCloseTo(8, 9);
  });

  it("oxalic acid is dibasic: 10.0 mL of 0.1 M needs 25.0 mL of 0.08 M NaOH", () => {
    // 2 × 0.1 × 10 = 1 × 0.08 × V  →  V = 2/0.08 = 25.0 mL
    const r = derive({ titration: "oxalic-naoh" }, { strength: 0.08, added: 25 });
    expect(r.equivalence).toBeCloseTo(25, 9);
    expect(r.foundMolarity).toBeCloseTo(0.08, 9);
    expect(r.gramsPerLitre).toBeCloseTo(3.2, 9); // 0.08 × 40
    expect(r.flaskNormality).toBeCloseTo(0.2, 9);
  });

  it("KMnO₄ against oxalic acid: 5 M₁V₁ = 2 M₂V₂", () => {
    // 2MnO₄⁻ : 5C₂O₄²⁻. 10.0 mL of 0.05 M oxalic acid with 0.016 M KMnO₄:
    // 5 × 0.016 × V = 2 × 0.05 × 10 = 1  →  V = 12.5 mL
    const r = derive({ titration: "kmno4-oxalic" }, { strength: 0.016, added: 12.5 });
    expect(r.equivalence).toBeCloseTo(12.5, 9);
    expect(r.foundMolarity).toBeCloseTo(0.016, 9);
    expect(r.selfIndicator).toBe(1);
    expect(r.gramsPerLitre).toBeCloseTo(2.528, 9); // 0.016 × 158
  });

  it("KMnO₄ against Mohr's salt: 5 M₁V₁ = 1 M₂V₂", () => {
    // MnO₄⁻ : 5Fe²⁺. 10.0 mL of 0.05 M Fe²⁺ with 0.01 M KMnO₄: 5 × 0.01 × V = 0.5  →  V = 10.0 mL
    expect(derive({ titration: "kmno4-mohr" }, { strength: 0.01 }).equivalence).toBeCloseTo(10, 9);
    // 0.02 M KMnO₄ needs half as much
    expect(derive({ titration: "kmno4-mohr" }, { strength: 0.02 }).equivalence).toBeCloseTo(5, 9);
  });

  it("agrees with the mole ratio of each balanced equation", () => {
    for (const t of Object.values(PRACTICAL_TITRATIONS)) {
      const V = practicalEquivalence(t, 0.04);
      // moles of flask solute × nFlask = moles of burette solute × nBurette
      expect(t.flaskMolarity * 10 * t.nFlask).toBeCloseTo(0.04 * V * t.nBurette, 12);
    }
  });

  it("reads the burette: final = initial + titre", () => {
    const r = derive({ titration: "oxalic-naoh" }, { initial: 1.2, added: 20 });
    expect(r.finalReading).toBeCloseTo(21.2, 9);
    expect(r.titre).toBeCloseTo(20, 9);
  });

  it("turns the flask pale pink at the end point, and deep pink past it", () => {
    const at = (added: number) => derive({ titration: "hcl-naoh" }, { strength: 0.1, added });
    expect(at(9.9)).toMatchObject({ flaskColour: 0, atEndPoint: 0, overshoot: 0 });
    expect(at(10)).toMatchObject({ flaskColour: 1, atEndPoint: 1 });
    expect(at(10.1)).toMatchObject({ flaskColour: 1, atEndPoint: 1 });
    expect(at(10.5)).toMatchObject({ flaskColour: 2, atEndPoint: 0 });
    expect(at(10.5).overshoot).toBeCloseTo(0.5, 9);
  });

  it("calls titres concordant only when they agree within 0.1 mL", () => {
    expect(practicalConcordant([12.3, 12.4, 12.3])).toBe(true);
    expect(practicalConcordant([15.1, 15.1, 15.1])).toBe(true);
    expect(practicalConcordant([12.3, 12.8, 12.4])).toBe(false);
  });

  it("clamps every control and plays the tap", () => {
    expect(model.setVariable(base, "added", 99, model.defaultParams).added).toBe(40);
    expect(model.setVariable(base, "strength", 0, model.defaultParams).strength).toBe(0.005);
    expect(model.setVariable(base, "stage", 6.4, model.defaultParams).stage).toBe(6);
    expect(model.setVariable(base, "saltGuess", -3, model.defaultParams).saltGuess).toBe(0);
    expect(model.advance(base, 2, model.defaultParams).added).toBeCloseTo(2, 9);
    expect(model.step(base, model.defaultParams, 1).added).toBeCloseTo(0.1, 9);
  });
});

describe("salt analysis: the table, row by row", () => {
  // salt → [flame, dil H₂SO₄, AgNO₃, BaCl₂, brown ring], then the scheme's group.
  const TABLE: Record<string, [string, string, string, string, string, number]> = {
    nh4cl: ["No characteristic flame colour", "No gas with dil H₂SO₄", "White ppt of AgCl, soluble in NH₄OH", "No precipitate with BaCl₂", "No brown ring", 0],
    pbno3: ["No characteristic flame colour", "No gas with dil H₂SO₄", "No precipitate with AgNO₃", "No precipitate with BaCl₂", "Brown ring where the two layers meet", 1],
    cuso4: ["Blue-green flame", "No gas with dil H₂SO₄", "No precipitate with AgNO₃", "White ppt of BaSO₄, insoluble in conc HCl", "No brown ring", 2],
    fecl3: ["No characteristic flame colour", "No gas with dil H₂SO₄", "White ppt of AgCl, soluble in NH₄OH", "No precipitate with BaCl₂", "No brown ring", 3],
    al2so43: ["No characteristic flame colour", "No gas with dil H₂SO₄", "No precipitate with AgNO₃", "White ppt of BaSO₄, insoluble in conc HCl", "No brown ring", 3],
    znco3: ["No characteristic flame colour", "Brisk effervescence; CO₂ turns limewater milky", "No precipitate with AgNO₃", "No precipitate with BaCl₂", "No brown ring", 4],
    bacl2: ["Apple-green flame", "No gas with dil H₂SO₄", "White ppt of AgCl, soluble in NH₄OH", "No precipitate with BaCl₂", "No brown ring", 5],
    srno3: ["Crimson-red flame", "No gas with dil H₂SO₄", "No precipitate with AgNO₃", "No precipitate with BaCl₂", "Brown ring where the two layers meet", 5],
    caco3: ["Brick-red flame", "Brisk effervescence; CO₂ turns limewater milky", "No precipitate with AgNO₃", "No precipitate with BaCl₂", "No brown ring", 5],
    mgso4: ["No characteristic flame colour", "No gas with dil H₂SO₄", "No precipitate with AgNO₃", "White ppt of BaSO₄, insoluble in conc HCl", "No brown ring", 6],
    na2co3: ["Golden-yellow flame", "Brisk effervescence; CO₂ turns limewater milky", "No precipitate with AgNO₃", "No precipitate with BaCl₂", "No brown ring", 7],
    kno3: ["Lilac flame (pink-violet through blue glass)", "No gas with dil H₂SO₄", "No precipitate with AgNO₃", "No precipitate with BaCl₂", "Brown ring where the two layers meet", 7],
  };

  it("covers every salt", () => {
    expect(Object.keys(TABLE).sort()).toEqual([...PRACTICAL_SALT_ORDER].sort());
  });

  it.each(Object.entries(TABLE))("%s gives the lab manual's results", (salt, row) => {
    PRACTICAL_REAGENT_ORDER.forEach((reagent, i) => {
      expect(text(derive({ salt: salt as PracticalParams["salt"], reagent }).saltObservation), `${salt} ${reagent}`).toBe(row[i]);
    });
    expect(derive({ salt: salt as PracticalParams["salt"] }).cationGroup).toBe(row[5]);
  });

  // The precipitate each group reagent gives, stage by stage.
  const GROUP: Record<string, string> = {
    nh4cl: "NH₃ given off: moist red litmus turns blue",
    pbno3: "White ppt of PbCl₂ (dissolves in hot water)",
    cuso4: "Black ppt of CuS",
    fecl3: "Reddish-brown ppt of Fe(OH)₃",
    al2so43: "White gelatinous ppt of Al(OH)₃",
    znco3: "Dirty-white ppt of ZnS",
    bacl2: "White ppt of BaCO₃",
    srno3: "White ppt of SrCO₃",
    caco3: "White ppt of CaCO₃",
    mgso4: "White crystalline ppt of Mg(NH₄)PO₄",
  };

  it("brings each cation down at its own group and nowhere else", () => {
    for (const salt of PRACTICAL_SALT_ORDER) {
      const group = PRACTICAL_SALTS[salt].group;
      for (let stage = 0; stage <= 6; stage++) {
        const r = derive({ salt }, { stage });
        if (stage === group) {
          expect(r.precipitate, `${salt} ${stage}`).toBe(1);
          expect(text(r.schemeObservation)).toBe(GROUP[salt]);
        } else {
          expect(r.precipitate, `${salt} ${stage}`).toBe(0);
          expect(text(r.schemeObservation)).toBe(stage === 0 ? "No ammonia given off" : "No precipitate");
        }
        expect(r.removedEarlier).toBe(group >= 1 && group < stage ? 1 : 0);
      }
    }
  });

  it("leaves Na⁺ and K⁺ untouched by every group reagent", () => {
    for (const salt of ["na2co3", "kno3"] as const) for (let stage = 0; stage <= 6; stage++) expect(derive({ salt }, { stage }).precipitate).toBe(0);
  });

  it("only blue copper sulfate and yellow-brown iron(III) chloride are coloured", () => {
    expect(PRACTICAL_SALT_ORDER.filter((s) => derive({ salt: s }).saltColour !== 0)).toEqual(["cuso4", "fecl3"]);
  });

  it("marks a guess right only for the mystery salt itself", () => {
    expect(derive({ salt: "fecl3" }, { saltGuess: 3 }).saltGuessRight).toBe(1);
    expect(derive({ salt: "fecl3" }, { saltGuess: 4 }).saltGuessRight).toBe(0);
  });
});

describe("Lassaigne's test: the table", () => {
  // compound → [Prussian blue, nitroprusside, lead acetate, AgNO₃ after HNO₃]
  const TABLE: Record<string, [string, string, string, string]> = {
    urea: ["Prussian blue colour: nitrogen present", "No violet colour", "No black precipitate", "No precipitate with AgNO₃"],
    thiophene: ["No Prussian blue", "Violet colour: sulfur present", "Black ppt of PbS: sulfur present", "No precipitate with AgNO₃"],
    chlorobenzene: ["No Prussian blue", "No violet colour", "No black precipitate", "White ppt of AgCl, soluble in NH₄OH"],
    bromobenzene: ["No Prussian blue", "No violet colour", "No black precipitate", "Pale-yellow AgBr, sparingly soluble in NH₄OH"],
    iodoform: ["No Prussian blue", "No violet colour", "No black precipitate", "Yellow AgI, insoluble in NH₄OH"],
    chloroaniline: ["Prussian blue colour: nitrogen present", "No violet colour", "No black precipitate", "White ppt of AgCl, soluble in NH₄OH"],
    naphthalene: ["No Prussian blue", "No violet colour", "No black precipitate", "No precipitate with AgNO₃"],
  };

  it("covers every compound", () => {
    expect(Object.keys(TABLE).sort()).toEqual([...PRACTICAL_COMPOUND_ORDER].sort());
  });

  it.each(Object.entries(TABLE))("%s", (compound, row) => {
    PRACTICAL_FUSION_TEST_ORDER.forEach((fusionTest, i) => {
      const r = derive({ compound: compound as PracticalParams["compound"], fusionTest });
      expect(text(r.fusionObservation), `${compound} ${fusionTest}`).toBe(row[i]);
      expect(r.fusionPositive).toBe(row[i]!.startsWith("No") ? 0 : 1);
    });
  });
});

describe("functional-group tests: the table", () => {
  // sample → [bromine water, CAN, Tollens', Fehling's, NaHCO₃, neutral FeCl₃]
  const TABLE: Record<string, [string, string, string, string, string, string]> = {
    ethanol: ["Orange colour stays", "Yellow CAN turns pink-red", "No silver mirror", "Stays deep blue", "No effervescence", "No violet colour; stays yellow"],
    phenol: ["Decolourised; white ppt of 2,4,6-tribromophenol", "Brown-black ppt, not a red colour", "No silver mirror", "Stays deep blue", "No effervescence", "Violet colour with neutral FeCl₃"],
    ethanal: ["Decolourised slowly: the aldehyde is oxidised", "Stays yellow", "Silver mirror on the tube", "Red-brown ppt of Cu₂O", "No effervescence", "No violet colour; stays yellow"],
    propanone: ["Orange colour stays", "Stays yellow", "No silver mirror", "Stays deep blue", "No effervescence", "No violet colour; stays yellow"],
    ethanoic: ["Orange colour stays", "Stays yellow", "No silver mirror", "Stays deep blue", "Brisk effervescence of CO₂", "No violet; red only once neutralised (acetate)"],
    cyclohexene: ["Decolourised at once", "Stays yellow", "No silver mirror", "Stays deep blue", "No effervescence", "No violet colour; stays yellow"],
  };

  it("covers every sample", () => {
    expect(Object.keys(TABLE).sort()).toEqual([...PRACTICAL_ORGANIC_ORDER].sort());
  });

  it.each(Object.entries(TABLE))("%s", (organic, row) => {
    PRACTICAL_GROUP_TEST_ORDER.forEach((groupTest, i) => {
      expect(text(derive({ organic: organic as PracticalParams["organic"], groupTest }).organicObservation), `${organic} ${groupTest}`).toBe(row[i]);
    });
  });

  it("finds each group with its own test, and tells the false alarms apart", () => {
    const finds = (organic: PracticalParams["organic"], groupTest: PracticalParams["groupTest"]) => derive({ organic, groupTest });
    expect(finds("cyclohexene", "bromine-water")).toMatchObject({ organicChange: 1, testFindsGroup: 1 });
    // Phenol decolourises bromine water by substitution: a change, but not a C=C.
    expect(finds("phenol", "bromine-water")).toMatchObject({ organicChange: 1, testFindsGroup: 0 });
    expect(finds("ethanol", "can").testFindsGroup).toBe(1);
    expect(finds("ethanal", "tollens").testFindsGroup).toBe(1);
    expect(finds("ethanal", "fehling").testFindsGroup).toBe(1);
    expect(finds("ethanoic", "bicarbonate").testFindsGroup).toBe(1);
    expect(finds("phenol", "bicarbonate").organicChange).toBe(0); // phenol is weaker than carbonic acid
    expect(finds("phenol", "ferric").testFindsGroup).toBe(1);
    expect(finds("propanone", "tollens").organicChange).toBe(0);
  });
});

describe("every output", () => {
  it("is a finite number, never −0", () => {
    const states: Partial<PracticalState>[] = [{}, { added: 40, initial: 10, strength: 0.005, stage: 6, saltGuess: 11, compoundGuess: 6, organicGuess: 5 }];
    for (const titration of Object.keys(PRACTICAL_TITRATIONS) as PracticalParams["titration"][])
      for (const state of states) {
        const r = derive({ titration }, state);
        for (const [key, value] of Object.entries(r)) {
          expect(Number.isFinite(value), key).toBe(true);
          expect(Object.is(value, -0), key).toBe(false);
        }
      }
  });

  it("keeps every observation short enough for a phone caption", () => {
    for (const o of OBS) expect(o.text.length, o.text).toBeLessThanOrEqual(55);
  });
});
