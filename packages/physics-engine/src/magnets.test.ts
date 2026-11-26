import { describe, expect, it } from "vitest";
import { MAGNET_MATERIALS, magnetsModel as model, needleAngle } from "./magnets";

const P = model.defaultParams;
const derive = (gap: number, over: Partial<typeof P> = {}, around = 0) => model.derive({ gap, around }, { ...P, ...over });

describe("two magnets", () => {
  it("pull together when unlike poles face, and push apart when like poles do", () => {
    expect(derive(5, { facing: "N-S" })).toMatchObject({ attracts: 1, repels: 0 });
    expect(derive(5, { facing: "N-S" }).force).toBeGreaterThan(0);
    for (const facing of ["N-N", "S-S"] as const) {
      expect(derive(5, { facing })).toMatchObject({ attracts: 0, repels: 1 });
      expect(derive(5, { facing }).force).toBeLessThan(0);
    }
  });

  it("weaken fast with distance: twice as far, a quarter of the force", () => {
    expect(derive(10).force / derive(5).force).toBeCloseTo(0.25, 9);
    expect(derive(5, { facing: "N-N" }).strength).toBeCloseTo(-derive(5, { facing: "N-N" }).force, 12);
  });
});

describe("what a magnet picks up", () => {
  it("knows magnetic materials", () => {
    for (const m of ["iron", "steel", "nickel", "cobalt"] as const) expect(derive(5, { material: m }).magnetic, m).toBe(1);
    for (const m of ["copper", "aluminium", "wood", "plastic", "glass", "rubber"] as const) expect(derive(5, { material: m }).magnetic, m).toBe(0);
    expect(Object.keys(MAGNET_MATERIALS)).toHaveLength(10);
  });

  it("pulls a magnetic object in only when it is close enough", () => {
    expect(derive(3, { partner: "object", material: "iron" }).pulled).toBe(1);
    expect(derive(15, { partner: "object", material: "iron" }).pulled).toBe(0);
    expect(derive(1, { partner: "object", material: "wood" }).pulled).toBe(0);
  });
});

describe("a compass round a bar magnet", () => {
  it("points away from N beyond the N end, back towards S beyond the S end, and from N to S alongside", () => {
    expect(needleAngle(0)).toBeCloseTo(0, 9);
    expect(needleAngle(180) % 360).toBeCloseTo(0, 9);
    expect(needleAngle(90)).toBeCloseTo(180, 9);
    expect(derive(5, {}, 90).needle).toBeCloseTo(180, 9);
  });

  it("numbers every output", () => {
    const r = derive(5);
    for (const key of model.outputs) expect(typeof r[key], key).toBe("number");
  });
});
