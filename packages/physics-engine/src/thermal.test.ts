import { describe, expect, it } from "vitest";
import { milestones, PHASE, START_BELOW_MELTING, stateAfter, SUBSTANCES, thermalModel as model } from "./thermal";

const P = model.defaultParams;
const derive = (heat: number, over: Partial<typeof P> = {}) => model.derive({ heat }, { ...P, ...over });
const at = (fraction: number, over: Partial<typeof P> = {}) => {
  const params = { ...P, ...over };
  return model.derive({ heat: milestones(params).total * fraction }, params);
};

describe("warming a solid", () => {
  it("starts below the melting point and climbs at Q = mcΔθ", () => {
    const cold = derive(0);
    expect(cold.temperature).toBe(-START_BELOW_MELTING);
    expect(cold.phase).toBe(PHASE.solid);
    // 0.1 kg of ice, 2100 J/(kg K): 2100 J raises it by 10 K.
    expect(derive(2100).temperature).toBeCloseTo(-10, 9);
    expect(derive(4200).temperature).toBeCloseTo(0, 9);
  });

  it("twice the mass needs twice the heat for the same rise", () => {
    expect(derive(2100, { mass: 0.2 }).temperature).toBeCloseTo(-15, 9);
    expect(derive(4200, { mass: 0.2 }).temperature).toBeCloseTo(-10, 9);
  });

  it("a small specific heat means the same joules go much further", () => {
    // Lead is 128 J/(kg K) against water ice at 2100: about sixteen times as far.
    // Small enough that neither has reached its melting point and stopped.
    const q = 200;
    const water = derive(q).temperature - derive(0).temperature;
    const lead = derive(q, { substance: "lead" }).temperature - derive(0, { substance: "lead" }).temperature;
    expect(lead / water).toBeCloseTo(2100 / 128, 6);
  });
});

describe("the flat parts", () => {
  it("melting holds the temperature at the melting point while heat pours in", () => {
    const marks = milestones(P);
    for (const fraction of [0.05, 0.4, 0.9]) {
      const r = derive(marks.toMelting + (marks.melted - marks.toMelting) * fraction);
      expect(r.temperature).toBe(0);
      expect(r.phase).toBe(PHASE.melting);
      expect(r.changingState).toBe(1);
      expect(r.meltedFraction).toBeCloseTo(fraction, 9);
    }
  });

  it("boiling does the same at the boiling point", () => {
    const marks = milestones(P);
    const r = derive((marks.toBoiling + marks.boiled) / 2);
    expect(r.temperature).toBe(100);
    expect(r.phase).toBe(PHASE.boiling);
    expect(r.boiledFraction).toBeCloseTo(0.5, 9);
  });

  it("the flat stretches are exactly mL long", () => {
    const marks = milestones(P);
    expect(marks.melted - marks.toMelting).toBeCloseTo(0.1 * SUBSTANCES.water.latentFusion, 6);
    expect(marks.boiled - marks.toBoiling).toBeCloseTo(0.1 * SUBSTANCES.water.latentVaporisation, 6);
  });

  it("water's boiling plateau dwarfs its melting one", () => {
    const marks = milestones(P);
    const melting = marks.melted - marks.toMelting;
    const boiling = marks.boiled - marks.toBoiling;
    expect(boiling / melting).toBeCloseTo(2260 / 334, 3);
  });

  it("no specific heat is quoted while the temperature is standing still", () => {
    const marks = milestones(P);
    expect(derive((marks.toMelting + marks.melted) / 2).specificHeatNow).toBe(0);
    expect(derive(marks.melted + 1000).specificHeatNow).toBe(SUBSTANCES.water.liquidHeat);
    expect(derive(100).specificHeatNow).toBe(SUBSTANCES.water.solidHeat);
  });
});

describe("the whole curve", () => {
  it("passes through all five phases in order, and never goes backwards", () => {
    const seen: number[] = [];
    let last = -Infinity;
    for (let i = 0; i <= 100; i++) {
      const r = at(i / 100);
      if (seen[seen.length - 1] !== r.phase) seen.push(r.phase);
      expect(r.temperature).toBeGreaterThanOrEqual(last - 1e-9);
      last = r.temperature;
    }
    expect(seen).toEqual([PHASE.solid, PHASE.melting, PHASE.liquid, PHASE.boiling, PHASE.gas]);
  });

  it("ends as a gas above the boiling point", () => {
    const end = at(1);
    expect(end.phase).toBe(PHASE.gas);
    expect(end.temperature).toBeCloseTo(200, 6); // 100 °C boiling plus the headroom
  });

  it("ethanol boils before water does, and asks less to get there", () => {
    expect(derive(0, { substance: "ethanol" }).boilingPoint).toBeLessThan(derive(0).boilingPoint);
    expect(milestones({ ...P, substance: "ethanol" }).total).toBeLessThan(milestones(P).total);
  });

  it("the milestones are where the phases change", () => {
    const marks = milestones(P);
    expect(stateAfter(P, marks.toMelting - 1).phase).toBe(PHASE.solid);
    expect(stateAfter(P, marks.toMelting + 1).phase).toBe(PHASE.melting);
    expect(stateAfter(P, marks.melted + 1).phase).toBe(PHASE.liquid);
    expect(stateAfter(P, marks.toBoiling + 1).phase).toBe(PHASE.boiling);
    expect(stateAfter(P, marks.boiled + 1).phase).toBe(PHASE.gas);
  });
});

describe("the heater", () => {
  it("says how long this much heat takes at the power set", () => {
    const r = derive(20000, { power: 1000 });
    expect(r.seconds).toBeCloseTo(20, 9);
    expect(r.minutes).toBeCloseTo(1 / 3, 9);
  });

  it("play pours joules in at the rated power and stops at the top", () => {
    let state = model.initialize(P);
    for (let i = 0; i < 20; i++) state = model.advance(state, 1, P);
    expect(state.heat).toBeCloseTo(10000 * 20, 6);
    for (let i = 0; i < 2000; i++) state = model.advance(state, 1, P);
    expect(state.heat).toBeCloseTo(milestones(P).total, 6);
  });

  it("stepping walks the curve in twentieths, and the heat cannot go negative", () => {
    const total = milestones(P).total;
    expect(model.step({ heat: 0 }, P, 1).heat).toBeCloseTo(total / 20, 6);
    expect(model.step({ heat: 0 }, P, -1).heat).toBe(0);
    expect(model.setVariable({ heat: 0 }, "heat", -5, P).heat).toBe(0);
    expect(model.setVariable({ heat: 0 }, "heat", 1e12, P).heat).toBeCloseTo(total, 6);
  });
});
