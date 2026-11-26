import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * A wire under load.
 *
 * The whole chapter lives in one curve: stress against strain. Each material
 * is described by four numbers — its stiffness, where it stops springing
 * back, how much more it can take, and how far it stretches before it goes —
 * and every reading on screen is read off that curve rather than stated
 * separately. So the brittle glass and the ductile copper are the same
 * physics with different numbers, which is exactly the lesson.
 */

export type MaterialId = "steel" | "copper" | "aluminium" | "nylon" | "glass";

export interface Material {
  id: MaterialId;
  label: string;
  /** Young's modulus, in pascals. */
  youngsModulus: number;
  /** Stress beyond which it no longer springs back, in pascals. */
  yieldStress: number;
  /** The greatest stress it can carry, in pascals. */
  ultimateStress: number;
  /** Strain at which it breaks. */
  breakStrain: number;
  note: string;
}

export const MATERIALS: Record<MaterialId, Material> = {
  steel: {
    id: "steel",
    label: "Steel",
    youngsModulus: 200e9,
    yieldStress: 250e6,
    ultimateStress: 400e6,
    breakStrain: 0.15,
    note: "Stiff and tough: it takes a great deal of stress, and warns you before it goes.",
  },
  copper: {
    id: "copper",
    label: "Copper",
    youngsModulus: 110e9,
    yieldStress: 70e6,
    ultimateStress: 220e6,
    breakStrain: 0.3,
    note: "Softer than steel and very ductile — it draws out into wire, which is why it does.",
  },
  aluminium: {
    id: "aluminium",
    label: "Aluminium",
    youngsModulus: 70e9,
    yieldStress: 95e6,
    ultimateStress: 110e6,
    breakStrain: 0.12,
    note: "A third of steel's stiffness, and a third of its density: strong for its weight.",
  },
  nylon: {
    id: "nylon",
    label: "Nylon",
    youngsModulus: 3e9,
    yieldStress: 45e6,
    ultimateStress: 75e6,
    breakStrain: 0.6,
    note: "Barely stiff at all, but it stretches enormously before it fails.",
  },
  glass: {
    id: "glass",
    label: "Glass",
    youngsModulus: 70e9,
    yieldStress: 50e6,
    ultimateStress: 50e6,
    breakStrain: 50e6 / 70e9,
    note: "Brittle: it is elastic right up to the moment it shatters, with no warning at all.",
  },
};

export type MaterialsParams = {
  material: MaterialId;
  /** Unstretched length, in metres. */
  length: number;
  /** Diameter, in millimetres. */
  diameter: number;
};

export interface MaterialsState {
  /** The load hanging on the wire, in newtons. */
  readonly load: number;
}

export type MaterialsResults = {
  load: number;
  length: number;
  diameter: number;
  /** Cross-section, in square metres. */
  area: number;
  /** Load per unit area, in pascals. */
  stress: number;
  /** Extension as a fraction of the original length. */
  strain: number;
  /** The same, as a percentage — easier to read on a wire that has yielded. */
  strainPercent: number;
  /** How much longer the wire is, in millimetres. */
  extension: number;
  /** The material's Young's modulus, in pascals. */
  youngsModulus: number;
  /** Stress ÷ strain as measured now: it falls away once the wire yields. */
  measuredModulus: number;
  yieldStress: number;
  ultimateStress: number;
  /** The load at which it would yield, and the load that would break it. */
  yieldLoad: number;
  breakingLoad: number;
  /** Work done stretching it, in joules: the area under the curve times the volume. */
  energyStored: number;
  /** 1 while it would still spring back to its original length. */
  elastic: number;
  /** 1 once it has yielded but not yet broken: it is permanently longer. */
  plastic: number;
  /** 1 once the load has passed the breaking load. */
  broken: number;
  /** How close to breaking, from 0 at no load to 1 at the breaking load. */
  fractionOfBreaking: number;
  /**
   * The same pressures again, in the units a person reads them in. The lab
   * shows megapascals and gigapascals; 278068000 Pa is nobody's idea of a
   * readout.
   */
  stressMPa: number;
  yieldStressMPa: number;
  ultimateStressMPa: number;
  youngsModulusGPa: number;
  measuredModulusGPa: number;
  /** Cross-section in square millimetres, which is how a wire is quoted. */
  areaMM2: number;
  /** Strain at the elastic limit, as a percentage: where the straight line ends. */
  yieldStrainPercent: number;
  /** Strain at which it breaks, as a percentage: where the curve ends. */
  breakStrainPercent: number;
};

/** The heaviest load the lab will hang on a wire, in newtons. */
export const MAX_LOAD = 600;

export function materialOf(params: MaterialsParams): Material {
  return MATERIALS[params.material] ?? MATERIALS.steel;
}

/** Cross-sectional area in m², from a diameter given in millimetres. */
export function areaOf(params: MaterialsParams): number {
  const radius = (params.diameter / 1000) / 2;
  return Math.PI * radius * radius;
}

/** Strain at the yield point: where the straight part of the curve ends. */
export function yieldStrain(m: Material): number {
  return m.yieldStress / m.youngsModulus;
}

