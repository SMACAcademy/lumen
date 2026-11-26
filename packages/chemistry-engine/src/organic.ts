import type { SimulationModel } from "@ise/science-engine";

/**
 * Organic chemistry: some basic principles (NCERT class 11, chapter 8).
 *
 * Naming. A small builder — a chain of carbons with at most one C=C or C≡C,
 * one functional group (–OH, =O or –COOH) and up to three alkyl branches
 * (two methyls, one ethyl) — and a namer that follows IUPAC's rules as
 * NCERT teaches them (the 1979/1993 recommendations):
 *
 *   the parent chain holds the most principal groups, then the most multiple
 *   bonds, then the most carbons;
 *   it is numbered for the lowest locants to the principal group (suffix),
 *   then to the multiple bonds, then to the prefixes all together, and
 *   finally to the prefix cited first;
 *   prefixes go in alphabetical order (di-, tri- ignored), and the suffix is
 *   the group highest in priority: –COOH > –CHO > >C=O > –OH.
 *
 * The namer is general for open chains (any tree of carbons carrying –OH and
 * =O): the builder only ever asks it simple questions, but because it picks
 * the parent chain itself, a methyl put on C1 or an ethyl on C2 is renamed
 * correctly (2-ethylbutane is really 3-methylpentane). Rings, ethers inside a
 * chain and stereodescriptors (cis/trans, E/Z, R/S) are outside it: an alkene
 * that has cis and trans forms is named without the prefix, and flagged.
 *
 * Isomers: NCERT's formulae with their isomers listed and the relation
 * between any two worked out by rule — chain, position, functional group,
 * metamerism, or geometrical (cis/trans).
 *
 * Electronic effects: measured pKa values (298 K) of halogen-substituted
 * acids for the inductive effect; the +R/−R and ±I character of common
 * groups; α-hydrogens for hyperconjugation.
 *
 * Reactive intermediates: carbocations, free radicals and carbanions, methyl
 * to 3°: shape, hybridisation, α-H and stability order.
 *
 * Paper chromatography: three dyes with fixed Rf values (illustrative), and
 * a solvent front that climbs the paper.
 */

// ── Structures ────────────────────────────────────────────────────────────────

export interface OrganicCarbon {
  /** Number of –OH groups on this carbon. */
  oh: number;
  /** Whether it carries =O. */
  oxo: boolean;
}

export interface OrganicBond {
  a: number;
  b: number;
  order: 1 | 2 | 3;
}

/** An open chain of carbons (a tree) with –OH and =O on them. Hydrogens are implicit. */
export interface OrganicGraph {
  carbons: OrganicCarbon[];
  bonds: OrganicBond[];
}

/**
 * A drawing description: main-chain atoms left to right, bond orders along
 * it, and side branches. The renderer's shared molecule helper (`chainMolecule`)
 * takes exactly this shape; atom indices run main chain first, then each
 * branch's atoms in the order listed.
 */
export interface OrganicSketch {
  atoms: string[];
  /** Order of the bond from chain atom i to i + 1 (default 1). */
  orders?: number[];
  branches?: { at: number; atoms: string[]; order?: number }[];
  /** Draw the chain bond i → i + 1 (a double bond) with its neighbours cis. */
  cisAt?: number;
}

export type OrganicGroupClass = "acid" | "aldehyde" | "ketone" | "alcohol";

/** Priority for the suffix: the highest present names the compound. */
export const ORGANIC_GROUP_PRIORITY: Readonly<Record<OrganicGroupClass, number>> = { acid: 4, aldehyde: 3, ketone: 2, alcohol: 1 };

const SUFFIX: Readonly<Record<OrganicGroupClass, string>> = { acid: "oic acid", aldehyde: "al", ketone: "one", alcohol: "ol" };
const STEMS = ["", "meth", "eth", "prop", "but", "pent", "hex", "hept", "oct", "non", "dec", "undec", "dodec", "tridec", "tetradec"];
const MULTIPLIER = ["", "", "di", "tri", "tetra", "penta", "hexa"];
const MULTIPLIER_COMPLEX = ["", "", "bis", "tris", "tetrakis"];

/** Word stem for a chain of n carbons: 4 → "but". */
export function organicStem(n: number): string {
  const stem = STEMS[n];
  if (!stem) throw new OrganicNamingError(`no stem for a chain of ${n} carbons`);
  return stem;
}

export class OrganicNamingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrganicNamingError";
  }
}

interface Neighbour {
  j: number;
  order: number;
}

function neighbourLists(g: OrganicGraph): Neighbour[][] {
  const nb: Neighbour[][] = g.carbons.map(() => []);
  for (const { a, b, order } of g.bonds) {
    nb[a]!.push({ j: b, order });
    nb[b]!.push({ j: a, order });
  }
  return nb;
}

/** Bonds a carbon makes: to carbon (by order), to –OH, and two for =O. */
function valenceUsed(g: OrganicGraph, nb: Neighbour[][], i: number): number {
  const c = g.carbons[i]!;
  return nb[i]!.reduce((s, n) => s + n.order, 0) + c.oh + (c.oxo ? 2 : 0);
}

/** The functional group a carbon carries, if any. –COOH and –CHO are terminal carbons. */
function groupClass(g: OrganicGraph, nb: Neighbour[][], i: number): OrganicGroupClass | null {
  const c = g.carbons[i]!;
  if (c.oxo && c.oh > 0) return "acid";
  if (c.oxo) return nb[i]!.length <= 1 ? "aldehyde" : "ketone";
  if (c.oh > 0) return "alcohol";
  return null;
}

interface Prefix {
  name: string;
  complex: boolean;
  locant: number;
}

const letters = (s: string) => s.replace(/[^a-z]/g, "");
/** Alphabetical key: a simple prefix by its name (di-, tri- ignored); a complex one by its whole name. */
const alphaKey = (p: { name: string; complex: boolean }) => (p.complex ? letters(p.name) : p.name);

interface PrefixGroup {
  name: string;
  complex: boolean;
  locants: number[];
}

function groupPrefixes(prefixes: readonly Prefix[]): PrefixGroup[] {
  const groups = new Map<string, PrefixGroup>();
  for (const p of prefixes) {
    const g = groups.get(p.name) ?? { name: p.name, complex: p.complex, locants: [] };
    g.locants.push(p.locant);
    groups.set(p.name, g);
  }
  return [...groups.values()]
    .map((g) => ({ ...g, locants: [...g.locants].sort((a, b) => a - b) }))
    .sort((a, b) => (alphaKey(a) < alphaKey(b) ? -1 : alphaKey(a) > alphaKey(b) ? 1 : a.name < b.name ? -1 : 1));
}

function prefixText(groups: readonly PrefixGroup[]): string {
  return groups
    .map((g) => {
      const count = g.locants.length;
      const mult = (g.complex ? MULTIPLIER_COMPLEX : MULTIPLIER)[count] ?? "";
      return `${g.locants.join(",")}-${mult}${g.complex ? `(${g.name})` : g.name}`;
    })
    .join("-");
}

function compareLists(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return a.length - b.length;
}

