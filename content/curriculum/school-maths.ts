import { branch, chapter, s } from "./schema";

/**
 * Maths, class 6 to 10: the visual core of the NCERT course.
 *
 * Not every chapter — the ones that gain most from being seen and played
 * with: the number line, balance-scale algebra, shapes you can pull about,
 * and data and chance. Drill-heavy chapters live in the formula bank instead.
 * Each concept names what it builds on, so the class 11 maths above can
 * point back to its roots.
 */

export const numberSense = branch(
  "number-sense",
  "Numbers",
  "Fractions, integers and powers you can see on a line.",
  [
    chapter(
      "fractions-and-decimals",
      "Fractions and decimals",
      { grade: 6, kit: "number-line", wave: 30, blurb: "Where a fraction lives on the number line, and why ½ and 2⁄4 are the same point." },
      [
        s("whole-numbers-line", "Whole numbers on the number line", { status: "ready", built: { lab: "fractions-on-a-line", level: "whole-numbers-and-decimals" } }),
        s("fraction-meaning", "Fractions as parts of a whole and points on a line", { status: "ready", built: { lab: "fractions-on-a-line", level: "where-fractions-live" }, buildsOn: ["whole-numbers-line"] }),
        s("equivalent-fractions", "Equivalent fractions", { status: "ready", built: { lab: "fractions-on-a-line", level: "same-point-different-names" }, buildsOn: ["fraction-meaning"] }),
        s("comparing-fractions", "Comparing and ordering fractions", { status: "ready", built: { lab: "fractions-on-a-line", level: "where-fractions-live" }, buildsOn: ["equivalent-fractions"] }),
        s("adding-fractions", "Adding and subtracting fractions", { status: "ready", built: { lab: "integers-and-rationals", level: "between-any-two" }, buildsOn: ["equivalent-fractions"] }),
        s("decimals", "Decimals and place value", { status: "ready", built: { lab: "fractions-on-a-line", level: "whole-numbers-and-decimals" }, buildsOn: ["fraction-meaning"] }),
      ],
    ),
    chapter(
      "integers-school",
      "Integers",
      { grade: 6, kit: "number-line", wave: 30, blurb: "The other side of zero: numbers for cold days, deep seas and money owed." },
      [
        s("negative-numbers", "Numbers below zero", { status: "ready", built: { lab: "integers-and-rationals", level: "hops-below-zero" }, buildsOn: ["whole-numbers-line"] }),
        s("adding-integers", "Adding and subtracting integers as moves on a line", { status: "ready", built: { lab: "integers-and-rationals", level: "hops-below-zero" }, buildsOn: ["negative-numbers"] }),
        s("integers-in-life", "Temperatures, heights and money: integers in life", { status: "ready", built: { lab: "integers-and-rationals", level: "hops-below-zero" }, buildsOn: ["negative-numbers"] }),
      ],
    ),
    chapter(
      "rational-numbers-school",
      "Multiplying integers and rational numbers",
      { grade: 7, kit: "number-line", wave: 31, blurb: "Why minus times minus is plus, and fractions that can be negative." },
      [
        s("multiplying-integers", "Multiplying and dividing integers", { status: "ready", built: { lab: "integers-and-rationals", level: "turning-round-twice" }, buildsOn: ["adding-integers"] }),
        s("rational-numbers", "Rational numbers", { status: "ready", built: { lab: "integers-and-rationals", level: "between-any-two" }, buildsOn: ["fraction-meaning", "negative-numbers"] }),
        s("rationals-on-line", "Rational numbers on the number line", { status: "ready", built: { lab: "integers-and-rationals", level: "between-any-two" }, buildsOn: ["rational-numbers"] }),
      ],
    ),
    chapter(
      "ratio-and-percentage",
      "Ratio, proportion and percentage",
      { grade: 7, kit: "number-line", wave: 31, blurb: "Comparing amounts fairly, from recipes to discounts." },
      [
        s("ratio", "Ratio as a comparison", { status: "ready", built: { lab: "ratios-and-powers", level: "share-it-fairly" }, buildsOn: ["fraction-meaning"] }),
        s("proportion", "Proportion and the unitary method", { status: "ready", built: { lab: "ratios-and-powers", level: "share-it-fairly" }, buildsOn: ["ratio"] }),
        s("percentage", "Percentage: a fraction out of 100", { status: "ready", built: { lab: "ratios-and-powers", level: "out-of-a-hundred" }, buildsOn: ["ratio"] }),
        s("profit-interest", "Profit, loss and simple interest", { status: "ready", built: { lab: "ratios-and-powers", level: "out-of-a-hundred" }, buildsOn: ["percentage"] }),
      ],
    ),
    chapter(
      "exponents-school",
      "Exponents and powers",
      { grade: 8, kit: "number-line", wave: 32, blurb: "Writing huge and tiny numbers without a page of zeros." },
      [
        s("exponents", "Exponents and powers", { status: "ready", built: { lab: "ratios-and-powers", level: "powers-big-and-small" }, buildsOn: ["multiplying-integers"] }),
        s("scientific-notation", "Very large and very small numbers: standard form", { status: "ready", built: { lab: "ratios-and-powers", level: "powers-big-and-small" }, buildsOn: ["exponents", "decimals"] }),
        s("squares-roots", "Squares and square roots", { status: "ready", built: { lab: "ratios-and-powers", level: "powers-big-and-small" }, buildsOn: ["exponents"] }),
      ],
    ),
    chapter(
      "real-numbers-school",
      "Real numbers",
      { grade: 9, kit: "number-line", wave: 32, blurb: "Numbers like √2 that no fraction can reach, and where they sit on the line." },
      [
        s("irrational-numbers", "Irrational numbers and √2 on the line", { status: "ready", built: { lab: "numbers-and-patterns", level: "primes-and-roots" }, buildsOn: ["squares-roots"] }),
        s("real-number-line", "The real number line", { status: "ready", built: { lab: "numbers-and-patterns", level: "primes-and-roots" }, buildsOn: ["irrational-numbers", "rationals-on-line"] }),
        s("prime-factorisation", "Prime factorisation, HCF and LCM", { status: "ready", built: { lab: "numbers-and-patterns", level: "primes-and-roots" }, buildsOn: ["whole-numbers-line"] }),
      ],
    ),
    chapter(
      "big-numbers",
      "Large numbers",
      { grade: 6, kit: "number-line", wave: 41, blurb: "Lakhs and crores, millions and billions, and good estimates." },
      [
        s("large-numbers", "Indian and international place value", { status: "ready", built: { lab: "big-numbers-and-proportion", level: "lakhs-and-millions" } }),
        s("estimation-rounding", "Estimating and rounding", { status: "ready", built: { lab: "big-numbers-and-proportion", level: "round-and-roman" } }),
        s("roman-numerals", "Roman numerals", { status: "ready", built: { lab: "big-numbers-and-proportion", level: "round-and-roman" } }),
      ],
    ),
    chapter(
      "direct-inverse-proportion",
      "Direct and inverse proportion",
      { grade: 8, kit: "graphing", wave: 41, blurb: "When one doubles, does the other double or halve?" },
      [
        s("direct-proportion", "Direct proportion", { status: "ready", built: { lab: "big-numbers-and-proportion", level: "double-or-halve" }, buildsOn: ["proportion"] }),
        s("inverse-proportion", "Inverse proportion", { status: "ready", built: { lab: "big-numbers-and-proportion", level: "double-or-halve" }, buildsOn: ["proportion"] }),
        s("proportion-graphs", "Graphs of direct and inverse proportion", { status: "ready", built: { lab: "big-numbers-and-proportion", level: "double-or-halve" }, buildsOn: ["direct-proportion", "inverse-proportion"] }),
      ],
    ),
  ],
  "maths",
);

