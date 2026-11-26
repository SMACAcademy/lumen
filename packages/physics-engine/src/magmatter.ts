import type { SimulationModel } from "@ise/science-engine";

/**
 * Magnetism and matter, class 12 (NCERT chapter 5).
 *
 * Dipole: a short bar magnet of moment m. On its axis, a distance r away,
 * its field is (μ₀/4π)·2m/r³, pointing along m; on its equator it is
 * (μ₀/4π)·m/r³, pointing against m — half as strong. These are the
 * short-magnet formulas, good when r is much larger than the magnet. Field
 * lines are closed loops: there are no magnetic monopoles, so the net flux
 * out of any closed surface is zero (Gauss's law for magnetism).
 *
 * Torque: the same magnet in a uniform field B, at angle θ to it, feels a
 * torque mB sin θ and has energy −mB cos θ. Let go, it swings about the
 * field with period 2π√(I/mB) for small swings — here a compass needle with
 * NCERT's moment of inertia, 7.5 × 10⁻⁶ kg m².
 *
 * Earth: the field at a few places in India (and at the north magnetic
 * pole), from rounded present-day values. The dip δ is the angle the field
 * makes below the horizontal, so B_H = B cos δ, B_V = B sin δ and
 * tan δ = B_V / B_H. A dip circle turned φ out of the magnetic meridian sees
 * only B_H cos φ, so it shows an apparent dip with tan δ′ = tan δ / cos φ.
 *
 * Materials: a sample in a long solenoid of 1000 turns per metre, so
 * H = nI. Its magnetisation is M = χH and the field inside is
 * B = μ₀(H + M) = μ₀μ_r H with μ_r = 1 + χ. Diamagnets have small negative
 * χ, paramagnets small positive χ (falling as 1/T for oxygen: Curie's law),
 * ferromagnets huge χ — until they saturate, and until they are heated past
 * their Curie temperature, when they turn paramagnetic with χ = C/(T − T_c).
 * The ferromagnet is a smooth model: M = M_s tanh(χ₀H/M_s), with M_s
 * shrinking as √(1 − (T/T_c)²) — the right shape, not a fit to data.
 *
 * Hysteresis: B against H for soft iron and for steel, taken round and round
 * between ±H_max. The loop is a smooth model shape, two shifted tanh curves
 * built to have the retentivity and coercivity in MAGMATTER_CORES; its area
 * is the energy lost as heat in each cycle.
 */

export type MagmatterProbe = "axis" | "equator";
export type MagmatterPlace = "thiruvananthapuram" | "chennai" | "mumbai" | "delhi" | "srinagar" | "pole";
export type MagmatterMaterial = "bismuth" | "copper" | "silver" | "aluminium" | "oxygen" | "nickel" | "iron";
export type MagmatterCore = "soft-iron" | "steel";

export const MAGMATTER_PROBE_ORDER: readonly MagmatterProbe[] = ["axis", "equator"];
export const MAGMATTER_PLACE_ORDER: readonly MagmatterPlace[] = ["thiruvananthapuram", "chennai", "mumbai", "delhi", "srinagar", "pole"];
export const MAGMATTER_MATERIAL_ORDER: readonly MagmatterMaterial[] = ["bismuth", "copper", "silver", "aluminium", "oxygen", "nickel", "iron"];
export const MAGMATTER_CORE_ORDER: readonly MagmatterCore[] = ["soft-iron", "steel"];

/** μ₀, T m/A. */
export const MAGMATTER_MU0 = 4 * Math.PI * 1e-7;
/** μ₀/4π, T m/A. */
export const MAGMATTER_K = 1e-7;
/** The compass needle's moment of inertia, kg m² (NCERT's example). */
export const MAGMATTER_NEEDLE_INERTIA = 7.5e-6;
/** Turns per metre of the solenoid round the material sample. */
export const MAGMATTER_TURNS = 1000;
/** Seconds for Play to take the hysteresis loop once round. */
export const MAGMATTER_CYCLE_TIME = 8;

export const MAGMATTER_LIMITS = {
  moment: [0.01, 2] as const,
  r: [10, 50] as const,
  field: [1, 300] as const,
  theta: [0, Math.PI] as const,
  tilt: [0, Math.PI / 2] as const,
  current: [0, 2] as const,
  temperature: [100, 1500] as const,
  cycle: [0, 1] as const,
};