const sorted = (xs: readonly number[]) => [...xs].sort((a, b) => a - b);

/** Locants in citation order: each prefix group's locants, groups alphabetical. */
const citation = (prefixes: readonly Prefix[]) => groupPrefixes(prefixes).flatMap((g) => g.locants);

/** The unique path from u to v in a tree. */
function treePath(nb: Neighbour[][], u: number, v: number): number[] {
  const parent = new Map<number, number>([[u, -1]]);
  const queue = [u];
  while (queue.length > 0) {
    const x = queue.shift()!;
    if (x === v) break;
    for (const { j } of nb[x]!) {
      if (!parent.has(j)) {
        parent.set(j, x);
        queue.push(j);
      }
    }
  }
  const path: number[] = [];
  for (let x = v; x !== -1; x = parent.get(x)!) path.push(x);
  return path.reverse();
}

/** Every path from `root` away from `from` that ends at a leaf. */
function pathsFrom(nb: Neighbour[][], root: number, from: number): number[][] {
  const out: number[][] = [];
  const walk = (path: number[], prev: number) => {
    const here = path[path.length - 1]!;
    const next = nb[here]!.filter((n) => n.j !== prev);
    if (next.length === 0) out.push(path);
    for (const n of next) walk([...path, n.j], here);
  };
  walk([root], from);
  return out;
}

/** Prefixes for everything hanging off a chain: alkyl branches, and groups that are not the suffix. */
function chainPrefixes(g: OrganicGraph, nb: Neighbour[][], path: readonly number[], principal: OrganicGroupClass | null, parent = -1): Prefix[] {
  const inChain = new Set(path);
  if (parent >= 0) inChain.add(parent);
  const prefixes: Prefix[] = [];
  path.forEach((atom, k) => {
    const locant = k + 1;
    for (const n of nb[atom]!) {
      if (inChain.has(n.j)) continue;
      if (n.order !== 1) throw new OrganicNamingError("a multiple bond off the parent chain is not covered");
      const sub = nameSubstituent(g, nb, n.j, atom);
      prefixes.push({ ...sub, locant });
    }
    const cls = groupClass(g, nb, atom);
    if (!cls || cls === principal) return;
    if (cls === "alcohol") for (let i = 0; i < g.carbons[atom]!.oh; i++) prefixes.push({ name: "hydroxy", complex: false, locant });
    else if (cls === "ketone" || cls === "aldehyde") prefixes.push({ name: "oxo", complex: false, locant });
    else throw new OrganicNamingError("a second –COOH as a prefix is not covered");
  });
  return prefixes;
}

/**
 * Name an alkyl branch: its longest chain counted from the carbon that
 * joins the parent (C1), with its own branches as prefixes —
 * "1-methylethyl" for isopropyl, "1,1-dimethylethyl" for tert-butyl.
 */
function nameSubstituent(g: OrganicGraph, nb: Neighbour[][], root: number, from: number): { name: string; complex: boolean } {
  let best: { path: number[]; prefixes: Prefix[] } | null = null;
  for (const path of pathsFrom(nb, root, from)) {
    for (let k = 0; k + 1 < path.length; k++) {
      if (nb[path[k]!]!.find((n) => n.j === path[k + 1])!.order !== 1) throw new OrganicNamingError("an unsaturated branch is not covered");
    }
    if (groupClass(g, nb, path[0]!) === "acid") throw new OrganicNamingError("a –COOH on a branch is not covered");
    const own = chainPrefixes(g, nb, path, null, from);
    const candidate = { path, prefixes: own };
    if (!best) {
      best = candidate;
      continue;
    }
    const order =
      best.path.length - path.length ||
      best.prefixes.length - own.length ||
      compareLists(sorted(own.map((p) => p.locant)), sorted(best.prefixes.map((p) => p.locant))) ||
      compareLists(citation(own), citation(best.prefixes));
    if (order < 0) best = candidate;
  }
  const chosen = best!;
  const groups = groupPrefixes(chosen.prefixes);
  return { name: `${prefixText(groups)}${organicStem(chosen.path.length)}yl`, complex: groups.length > 0 };
}

export interface OrganicName {
  name: string;
  /** Carbon indices of the parent chain, C1 first. */
  chain: number[];
  principal: OrganicGroupClass | null;
  principalLocants: number[];
  doubleLocants: number[];
  tripleLocants: number[];
  /** Prefixes grouped and in the order they are written. */
  prefixes: PrefixGroup[];
}

interface ChainCandidate {
  path: number[];
  principalLocants: number[];
  doubleLocants: number[];
  tripleLocants: number[];
  multipleLocants: number[];
  prefixes: Prefix[];
}

function compareCandidates(x: ChainCandidate, y: ChainCandidate): number {
  return (
    y.principalLocants.length - x.principalLocants.length ||
    y.multipleLocants.length - x.multipleLocants.length ||
    y.path.length - x.path.length ||
    y.doubleLocants.length - x.doubleLocants.length ||
    compareLists(x.principalLocants, y.principalLocants) ||
    compareLists(x.multipleLocants, y.multipleLocants) ||
    compareLists(x.doubleLocants, y.doubleLocants) ||
    y.prefixes.length - x.prefixes.length ||
    compareLists(sorted(x.prefixes.map((p) => p.locant)), sorted(y.prefixes.map((p) => p.locant))) ||
    compareLists(citation(x.prefixes), citation(y.prefixes))
  );
}

/** Whether every carbon has at most four bonds. */
export function organicValenceOk(g: OrganicGraph): boolean {
  const nb = neighbourLists(g);
  return g.carbons.every((_, i) => valenceUsed(g, nb, i) <= 4);
}

