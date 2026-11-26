import { describe, expect, it } from "vitest";
import {
  HEATFLOW_CONDUCTOR_ORDER,
  HEATFLOW_CONDUCTORS,
  HEATFLOW_EXPANDER_ORDER,
  HEATFLOW_EXPANDERS,
  heatflowGlow,
  heatflowModel as model,
  heatflowPlanckShape,
  heatflowWaterDensity,
  type HeatflowParams,
  type HeatflowState,
} from "./heatflow";

const P = model.defaultParams;
const S = model.initialize(P);
const derive = (state: Partial<HeatflowState> = {}, params: Partial<HeatflowParams> = {}) =>
  model.derive({ ...S, ...state }, { ...P, ...params });

describe("temperature scales", () => {
  it("reads the fixed points on all three scales", () => {
    expect(derive({ celsius: 0 })).toMatchObject({ fahrenheit: 32 });
    expect(derive({ celsius: 0 }).kelvin).toBeCloseTo(273.15, 10);
    expect(derive({ celsius: 100 }).fahrenheit).toBeCloseTo(212, 10);
    expect(derive({ celsius: 100 }).kelvin).toBeCloseTo(373.15, 10);
  });

  it("puts body temperature at 98.6 °F and 310.15 K", () => {
    expect(derive({ celsius: 37 }).fahrenheit).toBeCloseTo(98.6, 10);
    expect(derive({ celsius: 37 }).kelvin).toBeCloseTo(310.15, 10);
  });

  it("agrees with Fahrenheit only at −40", () => {
    const r = derive({ celsius: -40 });
    expect(r.fahrenheit).toBeCloseTo(-40, 10);
    expect(derive({ celsius: -39 }).fahrenheit).not.toBeCloseTo(-39, 1);
  });

  it("never goes below absolute zero", () => {
    const r = model.derive(model.setVariable(S, "celsius", -500, P), P);
    expect(r.celsius).toBe(-273);
    expect(r.kelvin).toBeCloseTo(0.15, 10);
  });
});

describe("thermal expansion", () => {
  it("grows a 10 m steel rail by 4.8 mm for 40 K", () => {
    const r = derive({ barLength: 10, deltaT: 40 }, { material: "steel" });
    expect(r.deltaL).toBeCloseTo(4.8, 10);
    expect(r.newLength).toBeCloseTo(10.0048, 10);
    expect(r.alpha).toBeCloseTo(1.2e-5, 15);
  });

  it("gives β = 2α and γ = 3α", () => {
    const r = derive({ deltaT: 100 }, { material: "aluminium" });
    expect(r.beta).toBeCloseTo(2 * r.alpha, 15);
    expect(r.gamma).toBeCloseTo(3 * r.alpha, 15);
    expect(r.areaChangePct).toBeCloseTo(2 * r.lengthChangePct, 10);
    expect(r.volumeChangePct).toBeCloseTo(3 * r.lengthChangePct, 10);
  });

  it("orders the materials by α, glass least and aluminium most", () => {
    const alphas = HEATFLOW_EXPANDER_ORDER.map((m) => HEATFLOW_EXPANDERS[m].alpha);
    expect([...alphas].sort((a, b) => a - b)).toEqual(alphas);
  });

  it("shrinks a bar that cools", () => {
    expect(derive({ deltaT: -50 }).deltaL).toBeLessThan(0);
    expect(derive({ deltaT: 0 })).toMatchObject({ deltaL: 0, bimetalCurl: 0 });
  });

  it("curls the brass–steel strip one way when heated and the other way when cooled", () => {
    expect(derive({ deltaT: 50 }).bimetalMismatch).toBeCloseTo(0.3, 10);
    expect(derive({ deltaT: 50 }).bimetalCurl).toBe(1);
    expect(derive({ deltaT: -50 }).bimetalMismatch).toBeCloseTo(-0.3, 10);
    expect(derive({ deltaT: -50 }).bimetalCurl).toBe(-1);
  });
});

