import type { SimulationModel } from "@ise/science-engine";

/**
 * Round solids and similar shapes, for classes 7 to 10.
 *
 * Round solids: a wheel rolls one turn and covers its own rim, 2πr. A
 * cylinder's label unrolls into a rectangle 2πr wide and h tall. Three cones
 * of water fill the cylinder with the same base and height. A sphere, a
 * hemisphere, and shapes glued together from them — a capsule (cylinder and
 * two hemispheres), a tent (cylinder and cone) and an ice-cream cone (cone
 * and hemisphere).
 *
 * The area of a circle: cut it into an even number of equal sectors and lay
 * them side by side, alternately point up and point down. The rim is shared
 * equally between the top and bottom edges, so the shape is πr long and r
 * tall — a rectangle, apart from the scalloped edges, whose bumps (r(1 −
 * cos(π/n)) deep for n sectors) shrink away as the sectors get thinner.
 * Its area is πr × r = πr².
 *
 * π is what NCERT uses in its sums: 22/7 (about 3.143) or 3.14, chosen by a
 * parameter. The true value, 3.14159…, is never used, so every number here is
 * the one a student gets by hand.
 *
 * Similar shapes: a copy of a fixed triangle ABC (AB = 4, BC = 6, CA = 5),
 * scaled by k, with one side that can be stretched to spoil the likeness.
 * The basic proportionality theorem in a triangle with AB = 6 and AC = 9:
 * D on AB, E on AC, and DE ∥ BC exactly when AD/DB = AE/EC. Shadows: a pole
 * and a tower in the same sunlight make similar triangles. And the distance
 * between two grid points as Pythagoras.
 */

export type SolidId = "wheel" | "cylinder" | "cone" | "sphere" | "hemisphere" | "capsule" | "tent" | "icecream" | "circle";
export const SOLID_ORDER: readonly SolidId[] = ["wheel", "cylinder", "cone", "sphere", "hemisphere", "capsule", "tent", "icecream", "circle"];
export const SOLID_LABELS: Record<SolidId, string> = {
  wheel: "Wheel",
  cylinder: "Cylinder",
  cone: "Cone",
  sphere: "Sphere",
  hemisphere: "Hemisphere",
  capsule: "Capsule",
  tent: "Tent",
  icecream: "Ice-cream cone",
  circle: "Circle cut into sectors",
};

export type SolidsPi = "22/7" | "3.14";
export const SOLIDS_PI: Record<SolidsPi, number> = { "22/7": 22 / 7, "3.14": 3.14 };

export type SimilarFigureId = "copy" | "bpt" | "shadow" | "distance";
export const SIMILAR_FIGURE_ORDER: readonly SimilarFigureId[] = ["copy", "bpt", "shadow", "distance"];

/** The fixed triangle ABC that the copy PQR is made from (cm). */
export const SIMILAR_AB = 4;
export const SIMILAR_BC = 6;
export const SIMILAR_CA = 5;
/** The basic proportionality triangle (cm): D slides along AB, E along AC. */
export const BPT_AB = 6;
export const BPT_AC = 9;
export const BPT_BC = 8;

export type SolidsParams = { solid: SolidId; pi: SolidsPi; figure: SimilarFigureId };

export interface SolidsState {
  /** Radius, height, and the height of a tent's conical top (cm). */
  readonly r: number;
  readonly h: number;
  readonly top: number;
  /** Turns the wheel has rolled; how far the label is unrolled (0–1); cones of water poured (0–3). */
  readonly turns: number;
  readonly open: number;
  readonly pours: number;
  /** The copy's scale factor, and how much its side QR alone is stretched. */
  readonly k: number;
  readonly stretch: number;
  /** AD along AB and AE along AC (cm). */
  readonly ad: number;
  readonly ae: number;
  /** The pole's height and shadow, and the tower's shadow (m). */
  readonly pole: number;
  readonly poleShadow: number;
  readonly towerShadow: number;
  /** Two grid points P(x1, y1) and Q(x2, y2). */
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  /** How many equal sectors the circle is cut into (even), and how far they have moved into a row (0–1). */
  readonly sectors: number;
  readonly cut: number;
}

