import type { SimulationModel } from "@ise/science-engine";

/**
 * Synthetic fibres and plastics, for class 8 (NCERT science).
 *
 * Chains. A polymer is a long chain of small repeating units ("poly" many,
 * "mer" part), like paper clips joined end to end. Six polymers as data —
 * cellulose (cotton, a natural polymer of glucose units), polythene, PVC,
 * acrylic, nylon 6,6 and polyester (PET) — each with its repeat unit's atoms.
 * The chain's atoms are the unit's atoms times the number of units.
 *
 * Fibres. NCERT's thread test (Activity 3.1): threads of cotton, wool, silk,
 * rayon, nylon, polyester and acrylic of the same thickness hang from a stand
 * and weights are added until each snaps. The breaking loads are illustrative
 * (they follow the real order of strength: wool weakest, nylon strongest), not
 * measured values. Water uptake, drying and whether a fibre melts on heating
 * are the book's qualitative facts.
 *
 * Plastics. Thermoplastics (polythene, PVC, PET) are separate chains that slide
 * past each other when warm, so they soften and can be reshaped (and recycled).
 * Thermosetting plastics (bakelite, melamine) are cross-linked into one network
 * and do not soften. The softening temperatures are approximate: real values
 * depend on the grade of plastic.
 *
 * Waste. NCERT's table of the approximate time each kind of waste takes to
 * break down, word for word ("1 to 2 weeks", "several years"). Biodegradable
 * waste rots here at a steady rate and is gone at the middle of the book's
 * range — an illustrative rule. Non-biodegradable waste is not broken down by
 * bacteria, so nothing of it is lost in the two years shown.
 */

// ── Polymers ─────────────────────────────────────────────────────────────────

export type PolymerId = "cellulose" | "polythene" | "pvc" | "acrylic" | "nylon" | "polyester";
export const POLYMER_ORDER: readonly PolymerId[] = ["cellulose", "polythene", "pvc", "acrylic", "nylon", "polyester"];

export interface PolymerInfo {
  name: string;
  /** What one repeating unit is made from. */
  unitName: string;
  /** Formula of one repeating unit. */
  formula: string;
  /** The repeat unit, condensed, with its open bonds. */
  condensed: string;
  atoms: Readonly<Record<string, number>>;
  natural: boolean;
}

export const POLYMERS: Readonly<Record<PolymerId, PolymerInfo>> = {
  cellulose: { name: "cellulose (cotton)", unitName: "glucose", formula: "C₆H₁₀O₅", condensed: "–C₆H₁₀O₅–", atoms: { C: 6, H: 10, O: 5 }, natural: true },
  polythene: { name: "polythene", unitName: "ethene", formula: "C₂H₄", condensed: "–CH₂–CH₂–", atoms: { C: 2, H: 4 }, natural: false },
  pvc: { name: "PVC", unitName: "vinyl chloride", formula: "C₂H₃Cl", condensed: "–CH₂–CHCl–", atoms: { C: 2, H: 3, Cl: 1 }, natural: false },
  acrylic: { name: "acrylic", unitName: "acrylonitrile", formula: "C₃H₃N", condensed: "–CH₂–CH(CN)–", atoms: { C: 3, H: 3, N: 1 }, natural: false },
  nylon: { name: "nylon 6,6", unitName: "a diamine and an acid", formula: "C₁₂H₂₂N₂O₂", condensed: "–NH(CH₂)₆NH–CO(CH₂)₄CO–", atoms: { C: 12, H: 22, N: 2, O: 2 }, natural: false },
  polyester: { name: "polyester (PET)", unitName: "a glycol and an acid", formula: "C₁₀H₈O₄", condensed: "–O–CH₂CH₂–O–CO–C₆H₄–CO–", atoms: { C: 10, H: 8, O: 4 }, natural: false },
};

export const POLYMER_MAX_UNITS = 1000;

export function polymerInfo(id: string): PolymerInfo {
  return POLYMERS[id as PolymerId] ?? POLYMERS.polythene;
}

export function polymerUnitAtoms(p: PolymerInfo): number {
  return Object.values(p.atoms).reduce((s, n) => s + n, 0);
}

// ── Fibres ───────────────────────────────────────────────────────────────────

export type PolymerFibreId = "cotton" | "wool" | "silk" | "rayon" | "nylon" | "polyester" | "acrylic";
export const POLYMER_FIBRE_ORDER: readonly PolymerFibreId[] = ["cotton", "wool", "silk", "rayon", "nylon", "polyester", "acrylic"];

