import { describe, expect, it } from "vitest";
import {
  gAtRadius,
  nullPointKm,
  OF_G0_FROM_G,
  OF_GM,
  OF_GM_FROM_G,
  OF_LIMITS,
  orbitFieldModel as model,
  type OrbitFieldParams,
} from "./orbitfield";

const P = model.defaultParams;
const derive = (over: Partial<OrbitFieldParams> = {}, t = 0) => model.derive({ t }, { ...P, ...over });

describe("the constants", () => {
  it("takes g₀ = 9.8 and GM = g₀R², and knows G·M_E gives 9.77", () => {
    expect(OF_GM).toBeCloseTo(9.8 * 6.4e6 * 6.4e6, 0);
    expect(OF_GM / 1e14).toBeCloseTo(4.014, 3);
    expect(OF_GM_FROM_G / 1e14).toBeCloseTo(4.002, 3);
    expect(OF_G0_FROM_G).toBeCloseTo(9.77, 2);
  });
});

describe("g against distance from the centre", () => {
  it("is g₀ at the surface, a quarter of it at 2R and a sixteenth at 4R", () => {
    expect(derive({ probeR: 6400 }).g).toBeCloseTo(9.8, 12);
    expect(derive({ probeR: 12800 })).toMatchObject({ height: 6400, depth: 0, inside: 0 });
    expect(derive({ probeR: 12800 }).g).toBeCloseTo(2.45, 12);
    expect(derive({ probeR: 12800 }).gRatio).toBeCloseTo(0.25, 12);
    expect(derive({ probeR: 25600 }).g).toBeCloseTo(9.8 / 16, 12);
  });

  it("falls in a straight line inside a uniform Earth, to zero at the centre", () => {
    expect(derive({ probeR: 3200 })).toMatchObject({ depth: 3200, height: 0, inside: 1 });
    expect(derive({ probeR: 3200 }).g).toBeCloseTo(4.9, 12);
    expect(derive({ probeR: 1600 }).g).toBeCloseTo(2.45, 12);
    expect(derive({ probeR: 0 }).g).toBe(0);
    // Inside, g₀(1 − d/R) is exact.
    expect(derive({ probeR: 4800 }).gApprox).toBeCloseTo(derive({ probeR: 4800 }).g, 12);
  });

  it("at a height of R/2 is 9.8 × (2/3)² = 4.36, where g₀(1 − 2h/R) wrongly gives 0", () => {
    const r = derive({ probeR: 9600 });
    expect(r.g).toBeCloseTo(4.3556, 4);
    expect(r.gApprox).toBeCloseTo(0, 12);
    expect(r.approxError).toBeCloseTo(-100, 9);
  });

  it("matches g₀(1 − 2h/R) to 0.03 % at a height of 64 km", () => {
    const r = derive({ probeR: 6464 });
    expect(r.g).toBeCloseTo(9.8 / 1.01 ** 2, 12); // 9.6069
    expect(r.gApprox).toBeCloseTo(9.604, 12);
    expect(Math.abs(r.approxError)).toBeLessThan(0.04);
  });

  it("takes ω²R cos²λ ≈ 0.034 m/s² off g at the equator and nothing at the poles", () => {
    const equator = derive({ latitude: 0 });
    expect(equator.latitudeDrop).toBeCloseTo(0.03385, 5);
    expect(equator.gLatitude).toBeCloseTo(9.766, 3);
    expect(derive({ latitude: 90 }).latitudeDrop).toBeCloseTo(0, 12);
    expect(derive({ latitude: 90 }).gLatitude).toBeCloseTo(9.8, 12);
    expect(derive({ latitude: 60 }).latitudeDrop).toBeCloseTo(0.03385 / 4, 5);
  });
});

describe("the field between the Earth and the Moon", () => {
  it("is the force on each kilogram: 9.8/900 m/s² at 30 Earth radii, before the Moon's pull", () => {
    const r = derive({ fieldX: 192000 });
    expect(r.earthPull).toBeCloseTo(9.8 / 900, 12);
    expect(r.partnerPull).toBeCloseTo(OF_GM / 81.5217 / (192000e3) ** 2, 8);
    expect(r.netField).toBeCloseTo(r.earthPull - r.partnerPull, 15);
    expect(r.towards).toBe(1);
  });

  it("vanishes at the null point, D/(1 + √(M_M/M_E)) = 3.46 × 10⁵ km, 0.9 of the way to the Moon", () => {
    const x = nullPointKm(1);
    expect(x).toBeCloseTo(345710, -1);
    expect(x / 384000).toBeCloseTo(0.9, 2);
    const r = derive({ fieldX: x });
    expect(Math.abs(r.netField)).toBeLessThan(1e-12);
    expect(r).toMatchObject({ atNull: 1, towards: 0 });
    expect(derive({ fieldX: 360000 }).towards).toBe(-1);
  });

  it("moves towards the Earth when the partner is heavier, to the middle for an Earth-sized partner", () => {
    expect(nullPointKm(4)).toBeCloseTo(384000 / (1 + 2 * Math.sqrt(7.36e22 / 6e24)), 6);
    expect(nullPointKm(4)).toBeLessThan(nullPointKm(1));
    expect(nullPointKm(6e24 / 7.36e22)).toBeCloseTo(192000, 6);
  });
});

