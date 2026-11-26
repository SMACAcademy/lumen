import type { SimulationModel } from "@ise/science-engine";

/**
 * Light travels in straight lines — so shadows, pinhole cameras and mirrors
 * are all geometry.
 *
 * A lamp, an object and a screen: rays that graze the object's edges carry
 * on straight to the screen, so the shadow is the object scaled by how much
 * further the screen is than the object (similar triangles). A pinhole does
 * the same with rays that cross at the hole, so its image is upside down.
 * A plane mirror sends a ray off at the angle it arrived, and shows an image
 * as far behind the glass as the object stands in front.
 *
 * For class 10 the same bench grows two more scenes: a ray bending as it
 * enters water, glass or diamond (Snell's law, sin i = n sin r), and a convex
 * lens forming an image (1/v − 1/u = 1/f, with u measured against the light).
 */

export type LightScene = "shadow" | "pinhole" | "mirror" | "refraction" | "lens";
export type LightMedium = "water" | "glass" | "diamond";
export type LightMaterial = "opaque" | "translucent" | "transparent";

export const SCENE_ORDER: readonly LightScene[] = ["shadow", "pinhole", "mirror", "refraction", "lens"];
export const MEDIUM_ORDER: readonly LightMedium[] = ["water", "glass", "diamond"];

/** Refractive indices: how much each slows light, and so how much it bends a ray. */
export const REFRACTIVE_INDEX: Record<LightMedium, number> = { water: 1.33, glass: 1.5, diamond: 2.42 };
export const MATERIAL_ORDER: readonly LightMaterial[] = ["opaque", "translucent", "transparent"];

export const LIGHT_MATERIALS: Record<LightMaterial, { label: string; darkness: number }> = {
  opaque: { label: "Opaque", darkness: 1 },
  translucent: { label: "Translucent", darkness: 0.4 },
  transparent: { label: "Transparent", darkness: 0 },
};

/** The object never touches the lamp, and stays this far in front of the screen. */
export const MIN_OBJECT_DISTANCE = 10;
export const SCREEN_GAP = 5;
export const MAX_ANGLE = 80;
/** cm per second when play walks the object towards the lamp. */
const WALK_RATE = 8;

export type LightParams = {
  scene: LightScene;
  material: LightMaterial;
  /** cm. */
  objectHeight: number;
  /** Lamp (or pinhole) to screen, cm. */
  screenDistance: number;
  /** What the ray enters in the refraction scene. */
  medium?: LightMedium;
  /** The lens's focal length, cm. */
  focal?: number;
};

export interface LightState {
  /** Lamp (or pinhole, or mirror) to object, cm. */
  readonly objectDistance: number;
  /** Angle of the incoming ray to the mirror's normal, degrees. */
  readonly angle: number;
}

export type LightResults = {
  scene: number;
  material: number;
  objectDistance: number;
  screenDistance: number;
  objectHeight: number;
  imageHeight: number;
  sizeRatio: number;
  darkness: number;
  inverted: number;
  incidence: number;
  reflection: number;
  imageDistance: number;
  /** Refraction: the medium, its index, the angle inside it and whether it bent towards the normal. */
  medium: number;
  index: number;
  refracted: number;
  bendsTowardNormal: number;
  criticalAngle: number;
  /** Lens: focal length, image distance (negative for a virtual image), magnification and whether the image is real. */
  focal: number;
  lensImage: number;
  lensMagnification: number;
  real: number;
};

const DEG = Math.PI / 180;
/** Furthest an image is placed when the object sits at the focus and the rays come out parallel, cm. */
const FAR_IMAGE = 999;

/** A convex lens's image of an object u cm in front: 1/v = 1/f − 1/u. Negative v is a virtual image on the object's side. */
export function lensImage(u: number, f: number): { v: number; magnification: number } {
  const inverse = 1 / f - 1 / u;
  if (Math.abs(inverse) < 1e-9) return { v: FAR_IMAGE, magnification: FAR_IMAGE / u };
  const v = Math.max(-FAR_IMAGE, Math.min(FAR_IMAGE, 1 / inverse));
  return { v, magnification: Math.abs(v / u) };
}

