import { describe, expect, it } from "vitest";
import { LORENTZ_DIRECTION as DIR, LORENTZ_MU0, lorentzModel as model, type LorentzParams, type LorentzState } from "./lorentz";

const P = model.defaultParams;
const S = model.initialize(P);
const derive = (state: Partial<LorentzState> = {}, params: Partial<LorentzParams> = {}) => model.derive({ ...S, ...state }, { ...P, ...params });
const deg = (d: number) => (d * Math.PI) / 180;

describe("a charge in a magnetic field", () => {
  it("feels F = qvB sin θ", () => {
    expect(derive({ speed: 1000, field: 100 }).force).toBeCloseTo(1.6e-14, 20);
    expect(derive({ speed: 1000, field: 100, pitchAngle: deg(30) }).force).toBeCloseTo(0.8e-14, 20);
    expect(derive({ pitchAngle: 0 }).force).toBe(0);
  });

  it("circles with r = mv / qB", () => {
    expect(derive({ speed: 1000, field: 100 }).radius).toBeCloseTo(10.4375, 6);
    expect(derive({ speed: 2000, field: 100 }).radius).toBeCloseTo(20.875, 6);
    expect(derive({ speed: 1000, field: 200 }).radius).toBeCloseTo(5.21875, 6);
    expect(derive({ speed: 10000, field: 1 }, { particle: "electron" }).radius).toBeCloseTo(5.6875, 6);
    // An alpha particle: twice the charge, four times the mass.
    expect(derive({ speed: 1000, field: 100 }, { particle: "alpha" }).radius).toBeCloseTo(20.875, 6);
  });

  it("takes T = 2πm / qB whatever its speed", () => {
    const slow = derive({ speed: 1000, field: 100 });
    const fast = derive({ speed: 5000, field: 100 });
    expect(slow.period).toBeCloseTo((2 * Math.PI * 1.67e-27) / (1.6e-19 * 0.1) * 1e6, 9);
    expect(fast.period).toBe(slow.period);
    expect(slow.frequency * slow.period).toBeCloseTo(1, 12);
  });

  it("never changes the kinetic energy", () => {
    expect(derive({ field: 100 }).kineticEnergy).toBe(derive({ field: 900 }).kineticEnergy);
    expect(derive({ speed: 1000 }).kineticEnergy).toBeCloseTo((0.5 * 1.67e-27 * 1e12) / 1.6e-19, 6);
  });

  it("turns a positive charge anticlockwise in a field into the page, and every flip reverses it", () => {
    expect(derive({}, { particle: "proton", fieldDirection: "into" }).sense).toBe(1);
    expect(derive({}, { particle: "electron", fieldDirection: "into" }).sense).toBe(-1);
    expect(derive({}, { particle: "proton", fieldDirection: "out" }).sense).toBe(-1);
    expect(derive({}, { particle: "electron", fieldDirection: "out" }).sense).toBe(1);
    expect(derive({}, { particle: "alpha", fieldDirection: "into" }).sense).toBe(1);
    expect(derive({ pitchAngle: 0 }).sense).toBe(0);
  });

  it("winds a helix of pitch v cos θ · T when v leans along B", () => {
    const r = derive({ speed: 1000, field: 100, pitchAngle: deg(60) });
    expect(r.pitch).toBeCloseTo(0.5e6 * r.period * 1e-6 * 100, 9);
    expect(r.pitch).toBeCloseTo(32.79, 2);
    expect(r.radius).toBeCloseTo(10.4375 * Math.sin(deg(60)), 9);
    expect(derive({ pitchAngle: Math.PI / 2 }).pitch).toBe(0);
    expect(derive({ pitchAngle: 0 }).radius).toBe(0);
  });
});

describe("the velocity selector", () => {
  it("lets through only v = E / B, whatever the charge", () => {
    const at = derive({ speed: 1000, field: 100, efield: 100 });
    expect(at.selectorSpeed).toBeCloseTo(1000, 9);
    expect(at.selectorDeflect).toBe(0);
    expect(at.electricForce).toBeCloseTo(at.magneticForce, 20);
    expect(derive({ speed: 1000, field: 100, efield: 100 }, { particle: "electron" }).selectorDeflect).toBe(0);
  });

  it("bends a fast proton up (qvB wins) and a slow one down (qE wins); an electron the other way", () => {
    expect(derive({ speed: 2000, field: 100, efield: 100 }).selectorDeflect).toBe(1);
    expect(derive({ speed: 500, field: 100, efield: 100 }).selectorDeflect).toBe(-1);
    expect(derive({ speed: 2000, field: 100, efield: 100 }, { particle: "electron" }).selectorDeflect).toBe(-1);
  });
});

