import type { SimulationModel } from "@ise/science-engine";

/**
 * Symmetry, polygons and solid shapes, for classes 6 to 8.
 *
 * Mirror: a flat shape and a mirror line through its centre at `mirror`
 * degrees (anticlockwise from the horizontal). The shape folds onto itself
 * when its reflection in the line is the shape again. Every shape is stored
 * as straight segments — the edges of an outline, or the strokes of a
 * letter — and the model reflects them and checks that every reflected
 * segment lands on a segment of the shape. A line of symmetry must pass
 * through the shape's centre (the balance point of its segments), and must
 * carry the corner farthest from the centre onto a corner just as far out;
 * so the model tries each such line and keeps the ones that work. The lines
 * and turns found are not typed in: they are what this test finds, and the
 * tests check them against the known answers (a regular n-gon has n lines,
 * a rectangle 2, a kite 1, a parallelogram none).
 *
 * Turn: the shape turned anticlockwise about its centre by `turn` degrees,
 * over a tracing of where it started. It fits when the turned shape covers
 * the tracing exactly. The order of rotational symmetry is how many times it
 * fits in one full turn, counting the full turn itself; order 1 means no
 * rotational symmetry. A circle fits for every line and every turn: shown as
 * "endless" (stored as SYMSOLID_ENDLESS).
 *
 * Polygon: a regular polygon with `sides` corners, whose corner A can be
 * pulled out from the centre by the fraction `pull` (up to 0.3, which keeps
 * every polygon up to 12 sides convex). The diagonals from A cut it into
 * n − 2 triangles, so the angles add to (n − 2) × 180°. The angles of the
 * drawn polygon are measured from its corners, so the sum is checked, not
 * assumed. Each exterior angle is 180° minus the interior angle beside it,
 * and walking round, the exterior angles add to one full turn, 360°.
 *
 * Solid: a cube, cuboid, prism or pyramid (on a regular base of `baseSides`
 * sides), cylinder, cone or sphere. The flat solids are built as corner
 * lists and faces, and the model counts faces, edges and corners from them.
 * For every polyhedron F + V − E = 2 (Euler). A cylinder, cone or sphere has
 * a curved surface, so it is not a polyhedron; it is counted as in NCERT
 * class 6 (a cylinder: 2 flat faces, 1 curved surface, 2 curved edges and no
 * vertex; a cone: 1 flat face, 1 curved surface, 1 curved edge and 1 vertex;
 * a sphere: just a curved surface), and Euler's formula is not used for it.
 * The top, front and side views are the shapes seen from above, from the
 * front and from the right, with the solid standing on its base.
 *
 * Net: six squares joined edge to edge. Folding lifts each square about the
 * edge it shares with the square before it, all by the same angle,
 * `fold` × 90°. At a full fold the model sees where each square has gone:
 * a net of a cube puts the six squares on six different faces; any other
 * net puts two squares on the same face and leaves a face open.
 */

// ── Flat shapes ──────────────────────────────────────────────────────────────

export type SymShapeId =
  | "triangle"
  | "square"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "rectangle"
  | "rhombus"
  | "kite"
  | "parallelogram"
  | "isosceles"
  | "scalene"
  | "circle"
  | "A"
  | "E"
  | "F"
  | "H"
  | "N"
  | "T"
  | "X"
  | "Z";

export const SYMSOLID_SHAPE_ORDER: readonly SymShapeId[] = [
  "triangle", "square", "pentagon", "hexagon", "octagon", "rectangle", "rhombus", "kite", "parallelogram", "isosceles", "scalene", "circle",
  "A", "E", "F", "H", "N", "T", "X", "Z",
];

type P2 = readonly [number, number];
type Segment = readonly [P2, P2];

export interface SymShape {
  label: string;
  /** "outline": a closed polygon through `points`; "strokes": a letter drawn with `segments`; "circle": a circle of radius 1. */
  kind: "outline" | "strokes" | "circle";
  /** Corners of an outline, anticlockwise (maths axes, y up, about ±1 in size). */
  points: readonly P2[];
  /** Every straight piece of the shape: an outline's edges or a letter's strokes. */
  segments: readonly Segment[];
}

/** Lines, turns and counts shown for a circle, which has every line and every turn. */
export const SYMSOLID_ENDLESS = 100;

