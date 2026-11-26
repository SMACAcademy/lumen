import { describe, expect, it } from "vitest";
import { COLLISION_LIMIT, collisionModel as model, collisionTime, velocitiesAfter } from "./collisions";

const P = model.defaultParams;
const derive = (t: number, over: Partial<typeof P> = {}) => model.derive({ t }, { ...P, ...over });
/** Long enough after the impact that both carts are on their new velocities. */
const afterImpact = (over: Partial<typeof P> = {}) => derive(5, over);

describe("momentum survives every collision", () => {
  it("holds for elastic, partly elastic and sticky collisions alike", () => {
    for (const restitution of [1, 0.6, 0]) {
      for (const over of [{ m1: 2, m2: 1, u1: 3, u2: 0 }, { m1: 1, m2: 3, u1: 4, u2: -2 }, { m1: 5, m2: 5, u1: 2, u2: -2 }]) {
        const r = afterImpact({ ...over, restitution });
        expect(r.momentum).toBeCloseTo(r.momentumBefore, 9);
      }
    }
  });

  it("the impulse on one cart is the momentum the other one lost", () => {
    const r = afterImpact({ m1: 2, m2: 1, u1: 3, u2: 0, restitution: 1 });
    expect(r.impulse).toBeCloseTo(r.m1 * (r.u1 - r.v1After), 9);
  });
});

describe("energy tells the collisions apart", () => {
  it("a perfectly elastic collision keeps all of it", () => {
    const r = afterImpact({ restitution: 1 });
    expect(r.energyLost).toBeCloseTo(0, 9);
    expect(r.kinetic).toBeCloseTo(r.kineticBefore, 9);
  });

  it("a sticky collision loses the most, and the carts end up together", () => {
    const r = afterImpact({ m1: 2, m2: 1, u1: 3, u2: 0, restitution: 0 });
    expect(r.v1After).toBeCloseTo(r.v2After, 9);
    expect(r.v1After).toBeCloseTo(2, 9); // (2×3 + 0)/3
    expect(r.energyLost).toBeGreaterThan(0);
    // ½(2)(9) = 9 J before, ½(3)(4) = 6 J after.
    expect(r.energyLost).toBeCloseTo(3, 9);
  });

  it("the loss grows as the collision becomes less elastic", () => {
    const loss = (restitution: number) => afterImpact({ restitution }).energyLost;
    expect(loss(1)).toBeLessThan(loss(0.5));
    expect(loss(0.5)).toBeLessThan(loss(0));
  });
});

describe("the restitution rule", () => {
  it("separation speed is e times the approach speed", () => {
    for (const e of [1, 0.75, 0.3, 0]) {
      const r = afterImpact({ m1: 2, m2: 3, u1: 4, u2: -1, restitution: e });
      expect(r.separationSpeed).toBeCloseTo(e * r.approachSpeed, 9);
    }
  });

  it("equal masses hitting elastically swap velocities", () => {
    const { v1, v2 } = velocitiesAfter({ ...P, m1: 2, m2: 2, u1: 5, u2: -1, restitution: 1 });
    expect(v1).toBeCloseTo(-1, 9);
    expect(v2).toBeCloseTo(5, 9);
  });

  it("a light cart bounces back off a much heavier one", () => {
    const { v1, v2 } = velocitiesAfter({ ...P, m1: 0.5, m2: 50, u1: 4, u2: 0, restitution: 1 });
    expect(v1).toBeLessThan(0);
    expect(v1).toBeCloseTo(-4, 0); // very nearly reversed: −3.92 m/s
    expect(v2).toBeGreaterThan(0);
    expect(v2).toBeLessThan(0.1); // the heavy one barely moves
  });
});

describe("the run", () => {
  it("works out when the carts meet, from the gap and the closing speed", () => {
    expect(collisionTime({ ...P, u1: 3, u2: 0, gap: 4 })).toBeCloseTo(4 / 3, 9);
    expect(collisionTime({ ...P, u1: 1, u2: 1 })).toBe(Number.POSITIVE_INFINITY);
    expect(collisionTime({ ...P, u1: 0, u2: 2 })).toBe(Number.POSITIVE_INFINITY); // moving apart
  });

  it("each cart travels steadily, then changes velocity exactly at the impact", () => {
    const params = { ...P, u1: 3, u2: 0, gap: 4, m1: 2, m2: 1, restitution: 1 };
    const impact = collisionTime(params);
    const just = model.derive({ t: impact - 0.01 }, params);
    const after = model.derive({ t: impact + 0.01 }, params);
    expect(just.collided).toBe(0);
    expect(just.v1).toBeCloseTo(3, 9);
    expect(after.collided).toBe(1);
    expect(after.v1).toBeCloseTo(after.v1After, 9);
    // Positions are continuous through the collision.
    expect(after.x1).toBeCloseTo(just.x1, 1);
    expect(after.x2).toBeCloseTo(just.x2, 1);
  });

  it("carts that never meet just keep going", () => {
    const r = derive(3, { u1: 0, u2: 2 });
    expect(r.collided).toBe(0);
    expect(r.x2).toBeGreaterThan(r.x1);
  });

  it("scrubbing stays inside the run", () => {
    expect(model.setVariable({ t: 1 }, "t", -2, P).t).toBe(0);
    expect(model.setVariable({ t: 1 }, "t", 99, P).t).toBe(COLLISION_LIMIT);
  });
});