export type SolidsResults = {
  solid: number;
  piChoice: number;
  piValue: number;
  r: number;
  h: number;
  top: number;
  diameter: number;
  circumference: number;
  ratio: number;
  baseArea: number;
  turns: number;
  rolled: number;
  open: number;
  slant: number;
  csa: number;
  tsa: number;
  volume: number;
  cylinderVolume: number;
  coneVolume: number;
  pours: number;
  fill: number;
  full: number;
  partA: number;
  partB: number;
  figure: number;
  k: number;
  stretch: number;
  pq: number;
  qr: number;
  rp: number;
  ratioPQ: number;
  ratioQR: number;
  ratioRP: number;
  angleA: number;
  angleB: number;
  angleC: number;
  angleP: number;
  angleQ: number;
  angleR: number;
  similar: number;
  perimeterABC: number;
  perimeterPQR: number;
  ad: number;
  db: number;
  ae: number;
  ec: number;
  ratioD: number;
  ratioE: number;
  parallel: number;
  de: number;
  pole: number;
  poleShadow: number;
  towerShadow: number;
  tower: number;
  sunAngle: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  runX: number;
  runY: number;
  distance: number;
  sectors: number;
  cut: number;
  /** πr: the length of the sectors laid in a row — half the circumference. */
  halfCircumference: number;
  /** How deep the bumps on the row's long edges are: r(1 − cos(π/sectors)). */
  scallop: number;
};

const OUTPUTS = [
  "solid", "piChoice", "piValue", "r", "h", "top", "diameter", "circumference", "ratio", "baseArea", "turns", "rolled", "open",
  "slant", "csa", "tsa", "volume", "cylinderVolume", "coneVolume", "pours", "fill", "full", "partA", "partB",
  "figure", "k", "stretch", "pq", "qr", "rp", "ratioPQ", "ratioQR", "ratioRP", "angleA", "angleB", "angleC", "angleP", "angleQ", "angleR",
  "similar", "perimeterABC", "perimeterPQR", "ad", "db", "ae", "ec", "ratioD", "ratioE", "parallel", "de",
  "pole", "poleShadow", "towerShadow", "tower", "sunAngle", "x1", "y1", "x2", "y2", "runX", "runY", "distance",
  "sectors", "cut", "halfCircumference", "scallop",
] as const satisfies readonly (keyof SolidsResults)[];

/** Slider ranges, shared by setVariable and the concept's controls. */
export const SOLIDS_RANGES = {
  r: [0.5, 21],
  h: [0.5, 30],
  top: [0.5, 30],
  turns: [0, 2],
  open: [0, 1],
  pours: [0, 3],
  k: [0.5, 2.5],
  stretch: [0.5, 1.4],
  ad: [0.5, 5.5],
  ae: [0.5, 8.5],
  pole: [1, 10],
  poleShadow: [1, 10],
  towerShadow: [5, 60],
  x1: [-8, 8],
  y1: [-8, 8],
  x2: [-8, 8],
  y2: [-8, 8],
  sectors: [4, 32],
  cut: [0, 1],
} as const satisfies Record<keyof SolidsState, readonly [number, number]>;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const within = (key: keyof SolidsState, v: number) => clamp(Number.isFinite(v) ? v : SOLIDS_RANGES[key][0], SOLIDS_RANGES[key][0], SOLIDS_RANGES[key][1]);
/** Within this, two ratios count as equal (the sliders move in steps far coarser). */
const SAME = 0.005;
/** Play rolls half a turn, unrolls half the label, or pours half a cone each second. */
const PLAY_RATE = 0.5;

/** Sectors come in an even number, so half point up and half point down. */
const evenSectors = (v: number) => 2 * Math.round(within("sectors", v) / 2);

const solidOf = (params: SolidsParams) => (SOLID_ORDER.includes(params.solid) ? params.solid : "wheel");
const figureOf = (params: SolidsParams) => (SIMILAR_FIGURE_ORDER.includes(params.figure) ? params.figure : "copy");
const piOf = (params: SolidsParams): SolidsPi => (params.pi === "3.14" ? "3.14" : "22/7");

/** The angle opposite side `opposite`, by the cosine rule. */
function angleOpposite(opposite: number, side1: number, side2: number) {
  return Math.acos(clamp((side1 * side1 + side2 * side2 - opposite * opposite) / (2 * side1 * side2), -1, 1));
}

