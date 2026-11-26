import { describe, expect, it } from "vitest";
import {
  SHM_DRIVEN_CAP,
  SHM_TIME_MAX,
  shmAgm,
  shmDampedX,
  shmDrivenAmplitude,
  shmJacobiSn,
  shmLargeSwingFactor,
  shmModel as model,
  shmPendulumTheta,
} from "./shm";

const P = model.defaultParams;
const DEG = Math.PI / 180;
const derive = (over: Partial<typeof P> = {}, t = 0) => model.derive({ t }, { ...P, ...over });

describe("a mass on a spring", () => {
  it("has T = 2π√(m/k): 0.5 kg on 50 N/m swings at ω = 10 rad/s", () => {
    const r = derive();
    expect(r.omega).toBeCloseTo(10, 12);
    expect(r.period).toBeCloseTo((2 * Math.PI) / 10, 12);
    expect(r.frequency).toBeCloseTo(10 / (2 * Math.PI), 12);
    expect(derive({ mass: 2 }).period / r.period).toBeCloseTo(2, 12);
    expect(derive({ k: 200 }).period / r.period).toBeCloseTo(0.5, 12);
  });

  it("follows x = A cos(ωt + φ), with v = −Aω sin(ωt + φ)", () => {
    for (const t of [0, 0.1, 0.37, 1.2]) {
      const r = derive({ phase: 0.5 }, t);
      expect(r.x).toBeCloseTo(0.1 * Math.cos(10 * t + 0.5), 12);
      expect(r.v).toBeCloseTo(-1 * Math.sin(10 * t + 0.5), 12);
    }
  });

  it("accelerates back towards the middle, a = −ω²x", () => {
    for (const t of [0, 0.2, 0.9]) {
      const r = derive({}, t);
      expect(r.a).toBeCloseTo(-100 * r.x, 10);
    }
    expect(derive().a).toBeCloseTo(-10, 12);
    expect(derive().amax).toBeCloseTo(10, 12);
  });

  it("has speed ω√(A² − x²) everywhere, greatest in the middle", () => {
    for (const t of [0.05, 0.3, 0.71]) {
      const r = derive({}, t);
      expect(r.speed).toBeCloseTo(r.omega * Math.sqrt(r.amplitude ** 2 - r.x ** 2), 10);
    }
    expect(derive().vmax).toBeCloseTo(1, 12);
  });

  it("starts in the middle, moving left, with φ = π/2", () => {
    const r = derive({ phase: Math.PI / 2 });
    expect(Math.abs(r.x)).toBeLessThan(1e-12);
    expect(r.v).toBeCloseTo(-1, 12);
  });

  it("keeps the phase angle between 0 and 2π", () => {
    expect(derive({}, 0.3).phaseNow).toBeCloseTo(3, 12);
    expect(derive({}, 1).phaseNow).toBeCloseTo(10 - 2 * Math.PI, 12);
    expect(derive({ phase: -Math.PI / 2 }).phaseNow).toBeCloseTo((3 * Math.PI) / 2, 12);
  });
});

describe("energy", () => {
  it("is ½kA² in total, shared between kinetic and potential", () => {
    expect(derive().energy).toBeCloseTo(0.25, 12);
    for (const t of [0, 0.13, 0.5, 2]) {
      const r = derive({}, t);
      expect(r.ke + r.pe).toBeCloseTo(0.25, 12);
      expect(r.total).toBeCloseTo(0.25, 12);
    }
    expect(derive().ke).toBe(0);
    expect(derive({ phase: Math.PI / 2 }).pe).toBeLessThan(1e-20);
  });

  it("grows with the square of the amplitude", () => {
    expect(derive({ amplitude: 0.1 }).energy / derive({ amplitude: 0.05 }).energy).toBeCloseTo(4, 12);
  });
});

describe("springs in series and parallel", () => {
  it("add as k₁ + k₂ side by side and as 1/k = 1/k₁ + 1/k₂ end to end", () => {
    expect(derive({ arrangement: "parallel" }).kEff).toBe(100);
    expect(derive({ arrangement: "series" }).kEff).toBeCloseTo(25, 12);
    expect(derive({ arrangement: "series", k: 30, k2: 60 }).kEff).toBeCloseTo(20, 12);
    expect(derive({ arrangement: "one", k2: 10 }).kEff).toBe(50);
    const r = derive({ k: 30, k2: 60 });
    expect([r.kSeries, r.kParallel]).toEqual([20, 90]);
  });

  it("swing slower in series and faster in parallel", () => {
    expect(derive({ arrangement: "series" }).period).toBeCloseTo(0.8886, 4);
    expect(derive({ arrangement: "parallel" }).period).toBeCloseTo(0.4443, 4);
  });
});

