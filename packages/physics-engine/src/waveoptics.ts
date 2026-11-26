import type { SimulationModel } from "@ise/science-engine";

/**
 * Wave optics for class 12 (NCERT chapter 10): light as a wave.
 *
 * Huygens: every point of a wavefront sends out a wavelet; the new wavefront
 * is the surface touching them all. Wavelets in glass travel at v = c/n, so a
 * wavefront crossing into glass turns, and sin i / sin r = v₁/v₂ = n.
 *
 * Young's double slit: two slits a distance d apart, lit by one source, are
 * coherent. On a screen D away, at height y, the path difference is
 * Δ = d·y/D (small angles), the phase difference φ = 2πΔ/λ, and the intensity
 * I = 4I₀cos²(φ/2): bright where Δ = nλ, dark where Δ = (n + ½)λ, every
 * fringe β = λD/d wide. Cover one slit and the screen is lit evenly (I₀);
 * light the slits from two separate lamps (incoherent) and the intensities
 * simply add, 2I₀, with no fringes. White light gives a white central fringe
 * with coloured fringes either side, washing out to an even 2I₀.
 *
 * Single slit of width a: dark where a·y/D = nλ (n ≠ 0), so the central
 * maximum is 2λD/a wide, twice the others; I = I₀(sin β/β)², β = πa·y/(λD).
 *
 * Resolving power: a telescope objective of diameter D blurs each star into
 * an Airy disc; two stars are just resolved (Rayleigh) when they are
 * θ = 1.22λ/D apart.
 *
 * Polarisation: a polaroid passes half of unpolarised light; a second one at
 * θ to the first passes cos²θ of that (Malus). Reflection from glass at
 * Brewster's angle, tan θ_B = n, is completely polarised, and the reflected
 * and refracted rays are then at right angles (Fresnel's equations).
 *
 * Thin films: light reflected from the top and the bottom of a film of index
 * n and thickness t differs in path by 2nt·cos r, plus half a wavelength for
 * each reflection off a denser medium (a phase change of π).
 *
 * Simplifications, said plainly: path differences use the small-angle
 * forms (sin θ ≈ tan θ = y/D); the double slits are taken as very narrow, so
 * there is no single-slit envelope and one slit alone lights the screen
 * evenly; the thin film's two reflected beams are taken as equally bright
 * (multiple reflections ignored); the first medium is air (n = 1); and
 * c = 3 × 10⁸ m/s.
 */

export type WaveOpticsSlits = "both" | "one" | "lamps";
export type WaveOpticsLight = "mono" | "white";
export type WaveOpticsBelow = "air" | "water" | "glass";

export const WAVE_OPTICS_SLITS_ORDER: readonly WaveOpticsSlits[] = ["both", "one", "lamps"];
export const WAVE_OPTICS_LIGHT_ORDER: readonly WaveOpticsLight[] = ["mono", "white"];
export const WAVE_OPTICS_BELOW_ORDER: readonly WaveOpticsBelow[] = ["air", "water", "glass"];
/** Refractive index of what lies under the thin film. */
export const WAVE_OPTICS_BELOW_INDEX: Record<WaveOpticsBelow, number> = { air: 1, water: 1.33, glass: 1.52 };

/** Speed of light in vacuum, m/s (NCERT's value). */
export const WAVE_OPTICS_C = 3e8;
/** White light is sampled from violet to red every nanometre. */
export const WAVE_OPTICS_WHITE: readonly number[] = Array.from({ length: 301 }, (_, i) => 400 + i);
/** Play loops the wavefront animation every this many seconds. */
export const WAVE_OPTICS_LOOP = 4;
/** Within this fraction of a wavelength the probe counts as on a bright or dark fringe. */
export const WAVE_OPTICS_ON_FRINGE = 0.05;

/** Every slider's range, in the units the state stores. */
export const WAVE_OPTICS_RANGES = {
  /** nm */
  wavelength: [400, 700],
  /** mm */
  slitSep: [0.1, 1],
  /** m */
  screenDist: [0.5, 2],
  /** mm */
  slitWidth: [0.05, 0.5],
  /** mm, up the screen from its centre */
  probe: [-20, 20],
  /** deg */
  incidence: [0, 85],
  index: [1, 2],
  /** cm, the telescope objective's diameter */
  aperture: [2, 100],
  /** µrad, between the two stars */
  separation: [0.5, 40],
  /** deg, between the two polaroids' axes */
  analyser: [0, 180],
  /** nm */
  thickness: [10, 1000],
} as const satisfies Record<string, readonly [number, number]>;

