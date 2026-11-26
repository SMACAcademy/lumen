import { defineConcept } from "@ise/concept-schema";

const yesNo = (id: string, symbol: string, name: string, meaning: string) => ({
  id,
  symbol,
  name,
  meaning,
  binding: { kind: "param" as const, key: id },
  control: {
    type: "choice" as const,
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
    ],
  },
  group: "primary" as const,
  color: "neutral" as const,
});

/**
 * Batteries and corrosion for class 12.
 *
 * Cells: dry, mercury, lead–acid and fuel cells, joined in series, their
 * voltages and their energy ΔG = −nFE, and what happens as they run down.
 * Corrosion: an iron nail under different conditions and coatings, and why
 * galvanising protects where tin plate fails.
 */
export const batteriesAndCorrosion = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "batteries-and-corrosion",
    title: "Batteries and Corrosion",
    tagline: "The cells in your torch, car and spacecraft — and the redox that eats iron.",
    domain: "chemistry",
    category: "electrochemistry",
    grade: { min: 12, max: 12 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Compare primary, secondary and fuel cells, add cell voltages in series, relate a cell's EMF to its Gibbs energy with ΔG = −nFE, and explain the conditions for rusting and how paint, tin plating and galvanising protect iron.",
    tags: ["batteries", "dry cell", "lead-acid", "fuel cell", "Gibbs energy", "corrosion", "galvanising", "class 12"],
  },

  connections: [
    {
      id: "galvanic-cells",
      title: "Galvanic Cells",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Every battery is a galvanic cell built to be carried around.",
      available: true,
    },
    {
      id: "redox-reactions",
      title: "Redox Reactions",
      domain: "chemistry",
      relation: "related",
      note: "Rusting is a redox reaction: iron is oxidised and oxygen reduced.",
      available: true,
    },
  ],

  variables: [
    {
      id: "cell",
      symbol: "cell",
      name: "Cell",
      meaning: "Which kind of cell.",
      binding: { kind: "param", key: "cell" },
      control: {
        type: "choice",
        options: [
          { value: "dry", label: "Dry cell" },
          { value: "mercury", label: "Mercury cell" },
          { value: "lead-acid", label: "Lead–acid battery" },
          { value: "fuel", label: "H₂–O₂ fuel cell" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "cells",
      symbol: "cells",
      name: "Cells in series",
      meaning: "How many cells are joined, + to −.",
      binding: { kind: "state", key: "cells" },
      control: { type: "range", unit: "1", min: 1, max: 6, step: 1 },
      group: "primary",
      color: "sine",
    },
    {
      id: "charge",
      symbol: "charge",
      name: "Charge left (%)",
      meaning: "How much of the cell's reaction is still to run.",
      binding: { kind: "state", key: "charge" },
      control: { type: "range", unit: "1", min: 0, max: 100, step: 5 },
      group: "primary",
      color: "tangent",
    },
    {
      id: "days",
      symbol: "days",
      name: "Days",
      meaning: "How long the nail has stood in the tube.",
      binding: { kind: "state", key: "days" },
      control: { type: "range", unit: "1", min: 0, max: 30, step: 1 },
      group: "primary",
      color: "secant",
    },
    yesNo("water", "water", "Water", "Is the nail in water, or kept dry by a drying agent?"),
    yesNo("air", "air", "Air", "Can oxygen reach the water, or is it sealed under oil?"),
    yesNo("salt", "salt", "Salt", "Is there salt in the water?"),
    {
      id: "coating",
      symbol: "coat",
      name: "Coating",
      meaning: "What covers the iron.",
      binding: { kind: "param", key: "coating" },
      control: {
        type: "choice",
        options: [
          { value: "none", label: "Bare iron" },
          { value: "paint", label: "Paint" },
          { value: "zinc", label: "Zinc (galvanised)" },
          { value: "tin", label: "Tin plate" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    yesNo("scratched", "scratch", "Scratched", "Is there a scratch through the coating?"),
  ],

  quantities: [
    {
      id: "voltage",
      symbol: "V",
      name: "Voltage",
      meaning: "Across all the cells in series, now.",
      result: "voltage",
      format: { kind: "number", digits: 2 },
      unit: "V",
      color: "angle",
      highlight: "cells",
      headline: true,
    },
    {
      id: "emf",
      symbol: "E",
      name: "EMF of one cell",
      meaning: "The rated voltage of one cell.",
      result: "emf",
      format: { kind: "number", digits: 2 },
      unit: "V",
      color: "angle",
    },
    {
      id: "deltaG",
      symbol: "ΔG",
      name: "Gibbs energy",
      meaning: "The useful energy one mole of the cell's reaction delivers: −nFE.",
      result: "deltaG",
      format: { kind: "number", digits: 1 },
      unit: "kJ/mol",
      color: "sine",
      headline: true,
    },
    {
      id: "rechargeable",
      symbol: "recharge?",
      name: "Rechargeable",
      meaning: "Whether the reaction can be driven backwards to recharge it.",
      result: "rechargeable",
      format: { kind: "label", labels: { "0": "no — a primary cell", "1": "yes — a secondary cell" } },
      color: "tangent",
    },
    {
      id: "acidDensity",
      symbol: "ρ acid",
      name: "Acid density",
      meaning: "Of a lead–acid battery's sulfuric acid, in g/mL: it falls as the battery discharges.",
      result: "acidDensity",
      format: { kind: "number", digits: 2 },
      color: "cosine",
      highlight: "gauge",
    },
    {
      id: "rusts",
      symbol: "rusts?",
      name: "Rusting",
      meaning: "Whether the iron is rusting.",
      result: "rusts",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "secant",
      highlight: "tube",
      headline: true,
    },
    {
      id: "rusted",
      symbol: "rusted",
      name: "Fraction rusted",
      meaning: "How much of the nail has turned to rust.",
      result: "rusted",
      format: { kind: "number", digits: 2 },
      color: "secant",
      highlight: "tube",
    },
    {
      id: "sacrificial",
      symbol: "zinc sacrificed?",
      name: "Zinc corroding instead",
      meaning: "Whether a zinc coat is corroding in place of the iron.",
      result: "sacrificial",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "gibbs-cell",
      topic: "gibbs-emf",
      title: "Gibbs energy of a cell",
      words: "ΔG = −nFE",
      tokens: [
        { kind: "ref", id: "deltaG" },
        { kind: "op", value: "=" },
        { kind: "text", value: "−n" },
        { kind: "op", value: "·" },
        { kind: "text", value: "F" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "emf" },
      ],
      reading: "A cell turns the Gibbs energy of its reaction into electrical work: n moles of electrons pushed through E volts. A positive E means a negative ΔG — the reaction goes.",
      assumptions: ["F = 96 500 C mol⁻¹", "n electrons per mole of reaction as written"],
      discoverable: true,
    },
    {
      id: "series",
      topic: "batteries-corrosion",
      title: "Cells in series",
      words: "voltage = number of cells × voltage of one cell",
      tokens: [
        { kind: "ref", id: "voltage" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "cells" },
        { kind: "op", value: "·" },
        { kind: "text", value: "E(cell)" },
      ],
      reading: "A 12 V car battery is six 2 V lead–acid cells in a row.",
      assumptions: ["Identical cells, joined + to −"],
    },
    {
      id: "rust-conditions",
      topic: "batteries-corrosion",
      title: "What rusting needs",
      words: "iron + water + oxygen → rust (faster with salt)",
      tokens: [
        { kind: "text", value: "Fe + H₂O + O₂" },
        { kind: "op", value: "=" },
        { kind: "text", value: "rust" },
      ],
      reading: "Iron is oxidised to Fe²⁺ where it is exposed, oxygen is reduced in the water, and the two meet as hydrated iron(III) oxide. Take away either water or oxygen and it stops.",
      assumptions: ["Room temperature"],
      discoverable: true,
    },
    {
      id: "sacrificial",
      topic: "batteries-corrosion",
      title: "Sacrificial protection",
      words: "zinc (E° −0.76 V) corrodes before iron (−0.44 V), so galvanised iron is safe even when scratched",
      tokens: [
        { kind: "text", value: "E°(Zn) < E°(Fe)" },
        { kind: "op", value: "=" },
        { kind: "text", value: "zinc corrodes first" },
      ],
      reading: "The more reactive metal gives up its electrons first. Tin (−0.14 V) is less reactive than iron, so a scratch in tin plate leaves iron as the one that corrodes — faster than bare iron.",
      assumptions: ["Metals in contact, in moist air"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "batteries",
    params: { cell: "dry", water: "yes", air: "yes", salt: "no", coating: "none", scratched: "no" },
    playLabel: "Let time pass",
  },

  visualization: {
    renderer: "batteries",
    hint: "Cells: choose a cell and join them in series. Corrosion: set the conditions and the coating.",
    layers: [
      { id: "cells", label: "Cells" },
      { id: "gauge", label: "Charge" },
      { id: "tube", label: "Nail" },
      { id: "contents", label: "Tube contents" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "cells",
      label: "Cells",
      description: "Voltage, energy and running down",
      layers: ["cells", "gauge", "labels"],
      graphs: [],
      equations: ["gibbs-cell", "series"],
    },
    {
      id: "corrosion",
      label: "Corrosion",
      description: "An iron nail and what protects it",
      layers: ["tube", "contents", "labels"],
      graphs: [],
      equations: ["rust-conditions", "sacrificial"],
    },
  ],
  defaultMode: "cells",
  graphs: [],

  activities: {
    observe: [
      {
        id: "twelve",
        prompt: "Build a battery of at least 12 V.",
        condition: { type: "compare", quantity: "voltage", op: "gte", value: 12 },
      },
      {
        id: "safe",
        prompt: "Keep a scratched nail from rusting.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "ironExposed", op: "eq", value: 1 },
            { type: "compare", quantity: "rusts", op: "eq", value: 0 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "discharge",
        question: "A lead–acid battery runs down from 100% to 20%. What happens to the density of its acid?",
        variable: "charge",
        from: 100,
        to: 20,
        quantity: "acidDensity",
        options: ["increase", "decrease", "same"],
        given: { cell: "lead-acid" },
        explanation: "It falls: discharging turns sulfuric acid into lead sulfate and water — which is how a hydrometer tells how charged a car battery is.",
      },
    ],

    experiment: {
      title: "Cells and energy",
      instructions: "Record the EMF and ΔG of each kind of cell.",
      columns: ["emf", "deltaG"],
      minRows: 3,
      discovery: {
        question: "How is a cell's Gibbs energy related to its EMF?",
        choices: [
          { id: "nfe", label: "ΔG = −nFE: bigger EMF, more negative ΔG", correct: true },
          { id: "equal", label: "ΔG equals the EMF", correct: false },
          { id: "none", label: "They are unrelated", correct: false },
          { id: "positive", label: "A bigger EMF makes ΔG more positive", correct: false },
        ],
        reveals: "gibbs-cell",
        insight: "The voltage is the energy per coulomb; multiply by nF coulombs per mole of reaction.",
      },
    },

    explain: [
      {
        id: "cells",
        title: "Energy from a cell",
        body: "This cell's reaction gives ΔG = {{deltaG}} kJ per mole: it pushes {{voltage}} V round the circuit.",
      },
      {
        id: "rust",
        title: "The nail",
        body: "Rusting: {{rusts}}. Zinc sacrificed: {{sacrificial}}. Rust needs both water and oxygen at bare iron.",
      },
    ],

    challenges: [
      {
        id: "car-battery",
        title: "A car battery",
        prompt: "Make a fully charged 12 V battery from lead–acid cells.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "cell", op: "eq", value: 2 },
            { type: "compare", quantity: "voltage", op: "gte", value: 12 },
          ],
        },
        hint: "Each lead–acid cell gives about 2 V.",
        success: "Six cells in series: a car battery.",
      },
    ],
  },

  realWorld: [
    { title: "Car batteries", description: "Six lead–acid cells: the engine recharges them by running the reaction backwards." },
    { title: "Apollo's water", description: "Hydrogen–oxygen fuel cells powered the Apollo spacecraft, and the astronauts drank the water they made." },
    { title: "Galvanised buckets", description: "A zinc coat protects the iron even when it is dented and scratched — the zinc corrodes instead." },
  ],
});
