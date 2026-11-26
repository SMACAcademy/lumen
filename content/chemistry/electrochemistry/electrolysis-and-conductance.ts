import { defineConcept } from "@ise/concept-schema";

/**
 * Electrolysis and conductance for class 12.
 *
 * The cell: a current for a time is a charge, a charge is moles of
 * electrons, and each ion at the cathode takes a fixed number of them — so
 * the mass deposited follows (Faraday's laws), and the gases come off in
 * fixed volumes. The plot: how the molar conductivity of strong and weak
 * electrolytes changes on dilution, and Kohlrausch's way of finding Λ°m for
 * a weak acid from three strong electrolytes.
 */
export const electrolysisAndConductance = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "electrolysis-and-conductance",
    title: "Electrolysis and Conductance",
    tagline: "Charge in, metal out — and how well ions carry a current as a solution is diluted.",
    domain: "chemistry",
    category: "electrochemistry",
    grade: { min: 12, max: 12 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Use Q = It and Faraday's laws to find the mass or volume of product in electrolysis, compare products for the same charge, and explain how molar conductivity changes on dilution for strong and weak electrolytes, using Kohlrausch's law to find Λ°m of a weak acid.",
    tags: ["electrolysis", "Faraday's laws", "conductance", "molar conductivity", "Kohlrausch", "class 12"],
  },

  connections: [
    {
      id: "galvanic-cells",
      title: "Galvanic Cells",
      domain: "chemistry",
      relation: "related",
      note: "A galvanic cell makes a current from a reaction; electrolysis runs the reaction backwards with a current.",
      available: true,
    },
    {
      id: "acids-and-bases",
      title: "Acids, Bases and Titration",
      domain: "chemistry",
      relation: "related",
      note: "The same Ka that sets a weak acid's pH sets how far it ionises, and so how well it conducts.",
      available: true,
    },
  ],

  variables: [
    {
      id: "current",
      symbol: "I",
      name: "Current",
      meaning: "How much charge flows each second.",
      binding: { kind: "state", key: "current" },
      control: { type: "range", unit: "A", min: 0.1, max: 5, step: 0.1 },
      group: "primary",
      color: "sine",
    },
    {
      id: "time",
      symbol: "t",
      name: "Time",
      meaning: "How long the current flows.",
      binding: { kind: "state", key: "time" },
      control: { type: "range", unit: "min", min: 0, max: 120, step: 1 },
      group: "primary",
      color: "tangent",
    },
    {
      id: "electrolyte",
      symbol: "cell",
      name: "In the cell",
      meaning: "What is being electrolysed (with inert electrodes).",
      binding: { kind: "param", key: "electrolyte" },
      control: {
        type: "choice",
        options: [
          { value: "copper-sulfate", label: "Copper sulfate" },
          { value: "silver-nitrate", label: "Silver nitrate" },
          { value: "molten-nacl", label: "Molten sodium chloride" },
          { value: "acidified-water", label: "Acidified water" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "c",
      symbol: "c",
      name: "Concentration",
      meaning: "How much solute in each litre. Less is more dilute.",
      binding: { kind: "state", key: "c" },
      control: { type: "range", unit: "mol/L", min: 0.001, max: 0.1, step: 0.001 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "solute",
      symbol: "solute",
      name: "Solute",
      meaning: "The electrolyte whose conductance is measured.",
      binding: { kind: "param", key: "solute" },
      control: {
        type: "choice",
        options: [
          { value: "hcl", label: "HCl (strong)" },
          { value: "kcl", label: "KCl (strong)" },
          { value: "nacl", label: "NaCl (strong)" },
          { value: "ch3coona", label: "CH₃COONa (strong)" },
          { value: "ch3cooh", label: "CH₃COOH (weak)" },
        ],
      },
      group: "primary",
      color: "angle",
    },
  ],

  quantities: [
    {
      id: "charge",
      symbol: "Q",
      name: "Charge passed",
      meaning: "Current times time, in coulombs.",
      result: "charge",
      format: { kind: "number", digits: 0 },
      unit: "C",
      color: "sine",
      highlight: "cell",
      headline: true,
    },
    {
      id: "molesElectrons",
      symbol: "Q/F",
      name: "Moles of electrons",
      meaning: "The charge divided by the Faraday constant, 96 500 C per mole of electrons.",
      result: "molesElectrons",
      format: { kind: "number", digits: 4 },
      unit: "mol",
      color: "sine",
    },
    {
      id: "cathodeMass",
      symbol: "m",
      name: "Metal deposited",
      meaning: "The mass of metal plated on the cathode.",
      result: "cathodeMass",
      format: { kind: "number", digits: 3 },
      unit: "g",
      color: "secant",
      highlight: "products",
      headline: true,
    },
    {
      id: "cathodeGas",
      symbol: "V (cathode)",
      name: "Gas at the cathode",
      meaning: "Volume at STP of any gas given off at the cathode.",
      result: "cathodeGas",
      format: { kind: "number", digits: 3 },
      unit: "L",
      color: "secant",
      highlight: "products",
    },
    {
      id: "anodeGas",
      symbol: "V (anode)",
      name: "Gas at the anode",
      meaning: "Volume at STP of the gas given off at the anode.",
      result: "anodeGas",
      format: { kind: "number", digits: 3 },
      unit: "L",
      color: "cosine",
      highlight: "products",
    },
    {
      id: "equivalentMass",
      symbol: "M/n",
      name: "Mass per mole of electrons",
      meaning: "Molar mass of the cathode product divided by the electrons each needs, in grams.",
      result: "equivalentMass",
      format: { kind: "number", digits: 2 },
      unit: "g",
      color: "neutral",
    },
    {
      id: "sqrtC",
      symbol: "√c",
      name: "Square root of concentration",
      meaning: "Kohlrausch plotted conductivity against this, and got straight lines for strong electrolytes.",
      result: "sqrtC",
      format: { kind: "number", digits: 3 },
      color: "cosine",
    },
    {
      id: "lambda",
      symbol: "Λm",
      name: "Molar conductivity",
      meaning: "How well a mole of the solute conducts when dissolved.",
      result: "lambda",
      format: { kind: "number", digits: 1 },
      unit: "S cm2/mol",
      color: "angle",
      highlight: "plot",
      headline: true,
    },
    {
      id: "lambdaZero",
      symbol: "Λ°m",
      name: "Limiting molar conductivity",
      meaning: "Λm at infinite dilution, when the ions no longer get in each other's way.",
      result: "lambdaZero",
      format: { kind: "number", digits: 1 },
      unit: "S cm2/mol",
      color: "angle",
    },
    {
      id: "alpha",
      symbol: "α",
      name: "Degree of ionisation",
      meaning: "The fraction of the solute split into ions: 1 for a strong electrolyte.",
      result: "alpha",
      format: { kind: "number", digits: 3 },
      color: "tangent",
      headline: true,
    },
    {
      id: "kappa",
      symbol: "κ",
      name: "Conductivity",
      meaning: "How well the solution itself conducts: Λm × c / 1000.",
      result: "kappa",
      format: { kind: "sig", figures: 3 },
      unit: "S/cm",
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "faraday-first",
      topic: "electrolysis",
      title: "Faraday's first law",
      words: "mass deposited = (molar mass ÷ electrons per ion) × charge ÷ F",
      tokens: [
        { kind: "ref", id: "cathodeMass" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "equivalentMass" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "charge" },
        { kind: "op", value: "/" },
        { kind: "text", value: "F" },
      ],
      reading: "The mass is proportional to the charge passed. Pass the same charge through two cells and the masses go as M/n — Faraday's second law.",
      assumptions: ["F = 96 500 C mol⁻¹", "Every electron does its job at the cathode"],
      discoverable: true,
    },
    {
      id: "charge-passed",
      topic: "electrolysis",
      title: "Charge",
      words: "charge = current × time (in seconds)",
      tokens: [
        { kind: "ref", id: "charge" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "current" },
        { kind: "op", value: "·" },
        { kind: "text", value: "t (s)" },
      ],
      reading: "One ampere for one second is one coulomb; 96 500 coulombs is a mole of electrons.",
      assumptions: ["A steady current"],
    },
    {
      id: "kohlrausch-strong",
      topic: "conductance",
      title: "Strong electrolytes",
      words: "Λm = Λ°m − A√c",
      tokens: [
        { kind: "ref", id: "lambda" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "lambdaZero" },
        { kind: "op", value: "−" },
        { kind: "text", value: "A" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "sqrtC" },
      ],
      reading: "A strong electrolyte is fully ionised at any concentration; its Λm dips only because crowded ions drag on each other, in a straight line against √c. Extrapolate the line to √c = 0 for Λ°m.",
      assumptions: ["Dilute solutions", "A 1:1 electrolyte"],
      discoverable: true,
    },
    {
      id: "independent-migration",
      topic: "conductance",
      title: "Kohlrausch's law of independent migration",
      words: "Λ°m(CH₃COOH) = Λ°m(HCl) + Λ°m(CH₃COONa) − Λ°m(NaCl)",
      tokens: [
        { kind: "text", value: "Λ°(CH₃COOH)" },
        { kind: "op", value: "=" },
        { kind: "text", value: "Λ°(HCl)" },
        { kind: "op", value: "+" },
        { kind: "text", value: "Λ°(CH₃COONa)" },
        { kind: "op", value: "−" },
        { kind: "text", value: "Λ°(NaCl)" },
      ],
      reading: "At infinite dilution each ion conducts on its own, so ion conductivities add. A weak acid's Λ°m cannot be read off its curve, but can be built from strong electrolytes: 426.2 + 91.0 − 126.4 = 390.8.",
      assumptions: ["Infinite dilution"],
    },
    {
      id: "conductivity",
      topic: "conductance",
      title: "Conductivity from molar conductivity",
      words: "κ = Λm × c ÷ 1000",
      tokens: [
        { kind: "ref", id: "kappa" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "lambda" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "c" },
        { kind: "op", value: "/" },
        { kind: "text", value: "1000" },
      ],
      reading: "Dilution lowers κ — fewer ions in each cm³ — even while each mole of solute conducts better.",
      assumptions: ["κ in S cm⁻¹, c in mol L⁻¹"],
    },
  ],

  simulation: {
    model: "electrolysis",
    params: { electrolyte: "copper-sulfate", solute: "kcl" },
    playLabel: "Run it",
  },

  visualization: {
    renderer: "electrolysis",
    hint: "In the cell, set the current and time. In conductance, dilute a solution and watch Λm.",
    layers: [
      { id: "cell", label: "Cell" },
      { id: "ions", label: "Ions", optional: true },
      { id: "products", label: "Products" },
      { id: "plot", label: "Λm against √c" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "cell",
      label: "Electrolysis",
      description: "Charge in, products out",
      layers: ["cell", "ions", "products", "labels"],
      graphs: [],
      equations: ["charge-passed", "faraday-first"],
    },
    {
      id: "conductance",
      label: "Conductance",
      description: "Strong and weak electrolytes on dilution",
      layers: ["plot", "labels"],
      graphs: [],
      equations: ["kohlrausch-strong", "independent-migration", "conductivity"],
    },
  ],
  defaultMode: "cell",
  graphs: [],

  activities: {
    observe: [
      {
        id: "one-gram",
        prompt: "Plate at least 1 g of copper.",
        condition: { type: "compare", quantity: "cathodeMass", op: "gte", value: 1 },
      },
      {
        id: "half-ionised",
        prompt: "In conductance, make acetic acid more than 10% ionised.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "strong", op: "eq", value: 0 },
            { type: "compare", quantity: "alpha", op: "gt", value: 0.1 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "longer",
        question: "Copper sulfate electrolysed at 2 A: the time goes from 10 to 40 minutes. What happens to the mass of copper?",
        variable: "time",
        from: 10,
        to: 40,
        quantity: "cathodeMass",
        options: ["increase", "decrease", "same"],
        given: { electrolyte: "copper-sulfate", current: 2 },
        explanation: "It rises four times over: four times the time is four times the charge, and the mass is proportional to the charge.",
      },
    ],

    experiment: {
      title: "Mass and charge",
      instructions: "Plate copper at different currents and times; record the charge and the mass.",
      columns: ["charge", "cathodeMass"],
      minRows: 3,
      discovery: {
        question: "How does the mass of copper depend on the charge passed?",
        choices: [
          { id: "proportional", label: "It is proportional to the charge", correct: true },
          { id: "current", label: "It depends only on the current", correct: false },
          { id: "time", label: "It depends only on the time", correct: false },
          { id: "square", label: "It grows with the square of the charge", correct: false },
        ],
        reveals: "faraday-first",
        insight: "Any current and time with the same product give the same copper: it is the charge that counts.",
      },
    },

    explain: [
      {
        id: "cell",
        title: "Counting electrons",
        body: "{{charge}} C is {{molesElectrons}} mol of electrons. At {{equivalentMass}} g per mole of electrons, that is {{cathodeMass}} g at the cathode.",
      },
      {
        id: "conductance",
        title: "On dilution",
        body: "Here Λm = {{lambda}} S cm² mol⁻¹ with α = {{alpha}}. Strong electrolytes stay fully ionised and gain a little; weak ones ionise more and gain a lot.",
      },
    ],

    challenges: [
      {
        id: "silver-gram",
        title: "One gram of silver",
        prompt: "Plate 1.00 g of silver, within 0.02 g.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "electrolyte", op: "eq", value: 1 },
            { type: "compare", quantity: "cathodeMass", op: "eq", value: 1, tolerance: 0.02 },
          ],
        },
        hint: "1 g of silver is 1/108 mol, so it needs 96 500 / 108 ≈ 894 C.",
        success: "About 894 C — for example 1 A for 15 minutes.",
      },
    ],
  },

  realWorld: [
    { title: "Electroplating", description: "Silver-plated spoons and chrome-plated taps: the object is the cathode, and Faraday's law says how long to plate it." },
    { title: "Refining copper", description: "Impure copper anodes dissolve and pure copper plates on the cathode, 1.18 g for every ampere-hour." },
    { title: "Aluminium and sodium", description: "Both are made by electrolysing molten compounds — which is why aluminium was once dearer than gold." },
  ],
});