/** Where a fibre comes from, by index. */
export const POLYMER_SOURCES = ["plants", "animals", "wood pulp", "petrochemicals"] as const;

export interface PolymerFibre {
  name: string;
  natural: boolean;
  /** Index into POLYMER_SOURCES. */
  source: number;
  /** Illustrative breaking load of a thread of the same thickness, g. */
  breakingLoad: number;
  /** Soaks up a lot of water (and so dries slowly). */
  absorbs: boolean;
  /** Melts when heated (synthetic fibres from petrochemicals). */
  melts: boolean;
  /** Its other name, or what it is used as. */
  note: string;
}

export const POLYMER_FIBRES: Readonly<Record<PolymerFibreId, PolymerFibre>> = {
  cotton: { name: "cotton", natural: true, source: 0, breakingLoad: 350, absorbs: true, melts: false, note: "cellulose, from the cotton plant" },
  wool: { name: "wool", natural: true, source: 1, breakingLoad: 150, absorbs: true, melts: false, note: "from sheep's fleece" },
  silk: { name: "silk", natural: true, source: 1, breakingLoad: 400, absorbs: true, melts: false, note: "from the silkworm's cocoon" },
  rayon: { name: "rayon", natural: false, source: 2, breakingLoad: 250, absorbs: true, melts: false, note: "artificial silk" },
  nylon: { name: "nylon", natural: false, source: 3, breakingLoad: 650, absorbs: false, melts: true, note: "the first fully synthetic fibre" },
  polyester: { name: "polyester", natural: false, source: 3, breakingLoad: 550, absorbs: false, melts: true, note: "terylene; PET for bottles" },
  acrylic: { name: "acrylic", natural: false, source: 3, breakingLoad: 300, absorbs: false, melts: true, note: "artificial wool" },
};

export const POLYMER_MAX_LOAD = 800;

export function polymerFibre(id: string): PolymerFibre {
  return POLYMER_FIBRES[id as PolymerFibreId] ?? POLYMER_FIBRES.cotton;
}

// ── Plastics ─────────────────────────────────────────────────────────────────

export type PolymerPlasticId = "polythene" | "pvc" | "pet" | "bakelite" | "melamine";
export const POLYMER_PLASTIC_ORDER: readonly PolymerPlasticId[] = ["polythene", "pvc", "pet", "bakelite", "melamine"];

export interface PolymerPlastic {
  name: string;
  thermoplastic: boolean;
  /** Approximate softening temperature, °C (thermoplastics only). */
  softensAt: number | null;
  uses: string;
}

export const POLYMER_PLASTICS: Readonly<Record<PolymerPlasticId, PolymerPlastic>> = {
  polythene: { name: "polythene", thermoplastic: true, softensAt: 90, uses: "carry bags, bottles, toys" },
  pvc: { name: "PVC", thermoplastic: true, softensAt: 80, uses: "pipes, wire covers, toys" },
  pet: { name: "PET", thermoplastic: true, softensAt: 75, uses: "bottles, jars, films" },
  bakelite: { name: "bakelite", thermoplastic: false, softensAt: null, uses: "switches, pan handles" },
  melamine: { name: "melamine", thermoplastic: false, softensAt: null, uses: "crockery, floor tiles, fireproof cloth" },
};

export const POLYMER_HEAT_RANGE = [20, 250] as const;

export function polymerPlastic(id: string): PolymerPlastic {
  return POLYMER_PLASTICS[id as PolymerPlasticId] ?? POLYMER_PLASTICS.polythene;
}

// ── Waste ────────────────────────────────────────────────────────────────────

export type PolymerWasteId = "peels" | "paper" | "cotton" | "wool" | "wood" | "can" | "bag" | "bottle";
export const POLYMER_WASTE_ORDER: readonly PolymerWasteId[] = ["peels", "paper", "cotton", "wool", "wood", "can", "bag", "bottle"];

/** NCERT's words for the approximate time to break down, by index. */
export const POLYMER_ROT_TIMES = ["1 to 2 weeks", "10 to 30 days", "2 to 5 months", "about a year", "10 to 15 years", "100 to 500 years", "several years"] as const;

export interface PolymerWaste {
  name: string;
  biodegradable: boolean;
  /** Index into POLYMER_ROT_TIMES. */
  time: number;
  /** NCERT's range in days (a month is 30 days, a year 365), or null for "several years". */
  days: readonly [number, number] | null;
}