describe("damping", () => {
  it("shrinks the amplitude as e^(−bt/2m) and slows the swing a little", () => {
    const r = derive({ damping: 0.2 }, 2);
    expect(r.gamma).toBeCloseTo(0.2, 12);
    expect(r.amplitudeNow).toBeCloseTo(0.1 * Math.exp(-0.4), 12);
    expect(r.omegaDamped).toBeCloseTo(Math.sqrt(100 - 0.04), 12);
    expect(r.x).toBeCloseTo(0.1 * Math.exp(-0.4) * Math.cos(r.omegaDamped * 2), 12);
    expect(r.halfLife).toBeCloseTo(Math.LN2 / 0.2, 12);
    expect(derive().halfLife).toBe(0);
    expect(shmDampedX(0.1, 0.5, 50, 0.2, 0, 2)).toBeCloseTo(r.x, 12);
  });

  it("obeys m a = −kx − bv", () => {
    const r = derive({ damping: 0.6, phase: 0.3 }, 1.1);
    expect(0.5 * r.a).toBeCloseTo(-50 * r.x - 0.6 * r.v, 10);
  });

  it("loses energy", () => {
    expect(derive({ damping: 0.2 }, 5).total).toBeLessThan(derive({ damping: 0.2 }, 1).total);
  });
});

describe("forced oscillations", () => {
  it("has the steady amplitude F₀ / √(m²(ω² − ω_d²)² + ω_d²b²)", () => {
    const r = derive({ damping: 0.2, driveOmega: 9 });
    expect(r.drivenAmplitude).toBeCloseTo(0.5 / Math.sqrt(0.25 * 19 ** 2 + 81 * 0.04), 12);
    expect(derive({ damping: 0.2, driveOmega: 10 }).drivenAmplitude).toBeCloseTo(0.25, 12);
    expect(shmDrivenAmplitude(0.5, 0.5, 50, 0.2, 9)).toBeCloseTo(r.drivenAmplitude, 12);
  });

  it("peaks at resonance, and less sharply with more damping", () => {
    expect(derive({ damping: 0.2, driveOmega: 10 }).resonance).toBe(1);
    expect(derive({ damping: 0.2, driveOmega: 9.5 }).resonance).toBe(0);
    expect(derive({ damping: 0.6, driveOmega: 10 }).drivenAmplitude).toBeCloseTo(0.5 / 6, 12);
    expect(derive({ damping: 0.2 }).resonanceOmega).toBeCloseTo(Math.sqrt(100 - 0.08), 12);
  });

  it("caps the runaway amplitude when nothing damps it", () => {
    const r = derive({ damping: 0, driveOmega: 10 });
    expect(r).toMatchObject({ drivenAmplitude: SHM_DRIVEN_CAP, runaway: 1, resonance: 1 });
  });

  it("lags behind the force by up to π", () => {
    expect(derive({ damping: 0.2, driveOmega: 1 }).lag).toBeLessThan(0.01);
    expect(derive({ damping: 0.2, driveOmega: 10 }).lag).toBeCloseTo(Math.PI / 2, 12);
    expect(derive({ damping: 0.2, driveOmega: 30 }).lag).toBeGreaterThan(3);
  });
});