/** A material with no plastic region breaks the moment it yields. */
export function isBrittle(m: Material): boolean {
  return m.ultimateStress <= m.yieldStress || m.breakStrain <= yieldStrain(m);
}

/**
 * Strain for a given stress. Straight up to the yield point, then a much
 * shallower line out to the breaking point — the two-line shape that stands
 * in for a real stress–strain curve without pretending to more detail.
 */
export function strainAt(m: Material, stress: number): number {
  if (stress <= 0) return 0;
  const elastic = stress / m.youngsModulus;
  if (stress <= m.yieldStress || isBrittle(m)) return Math.min(elastic, m.breakStrain);
  const hardening = (m.ultimateStress - m.yieldStress) / (m.breakStrain - yieldStrain(m));
  const plastic = yieldStrain(m) + (stress - m.yieldStress) / hardening;
  return Math.min(plastic, m.breakStrain);
}

/** Work done per cubic metre in stretching to this stress: the area under the curve. */
export function energyDensityAt(m: Material, stress: number): number {
  const capped = Math.min(stress, m.ultimateStress);
  const strain = strainAt(m, capped);
  if (capped <= m.yieldStress || isBrittle(m)) return 0.5 * capped * strain;
  const elastic = 0.5 * m.yieldStress * yieldStrain(m);
  return elastic + ((m.yieldStress + capped) / 2) * (strain - yieldStrain(m));
}

const OUTPUTS = [
  "load",
  "length",
  "diameter",
  "area",
  "stress",
  "strain",
  "strainPercent",
  "extension",
  "youngsModulus",
  "measuredModulus",
  "yieldStress",
  "ultimateStress",
  "yieldLoad",
  "breakingLoad",
  "energyStored",
  "elastic",
  "plastic",
  "broken",
  "fractionOfBreaking",
  "yieldStrainPercent",
  "breakStrainPercent",
  "stressMPa",
  "yieldStressMPa",
  "ultimateStressMPa",
  "youngsModulusGPa",
  "measuredModulusGPa",
  "areaMM2",
] as const satisfies readonly (keyof MaterialsResults)[];

export const materialsModel: SimulationModel<MaterialsState, MaterialsParams, MaterialsResults> = {
  id: "materials",
  defaultParams: { material: "steel", length: 2, diameter: 1 },
  outputs: OUTPUTS,
  stateVariables: ["load"],

  initialize() {
    return { load: 0 };
  },

  /** Play hangs weight on steadily, so every wire reaches its limit in about ten seconds. */
  advance(state, dt, params) {
    const breaking = materialOf(params).ultimateStress * areaOf(params);
    const rate = Math.min(MAX_LOAD, breaking * 1.2) / 10;
    return { load: Math.min(MAX_LOAD, state.load + rate * dt) };
  },

  /** A step is a tenth of the breaking load: enough to see the curve bend. */
  step(state, params, sign) {
    const breaking = materialOf(params).ultimateStress * areaOf(params);
    const stride = Math.max(0.5, Math.min(MAX_LOAD, breaking) / 10);
    return { load: Math.max(0, Math.min(MAX_LOAD, state.load + sign * stride)) };
  },

  derive(state, params) {
    const m = materialOf(params);
    const area = areaOf(params);
    const stress = state.load / area;
    const broken = stress > m.ultimateStress;
    // Past breaking there is nothing to report but the break itself: the wire
    // is in two pieces, and it parted at its breaking stress.
    const carried = Math.min(stress, m.ultimateStress);
    const strain = strainAt(m, carried);
    const breakingLoad = m.ultimateStress * area;
    return {
      load: state.load,
      length: params.length,
      diameter: params.diameter,
      area,
      stress: snapZero(stress),
      strain: snapZero(strain),
      strainPercent: snapZero(strain * 100),
      extension: snapZero(strain * params.length * 1000),
      youngsModulus: m.youngsModulus,
      // Stress over strain: it is Young's modulus only while the wire is elastic.
      measuredModulus: strain > 1e-12 ? carried / strain : m.youngsModulus,
      yieldStress: m.yieldStress,
      ultimateStress: m.ultimateStress,
      yieldLoad: m.yieldStress * area,
      breakingLoad,
      energyStored: snapZero(energyDensityAt(m, carried) * area * params.length),
      elastic: !broken && carried <= m.yieldStress ? 1 : 0,
      plastic: !broken && carried > m.yieldStress ? 1 : 0,
      broken: broken ? 1 : 0,
      fractionOfBreaking: breakingLoad > 0 ? state.load / breakingLoad : 0,
      yieldStrainPercent: yieldStrain(m) * 100,
      breakStrainPercent: m.breakStrain * 100,
      stressMPa: snapZero(stress / 1e6),
      yieldStressMPa: m.yieldStress / 1e6,
      ultimateStressMPa: m.ultimateStress / 1e6,
      youngsModulusGPa: m.youngsModulus / 1e9,
      measuredModulusGPa: (strain > 1e-12 ? carried / strain : m.youngsModulus) / 1e9,
      areaMM2: area * 1e6,
    };
  },

  getVariable(state, id) {
    return id === "load" ? state.load : undefined;
  },

  setVariable(state, id, value) {
    return id === "load" ? { load: Math.max(0, Math.min(MAX_LOAD, value)) } : state;
  },
};