const DEG = Math.PI / 180;

/** A regular n-gon of radius 1: a corner at the top when n is odd, a flat top when n is even. */
function regularPoints(n: number): P2[] {
  const start = n % 2 === 1 ? 90 : 90 + 180 / n;
  return Array.from({ length: n }, (_, k) => {
    const a = (start + (360 * k) / n) * DEG;
    return [Math.cos(a), Math.sin(a)] as const;
  });
}

const outline = (label: string, points: readonly P2[]): SymShape => ({
  label,
  kind: "outline",
  points,
  segments: points.map((p, i) => [p, points[(i + 1) % points.length]!] as const),
});

const strokes = (label: string, segments: readonly Segment[]): SymShape => ({ label, kind: "strokes", points: [], segments });

export const SYMSOLID_SHAPES: Record<SymShapeId, SymShape> = {
  triangle: outline("Equilateral triangle", regularPoints(3)),
  square: outline("Square", regularPoints(4)),
  pentagon: outline("Regular pentagon", regularPoints(5)),
  hexagon: outline("Regular hexagon", regularPoints(6)),
  octagon: outline("Regular octagon", regularPoints(8)),
  rectangle: outline("Rectangle", [[-1, -0.6], [1, -0.6], [1, 0.6], [-1, 0.6]]),
  rhombus: outline("Rhombus", [[0, -1], [0.6, 0], [0, 1], [-0.6, 0]]),
  kite: outline("Kite", [[0, -1], [0.6, 0.3], [0, 1], [-0.6, 0.3]]),
  parallelogram: outline("Parallelogram", [[-1, -0.5], [0.5, -0.5], [1, 0.5], [-0.5, 0.5]]),
  isosceles: outline("Isosceles triangle", [[-0.6, -0.8], [0.6, -0.8], [0, 1]]),
  scalene: outline("Scalene triangle", [[-0.9, -0.7], [0.9, -0.7], [0.3, 0.9]]),
  circle: { label: "Circle", kind: "circle", points: [], segments: [] },
  A: strokes("Letter A", [[[-0.6, -1], [0, 1]], [[0, 1], [0.6, -1]], [[-0.3, 0], [0.3, 0]]]),
  E: strokes("Letter E", [[[-0.5, -1], [-0.5, 1]], [[-0.5, 1], [0.6, 1]], [[-0.5, 0], [0.4, 0]], [[-0.5, -1], [0.6, -1]]]),
  F: strokes("Letter F", [[[-0.5, -1], [-0.5, 1]], [[-0.5, 1], [0.6, 1]], [[-0.5, 0.1], [0.3, 0.1]]]),
  H: strokes("Letter H", [[[-0.6, -1], [-0.6, 1]], [[0.6, -1], [0.6, 1]], [[-0.6, 0], [0.6, 0]]]),
  N: strokes("Letter N", [[[-0.6, -1], [-0.6, 1]], [[-0.6, 1], [0.6, -1]], [[0.6, -1], [0.6, 1]]]),
  T: strokes("Letter T", [[[-0.7, 1], [0.7, 1]], [[0, 1], [0, -1]]]),
  X: strokes("Letter X", [[[-0.6, -1], [0.6, 1]], [[-0.6, 1], [0.6, -1]]]),
  Z: strokes("Letter Z", [[[-0.6, 1], [0.6, 1]], [[0.6, 1], [-0.6, -1]], [[-0.6, -1], [0.6, -1]]]),
};

export interface SymShapeSymmetry {
  /** The balance point of the shape's segments: every line of symmetry passes through it. */
  centre: P2;
  /** Angles of the lines of symmetry, degrees in [0, 180), ascending. */
  axes: readonly number[];
  /** Turns (degrees in [0, 360), ascending, starting with 0) that leave the shape looking the same. */
  turns: readonly number[];
  /** Number of lines of symmetry, and the order of rotational symmetry (SYMSOLID_ENDLESS for a circle). */
  lines: number;
  order: number;
}

const CLOSE = 1e-6;
const near = (a: P2, b: P2) => Math.abs(a[0] - b[0]) < CLOSE && Math.abs(a[1] - b[1]) < CLOSE;
const sameSegment = (s: Segment, t: Segment) => (near(s[0], t[0]) && near(s[1], t[1])) || (near(s[0], t[1]) && near(s[1], t[0]));