export const schoolAlgebra = branch(
  "school-algebra",
  "Algebra",
  "Patterns, balance scales and straight-line graphs.",
  [
    chapter(
      "patterns-and-expressions",
      "Patterns and expressions",
      { grade: 7, kit: "balance-scale", wave: 31, blurb: "Spotting the rule in a pattern, and writing it with a letter." },
      [
        s("number-patterns", "Number patterns and their rules", { status: "ready", built: { lab: "numbers-and-patterns", level: "growing-patterns" }, buildsOn: ["whole-numbers-line"] }),
        s("variables-expressions", "Letters for numbers: algebraic expressions", { status: "ready", built: { lab: "balance-the-scale", level: "find-the-mystery-weight" }, buildsOn: ["number-patterns"] }),
        s("like-terms", "Adding and subtracting expressions", { status: "ready", built: { lab: "numbers-and-patterns", level: "growing-patterns" }, buildsOn: ["variables-expressions"] }),
      ],
    ),
    chapter(
      "simple-equations",
      "Simple equations",
      { grade: 7, kit: "balance-scale", wave: 31, blurb: "An equation is a balance: keep both sides level and the unknown gives itself away." },
      [
        s("equation-balance", "An equation is a balance", { status: "ready", built: { lab: "balance-the-scale", level: "find-the-mystery-weight" }, buildsOn: ["variables-expressions"] }),
        s("solving-equations", "Solving by doing the same to both sides", { status: "ready", built: { lab: "balance-the-scale", level: "same-to-both-sides" }, buildsOn: ["equation-balance"] }),
        s("equations-word-problems", "From a word problem to an equation", { status: "ready", built: { lab: "balance-the-scale", level: "same-to-both-sides" }, buildsOn: ["solving-equations"] }),
      ],
    ),
    chapter(
      "linear-graphs-school",
      "Coordinates and linear graphs",
      { grade: 9, kit: "graphing", wave: 32, blurb: "Every point has an address, and every linear equation draws a straight line." },
      [
        s("cartesian-plane", "Points on the coordinate plane", { status: "ready", built: { lab: "lines-and-graphs", level: "points-and-lines" }, buildsOn: ["negative-numbers"] }),
        s("linear-equation-two-variables", "Linear equations in two variables", { status: "ready", built: { lab: "lines-and-graphs", level: "points-and-lines" }, buildsOn: ["solving-equations"] }),
        s("straight-line-graph", "The graph of a linear equation is a straight line", { status: "ready", built: { lab: "lines-and-graphs", level: "points-and-lines" }, buildsOn: ["cartesian-plane", "linear-equation-two-variables"] }),
      ],
    ),
    chapter(
      "algebra-class-10",
      "Pairs of lines, quadratics and progressions",
      { grade: 10, kit: "graphing", wave: 32, blurb: "Where two lines meet, the curve a quadratic draws, and patterns that grow by adding." },
      [
        s("pair-of-lines", "Two lines: one, none or infinitely many solutions", { status: "ready", built: { lab: "lines-and-graphs", level: "where-lines-meet" }, buildsOn: ["straight-line-graph"] }),
        s("quadratic-graph", "Quadratic equations and the parabola", { status: "ready", built: { lab: "numbers-and-patterns", level: "parabolas-and-progressions" }, buildsOn: ["straight-line-graph"] }),
        s("ap-school", "Arithmetic progressions: patterns that grow by adding", { status: "ready", built: { lab: "numbers-and-patterns", level: "parabolas-and-progressions" }, buildsOn: ["number-patterns"] }),
      ],
    ),
    chapter(
      "identities-and-factors",
      "Algebraic identities and factorisation",
      { grade: 8, kit: "graphing", wave: 41, blurb: "(a + b)² as a square of tiles, and taking expressions apart into factors." },
      [
        s("algebraic-identities", "(a + b)², (a − b)² and a² − b² as areas", { status: "ready", built: { lab: "identities-and-polynomials", level: "squares-of-tiles" }, buildsOn: ["like-terms"] }),
        s("multiplying-expressions", "Multiplying algebraic expressions", { status: "ready", built: { lab: "identities-and-polynomials", level: "squares-of-tiles" }, buildsOn: ["like-terms"] }),
        s("factorisation", "Factorisation", { status: "ready", built: { lab: "identities-and-polynomials", level: "tiles-into-rectangles" }, buildsOn: ["algebraic-identities"] }),
      ],
    ),
    chapter(
      "polynomials-school",
      "Polynomials",
      { grade: 9, kit: "graphing", wave: 41, blurb: "Degree, value and zeroes, and the remainder and factor theorems." },
      [
        s("polynomial-degree", "Polynomials and their degree", { status: "ready", built: { lab: "identities-and-polynomials", level: "zeroes-and-remainders" }, buildsOn: ["like-terms"] }),
        s("polynomial-zeroes-school", "The value and zeroes of a polynomial", { status: "ready", built: { lab: "identities-and-polynomials", level: "zeroes-and-remainders" }, buildsOn: ["polynomial-degree"] }),
        s("remainder-factor-theorem", "The remainder and factor theorems", { status: "ready", built: { lab: "identities-and-polynomials", level: "zeroes-and-remainders" }, buildsOn: ["polynomial-zeroes-school"] }),
      ],
    ),
  ],
  "maths",
);

