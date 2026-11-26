import type { SimulationModel } from "@ise/science-engine";

/**
 * Materials, mixtures and particles, for classes 6 to 9.
 *
 * Seven small benches share one model, each read by its own mode:
 *
 *   materials  an object and its properties: lustre, hardness, how much
 *              light gets through, and whether it floats (density below
 *              1 g/cm³, the density of water).
 *   dissolve   a solute stirred into water. The most that dissolves is
 *              solubility × water ÷ 100; past that the solution is
 *              saturated and the rest lies at the bottom. Solubilities are
 *              NCERT's class 9 table (salt, potassium nitrate) and the CRC
 *              values for sugar, at 10, 20, 40, 60 and 80 °C, joined by
 *              straight lines in between.
 *   separate   a mixture and a method: does the method suit it?
 *   rust       NCERT's three test tubes (dry air, boiled water under oil,
 *              ordinary water and air) and four coats. Rust forms only
 *              with both air and water on bare iron. How fast it spreads
 *              is a picture, 1 − e^(−days/8), not a measurement.
 *   particles  water from −20 to 150 °C at one atmosphere. The particles'
 *              average speed is kinetic theory's √(8RT/πM); in a gas
 *              their spacing comes from the ideal gas, (kT/p)^⅓, in
 *              widths of a water molecule (0.28 nm).
 *   diffuse    ink in water: how much faster it spreads than at 20 °C,
 *              by Stokes–Einstein, D ∝ T/η, with the viscosity of water
 *              from the Vogel equation. The spreading picture's time scale
 *              is made up; the ratio is real.
 *   evaporate  water in an open dish at the air's temperature. The rate
 *              is the engineering estimate (25 + 19v)·A·(xₛ − x) kg/h, with
 *              xₛ and x the moisture in saturated and in actual air; the
 *              coolest a wet surface can get is the wet-bulb temperature
 *              (Stull's 2011 fit).
 */

// ── Materials ────────────────────────────────────────────────────────────────

export type SchoolObjectId =
  | "nail"
  | "coin"
  | "spoon"
  | "wood"
  | "cork"
  | "sponge"
  | "eraser"
  | "candle"
  | "marble"
  | "frosted"
  | "butter-paper"
  | "pebble";

export interface SchoolObject {
  label: string;
  material: string;
  /** Shiny like a metal. */
  lustrous: boolean;
  /** Hard to press in or scratch with a fingernail. */
  hard: boolean;
  /** 0 opaque, 1 translucent, 2 transparent. */
  see: 0 | 1 | 2;
  /** Density of the object as a whole (air in it included), g/cm³. */
  density: number;
}

export const SCHOOL_OBJECT_ORDER: readonly SchoolObjectId[] = [
  "nail", "coin", "spoon", "wood", "cork", "sponge", "eraser", "candle", "marble", "frosted", "butter-paper", "pebble",
];

export const SCHOOL_OBJECTS: Record<SchoolObjectId, SchoolObject> = {
  nail: { label: "Iron nail", material: "iron", lustrous: true, hard: true, see: 0, density: 7.9 },
  coin: { label: "Copper coin", material: "copper", lustrous: true, hard: true, see: 0, density: 8.9 },
  spoon: { label: "Steel spoon", material: "steel", lustrous: true, hard: true, see: 0, density: 7.9 },
  wood: { label: "Wooden block", material: "wood", lustrous: false, hard: true, see: 0, density: 0.6 },
  cork: { label: "Cork", material: "cork", lustrous: false, hard: false, see: 0, density: 0.24 },
  sponge: { label: "Dry sponge", material: "sponge", lustrous: false, hard: false, see: 0, density: 0.05 },
  eraser: { label: "Rubber eraser", material: "rubber", lustrous: false, hard: false, see: 0, density: 1.2 },
  candle: { label: "Candle", material: "wax", lustrous: false, hard: false, see: 0, density: 0.9 },
  marble: { label: "Glass marble", material: "glass", lustrous: false, hard: true, see: 2, density: 2.5 },
  frosted: { label: "Frosted glass", material: "glass", lustrous: false, hard: true, see: 1, density: 2.5 },
  "butter-paper": { label: "Butter paper", material: "paper", lustrous: false, hard: false, see: 1, density: 0.8 },
  pebble: { label: "Pebble", material: "stone", lustrous: false, hard: true, see: 0, density: 2.6 },
};

