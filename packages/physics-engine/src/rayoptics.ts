import type { SimulationModel } from "@ise/science-engine";

/**
 * Ray optics and optical instruments, class 12 (NCERT chapter 9).
 *
 * Every distance uses NCERT's Cartesian sign convention: measured from the
 * pole of a mirror or the optical centre of a lens, positive in the direction
 * the incident light travels (left to right here) and negative against it;
 * heights positive upwards. A real object stands on the left, so u < 0.
 *
 * Images: a mirror obeys 1/v + 1/u = 1/f with f = R/2 and m = −v/u; a thin
 * lens 1/v − 1/u = 1/f with m = v/u, and its focal length comes from the lens
 * maker's formula 1/f = (n − 1)(1/R₁ − 1/R₂). One refracting surface from air
 * into glass obeys n₂/v − n₁/u = (n₂ − n₁)/R with m = n₁v/(n₂u). Power is
 * P = 1/f in dioptres (f in metres) and thin lenses in contact add powers.
 * Everything is paraxial: rays close to the axis, thin lenses.
 *
 * At a flat boundary Snell's law n₁ sin i = n₂ sin r; going from a denser
 * medium into air the light is totally reflected beyond the critical angle,
 * sin C = 1/n. A prism deviates a ray by δ = i + e − A, least when the ray
 * passes symmetrically: n = sin((A + D_m)/2) / sin(A/2). Glass bends violet
 * more than red (dispersion); air scatters short wavelengths more, as 1/λ⁴.
 *
 * Instruments, with the least distance of distinct vision D = 25 cm: a
 * magnifying glass m = 1 + D/f (image at the near point) or D/f (at
 * infinity); a compound microscope m = (L/f_o)(D/f_e); an astronomical
 * telescope m = f_o/f_e in normal adjustment. Spectacles: a concave lens of
 * f = −(far point) for a short-sighted eye, a convex lens that throws an
 * object at 25 cm back to the near point for a long-sighted one.
 */

export type RayElement = "plane-mirror" | "concave-mirror" | "convex-mirror" | "convex-lens" | "concave-lens" | "surface";
export type RayElementKind = "mirror" | "lens" | "surface";

export const RAY_ELEMENT_ORDER: readonly RayElement[] = ["plane-mirror", "concave-mirror", "convex-mirror", "convex-lens", "concave-lens", "surface"];
export const RAY_ELEMENTS: Record<RayElement, { label: string; kind: RayElementKind }> = {
  "plane-mirror": { label: "Plane mirror", kind: "mirror" },
  "concave-mirror": { label: "Concave mirror", kind: "mirror" },
  "convex-mirror": { label: "Convex mirror", kind: "mirror" },
  "convex-lens": { label: "Convex lens", kind: "lens" },
  "concave-lens": { label: "Concave lens", kind: "lens" },
  surface: { label: "Glass surface", kind: "surface" },
};

export type RayMedium = "water" | "glass" | "diamond";
export const RAY_MEDIUM_ORDER: readonly RayMedium[] = ["water", "glass", "diamond"];
export const RAY_MEDIA: Record<RayMedium, { label: string; index: number }> = {
  water: { label: "Water", index: 1.33 },
  glass: { label: "Glass", index: 1.5 },
  diamond: { label: "Diamond", index: 2.42 },
};

/** "into": from air into the medium; "out": from the medium out into air. */
export type RayDirection = "into" | "out";
export const RAY_DIRECTION_ORDER: readonly RayDirection[] = ["into", "out"];

export type RayInstrument = "magnifier" | "microscope" | "telescope" | "myopia" | "hypermetropia";
export const RAY_INSTRUMENT_ORDER: readonly RayInstrument[] = ["magnifier", "microscope", "telescope", "myopia", "hypermetropia"];
export const RAY_INSTRUMENTS: Record<RayInstrument, string> = {
  magnifier: "Magnifying glass",
  microscope: "Compound microscope",
  telescope: "Astronomical telescope",
  myopia: "Short-sighted eye",
  hypermetropia: "Long-sighted eye",
};