/** Surface and volume of each solid, with π as given. */
export function solidMeasures(solid: SolidId, r: number, h: number, top: number, pi: number) {
  const coneSlant = Math.hypot(r, h);
  const tentSlant = Math.hypot(r, top);
  const cylinderVolume = pi * r * r * h;
  const coneVolume = cylinderVolume / 3;
  const ball = (4 / 3) * pi * r ** 3;
  switch (solid) {
    case "wheel":
    case "circle":
      return { slant: 0, csa: 0, tsa: 0, partA: 0, partB: 0 };
    case "cylinder":
      return { slant: 0, csa: 2 * pi * r * h, tsa: 2 * pi * r * (r + h), partA: cylinderVolume, partB: 0 };
    case "cone":
      return { slant: coneSlant, csa: pi * r * coneSlant, tsa: pi * r * (coneSlant + r), partA: coneVolume, partB: 0 };
    case "sphere":
      return { slant: 0, csa: 4 * pi * r * r, tsa: 4 * pi * r * r, partA: ball, partB: 0 };
    case "hemisphere":
      return { slant: 0, csa: 2 * pi * r * r, tsa: 3 * pi * r * r, partA: ball / 2, partB: 0 };
    case "capsule":
      // Cylinder in the middle, a hemisphere on each end: the ends make one sphere.
      return { slant: 0, csa: 2 * pi * r * h + 4 * pi * r * r, tsa: 2 * pi * r * h + 4 * pi * r * r, partA: cylinderVolume, partB: ball };
    case "tent":
      // Canvas: the cylinder's side and the cone's side. No floor.
      return { slant: tentSlant, csa: 2 * pi * r * h + pi * r * tentSlant, tsa: 2 * pi * r * h + pi * r * tentSlant, partA: cylinderVolume, partB: (pi * r * r * top) / 3 };
    case "icecream":
      // A cone with a hemisphere of ice-cream on top: the cone's side and the hemisphere's dome.
      return { slant: coneSlant, csa: pi * r * coneSlant + 2 * pi * r * r, tsa: pi * r * coneSlant + 2 * pi * r * r, partA: coneVolume, partB: ball / 2 };
  }
}

