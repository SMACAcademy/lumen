import { describe, expect, it } from "vitest";
import { tryItResults, tryItSetup } from "./tryit";

describe("trying a formula on its lab's model", () => {
  it("offers the equation's own inputs, and a matching slider for a symbol it only mentions", () => {
    const setup = tryItSetup("motion-in-a-straight-line", "velocity-time")!;
    expect(setup.inputs.map((v) => v.id)).toEqual(expect.arrayContaining(["u", "t", "a"]));
    expect(setup.outputs.map((q) => q.id)).toContain("v");
  });

  it("computes with the model: more time, more velocity", () => {
    const setup = tryItSetup("motion-in-a-straight-line", "velocity-time")!;
    const early = tryItResults(setup, { ...setup.initial, u: 2, a: 2, t: 1 });
    const later = tryItResults(setup, { ...setup.initial, u: 2, a: 2, t: 3 });
    expect(later.v).toBeGreaterThan(early.v as number);
    expect(later.v).toBeCloseTo(8, 6);
  });

  it("doubling the depth doubles the gauge pressure", () => {
    const setup = tryItSetup("properties-of-fluids", "pressure-depth")!;
    // The tank is 1.5 m deep, so compare 0.5 m with 1 m.
    const one = tryItResults(setup, { ...setup.initial, depth: 0.5 });
    const two = tryItResults(setup, { ...setup.initial, depth: 1 });
    expect(two.gaugePressure as number).toBeCloseTo(2 * (one.gaugePressure as number), 6);
  });

  it("says no for an equation it cannot find", () => {
    expect(tryItSetup("motion-in-a-straight-line", "nope")).toBeNull();
    expect(tryItSetup("nope", "velocity-time")).toBeNull();
  });
});
