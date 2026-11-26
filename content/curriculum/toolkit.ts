import { advanced, branch, c, chapter, jee } from "./schema";

/** The mathematics physics is written in. */
export const toolkit = branch(
  "toolkit",
  "Maths for physics",
  "Circles, vectors and rates of change: the maths every physics chapter leans on.",
  [
    chapter(
      "circles-and-waves",
      "Circles, sine and cosine",
      { grade: 11, kit: "graphing", wave: 0, blurb: "Where sine and cosine come from, and what a wave's numbers mean." },
      [
        c("unit-circle", "Sine and cosine from a circle", {
          buildsOn: ["trig-ratios"],
          status: "ready",
          built: { lab: "unit-circle-sine-cosine", level: "shadow-of-a-dot" },
        }),
        c("sine-cosine-graphs", "Reading a sine or cosine graph", { status: "ready", built: { lab: "unit-circle-sine-cosine" } }),
        c("sinusoid-parameters", "Amplitude, period, phase and midline", { status: "ready", built: { lab: "sinusoidal-functions" } }),
        c("trig-identities", "Pythagorean identity and special angles", { status: "ready", built: { lab: "angles-and-inverses", level: "adding-angles" }, buildsOn: ["trig-identity-school"] }),
        c("small-angle", "Small-angle approximation", { status: "ready", built: { lab: "angles-and-inverses", level: "small-angles" }, exams: ["jee-main", "jee-adv"] }),
      ],
    ),
    chapter(
      "vectors",
      "Vectors",
      { grade: 11, kit: "vectors", wave: 0, blurb: "Quantities with direction: how to split them and put them back together." },
      [
        c("vector-components", "Components of a vector", { status: "ready", built: { lab: "vector-components", level: "tip-to-tail" } }),
        c("vector-addition", "Adding vectors: triangle and parallelogram", { status: "ready", built: { lab: "vector-components", level: "tip-to-tail" } }),
        c("vector-resolution", "Resolving along chosen axes (inclines)", { status: "ready", built: { lab: "vector-components", level: "along-the-slope" } }),
        jee("dot-product", "Dot product and the angle between vectors", { status: "ready", built: { lab: "vectors-in-space", level: "shadows-and-areas" } }),
        jee("cross-product", "Cross product, area and the right-hand rule", { status: "ready", built: { lab: "vectors-in-space", level: "shadows-and-areas" } }),
        advanced("vector-calculus-intro", "Rates of change of vector quantities", { status: "ready", built: { lab: "vector-components", level: "going-round" } }),
      ],
    ),
    chapter(
      "graphs-and-rates",
      "Graphs, slopes and areas",
      { grade: 11, kit: "graphing", wave: 0, blurb: "Slope is a rate, area is a total — the two ideas behind every motion graph." },
      [
        c("slope-as-rate", "Slope as a rate of change", { buildsOn: ["straight-line-graph"], status: "ready", built: { lab: "secant-to-tangent" } }),
        c("secant-to-tangent", "From average to instantaneous: the tangent", { status: "ready", built: { lab: "secant-to-tangent" } }),
        c("area-under-curve", "Area under a graph as an accumulated total", { status: "ready", built: { lab: "area-by-strips", level: "slicing-it-thin" } }),
        c("graph-shapes", "Reading straight, curved and piecewise graphs", { status: "ready", built: { lab: "fundamental-theorem", level: "distance-from-speed" } }),
        jee("derivatives-for-physics", "Derivatives and integrals used in physics", { status: "ready", built: { lab: "fundamental-theorem", level: "distance-from-speed" } }),
      ],
    ),
  ],
  "maths",
);

/** How to measure, and how far to trust the answer. */
export const measurement = branch("measurement", "Measurement", "Units, dimensions, instruments and how wrong a number might be.", [
  chapter(
    "units-and-measurement",
    "Units and measurement",
    { grade: 11, kit: "measurement", wave: 1, blurb: "Units, dimensions and how far you can trust a number." },
    [
      c("si-units", "SI units and base quantities", { status: "ready", built: { lab: "units-and-measurement", level: "building-units" }, buildsOn: ["standard-units"] }),
      c("dimensional-analysis", "Dimensional analysis and checking formulas", { status: "ready", built: { lab: "units-and-measurement", level: "building-units" } }),
      c("significant-figures", "Significant figures and rounding", { status: "ready", built: { lab: "units-and-measurement", level: "how-many-figures" } }),
      c("errors", "Absolute, relative and percentage error", {
        status: "ready",
        built: { lab: "vernier-calliper", level: "the-bent-calliper" },
      }),
      c("error-propagation", "Combining errors in sums, products and powers", { status: "ready", built: { lab: "units-and-measurement", level: "errors-add-up" } }),
      jee("vernier-screw-gauge", "Vernier callipers and screw gauge", {
        status: "ready",
        built: { lab: "vernier-calliper", level: "read-the-calliper" },
        note: "The calliper is playable; the screw gauge joins it on the same kit.",
      }),
    ],
  ),
]);