/** The IUPAC name of an open-chain compound, with the parent chain and its locants. Throws OrganicNamingError outside its scope. */
export function nameOrganic(g: OrganicGraph): OrganicName {
  const n = g.carbons.length;
  if (n === 0) throw new OrganicNamingError("no carbons");
  if (g.bonds.length !== n - 1) throw new OrganicNamingError("only open chains are covered");
  const nb = neighbourLists(g);
  for (let i = 0; i < n; i++) if (valenceUsed(g, nb, i) > 4) throw new OrganicNamingError(`carbon ${i} has more than four bonds`);

  let principal: OrganicGroupClass | null = null;
  for (let i = 0; i < n; i++) {
    const cls = groupClass(g, nb, i);
    if (cls && (!principal || ORGANIC_GROUP_PRIORITY[cls] > ORGANIC_GROUP_PRIORITY[principal])) principal = cls;
  }

  const leaves = g.carbons.map((_, i) => i).filter((i) => nb[i]!.length <= 1);
  const paths: number[][] = n === 1 ? [[0]] : leaves.flatMap((u) => leaves.filter((v) => v !== u).map((v) => treePath(nb, u, v)));

  const candidates: ChainCandidate[] = [];
  for (const path of paths) {
    const principalLocants: number[] = [];
    const doubleLocants: number[] = [];
    const tripleLocants: number[] = [];
    path.forEach((atom, k) => {
      if (principal && groupClass(g, nb, atom) === principal) {
        const times = principal === "alcohol" ? g.carbons[atom]!.oh : 1;
        for (let t = 0; t < times; t++) principalLocants.push(k + 1);
      }
      if (k + 1 < path.length) {
        const order = nb[atom]!.find((x) => x.j === path[k + 1])!.order;
        if (order === 2) doubleLocants.push(k + 1);
        if (order === 3) tripleLocants.push(k + 1);
      }
    });
    const candidate: ChainCandidate = {
      path,
      principalLocants,
      doubleLocants,
      tripleLocants,
      multipleLocants: sorted([...doubleLocants, ...tripleLocants]),
      prefixes: [],
    };
    candidates.push(candidate);
  }
  // Rank on the chain's own features first; only the survivors need their branches named
  // (a losing chain may leave a double bond on a branch, which the namer does not cover).
  const structural = (x: ChainCandidate, y: ChainCandidate) => compareCandidates({ ...x, prefixes: [] }, { ...y, prefixes: [] });
  const top = candidates.reduce((b, c) => (structural(c, b) < 0 ? c : b));
  let best: ChainCandidate | null = null;
  for (const candidate of candidates.filter((c) => structural(c, top) === 0)) {
    candidate.prefixes = chainPrefixes(g, nb, candidate.path, principal);
    if (!best || compareCandidates(candidate, best) < 0) best = candidate;
  }
  const chosen = best!;

  const multiples = g.bonds.filter((b) => b.order > 1).length;
  if (chosen.multipleLocants.length !== multiples) throw new OrganicNamingError("a multiple bond off the parent chain is not covered");
  const principalCount = principal
    ? g.carbons.reduce((s, _, i) => s + (groupClass(g, nb, i) === principal ? (principal === "alcohol" ? g.carbons[i]!.oh : 1) : 0), 0)
    : 0;
  if (chosen.principalLocants.length !== principalCount) throw new OrganicNamingError("principal groups off the parent chain are not covered");

  const length = chosen.path.length;
  const groups = groupPrefixes(chosen.prefixes);
  const name = prefixText(groups) + parentName(length, chosen.doubleLocants, chosen.tripleLocants, principal, chosen.principalLocants);
  return {
    name,
    chain: chosen.path,
    principal,
    principalLocants: chosen.principalLocants,
    doubleLocants: chosen.doubleLocants,
    tripleLocants: chosen.tripleLocants,
    prefixes: groups,
  };
}

/**
 * The parent: stem, unsaturation and suffix, with locants just before the
 * part they number ("pent-4-en-2-ol"). Locants are left out where only one
 * position exists — a one- or two-carbon chain with one such feature
 * (ethene, ethanol) — and for the terminal –CHO and –COOH, always C1.
 * The final "e" of -ane/-ene/-yne goes before a suffix starting with a vowel.
 */
function parentName(length: number, doubles: readonly number[], triples: readonly number[], principal: OrganicGroupClass | null, principalLocants: readonly number[]): string {
  const locants = (xs: readonly number[]) => (length <= 2 && xs.length === 1 ? "" : `-${xs.join(",")}-`);
  let base = organicStem(length);
  if (doubles.length === 0 && triples.length === 0) base += "an";
  else {
    if (doubles.length > 1 || triples.length > 1) base += "a";
    if (doubles.length > 0) base += `${locants(doubles)}${MULTIPLIER[doubles.length]}en`;
    if (triples.length > 0) base += `${locants(triples)}${MULTIPLIER[triples.length]}yn`;
  }
  if (!principal) return `${base}e`;
  const suffix = `${MULTIPLIER[principalLocants.length]}${SUFFIX[principal]}`;
  const terminal = principal === "acid" || principal === "aldehyde";
  const e = /^[aeiou]/.test(suffix) ? "" : "e";
  return terminal ? `${base}${e}${suffix}` : `${base}${e}${locants(principalLocants)}${suffix}`;
}

/** Names NCERT often writes without a locant, because only one position is possible. */
const SHORT_NAMES: Readonly<Record<string, string>> = {
  "prop-1-ene": "propene",
  "prop-1-yne": "propyne",
  "propan-2-one": "propanone",
  "butan-2-one": "butanone",
  "2-methylprop-1-ene": "2-methylpropene",
};

/** The locant-free form NCERT also uses, if there is one. */
export function organicShortName(name: string): string | null {
  return SHORT_NAMES[name] ?? null;
}

export interface OrganicFormula {
  C: number;
  H: number;
  O: number;
}

export function organicFormula(g: OrganicGraph): OrganicFormula {
  const nb = neighbourLists(g);
  let H = 0;
  let O = 0;
  g.carbons.forEach((c, i) => {
    H += Math.max(0, 4 - valenceUsed(g, nb, i)) + c.oh;
    O += c.oh + (c.oxo ? 1 : 0);
  });
  return { C: g.carbons.length, H, O };
}

const SUBSCRIPT = "₀₁₂₃₄₅₆₇₈₉";
const sub = (n: number) => String(n).split("").map((d) => SUBSCRIPT[Number(d)]).join("");
/** "C₄H₁₀O". */
export function organicFormulaText(f: OrganicFormula): string {
  const part = (el: string, n: number) => (n === 0 ? "" : n === 1 ? el : `${el}${sub(n)}`);
  return `${part("C", f.C)}${part("H", f.H)}${part("O", f.O)}`;
}

/** Molar mass, g/mol (C 12.01, H 1.008, O 16.00). */
export function organicMolarMass(f: OrganicFormula): number {
  return f.C * 12.01 + f.H * 1.008 + f.O * 16.0;
}

function canonicalBranch(g: OrganicGraph, nb: Neighbour[][], i: number, from: number): string {
  const c = g.carbons[i]!;
  const children = nb[i]!.filter((n) => n.j !== from).map((n) => `${n.order}${canonicalBranch(g, nb, n.j, i)}`).sort();
  return `C${"(OH)".repeat(c.oh)}${c.oxo ? "(=O)" : ""}[${children.join(",")}]`;
}

/** Whether some C=C carries two different groups on each of its carbons — so cis and trans forms exist. */
export function organicHasCisTrans(g: OrganicGraph): boolean {
  const nb = neighbourLists(g);
  const twoDifferent = (atom: number, partner: number) => {
    const groups = nb[atom]!.filter((n) => n.j !== partner).map((n) => canonicalBranch(g, nb, n.j, atom));
    const c = g.carbons[atom]!;
    for (let k = 0; k < c.oh; k++) groups.push("OH");
    for (let k = 0; k < 4 - valenceUsed(g, nb, atom); k++) groups.push("H");
    return groups.length === 2 && groups[0] !== groups[1];
  };
  return g.bonds.some((b) => b.order === 2 && twoDifferent(b.a, b.b) && twoDifferent(b.b, b.a));
}

/**
 * Carbons and their –OH / =O from a sketch of C and O atoms. Oxygen bonded
 * to one carbon becomes –OH (single) or =O (double); an oxygen between two
 * carbons is an ether, which the namer does not cover.
 */
