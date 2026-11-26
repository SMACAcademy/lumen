import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * A tank of fluid, a pressure probe and a block.
 *
 * Two ideas share one picture because they share one cause. Pressure rises
 * with depth because of the weight of fluid above; a block floats because
 * that same rise makes the push on its bottom face beat the push on its top.
 * So the probe and the block are never separate demonstrations — the block's
 * buoyancy is computed from the very pressures the probe reads.
 */

export type FluidId = "water" | "seawater" | "oil" | "mercury";

export interface Fluid {
  id: FluidId;
  label: string;
  /** Density in kg/m³. */
  density: number;
}

export const FLUIDS: Record<FluidId, Fluid> = {
  water: { id: "water", label: "Water", density: 1000 },
  seawater: { id: "seawater", label: "Sea water", density: 1030 },
  oil: { id: "oil", label: "Oil", density: 800 },
  mercury: { id: "mercury", label: "Mercury", density: 13600 },
};

export type FluidsParams = {
  fluid: FluidId;
  /** Density of the block, in kg/m³. */
  blockDensity: number;
  /** Volume of the block, in litres. */
  blockVolume: number;
};

export interface FluidsState {
  /** How far the pressure probe is below the surface, in metres. */
  readonly depth: number;
}

export type FluidsResults = {
  depth: number;
  /** Depth of the tank, in metres. */
  tankDepth: number;
  fluidDensity: number;
  blockDensity: number;
  /** Block volume in cubic metres, and the side of the cube in metres. */
  blockVolume: number;
  blockSide: number;
  blockMass: number;
  /** Weight of the block in air, in newtons. */
  weight: number;
  /** Pressure due to the fluid alone, in pascals. */
  gaugePressure: number;
  /** Gauge pressure plus the atmosphere pressing on the surface. */
  absolutePressure: number;
  /** Gauge pressure at the very bottom of the tank. */
  bottomPressure: number;
  /** The fraction of the block below the surface, from 0 to 1. */
  submergedFraction: number;
  /** Volume of fluid pushed aside, in cubic metres, and its mass in kg. */
  displacedVolume: number;
  displacedMass: number;
  /** The upward push, in newtons: the weight of the fluid displaced. */
  buoyantForce: number;
  /** What a spring balance would read with the block in the fluid. */
  apparentWeight: number;
  /** 1 when the block floats, 0 when it sinks to the bottom. */
  floats: number;
  /** The three pressures again in kilopascals, which is how they are read. */
  gaugePressureKPa: number;
  absolutePressureKPa: number;
  bottomPressureKPa: number;
  /** Block volume in litres, as it is set. */
  blockLitres: number;
  /**
   * Depth of the top face of the block, in metres: negative while it stands
   * proud of the surface, positive once it is under.
   */
  blockTopDepth: number;
};

/** Depth of the tank, in metres. */
export const TANK_DEPTH = 1.5;
/** Strength of gravity used throughout, in m/s². */
export const GRAVITY = 9.81;
/** Atmospheric pressure pushing down on the surface, in pascals. */
export const ATMOSPHERE = 101325;

export function fluidOf(params: FluidsParams): Fluid {
  return FLUIDS[params.fluid] ?? FLUIDS.water;
}

/** Gauge pressure at a depth: the weight of the column of fluid above it. */
export function pressureAt(params: FluidsParams, depth: number): number {
  return fluidOf(params).density * GRAVITY * Math.max(0, depth);
}

/**
 * How much of the block is under the surface.
 *
 * A floating block settles where the fluid it displaces weighs exactly what
 * it does, which is the density ratio; anything denser than the fluid goes
 * all the way under and stays there.
 */
export function submergedFractionOf(params: FluidsParams): number {
  const ratio = params.blockDensity / fluidOf(params).density;
  return Math.min(1, Math.max(0, ratio));
}

const OUTPUTS = [
  "depth",
  "tankDepth",
  "fluidDensity",
  "blockDensity",
  "blockVolume",
  "blockSide",
  "blockMass",
  "weight",
  "gaugePressure",
  "absolutePressure",
  "bottomPressure",
  "submergedFraction",
  "displacedVolume",
  "displacedMass",
  "buoyantForce",
  "apparentWeight",
  "floats",
  "blockTopDepth",
  "gaugePressureKPa",
  "absolutePressureKPa",
  "bottomPressureKPa",
  "blockLitres",
] as const satisfies readonly (keyof FluidsResults)[];

export const fluidsModel: SimulationModel<FluidsState, FluidsParams, FluidsResults> = {
  id: "fluids",
  defaultParams: { fluid: "water", blockDensity: 600, blockVolume: 20 },
  outputs: OUTPUTS,
  stateVariables: ["depth"],

  initialize() {
    return { depth: 0 };
  },

  /** Play lowers the probe steadily from the surface to the floor of the tank. */
  advance(state, dt) {
    return { depth: Math.min(TANK_DEPTH, state.depth + (TANK_DEPTH / 8) * dt) };
  },

  /** A step is a tenth of a metre, so the readings land on round depths. */
  step(state, _params, sign) {
    const next = Math.round((state.depth + sign * 0.1) * 10) / 10;
    return { depth: Math.max(0, Math.min(TANK_DEPTH, next)) };
  },

  derive(state, params) {
    const fluid = fluidOf(params);
    const volume = params.blockVolume / 1000;
    const side = Math.cbrt(volume);
    const mass = params.blockDensity * volume;
    const fraction = submergedFractionOf(params);
    const floats = params.blockDensity < fluid.density;
    const displacedVolume = fraction * volume;
    const buoyant = fluid.density * GRAVITY * displacedVolume;
    const weight = mass * GRAVITY;
    const gauge = pressureAt(params, state.depth);
    return {
      depth: state.depth,
      tankDepth: TANK_DEPTH,
      fluidDensity: fluid.density,
      blockDensity: params.blockDensity,
      blockVolume: volume,
      blockSide: side,
      blockMass: mass,
      weight,
      gaugePressure: snapZero(gauge),
      absolutePressure: gauge + ATMOSPHERE,
      bottomPressure: pressureAt(params, TANK_DEPTH),
      submergedFraction: fraction,
      displacedVolume,
      displacedMass: fluid.density * displacedVolume,
      buoyantForce: buoyant,
      // A sunken block still gets a push up; the floor carries what is left.
      apparentWeight: Math.max(0, weight - buoyant),
      floats: floats ? 1 : 0,
      // A floating block pokes out of the surface; a sunken one lies on the floor.
      blockTopDepth: snapZero(floats ? -(1 - fraction) * side : TANK_DEPTH - side),
      gaugePressureKPa: snapZero(gauge / 1000),
      absolutePressureKPa: (gauge + ATMOSPHERE) / 1000,
      bottomPressureKPa: pressureAt(params, TANK_DEPTH) / 1000,
      blockLitres: params.blockVolume,
    };
  },

  getVariable(state, id) {
    return id === "depth" ? state.depth : undefined;
  },

  setVariable(state, id, value) {
    return id === "depth" ? { depth: Math.max(0, Math.min(TANK_DEPTH, value)) } : state;
  },
};