export const solidsModel: SimulationModel<SolidsState, SolidsParams, SolidsResults> = {
  id: "solids",
  defaultParams: { solid: "wheel", pi: "22/7", figure: "copy" },
  outputs: OUTPUTS,
  stateVariables: ["r", "h", "top", "turns", "open", "pours", "k", "stretch", "ad", "ae", "pole", "poleShadow", "towerShadow", "x1", "y1", "x2", "y2", "sectors", "cut"],

  initialize() {
    return { r: 7, h: 10, top: 3, turns: 0, open: 0, pours: 0, k: 1.5, stretch: 1, ad: 2, ae: 3, pole: 6, poleShadow: 4, towerShadow: 28, x1: 1, y1: 2, x2: 4, y2: 6, sectors: 8, cut: 0 };
  },

  /** Play rolls the wheel, unrolls the cylinder's label, pours cones of water into the cylinder, or lays the circle's sectors in a row. */
  advance(state, dt, params) {
    const solid = solidOf(params);
    if (solid === "wheel") return { ...state, turns: within("turns", state.turns + PLAY_RATE * dt) };
    if (solid === "cylinder") return { ...state, open: within("open", state.open + PLAY_RATE * dt) };
    if (solid === "cone") return { ...state, pours: within("pours", state.pours + PLAY_RATE * dt) };
    if (solid === "circle") return { ...state, cut: within("cut", state.cut + PLAY_RATE * dt) };
    return state;
  },

  step(state, params, sign) {
    const solid = solidOf(params);
    if (solid === "wheel") return { ...state, turns: within("turns", Math.round(state.turns * 4) / 4 + 0.25 * sign) };
    if (solid === "cylinder") return { ...state, open: within("open", Math.round(state.open * 4) / 4 + 0.25 * sign) };
    if (solid === "cone") return { ...state, pours: within("pours", Math.round(state.pours) + sign) };
    if (solid === "circle") return { ...state, cut: within("cut", Math.round(state.cut * 4) / 4 + 0.25 * sign) };
    return { ...state, r: within("r", Math.round(state.r * 2) / 2 + 0.5 * sign) };
  },

  derive(state, params) {
    const solidId = solidOf(params);
    const piId = piOf(params);
    const pi = SOLIDS_PI[piId];
    const r = within("r", state.r);
    const h = within("h", state.h);
    const top = within("top", state.top);
    const turns = within("turns", state.turns);
    const pours = within("pours", state.pours);
    const circumference = 2 * pi * r;
    const cylinderVolume = pi * r * r * h;
    const m = solidMeasures(solidId, r, h, top, pi);

    const k = within("k", state.k);
    const stretch = within("stretch", state.stretch);
    const pq = SIMILAR_AB * k;
    const qr = SIMILAR_BC * k * stretch;
    const rp = SIMILAR_CA * k;

    const ad = within("ad", state.ad);
    const ae = within("ae", state.ae);
    const db = BPT_AB - ad;
    const ec = BPT_AC - ae;
    // D and E in the triangle with B at the origin and C along the x-axis.
    const ax = (BPT_AB ** 2 - BPT_AC ** 2 + BPT_BC ** 2) / (2 * BPT_BC);
    const ay = Math.sqrt(BPT_AB ** 2 - ax * ax);
    const t = ad / BPT_AB;
    const u = ae / BPT_AC;
    const de = Math.hypot(ax + u * (BPT_BC - ax) - ax * (1 - t), ay * (1 - u) - ay * (1 - t));

    const pole = within("pole", state.pole);
    const poleShadow = within("poleShadow", state.poleShadow);
    const towerShadow = within("towerShadow", state.towerShadow);

    const x1 = within("x1", state.x1);
    const y1 = within("y1", state.y1);
    const x2 = within("x2", state.x2);
    const y2 = within("y2", state.y2);
    const runX = Math.abs(x2 - x1);
    const runY = Math.abs(y2 - y1);
    const sectors = evenSectors(state.sectors);

    return {
      solid: SOLID_ORDER.indexOf(solidId),
      piChoice: piId === "22/7" ? 0 : 1,
      piValue: pi,
      r,
      h,
      top,
      diameter: 2 * r,
      circumference,
      ratio: circumference / (2 * r),
      baseArea: pi * r * r,
      turns,
      rolled: turns * circumference,
      open: within("open", state.open),
      slant: m.slant,
      csa: m.csa,
      tsa: m.tsa,
      volume: m.partA + m.partB,
      cylinderVolume,
      coneVolume: cylinderVolume / 3,
      pours,
      fill: pours / 3,
      full: pours >= 3 - 1e-9 ? 1 : 0,
      partA: m.partA,
      partB: m.partB,
      figure: SIMILAR_FIGURE_ORDER.indexOf(figureOf(params)),
      k,
      stretch,
      pq,
      qr,
      rp,
      ratioPQ: pq / SIMILAR_AB,
      ratioQR: qr / SIMILAR_BC,
      ratioRP: rp / SIMILAR_CA,
      angleA: angleOpposite(SIMILAR_BC, SIMILAR_AB, SIMILAR_CA),
      angleB: angleOpposite(SIMILAR_CA, SIMILAR_AB, SIMILAR_BC),
      angleC: angleOpposite(SIMILAR_AB, SIMILAR_BC, SIMILAR_CA),
      angleP: angleOpposite(qr, pq, rp),
      angleQ: angleOpposite(rp, pq, qr),
      angleR: angleOpposite(pq, qr, rp),
      similar: Math.abs(stretch - 1) < SAME ? 1 : 0,
      perimeterABC: SIMILAR_AB + SIMILAR_BC + SIMILAR_CA,
      perimeterPQR: pq + qr + rp,
      ad,
      db,
      ae,
      ec,
      ratioD: ad / db,
      ratioE: ae / ec,
      parallel: Math.abs(t - u) < SAME ? 1 : 0,
      de,
      pole,
      poleShadow,
      towerShadow,
      tower: (pole * towerShadow) / poleShadow,
      sunAngle: Math.atan2(pole, poleShadow),
      x1,
      y1,
      x2,
      y2,
      runX,
      runY,
      distance: Math.hypot(runX, runY),
      sectors,
      cut: within("cut", state.cut),
      halfCircumference: pi * r,
      scallop: r * (1 - Math.cos(Math.PI / sectors)),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof SolidsState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in SOLIDS_RANGES)) return state;
    const key = id as keyof SolidsState;
    // Grid points sit on whole numbers.
    // Sectors come in even numbers.
    const snapped = key === "x1" || key === "y1" || key === "x2" || key === "y2" ? Math.round(value) : key === "sectors" ? evenSectors(value) : value;
    return { ...state, [key]: within(key, snapped) || 0 };
  },
};