/** Whether moving every point of the shape by `map` gives back the same set of segments. */
function mapsOntoItself(segments: readonly Segment[], map: (p: P2) => P2): boolean {
  return segments.every((s) => {
    const image: Segment = [map(s[0]), map(s[1])];
    return segments.some((t) => sameSegment(image, t));
  });
}

/** Reflect p in the line through c at angle θ (degrees). */
export function symSolidReflect(p: P2, c: P2, theta: number): P2 {
  const cos2 = Math.cos(2 * theta * DEG);
  const sin2 = Math.sin(2 * theta * DEG);
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  return [c[0] + x * cos2 + y * sin2, c[1] + x * sin2 - y * cos2];
}

/** Turn p anticlockwise about c by α degrees. */
export function symSolidRotate(p: P2, c: P2, alpha: number): P2 {
  const cos = Math.cos(alpha * DEG);
  const sin = Math.sin(alpha * DEG);
  const x = p[0] - c[0];
  const y = p[1] - c[1];
  return [c[0] + x * cos - y * sin, c[1] + x * sin + y * cos];
}

const tidy = (v: number, period: number) => {
  const r = Math.round((((v % period) + period) % period) * 1e6) / 1e6;
  return r >= period ? 0 : r;
};

function findSymmetry(shape: SymShape): SymShapeSymmetry {
  if (shape.kind === "circle") return { centre: [0, 0], axes: [], turns: [0], lines: SYMSOLID_ENDLESS, order: SYMSOLID_ENDLESS };
  const { segments } = shape;
  let total = 0;
  let cx = 0;
  let cy = 0;
  for (const [a, b] of segments) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    total += len;
    cx += ((a[0] + b[0]) / 2) * len;
    cy += ((a[1] + b[1]) / 2) * len;
  }
  const centre: P2 = [cx / total, cy / total];
  const ends = segments.flatMap((s) => [s[0], s[1]]);
  const radius = (p: P2) => Math.hypot(p[0] - centre[0], p[1] - centre[1]);
  const polar = (p: P2) => Math.atan2(p[1] - centre[1], p[0] - centre[0]) / DEG;
  const far = ends.reduce((best, p) => (radius(p) > radius(best) + CLOSE ? p : best), ends[0]!);
  const partners = ends.filter((p) => Math.abs(radius(p) - radius(far)) < CLOSE);

  const axes = new Set<number>();
  const turns = new Set<number>([0]);
  for (const p of partners) {
    const axis = tidy((polar(far) + polar(p)) / 2, 180);
    if (mapsOntoItself(segments, (q) => symSolidReflect(q, centre, axis))) axes.add(axis);
    const turn = tidy(polar(p) - polar(far), 360);
    if (mapsOntoItself(segments, (q) => symSolidRotate(q, centre, turn))) turns.add(turn);
  }
  const sortedAxes = [...axes].sort((a, b) => a - b);
  const sortedTurns = [...turns].sort((a, b) => a - b);
  return { centre, axes: sortedAxes, turns: sortedTurns, lines: sortedAxes.length, order: sortedTurns.length };
}

export const SYMSOLID_SYMMETRY: Record<SymShapeId, SymShapeSymmetry> = Object.fromEntries(
  SYMSOLID_SHAPE_ORDER.map((id) => [id, findSymmetry(SYMSOLID_SHAPES[id])]),
) as Record<SymShapeId, SymShapeSymmetry>;

// ── Polygons ─────────────────────────────────────────────────────────────────

export const SYMSOLID_POLYGON_NAMES: Record<number, string> = {
  3: "triangle",
  4: "quadrilateral",
  5: "pentagon",
  6: "hexagon",
  7: "heptagon",
  8: "octagon",
  9: "nonagon",
  10: "decagon",
  11: "11-gon",
  12: "dodecagon",
};

/** Corners of the polygon, anticlockwise from A at the top; A is pulled out to radius 1 + pull. */
export function symSolidPolygon(sides: number, pull: number): P2[] {
  const n = Math.round(sides);
  return Array.from({ length: n }, (_, k) => {
    const a = (90 + (360 * k) / n) * DEG;
    const r = k === 0 ? 1 + pull : 1;
    return [r * Math.cos(a), r * Math.sin(a)] as const;
  });
}