/**
 * The Earth's field, rounded, for about 2025: total in µT, dip and declination
 * in degrees (declination east positive). The field drifts slowly, so a survey
 * map for another year will differ a little. At the magnetic pole the field is
 * vertical and a compass has no horizontal pull, so declination means nothing.
 */
export const MAGMATTER_PLACES: Record<MagmatterPlace, { label: string; total: number; dip: number; declination: number }> = {
  thiruvananthapuram: { label: "Thiruvananthapuram", total: 40, dip: 1, declination: -2 },
  chennai: { label: "Chennai", total: 41, dip: 13, declination: -1.5 },
  mumbai: { label: "Mumbai", total: 43, dip: 26, declination: -1 },
  delhi: { label: "Delhi", total: 47, dip: 43, declination: 0.7 },
  srinagar: { label: "Srinagar", total: 50, dip: 49, declination: 2.5 },
  pole: { label: "North magnetic pole", total: 57, dip: 90, declination: 0 },
};

export interface MagmatterMaterialData {
  label: string;
  /** 0 diamagnetic, 1 paramagnetic, 2 ferromagnetic (below its Curie temperature). */
  kind: 0 | 1 | 2;
  /** Susceptibility at `atT` (dia, para), or the initial susceptibility χ₀ (ferro). */
  chi: number;
  atT: number;
  /** Paramagnets whose atoms carry their own moments follow Curie's law, χ ∝ 1/T. */
  curieLaw: boolean;
  /** Ferromagnets: Curie temperature (K), saturation magnetisation (A/m), Curie constant above T_c (K). */
  curieTemp: number;
  saturation: number;
  curieConstant: number;
}

const dia = (label: string, chi: number): MagmatterMaterialData => ({ label, kind: 0, chi, atT: 300, curieLaw: false, curieTemp: 0, saturation: 0, curieConstant: 0 });

/** NCERT's table values for χ; typical values for the ferromagnets, whose χ varies widely with how they were made. */
export const MAGMATTER_MATERIALS: Record<MagmatterMaterial, MagmatterMaterialData> = {
  bismuth: dia("Bismuth", -1.66e-5),
  copper: dia("Copper", -9.8e-6),
  silver: dia("Silver", -2.6e-5),
  aluminium: { label: "Aluminium", kind: 1, chi: 2.3e-5, atT: 300, curieLaw: false, curieTemp: 0, saturation: 0, curieConstant: 0 },
  oxygen: { label: "Oxygen gas", kind: 1, chi: 2.1e-6, atT: 273, curieLaw: true, curieTemp: 0, saturation: 0, curieConstant: 0 },
  nickel: { label: "Nickel", kind: 2, chi: 600, atT: 300, curieLaw: false, curieTemp: 631, saturation: 4.9e5, curieConstant: 0.6 },
  iron: { label: "Iron", kind: 2, chi: 5000, atT: 300, curieLaw: false, curieTemp: 1043, saturation: 1.7e6, curieConstant: 2.3 },
};

export interface MagmatterCoreData {
  label: string;
  /** Saturation and retained field, T; coercivity and the largest field applied, A/m. */
  saturation: number;
  retentivity: number;
  coercivity: number;
  maxField: number;
}

/** Round, typical values: soft iron keeps a little more B but gives it up to a tiny reverse H; steel needs fifty times more. */
export const MAGMATTER_CORES: Record<MagmatterCore, MagmatterCoreData> = {
  "soft-iron": { label: "Soft iron", saturation: 1.6, retentivity: 1.2, coercivity: 80, maxField: 400 },
  steel: { label: "Steel", saturation: 1.4, retentivity: 1.0, coercivity: 4000, maxField: 20000 },
};

export type MagmatterParams = {
  probe: MagmatterProbe;
  place: MagmatterPlace;
  material: MagmatterMaterial;
  core: MagmatterCore;
  /** Magnetic moment, A m² (= J/T). */
  moment: number;
  /** Uniform field the magnet sits in, mT. */
  field: number;
  /** Current in the solenoid, A. */
  current: number;
  /** Temperature of the sample, K. */
  temperature: number;
};

