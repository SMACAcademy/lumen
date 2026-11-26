import { defineConcept } from "@ise/concept-schema";

/**
 * Symmetry, polygons and solid shapes for classes 6 to 8.
 *
 * A line of symmetry folds a shape onto itself; a regular polygon has as
 * many as it has sides. Turn a shape about its centre and count how often it
 * fits its own tracing in one full turn: that is its order of rotational
 * symmetry. The diagonals from one corner cut a polygon into n − 2
 * triangles, so its angles add to (n − 2) × 180°, and its exterior angles
 * always make 360°. Solids have faces, edges and vertices, and for every
 * polyhedron F + V − E = 2. Six squares fold into a cube only if no two land
 * on the same face, and a solid looks different from the top, front and
 * side.
 */

/** Counts 0 to 12, and "endless" for a circle. */
const COUNT_LABELS = Object.fromEntries([...Array.from({ length: 13 }, (_, k) => [String(k), String(k)]), ["100", "endless"]]);

export const symmetryAndSolids = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "symmetry-and-solids",
    title: "Symmetry, Polygons and Solids",
    tagline: "Fold a shape along a mirror, turn it on its tracing, cut a polygon into triangles, and fold six squares into a cube.",
    domain: "mathematics",
    category: "geometry",
    grade: { min: 6, max: 8 },
    difficulty: "introductory",
    estimatedMinutes: 25,
    objective:
      "Find the lines of symmetry of shapes and letters, find the order of rotational symmetry, use the angle sum (n − 2) × 180° of a polygon and the 360° of its exterior angles, count the faces, edges and vertices of solids and check Euler's formula, tell which nets fold into a cube, and draw the top, front and side views of a solid.",
    tags: ["symmetry", "line of symmetry", "rotational symmetry", "polygons", "angle sum", "exterior angle", "solid shapes", "faces edges vertices", "Euler's formula", "nets", "views", "class 6", "class 7", "class 8"],
  },

  connections: [
    {
      id: "angles-and-shapes",
      title: "Angles, Triangles and Circles",
      domain: "mathematics",
      relation: "prerequisite",
      note: "A triangle's angles add to 180° — the start of every polygon's angle sum.",
      available: true,
    },
    {
      id: "area-and-volume",
      title: "Area and Volume",
      domain: "mathematics",
      relation: "related",
      note: "A cuboid's net, measured: the six rectangles give its surface area.",
      available: true,
    },
  ],

  variables: [
    {
      id: "shape",
      symbol: "shape",
      name: "Shape",
      meaning: "A polygon, a letter of the alphabet, or a circle.",
      binding: { kind: "param", key: "shape" },
      control: {
        type: "choice",
        options: [
          { value: "triangle", label: "Equilateral triangle" },
          { value: "square", label: "Square" },
          { value: "pentagon", label: "Regular pentagon" },
          { value: "hexagon", label: "Regular hexagon" },
          { value: "octagon", label: "Regular octagon" },
          { value: "rectangle", label: "Rectangle" },
          { value: "rhombus", label: "Rhombus" },
          { value: "kite", label: "Kite" },
          { value: "parallelogram", label: "Parallelogram" },
          { value: "isosceles", label: "Isosceles triangle" },
          { value: "scalene", label: "Scalene triangle" },
          { value: "circle", label: "Circle" },
          { value: "A", label: "Letter A" },
          { value: "E", label: "Letter E" },
          { value: "F", label: "Letter F" },
          { value: "H", label: "Letter H" },
          { value: "N", label: "Letter N" },
          { value: "T", label: "Letter T" },
          { value: "X", label: "Letter X" },
          { value: "Z", label: "Letter Z" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "mirror",
      symbol: "mirror",
      name: "Mirror line",
      meaning: "The mirror's slope, through the shape's centre: 0° is level, 90° is upright. Drag round the shape, or use the slider.",
      binding: { kind: "state", key: "mirror" },
      control: { type: "range", unit: "deg", min: 0, max: 179.5, step: 0.5, presets: [0, 45, 90, 135] },
      group: "primary",
      color: "angle",
    },
    {
      id: "turn",
      symbol: "turn",
      name: "Turn",
      meaning: "How far the shape is turned about its centre, anticlockwise. Press play to turn it all the way round.",
      binding: { kind: "state", key: "turn" },
      control: { type: "range", unit: "deg", min: 0, max: 360, step: 1, presets: [0, 90, 180, 270, 360] },
      group: "motion",
      color: "angle",
    },
    {
      id: "sides",
      symbol: "n",
      name: "Number of sides",
      meaning: "From a triangle (3) to a dodecagon (12).",
      binding: { kind: "state", key: "sides" },
      control: { type: "range", unit: "1", min: 3, max: 12, step: 1 },
      group: "primary",
      color: "curve",
    },
    {
      id: "pull",
      symbol: "pull",
      name: "Pull corner A out",
      meaning: "0 keeps the polygon regular. Pulling A away from the centre changes the angles, but not their sum.",
      binding: { kind: "state", key: "pull" },
      control: { type: "range", unit: "1", min: 0, max: 0.3, step: 0.05 },
      group: "primary",
      color: "angle",
    },
    {
      id: "solid",
      symbol: "solid",
      name: "Solid",
      meaning: "A solid standing on its base.",
      binding: { kind: "param", key: "solid" },
      control: {
        type: "choice",
        options: [
          { value: "cube", label: "Cube" },
          { value: "cuboid", label: "Cuboid" },
          { value: "prism", label: "Prism" },
          { value: "pyramid", label: "Pyramid" },
          { value: "cylinder", label: "Cylinder" },
          { value: "cone", label: "Cone" },
          { value: "sphere", label: "Sphere" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "baseSides",
      symbol: "base",
      name: "Sides of the base",
      meaning: "For a prism or a pyramid: 3 for a triangular base, 4 square, 5 pentagonal, up to 8.",
      binding: { kind: "state", key: "baseSides" },
      control: { type: "range", unit: "1", min: 3, max: 8, step: 1 },
      group: "primary",
      color: "curve",
    },
    {
      id: "net",
      symbol: "net",
      name: "Net",
      meaning: "Six squares joined edge to edge.",
      binding: { kind: "param", key: "net" },
      control: {
        type: "choice",
        options: [
          { value: "cross", label: "Cross" },
          { value: "ell", label: "T shape" },
          { value: "zigzag", label: "Four in a row, ends opposite" },
          { value: "two-three-one", label: "Two, three and one" },
          { value: "stairs", label: "Staircase" },
          { value: "three-three", label: "Three and three" },
          { value: "row-of-six", label: "Six in a row" },
          { value: "five-and-one", label: "Five in a row and one" },
          { value: "u-shape", label: "U shape" },
          { value: "block", label: "Two rows of three" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "fold",
      symbol: "fold",
      name: "Fold",
      meaning: "0 is flat; 1 has every square folded up a right angle. Press play to fold it.",
      binding: { kind: "state", key: "fold" },
      control: { type: "range", unit: "1", min: 0, max: 1, step: 0.05 },
      group: "motion",
      color: "angle",
    },
  ],

  quantities: [
    // Mirror
    { id: "folds", symbol: "folds?", name: "Does it fold onto itself?", meaning: "Yes when the mirror is a line of symmetry.", result: "folds", format: { kind: "label", labels: { "0": "no", "1": "yes" } }, color: "angle", highlight: "mirror", headline: true },
    { id: "lines", symbol: "lines", name: "Lines of symmetry", meaning: "How many different mirror lines fold the shape onto itself.", result: "lines", format: { kind: "label", labels: COUNT_LABELS }, color: "sine", highlight: "mirror", headline: true },
    // Turn
    { id: "turnFits", symbol: "fits?", name: "Does it fit its tracing?", meaning: "Yes when the turned shape covers where it started exactly.", result: "turnFits", format: { kind: "label", labels: { "0": "no", "1": "yes" } }, color: "angle", highlight: "turn", headline: true },
    { id: "fitsCounted", symbol: "fits so far", name: "Fits so far", meaning: "How many times it has fitted on the way round, after any turn at all (the full turn counts).", result: "fitsCounted", format: { kind: "label", labels: COUNT_LABELS }, color: "neutral", highlight: "turn" },
    { id: "order", symbol: "order", name: "Order of rotational symmetry", meaning: "How many times it fits in one full turn. Order 1 means no rotational symmetry.", result: "order", format: { kind: "label", labels: COUNT_LABELS }, color: "sine", highlight: "turn", headline: true },
    { id: "smallestTurn", symbol: "angle of turn", name: "Smallest turn that fits", meaning: "360° ÷ the order (0 shown for a circle, which fits after any turn).", result: "smallestTurn", format: { kind: "number", digits: 0 }, unit: "deg", color: "angle", highlight: "turn" },
    { id: "hasRotational", symbol: "rotational?", name: "Has rotational symmetry?", meaning: "Yes when it fits before a full turn: order 2 or more.", result: "hasRotational", format: { kind: "label", labels: { "0": "no (order 1)", "1": "yes" } }, color: "neutral", highlight: "turn" },
    // Polygon
    { id: "polygonSides", symbol: "n", name: "Sides", meaning: "The number of sides (and corners).", result: "sides", format: { kind: "label", labels: { "3": "3 (triangle)", "4": "4 (quadrilateral)", "5": "5 (pentagon)", "6": "6 (hexagon)", "7": "7 (heptagon)", "8": "8 (octagon)", "9": "9 (nonagon)", "10": "10 (decagon)", "11": "11", "12": "12 (dodecagon)" } }, color: "curve", highlight: "polygon" },
    { id: "triangles", symbol: "n − 2", name: "Triangles from one corner", meaning: "The diagonals from A cut the polygon into this many triangles.", result: "triangles", format: { kind: "integer" }, color: "cosine", highlight: "polygon", headline: true },
    { id: "angleSum", symbol: "angle sum", name: "Sum of the interior angles", meaning: "The triangles' angles together: (n − 2) × 180°.", result: "angleSum", format: { kind: "number", digits: 0 }, unit: "deg", color: "sine", highlight: "polygon", headline: true },
    { id: "eachInterior", symbol: "each angle", name: "Each angle of the regular polygon", meaning: "The angle sum shared equally between n corners.", result: "eachInterior", format: { kind: "number", digits: 1 }, unit: "deg", color: "sine", highlight: "polygon" },
    { id: "eachExterior", symbol: "each exterior", name: "Each exterior angle of the regular polygon", meaning: "360° shared equally between n corners.", result: "eachExterior", format: { kind: "number", digits: 1 }, unit: "deg", color: "angle", highlight: "exterior" },
    { id: "angleA", symbol: "∠A", name: "Angle at A", meaning: "Measured from the drawing.", result: "angleA", format: { kind: "number", digits: 1 }, unit: "deg", color: "angle", highlight: "polygon" },
    { id: "measuredSum", symbol: "measured sum", name: "Angles measured and added", meaning: "Every angle of the drawn polygon measured, then added up.", result: "measuredSum", format: { kind: "number", digits: 1 }, unit: "deg", color: "neutral", highlight: "polygon" },
    { id: "exteriorSum", symbol: "exterior sum", name: "Exterior angles added", meaning: "180° minus each interior angle, all added up.", result: "exteriorSum", format: { kind: "number", digits: 1 }, unit: "deg", color: "angle", highlight: "exterior", headline: true },
    // Solid
    { id: "faces", symbol: "F", name: "Faces", meaning: "Flat faces. A curved surface is counted on its own, below.", result: "faces", format: { kind: "integer" }, color: "sine", highlight: "solid", headline: true },
    { id: "edges", symbol: "E", name: "Edges", meaning: "Where two faces or surfaces meet.", result: "edges", format: { kind: "integer" }, color: "cosine", highlight: "solid", headline: true },
    { id: "vertices", symbol: "V", name: "Vertices", meaning: "Corners, where edges meet.", result: "vertices", format: { kind: "integer" }, color: "angle", highlight: "solid", headline: true },
    { id: "curved", symbol: "curved", name: "Curved surfaces", meaning: "1 for a cylinder, cone or sphere; 0 for a polyhedron.", result: "curved", format: { kind: "integer" }, color: "neutral", highlight: "solid" },
    { id: "isPolyhedron", symbol: "polyhedron?", name: "Is it a polyhedron?", meaning: "Yes when every face is a flat polygon.", result: "isPolyhedron", format: { kind: "label", labels: { "0": "no: it has a curved surface", "1": "yes" } }, color: "neutral", highlight: "solid" },
    { id: "eulerSum", symbol: "F + V − E", name: "Faces + vertices − edges", meaning: "2 for every polyhedron (0 shown for a solid with a curved surface: the formula is only for polyhedra).", result: "eulerSum", format: { kind: "integer" }, color: "tangent", highlight: "solid", headline: true },
    { id: "topView", symbol: "top", name: "Top view", meaning: "The shape seen from straight above.", result: "topView", format: { kind: "label", labels: { "0": "circle", "3": "triangle", "4": "square", "5": "pentagon", "6": "hexagon", "7": "heptagon", "8": "octagon", "40": "rectangle" } }, color: "neutral", highlight: "views" },
    { id: "frontView", symbol: "front", name: "Front view", meaning: "The shape seen from straight in front.", result: "frontView", format: { kind: "label", labels: { "0": "circle", "3": "triangle", "4": "square", "40": "rectangle" } }, color: "neutral", highlight: "views" },
    { id: "sideView", symbol: "side", name: "Side view", meaning: "The shape seen from the right.", result: "sideView", format: { kind: "label", labels: { "0": "circle", "3": "triangle", "4": "square", "40": "rectangle" } }, color: "neutral", highlight: "views" },
    // Net
    { id: "facesCovered", symbol: "faces covered", name: "Faces covered when folded", meaning: "How many different faces of a cube the six squares land on.", result: "facesCovered", format: { kind: "integer" }, color: "sine", highlight: "net", headline: true },
    { id: "netFolds", symbol: "a cube?", name: "Folds into a cube?", meaning: "Yes when the six squares land on six different faces.", result: "netFolds", format: { kind: "label", labels: { "0": "no", "1": "yes" } }, color: "angle", highlight: "net", headline: true },
  ],

  equations: [
    {
      id: "regular-lines",
      topic: "symmetry-lines",
      title: "Lines of symmetry of a regular polygon",
      words: "a regular polygon has as many lines of symmetry as sides",
      tokens: [
        { kind: "ref", id: "lines" },
        { kind: "op", value: "=" },
        { kind: "text", value: "number of sides" },
      ],
      reading: "Every line of symmetry passes through the centre. In a regular polygon each corner and the middle of each side has one through it.",
      assumptions: ["A regular polygon: all sides and all angles equal"],
      discoverable: true,
    },
    {
      id: "rotation-order",
      topic: "rotational-symmetry",
      title: "Order of rotational symmetry",
      words: "smallest turn that fits = 360° ÷ order",
      tokens: [
        { kind: "ref", id: "smallestTurn" },
        { kind: "op", value: "=" },
        { kind: "text", value: "360°" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "order" },
      ],
      reading: "Count how many times the shape fits its tracing in one full turn, counting the full turn itself. Order 1 means it fits only after a full turn: no rotational symmetry.",
      assumptions: ["Turning about the shape's centre"],
    },
    {
      id: "angle-sum",
      topic: "polygons-school",
      title: "Angle sum of a polygon",
      words: "angle sum = (number of sides − 2) × 180°",
      tokens: [
        { kind: "ref", id: "angleSum" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "triangles" },
        { kind: "op", value: "·" },
        { kind: "text", value: "180°" },
      ],
      reading: "The diagonals from one corner cut an n-sided polygon into n − 2 triangles, and each triangle's angles make 180°.",
      assumptions: ["A convex polygon, regular or not"],
      discoverable: true,
    },
    {
      id: "exterior-sum",
      topic: "polygons-school",
      title: "Exterior angles",
      words: "the exterior angles of a polygon add to 360°",
      tokens: [
        { kind: "ref", id: "eachExterior" },
        { kind: "op", value: "=" },
        { kind: "text", value: "360°" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "polygonSides" },
      ],
      reading: "Walk round the polygon: at each corner you turn through its exterior angle, and one lap is one full turn, 360°. In a regular polygon the turns are equal, so each is 360° ÷ n.",
      assumptions: ["A convex polygon; equal exterior angles only when it is regular"],
    },
    {
      id: "euler",
      topic: "solid-shapes",
      title: "Euler's formula",
      words: "faces + vertices − edges = 2",
      tokens: [
        { kind: "ref", id: "faces" },
        { kind: "op", value: "+" },
        { kind: "ref", id: "vertices" },
        { kind: "op", value: "−" },
        { kind: "ref", id: "edges" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2" },
      ],
      reading: "It holds for every polyhedron — a solid whose faces are all flat polygons, like a cube, prism or pyramid. A cylinder, cone or sphere has a curved surface, so it is not a polyhedron.",
      assumptions: ["A polyhedron with no holes through it"],
      discoverable: true,
    },
    {
      id: "cube-net",
      topic: "nets-views",
      title: "A net of a cube",
      words: "a net folds into a cube when its six squares land on six different faces",
      tokens: [
        { kind: "ref", id: "facesCovered" },
        { kind: "op", value: "=" },
        { kind: "text", value: "6 for a net of a cube" },
      ],
      reading: "There are 11 different nets of a cube. Six squares in a row, or a block of two rows of three, put two squares on the same face and leave a face open.",
      assumptions: ["Six equal squares joined edge to edge"],
    },
  ],

  simulation: {
    model: "symsolid",
    params: { shape: "rectangle", solid: "cube", net: "cross" },
    playLabel: "Turn and fold",
  },

  visualization: {
    renderer: "symsolid",
    hint: "Drag round the shape to turn the mirror or the shape — or use the sliders. Press play to turn a shape or fold a net.",
    layers: [
      { id: "mirror", label: "Mirror line" },
      { id: "turn", label: "Turning shape" },
      { id: "polygon", label: "Polygon and triangles" },
      { id: "exterior", label: "Exterior angles" },
      { id: "solid", label: "Solid" },
      { id: "views", label: "Top, front and side views" },
      { id: "net", label: "Net" },
      { id: "labels", label: "Counts and sizes", optional: true },
    ],
  },

  modes: [
    { id: "mirror", label: "Lines of symmetry", description: "Fold a shape along a mirror line", layers: ["mirror", "labels"], graphs: [], equations: ["regular-lines"] },
    { id: "turn", label: "Turning symmetry", description: "Turn a shape on its tracing", layers: ["turn", "labels"], graphs: [], equations: ["rotation-order"] },
    { id: "polygon", label: "Polygon angles", description: "Cut a polygon into triangles", layers: ["polygon", "labels"], graphs: [], equations: ["angle-sum"] },
    { id: "exterior", label: "Exterior angles", description: "One lap of turns", layers: ["polygon", "exterior", "labels"], graphs: [], equations: ["exterior-sum", "angle-sum"] },
    { id: "solid", label: "Solids", description: "Faces, edges and vertices", layers: ["solid", "labels"], graphs: [], equations: ["euler"] },
    { id: "views", label: "Views", description: "From the top, front and side", layers: ["solid", "views", "labels"], graphs: [], equations: ["euler"] },
    { id: "net", label: "Nets", description: "Fold six squares into a cube", layers: ["net", "labels"], graphs: [], equations: ["cube-net"] },
  ],
  defaultMode: "mirror",
  graphs: [],

  activities: {
    observe: [
      {
        id: "find-a-line",
        prompt: "Turn the mirror until the rectangle folds onto itself.",
        condition: { type: "compare", quantity: "folds", op: "eq", value: 1 },
      },
      {
        id: "full-turn",
        prompt: "Turn a shape all the way round, through 360°.",
        condition: { type: "compare", quantity: "turn", op: "gte", value: 360 },
      },
      {
        id: "fold-a-cube",
        prompt: "Fold a net right up into a closed cube.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "fold", op: "gte", value: 1 },
            { type: "compare", quantity: "netFolds", op: "eq", value: 1 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "pull-a-corner",
        question: "A regular hexagon's angles add to 720°. Pull corner A out, so it is no longer regular. What happens to the angle sum?",
        variable: "pull",
        from: 0,
        to: 0.3,
        quantity: "measuredSum",
        options: ["increase", "decrease", "same"],
        tolerance: 0.000001,
        mode: "polygon",
        given: { sides: 6 },
        explanation: "It stays 720°. Angle A shrinks from 120° to about 94.5°, and its two neighbours open up by exactly as much. It is still six sides, so still four triangles.",
      },
      {
        id: "more-sides",
        question: "A regular polygon gets more sides, from 5 to 10. What happens to each exterior angle?",
        variable: "sides",
        from: 5,
        to: 10,
        quantity: "eachExterior",
        options: ["increase", "decrease", "same"],
        mode: "exterior",
        explanation: "It decreases, from 72° to 36°. The exterior angles always share one full turn, 360°, so more corners means a smaller turn at each.",
      },
    ],

    experiment: {
      title: "Angle sums",
      instructions: "Record the triangles and the angle sum for polygons with 3, 4, 5, 6 and 8 sides.",
      columns: ["polygonSides", "triangles", "angleSum"],
      minRows: 4,
      discovery: {
        question: "How does the angle sum follow from the number of triangles?",
        choices: [
          { id: "times-180", label: "Number of triangles × 180°", correct: true },
          { id: "times-90", label: "Number of sides × 90°", correct: false },
          { id: "always-360", label: "Always 360°", correct: false },
          { id: "times-60", label: "Number of sides × 60°", correct: false },
        ],
        reveals: "angle-sum",
        insight: "There are always 2 fewer triangles than sides, so the sum is (n − 2) × 180°. Each extra side adds one more triangle, one more 180°.",
      },
    },

    explain: [
      {
        id: "mirror",
        title: "The mirror line",
        body: "Does this line fold the shape onto itself? {{folds}}. Lines of symmetry of this shape: {{lines}}.",
      },
      {
        id: "turn",
        title: "The turn",
        body: "Does it fit its tracing now? {{turnFits}}. It fits {{order}} times in a full turn: its order of rotational symmetry. The smallest turn that fits is {{smallestTurn}}.",
      },
      {
        id: "polygon",
        title: "The polygon",
        body: "{{triangles}} triangles, so the angles add to {{angleSum}}. Measured from the drawing: {{measuredSum}}. Each exterior angle of the regular polygon is {{eachExterior}}, and the exterior angles add to {{exteriorSum}}.",
      },
      {
        id: "solid",
        title: "The solid",
        body: "Faces {{faces}}, edges {{edges}}, vertices {{vertices}}. A polyhedron? {{isPolyhedron}}. F + V − E = {{eulerSum}}.",
      },
      {
        id: "net",
        title: "The net",
        body: "Folded up, the six squares cover {{facesCovered}} different faces. A cube? {{netFolds}}.",
      },
    ],

    challenges: [
      {
        id: "turn-not-fold",
        title: "Turns but will not fold",
        prompt: "Find a shape with rotational symmetry but no line of symmetry.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "hasRotational", op: "eq", value: 1 },
            { type: "compare", quantity: "lines", op: "eq", value: 0 },
          ],
        },
        hint: "Try the letters, and a shape with two pairs of parallel sides.",
        success: "N, Z and the parallelogram fit after a half turn (order 2), but no mirror line folds them.",
      },
      {
        id: "eighteen-edges",
        title: "Eighteen edges",
        prompt: "Find a solid with 18 edges.",
        goal: { type: "compare", quantity: "edges", op: "eq", value: 18 },
        hint: "A prism has 3 edges for every side of its base: round the bottom, round the top, and up the sides.",
        success: "A hexagonal prism: 6 + 6 + 6 = 18 edges, with 8 faces and 12 vertices. And 8 + 12 − 18 = 2.",
      },
    ],
  },

  realWorld: [
    { title: "Logos and rangoli", description: "Rangoli patterns and many logos are drawn with lines of symmetry and turning symmetry; a wheel's spokes give it an order equal to their number." },
    { title: "Honeycombs and tiles", description: "Regular hexagons fit together with no gaps because three 120° angles make 360°." },
    { title: "Boxes from card", description: "Every cardboard box is cut flat as a net, folded up and glued along its edges." },
  ],
});