export function organicGraphFromSketch(sketch: OrganicSketch): OrganicGraph {
  const atoms = [...sketch.atoms, ...(sketch.branches ?? []).flatMap((b) => b.atoms)];
  const links: { a: number; b: number; order: number }[] = [];
  sketch.atoms.forEach((_, i) => {
    if (i + 1 < sketch.atoms.length) links.push({ a: i, b: i + 1, order: sketch.orders?.[i] ?? 1 });
  });
  let next = sketch.atoms.length;
  for (const branch of sketch.branches ?? []) {
    branch.atoms.forEach((_, k) => {
      links.push({ a: k === 0 ? branch.at : next + k - 1, b: next + k, order: k === 0 ? (branch.order ?? 1) : 1 });
    });
    next += branch.atoms.length;
  }
  const carbonIndex = new Map<number, number>();
  atoms.forEach((el, i) => {
    if (el === "C") carbonIndex.set(i, carbonIndex.size);
    else if (el !== "O") throw new OrganicNamingError(`element ${el} is not covered`);
  });
  const carbons: OrganicCarbon[] = [...carbonIndex.keys()].map(() => ({ oh: 0, oxo: false }));
  const bonds: OrganicBond[] = [];
  atoms.forEach((el, i) => {
    if (el !== "O") return;
    const touching = links.filter((l) => l.a === i || l.b === i);
    if (touching.length !== 1) throw new OrganicNamingError("an ether oxygen is not covered");
    const l = touching[0]!;
    const c = carbons[carbonIndex.get(l.a === i ? l.b : l.a)!]!;
    if (l.order === 2) c.oxo = true;
    else c.oh += 1;
  });
  for (const l of links) {
    if (carbonIndex.has(l.a) && carbonIndex.has(l.b)) bonds.push({ a: carbonIndex.get(l.a)!, b: carbonIndex.get(l.b)!, order: l.order as 1 | 2 | 3 });
  }
  return { carbons, bonds };
}

// ── The builder ───────────────────────────────────────────────────────────────

export interface OrganicBuild {
  /** Carbons in the chain as drawn, 1–8. */
  chain: number;
  /** 0 none, 1 C=C, 2 C≡C. */
  bond: number;
  /** The multiple bond runs from this carbon to the next. */
  bondAt: number;
  /** 0 none, 1 –OH, 2 =O, 3 –COOH. */
  group: number;
  groupAt: number;
  /** Positions of two methyls and an ethyl on the drawn chain; 0 = none. */
  methyl: number;
  methyl2: number;
  ethyl: number;
}

export const ORGANIC_MAX_CHAIN = 8;

/** Compound classes, by the group that names them. */
export const ORGANIC_CLASSES = ["alkane", "alkene", "alkyne", "alcohol", "aldehyde", "ketone", "carboxylic acid"] as const;

export const ORGANIC_PROBLEMS = [
  "",
  "a carbon would have more than four bonds",
  "=O or –OH on a C=C or C≡C carbon (enols, ketenes) is left out",
  "outside what this namer covers",
] as const;

export interface OrganicBuilt {
  /** The build with every position brought inside the chain. */
  build: OrganicBuild;
  graph: OrganicGraph;
  sketch: OrganicSketch;
  /** Index into ORGANIC_PROBLEMS; 0 means the structure is fine. */
  problem: number;
  /** Drawn locant of the carbon at fault, or 0. */
  problemAt: number;
  named: OrganicName | null;
}

const round = (v: number) => Math.round(Number.isFinite(v) ? v : 0);
const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, round(v)));

/** Bring a build's numbers into range: positions inside the chain, a multiple bond only between two carbons. */
export function organicNormalise(b: OrganicBuild): OrganicBuild {
  const chain = clampInt(b.chain, 1, ORGANIC_MAX_CHAIN);
  const bond = chain < 2 ? 0 : clampInt(b.bond, 0, 2);
  const pos = (v: number) => clampInt(v, 0, chain);
  return {
    chain,
    bond,
    bondAt: clampInt(b.bondAt, 1, Math.max(1, chain - 1)),
    group: clampInt(b.group, 0, 3),
    groupAt: clampInt(b.groupAt, 1, chain),
    methyl: pos(b.methyl),
    methyl2: pos(b.methyl2),
    ethyl: pos(b.ethyl),
  };
}

/** Build the molecule, check it, and name it. */
export function organicBuild(input: OrganicBuild): OrganicBuilt {
  const build = organicNormalise(input);
  const { chain } = build;
  const carbons: OrganicCarbon[] = Array.from({ length: chain }, () => ({ oh: 0, oxo: false }));
  const bonds: OrganicBond[] = [];
  for (let i = 0; i + 1 < chain; i++) {
    bonds.push({ a: i, b: i + 1, order: build.bond > 0 && build.bondAt === i + 1 ? ((build.bond + 1) as 2 | 3) : 1 });
  }
  const branches: NonNullable<OrganicSketch["branches"]> = [];
  const addAlkyl = (at: number, length: number) => {
    if (at === 0) return;
    let prev = at - 1;
    for (let k = 0; k < length; k++) {
      carbons.push({ oh: 0, oxo: false });
      bonds.push({ a: prev, b: carbons.length - 1, order: 1 });
      prev = carbons.length - 1;
    }
    branches.push({ at: at - 1, atoms: Array.from({ length }, () => "C") });
  };
  addAlkyl(build.methyl, 1);
  addAlkyl(build.methyl2, 1);
  addAlkyl(build.ethyl, 2);
  if (build.group > 0) {
    const c = carbons[build.groupAt - 1]!;
    if (build.group === 1) {
      c.oh += 1;
      branches.push({ at: build.groupAt - 1, atoms: ["O"] });
    } else {
      c.oxo = true;
      branches.push({ at: build.groupAt - 1, atoms: ["O"], order: 2 });
      if (build.group === 3) {
        c.oh += 1;
        branches.push({ at: build.groupAt - 1, atoms: ["O"] });
      }
    }
  }
  const graph: OrganicGraph = { carbons, bonds };
  const sketch: OrganicSketch = {
    atoms: Array.from({ length: chain }, () => "C"),
    orders: bonds.slice(0, chain - 1).map((b) => b.order),
    branches,
  };

  const nb = neighbourLists(graph);
  for (let i = 0; i < chain; i++) {
    if (valenceUsed(graph, nb, i) > 4) return { build, graph, sketch, problem: 1, problemAt: i + 1, named: null };
  }
  for (let i = 0; i < chain; i++) {
    const c = carbons[i]!;
    if ((c.oh > 0 || c.oxo) && nb[i]!.some((n) => n.order > 1)) return { build, graph, sketch, problem: 2, problemAt: i + 1, named: null };
  }
  try {
    return { build, graph, sketch, problem: 0, problemAt: 0, named: nameOrganic(graph) };
  } catch (e) {
    if (e instanceof OrganicNamingError) return { build, graph, sketch, problem: 3, problemAt: 0, named: null };
    throw e;
  }
}

