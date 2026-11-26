import { describe, expect, it } from "vitest";
import {
  SCHOOLHEAT_MATERIAL_ORDER,
  SCHOOLHEAT_SCENES,
  schoolHeatModel as model,
  schoolHeatPinsFallen,
  schoolHeatRodTemp,
  type SchoolHeatParams,
  type SchoolHeatState,
} from "./schoolheat";

const P = model.defaultParams;
const S = model.initialize(P);
const derive = (over: Partial<SchoolHeatParams> = {}, state: Partial<SchoolHeatState> = {}) => model.derive({ ...S, ...state }, { ...P, ...over });

describe("touch only tells hotter or colder than your hand", () => {
  it("makes the same lukewarm water feel cold to one hand and warm to the other", () => {
    // Left hand from 45 °C water, right from 10 °C, both into 27 °C water.
    const r = derive({ scene: "touch", leftHand: 45, rightHand: 10 }, { bowlTemp: 27 });
    expect(r).toMatchObject({ leftFeels: -1, rightFeels: 1, handsAgree: 0 });
  });

  it("lets both hands agree only when the water is beyond both of them", () => {
    expect(derive({ leftHand: 45, rightHand: 10 }, { bowlTemp: 50 })).toMatchObject({ leftFeels: 1, rightFeels: 1, handsAgree: 1 });
    // Within 1 °C of the hand, it feels the same.
    expect(derive({ leftHand: 27 }, { bowlTemp: 27.5 }).leftFeels).toBe(0);
  });
});

describe("thermometers", () => {
  it("reads a clinical thermometer to 0.1 °C between 35 and 42 °C", () => {
    const r = derive({ scene: "thermometer", thermometer: "clinical" }, { temperature: 38.44 });
    expect(r).toMatchObject({ reading: 38.4, leastCount: 0.1, scaleMin: 35, scaleMax: 42, outOfRange: 0, vsNormal: 1 });
    expect(derive({ thermometer: "clinical" }, { temperature: 37 }).vsNormal).toBe(0);
    expect(derive({ thermometer: "clinical" }, { temperature: 36.5 }).vsNormal).toBe(-1);
  });

  it("goes off the clinical scale for boiling water, which the laboratory one can read", () => {
    expect(derive({ thermometer: "clinical" }, { temperature: 100 })).toMatchObject({ reading: 42, outOfRange: 1 });
    expect(derive({ thermometer: "laboratory" }, { temperature: 100 })).toMatchObject({ reading: 100, outOfRange: 0, leastCount: 1 });
    expect(derive({ thermometer: "laboratory" }, { temperature: 70.4 }).reading).toBe(70);
    expect(derive({ thermometer: "laboratory" }, { temperature: -15 })).toMatchObject({ reading: -10, outOfRange: 1 });
  });

  it("holds a clinical reading after it is taken out (the kink), but a laboratory one falls to the room", () => {
    expect(derive({ thermometer: "clinical", takenOut: 1 }, { temperature: 38.4 }).reading).toBe(38.4);
    expect(derive({ thermometer: "laboratory", takenOut: 1 }, { temperature: 70 }).reading).toBe(25);
  });
});

describe("conduction along a rod", () => {
  it("follows T = 25 + 175 erfc(x / 2√(αt))", () => {
    // Copper (α = 1.11e-4 m²/s), x = 15 cm: at t = 0.0225 / 1.11e-4 s the argument is 0.5, erfc(0.5) = 0.4795.
    const minutes = 0.0225 / 1.11e-4 / 60;
    expect(schoolHeatRodTemp("copper", 15, minutes)).toBeCloseTo(25 + 175 * 0.4795, 1);
    expect(schoolHeatRodTemp("copper", 0, 1)).toBe(200);
    expect(schoolHeatRodTemp("copper", 15, 0)).toBe(25);
    // After 1 min: argument 0.15 / (2√(1.11e-4 × 60)) = 0.919, erfc = 0.194, so 58.9 °C — just short of the wax's 60 °C.
    expect(derive({ scene: "conduction", material: "copper" }, { heatTime: 1 }).farTemp).toBeCloseTo(58.9, 0);
  });

  it("drops the pins nearest the flame first, fast on metals and not at all on glass or wood", () => {
    expect(schoolHeatPinsFallen("copper", 0)).toBe(0);
    expect(schoolHeatPinsFallen("copper", 1)).toBe(4);
    expect(schoolHeatPinsFallen("copper", 1.1)).toBe(5);
    // Iron after 4 min: the 60 °C point is 2 × 0.906 × √(2.3e-5 × 240) = 13.5 cm along, past 4 pins.
    expect(schoolHeatPinsFallen("iron", 4)).toBe(4);
    // Stainless steel after 10 min: 2 × 0.906 × √(4.2e-6 × 600) = 9.1 cm, past 3 pins.
    expect(schoolHeatPinsFallen("steel", 10)).toBe(3);
    expect(schoolHeatPinsFallen("glass", 10)).toBe(0);
    expect(schoolHeatPinsFallen("wood", 10)).toBe(0);
  });

  it("calls metals good conductors", () => {
    expect(derive({ material: "aluminium" }).goodConductor).toBe(1);
    expect(derive({ material: "plastic" }).goodConductor).toBe(0);
    expect(derive({ material: "wood" }).material).toBe(SCHOOLHEAT_MATERIAL_ORDER.indexOf("wood"));
  });

  it("warms the far end of copper more than iron after 2 minutes", () => {
    const at = (material: SchoolHeatParams["material"]) => derive({ material }, { heatTime: 2 }).farTemp;
    expect(at("copper")).toBeGreaterThan(at("aluminium"));
    expect(at("aluminium")).toBeGreaterThan(at("iron"));
    expect(at("iron")).toBeGreaterThan(at("wood"));
  });
});

