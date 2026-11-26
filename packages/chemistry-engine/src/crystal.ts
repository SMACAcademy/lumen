import type { SimulationModel } from "@ise/science-engine";

/**
 * Crystal field theory for octahedral complexes.
 *
 * Six ligands approach a metal ion along the axes. The d orbitals pointing
 * at them (eg) rise; the three between them (t₂g) fall. The gap, Δo, grows
 * along the spectrochemical series — I⁻ < Br⁻ < Cl⁻ < F⁻ < OH⁻ < H₂O < NH₃ <
 * en < CN⁻ < CO — and with the metal's charge: Δo = f(ligand) × g(metal).
 *
 * Electrons fill t₂g first. From d⁴ to d⁷ there is a choice: go up to eg
 * (high spin) or pair in t₂g, paying the pairing energy P (low spin) — low
 * spin wins when Δo > P. An electron jumping across the gap absorbs light of
 * wavelength 10⁷/Δo nm, and we see the complementary colour.
 *
 * The factors are approximate. Each metal's g is its aqua ion's Δo, and
 * CN⁻'s f is set a little above Jørgensen's 1.7 so the cyanides the
 * textbook calls low-spin come out low-spin; the tests pin every textbook
 * example the levels use.
 */

export interface Ligand {
  id: string;
  /** How it is written in a formula, without its charge. */
  formula: string;
  /** As an ion, for words: "CN⁻". */
  display: string;
  name: string;
  /** Jørgensen's f: its field strength relative to water. */
  f: number;
  charge: number;
  /** Donor atoms per ligand; en holds on with two. */
  denticity: 1 | 2;
}

/** The spectrochemical series, weakest first. */
export const LIGANDS: readonly Ligand[] = [
  { id: "i", formula: "I", display: "I⁻", name: "iodide", f: 0.7, charge: -1, denticity: 1 },
  { id: "br", formula: "Br", display: "Br⁻", name: "bromide", f: 0.72, charge: -1, denticity: 1 },
  { id: "cl", formula: "Cl", display: "Cl⁻", name: "chloride", f: 0.78, charge: -1, denticity: 1 },
  { id: "f", formula: "F", display: "F⁻", name: "fluoride", f: 0.9, charge: -1, denticity: 1 },
  { id: "oh", formula: "(OH)", display: "OH⁻", name: "hydroxide", f: 0.94, charge: -1, denticity: 1 },
  { id: "h2o", formula: "(H₂O)", display: "H₂O", name: "water", f: 1.0, charge: 0, denticity: 1 },
  { id: "nh3", formula: "(NH₃)", display: "NH₃", name: "ammonia", f: 1.25, charge: 0, denticity: 1 },
  { id: "en", formula: "(en)", display: "en", name: "ethane-1,2-diamine", f: 1.28, charge: 0, denticity: 2 },
  { id: "cn", formula: "(CN)", display: "CN⁻", name: "cyanide", f: 2.2, charge: -1, denticity: 1 },
  { id: "co", formula: "(CO)", display: "CO", name: "carbonyl", f: 2.4, charge: 0, denticity: 1 },
];

export interface ComplexMetal {
  /** "Fe³⁺" */
  display: string;
  symbol: string;
  charge: number;
  d: number;
  /** Δo of the aqua ion, cm⁻¹ / 1000. */
  g: number;
  /** Pairing energy, cm⁻¹, where d⁴–d⁷ gives a choice of spin. */
  P: number | null;
}

export type ComplexMetalId = "sc3" | "ti3" | "v3" | "cr3" | "fe2" | "fe3" | "co3" | "ni2" | "zn2";
export const COMPLEX_METAL_ORDER: readonly ComplexMetalId[] = ["sc3", "ti3", "v3", "cr3", "fe2", "fe3", "co3", "ni2", "zn2"];

export const COMPLEX_METALS: Record<ComplexMetalId, ComplexMetal> = {
  sc3: { display: "Sc³⁺", symbol: "Sc", charge: 3, d: 0, g: 15, P: null },
  ti3: { display: "Ti³⁺", symbol: "Ti", charge: 3, d: 1, g: 20.3, P: null },
  v3: { display: "V³⁺", symbol: "V", charge: 3, d: 2, g: 14.5, P: null },
  cr3: { display: "Cr³⁺", symbol: "Cr", charge: 3, d: 3, g: 17.4, P: null },
  fe2: { display: "Fe²⁺", symbol: "Fe", charge: 2, d: 6, g: 10.4, P: 17600 },
  fe3: { display: "Fe³⁺", symbol: "Fe", charge: 3, d: 5, g: 14.0, P: 30000 },
  co3: { display: "Co³⁺", symbol: "Co", charge: 3, d: 6, g: 18.2, P: 17800 },
  ni2: { display: "Ni²⁺", symbol: "Ni", charge: 2, d: 8, g: 13.9, P: null },
  zn2: { display: "Zn²⁺", symbol: "Zn", charge: 2, d: 10, g: 10, P: null },
};

export const COMPLEX_COLOURS = ["colourless", "pale yellow", "yellow", "orange", "violet", "blue", "green", "very pale"] as const;

/** The colour seen when light of this wavelength (nm) is absorbed: its complement, fitted to NCERT's examples. */
export function complementaryColour(absorbedNm: number): (typeof COMPLEX_COLOURS)[number] {
  if (absorbedNm < 400) return "pale yellow";
  if (absorbedNm < 470) return "yellow";
  if (absorbedNm < 490) return "orange";
  if (absorbedNm < 590) return "violet";
  if (absorbedNm < 650) return "blue";
  if (absorbedNm < 800) return "green";
  return "very pale";
}