type RangeKey = keyof typeof WAVE_OPTICS_RANGES;

export type WaveOpticsParams = {
  /** Both slits open, one covered, or the two slits lit by two separate lamps. */
  slits: WaveOpticsSlits;
  light: WaveOpticsLight;
  /** What the thin film sits on. */
  below: WaveOpticsBelow;
};

export interface WaveOpticsState {
  readonly wavelength: number;
  readonly slitSep: number;
  readonly screenDist: number;
  readonly slitWidth: number;
  readonly probe: number;
  readonly incidence: number;
  readonly index: number;
  readonly aperture: number;
  readonly separation: number;
  readonly analyser: number;
  readonly thickness: number;
  /** Animation time, s. */
  readonly t: number;
}

export type WaveOpticsResults = {
  wavelength: number;
  slitSep: number;
  screenDist: number;
  slits: number;
  light: number;
  /** 1 when the two slits are coherent sources, so fringes form. */
  interferes: number;
  /** β = λD/d, mm. */
  fringeWidth: number;
  probe: number;
  /** Δ = d·y/D, nm (signed). */
  pathDiff: number;
  /** |Δ| / λ. */
  pathWaves: number;
  /** φ = 2πΔ/λ, rad. */
  phase: number;
  /** In units of one slit's I₀: 4cos²(φ/2), or I₀ for one slit, 2I₀ for two lamps. */
  intensity: number;
  /** 0 between, 1 dark, 2 bright, 3 no fringes, 4 coloured (white light). */
  fringe: number;
  slitWidth: number;
  /** 2λD/a, mm. */
  centralWidth: number;
  /** λD/a, mm. */
  firstMinimum: number;
  /** a·|y|/(λD): the path difference across the slit in wavelengths. */
  slitWaves: number;
  /** I / I(centre) for the single slit. */
  singleIntensity: number;
  incidence: number;
  index: number;
  /** deg */
  refraction: number;
  /** m/s */
  speedIn: number;
  /** nm */
  wavelengthIn: number;
  /** THz */
  frequency: number;
  /** sin i / sin r (n itself at i = 0). */
  sinRatio: number;
  aperture: number;
  separation: number;
  /** 1.22λ/D, µrad. */
  thetaMin: number;
  resolved: number;
  /** 1/θ_min, per radian. */
  resolvingPower: number;
  /** Brightness midway between the two star images, as a fraction of that at a star. */
  dip: number;
  analyser: number;
  /** Fractions of the unpolarised I₀. */
  afterFirst: number;
  transmitted: number;
  /** cos²θ: the fraction of the polarised light the analyser passes. */
  malusFraction: number;
  /** deg */
  brewsterAngle: number;
  /** Fresnel reflectances for light polarised perpendicular (s) and parallel (p) to the plane of incidence. */
  reflectS: number;
  reflectP: number;
  /** (R_s − R_p)/(R_s + R_p): 1 when the reflected light is completely polarised. */
  polarisedReflect: number;
  /** i + r, deg. */
  angleSum: number;
  atBrewster: number;
  below: number;
  thickness: number;
  /** Angle inside the film, deg. */
  filmRefraction: number;
  /** 2nt·cos r, nm. */
  filmPath: number;
  /** How many of the two reflections are off a denser medium (0, 1 or 2). */
  phaseFlips: number;
  /** (2nt·cos r + λ/2 for an odd number of flips) / λ. */
  filmOrder: number;
  /** Reflected intensity of this wavelength, 0–1 of its most. */
  filmIntensity: number;
  /** 0 between, 1 dark, 2 bright. */
  filmFringe: number;
  t: number;
};