const clampDistance = (d: number, screen: number) => Math.min(screen - SCREEN_GAP, Math.max(MIN_OBJECT_DISTANCE, d));
const clampAngle = (a: number) => Math.min(MAX_ANGLE, Math.max(0, a));

const OUTPUTS = [
  "scene",
  "material",
  "objectDistance",
  "screenDistance",
  "objectHeight",
  "imageHeight",
  "sizeRatio",
  "darkness",
  "inverted",
  "incidence",
  "reflection",
  "imageDistance",
  "medium",
  "index",
  "refracted",
  "bendsTowardNormal",
  "criticalAngle",
  "focal",
  "lensImage",
  "lensMagnification",
  "real",
] as const satisfies readonly (keyof LightResults)[];

export const lightModel: SimulationModel<LightState, LightParams, LightResults> = {
  id: "light",
  defaultParams: { scene: "shadow", material: "opaque", objectHeight: 10, screenDistance: 80, medium: "glass", focal: 10 },
  outputs: OUTPUTS,
  stateVariables: ["objectDistance", "angle"],

  initialize(params) {
    return { objectDistance: clampDistance(30, params.screenDistance), angle: 30 };
  },

  /** Play walks the object slowly towards the lamp, so the shadow (or image) grows. */
  advance(state, dt, params) {
    return { ...state, objectDistance: clampDistance(state.objectDistance - WALK_RATE * dt, params.screenDistance) };
  },

  step(state, params, sign) {
    return { ...state, objectDistance: clampDistance(Math.round(state.objectDistance) + sign, params.screenDistance) };
  },

  derive(state, params) {
    const d = clampDistance(state.objectDistance, params.screenDistance);
    const D = params.screenDistance;
    const angle = clampAngle(state.angle);
    const material = LIGHT_MATERIALS[params.material] ?? LIGHT_MATERIALS.opaque;
    const scene = Math.max(0, SCENE_ORDER.indexOf(params.scene));
    const medium = params.medium ?? "glass";
    const n = REFRACTIVE_INDEX[medium] ?? REFRACTIVE_INDEX.glass;
    const refracted = (Math.asin(Math.sin(angle * DEG) / n) / DEG);
    const lens = lensImage(d, params.focal ?? 10);
    return {
      scene,
      material: Math.max(0, MATERIAL_ORDER.indexOf(params.material)),
      objectDistance: d,
      screenDistance: D,
      objectHeight: params.objectHeight,
      imageHeight: (params.objectHeight * D) / d,
      sizeRatio: D / d,
      darkness: params.scene === "shadow" ? material.darkness : 0,
      inverted: params.scene === "pinhole" || (params.scene === "lens" && lens.v > 0) ? 1 : 0,
      incidence: angle,
      reflection: angle,
      imageDistance: d,
      medium: Math.max(0, MEDIUM_ORDER.indexOf(medium)),
      index: n,
      refracted,
      bendsTowardNormal: angle > 0 && refracted < angle ? 1 : 0,
      criticalAngle: Math.asin(1 / n) / DEG,
      focal: params.focal ?? 10,
      lensImage: lens.v,
      lensMagnification: lens.magnification,
      real: params.scene === "lens" ? (lens.v > 0 ? 1 : 0) : 0,
    };
  },

  getVariable(state, id) {
    return id === "objectDistance" ? state.objectDistance : id === "angle" ? state.angle : undefined;
  },

  setVariable(state, id, value, params) {
    if (id === "objectDistance") return { ...state, objectDistance: clampDistance(value, params.screenDistance) };
    if (id === "angle") return { ...state, angle: clampAngle(value) };
    return state;
  },
};