/** The object's height, cm. */
export const RAY_OBJECT_HEIGHT = 2;
/** Least distance of distinct vision, cm. */
export const RAY_NEAR_POINT = 25;
/** The object slider's window, cm (a real object sits on the left: u < 0). */
export const RAY_U_RANGE = [-90, -4] as const;
export const RAY_INCIDENCE_RANGE = [0, 89] as const;
export const RAY_PRISM_I_RANGE = [10, 89] as const;
/** The prism's index is quoted for yellow light of this wavelength, nm. */
export const RAY_YELLOW = 590;
/** Cauchy's B for a typical crown glass, nm²: n(λ) = n(yellow) + B(1/λ² − 1/590²). */
export const RAY_CAUCHY_B = 4200;
/** Optical depth of the whole atmosphere, straight up, for 550 nm light (Rayleigh scattering only). */
export const RAY_TAU_550 = 0.1;
/** Wavelengths for "blue" and "red" in the sunset readouts, nm. */
export const RAY_BLUE = 450;
export const RAY_RED = 700;

const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const finite = (v: number, fallback = 0) => (Number.isFinite(v) ? v : fallback);
/** Turn −0 (and anything not finite) into 0. */
const clean = (v: number) => finite(v) || 0;

export interface RayImage {
  /** Image distance, cm (0 when the image is at infinity). */
  v: number;
  /** Linear magnification (0 when the image is at infinity). */
  m: number;
  infinite: boolean;
}

const AT_INFINITY: RayImage = { v: 0, m: 0, infinite: true };

/** Mirror formula 1/v + 1/u = 1/f, m = −v/u. A plane mirror has f = ±Infinity. */
export function rayMirrorImage(u: number, f: number): RayImage {
  const inverse = 1 / f - 1 / u;
  if (Math.abs(inverse) < 1e-9) return AT_INFINITY;
  const v = 1 / inverse;
  return { v, m: -v / u, infinite: false };
}

/** Thin-lens formula 1/v − 1/u = 1/f, m = v/u. A lens of zero power (f = Infinity) leaves the object where it is. */
export function rayThinLensImage(u: number, f: number): RayImage {
  const inverse = 1 / f + 1 / u;
  if (Math.abs(inverse) < 1e-9) return AT_INFINITY;
  const v = 1 / inverse;
  return { v, m: v / u, infinite: false };
}

/** One spherical refracting surface: n₂/v − n₁/u = (n₂ − n₁)/R, m = n₁v/(n₂u). */
export function raySurfaceImage(u: number, n1: number, n2: number, R: number): RayImage {
  const inverse = ((n2 - n1) / R + n1 / u) / n2;
  if (Math.abs(inverse) < 1e-9) return AT_INFINITY;
  const v = 1 / inverse;
  return { v, m: (n1 * v) / (n2 * u), infinite: false };
}

/** Lens maker's formula 1/f = (n − 1)(1/R₁ − 1/R₂); Infinity for a lens of no power. */
export function rayLensMakerFocal(n: number, r1: number, r2: number): number {
  const inverse = (n - 1) * (1 / r1 - 1 / r2);
  return Math.abs(inverse) < 1e-12 ? Infinity : 1 / inverse;
}

export interface RayBender {
  kind: RayElementKind;
  /** Focal length, cm (mirror or lens); ±Infinity for none. */
  f?: number;
  /** For a surface: the glass's index and the signed radius, cm (from air, n₁ = 1). */
  n?: number;
  R?: number;
}

/**
 * Paraxial ray tracing at the element (x = 0). A ray with slope k (dy/dx)
 * reaches the element at height y and leaves with the slope returned:
 * lens k′ = k − y/f; mirror (now travelling leftwards) k′ = −k − y/f;
 * surface n₂k′ = n₁k − y(n₂ − n₁)/R.
 */
export function rayBend(element: RayBender, y: number, k: number): number {
  if (element.kind === "lens") return k - y / (element.f ?? Infinity);
  if (element.kind === "mirror") return -k - y / (element.f ?? Infinity);
  const n = element.n ?? 1.5;
  return (k - (y * (n - 1)) / (element.R ?? Infinity)) / n;
}

/** Snell's law n₁ sin i = n₂ sin r, angles in degrees. `tir` when there is no refracted ray. */
export function raySnell(n1: number, n2: number, i: number): { r: number; tir: boolean } {
  const s = (n1 * Math.sin(i * DEG)) / n2;
  if (s > 1 + 1e-12) return { r: 0, tir: true };
  return { r: Math.asin(Math.min(1, s)) / DEG, tir: false };
}

/** Critical angle for light leaving a medium of index n into air: sin C = 1/n, degrees. */
export function rayCriticalAngle(n: number): number {
  return n > 1 ? Math.asin(1 / n) / DEG : 90;
}

