import { describe, expect, it } from "vitest";
import { gcd, numberLineModel as model } from "./numberline";

const P = model.defaultParams;
const derive = (n: number, over: Partial<typeof P> = {}, n2 = 0) => model.derive({ n, n2 }, { ...P, ...over });

describe("fractions on a number line", () => {
  it("puts n/d at its value", () => {
    expect(derive(3, { d: 4 }).value).toBe(0.75);
    expect(derive(0, { d: 4 }).value).toBe(0);
    expect(derive(5, { d: 4, max: 2 }).value).toBe(1.25);
  });

  it("knows when two names are the same point", () => {
    const r = derive(3, { d: 4, d2: 8 }, 6);
    expect(r.equal).toBe(1);
    expect(r.compare).toBe(0);
    expect(derive(2, { d: 3, d2: 5 }, 3).compare).toBe(1); // 2/3 > 3/5
    expect(derive(1, { d: 3, d2: 2 }, 1).compare).toBe(-1); // 1/3 < 1/2
  });

  it("writes a fraction in its simplest form", () => {
    expect(derive(6, { d: 8 })).toMatchObject({ simplestN: 3, simplestD: 4 });
    expect(derive(0, { d: 8 })).toMatchObject({ simplestN: 0, simplestD: 1 });
    expect(gcd(12, 18)).toBe(6);
  });

  it("keeps the point on the line", () => {
    expect(derive(9, { d: 4, max: 1 }).n).toBe(4);
    expect(derive(-2, { d: 4 }).n).toBe(0);
    expect(model.setVariable({ n: 1, n2: 0 }, "n", 30, { ...P, d: 4, max: 1 }).n).toBe(4);
    expect(model.getVariable({ n: 3, n2: 5 }, "n2")).toBe(5);
  });

  it("steps one piece at a time, and play walks along", () => {
    expect(model.step({ n: 1, n2: 0 }, { ...P, d: 4 }, 1).n).toBe(2);
    expect(model.step({ n: 0, n2: 0 }, { ...P, d: 4 }, -1).n).toBe(0);
    expect(model.advance({ n: 0, n2: 0 }, 1, { ...P, d: 4 }).n).toBeGreaterThan(0);
  });

  it("tells proper fractions from bigger ones, and numbers every output", () => {
    expect(derive(3, { d: 4 }).proper).toBe(1);
    expect(derive(5, { d: 4, max: 2 }).proper).toBe(0);
    const r = derive(3, { d: 4 });
    for (const key of model.outputs) expect(typeof r[key], key).toBe("number");
  });
});

describe("whole numbers on the line", () => {
  it("shows the whole numbers 0 to 10 with one piece in a whole, and adds by hopping right", () => {
    const P1 = { ...P, d: 1, max: 10 };
    expect(model.derive({ n: 7, n2: 0 }, P1)).toMatchObject({ value: 7, whole: 7, max: 10 });
    // 3 + 4: four hops right from 3.
    let s = { n: 3, n2: 0 };
    for (let k = 0; k < 4; k++) s = model.step(s, P1, 1);
    expect(model.derive(s, P1).value).toBe(7);
    // The predecessor of 7 is one hop left; nothing comes before 0.
    expect(model.step(s, P1, -1).n).toBe(6);
    expect(model.step({ n: 0, n2: 0 }, P1, -1).n).toBe(0);
    expect(model.derive({ n: 30, n2: 0 }, { ...P, d: 1, max: 99 }).value).toBe(10);
  });
});

describe("decimals on the ruler", () => {
  const dec = (hundredths: number, n = 0, over: Partial<typeof P> = {}) => model.derive({ n, n2: 0, dec: hundredths }, { ...P, ...over });

  it("puts dec hundredths at dec ÷ 100, and splits it into ones, tenths and hundredths", () => {
    expect(dec(45)).toMatchObject({ dec: 45, decimal: 0.45, onesDigit: 0, tenthsDigit: 4, hundredthsDigit: 5 });
    expect(dec(37).decimal).toBe(0.37);
    expect(dec(125, 0, { max: 2 })).toMatchObject({ decimal: 1.25, onesDigit: 1, tenthsDigit: 2, hundredthsDigit: 5 });
    expect(dec(50)).toMatchObject({ tenthsDigit: 5, hundredthsDigit: 0 });
  });

  it("compares the fraction on the first line with the decimal, exactly", () => {
    // 5/10 = 0.5 = 1/2, and 0.5 is bigger than 0.45.
    expect(dec(50, 5, { d: 10 })).toMatchObject({ value: 0.5, decCompare: 0, simplestN: 1, simplestD: 2 });
    expect(dec(45, 5, { d: 10 }).decCompare).toBe(1);
    expect(dec(80, 3, { d: 4 }).decCompare).toBe(-1); // 3/4 = 0.75 < 0.8
    expect(dec(75, 3, { d: 4 }).decCompare).toBe(0);
  });

  it("keeps the decimal point whole, on the ruler, and absent means 0", () => {
    expect(dec(250, 0, { max: 1 }).dec).toBe(100);
    expect(dec(-3).dec).toBe(0);
    expect(dec(Number.NaN).dec).toBe(0);
    expect(model.derive({ n: 0, n2: 0 }, P)).toMatchObject({ dec: 0, decimal: 0, decCompare: 0 });
    expect(model.setVariable({ n: 0, n2: 0, dec: 0 }, "dec", 44.6, { ...P, max: 1 }).dec).toBe(45);
    expect(model.setVariable({ n: 0, n2: 0, dec: 0 }, "dec", 999, { ...P, max: 2 }).dec).toBe(200);
    expect(model.getVariable({ n: 0, n2: 0, dec: 12 }, "dec")).toBe(12);
    for (const key of model.outputs) {
      expect(Number.isFinite(dec(45, 5, { d: 10 })[key]), key).toBe(true);
      expect(Object.is(dec(0)[key], -0), key).toBe(false);
    }
  });
});
