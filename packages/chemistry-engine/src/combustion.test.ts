import { describe, expect, it } from "vitest";
import {
  COMBUST_AGENT_ORDER,
  COMBUST_CUP_ORDER,
  COMBUST_FIRE_ORDER,
  COMBUST_FUEL_ORDER,
  COMBUST_FUELS,
  COMBUST_JAR_ORDER,
  COMBUST_MATERIAL_ORDER,
  COMBUST_PRODUCT_ORDER,
  COMBUST_PRODUCTS,
  combustBurnTime,
  combustCupTemperature,
  combustFight,
  combustFlameZone,
  combustJarOxygen,
  combustionModel as model,
  type CombustParams,
  type CombustState,
} from "./combustion";

const derive = (params: Partial<CombustParams> = {}, state: Partial<CombustState> = {}) =>
  model.derive({ time: 0, ...state }, { ...model.defaultParams, ...params });

describe("the fire triangle", () => {
  it("burns only with fuel, heat up to the ignition temperature, and air", () => {
    // Wood catches at 300 °C in fresh air.
    expect(derive({ material: "wood", temperature: 295 })).toMatchObject({ burning: 0, missing: 3, hotEnough: 0, ignitionTemp: 300 });
    expect(derive({ material: "wood", temperature: 300 })).toMatchObject({ burning: 1, missing: 0 });
    // Hot enough, but only 15 % oxygen: the air is missing.
    expect(derive({ material: "wood", temperature: 400, oxygen: 15 })).toMatchObject({ burning: 0, missing: 2, enoughAir: 0 });
    expect(derive({ material: "wood", temperature: 400, oxygen: 16 })).toMatchObject({ burning: 1 });
    // Stone never burns, however hot.
    expect(derive({ material: "stone", temperature: 500 })).toMatchObject({ burning: 0, missing: 1, combustible: 0, ignitionTemp: 0 });
  });

  it("follows NCERT: kerosene must be warmed a little, wood a lot, petrol and LPG not at all", () => {
    expect(derive({ material: "kerosene", temperature: 30 }).burning).toBe(0);
    expect(derive({ material: "kerosene", temperature: 40 }).burning).toBe(1);
    expect(derive({ material: "wood", temperature: 40 }).burning).toBe(0);
    for (const material of ["petrol", "lpg", "alcohol"] as const) {
      expect(derive({ material, temperature: 20 }), material).toMatchObject({ burning: 1, inflammable: 1 });
    }
    expect(derive({ material: "kerosene" }).inflammable).toBe(0);
  });

  it("orders the ignition temperatures as the lab's order step expects", () => {
    const ign = (["petrol", "alcohol", "kerosene", "paper", "wood", "charcoal"] as const).map((material) => derive({ material }).ignitionTemp);
    expect(ign).toEqual([-43, 13, 40, 230, 300, 350]);
  });
});

describe("a candle under a jar", () => {
  it("lasts 10 s for each litre of air: 5 % of the air at 5 mL of oxygen a second", () => {
    // 1 L holds 210 mL of oxygen; it can use 50 mL before 16 %, at 5 mL/s → 10 s.
    expect(combustBurnTime(1)).toBeCloseTo(10, 9);
    expect(combustBurnTime(0.5)).toBeCloseTo(5, 9);
    expect(combustBurnTime(1.5)).toBeCloseTo(15, 9);
    expect(combustBurnTime(2)).toBeCloseTo(20, 9);
  });

  it("uses up the oxygen and goes out at 16 %", () => {
    // After 4 s: 20 mL used of 1000 mL → 21 − 2 = 19 %.
    expect(combustJarOxygen(1, 4)).toBeCloseTo(19, 9);
    expect(derive({ jar: "closed", jarVolume: 1 }, { time: 4 })).toMatchObject({ candleLit: 1 });
    expect(derive({ jar: "closed", jarVolume: 1 }, { time: 10 })).toMatchObject({ candleLit: 0, jarOxygen: 16 });
    expect(derive({ jar: "closed", jarVolume: 1 }, { time: 60 }).jarOxygen).toBeCloseTo(16, 9);
    expect(derive({ jar: "open" }, { time: 200 })).toMatchObject({ candleLit: 1, jarOxygen: 21 });
  });
});

describe("water in a paper cup", () => {
  it("keeps the paper at 100 °C at most, far below its 230 °C", () => {
    expect(combustCupTemperature("water", 60)).toBe(60); // 30 + 0.5 × 60
    expect(combustCupTemperature("water", 140)).toBe(100);
    expect(derive({ cup: "water" }, { time: 240 })).toMatchObject({ cupTemp: 100, cupBurning: 0, waterBoiling: 1 });
  });

  it("burns when the cup is empty: 30 + 20 × 10 = 230 °C after 10 s", () => {
    expect(derive({ cup: "empty" }, { time: 9 })).toMatchObject({ cupTemp: 210, cupBurning: 0 });
    expect(derive({ cup: "empty" }, { time: 10 })).toMatchObject({ cupTemp: 230, cupBurning: 1 });
  });
});

