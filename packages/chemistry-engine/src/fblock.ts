import type { SimulationModel } from "@ise/science-engine";

/**
 * The f-block: lanthanoids (4f) and actinoids (5f).
 *
 * Radii and oxidation states are NCERT's class 12 tables, shown rather than
 * derived; a radius NCERT does not give is null and reported as not known.
 * Across each series the M³⁺ ions shrink steadily — the lanthanoid and
 * actinoid contractions — because f electrons shield the growing nuclear
 * charge poorly.
 *
 * Worked out here: the f electrons in an ion. An ion keeps what is left
 * after the outer s and d electrons go, so a lanthanoid ion of charge n has
 * Z − 54 − n of them and an actinoid ion Z − 86 − n; over seven f orbitals,
 * Hund's rule then gives the unpaired count. Lanthanoid oxidation states
 * follow NCERT's text: +3 for all, +4 as well for Ce, Pr, Nd, Tb, Dy, and
 * +2 as well for Sm, Eu, Yb.
 */

export interface FElement {
  symbol: string;
  name: string;
  Z: number;
  /** Outer configuration of the atom, after the noble-gas core. */
  configuration: string;
  /** Ionic radii, pm: M³⁺ and M⁴⁺. */
  radius3: number | null;
  radius4: number | null;
  /** Oxidation states shown, ascending. */
  states: readonly number[];
  radioactive: boolean;
}

const ln = (Z: number, symbol: string, name: string, configuration: string, radius3: number | null, states: readonly number[], radioactive = false): FElement => ({
  symbol, name, Z, configuration, radius3, radius4: null, states, radioactive,
});
const an = (Z: number, symbol: string, name: string, configuration: string, radius3: number | null, radius4: number | null, states: readonly number[]): FElement => ({
  symbol, name, Z, configuration, radius3, radius4, states, radioactive: true,
});

export const LANTHANOIDS: readonly FElement[] = [
  ln(57, "La", "Lanthanum", "5d¹6s²", 106, [3]),
  ln(58, "Ce", "Cerium", "4f¹5d¹6s²", 103, [3, 4]),
  ln(59, "Pr", "Praseodymium", "4f³6s²", 101, [3, 4]),
  ln(60, "Nd", "Neodymium", "4f⁴6s²", 99, [3, 4]),
  ln(61, "Pm", "Promethium", "4f⁵6s²", 98, [3], true),
  ln(62, "Sm", "Samarium", "4f⁶6s²", 96, [2, 3]),
  ln(63, "Eu", "Europium", "4f⁷6s²", 95, [2, 3]),
  ln(64, "Gd", "Gadolinium", "4f⁷5d¹6s²", 94, [3]),
  ln(65, "Tb", "Terbium", "4f⁹6s²", 92, [3, 4]),
  ln(66, "Dy", "Dysprosium", "4f¹⁰6s²", 91, [3, 4]),
  ln(67, "Ho", "Holmium", "4f¹¹6s²", 89, [3]),
  ln(68, "Er", "Erbium", "4f¹²6s²", 88, [3]),
  ln(69, "Tm", "Thulium", "4f¹³6s²", 87, [3]),
  ln(70, "Yb", "Ytterbium", "4f¹⁴6s²", 86, [2, 3]),
  ln(71, "Lu", "Lutetium", "4f¹⁴5d¹6s²", null, [3]),
];

export const ACTINOIDS: readonly FElement[] = [
  an(89, "Ac", "Actinium", "6d¹7s²", 111, null, [3]),
  an(90, "Th", "Thorium", "6d²7s²", null, 99, [4]),
  an(91, "Pa", "Protactinium", "5f²6d¹7s²", null, 96, [3, 4, 5]),
  an(92, "U", "Uranium", "5f³6d¹7s²", 103, 93, [3, 4, 5, 6]),
  an(93, "Np", "Neptunium", "5f⁴6d¹7s²", 101, 92, [3, 4, 5, 6, 7]),
  an(94, "Pu", "Plutonium", "5f⁶7s²", 100, 90, [3, 4, 5, 6, 7]),
  an(95, "Am", "Americium", "5f⁷7s²", 99, 89, [3, 4, 5, 6]),
  an(96, "Cm", "Curium", "5f⁷6d¹7s²", 99, 88, [3, 4]),
  an(97, "Bk", "Berkelium", "5f⁹7s²", 98, 87, [3, 4]),
  an(98, "Cf", "Californium", "5f¹⁰7s²", 98, 86, [3]),
  an(99, "Es", "Einsteinium", "5f¹¹7s²", null, null, [3]),
  an(100, "Fm", "Fermium", "5f¹²7s²", null, null, [3]),
  an(101, "Md", "Mendelevium", "5f¹³7s²", null, null, [3]),
  an(102, "No", "Nobelium", "5f¹⁴7s²", null, null, [3]),
  an(103, "Lr", "Lawrencium", "5f¹⁴6d¹7s²", null, null, [3]),
];

