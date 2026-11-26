import type { SimulationModel } from "@ise/science-engine";

/**
 * Two bar magnets, a thing to test, and a compass.
 *
 * Unlike poles pull together and like poles push apart, with a force that
 * falls off fast — a quarter as strong at twice the distance. Only some
 * materials are drawn to a magnet, and only when they are close enough. A
 * compass needle placed around a bar magnet lines up with its field: away
 * from the north pole, back towards the south pole, and from N to S along
 * its side.
 */

export type Facing = "N-S" | "N-N" | "S-S";
export type Partner = "magnet" | "object";
export type MagnetMaterial = "iron" | "steel" | "nickel" | "cobalt" | "copper" | "aluminium" | "wood" | "plastic" | "glass" | "rubber";

export const FACING_ORDER: readonly Facing[] = ["N-S", "N-N", "S-S"];
export const PARTNER_ORDER: readonly Partner[] = ["magnet", "object"];
export const MAGNET_MATERIAL_ORDER: readonly MagnetMaterial[] = ["iron", "steel", "nickel", "cobalt", "copper", "aluminium", "wood", "plastic", "glass", "rubber"];

export const MAGNET_MATERIALS: Record<MagnetMaterial, { label: string; magnetic: boolean }> = {
  iron: { label: "Iron", magnetic: true },
  steel: { label: "Steel", magnetic: true },
  nickel: { label: "Nickel", magnetic: true },
  cobalt: { label: "Cobalt", magnetic: true },
  copper: { label: "Copper", magnetic: false },
  aluminium: { label: "Aluminium", magnetic: false },
  wood: { label: "Wood", magnetic: false },
  plastic: { label: "Plastic", magnetic: false },
  glass: { label: "Glass", magnetic: false },
  rubber: { label: "Rubber", magnetic: false },
};

/** Force between the two magnets at 1 cm, in newtons. */
const STRENGTH = 4;
/** A magnetic object closer than this jumps to the magnet, cm. */
export const PULL_RANGE = 6;
export const MIN_GAP = 1;
export const MAX_GAP = 20;

export type MagnetsParams = {
  facing: Facing;
  partner: Partner;
  material: MagnetMaterial;
};

export interface MagnetsState {
  /** Gap between the magnet and its partner, cm. */
  readonly gap: number;
  /** Where the compass sits around the magnet, degrees from its north end. */
  readonly around: number;
}

export type MagnetsResults = {
  facing: number;
  partner: number;
  material: number;
  gap: number;
  force: number;
  /** How strong the pull or push is, whichever it is, N. */
  strength: number;
  attracts: number;
  repels: number;
  magnetic: number;
  pulled: number;
  around: number;
  needle: number;
};

/**
 * The direction a compass needle points (its north end, degrees, 0 along the
 * magnet from S to N) at an angle `around` from the magnet's north end —
 * the direction of a bar magnet's dipole field there.
 */
export function needleAngle(around: number): number {
  const phi = (around * Math.PI) / 180;
  const direction = phi + Math.atan2(Math.sin(phi), 2 * Math.cos(phi));
  const degrees = (direction * 180) / Math.PI;
  return ((degrees % 360) + 360) % 360;
}

const clampGap = (gap: number) => Math.min(MAX_GAP, Math.max(MIN_GAP, gap));
const wrap = (deg: number) => ((deg % 360) + 360) % 360;

const OUTPUTS = ["facing", "partner", "material", "gap", "force", "strength", "attracts", "repels", "magnetic", "pulled", "around", "needle"] as const satisfies readonly (keyof MagnetsResults)[];

export const magnetsModel: SimulationModel<MagnetsState, MagnetsParams, MagnetsResults> = {
  id: "magnets",
  defaultParams: { facing: "N-S", partner: "magnet", material: "iron" },
  outputs: OUTPUTS,
  stateVariables: ["gap", "around"],

  initialize() {
    return { gap: 8, around: 0 };
  },

  /** Play walks the compass round the magnet. */
  advance(state, dt) {
    return { ...state, around: wrap(state.around + 30 * dt) };
  },

  step(state, _params, sign) {
    return { ...state, gap: clampGap(Math.round(state.gap) + sign) };
  },

  derive(state, params) {
    const gap = clampGap(state.gap);
    const attracts = params.facing === "N-S";
    const material = MAGNET_MATERIALS[params.material] ?? MAGNET_MATERIALS.iron;
    const around = wrap(state.around);
    return {
      facing: Math.max(0, FACING_ORDER.indexOf(params.facing)),
      partner: Math.max(0, PARTNER_ORDER.indexOf(params.partner)),
      material: Math.max(0, MAGNET_MATERIAL_ORDER.indexOf(params.material)),
      gap,
      force: ((attracts ? 1 : -1) * STRENGTH) / (gap * gap),
      strength: STRENGTH / (gap * gap),
      attracts: attracts ? 1 : 0,
      repels: attracts ? 0 : 1,
      magnetic: material.magnetic ? 1 : 0,
      pulled: material.magnetic && gap < PULL_RANGE ? 1 : 0,
      around,
      needle: needleAngle(around),
    };
  },

  getVariable(state, id) {
    return id === "gap" ? state.gap : id === "around" ? state.around : undefined;
  },

  setVariable(state, id, value) {
    if (id === "gap") return { ...state, gap: clampGap(value) };
    if (id === "around") return { ...state, around: wrap(value) };
    return state;
  },
};
