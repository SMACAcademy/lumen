import { advanced, branch, chapter, jee } from "./schema";

/**
 * Mathematics as JEE asks for it: the whole class 11 and 12 syllabus, not
 * just the parts physics leans on (those live in the toolkit branch).
 *
 * NEET has no mathematics paper, so everything here is tagged for JEE only.
 * Where an existing lab already teaches an idea it is marked as such — the
 * unit circle is the same unit circle whichever subject asks about it.
 */

export const algebra = branch(
  "algebra",
  "Algebra",
  "Functions, complex numbers, sequences, counting and matrices.",
  [
    chapter(
      "sets-relations-functions",
      "Sets, relations and functions",
      { grade: 11, kit: "graphing", wave: 16, blurb: "What a function is, how to draw one, and how two of them combine." },
      [
        jee("sets-venn", "Sets, subsets and Venn diagrams", { status: "ready", built: { lab: "sets-relations-functions", level: "sets-and-relations" } }),
        jee("relations", "Relations: reflexive, symmetric, transitive", { status: "ready", built: { lab: "sets-relations-functions", level: "sets-and-relations" } }),
        jee("functions-graphs", "Functions, domain, range and their graphs", { status: "ready", built: { lab: "sets-relations-functions", level: "arrows-and-graphs" } }),
        jee("function-types", "One-one, onto and invertible functions", { status: "ready", built: { lab: "sets-relations-functions", level: "arrows-and-graphs" } }),
        jee("composition-inverse", "Composition and inverse of functions", { status: "ready", built: { lab: "sets-relations-functions", level: "chains-and-inverses" } }),
        jee("graph-transformations", "Shifting, stretching and reflecting graphs", {
          status: "ready",
          built: { lab: "sinusoidal-functions" },
          note: "The sinusoid lab shifts and stretches one graph with sliders; other families follow.",
        }),
      ],
    ),
    chapter(
      "complex-quadratic",
      "Complex numbers and quadratic equations",
      { grade: 11, kit: "vectors", wave: 16, blurb: "A number that is also an arrow — and the roots of every quadratic." },
      [
        jee("complex-algebra", "Complex numbers and their algebra", { status: "ready", built: { lab: "complex-numbers", level: "the-argand-plane" } }),
        jee("argand-plane", "The Argand plane: modulus and argument", { status: "ready", built: { lab: "complex-numbers", level: "the-argand-plane" } }),
        jee("polar-euler", "Polar and Euler form, and multiplication as rotation", { status: "ready", built: { lab: "complex-numbers", level: "turn-and-stretch" } }),
        jee("roots-of-unity", "Roots of unity", { status: "ready", built: { lab: "complex-numbers", level: "turn-and-stretch" } }),
        jee("quadratic-roots", "Quadratic equations and the discriminant", { status: "ready", built: { lab: "complex-numbers", level: "the-discriminant" }, buildsOn: ["quadratic-graph"] }),
        jee("roots-coefficients", "Relations between roots and coefficients", { status: "ready", built: { lab: "complex-numbers", level: "the-discriminant" } }),
        advanced("quadratic-location", "Location of roots and quadratic inequalities", { status: "ready", built: { lab: "complex-numbers", level: "where-the-roots-lie" } }),
      ],
    ),
    chapter(
      "sequences-series",
      "Sequences and series",
      { grade: 11, kit: "graphing", wave: 16, blurb: "Patterns that grow by adding and by multiplying, and where they end up." },
      [
        jee("arithmetic-progression", "Arithmetic progressions and their sums", { status: "ready", built: { lab: "sequences-and-series", level: "adding-in-pairs" }, buildsOn: ["ap-school"] }),
        jee("geometric-progression", "Geometric progressions, finite and infinite", { status: "ready", built: { lab: "sequences-and-series", level: "halves-for-ever" } }),
        jee("am-gm", "Arithmetic and geometric means, and the AM–GM inequality", { status: "ready", built: { lab: "sequences-and-series", level: "means-and-blocks" } }),
        jee("special-series", "Sums of squares, cubes and special series", { status: "ready", built: { lab: "sequences-and-series", level: "means-and-blocks" } }),
        advanced("arithmetico-geometric", "Arithmetico-geometric series", { status: "ready", built: { lab: "sequences-and-series", level: "halves-for-ever" } }),
      ],
    ),
    chapter(
      "permutations-combinations",
      "Permutations and combinations",
      { grade: 11, kit: "counting", wave: 17, blurb: "Counting without listing: arrangements, selections and restrictions." },
      [
        jee("counting-principle", "The fundamental principle of counting", { status: "ready", built: { lab: "counting-and-binomial", level: "multiply-the-choices" } }),
        jee("permutations", "Permutations, with and without repetition", { status: "ready", built: { lab: "counting-and-binomial", level: "multiply-the-choices" } }),
        jee("combinations", "Combinations and choosing", { status: "ready", built: { lab: "counting-and-binomial", level: "choose-a-team" } }),
        jee("restricted-arrangements", "Arrangements with restrictions and circular arrangements", { status: "ready", built: { lab: "counting-and-binomial", level: "seats-and-necklaces" } }),
        advanced("distributions", "Distributing objects into groups", { status: "ready", built: { lab: "counting-and-binomial", level: "choose-a-team" } }),
      ],
    ),
    chapter(
      "binomial-theorem",
      "Binomial theorem",
      { grade: 11, kit: "counting", wave: 17, blurb: "Expanding (a + b)ⁿ, and why Pascal's triangle does it for you." },
      [
        jee("pascal-triangle", "Pascal's triangle and binomial coefficients", { status: "ready", built: { lab: "counting-and-binomial", level: "pascals-triangle" } }),
        jee("binomial-expansion", "Expansion of (a + b)ⁿ", { status: "ready", built: { lab: "counting-and-binomial", level: "pascals-triangle" } }),
        jee("general-term", "The general and middle terms", { status: "ready", built: { lab: "counting-and-binomial", level: "pascals-triangle" } }),
        advanced("coefficient-identities", "Identities among binomial coefficients", { status: "ready", built: { lab: "counting-and-binomial", level: "pascals-triangle" } }),
      ],
    ),
    chapter(
      "matrices-determinants",
      "Matrices and determinants",
      { grade: 12, kit: "matrices", wave: 17, blurb: "A matrix is a transformation of the plane; its determinant is how it scales area." },
      [
        jee("matrix-operations", "Matrices and their operations", { status: "ready", built: { lab: "matrices-and-determinants", level: "where-i-and-j-land" } }),
        jee("matrix-transformations", "Matrices as transformations of the plane", { status: "ready", built: { lab: "matrices-and-determinants", level: "where-i-and-j-land" } }),
        jee("determinants", "Determinants as area and volume scale factors", { status: "ready", built: { lab: "matrices-and-determinants", level: "the-area-scale" } }),
        jee("inverse-adjoint", "Adjoint and inverse of a matrix", { status: "ready", built: { lab: "matrices-and-determinants", level: "undoing-a-matrix" } }),
        jee("linear-systems", "Solving systems of linear equations", { status: "ready", built: { lab: "matrices-and-determinants", level: "two-lines-one-point" } }),
        advanced("special-matrices", "Symmetric, skew-symmetric and orthogonal matrices", { status: "ready", built: { lab: "matrices-and-determinants", level: "undoing-a-matrix" } }),
      ],
    ),
  ],
  "maths",
);