/** The interior angle at each corner, in degrees, measured from the drawing. */
export function symSolidInteriorAngles(points: readonly P2[]): number[] {
  const n = points.length;
  return points.map((p, i) => {
    const prev = points[(i + n - 1) % n]!;
    const next = points[(i + 1) % n]!;
    const ux = prev[0] - p[0];
    const uy = prev[1] - p[1];
    const vx = next[0] - p[0];
    const vy = next[1] - p[1];
    const cos = (ux * vx + uy * vy) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
    return Math.acos(Math.max(-1, Math.min(1, cos))) / DEG;
  });
}

// ── Solids ───────────────────────────────────────────────────────────────────

export type SymSolidId = "cube" | "cuboid" | "prism" | "pyramid" | "cylinder" | "cone" | "sphere";
export const SYMSOLID_SOLID_ORDER: readonly SymSolidId[] = ["cube", "cuboid", "prism", "pyramid", "cylinder", "cone", "sphere"];
export const SYMSOLID_SOLID_LABELS: Record<SymSolidId, string> = {
  cube: "Cube",
  cuboid: "Cuboid",
  prism: "Prism",
  pyramid: "Pyramid",
  cylinder: "Cylinder",
  cone: "Cone",
  sphere: "Sphere",
};
/** Names of a prism's or pyramid's base by its number of sides. */
export const SYMSOLID_BASE_NAMES: Record<number, string> = { 3: "triangular", 4: "square", 5: "pentagonal", 6: "hexagonal", 7: "heptagonal", 8: "octagonal" };

type P3 = readonly [number, number, number];

/** x to the right, y away from the viewer, z up. Faces list corner indices; edges are the faces' sides. */
export interface SymSolidMesh {
  vertices: readonly P3[];
  faces: readonly (readonly number[])[];
  edges: readonly (readonly [number, number])[];
  /** Outward unit normal of each face. */
  normals: readonly P3[];
}

/** Sizes of the drawn solids (any unit): the cuboid's length, breadth and height, and the prism's and pyramid's base radius and height. */
export const SYMSOLID_CUBOID = { l: 2.6, b: 1.4, h: 1.7 } as const;
export const SYMSOLID_BASE_RADIUS = 1.1;
export const SYMSOLID_SOLID_HEIGHT = 2;

/** A regular base of n sides on the ground, with a side facing the viewer. */
function basePoints(n: number, z: number): P3[] {
  return Array.from({ length: n }, (_, k) => {
    const a = (-90 + 180 / n + (360 * k) / n) * DEG;
    return [SYMSOLID_BASE_RADIUS * Math.cos(a), SYMSOLID_BASE_RADIUS * Math.sin(a), z] as const;
  });
}

function boxPoints(l: number, b: number, h: number): P3[] {
  const x = l / 2;
  const y = b / 2;
  return [[-x, -y, 0], [x, -y, 0], [x, y, 0], [-x, y, 0], [-x, -y, h], [x, -y, h], [x, y, h], [-x, y, h]];
}

function finishMesh(vertices: P3[], faces: number[][]): SymSolidMesh {
  const centre = vertices.reduce<[number, number, number]>((c, v) => [c[0] + v[0] / vertices.length, c[1] + v[1] / vertices.length, c[2] + v[2] / vertices.length], [0, 0, 0]);
  const edges: [number, number][] = [];
  for (const face of faces) {
    face.forEach((a, i) => {
      const b = face[(i + 1) % face.length]!;
      const key: [number, number] = a < b ? [a, b] : [b, a];
      if (!edges.some((e) => e[0] === key[0] && e[1] === key[1])) edges.push(key);
    });
  }
  const normals = faces.map((face) => {
    const [p, q, r] = [vertices[face[0]!]!, vertices[face[1]!]!, vertices[face[2]!]!];
    const u = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
    const v = [r[0] - p[0], r[1] - p[1], r[2] - p[2]];
    let n: [number, number, number] = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
    const len = Math.hypot(...n);
    n = [n[0] / len, n[1] / len, n[2] / len];
    // Point it away from the middle of the solid.
    const out = (p[0] - centre[0]) * n[0] + (p[1] - centre[1]) * n[1] + (p[2] - centre[2]) * n[2];
    return (out < 0 ? [-n[0], -n[1], -n[2]] : n) as P3;
  });
  return { vertices, faces, edges, normals };
}

