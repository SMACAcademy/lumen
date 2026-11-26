import type { SimulationModel } from "@ise/science-engine";

/**
 * Coordination compounds: their names, and their isomers.
 *
 * Names are built by IUPAC's rules as NCERT uses them: ligands in
 * alphabetical order with di-, tri-… (bis-, tris- for en), anionic ligands
 * ending -ido, an anionic complex's metal ending -ate, and the metal's
 * oxidation state in Roman numerals — worked out from the charges.
 *
 * Isomers are counted, not listed. Every way of placing the ligands on an
 * octahedron (or a square) is generated, then sorted into classes: two
 * arrangements are the same stereoisomer if a rotation turns one into the
 * other, and the same geometric isomer if a rotation or a mirror does. An
 * arrangement is chiral when its mirror image is not a rotation of it.
 */

// ── Names ─────────────────────────────────────────────────────────────────────

export interface NamingLigand {
  /** IUPAC name used in the complex's name. */
  name: string;
  formula: string;
  charge: number;
  denticity: 1 | 2;
  /** Names that already contain a number (en) take bis-/tris- and brackets. */
  complexName: boolean;
}

export const NAMING_LIGANDS: Readonly<Record<string, NamingLigand>> = {
  nh3: { name: "ammine", formula: "NH₃", charge: 0, denticity: 1, complexName: false },
  h2o: { name: "aqua", formula: "H₂O", charge: 0, denticity: 1, complexName: false },
  co: { name: "carbonyl", formula: "CO", charge: 0, denticity: 1, complexName: false },
  cl: { name: "chlorido", formula: "Cl", charge: -1, denticity: 1, complexName: false },
  cn: { name: "cyanido", formula: "CN", charge: -1, denticity: 1, complexName: false },
  en: { name: "ethane-1,2-diamine", formula: "en", charge: 0, denticity: 2, complexName: true },
};

export interface NamingMetal {
  symbol: string;
  name: string;
  /** In an anionic complex. */
  anionName: string;
}

const METALS: Readonly<Record<string, NamingMetal>> = {
  Co: { symbol: "Co", name: "cobalt", anionName: "cobaltate" },
  Fe: { symbol: "Fe", name: "iron", anionName: "ferrate" },
  Pt: { symbol: "Pt", name: "platinum", anionName: "platinate" },
  Ni: { symbol: "Ni", name: "nickel", anionName: "nickelate" },
  Cu: { symbol: "Cu", name: "copper", anionName: "cuprate" },
  Ag: { symbol: "Ag", name: "silver", anionName: "argentate" },
};

export interface CounterIon {
  name: string;
  /** Charge of one ion. */
  charge: number;
  count: number;
}

export interface NamedCompound {
  formula: string;
  metal: string;
  ligands: readonly { id: string; n: number }[];
  counter: CounterIon | null;
}

export type CompoundId =
  | "hexaamminecobalt"
  | "ferricyanide"
  | "cisplatin"
  | "chloridocobalt"
  | "nickel-carbonyl"
  | "tris-en"
  | "ferrocyanide"
  | "tetraamminecopper"
  | "hexachloridoplatinate"
  | "diamminesilver";

export const COMPOUND_ORDER: readonly CompoundId[] = [
  "hexaamminecobalt",
  "ferricyanide",
  "cisplatin",
  "chloridocobalt",
  "nickel-carbonyl",
  "tris-en",
  "ferrocyanide",
  "tetraamminecopper",
  "hexachloridoplatinate",
  "diamminesilver",
];

