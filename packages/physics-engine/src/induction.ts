import type { SimulationModel } from "@ise/science-engine";

/**
 * Electromagnetic induction, class 12 (NCERT chapter 6).
 *
 * Flux: a flat coil of N turns and area A in a uniform field B, its normal at
 * θ to the field. The flux through one turn is Φ = BA cos θ; the coil's flux
 * linkage is NΦ.
 *
 * Faraday and Lenz: a bar magnet is pushed into (or pulled out of) a coil
 * along its axis at a steady speed. The magnet is treated as a small dipole
 * of moment m at the position drawn, so the flux through one turn of radius a
 * at axial distance x is exactly Φ = μ₀ m a² / 2(a² + x²)^{3/2}. The EMF is
 * ε = −N dΦ/dt = −N (dΦ/dx)(dx/dt). Φ is measured along the coil's axis from
 * the magnet towards the coil, so a north pole facing the coil gives Φ > 0.
 * With that normal, ε < 0 drives current anticlockwise as seen from the
 * magnet, which makes the near face of the coil a north pole.
 *
 * Motional EMF: a rod of length l slides at velocity v along rails joined by
 * a resistor R, in a field B into the page. ε = Bvl, I = ε/R, the field
 * pushes back on the rod with F = BIl = B²l²v/R, and the power needed to keep
 * it moving, Fv, is exactly the heat I²R.
 *
 * Eddy currents (qualitative): a metal plate swings on a pendulum through the
 * gap of a magnet. The damping rate grows as B², and is large for a solid
 * copper plate, small for a slotted one, and nil for plastic. The damping
 * constants are illustrative, not computed from the plate's conductivity.
 *
 * Self and mutual inductance: a long air-cored solenoid of N₁ turns, length
 * l and cross-section A₁ has L = μ₀ n² A₁ l with n = N₁/l (end effects
 * ignored). A current changing at dI/dt gives a back EMF −L dI/dt, and a
 * current I stores ½LI². A second coil of N turns round the middle links the
 * solenoid's flux only over the solenoid's own cross-section (the field
 * outside a long solenoid is nearly zero), so M = μ₀ n N min(A, A₁), and its
 * EMF is −M dI/dt.
 *
 * AC generator: the coil spins at ν revolutions a second in the field, so
 * θ = ωt with ω = 2πν, Φ = BA cos ωt and ε = NBAω sin ωt, peak ε₀ = NBAω.
 */

/** Permeability of free space, T m/A. */
export const INDUCTION_MU0 = 4 * Math.PI * 1e-7;
/** Magnetic moment of the bar magnet, A m². */
export const INDUCTION_MAGNET_MOMENT = 2;
/** The magnet's journey along the axis, cm from the coil's centre. */
export const INDUCTION_MAGNET_FAR = 30;
export const INDUCTION_MAGNET_NEAR = 0;
/** Resistance of the coil and its galvanometer, Ω. */
export const INDUCTION_COIL_RESISTANCE = 5;
/** Where the rod can be along the rails, m from the resistor. */
export const INDUCTION_RAIL_START = 0.1;
export const INDUCTION_RAIL_END = 1;
/** The pendulum: starting swing (deg), period (s), and damping by the air alone (1/s). */
export const INDUCTION_SWING = 30;
export const INDUCTION_PENDULUM_PERIOD = 1.2;
export const INDUCTION_AIR_DAMPING = 0.02;
/** The largest current the solenoid's supply drives, A. */
export const INDUCTION_CURRENT_MAX = 5;
export const INDUCTION_TIME_MAX = 60;

export type InductionPole = "north" | "south";
export type InductionMotion = "in" | "out";
export type InductionPlate = "solid" | "slotted" | "plastic";
export const INDUCTION_PLATE_ORDER: readonly InductionPlate[] = ["solid", "slotted", "plastic"];
/** Eddy damping per tesla², 1/(s T²): illustrative values. */
export const INDUCTION_PLATES: Record<InductionPlate, { label: string; coupling: number }> = {
  solid: { label: "Solid copper plate", coupling: 4 },
  slotted: { label: "Slotted copper plate", coupling: 0.25 },
  plastic: { label: "Plastic plate", coupling: 0 },
};

