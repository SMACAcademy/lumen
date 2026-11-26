import { describe, expect, it } from "vitest";
import { balanceModel as model, sideText } from "./balance";

const P = model.defaultParams;
const derive = (x: number, over: Partial<typeof P> = {}, take = 0, takeX = 0) => model.derive({ x, take, takeX }, { ...P, ...over });
const EQ = { a: 2, b: 3, c: 0, d: 11 }; // 2x + 3 = 11

describe("an equation on a balance", () => {
  it("knows the answer, and balances only there", () => {
    expect(derive(4, EQ).solution).toBe(4);
    expect(derive(4, EQ)).toMatchObject({ balanced: 1, tilt: 0, leftWeight: 11, rightWeight: 11 });
    expect(derive(3, EQ)).toMatchObject({ balanced: 0, tilt: -1 }); // right heavier
    expect(derive(5, EQ)).toMatchObject({ balanced: 0, tilt: 1 }); // left heavier
  });

  it("stays balanced when the same is taken from both sides", () => {
    for (const take of [0, 1, 2, 3]) expect(derive(4, EQ, take).balanced, String(take)).toBe(1);
    const r = derive(4, { a: 3, b: 2, c: 1, d: 10 }, 2, 1); // 3x + 2 = x + 10 → 2x = 8
    expect(r).toMatchObject({ leftBoxes: 2, leftUnits: 0, rightBoxes: 0, rightUnits: 8, balanced: 1, isolated: 1, perBox: 4 });
  });

  it("never takes more than a side has", () => {
    const r = derive(4, EQ, 9, 5);
    expect(r.take).toBe(3);
    expect(r.takeX).toBe(0);
    expect(model.setVariable({ x: 0, take: 0, takeX: 0 }, "take", 50, { ...P, ...EQ }).take).toBe(3);
  });

  it("has no answer when both sides have the same boxes but different weights", () => {
    expect(derive(4, { a: 2, b: 3, c: 2, d: 5 }).solution).toBe(-1);
  });

  it("tries bigger guesses when played", () => {
    expect(model.advance({ x: 2, take: 0, takeX: 0 }, 1, P).x).toBe(3);
    expect(model.advance({ x: 20, take: 0, takeX: 0 }, 1, P).x).toBe(20);
  });

  it("writes each side as an expression", () => {
    expect(sideText(2, 3)).toBe("2x + 3");
    expect(sideText(0, 11)).toBe("11");
    expect(sideText(1, 0)).toBe("x");
    expect(sideText(0, 0)).toBe("0");
    const r = derive(4, EQ);
    for (const key of model.outputs) expect(typeof r[key], key).toBe("number");
  });
});
