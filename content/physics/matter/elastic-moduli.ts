import { defineConcept } from "@ise/concept-schema";

/**
 * Elastic moduli beyond Young's: the bulk modulus, the shear modulus and
 * Poisson's ratio, for class 11 (NCERT chapter 8, "Mechanical Properties of
 * Solids"), following on from the stretched wire in Properties of Solids.
 *
 * Three ways to deform a solid: squeeze a cube equally on every face (bulk
 * modulus B and compressibility 1/B, with water and air beside the metals);
 * push the top of a cube sideways while its base is held (shear modulus G);
 * and stretch a wire, which grows thinner as it grows longer (Poisson's
 * ratio σ).
 *
 * Simplifications, stated in the text too: every solid obeys Hooke's law —
 * the wire is flagged once its stress passes the elastic limit, past which
 * that fails; the shear strain Δx/L = tan θ is taken equal to θ, true for
 * these tiny angles; air is an ideal gas squeezed at constant temperature
 * (Boyle's law), so its bulk modulus is its own pressure; the wire's volume
 * change ε(1 − 2σ) is to first order in the strain. Y, G and B are from
 * NCERT's Tables 8.1–8.3; Poisson's ratios are typical measured values.
 */
export const elasticModuli = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "elastic-moduli",
    title: "Elastic Moduli",
    tagline: "Squeeze a cube from every side, push its top sideways, and watch a stretched wire grow thinner.",
    domain: "physics",
    category: "properties of matter",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 30,
    objective:
      "Use the bulk modulus and compressibility for a body squeezed on every side, the shear modulus for a body pushed along one face, and Poisson's ratio for a stretched wire.",
    tags: ["elasticity", "bulk modulus", "shear modulus", "rigidity modulus", "poisson's ratio", "compressibility", "jee", "neet", "class 11"],
  },

  connections: [
    {
      id: "properties-of-solids",
      title: "Mechanical Properties of Solids",
      domain: "physics",
      relation: "prerequisite",
      note: "Stress, strain and Young's modulus for a stretched wire come first; this lab adds the other two ways to deform a solid.",
      available: true,
    },
    {
      id: "properties-of-fluids",
      title: "Mechanical Properties of Fluids",
      domain: "physics",
      relation: "related",
      note: "A fluid has a bulk modulus but no shear modulus, which is exactly why it flows and takes the shape of its container.",
      available: true,
    },
  ],

  variables: [
    {
      id: "setup",
      symbol: "setup",
      name: "What is done to it",
      meaning: "Squeeze it on every face, push its top sideways, or stretch it as a wire.",
      binding: { kind: "param", key: "setup" },
      control: {
        type: "choice",
        options: [
          { value: "squeeze", label: "Squeeze" },
          { value: "shear", label: "Shear" },
          { value: "stretch", label: "Stretch" },
        ],
      },
      group: "primary",
      color: "curve",
    },
    {
      id: "material",
      symbol: "material",
      name: "Material",
      meaning: "Four solids, a liquid and a gas. Only the solids have a shear modulus.",
      binding: { kind: "param", key: "material" },
      control: {
        type: "choice",
        options: [
          { value: "steel", label: "Steel" },
          { value: "copper", label: "Copper" },
          { value: "aluminium", label: "Aluminium" },
          { value: "glass", label: "Glass" },
          { value: "water", label: "Water" },
          { value: "air", label: "Air" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "pressure",
      symbol: "Δp",
      name: "Extra pressure",
      meaning: "The extra pressure pressing equally on every face of the cube.",
      binding: { kind: "state", key: "pressure" },
      control: { type: "range", unit: "MPa", min: 0, max: 100, step: 0.1, presets: [0.1, 29.4, 100] },
      group: "primary",
      color: "cosine",
    },
    {
      id: "shearForce",
      symbol: "F",
      name: "Sideways force",
      meaning: "A force along the top face of the cube, while its base is held fixed.",
      binding: { kind: "state", key: "shearForce" },
      control: { type: "range", unit: "kN", min: 0, max: 100, step: 1, presets: [25, 50, 84] },
      group: "primary",
      color: "cosine",
    },
    {
      id: "tension",
      symbol: "F",
      name: "Tension in the wire",
      meaning: "The pull on the wire, along its length.",
      binding: { kind: "state", key: "tension" },
      control: { type: "range", unit: "N", min: 0, max: 300, step: 1, presets: [50, 157, 250] },
      group: "primary",
      color: "cosine",
    },
    {
      id: "size",
      symbol: "L",
      name: "Side of the cube",
      meaning: "The cube's edge. A bigger cube has a bigger face, so the same force is a smaller stress.",
      binding: { kind: "param", key: "size" },
      control: { type: "range", unit: "cm", min: 5, max: 20, step: 1, presets: [5, 10, 20] },
      group: "primary",
      color: "tangent",
    },
    {
      id: "diameter",
      symbol: "d",
      name: "Wire diameter",
      meaning: "A thicker wire spreads the pull over more area.",
      binding: { kind: "param", key: "diameter" },
      control: { type: "range", unit: "mm", min: 0.5, max: 2, step: 0.1, presets: [0.5, 1, 2] },
      group: "primary",
      color: "angle",
    },
    {
      id: "length",
      symbol: "l",
      name: "Wire length",
      meaning: "The wire's original length. It changes the extension in millimetres, not the strains.",
      binding: { kind: "param", key: "length" },
      control: { type: "range", unit: "m", min: 0.5, max: 5, step: 0.1, presets: [1, 2, 4] },
      group: "primary",
      color: "point",
    },
  ],

  quantities: [
    // Squeeze
    { id: "bulkModulus", symbol: "B", name: "Bulk modulus", meaning: "Pressure needed per unit fractional loss of volume: B = Δp ÷ (−ΔV/V). For air it is its own pressure, so it grows as the air is squeezed.", result: "measuredBulkGPa", format: { kind: "sig", figures: 3 }, unit: "GPa", color: "curve", highlight: "body", headline: true },
    { id: "compressibility", symbol: "k", name: "Compressibility, per GPa", meaning: "1/B: the fraction of its volume lost for each GPa of extra pressure. Gases are about a million times more compressible than solids.", result: "compressibility", format: { kind: "sig", figures: 3 }, color: "secant", highlight: "compare" },
    { id: "compression", symbol: "−ΔV/V", name: "Volume strain", meaning: "The fraction of its volume the cube has lost. No units.", result: "compression", format: { kind: "sig", figures: 3 }, unit: "1", color: "tangent", highlight: "body" },
    { id: "compressionPercent", symbol: "−ΔV/V", name: "Volume lost", meaning: "The same, as a percentage.", result: "compressionPercent", format: { kind: "sig", figures: 3 }, unit: "%", color: "tangent", highlight: "body", headline: true },
    { id: "volumeDecrease", symbol: "−ΔV", name: "Volume lost", meaning: "How many cubic centimetres the cube has lost.", result: "volumeDecrease", format: { kind: "sig", figures: 3 }, unit: "cm3", color: "tangent", highlight: "body" },
    // Shear
    { id: "shearModulus", symbol: "G", name: "Shear modulus", meaning: "Shear stress per unit shear strain, G = (F/A) ÷ θ. Also called the modulus of rigidity. Zero for a fluid.", result: "shearModulusGPa", format: { kind: "sig", figures: 3 }, unit: "GPa", color: "curve", highlight: "compare", headline: true },
    { id: "shearStress", symbol: "F/A", name: "Shear stress", meaning: "The sideways force per unit area of the face it acts along.", result: "shearStress", format: { kind: "sig", figures: 3 }, unit: "MPa", color: "cosine", highlight: "forces" },
    { id: "shearStrain", symbol: "θ", name: "Shear strain", meaning: "Δx/L = tan θ, which for these tiny angles is θ itself, in radians.", result: "shearStrain", format: { kind: "sig", figures: 3 }, unit: "1", color: "angle", highlight: "body" },
    { id: "shearDisplacement", symbol: "Δx", name: "Slide of the top face", meaning: "How far the top face moves relative to the base, in micrometres.", result: "shearDisplacement", format: { kind: "sig", figures: 3 }, unit: "um", color: "angle", highlight: "body", headline: true },
    { id: "holdsShape", symbol: "solid?", name: "Resists a shear", meaning: "A solid springs back from a shear; a liquid or gas just flows.", result: "holdsShape", format: { kind: "label", labels: { "0": "no — it flows", "1": "yes" } }, color: "neutral" },
    // Stretch
    { id: "youngsModulus", symbol: "Y", name: "Young's modulus", meaning: "Tensile stress per unit longitudinal strain.", result: "youngsModulusGPa", format: { kind: "sig", figures: 3 }, unit: "GPa", color: "curve" },
    { id: "tensileStress", symbol: "F/A", name: "Tensile stress", meaning: "The pull per unit cross-section of the wire.", result: "tensileStress", format: { kind: "sig", figures: 3 }, unit: "MPa", color: "cosine", highlight: "forces" },
    { id: "longStrain", symbol: "Δl/l", name: "Longitudinal strain", meaning: "How much longer, as a fraction of the original length.", result: "longStrain", format: { kind: "sig", figures: 3 }, unit: "1", color: "tangent", highlight: "body" },
    { id: "lateralStrain", symbol: "Δd/d", name: "Lateral strain", meaning: "How much thinner, as a fraction of the original diameter.", result: "lateralStrain", format: { kind: "sig", figures: 3 }, unit: "1", color: "angle", highlight: "body" },
    { id: "diameterDecrease", symbol: "−Δd", name: "Narrowing", meaning: "How much thinner the wire has become, in micrometres.", result: "diameterDecrease", format: { kind: "sig", figures: 3 }, unit: "um", color: "angle", highlight: "body", headline: true },
    { id: "poissonsRatio", symbol: "σ", name: "Poisson's ratio", meaning: "Lateral strain ÷ longitudinal strain. A property of the material, about 0.2 to 0.4 for metals and glass.", result: "measuredPoisson", format: { kind: "number", digits: 2 }, color: "secant", highlight: "compare", headline: true },
    { id: "wireVolumeStrain", symbol: "ΔV/V", name: "Wire's volume change", meaning: "ε(1 − 2σ): the wire's volume grows a little, because it narrows by less than half as much as it lengthens.", result: "wireVolumeStrain", format: { kind: "sig", figures: 3 }, unit: "1", color: "tangent" },
    { id: "overLimit", symbol: "limit", name: "Past the elastic limit", meaning: "Beyond the elastic limit the wire no longer obeys Hooke's law, and these numbers no longer hold.", result: "overLimit", format: { kind: "label", labels: { "0": "no — elastic", "1": "yes" } }, color: "secant" },
  ],

  equations: [
    {
      id: "bulk-modulus",
      topic: "bulk-shear-modulus",
      title: "Bulk modulus",
      words: "bulk modulus = extra pressure ÷ fraction of volume lost",
      tokens: [
        { kind: "ref", id: "bulkModulus" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "pressure" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "compression" },
      ],
      reading: "B = −p/(ΔV/V). The minus sign makes B positive: more pressure means less volume.",
      assumptions: ["Pressure equal on every face", "Within the elastic limit"],
      discoverable: true,
    },
    {
      id: "compressibility",
      topic: "bulk-shear-modulus",
      title: "Compressibility",
      tokens: [
        { kind: "ref", id: "compressibility" },
        { kind: "op", value: "=" },
        { kind: "text", value: "1" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "bulkModulus" },
      ],
      reading: "The reciprocal of the bulk modulus: a large B means hard to squeeze.",
      assumptions: [],
    },
    {
      id: "shear-strain",
      topic: "bulk-shear-modulus",
      title: "Shear strain",
      tokens: [
        { kind: "ref", id: "shearStrain" },
        { kind: "op", value: "=" },
        { kind: "text", value: "Δx / L = tan θ" },
        { kind: "op", value: "≈" },
        { kind: "text", value: "θ" },
      ],
      reading: "The slide of the top face over the height of the block. The angle is so small that tan θ and θ (in radians) are the same.",
      assumptions: ["Small angle"],
    },
    {
      id: "shear-modulus",
      topic: "bulk-shear-modulus",
      title: "Shear modulus",
      words: "shear modulus = shear stress ÷ shear strain",
      tokens: [
        { kind: "ref", id: "shearModulus" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "shearStress" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "shearStrain" },
      ],
      reading: "G = (F/A)/θ. For most materials G is about a third of Y.",
      assumptions: ["Within the elastic limit", "Force along the face"],
    },
    {
      id: "poissons-ratio",
      topic: "poissons-ratio",
      title: "Poisson's ratio",
      words: "Poisson's ratio = lateral strain ÷ longitudinal strain",
      tokens: [
        { kind: "ref", id: "poissonsRatio" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "lateralStrain" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "longStrain" },
      ],
      reading: "Both strains are fractions, so σ has no units. It is fixed by the material, not by the load or the wire's size.",
      assumptions: ["Within the elastic limit"],
    },
    {
      id: "wire-volume",
      topic: "poissons-ratio",
      title: "Volume of a stretched wire",
      tokens: [
        { kind: "ref", id: "wireVolumeStrain" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "longStrain" },
        { kind: "op", value: "·" },
        { kind: "text", value: "(1 − 2σ)" },
      ],
      reading: "Longer by ε, narrower by σε in each of two directions. With σ below 0.5 the volume grows; at σ = 0.5 it would not change.",
      assumptions: ["Small strains (first order)"],
    },
  ],

  simulation: {
    model: "moduli",
    params: { setup: "squeeze", material: "steel", size: 10, diameter: 1, length: 2 },
    playLabel: "Load it",
  },

  visualization: {
    renderer: "moduli",
    hint: "Choose what to do to it, then raise the load — or press play. The change is drawn magnified.",
    layers: [
      { id: "body", label: "The body" },
      { id: "forces", label: "Forces" },
      { id: "original", label: "Original shape", optional: true },
      { id: "compare", label: "Other materials", optional: true },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    {
      id: "deform",
      label: "Deform",
      description: "Load it and read the strain",
      layers: ["body", "forces", "original", "labels"],
      graphs: [],
      equations: ["bulk-modulus", "shear-modulus", "poissons-ratio"],
      swatches: [{ color: "neutral", dash: "solid" }],
    },
    {
      id: "compare",
      label: "Compare",
      description: "Six materials side by side",
      layers: ["body", "forces", "original", "compare", "labels"],
      graphs: [],
      equations: ["compressibility", "shear-strain", "wire-volume"],
      swatches: [{ color: "curve", dash: "solid" }],
    },
    {
      id: "bare",
      label: "Just the body",
      description: "No numbers on the drawing",
      layers: ["body", "forces", "original"],
      graphs: [],
      equations: ["bulk-modulus"],
    },
  ],
  defaultMode: "deform",
  graphs: [],

  activities: {
    observe: [
      {
        id: "squeeze-water",
        prompt: "Choose water and squeeze it with 30 MPa — the pressure 3 km down in the sea. It loses over 1% of its volume.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "material", op: "eq", value: 4 },
            { type: "compare", quantity: "compressionPercent", op: "gte", value: 1 },
          ],
        },
      },
      {
        id: "squeeze-air",
        prompt: "Now air. One extra atmosphere (0.1 MPa) halves it.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "material", op: "eq", value: 5 },
            { type: "compare", quantity: "compressionPercent", op: "gte", value: 49 },
          ],
        },
      },
      {
        id: "shear-it",
        prompt: "Switch to Shear and push the top of the steel cube. It slides a few micrometres and leans over by an angle θ.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "setup", op: "eq", value: 1 },
            { type: "compare", quantity: "shearDisplacement", op: "gt", value: 0 },
          ],
        },
      },
      {
        id: "shear-water",
        prompt: "Try to shear water. It has no shear modulus — it simply flows.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "setup", op: "eq", value: 1 },
            { type: "compare", quantity: "holdsShape", op: "eq", value: 0 },
          ],
        },
      },
      {
        id: "stretch-thin",
        prompt: "Switch to Stretch and pull the wire. It gets longer — and a little thinner.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "setup", op: "eq", value: 2 },
            { type: "compare", quantity: "diameterDecrease", op: "gt", value: 0 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "more-pressure",
        question: "Water is squeezed with 20 MPa instead of 10 MPa. What happens to the fraction of its volume it loses?",
        variable: "pressure",
        from: 10,
        to: 20,
        quantity: "compressionPercent",
        options: ["increase", "decrease", "same"],
        given: { setup: "squeeze", material: "water" },
        explanation: "Within the elastic limit −ΔV/V = Δp/B, so twice the pressure loses twice the fraction: 0.45% becomes 0.91%.",
      },
      {
        id: "bigger-cube-bulk",
        question: "A steel cube twice the size is squeezed with the same 50 MPa. What happens to the bulk modulus you measure?",
        variable: "size",
        from: 10,
        to: 20,
        quantity: "measuredBulkGPa",
        options: ["increase", "decrease", "same"],
        given: { setup: "squeeze", material: "steel", pressure: 50 },
        explanation: "B is a property of steel, 160 GPa. The bigger cube loses eight times as many cubic centimetres, but the same fraction.",
      },
      {
        id: "bigger-cube-shear",
        question: "The same 84 kN pushes along the top of a steel cube with a 20 cm side instead of 10 cm. What happens to how far the top slides?",
        variable: "size",
        from: 10,
        to: 20,
        quantity: "shearDisplacement",
        options: ["increase", "decrease", "same"],
        given: { setup: "shear", material: "steel", shearForce: 84 },
        explanation: "Four times the face area makes a quarter of the stress and the strain; the cube is twice as tall, so Δx = θL halves, from 10 µm to 5 µm.",
      },
      {
        id: "poisson-fixed",
        question: "A steel wire's tension is raised from 50 N to 150 N. What happens to lateral strain ÷ longitudinal strain?",
        variable: "tension",
        from: 50,
        to: 150,
        quantity: "measuredPoisson",
        options: ["increase", "decrease", "same"],
        given: { setup: "stretch", material: "steel", diameter: 1 },
        explanation: "Both strains triple, so their ratio stays at 0.29: Poisson's ratio belongs to steel, not to the load.",
      },
      {
        id: "wire-volume",
        question: "A steel wire is pulled with 150 N instead of nothing. What happens to its volume?",
        variable: "tension",
        from: 0,
        to: 150,
        quantity: "wireVolumeStrain",
        options: ["increase", "decrease", "same"],
        given: { setup: "stretch", material: "steel", diameter: 1 },
        explanation: "ΔV/V = ε(1 − 2σ) = ε × 0.42 for steel: it grows, by about 0.04%, because it narrows by less than it lengthens.",
      },
    ],

    experiment: {
      title: "What does Δp ÷ (−ΔV/V) tell you?",
      instructions:
        "Squeeze a steel cube and record the pressure and the volume strain for several pressures. Then change the size of the cube, and then the material, and see which of them moves the ratio.",
      columns: ["pressure", "compression", "bulkModulus", "volumeDecrease"],
      minRows: 4,
      discovery: {
        question: "What is pressure ÷ volume strain a property of?",
        choices: [
          { id: "material", label: "The material — the same for any piece of it", correct: true },
          { id: "size", label: "How big the cube is", correct: false },
          { id: "pressure", label: "How hard it is squeezed", correct: false },
        ],
        reveals: "bulk-modulus",
        insight:
          "B = −Δp/(ΔV/V) is the bulk modulus. For a solid or a liquid it is fixed by the material; for a gas, which follows Boyle's law, it equals the gas's pressure.",
      },
    },

    explain: [
      {
        id: "three-moduli",
        title: "Three moduli, three deformations",
        body: "Pull along a length: Young's modulus Y. Squeeze on every side: bulk modulus B. Push along a face: shear modulus G. Each is stress ÷ strain, so each is measured in pascals.",
      },
      {
        id: "fluids",
        title: "Why fluids flow",
        body: "A liquid or a gas resists being squeezed (it has a bulk modulus) but not being sheared: the shear modulus here is {{shearModulus}}. That is what being a fluid means.",
      },
      {
        id: "how-hard",
        title: "How hard to squeeze",
        body: "This material's compressibility is {{compressibility}} per GPa. Steel's is 0.00625, water's 0.455 and air's 10 000: solids are the least compressible, gases about a million times more.",
      },
      {
        id: "poisson",
        title: "Thinner as it stretches",
        body: "The wire is now thinner by {{diameterDecrease}} µm. Lateral strain ÷ longitudinal strain is Poisson's ratio, {{poissonsRatio}} here. Rubber comes close to 0.5, keeping its volume; cork is nearly 0, which is why a cork slides into a bottle without bulging.",
      },
      {
        id: "assumptions",
        title: "What the model assumes",
        body: "Every solid obeys Hooke's law; the wire is flagged when it passes the elastic limit, beyond which it would not. θ is taken equal to tan θ. Air is squeezed at constant temperature (Boyle's law). Y, G and B are NCERT's table values; the Poisson's ratios are typical measured ones.",
      },
      {
        id: "exam-note",
        title: "In the exam",
        body: "Expect B = −p/(ΔV/V) with p = hρg for a depth, G = (F/A)/θ with θ = Δx/L, and σ = (Δd/d)/(Δl/l). Watch the units: GPa is 10⁹ Pa, and a micrometre is 10⁻⁶ m.",
      },
    ],

    challenges: [
      {
        id: "one-percent",
        title: "One per cent of a litre",
        prompt: "Squeeze the 10 cm cube of water until it has lost 1% of its volume.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "material", op: "eq", value: 4 },
            { type: "compare", quantity: "size", op: "eq", value: 10 },
            { type: "compare", quantity: "compressionPercent", op: "eq", value: 1, tolerance: 0.03 },
          ],
        },
        hint: "Δp = B × (−ΔV/V) = 2.2 GPa × 0.01.",
        success: "22 MPa — about 2.2 km under the sea. Water is hard to squeeze, but not impossible.",
      },
      {
        id: "twenty-micrometres",
        title: "Twenty micrometres",
        prompt: "Make the top face of a cube slide 20 µm.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "holdsShape", op: "eq", value: 1 },
            { type: "compare", quantity: "shearDisplacement", op: "eq", value: 20, tolerance: 0.5 },
          ],
        },
        hint: "Δx = F/(GL) for a cube. Aluminium, with G = 25 GPa, slides furthest.",
        success: "A 10 cm aluminium cube needs 50 kN — the weight of about five tonnes — to slide a fiftieth of a millimetre.",
      },
      {
        id: "micrometre-thinner",
        title: "A micrometre thinner",
        prompt: "Make a wire at least 1 µm thinner while keeping it within its elastic limit.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "diameterDecrease", op: "gte", value: 1 },
            { type: "compare", quantity: "overLimit", op: "eq", value: 0 },
          ],
        },
        hint: "Δd = 4σF/(πdY). You want a soft metal with a large σ — and a wire thick enough to stay below its elastic limit.",
        success: "Aluminium, 300 N, a 1.5 mm wire: 1.2 µm thinner, at 170 MPa — just inside its 180 MPa limit.",
      },
    ],
  },

  realWorld: [
    { title: "Deep-sea pressure", description: "At the bottom of the deepest ocean trench, about 11 km down, the pressure is around 110 MPa and water is about 5% denser than at the surface." },
    { title: "Rubber pads under bridges", description: "Bearings let a bridge deck shift sideways as it warms and cools: the rubber shears easily, while the stiff steel plates take the weight." },
    { title: "Cork stoppers", description: "Cork's Poisson's ratio is almost zero, so pushing it into a bottle neck does not make it bulge sideways and jam." },
    { title: "Hydraulic oil", description: "Brake and lift systems use oils with a large bulk modulus, so the pressure you apply moves the piston instead of squashing the oil." },
  ],
});