export const trigonometry = branch(
  "trigonometry",
  "Trigonometry",
  "Angles of any size, the identities between them, and the triangles they solve.",
  [
    chapter(
      "trig-functions",
      "Trigonometric functions",
      { grade: 11, kit: "graphing", wave: 18, blurb: "Sine and cosine for any angle, and the formulas that combine angles." },
      [
        jee("radian-measure", "Radian measure", { status: "ready", built: { lab: "unit-circle-sine-cosine" } }),
        jee("trig-any-angle", "Trigonometric functions of any angle", {
          status: "ready",
          built: { lab: "unit-circle-sine-cosine", level: "shadow-of-a-dot" },
        }),
        jee("trig-graphs", "Graphs of the trigonometric functions", { status: "ready", built: { lab: "sinusoidal-functions" } }),
        jee("compound-angles", "Compound, multiple and sub-multiple angles", { status: "ready", built: { lab: "angles-and-inverses", level: "adding-angles" } }),
        jee("trig-equations", "Trigonometric equations and their general solutions", { status: "ready", built: { lab: "angles-and-inverses", level: "every-solution" } }),
      ],
    ),
    chapter(
      "inverse-trig",
      "Inverse trigonometric functions",
      { grade: 12, kit: "graphing", wave: 18, blurb: "Running sine backwards, and why it needs a restricted domain." },
      [
        jee("inverse-trig-principal", "Principal values and restricted domains", { status: "ready", built: { lab: "angles-and-inverses", level: "running-backwards" } }),
        jee("inverse-trig-graphs", "Graphs of the inverse functions", { status: "ready", built: { lab: "angles-and-inverses", level: "running-backwards" } }),
        jee("inverse-trig-identities", "Identities among inverse trigonometric functions", { status: "ready", built: { lab: "angles-and-inverses", level: "running-backwards" } }),
      ],
    ),
    chapter(
      "triangles",
      "Properties of triangles",
      { grade: 11, kit: "geometry", wave: 18, blurb: "The sine and cosine rules, and measuring what you cannot reach." },
      [
        jee("sine-rule", "The sine rule", { status: "ready", built: { lab: "solving-triangles", level: "sines-and-cosines" } }),
        jee("cosine-rule", "The cosine rule", { status: "ready", built: { lab: "solving-triangles", level: "sines-and-cosines" } }),
        jee("heights-distances", "Heights and distances", { status: "ready", built: { lab: "solving-triangles", level: "out-of-reach" }, buildsOn: ["heights-distances-school"] }),
        advanced("triangle-centres", "Circumradius, inradius and the centres of a triangle", { status: "ready", built: { lab: "solving-triangles", level: "centres-of-a-triangle" } }),
      ],
    ),
  ],
  "maths",
);