/** The compound class (index into ORGANIC_CLASSES) of a named structure. */
export function organicClassOf(named: OrganicName): number {
  switch (named.principal) {
    case "alcohol": return 3;
    case "aldehyde": return 4;
    case "ketone": return 5;
    case "acid": return 6;
    default: return named.tripleLocants.length > 0 ? 2 : named.doubleLocants.length > 0 ? 1 : 0;
  }
}

// ── Isomers ───────────────────────────────────────────────────────────────────

export type OrganicIsomerClass = "alkane" | "alkene" | "alcohol" | "ether" | "aldehyde" | "ketone";

export interface OrganicIsomer {
  name: string;
  condensed: string;
  cls: OrganicIsomerClass;
  /** Carbon skeleton: same string, same skeleton. */
  skeleton: string;
  /** Connectivity: same string, same structure (differing only in 3D arrangement). */
  constitution: string;
  /** For ethers and ketones: carbons on each side of the group. */
  partition?: string;
  sketch: OrganicSketch;
}

export interface OrganicIsomerSet {
  formula: string;
  /** Structural isomers of this formula in all (rings included); 0 when not counted here. */
  structural: number;
  /** One line on what is listed. */
  note: string;
  isomers: OrganicIsomer[];
}

export type OrganicFormulaId = "c4h10" | "c5h12" | "c4h8" | "c2h6o" | "c3h8o" | "c3h6o" | "c4h10o";
export const ORGANIC_FORMULA_ORDER: readonly OrganicFormulaId[] = ["c4h10", "c5h12", "c4h8", "c2h6o", "c3h8o", "c3h6o", "c4h10o"];

const chainOf = (atoms: string, extra: Omit<OrganicSketch, "atoms"> = {}): OrganicSketch => ({ atoms: atoms.split(""), ...extra });
const methylAt = (at: number) => ({ at, atoms: ["C"] });
const ohAt = (at: number) => ({ at, atoms: ["O"] });
const oxoAt = (at: number) => ({ at, atoms: ["O"], order: 2 });

export const ORGANIC_ISOMERS: Readonly<Record<OrganicFormulaId, OrganicIsomerSet>> = {
  c4h10: {
    formula: "C₄H₁₀",
    structural: 2,
    note: "both shown",
    isomers: [
      { name: "butane", condensed: "CH₃CH₂CH₂CH₃", cls: "alkane", skeleton: "C4", constitution: "butane", sketch: chainOf("CCCC") },
      { name: "2-methylpropane", condensed: "(CH₃)₃CH", cls: "alkane", skeleton: "C3(C)", constitution: "2-methylpropane", sketch: chainOf("CCC", { branches: [methylAt(1)] }) },
    ],
  },
  c5h12: {
    formula: "C₅H₁₂",
    structural: 3,
    note: "all three shown",
    isomers: [
      { name: "pentane", condensed: "CH₃(CH₂)₃CH₃", cls: "alkane", skeleton: "C5", constitution: "pentane", sketch: chainOf("CCCCC") },
      { name: "2-methylbutane", condensed: "(CH₃)₂CHCH₂CH₃", cls: "alkane", skeleton: "C4(C)", constitution: "2-methylbutane", sketch: chainOf("CCCC", { branches: [methylAt(1)] }) },
      { name: "2,2-dimethylpropane", condensed: "C(CH₃)₄", cls: "alkane", skeleton: "C3(C)(C)", constitution: "2,2-dimethylpropane", sketch: chainOf("CCC", { branches: [methylAt(1), methylAt(1)] }) },
    ],
  },
  c4h8: {
    formula: "C₄H₈",
    structural: 5,
    note: "open-chain only; 2 rings omitted",
    isomers: [
      { name: "but-1-ene", condensed: "CH₂=CHCH₂CH₃", cls: "alkene", skeleton: "C4", constitution: "but-1-ene", sketch: chainOf("CCCC", { orders: [2, 1, 1] }) },
      { name: "cis-but-2-ene", condensed: "CH₃CH=CHCH₃ (cis)", cls: "alkene", skeleton: "C4", constitution: "but-2-ene", sketch: chainOf("CCCC", { orders: [1, 2, 1], cisAt: 1 }) },
      { name: "trans-but-2-ene", condensed: "CH₃CH=CHCH₃ (trans)", cls: "alkene", skeleton: "C4", constitution: "but-2-ene", sketch: chainOf("CCCC", { orders: [1, 2, 1] }) },
      { name: "2-methylprop-1-ene", condensed: "(CH₃)₂C=CH₂", cls: "alkene", skeleton: "C3(C)", constitution: "2-methylprop-1-ene", sketch: chainOf("CCC", { orders: [2, 1], branches: [methylAt(1)] }) },
    ],
  },
  c2h6o: {
    formula: "C₂H₆O",
    structural: 2,
    note: "both shown",
    isomers: [
      { name: "ethanol", condensed: "CH₃CH₂OH", cls: "alcohol", skeleton: "C2", constitution: "ethanol", sketch: chainOf("CCO") },
      { name: "methoxymethane", condensed: "CH₃OCH₃", cls: "ether", skeleton: "C1-O-C1", constitution: "methoxymethane", partition: "1,1", sketch: chainOf("COC") },
    ],
  },
  c3h8o: {
    formula: "C₃H₈O",
    structural: 3,
    note: "all three shown",
    isomers: [
      { name: "propan-1-ol", condensed: "CH₃CH₂CH₂OH", cls: "alcohol", skeleton: "C3", constitution: "propan-1-ol", sketch: chainOf("CCCO") },
      { name: "propan-2-ol", condensed: "CH₃CH(OH)CH₃", cls: "alcohol", skeleton: "C3", constitution: "propan-2-ol", sketch: chainOf("CCC", { branches: [ohAt(1)] }) },
      { name: "methoxyethane", condensed: "CH₃OCH₂CH₃", cls: "ether", skeleton: "C1-O-C2", constitution: "methoxyethane", partition: "1,2", sketch: chainOf("COCC") },
    ],
  },
  c3h6o: {
    formula: "C₃H₆O",
    structural: 0,
    note: "the two carbonyl compounds only; others left out",
    isomers: [
      { name: "propanal", condensed: "CH₃CH₂CHO", cls: "aldehyde", skeleton: "C3", constitution: "propanal", sketch: chainOf("CCCO", { orders: [1, 1, 2] }) },
      { name: "propan-2-one", condensed: "CH₃COCH₃", cls: "ketone", skeleton: "C3", constitution: "propan-2-one", partition: "1,1", sketch: chainOf("CCC", { branches: [oxoAt(1)] }) },
    ],
  },
  c4h10o: {
    formula: "C₄H₁₀O",
    structural: 7,
    note: "four alcohols, three ethers",
    isomers: [
      { name: "butan-1-ol", condensed: "CH₃(CH₂)₃OH", cls: "alcohol", skeleton: "C4", constitution: "butan-1-ol", sketch: chainOf("CCCCO") },
      { name: "butan-2-ol", condensed: "CH₃CH(OH)CH₂CH₃", cls: "alcohol", skeleton: "C4", constitution: "butan-2-ol", sketch: chainOf("CCCC", { branches: [ohAt(1)] }) },
      { name: "2-methylpropan-1-ol", condensed: "(CH₃)₂CHCH₂OH", cls: "alcohol", skeleton: "C3(C)", constitution: "2-methylpropan-1-ol", sketch: chainOf("CCCO", { branches: [methylAt(1)] }) },
      { name: "2-methylpropan-2-ol", condensed: "(CH₃)₃COH", cls: "alcohol", skeleton: "C3(C)", constitution: "2-methylpropan-2-ol", sketch: chainOf("CCC", { branches: [ohAt(1), methylAt(1)] }) },
      { name: "1-methoxypropane", condensed: "CH₃OCH₂CH₂CH₃", cls: "ether", skeleton: "C1-O-C3", constitution: "1-methoxypropane", partition: "1,3", sketch: chainOf("COCCC") },
      { name: "2-methoxypropane", condensed: "CH₃OCH(CH₃)₂", cls: "ether", skeleton: "C1-O-C3", constitution: "2-methoxypropane", partition: "1,3", sketch: chainOf("CCC", { branches: [{ at: 1, atoms: ["O", "C"] }] }) },
      { name: "ethoxyethane", condensed: "CH₃CH₂OCH₂CH₃", cls: "ether", skeleton: "C2-O-C2", constitution: "ethoxyethane", partition: "2,2", sketch: chainOf("CCOCC") },
    ],
  },
};

