import { describe, expect, it } from "vitest";
import { ATMOSPHERE, fluidsModel as model, GRAVITY, pressureAt, submergedFractionOf, TANK_DEPTH } from "./fluids";

const P = model.defaultParams;
const derive = (depth: number, over: Partial<typeof P> = {}) => model.derive({ depth }, { ...P, ...over });

describe("pressure in a fluid", () => {
  it("is zero at the surface and rises in step with depth", () => {
    expect(derive(0).gaugePressure).toBe(0);
    expect(derive(1).gaugePressure).toBeCloseTo(1000 * GRAVITY, 9);
    expect(derive(1.4).gaugePressure).toBeCloseTo(2 * derive(0.7).gaugePressure, 9);
  });

  it("depends on the fluid, not on the shape of anything", () => {
    // Mercury is 13.6 times as dense, so it presses 13.6 times as hard.
    expect(derive(1, { fluid: "mercury" }).gaugePressure / derive(1).gaugePressure).toBeCloseTo(13.6, 9);
    expect(derive(1, { fluid: "oil" }).gaugePressure).toBeLessThan(derive(1).gaugePressure);
  });

  it("the block makes no difference to the pressure at a depth", () => {
    for (const blockDensity of [200, 900, 2500]) {
      expect(derive(1, { blockDensity }).gaugePressure).toBeCloseTo(derive(1).gaugePressure, 12);
    }
  });

  it("absolute pressure carries the atmosphere on top of it", () => {
    expect(derive(0).absolutePressure).toBeCloseTo(ATMOSPHERE, 9);
    expect(derive(1).absolutePressure - derive(1).gaugePressure).toBeCloseTo(ATMOSPHERE, 9);
  });

  it("reports the pressure at the floor of the tank, wherever the probe is", () => {
    expect(derive(0).bottomPressure).toBeCloseTo(pressureAt(P, TANK_DEPTH), 9);
    expect(derive(1.2).bottomPressure).toBeCloseTo(derive(0).bottomPressure, 9);
  });
});

describe("floating", () => {
  it("a block less dense than the fluid floats, with the density ratio under water", () => {
    const r = derive(0, { blockDensity: 600 });
    expect(r.floats).toBe(1);
    expect(r.submergedFraction).toBeCloseTo(0.6, 12);
  });

  it("ice in sea water floats a little higher than in fresh", () => {
    const fresh = derive(0, { blockDensity: 917 }).submergedFraction;
    const sea = derive(0, { blockDensity: 917, fluid: "seawater" }).submergedFraction;
    expect(sea).toBeLessThan(fresh);
    expect(fresh).toBeCloseTo(0.917, 9);
  });

  it("a block denser than the fluid goes under and stays there", () => {
    const r = derive(0, { blockDensity: 2500 });
    expect(r.floats).toBe(0);
    expect(r.submergedFraction).toBe(1);
    expect(r.blockTopDepth).toBeGreaterThan(0); // it is lying on the floor
  });

  it("steel floats in mercury, which is the whole point of mercury", () => {
    expect(derive(0, { blockDensity: 7800, fluid: "mercury" }).floats).toBe(1);
    expect(derive(0, { blockDensity: 7800 }).floats).toBe(0);
  });

  it("a floating block stands proud of the surface by the part that is not submerged", () => {
    const r = derive(0, { blockDensity: 250 });
    expect(r.blockTopDepth).toBeCloseTo(-0.75 * r.blockSide, 9);
  });
});

describe("Archimedes", () => {
  it("the upward push equals the weight of the fluid pushed aside", () => {
    for (const blockDensity of [300, 600, 950, 2700]) {
      const r = derive(0, { blockDensity });
      expect(r.buoyantForce).toBeCloseTo(r.displacedMass * GRAVITY, 9);
    }
  });

  it("a floating block displaces exactly its own weight of fluid", () => {
    const r = derive(0, { blockDensity: 600 });
    expect(r.floats).toBe(1);
    expect(r.buoyantForce).toBeCloseTo(r.weight, 9);
    expect(r.displacedMass).toBeCloseTo(r.blockMass, 9);
    expect(r.apparentWeight).toBeCloseTo(0, 9);
  });

  it("a sunken block loses the weight of its own volume of fluid", () => {
    const r = derive(0, { blockDensity: 2700, blockVolume: 20 });
    expect(r.displacedVolume).toBeCloseTo(r.blockVolume, 12);
    expect(r.apparentWeight).toBeCloseTo(r.weight - r.buoyantForce, 9);
    // Aluminium in water weighs about 63% of what it does in air.
    expect(r.apparentWeight / r.weight).toBeCloseTo(1 - 1000 / 2700, 6);
  });

  it("a bigger block of the same stuff floats the same way, and displaces more", () => {
    const small = derive(0, { blockDensity: 600, blockVolume: 10 });
    const big = derive(0, { blockDensity: 600, blockVolume: 40 });
    expect(big.submergedFraction).toBeCloseTo(small.submergedFraction, 12);
    expect(big.buoyantForce).toBeCloseTo(4 * small.buoyantForce, 9);
  });

  it("the submerged fraction is the density ratio, whatever the fluid", () => {
    for (const fluid of ["water", "seawater", "oil"] as const) {
      const r = derive(0, { fluid, blockDensity: 700 });
      if (r.floats) expect(r.submergedFraction).toBeCloseTo(700 / r.fluidDensity, 12);
    }
    expect(submergedFractionOf({ ...P, blockDensity: 400, fluid: "oil" })).toBeCloseTo(0.5, 12);
  });
});

describe("the run", () => {
  it("play lowers the probe to the floor and leaves it there", () => {
    let state = model.initialize(P);
    for (let i = 0; i < 200; i++) state = model.advance(state, 0.1, P);
    expect(state.depth).toBeCloseTo(TANK_DEPTH, 9);
  });

  it("stepping moves in tenths of a metre, and stops at the surface", () => {
    expect(model.step({ depth: 0.5 }, P, 1).depth).toBeCloseTo(0.6, 9);
    expect(model.step({ depth: 0 }, P, -1).depth).toBe(0);
    expect(model.step({ depth: TANK_DEPTH }, P, 1).depth).toBe(TANK_DEPTH);
  });

  it("the probe cannot be dragged out of the tank", () => {
    expect(model.setVariable({ depth: 0 }, "depth", -2, P).depth).toBe(0);
    expect(model.setVariable({ depth: 0 }, "depth", 99, P).depth).toBe(TANK_DEPTH);
  });
});