// ── Dissolving ───────────────────────────────────────────────────────────────

export type SchoolSoluteId = "salt" | "sugar" | "kno3" | "sand" | "chalk";
export const SCHOOL_SOLUTE_ORDER: readonly SchoolSoluteId[] = ["salt", "sugar", "kno3", "sand", "chalk"];

/** The temperatures of NCERT's class 9 solubility table, °C (283, 293, 313, 333 and 353 K). */
export const SCHOOL_SOLUBILITY_TEMPS: readonly number[] = [10, 20, 40, 60, 80];

export const SCHOOL_SOLUTES: Record<SchoolSoluteId, { label: string; formula: string; perHundred: readonly number[] }> = {
  // NCERT class 9, chapter 2.
  salt: { label: "Salt", formula: "NaCl", perHundred: [36, 36, 36, 37, 37] },
  // CRC Handbook, rounded to whole grams.
  sugar: { label: "Sugar", formula: "C₁₂H₂₂O₁₁", perHundred: [190, 204, 238, 287, 362] },
  // NCERT class 9, chapter 2.
  kno3: { label: "Potassium nitrate", formula: "KNO₃", perHundred: [21, 32, 62, 106, 167] },
  sand: { label: "Sand", formula: "SiO₂", perHundred: [0, 0, 0, 0, 0] },
  // Chalk dissolves about a thousandth of a gram per 100 g: nothing you could see.
  chalk: { label: "Chalk powder", formula: "CaCO₃", perHundred: [0, 0, 0, 0, 0] },
};

/** Grams that dissolve in 100 g of water at `temp` °C: the table, joined by straight lines. */
export function schoolSolubility(solute: SchoolSoluteId, temp: number): number {
  const table = (SCHOOL_SOLUTES[solute] ?? SCHOOL_SOLUTES.salt).perHundred;
  const ts = SCHOOL_SOLUBILITY_TEMPS;
  const t = clamp(temp, ts[0]!, ts[ts.length - 1]!);
  for (let i = 1; i < ts.length; i++) {
    if (t <= ts[i]!) {
      const f = (t - ts[i - 1]!) / (ts[i]! - ts[i - 1]!);
      return table[i - 1]! + f * (table[i]! - table[i - 1]!);
    }
  }
  return table[table.length - 1]!;
}

// ── Separating ───────────────────────────────────────────────────────────────

export type SchoolMethodId = "handpick" | "sieve" | "winnow" | "decant" | "filter" | "evaporate" | "magnet";
export const SCHOOL_METHOD_ORDER: readonly SchoolMethodId[] = ["handpick", "sieve", "winnow", "decant", "filter", "evaporate", "magnet"];
export const SCHOOL_METHODS: Record<SchoolMethodId, string> = {
  handpick: "Handpicking",
  sieve: "Sieving",
  winnow: "Winnowing",
  decant: "Settling and decanting",
  filter: "Filtering",
  evaporate: "Evaporating",
  magnet: "A magnet",
};

export type SchoolMixtureId = "stones-rice" | "husk-wheat" | "bran-flour" | "pebbles-sand" | "sand-water" | "salt-water" | "iron-sand";
export const SCHOOL_MIXTURE_ORDER: readonly SchoolMixtureId[] = ["stones-rice", "husk-wheat", "bran-flour", "pebbles-sand", "sand-water", "salt-water", "iron-sand"];

export interface SchoolMixture {
  label: string;
  /** Has a liquid in it. */
  wet: boolean;
  /** The methods that suit it; the first is the usual one. */
  suits: readonly SchoolMethodId[];
  /** Why each suitable method works, in a few words. */
  how: Partial<Record<SchoolMethodId, string>>;
  /** Why some other methods do not, where the general reason is not enough. */
  whyNot: Partial<Record<SchoolMethodId, string>>;
}