describe("the simple pendulum", () => {
  it("has T = 2π√(L/g) for small swings, whatever the mass", () => {
    expect(derive().periodPendulum).toBeCloseTo(2 * Math.PI * Math.sqrt(1 / 9.8), 12);
    expect(derive({ mass: 4 }).periodPendulum).toBe(derive({ mass: 0.1 }).periodPendulum);
    expect(derive({ length: 0.25 }).periodPendulum / derive().periodPendulum).toBeCloseTo(0.5, 12);
  });

  it("is slower than that at wide swings", () => {
    expect(shmAgm(1, 1)).toBe(1);
    expect(shmLargeSwingFactor(1e-6)).toBeCloseTo(1, 12);
    // The series 1 + θ₀²/16 + 11θ₀⁴/3072 + … at 60°.
    const t60 = Math.PI / 3;
    expect(shmLargeSwingFactor(t60)).toBeCloseTo(1 + t60 ** 2 / 16 + (11 * t60 ** 4) / 3072 + (173 * t60 ** 6) / 737280, 4);
    expect(derive({ swing: 60 * DEG }).swingError).toBeCloseTo(7.32, 2);
    expect(derive({ swing: 5 * DEG }).swingError).toBeLessThan(0.05);
  });

  it("swings exactly as the pendulum equation θ″ = −(g/L) sin θ says", () => {
    const g = 9.8;
    const L = 1;
    const theta0 = 70 * DEG;
    let th = theta0;
    let w = 0;
    const h = 1e-4;
    const f = (a: number) => (-g / L) * Math.sin(a);
    for (let i = 1; i <= 30000; i++) {
      const [a1, b1] = [w, f(th)];
      const [a2, b2] = [w + (h / 2) * b1, f(th + (h / 2) * a1)];
      const [a3, b3] = [w + (h / 2) * b2, f(th + (h / 2) * a2)];
      const [a4, b4] = [w + h * b3, f(th + h * a3)];
      th += (h / 6) * (a1 + 2 * a2 + 2 * a3 + a4);
      w += (h / 6) * (b1 + 2 * b2 + 2 * b3 + b4);
      if (i % 2500 === 0) expect(shmPendulumTheta(theta0, Math.sqrt(g / L), i * h)).toBeCloseTo(th, 8);
    }
    expect(derive({ swing: theta0 }, 0).theta).toBeCloseTo(theta0, 12);
  });

  it("uses Jacobi's sn correctly", () => {
    expect(shmJacobiSn(0.7, 0)).toBeCloseTo(Math.sin(0.7), 14);
    // sin φ where ∫₀^φ dθ / √(1 − ½ sin²θ) = 0.7, by quadrature.
    expect(shmJacobiSn(0.7, 0.5)).toBeCloseTo(0.62434009, 7);
  });

  it("gives T² on a line of slope 4π²/g, and the g you would measure", () => {
    const r = derive();
    expect(r.slope).toBeCloseTo(4.0284, 4);
    expect(r.periodSquared).toBeCloseTo(r.slope * r.length, 12);
    expect(r.time20).toBeCloseTo(20 * r.periodExact, 12);
    expect(derive({ swing: 1 * DEG }).gMeasured).toBeCloseTo(9.8, 3);
    expect(derive({ swing: 60 * DEG }).gMeasured).toBeCloseTo(8.51, 2);
  });
});

describe("angular SHM", () => {
  it("twists with T = 2π√(I/κ)", () => {
    expect(derive({ kappa: 0.04, inertia: 0.01 }).torsionPeriod).toBeCloseTo(Math.PI, 12);
    const r = derive({}, 0.5);
    expect(r.angularTheta).toBeCloseTo(r.swing * Math.cos(Math.sqrt(10) * 0.5), 12);
  });

  it("swings a rod from one end with T = 2π√(2L/3g)", () => {
    const r = derive({ body: "rod" });
    expect(r.rodPeriod).toBeCloseTo(2 * Math.PI * Math.sqrt(2 / (3 * 9.8)), 12);
    expect(r.angularPeriod).toBe(r.rodPeriod);
    expect(r.rodPeriod / r.periodPendulum).toBeCloseTo(Math.sqrt(2 / 3), 12);
  });
});

describe("time", () => {
  it("runs on play and starts again after the last second", () => {
    expect(model.advance({ t: 1 }, 0.25, P).t).toBeCloseTo(1.25, 12);
    expect(model.advance({ t: SHM_TIME_MAX - 0.01 }, 0.02, P).t).toBeCloseTo(0.01, 9);
  });

  it("steps a twelfth of a period and clamps to the range", () => {
    expect(model.step({ t: 0 }, P, 1).t).toBeCloseTo(model.derive({ t: 0 }, P).period / 12, 12);
    expect(model.step({ t: 0 }, P, -1).t).toBe(0);
    expect(model.setVariable({ t: 1 }, "t", 99, P).t).toBe(SHM_TIME_MAX);
    expect(model.setVariable({ t: 1 }, "t", -3, P).t).toBe(0);
  });

  it("numbers every output, even at the edges of every range", () => {
    const cases = [
      derive(),
      derive({ mass: 0.1, k: 5, k2: 5, arrangement: "series", damping: 1 }, 7),
      derive({ mass: 4, k: 200, damping: 0, driveOmega: 30, swing: 80 * DEG, length: 0.1, body: "rod" }, SHM_TIME_MAX),
      derive({ mass: Number.NaN, k: -5, amplitude: 9 } as Partial<typeof P>, 3),
    ];
    for (const r of cases) for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
    expect(Object.is(derive({ phase: 0 }).phase, -0)).toBe(false);
  });
});
