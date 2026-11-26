import { defineConcept } from "@ise/concept-schema";

/**
 * Chemical effects of electric current (class 8), in three scenes.
 *
 * A tester — cells, two bare ends, and a bulb, an LED or a compass — dipped
 * into liquids. Most liquids that conduct are solutions of salts, acids or
 * bases: lemon juice, vinegar, tap water and copper sulphate solution do;
 * distilled water and sugar in distilled water hardly do; oil does not. The
 * current through lemon juice is too weak to light a bulb, but an LED glows
 * and a compass needle turns. A pinch of salt makes distilled water conduct.
 *
 * Electrolysis: a current through a conducting solution makes a chemical
 * change. Copper sulphate with carbon rods: copper coats the − rod, oxygen
 * bubbles at +, and the blue fades. Water with a little acid: hydrogen at −,
 * oxygen at +, twice as much hydrogen as oxygen.
 *
 * Electroplating: an iron key on −, a copper plate on +, in copper sulphate.
 * Copper leaves the plate and coats the key; more current or more time gives
 * a thicker coat. Chromium on taps, tin on cans and zinc on iron are put on
 * the same way.
 *
 * Simplifications (said in the text too): the liquids have fixed, typical
 * resistances between the tester's ends, and each pinch of salt adds the
 * same amount of conducting; the LED needs 1.8 V, so two cells; the current
 * in the electrolysis and plating scenes is set directly; the amounts of
 * copper and gas are the real ones for the charge that flows, and the coat
 * spreads evenly over a key of 10 cm², so 1 A for 1 minute adds about 2.2 µm.
 */
