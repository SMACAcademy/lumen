import { describe, expect, it } from "vitest";
import { BULB_RESISTANCE, CELL_VOLTAGE, GAP_ORDER, circuitModel as model } from "./circuit";

const P = model.defaultParams;
const derive = (over: Partial<typeof P> = {}, t = 0) => model.derive({ t }, { ...P, ...over });

describe("a simple series circuit", () => {
  it("lights one bulb from one cell through a closed loop", () => {
    const r = derive();
    expect(r).toMatchObject({ closed: 1, lit: 1, voltage: CELL_VOLTAGE });
    expect(r.current).toBeCloseTo(CELL_VOLTAGE / BULB_RESISTANCE, 12);
    expect(r.brightness).toBeCloseTo(1, 12);
  });

  it("stops everything when the loop is broken", () => {
    for (const over of [{ switchClosed: "open" as const }, { gap: "rubber" as const }, { gap: "air" as const }, { cells: 0 }]) {
      const r = derive(over);
      expect(r.closed, JSON.stringify(over)).toBe(0);
      expect(r.current).toBe(0);
      expect(r.lit).toBe(0);
    }
    expect(derive({ switchClosed: "open" }).resistance).toBe(-1);
  });

  it("tells conductors from insulators", () => {
    for (const gap of ["copper", "iron", "aluminium", "graphite"] as const) expect(derive({ gap }).conducts, gap).toBe(1);
    for (const gap of ["rubber", "plastic", "wood", "glass", "air"] as const) expect(derive({ gap }).conducts, gap).toBe(0);
    // Pencil lead conducts, but not as well as a metal.
    expect(derive({ gap: "graphite" }).lit).toBe(1);
    expect(derive({ gap: "graphite" }).brightness).toBeLessThan(derive({ gap: "copper" }).brightness);
  });

  it("more cells, brighter; more bulbs in a line, dimmer", () => {
    expect(derive({ cells: 2 }).brightness).toBeCloseTo(4, 9);
    expect(derive({ bulbs: 2 }).brightness).toBeCloseTo(0.25, 9);
    expect(derive({ cells: 2, bulbs: 2 }).brightness).toBeCloseTo(1, 9);
  });

  it("in parallel, gives every bulb the full push", () => {
    const two = derive({ bulbs: 2, arrangement: "parallel" });
    expect(two.brightness).toBeCloseTo(1, 9);
    expect(two.bulbCurrent).toBeCloseTo(0.25, 9);
    expect(two.current).toBeCloseTo(0.5, 9); // the cell supplies both branches
    expect(derive({ bulbs: 3, arrangement: "parallel" }).brightness).toBeCloseTo(1, 9);
    expect(derive({ bulbs: 2 }).bulbCurrent).toBeCloseTo(derive({ bulbs: 2 }).current, 12);
  });

  it("works out the power the cells deliver: P = VI", () => {
    expect(derive({ cells: 2 }).power).toBeCloseTo(3 * 0.5, 9);
    expect(derive({ switchClosed: "open" }).power).toBe(0);
  });

  it("numbers every output, and names the gap by its place in the order", () => {
    const r = derive({ gap: "wood" });
    for (const key of model.outputs) expect(typeof r[key], key).toBe("number");
    expect(r.gap).toBe(GAP_ORDER.indexOf("wood"));
  });

  it("moves the charges along as time passes", () => {
    expect(model.advance({ t: 0 }, 0.5, P).t).toBeCloseTo(0.5, 12);
    expect(model.getVariable({ t: 2 }, "t")).toBe(2);
  });
});