const WEEK = 7;
const MONTH = 30;
const YEAR = 365;

export const POLYMER_WASTES: Readonly<Record<PolymerWasteId, PolymerWaste>> = {
  peels: { name: "fruit and vegetable peels", biodegradable: true, time: 0, days: [1 * WEEK, 2 * WEEK] },
  paper: { name: "paper", biodegradable: true, time: 1, days: [10, 30] },
  cotton: { name: "cotton cloth", biodegradable: true, time: 2, days: [2 * MONTH, 5 * MONTH] },
  wool: { name: "woollen clothes", biodegradable: true, time: 3, days: [YEAR, YEAR] },
  wood: { name: "wood", biodegradable: true, time: 4, days: [10 * YEAR, 15 * YEAR] },
  can: { name: "tin or aluminium can", biodegradable: false, time: 5, days: [100 * YEAR, 500 * YEAR] },
  bag: { name: "plastic bag", biodegradable: false, time: 6, days: null },
  bottle: { name: "plastic bottle", biodegradable: false, time: 6, days: null },
};

export const POLYMER_MAX_DAYS = 2 * YEAR;

export function polymerWaste(id: string): PolymerWaste {
  return POLYMER_WASTES[id as PolymerWasteId] ?? POLYMER_WASTES.peels;
}

/** Percentage left after `days`: biodegradable waste rots steadily and is gone at the middle of NCERT's range (illustrative). */
export function polymerLeft(w: PolymerWaste, days: number): number {
  if (!w.biodegradable || !w.days) return 100;
  const mid = (w.days[0] + w.days[1]) / 2;
  const t = Math.max(0, Number.isFinite(days) ? days : 0);
  return Math.max(0, 100 * (1 - t / mid)) || 0;
}

// ── The model ────────────────────────────────────────────────────────────────

export type PolymerSchoolParams = {
  polymer: PolymerId;
  fibre: PolymerFibreId;
  plastic: PolymerPlasticId;
  waste: PolymerWasteId;
};

export type PolymerSchoolState = {
  /** Repeating units in the chain. */
  units: number;
  /** Load hung on the thread, g. */
  load: number;
  /** Temperature of the plastic, °C. */
  heat: number;
  /** Days the waste has been buried. */
  days: number;
};

export type PolymerSchoolResults = {
  polymer: number;
  polymerNatural: number;
  unitCarbons: number;
  unitAtoms: number;
  units: number;
  chainCarbons: number;
  chainAtoms: number;
  fibre: number;
  fibreNatural: number;
  fibreSource: number;
  breakingLoad: number;
  load: number;
  snapped: number;
  absorbsWater: number;
  driesQuickly: number;
  meltsOnHeating: number;
  plastic: number;
  thermoplastic: number;
  crossLinked: number;
  heat: number;
  softensAt: number;
  soft: number;
  canReshape: number;
  waste: number;
  biodegradable: number;
  rotKnown: number;
  rotTime: number;
  rotMinDays: number;
  rotMaxDays: number;
  rotMidDays: number;
  days: number;
  left: number;
  gone: number;
};