export interface MagmatterState {
  /** Distance from the magnet's centre to the probe, cm. */
  readonly r: number;
  /** Angle between the magnet and the uniform field, rad, and its rate. */
  readonly theta: number;
  readonly omega: number;
  /** Angle between the dip circle's plane and the magnetic meridian, rad. */
  readonly tilt: number;
  /** How far round the hysteresis cycle, 0 to 1, starting at +H_max. */
  readonly cycle: number;
}

export type MagmatterResults = {
  probe: number;
  moment: number;
  r: number;
  /** Field on the axis and on the equator at distance r, µT. */
  bAxis: number;
  bEquator: number;
  bProbe: number;
  ratio: number;
  /** 1 where the field at the probe points along m, −1 against it. */
  along: number;
  netFlux: number;

  field: number;
  theta: number;
  torque: number;
  torqueRatio: number;
  energy: number;
  work: number;
  period: number;
  /** 1 lined up with the field (stable), 2 against it (unstable), 0 neither. */
  equilibrium: number;

  place: number;
  total: number;
  dip: number;
  declination: number;
  bH: number;
  bV: number;
  tilt: number;
  apparentDip: number;
  compass: number;

  material: number;
  current: number;
  hField: number;
  temperature: number;
  chi: number;
  muR: number;
  magnetisation: number;
  bInside: number;
  kind: number;
  curieTemp: number;
  /** 1 pulled into a strong field, −1 pushed out of it. */
  pull: number;

  core: number;
  cycle: number;
  hLoop: number;
  bLoop: number;
  falling: number;
  retentivity: number;
  coercivity: number;
  saturation: number;
  maxField: number;
  loss: number;
};

const OUTPUTS = [
  "probe", "moment", "r", "bAxis", "bEquator", "bProbe", "ratio", "along", "netFlux",
  "field", "theta", "torque", "torqueRatio", "energy", "work", "period", "equilibrium",
  "place", "total", "dip", "declination", "bH", "bV", "tilt", "apparentDip", "compass",
  "material", "current", "hField", "temperature", "chi", "muR", "magnetisation", "bInside", "kind", "curieTemp", "pull",
  "core", "cycle", "hLoop", "bLoop", "falling", "retentivity", "coercivity", "saturation", "maxField", "loss",
] as const satisfies readonly (keyof MagmatterResults)[];

const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const DEG = Math.PI / 180;
/** No −0 in the outputs. */
const z = (v: number) => v || 0;

/** Short-magnet field on the axis and the equator, T, for moment m (A m²) at r metres. */
export function magmatterAxialField(m: number, r: number): number {
  return (MAGMATTER_K * 2 * m) / r ** 3;
}
export function magmatterEquatorialField(m: number, r: number): number {
  return (MAGMATTER_K * m) / r ** 3;
}

/** Small-swing period of a magnet of moment m (A m²) and inertia I (kg m²) in a field B (T). */
export function magmatterPeriod(m: number, b: number, inertia = MAGMATTER_NEEDLE_INERTIA): number {
  return 2 * Math.PI * Math.sqrt(inertia / (m * b));
}

/** The dip a dip circle shows when turned φ out of the magnetic meridian. */
export function magmatterApparentDip(dip: number, phi: number): number {
  return Math.atan2(Math.sin(dip), Math.cos(dip) * Math.cos(phi));
}

/** Magnetisation (A/m), effective susceptibility and present kind of a material in a field H at temperature T. */
export function magmatterMagnetise(material: MagmatterMaterialData, h: number, t: number): { m: number; chi: number; kind: number } {
  if (material.kind === 0) return { m: material.chi * h, chi: material.chi, kind: 0 };
  if (material.kind === 1) {
    const chi = material.curieLaw ? (material.chi * material.atT) / t : material.chi;
    return { m: chi * h, chi, kind: 1 };
  }
  if (t >= material.curieTemp) {
    const chi = material.curieConstant / Math.max(1, t - material.curieTemp);
    return { m: chi * h, chi, kind: 1 };
  }
  const ms = material.saturation * Math.sqrt(1 - (t / material.curieTemp) ** 2);
  const m = ms * Math.tanh((material.chi * h) / ms);
  return { m, chi: h > 0 ? m / h : material.chi, kind: 2 };
}