export const ORGANIC_RELATIONS = ["the same compound", "chain isomers", "position isomers", "functional group isomers", "metamers", "geometrical isomers"] as const;

/**
 * How two isomers are related (index into ORGANIC_RELATIONS):
 * same connectivity, different arrangement in space → geometrical;
 * different functional group → functional group isomers;
 * ethers or ketones with different alkyl groups on the two sides → metamers;
 * different carbon skeleton → chain isomers;
 * otherwise the group (or multiple bond) sits elsewhere → position isomers.
 */
export function organicIsomerRelation(a: OrganicIsomer, b: OrganicIsomer): number {
  if (a === b) return 0;
  if (a.constitution === b.constitution) return 5;
  if (a.cls !== b.cls) return 3;
  if (a.partition && b.partition && a.partition !== b.partition) return 4;
  if (a.skeleton !== b.skeleton) return 1;
  return 2;
}

export function organicIsomerSet(id: string): OrganicIsomerSet {
  return ORGANIC_ISOMERS[id as OrganicFormulaId] ?? ORGANIC_ISOMERS.c4h10;
}

// ── Electronic effects ───────────────────────────────────────────────────────

export interface OrganicAcid {
  formula: string;
  name: string;
  /** Measured pKa in water at 298 K. */
  pKa: number;
  halogens: number;
  halogen: "" | "F" | "Cl" | "Br" | "I";
  /** Where the halogen is: 0 none, 1 α (next to –COOH), 2 β, 3 γ. */
  position: number;
  /** Drawn with –COOH on the right: the last chain atom is the carboxyl carbon. */
  sketch: OrganicSketch;
}

const carboxyl = (at: number) => [oxoAt(at), ohAt(at)];
const halo = (el: string, at: number, count = 1) => Array.from({ length: count }, () => ({ at, atoms: [el] }));

/** pKa values from NCERT (class 12, unit 12) for the ethanoic acids; the chlorobutanoic acids are standard data. */
export const ORGANIC_ACIDS: readonly OrganicAcid[] = [
  { formula: "CH₃COOH", name: "ethanoic acid", pKa: 4.76, halogens: 0, halogen: "", position: 0, sketch: { atoms: ["C", "C"], branches: carboxyl(1) } },
  { formula: "ClCH₂COOH", name: "chloroethanoic acid", pKa: 2.86, halogens: 1, halogen: "Cl", position: 1, sketch: { atoms: ["C", "C"], branches: [...halo("Cl", 0), ...carboxyl(1)] } },
  { formula: "Cl₂CHCOOH", name: "dichloroethanoic acid", pKa: 1.26, halogens: 2, halogen: "Cl", position: 1, sketch: { atoms: ["C", "C"], branches: [...halo("Cl", 0, 2), ...carboxyl(1)] } },
  { formula: "Cl₃CCOOH", name: "trichloroethanoic acid", pKa: 0.64, halogens: 3, halogen: "Cl", position: 1, sketch: { atoms: ["C", "C"], branches: [...halo("Cl", 0, 3), ...carboxyl(1)] } },
  { formula: "FCH₂COOH", name: "fluoroethanoic acid", pKa: 2.66, halogens: 1, halogen: "F", position: 1, sketch: { atoms: ["C", "C"], branches: [...halo("F", 0), ...carboxyl(1)] } },
  { formula: "BrCH₂COOH", name: "bromoethanoic acid", pKa: 2.9, halogens: 1, halogen: "Br", position: 1, sketch: { atoms: ["C", "C"], branches: [...halo("Br", 0), ...carboxyl(1)] } },
  { formula: "ICH₂COOH", name: "iodoethanoic acid", pKa: 3.18, halogens: 1, halogen: "I", position: 1, sketch: { atoms: ["C", "C"], branches: [...halo("I", 0), ...carboxyl(1)] } },
  { formula: "CH₃CH₂CH₂COOH", name: "butanoic acid", pKa: 4.82, halogens: 0, halogen: "", position: 0, sketch: { atoms: ["C", "C", "C", "C"], branches: carboxyl(3) } },
  { formula: "CH₃CH₂CHClCOOH", name: "2-chlorobutanoic acid", pKa: 2.86, halogens: 1, halogen: "Cl", position: 1, sketch: { atoms: ["C", "C", "C", "C"], branches: [...halo("Cl", 2), ...carboxyl(3)] } },
  { formula: "CH₃CHClCH₂COOH", name: "3-chlorobutanoic acid", pKa: 4.05, halogens: 1, halogen: "Cl", position: 2, sketch: { atoms: ["C", "C", "C", "C"], branches: [...halo("Cl", 1), ...carboxyl(3)] } },
  { formula: "ClCH₂CH₂CH₂COOH", name: "4-chlorobutanoic acid", pKa: 4.52, halogens: 1, halogen: "Cl", position: 3, sketch: { atoms: ["C", "C", "C", "C"], branches: [...halo("Cl", 0), ...carboxyl(3)] } },
];

/** Ethanoic acid, the yardstick for "how many times stronger". */
export const ORGANIC_ACETIC_PKA = 4.76;

export type OrganicSubstituentId = "nh2" | "oh" | "och3" | "cl" | "ch3" | "no2" | "cn" | "cho" | "cooh";
export const ORGANIC_SUBSTITUENT_ORDER: readonly OrganicSubstituentId[] = ["nh2", "oh", "och3", "cl", "ch3", "no2", "cn", "cho", "cooh"];

export interface OrganicSubstituent {
  label: string;
  name: string;
  /** +1 for +I (pushes electrons along σ bonds), −1 for −I. */
  inductive: number;
  /** +1 for +R (gives electrons to a π system), −1 for −R, 0 for none. */
  resonance: number;
  /** CH₂=CH–X and the contributor the arrows lead to (for –CH₃, the hyperconjugation one). */
  contributor: string;
}

