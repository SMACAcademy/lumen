import { defineConcept } from "@ise/concept-schema";

/**
 * Electricity for class 10: current, potential difference, resistance and
 * power, on the same torch circuit class 6 used.
 *
 * More cells push more current; more bulbs in series resist it more; bulbs
 * in parallel each get the whole push. Ohm's law ties the three together,
 * and P = VI says how fast the cells hand over energy.
 */
export const currentAndResistance = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "current-and-resistance",
    title: "Current and Resistance",
    tagline: "Ohm's law, series and parallel, and the power a circuit uses.",
    domain: "physics",
    category: "electricity",
    grade: { min: 10, max: 10 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Use V = IR, compare series and parallel circuits, find the total resistance of bulbs in series and parallel, and work out electrical power as P = VI.",
    tags: ["electricity", "ohm's law", "resistance", "series", "parallel", "power", "class 10"],
  },

  connections: [
    {
      id: "simple-circuits",
      title: "Simple Circuits",
      domain: "physics",
      relation: "prerequisite",
      note: "The class 6 torch, now with numbers.",
      available: true,
    },
  ],

  variables: [
    {
      id: "cells",
      symbol: "cells",
      name: "Cells",
      meaning: "1.5 V each, joined in a row.",
      binding: { kind: "param", key: "cells" },
      control: { type: "range", unit: "1", min: 0, max: 4, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "bulbs",
      symbol: "bulbs",
      name: "Bulbs",
      meaning: "Each bulb is a 6 Ω resistor.",
      binding: { kind: "param", key: "bulbs" },
      control: { type: "range", unit: "1", min: 1, max: 3, step: 1 },
      group: "primary",
      color: "tangent",
    },
    {
      id: "arrangement",
      symbol: "wiring",
      name: "How the bulbs are joined",
      meaning: "One after another (series) or side by side (parallel).",
      binding: { kind: "param", key: "arrangement" },
      control: {
        type: "choice",
        options: [
          { value: "series", label: "Series" },
          { value: "parallel", label: "Parallel" },
        ],
      },
      group: "primary",
      color: "secant",
    },
    {
      id: "switchClosed",
      symbol: "switch",
      name: "Switch",
      meaning: "Closed joins the circuit; open breaks it.",
      binding: { kind: "param", key: "switchClosed" },
      control: {
        type: "choice",
        options: [
          { value: "closed", label: "Closed" },
          { value: "open", label: "Open" },
        ],
      },
      group: "motion",
      color: "neutral",
    },
  ],

  quantities: [
    {
      id: "voltage",
      symbol: "V",
      name: "Potential difference",
      meaning: "The push of the cells, 1.5 V each.",
      result: "voltage",
      format: { kind: "number", digits: 1 },
      unit: "V",
      color: "angle",
      headline: true,
    },
    {
      id: "current",
      symbol: "I",
      name: "Current",
      meaning: "The current the cells supply, in amperes.",
      result: "current",
      format: { kind: "number", digits: 3 },
      unit: "A",
      color: "sine",
      highlight: "flow",
      headline: true,
    },
    {
      id: "resistance",
      symbol: "R",
      name: "Total resistance",
      meaning: "Series resistances add; parallel ones combine to less than any one of them.",
      result: "resistance",
      format: { kind: "number", digits: 2 },
      unit: "ohm",
      color: "cosine",
      headline: true,
    },
    {
      id: "bulbCurrent",
      symbol: "I_bulb",
      name: "Current through each bulb",
      meaning: "In series, the same as the total; in parallel, the total shared between the bulbs.",
      result: "bulbCurrent",
      format: { kind: "number", digits: 3 },
      unit: "A",
      color: "sine",
    },
    {
      id: "brightness",
      symbol: "brightness",
      name: "Brightness of each bulb",
      meaning: "1 is one bulb on one cell.",
      result: "brightness",
      format: { kind: "number", digits: 2 },
      color: "angle",
      highlight: "circuit",
    },
    {
      id: "power",
      symbol: "P",
      name: "Power",
      meaning: "The energy the cells hand over each second, P = VI, in watts.",
      result: "power",
      format: { kind: "number", digits: 3 },
      unit: "W",
      color: "vector",
      headline: true,
    },
  ],

  equations: [
    {
      id: "ohm",
      topic: "ohms-law-school",
      title: "Ohm's law",
      words: "potential difference = current × resistance",
      tokens: [
        { kind: "ref", id: "voltage" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "current" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "resistance" },
      ],
      reading: "For a fixed resistance, the current is proportional to the potential difference across it.",
      assumptions: ["Bulbs behave like fixed resistors"],
      discoverable: true,
    },
    {
      id: "electric-power",
      topic: "electric-power-school",
      title: "Electric power",
      words: "power = potential difference × current",
      tokens: [
        { kind: "ref", id: "power" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "voltage" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "current" },
      ],
      reading: "Every coulomb of charge carries V joules; I coulombs flow each second.",
      assumptions: ["Steady current"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "circuit",
    params: { cells: 1, bulbs: 2, switchClosed: "closed", gap: "wire", arrangement: "series" },
    playLabel: "Watch it flow",
  },

  visualization: {
    renderer: "circuit",
    hint: "Change the cells and bulbs, and join the bulbs in series or in parallel.",
    layers: [
      { id: "circuit", label: "Circuit" },
      { id: "flow", label: "Moving charges", optional: true },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "numbers",
      label: "Circuit",
      description: "The circuit with its current",
      layers: ["circuit", "flow", "labels"],
      graphs: [],
      equations: ["ohm", "electric-power"],
    },
    {
      id: "quiet",
      label: "No charges",
      description: "Just the circuit",
      layers: ["circuit", "labels"],
      graphs: [],
      equations: ["ohm"],
    },
  ],
  defaultMode: "numbers",
  graphs: [],

  activities: {
    observe: [
      {
        id: "parallel",
        prompt: "Join the bulbs in parallel.",
        condition: { type: "compare", quantity: "arrangement", op: "eq", value: 1 },
      },
      {
        id: "one-amp",
        prompt: "Make a current of 1 A flow.",
        condition: { type: "compare", quantity: "current", op: "gte", value: 0.99 },
      },
    ],

    predict: [
      {
        id: "more-cells",
        question: "One bulb. The cells go from 1 to 3. What happens to the current?",
        variable: "cells",
        from: 1,
        to: 3,
        quantity: "current",
        options: ["increase", "decrease", "same"],
        given: { bulbs: 1, arrangement: "series" },
        explanation: "It triples, from 0.25 A to 0.75 A: current is proportional to the potential difference.",
      },
    ],

    experiment: {
      title: "Ohm's law",
      instructions: "With one bulb, record V and I for 1, 2, 3 and 4 cells.",
      columns: ["voltage", "current", "resistance"],
      minRows: 3,
      discovery: {
        question: "What stays the same as the cells change?",
        choices: [
          { id: "ratio", label: "V ÷ I — the resistance", correct: true },
          { id: "current", label: "The current", correct: false },
          { id: "product", label: "V × I", correct: false },
          { id: "nothing", label: "Nothing", correct: false },
        ],
        reveals: "ohm",
        insight: "V ÷ I is always 6 Ω for one bulb: V = IR.",
      },
    },

    explain: [
      {
        id: "ohm",
        title: "Ohm's law",
        body: "Here V = {{voltage}} V and R = {{resistance}} Ω, so I = V ÷ R = {{current}} A.",
      },
      {
        id: "house",
        title: "Why houses use parallel",
        body: "In parallel every appliance gets the full mains voltage, and switching one off does not switch the others off. That is how every home is wired.",
      },
    ],

    challenges: [
      {
        id: "three-bright",
        title: "Three bright bulbs",
        prompt: "Make three bulbs each glow at full brightness from a single cell.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "bulbs", op: "eq", value: 3 },
            { type: "compare", quantity: "cells", op: "eq", value: 1 },
            { type: "compare", quantity: "brightness", op: "gte", value: 0.99 },
          ],
        },
        hint: "Join them side by side.",
        success: "In parallel each bulb gets the whole 1.5 V.",
      },
    ],
  },

  realWorld: [
    { title: "House wiring", description: "Lights and sockets are in parallel, so each gets the full voltage." },
    { title: "Fuses", description: "Too much current heats a thin wire until it melts, breaking the circuit before anything else overheats." },
    { title: "Power ratings", description: "A 1000 W heater on 230 V draws about 4.3 A: P = VI." },
  ],
});