/** Electrons in each of the three t₂g and two eg orbitals. */
export function fillOctahedral(d: number, lowSpin: boolean): { t2g: number[]; eg: number[] } {
  const t2g = [0, 0, 0];
  const eg = [0, 0];
  const order: [number[], number][] = lowSpin
    ? [[t2g, 0], [t2g, 1], [t2g, 2], [t2g, 0], [t2g, 1], [t2g, 2], [eg, 0], [eg, 1], [eg, 0], [eg, 1]]
    : [[t2g, 0], [t2g, 1], [t2g, 2], [eg, 0], [eg, 1], [t2g, 0], [t2g, 1], [t2g, 2], [eg, 0], [eg, 1]];
  for (let i = 0; i < d; i++) {
    const [set, k] = order[i]!;
    set[k] = (set[k] ?? 0) + 1;
  }
  return { t2g, eg };
}

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "+": "⁺", "-": "⁻" };
const chargeText = (q: number) => (q === 0 ? "" : `${Math.abs(q) === 1 ? "" : String(Math.abs(q)).replace(/./g, (c) => SUP[c] ?? c)}${q > 0 ? "⁺" : "⁻"}`);
const SUB: Record<string, string> = { "2": "₂", "3": "₃", "6": "₆" };

/** The complex's formula, e.g. "[Fe(CN)₆]⁴⁻", "[Co(en)₃]³⁺". */
export function complexFormula(metal: ComplexMetal, ligand: Ligand): string {
  const n = 6 / ligand.denticity;
  const charge = metal.charge + n * ligand.charge;
  return `[${metal.symbol}${ligand.formula}${SUB[String(n)] ?? n}]${chargeText(charge)}`;
}

export type CrystalParams = { metal: ComplexMetalId };

export interface CrystalState {
  /** Position along the spectrochemical series, 0 (I⁻) to 9 (CO). */
  readonly ligand: number;
  readonly clock: number;
}

export type CrystalResults = {
  metal: number;
  ligand: number;
  dCount: number;
  deltaO: number;
  pairing: number;
  spinChoice: number;
  lowSpin: number;
  t2g: number;
  eg: number;
  unpaired: number;
  moment: number;
  paramagnetic: number;
  cfse: number;
  absorbed: number;
  coloured: number;
  colour: number;
  charge: number;
  bidentate: number;
};

const clampLigand = (i: number) => Math.min(LIGANDS.length - 1, Math.max(0, Math.round(i)));

const OUTPUTS = [
  "metal", "ligand", "dCount", "deltaO", "pairing", "spinChoice", "lowSpin", "t2g", "eg", "unpaired", "moment",
  "paramagnetic", "cfse", "absorbed", "coloured", "colour", "charge", "bidentate",
] as const satisfies readonly (keyof CrystalResults)[];

const MOVE_EVERY = 1;

export const crystalModel: SimulationModel<CrystalState, CrystalParams, CrystalResults> = {
  id: "crystal",
  defaultParams: { metal: "ti3" },
  outputs: OUTPUTS,
  stateVariables: ["ligand"],

  initialize() {
    return { ligand: 5, clock: 0 };
  },

  /** Play climbs the spectrochemical series, one ligand a second. */
  advance(state, dt) {
    const clock = state.clock + dt;
    if (clock < MOVE_EVERY) return { ...state, clock };
    return { ligand: state.ligand >= LIGANDS.length - 1 ? 0 : clampLigand(state.ligand) + 1, clock: 0 };
  },

  step(state, _params, sign) {
    return { ...state, ligand: clampLigand(state.ligand + sign), clock: 0 };
  },

  derive(state, params) {
    const metal = COMPLEX_METALS[params.metal] ?? COMPLEX_METALS.ti3;
    const i = clampLigand(state.ligand);
    const ligand = LIGANDS[i]!;
    const deltaO = Math.round(ligand.f * metal.g * 1000);
    const spinChoice = metal.d >= 4 && metal.d <= 7 && metal.P !== null;
    const lowSpin = spinChoice && deltaO > (metal.P ?? Infinity);
    const { t2g, eg } = fillOctahedral(metal.d, lowSpin);
    const nT2g = t2g.reduce((a, b) => a + b, 0);
    const nEg = eg.reduce((a, b) => a + b, 0);
    const unpaired = [...t2g, ...eg].filter((k) => k === 1).length;
    const absorbed = 1e7 / deltaO;
    const dd = metal.d > 0 && metal.d < 10;
    // High-spin d⁵ has no spin-allowed d–d jump: only a faint colour.
    const colour = !dd ? "colourless" : metal.d === 5 && !lowSpin ? "very pale" : complementaryColour(absorbed);
    return {
      metal: Math.max(0, COMPLEX_METAL_ORDER.indexOf(params.metal)),
      ligand: i,
      dCount: metal.d,
      deltaO,
      pairing: metal.P ?? 0,
      spinChoice: spinChoice ? 1 : 0,
      lowSpin: lowSpin ? 1 : 0,
      t2g: nT2g,
      eg: nEg,
      unpaired,
      moment: Math.sqrt(unpaired * (unpaired + 2)),
      paramagnetic: unpaired > 0 ? 1 : 0,
      cfse: Math.round((-0.4 * nT2g + 0.6 * nEg) * 10) / 10 || 0,
      absorbed,
      coloured: dd ? 1 : 0,
      colour: COMPLEX_COLOURS.indexOf(colour),
      charge: metal.charge + (6 / ligand.denticity) * ligand.charge,
      bidentate: ligand.denticity === 2 ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id === "ligand" ? state.ligand : undefined;
  },

  setVariable(state, id, value) {
    return id === "ligand" ? { ...state, ligand: clampLigand(value), clock: 0 } : state;
  },
};