export const ORGANIC_SUBSTITUENTS: Readonly<Record<OrganicSubstituentId, OrganicSubstituent>> = {
  nh2: { label: "–NH₂", name: "amino", inductive: -1, resonance: 1, contributor: "CH₂=CH–NH₂ ⟷ ⁻CH₂–CH=NH₂⁺" },
  oh: { label: "–OH", name: "hydroxy", inductive: -1, resonance: 1, contributor: "CH₂=CH–OH ⟷ ⁻CH₂–CH=OH⁺" },
  och3: { label: "–OCH₃", name: "methoxy", inductive: -1, resonance: 1, contributor: "CH₂=CH–OCH₃ ⟷ ⁻CH₂–CH=O⁺CH₃" },
  cl: { label: "–Cl", name: "chloro", inductive: -1, resonance: 1, contributor: "CH₂=CH–Cl ⟷ ⁻CH₂–CH=Cl⁺" },
  ch3: { label: "–CH₃", name: "methyl", inductive: 1, resonance: 0, contributor: "H–CH₂–CH=CH₂ ⟷ H⁺ CH₂=CH–CH₂⁻" },
  no2: { label: "–NO₂", name: "nitro", inductive: -1, resonance: -1, contributor: "CH₂=CH–NO₂ ⟷ ⁺CH₂–CH=N⁺(O⁻)₂" },
  cn: { label: "–CN", name: "cyano", inductive: -1, resonance: -1, contributor: "CH₂=CH–C≡N ⟷ ⁺CH₂–CH=C=N⁻" },
  cho: { label: "–CHO", name: "formyl", inductive: -1, resonance: -1, contributor: "CH₂=CH–CH=O ⟷ ⁺CH₂–CH=CH–O⁻" },
  cooh: { label: "–COOH", name: "carboxy", inductive: -1, resonance: -1, contributor: "CH₂=CH–COOH ⟷ ⁺CH₂–CH=C(O⁻)OH" },
};

// ── Reactive intermediates ───────────────────────────────────────────────────

export type OrganicSpeciesId = "cation" | "radical" | "anion";
export const ORGANIC_SPECIES_ORDER: readonly OrganicSpeciesId[] = ["cation", "radical", "anion"];

export interface OrganicSpecies {
  name: string;
  /** Charge on the carbon. */
  charge: number;
  /** Electrons in the carbon's valence shell. */
  electrons: number;
  /** 2 for sp², 3 for sp³. */
  hybrid: number;
  shape: string;
  /** Formulae from methyl to 3°. */
  series: readonly [string, string, string, string];
  /** How it forms, in a few words. */
  forms: string;
}

export const ORGANIC_SPECIES: Readonly<Record<OrganicSpeciesId, OrganicSpecies>> = {
  cation: {
    name: "carbocation",
    charge: 1,
    electrons: 6,
    hybrid: 2,
    shape: "trigonal planar, empty p orbital",
    series: ["CH₃⁺", "CH₃CH₂⁺", "(CH₃)₂CH⁺", "(CH₃)₃C⁺"],
    forms: "heterolysis: C–Br → C⁺ + Br⁻",
  },
  radical: {
    name: "free radical",
    charge: 0,
    electrons: 7,
    hybrid: 2,
    shape: "nearly planar, one electron in a p orbital",
    series: ["CH₃•", "CH₃CH₂•", "(CH₃)₂CH•", "(CH₃)₃C•"],
    forms: "homolysis: C–Br → C• + Br•",
  },
  anion: {
    name: "carbanion",
    charge: -1,
    electrons: 8,
    hybrid: 3,
    shape: "pyramidal, a lone pair",
    series: ["CH₃⁻", "CH₃CH₂⁻", "(CH₃)₂CH⁻", "(CH₃)₃C⁻"],
    forms: "heterolysis: C–Z → C⁻ + Z⁺",
  },
};

export const ORGANIC_DEGREES = ["methyl", "1°", "2°", "3°"] as const;

// ── Paper chromatography ─────────────────────────────────────────────────────

/** The three dyes in the ink, and their (illustrative) Rf in this solvent. */
export const ORGANIC_DYES = [
  { name: "A", rf: 0.2 },
  { name: "B", rf: 0.45 },
  { name: "C", rf: 0.75 },
] as const;

/** The paper is 10 cm from base line to top. */
export const ORGANIC_PAPER_CM = 10;

// ── The model ────────────────────────────────────────────────────────────────

export type OrganicParams = {
  formula: OrganicFormulaId;
  /** Index into ORGANIC_ACIDS. */
  acid: number;
  substituent: OrganicSubstituentId;
  species: OrganicSpeciesId;
};

export interface OrganicState extends OrganicBuild {
  /** Isomers A and B shown, by index in the formula's list. */
  isomer: number;
  other: number;
  /** 0 methyl … 3 tertiary. */
  degree: number;
  /** Solvent front above the base line, cm. */
  front: number;
}

export type OrganicResults = {
  chain: number;
  bond: number;
  bondAt: number;
  group: number;
  groupAt: number;
  methyl: number;
  methyl2: number;
  ethyl: number;
  valid: number;
  problem: number;
  problemAt: number;
  parentLength: number;
  compoundClass: number;
  principalPriority: number;
  principalLocant: number;
  bondLocant: number;
  substituentCount: number;
  methylCount: number;
  ethylCount: number;
  locantSum: number;
  chainChanged: number;
  reversed: number;
  carbons: number;
  hydrogens: number;
  oxygens: number;
  molarMass: number;
  cisTrans: number;
  formula: number;
  isomerCount: number;
  structuralTotal: number;
  isomer: number;
  other: number;
  relation: number;
  acid: number;
  pKa: number;
  ka: number;
  relativeStrength: number;
  halogens: number;
  halogenPosition: number;
  substituent: number;
  inductive: number;
  resonance: number;
  species: number;
  degree: number;
  alphaH: number;
  stabilityRank: number;
  electrons: number;
  hybridisation: number;
  charge: number;
  front: number;
  distanceA: number;
  distanceB: number;
  distanceC: number;
  rfA: number;
  rfB: number;
  rfC: number;
};