/** ln cosh x without overflow. */
const lnCosh = (x: number) => Math.abs(x) + Math.log1p(Math.exp(-2 * Math.abs(x))) - Math.LN2;

/** The width of the tanh curves that gives a loop its retentivity. */
export function magmatterLoopWidth(core: MagmatterCoreData): number {
  return core.coercivity / Math.atanh(core.retentivity / core.saturation);
}

/** H (A/m) and B (T) at a point round the loop: H = H_max cos 2πc; falling for the first half, rising for the second. */
export function magmatterLoopPoint(core: MagmatterCoreData, cycle: number): { h: number; b: number; falling: boolean } {
  const angle = 2 * Math.PI * cycle;
  const h = core.maxField * Math.cos(angle);
  // Which branch: +1 coming down, −1 going up, blended only at the saturated tips so the loop closes.
  const branch = Math.max(-1, Math.min(1, 4 * Math.sin(angle)));
  const b = core.saturation * Math.tanh((h + branch * core.coercivity) / magmatterLoopWidth(core));
  return { h: Math.abs(h) < 1e-9 * core.maxField ? 0 : h, b, falling: Math.sin(angle) > 0 };
}

/** The area of the loop, ∮H dB, J/m³: the energy lost as heat per cycle in each cubic metre. */
export function magmatterLoopLoss(core: MagmatterCoreData): number {
  const w = magmatterLoopWidth(core);
  return 2 * core.saturation * w * (lnCosh((core.maxField + core.coercivity) / w) - lnCosh((core.maxField - core.coercivity) / w));
}

const pick = <T extends string>(order: readonly T[], value: T, fallback: T) => (order.includes(value) ? value : fallback);

/** Small-swing angular frequency squared, for Play. */
const stiffness = (params: MagmatterParams) =>
  (clamp(params.moment, MAGMATTER_LIMITS.moment) * clamp(params.field, MAGMATTER_LIMITS.field) * 1e-3) / MAGMATTER_NEEDLE_INERTIA;