/** The corners, faces and edges of a flat-faced solid; null for a cylinder, cone or sphere. */
export function symSolidMesh(solid: SymSolidId, baseSides: number): SymSolidMesh | null {
  const n = Math.round(Math.min(8, Math.max(3, baseSides)));
  switch (solid) {
    case "cube":
    case "cuboid": {
      const v = solid === "cube" ? boxPoints(1.8, 1.8, 1.8) : boxPoints(SYMSOLID_CUBOID.l, SYMSOLID_CUBOID.b, SYMSOLID_CUBOID.h);
      return finishMesh(v, [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]);
    }
    case "prism": {
      const v = [...basePoints(n, 0), ...basePoints(n, SYMSOLID_SOLID_HEIGHT)];
      const sides = Array.from({ length: n }, (_, k) => [k, (k + 1) % n, n + ((k + 1) % n), n + k]);
      return finishMesh(v, [Array.from({ length: n }, (_, k) => k), Array.from({ length: n }, (_, k) => n + k), ...sides]);
    }
    case "pyramid": {
      const v = [...basePoints(n, 0), [0, 0, SYMSOLID_SOLID_HEIGHT] as const];
      const sides = Array.from({ length: n }, (_, k) => [k, (k + 1) % n, n]);
      return finishMesh(v, [Array.from({ length: n }, (_, k) => k), ...sides]);
    }
    default:
      return null;
  }
}

/** Flat faces, curved surfaces, edges and vertices of the round solids, as counted in NCERT class 6. */
const ROUND_COUNTS: Record<"cylinder" | "cone" | "sphere", { faces: number; curved: number; edges: number; vertices: number }> = {
  cylinder: { faces: 2, curved: 1, edges: 2, vertices: 0 },
  cone: { faces: 1, curved: 1, edges: 1, vertices: 1 },
  sphere: { faces: 0, curved: 1, edges: 0, vertices: 0 },
};

/** Codes for the shape of a view. */
export const SYMSOLID_VIEW_LABELS: Record<string, string> = {
  "0": "circle",
  "3": "triangle",
  "4": "square",
  "5": "pentagon",
  "6": "hexagon",
  "7": "heptagon",
  "8": "octagon",
  "40": "rectangle",
};
const CIRCLE_VIEW = 0;
const TRIANGLE_VIEW = 3;
const SQUARE_VIEW = 4;
const RECTANGLE_VIEW = 40;

/** Top, front and side view of a solid standing on its base. */
function viewsOf(solid: SymSolidId, n: number): [number, number, number] {
  switch (solid) {
    case "cube":
      return [SQUARE_VIEW, SQUARE_VIEW, SQUARE_VIEW];
    case "cuboid":
      return [RECTANGLE_VIEW, RECTANGLE_VIEW, RECTANGLE_VIEW];
    case "prism":
      // The base seen from above; from the front and side, the upright faces make a rectangle.
      return [n, RECTANGLE_VIEW, RECTANGLE_VIEW];
    case "pyramid":
      return [n, TRIANGLE_VIEW, TRIANGLE_VIEW];
    case "cylinder":
      return [CIRCLE_VIEW, RECTANGLE_VIEW, RECTANGLE_VIEW];
    case "cone":
      return [CIRCLE_VIEW, TRIANGLE_VIEW, TRIANGLE_VIEW];
    case "sphere":
      return [CIRCLE_VIEW, CIRCLE_VIEW, CIRCLE_VIEW];
  }
}

// ── Nets of a cube ───────────────────────────────────────────────────────────

export type SymNetId = "cross" | "ell" | "zigzag" | "two-three-one" | "stairs" | "three-three" | "row-of-six" | "five-and-one" | "u-shape" | "block";
export const SYMSOLID_NET_ORDER: readonly SymNetId[] = ["cross", "ell", "zigzag", "two-three-one", "stairs", "three-three", "row-of-six", "five-and-one", "u-shape", "block"];

export interface SymNet {
  label: string;
  /** Squares as [column, row], rows counting downwards. */
  cells: readonly P2[];
}