export type InductionParams = {
  /** The coil: turns, area (cm²). */
  turns: number;
  area: number;
  /** Uniform field, T. */
  field: number;
  /** Angle between the coil's normal and the field, deg. */
  tilt: number;
  /** Which pole of the magnet faces the coil, and whether it is pushed in or pulled out. */
  pole: InductionPole;
  motion: InductionMotion;
  /** m/s. */
  magnetSpeed: number;
  /** The rod: length (m), velocity (m/s, + to the right), and the resistor (Ω). */
  rodLength: number;
  rodVelocity: number;
  resistance: number;
  plate: InductionPlate;
  /** The solenoid: turns, length (cm), cross-section (cm²), and the rate its current is changed (A/s). */
  solTurns: number;
  solLength: number;
  solArea: number;
  rampRate: number;
  /** Generator, revolutions per second. */
  spin: number;
};

export interface InductionState {
  /** Magnet's distance from the coil's centre, cm. */
  readonly d: number;
  /** Rod's distance from the resistor, m. */
  readonly rodX: number;
  /** Solenoid current, A. */
  readonly current: number;
  /** Clock for the pendulum and the generator, s. */
  readonly t: number;
}

export type InductionResults = {
  turns: number;
  area: number;
  areaSI: number;
  field: number;
  tilt: number;
  cosTilt: number;
  fluxPerTurn: number;
  fluxPerTurnMilli: number;
  linkage: number;

  distance: number;
  magnetSpeed: number;
  poleSign: number;
  approaching: number;
  /** 1 when the magnet is being pushed in, 0 when pulled out. */
  inward: number;
  moving: number;
  elapsed: number;
  tripTime: number;
  coilRadius: number;
  magnetLinkage: number;
  fluxRate: number;
  magnetEmf: number;
  magnetEmfSize: number;
  magnetEmfMilli: number;
  coilCurrent: number;
  circulation: number;
  facePole: number;
  push: number;

  rodX: number;
  rodLength: number;
  rodVelocity: number;
  rodSpeed: number;
  resistance: number;
  rodFlux: number;
  motionalEmf: number;
  rodCurrent: number;
  rodForce: number;
  forceDirection: number;
  rodSense: number;
  topPositive: number;
  pushPower: number;
  heatPower: number;

  plate: number;
  swing: number;
  pendulumAngle: number;
  eddyDamping: number;
  halfTime: number;
  eddyStrength: number;

  solTurns: number;
  solLength: number;
  solLengthSI: number;
  solArea: number;
  solAreaSI: number;
  turnDensity: number;
  inductance: number;
  inductanceMilli: number;
  current: number;
  rampRate: number;
  changing: number;
  currentRate: number;
  backEmf: number;
  backEmfSize: number;
  energy: number;
  linkedArea: number;
  linkedAreaSI: number;
  mutual: number;
  mutualMilli: number;
  secondaryEmf: number;
  secondaryEmfMilli: number;
  secondaryLinkage: number;

  t: number;
  spin: number;
  omega: number;
  genAngle: number;
  genLinkage: number;
  genEmf: number;
  peakEmf: number;
  genPeriod: number;
};