const OUTPUTS = [
  "wavelength", "slitSep", "screenDist", "slits", "light", "interferes", "fringeWidth", "probe", "pathDiff", "pathWaves", "phase", "intensity", "fringe",
  "slitWidth", "centralWidth", "firstMinimum", "slitWaves", "singleIntensity",
  "incidence", "index", "refraction", "speedIn", "wavelengthIn", "frequency", "sinRatio",
  "aperture", "separation", "thetaMin", "resolved", "resolvingPower", "dip",
  "analyser", "afterFirst", "transmitted", "malusFraction",
  "brewsterAngle", "reflectS", "reflectP", "polarisedReflect", "angleSum", "atBrewster",
  "below", "thickness", "filmRefraction", "filmPath", "phaseFlips", "filmOrder", "filmIntensity", "filmFringe",
  "t",
] as const satisfies readonly (keyof WaveOpticsResults)[];

const DEG = Math.PI / 180;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const inRange = (key: RangeKey, v: number) => clamp(v, WAVE_OPTICS_RANGES[key][0], WAVE_OPTICS_RANGES[key][1]);
const noNegZero = (v: number) => v || 0;

/** Bessel function J₁ (Numerical Recipes' rational approximations, good to about 10⁻⁸). */
export function waveOpticsBesselJ1(x: number): number {
  const ax = Math.abs(x);
  if (ax < 8) {
    const y = x * x;
    const a = x * (72362614232.0 + y * (-7895059235.0 + y * (242396853.1 + y * (-2972611.439 + y * (15704.4826 + y * -30.16036606)))));
    const b = 144725228442.0 + y * (2300535178.0 + y * (18583304.74 + y * (99447.43394 + y * (376.9991397 + y))));
    return a / b;
  }
  const z = 8 / ax;
  const y = z * z;
  const xx = ax - 2.356194491;
  const a = 1 + y * (0.183105e-2 + y * (-0.3516396496e-4 + y * (0.2457520174e-5 + y * -0.240337019e-6)));
  const b = 0.04687499995 + y * (-0.2002690873e-3 + y * (0.8449199096e-5 + y * (-0.88228987e-6 + y * 0.105787412e-6)));
  const ans = Math.sqrt(0.636619772 / ax) * (Math.cos(xx) * a - z * Math.sin(xx) * b);
  return x < 0 ? -ans : ans;
}

/** The Airy pattern (2J₁(x)/x)², 1 at the centre, first dark ring at x = 3.83. */
export function waveOpticsAiry(x: number): number {
  if (Math.abs(x) < 1e-6) return 1;
  const v = (2 * waveOpticsBesselJ1(x)) / x;
  return v * v;
}

/** (sin u / u)², 1 at u = 0. */
export function waveOpticsSinc2(u: number): number {
  if (Math.abs(u) < 1e-9) return 1;
  const v = Math.sin(u) / u;
  return v * v;
}

/** β = λD/d in mm, for λ in nm, D in m and d in mm. */
export function waveOpticsFringeWidth(wavelength: number, screenDist: number, slitSep: number): number {
  return (wavelength * screenDist) / slitSep / 1000;
}

/** Δ = d·y/D in nm, for d and y in mm and D in m. */
export function waveOpticsPathDiff(slitSep: number, probe: number, screenDist: number): number {
  return noNegZero(((slitSep * probe) / screenDist) * 1000);
}

/** Double-slit intensity in units of I₀, at path difference Δ (nm) for wavelength λ (nm). */
export function waveOpticsTwoSlit(pathDiff: number, wavelength: number): number {
  const half = (Math.PI * pathDiff) / wavelength;
  return 4 * Math.cos(half) ** 2;
}

/** White light's double-slit intensity, averaged over the visible spectrum, units of I₀. */
export function waveOpticsWhiteTwoSlit(pathDiff: number): number {
  let sum = 0;
  for (const l of WAVE_OPTICS_WHITE) sum += waveOpticsTwoSlit(pathDiff, l);
  return sum / WAVE_OPTICS_WHITE.length;
}

/** Single-slit intensity relative to the centre, a in mm, y in mm, λ in nm, D in m. */
export function waveOpticsSingleSlit(slitWidth: number, probe: number, wavelength: number, screenDist: number): number {
  return waveOpticsSinc2((Math.PI * slitWidth * probe * 1000) / (wavelength * screenDist));
}