export const SYMSOLID_NETS: Record<SymNetId, SymNet> = {
  cross: { label: "Cross", cells: [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]] },
  ell: { label: "T shape", cells: [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2]] },
  zigzag: { label: "Four in a row, ends opposite", cells: [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]] },
  "two-three-one": { label: "Two, three and one", cells: [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]] },
  stairs: { label: "Staircase", cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]] },
  "three-three": { label: "Three and three", cells: [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]] },
  "row-of-six": { label: "Six in a row", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]] },
  "five-and-one": { label: "Five in a row and one", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [1, 1]] },
  "u-shape": { label: "U shape", cells: [[0, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]] },
  block: { label: "Two rows of three", cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
};

/** One square of a net, in 3D: its cell, and its four corners (x right, y away from the viewer, z up). */
export interface SymFoldedSquare {
  cell: P2;
  corners: readonly [P3, P3, P3, P3];
  /** Whether this is the square that stays put. */
  base: boolean;
}

type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
interface Frame {
  /** 3D position of net point (a, b) is o + a·u + b·v; w is the side the squares fold towards. */
  o: V3;
  u: V3;
  v: V3;
  w: V3;
}
const at = (f: Frame, a: number, b: number): V3 => add(f.o, add(scale(f.u, a), scale(f.v, b)));

/**
 * Fold the net: each square turns by fold × 90° about the edge it shares
 * with the square it was reached from (going out from the square with the
 * most neighbours). The base square stays upright, facing the viewer, and
 * the rest fold away from the viewer.
 */
export function symSolidFoldNet(net: SymNetId, fold: number): SymFoldedSquare[] {
  const cells = SYMSOLID_NETS[net].cells;
  const key = (c: P2) => `${c[0]},${c[1]}`;
  const index = new Map(cells.map((c, i) => [key(c), i]));
  const neighbours = (c: P2) =>
    ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
      .map(([dc, dr]) => ({ dc, dr, i: index.get(key([c[0] + dc, c[1] + dr])) }))
      .filter((n): n is { dc: 1 | -1 | 0; dr: 1 | -1 | 0; i: number } => n.i !== undefined);
  const root = cells.reduce((best, c, i) => (neighbours(c).length > neighbours(cells[best]!).length ? i : best), 0);

  const phi = Math.min(1, Math.max(0, fold)) * (Math.PI / 2);
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  // Net coordinates: a = column, b = −row (so rows go down the screen); 3D: x = a, z = b, folding towards +y.
  const frames = new Map<number, Frame>([[root, { o: [0, 0, 0], u: [1, 0, 0], v: [0, 0, 1], w: [0, 1, 0] }]]);
  const queue = [root];
  while (queue.length > 0) {
    const i = queue.shift()!;
    const f = frames.get(i)!;
    const c = cells[i]!;
    for (const n of neighbours(c)) {
      if (frames.has(n.i)) continue;
      let child: Frame;
      if (n.dc !== 0) {
        // Hinge on the vertical edge a = h; the far side of the hinge tilts towards w.
        const h = n.dc > 0 ? c[0] + 1 : c[0];
        const s = n.dc;
        const u2 = add(scale(f.u, cos), scale(f.w, s * sin));
        const w2 = add(scale(f.w, cos), scale(f.u, -s * sin));
        child = { o: add(at(f, h, 0), scale(u2, -h)), u: u2, v: f.v, w: w2 };
      } else {
        // Rows go down, so a step down the net is a step to smaller b. The square
        // spans b from −row − 1 to −row; hinge on its top or bottom edge.
        const s = -n.dr;
        const h = s > 0 ? -c[1] : -c[1] - 1;
        const v2 = add(scale(f.v, cos), scale(f.w, s * sin));
        const w2 = add(scale(f.w, cos), scale(f.v, -s * sin));
        child = { o: add(at(f, 0, h), scale(v2, -h)), u: f.u, v: v2, w: w2 };
      }
      frames.set(n.i, child);
      queue.push(n.i);
    }
  }
  return cells.map((c, i) => {
    const f = frames.get(i)!;
    const a = c[0];
    const b = -c[1];
    return { cell: c, base: i === root, corners: [at(f, a, b - 1), at(f, a + 1, b - 1), at(f, a + 1, b), at(f, a, b)] as const };
  });
}