describe("the zones of a candle flame", () => {
  it("finds the dark, luminous and outer zones", () => {
    expect(combustFlameZone(0, 5)).toBe(1);
    expect(combustFlameZone(0, 25)).toBe(2);
    expect(combustFlameZone(8, 22)).toBe(3);
    expect(combustFlameZone(0, 55)).toBe(0);
    expect(combustFlameZone(14, 22)).toBe(0);
    expect(derive().zone).toBe(2);
  });
});

describe("putting out fires", () => {
  it("never uses water on electrical or petrol fires", () => {
    expect(combustFight("wood", "water")).toMatchObject({ out: 1, side: 3 });
    expect(combustFight("electrical", "water")).toMatchObject({ out: 0, danger: 1 });
    expect(combustFight("petrol", "water")).toMatchObject({ out: 0, danger: 1 });
    expect(combustFight("electrical", "co2")).toMatchObject({ out: 1, side: 2 });
    expect(combustFight("petrol", "co2")).toMatchObject({ out: 1, side: 2 });
    expect(combustFight("gas-stove", "shut-off")).toMatchObject({ out: 1, side: 1 });
    expect(derive({ fire: "electrical" }).waterSafe).toBe(0);
    expect(derive({ fire: "paper" }).waterSafe).toBe(1);
  });

  it("keeps every note short", () => {
    for (const fire of COMBUST_FIRE_ORDER) for (const agent of COMBUST_AGENT_ORDER) expect(combustFight(fire, agent).note.length).toBeLessThanOrEqual(55);
  });
});

describe("fuels and calorific value", () => {
  it("uses NCERT's table, the middle of a range", () => {
    expect(derive({ fuel: "dung" })).toMatchObject({ calorific: 7000, calorificLow: 6000, calorificHigh: 8000 });
    expect(derive({ fuel: "wood" }).calorific).toBe(19500);
    expect(derive({ fuel: "coal" }).calorific).toBe(29000);
    expect(derive({ fuel: "biogas" }).calorific).toBe(37500);
    expect(derive({ fuel: "petrol" }).calorific).toBe(45000);
    expect(derive({ fuel: "lpg" }).calorific).toBe(55000);
    expect(derive({ fuel: "hydrogen" }).calorific).toBe(150000);
  });

  it("gives heat = mass × calorific value", () => {
    expect(derive({ fuel: "lpg", mass: 1 }).heat).toBe(55000);
    expect(derive({ fuel: "petrol", mass: 2 }).heat).toBe(90000);
    expect(derive({ fuel: "wood", mass: 2 }).heat).toBe(39000);
    // About 7.9 kg of cow dung cake matches 1 kg of LPG: 55000 / 7000 = 7.86.
    expect(derive({ fuel: "dung", mass: 7.9 }).heat).toBeCloseTo(55300, 6);
  });

  it("flags sulphur dioxide from coal and diesel, and fossil fuels", () => {
    const so2 = COMBUST_FUEL_ORDER.filter((fuel) => derive({ fuel }).so2 === 1);
    expect(so2).toEqual(["coal", "diesel"]);
    expect(derive({ fuel: "hydrogen" }).pollution).toBe(0);
    expect(COMBUST_FUEL_ORDER.filter((fuel) => COMBUST_FUELS[fuel].fossil === 0)).toEqual(["dung", "wood", "biogas", "hydrogen"]);
  });
});

describe("coal and petroleum products", () => {
  it("stacks the petroleum fractions from LPG at the top to bitumen at the bottom", () => {
    const petroleum = COMBUST_PRODUCT_ORDER.filter((p) => COMBUST_PRODUCTS[p].source === 1);
    expect(petroleum.map((product) => derive({ product }).towerDepth)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(derive({ product: "coke" })).toMatchObject({ productSource: 0, towerDepth: 0 });
  });
});

describe("the model as a whole", () => {
  it("gives a finite number for every output, whatever is picked", () => {
    for (const material of COMBUST_MATERIAL_ORDER)
      for (const fuel of COMBUST_FUEL_ORDER)
        for (const [i, product] of COMBUST_PRODUCT_ORDER.entries()) {
          const r = derive(
            { material, fuel, product, jar: COMBUST_JAR_ORDER[i % 2], cup: COMBUST_CUP_ORDER[i % 2], fire: COMBUST_FIRE_ORDER[i % 5], agent: COMBUST_AGENT_ORDER[i % 4] },
            { time: i * 30 },
          );
          for (const key of model.outputs) {
            expect(Number.isFinite(r[key]), key).toBe(true);
            expect(Object.is(r[key], -0), key).toBe(false);
          }
        }
  });

  it("clamps the clock and the controls", () => {
    expect(model.setVariable({ time: 0 }, "time", 999, model.defaultParams).time).toBe(300);
    expect(model.setVariable({ time: 5 }, "time", -3, model.defaultParams).time).toBe(0);
    expect(model.advance({ time: 0 }, 1, model.defaultParams).time).toBe(5);
    expect(derive({ jarVolume: 50, mass: -2, temperature: 9999 })).toMatchObject({ jarVolume: 2, mass: 0, temperature: 500 });
    expect(derive({ material: "nope" as never }).material).toBe(COMBUST_MATERIAL_ORDER.indexOf("wood"));
  });
});