export const SCHOOL_MIXTURES: Record<SchoolMixtureId, SchoolMixture> = {
  "stones-rice": {
    label: "Stones in rice",
    wet: false,
    suits: ["handpick"],
    how: { handpick: "The stones are big and easy to see: pick them out." },
    whyNot: {
      sieve: "Stones and grains are about the same size.",
      winnow: "Stones and rice are both too heavy to blow away.",
    },
  },
  "husk-wheat": {
    label: "Husk with wheat",
    wet: false,
    suits: ["winnow"],
    how: { winnow: "The wind carries the light husk away; grain falls." },
    whyNot: {
      handpick: "Far too many light bits of husk to pick.",
      sieve: "Husk is light, not small: let the wind take it.",
    },
  },
  "bran-flour": {
    label: "Bran in flour",
    wet: false,
    suits: ["sieve"],
    how: { sieve: "Fine flour falls through; bran stays in the sieve." },
    whyNot: {
      handpick: "Bran flakes are far too small and too many.",
      winnow: "The wind would blow the fine flour away too.",
    },
  },
  "pebbles-sand": {
    label: "Pebbles in sand",
    wet: false,
    suits: ["sieve"],
    how: { sieve: "Sand falls through the holes; pebbles stay on top." },
    whyNot: {
      handpick: "Fine for a few, but a sieve does a heap at once.",
      winnow: "Sand and pebbles are both too heavy for the wind.",
    },
  },
  "sand-water": {
    label: "Sand in water",
    wet: true,
    suits: ["decant", "filter"],
    how: {
      decant: "Sand sinks to the bottom; pour the water off.",
      filter: "Water runs through the paper; sand stays on it.",
    },
    whyNot: { evaporate: "You get the sand, but all the water is lost." },
  },
  "salt-water": {
    label: "Salt in water",
    wet: true,
    suits: ["evaporate"],
    how: { evaporate: "The water dries up and the salt is left behind." },
    whyNot: {
      decant: "Dissolved salt never settles to the bottom.",
      filter: "Dissolved salt goes straight through the paper.",
    },
  },
  "iron-sand": {
    label: "Iron filings in sand",
    wet: false,
    suits: ["magnet"],
    how: { magnet: "The magnet pulls the iron out; sand stays." },
    whyNot: {
      handpick: "The filings are far too tiny to pick out.",
      sieve: "Filings and sand grains are about the same size.",
      winnow: "Iron and sand are both too heavy for the wind.",
    },
  },
};

/** One short sentence on why `method` does or does not suit `mixture`. */
export function separationReason(mixture: SchoolMixtureId, method: SchoolMethodId): string {
  const m = SCHOOL_MIXTURES[mixture] ?? SCHOOL_MIXTURES["stones-rice"];
  const how = m.how[method];
  if (how) return how;
  const special = m.whyNot[method];
  if (special) return special;
  if (method === "magnet") return "Nothing here is pulled by a magnet.";
  if (!m.wet && (method === "decant" || method === "filter" || method === "evaporate")) return "There is no liquid here to pour or dry off.";
  if (m.wet && method === "handpick") return "Far too small to pick out by hand.";
  if (m.wet && method === "sieve") return "It all runs straight through the holes.";
  if (m.wet && method === "winnow") return "Wind cannot blow a liquid apart.";
  return "That does not split this mixture.";
}

// ── Rusting ──────────────────────────────────────────────────────────────────

export type SchoolTubeId = "dry" | "boiled" | "open";
export const SCHOOL_TUBE_ORDER: readonly SchoolTubeId[] = ["dry", "boiled", "open"];
export const SCHOOL_TUBES: Record<SchoolTubeId, { label: string; air: boolean; water: boolean }> = {
  dry: { label: "Dry air (calcium chloride)", air: true, water: false },
  boiled: { label: "Boiled water under oil", air: false, water: true },
  open: { label: "Water and air", air: true, water: true },
};