describe("the weighing machine", () => {
  it("reads mg on the ground and m(g + a) in a lift accelerating upwards", () => {
    expect(derive({ frame: "ground", bodyMass: 60 }).reading).toBeCloseTo(588, 9);
    expect(derive({ frame: "lift", liftAccel: 2, bodyMass: 60 }).reading).toBeCloseTo(708, 9);
    expect(derive({ frame: "lift", liftAccel: -4.9, bodyMass: 60 }).reading).toBeCloseTo(294, 9);
    expect(derive({ frame: "lift", liftAccel: -4.9, bodyMass: 60 }).readingKg).toBeCloseTo(30, 9);
  });

  it("reads zero in free fall", () => {
    const r = derive({ frame: "lift", liftAccel: -9.8 });
    expect(r).toMatchObject({ reading: 0, floating: 1, apparentFraction: 0 });
    expect(r.trueWeight).toBeCloseTo(588, 9);
  });

  it("reads zero in a station at 400 km, where gravity is still 9.8 × (64/68)² = 8.68 m/s²", () => {
    const r = derive({ frame: "station", orbitHeight: 400, bodyMass: 60 });
    expect(r.localG).toBeCloseTo(8.681, 3);
    expect(r.localG / 9.8).toBeCloseTo(0.886, 3);
    expect(r.frameAccel).toBeCloseTo(r.localG, 12);
    expect(r).toMatchObject({ reading: 0, floating: 1 });
    expect(r.trueWeight).toBeCloseTo(60 * 8.681, 1);
  });
});

describe("the energy of a circular orbit", () => {
  it("has KE = GMm/2r, PE = −GMm/r and E = −GMm/2r: for 400 kg at 2R, 6.27 × 10⁹, −1.25 × 10¹⁰ and −6.27 × 10⁹ J", () => {
    const r = derive({ orbitHeight: 6400, satMass: 400 });
    expect(r.orbitRadiusRatio).toBeCloseTo(2, 12);
    expect(r.kinetic).toBeCloseTo((9.8 * 6.4e6 * 400) / 4, 0); // g₀Rm/4 = 6.272e9
    expect(r.potential).toBeCloseTo(-2 * r.kinetic, 3);
    expect(r.total).toBeCloseTo(-r.kinetic, 3);
    expect(r.binding).toBeCloseTo(r.kinetic, 3);
    expect(r.kinetic / 1e9).toBeCloseTo(6.272, 3);
  });

  it("needs (GMm/2)(1/r₁ − 1/r₂) = g₀Rm/8 = 3.14 × 10⁹ J to go from 2R to 4R (NCERT's 400 kg satellite)", () => {
    const r = derive({ orbitHeight: 6400, targetHeight: 19200, satMass: 400 });
    expect(r.transferEnergy).toBeCloseTo((9.8 * 6.4e6 * 400) / 8, 0);
    expect(r.transferEnergy / 1e9).toBeCloseTo(3.136, 3);
    expect(r.transferShare).toBeCloseTo(0.5, 12);
    expect(derive({ orbitHeight: 19200, targetHeight: 6400, satMass: 400 }).transferEnergy).toBeLessThan(0);
    expect(derive({ orbitHeight: 6400, targetHeight: 6400 }).transferEnergy).toBe(0);
  });

  it("flies the ISS orbit at 7.68 km/s, once every 92.7 minutes", () => {
    const r = derive({ orbitHeight: 400 });
    expect(r.orbitalSpeed).toBeCloseTo(7.683, 3);
    expect(r.period).toBeCloseTo(92.7, 1);
  });

  it("needs GMm(1/R − 1/2r) to reach an orbit from rest on the ground", () => {
    const r = derive({ orbitHeight: 6400, satMass: 400 });
    expect(r.launchEnergy).toBeCloseTo(9.8 * 6.4e6 * 400 * (1 - 1 / 4), 0);
  });

  it("gets less negative, and slower, the higher the orbit", () => {
    const low = derive({ orbitHeight: 400 });
    const high = derive({ orbitHeight: 35800 });
    expect(high.total).toBeGreaterThan(low.total);
    expect(high.kinetic).toBeLessThan(low.kinetic);
    expect(high.period / 60).toBeCloseTo(24, 0);
  });
});

describe("as a model", () => {
  it("numbers every output, at the ends of every range", () => {
    for (const ends of [0, 1] as const) {
      const over = Object.fromEntries(Object.entries(OF_LIMITS).map(([k, v]) => [k, v[ends]])) as Partial<OrbitFieldParams>;
      for (const frame of ["ground", "lift", "station"] as const) {
        const r = derive({ ...over, frame }, 3);
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });

  it("clamps what it is given", () => {
    expect(derive({ probeR: -50 }).probeR).toBe(0);
    expect(derive({ orbitHeight: 1e9 }).orbitHeight).toBe(40000);
    expect(model.setVariable({ t: 0 }, "t", -4, P)).toEqual({ t: 0 });
  });

  it("turns the picture once every 8 seconds of play", () => {
    expect(derive({}, 2).phase).toBeCloseTo(0.25, 12);
    expect(model.advance({ t: 1 }, 0.5, P).t).toBeCloseTo(1.5, 12);
  });
});
