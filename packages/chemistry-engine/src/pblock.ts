import type { SimulationModel } from "@ise/science-engine";

/**
 * The p-block, groups 13 to 18, periods 2 to 6.
 *
 * Like the periodic-trends lab, these are measured values (NCERT's tables),
 * shown rather than derived, with anything NCERT does not give marked
 * missing. Down a group the elements turn from non-metal to metal, their
 * electronegativity falls, and the heaviest (Tl, Pb, Bi) prefer an oxidation
 * state two below the group's — the inert pair effect. The hydrides of
 * groups 14 to 17 boil higher down each group, except for NH₃, H₂O and HF,
 * which hydrogen bonding lifts far above the trend; bond angles and E–H bond
 * strengths fall down each group.
 */

export const P_GROUPS = [13, 14, 15, 16, 17, 18] as const;
export const P_PERIODS = [2, 3, 4, 5, 6] as const;
export const CHARACTER_NAMES = ["metal", "metalloid", "non-metal"] as const;
export const OXIDE_NAMES = ["basic", "amphoteric", "acidic", "neutral"] as const;

export interface PElement {
  symbol: string;
  name: string;
  /** 0 metal, 1 metalloid, 2 non-metal (NCERT). */
  character: 0 | 1 | 2;
  /** Pauling electronegativity (NCERT); null where not given. */
  en: number | null;
  /** Character of its common oxide: 0 basic, 1 amphoteric, 2 acidic; null where there is none to speak of. */
  oxide: 0 | 1 | 2 | null;
  hydride: { formula: string; bp: number | null; angle: number | null; bond: number | null } | null;
}

const el = (symbol: string, name: string, character: 0 | 1 | 2, en: number | null, oxide: 0 | 1 | 2 | null, hydride: PElement["hydride"] = null): PElement => ({
  symbol,
  name,
  character,
  en,
  oxide,
  hydride,
});
const h = (formula: string, bp: number | null, angle: number | null = null, bond: number | null = null) => ({ formula, bp, angle, bond });

/** Rows are groups 13–18; columns periods 2–6. */
export const P_BLOCK: Readonly<Record<number, readonly PElement[]>> = {
  13: [el("B", "Boron", 2, 2.0, 2), el("Al", "Aluminium", 0, 1.5, 1), el("Ga", "Gallium", 0, 1.6, 1), el("In", "Indium", 0, 1.7, 0), el("Tl", "Thallium", 0, 1.8, 0)],
  14: [
    el("C", "Carbon", 2, 2.5, 2, h("CH₄", 111.7)),
    el("Si", "Silicon", 2, 1.8, 2, h("SiH₄", 161)),
    el("Ge", "Germanium", 1, 1.8, 2, h("GeH₄", 184.9)),
    el("Sn", "Tin", 0, 1.8, 1, h("SnH₄", 221)),
    el("Pb", "Lead", 0, 1.9, 1, null),
  ],
  15: [
    el("N", "Nitrogen", 2, 3.0, 2, h("NH₃", 238.5, 107.8, 389)),
    el("P", "Phosphorus", 2, 2.1, 2, h("PH₃", 185.5, 93.6, 322)),
    el("As", "Arsenic", 1, 2.0, 2, h("AsH₃", 210.6, 91.8, 297)),
    el("Sb", "Antimony", 1, 1.9, 1, h("SbH₃", 254.6, 91.3, 255)),
    el("Bi", "Bismuth", 0, 1.9, 0, h("BiH₃", 290, 90, null)),
  ],
  16: [
    el("O", "Oxygen", 2, 3.5, null, h("H₂O", 373, 104.5, 463)),
    el("S", "Sulphur", 2, 2.44, 2, h("H₂S", 213, 92.1, 347)),
    el("Se", "Selenium", 1, 2.48, 2, h("H₂Se", 232, 91, 276)),
    el("Te", "Tellurium", 1, 2.01, 1, h("H₂Te", 269, 90, 238)),
    el("Po", "Polonium", 0, 1.76, 1, null),
  ],
  17: [
    el("F", "Fluorine", 2, 4.0, null, h("HF", 293, null, 574)),
    el("Cl", "Chlorine", 2, 3.2, 2, h("HCl", 189, null, 432)),
    el("Br", "Bromine", 2, 3.0, 2, h("HBr", 206, null, 363)),
    el("I", "Iodine", 2, 2.7, 2, h("HI", 238, null, 295)),
    el("At", "Astatine", 2, 2.2, null, null),
  ],
  18: [el("Ne", "Neon", 2, null, null), el("Ar", "Argon", 2, null, null), el("Kr", "Krypton", 2, null, null), el("Xe", "Xenon", 2, null, null), el("Rn", "Radon", 2, null, null)],
};