export interface RayPrismPath {
  r1: number;
  r2: number;
  e: number;
  deviation: number;
  emerges: boolean;
}

/**
 * A ray through a prism of angle A (degrees) and index n, entering at incidence i: r₁ + r₂ = A, δ = i + e − A.
 * In a narrow prism a steep ray can have r₁ > A, so r₂ < 0: it meets the second face on the apex side of
 * the normal and still comes out, with e < 0 on that side — δ = i + e − A holds with the signs.
 */
export function rayPrism(A: number, n: number, i: number): RayPrismPath {
  const r1 = Math.asin(Math.sin(i * DEG) / n) / DEG;
  const r2 = A - r1;
  const s = n * Math.sin(r2 * DEG);
  if (Math.abs(s) > 1) return { r1, r2, e: 0, deviation: 0, emerges: false };
  const e = Math.asin(s) / DEG;
  return { r1, r2, e, deviation: i + e - A, emerges: true };
}

/** Minimum deviation n = sin((A + D_m)/2) / sin(A/2); `blocked` when no ray gets through at all (A > 2C). */
export function rayPrismMinimum(A: number, n: number): { deviation: number; incidence: number; blocked: boolean } {
  const s = n * Math.sin((A / 2) * DEG);
  if (s > 1) return { deviation: 0, incidence: 0, blocked: true };
  const half = Math.asin(s) / DEG;
  return { deviation: 2 * half - A, incidence: half, blocked: false };
}

/** A typical crown glass: n at wavelength λ (nm) given n for yellow light. */
export function rayCrownIndex(nYellow: number, wavelength: number): number {
  return nYellow + RAY_CAUCHY_B * (1 / (wavelength * wavelength) - 1 / (RAY_YELLOW * RAY_YELLOW));
}

/** Rayleigh scattering, relative to red light of 700 nm: (700/λ)⁴. */
export function rayRayleigh(wavelength: number): number {
  return (RAY_RED / wavelength) ** 4;
}

/** Air the sunlight crosses compared with straight up: 1/sin(altitude), for a flat atmosphere. */
export function rayAirMass(altitude: number): number {
  return 1 / Math.sin(clamp(altitude, 1, 90) * DEG);
}

/** Fraction of sunlight of wavelength λ (nm) that reaches the ground unscattered, at the sun's altitude (degrees). */
export function raySunlight(wavelength: number, altitude: number): number {
  return Math.exp(-RAY_TAU_550 * (550 / wavelength) ** 4 * rayAirMass(altitude));
}

/** Magnifying glass of focal length f (cm): D/f with the image at infinity, 1 + D/f at the near point. */
export function rayMagnifier(f: number): { relaxed: number; near: number } {
  return { relaxed: RAY_NEAR_POINT / f, near: 1 + RAY_NEAR_POINT / f };
}

/** Compound microscope of tube length L: (L/f_o)(D/f_e) with the final image at infinity, (L/f_o)(1 + D/f_e) at the near point. */
export function rayMicroscope(L: number, fo: number, fe: number): { relaxed: number; near: number } {
  return { relaxed: (L / fo) * (RAY_NEAR_POINT / fe), near: (L / fo) * (1 + RAY_NEAR_POINT / fe) };
}

/** Astronomical telescope: f_o/f_e in normal adjustment, (f_o/f_e)(1 + f_e/D) with the final image at the near point. */
export function rayTelescope(fo: number, fe: number): { relaxed: number; near: number } {
  return { relaxed: fo / fe, near: (fo / fe) * (1 + fe / RAY_NEAR_POINT) };
}

/** Power (D) of the lens that lets a short-sighted eye see far: it images infinity at the far point (cm). */
export function rayMyopiaLens(farPoint: number): number {
  return -100 / farPoint;
}

/** Power (D) of the lens that lets a long-sighted eye read at 25 cm: it images 25 cm at the near point (cm). */
export function rayHypermetropiaLens(nearPoint: number): number {
  return 100 / RAY_NEAR_POINT - 100 / nearPoint;
}