export const COMPOUNDS: Record<CompoundId, NamedCompound> = {
  hexaamminecobalt: { formula: "[Co(NH₃)₆]Cl₃", metal: "Co", ligands: [{ id: "nh3", n: 6 }], counter: { name: "chloride", charge: -1, count: 3 } },
  ferricyanide: { formula: "K₃[Fe(CN)₆]", metal: "Fe", ligands: [{ id: "cn", n: 6 }], counter: { name: "potassium", charge: 1, count: 3 } },
  cisplatin: { formula: "[Pt(NH₃)₂Cl₂]", metal: "Pt", ligands: [{ id: "nh3", n: 2 }, { id: "cl", n: 2 }], counter: null },
  chloridocobalt: { formula: "[CoCl(NH₃)₅]Cl₂", metal: "Co", ligands: [{ id: "cl", n: 1 }, { id: "nh3", n: 5 }], counter: { name: "chloride", charge: -1, count: 2 } },
  "nickel-carbonyl": { formula: "[Ni(CO)₄]", metal: "Ni", ligands: [{ id: "co", n: 4 }], counter: null },
  "tris-en": { formula: "[Co(en)₃]Cl₃", metal: "Co", ligands: [{ id: "en", n: 3 }], counter: { name: "chloride", charge: -1, count: 3 } },
  ferrocyanide: { formula: "K₄[Fe(CN)₆]", metal: "Fe", ligands: [{ id: "cn", n: 6 }], counter: { name: "potassium", charge: 1, count: 4 } },
  tetraamminecopper: { formula: "[Cu(NH₃)₄]SO₄", metal: "Cu", ligands: [{ id: "nh3", n: 4 }], counter: { name: "sulfate", charge: -2, count: 1 } },
  hexachloridoplatinate: { formula: "K₂[PtCl₆]", metal: "Pt", ligands: [{ id: "cl", n: 6 }], counter: { name: "potassium", charge: 1, count: 2 } },
  diamminesilver: { formula: "[Ag(NH₃)₂]Cl", metal: "Ag", ligands: [{ id: "nh3", n: 2 }], counter: { name: "chloride", charge: -1, count: 1 } },
};

const SIMPLE_PREFIX = ["", "", "di", "tri", "tetra", "penta", "hexa"];
const COMPLEX_PREFIX = ["", "", "bis", "tris", "tetrakis"];
const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

/** The complex ion's charge: what balances its counter ions. */
export function complexCharge(c: NamedCompound): number {
  return c.counter ? -c.counter.charge * c.counter.count : 0;
}

/** The metal's oxidation state: the complex's charge less the ligands'. */
export function metalOxidationState(c: NamedCompound): number {
  return complexCharge(c) - c.ligands.reduce((sum, l) => sum + NAMING_LIGANDS[l.id]!.charge * l.n, 0);
}

export function coordinationNumber(c: NamedCompound): number {
  return c.ligands.reduce((sum, l) => sum + NAMING_LIGANDS[l.id]!.denticity * l.n, 0);
}

/** The parts of a name, in order, for the renderer to colour: ligands, metal, oxidation state, and the counter ion. */
export function nameParts(c: NamedCompound): { kind: "counter" | "ligand" | "metal" | "state" | "space"; text: string }[] {
  const charge = complexCharge(c);
  const metal = METALS[c.metal]!;
  const ligands = [...c.ligands]
    .map((l) => ({ l: NAMING_LIGANDS[l.id]!, n: l.n }))
    .sort((a, b) => a.l.name.localeCompare(b.l.name))
    .map(({ l, n }) => ({ kind: "ligand" as const, text: l.complexName ? `${COMPLEX_PREFIX[n]}(${l.name})` : `${SIMPLE_PREFIX[n]}${l.name}` }));
  const complex = [...ligands, { kind: "metal" as const, text: charge < 0 ? metal.anionName : metal.name }, { kind: "state" as const, text: `(${ROMAN[metalOxidationState(c)]})` }];
  if (!c.counter) return complex;
  const counter = { kind: "counter" as const, text: c.counter.name };
  const space = { kind: "space" as const, text: " " };
  return charge > 0 ? [...complex, space, counter] : [counter, space, ...complex];
}

/** The IUPAC name, e.g. "potassium hexacyanidoferrate(III)". */
export function complexName(c: NamedCompound): string {
  return nameParts(c)
    .map((p) => p.text)
    .join("");
}

// ── Isomers ───────────────────────────────────────────────────────────────────

