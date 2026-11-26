import type { SimulationModel } from "@ise/science-engine";

/**
 * Area and volume on a grid of unit squares.
 *
 * Area is how many unit squares a shape covers; perimeter is the walk round
 * its edge. A right triangle is half the rectangle around it; a parallelogram
 * has the area of the rectangle with the same base and height; a circle
 * covers πr² squares. A cuboid is layers of unit cubes: length × breadth ×
 * height of them. Unfold a cuboid and its surface is a net of six
 * rectangles in three matching pairs: 2(lb + bh + hl) unit squares.
 */

export type ShapeId = "rectangle" | "triangle" | "parallelogram" | "circle" | "cuboid";

export const SHAPE_ORDER: readonly ShapeId[] = ["rectangle", "triangle", "parallelogram", "circle", "cuboid"];

export const MAX_SIDE = 12;
export const MAX_HEIGHT = 10;
export const MAX_RADIUS = 6;

export type ShapesParams = { shape: ShapeId };

export interface ShapesState {
  readonly length: number;
  /** The breadth of a rectangle or cuboid; the height of a triangle or parallelogram. */
  readonly breadth: number;
  /** The height of a cuboid. */
  readonly height: number;
  readonly radius: number;
}

export type ShapesResults = {
  shape: number;
  length: number;
  breadth: number;
  height: number;
  radius: number;
  area: number;
  perimeter: number;
  /** Whole unit squares lying fully inside the shape. */
  squares: number;
  volume: number;
  surfaceArea: number;
  /** Unit cubes in a cuboid (0 for flat shapes). */
  cubes: number;
  /** The net's three pairs of faces (0 for flat shapes): top and bottom l × b, front and back l × h, the two ends b × h. */
  faceLB: number;
  faceLH: number;
  faceBH: number;
};

const whole = (value: number, max: number) => Math.min(max, Math.max(1, Math.round(value)));

/** Unit squares fully inside a right triangle with legs l (across) and h (up). */
function squaresInTriangle(l: number, h: number): number {
  let count = 0;
  for (let i = 0; i < l; i++) for (let j = 0; j < h; j++) if ((i + 1) / l + (j + 1) / h <= 1 + 1e-9) count++;
  return count;
}

/** Unit squares fully inside a circle of radius r centred on a grid point. */
function squaresInCircle(r: number): number {
  let count = 0;
  for (let i = -r; i < r; i++) {
    for (let j = -r; j < r; j++) {
      const far = Math.max(Math.hypot(i, j), Math.hypot(i + 1, j), Math.hypot(i, j + 1), Math.hypot(i + 1, j + 1));
      if (far <= r + 1e-9) count++;
    }
  }
  return count;
}

const OUTPUTS = [
  "shape",
  "length",
  "breadth",
  "height",
  "radius",
  "area",
  "perimeter",
  "squares",
  "volume",
  "surfaceArea",
  "cubes",
  "faceLB",
  "faceLH",
  "faceBH",
] as const satisfies readonly (keyof ShapesResults)[];

export const shapesModel: SimulationModel<ShapesState, ShapesParams, ShapesResults> = {
  id: "shapes",
  defaultParams: { shape: "rectangle" },
  outputs: OUTPUTS,
  stateVariables: ["length", "breadth", "height", "radius"],

  initialize() {
    return { length: 4, breadth: 3, height: 2, radius: 3 };
  },

  /** Play grows the shape, one unit at a time along its length. */
  advance(state, dt) {
    return { ...state, length: Math.min(MAX_SIDE, state.length + dt) };
  },

  step(state, _params, sign) {
    return { ...state, length: whole(state.length + sign, MAX_SIDE) };
  },

  derive(state, params) {
    const l = whole(state.length, MAX_SIDE);
    const b = whole(state.breadth, MAX_SIDE);
    const h = whole(state.height, MAX_HEIGHT);
    const r = whole(state.radius, MAX_RADIUS);
    const shape = params.shape;
    let area = l * b;
    let perimeter = 2 * (l + b);
    let squares = l * b;
    let volume = 0;
    let surfaceArea = 0;
    const box = shape === "cuboid";
    if (shape === "triangle") {
      area = (l * b) / 2;
      perimeter = l + b + Math.hypot(l, b);
      squares = squaresInTriangle(l, b);
    } else if (shape === "parallelogram") {
      // Base l, height b, the top slid across by one unit.
      perimeter = 2 * (l + Math.hypot(1, b));
      squares = Math.max(0, (l - 1) * b);
    } else if (shape === "circle") {
      area = Math.PI * r * r;
      perimeter = 2 * Math.PI * r;
      squares = squaresInCircle(r);
    } else if (shape === "cuboid") {
      volume = l * b * h;
      surfaceArea = 2 * (l * b + b * h + h * l);
    }
    return {
      shape: Math.max(0, SHAPE_ORDER.indexOf(shape)),
      length: l,
      breadth: b,
      height: h,
      radius: r,
      area,
      perimeter,
      squares,
      volume,
      surfaceArea: shape === "cuboid" ? surfaceArea : area,
      cubes: volume,
      faceLB: box ? l * b : 0,
      faceLH: box ? l * h : 0,
      faceBH: box ? b * h : 0,
    };
  },

  getVariable(state, id) {
    return id === "length" || id === "breadth" || id === "height" || id === "radius" ? state[id] : undefined;
  },

  setVariable(state, id, value) {
    if (id === "length" || id === "breadth") return { ...state, [id]: whole(value, MAX_SIDE) };
    if (id === "height") return { ...state, height: whole(value, MAX_HEIGHT) };
    if (id === "radius") return { ...state, radius: whole(value, MAX_RADIUS) };
    return state;
  },
};