/** How many different faces of a cube the six squares cover when the net is folded right up. */
function facesCovered(net: SymNetId): number {
  const centres = symSolidFoldNet(net, 1).map((sq) => sq.corners.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4, s[2] + p[2] / 4], [0, 0, 0]));
  return new Set(centres.map((p) => p.map((x) => Math.round(x * 1e6) / 1e6).join(","))).size;
}

export const SYMSOLID_NET_FACES: Record<SymNetId, number> = Object.fromEntries(SYMSOLID_NET_ORDER.map((id) => [id, facesCovered(id)])) as Record<SymNetId, number>;

// ── The model ────────────────────────────────────────────────────────────────

export type SymSolidParams = { shape: SymShapeId; solid: SymSolidId; net: SymNetId };

export interface SymSolidState {
  readonly mirror: number;
  readonly turn: number;
  readonly sides: number;
  readonly pull: number;
  readonly baseSides: number;
  readonly fold: number;
}

/** Each state value's allowed range: angles in degrees. */
export const SYMSOLID_RANGES: Record<keyof SymSolidState, readonly [number, number]> = {
  mirror: [0, 179.5],
  turn: [0, 360],
  sides: [3, 12],
  pull: [0, 0.3],
  baseSides: [3, 8],
  fold: [0, 1],
};

export type SymSolidResults = {
  shape: number;
  mirror: number;
  folds: number;
  lines: number;
  turn: number;
  turnFits: number;
  fitsCounted: number;
  order: number;
  smallestTurn: number;
  hasRotational: number;
  sides: number;
  pull: number;
  triangles: number;
  angleSum: number;
  eachInterior: number;
  eachExterior: number;
  angleA: number;
  measuredSum: number;
  exteriorSum: number;
  isRegular: number;
  solid: number;
  baseSides: number;
  faces: number;
  curved: number;
  edges: number;
  vertices: number;
  isPolyhedron: number;
  eulerSum: number;
  topView: number;
  frontView: number;
  sideView: number;
  net: number;
  fold: number;
  facesCovered: number;
  netFolds: number;
};