const OUTPUTS = [
  "polymer", "polymerNatural", "unitCarbons", "unitAtoms", "units", "chainCarbons", "chainAtoms",
  "fibre", "fibreNatural", "fibreSource", "breakingLoad", "load", "snapped", "absorbsWater", "driesQuickly", "meltsOnHeating",
  "plastic", "thermoplastic", "crossLinked", "heat", "softensAt", "soft", "canReshape",
  "waste", "biodegradable", "rotKnown", "rotTime", "rotMinDays", "rotMaxDays", "rotMidDays", "days", "left", "gone",
] as const satisfies readonly (keyof PolymerSchoolResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const clampInt = (v: number, lo: number, hi: number) => Math.round(clamp(v, lo, hi));
const bit = (b: boolean) => (b ? 1 : 0);

/** Play: weights go on the thread (50 g a second), the hotplate warms (20 °C a second), the days pass (15 a second). */
const LOAD_RATE = 50;
const HEAT_RATE = 20;
const DAY_RATE = 15;

export const polymerSchoolModel: SimulationModel<PolymerSchoolState, PolymerSchoolParams, PolymerSchoolResults> = {
  id: "polymerschool",
  defaultParams: { polymer: "polythene", fibre: "cotton", plastic: "polythene", waste: "peels" },
  outputs: OUTPUTS,
  stateVariables: ["units", "load", "heat", "days"],

  initialize() {
    return { units: 10, load: 0, heat: 25, days: 0 };
  },

  advance(state, dt) {
    const t = Math.max(0, Number.isFinite(dt) ? dt : 0);
    return {
      ...state,
      load: Math.min(POLYMER_MAX_LOAD, state.load + LOAD_RATE * t),
      heat: Math.min(POLYMER_HEAT_RANGE[1], state.heat + HEAT_RATE * t),
      days: Math.min(POLYMER_MAX_DAYS, state.days + DAY_RATE * t),
    };
  },

  /** One step: a 50 g weight, 10 °C, or a week. */
  step(state, _params, sign) {
    return {
      ...state,
      load: clamp(Math.round(state.load / 50) * 50 + 50 * sign, 0, POLYMER_MAX_LOAD),
      heat: clamp(Math.round(state.heat / 10) * 10 + 10 * sign, POLYMER_HEAT_RANGE[0], POLYMER_HEAT_RANGE[1]),
      days: clamp(Math.round(state.days / WEEK) * WEEK + WEEK * sign, 0, POLYMER_MAX_DAYS),
    };
  },

  derive(state, params) {
    const polymerId = POLYMERS[params.polymer] ? params.polymer : "polythene";
    const p = POLYMERS[polymerId];
    const units = clampInt(state.units, 1, POLYMER_MAX_UNITS);
    const unitCarbons = p.atoms.C ?? 0;
    const unitAtoms = polymerUnitAtoms(p);

    const fibreId = POLYMER_FIBRES[params.fibre] ? params.fibre : "cotton";
    const f = POLYMER_FIBRES[fibreId];
    const load = clamp(state.load, 0, POLYMER_MAX_LOAD);

    const plasticId = POLYMER_PLASTICS[params.plastic] ? params.plastic : "polythene";
    const pl = POLYMER_PLASTICS[plasticId];
    const heat = clamp(state.heat, POLYMER_HEAT_RANGE[0], POLYMER_HEAT_RANGE[1]);
    const soft = pl.softensAt !== null && heat >= pl.softensAt;

    const wasteId = POLYMER_WASTES[params.waste] ? params.waste : "peels";
    const w = POLYMER_WASTES[wasteId];
    const days = clamp(state.days, 0, POLYMER_MAX_DAYS);
    const left = polymerLeft(w, days);

    return {
      polymer: POLYMER_ORDER.indexOf(polymerId),
      polymerNatural: bit(p.natural),
      unitCarbons,
      unitAtoms,
      units,
      chainCarbons: units * unitCarbons,
      chainAtoms: units * unitAtoms,

      fibre: POLYMER_FIBRE_ORDER.indexOf(fibreId),
      fibreNatural: bit(f.natural),
      fibreSource: f.source,
      breakingLoad: f.breakingLoad,
      load,
      snapped: bit(load > f.breakingLoad),
      absorbsWater: bit(f.absorbs),
      driesQuickly: bit(!f.absorbs),
      meltsOnHeating: bit(f.melts),

      plastic: POLYMER_PLASTIC_ORDER.indexOf(plasticId),
      thermoplastic: bit(pl.thermoplastic),
      crossLinked: bit(!pl.thermoplastic),
      heat,
      softensAt: pl.softensAt ?? 0,
      soft: bit(soft),
      canReshape: bit(pl.thermoplastic),

      waste: POLYMER_WASTE_ORDER.indexOf(wasteId),
      biodegradable: bit(w.biodegradable),
      rotKnown: bit(w.days !== null),
      rotTime: w.time,
      rotMinDays: w.days ? w.days[0] : 0,
      rotMaxDays: w.days ? w.days[1] : 0,
      rotMidDays: w.days ? (w.days[0] + w.days[1]) / 2 : 0,
      days,
      left,
      gone: bit(w.biodegradable && left <= 0),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof PolymerSchoolState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "units": return { ...state, units: clampInt(value, 1, POLYMER_MAX_UNITS) };
      case "load": return { ...state, load: clamp(value, 0, POLYMER_MAX_LOAD) };
      case "heat": return { ...state, heat: clamp(value, POLYMER_HEAT_RANGE[0], POLYMER_HEAT_RANGE[1]) };
      case "days": return { ...state, days: clamp(value, 0, POLYMER_MAX_DAYS) };
      default: return state;
    }
  },
};