describe("the cyclotron", () => {
  it("runs at f = qB / 2πm: about 10 MHz for protons at 0.66 T", () => {
    expect(derive({ cycField: 0.66 }).cycFrequency).toBeCloseTo(10.06, 2);
    expect(derive({ cycField: 0.66 }, { ion: "deuteron" }).cycFrequency).toBeCloseTo(5.03, 2);
  });

  it("delivers K = q²B²R² / 2m", () => {
    const r = derive({ cycField: 0.66, deeRadius: 60 });
    expect(r.maxEnergy).toBeCloseTo(7.51, 2);
    expect(r.maxSpeed).toBeCloseTo((1.6e-19 * 0.66 * 0.6) / 1.67e-27 / 1000, 6);
    expect(derive({ cycField: 0.66, deeRadius: 30 }).maxEnergy * 4).toBeCloseTo(r.maxEnergy, 9);
  });

  it("adds qV at every crossing until the ion reaches the rim", () => {
    const start = derive({ cycField: 0.5, deeRadius: 50, gapVoltage: 50 });
    expect(start.energyPerCrossing).toBeCloseTo(0.05, 12);
    expect(start.crossingsNeeded).toBe(Math.ceil(start.maxEnergy / 0.05 - 1e-9));
    const half = derive({ crossings: 20 });
    expect(half.energyNow).toBeCloseTo(1, 9);
    expect(half.radiusNow).toBeCloseTo(50 * Math.sqrt(1 / start.maxEnergy), 9);
    expect(derive({ crossings: 0 }).exited).toBe(0);
    expect(derive({ crossings: 1e6 })).toMatchObject({ exited: 1, crossings: start.crossingsNeeded, radiusNow: 50 });
    // Play runs the whole spiral in about 12 s, then starts a new ion.
    let s = S;
    let out = false;
    for (let i = 0; i < 300; i++) {
      s = model.advance(s, 0.05, P);
      out ||= model.derive(s, P).exited === 1;
    }
    expect(out).toBe(true);
    expect(s.crossings).toBeLessThan(start.crossingsNeeded);
  });

  it("starts the ion again when the machine changes", () => {
    expect(model.setVariable({ ...S, crossings: 30 }, "cycField", 0.8, P).crossings).toBe(0);
  });
});

describe("force on a current", () => {
  it("is BIL sin θ, into the page for 0–180° and out for 180–360°", () => {
    const r = derive({ fieldT: 0.5, current: 4, length: 50, angle: deg(30) });
    expect(r.wireForce).toBeCloseTo(0.5, 12);
    expect(r.wireForceDir).toBe(DIR.into);
    expect(derive({ angle: deg(270) }).wireForceDir).toBe(DIR.out);
    expect(derive({ angle: 0 })).toMatchObject({ wireForce: 0, wireForceDir: DIR.none });
    expect(derive({ angle: Math.PI })).toMatchObject({ wireForce: 0, wireForceDir: DIR.none });
  });

  it("pulls parallel currents together and pushes opposite ones apart, μ₀I₁I₂ / 2πd per metre", () => {
    const one = derive({ current: 1, current2: 1, separation: 100 });
    expect(one.forcePerLength).toBeCloseTo(2e-7, 18);
    expect(one.forceE7).toBeCloseTo(2, 9);
    expect(one.attract).toBe(1);
    expect(derive({}, { sense: "opposite" }).attract).toBe(-1);
    expect(derive({ separation: 20 }).forcePerLength * 2).toBeCloseTo(derive({ separation: 10 }).forcePerLength, 15);
    expect(derive({ current: 10, separation: 5 }).fieldAtWire2).toBeCloseTo(40, 9);
  });
});

describe("a coil in a field", () => {
  it("feels τ = NIAB sin θ, greatest with its plane along B", () => {
    const r = derive({ turns: 100, current: 2, coilArea: 50, fieldT: 0.5, angle: deg(30) });
    expect(r.moment).toBeCloseTo(1, 12);
    expect(r.torque).toBeCloseTo(0.25, 12);
    expect(derive({ angle: deg(90) }).torqueFraction).toBe(1);
  });

  it("turns its moment towards B, resting stably along it and unstably against it", () => {
    expect(derive({ angle: deg(60) }).torqueSense).toBe(-1);
    expect(derive({ angle: deg(300) }).torqueSense).toBe(1);
    expect(derive({ angle: 0 })).toMatchObject({ torque: 0, torqueSense: 0, equilibrium: 1 });
    expect(derive({ angle: Math.PI })).toMatchObject({ torque: 0, torqueSense: 0, equilibrium: 2 });
    expect(derive({ angle: deg(45) }).equilibrium).toBe(0);
  });

  it("pushes on each side with the same force whatever the angle", () => {
    expect(derive({ angle: deg(10) }).sideForce).toBe(derive({ angle: deg(80) }).sideForce);
  });
});

describe("the moving-coil galvanometer", () => {
  it("deflects φ = (NAB / k) I in its radial field", () => {
    const r = derive({ turns: 100, coilArea: 4, fieldT: 0.5, meterCurrent: 100 });
    expect(r.deflection).toBeCloseTo(0.4, 12);
    expect(r.sensitivity).toBeCloseTo(0.004 * (180 / Math.PI), 12);
    expect(derive({ turns: 50, meterCurrent: 100 }).deflection).toBeCloseTo(0.2, 12);
    expect(derive({ meterCurrent: -100 }).deflection).toBeCloseTo(-0.4, 12);
  });

  it("stops at the end of its scale", () => {
    expect(derive({ meterCurrent: 300 })).toMatchObject({ deflection: Math.PI / 3, offScale: 1 });
    expect(derive({ meterCurrent: 200 }).offScale).toBe(0);
  });
});