export const currentAndChemistry = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "current-and-chemistry",
    title: "Current and Chemistry",
    tagline: "Some liquids conduct, and the current changes them: bubbles, copper coats and electroplating.",
    domain: "physics",
    category: "electricity",
    grade: { min: 8, max: 8 },
    difficulty: "introductory",
    estimatedMinutes: 20,
    objective:
      "Test liquids with a bulb, an LED and a compass, see why salt makes water conduct, watch a current make gas bubbles, a copper coat and a change of colour, and electroplate a key with copper.",
    tags: ["conducting liquids", "tester", "LED", "electrolysis", "electrode", "electroplating", "copper sulphate", "class 8"],
  },

  connections: [
    {
      id: "simple-circuits",
      title: "Simple Circuits",
      domain: "physics",
      relation: "prerequisite",
      note: "The tester is the bulb-and-gap loop from Light the Bulb, now dipped into liquids.",
      available: true,
    },
    {
      id: "currents-at-work",
      title: "Currents at Work",
      domain: "physics",
      relation: "related",
      note: "The heating and magnetic effects of a current. This lab is the third effect: the chemical one.",
      available: true,
    },
    {
      id: "materials-and-particles",
      title: "Materials and Particles",
      domain: "chemistry",
      relation: "related",
      note: "Rusting, and why a zinc coat protects iron.",
      available: true,
    },
    {
      id: "electrolysis-and-conductance",
      title: "Electrolysis and Conductance",
      domain: "chemistry",
      relation: "leads-to",
      note: "Class 12 explains with ions and Faraday's laws how much metal and gas a current makes.",
      available: true,
    },
  ],

  variables: [
    {
      id: "liquid",
      symbol: "liquid",
      name: "In the beaker",
      meaning: "The liquid the tester's two ends dip into — or the ends touching, to check the tester works.",
      binding: { kind: "param", key: "liquid" },
      control: {
        type: "choice",
        options: [
          { value: "joined", label: "Ends touching" },
          { value: "distilled", label: "Distilled water" },
          { value: "tap", label: "Tap water" },
          { value: "lemon", label: "Lemon juice" },
          { value: "vinegar", label: "Vinegar" },
          { value: "sugar", label: "Sugar in distilled water" },
          { value: "oil", label: "Vegetable oil" },
          { value: "copperSulphate", label: "Copper sulphate solution" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "tester",
      symbol: "tester",
      name: "What shows the current",
      meaning: "A torch bulb, an LED (it needs at least two cells), or a compass with the wire wound round it.",
      binding: { kind: "param", key: "tester" },
      control: {
        type: "choice",
        options: [
          { value: "bulb", label: "Bulb" },
          { value: "led", label: "LED" },
          { value: "compass", label: "Compass" },
        ],
      },
      group: "primary",
      color: "angle",
    },
    {
      id: "cells",
      symbol: "cells",
      name: "Cells",
      meaning: "Cells in the tester, 1.5 V each.",
      binding: { kind: "param", key: "cells" },
      control: { type: "range", unit: "1", min: 1, max: 4, step: 1 },
      group: "primary",
      color: "neutral",
    },
    {
      id: "salt",
      symbol: "salt",
      name: "Pinches of salt",
      meaning: "Salt stirred into the liquid. It dissolves in anything watery, but not in oil.",
      binding: { kind: "param", key: "salt" },
      control: { type: "range", unit: "1", min: 0, max: 5, step: 1 },
      group: "primary",
      color: "tangent",
    },
    {
      id: "bath",
      symbol: "solution",
      name: "Solution",
      meaning: "What the two carbon rods stand in.",
      binding: { kind: "param", key: "bath" },
      control: {
        type: "choice",
        options: [
          { value: "copperSulphate", label: "Copper sulphate" },
          { value: "water", label: "Water with a little acid" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "current",
      symbol: "I",
      name: "Current",
      meaning: "The current through the solution. More cells give more current.",
      binding: { kind: "param", key: "current" },
      control: { type: "range", unit: "A", min: 0, max: 2, step: 0.1 },
      group: "primary",
      color: "secant",
    },
    {
      id: "minutes",
      symbol: "t",
      name: "Time switched on",
      meaning: "How long the current has flowed. Switch on runs it, a minute every second.",
      binding: { kind: "state", key: "minutes" },
      control: { type: "range", unit: "min", min: 0, max: 30, step: 1 },
      group: "motion",
      color: "neutral",
    },
    {
      id: "keyOn",
      symbol: "key on",
      name: "The key is joined to",
      meaning: "The terminal the iron key is joined to. The copper plate is on the other one.",
      binding: { kind: "param", key: "keyOn" },
      control: {
        type: "choice",
        options: [
          { value: "negative", label: "− terminal" },
          { value: "positive", label: "+ terminal" },
        ],
      },
      group: "primary",
      color: "cosine",
    },
  ],

  quantities: [
    {
      id: "voltage",
      symbol: "V",
      name: "Push of the cells",
      meaning: "1.5 V for each cell.",
      result: "voltage",
      format: { kind: "number", digits: 1 },
      unit: "V",
      color: "neutral",
    },
    {
      id: "liquidKind",
      symbol: "liquid",
      name: "Between the ends",
      meaning: "How well what sits between the tester's ends conducts.",
      result: "liquidKind",
      format: {
        kind: "label",
        labels: {
          "0": "a liquid that does not conduct",
          "1": "a liquid that hardly conducts",
          "2": "a liquid that conducts",
          "3": "a liquid that conducts well",
          "4": "nothing: the two ends touch",
        },
      },
      color: "sine",
      headline: true,
    },
    {
      id: "testerCurrent",
      symbol: "I",
      name: "Current through the tester",
      meaning: "In milliamperes: thousandths of an ampere.",
      result: "testerCurrent",
      format: { kind: "sig", figures: 3 },
      unit: "mA",
      color: "sine",
      headline: true,
    },
    {
      id: "shows",
      symbol: "tester",
      name: "The tester",
      meaning: "Whether the bulb or LED glows, or the needle turns.",
      result: "shows",
      format: { kind: "label", labels: { "0": "shows nothing", "1": "shows a current" } },
      color: "angle",
      headline: true,
    },
    {
      id: "deflection",
      symbol: "turn",
      name: "Compass needle turns",
      meaning: "How far the compass needle turns from north.",
      result: "deflection",
      format: { kind: "angle" },
      color: "cosine",
    },
    {
      id: "charge",
      symbol: "Q",
      name: "Charge passed",
      meaning: "Current × time in seconds: the electricity that has flowed through the solution.",
      result: "charge",
      format: { kind: "number", digits: 0 },
      unit: "C",
      color: "secant",
    },
    {
      id: "copperDeposit",
      symbol: "copper",
      name: "Copper on the − rod (mg)",
      meaning: "The copper coat on the carbon rod joined to −, in milligrams.",
      result: "copperDeposit",
      format: { kind: "number", digits: 1 },
      color: "secant",
      headline: true,
    },
    {
      id: "hydrogen",
      symbol: "H₂",
      name: "Hydrogen at the − rod",
      meaning: "Hydrogen gas bubbled off the − rod.",
      result: "hydrogen",
      format: { kind: "number", digits: 1 },
      unit: "mL",
      color: "sine",
      headline: true,
    },
    {
      id: "oxygen",
      symbol: "O₂",
      name: "Oxygen at the + rod",
      meaning: "Oxygen gas bubbled off the + rod.",
      result: "oxygen",
      format: { kind: "number", digits: 1 },
      unit: "mL",
      color: "cosine",
      headline: true,
    },
    {
      id: "blueLeft",
      symbol: "blue",
      name: "Blue colour left",
      meaning: "How much of the copper sulphate's blue is left in the beaker.",
      result: "blueLeft",
      format: { kind: "number", digits: 0 },
      unit: "%",
      color: "sine",
    },
    {
      id: "coatThickness",
      symbol: "coat",
      name: "Copper coat on the key",
      meaning: "How thick the copper coat on the key is, in micrometres (thousandths of a millimetre).",
      result: "coatThickness",
      format: { kind: "number", digits: 1 },
      unit: "um",
      color: "secant",
      headline: true,
    },
    {
      id: "plateLoss",
      symbol: "plate",
      name: "Copper the plate loses (mg)",
      meaning: "Copper that has left the copper plate on +, in milligrams.",
      result: "plateLoss",
      format: { kind: "number", digits: 1 },
      color: "cosine",
    },
    {
      id: "keyLoss",
      symbol: "key",
      name: "Iron the key loses (mg)",
      meaning: "Iron eaten from the key when it is wrongly joined to +, in milligrams.",
      result: "keyLoss",
      format: { kind: "number", digits: 1 },
      color: "cosine",
    },
    {
      id: "coatOnKey",
      symbol: "key",
      name: "The key",
      meaning: "Whether the key is getting a copper coat.",
      result: "coatOnKey",
      format: { kind: "label", labels: { "0": "gets no coat", "1": "is getting a copper coat" } },
      color: "angle",
    },
  ],

  equations: [
    {
      id: "liquid-tester",
      topic: "conducting-liquids",
      title: "When does the tester show a current?",
      words: "the tester shows a current only when the liquid conducts",
      tokens: [
        { kind: "text", value: "tester shows a current" },
        { kind: "op", value: "=" },
        { kind: "text", value: "the liquid conducts" },
      ],
      reading: "A bulb needs a big current to glow (about 56 mA here); an LED glows from 1 mA, and a compass needle turns for even less.",
      assumptions: ["The tester works: it shows a current when its ends touch"],
      discoverable: true,
    },
    {
      id: "chemical-effect",
      topic: "electrolysis-school",
      title: "The chemical effect of a current",
      words: "a current through a conducting solution makes a chemical change",
      tokens: [
        { kind: "text", value: "current through a solution" },
        { kind: "op", value: "=" },
        { kind: "text", value: "a chemical change" },
      ],
      reading: "Gas bubbles at the electrodes, metal on the − electrode, or a change of colour. Making a chemical change with a current is called electrolysis.",
      assumptions: ["The solution conducts"],
      discoverable: true,
    },
    {
      id: "gas-ratio",
      topic: "electrolysis-school",
      title: "Gas from water",
      words: "hydrogen at − = 2 × oxygen at +",
      tokens: [
        { kind: "ref", id: "hydrogen" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2 ×" },
        { kind: "ref", id: "oxygen" },
      ],
      reading: "Water is made of hydrogen and oxygen; a current splits it, giving twice as much hydrogen as oxygen.",
      assumptions: ["Water with a little acid, carbon rods", "Both gases at room temperature"],
    },
    {
      id: "coat-thickness",
      topic: "electroplating",
      title: "How thick the coat grows",
      words: "coat thickness ≈ 2.2 × current × time (µm, A, min)",
      tokens: [
        { kind: "ref", id: "coatThickness" },
        { kind: "op", value: "≈" },
        { kind: "text", value: "2.2 ×" },
        { kind: "ref", id: "current" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "minutes" },
      ],
      reading: "Twice the current or twice the time gives twice the coat. Half the current for twice as long gives the same coat.",
      assumptions: ["The copper spreads evenly over a key of 10 cm²", "A steady current"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "currentchem",
    params: {},
    playLabel: "Switch on",
  },

  visualization: {
    renderer: "currentchem",
    hint: "Pick a scene: test liquids, pass a current through a solution, or plate a key with copper.",
    layers: [
      { id: "tester", label: "Tester" },
      { id: "electrolysis", label: "Electrolysis" },
      { id: "plating", label: "Electroplating" },
      { id: "labels", label: "Numbers", optional: true },
    ],
  },

  modes: [
    {
      id: "tester",
      label: "Test liquids",
      description: "Does the liquid conduct?",
      layers: ["tester", "labels"],
      graphs: [],
      equations: ["liquid-tester"],
    },
    {
      id: "electrolysis",
      label: "Electrolysis",
      description: "Bubbles, a copper coat and a fading blue",
      layers: ["electrolysis", "labels"],
      graphs: [],
      equations: ["chemical-effect", "gas-ratio"],
    },
    {
      id: "plating",
      label: "Electroplating",
      description: "Coat an iron key with copper",
      layers: ["plating", "labels"],
      graphs: [],
      equations: ["coat-thickness"],
    },
  ],
  defaultMode: "tester",
  graphs: [],

  activities: {
    observe: [
      {
        id: "lemon-led",
        prompt: "Make the tester show that lemon juice conducts.",
        hint: "The bulb stays dark. Try an LED.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "liquid", op: "eq", value: 3 },
            { type: "compare", quantity: "shows", op: "eq", value: 1 },
          ],
        },
      },
      {
        id: "salty",
        prompt: "Light the bulb with distilled water in the beaker.",
        hint: "Stir in some salt.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "liquid", op: "eq", value: 1 },
            { type: "compare", quantity: "tester", op: "eq", value: 0 },
            { type: "compare", quantity: "shows", op: "eq", value: 1 },
          ],
        },
      },
      {
        id: "copper-coat",
        prompt: "Grow 100 mg of copper on the − rod.",
        condition: { type: "compare", quantity: "copperDeposit", op: "gte", value: 100 },
      },
      {
        id: "coat-key",
        prompt: "Give the key a copper coat 10 µm thick.",
        condition: { type: "compare", quantity: "coatThickness", op: "gte", value: 10 },
      },
    ],

    predict: [
      {
        id: "more-salt",
        question: "Two cells and a bulb in distilled water. The salt goes from 1 pinch to 4. What happens to the current?",
        variable: "salt",
        from: 1,
        to: 4,
        quantity: "testerCurrent",
        options: ["increase", "decrease", "same"],
        mode: "tester",
        given: { liquid: "distilled", tester: "bulb", cells: 2 },
        explanation: "It rises from 65.2 mA to 188 mA, and the bulb glows brighter: more salt, more charged particles to carry the current.",
      },
      {
        id: "longer",
        question: "0.5 A flows through copper sulphate. The time goes from 5 to 10 minutes. What happens to the copper on the − rod?",
        variable: "minutes",
        from: 5,
        to: 10,
        quantity: "copperDeposit",
        options: ["increase", "decrease", "same"],
        mode: "electrolysis",
        given: { bath: "copperSulphate", current: 0.5 },
        explanation: "It doubles, from 49.4 mg to 98.7 mg: twice the time, twice the copper.",
      },
      {
        id: "more-current",
        question: "The key is plated for 10 minutes. The current goes from 0.5 A to 1 A. What happens to the coat?",
        variable: "current",
        from: 0.5,
        to: 1,
        quantity: "coatThickness",
        options: ["increase", "decrease", "same"],
        mode: "plating",
        given: { keyOn: "negative", minutes: 10 },
        explanation: "It doubles, from 11.0 µm to 22.0 µm: twice the current carries twice the copper onto the key.",
      },
    ],

    experiment: {
      title: "What makes a thicker coat",
      instructions: "Keep the current at 1 A with the key on −. Record the coat after 5, 10 and 20 minutes.",
      columns: ["current", "minutes", "coatThickness"],
      minRows: 3,
      discovery: {
        question: "When the time doubles, the coat becomes…",
        choices: [
          { id: "twice", label: "twice as thick", correct: true },
          { id: "four", label: "four times as thick", correct: false },
          { id: "same", label: "just as thick", correct: false },
          { id: "half", label: "half as thick", correct: false },
        ],
        reveals: "coat-thickness",
        insight: "5 minutes gives 11.0 µm, 10 minutes 22.0 µm, 20 minutes 44.1 µm: the coat grows with current × time.",
      },
    },

    explain: [
      {
        id: "tester",
        title: "Testing a liquid",
        body: "Between the ends: {{liquidKind}}. {{testerCurrent}} mA flows, and the tester {{shows}}. A torch bulb needs about 56 mA to glow; an LED glows from 1 mA, which is why it shows a weak current a bulb cannot.",
      },
      {
        id: "why",
        title: "Why some liquids conduct",
        body: "Pure, distilled water hardly conducts. Salts, acids and bases dissolved in water break up into charged particles, called ions, and these carry the current. That is why tap water, lemon juice and vinegar conduct, and why sugar — which does not break up — does not help.",
      },
      {
        id: "safety",
        title: "Stay safe",
        body: "Tap water conducts, so never touch a switch or a plug with wet hands, and never test liquids with the mains — only with cells.",
      },
      {
        id: "copper",
        title: "Copper from copper sulphate",
        body: "{{charge}} C of charge has passed. The − rod has {{copperDeposit}} mg of copper on it, oxygen has bubbled off the + rod, and {{blueLeft}} % of the blue is left: the copper came out of the solution.",
        when: { type: "compare", quantity: "bath", op: "eq", value: 0 },
      },
      {
        id: "water",
        title: "Splitting water",
        body: "{{hydrogen}} mL of hydrogen at the − rod and {{oxygen}} mL of oxygen at the + rod: twice as much hydrogen as oxygen.",
        when: { type: "compare", quantity: "bath", op: "eq", value: 1 },
      },
      {
        id: "plating",
        title: "Electroplating",
        body: "The key {{coatOnKey}}, {{coatThickness}} µm thick. The copper plate has lost {{plateLoss}} mg — the same copper that went onto the key, so the solution stays just as blue.",
        when: { type: "compare", quantity: "keyOn", op: "eq", value: 0 },
      },
      {
        id: "wrong-way",
        title: "The wrong way round",
        body: "The key is on + and {{coatOnKey}}: it has lost {{keyLoss}} mg of iron, and the copper goes onto the plate instead. The thing to be plated always goes on −.",
        when: { type: "compare", quantity: "keyOn", op: "eq", value: 1 },
      },
      {
        id: "waste",
        title: "Throwing away the solution",
        body: "Used plating solutions are harmful. Factories must treat them before they go anywhere — never into drains or rivers.",
      },
    ],

    challenges: [
      {
        id: "fade-the-blue",
        title: "Fade the blue",
        prompt: "In copper sulphate, take out more than half the blue colour.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "bath", op: "eq", value: 0 },
            { type: "compare", quantity: "blueLeft", op: "lt", value: 50 },
          ],
        },
        hint: "More current, for longer.",
        success: "At 2 A it takes 17 minutes: over half the copper has left the solution and coated the − rod.",
      },
      {
        id: "exact-coat",
        title: "Made to order",
        prompt: "Give the key a coat 33 µm thick, to within half a micrometre.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "keyOn", op: "eq", value: 0 },
            { type: "compare", quantity: "coatThickness", op: "gte", value: 32.5 },
            { type: "compare", quantity: "coatThickness", op: "lte", value: 33.5 },
          ],
        },
        hint: "1 A for 10 minutes gives 22.0 µm. You need one and a half times as much.",
        success: "33.0 µm: 1.5 A for 10 minutes, 1 A for 15 minutes or 0.5 A for 30 minutes — the same current × time.",
      },
    ],
  },

  realWorld: [
    { title: "Chromium on taps and bicycles", description: "Chromium is shiny, hard to scratch and does not rust, but it is costly, so a thin coat goes on taps, bicycle handlebars, wheel rims, gas burners and car parts." },
    { title: "Tin cans", description: "Cans for food are iron coated with tin. Tin is less reactive than iron, so the food never touches the iron." },
    { title: "Galvanised iron", description: "A coat of zinc keeps iron in bridges, buckets and roofs from rusting." },
    { title: "Jewellery", description: "A thin coat of silver or gold on a cheaper metal makes jewellery that looks like the real thing." },
    { title: "Testing with an LED", description: "An LED glows with a tiny current, so it makes a far better tester than a bulb for weakly conducting liquids." },
  ],
});
