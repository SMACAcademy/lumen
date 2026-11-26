import { describe, expect, it } from "vitest";
import {
  integrationModel as model,
  integrationProbeStrip,
  PARTIAL_FRACTION_ORDER,
  PARTIAL_FRACTIONS,
  PARTS_PAIR_ORDER,
  PARTS_PAIRS,
  SUBSTITUTION_ORDER,
  SUBSTITUTIONS,
  type IntegrationParams,
  type IntegrationState,
} from "./integration";

const base: IntegrationState = { upper: 1, strips: 4, probe: 0.5, sweep: 1, fracUpper: 1 };
const derive = (params: Partial<IntegrationParams> = {}, state: Partial<IntegrationState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const H = 1e-5;

/** A fine midpoint sum, independent of anything the model computes. */
function numerical(f: (x: number) => number, a: number, b: number, n = 20000): number {
  const h = (b - a) / n;
  let total = 0;
  for (let i = 0; i < n; i++) total += f(a + (i + 0.5) * h);
  return total * h;
}

describe("substitution", () => {
  it("stores derivatives and antiderivatives that check out", () => {
    for (const id of SUBSTITUTION_ORDER) {
      const s = SUBSTITUTIONS[id];
      for (const x of [0.2, 0.5, 0.7]) expect(s.dg(x), `${id} g′`).toBeCloseTo((s.g(x + H) - s.g(x - H)) / (2 * H), 6);
      for (const u of [0.3, 0.8, 1.5]) expect((s.F(u + H) - s.F(u - H)) / (2 * H), `${id} F′`).toBeCloseTo(s.f(u), 6);
    }
  });

  it("gives the same area on both axes: ∫₀ᵇ f(g(x))g′(x) dx = ∫ f(u) du over [g(0), g(b)]", () => {
    for (const id of SUBSTITUTION_ORDER) {
      const s = SUBSTITUTIONS[id];
      const r = derive({ substitution: id }, { upper: 1.6 });
      const onX = numerical((x) => s.f(s.g(x)) * s.dg(x), 0, r.upper);
      const onU = numerical(s.f, r.uLower, r.uUpper);
      expect(r.exactSub, id).toBeCloseTo(onX, 8);
      expect(r.exactSub, id).toBeCloseTo(onU, 8);
    }
  });

  it("has the exact values quoted in the lab", () => {
    expect(derive({ substitution: "exp-square" }, { upper: 1 }).exactSub).toBeCloseTo(Math.E - 1, 12);
    expect(derive({ substitution: "sin-cos" }, { upper: 1.6 })).toMatchObject({ upper: Math.PI / 2, uLower: 0, uUpper: 1, exactSub: 0.5 });
    expect(derive({ substitution: "double" }, { upper: 1.6 }).exactSub).toBeCloseTo(1, 12);
    const log = derive({ substitution: "log" }, { upper: 1 });
    expect(log).toMatchObject({ uLower: 1, uUpper: 2 });
    expect(log.exactSub).toBeCloseTo(Math.log(2) / 2, 12);
    expect(log.exactSub).toBeCloseTo(0.3466, 4);
  });

  it("makes both strip sums close in on the exact area as the strips get thinner", () => {
    for (const id of SUBSTITUTION_ORDER) {
      let last = Infinity;
      for (const strips of [1, 2, 4, 8, 16, 32, 64]) {
        const r = derive({ substitution: id }, { upper: 1.6, strips });
        expect(r.subError, `${id} ${strips}`).toBeLessThan(last);
        last = r.subError;
      }
      const fine = derive({ substitution: id }, { upper: 1.6, strips: 64 });
      expect(Math.abs(fine.xSum - fine.exactSub), id).toBeLessThan(2e-4);
      expect(Math.abs(fine.uSum - fine.exactSub), id).toBeLessThan(2e-4);
    }
    expect(derive({ substitution: "exp-square" }, { strips: 2 }).xSum).toBeCloseTo(1.582, 3);
    expect(derive({ substitution: "exp-square" }, { strips: 32 }).xSum).toBeCloseTo(1.718, 3);
    expect(derive({ substitution: "sin-cos" }, { upper: 1.6, strips: 8 }).subError).toBeGreaterThan(0.003);
    expect(derive({ substitution: "sin-cos" }, { upper: 1.6, strips: 16 }).subError).toBeLessThan(0.001);
  });

  it("stretches a strip's width by g′ and shrinks its height by the same factor", () => {
    for (const id of SUBSTITUTION_ORDER) {
      const s = SUBSTITUTIONS[id];
      const r = derive({ substitution: id }, { probe: 0.4 });
      expect(r.heightX, id).toBeCloseTo(r.heightU * r.stretch, 12);
      expect(r.probeU, id).toBeCloseTo(s.g(0.4), 12);
      // A thin strip at the probe: its width on the u-axis is g′ times its width on the x-axis.
      expect((s.g(0.4 + H) - s.g(0.4)) / H, id).toBeCloseTo(r.stretch, 4);
    }
    expect([0.25, 1].map((probe) => derive({ substitution: "exp-square" }, { probe }).stretch)).toEqual([0.5, 2]);
    expect(derive({ substitution: "double" }, { probe: 0.1 }).stretch).toBe(2);
    expect(derive({ substitution: "double" }, { probe: 0.7 }).stretch).toBe(2);
  });

  it("finds the strip the probe is in, and keeps the probe on [0, b]", () => {
    expect(integrationProbeStrip(0.5, 1, 4)).toBe(2);
    expect(integrationProbeStrip(1, 1, 4)).toBe(3);
    expect(integrationProbeStrip(0, 1, 4)).toBe(0);
    expect(derive({ substitution: "exp-square" }, { upper: 0.5, probe: 1.2 }).probe).toBe(0.5);
  });
});

describe("integration by parts", () => {
  it("stores derivatives and antiderivatives that check out", () => {
    for (const id of PARTS_PAIR_ORDER) {
      const p = PARTS_PAIRS[id];
      for (const s of [0.2, 0.5, 0.8]) {
        const t = p.a + (p.b - p.a) * s;
        expect(p.du(t), `${id} u′`).toBeCloseTo((p.u(t + H) - p.u(t - H)) / (2 * H), 6);
        expect(p.dv(t), `${id} v′`).toBeCloseTo((p.v(t + H) - p.v(t - H)) / (2 * H), 6);
        expect((p.udvPrimitive(t + H) - p.udvPrimitive(t - H)) / (2 * H), `${id} ∫u dv`).toBeCloseTo(p.u(t) * p.dv(t), 6);
        expect((p.vduPrimitive(t + H) - p.vduPrimitive(t - H)) / (2 * H), `${id} ∫v du`).toBeCloseTo(p.v(t) * p.du(t), 6);
      }
    }
  });

  it("has the two areas fill the rectangle: ∫u dv + ∫v du = [uv], at every stage", () => {
    for (const id of PARTS_PAIR_ORDER) {
      const p = PARTS_PAIRS[id];
      for (const sweep of [0, 0.3, 0.7, 1]) {
        const r = derive({ pair: id }, { sweep });
        expect(r.udv + r.vdu, `${id} ${sweep}`).toBeCloseTo(r.uv, 12);
        expect(r.udv, `${id} ${sweep}`).toBeCloseTo(numerical((t) => p.u(t) * p.dv(t), p.a, r.t), 8);
        expect(r.vdu, `${id} ${sweep}`).toBeCloseTo(numerical((t) => p.v(t) * p.du(t), p.a, r.t), 8);
      }
      expect(derive({ pair: id }, { sweep: 1 }).udv, id).toBeCloseTo(p.exact, 12);
    }
  });

  it("gives ∫₀¹ x eˣ dx = e − (e − 1) = 1, and the other values quoted", () => {
    const xe = derive({ pair: "x-exp" }, { sweep: 1 });
    expect(xe).toMatchObject({ u0: 0, v0: 1, u1: 1 });
    expect(xe.uv).toBeCloseTo(Math.E, 12);
    expect(xe.vdu).toBeCloseTo(Math.E - 1, 12);
    expect(xe.udv).toBeCloseTo(1, 12);
    expect(derive({ pair: "x-cos" }, { sweep: 1 }).udv).toBeCloseTo(0.5708, 4);
    expect(derive({ pair: "x-cos" }, { sweep: 1 }).vdu).toBeCloseTo(1, 12);
    const ln = derive({ pair: "log" }, { sweep: 1 });
    expect(ln.uv).toBeCloseTo(Math.E, 12);
    expect(ln.vdu).toBeCloseTo(Math.E - 1, 12);
    expect(ln.udv).toBeCloseTo(1, 12);
    expect(derive({ pair: "x-log" }, { sweep: 1 }).udv).toBeCloseTo(2.0973, 4);
  });

  it("starts with nothing drawn and nothing enclosed", () => {
    for (const id of PARTS_PAIR_ORDER) expect(derive({ pair: id }, { sweep: 0 }), id).toMatchObject({ uv: 0, udv: 0, vdu: 0 });
  });
});

describe("partial fractions", () => {
  it("splits each fraction into pieces that add back to it", () => {
    for (const id of PARTIAL_FRACTION_ORDER) {
      const f = PARTIAL_FRACTIONS[id];
      for (const x of [0, 0.5, 1, 2.5, 4]) expect(f.A / (x + f.p) + f.B / (x + f.q), `${id} at ${x}`).toBeCloseTo(f.f(x), 12);
    }
  });

  it("gives areas that agree with a numerical sum, piece by piece and whole", () => {
    for (const id of PARTIAL_FRACTION_ORDER) {
      const f = PARTIAL_FRACTIONS[id];
      for (const c of [0.5, 1, 4]) {
        const r = derive({ fraction: id }, { fracUpper: c });
        expect(r.areaA, `${id} A`).toBeCloseTo(numerical((x) => f.A / (x + f.p), 0, c), 8);
        expect(r.areaB, `${id} B`).toBeCloseTo(numerical((x) => f.B / (x + f.q), 0, c), 8);
        expect(r.areaWhole, `${id} whole`).toBeCloseTo(numerical(f.f, 0, c), 8);
      }
      expect(derive({ fraction: id }, { fracUpper: 1 }).areaWhole, id).toBeCloseTo(f.exactToOne, 12);
    }
  });

  it("has ∫₀¹ 1/((x + 1)(x + 2)) dx = ln 2 − ln(3/2) = ln(4/3)", () => {
    const r = derive({ fraction: "one-two" }, { fracUpper: 1 });
    expect(r).toMatchObject({ coefA: 1, coefB: -1 });
    expect(r.areaA).toBeCloseTo(Math.log(2), 12);
    expect(r.areaB).toBeCloseTo(-Math.log(1.5), 12);
    expect(r.areaWhole).toBeCloseTo(Math.log(4 / 3), 12);
    expect(r.areaWhole).toBeCloseTo(0.2877, 4);
    expect(derive({ fraction: "with-x" }).coefA).toBe(2);
    expect(derive({ fraction: "one-three" }).areaWhole).toBeCloseTo(0.2027, 4);
    expect(derive({ fraction: "with-x" }).areaWhole).toBeCloseTo(0.9808, 4);
  });

  it("has the values quoted for a longer reach: more area below the axis, more in all", () => {
    const three = derive({ fraction: "one-two" }, { fracUpper: 3 });
    expect(three.areaA).toBeCloseTo(Math.log(4), 12);
    expect(three.areaB).toBeCloseTo(-Math.log(5 / 2), 12);
    expect(three.areaWhole).toBeCloseTo(0.47, 4);
    const four = derive({ fraction: "one-two" }, { fracUpper: 4 });
    expect(four.areaB).toBeCloseTo(-1.0986, 4);
    expect(four.areaWhole).toBeCloseTo(0.5108, 4);
    expect(derive({ substitution: "sin-cos" }, { upper: 1.6, strips: 16 }).xSum).toBeCloseTo(0.5008, 4);
  });

  it("needs 15 strips, not 16, to bring ∫ sin x cos x dx within 0.001 (the challenge)", () => {
    const sub = (strips: number) => derive({ substitution: "sin-cos" }, { upper: 1.6, strips });
    expect(sub(14).subError).toBeGreaterThan(0.001);
    expect(sub(15).subError).toBeLessThan(0.001);
    expect(sub(15).xSum).toBeCloseTo(0.5009, 4);
    expect(sub(8).subError).toBeCloseTo(0.0032, 4);
  });
});

describe("the model", () => {
  it("multiplies the strips and draws the parts curve on Play, stopping at the ends", () => {
    let s = model.initialize(model.defaultParams);
    s = { ...s, strips: 2, sweep: 0 };
    for (let i = 0; i < 200; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.strips).toBe(64);
    expect(s.sweep).toBe(1);
    expect(model.step({ ...base, strips: 4 }, model.defaultParams, 1).strips).toBe(8);
    expect(model.step({ ...base, strips: 1 }, model.defaultParams, -1).strips).toBe(1);
  });

  it("clamps what it is given and numbers every output", () => {
    expect(model.setVariable(base, "upper", 9, model.defaultParams).upper).toBe(1.6);
    expect(model.setVariable(base, "strips", 0, model.defaultParams).strips).toBe(1);
    expect(model.setVariable(base, "sweep", -1, model.defaultParams).sweep).toBe(0);
    expect(model.setVariable(base, "fracUpper", 10, model.defaultParams).fracUpper).toBe(4);
    for (const substitution of SUBSTITUTION_ORDER) {
      for (const pair of PARTS_PAIR_ORDER) {
        for (const fraction of PARTIAL_FRACTION_ORDER) {
          for (const state of [
            { upper: -5, strips: -3, probe: -1, sweep: -1, fracUpper: -9 },
            { upper: 99, strips: 999, probe: 99, sweep: 9, fracUpper: 99 },
          ]) {
            const r = model.derive(state, { substitution, pair, fraction });
            for (const key of model.outputs) {
              expect(Number.isFinite(r[key]), `${substitution} ${pair} ${fraction} ${key}`).toBe(true);
              expect(Object.is(r[key], -0), `${key} is −0`).toBe(false);
            }
          }
        }
      }
    }
  });
});