export const shapesAndSpace = branch(
  "shapes-and-space",
  "Shapes and space",
  "Angles, triangles, areas and volumes you can pull about.",
  [
    chapter(
      "lines-and-angles-school",
      "Lines and angles",
      { grade: 6, kit: "geometry", wave: 31, blurb: "An angle is an amount of turn — measure it, name it, and find its partners." },
      [
        s("angles-basics", "Angles: measuring a turn", { status: "ready", built: { lab: "angles-and-shapes", level: "measuring-turns" } }),
        s("types-of-angles", "Acute, right, obtuse and reflex angles", { status: "ready", built: { lab: "angles-and-shapes", level: "measuring-turns" }, buildsOn: ["angles-basics"] }),
        s("angle-pairs", "Angles on a line and vertically opposite angles", { status: "ready", built: { lab: "angles-and-shapes", level: "measuring-turns" }, buildsOn: ["angles-basics"] }),
      ],
    ),
    chapter(
      "triangles-school",
      "Triangles",
      { grade: 7, kit: "geometry", wave: 31, blurb: "Why a triangle's angles always add to 180°, and which sticks can make one." },
      [
        s("parallel-lines-angles", "Parallel lines and a transversal", { status: "ready", built: { lab: "angles-and-shapes", level: "parallel-lines-and-triangles" }, buildsOn: ["angle-pairs"] }),
        s("triangle-angle-sum", "The angles of a triangle add to 180°", { status: "ready", built: { lab: "angles-and-shapes", level: "parallel-lines-and-triangles" }, buildsOn: ["parallel-lines-angles"] }),
        s("exterior-angle", "The exterior angle of a triangle", { status: "ready", built: { lab: "angles-and-shapes", level: "parallel-lines-and-triangles" }, buildsOn: ["triangle-angle-sum"] }),
        s("triangle-inequality", "Which three sticks make a triangle?", { status: "ready", built: { lab: "angles-and-shapes", level: "parallel-lines-and-triangles" } }),
      ],
    ),
    chapter(
      "perimeter-area",
      "Perimeter and area",
      { grade: 6, kit: "geometry", wave: 31, blurb: "The fence around a shape and the grass inside it." },
      [
        s("perimeter", "Perimeter: the distance around", { status: "ready", built: { lab: "area-and-volume", level: "counting-squares" } }),
        s("area-rectangle", "Area by counting squares", { status: "ready", built: { lab: "area-and-volume", level: "counting-squares" } }),
        s("area-on-grid", "Area of irregular shapes on a grid", { status: "ready", built: { lab: "area-and-volume", level: "counting-squares" }, buildsOn: ["area-rectangle"] }),
      ],
    ),
    chapter(
      "triangles-circles-area",
      "Area of triangles and circles",
      { grade: 7, kit: "geometry", wave: 31, blurb: "Cut a shape up and rearrange it, and its area rule appears." },
      [
        s("area-triangle-parallelogram", "Area of triangles and parallelograms", { status: "ready", built: { lab: "area-and-volume", level: "counting-squares" }, buildsOn: ["area-rectangle"] }),
        s("circle-circumference", "π: circumference over diameter", { status: "ready", built: { lab: "round-solids-and-similarity", level: "wheels-and-tins" }, buildsOn: ["perimeter"] }),
        s("circle-area", "Area of a circle", { status: "ready", built: { lab: "round-solids-and-similarity", level: "area-of-a-circle" }, buildsOn: ["circle-circumference", "area-triangle-parallelogram"] }),
      ],
    ),
    chapter(
      "volume-surface-school",
      "Volume and surface area",
      { grade: 8, kit: "geometry", wave: 32, blurb: "How much a box holds, and how much card it takes to make it." },
      [
        s("volume-cuboid", "Volume of a cuboid: counting cubes", { status: "ready", built: { lab: "area-and-volume", level: "filling-boxes" }, buildsOn: ["area-rectangle"] }),
        s("surface-area-cuboid", "Surface area by unfolding the net", { status: "ready", built: { lab: "area-and-volume", level: "nets-and-surface-area" }, buildsOn: ["area-rectangle"] }),
        s("cylinder", "Cylinders: surface area and volume", { status: "ready", built: { lab: "round-solids-and-similarity", level: "wheels-and-tins" }, buildsOn: ["circle-area", "volume-cuboid"] }),
      ],
    ),
    chapter(
      "congruence-and-circles",
      "Congruence, quadrilaterals and circles",
      { grade: 9, kit: "geometry", wave: 32, blurb: "When two triangles must be identical, and what a chord does to the angles in a circle." },
      [
        s("congruent-triangles", "Congruent triangles: SSS, SAS and ASA", { status: "ready", built: { lab: "angles-and-shapes", level: "congruence-and-parallelograms" }, buildsOn: ["triangle-angle-sum"] }),
        s("quadrilaterals", "Parallelograms and their properties", { status: "ready", built: { lab: "angles-and-shapes", level: "congruence-and-parallelograms" }, buildsOn: ["parallel-lines-angles"] }),
        s("circle-angles", "Angles subtended by a chord", { status: "ready", built: { lab: "angles-and-shapes", level: "angles-in-a-circle" }, buildsOn: ["angles-basics"] }),
      ],
    ),
    chapter(
      "similarity-and-pythagoras",
      "Similar triangles and Pythagoras",
      { grade: 10, kit: "geometry", wave: 32, blurb: "Same shape, different size — and the right-angle rule that measures across a field." },
      [
        s("similar-triangles", "Similar triangles and scale", { status: "ready", built: { lab: "round-solids-and-similarity", level: "same-shape-new-size" }, buildsOn: ["congruent-triangles", "ratio"] }),
        s("basic-proportionality", "The basic proportionality theorem", { status: "ready", built: { lab: "round-solids-and-similarity", level: "same-shape-new-size" }, buildsOn: ["similar-triangles"] }),
        s("pythagoras", "Pythagoras' theorem", { status: "ready", built: { lab: "right-triangles", level: "squares-on-the-sides" }, buildsOn: ["similar-triangles", "area-rectangle"] }),
        s("distance-formula", "The distance formula", { status: "ready", built: { lab: "round-solids-and-similarity", level: "same-shape-new-size" }, buildsOn: ["pythagoras", "cartesian-plane"] }),
      ],
    ),
    chapter(
      "solids-class-10",
      "Cones, spheres and combined solids",
      { grade: 10, kit: "geometry", wave: 32, blurb: "Ice-cream cones, footballs, and shapes built from both." },
      [
        s("cone-volume", "Why a cone is a third of a cylinder", { status: "ready", built: { lab: "round-solids-and-similarity", level: "cones-and-spheres" }, buildsOn: ["cylinder"] }),
        s("sphere", "Surface area and volume of a sphere", { status: "ready", built: { lab: "round-solids-and-similarity", level: "cones-and-spheres" }, buildsOn: ["cylinder"] }),
        s("combined-solids", "Solids made of other solids", { status: "ready", built: { lab: "round-solids-and-similarity", level: "cones-and-spheres" }, buildsOn: ["cone-volume", "sphere"] }),
      ],
    ),
    chapter(
      "trigonometry-first-steps",
      "Trigonometry, first steps",
      { grade: 10, kit: "geometry", wave: 32, blurb: "The ratios of a right triangle's sides, and how they measure a tower you cannot climb." },
      [
        s("trig-ratios", "Sine, cosine and tangent in a right triangle", { status: "ready", built: { lab: "right-triangles", level: "sine-cosine-tangent" }, buildsOn: ["similar-triangles", "pythagoras"] }),
        s("special-angle-values", "The values at 30°, 45° and 60°", { status: "ready", built: { lab: "right-triangles", level: "sine-cosine-tangent" }, buildsOn: ["trig-ratios"] }),
        s("trig-identity-school", "sin²θ + cos²θ = 1", { status: "ready", built: { lab: "right-triangles", level: "sine-cosine-tangent" }, buildsOn: ["trig-ratios", "pythagoras"] }),
        s("heights-distances-school", "Heights and distances", { status: "ready", built: { lab: "right-triangles", level: "sine-cosine-tangent" }, buildsOn: ["trig-ratios"] }),
      ],
    ),
    chapter(
      "symmetry-and-solids",
      "Symmetry, polygons and solid shapes",
      { grade: 6, kit: "geometry", wave: 41, blurb: "Lines of symmetry, turning symmetry, polygon angles, and solids from their nets." },
      [
        s("symmetry-lines", "Lines of symmetry", { status: "ready", built: { lab: "symmetry-and-solids", level: "fold-and-turn" } }),
        s("rotational-symmetry", "Rotational symmetry", { status: "ready", built: { lab: "symmetry-and-solids", level: "fold-and-turn" } }),
        s("polygons-school", "Polygons and their angle sums", { status: "ready", built: { lab: "symmetry-and-solids", level: "polygon-corners" } }),
        s("solid-shapes", "Faces, edges and vertices", { status: "ready", built: { lab: "symmetry-and-solids", level: "faces-nets-and-views" } }),
        s("nets-views", "Nets and views of solids", { status: "ready", built: { lab: "symmetry-and-solids", level: "faces-nets-and-views" } }),
      ],
    ),
    chapter(
      "circles-class-10",
      "Tangents, sectors and the section formula",
      { grade: 10, kit: "geometry", wave: 41, blurb: "Tangents to a circle, the area of a sector, and dividing a segment in a ratio." },
      [
        s("tangent-radius", "A tangent is perpendicular to the radius", { status: "ready", built: { lab: "tangents-and-sectors", level: "touching-a-circle" } }),
        s("equal-tangents", "Two tangents from a point are equal", { status: "ready", built: { lab: "tangents-and-sectors", level: "touching-a-circle" }, buildsOn: ["tangent-radius"] }),
        s("sector-area", "Sectors, arcs and segments", { status: "ready", built: { lab: "tangents-and-sectors", level: "slices-of-a-circle" } }),
        s("section-formula-school", "The section formula and the midpoint", { status: "ready", built: { lab: "tangents-and-sectors", level: "section-and-heron" }, buildsOn: ["distance-formula"] }),
        s("herons-formula-school", "Heron's formula", { status: "ready", built: { lab: "tangents-and-sectors", level: "section-and-heron" } }),
      ],
    ),
  ],
  "maths",
);