export type SchoolCoatingId = "none" | "paint" | "grease" | "zinc";
export const SCHOOL_COATING_ORDER: readonly SchoolCoatingId[] = ["none", "paint", "grease", "zinc"];
export const SCHOOL_COATINGS: Record<SchoolCoatingId, string> = {
  none: "Bare iron",
  paint: "Painted",
  grease: "Oiled or greased",
  zinc: "Galvanised (zinc coat)",
};

/** The picture's pace: rust cover after `days`, in per cent of the surface. */
export function schoolRustCover(days: number): number {
  return 100 * (1 - Math.exp(-Math.max(0, days) / 8));
}

// ── Particles, diffusion and evaporation ─────────────────────────────────────

const R = 8.314;
const K_B = 1.380649e-23;
const ATM = 101325;
/** Molar mass of water, kg/mol, and the width of one molecule, m. */
const M_WATER = 0.018;
export const SCHOOL_WATER_WIDTH = 0.28e-9;

/** Average speed of water molecules at `temp` °C, m/s: √(8RT/πM). */
export function schoolParticleSpeed(temp: number): number {
  return Math.sqrt((8 * R * (temp + 273.15)) / (Math.PI * M_WATER));
}

/** Viscosity of liquid water at `temp` °C, Pa s (Vogel: A·10^(B/(T − C))). */
export function schoolWaterViscosity(temp: number): number {
  return 2.414e-5 * 10 ** (247.8 / (temp + 273.15 - 140));
}

/** How many times faster ink spreads in water at `temp` °C than at 20 °C: D ∝ T/η. */
export function schoolDiffusionRatio(temp: number): number {
  const d = (t: number) => (t + 273.15) / schoolWaterViscosity(t);
  return d(temp) / d(20);
}

/** Saturation vapour pressure of water at `temp` °C, Pa (Magnus form). */
export function schoolVapourPressure(temp: number): number {
  return 610.94 * Math.exp((17.625 * temp) / (temp + 243.04));
}

/** kg of water vapour per kg of dry air, for a vapour pressure p. */
const moisture = (p: number) => (0.622 * p) / (ATM - p);

/** Water evaporating from an open dish, g per hour: (25 + 19v)·A·(xₛ − x). Area in cm², wind in m/s, humidity in %. */
export function schoolEvaporationRate(area: number, temp: number, wind: number, humidity: number): number {
  const ps = schoolVapourPressure(temp);
  const deficit = moisture(ps) - moisture((humidity / 100) * ps);
  return Math.max(0, (25 + 19 * wind) * (area / 1e4) * deficit * 1000);
}

/** The coolest a wet surface can get, °C: the wet-bulb temperature (Stull 2011; RH 5–99 %, −20 to 50 °C). */
export function schoolWetBulb(temp: number, humidity: number): number {
  const rh = humidity;
  return (
    temp * Math.atan(0.151977 * Math.sqrt(rh + 8.313659)) +
    Math.atan(temp + rh) -
    Math.atan(rh - 1.676331) +
    0.00391838 * rh ** 1.5 * Math.atan(0.023101 * rh) -
    4.686035
  );
}

// ── The model ────────────────────────────────────────────────────────────────

export type SchoolMatterParams = {
  object: SchoolObjectId;
  solute: SchoolSoluteId;
  mixture: SchoolMixtureId;
  method: SchoolMethodId;
  tube: SchoolTubeId;
  coating: SchoolCoatingId;
};

export interface SchoolMatterState {
  /** Grams of solute stirred in, and grams of water. */
  readonly added: number;
  readonly water: number;
  /** Temperature of the water being stirred, °C. */
  readonly waterTemp: number;
  /** Days the nails have stood. */
  readonly days: number;
  /** Temperature of the water whose particles are shown, °C. */
  readonly temp: number;
  /** Temperature of the water the ink is dropped into, °C, and seconds since. */
  readonly inkTemp: number;
  readonly clock: number;
  /** The dish: surface area cm², air temperature °C, wind m/s, humidity %. */
  readonly area: number;
  readonly airTemp: number;
  readonly wind: number;
  readonly humidity: number;
}