describe("water's anomalous expansion", () => {
  it("is densest near 4 °C, with real densities either side", () => {
    expect(heatflowWaterDensity(4)).toBeCloseTo(999.975, 2);
    expect(heatflowWaterDensity(0)).toBeCloseTo(999.84, 1);
    expect(heatflowWaterDensity(20)).toBeCloseTo(998.21, 1);
    expect(heatflowWaterDensity(4)).toBeGreaterThan(heatflowWaterDensity(3));
    expect(heatflowWaterDensity(4)).toBeGreaterThan(heatflowWaterDensity(5));
  });

  it("flags 4 °C as densest, and says which way water goes either side", () => {
    expect(derive({ waterTemp: 4 })).toMatchObject({ waterDensest: 1, waterTrend: 0 });
    expect(derive({ waterTemp: 2 })).toMatchObject({ waterDensest: 0, waterTrend: -1 });
    expect(derive({ waterTemp: 10 })).toMatchObject({ waterDensest: 0, waterTrend: 1 });
    expect(derive({ waterTemp: 4 }).waterVolume).toBeLessThan(derive({ waterTemp: 0 }).waterVolume);
  });
});

describe("conduction", () => {
  it("carries H = kA(T₁ − T₂)/L along a copper rod", () => {
    const r = derive({ hotEnd: 100, coldEnd: 0, rodLength: 0.5, area: 4 }, { rodMaterial: "copper" });
    expect(r.heatCurrent).toBeCloseTo(30.8, 10);
    expect(r.gradient).toBeCloseTo(200, 10);
    expect(r.rodResistance).toBeCloseTo(0.5 / (385 * 4e-4), 10);
  });

  it("halves the heat when the rod is twice as long", () => {
    const short = derive({ rodLength: 0.5 });
    const long = derive({ rodLength: 1 });
    expect(long.heatCurrent / short.heatCurrent).toBeCloseTo(0.5, 10);
  });

  it("puts about 10 W through a 0.2 m steel rod from 100 °C to 0 °C", () => {
    expect(derive({ hotEnd: 100, coldEnd: 0, rodLength: 0.2 }, { rodMaterial: "steel" }).heatCurrent).toBeCloseTo(10.04, 10);
  });

  it("lists conductors from best to worst", () => {
    const ks = HEATFLOW_CONDUCTOR_ORDER.map((m) => HEATFLOW_CONDUCTORS[m].k);
    expect([...ks].sort((a, b) => b - a)).toEqual(ks);
  });
});

describe("composite slabs", () => {
  const copperSteel = { rodMaterial: "copper", secondMaterial: "steel" } as const;

  it("adds resistances in series and finds the joint temperature", () => {
    const r = derive({ hotEnd: 100, coldEnd: 0, rodLength: 0.5, secondLength: 0.5, area: 4 }, copperSteel);
    expect(r.secondResistance).toBeCloseTo(24.9, 3);
    expect(r.seriesResistance).toBeCloseTo(r.rodResistance + r.secondResistance, 10);
    expect(r.seriesHeat).toBeCloseTo(3.553, 3);
    expect(r.interfaceTemp).toBeCloseTo(88.465, 2);
    expect(r.kEffective).toBeCloseTo(1 / (0.5 / 385 + 0.5 / 50.2), 10);
  });

  it("carries less in series than either slab alone, more in parallel than either", () => {
    const r = derive({}, copperSteel);
    const alone2 = (r.hotEnd - r.coldEnd) / r.secondResistance;
    expect(r.seriesHeat).toBeLessThan(Math.min(r.heatCurrent, alone2));
    expect(r.parallelHeat).toBeCloseTo(r.heatCurrent + alone2, 10);
    expect(r.parallelHeat).toBeCloseTo(34.82, 2);
  });

  it("heats the joint when the second slab is made longer", () => {
    const r = derive({ secondLength: 1 }, copperSteel);
    expect(r.interfaceTemp).toBeCloseTo(93.88, 2);
  });
});

describe("convection", () => {
  it("blows a sea breeze by day and a land breeze by night", () => {
    expect(derive({}, { daytime: "day" })).toMatchObject({ landWarmer: 1, breeze: 1, daytime: 0 });
    expect(derive({}, { daytime: "night" })).toMatchObject({ landWarmer: 0, breeze: -1, daytime: 1 });
  });
});