/** The thin film's numbers, for film index n on a backing of index `nBelow`, in air above. */
export function waveOpticsFilm(n: number, thickness: number, incidenceDeg: number, nBelow: number, wavelength: number) {
  const sinR = Math.sin(incidenceDeg * DEG) / n;
  const cosR = Math.sqrt(Math.max(0, 1 - sinR * sinR));
  const path = 2 * n * thickness * cosR;
  // A reflection off a denser medium shifts the phase by π, as if half a wavelength more path.
  const flips = (n > 1 ? 1 : 0) + (nBelow > n ? 1 : 0);
  const order = (path + (flips % 2 === 1 ? wavelength / 2 : 0)) / wavelength;
  const intensity = Math.cos(Math.PI * order) ** 2;
  return { refraction: Math.asin(clamp(sinR, -1, 1)) / DEG, path, flips, order, intensity };
}

function fresnel(incidenceDeg: number, n: number) {
  const ci = Math.cos(incidenceDeg * DEG);
  const si = Math.sin(incidenceDeg * DEG);
  const ct = Math.sqrt(Math.max(0, 1 - (si / n) ** 2));
  const rs = (ci - n * ct) / (ci + n * ct);
  const rp = (n * ci - ct) / (n * ci + ct);
  return { Rs: rs * rs, Rp: rp * rp };
}

const slitsOf = (p: WaveOpticsParams) => (WAVE_OPTICS_SLITS_ORDER.includes(p.slits) ? p.slits : "both");
const lightOf = (p: WaveOpticsParams) => (WAVE_OPTICS_LIGHT_ORDER.includes(p.light) ? p.light : "mono");
const belowOf = (p: WaveOpticsParams) => (WAVE_OPTICS_BELOW_ORDER.includes(p.below) ? p.below : "air");