export type SchoolMatterResults = {
  object: number;
  lustrous: number;
  hard: number;
  see: number;
  density: number;
  floats: number;
  solute: number;
  soluble: number;
  solubility: number;
  added: number;
  water: number;
  waterTemp: number;
  canDissolve: number;
  dissolved: number;
  undissolved: number;
  saturated: number;
  /** Mass of solute as a percentage of the solution's mass. */
  strength: number;
  mixture: number;
  method: number;
  suits: number;
  best: number;
  tube: number;
  coating: number;
  air: number;
  wet: number;
  rusts: number;
  days: number;
  rustCover: number;
  temp: number;
  /** 0 solid, 1 liquid, 2 gas. */
  phase: number;
  speed: number;
  /** Centre-to-centre distance between neighbouring particles, in particle widths. */
  spacing: number;
  inkTemp: number;
  diffusion: number;
  clock: number;
  /** How far the ink cloud has spread, 0 to 1 (a picture). */
  inkSpread: number;
  area: number;
  airTemp: number;
  wind: number;
  humidity: number;
  /** Grams per hour. */
  evapRate: number;
  /** Hours for 100 g of water to evaporate, capped at 9999. */
  dryTime: number;
  wetBulb: number;
  coolingBy: number;
};

const OUTPUTS = [
  "object", "lustrous", "hard", "see", "density", "floats",
  "solute", "soluble", "solubility", "added", "water", "waterTemp", "canDissolve", "dissolved", "undissolved", "saturated", "strength",
  "mixture", "method", "suits", "best",
  "tube", "coating", "air", "wet", "rusts", "days", "rustCover",
  "temp", "phase", "speed", "spacing",
  "inkTemp", "diffusion", "clock", "inkSpread",
  "area", "airTemp", "wind", "humidity", "evapRate", "dryTime", "wetBulb", "coolingBy",
] as const satisfies readonly (keyof SchoolMatterResults)[];

/** The range each state variable is kept in. */
export const SCHOOL_MATTER_LIMITS: Record<keyof SchoolMatterState, readonly [number, number]> = {
  added: [0, 400],
  water: [50, 200],
  waterTemp: [10, 80],
  days: [0, 30],
  temp: [-20, 150],
  inkTemp: [5, 90],
  clock: [0, 60],
  area: [10, 1000],
  airTemp: [10, 45],
  wind: [0, 5],
  humidity: [10, 95],
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
}

const limit = (key: keyof SchoolMatterState, v: number) => clamp(v, SCHOOL_MATTER_LIMITS[key][0], SCHOOL_MATTER_LIMITS[key][1]);
const index = <T>(order: readonly T[], value: T) => Math.max(0, order.indexOf(value));