describe("radiation", () => {
  it("puts the Sun's peak at 500 nm and a 2900 K filament's at 1 µm", () => {
    expect(derive({ bodyTemp: 5800 }).peakWavelength).toBeCloseTo(500, 10);
    expect(derive({ bodyTemp: 5800 })).toMatchObject({ peakBand: 1, glow: 4 });
    expect(derive({ bodyTemp: 2900 }).peakWavelength).toBeCloseTo(1000, 10);
    expect(derive({ bodyTemp: 300 })).toMatchObject({ peakBand: 0, glow: 0 });
    expect(derive({ bodyTemp: 10000 }).peakBand).toBe(2);
  });

  it("radiates σeT⁴, sixteen times as much at twice the temperature", () => {
    expect(derive({ bodyTemp: 1000 }).radiatedPower).toBeCloseTo(56700, 6);
    expect(derive({ bodyTemp: 2000 }).radiatedPower / derive({ bodyTemp: 1000 }).radiatedPower).toBeCloseTo(16, 10);
    expect(derive({ bodyTemp: 1000, emissivity: 0.5 }).radiatedPower).toBeCloseTo(28350, 6);
  });

  it("loses nothing net to surroundings at its own temperature", () => {
    expect(derive({ bodyTemp: 300 }).netRadiated).toBeCloseTo(0, 6);
  });

  it("draws Planck's curve with its peak where Wien says", () => {
    expect(heatflowPlanckShape(500, 5800)).toBeCloseTo(1, 2);
    expect(heatflowPlanckShape(300, 5800)).toBeLessThan(1);
    expect(heatflowPlanckShape(1500, 5800)).toBeLessThan(heatflowPlanckShape(800, 5800));
    expect(heatflowPlanckShape(500, 300)).toBeLessThan(1e-20);
  });

  it("glows red, orange, then white as it heats", () => {
    expect([700, 900, 1300, 2500, 5800, 9000].map(heatflowGlow)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe("Newton's law of cooling", () => {
  it("cools exponentially towards the room", () => {
    const r = derive({ startTemp: 90, roomTemp: 25, coolingConstant: 0.1, coolTime: 10 });
    expect(r.coolTemp).toBeCloseTo(25 + 65 * Math.exp(-1), 10);
    expect(r.coolTemp).toBeCloseTo(48.91, 2);
    expect(r.halfLife).toBeCloseTo(6.93, 2);
  });

  it("cools at a rate proportional to the excess temperature", () => {
    expect(derive({ startTemp: 90, coolTime: 0 }).coolingRate).toBeCloseTo(6.5, 10);
    expect(derive({ startTemp: 60, coolTime: 0 }).coolingRate).toBeCloseTo(3.5, 10);
  });

  it("runs the clock on play and stops at an hour", () => {
    expect(model.advance(S, 2, P).coolTime).toBe(2);
    expect(model.advance({ ...S, coolTime: 59.5 }, 2, P).coolTime).toBe(60);
    expect(model.step(S, P, 1).coolTime).toBe(1);
    expect(model.step(S, P, -1).coolTime).toBe(0);
  });
});

describe("the model as a whole", () => {
  it("clamps every slider to its range", () => {
    expect(model.setVariable(S, "rodLength", 50, P).rodLength).toBe(2);
    expect(model.setVariable(S, "emissivity", 0, P).emissivity).toBe(0.05);
    expect(model.setVariable(S, "nonsense", 3, P)).toBe(S);
    expect(model.getVariable(S, "bodyTemp")).toBe(1000);
  });

  it("numbers every output, at both ends of every slider", () => {
    const states = [S, model.initialize(P)];
    for (const key of model.stateVariables) {
      states.push(model.setVariable(S, key, -1e9, P), model.setVariable(S, key, 1e9, P));
    }
    for (const st of states) {
      for (const rodMaterial of HEATFLOW_CONDUCTOR_ORDER) {
        const r = model.derive(st, { ...P, rodMaterial, secondMaterial: rodMaterial });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
        for (const key of model.outputs) expect(Object.is(r[key], -0), key).toBe(false);
      }
    }
  });
});
