import { describe, expect, it } from "vitest";
import {
  flowCapillaryRise,
  flowEffluxSpeed,
  flowModel as model,
  flowRegimeOf,
  flowTerminalVelocity,
  type FlowParams,
  type FlowState,
} from "./flow";

const base: FlowState = { stroke: 0, t: 0, clock: 0 };
const derive = (params: Partial<FlowParams> = {}, state: Partial<FlowState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("the hydraulic lift", () => {
  it("passes the pressure on undiminished: F₂ = F₁A₂/A₁", () => {
    const r = derive({ effort: 100, smallArea: 10, largeArea: 1000 });
    expect(r.liftPressure).toBeCloseTo(100, 9);
    expect(r.liftForce).toBeCloseTo(10000, 6);
    expect(r.advantage).toBe(100);
    expect(r.carWeight).toBeCloseTo(9800, 9);
    expect(r.lifts).toBe(1);
    expect(derive({ effort: 100, smallArea: 10, largeArea: 950 }).lifts).toBe(0);
  });

  it("raises the load less than the effort moves, and the work in is the work out", () => {
    const r = derive({ smallArea: 10, largeArea: 500 }, { stroke: 20 });
    expect(r.rise).toBeCloseTo(0.4, 12);
    expect(derive({ smallArea: 10, largeArea: 1000 }, { stroke: 20 }).rise).toBeCloseTo(0.2, 12);
    expect(r.workOut).toBeCloseTo(r.workIn, 9);
    expect(r.workIn).toBeCloseTo(20, 9);
  });

  it("pushes the piston on with Play, and no further than the cylinder allows", () => {
    expect(model.advance(base, 1, model.defaultParams).stroke).toBe(4);
    expect(model.advance({ ...base, stroke: 19 }, 1, model.defaultParams).stroke).toBe(20);
    expect(model.setVariable(base, "stroke", 99, model.defaultParams).stroke).toBe(20);
  });
});

describe("the venturi tube", () => {
  it("speeds the water up where it narrows: A₁v₁ = A₂v₂", () => {
    const r = derive({ inletSpeed: 0.4, throatArea: 2 });
    expect(r.throatSpeed).toBeCloseTo(1.2, 12);
    expect(r.wideArea * r.inletSpeed).toBeCloseTo(r.throatArea * r.throatSpeed, 12);
    expect(r.flowRate).toBeCloseTo(240, 9);
  });

  it("drops the pressure where it is fast, keeping P + ½ρv² the same", () => {
    const r = derive({ inletSpeed: 0.5, throatArea: 3 });
    expect(r.throatSpeed).toBeCloseTo(1, 12);
    expect(r.pressureDrop).toBeCloseTo(375, 9);
    expect(r.wideGauge).toBeCloseTo(4900, 9);
    expect(r.throatEnergy).toBeCloseTo(r.wideEnergy, 9);
    expect(r.wideHead).toBe(50);
    expect(r.headDrop).toBeCloseTo(375 / 98, 9);
    expect(derive({ inletSpeed: 0.5, throatArea: 6 }).pressureDrop).toBe(0);
    const narrow = derive({ inletSpeed: 0.5, throatArea: 2 });
    expect(narrow.throatHead).toBeCloseTo(50 - 1000 / 98, 9);
  });

  it("keeps some pressure in the throat at the fastest, narrowest setting", () => {
    expect(derive({ inletSpeed: 1, throatArea: 2 }).throatHead).toBeGreaterThan(5);
  });
});

describe("Torricelli's tank", () => {
  it("lets the water out at √(2gh)", () => {
    expect(flowEffluxSpeed(0.45)).toBeCloseTo(Math.sqrt(8.82), 12);
    expect(derive({ holeDepth: 0.45 }).effluxSpeed).toBeCloseTo(2.97, 2);
  });

  it("throws the jet furthest from a hole halfway down", () => {
    expect(derive({ holeDepth: 0.5 }).jetRange).toBeCloseTo(1, 12);
    expect(derive({ holeDepth: 0.2 }).jetRange).toBeCloseTo(0.8, 12);
    expect(derive({ holeDepth: 0.8 }).jetRange).toBeCloseTo(0.8, 12);
  });
});

describe("viscosity", () => {
  it("needs F = ηA·v/d to drag the plate", () => {
    const r = derive({ liquid: "glycerine", plateSpeed: 10, gap: 2 });
    expect(r.gradient).toBeCloseTo(50, 9);
    expect(r.dragForce).toBeCloseTo(7.5, 9);
    expect(derive({ liquid: "glycerine", plateSpeed: 10, gap: 4 }).dragForce).toBeCloseTo(3.75, 9);
    expect(derive({ liquid: "water", plateSpeed: 10, gap: 2 }).dragForce).toBeCloseTo(0.005, 12);
  });
});

describe("a ball falling through a liquid", () => {
  it("settles at v_t = 2r²(ρ − σ)g / 9η", () => {
    expect(flowTerminalVelocity(1e-3, 7800, 1260, 1.5)).toBeCloseTo((2e-6 * 6540 * 9.8) / 13.5, 15);
    const r = derive({ liquid: "glycerine", ball: "steel", ballRadius: 1 });
    expect(r.terminalVelocity).toBeCloseTo(0.9495, 4);
    expect(derive({ liquid: "glycerine", ball: "steel", ballRadius: 2 }).terminalVelocity).toBeCloseTo(4 * r.terminalVelocity, 9);
    expect(derive({ liquid: "castorOil", ball: "steel", ballRadius: 1 }).terminalVelocity).toBeCloseTo(1.5046, 4);
    expect(derive({ liquid: "glycerine", ball: "glass", ballRadius: 1 }).terminalVelocity).toBeCloseTo(0.18, 3);
  });

  it("speeds up to v_t, when the drag balances weight less upthrust", () => {
    const r = derive({ liquid: "glycerine", ball: "steel", ballRadius: 2 }, { t: 1 });
    expect(r.fallSpeed).toBeCloseTo(r.terminalVelocity, 9);
    expect(r.stokesDrag).toBeCloseTo(r.weight - r.upthrust, 12);
    expect(r.timeConstant).toBeCloseTo((2 * 7800 * 4e-6) / 13.5 * 1000, 9);
    expect(r.settleTime).toBeCloseTo(r.timeConstant * Math.log(100), 9);
    const early = derive({ liquid: "glycerine", ball: "steel", ballRadius: 2 }, { t: r.timeConstant / 1000 });
    expect(early.fallSpeed / early.terminalVelocity).toBeCloseTo(1 - Math.exp(-1), 9);
    expect(derive({}, { t: 0 })).toMatchObject({ fallSpeed: 0, fallDepth: 0, stokesDrag: 0 });
  });

  it("stops on the bottom of the column", () => {
    const r = derive({ liquid: "glycerine", ballRadius: 3 }, { t: 60 });
    expect(r).toMatchObject({ atBottom: 1, fallSpeed: 0, fallDepth: 30 });
  });

  it("flags where Stokes' law cannot be trusted", () => {
    expect(derive({ liquid: "glycerine", ballRadius: 3 }).stokesHolds).toBe(1);
    expect(derive({ liquid: "castorOil", ballRadius: 3 }).stokesHolds).toBe(1);
    expect(derive({ liquid: "water", ballRadius: 0.5 }).stokesHolds).toBe(0);
  });
});

describe("the Reynolds number", () => {
  it("is ρvd/η, read against NCERT's 1000 and 2000", () => {
    expect(derive({ liquid: "water", pipeSpeed: 0.05, pipeDiameter: 10 }).reynolds).toBeCloseTo(500, 9);
    expect(derive({ liquid: "water", pipeSpeed: 0.05, pipeDiameter: 10 }).regime).toBe(0);
    expect(derive({ liquid: "water", pipeSpeed: 0.15, pipeDiameter: 10 }).regime).toBe(1);
    expect(derive({ liquid: "water", pipeSpeed: 0.5, pipeDiameter: 10 }).regime).toBe(2);
    expect(derive({ liquid: "glycerine", pipeSpeed: 1, pipeDiameter: 40 }).reynolds).toBeCloseTo(33.6, 9);
    expect([flowRegimeOf(999), flowRegimeOf(1500), flowRegimeOf(2001)]).toEqual([0, 1, 2]);
  });
});

describe("surface tension", () => {
  it("holds 2S/r more pressure inside a drop and 4S/r inside a bubble", () => {
    expect(derive({ film: "water", shape: "drop", dropRadius: 1 }).excessPressure).toBeCloseTo(145.4, 9);
    expect(derive({ film: "water", shape: "drop", dropRadius: 2 }).excessPressure).toBeCloseTo(72.7, 9);
    expect(derive({ film: "soap", shape: "bubble", dropRadius: 10 }).excessPressure).toBeCloseTo(10, 9);
  });

  it("lifts water up a narrow tube, and pushes mercury down", () => {
    expect(derive({ film: "water", tubeRadius: 0.5 }).capillaryRise).toBeCloseTo(2.967, 3);
    expect(derive({ film: "water", tubeRadius: 1 }).capillaryRise).toBeCloseTo(1.4837, 4);
    const mercury = derive({ film: "mercury", tubeRadius: 1 });
    // NCERT's own exercise: a 1.00 mm tube, mercury pushed 5.34 mm down (5.345 mm unrounded).
    expect(mercury.capillaryRise).toBeCloseTo(-0.5345, 4);
    expect(mercury.climbs).toBe(0);
    expect(flowCapillaryRise(0.0727, 0, 1000, 5e-4)).toBeCloseTo(0.02967, 5);
  });
});

describe("the model", () => {
  it("clamps every input to its control's range", () => {
    expect(derive({ effort: 1e6, throatArea: 0, ballRadius: -3 })).toMatchObject({ effort: 500, throatArea: 2, ballRadius: 0.5 });
    expect(model.setVariable(base, "t", -5, model.defaultParams).t).toBe(0);
  });

  it("numbers every output, for every choice", () => {
    for (const liquid of ["water", "castorOil", "glycerine"] as const)
      for (const film of ["water", "soap", "mercury"] as const)
        for (const t of [0, 0.5, 60]) {
          const r = derive({ liquid, film, shape: "bubble" }, { t, stroke: 10 });
          for (const key of model.outputs) {
            expect(Number.isFinite(r[key]), key).toBe(true);
            expect(Object.is(r[key], -0), key).toBe(false);
          }
        }
  });
});