export const coordinateGeometry = branch(
  "coordinate-geometry",
  "Coordinate geometry",
  "Lines, circles and conics, written as equations and drawn as curves.",
  [
    chapter(
      "straight-lines",
      "Straight lines",
      { grade: 11, kit: "geometry", wave: 19, blurb: "Slope, intercepts and distances: the line as an equation." },
      [
        jee("line-forms", "Slope and the forms of a line's equation", { status: "ready", built: { lab: "lines-and-circles", level: "forms-of-a-line" }, buildsOn: ["straight-line-graph", "distance-formula"] }),
        jee("angle-between-lines", "The angle between two lines", { status: "ready", built: { lab: "lines-and-circles", level: "lines-at-an-angle" } }),
        jee("point-line-distance", "Distance from a point to a line", { status: "ready", built: { lab: "lines-and-circles", level: "lines-at-an-angle" } }),
        advanced("family-of-lines", "Families of lines through a point", { status: "ready", built: { lab: "lines-and-circles", level: "lines-at-an-angle" } }),
      ],
    ),
    chapter(
      "circles",
      "Circles",
      { grade: 11, kit: "geometry", wave: 19, blurb: "The circle's equation, and lines that touch it." },
      [
        jee("circle-equation", "The equation of a circle", { status: "ready", built: { lab: "lines-and-circles", level: "line-meets-circle" } }),
        jee("circle-tangents", "Tangents and normals to a circle", { status: "ready", built: { lab: "lines-and-circles", level: "tangents-and-radical-axis" } }),
        jee("circle-line", "Where a line meets a circle", { status: "ready", built: { lab: "lines-and-circles", level: "line-meets-circle" } }),
        advanced("family-of-circles", "Families of circles and the radical axis", { status: "ready", built: { lab: "lines-and-circles", level: "tangents-and-radical-axis" } }),
      ],
    ),
    chapter(
      "conic-sections",
      "Conic sections",
      { grade: 11, kit: "geometry", wave: 19, blurb: "Parabola, ellipse and hyperbola — one idea, three shapes." },
      [
        jee("parabola", "The parabola: focus, directrix and equation", { status: "ready", built: { lab: "conic-sections", level: "slicing-the-cone" } }),
        jee("ellipse", "The ellipse", { status: "ready", built: { lab: "conic-sections", level: "pins-and-string" } }),
        jee("hyperbola", "The hyperbola", { status: "ready", built: { lab: "conic-sections", level: "pins-and-string" } }),
        jee("eccentricity", "Eccentricity: one number from circle to hyperbola", { status: "ready", built: { lab: "conic-sections", level: "slicing-the-cone" }, note: "The gravitation lab already draws every conic from its eccentricity; the geometry is next." }),
        advanced("conic-tangents", "Tangents and normals to conics", { status: "ready", built: { lab: "conic-sections", level: "touching-the-curve" } }),
      ],
    ),
  ],
  "maths",
);