export type FSeriesId = "lanthanoids" | "actinoids";
export const F_SERIES_ORDER: readonly FSeriesId[] = ["lanthanoids", "actinoids"];
export const F_SERIES_LENGTH = 15;

export function fSeries(series: FSeriesId): readonly FElement[] {
  return series === "actinoids" ? ACTINOIDS : LANTHANOIDS;
}

/** f electrons left in an ion of this charge: what remains above the noble-gas core. */
export function fElectronsIn(series: FSeriesId, Z: number, charge: number): number {
  const core = series === "actinoids" ? 86 : 54;
  return Math.min(14, Math.max(0, Z - core - charge));
}

/** Unpaired electrons for n electrons in seven f orbitals. */
export function unpairedF(n: number): number {
  return n <= 7 ? n : 14 - n;
}

export type FBlockParams = { series: FSeriesId };

export interface FBlockState {
  /** Place along the series, 1 to 15. */
  readonly index: number;
  /** Charge of the ion looked at, 2 to 7. */
  readonly charge: number;
  /** Seconds of play since the last step along the series. */
  readonly clock: number;
}

export type FBlockResults = {
  series: number;
  index: number;
  Z: number;
  charge: number;
  /** 1 when the element shows this oxidation state. */
  exists: number;
  fElectrons: number;
  unpaired: number;
  paramagnetic: number;
  /** M³⁺ and M⁴⁺ radii, pm; 0 with known = 0 where NCERT gives none. */
  radius3: number;
  known3: number;
  radius4: number;
  known4: number;
  minOx: number;
  maxOx: number;
  stateCount: number;
  radioactive: number;
};

const OUTPUTS = [
  "series", "index", "Z", "charge", "exists", "fElectrons", "unpaired", "paramagnetic", "radius3", "known3", "radius4", "known4",
  "minOx", "maxOx", "stateCount", "radioactive",
] as const satisfies readonly (keyof FBlockResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Seconds of play between one element and the next. */
const STEP_TIME = 0.8;

export const fBlockModel: SimulationModel<FBlockState, FBlockParams, FBlockResults> = {
  id: "fblock",
  defaultParams: { series: "lanthanoids" },
  outputs: OUTPUTS,
  stateVariables: ["index", "charge"],

  initialize() {
    return { index: 1, charge: 3, clock: 0 };
  },

  /** Play walks along the series and starts again at the end. */
  advance(state, dt) {
    const clock = state.clock + dt;
    if (clock < STEP_TIME) return { ...state, clock };
    return { ...state, index: state.index >= F_SERIES_LENGTH ? 1 : state.index + 1, clock: clock - STEP_TIME };
  },

  step(state, _params, sign) {
    return { ...state, index: clamp(Math.round(state.index) + sign, 1, F_SERIES_LENGTH), clock: 0 };
  },

  derive(state, params) {
    const series: FSeriesId = params.series === "actinoids" ? "actinoids" : "lanthanoids";
    const index = clamp(Math.round(state.index), 1, F_SERIES_LENGTH);
    const element = fSeries(series)[index - 1]!;
    const charge = clamp(Math.round(state.charge), 2, 7);
    const fElectrons = fElectronsIn(series, element.Z, charge);
    const unpaired = unpairedF(fElectrons);
    return {
      series: F_SERIES_ORDER.indexOf(series),
      index,
      Z: element.Z,
      charge,
      exists: element.states.includes(charge) ? 1 : 0,
      fElectrons,
      unpaired,
      paramagnetic: unpaired > 0 ? 1 : 0,
      radius3: element.radius3 ?? 0,
      known3: element.radius3 === null ? 0 : 1,
      radius4: element.radius4 ?? 0,
      known4: element.radius4 === null ? 0 : 1,
      minOx: Math.min(...element.states),
      maxOx: Math.max(...element.states),
      stateCount: element.states.length,
      radioactive: element.radioactive ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id === "index" ? state.index : id === "charge" ? state.charge : undefined;
  },

  setVariable(state, id, value) {
    if (id === "index") return { ...state, index: clamp(Math.round(value), 1, F_SERIES_LENGTH), clock: 0 };
    if (id === "charge") return { ...state, charge: clamp(Math.round(value), 2, 7) };
    return state;
  },
};
