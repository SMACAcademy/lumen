import { defineConcept } from "@ise/concept-schema";

const SALTS = [
  { value: "agcl", label: "Silver chloride, AgCl" },
  { value: "agbr", label: "Silver bromide, AgBr" },
  { value: "agi", label: "Silver iodide, AgI" },
  { value: "baso4", label: "Barium sulfate, BaSO₄" },
  { value: "caco3", label: "Calcium carbonate, CaCO₃" },
  { value: "caf2", label: "Calcium fluoride, CaF₂" },
  { value: "pbi2", label: "Lead iodide, PbI₂" },
  { value: "mgoh2", label: "Magnesium hydroxide, Mg(OH)₂" },
  { value: "ag2cro4", label: "Silver chromate, Ag₂CrO₄" },
  { value: "feoh3", label: "Iron(III) hydroxide, Fe(OH)₃" },
];

/**
 * The last part of class 11 Equilibrium: sparingly soluble salts, the
 * solubility product, the ionic product and precipitation, and the
 * common-ion effect.
 */
export const solubilityProduct = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "solubility-product",
    title: "Solubility Product",
    tagline: "How little of an \"insoluble\" salt dissolves, when a precipitate forms, and how a common ion pushes the salt back out.",
    domain: "chemistry",
    category: "equilibrium",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Write the solubility product of a sparingly soluble salt and find its solubility from it, compare the ionic product with Ksp to predict precipitation, and explain and calculate the common-ion effect.",
    tags: ["solubility product", "Ksp", "ionic product", "precipitation", "common-ion effect", "class 11"],
  },

  connections: [
    {
      id: "chemical-equilibrium",
      title: "Chemical Equilibrium",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Ksp is an equilibrium constant, and the common-ion effect is Le Chatelier's principle at work.",
      available: true,
    },
    {
      id: "acids-and-bases",
      title: "Acids and Bases",
      domain: "chemistry",
      relation: "related",
      note: "Weak acids are held back by a common ion in just the same way — that is how a buffer works.",
      available: true,
    },
  ],

  variables: [
    {
      id: "salt",
      symbol: "salt",
      name: "Salt",
      meaning: "A sparingly soluble salt, with its Ksp at 298 K.",
      binding: { kind: "param", key: "salt" },
      control: { type: "choice", options: SALTS },
      group: "primary",
      color: "neutral",
    },
    {
      id: "common",
      symbol: "c",
      name: "Common ion added",
      meaning: "The salt's own anion, already in the water from a soluble salt — chloride from NaCl, say.",
      binding: { kind: "state", key: "common" },
      control: { type: "range", unit: "mol/L", min: 0, max: 0.1, step: 0.005, presets: [0, 0.01, 0.1] },
      group: "primary",
      color: "cosine",
    },
    {
      id: "pCation",
      symbol: "p[cation]",
      name: "Cation concentration, as a power of ten",
      meaning: "5 means 10⁻⁵ mol/L. Each whole step down is ten times more concentrated.",
      binding: { kind: "state", key: "pCation" },
      control: { type: "range", unit: "1", min: 1, max: 12, step: 0.5 },
      group: "primary",
      color: "sine",
    },
    {
      id: "pAnion",
      symbol: "p[anion]",
      name: "Anion concentration, as a power of ten",
      meaning: "5 means 10⁻⁵ mol/L. Each whole step down is ten times more concentrated.",
      binding: { kind: "state", key: "pAnion" },
      control: { type: "range", unit: "1", min: 1, max: 12, step: 0.5 },
      group: "primary",
      color: "cosine",
    },
  ],

  quantities: [
    {
      id: "ksp",
      symbol: "Ksp",
      name: "Solubility product",
      meaning: "[cation]ˣ[anion]ʸ in the saturated solution. It changes only with temperature.",
      result: "ksp",
      format: { kind: "sig", figures: 2 },
      color: "neutral",
    },
    {
      id: "solubility",
      symbol: "S (water)",
      name: "Solubility in pure water",
      meaning: "Moles of the salt that dissolve in a litre of water.",
      result: "solubility",
      format: { kind: "sig", figures: 2 },
      unit: "mol/L",
      color: "angle",
      highlight: "scale",
      headline: true,
    },
    {
      id: "microSolubility",
      symbol: "S (µmol/L)",
      name: "Solubility in water, in micromoles per litre",
      meaning: "The same solubility in units of 10⁻⁶ mol/L.",
      result: "microSolubility",
      format: { kind: "sig", figures: 3 },
      color: "angle",
    },
    {
      id: "mgPerLitre",
      symbol: "mg/L",
      name: "Solubility in water, in milligrams per litre",
      meaning: "S times the molar mass.",
      result: "mgPerLitre",
      format: { kind: "sig", figures: 2 },
      color: "neutral",
    },
    {
      id: "ions",
      symbol: "x + y",
      name: "Ions from one formula unit",
      meaning: "2 for AB, 3 for AB₂ or A₂B, 4 for AB₃.",
      result: "ions",
      format: { kind: "integer" },
      color: "neutral",
    },
    {
      id: "dissolved",
      symbol: "S",
      name: "Solubility with the common ion",
      meaning: "Moles that dissolve per litre when the common ion is already there.",
      result: "dissolved",
      format: { kind: "sig", figures: 2 },
      unit: "mol/L",
      color: "angle",
      highlight: "scale",
      headline: true,
    },
    {
      id: "nanoDissolved",
      symbol: "S (nmol/L)",
      name: "Solubility with the common ion, in nanomoles per litre",
      meaning: "The same in units of 10⁻⁹ mol/L.",
      result: "nanoDissolved",
      format: { kind: "sig", figures: 3 },
      color: "angle",
    },
    {
      id: "suppression",
      symbol: "times less",
      name: "How many times less soluble",
      meaning: "Solubility in water ÷ solubility with the common ion.",
      result: "suppression",
      format: { kind: "sig", figures: 2 },
      color: "cosine",
    },
    {
      id: "logQOverK",
      symbol: "log(Q/Ksp)",
      name: "Ionic product against Ksp",
      meaning: "Powers of ten by which Q is above (+) or below (−) Ksp.",
      result: "logQOverK",
      format: { kind: "number", digits: 2 },
      color: "sine",
      highlight: "ionic",
    },
    {
      id: "saturation",
      symbol: "solution",
      name: "The mixed solution",
      meaning: "Q < Ksp: more could dissolve. Q > Ksp: the excess comes out as solid.",
      result: "saturation",
      format: { kind: "label", labels: { "-1": "unsaturated", "0": "just saturated", "1": "precipitates" } },
      color: "sine",
      headline: true,
    },
  ],

  equations: [
    {
      id: "ksp",
      topic: "solubility-product",
      title: "The solubility product",
      words: "Ksp = [cation]ˣ × [anion]ʸ in the saturated solution",
      tokens: [
        { kind: "ref", id: "ksp" },
        { kind: "op", value: "=" },
        { kind: "text", value: "[M]ˣ" },
        { kind: "op", value: "·" },
        { kind: "text", value: "[X]ʸ" },
      ],
      reading: "The solid does not appear: however much sits at the bottom, the ions above it settle to the same product. A smaller Ksp means a less soluble salt only among salts of the same type.",
      assumptions: ["298 K", "Concentrations used in place of activities"],
      discoverable: true,
    },
    {
      id: "solubility-from-ksp",
      topic: "solubility-product",
      title: "Solubility from Ksp",
      words: "S = √Ksp for AB; (Ksp/4)^⅓ for AB₂ or A₂B; (Ksp/27)^¼ for AB₃",
      tokens: [
        { kind: "ref", id: "solubility" },
        { kind: "op", value: "=" },
        { kind: "text", value: "(Ksp / xˣyʸ)^(1/(x+y))" },
      ],
      reading: "If S moles dissolve, the solution holds xS of the cation and yS of the anion. Put those into Ksp and solve for S.",
      assumptions: ["Pure water", "The ions do not react further"],
    },
    {
      id: "ionic-product",
      topic: "solubility-product",
      title: "Will it precipitate?",
      words: "Q < Ksp: clear. Q = Ksp: saturated. Q > Ksp: a precipitate forms",
      tokens: [
        { kind: "text", value: "Q > Ksp" },
        { kind: "op", value: "=" },
        { kind: "text", value: "precipitate" },
      ],
      reading: "Q is the same product as Ksp, but for the concentrations you actually have. Solid comes out until Q has fallen back to Ksp.",
      assumptions: ["Concentrations after mixing, not before"],
    },
    {
      id: "common-ion",
      topic: "common-ion-effect",
      title: "The common-ion effect",
      words: "with a common ion at concentration c, S ≈ Ksp ÷ c for a 1:1 salt",
      tokens: [
        { kind: "ref", id: "dissolved" },
        { kind: "op", value: "≈" },
        { kind: "ref", id: "ksp" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "common" },
      ],
      reading: "Extra chloride pushes AgCl(s) ⇌ Ag⁺ + Cl⁻ to the left: Le Chatelier. Ksp has not changed — the silver concentration has had to fall to keep the product the same.",
      assumptions: ["A 1:1 salt", "c much larger than S", "No complex ions form"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "ksp",
    params: { salt: "agcl" },
    playLabel: "Stir in the common ion",
  },

  visualization: {
    renderer: "ksp",
    hint: "Dissolve: pick a salt, then add its common ion. Precipitate: set the two ion concentrations and see whether Q passes Ksp.",
    layers: [
      { id: "beaker", label: "Beaker" },
      { id: "scale", label: "Solubility scale" },
      { id: "ionic", label: "Q against Ksp" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "dissolve",
      label: "Dissolve",
      description: "Solubility in water and with a common ion",
      layers: ["beaker", "scale", "labels"],
      graphs: [],
      equations: ["ksp", "solubility-from-ksp", "common-ion"],
    },
    {
      id: "precipitate",
      label: "Precipitate",
      description: "Mix two solutions and compare Q with Ksp",
      layers: ["beaker", "ionic", "labels"],
      graphs: [],
      equations: ["ksp", "ionic-product"],
    },
  ],
  defaultMode: "dissolve",
  graphs: [],

  activities: {
    observe: [
      {
        id: "thousandfold",
        prompt: "Make a salt a thousand times less soluble than it is in water.",
        condition: { type: "compare", quantity: "suppression", op: "gt", value: 1000 },
      },
      {
        id: "cloud",
        prompt: "In Precipitate mode, make a precipitate form.",
        condition: { type: "compare", quantity: "saturation", op: "eq", value: 1 },
      },
    ],

    predict: [
      {
        id: "add-chloride",
        question: "Silver chloride sits in water. Chloride is added until it reaches 0.1 mol/L. What happens to the amount of AgCl dissolved?",
        variable: "common",
        from: 0,
        to: 0.1,
        quantity: "dissolved",
        options: ["increase", "decrease", "same"],
        given: { salt: "agcl" },
        explanation: "It falls about 7500 times, from 1.3 × 10⁻⁵ to 1.8 × 10⁻⁹ mol/L: the extra chloride drives silver chloride back out of solution.",
      },
    ],

    experiment: {
      title: "Solubility against the common ion",
      instructions: "With silver chloride, record the solubility at four chloride concentrations — try 0.01, 0.02, 0.05 and 0.1 mol/L.",
      columns: ["common", "dissolved", "ksp"],
      minRows: 3,
      discovery: {
        question: "What happened to the solubility when the chloride was doubled?",
        choices: [
          { id: "halved", label: "It halved: S × c stays equal to Ksp", correct: true },
          { id: "same", label: "It stayed the same", correct: false },
          { id: "doubled", label: "It doubled", correct: false },
          { id: "quarter", label: "It fell to a quarter", correct: false },
        ],
        reveals: "common-ion",
        insight: "[Ag⁺][Cl⁻] must stay at Ksp, so when chloride goes up, silver — and with it the salt dissolved — must come down in proportion.",
      },
    },

    explain: [
      {
        id: "water",
        title: "In pure water",
        body: "Ksp is {{ksp}}, and one formula unit gives {{ions}} ions, so {{solubility}} mol/L dissolves — about {{mgPerLitre}} mg in a litre.",
      },
      {
        id: "common",
        title: "With the common ion",
        body: "Now only {{dissolved}} mol/L dissolves: {{suppression}} times less than in water. Ksp is still {{ksp}}.",
      },
      {
        id: "mixing",
        title: "On mixing",
        body: "The mixture is {{saturation}}: Q is {{logQOverK}} powers of ten away from Ksp.",
      },
    ],

    challenges: [
      {
        id: "barium-meal",
        title: "The faintest cloud",
        prompt: "Barium sulfate, with sulfate at 10⁻⁴ mol/L. Find the most dilute barium solution that still gives a precipitate.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "salt", op: "eq", value: 3 },
            { type: "compare", quantity: "pAnion", op: "eq", value: 4 },
            { type: "compare", quantity: "saturation", op: "eq", value: 1 },
            { type: "compare", quantity: "pCation", op: "gte", value: 5.5 },
          ],
        },
        hint: "Q = [Ba²⁺] × 10⁻⁴ must pass 1.1 × 10⁻¹⁰.",
        success: "At about 3 × 10⁻⁶ mol/L of barium, Q = 3 × 10⁻¹⁰ just passes Ksp. That is how little sulfate water needs before barium chloride shows it up.",
      },
    ],
  },

  realWorld: [
    { title: "Barium meals", description: "Barium ions are poisonous, but barium sulfate is so insoluble that patients can swallow it for an X-ray." },
    { title: "Kidney stones", description: "Calcium oxalate and phosphate precipitate when their ionic product in urine passes Ksp." },
    { title: "Purifying salt", description: "Passing HCl gas into brine precipitates pure NaCl: the common chloride ion at work." },
  ],
});