export const schoolMatterModel: SimulationModel<SchoolMatterState, SchoolMatterParams, SchoolMatterResults> = {
  id: "schoolmatter",
  defaultParams: { object: "nail", solute: "salt", mixture: "sand-water", method: "filter", tube: "open", coating: "none" },
  outputs: OUTPUTS,
  stateVariables: Object.keys(SCHOOL_MATTER_LIMITS),

  initialize() {
    return { added: 0, water: 100, waterTemp: 20, days: 0, temp: 20, inkTemp: 20, clock: 0, area: 100, airTemp: 25, wind: 0, humidity: 60 };
  },

  /** Play lets time pass: two days a second for the nails, and a second a second for the ink. */
  advance(state, dt) {
    return { ...state, days: limit("days", state.days + 2 * dt), clock: limit("clock", state.clock + dt) };
  },

  /** A step stirs in, or takes out, one more gram. */
  step(state, _params, sign) {
    return { ...state, added: limit("added", Math.round(state.added) + sign) };
  },

  derive(state, params) {
    const object = SCHOOL_OBJECTS[params.object] ?? SCHOOL_OBJECTS.nail;
    const soluteId = params.solute in SCHOOL_SOLUTES ? params.solute : "salt";
    const mixtureId = params.mixture in SCHOOL_MIXTURES ? params.mixture : "sand-water";
    const mixture = SCHOOL_MIXTURES[mixtureId];
    const methodId = params.method in SCHOOL_METHODS ? params.method : "filter";
    const tube = SCHOOL_TUBES[params.tube] ?? SCHOOL_TUBES.open;
    const coatingId = params.coating in SCHOOL_COATINGS ? params.coating : "none";

    const added = limit("added", state.added);
    const water = limit("water", state.water);
    const waterTemp = limit("waterTemp", state.waterTemp);
    const solubility = schoolSolubility(soluteId, waterTemp);
    const canDissolve = (solubility * water) / 100;
    const dissolved = Math.min(added, canDissolve);
    const soluble = solubility >= 1;

    const rusts = tube.air && tube.water && coatingId === "none";
    const days = limit("days", state.days);

    const temp = limit("temp", state.temp);
    const phase = temp < 0 ? 0 : temp < 100 ? 1 : 2;
    const gasSpacing = Math.cbrt((K_B * (temp + 273.15)) / ATM) / SCHOOL_WATER_WIDTH;

    const inkTemp = limit("inkTemp", state.inkTemp);
    const clock = limit("clock", state.clock);
    const diffusion = schoolDiffusionRatio(inkTemp);

    const area = limit("area", state.area);
    const airTemp = limit("airTemp", state.airTemp);
    const wind = limit("wind", state.wind);
    const humidity = limit("humidity", state.humidity);
    const evapRate = schoolEvaporationRate(area, airTemp, wind, humidity);
    const wetBulb = schoolWetBulb(airTemp, humidity);

    return {
      object: index(SCHOOL_OBJECT_ORDER, params.object),
      lustrous: object.lustrous ? 1 : 0,
      hard: object.hard ? 1 : 0,
      see: object.see,
      density: object.density,
      floats: object.density < 1 ? 1 : 0,
      solute: index(SCHOOL_SOLUTE_ORDER, soluteId),
      soluble: soluble ? 1 : 0,
      solubility,
      added,
      water,
      waterTemp,
      canDissolve,
      dissolved,
      undissolved: added - dissolved || 0,
      saturated: soluble && added >= canDissolve - 1e-9 ? 1 : 0,
      strength: (100 * dissolved) / (dissolved + water) || 0,
      mixture: index(SCHOOL_MIXTURE_ORDER, mixtureId),
      method: index(SCHOOL_METHOD_ORDER, methodId),
      suits: mixture.suits.includes(methodId) ? 1 : 0,
      best: index(SCHOOL_METHOD_ORDER, mixture.suits[0]!),
      tube: index(SCHOOL_TUBE_ORDER, params.tube),
      coating: index(SCHOOL_COATING_ORDER, coatingId),
      air: tube.air ? 1 : 0,
      wet: tube.water ? 1 : 0,
      rusts: rusts ? 1 : 0,
      days,
      rustCover: rusts ? schoolRustCover(days) : 0,
      temp,
      phase,
      speed: schoolParticleSpeed(temp),
      spacing: phase === 2 ? gasSpacing : 1,
      inkTemp,
      diffusion,
      clock,
      inkSpread: 1 - Math.exp((-diffusion * clock) / 30),
      area,
      airTemp,
      wind,
      humidity,
      evapRate,
      dryTime: evapRate > 100 / 9999 ? 100 / evapRate : 9999,
      wetBulb,
      coolingBy: airTemp - wetBulb,
    };
  },

  getVariable(state, id) {
    return id in SCHOOL_MATTER_LIMITS ? state[id as keyof SchoolMatterState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in SCHOOL_MATTER_LIMITS)) return state;
    const key = id as keyof SchoolMatterState;
    return { ...state, [key]: limit(key, value) };
  },
};