describe("convection and radiation", () => {
  it("warms the beaker and carries the streak once round in 2 minutes", () => {
    expect(derive({ scene: "convection" }, { heatTime: 1 })).toMatchObject({ waterTemp: 32.5, streak: 0.5 });
    expect(derive({ scene: "convection" }, { heatTime: 10 })).toMatchObject({ waterTemp: 100, streak: 1 });
  });

  it("warms the black can far more than the white one", () => {
    // 25 + 0.9 × 20 × (1 − e⁻³) = 42.10; 25 + 0.2 × 20 × (1 − e⁻³) = 28.80.
    const r = derive({ scene: "radiation" }, { sunTime: 60 });
    expect(r.blackCanTemp).toBeCloseTo(42.1, 2);
    expect(r.whiteCanTemp).toBeCloseTo(28.8, 2);
    expect(r.canDifference).toBeCloseTo(13.3, 2);
    expect(derive({ scene: "radiation" }, { sunTime: 0 })).toMatchObject({ blackCanTemp: 25, whiteCanTemp: 25 });
  });

  it("needs no medium only for radiation", () => {
    expect(derive({ scene: "radiation" }).needsMedium).toBe(0);
    expect(derive({ scene: "conduction" }).needsMedium).toBe(1);
    expect(derive({ scene: "convection" }).needsMedium).toBe(1);
  });
});

describe("sea and land breezes", () => {
  it("blows a sea breeze at 2 pm and a land breeze at 2 am", () => {
    expect(derive({ scene: "breeze" }, { hour: 14 })).toMatchObject({ landTemp: 36, seaTemp: 29, landLead: 7, breeze: 1, daytime: 1 });
    expect(derive({ scene: "breeze" }, { hour: 2 })).toMatchObject({ landTemp: 20, seaTemp: 27, landLead: -7, breeze: -1, daytime: 0 });
  });

  it("is calm at 8 in the morning and evening, when land and sea are level", () => {
    expect(derive({}, { hour: 8 }).breeze).toBe(0);
    expect(derive({}, { hour: 20 }).breeze).toBe(0);
    // 10 am: 28 + 8 cos(60°) = 32 on land, 28 + cos(60°) = 28.5 at sea.
    expect(derive({}, { hour: 10 })).toMatchObject({ landTemp: 32, seaTemp: 28.5 });
  });
});

describe("the school heat model", () => {
  it("clamps every control", () => {
    expect(model.setVariable(S, "bowlTemp", 99, P).bowlTemp).toBe(50);
    expect(model.setVariable(S, "temperature", -40, P).temperature).toBe(-15);
    expect(model.setVariable(S, "heatTime", 30, P).heatTime).toBe(10);
    expect(model.setVariable(S, "sunTime", -3, P).sunTime).toBe(0);
    expect(model.setVariable(S, "hour", 30, P).hour).toBe(24);
    expect(model.setVariable(S, "nothing", 3, P)).toBe(S);
    expect(model.getVariable(S, "hour")).toBe(10);
  });

  it("runs the clock of the scene in play", () => {
    expect(model.advance(S, 2, { ...P, scene: "conduction" }).heatTime).toBe(1);
    expect(model.advance(S, 2, { ...P, scene: "radiation" }).sunTime).toBe(6);
    expect(model.advance({ ...S, hour: 23.5 }, 1, { ...P, scene: "breeze" }).hour).toBeCloseTo(0.5, 9);
    expect(model.advance(S, 2, P)).toEqual(S);
  });

  it("gives finite numbers for every output in every scene and material", () => {
    for (const scene of SCHOOLHEAT_SCENES) {
      for (const material of SCHOOLHEAT_MATERIAL_ORDER) {
        for (const heatTime of [0, 0.05, 10]) {
          const r = derive({ scene, material }, { heatTime, hour: 24, sunTime: 60, temperature: 115 });
          for (const key of model.outputs) {
            expect(Number.isFinite(r[key]), `${scene}/${material}/${key}`).toBe(true);
            expect(Object.is(r[key], -0), `${scene}/${material}/${key} is −0`).toBe(false);
          }
        }
      }
    }
  });
});