export type RayOpticsParams = {
  element: RayElement;
  /** Magnitude of the radius of curvature of the mirror, lens faces or surface, cm. */
  radius: number;
  /** Refractive index of the lens or surface glass, and of the prism for yellow light. */
  index: number;
  /** Power of a second thin lens in contact with the first, D (0 for none). */
  partner: number;
  medium: RayMedium;
  direction: RayDirection;
  /** Prism angle A, degrees. */
  prismAngle: number;
  /** Wavelength of the light through the prism and in the sky, nm. */
  wavelength: number;
  /** Height of the sun above the horizon, degrees. */
  sunAltitude: number;
  instrument: RayInstrument;
  /** Focal lengths of the objective and the eyepiece (also the magnifying glass), cm. */
  objective: number;
  eyepiece: number;
  /** Tube length of the microscope: from the objective's second focus to the eyepiece's first, cm. */
  tube: number;
  /** Far point of a short-sighted eye and near point of a long-sighted one, cm. */
  farPoint: number;
  nearPoint: number;
};

export interface RayOpticsState {
  /** Object distance, cm (negative: the object is in front). */
  readonly u: number;
  /** Angle of incidence at the flat boundary, degrees. */
  readonly incidence: number;
  /** Angle of incidence on the prism's first face, degrees. */
  readonly prismIncidence: number;
}

export type RayOpticsResults = {
  element: number;
  u: number;
  v: number;
  /** Focal length of the mirror, the lens (pair) or the surface (its second focal length), cm; 0 for a plane mirror or a pair of no power. */
  f: number;
  /** Signed radius of the mirror (2f), the lens's first face, or the surface, cm; 0 for a plane mirror. */
  radius: number;
  r1: number;
  r2: number;
  /** The single lens's focal length from the lens maker's formula, cm (0 for a mirror or surface). */
  lensFocal: number;
  power1: number;
  power2: number;
  /** Power of the lens (with its partner) or the surface, D; 0 for a mirror. */
  power: number;
  m: number;
  distance: number;
  enlargement: number;
  objectHeight: number;
  imageHeight: number;
  real: number;
  erect: number;
  /** 0 diminished, 1 same size, 2 magnified. */
  size: number;
  atInfinity: number;
  afocal: number;
  index: number;
  mediumIndex: number;
  n1: number;
  n2: number;
  incidence: number;
  refraction: number;
  reflection: number;
  critical: number;
  tir: number;
  prismAngle: number;
  prismIncidence: number;
  wavelength: number;
  prismIndex: number;
  prismR1: number;
  prismR2: number;
  emergence: number;
  deviation: number;
  minDeviation: number;
  minIncidence: number;
  atMinimum: number;
  emerges: number;
  prismBlocked: number;
  scattering: number;
  sunAltitude: number;
  airMass: number;
  blueReaching: number;
  redReaching: number;
  instrument: number;
  objective: number;
  eyepiece: number;
  tube: number;
  magnifyingPower: number;
  magnifyingNear: number;
  magnifierPower: number;
  microscopePower: number;
  telescopePower: number;
  scopeLength: number;
  farPoint: number;
  nearPoint: number;
  correctivePower: number;
  correctiveFocal: number;
};

const OUTPUTS = [
  "element", "u", "v", "f", "radius", "r1", "r2", "lensFocal", "power1", "power2", "power", "m", "distance", "enlargement",
  "objectHeight", "imageHeight", "real", "erect", "size", "atInfinity", "afocal", "index",
  "mediumIndex", "n1", "n2", "incidence", "refraction", "reflection", "critical", "tir",
  "prismAngle", "prismIncidence", "wavelength", "prismIndex", "prismR1", "prismR2", "emergence", "deviation", "minDeviation", "minIncidence",
  "atMinimum", "emerges", "prismBlocked",
  "scattering", "sunAltitude", "airMass", "blueReaching", "redReaching",
  "instrument", "objective", "eyepiece", "tube", "magnifyingPower", "magnifyingNear", "magnifierPower", "microscopePower", "telescopePower",
  "scopeLength", "farPoint", "nearPoint", "correctivePower", "correctiveFocal",
] as const satisfies readonly (keyof RayOpticsResults)[];

/** Within this of i for minimum deviation counts as having found it, degrees. */
const AT_MINIMUM = 1;

const pick = <T extends string>(value: T, order: readonly T[]): T => (order.includes(value) ? value : order[0]!);

