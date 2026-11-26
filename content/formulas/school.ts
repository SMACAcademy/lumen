import { formula } from "./schema";

/**
 * The class 6–10 formulas, NCERT's staples, until labs teach them. Each is
 * filed under the syllabus concept it belongs to.
 */
export const schoolFormulas = [
  // ── Maths ──────────────────────────────────────────────────────────────────
  formula("perimeter-rectangle", "perimeter", "Perimeter of a rectangle", "P = 2(l + b)", "perimeter = 2 × (length + breadth)", [
    ["P", "perimeter", "cm"],
    ["l", "length", "cm"],
    ["b", "breadth", "cm"],
  ]),
  formula("area-rectangle", "area-rectangle", "Area of a rectangle", "A = l × b", "area = length × breadth", [
    ["A", "area", "cm²"],
    ["l", "length", "cm"],
    ["b", "breadth", "cm"],
  ]),
  formula("area-triangle", "area-triangle-parallelogram", "Area of a triangle", "A = ½ × b × h", "area = half × base × height", [
    ["A", "area", "cm²"],
    ["b", "base", "cm"],
    ["h", "height, square to the base", "cm"],
  ]),
  formula("area-parallelogram", "area-triangle-parallelogram", "Area of a parallelogram", "A = b × h", "area = base × height", [
    ["A", "area", "cm²"],
    ["b", "base", "cm"],
    ["h", "height, square to the base", "cm"],
  ]),
  formula("circumference", "circle-circumference", "Circumference of a circle", "C = 2πr", "circumference = 2 × π × radius", [
    ["C", "circumference", "cm"],
    ["r", "radius", "cm"],
    ["π", "pi, about 3.14 or 22⁄7"],
  ]),
  formula("circle-area", "circle-area", "Area of a circle", "A = πr²", "area = π × radius × radius", [
    ["A", "area", "cm²"],
    ["r", "radius", "cm"],
  ]),
  formula("volume-cuboid", "volume-cuboid", "Volume of a cuboid", "V = l × b × h", "volume = length × breadth × height", [
    ["V", "volume", "cm³"],
    ["l", "length", "cm"],
    ["b", "breadth", "cm"],
    ["h", "height", "cm"],
  ]),
  formula("surface-cuboid", "surface-area-cuboid", "Surface area of a cuboid", "S = 2(lb + bh + hl)", "surface area = 2 × (the three different faces added)", [
    ["S", "total surface area", "cm²"],
    ["l", "length", "cm"],
    ["b", "breadth", "cm"],
    ["h", "height", "cm"],
  ]),
  formula("cylinder-volume", "cylinder", "Volume of a cylinder", "V = πr²h", "volume = area of the circle × height", [
    ["V", "volume", "cm³"],
    ["r", "radius", "cm"],
    ["h", "height", "cm"],
  ]),
  formula("cylinder-curved", "cylinder", "Curved surface of a cylinder", "CSA = 2πrh", "curved surface = circumference × height", [
    ["CSA", "curved surface area", "cm²"],
    ["r", "radius", "cm"],
    ["h", "height", "cm"],
  ]),
  formula("cone-volume", "cone-volume", "Volume of a cone", "V = ⅓πr²h", "volume = one third of the cylinder around it", [
    ["V", "volume", "cm³"],
    ["r", "radius of the base", "cm"],
    ["h", "height", "cm"],
  ]),
  formula("sphere-volume", "sphere", "Volume of a sphere", "V = ⁴⁄₃πr³", "volume = four thirds × π × radius cubed", [
    ["V", "volume", "cm³"],
    ["r", "radius", "cm"],
  ]),
  formula("sphere-surface", "sphere", "Surface area of a sphere", "S = 4πr²", "surface = four times the area of its biggest circle", [
    ["S", "surface area", "cm²"],
    ["r", "radius", "cm"],
  ]),
  formula("percentage", "percentage", "Percentage", "% = part ÷ whole × 100", "percentage = part ÷ whole × 100", [
    ["part", "the amount you are looking at"],
    ["whole", "the total it is part of"],
  ]),
  formula("simple-interest", "profit-interest", "Simple interest", "SI = P × R × T ÷ 100", "interest = principal × rate × time ÷ 100", [
    ["SI", "simple interest", "₹"],
    ["P", "principal, the amount borrowed", "₹"],
    ["R", "rate, per cent per year", "%"],
    ["T", "time", "years"],
  ]),
  formula("angle-sum", "triangle-angle-sum", "Angles of a triangle", "∠A + ∠B + ∠C = 180°", "the three angles of a triangle add to 180°", [
    ["∠A, ∠B, ∠C", "the three angles", "°"],
  ]),
  formula("exponent-product", "exponents", "Multiplying powers", "aᵐ × aⁿ = aᵐ⁺ⁿ", "same base: add the powers", [
    ["a", "the base"],
    ["m, n", "the powers"],
  ]),
  formula("straight-line", "straight-line-graph", "A straight line", "y = mx + c", "y = slope × x + where it crosses the y-axis", [
    ["m", "slope, how steep"],
    ["c", "y-intercept, where it crosses the y-axis"],
  ]),
  formula("pythagoras", "pythagoras", "Pythagoras' theorem", "a² + b² = c²", "the two short sides squared add to the longest side squared", [
    ["a, b", "the two sides around the right angle"],
    ["c", "the hypotenuse, opposite the right angle"],
  ]),
  formula("distance", "distance-formula", "Distance between two points", "d = √((x₂ − x₁)² + (y₂ − y₁)²)", "distance = Pythagoras on the across and up gaps", [
    ["d", "distance"],
    ["(x₁, y₁), (x₂, y₂)", "the two points"],
  ]),
  formula("sine-ratio", "trig-ratios", "Sine", "sin θ = opposite ÷ hypotenuse", "sine = opposite side ÷ hypotenuse", [
    ["θ", "the angle", "°"],
  ]),
  formula("cosine-ratio", "trig-ratios", "Cosine", "cos θ = adjacent ÷ hypotenuse", "cosine = adjacent side ÷ hypotenuse", [
    ["θ", "the angle", "°"],
  ]),
  formula("tangent-ratio", "trig-ratios", "Tangent", "tan θ = opposite ÷ adjacent", "tangent = opposite side ÷ adjacent side", [
    ["θ", "the angle", "°"],
  ]),
  formula("trig-identity", "trig-identity-school", "The Pythagorean identity", "sin²θ + cos²θ = 1", "sine squared plus cosine squared is always 1", [
    ["θ", "any angle", "°"],
  ]),
  formula("ap-term", "ap-school", "nth term of an AP", "aₙ = a + (n − 1)d", "nth term = first term + (n − 1) steps", [
    ["aₙ", "the nth term"],
    ["a", "the first term"],
    ["d", "the common difference"],
    ["n", "which term"],
  ]),
  formula("ap-sum", "ap-school", "Sum of an AP", "Sₙ = n⁄2 [2a + (n − 1)d]", "sum = number of terms × the average of the first and last", [
    ["Sₙ", "the sum of the first n terms"],
    ["a", "the first term"],
    ["d", "the common difference"],
    ["n", "how many terms"],
  ]),
  formula("quadratic-formula", "quadratic-graph", "The quadratic formula", "x = (−b ± √(b² − 4ac)) ÷ 2a", "the two roots of ax² + bx + c = 0", [
    ["a, b, c", "the coefficients of ax² + bx + c"],
    ["b² − 4ac", "the discriminant: two, one or no real roots"],
  ]),
  formula("mean", "mean-median-mode-school", "Mean", "mean = Σx ÷ n", "mean = sum of values ÷ number of values", [
    ["Σx", "the sum of the values"],
    ["n", "how many values"],
  ]),
  formula("probability", "probability-theory", "Probability", "P(E) = favourable ÷ total", "probability = favourable outcomes ÷ all possible outcomes", [
    ["P(E)", "the probability of event E, from 0 to 1"],
  ]),

  // ── Physics ────────────────────────────────────────────────────────────────
  formula("speed", "speed-school", "Speed", "v = d ÷ t", "speed = distance ÷ time", [
    ["v", "speed", "m/s"],
    ["d", "distance", "m"],
    ["t", "time", "s"],
  ]),
  formula("acceleration", "velocity-acceleration-school", "Acceleration", "a = (v − u) ÷ t", "acceleration = change in velocity ÷ time", [
    ["a", "acceleration", "m/s²"],
    ["u", "starting velocity", "m/s"],
    ["v", "final velocity", "m/s"],
    ["t", "time", "s"],
  ]),
  formula("first-equation", "equations-school", "First equation of motion", "v = u + at", "final velocity = starting velocity + acceleration × time", [
    ["v", "final velocity", "m/s"],
    ["u", "starting velocity", "m/s"],
    ["a", "acceleration", "m/s²"],
    ["t", "time", "s"],
  ]),
  formula("second-equation", "equations-school", "Second equation of motion", "s = ut + ½at²", "distance = starting velocity × time + half × acceleration × time²", [
    ["s", "displacement", "m"],
    ["u", "starting velocity", "m/s"],
    ["a", "acceleration", "m/s²"],
    ["t", "time", "s"],
  ]),
  formula("third-equation", "equations-school", "Third equation of motion", "v² = u² + 2as", "final velocity² = starting velocity² + 2 × acceleration × distance", [
    ["v", "final velocity", "m/s"],
    ["u", "starting velocity", "m/s"],
    ["a", "acceleration", "m/s²"],
    ["s", "displacement", "m"],
  ]),
  formula("momentum", "momentum-school", "Momentum", "p = mv", "momentum = mass × velocity", [
    ["p", "momentum", "kg m/s"],
    ["m", "mass", "kg"],
    ["v", "velocity", "m/s"],
  ]),
  formula("force", "momentum-school", "Newton's second law", "F = ma", "force = mass × acceleration", [
    ["F", "force", "N"],
    ["m", "mass", "kg"],
    ["a", "acceleration", "m/s²"],
  ]),
  formula("weight", "mass-weight", "Weight", "W = mg", "weight = mass × g", [
    ["W", "weight", "N"],
    ["m", "mass", "kg"],
    ["g", "acceleration due to gravity, 9.8 on Earth", "m/s²"],
  ]),
  formula("gravitation-law", "universal-gravitation-school", "Universal law of gravitation", "F = G m₁m₂ ÷ r²", "force = G × the two masses ÷ distance²", [
    ["F", "the pull between them", "N"],
    ["m₁, m₂", "the two masses", "kg"],
    ["r", "the distance between their centres", "m"],
    ["G", "the gravitational constant, 6.67 × 10⁻¹¹", "N m²/kg²"],
  ]),
  formula("pressure", "pressure-school", "Pressure", "P = F ÷ A", "pressure = force ÷ area", [
    ["P", "pressure", "Pa"],
    ["F", "force", "N"],
    ["A", "area", "m²"],
  ]),
  formula("density", "density-school", "Density", "ρ = m ÷ V", "density = mass ÷ volume", [
    ["ρ", "density", "kg/m³"],
    ["m", "mass", "kg"],
    ["V", "volume", "m³"],
  ]),
  formula("work", "work-school", "Work", "W = F × s", "work = force × distance moved along it", [
    ["W", "work", "J"],
    ["F", "force", "N"],
    ["s", "distance moved", "m"],
  ]),
  formula("kinetic-energy-school", "kinetic-potential-school", "Kinetic energy", "KE = ½mv²", "kinetic energy = half × mass × speed²", [
    ["KE", "kinetic energy", "J"],
    ["m", "mass", "kg"],
    ["v", "speed", "m/s"],
  ]),
  formula("potential-energy-school", "kinetic-potential-school", "Potential energy", "PE = mgh", "potential energy = mass × g × height", [
    ["PE", "potential energy", "J"],
    ["m", "mass", "kg"],
    ["g", "acceleration due to gravity", "m/s²"],
    ["h", "height", "m"],
  ]),
  formula("power", "power-school", "Power", "P = W ÷ t", "power = work ÷ time", [
    ["P", "power", "W"],
    ["W", "work done", "J"],
    ["t", "time", "s"],
  ]),
  formula("wave-speed", "pitch-loudness", "Speed of a wave", "v = fλ", "speed = frequency × wavelength", [
    ["v", "wave speed", "m/s"],
    ["f", "frequency", "Hz"],
    ["λ", "wavelength", "m"],
  ]),
  formula("echo", "echo", "Echo", "v = 2d ÷ t", "speed of sound = 2 × distance to the wall ÷ time for the echo", [
    ["v", "speed of sound", "m/s"],
    ["d", "distance to the reflecting surface", "m"],
    ["t", "time until the echo returns", "s"],
  ]),
  formula("refractive-index", "refraction-school", "Refractive index", "n = c ÷ v", "refractive index = speed of light in air ÷ speed in the material", [
    ["n", "refractive index"],
    ["c", "speed of light in vacuum", "m/s"],
    ["v", "speed of light in the material", "m/s"],
  ]),
  formula("mirror-formula", "spherical-mirrors-school", "Mirror formula", "1⁄f = 1⁄v + 1⁄u", "1 ÷ focal length = 1 ÷ image distance + 1 ÷ object distance", [
    ["f", "focal length", "cm"],
    ["v", "image distance", "cm"],
    ["u", "object distance", "cm"],
  ]),
  formula("lens-formula", "lenses-school", "Lens formula", "1⁄f = 1⁄v − 1⁄u", "1 ÷ focal length = 1 ÷ image distance − 1 ÷ object distance", [
    ["f", "focal length", "cm"],
    ["v", "image distance", "cm"],
    ["u", "object distance", "cm"],
  ]),
  formula("lens-power", "lenses-school", "Power of a lens", "P = 1 ÷ f", "power = 1 ÷ focal length in metres", [
    ["P", "power", "D"],
    ["f", "focal length", "m"],
  ]),
  formula("ohms-law", "ohms-law-school", "Ohm's law", "V = IR", "voltage = current × resistance", [
    ["V", "potential difference", "V"],
    ["I", "current", "A"],
    ["R", "resistance", "Ω"],
  ]),
  formula("series-resistance", "resistors-school", "Resistors in series", "R = R₁ + R₂ + R₃", "in a line, resistances add", [
    ["R", "total resistance", "Ω"],
    ["R₁, R₂, R₃", "the resistors", "Ω"],
  ]),
  formula("parallel-resistance", "resistors-school", "Resistors in parallel", "1⁄R = 1⁄R₁ + 1⁄R₂ + 1⁄R₃", "side by side, the reciprocals add", [
    ["R", "total resistance", "Ω"],
    ["R₁, R₂, R₃", "the resistors", "Ω"],
  ]),
  formula("electric-power", "electric-power-school", "Electric power", "P = VI", "power = voltage × current", [
    ["P", "power", "W"],
    ["V", "potential difference", "V"],
    ["I", "current", "A"],
  ]),
  formula("joule-heating", "electric-power-school", "Heat from a current", "H = I²Rt", "heat = current² × resistance × time", [
    ["H", "heat produced", "J"],
    ["I", "current", "A"],
    ["R", "resistance", "Ω"],
    ["t", "time", "s"],
  ]),

  // ── Chemistry ──────────────────────────────────────────────────────────────
  formula("moles-mass", "mole-school", "Moles from mass", "n = m ÷ M", "moles = mass ÷ molar mass", [
    ["n", "amount", "mol"],
    ["m", "mass", "g"],
    ["M", "molar mass", "g/mol"],
  ]),
  formula("moles-particles", "mole-school", "Particles from moles", "N = n × Nₐ", "number of particles = moles × Avogadro's number", [
    ["N", "number of particles"],
    ["n", "amount", "mol"],
    ["Nₐ", "Avogadro's number, 6.022 × 10²³", "per mol"],
  ]),
  formula("neutrons", "isotopes", "Neutrons in a nucleus", "neutrons = A − Z", "neutrons = mass number − atomic number", [
    ["A", "mass number, protons + neutrons"],
    ["Z", "atomic number, protons"],
  ]),
  formula("shell-capacity", "bohr-shells", "Electrons in a shell", "maximum = 2n²", "the nth shell holds at most 2 × n² electrons", [
    ["n", "shell number: 1 for K, 2 for L, 3 for M"],
  ]),
  formula("mass-conservation", "laws-of-combination", "Conservation of mass", "mass of reactants = mass of products", "nothing is lost or made in a reaction, only rearranged", [
    ["reactants", "what you start with"],
    ["products", "what you end with"],
  ]),
];