const OUTPUTS = [
  "turns", "area", "areaSI", "field", "tilt", "cosTilt", "fluxPerTurn", "fluxPerTurnMilli", "linkage",
  "distance", "magnetSpeed", "poleSign", "approaching", "inward", "moving", "elapsed", "tripTime", "coilRadius", "magnetLinkage", "fluxRate",
  "magnetEmf", "magnetEmfSize", "magnetEmfMilli", "coilCurrent", "circulation", "facePole", "push",
  "rodX", "rodLength", "rodVelocity", "rodSpeed", "resistance", "rodFlux", "motionalEmf", "rodCurrent", "rodForce", "forceDirection",
  "rodSense", "topPositive", "pushPower", "heatPower",
  "plate", "swing", "pendulumAngle", "eddyDamping", "halfTime", "eddyStrength",
  "solTurns", "solLength", "solLengthSI", "solArea", "solAreaSI", "turnDensity", "inductance", "inductanceMilli", "current", "rampRate",
  "changing", "currentRate", "backEmf", "backEmfSize", "energy", "linkedArea", "linkedAreaSI", "mutual", "mutualMilli",
  "secondaryEmf", "secondaryEmfMilli", "secondaryLinkage",
  "t", "spin", "omega", "genAngle", "genLinkage", "genEmf", "peakEmf", "genPeriod",
] as const satisfies readonly (keyof InductionResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
/** A finite number, never −0. */
const fin = (v: number) => (Number.isFinite(v) ? v || 0 : 0);

/** Every number the model reads, kept inside the controls' ranges. */
export function inductionParams(params: InductionParams) {
  return {
    turns: clamp(params.turns, 10, 500),
    area: clamp(params.area, 10, 400),
    field: clamp(params.field, 0.05, 1),
    tilt: clamp(params.tilt, 0, 180),
    pole: params.pole === "south" ? ("south" as const) : ("north" as const),
    motion: params.motion === "out" ? ("out" as const) : ("in" as const),
    magnetSpeed: clamp(params.magnetSpeed, 0.1, 1),
    rodLength: clamp(params.rodLength, 0.1, 1),
    rodVelocity: clamp(params.rodVelocity, -2, 2),
    resistance: clamp(params.resistance, 0.5, 10),
    plate: INDUCTION_PLATE_ORDER.includes(params.plate) ? params.plate : ("solid" as const),
    solTurns: clamp(params.solTurns, 100, 2000),
    solLength: clamp(params.solLength, 10, 50),
    solArea: clamp(params.solArea, 5, 50),
    rampRate: clamp(params.rampRate, -20, 20),
    spin: clamp(params.spin, 0.5, 5),
  };
}

/** Radius (m) of a circular coil of area A cm². */
export function inductionCoilRadius(areaCm2: number): number {
  return Math.sqrt((areaCm2 * 1e-4) / Math.PI);
}

/** Flux (Wb) through one turn of radius a (m) from a dipole of moment m on its axis at x (m), north end towards the coil. */
export function inductionDipoleFlux(x: number, a: number, m = INDUCTION_MAGNET_MOMENT): number {
  return (INDUCTION_MU0 * m * a * a) / (2 * Math.pow(a * a + x * x, 1.5));
}

/** dΦ/dx (Wb/m) of the same: negative, since the flux falls as the magnet moves away. */
export function inductionDipoleFluxSlope(x: number, a: number, m = INDUCTION_MAGNET_MOMENT): number {
  return (-3 * x * INDUCTION_MU0 * m * a * a) / (2 * Math.pow(a * a + x * x, 2.5));
}

/**
 * The magnet scene at a distance d (cm): flux linkage NΦ (Wb), the rate of
 * change of flux through one turn (Wb/s) and the EMF ε = −N dΦ/dt (V).
 * The magnet is taken to be moving at its speed unless it has reached the end of its journey.
 */
export function inductionMagnetAt(dCm: number, params: InductionParams) {
  const p = inductionParams(params);
  const d = clamp(dCm, INDUCTION_MAGNET_NEAR, INDUCTION_MAGNET_FAR);
  const sign = p.pole === "north" ? 1 : -1;
  const a = inductionCoilRadius(p.area);
  const x = d / 100;
  const moving = p.motion === "in" ? d > INDUCTION_MAGNET_NEAR + 1e-9 : d < INDUCTION_MAGNET_FAR - 1e-9;
  const dxdt = moving ? (p.motion === "in" ? -p.magnetSpeed : p.magnetSpeed) : 0;
  const fluxRate = sign * inductionDipoleFluxSlope(x, a) * dxdt;
  return {
    linkage: p.turns * sign * inductionDipoleFlux(x, a),
    fluxRate: fin(fluxRate),
    emf: fin(-p.turns * fluxRate),
    moving,
  };
}

/** Where the magnet is (cm) a time t (s) after it set off. */
export function inductionMagnetPosition(t: number, params: InductionParams): number {
  const p = inductionParams(params);
  const travelled = 100 * p.magnetSpeed * Math.max(0, t);
  return p.motion === "in"
    ? Math.max(INDUCTION_MAGNET_NEAR, INDUCTION_MAGNET_FAR - travelled)
    : Math.min(INDUCTION_MAGNET_FAR, INDUCTION_MAGNET_NEAR + travelled);
}

/** The generator's EMF (V) and flux linkage (Wb) at time t. */
export function inductionGeneratorAt(t: number, params: InductionParams) {
  const p = inductionParams(params);
  const omega = 2 * Math.PI * p.spin;
  const nba = p.turns * p.field * p.area * 1e-4;
  return { emf: fin(nba * omega * Math.sin(omega * t)), linkage: fin(nba * Math.cos(omega * t)), peak: nba * omega };
}

/** The pendulum's damping rate, 1/s. */
export function inductionDamping(plate: InductionPlate, field: number): number {
  return INDUCTION_AIR_DAMPING + (INDUCTION_PLATES[plate] ?? INDUCTION_PLATES.solid).coupling * field * field;
}

/** The angle of the pendulum (deg) at time t. */
export function inductionPendulumAt(t: number, plate: InductionPlate, field: number) {
  const gamma = inductionDamping(plate, field);
  const w0 = (2 * Math.PI) / INDUCTION_PENDULUM_PERIOD;
  const wd = Math.sqrt(Math.max(w0 * w0 - gamma * gamma, 0.01));
  const swing = INDUCTION_SWING * Math.exp(-gamma * Math.max(0, t));
  return { swing, angle: fin(swing * Math.cos(wd * Math.max(0, t))) };
}

const wrapRail = (x: number) => {
  const span = INDUCTION_RAIL_END - INDUCTION_RAIL_START;
  const r = (((x - INDUCTION_RAIL_START) % span) + span) % span;
  return INDUCTION_RAIL_START + r;
};

const sign0 = (v: number, eps = 1e-12) => (v > eps ? 1 : v < -eps ? -1 : 0);

export const inductionModel: SimulationModel<InductionState, InductionParams, InductionResults> = {
  id: "induction",
  defaultParams: {
    turns: 100,
    area: 100,
    field: 0.5,
    tilt: 0,
    pole: "north",
    motion: "in",
    magnetSpeed: 0.5,
    rodLength: 0.5,
    rodVelocity: 2,
    resistance: 1,
    plate: "solid",
    solTurns: 1000,
    solLength: 25,
    solArea: 20,
    rampRate: 2,
    spin: 1,
  },
  outputs: OUTPUTS,
  stateVariables: ["d", "rodX", "current", "t"],

  initialize() {
    return { d: INDUCTION_MAGNET_FAR, rodX: 0.3, current: 0, t: 0 };
  },

  /** Play moves the magnet along its journey, slides the rod, ramps the current, and runs the clock. */
  advance(state, dt, params) {
    const p = inductionParams(params);
    const along = 100 * p.magnetSpeed * dt;
    const d = clamp(p.motion === "in" ? state.d - along : state.d + along, INDUCTION_MAGNET_NEAR, INDUCTION_MAGNET_FAR);
    return {
      d,
      rodX: wrapRail(clamp(state.rodX, INDUCTION_RAIL_START, INDUCTION_RAIL_END) + p.rodVelocity * dt),
      current: clamp(state.current + p.rampRate * dt, 0, INDUCTION_CURRENT_MAX),
      t: clamp(state.t + dt, 0, INDUCTION_TIME_MAX),
    };
  },

  step(state, params, sign) {
    return inductionModel.advance(state, 0.05 * sign, params);
  },

  derive(state, params) {
    const p = inductionParams(params);

    // A coil in a uniform field.
    const areaSI = p.area * 1e-4;
    const cosTilt = Math.cos((p.tilt * Math.PI) / 180);
    const fluxPerTurn = fin(p.field * areaSI * cosTilt);

    // A magnet and a coil.
    const d = clamp(state.d, INDUCTION_MAGNET_NEAR, INDUCTION_MAGNET_FAR);
    const magnet = inductionMagnetAt(d, params);
    const poleSign = p.pole === "north" ? 1 : -1;
    const emfSign = sign0(magnet.emf, 1e-9);
    // ε < 0: anticlockwise as seen from the magnet, so the near face is a north pole.
    const facePole = -emfSign || 0;
    const tripTime = (INDUCTION_MAGNET_FAR - INDUCTION_MAGNET_NEAR) / 100 / p.magnetSpeed;
    const elapsed = (p.motion === "in" ? INDUCTION_MAGNET_FAR - d : d - INDUCTION_MAGNET_NEAR) / 100 / p.magnetSpeed;

    // The rod on rails, field into the page.
    const rodX = clamp(state.rodX, INDUCTION_RAIL_START, INDUCTION_RAIL_END);
    const v = p.rodVelocity;
    const rodSpeed = Math.abs(v);
    const motionalEmf = p.field * rodSpeed * p.rodLength;
    const rodCurrent = motionalEmf / p.resistance;
    const rodForce = p.field * rodCurrent * p.rodLength;
    const direction = sign0(v, 1e-9);

    // Eddy-current braking.
    const t = clamp(state.t, 0, INDUCTION_TIME_MAX);
    const damping = inductionDamping(p.plate, p.field);
    const pendulum = inductionPendulumAt(t, p.plate, p.field);
    const eddy = INDUCTION_PLATES[p.plate].coupling * p.field * p.field;

    // The solenoid and the coil round it.
    const solLengthSI = p.solLength / 100;
    const solAreaSI = p.solArea * 1e-4;
    const n = p.solTurns / solLengthSI;
    const inductance = INDUCTION_MU0 * n * n * solAreaSI * solLengthSI;
    const current = clamp(state.current, 0, INDUCTION_CURRENT_MAX);
    const changing =
      p.rampRate > 0 && current < INDUCTION_CURRENT_MAX - 1e-9 ? 1 : p.rampRate < 0 && current > 1e-9 ? -1 : 0;
    const currentRate = changing === 0 ? 0 : p.rampRate;
    const linkedArea = Math.min(p.area, p.solArea);
    const mutual = INDUCTION_MU0 * n * p.turns * linkedArea * 1e-4;

    // The generator.
    const gen = inductionGeneratorAt(t, params);
    const omega = 2 * Math.PI * p.spin;
    const turnsDone = p.spin * t;

    return {
      turns: p.turns,
      area: p.area,
      areaSI,
      field: p.field,
      tilt: p.tilt,
      cosTilt: fin(Math.abs(cosTilt) < 1e-12 ? 0 : cosTilt),
      fluxPerTurn: Math.abs(fluxPerTurn) < 1e-15 ? 0 : fluxPerTurn,
      fluxPerTurnMilli: Math.abs(fluxPerTurn) < 1e-15 ? 0 : fin(fluxPerTurn * 1000),
      linkage: Math.abs(fluxPerTurn) < 1e-15 ? 0 : fin(p.turns * fluxPerTurn),

      distance: d,
      magnetSpeed: p.magnetSpeed,
      poleSign,
      approaching: magnet.moving ? (p.motion === "in" ? 1 : -1) : 0,
      inward: p.motion === "in" ? 1 : 0,
      moving: magnet.moving ? 1 : 0,
      elapsed: fin(elapsed),
      tripTime,
      coilRadius: inductionCoilRadius(p.area) * 100,
      magnetLinkage: fin(magnet.linkage),
      fluxRate: magnet.fluxRate,
      magnetEmf: magnet.emf,
      magnetEmfSize: Math.abs(magnet.emf),
      magnetEmfMilli: Math.abs(magnet.emf) * 1000,
      coilCurrent: Math.abs(magnet.emf) / INDUCTION_COIL_RESISTANCE,
      circulation: facePole,
      facePole,
      // Like poles facing repel (1); unlike attract (−1).
      push: facePole * poleSign || 0,

      rodX,
      rodLength: p.rodLength,
      rodVelocity: fin(v),
      rodSpeed,
      resistance: p.resistance,
      rodFlux: p.field * p.rodLength * rodX,
      motionalEmf,
      rodCurrent,
      rodForce,
      // B into the page: moving right drives current up the rod (anticlockwise round the loop),
      // and the force on that current points left, against the motion.
      forceDirection: -direction || 0,
      rodSense: direction,
      topPositive: direction,
      pushPower: rodForce * rodSpeed,
      heatPower: rodCurrent * rodCurrent * p.resistance,

      plate: INDUCTION_PLATE_ORDER.indexOf(p.plate),
      swing: pendulum.swing,
      pendulumAngle: pendulum.angle,
      eddyDamping: damping,
      halfTime: Math.LN2 / damping,
      eddyStrength: eddy <= 0 ? 0 : eddy < 0.5 ? 1 : 2,

      solTurns: p.solTurns,
      solLength: p.solLength,
      solLengthSI,
      solArea: p.solArea,
      solAreaSI,
      turnDensity: n,
      inductance,
      inductanceMilli: inductance * 1000,
      current,
      rampRate: fin(p.rampRate),
      changing,
      currentRate: fin(currentRate),
      backEmf: fin(-inductance * currentRate),
      backEmfSize: Math.abs(inductance * currentRate),
      energy: 0.5 * inductance * current * current,
      linkedArea,
      linkedAreaSI: linkedArea * 1e-4,
      mutual,
      mutualMilli: mutual * 1000,
      secondaryEmf: fin(-mutual * currentRate),
      secondaryEmfMilli: Math.abs(mutual * currentRate) * 1000,
      secondaryLinkage: mutual * current,

      t,
      spin: p.spin,
      omega,
      genAngle: Math.max(0, fin((turnsDone - Math.floor(turnsDone + 1e-9)) * 360)),
      genLinkage: Math.abs(gen.linkage) < 1e-12 ? 0 : gen.linkage,
      genEmf: Math.abs(gen.emf) < 1e-12 ? 0 : gen.emf,
      peakEmf: gen.peak,
      genPeriod: 1 / p.spin,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof InductionState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "d": return { ...state, d: clamp(value, INDUCTION_MAGNET_NEAR, INDUCTION_MAGNET_FAR) };
      case "rodX": return { ...state, rodX: clamp(value, INDUCTION_RAIL_START, INDUCTION_RAIL_END) };
      case "current": return { ...state, current: clamp(value, 0, INDUCTION_CURRENT_MAX) };
      case "t": return { ...state, t: clamp(value, 0, INDUCTION_TIME_MAX) };
      default: return state;
    }
  },
};