/** The element's focal length and the image it forms, as the model sees it. */
export function rayImageOf(params: Pick<RayOpticsParams, "element" | "radius" | "index" | "partner">, u: number) {
  const element = pick(params.element, RAY_ELEMENT_ORDER);
  const kind = RAY_ELEMENTS[element].kind;
  const radius = clamp(params.radius, 5, 100);
  const n = clamp(params.index, 1.2, 2.5);
  let f = Infinity;
  let R = 0;
  let r1 = 0;
  let r2 = 0;
  let lensFocal = 0;
  let power1 = 0;
  let power2 = 0;
  let power = 0;
  let image: RayImage;
  if (kind === "mirror") {
    R = element === "concave-mirror" ? -radius : element === "convex-mirror" ? radius : Infinity;
    f = R / 2;
    image = rayMirrorImage(u, f);
  } else if (kind === "lens") {
    r1 = element === "convex-lens" ? radius : -radius;
    r2 = -r1;
    R = r1;
    lensFocal = rayLensMakerFocal(n, r1, r2);
    power1 = 100 / lensFocal;
    power2 = clamp(params.partner, -20, 20);
    power = power1 + power2;
    f = Math.abs(power) < 1e-9 ? Infinity : 100 / power;
    image = rayThinLensImage(u, f);
  } else {
    R = radius;
    f = (n * R) / (n - 1);
    power = (100 * (n - 1)) / R;
    image = raySurfaceImage(u, 1, n, R);
  }
  return { element, kind, n, f, R, r1, r2, lensFocal, power1, power2, power, image };
}

