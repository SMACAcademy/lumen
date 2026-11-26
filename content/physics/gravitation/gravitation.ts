import { defineConcept } from "@ise/concept-schema";

/**
 * Gravitation, taught from the launch rather than from the formula.
 *
 * One slider — how fast you launch, as a fraction of the circular speed —
 * takes you from a crash, through a circle, through every ellipse, to escape.
 * Kepler's three laws and the escape speed all fall out of that one control,
 * which is why the lab is built around it.
 */
export const gravitation = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "gravitation",
    title: "Gravitation",
    tagline: "Fall fast enough sideways and you miss the ground for ever.",
    domain: "physics",
    category: "gravitation",
    grade: { min: 11, max: 12 },
    difficulty: "core",
    estimatedMinutes: 30,
    objective:
      "Connect the inverse-square law to orbits: circular and escape speed, the shape of an orbit, Kepler's three laws, and the energy that decides whether a satellite ever comes back.",
    tags: ["gravitation", "orbits", "kepler", "escape velocity", "satellites", "jee", "neet", "class 11"],
  },

  connections: [
    {
      id: "laws-of-motion",
      title: "Laws of Motion",
      domain: "physics",
      relation: "prerequisite",
      note: "An orbit is F = ma with one force: gravity, pointing at the planet the whole way round.",
      available: true,
    },
    {
      id: "projectile-motion",
      title: "Projectile Motion",
      domain: "physics",
      relation: "prerequisite",
      note: "An orbit is Newton's cannonball — a projectile thrown so fast that the ground curves away beneath it.",
      available: true,
    },
    {
      id: "work-energy",
      title: "Work, Energy and Power",
      domain: "physics",
      relation: "related",
      note: "Escape is an energy statement: total energy zero or above and the satellite never returns.",
      available: true,
    },
    {
      id: "rotational-motion",
      title: "Rotational Motion",
      domain: "physics",
      relation: "related",
      note: "Kepler's second law is angular momentum conservation, wearing different clothes.",
      available: true,
    },
  ],

  variables: [
    {
      id: "speedFactor",
      symbol: "v/v_c",
      name: "Launch speed",
      meaning:
        "Sideways launch speed, counted in circular speeds. Exactly 1 gives a circle, below it you fall back, √2 and you are gone.",
      binding: { kind: "param", key: "speedFactor" },
      control: { type: "range", unit: "1", min: 0.4, max: 1.6, step: 0.01, presets: [0.7, 1, 1.2, 1.414] },
      group: "primary",
      color: "tangent",
    },
    {
      id: "launchHeight",
      symbol: "h",
      name: "Launch height",
      meaning: "How far above the surface you start, in planet radii. Higher up, gravity is weaker and orbits are slower.",
      binding: { kind: "param", key: "launchHeight" },
      control: { type: "range", unit: "1", min: 0, max: 4, step: 0.1, presets: [0, 1, 3] },
      group: "primary",
      color: "curve",
    },
    {
      id: "planetMass",
      symbol: "M",
      name: "Planet mass",
      meaning: "In Earth masses. A heavier planet pulls harder, so everything must move faster to stay in orbit.",
      binding: { kind: "param", key: "planetMass" },
      control: { type: "range", unit: "1", min: 0.2, max: 4, step: 0.1, presets: [0.5, 1, 2] },
      group: "primary",
      color: "sine",
    },
    {
      id: "t",
      symbol: "t",
      name: "Time",
      meaning:
        "How far into the current lap the satellite is; it starts over each time round. Drag the orbit itself to move it by hand.",
      binding: { kind: "state", key: "t" },
      control: { type: "range", unit: "s", min: 0, max: 120, step: 0.2 },
      group: "motion",
      color: "angle",
    },
  ],

  quantities: [
    {
      id: "circularSpeed",
      symbol: "v_c",
      name: "Circular speed",
      meaning: "√(GM/r): the one speed at which falling exactly matches the curve of the planet.",
      result: "circularSpeed",
      format: { kind: "number", digits: 3 },
      color: "curve",
      headline: true,
    },
    {
      id: "escapeSpeed",
      symbol: "v_e",
      name: "Escape speed",
      meaning: "√(2GM/r), which is always √2 times the circular speed — whatever the planet, whatever the height.",
      result: "escapeSpeed",
      format: { kind: "number", digits: 3 },
      color: "cosine",
      headline: true,
    },
    {
      id: "eccentricity",
      symbol: "e",
      name: "Eccentricity",
      meaning: "The shape of the orbit: 0 a circle, between 0 and 1 an ellipse, 1 or more and it never returns.",
      result: "eccentricity",
      format: { kind: "number", digits: 3 },
      color: "tangent",
      highlight: "orbit",
      headline: true,
    },
    {
      id: "period",
      symbol: "T",
      name: "Period",
      meaning: "One full orbit. Kepler's third law says T² grows with a³ — and nothing else.",
      result: "period",
      format: { kind: "number", digits: 2 },
      unit: "s",
      color: "angle",
      headline: true,
    },
    {
      id: "semiMajor",
      symbol: "a",
      name: "Semi-major axis",
      meaning: "Half the long way across the ellipse — the orbit's size, and the only thing the period depends on.",
      result: "semiMajor",
      format: { kind: "number", digits: 3 },
      color: "curve",
    },
    {
      id: "perigee",
      symbol: "r_min",
      name: "Closest approach",
      meaning: "In planet radii. Below 1 and the orbit passes through the planet: a crash.",
      result: "perigee",
      format: { kind: "number", digits: 3 },
      color: "angle",
      highlight: "apses",
    },
    {
      id: "apogee",
      symbol: "r_max",
      name: "Furthest point",
      meaning: "In planet radii. The satellite is at its slowest here, and its potential energy highest.",
      result: "apogee",
      format: { kind: "number", digits: 3 },
      color: "angle",
      highlight: "apses",
    },
    {
      id: "distance",
      symbol: "r",
      name: "Distance now",
      meaning: "How far the satellite is from the centre of the planet, in planet radii.",
      result: "r",
      format: { kind: "number", digits: 3 },
      color: "point",
      highlight: "satellite",
    },
    {
      id: "speed",
      symbol: "v",
      name: "Speed now",
      meaning: "In circular speeds. It rises as the satellite falls inwards and drops as it climbs away.",
      result: "speed",
      format: { kind: "number", digits: 3 },
      color: "tangent",
      highlight: "satellite",
    },
    {
      id: "specificEnergy",
      symbol: "E/m",
      name: "Energy per kilogram",
      meaning: "Kinetic plus potential. Negative means bound for ever; zero or above means gone for ever.",
      result: "specificEnergy",
      format: { kind: "number", digits: 3 },
      unit: "J/kg",
      color: "vector",
      headline: true,
    },
    {
      id: "angularMomentum",
      symbol: "L/m",
      name: "Angular momentum per kilogram",
      meaning: "r × v, unchanged all the way round — which is exactly what Kepler's second law says.",
      result: "specificAngularMomentum",
      format: { kind: "number", digits: 3 },
      color: "reference",
    },
    {
      id: "escapes",
      symbol: "gone",
      name: "Escapes",
      meaning: "1 when the launch is fast enough that the satellite never comes back.",
      result: "escapes",
      format: { kind: "number", digits: 0 },
      color: "cosine",
    },
    {
      id: "crashes",
      symbol: "crash",
      name: "Crashes",
      meaning: "1 when the orbit dips below the surface, so the satellite hits the planet.",
      result: "crashes",
      format: { kind: "number", digits: 0 },
      color: "cosine",
    },
  ],

  equations: [
    {
      id: "circular-speed",
      topic: "satellites",
      title: "Circular speed",
      tokens: [
        { kind: "ref", id: "circularSpeed" },
        { kind: "op", value: "=" },
        { kind: "text", value: "√(GM/r)" },
      ],
      reading: "The speed at which the pull of gravity is exactly the centripetal force a circle needs.",
      assumptions: ["Spherical planet", "No atmosphere"],
    },
    {
      id: "escape-speed",
      topic: "escape-velocity",
      title: "Escape speed",
      tokens: [
        { kind: "ref", id: "escapeSpeed" },
        { kind: "op", value: "=" },
        { kind: "text", value: "√2" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "circularSpeed" },
      ],
      reading: "Enough kinetic energy to pay off the whole gravitational well: √(2GM/r).",
      assumptions: ["Launched from rest at infinity, in reverse"],
    },
    {
      id: "keplers-third",
      topic: "keplers-laws",
      title: "Kepler's third law",
      tokens: [
        { kind: "ref", id: "period", power: 2 },
        { kind: "text", value: "∝" },
        { kind: "ref", id: "semiMajor", power: 3 },
      ],
      reading: "The period depends on the size of the orbit and nothing else — not the shape, not the mass of the satellite.",
      assumptions: ["One dominant central mass"],
      discoverable: true,
    },
    {
      id: "orbit-energy",
      topic: "binding-energy-orbit",
      title: "The energy of an orbit",
      tokens: [
        { kind: "ref", id: "specificEnergy" },
        { kind: "op", value: "=" },
        { kind: "text", value: "−GM / 2" },
        { kind: "ref", id: "semiMajor" },
      ],
      reading: "Bound orbits have negative energy; the bigger the orbit, the closer to zero — and zero is escape.",
      assumptions: [],
    },
  ],

  simulation: {
    model: "orbits",
    params: { planetMass: 1, launchHeight: 1, speedFactor: 1 },
    playLabel: "Launch",
  },

  visualization: {
    renderer: "orbit",
    hint: "Drag around the orbit to move the satellite by hand, or press play to let it run.",
    layers: [
      { id: "sky", label: "Sky" },
      { id: "planet", label: "Planet" },
      { id: "orbit", label: "The orbit" },
      { id: "satellite", label: "Satellite" },
      { id: "velocity", label: "Velocity", optional: true },
      { id: "apses", label: "Closest and furthest", optional: true },
      { id: "reference", label: "Circular orbit", optional: true },
      { id: "gauge", label: "Speed gauge", optional: true },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    {
      id: "launch",
      label: "Launch",
      description: "One slider from a crash to escape",
      layers: ["sky", "planet", "orbit", "satellite", "velocity", "reference", "gauge", "labels"],
      graphs: [],
      equations: ["circular-speed", "escape-speed"],
      swatches: [{ color: "tangent", dash: "solid" }],
    },
    {
      id: "kepler",
      label: "Kepler",
      description: "The shape of the orbit, and how long it takes",
      layers: ["sky", "planet", "orbit", "satellite", "apses", "labels"],
      graphs: [],
      equations: ["keplers-third", "orbit-energy"],
      swatches: [{ color: "angle", dash: "solid" }],
    },
    {
      id: "sky-only",
      label: "Just the sky",
      description: "Planet, orbit and satellite, with nothing written on it",
      layers: ["sky", "planet", "orbit", "satellite"],
      graphs: [],
      equations: ["circular-speed"],
    },
  ],
  defaultMode: "launch",
  graphs: [],

  activities: {
    observe: [
      {
        id: "make-a-circle",
        prompt: "Set the launch speed to exactly 1 circular speed. The orbit closes into a perfect circle.",
        condition: { type: "compare", quantity: "eccentricity", op: "lt", value: 0.02 },
      },
      {
        id: "too-slow",
        prompt: "Slow the launch down until the orbit dips into the planet.",
        hint: "Below about 0.85 circular speeds the far side of the ellipse falls below the surface.",
        condition: { type: "compare", quantity: "crashes", op: "eq", value: 1 },
      },
      {
        id: "get-away",
        prompt: "Speed it up until the satellite escapes for good.",
        hint: "Escape speed is √2 ≈ 1.41 circular speeds. Watch the energy reach zero.",
        condition: { type: "compare", quantity: "escapes", op: "eq", value: 1 },
      },
      {
        id: "far-and-slow",
        prompt: "Launch from 3 planet radii up. The circular speed there is much lower, and the period much longer.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "escapes", op: "eq", value: 0 },
            { type: "compare", quantity: "period", op: "gt", value: 40 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "twice-as-high",
        question:
          "The satellite is launched from 1 planet radius up instead of from the surface, at the circular speed for that height. What happens to the speed it needs?",
        variable: "launchHeight",
        from: 0,
        to: 1,
        quantity: "circularSpeed",
        options: ["increase", "decrease", "same"],
        given: { planetMass: 1, speedFactor: 1 },
        explanation: "v_c = √(GM/r): further out, gravity is weaker, so a slower speed is enough to stay in the circle.",
      },
      {
        id: "heavier-planet",
        question: "The same orbit is tried around a planet twice as heavy. What happens to the circular speed it needs?",
        variable: "planetMass",
        from: 1,
        to: 2,
        quantity: "circularSpeed",
        options: ["increase", "decrease", "same"],
        given: { launchHeight: 1, speedFactor: 1 },
        explanation: "v_c = √(GM/r) grows with the planet's mass — a heavier planet pulls harder, so you must move faster.",
      },
      {
        id: "faster-launch-period",
        question: "The launch speed goes from 1.0 to 1.2 circular speeds. What happens to the time one orbit takes?",
        variable: "speedFactor",
        from: 1,
        to: 1.2,
        quantity: "period",
        options: ["increase", "decrease", "same"],
        given: { planetMass: 1, launchHeight: 1 },
        explanation:
          "Going faster throws the satellite into a bigger ellipse, and T² ∝ a³ — a larger orbit always takes longer, even though it started off faster.",
      },
      {
        id: "shape-changes",
        question: "The launch speed is raised from 1.0 to 1.25 circular speeds. What happens to the eccentricity?",
        variable: "speedFactor",
        from: 1,
        to: 1.25,
        quantity: "eccentricity",
        options: ["increase", "decrease", "same"],
        given: { planetMass: 1, launchHeight: 1 },
        explanation: "At exactly the circular speed e = 0. Any other speed stretches the circle into an ellipse.",
      },
      {
        id: "energy-rises",
        question: "The launch speed goes from 0.9 to 1.3 circular speeds. What happens to the total energy per kilogram?",
        variable: "speedFactor",
        from: 0.9,
        to: 1.3,
        quantity: "specificEnergy",
        options: ["increase", "decrease", "same"],
        given: { planetMass: 1, launchHeight: 1 },
        explanation:
          "More kinetic energy at the same height raises the total, taking it closer to zero. At zero exactly, the satellite escapes.",
      },
    ],

    experiment: {
      title: "What decides how long an orbit takes?",
      instructions:
        "Try several launches — change the height, then change the speed — and record the size of each orbit against its period. Compare T² with a³ as you go.",
      columns: ["semiMajor", "period", "eccentricity", "specificEnergy"],
      minRows: 4,
      discovery: {
        question: "What does the period of an orbit depend on?",
        choices: [
          { id: "size-only", label: "The size of the orbit alone — its semi-major axis", correct: true },
          { id: "shape", label: "How stretched the orbit is", correct: false },
          { id: "speed", label: "The launch speed, directly", correct: false },
          { id: "height", label: "The launch height, directly", correct: false },
        ],
        reveals: "keplers-third",
        insight:
          "T² ∝ a³. A long thin ellipse and a circle with the same semi-major axis take exactly the same time — which is how astronomers weighed the planets.",
      },
    },

    explain: [
      {
        id: "newtons-cannonball",
        title: "Newton's cannonball",
        body: "Fire it gently and it falls to the ground. Fire it at {{circularSpeed}} and the ground curves away just as fast as it falls, so it never lands. An orbit is a fall that keeps missing.",
      },
      {
        id: "two-speeds",
        title: "Two speeds worth remembering",
        body: "Circular speed √(GM/r) keeps you in a circle; escape speed √(2GM/r) sets you free. The second is always √2 times the first — 7.9 km/s and 11.2 km/s at the Earth's surface.",
      },
      {
        id: "energy-decides",
        title: "The sign of the energy decides everything",
        body: "Your energy per kilogram is {{specificEnergy}}. Negative and the satellite is bound, on an ellipse for ever. Zero or above and it leaves and never returns — and no amount of waiting changes that.",
      },
      {
        id: "exam-note",
        title: "In the exam",
        body: "Expect v_c = √(GM/r), v_e = √(2GM/r) = √(2gR), T² = 4π²a³/GM, and E = −GMm/2a. Geostationary orbit is the a that makes T one day.",
      },
    ],

    challenges: [
      {
        id: "perfect-circle",
        title: "A perfect circle",
        prompt: "From 2 planet radii up, find the launch speed that gives a circular orbit — eccentricity below 0.01.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "launchHeight", op: "gte", value: 1.9 },
            { type: "compare", quantity: "eccentricity", op: "lt", value: 0.01 },
          ],
        },
        hint: "The speed slider is already counted in circular speeds. There is only one value that works.",
        success: "The circular speed is not a coincidence: it is the one speed at which gravity supplies exactly the centripetal force.",
      },
      {
        id: "just-escape",
        title: "Just barely away",
        prompt: "Find a launch that escapes but only just — the satellite must get away with energy below 0.02 J/kg.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "escapes", op: "eq", value: 1 },
            { type: "compare", quantity: "specificEnergy", op: "lt", value: 0.02 },
          ],
        },
        hint: "Escape begins at exactly √2 ≈ 1.41 circular speeds, where the energy is zero.",
        success: "Escape is an energy threshold, not a distance: at zero energy the satellite arrives at infinity with nothing left over.",
      },
      {
        id: "long-year",
        title: "A long year",
        prompt: "Build an orbit that survives — no crash, no escape — and takes more than 100 seconds to go round once.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "escapes", op: "eq", value: 0 },
            { type: "compare", quantity: "crashes", op: "eq", value: 0 },
            { type: "compare", quantity: "period", op: "gt", value: 100 },
          ],
        },
        hint: "T² ∝ a³, so the period is about the size of the orbit: launch high, or launch fast enough to fling the far side out.",
        success: "Size is all the period cares about. Double the semi-major axis and the year gets almost three times longer.",
      },
    ],
  },

  realWorld: [
    {
      title: "Geostationary satellites",
      description: "Placed at the one radius where the period is exactly 24 hours, so they hang over the same point on Earth.",
    },
    {
      title: "Hohmann transfers",
      description: "Spacecraft change orbits by burning at one apse, turning a circle into an ellipse that touches the target.",
    },
    {
      title: "Weighing planets",
      description: "Time a moon's orbit, measure its radius, and Kepler's third law hands you the planet's mass.",
    },
  ],
});