export const calculus = branch(
  "calculus",
  "Calculus",
  "Limits, rates of change, accumulation, and equations about change itself.",
  [
    chapter(
      "limits-continuity",
      "Limits and continuity",
      { grade: 11, kit: "graphing", wave: 20, blurb: "What a function approaches, and when a graph has no breaks." },
      [
        jee("limits-intuition", "Limits, graphically and numerically", { status: "ready", built: { lab: "limits-and-continuity", level: "closing-in" } }),
        jee("standard-limits", "Standard limits and how to evaluate them", { status: "ready", built: { lab: "limits-and-continuity", level: "closing-in" } }),
        jee("continuity-of-functions", "Continuity and kinds of discontinuity", { status: "ready", built: { lab: "limits-and-continuity", level: "breaks-and-holes" } }),
        jee("differentiability", "Differentiability, and where it fails", { status: "ready", built: { lab: "limits-and-continuity", level: "zooming-in" } }),
      ],
    ),
    chapter(
      "differentiation",
      "Differentiation",
      { grade: 12, kit: "graphing", wave: 20, blurb: "The derivative as a slope, and the rules that compute it." },
      [
        jee("derivative-as-slope", "The derivative as the slope of a tangent", {
          status: "ready",
          built: { lab: "secant-to-tangent", level: "closing-the-gap" },
        }),
        jee("differentiation-rules", "Product and quotient rules", { status: "ready", built: { lab: "rules-of-differentiation", level: "the-growing-rectangle" } }),
        jee("chain-rule", "The chain rule", { buildsOn: ["differentiation-rules"], status: "ready", built: { lab: "rules-of-differentiation", level: "links-in-a-chain" } }),
        jee("standard-derivatives", "Derivatives of the standard functions", { status: "ready", built: { lab: "slope-graph", level: "the-slope-graph" } }),
        jee("implicit-parametric", "Implicit and parametric differentiation", { status: "ready", built: { lab: "rules-of-differentiation", level: "round-the-circle" } }),
        jee("higher-derivatives", "Second and higher derivatives", { status: "ready", built: { lab: "slope-graph", level: "bending-up-bending-down" } }),
      ],
    ),
    chapter(
      "applications-of-derivatives",
      "Applications of derivatives",
      { grade: 12, kit: "graphing", wave: 20, blurb: "Rates, tangents, and finding the best possible value." },
      [
        jee("rates-of-change", "Rates of change and related rates", { status: "ready", built: { lab: "optimisation-and-rates", level: "tied-together" } }),
        jee("monotonicity", "Increasing and decreasing functions", { status: "ready", built: { lab: "optimisation-and-rates", level: "rising-and-falling" } }),
        jee("maxima-minima", "Maxima and minima", { status: "ready", built: { lab: "optimisation-and-rates", level: "the-best-box" } }),
        jee("tangents-normals", "Equations of tangents and normals", { status: "ready", built: { lab: "optimisation-and-rates", level: "rising-and-falling" } }),
        advanced("mean-value-theorems", "Rolle's theorem and the mean value theorem", { status: "ready", built: { lab: "optimisation-and-rates", level: "rising-and-falling" } }),
      ],
    ),
    chapter(
      "integrals",
      "Integrals",
      { grade: 12, kit: "graphing", wave: 21, blurb: "Undoing a derivative, and adding up infinitely many slices." },
      [
        jee("antiderivatives", "Indefinite integrals as antiderivatives", { status: "ready", built: { lab: "fundamental-theorem", level: "undoing-the-slope" } }),
        jee("integration-methods", "Integration by substitution", { status: "ready", built: { lab: "methods-of-integration", level: "change-of-variable" } }),
        jee("integration-by-parts", "Integration by parts", { buildsOn: ["integration-methods"], status: "ready", built: { lab: "methods-of-integration", level: "two-areas-one-rectangle" } }),
        jee("partial-fractions", "Integration by partial fractions", { buildsOn: ["integration-methods"], status: "ready", built: { lab: "methods-of-integration", level: "splitting-fractions" } }),
        jee("definite-integrals", "Definite integrals and their properties", { status: "ready", built: { lab: "area-by-strips", level: "signed-area" } }),
        jee("fundamental-theorem", "The fundamental theorem of calculus", { status: "ready", built: { lab: "fundamental-theorem", level: "sweeping-the-area" } }),
        advanced("definite-integral-limits", "Definite integrals as the limit of a sum", { status: "ready", built: { lab: "area-by-strips", level: "slicing-it-thin" } }),
      ],
    ),
    chapter(
      "area-under-curves",
      "Area under curves",
      { grade: 12, kit: "graphing", wave: 21, blurb: "Integration made visible: the area under and between graphs." },
      [
        jee("area-under-graph", "Area under a curve", { status: "ready", built: { lab: "area-by-strips", level: "signed-area" } }),
        jee("area-between-curves", "Area between two curves", { status: "ready", built: { lab: "area-by-strips", level: "between-the-curves" } }),
        jee("area-by-strips", "Area as a sum of thin strips", { status: "ready", built: { lab: "area-by-strips", level: "slicing-it-thin" } }),
      ],
    ),
    chapter(
      "differential-equations",
      "Differential equations",
      { grade: 12, kit: "graphing", wave: 21, blurb: "Equations about how something changes, and the curves that obey them." },
      [
        jee("de-order-degree", "Order, degree and forming an equation", { status: "ready", built: { lab: "differential-equations", level: "solving-them" } }),
        jee("variable-separable", "Separating the variables", { status: "ready", built: { lab: "differential-equations", level: "follow-the-slopes" } }),
        jee("linear-first-order", "Linear first-order equations", { status: "ready", built: { lab: "differential-equations", level: "solving-them" } }),
        jee("growth-decay", "Growth, decay and cooling as differential equations", { status: "ready", built: { lab: "differential-equations", level: "growth-and-cooling" } }),
      ],
    ),
  ],
  "maths",
);

