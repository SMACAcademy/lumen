import { defineConcept } from "@ise/concept-schema";

/**
 * Electricity for class 6 and 7: a torch you can take apart.
 *
 * Cells, bulbs, a switch and a gap to test things in, joined in one loop.
 * A bulb lights only when the loop is unbroken; the switch and insulators
 * break it, conductors close it; more cells light it brighter, more bulbs in
 * a line share the push and glow dimmer. The same loop grows into Ohm's law
 * in class 10.
 */
export const simpleCircuits = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "simple-circuits",
    title: "Simple Circuits",
    tagline: "Cells, bulbs and switches: why a bulb lights, and what lets electricity through.",
    domain: "physics",
    category: "electricity",
    grade: { min: 6, max: 7 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "Make a bulb light with a closed circuit, use a switch to open and close it, sort materials into conductors and insulators, and see how more cells and more bulbs change the brightness.",
    tags: ["electricity", "circuit", "cell", "bulb", "switch", "conductor", "insulator", "class 6", "class 7"],
  },

  connections: [
    {
      id: "ohms-law",
      title: "Ohm's law (class 10)",
      domain: "physics",
      relation: "leads-to",
      note: "Brighter with more cells and dimmer with more bulbs is I = V ÷ R, before it has a name.",
      available: false,
    },
  ],

  variables: [
    {
      id: "cells",
      symbol: "cells",
      name: "Cells",
      meaning: "Each cell gives a push of 1.5 volts. Cells in a row add their pushes.",
      binding: { kind: "param", key: "cells" },
      control: { type: "range", unit: "1", min: 0, max: 4, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "bulbs",
      symbol: "bulbs",
      name: "Bulbs",
      meaning: "Bulbs in a line share the same current, so each one gets less.",
      binding: { kind: "param", key: "bulbs" },
      control: { type: "range", unit: "1", min: 1, max: 3, step: 1 },
      group: "primary",
      color: "tangent",
    },
    {
      id: "switchClosed",
      symbol: "switch",
      name: "Switch",
      meaning: "Closed joins the loop; open breaks it.",
      binding: { kind: "param", key: "switchClosed" },
      control: {
        type: "choice",
        options: [
          { value: "closed", label: "Closed" },
          { value: "open", label: "Open" },
        ],
      },
      group: "primary",
      color: "secant",
    },
    {
      id: "gap",
      symbol: "gap",
      name: "In the gap",
      meaning: "Whatever sits between the two clips becomes part of the loop.",
      binding: { kind: "param", key: "gap" },
      control: {
        type: "choice",
        options: [
          { value: "wire", label: "Wire" },
          { value: "copper", label: "Copper coin" },
          { value: "iron", label: "Iron key" },
          { value: "aluminium", label: "Aluminium foil" },
          { value: "graphite", label: "Pencil lead" },
          { value: "rubber", label: "Eraser" },
          { value: "plastic", label: "Plastic ruler" },
          { value: "wood", label: "Wooden stick" },
          { value: "glass", label: "Glass rod" },
          { value: "air", label: "Nothing" },
        ],
      },
      group: "primary",
      color: "vector",
    },
  ],

  quantities: [
    {
      id: "lit",
      symbol: "lit?",
      name: "Bulb lit",
      meaning: "Whether the bulb glows.",
      result: "lit",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "angle",
      highlight: "circuit",
      headline: true,
    },
    {
      id: "closed",
      symbol: "loop",
      name: "The loop",
      meaning: "Closed when there is an unbroken path from one end of the cells to the other.",
      result: "closed",
      format: { kind: "label", labels: { "0": "broken", "1": "closed" } },
      color: "tangent",
      highlight: "circuit",
      headline: true,
    },
    {
      id: "brightness",
      symbol: "brightness",
      name: "Brightness",
      meaning: "How bright each bulb is, where 1 is one bulb on one cell.",
      result: "brightness",
      format: { kind: "number", digits: 2 },
      color: "angle",
      highlight: "circuit",
      headline: true,
    },
    {
      id: "conducts",
      symbol: "conductor?",
      name: "Conductor",
      meaning: "Whether the thing in the gap lets electricity through.",
      result: "conducts",
      format: { kind: "label", labels: { "0": "no — an insulator", "1": "yes — a conductor" } },
      color: "vector",
      highlight: "circuit",
    },
    {
      id: "voltage",
      symbol: "V",
      name: "Push of the cells",
      meaning: "1.5 volts for each cell.",
      result: "voltage",
      format: { kind: "number", digits: 1 },
      unit: "V",
      color: "angle",
    },
    {
      id: "current",
      symbol: "I",
      name: "Current",
      meaning: "How much electricity flows round the loop each second.",
      result: "current",
      format: { kind: "number", digits: 3 },
      unit: "A",
      color: "sine",
      highlight: "flow",
    },
    {
      id: "resistance",
      symbol: "R",
      name: "Resistance of the loop",
      meaning: "How hard the loop is to push current through: 6 Ω for each bulb, plus the gap.",
      result: "resistance",
      format: { kind: "number", digits: 2 },
      unit: "ohm",
      color: "cosine",
    },
  ],

  equations: [
    {
      id: "circuit-rule",
      topic: "simple-circuit",
      title: "When does the bulb light?",
      words: "the bulb lights only when the loop is closed",
      tokens: [
        { kind: "text", value: "bulb lights" },
        { kind: "op", value: "=" },
        { kind: "text", value: "loop closed" },
      ],
      reading: "Lit exactly when the loop is closed: switch on, a conductor in the gap, and at least one cell.",
      assumptions: ["Everything in one loop"],
      discoverable: true,
    },
    {
      id: "ohm-school",
      topic: "ohms-law-school",
      title: "How much current flows",
      words: "current = push of the cells ÷ resistance of the loop",
      tokens: [
        { kind: "ref", id: "current" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "voltage" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "resistance" },
      ],
      reading: "More cells push more current; more bulbs in a line resist it more.",
      assumptions: ["Bulbs behave like fixed 6 Ω resistors", "Cells have no resistance of their own"],
    },
  ],

  simulation: {
    model: "circuit",
    params: { cells: 1, bulbs: 1, switchClosed: "closed", gap: "wire" },
    playLabel: "Watch it flow",
  },

  visualization: {
    renderer: "circuit",
    hint: "Change the cells, bulbs, switch and what sits in the gap, and watch the bulb.",
    layers: [
      { id: "circuit", label: "Circuit" },
      { id: "flow", label: "Moving charges", optional: true },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "circuit",
      label: "Circuit",
      description: "The loop, the bulbs and the charges",
      layers: ["circuit", "flow", "labels"],
      graphs: [],
      equations: ["circuit-rule"],
    },
    {
      id: "tester",
      label: "Tester",
      description: "Test what conducts",
      layers: ["circuit", "labels"],
      graphs: [],
      equations: ["circuit-rule"],
    },
    {
      id: "numbers",
      label: "With numbers",
      description: "Push, current and resistance",
      layers: ["circuit", "flow", "labels"],
      graphs: [],
      equations: ["ohm-school"],
    },
  ],
  defaultMode: "circuit",
  graphs: [],

  activities: {
    observe: [
      {
        id: "switch-off",
        prompt: "Open the switch. What happens to the bulb?",
        condition: { type: "compare", quantity: "switchClosed", op: "eq", value: 0 },
      },
      {
        id: "insulator",
        prompt: "Put an eraser in the gap.",
        condition: { type: "compare", quantity: "gap", op: "eq", value: 5 },
      },
      {
        id: "two-cells",
        prompt: "Use two cells.",
        condition: { type: "compare", quantity: "cells", op: "eq", value: 2 },
      },
    ],

    predict: [
      {
        id: "more-cells",
        question: "You add a second cell. What happens to the bulb's brightness?",
        variable: "cells",
        from: 1,
        to: 2,
        quantity: "brightness",
        options: ["increase", "decrease", "same"],
        explanation: "It gets brighter — four times as bright. Two cells push twice the current through the same bulb.",
      },
      {
        id: "more-bulbs",
        question: "You add a second bulb in the same line. What happens to each bulb's brightness?",
        variable: "bulbs",
        from: 1,
        to: 2,
        quantity: "brightness",
        options: ["increase", "decrease", "same"],
        explanation: "Each gets dimmer. The two bulbs share the push of one cell, so less current flows through both.",
      },
    ],

    experiment: {
      title: "Cells and brightness",
      instructions: "With one bulb, record the brightness with 1, 2, 3 and 4 cells.",
      columns: ["voltage", "current", "brightness", "lit"],
      minRows: 3,
      discovery: {
        question: "What makes the bulb light at all?",
        choices: [
          { id: "loop", label: "An unbroken loop from one end of the cells to the other", correct: true },
          { id: "cells", label: "Having as many cells as possible", correct: false },
          { id: "wire", label: "Any wire touching the bulb", correct: false },
          { id: "switch", label: "The switch being open", correct: false },
        ],
        reveals: "circuit-rule",
        insight: "Electricity needs a complete path. Break the loop anywhere — switch, gap or no cell — and every bulb goes out.",
      },
    },

    explain: [
      {
        id: "closed-loop",
        title: "A closed loop",
        body: "The loop is {{closed}}. Current flows only round a complete path, from one end of the cells, through the bulb, and back to the other end.",
      },
      {
        id: "conductors",
        title: "Conductors and insulators",
        body: "Metals and pencil lead let electricity through: they are conductors. Rubber, plastic, wood and glass do not: they are insulators. That is why wires are metal inside and plastic outside.",
      },
      {
        id: "safety",
        title: "Stay safe",
        body: "Cells are safe to play with. The electricity in the wall at home is not — never experiment with plugs or sockets.",
      },
    ],

    challenges: [
      {
        id: "brightest",
        title: "As bright as it goes",
        prompt: "Make one bulb as bright as you can.",
        goal: { type: "compare", quantity: "brightness", op: "gte", value: 15.9 },
        hint: "All the cells, one bulb, and nothing but metal in the loop.",
        success: "Four cells and one bulb: sixteen times as bright as one cell.",
      },
      {
        id: "same-as-one",
        title: "Back to normal",
        prompt: "Use two bulbs, and make each one exactly as bright as one bulb on one cell.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "bulbs", op: "eq", value: 2 },
            { type: "compare", quantity: "brightness", op: "eq", value: 1, tolerance: 0.01 },
          ],
        },
        hint: "Twice the bulbs need twice the push.",
        success: "Two cells for two bulbs: each bulb gets its fair share again.",
      },
    ],
  },

  realWorld: [
    { title: "A torch", description: "The switch on a torch closes the loop between its cells and its bulb." },
    { title: "Plastic on wires", description: "Wires are copper inside to carry the current and plastic outside so it cannot reach your hands." },
    { title: "Fairy lights", description: "Cheap strings of lights are bulbs in a line: when one breaks, the loop breaks and they all go out." },
  ],
});