const clampGroup = (g: number) => Math.min(18, Math.max(13, Math.round(g)));
const clampPeriod = (p: number) => Math.min(6, Math.max(2, Math.round(p)));

export function pElement(group: number, period: number): PElement {
  return P_BLOCK[clampGroup(group)]![clampPeriod(period) - 2]!;
}

/** The group's highest oxidation state: all its s and p electrons. Group 18 is taken as 0. */
export function groupOxidationState(group: number): number {
  const g = clampGroup(group);
  return g === 18 ? 0 : g === 17 ? 7 : g - 10;
}

/** Whether the lower state, two below the group's, is the more stable: the inert pair effect of Tl, Pb and Bi. */
export function favoursLowerState(group: number, period: number): boolean {
  const g = clampGroup(group);
  return period === 6 && g >= 13 && g <= 15;
}

export const P_PROPERTY_ORDER = ["character", "electronegativity", "oxide", "inert"] as const;

export type PBlockParams = {
  /** What the table is coloured by. */
  property: "character" | "electronegativity" | "oxide" | "inert";
};

export interface PBlockState {
  readonly group: number;
  readonly period: number;
  readonly clock: number;
}

export type PBlockResults = {
  property: number;
  group: number;
  period: number;
  valence: number;
  groupOx: number;
  lowerOx: number;
  inertPair: number;
  character: number;
  en: number;
  hasEn: number;
  oxide: number;
  hasOxide: number;
  hydrideBp: number;
  hasHydride: number;
  hydrideAngle: number;
  hasAngle: number;
  bondEnthalpy: number;
  hasEnthalpy: number;
  hBonding: number;
};

const OUTPUTS = [
  "property", "group", "period", "valence", "groupOx", "lowerOx", "inertPair", "character", "en", "hasEn", "oxide", "hasOxide",
  "hydrideBp", "hasHydride", "hydrideAngle", "hasAngle", "bondEnthalpy", "hasEnthalpy", "hBonding",
] as const satisfies readonly (keyof PBlockResults)[];

const MOVE_EVERY = 1;

export const pBlockModel: SimulationModel<PBlockState, PBlockParams, PBlockResults> = {
  id: "pblock",
  defaultParams: { property: "character" },
  outputs: OUTPUTS,
  stateVariables: ["group", "period"],

  initialize() {
    return { group: 15, period: 2, clock: 0 };
  },

  /** Play walks down the group, and back to the top. */
  advance(state, dt) {
    const clock = state.clock + dt;
    if (clock < MOVE_EVERY) return { ...state, clock };
    return { ...state, period: state.period >= 6 ? 2 : clampPeriod(state.period) + 1, clock: 0 };
  },

  step(state, _params, sign) {
    return { ...state, period: clampPeriod(state.period + sign), clock: 0 };
  },

  derive(state, params) {
    const group = clampGroup(state.group);
    const period = clampPeriod(state.period);
    const e = pElement(group, period);
    const groupOx = groupOxidationState(group);
    const hydride = e.hydride;
    return {
      property: Math.max(0, P_PROPERTY_ORDER.indexOf(params.property)),
      group,
      period,
      valence: group === 18 ? 8 : group - 10,
      groupOx,
      lowerOx: group >= 13 && group <= 16 ? groupOx - 2 : groupOx,
      inertPair: favoursLowerState(group, period) ? 1 : 0,
      character: e.character,
      en: e.en ?? 0,
      hasEn: e.en === null ? 0 : 1,
      oxide: e.oxide ?? 0,
      hasOxide: e.oxide === null ? 0 : 1,
      hydrideBp: hydride?.bp ?? 0,
      hasHydride: hydride?.bp ? 1 : 0,
      hydrideAngle: hydride?.angle ?? 0,
      hasAngle: hydride?.angle ? 1 : 0,
      bondEnthalpy: hydride?.bond ?? 0,
      hasEnthalpy: hydride?.bond ? 1 : 0,
      hBonding: period === 2 && group >= 15 && group <= 17 ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id === "group" ? state.group : id === "period" ? state.period : undefined;
  },

  setVariable(state, id, value) {
    if (id === "group") return { ...state, group: clampGroup(value) };
    if (id === "period") return { ...state, period: clampPeriod(value) };
    return state;
  },
};