export const vectorsAnd3d = branch(
  "vectors-3d",
  "Vectors and 3D geometry",
  "Arrows in space, and the lines and planes they describe.",
  [
    chapter(
      "vector-algebra",
      "Vector algebra",
      { grade: 12, kit: "vectors", wave: 17, blurb: "Adding, scaling and multiplying arrows, two ways." },
      [
        jee("vectors-in-space", "Vectors in three dimensions", { status: "ready", built: { lab: "vectors-in-space", level: "points-in-space" }, note: "The vector lab works in the plane; the third axis comes next." }),
        jee("section-formula", "Position vectors and the section formula", { status: "ready", built: { lab: "vectors-in-space", level: "points-in-space" } }),
        jee("scalar-product", "The scalar product and projection", { status: "ready", built: { lab: "vectors-in-space", level: "shadows-and-areas" } }),
        jee("vector-product", "The vector product and area", { status: "ready", built: { lab: "vectors-in-space", level: "shadows-and-areas" } }),
        advanced("triple-products", "Scalar and vector triple products", { status: "ready", built: { lab: "vectors-in-space", level: "boxes-and-planes" } }),
      ],
    ),
    chapter(
      "three-d-geometry",
      "Three-dimensional geometry",
      { grade: 12, kit: "vectors", wave: 19, blurb: "Lines and planes in space, and the distances between them." },
      [
        jee("direction-cosines", "Direction cosines and ratios", { status: "ready", built: { lab: "vectors-in-space", level: "points-in-space" } }),
        jee("lines-in-space", "The equation of a line in space", { status: "ready", built: { lab: "vectors-in-space", level: "lines-that-miss" } }),
        jee("planes", "The equation of a plane", { status: "ready", built: { lab: "vectors-in-space", level: "boxes-and-planes" } }),
        jee("angles-distances-3d", "Angles and distances between lines and planes", { status: "ready", built: { lab: "vectors-in-space", level: "boxes-and-planes" } }),
        advanced("skew-lines", "Skew lines and the shortest distance between them", { status: "ready", built: { lab: "vectors-in-space", level: "lines-that-miss" } }),
      ],
    ),
  ],
  "maths",
);

