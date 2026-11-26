import { describe, expect, it } from "vitest";
import { batteriesModel as model, type BatteriesParams, type BatteriesState } from "./batteries";

const P = model.defaultParams;
const derive = (state: Partial<BatteriesState> = {}, params: Partial<BatteriesParams> = {}) => model.derive({ ...model.initialize(P), ...state }, { ...P, ...params });

describe("cells", () => {
  it("give ΔG = −nFE", () => {
    expect(derive({}, { cell: "fuel" }).deltaG).toBeCloseTo(-237.39, 2);
    expect(derive({}, { cell: "dry" }).deltaG).toBeCloseTo(-289.5, 9);
  });

  it("add their voltages in series", () => {
    expect(derive({ cells: 6 }, { cell: "lead-acid" }).voltage).toBeCloseTo(12.3, 9);
    expect(derive({ cells: 3, charge: 100 }, { cell: "mercury" }).voltage).toBeCloseTo(4.05, 9);
  });

  it("sag as a dry cell runs down, but hold steady in a mercury cell", () => {
    expect(derive({ charge: 20 }, { cell: "dry" }).voltage).toBeLessThan(derive({ charge: 100 }, { cell: "dry" }).voltage);
    expect(derive({ charge: 20 }, { cell: "mercury" }).voltage).toBe(derive({ charge: 100 }, { cell: "mercury" }).voltage);
    expect(derive({ charge: 0 }, { cell: "mercury" })).toMatchObject({ voltage: 0, flat: 1 });
  });

  it("thin the lead–acid battery's acid as it discharges", () => {
    expect(derive({ charge: 100 }, { cell: "lead-acid" }).acidDensity).toBeCloseTo(1.28, 9);
    expect(derive({ charge: 0 }, { cell: "lead-acid" }).acidDensity).toBeCloseTo(1.1, 9);
    expect(derive({}, { cell: "lead-acid" }).rechargeable).toBe(1);
    expect(derive({}, { cell: "dry" })).toMatchObject({ rechargeable: 0, acidDensity: 0 });
  });
});

describe("rust", () => {
  const rust = (params: Partial<BatteriesParams>, days = 10) => derive({ days }, params);

  it("needs both water and air", () => {
    expect(rust({ water: "yes", air: "yes" }).rusts).toBe(1);
    expect(rust({ water: "no", air: "yes" }).rusts).toBe(0);
    expect(rust({ water: "yes", air: "no" }).rusts).toBe(0);
  });

  it("goes three times as fast with salt", () => {
    expect(rust({ salt: "yes" }).rustRate / rust({ salt: "no" }).rustRate).toBeCloseTo(3, 12);
    expect(rust({}, 10).rusted).toBeCloseTo(0.2, 12);
    expect(rust({ salt: "yes" }, 30).rusted).toBe(1);
  });

  it("stops under paint or tin until scratched — and scratched tin is worse than bare iron", () => {
    expect(rust({ coating: "paint" }).rusts).toBe(0);
    expect(rust({ coating: "tin" }).rusts).toBe(0);
    expect(rust({ coating: "tin", scratched: "yes" }).rustRate).toBeGreaterThan(rust({ coating: "none" }).rustRate);
    expect(rust({ coating: "paint", scratched: "yes" }).rustRate).toBeLessThan(rust({ coating: "none" }).rustRate);
  });

  it("stops under zinc even when scratched: the zinc corrodes instead", () => {
    const zinc = rust({ coating: "zinc", scratched: "yes" }, 20);
    expect(zinc).toMatchObject({ rusts: 0, rusted: 0, sacrificial: 1, ironExposed: 1 });
    expect(zinc.zincCorroded).toBeGreaterThan(0);
  });
});

describe("the model", () => {
  it("runs down and lets the days pass on Play, and numbers every output", () => {
    const s = model.advance({ cells: 1, charge: 100, days: 0 }, 2, P);
    expect(s).toMatchObject({ charge: 90, days: 6 });
    expect(model.advance({ cells: 1, charge: 2, days: 29 }, 1, P)).toMatchObject({ charge: 0, days: 0 });
    const r = derive();
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