const OUTPUTS = [
  "chain", "bond", "bondAt", "group", "groupAt", "methyl", "methyl2", "ethyl",
  "valid", "problem", "problemAt", "parentLength", "compoundClass", "principalPriority", "principalLocant", "bondLocant",
  "substituentCount", "methylCount", "ethylCount", "locantSum", "chainChanged", "reversed",
  "carbons", "hydrogens", "oxygens", "molarMass", "cisTrans",
  "formula", "isomerCount", "structuralTotal", "isomer", "other", "relation",
  "acid", "pKa", "ka", "relativeStrength", "halogens", "halogenPosition",
  "substituent", "inductive", "resonance",
  "species", "degree", "alphaH", "stabilityRank", "electrons", "hybridisation", "charge",
  "front", "distanceA", "distanceB", "distanceC", "rfA", "rfB", "rfC",
] as const satisfies readonly (keyof OrganicResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const z = (v: number) => v || 0;

/** The builder part of the results, back as a build — for the renderer. */
export function organicBuildFromResults(r: Readonly<Record<string, unknown>>): OrganicBuild {
  const n = (k: keyof OrganicBuild) => (typeof r[k] === "number" ? (r[k] as number) : 0);
  return { chain: n("chain") || 1, bond: n("bond"), bondAt: n("bondAt") || 1, group: n("group"), groupAt: n("groupAt") || 1, methyl: n("methyl"), methyl2: n("methyl2"), ethyl: n("ethyl") };
}

export function organicAcid(index: number): OrganicAcid {
  return ORGANIC_ACIDS[clampInt(index, 0, ORGANIC_ACIDS.length - 1)]!;
}

export const organicModel: SimulationModel<OrganicState, OrganicParams, OrganicResults> = {
  id: "organic",
  defaultParams: { formula: "c4h10o", acid: 0, substituent: "oh", species: "cation" },
  outputs: OUTPUTS,
  stateVariables: ["chain", "bond", "bondAt", "group", "groupAt", "methyl", "methyl2", "ethyl", "isomer", "other", "degree", "front"],

  initialize() {
    return { chain: 4, bond: 0, bondAt: 1, group: 0, groupAt: 1, methyl: 2, methyl2: 0, ethyl: 0, isomer: 0, other: 1, degree: 3, front: 6 };
  },

  /** Play runs the chromatogram: the solvent front climbs 1.5 cm a second (much faster than real paper). */
  advance(state, dt) {
    return { ...state, front: Math.min(ORGANIC_PAPER_CM, state.front + 1.5 * dt) };
  },

  step(state, _params, sign) {
    return { ...state, front: clamp(Math.round(state.front * 2) / 2 + 0.5 * sign, 0, ORGANIC_PAPER_CM) };
  },

  derive(state, params) {
    const built = organicBuild(state);
    const named = built.named;
    const formula = organicFormula(built.graph);
    const prefixes = named?.prefixes ?? [];
    const count = (name: string) => prefixes.find((p) => p.name === name)?.locants.length ?? 0;
    const drawn = built.build.chain;
    const chainChanged = named ? (named.chain.length !== drawn || named.chain.some((i) => i >= drawn) ? 1 : 0) : 0;

    const set = organicIsomerSet(params.formula);
    const last = set.isomers.length - 1;
    const isomer = clampInt(state.isomer, 0, last);
    const other = clampInt(state.other, 0, last);

    const acid = organicAcid(params.acid);
    const substituent = ORGANIC_SUBSTITUENTS[params.substituent] ?? ORGANIC_SUBSTITUENTS.oh;
    const speciesId = ORGANIC_SPECIES[params.species] ? params.species : "cation";
    const species = ORGANIC_SPECIES[speciesId];
    const degree = clampInt(state.degree, 0, 3);
    const front = clamp(state.front, 0, ORGANIC_PAPER_CM);

    return {
      ...built.build,
      valid: named ? 1 : 0,
      problem: built.problem,
      problemAt: built.problemAt,
      parentLength: named?.chain.length ?? 0,
      compoundClass: named ? organicClassOf(named) : 0,
      principalPriority: named?.principal ? ORGANIC_GROUP_PRIORITY[named.principal] : 0,
      principalLocant: named?.principalLocants[0] ?? 0,
      bondLocant: named ? (sorted([...named.doubleLocants, ...named.tripleLocants])[0] ?? 0) : 0,
      substituentCount: prefixes.reduce((s, p) => s + p.locants.length, 0),
      methylCount: count("methyl"),
      ethylCount: count("ethyl"),
      locantSum: prefixes.reduce((s, p) => s + p.locants.reduce((a, b) => a + b, 0), 0),
      chainChanged,
      reversed: named && !chainChanged && drawn > 1 && named.chain[0] === drawn - 1 ? 1 : 0,
      carbons: formula.C,
      hydrogens: formula.H,
      oxygens: formula.O,
      molarMass: organicMolarMass(formula),
      cisTrans: named && organicHasCisTrans(built.graph) ? 1 : 0,

      formula: Math.max(0, ORGANIC_FORMULA_ORDER.indexOf(params.formula)),
      isomerCount: set.isomers.length,
      structuralTotal: set.structural,
      isomer,
      other,
      relation: organicIsomerRelation(set.isomers[isomer]!, set.isomers[other]!),

      acid: ORGANIC_ACIDS.indexOf(acid),
      pKa: acid.pKa,
      ka: 10 ** -acid.pKa,
      relativeStrength: 10 ** (ORGANIC_ACETIC_PKA - acid.pKa),
      halogens: acid.halogens,
      halogenPosition: acid.position,

      substituent: Math.max(0, ORGANIC_SUBSTITUENT_ORDER.indexOf(params.substituent)),
      inductive: substituent.inductive,
      resonance: z(substituent.resonance),

      species: ORGANIC_SPECIES_ORDER.indexOf(speciesId),
      degree,
      alphaH: 3 * degree,
      stabilityRank: species.charge < 0 ? 4 - degree : degree + 1,
      electrons: species.electrons,
      hybridisation: species.hybrid,
      charge: z(species.charge),

      front,
      distanceA: ORGANIC_DYES[0].rf * front,
      distanceB: ORGANIC_DYES[1].rf * front,
      distanceC: ORGANIC_DYES[2].rf * front,
      rfA: ORGANIC_DYES[0].rf,
      rfB: ORGANIC_DYES[1].rf,
      rfC: ORGANIC_DYES[2].rf,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof OrganicState] : undefined;
  },

  setVariable(state, id, value) {
    const chainCap = (v: number) => clampInt(v, 0, state.chain);
    switch (id) {
      case "chain": {
        const chain = clampInt(value, 1, ORGANIC_MAX_CHAIN);
        const cap = (v: number) => Math.min(v, chain);
        return {
          ...state,
          chain,
          bondAt: Math.min(state.bondAt, Math.max(1, chain - 1)),
          groupAt: cap(state.groupAt),
          methyl: cap(state.methyl),
          methyl2: cap(state.methyl2),
          ethyl: cap(state.ethyl),
        };
      }
      case "bond": return { ...state, bond: clampInt(value, 0, 2) };
      case "bondAt": return { ...state, bondAt: clampInt(value, 1, Math.max(1, Math.min(7, state.chain - 1))) };
      case "group": return { ...state, group: clampInt(value, 0, 3) };
      case "groupAt": return { ...state, groupAt: clampInt(value, 1, state.chain) };
      case "methyl": return { ...state, methyl: chainCap(value) };
      case "methyl2": return { ...state, methyl2: chainCap(value) };
      case "ethyl": return { ...state, ethyl: chainCap(value) };
      case "isomer": return { ...state, isomer: clampInt(value, 0, 6) };
      case "other": return { ...state, other: clampInt(value, 0, 6) };
      case "degree": return { ...state, degree: clampInt(value, 0, 3) };
      case "front": return { ...state, front: clamp(value, 0, ORGANIC_PAPER_CM) };
      default: return state;
    }
  },
};
