import { describe, expect, it } from "vitest";
import { concentrationAt, kineticsModel, MAX_RUN, rateConstant, runEnd } from "./kinetics";

const P = kineticsModel.defaultParams;
const derive = (t: number, over: Partial<typeof P> = {}) => kineticsModel.derive({ t }, { ...P, ...over });

describe("the integrated rate law", () => {
  it("halves [A] every half-life, t½ = ln 2 / k", () => {
    const r = derive(0);
    expect(r.k).toBeCloseTo(0.1, 12); // at 298 K the rate constant is k₂₉₈ itself
    expect(r.halfLife).toBeCloseTo(6.931, 3);
    expect(derive(r.halfLife).concentration).toBeCloseTo(0.5, 12);
    expect(derive(2 * r.halfLife).concentration).toBeCloseTo(0.25, 12);
    expect(derive(3 * r.halfLife).halfLives).toBeCloseTo(3, 12);
  });

  it("does not change the half-life when there is more to start with", () => {
    expect(derive(0, { a0: 2 }).halfLife).toBeCloseTo(derive(0, { a0: 0.5 }).halfLife, 12);
    // …but the rate itself doubles with the concentration: rate = k[A].
    expect(derive(0, { a0: 2 }).initialRate).toBeCloseTo(2 * derive(0, { a0: 1 }).initialRate, 12);
  });

  it("keeps A and B adding up to what there was", () => {
    for (const t of [0, 3, 10, 25]) {
      const r = derive(t, { a0: 1.4 });
      expect(r.concentration + r.product).toBeCloseTo(1.4, 12);
    }
  });

  it("makes ln([A]₀/[A]) a straight line, kt", () => {
    expect(derive(10).lnRatio).toBeCloseTo(1, 12);
    expect(derive(20).lnRatio).toBeCloseTo(2, 12);
    expect(derive(10).lnConcentration).toBeCloseTo(Math.log(concentrationAt(P, 10)), 12);
  });

  it("uses 90 % in ln 10 / k and 99 % in twice that", () => {
    const r = derive(0);
    expect(derive(r.t90).percentReacted).toBeCloseTo(90, 9);
    expect(r.t99).toBeCloseTo(2 * r.t90, 12);
  });
});

describe("temperature", () => {
  it("roughly doubles the rate for ten degrees near room temperature (Eₐ ≈ 53 kJ/mol)", () => {
    const r = derive(0);
    expect(r.tenDegreeFactor).toBeCloseTo(2, 1);
    expect(derive(0, { T: 308 }).k / r.k).toBeCloseTo(r.tenDegreeFactor, 12);
  });

  it("makes a high barrier far more sensitive to temperature than a low one", () => {
    expect(derive(0, { Ea: 120 }).tenDegreeFactor).toBeGreaterThan(derive(0, { Ea: 20 }).tenDegreeFactor);
    expect(derive(0, { Ea: 0 }).tenDegreeFactor).toBeCloseTo(1, 12);
  });

  it("follows Arrhenius exactly: ln(k₂/k₁) = (Eₐ/R)(1/T₁ − 1/T₂)", () => {
    const k1 = rateConstant(P, 300);
    const k2 = rateConstant(P, 350);
    expect(Math.log(k2 / k1)).toBeCloseTo(((53000 / 8.314) * (1 / 300 - 1 / 350)), 9);
  });
});

describe("playing it", () => {
  it("runs as a time-lapse and stops once the reaction is all but over", () => {
    let s = kineticsModel.initialize(P);
    s = kineticsModel.advance(s, 5, P);
    expect(s.t).toBeCloseTo(5, 12);
    s = kineticsModel.advance(s, 1000, P);
    expect(s.t).toBeCloseTo(runEnd(P), 12);
    expect(derive(s.t).halfLives).toBeCloseTo(8, 9);
  });

  it("never outlasts two hours, however cold it is", () => {
    expect(runEnd({ ...P, T: 273 })).toBeLessThanOrEqual(MAX_RUN);
  });

  it("steps one half-life at a time", () => {
    const half = derive(0).halfLife;
    const once = kineticsModel.step({ t: 0 }, P, 1);
    expect(once.t).toBeCloseTo(half, 12);
    expect(kineticsModel.step(once, P, -1).t).toBeCloseTo(0, 12);
  });

  it("lets the learner scrub time directly", () => {
    expect(kineticsModel.setVariable({ t: 0 }, "t", 12, P).t).toBe(12);
    expect(kineticsModel.setVariable({ t: 0 }, "t", -3, P).t).toBe(0);
    expect(kineticsModel.getVariable({ t: 4 }, "t")).toBe(4);
  });
});
