import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Three ways to deform a solid, and the modulus that goes with each.
 *
 * Squeeze: a cube pressed equally on every face by an extra pressure Δp
 * shrinks in volume. Bulk modulus B = Δp ÷ (−ΔV/V); its inverse is the
 * compressibility. Air, the odd one out, is treated as an ideal gas at
 * constant temperature (Boyle's law), so its volume falls to p₀/(p₀ + Δp) and
 * its bulk modulus is its own pressure — 1.0 × 10⁵ Pa at the start, as in
 * NCERT's table, and growing as it is squeezed.
 *
 * Shear: a cube with its base held and a tangential force F on its top face.
 * The top slides Δx; the shear strain is Δx/L = tan θ ≈ θ, and the shear
 * modulus G = (F/A) ÷ θ. A liquid or a gas has no shear modulus: it flows.
 *
 * Stretch: a wire under tension grows longer and thinner. Poisson's ratio σ
 * is the lateral strain (Δd/d, a contraction) divided by the longitudinal
 * strain (Δl/l). To first order the volume changes by ΔV/V = ε(1 − 2σ).
 *
 * Every solid is treated as perfectly elastic (Hooke's law). For the wire
 * the model flags when the stress passes the elastic limit, past which that
 * is no longer true. Y, G and B are NCERT's Tables 8.1–8.3; Poisson's ratios
 * are typical handbook values.
 */

export type ModuliSetup = "squeeze" | "shear" | "stretch";
export const MODULI_SETUP_ORDER: readonly ModuliSetup[] = ["squeeze", "shear", "stretch"];

export type ModuliMaterialId = "steel" | "copper" | "aluminium" | "glass" | "water" | "air";
export const MODULI_MATERIAL_ORDER: readonly ModuliMaterialId[] = ["steel", "copper", "aluminium", "glass", "water", "air"];

export interface ModuliMaterial {
  label: string;
  /** Young's modulus, Pa (0 for a fluid). */
  youngs: number;
  /** Shear modulus, Pa (0 for a fluid). */
  shear: number;
  /** Bulk modulus, Pa. For air, the isothermal value at 1.0 × 10⁵ Pa. */
  bulk: number;
  /** Poisson's ratio (0 for a fluid, where it has no meaning). */
  poisson: number;
  /** Stress at the elastic limit, Pa (0 for a fluid). */
  elasticLimit: number;
  fluid: boolean;
}

export const MODULI_MATERIALS: Record<ModuliMaterialId, ModuliMaterial> = {
  steel: { label: "Steel", youngs: 200e9, shear: 84e9, bulk: 160e9, poisson: 0.29, elasticLimit: 300e6, fluid: false },
  copper: { label: "Copper", youngs: 120e9, shear: 42e9, bulk: 140e9, poisson: 0.34, elasticLimit: 200e6, fluid: false },
  aluminium: { label: "Aluminium", youngs: 70e9, shear: 25e9, bulk: 72e9, poisson: 0.33, elasticLimit: 180e6, fluid: false },
  glass: { label: "Glass", youngs: 65e9, shear: 23e9, bulk: 37e9, poisson: 0.22, elasticLimit: 50e6, fluid: false },
  water: { label: "Water", youngs: 0, shear: 0, bulk: 2.2e9, poisson: 0, elasticLimit: 0, fluid: true },
  air: { label: "Air", youngs: 0, shear: 0, bulk: 1.0e5, poisson: 0, elasticLimit: 0, fluid: true },
};

/** The starting pressure of the air, Pa — which is also its bulk modulus at the start. */
export const MODULI_AIR_PRESSURE = 1.0e5;
/** Slider limits for the three loads. */
export const MODULI_MAX_PRESSURE = 100; // MPa
export const MODULI_MAX_SHEAR = 100; // kN
export const MODULI_MAX_TENSION = 300; // N

export type ModuliParams = {
  setup: ModuliSetup;
  material: ModuliMaterialId;
  /** Side of the cube, cm (squeeze and shear). */
  size: number;
  /** Wire diameter, mm. */
  diameter: number;
  /** Wire length, m. */
  length: number;
};

export interface ModuliState {
  /** Extra pressure on every face of the cube, MPa. */
  readonly pressure: number;
  /** Tangential force on the cube's top face, kN. */
  readonly shearForce: number;
  /** Tension in the wire, N. */
  readonly tension: number;
}

export type ModuliResults = {
  setup: number;
  material: number;
  fluid: number;
  youngsModulusGPa: number;
  shearModulusGPa: number;
  bulkModulusGPa: number;
  /** 1/B, per GPa. */
  compressibility: number;
  poissonsRatio: number;
  elasticLimitMPa: number;
  size: number;
  /** Volume of the cube before squeezing, cm³. */
  volume: number;
  pressure: number;
  /** −ΔV/V, a fraction. */
  compression: number;
  compressionPercent: number;
  /** How much volume the cube lost, cm³. */
  volumeDecrease: number;
  newVolume: number;
  /** Δp ÷ (−ΔV/V) as measured now, GPa. Constant for a solid or liquid; for air it is the pressure. */
  measuredBulkGPa: number;
  shearForce: number;
  /** Area of the sheared face, cm². */
  faceArea: number;
  shearStress: number;
  /** Δx/L = tan θ ≈ θ. */
  shearStrain: number;
  /** How far the top face slides, µm. */
  shearDisplacement: number;
  measuredShearGPa: number;
  /** 1 if the material keeps its shape under a shear (a solid). */
  holdsShape: number;
  tension: number;
  diameter: number;
  length: number;
  wireArea: number;
  tensileStress: number;
  /** Δl/l. */
  longStrain: number;
  /** Δl, mm. */
  extension: number;
  /** Δd/d, the fractional narrowing. */
  lateralStrain: number;
  /** How much thinner the wire gets, µm. */
  diameterDecrease: number;
  /** Lateral strain ÷ longitudinal strain as measured now. */
  measuredPoisson: number;
  /** ΔV/V of the wire, ε(1 − 2σ): positive, the wire's volume grows a little. */
  wireVolumeStrain: number;
  overLimit: number;
};

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

export function moduliMaterialOf(params: ModuliParams): ModuliMaterial {
  return MODULI_MATERIALS[params.material] ?? MODULI_MATERIALS.steel;
}

/**
 * −ΔV/V for an extra pressure Δp (Pa). Linear, Δp/B, for a solid or liquid;
 * Boyle's law, Δp/(p₀ + Δp), for air.
 */
export function moduliCompression(id: ModuliMaterialId, extraPressure: number): number {
  const m = MODULI_MATERIALS[id] ?? MODULI_MATERIALS.steel;
  if (extraPressure <= 0) return 0;
  if (id === "air") return extraPressure / (MODULI_AIR_PRESSURE + extraPressure);
  return Math.min(1, extraPressure / m.bulk);
}

const OUTPUTS = [
  "setup", "material", "fluid", "youngsModulusGPa", "shearModulusGPa", "bulkModulusGPa", "compressibility", "poissonsRatio",
  "elasticLimitMPa", "size", "volume", "pressure", "compression", "compressionPercent", "volumeDecrease", "newVolume",
  "measuredBulkGPa", "shearForce", "faceArea", "shearStress", "shearStrain", "shearDisplacement", "measuredShearGPa",
  "holdsShape", "tension", "diameter", "length", "wireArea", "tensileStress", "longStrain", "extension", "lateralStrain",
  "diameterDecrease", "measuredPoisson", "wireVolumeStrain", "overLimit",
] as const satisfies readonly (keyof ModuliResults)[];

const LIMITS: Record<keyof ModuliState, number> = {
  pressure: MODULI_MAX_PRESSURE,
  shearForce: MODULI_MAX_SHEAR,
  tension: MODULI_MAX_TENSION,
};

/** The state variable the current setup loads. */
function loadOf(setup: ModuliSetup): keyof ModuliState {
  return setup === "shear" ? "shearForce" : setup === "stretch" ? "tension" : "pressure";
}

export const moduliModel: SimulationModel<ModuliState, ModuliParams, ModuliResults> = {
  id: "moduli",
  defaultParams: { setup: "squeeze", material: "steel", size: 10, diameter: 1, length: 2 },
  outputs: OUTPUTS,
  stateVariables: ["pressure", "shearForce", "tension"],

  initialize() {
    return { pressure: 0, shearForce: 0, tension: 0 };
  },

  /** Play loads the current setup steadily, from nothing to the most the slider allows in ten seconds. */
  advance(state, dt, params) {
    const key = loadOf(params.setup);
    return { ...state, [key]: clamp(state[key] + (LIMITS[key] / 10) * dt, 0, LIMITS[key]) };
  },

  step(state, params, sign) {
    const key = loadOf(params.setup);
    const stride = LIMITS[key] / 20;
    return { ...state, [key]: clamp(Math.round(state[key] / stride) * stride + sign * stride, 0, LIMITS[key]) };
  },

  derive(state, params) {
    const id = MODULI_MATERIALS[params.material] ? params.material : "steel";
    const m = MODULI_MATERIALS[id];
    const size = clamp(params.size, 1, 50);
    const diameter = clamp(params.diameter, 0.1, 10);
    const length = clamp(params.length, 0.1, 20);

    // Squeeze.
    const pressure = clamp(state.pressure, 0, MODULI_MAX_PRESSURE);
    const volume = size ** 3;
    const compression = moduliCompression(id, pressure * 1e6);
    const measuredBulk = compression > 0 ? (pressure * 1e6) / compression : id === "air" ? MODULI_AIR_PRESSURE : m.bulk;

    // Shear.
    const shearForce = clamp(state.shearForce, 0, MODULI_MAX_SHEAR);
    const faceArea = size * size; // cm²
    const shearStress = (shearForce * 1e3) / (faceArea * 1e-4); // Pa
    const shearStrain = m.shear > 0 ? shearStress / m.shear : 0;

    // Stretch.
    const tension = clamp(state.tension, 0, MODULI_MAX_TENSION);
    const radius = diameter / 2000; // m
    const wireArea = Math.PI * radius * radius;
    const tensileStress = tension / wireArea;
    const longStrain = m.youngs > 0 ? tensileStress / m.youngs : 0;
    const lateralStrain = m.poisson * longStrain;

    return {
      setup: Math.max(0, MODULI_SETUP_ORDER.indexOf(params.setup)),
      material: MODULI_MATERIAL_ORDER.indexOf(id),
      fluid: m.fluid ? 1 : 0,
      youngsModulusGPa: m.youngs / 1e9,
      shearModulusGPa: m.shear / 1e9,
      bulkModulusGPa: m.bulk / 1e9,
      compressibility: 1e9 / m.bulk,
      poissonsRatio: m.poisson,
      elasticLimitMPa: m.elasticLimit / 1e6,
      size,
      volume,
      pressure,
      compression: snapZero(compression),
      compressionPercent: snapZero(compression * 100),
      volumeDecrease: snapZero(compression * volume),
      newVolume: volume * (1 - compression),
      measuredBulkGPa: measuredBulk / 1e9,
      shearForce,
      faceArea,
      shearStress: snapZero(shearStress / 1e6),
      shearStrain: snapZero(shearStrain),
      shearDisplacement: snapZero(shearStrain * size * 1e4), // cm → µm
      measuredShearGPa: m.shear / 1e9,
      holdsShape: m.fluid ? 0 : 1,
      tension,
      diameter,
      length,
      wireArea: wireArea * 1e6,
      tensileStress: snapZero(tensileStress / 1e6),
      longStrain: snapZero(longStrain),
      extension: snapZero(longStrain * length * 1000),
      lateralStrain: snapZero(lateralStrain),
      diameterDecrease: snapZero(lateralStrain * diameter * 1000), // mm → µm
      measuredPoisson: longStrain > 0 ? lateralStrain / longStrain : m.poisson,
      wireVolumeStrain: snapZero(longStrain * (1 - 2 * m.poisson)),
      overLimit: !m.fluid && tensileStress > m.elasticLimit ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id === "pressure" || id === "shearForce" || id === "tension" ? state[id] : undefined;
  },

  setVariable(state, id, value) {
    if (id === "pressure" || id === "shearForce" || id === "tension") return { ...state, [id]: clamp(value, 0, LIMITS[id]) };
    return state;
  },
};