describe("fields of currents", () => {
  it("follows Biot–Savart for a short element, into the page to its right", () => {
    const r = derive({ current: 10, distance: 5, angle: deg(90) }, { source: "element" });
    expect(r.sourceField).toBeCloseTo((1e-7 * 10 * 0.01) / 0.0025 * 1e6, 9);
    expect(r.fieldDir).toBe(DIR.into);
    expect(derive({ angle: deg(270) }, { source: "element" }).fieldDir).toBe(DIR.out);
    expect(derive({ angle: deg(90) }, { source: "element", flow: "reverse" }).fieldDir).toBe(DIR.out);
    expect(derive({ angle: deg(30) }, { source: "element" }).sourceField * 2).toBeCloseTo(derive({ angle: deg(90) }, { source: "element" }).sourceField, 9);
    expect(derive({ angle: 0 }, { source: "element" })).toMatchObject({ sourceField: 0, fieldDir: DIR.none });
  });

  it("circles a long wire with B = μ₀I / 2πr, anticlockwise round a current out of the page", () => {
    const r = derive({ current: 10, distance: 5 }, { source: "wire" });
    expect(r.sourceField).toBeCloseTo(40, 9);
    expect(r.fieldDir).toBe(DIR.anticlockwise);
    expect(derive({}, { source: "wire", flow: "reverse" }).fieldDir).toBe(DIR.clockwise);
  });

  it("obeys Ampère's law: ∮B·dl = μ₀I on any circle round the wire", () => {
    for (const distance of [2, 5, 10, 40]) {
      const r = derive({ current: 7, distance }, { source: "wire" });
      expect(r.lineIntegral).toBeCloseTo(7, 9);
      expect(r.enclosed).toBe(7);
    }
  });

  it("gives μ₀NI / 2R at a loop's centre, weaker along its axis, pointing right with ⊙ on top", () => {
    const centre = derive({ turns: 50, current: 2, distance: 10, axial: 0 }, { source: "loop" });
    expect(centre.sourceField).toBeCloseTo(LORENTZ_MU0 * 100 / 0.2 * 1e6, 9);
    expect(centre.centreField).toBe(centre.sourceField);
    expect(centre.fieldDir).toBe(DIR.right);
    const off = derive({ turns: 50, current: 2, distance: 10, axial: 10 }, { source: "loop" });
    expect(off.sourceField).toBeCloseTo(centre.sourceField / Math.pow(2, 1.5), 9);
    expect(derive({}, { source: "loop", flow: "reverse" }).fieldDir).toBe(DIR.left);
  });

  it("fills a solenoid with B = μ₀nI", () => {
    const r = derive({ turns: 1000, length: 50, current: 2 }, { source: "solenoid" });
    expect(r.turnsPerMetre).toBeCloseTo(2000, 9);
    expect(r.sourceField).toBeCloseTo(LORENTZ_MU0 * 2000 * 2 * 1e6, 9);
    expect(r.sourceField).toBeCloseTo(5026.5, 1);
  });

  it("keeps a toroid's field inside its core: μ₀NI / 2πr there, nothing in the hole or outside", () => {
    const core = derive({ turns: 100, current: 10, distance: 20 }, { source: "toroid" });
    expect(core.sourceField).toBeCloseTo(1000, 9);
    expect(core).toMatchObject({ region: 1, enclosed: 1000, fieldDir: DIR.anticlockwise });
    expect(core.lineIntegral).toBeCloseTo(1000, 9);
    expect(derive({ distance: 10 }, { source: "toroid" })).toMatchObject({ sourceField: 0, region: 0, enclosed: 0 });
    expect(derive({ distance: 30 }, { source: "toroid" })).toMatchObject({ sourceField: 0, region: 2, enclosed: 0 });
  });
});

describe("the model", () => {
  it("clamps every control to its range", () => {
    expect(model.setVariable(S, "speed", 1e9, P).speed).toBe(10000);
    expect(model.setVariable(S, "field", -5, P).field).toBe(1);
    expect(model.setVariable(S, "separation", 0, P).separation).toBe(1);
    expect(model.setVariable(S, "meterCurrent", -1000, P).meterCurrent).toBe(-300);
    expect(model.setVariable(S, "nonsense", 3, P)).toBe(S);
  });

  it("numbers every output, with no −0", () => {
    for (const params of [P, { ...P, source: "element" as const }, { ...P, source: "toroid" as const, particle: "electron" as const }]) {
      for (const state of [S, { ...S, pitchAngle: 0, angle: 0, meterCurrent: 0, current: 0 }, { ...S, angle: Math.PI, current2: 0 }]) {
        const r = model.derive(state, params);
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });

  it("turns the charge on as play runs", () => {
    const s = model.advance(S, 1, P);
    expect(s.turn).toBeCloseTo(0.25, 12);
    expect(model.derive(s, P).elapsed).toBeCloseTo(0.25 * model.derive(s, P).period, 12);
  });
});