export const waveOpticsModel: SimulationModel<WaveOpticsState, WaveOpticsParams, WaveOpticsResults> = {
  id: "waveoptics",
  defaultParams: { slits: "both", light: "mono", below: "air" },
  outputs: OUTPUTS,
  stateVariables: ["wavelength", "slitSep", "screenDist", "slitWidth", "probe", "incidence", "index", "aperture", "separation", "analyser", "thickness", "t"],

  initialize() {
    return {
      wavelength: 600,
      slitSep: 0.5,
      screenDist: 1,
      slitWidth: 0.1,
      probe: 0,
      incidence: 30,
      index: 1.5,
      aperture: 10,
      separation: 10,
      analyser: 0,
      thickness: 300,
      t: 0,
    };
  },

  /** Play runs the wavefronts on; the clock loops so the animation never ends. */
  advance(state, dt) {
    const t = Math.max(0, state.t) + dt;
    return { ...state, t: t >= WAVE_OPTICS_LOOP ? t - WAVE_OPTICS_LOOP * Math.floor(t / WAVE_OPTICS_LOOP) : t };
  },

  /** A step moves the probe half a fringe: bright, dark, bright. */
  step(state, _params, sign) {
    const half = waveOpticsFringeWidth(inRange("wavelength", state.wavelength), inRange("screenDist", state.screenDist), inRange("slitSep", state.slitSep)) / 2;
    return { ...state, probe: inRange("probe", noNegZero((Math.round(state.probe / half) + sign) * half)) };
  },

  derive(state, params) {
    const lambda = inRange("wavelength", state.wavelength);
    const d = inRange("slitSep", state.slitSep);
    const D = inRange("screenDist", state.screenDist);
    const a = inRange("slitWidth", state.slitWidth);
    const y = inRange("probe", state.probe);
    const slits = slitsOf(params);
    const light = lightOf(params);

    // Young's double slit.
    const pathDiff = waveOpticsPathDiff(d, y, D);
    const pathWaves = Math.abs(pathDiff) / lambda;
    const coherent = slits === "both";
    const intensity = slits === "one" ? 1 : slits === "lamps" ? 2 : light === "white" ? waveOpticsWhiteTwoSlit(pathDiff) : waveOpticsTwoSlit(pathDiff, lambda);
    const offBright = Math.abs(pathWaves - Math.round(pathWaves));
    const offDark = Math.abs(pathWaves - (Math.floor(pathWaves) + 0.5));
    const fringe = !coherent ? 3 : light === "white" ? 4 : offBright <= WAVE_OPTICS_ON_FRINGE ? 2 : offDark <= WAVE_OPTICS_ON_FRINGE ? 1 : 0;

    // Single slit.
    const firstMinimum = (lambda * D) / a / 1000;

    // Huygens: refraction into a medium of index n.
    const i = inRange("incidence", state.incidence);
    const n = inRange("index", state.index);
    const sinR = Math.sin(i * DEG) / n;
    const r = Math.asin(clamp(sinR, -1, 1)) / DEG;

    // Resolving power.
    const aperture = inRange("aperture", state.aperture);
    const separation = inRange("separation", state.separation);
    const thetaMin = (1.22 * lambda * 0.1) / aperture;
    // x = π·D·θ/λ with D in cm, θ in µrad and λ in nm.
    const airyAt = (theta: number) => waveOpticsAiry((10 * Math.PI * aperture * theta) / lambda);
    const dip = (2 * airyAt(separation / 2)) / (1 + airyAt(separation));

    // Polaroids.
    const analyser = inRange("analyser", state.analyser);
    const malus = Math.cos(analyser * DEG) ** 2;

    // Brewster.
    const brewster = Math.atan(n) / DEG;
    const { Rs, Rp } = fresnel(i, n);
    const polarisedReflect = Rs + Rp > 1e-12 ? (Rs - Rp) / (Rs + Rp) : 0;

    // Thin film.
    const belowId = belowOf(params);
    const thickness = inRange("thickness", state.thickness);
    const film = waveOpticsFilm(n, thickness, i, WAVE_OPTICS_BELOW_INDEX[belowId], lambda);
    const filmOff = film.order - Math.floor(film.order);

    return {
      wavelength: lambda,
      slitSep: d,
      screenDist: D,
      slits: WAVE_OPTICS_SLITS_ORDER.indexOf(slits),
      light: WAVE_OPTICS_LIGHT_ORDER.indexOf(light),
      interferes: coherent ? 1 : 0,
      fringeWidth: waveOpticsFringeWidth(lambda, D, d),
      probe: noNegZero(y),
      pathDiff,
      pathWaves,
      phase: noNegZero((2 * Math.PI * pathDiff) / lambda),
      intensity: noNegZero(intensity),
      fringe,
      slitWidth: a,
      centralWidth: 2 * firstMinimum,
      firstMinimum,
      slitWaves: (a * Math.abs(y) * 1000) / (lambda * D),
      singleIntensity: noNegZero(waveOpticsSingleSlit(a, y, lambda, D)),
      incidence: i,
      index: n,
      refraction: noNegZero(r),
      speedIn: WAVE_OPTICS_C / n,
      wavelengthIn: lambda / n,
      frequency: 3e5 / lambda,
      sinRatio: i > 1e-9 ? Math.sin(i * DEG) / Math.sin(r * DEG) : n,
      aperture,
      separation,
      thetaMin,
      resolved: separation >= thetaMin - 1e-9 ? 1 : 0,
      resolvingPower: 1e6 / thetaMin,
      dip: noNegZero(dip),
      analyser,
      afterFirst: 0.5,
      transmitted: noNegZero(0.5 * malus),
      malusFraction: noNegZero(malus),
      brewsterAngle: brewster,
      reflectS: Rs,
      reflectP: noNegZero(Rp),
      polarisedReflect: noNegZero(polarisedReflect),
      angleSum: i + r,
      atBrewster: n > 1 && Math.abs(i - brewster) <= 0.5 ? 1 : 0,
      below: WAVE_OPTICS_BELOW_ORDER.indexOf(belowId),
      thickness,
      filmRefraction: noNegZero(film.refraction),
      filmPath: film.path,
      phaseFlips: film.flips,
      filmOrder: film.order,
      filmIntensity: noNegZero(film.intensity),
      filmFringe: filmOff <= WAVE_OPTICS_ON_FRINGE || filmOff >= 1 - WAVE_OPTICS_ON_FRINGE ? 2 : Math.abs(filmOff - 0.5) <= WAVE_OPTICS_ON_FRINGE ? 1 : 0,
      t: Math.max(0, state.t),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof WaveOpticsState] : undefined;
  },

  setVariable(state, id, value) {
    if (id === "t") return { ...state, t: Math.max(0, Number.isFinite(value) ? value : 0) };
    if (id in WAVE_OPTICS_RANGES) return { ...state, [id]: inRange(id as RangeKey, value) };
    return state;
  },
};