/** Octahedral sites: 0 +x, 1 −x, 2 +y, 3 −y, 4 +z, 5 −z. */
export const SITE_VECTORS: readonly (readonly [number, number, number])[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
const OPPOSITE = [1, 0, 3, 2, 5, 4];

type Perm = readonly number[];
const compose = (a: Perm, b: Perm): number[] => a.map((_, i) => b[a[i]!]!);

/** The 24 rotations of the octahedron, as permutations of its six sites, generated from two quarter-turns. */
export function octahedralRotations(): number[][] {
  const quarterZ: Perm = [2, 3, 1, 0, 4, 5];
  const quarterX: Perm = [0, 1, 4, 5, 3, 2];
  const seen = new Map<string, number[]>([["0,1,2,3,4,5", [0, 1, 2, 3, 4, 5]]]);
  const queue = [[0, 1, 2, 3, 4, 5]];
  while (queue.length) {
    const p = queue.shift()!;
    for (const g of [quarterZ, quarterX]) {
      const q = compose(p, g);
      const key = q.join(",");
      if (!seen.has(key)) {
        seen.set(key, q);
        queue.push(q);
      }
    }
  }
  return [...seen.values()];
}

const ROTATIONS = octahedralRotations();
/** Reflection in the plane x = 0. */
const MIRROR: Perm = [1, 0, 2, 3, 4, 5];

/** An arrangement: what sits at each site ("A", "B", or "·" for none), and which pairs of sites a chelate spans. */
export interface Arrangement {
  sites: readonly string[];
  chelates: readonly (readonly [number, number])[];
}

function apply(p: Perm, a: Arrangement): Arrangement {
  const sites = new Array<string>(6);
  a.sites.forEach((s, i) => (sites[p[i]!] = s));
  const chelates = a.chelates.map(([x, y]) => [p[x]!, p[y]!].sort((m, n) => m - n) as [number, number]).sort((m, n) => m[0] - n[0] || m[1] - n[1]);
  return { sites, chelates };
}

const keyOf = (a: Arrangement) => `${a.sites.join("")}|${a.chelates.map(([x, y]) => `${x}${y}`).join(",")}`;

/** The smallest key among an arrangement's rotations (and mirror images too, if asked): one name for its whole class. */
export function canonicalKey(a: Arrangement, withMirror = false): string {
  const images = ROTATIONS.map((r) => apply(r, a));
  if (withMirror) images.push(...ROTATIONS.map((r) => apply(r, apply(MIRROR, a))));
  return images.map(keyOf).sort()[0]!;
}

export function isChiral(a: Arrangement): boolean {
  return canonicalKey(a) !== canonicalKey(apply(MIRROR, a));
}

export type ComplexTypeId = "ma4b2" | "ma3b3" | "ma2b2-square" | "maa3" | "maa2b2";
export const COMPLEX_TYPE_ORDER: readonly ComplexTypeId[] = ["ma4b2", "ma3b3", "ma2b2-square", "maa3", "maa2b2"];
export const COMPLEX_TYPE_LABELS: Record<ComplexTypeId, string> = {
  ma4b2: "[MA₄B₂], octahedral",
  ma3b3: "[MA₃B₃], octahedral",
  "ma2b2-square": "[MA₂B₂], square planar",
  maa3: "[M(AA)₃], octahedral",
  maa2b2: "[M(AA)₂B₂], octahedral",
};

function subsets(items: readonly number[], k: number): number[][] {
  if (k === 0) return [[]];
  if (items.length < k) return [];
  const [first, ...rest] = items;
  return [...subsets(rest, k - 1).map((s) => [first!, ...s]), ...subsets(rest, k)];
}

/** Ways to pair up these sites so that each pair is cis (a chelate cannot span opposite corners). */
function cisPairings(sites: readonly number[]): [number, number][][] {
  if (sites.length === 0) return [[]];
  const [first, ...rest] = sites;
  return rest.flatMap((partner) => {
    if (OPPOSITE[first!] === partner) return [];
    return cisPairings(rest.filter((s) => s !== partner)).map((more) => [[first!, partner] as [number, number], ...more]);
  });
}

/** Every arrangement of a complex type's ligands. */
export function arrangementsOf(type: ComplexTypeId): Arrangement[] {
  const all = [0, 1, 2, 3, 4, 5];
  const withB = (b: number[], chelates: [number, number][] = [], empty: number[] = []): Arrangement => ({
    sites: all.map((s) => (empty.includes(s) ? "·" : b.includes(s) ? "B" : "A")),
    chelates,
  });
  switch (type) {
    case "ma4b2":
      return subsets(all, 2).map((b) => withB(b));
    case "ma3b3":
      return subsets(all, 3).map((b) => withB(b));
    case "ma2b2-square":
      return subsets([0, 1, 2, 3], 2).map((b) => withB(b, [], [4, 5]));
    case "maa3":
      return cisPairings(all).map((pairs) => withB([], pairs));
    case "maa2b2":
      return subsets(all, 2).flatMap((b) => cisPairings(all.filter((s) => !b.includes(s))).map((pairs) => withB(b, pairs)));
  }
}

export interface StereoClass {
  /** A representative arrangement to draw. */
  arrangement: Arrangement;
  key: string;
  geometricKey: string;
  chiral: boolean;
}

/** The distinct stereoisomers of a type, grouped so that mirror-image pairs sit together. */
export function stereoClasses(type: ComplexTypeId): StereoClass[] {
  const byKey = new Map<string, StereoClass>();
  for (const a of arrangementsOf(type)) {
    const key = canonicalKey(a);
    if (!byKey.has(key)) byKey.set(key, { arrangement: a, key, geometricKey: canonicalKey(a, true), chiral: isChiral(a) });
  }
  return [...byKey.values()].sort((x, y) => x.geometricKey.localeCompare(y.geometricKey) || x.key.localeCompare(y.key));
}

export const ARRANGEMENT_NAMES = ["", "cis", "trans", "fac", "mer"] as const;

/** cis/trans for two B, fac/mer for three; "" when B is not what distinguishes the isomers. */
export function arrangementName(type: ComplexTypeId, a: Arrangement): (typeof ARRANGEMENT_NAMES)[number] {
  const b = a.sites.flatMap((s, i) => (s === "B" ? [i] : []));
  const hasOpposite = b.some((i) => b.includes(OPPOSITE[i]!));
  if (type === "ma3b3") return hasOpposite ? "mer" : "fac";
  if (b.length === 2) return hasOpposite ? "trans" : "cis";
  return "";
}

// ── The model ─────────────────────────────────────────────────────────────────

export type IsomersParams = { compound: CompoundId; type: ComplexTypeId };

export interface IsomersState {
  /** Which stereoisomer is shown. */
  readonly isomer: number;
  readonly clock: number;
}

export type IsomersResults = {
  compound: number;
  oxidationState: number;
  coordinationNumber: number;
  complexCharge: number;
  anionic: number;
  type: number;
  isomer: number;
  stereoCount: number;
  geometricCount: number;
  chiral: number;
  arrangement: number;
  /** 1 or 2 for the two members of a mirror-image pair; 0 when not chiral. */
  enantiomer: number;
};

const CLASSES: Record<ComplexTypeId, StereoClass[]> = Object.fromEntries(COMPLEX_TYPE_ORDER.map((t) => [t, stereoClasses(t)])) as Record<ComplexTypeId, StereoClass[]>;

export function classesOf(type: ComplexTypeId): readonly StereoClass[] {
  return CLASSES[type] ?? CLASSES.ma4b2;
}

const OUTPUTS = [
  "compound", "oxidationState", "coordinationNumber", "complexCharge", "anionic", "type", "isomer",
  "stereoCount", "geometricCount", "chiral", "arrangement", "enantiomer",
] as const satisfies readonly (keyof IsomersResults)[];

const MOVE_EVERY = 1.2;

export const isomersModel: SimulationModel<IsomersState, IsomersParams, IsomersResults> = {
  id: "isomers",
  defaultParams: { compound: "hexaamminecobalt", type: "ma4b2" },
  outputs: OUTPUTS,
  stateVariables: ["isomer"],

  initialize() {
    return { isomer: 0, clock: 0 };
  },

  /** Play shows each isomer in turn. */
  advance(state, dt, params) {
    const clock = state.clock + dt;
    if (clock < MOVE_EVERY) return { ...state, clock };
    return { isomer: (Math.round(state.isomer) + 1) % classesOf(params.type).length, clock: 0 };
  },

  step(state, params, sign) {
    const n = classesOf(params.type).length;
    return { isomer: (((Math.round(state.isomer) + sign) % n) + n) % n, clock: 0 };
  },

  derive(state, params) {
    const compound = COMPOUNDS[params.compound] ?? COMPOUNDS.hexaamminecobalt;
    const classes = classesOf(params.type);
    const i = Math.min(classes.length - 1, Math.max(0, Math.round(state.isomer)));
    const cls = classes[i]!;
    const geometric = [...new Set(classes.map((c) => c.geometricKey))];
    const partners = classes.filter((c) => c.geometricKey === cls.geometricKey);
    const charge = complexCharge(compound);
    return {
      compound: Math.max(0, COMPOUND_ORDER.indexOf(params.compound)),
      oxidationState: metalOxidationState(compound),
      coordinationNumber: coordinationNumber(compound),
      complexCharge: charge,
      anionic: charge < 0 ? 1 : 0,
      type: Math.max(0, COMPLEX_TYPE_ORDER.indexOf(params.type)),
      isomer: i,
      stereoCount: classes.length,
      geometricCount: geometric.length,
      chiral: cls.chiral ? 1 : 0,
      arrangement: ARRANGEMENT_NAMES.indexOf(arrangementName(params.type, cls.arrangement)),
      enantiomer: cls.chiral ? partners.indexOf(cls) + 1 : 0,
    };
  },

  getVariable(state, id) {
    return id === "isomer" ? state.isomer : undefined;
  },

  setVariable(state, id, value) {
    return id === "isomer" ? { isomer: Math.max(0, Math.round(value)), clock: 0 } : state;
  },
};
