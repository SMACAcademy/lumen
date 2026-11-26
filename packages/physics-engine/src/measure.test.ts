import { describe, expect, it } from "vitest";
import {
  calculateMeasured,
  cgsPowerOf,
  combineDims,
  countSignificantFigures,
  decimalPlacesOf,
  MEASURE_BASE_UNITS,
  MEASURE_CALCS,
  MEASURE_DERIVATION_ORDER,
  MEASURE_DERIVATIONS,
  MEASURE_EQUATIONS,
  MEASURE_RULES,
  MEASURE_UNIT_ORDER,
  MEASURE_UNITS,
  measureModel as model,
  propagateErrors,
  readMeasureRod,
  roundingCaseOf,
  roundToFigures,
  roundToPlaces,
  sameMeasureDim,
  solveDimensions,
  type MeasureDim,
  type MeasureParams,
  type MeasureState,
} from "./measure";

const base = model.initialize(model.defaultParams);
const derive = (params: Partial<MeasureParams> = {}, state: Partial<MeasureState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("SI units", () => {
  it("has seven base units", () => {
    expect(MEASURE_BASE_UNITS.map((u) => u.symbol)).toEqual(["m", "kg", "s", "A", "K", "mol", "cd"]);
  });

  it("builds the newton as kg m s⁻², and only that", () => {
    expect(derive({ unit: "newton" }, { mExp: 1, lExp: 1, tExp: -2 })).toMatchObject({ unitMatches: 1, targetM: 1, targetL: 1, targetT: -2 });
    expect(derive({ unit: "newton" }, { mExp: 1, lExp: 1, tExp: -1 }).unitMatches).toBe(0);
    expect(derive({ unit: "joule" }, { mExp: 1, lExp: 2, tExp: -2 }).unitMatches).toBe(1);
    expect(derive({ unit: "watt" }, { mExp: 1, lExp: 2, tExp: -3 }).unitMatches).toBe(1);
    expect(derive({ unit: "pascal" }, { mExp: 1, lExp: -1, tExp: -2 }).unitMatches).toBe(1);
  });

  it("writes a joule as a newton metre and a watt as a joule per second", () => {
    const add = (a: MeasureDim, b: MeasureDim): MeasureDim => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
    expect(sameMeasureDim(add(MEASURE_UNITS.newton.dim, [0, 1, 0]), MEASURE_UNITS.joule.dim)).toBe(true);
    expect(sameMeasureDim(add(MEASURE_UNITS.joule.dim, [0, 0, -1]), MEASURE_UNITS.watt.dim)).toBe(true);
    expect(sameMeasureDim(add(MEASURE_UNITS.newton.dim, [0, -2, 0]), MEASURE_UNITS.pascal.dim)).toBe(true);
  });

  it("converts to CGS with the dimensions: 1 N = 10⁵ dyne, 1 J = 10⁷ erg, 1 Pa = 10 dyne/cm², 1 kg/m³ = 10⁻³ g/cm³", () => {
    const powers = Object.fromEntries(MEASURE_UNIT_ORDER.map((id) => [id, cgsPowerOf(MEASURE_UNITS[id].dim)]));
    expect(powers).toEqual({ newton: 5, joule: 7, watt: 7, pascal: 1, density: -3 });
    expect(derive({ unit: "joule" }).cgsPower).toBe(7);
  });

  it("keeps the built powers whole and within the tiles", () => {
    expect(model.setVariable(base, "mExp", 7.4, model.defaultParams).mExp).toBe(3);
    expect(model.setVariable(base, "tExp", -2.4, model.defaultParams).tExp).toBe(-2);
    expect(Object.is(derive({}, { mExp: -0 }).mExp, -0)).toBe(false);
  });
});

describe("dimensional analysis", () => {
  it("accepts the equations of motion, ½mv² = mgh and T = 2π√(l/g)", () => {
    for (const id of ["velocity", "distance", "squares", "energy", "pendulum"] as const) expect(derive({ equation: id }).consistent, id).toBe(1);
  });

  it("rejects K = m²v³, K = ½mv² + ma and v = u + at², naming the bad term", () => {
    expect(derive({ equation: "kinetic-cube" })).toMatchObject({ consistent: 0, badTerm: 1 });
    expect(derive({ equation: "kinetic-ma" })).toMatchObject({ consistent: 0, badTerm: 2, termCount: 3 });
    expect(derive({ equation: "velocity-t2" })).toMatchObject({ consistent: 0, badTerm: 2 });
  });

  it("cannot catch a wrong number: K = (3/16)mv² is dimensionally fine", () => {
    expect(derive({ equation: "fraction" }).consistent).toBe(1);
    expect(MEASURE_EQUATIONS.fraction.terms[1]!.dim).toEqual(MEASURE_EQUATIONS.energy.terms[0]!.dim);
  });

  it("derives T ∝ √(l/g) for a pendulum, with no mass in it", () => {
    expect(solveDimensions([[1, 0, 0], [0, 1, 0], [0, 1, -2]], [0, 0, 1])).toEqual([0, 0.5, -0.5]);
    expect(derive({ derivation: "pendulum" })).toMatchObject({ solA: 0, solB: 0.5, solC: -0.5 });
  });

  it("derives T ∝ √(m/k) for a spring (amplitude drops out) and F ∝ mv²/r", () => {
    expect(derive({ derivation: "spring" })).toMatchObject({ solA: 0.5, solB: -0.5, solC: 0 });
    expect(derive({ derivation: "circle" })).toMatchObject({ solA: 1, solB: 2, solC: -1 });
  });

  it("checks every solution by putting it back", () => {
    for (const id of MEASURE_DERIVATION_ORDER) {
      const d = MEASURE_DERIVATIONS[id];
      const dims = d.inputs.map((i) => i.dim) as unknown as [MeasureDim, MeasureDim, MeasureDim];
      const s = solveDimensions(dims, d.result.dim)!;
      expect(combineDims(dims, s), id).toEqual(d.result.dim);
    }
    expect(solveDimensions([[0, 1, 0], [0, 2, 0], [1, 0, 0]], [0, 0, 1])).toBeNull();
  });

  it("says when the learner's powers match", () => {
    expect(derive({ derivation: "pendulum" }, { powA: 0, powB: 0.5, powC: -0.5 })).toMatchObject({ derived: 1, builtM: 0, builtL: 0, builtT: 1 });
    const off = derive({ derivation: "pendulum" }, { powA: 1, powB: 0.5, powC: -0.5 });
    expect(off).toMatchObject({ derived: 0, builtM: 1 });
    expect(derive({ derivation: "circle" }, { powA: 1, powB: 2, powC: -1 }).derived).toBe(1);
  });
});

describe("significant figures (NCERT rules)", () => {
  it("counts figures in NCERT's exercise numbers", () => {
    expect(["0.007", "2.64e24", "0.2370", "6.320", "6.032", "0.0006032"].map(countSignificantFigures)).toEqual([1, 3, 4, 4, 4, 4]);
  });

  it("does not count trailing zeros without a decimal point, but does with one", () => {
    expect(countSignificantFigures("4700")).toBe(2);
    expect(countSignificantFigures("4.700e3")).toBe(4);
    expect(countSignificantFigures("123")).toBe(3);
    expect(countSignificantFigures("30.0")).toBe(3);
    expect(countSignificantFigures("1.030")).toBe(4);
  });

  it("rounds an exact 5 to the even digit: 2.745 → 2.74 and 2.735 → 2.74", () => {
    expect(roundToFigures("2.745", 3)).toBe("2.74");
    expect(roundToFigures("2.735", 3)).toBe("2.74");
    expect(derive({ numeral: "i" }, { keep: 3 })).toMatchObject({ rounded: 2.74, roundedFigures: 3 });
    expect(derive({ numeral: "j" }, { keep: 3 }).rounded).toBe(2.74);
  });

  it("raises for more than 5 and leaves for less", () => {
    expect(roundToFigures("2.746", 3)).toBe("2.75");
    expect(roundToFigures("2.7451", 3)).toBe("2.75");
    expect(roundToFigures("2.744", 3)).toBe("2.74");
    expect(roundToFigures("9.96", 2)).toBe("10");
    expect(roundToFigures("0.0006032", 2)).toBe("0.00060");
    expect(roundToFigures("2.64e24", 2)).toBe("2.6e24");
    expect(roundToFigures("6.320", 6)).toBe("6.320");
  });

  it("names the rounding rule that applies", () => {
    expect(["2.745", "2.735", "2.746", "2.7451", "2.744", "2.7"].map((t) => roundingCaseOf(t, 3))).toEqual(["even", "odd", "raise", "raise", "leave", "none"]);
  });

  it("rounds to decimal places", () => {
    expect(roundToPlaces("663.821", 1)).toBe("663.8");
    expect(roundToPlaces("2.624", 2)).toBe("2.62");
    expect(roundToPlaces("0.004", 1)).toBe("0.0");
    expect(decimalPlacesOf("227.2")).toBe(1);
  });

  it("states a sum to the fewest decimal places: 436.32 + 227.2 + 0.301 = 663.8 g", () => {
    expect(calculateMeasured(MEASURE_CALCS.masses)).toEqual({ raw: "663.821", result: "663.8", rule: 1 });
    expect(derive({ calc: "masses" })).toMatchObject({ calcIsSum: 1, calcRaw: 663.821, calcResult: 663.8, calcRule: 1 });
  });

  it("works NCERT's box of gold: total 2.3 kg, difference 0.02 g", () => {
    expect(calculateMeasured(MEASURE_CALCS.box).result).toBe("2.3");
    expect(calculateMeasured(MEASURE_CALCS.gold)).toEqual({ raw: "0.02", result: "0.02", rule: 2 });
  });

  it("states a product or quotient to the fewest figures: 4.237/2.51 = 1.69, 4.234 × 1.005 = 4.255", () => {
    expect(calculateMeasured(MEASURE_CALCS.density)).toMatchObject({ result: "1.69", rule: 3 });
    expect(calculateMeasured(MEASURE_CALCS.sheet)).toMatchObject({ result: "4.255", rule: 4 });
    expect(derive({ calc: "density" })).toMatchObject({ calcIsSum: 0, calcResult: 1.69 });
    expect(derive({ calc: "density" }).calcRaw).toBeCloseTo(1.688048, 6);
    // Shown as written, so the raw result is kept to 12 figures, free of floating-point crumbs.
    expect(String(derive({ calc: "sheet" }).calcRaw)).toBe("4.25517");
    expect(String(derive({ calc: "box" }).calcRaw)).toBe("2.34032");
  });
});

describe("reading an instrument", () => {
  it("records a reading to the least count, with the figures that allows", () => {
    expect(derive({ instrument: 0.1 }, { length: 4.273 })).toMatchObject({ reading: 4.3, readingFigures: 2, readingPlaces: 1 });
    expect(derive({ instrument: 0.01 }, { length: 4.273 })).toMatchObject({ reading: 4.27, readingFigures: 3, readingPlaces: 2 });
    expect(derive({ instrument: 0.001 }, { length: 4.273 })).toMatchObject({ reading: 4.273, readingFigures: 4, readingPlaces: 3 });
    expect(derive({ instrument: 0.01 }, { length: 0.47 })).toMatchObject({ reading: 0.47, readingFigures: 2 });
  });

  it("reads a vernier as main scale + coinciding division × least count", () => {
    const r = derive({ instrument: 0.01 }, { length: 3.47 });
    expect(r).toMatchObject({ mainScale: 3.4, division: 7, leastCount: 0.01, reading: 3.47 });
    expect(r.mainScale + r.division * r.leastCount).toBeCloseTo(r.reading, 12);
  });

  it("reads a screw gauge as pitch marks + circular divisions × 0.001 cm", () => {
    const r = readMeasureRod(4.273, 0.001);
    expect(r).toMatchObject({ mainScale: 4.25, division: 23, text: "4.273" });
    expect(r.division).toBeLessThan(50);
  });

  it("keeps a trailing zero the instrument measured", () => {
    expect(readMeasureRod(5, 0.01)).toMatchObject({ text: "5.00", figures: 3 });
  });

  it("steps by exactly one least count", () => {
    const s = model.step({ ...base, length: 3.47 }, { ...model.defaultParams, instrument: 0.01 }, 1);
    expect(model.derive(s, { ...model.defaultParams, instrument: 0.01 }).reading).toBe(3.48);
  });
});

describe("errors in repeated readings (NCERT's pendulum)", () => {
  it("gives mean 2.62 s, mean absolute error 0.108 s, about 4 %", () => {
    const r = derive({}, { lastReading: 2.8 });
    expect(r.rawMean).toBeCloseTo(2.624, 12);
    expect(r.mean).toBe(2.62);
    expect(r.meanAbsError).toBeCloseTo(0.108, 12);
    expect(r.relativeError).toBeCloseTo(0.0412, 4);
    expect(r.percentError).toBeCloseTo(4.12, 2);
  });

  it("moves the mean with the last reading", () => {
    expect(derive({}, { lastReading: 2.68 }).mean).toBe(2.6);
    expect(derive({}, { lastReading: 2.3 }).mean).toBeLessThan(2.6);
  });
});

describe("combining errors", () => {
  it("adds absolute errors for a sum: (100 ± 3) Ω + (200 ± 4) Ω = (300 ± 7) Ω", () => {
    const r = derive({ rule: "series" }, { errA: 3, errB: 2 });
    expect(r.zValue).toBe(300);
    expect(r.zError).toBeCloseTo(7, 12);
    expect(r.zPercent).toBeCloseTo(2.333, 3);
  });

  it("adds absolute errors for a difference too: (50 ± 0.5) − (20 ± 0.5) = 30 ± 1 °C", () => {
    const r = derive({ rule: "difference" }, { errA: 1, errB: 2.5 });
    expect(r.zValue).toBe(30);
    expect(r.zError).toBeCloseTo(1, 12);
    expect(r.zPercent).toBeCloseTo(3.333, 3);
  });

  it("adds relative errors for a quotient: R = V/I with 5 % and 2 % is 10 Ω ± 7 %", () => {
    const r = derive({ rule: "ohm" }, { errA: 5, errB: 2 });
    expect(r.zValue).toBe(10);
    expect(r.zPercent).toBeCloseTo(7, 12);
    expect(r.zError).toBeCloseTo(0.7, 12);
  });

  it("doubles the period's error in g = 4π²L/T²: NCERT's 20.0 cm and 90 s give about 2.7 %", () => {
    const rule = MEASURE_RULES.pendulum;
    const r = propagateErrors(rule, (100 * 0.1) / 20, (100 * 1) / 90);
    expect(r.percent).toBeCloseTo(2.72, 2);
    expect(r.z).toBeCloseTo(9.748, 3);
    expect(derive({ rule: "pendulum" }, { errA: 0.5, errB: 1.1 }).zPercent).toBeCloseTo(2.7, 12);
  });

  it("triples the radius's error in the density of a sphere", () => {
    const r = derive({ rule: "sphere" }, { errA: 0.1, errB: 0.5 });
    expect(r.zValue).toBeCloseTo(7.848, 3);
    expect(r.shareB).toBeCloseTo(1.5, 12);
    expect(r.zPercent).toBeCloseTo(1.6, 12);
  });

  it("multiplies the area's percentages: 5.7 cm × 3.4 cm with 2 % and 3 % is 19.38 cm² ± 5 %", () => {
    const r = derive({ rule: "area" }, { errA: 2, errB: 3 });
    expect(r.zValue).toBeCloseTo(19.38, 12);
    expect(r.zPercent).toBeCloseTo(5, 12);
    expect(r.zError).toBeCloseTo(0.969, 3);
  });
});

describe("the model", () => {
  it("lists every output it derives, all finite", () => {
    for (const params of [{}, { unit: "density" as const, equation: "kinetic-ma" as const, derivation: "spring" as const, instrument: 0.001, numeral: "b" as const, calc: "gold" as const, rule: "sphere" as const }]) {
      const r = derive(params, { errA: 0, errB: 0, lastReading: 9 });
      expect(Object.keys(r).sort()).toEqual([...model.outputs].sort());
      for (const [k, v] of Object.entries(r)) expect(Number.isFinite(v), k).toBe(true);
    }
  });

  it("clamps every control", () => {
    const p = model.defaultParams;
    let s = base;
    for (const [id, v] of [["powA", 9], ["length", 50], ["keep", 0], ["lastReading", 1], ["errA", -4], ["errB", 40]] as const) s = model.setVariable(s, id, v, p);
    expect(s).toMatchObject({ powA: 2, length: 9.8, keep: 1, lastReading: 2.3, errA: 0, errB: 10 });
  });

  it("falls back on a sensible instrument and cases", () => {
    const r = derive({ instrument: 0.5, unit: "nope" as never });
    expect(r.leastCount).toBe(0.01);
    expect(r.unit).toBe(0);
  });
});