export const statisticsProbability = branch(
  "statistics-probability",
  "Statistics and probability",
  "Describing data, and reasoning about what is likely.",
  [
    chapter(
      "statistics",
      "Statistics",
      { grade: 11, kit: "probability", wave: 21, blurb: "Centre and spread: what a set of numbers is really saying." },
      [
        jee("measures-of-centre", "Mean, median and mode", { status: "ready", built: { lab: "statistics", level: "middle-of-the-marks" }, buildsOn: ["mean-median-mode-school"] }),
        jee("measures-of-spread", "Variance and standard deviation", { status: "ready", built: { lab: "statistics", level: "how-spread-out" } }),
        jee("grouped-data", "Grouped data and frequency distributions", { status: "ready", built: { lab: "statistics", level: "grouped-into-classes" }, buildsOn: ["grouped-mean"] }),
      ],
    ),
    chapter(
      "probability",
      "Probability",
      { grade: 12, kit: "probability", wave: 21, blurb: "Chance made precise: events, conditions and Bayes." },
      [
        jee("classical-probability", "Sample spaces and classical probability", { status: "ready", built: { lab: "probability", level: "two-dice" }, buildsOn: ["probability-theory"] }),
        jee("addition-rule", "The addition rule and mutually exclusive events", { status: "ready", built: { lab: "probability", level: "two-dice" } }),
        jee("conditional-probability", "Conditional probability and independence", { status: "ready", built: { lab: "probability", level: "given-that" } }),
        jee("bayes-theorem", "Total probability and Bayes' theorem", { status: "ready", built: { lab: "probability", level: "testing-positive" } }),
        jee("random-variables", "Random variables and their distributions", { status: "ready", built: { lab: "probability", level: "counting-successes" } }),
        jee("binomial-distribution", "The binomial distribution", { status: "ready", built: { lab: "probability", level: "counting-successes" } }),
      ],
    ),
  ],
  "maths",
);

/** Every mathematics branch beyond the toolkit, in teaching order. */
export const mathsBranches = [algebra, trigonometry, coordinateGeometry, calculus, vectorsAnd3d, statisticsProbability] as const;