const OUTPUTS = [
  "shape", "mirror", "folds", "lines", "turn", "turnFits", "fitsCounted", "order", "smallestTurn", "hasRotational",
  "sides", "pull", "triangles", "angleSum", "eachInterior", "eachExterior", "angleA", "measuredSum", "exteriorSum", "isRegular",
  "solid", "baseSides", "faces", "curved", "edges", "vertices", "isPolyhedron", "eulerSum", "topView", "frontView", "sideView",
  "net", "fold", "facesCovered", "netFolds",
] as const satisfies readonly (keyof SymSolidResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const clampTo = (key: keyof SymSolidState, v: number) => clamp(Number.isFinite(v) ? v : SYMSOLID_RANGES[key][0], SYMSOLID_RANGES[key][0], SYMSOLID_RANGES[key][1]);
/** A mirror within this many degrees of a line of symmetry counts as on it; the same for a turn. */
const MIRROR_SNAP = 0.25;
const TURN_SNAP = 0.5;
/** Play turns the shape at this many degrees a second, and folds the net at this fraction a second. */
const TURN_SPEED = 45;
const FOLD_SPEED = 0.4;

const shapeOf = (params: SymSolidParams) => (SYMSOLID_SHAPE_ORDER.includes(params.shape) ? params.shape : "rectangle");
const solidOf = (params: SymSolidParams) => (SYMSOLID_SOLID_ORDER.includes(params.solid) ? params.solid : "cube");
const netOf = (params: SymSolidParams) => (SYMSOLID_NET_ORDER.includes(params.net) ? params.net : "cross");

/** The gap between two angles, going the short way round a circle of the given period. */
const gap = (a: number, b: number, period: number) => {
  const d = (((a - b) % period) + period) % period;
  return Math.min(d, period - d);
};

export const symSolidModel: SimulationModel<SymSolidState, SymSolidParams, SymSolidResults> = {
  id: "symsolid",
  defaultParams: { shape: "rectangle", solid: "cube", net: "cross" },
  outputs: OUTPUTS,
  stateVariables: ["mirror", "turn", "sides", "pull", "baseSides", "fold"],

  initialize() {
    return { mirror: 60, turn: 0, sides: 5, pull: 0, baseSides: 4, fold: 0 };
  },

  /** Play turns the shape round to a full turn and folds the net right up, then stops. */
  advance(state, dt) {
    return { ...state, turn: clampTo("turn", state.turn + TURN_SPEED * dt), fold: clampTo("fold", state.fold + FOLD_SPEED * dt) };
  },

  /** A step turns the shape on by its smallest turn of symmetry (15° for a circle). */
  step(state, params, sign) {
    const sym = SYMSOLID_SYMMETRY[shapeOf(params)];
    const by = sym.order === SYMSOLID_ENDLESS ? 15 : 360 / sym.order;
    const k = Math.round(state.turn / by) + sign;
    return { ...state, turn: clampTo("turn", k * by) };
  },

  derive(state, params) {
    // Symmetry.
    const shapeId = shapeOf(params);
    const sym = SYMSOLID_SYMMETRY[shapeId];
    const endless = sym.order === SYMSOLID_ENDLESS;
    const mirror = clampTo("mirror", state.mirror);
    const turn = clampTo("turn", state.turn);
    const folds = endless || sym.axes.some((a) => gap(a, mirror, 180) <= MIRROR_SNAP) ? 1 : 0;
    const turnFits = endless || sym.turns.some((t) => gap(t, turn, 360) <= TURN_SNAP) ? 1 : 0;
    // Count the fits met so far on the way round, the full turn included.
    const fitsCounted = endless
      ? turn > TURN_SNAP
        ? SYMSOLID_ENDLESS
        : 0
      : sym.turns.filter((t) => t > 0 && t <= turn + TURN_SNAP).length + (turn >= 360 - TURN_SNAP ? 1 : 0);

    // Polygon.
    const sides = Math.round(clampTo("sides", state.sides));
    const pull = clampTo("pull", state.pull);
    const angles = symSolidInteriorAngles(symSolidPolygon(sides, pull));
    const measuredSum = angles.reduce((s, a) => s + a, 0);
    const angleSum = (sides - 2) * 180;

    // Solid.
    const solidId = solidOf(params);
    const baseSides = Math.round(clampTo("baseSides", state.baseSides));
    const mesh = symSolidMesh(solidId, baseSides);
    const counts = mesh
      ? { faces: mesh.faces.length, curved: 0, edges: mesh.edges.length, vertices: mesh.vertices.length }
      : ROUND_COUNTS[solidId as "cylinder" | "cone" | "sphere"];
    const [topView, frontView, sideView] = viewsOf(solidId, baseSides);

    // Net.
    const netId = netOf(params);
    const covered = SYMSOLID_NET_FACES[netId];

    return {
      shape: SYMSOLID_SHAPE_ORDER.indexOf(shapeId),
      mirror,
      folds,
      lines: sym.lines,
      turn,
      turnFits,
      fitsCounted,
      order: sym.order,
      smallestTurn: endless ? 0 : 360 / sym.order,
      hasRotational: sym.order > 1 ? 1 : 0,
      sides,
      pull,
      triangles: sides - 2,
      angleSum,
      eachInterior: angleSum / sides,
      eachExterior: 360 / sides,
      angleA: angles[0]!,
      measuredSum,
      exteriorSum: angles.reduce((s, a) => s + (180 - a), 0),
      isRegular: pull === 0 ? 1 : 0,
      solid: SYMSOLID_SOLID_ORDER.indexOf(solidId),
      baseSides: solidId === "prism" || solidId === "pyramid" ? baseSides : solidId === "cube" || solidId === "cuboid" ? 4 : 0,
      faces: counts.faces,
      curved: counts.curved,
      edges: counts.edges,
      vertices: counts.vertices,
      isPolyhedron: mesh ? 1 : 0,
      eulerSum: mesh ? counts.faces + counts.vertices - counts.edges : 0,
      topView,
      frontView,
      sideView,
      net: SYMSOLID_NET_ORDER.indexOf(netId),
      fold: clampTo("fold", state.fold),
      facesCovered: covered,
      netFolds: covered === 6 ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof SymSolidState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in SYMSOLID_RANGES)) return state;
    const key = id as keyof SymSolidState;
    return { ...state, [key]: clampTo(key, value) };
  },
};