export const rayOpticsModel: SimulationModel<RayOpticsState, RayOpticsParams, RayOpticsResults> = {
  id: "rayoptics",
  defaultParams: {
    element: "concave-mirror",
    radius: 30,
    index: 1.5,
    partner: 0,
    medium: "glass",
    direction: "out",
    prismAngle: 60,
    wavelength: RAY_YELLOW,
    sunAltitude: 60,
    instrument: "telescope",
    objective: 100,
    eyepiece: 5,
    tube: 16,
    farPoint: 200,
    nearPoint: 75,
  },
  outputs: OUTPUTS,
  stateVariables: ["u", "incidence", "prismIncidence"],

  initialize() {
    return { u: -60, incidence: 30, prismIncidence: 40 };
  },

  /** Play walks the object in towards the mirror or lens, then starts again from far away. */
  advance(state, dt) {
    const u = clamp(state.u, RAY_U_RANGE[0], RAY_U_RANGE[1]) + 8 * dt;
    return { ...state, u: u > RAY_U_RANGE[1] ? RAY_U_RANGE[0] : u };
  },

  step(state, _params, sign) {
    return { ...state, u: clamp(Math.round(state.u) + sign, RAY_U_RANGE[0], RAY_U_RANGE[1]) };
  },

  derive(state, params) {
    // Images.
    const u = clamp(state.u, RAY_U_RANGE[0], RAY_U_RANGE[1]);
    const lens = rayImageOf(params, u);
    const { image } = lens;
    const converging = Number.isFinite(lens.f) && (lens.kind === "mirror" ? lens.f < 0 : lens.f > 0);
    const afocal = !Number.isFinite(lens.f) && lens.element !== "plane-mirror";
    const infinite = image.infinite && converging;
    const real = infinite || (lens.kind === "mirror" ? image.v < 0 : image.v > 0);
    const enlargement = Math.abs(image.m);
    const size = infinite ? 2 : Math.abs(enlargement - 1) < 0.005 ? 1 : enlargement > 1 ? 2 : 0;

    // A ray at a flat boundary.
    const medium = pick(params.medium, RAY_MEDIUM_ORDER);
    const direction = pick(params.direction, RAY_DIRECTION_ORDER);
    const nMedium = RAY_MEDIA[medium].index;
    const [n1, n2] = direction === "into" ? [1, nMedium] : [nMedium, 1];
    const incidence = clamp(state.incidence, RAY_INCIDENCE_RANGE[0], RAY_INCIDENCE_RANGE[1]);
    const snell = raySnell(n1, n2, incidence);

    // The prism.
    const A = clamp(params.prismAngle, 30, 75);
    const wavelength = clamp(params.wavelength, 380, 750);
    const nPrism = rayCrownIndex(clamp(params.index, 1.2, 2.5), wavelength);
    const i1 = clamp(state.prismIncidence, RAY_PRISM_I_RANGE[0], RAY_PRISM_I_RANGE[1]);
    const path = rayPrism(A, nPrism, i1);
    const minimum = rayPrismMinimum(A, nPrism);

    // The sky.
    const altitude = clamp(params.sunAltitude, 1, 90);

    // Instruments and eyes.
    const instrument = pick(params.instrument, RAY_INSTRUMENT_ORDER);
    const fo = clamp(params.objective, 0.5, 200);
    const fe = clamp(params.eyepiece, 1, 10);
    const L = clamp(params.tube, 5, 30);
    const farPoint = clamp(params.farPoint, 20, 1000);
    const nearPoint = clamp(params.nearPoint, 26, 500);
    const magnifier = rayMagnifier(fe);
    const microscope = rayMicroscope(L, fo, fe);
    const telescope = rayTelescope(fo, fe);
    const chosen = instrument === "magnifier" ? magnifier : instrument === "microscope" ? microscope : instrument === "telescope" ? telescope : null;
    const corrective = instrument === "myopia" ? rayMyopiaLens(farPoint) : instrument === "hypermetropia" ? rayHypermetropiaLens(nearPoint) : 0;

    return {
      element: RAY_ELEMENT_ORDER.indexOf(lens.element),
      u,
      v: clean(image.v),
      f: clean(finite(lens.f)),
      radius: clean(finite(lens.R)),
      r1: clean(lens.r1),
      r2: clean(lens.r2),
      lensFocal: clean(finite(lens.lensFocal)),
      power1: clean(lens.power1),
      power2: clean(lens.power2),
      power: clean(Math.abs(lens.power) < 1e-9 ? 0 : lens.power),
      m: clean(image.m),
      distance: Math.abs(clean(image.v)),
      enlargement: clean(enlargement),
      objectHeight: RAY_OBJECT_HEIGHT,
      imageHeight: clean(image.m * RAY_OBJECT_HEIGHT),
      real: real ? 1 : 0,
      erect: !infinite && image.m > 0 ? 1 : 0,
      size,
      atInfinity: infinite ? 1 : 0,
      afocal: afocal ? 1 : 0,
      index: lens.n,
      mediumIndex: nMedium,
      n1,
      n2,
      incidence,
      refraction: clean(snell.r),
      reflection: incidence,
      critical: rayCriticalAngle(nMedium),
      tir: snell.tir ? 1 : 0,
      prismAngle: A,
      prismIncidence: i1,
      wavelength,
      prismIndex: nPrism,
      prismR1: clean(path.r1),
      prismR2: clean(path.r2),
      emergence: clean(path.e),
      deviation: clean(path.deviation),
      minDeviation: clean(minimum.deviation),
      minIncidence: clean(minimum.incidence),
      atMinimum: path.emerges && !minimum.blocked && Math.abs(i1 - minimum.incidence) <= AT_MINIMUM ? 1 : 0,
      emerges: path.emerges ? 1 : 0,
      prismBlocked: minimum.blocked ? 1 : 0,
      scattering: rayRayleigh(wavelength),
      sunAltitude: altitude,
      airMass: rayAirMass(altitude),
      blueReaching: raySunlight(RAY_BLUE, altitude),
      redReaching: raySunlight(RAY_RED, altitude),
      instrument: RAY_INSTRUMENT_ORDER.indexOf(instrument),
      objective: fo,
      eyepiece: fe,
      tube: L,
      magnifyingPower: chosen ? chosen.relaxed : 0,
      magnifyingNear: chosen ? chosen.near : 0,
      magnifierPower: magnifier.near,
      microscopePower: microscope.relaxed,
      telescopePower: telescope.relaxed,
      scopeLength: instrument === "microscope" ? fo + L + fe : instrument === "telescope" ? fo + fe : 0,
      farPoint,
      nearPoint,
      correctivePower: clean(corrective),
      correctiveFocal: corrective === 0 ? 0 : 100 / corrective,
    };
  },

  getVariable(state, id) {
    return id === "u" ? state.u : id === "incidence" ? state.incidence : id === "prismIncidence" ? state.prismIncidence : undefined;
  },

  setVariable(state, id, value) {
    if (id === "u") return { ...state, u: clamp(value, RAY_U_RANGE[0], RAY_U_RANGE[1]) };
    if (id === "incidence") return { ...state, incidence: clamp(value, RAY_INCIDENCE_RANGE[0], RAY_INCIDENCE_RANGE[1]) };
    if (id === "prismIncidence") return { ...state, prismIncidence: clamp(value, RAY_PRISM_I_RANGE[0], RAY_PRISM_I_RANGE[1]) };
    return state;
  },
};
