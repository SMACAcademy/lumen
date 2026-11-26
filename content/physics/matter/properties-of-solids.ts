import { defineConcept } from "@ise/concept-schema";

/**
 * Mechanical properties of solids, taught from one curve.
 *
 * Stress against strain holds the whole chapter: the straight part is Hooke's
 * law and Young's modulus, where it bends is the elastic limit, where it ends
 * is the breaking point, and the area under it is the energy stored. Five
 * materials on the same axes make "stiff", "strong" and "tough" three
 * different words rather than one.
 */
export const propertiesOfSolids = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "properties-of-solids",
    title: "Mechanical Properties of Solids",
    tagline: "Hang weight on a wire until it stretches, yields and finally goes.",
    domain: "physics",
    category: "properties of matter",
    grade: { min: 11, max: 12 },
    difficulty: "core",
    estimatedMinutes: 25,
    objective:
      "Read a stress–strain curve: use Hooke's law and Young's modulus, find the elastic limit and breaking point, and work out the energy stored in a stretched wire.",
    tags: ["elasticity", "stress", "strain", "young's modulus", "jee", "neet", "class 11"],
  },

  connections: [
    {
      id: "laws-of-motion",
      title: "Laws of Motion",
      domain: "physics",
      relation: "prerequisite",
      note: "The load is a force, and the wire pulls back on it with an equal and opposite one.",
      available: true,
    },
    {
      id: "work-energy",
      title: "Work, Energy and Power",
      domain: "physics",
      relation: "related",
      note: "The area under the curve is the work you did stretching it — energy the wire gives back.",
      available: true,
    },
    {
      id: "secant-to-tangent",
      title: "Secant → Tangent",
      domain: "mathematics",
      relation: "related",
      note: "Young's modulus is the gradient of the straight part, and the gradient is a rate of change.",
      available: true,
    },
  ],

  variables: [
    {
      id: "material",
      symbol: "material",
      name: "Material",
      meaning: "Five wires of the same shape. Stiff, strong and tough are three different things.",
      binding: { kind: "param", key: "material" },
      control: {
        type: "choice",
        options: [
          { value: "steel", label: "Steel" },
          { value: "copper", label: "Copper" },
          { value: "aluminium", label: "Aluminium" },
          { value: "nylon", label: "Nylon" },
          { value: "glass", label: "Glass" },
        ],
      },
      group: "primary",
      color: "curve",
    },
    {
      id: "load",
      symbol: "F",
      name: "Load",
      meaning: "The weight hanging on the wire. Press play to add it steadily until something gives.",
      binding: { kind: "state", key: "load" },
      control: { type: "range", unit: "N", min: 0, max: 600, step: 1, presets: [0, 100, 250] },
      group: "primary",
      color: "cosine",
    },
    {
      id: "diameter",
      symbol: "d",
      name: "Diameter",
      meaning: "A thicker wire spreads the same load over more area, so the stress is lower.",
      binding: { kind: "param", key: "diameter" },
      control: { type: "range", unit: "mm", min: 0.4, max: 3, step: 0.1, presets: [0.5, 1, 2] },
      group: "primary",
      color: "tangent",
    },
    {
      id: "length",
      symbol: "l",
      name: "Original length",
      meaning: "Strain is the fraction it stretches, so a longer wire gives more millimetres for the same strain.",
      binding: { kind: "param", key: "length" },
      control: { type: "range", unit: "m", min: 0.5, max: 5, step: 0.1, presets: [1, 2, 4] },
      group: "primary",
      color: "point",
    },
  ],

  quantities: [
    {
      id: "stress",
      symbol: "σ",
      name: "Stress",
      meaning: "Load divided by cross-sectional area. It is the wire's own measure of how hard it is being pulled.",
      result: "stressMPa",
      format: { kind: "number", digits: 1 },
      unit: "MPa",
      color: "cosine",
      highlight: "curve",
      headline: true,
    },
    {
      id: "strain",
      symbol: "ε",
      name: "Strain",
      meaning: "Extension divided by original length — a pure number, with no units at all.",
      result: "strain",
      format: { kind: "number", digits: 5 },
      unit: "1",
      color: "tangent",
      highlight: "ruler",
      headline: true,
    },
    {
      id: "extension",
      symbol: "Δl",
      name: "Extension",
      meaning: "How much longer the wire is. Below the elastic limit it disappears again when you unload it.",
      result: "extension",
      format: { kind: "number", digits: 2 },
      unit: "mm",
      color: "angle",
      highlight: "ruler",
      headline: true,
    },
    {
      id: "youngsModulus",
      symbol: "Y",
      name: "Young's modulus",
      meaning: "The stiffness of the material: the gradient of the straight part of the curve.",
      result: "youngsModulusGPa",
      format: { kind: "number", digits: 0 },
      unit: "GPa",
      color: "curve",
      headline: true,
    },
    {
      id: "measuredModulus",
      symbol: "σ/ε",
      name: "Stress ÷ strain now",
      meaning: "Equal to Young's modulus while the wire is elastic, and smaller once it has yielded.",
      result: "measuredModulusGPa",
      format: { kind: "number", digits: 1 },
      unit: "GPa",
      color: "reference",
    },
    {
      id: "energyStored",
      symbol: "U",
      name: "Energy stored",
      meaning: "The work you did stretching it: the area under the curve, times the volume of wire.",
      result: "energyStored",
      format: { kind: "number", digits: 3 },
      unit: "J",
      color: "vector",
      headline: true,
    },
    {
      id: "area",
      symbol: "A",
      name: "Cross-section",
      meaning: "πd²/4. Double the diameter and you quarter the stress for the same load.",
      result: "areaMM2",
      format: { kind: "number", digits: 3 },
      unit: "mm2",
      color: "tangent",
    },
    {
      id: "yieldLoad",
      symbol: "F_y",
      name: "Load at the elastic limit",
      meaning: "Hang more than this and the wire stays stretched for good.",
      result: "yieldLoad",
      format: { kind: "number", digits: 1 },
      unit: "N",
      color: "angle",
    },
    {
      id: "breakingLoad",
      symbol: "F_b",
      name: "Breaking load",
      meaning: "The most the wire can carry. Beyond it, there is no wire.",
      result: "breakingLoad",
      format: { kind: "number", digits: 1 },
      unit: "N",
      color: "cosine",
    },
    {
      id: "elastic",
      symbol: "springs back",
      name: "Still elastic",
      meaning: "1 while the wire would return to its original length if you took the weight off.",
      result: "elastic",
      format: { kind: "number", digits: 0 },
      color: "sine",
    },
    {
      id: "broken",
      symbol: "broken",
      name: "Broken",
      meaning: "1 once the load has passed the breaking load.",
      result: "broken",
      format: { kind: "number", digits: 0 },
      color: "cosine",
    },
  ],

  equations: [
    {
      id: "stress-definition",
      topic: "stress-strain",
      title: "Stress",
      tokens: [
        { kind: "ref", id: "stress" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "load" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "area" },
      ],
      reading: "Force per unit area — which is why a thin wire breaks first.",
      assumptions: ["Pulled along its length", "Uniform cross-section"],
    },
    {
      id: "strain-definition",
      topic: "stress-strain",
      title: "Strain",
      tokens: [
        { kind: "ref", id: "strain" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "extension" },
        { kind: "op", value: "/" },
        { kind: "text", value: "l" },
      ],
      reading: "Extension as a fraction of the original length: a number with no units.",
      assumptions: [],
    },
    {
      id: "youngs-modulus",
      topic: "hookes-law",
      title: "Young's modulus",
      tokens: [
        { kind: "ref", id: "youngsModulus" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "stress" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "strain" },
      ],
      reading: "Stress over strain, while the wire is still elastic. It belongs to the material, not to the wire.",
      assumptions: ["Below the elastic limit"],
      discoverable: true,
    },
    {
      id: "elastic-energy",
      topic: "elastic-energy",
      title: "Energy stored",
      tokens: [
        { kind: "ref", id: "energyStored" },
        { kind: "op", value: "=" },
        { kind: "text", value: "½" },
        { kind: "ref", id: "load" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "extension" },
      ],
      reading: "Half load times extension — the triangle under the straight part of the curve.",
      assumptions: ["Below the elastic limit"],
    },
  ],

  simulation: {
    model: "materials",
    params: { material: "steel", length: 2, diameter: 1 },
    playLabel: "Load it up",
  },

  visualization: {
    renderer: "materials",
    hint: "Drag along the stress–strain curve to load the wire, or press play to add weight steadily.",
    layers: [
      { id: "wire", label: "The wire" },
      { id: "weight", label: "Load" },
      { id: "ruler", label: "Extension", optional: true },
      { id: "curve", label: "Stress–strain curve", optional: true },
      { id: "points", label: "Elastic limit and break", optional: true },
      { id: "compare", label: "Other materials", optional: true },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    {
      id: "stretch",
      label: "Stretch",
      description: "Hang weight on and watch it give",
      layers: ["wire", "weight", "ruler", "curve", "points", "labels"],
      graphs: [],
      equations: ["stress-definition", "strain-definition", "youngs-modulus"],
      swatches: [{ color: "curve", dash: "solid" }],
    },
    {
      id: "materials",
      label: "Materials",
      description: "Five wires on the same axes",
      layers: ["wire", "weight", "curve", "points", "compare", "labels"],
      graphs: [],
      equations: ["youngs-modulus"],
      swatches: [{ color: "reference", dash: "solid" }],
    },
    {
      id: "bare",
      label: "Just the wire",
      description: "No curve, no numbers on the drawing",
      layers: ["wire", "weight", "ruler", "labels"],
      graphs: [],
      equations: ["stress-definition"],
    },
  ],
  defaultMode: "stretch",
  graphs: [],

  activities: {
    observe: [
      {
        id: "stretch-it",
        prompt: "Hang about 100 N on the steel wire. It stretches — by a fraction of a millimetre.",
        condition: { type: "compare", quantity: "load", op: "gte", value: 90 },
      },
      {
        id: "past-the-limit",
        prompt: "Load it past the elastic limit. The curve bends over, and the wire will not spring back.",
        hint: "Watch the load at the elastic limit in the readouts.",
        condition: { type: "compare", quantity: "plastic", op: "eq", value: 1 },
      },
      {
        id: "break-it",
        prompt: "Keep going until the wire breaks.",
        condition: { type: "compare", quantity: "broken", op: "eq", value: 1 },
      },
      {
        id: "thicker-is-safer",
        prompt: "Double the diameter and the same load produces a quarter of the stress. Get the stress below 50 MPa at 200 N.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "load", op: "gte", value: 200 },
            { type: "compare", quantity: "stress", op: "lt", value: 50e6 },
          ],
        },
      },
      {
        id: "try-glass",
        prompt: "Switch to glass and load it up. There is no warning: it is elastic right to the end.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "broken", op: "eq", value: 1 },
            { type: "compare", quantity: "youngsModulus", op: "lte", value: 71e9 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "thicker-wire",
        question: "The wire is made twice as thick, from 1 mm to 2 mm, with the same load. What happens to the stress?",
        variable: "diameter",
        from: 1,
        to: 2,
        quantity: "stress",
        options: ["increase", "decrease", "same"],
        given: { material: "steel", length: 2 },
        explanation: "Area goes as the square of the diameter, so twice as thick is four times the area and a quarter of the stress.",
      },
      {
        id: "longer-wire",
        question: "A 2 m wire is replaced by a 4 m one of the same material and thickness, under the same load. What happens to the strain?",
        variable: "length",
        from: 2,
        to: 4,
        quantity: "strain",
        options: ["increase", "decrease", "same"],
        given: { material: "steel", diameter: 1 },
        explanation:
          "Strain depends only on the stress and the material, so it is unchanged — but the extension, being strain times length, doubles.",
      },
      {
        id: "longer-extension",
        question: "The same wire is made twice as long, under the same load. What happens to the extension in millimetres?",
        variable: "length",
        from: 2,
        to: 4,
        quantity: "extension",
        options: ["increase", "decrease", "same"],
        given: { material: "steel", diameter: 1 },
        explanation: "Δl = εl. The same fractional stretch on twice the length is twice the extension.",
      },
      {
        id: "twice-the-load",
      question: "The load on an elastic wire is doubled, from 100 N to 200 N. What happens to the energy stored in it?",
      variable: "load",
      from: 100,
      to: 200,
      quantity: "energyStored",
      options: ["increase", "decrease", "same"],
      given: { material: "steel", length: 2, diameter: 1 },
      explanation:
        "U = ½FΔl, and the extension doubles with the load — so the energy goes up four times, not two. It is the triangle under the line.",
    },
    {
      id: "modulus-unchanged",
        question: "The wire is made thicker, from 1 mm to 2 mm. What happens to Young's modulus?",
        variable: "diameter",
        from: 1,
        to: 2,
        quantity: "youngsModulus",
        options: ["increase", "decrease", "same"],
        given: { material: "steel", length: 2 },
        explanation:
          "Young's modulus is a property of the material, not of the piece. Stress and strain both change; their ratio does not.",
      },
    ],

    experiment: {
      title: "What does stress ÷ strain tell you?",
      instructions:
        "Keep to the straight part of the curve and record stress against strain for several loads. Then change the thickness, the length and finally the material, and see which of them moves the ratio.",
      columns: ["stress", "strain", "measuredModulus", "extension"],
      minRows: 4,
      discovery: {
        question: "What is stress ÷ strain a property of?",
        choices: [
          { id: "material", label: "The material — the same for any wire made of it", correct: true },
          { id: "thickness", label: "How thick the wire is", correct: false },
          { id: "length", label: "How long the wire is", correct: false },
          { id: "load", label: "How much load is hanging on it", correct: false },
        ],
        reveals: "youngs-modulus",
        insight:
          "Y = σ/ε is Young's modulus. Change the wire's shape all you like: the ratio is fixed by what it is made of, which is exactly what makes it useful.",
      },
    },

    explain: [
      {
        id: "why-stress",
        title: "Why stress and not force",
        body: "A thick rope holds more than a thin one of the same stuff, so force alone says nothing about the material. Dividing by the area gives {{stress}}, a number the material itself answers to.",
      },
      {
        id: "three-words",
        title: "Stiff, strong and tough",
        body: "Stiff means a large Y — it resists stretching. Strong means a high breaking stress. Tough means a large area under the curve. Glass is stiff and strong, and not remotely tough.",
      },
      {
        id: "energy-back",
        title: "The energy is lent, not given",
        body: "Below the elastic limit the wire stores {{energyStored}} and returns all of it. Past the limit, most of that work goes into rearranging the metal for good, and never comes back.",
      },
      {
        id: "exam-note",
        title: "In the exam",
        body: "Expect Y = Fl/AΔl, energy per unit volume = ½σε, and the graph questions: identify the proportional limit, the elastic limit, the yield point and the breaking point, and say which material is which.",
      },
    ],

    challenges: [
      {
        id: "one-millimetre",
        title: "Exactly one millimetre",
        prompt: "Stretch a steel wire by 1.00 mm and keep it elastic.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "extension", op: "eq", value: 1, tolerance: 0.05 },
            { type: "compare", quantity: "elastic", op: "eq", value: 1 },
          ],
        },
        hint: "Δl = Fl/AY. With a 2 m wire you need a strain of 0.0005, which is a stress of 100 MPa.",
        success: "A steel wire a metre or two long stretches by about a millimetre under a load a person could lift. Stiff is an understatement.",
      },
      {
        id: "safe-load",
        title: "Carry 300 newtons safely",
        prompt: "Hang 300 N on a wire and keep the stress below half the breaking stress — a safety factor of two.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "load", op: "gte", value: 300 },
            { type: "compare", quantity: "fractionOfBreaking", op: "lt", value: 0.5 },
          ],
        },
        hint: "You cannot change the load, so change the area: a thicker wire, or a stronger material.",
        success: "That is how a cable is chosen: work out the stress the job demands, then pick an area that keeps it well below the limit.",
      },
      {
        id: "most-energy",
        title: "Store a joule",
        prompt: "Get a wire to store more than 1 J of energy without breaking it.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "energyStored", op: "gt", value: 1 },
            { type: "compare", quantity: "broken", op: "eq", value: 0 },
          ],
        },
        hint: "Energy is the area under the curve times the volume. Something that stretches a long way before it fails holds much more.",
        success: "Toughness is area under the curve. Nylon takes far less stress than steel, and absorbs far more energy doing it.",
      },
    ],
  },

  realWorld: [
    { title: "Lift cables", description: "Sized so the working stress is a small fraction of the breaking stress, with the factor written into the law." },
    { title: "Crumple zones", description: "Designed to go plastic on purpose: the permanent deformation is what absorbs the crash." },
    { title: "Glass and toughened glass", description: "Ordinary glass fails with no warning; toughening puts the surface into compression so cracks cannot open." },
  ],
});