export const magmatterModel: SimulationModel<MagmatterState, MagmatterParams, MagmatterResults> = {
  id: "magmatter",
  defaultParams: { probe: "axis", place: "delhi", material: "iron", core: "steel", moment: 1, field: 10, current: 1, temperature: 300 },
  outputs: OUTPUTS,
  stateVariables: ["r", "theta", "tilt", "cycle"],

  initialize() {
    return { r: 20, theta: Math.PI / 3, omega: 0, tilt: 0, cycle: 0 };
  },

  /** Play lets the magnet swing in the uniform field and takes the hysteresis loop round. */
  advance(state, dt, params) {
    const k = stiffness(params);
    // Keep each sub-step a small fraction of a swing, however stiff the field.
    const n = Math.min(400, Math.max(1, Math.ceil((dt * Math.sqrt(k)) / 0.05)));
    const h = dt / n;
    let th = state.theta;
    let w = state.omega;
    const acc = (a: number) => -k * Math.sin(a);
    for (let i = 0; i < n; i++) {
      const k1t = w;
      const k1w = acc(th);
      const k2t = w + (h / 2) * k1w;
      const k2w = acc(th + (h / 2) * k1t);
      const k3t = w + (h / 2) * k2w;
      const k3w = acc(th + (h / 2) * k2t);
      const k4t = w + h * k3w;
      const k4w = acc(th + h * k3t);
      th += (h / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
      w += (h / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
    }
    // The magnet swings either side of the field; report the size of the angle.
    if (th < 0) {
      th = -th;
      w = -w;
    }
    if (th > Math.PI) {
      th = 2 * Math.PI - th;
      w = -w;
    }
    const cycle = (state.cycle + dt / MAGMATTER_CYCLE_TIME) % 1;
    return { ...state, theta: th, omega: w, cycle };
  },

  step(state, _params, sign) {
    return { ...state, r: clamp(Math.round(state.r) + sign, MAGMATTER_LIMITS.r) };
  },

  derive(state, params) {
    const probe = pick(MAGMATTER_PROBE_ORDER, params.probe, "axis");
    const m = clamp(params.moment, MAGMATTER_LIMITS.moment);
    const rCm = clamp(state.r, MAGMATTER_LIMITS.r);
    const r = rCm / 100;
    const bAxis = magmatterAxialField(m, r) * 1e6;
    const bEquator = magmatterEquatorialField(m, r) * 1e6;

    const fieldMt = clamp(params.field, MAGMATTER_LIMITS.field);
    const b = fieldMt * 1e-3;
    const theta = clamp(state.theta, MAGMATTER_LIMITS.theta);
    const mb = m * b;

    const placeId = pick(MAGMATTER_PLACE_ORDER, params.place, "delhi");
    const place = MAGMATTER_PLACES[placeId];
    const dip = place.dip * DEG;
    const tilt = clamp(state.tilt, MAGMATTER_LIMITS.tilt);
    const bH = place.total * Math.cos(dip);

    const materialId = pick(MAGMATTER_MATERIAL_ORDER, params.material, "iron");
    const material = MAGMATTER_MATERIALS[materialId];
    const current = clamp(params.current, MAGMATTER_LIMITS.current);
    const temperature = clamp(params.temperature, MAGMATTER_LIMITS.temperature);
    const hField = MAGMATTER_TURNS * current;
    const mag = magmatterMagnetise(material, hField, temperature);

    const coreId = pick(MAGMATTER_CORE_ORDER, params.core, "steel");
    const core = MAGMATTER_CORES[coreId];
    const cycle = clamp(state.cycle, MAGMATTER_LIMITS.cycle);
    const loop = magmatterLoopPoint(core, cycle);

    return {
      probe: MAGMATTER_PROBE_ORDER.indexOf(probe),
      moment: m,
      r: rCm,
      bAxis,
      bEquator,
      bProbe: probe === "axis" ? bAxis : bEquator,
      ratio: bAxis / bEquator,
      along: probe === "axis" ? 1 : -1,
      netFlux: 0,

      field: fieldMt,
      theta,
      torque: z(mb * Math.sin(theta)),
      torqueRatio: z(Math.sin(theta)),
      energy: z(-mb * Math.cos(theta)),
      work: z(mb * (1 - Math.cos(theta))),
      period: magmatterPeriod(m, b),
      equilibrium: theta < 2 * DEG ? 1 : theta > Math.PI - 2 * DEG ? 2 : 0,

      place: MAGMATTER_PLACE_ORDER.indexOf(placeId),
      total: place.total,
      dip,
      declination: z(place.declination * DEG),
      bH: z(Math.abs(bH) < 1e-9 ? 0 : bH),
      bV: place.total * Math.sin(dip),
      tilt,
      apparentDip: magmatterApparentDip(dip, tilt),
      compass: Math.abs(bH) > 1 ? 1 : 0,

      material: MAGMATTER_MATERIAL_ORDER.indexOf(materialId),
      current,
      hField,
      temperature,
      chi: z(mag.chi),
      muR: 1 + mag.chi,
      magnetisation: z(mag.m),
      bInside: MAGMATTER_MU0 * (hField + mag.m),
      kind: mag.kind,
      curieTemp: material.curieTemp,
      pull: mag.chi < 0 ? -1 : 1,

      core: MAGMATTER_CORE_ORDER.indexOf(coreId),
      cycle,
      hLoop: z(loop.h),
      bLoop: z(loop.b),
      falling: loop.falling ? 1 : 0,
      retentivity: core.retentivity,
      coercivity: core.coercivity,
      saturation: core.saturation,
      maxField: core.maxField,
      loss: magmatterLoopLoss(core),
    };
  },

  getVariable(state, id) {
    switch (id) {
      case "r": return state.r;
      case "theta": return state.theta;
      case "tilt": return state.tilt;
      case "cycle": return state.cycle;
      default: return undefined;
    }
  },

  setVariable(state, id, value) {
    switch (id) {
      case "r": return { ...state, r: clamp(value, MAGMATTER_LIMITS.r) };
      // Turning the magnet by hand leaves it at rest there.
      case "theta": return { ...state, theta: clamp(value, MAGMATTER_LIMITS.theta), omega: 0 };
      case "tilt": return { ...state, tilt: clamp(value, MAGMATTER_LIMITS.tilt) };
      case "cycle": return { ...state, cycle: clamp(value, MAGMATTER_LIMITS.cycle) };
      default: return state;
    }
  },
};