export const dataAndChance = branch(
  "data-and-chance",
  "Data and chance",
  "Charts, averages and a fair coin.",
  [
    chapter(
      "data-handling",
      "Data handling",
      { grade: 6, kit: "graphing", wave: 31, blurb: "Counting things up, drawing them as bars, and finding the middle." },
      [
        s("tally-tables", "Tally marks and tables", { status: "ready", built: { lab: "data-and-chance", level: "tally-marks-and-bars" } }),
        s("pictographs-bars", "Pictographs and bar graphs", { status: "ready", built: { lab: "data-and-chance", level: "tally-marks-and-bars" }, buildsOn: ["tally-tables"] }),
        s("mean-median-mode-school", "Averages: mean, median and mode", { status: "ready", built: { lab: "statistics", level: "middle-of-the-marks" }, buildsOn: ["tally-tables"] }),
      ],
    ),
    chapter(
      "statistics-school",
      "Statistics",
      { grade: 9, kit: "graphing", wave: 32, blurb: "Grouping lots of data so its shape shows." },
      [
        s("histograms", "Histograms and grouped data", { status: "ready", built: { lab: "statistics", level: "grouped-into-classes" }, buildsOn: ["pictographs-bars"] }),
        s("frequency-polygons", "Frequency polygons", { status: "ready", built: { lab: "statistics", level: "grouped-into-classes" }, buildsOn: ["histograms"] }),
        s("grouped-mean", "The mean of grouped data", { status: "ready", built: { lab: "statistics", level: "grouped-into-classes" }, buildsOn: ["mean-median-mode-school", "histograms"] }),
      ],
    ),
    chapter(
      "probability-school",
      "Probability",
      { grade: 10, kit: "probability", wave: 32, blurb: "How likely is likely? Toss it, count it, then work it out." },
      [
        s("chance-words", "Certain, likely, unlikely, impossible", { status: "ready", built: { lab: "data-and-chance", level: "how-likely-is-it" } }),
        s("probability-experiment", "Probability from experiments: toss it a hundred times", { status: "ready", built: { lab: "data-and-chance", level: "how-likely-is-it" }, buildsOn: ["chance-words"] }),
        s("probability-theory", "Probability as favourable over possible outcomes", { status: "ready", built: { lab: "data-and-chance", level: "favourable-over-possible" }, buildsOn: ["chance-words", "fraction-meaning"] }),
      ],
    ),
  ],
  "maths",
);

export const schoolMathsBranches = [numberSense, schoolAlgebra, shapesAndSpace, dataAndChance];
