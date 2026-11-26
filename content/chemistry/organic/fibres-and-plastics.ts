import { defineConcept } from "@ise/concept-schema";

const yesNo = { kind: "label" as const, labels: { "0": "no", "1": "yes" } };
const ROT_TIMES = { "0": "1 to 2 weeks", "1": "10 to 30 days", "2": "2 to 5 months", "3": "about a year", "4": "10 to 15 years", "5": "100 to 500 years", "6": "several years" };

/**
 * Synthetic fibres and plastics, for class 8 (NCERT science).
 *
 * Chains: a polymer is a long chain of small repeating units; build chains of
 * cellulose, polythene, PVC, acrylic, nylon or polyester and count the carbons.
 * Fibres: NCERT's thread test, and what synthetic fibres are like. Plastics:
 * thermoplastics soften on heating, thermosetting plastics do not. Waste: what
 * rots away and what does not, with NCERT's approximate times, and the 4 R's.
 *
 * Simplified, and said so in the assumptions: the breaking loads are
 * illustrative (only their order is real); the softening temperatures are
 * approximate; biodegradable waste rots at a steady rate and is gone at the
 * middle of NCERT's range (illustrative).
 */
export const fibresAndPlastics = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "fibres-and-plastics",
    title: "Synthetic Fibres and Plastics",
    tagline: "Long chains of small units: threads that hold, plastics that soften or set, and waste that rots or stays.",
    domain: "chemistry",
    category: "organic",
    grade: { min: 8, max: 8 },
    difficulty: "introductory",
    estimatedMinutes: 25,
    objective:
      "Explain that a polymer is a long chain of small repeating units; name rayon, nylon, polyester and acrylic and say what each is used for; describe what synthetic fibres are like (strong, light, absorb little water, dry quickly, melt on heating); tell thermoplastics from thermosetting plastics by their chains; and sort waste into biodegradable and non-biodegradable, using the 4 R's.",
    tags: ["polymer", "synthetic fibres", "rayon", "nylon", "polyester", "acrylic", "plastics", "thermoplastic", "thermosetting", "bakelite", "melamine", "biodegradable", "4 R", "class 8"],
  },

  connections: [
    {
      id: "materials-and-particles",
      title: "Materials, Mixtures and Particles",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Sorting materials by their properties: the same questions, now asked of fibres and plastics.",
      available: true,
    },
    {
      id: "carbon-compounds",
      title: "Carbon and its Compounds",
      domain: "chemistry",
      relation: "leads-to",
      note: "In class 10, the carbon chains themselves: ethene, its double bond, and how carbon joins carbon.",
      available: true,
    },
    {
      id: "amines-and-biomolecules",
      title: "Amines and Biomolecules",
      domain: "chemistry",
      relation: "leads-to",
      note: "In class 12, cellulose, starch and proteins: the natural polymers, unit by unit.",
      available: true,
    },
  ],

  variables: [
    {
      id: "polymer",
      symbol: "polymer",
      name: "Polymer",
      meaning: "The long-chain substance to build.",
      binding: { kind: "param", key: "polymer" },
      control: {
        type: "choice",
        options: [
          { value: "cellulose", label: "Cellulose (cotton)" },
          { value: "polythene", label: "Polythene" },
          { value: "pvc", label: "PVC" },
          { value: "acrylic", label: "Acrylic" },
          { value: "nylon", label: "Nylon" },
          { value: "polyester", label: "Polyester (PET)" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "units",
      symbol: "n",
      name: "Units in the chain",
      meaning: "How many small units are joined together.",
      binding: { kind: "state", key: "units" },
      control: { type: "range", unit: "1", min: 1, max: 1000, step: 1, presets: [10, 100, 1000] },
      group: "primary",
      color: "sine",
    },
    {
      id: "fibre",
      symbol: "thread",
      name: "Thread",
      meaning: "The fibre the thread is made of. Every thread is the same thickness.",
      binding: { kind: "param", key: "fibre" },
      control: {
        type: "choice",
        options: [
          { value: "cotton", label: "Cotton" },
          { value: "wool", label: "Wool" },
          { value: "silk", label: "Silk" },
          { value: "rayon", label: "Rayon" },
          { value: "nylon", label: "Nylon" },
          { value: "polyester", label: "Polyester" },
          { value: "acrylic", label: "Acrylic" },
        ],
      },
      group: "primary",
      color: "tangent",
    },
    {
      id: "load",
      symbol: "load",
      name: "Load on the thread",
      meaning: "The weight hung on the thread.",
      binding: { kind: "state", key: "load" },
      control: { type: "range", unit: "g", min: 0, max: 800, step: 10, presets: [100, 350, 650] },
      group: "motion",
      color: "tangent",
    },
    {
      id: "plastic",
      symbol: "plastic",
      name: "Plastic",
      meaning: "The plastic strip on the hotplate.",
      binding: { kind: "param", key: "plastic" },
      control: {
        type: "choice",
        options: [
          { value: "polythene", label: "Polythene" },
          { value: "pvc", label: "PVC" },
          { value: "pet", label: "PET" },
          { value: "bakelite", label: "Bakelite" },
          { value: "melamine", label: "Melamine" },
        ],
      },
      group: "primary",
      color: "cosine",
    },
    {
      id: "heat",
      symbol: "T",
      name: "Temperature",
      meaning: "How hot the plastic strip is.",
      binding: { kind: "state", key: "heat" },
      control: { type: "range", unit: "degC", min: 20, max: 250, step: 5, presets: [25, 100, 200] },
      group: "motion",
      color: "secant",
    },
    {
      id: "waste",
      symbol: "waste",
      name: "Waste",
      meaning: "What is buried in the soil.",
      binding: { kind: "param", key: "waste" },
      control: {
        type: "choice",
        options: [
          { value: "peels", label: "Fruit and vegetable peels" },
          { value: "paper", label: "Paper" },
          { value: "cotton", label: "Cotton cloth" },
          { value: "wool", label: "Woollen clothes" },
          { value: "wood", label: "Wood" },
          { value: "can", label: "Tin or aluminium can" },
          { value: "bag", label: "Plastic bag" },
          { value: "bottle", label: "Plastic bottle" },
        ],
      },
      group: "primary",
      color: "angle",
    },
    {
      id: "days",
      symbol: "days",
      name: "Days buried",
      meaning: "How many days the waste has been in the soil (730 is two years).",
      binding: { kind: "state", key: "days" },
      control: { type: "range", unit: "1", min: 0, max: 730, step: 1, presets: [7, 30, 365] },
      group: "motion",
      color: "angle",
    },
  ],

  quantities: [
    { id: "chainCarbons", symbol: "C in chain", name: "Carbon atoms in the chain", meaning: "Units in the chain × carbon atoms in one unit.", result: "chainCarbons", format: { kind: "integer" }, color: "angle", highlight: "chain", headline: true },
    { id: "unitCarbons", symbol: "C per unit", name: "Carbon atoms in one unit", meaning: "Carbons in one repeating unit.", result: "unitCarbons", format: { kind: "integer" }, color: "sine", highlight: "chain", headline: true },
    { id: "unitAtoms", symbol: "atoms per unit", name: "Atoms in one unit", meaning: "All the atoms in one repeating unit.", result: "unitAtoms", format: { kind: "integer" }, color: "neutral" },
    { id: "chainAtoms", symbol: "atoms", name: "Atoms in the chain", meaning: "Units in the chain × atoms in one unit.", result: "chainAtoms", format: { kind: "integer" }, color: "neutral" },
    { id: "polymerNatural", symbol: "natural?", name: "Natural polymer", meaning: "Made by living things (cellulose, in cotton and wood), not in a factory.", result: "polymerNatural", format: yesNo, color: "tangent" },
    { id: "breakingLoad", symbol: "holds", name: "Breaking load (illustrative)", meaning: "The most this thread holds before it snaps. Illustrative numbers: only their order is real.", result: "breakingLoad", format: { kind: "number", digits: 0 }, unit: "g", color: "angle", highlight: "fibres", headline: true },
    { id: "snapped", symbol: "thread", name: "Thread", meaning: "Whether the load has snapped the thread.", result: "snapped", format: { kind: "label", labels: { "0": "holding", "1": "snapped" } }, color: "secant", highlight: "fibres", headline: true },
    { id: "fibreNatural", symbol: "kind", name: "Kind of fibre", meaning: "Natural fibres come from plants and animals; man-made ones are made in factories.", result: "fibreNatural", format: { kind: "label", labels: { "0": "man-made", "1": "natural" } }, color: "tangent" },
    { id: "fibreSource", symbol: "from", name: "Made from", meaning: "Where the fibre comes from.", result: "fibreSource", format: { kind: "label", labels: { "0": "plants", "1": "animals", "2": "wood pulp", "3": "petrochemicals" } }, color: "neutral" },
    { id: "absorbsWater", symbol: "water", name: "Water it soaks up", meaning: "Synthetic fibres soak up little water, so they dry quickly.", result: "absorbsWater", format: { kind: "label", labels: { "0": "a little", "1": "a lot" } }, color: "sine" },
    { id: "driesQuickly", symbol: "dries fast?", name: "Dries quickly", meaning: "Whether a wet cloth of this fibre dries fast.", result: "driesQuickly", format: yesNo, color: "sine" },
    { id: "meltsOnHeating", symbol: "melts?", name: "Melts when heated", meaning: "Synthetic fibres from petrochemicals melt; cotton, wool, silk and rayon do not.", result: "meltsOnHeating", format: yesNo, color: "secant", highlight: "fibres", headline: true },
    { id: "thermoplastic", symbol: "type", name: "Type of plastic", meaning: "Thermoplastics soften on heating; thermosetting plastics do not.", result: "thermoplastic", format: { kind: "label", labels: { "0": "thermosetting", "1": "thermoplastic" } }, color: "cosine", highlight: "plastics", headline: true },
    { id: "crossLinked", symbol: "cross-linked?", name: "Chains cross-linked", meaning: "Whether the chains are tied to each other.", result: "crossLinked", format: yesNo, color: "angle" },
    { id: "softensAt", symbol: "softens at", name: "Softens at", meaning: "Approximate softening temperature; real values depend on the grade of plastic.", result: "softensAt", format: { kind: "label", labels: { "0": "never", "75": "about 75 °C", "80": "about 80 °C", "90": "about 90 °C" } }, color: "secant" },
    { id: "soft", symbol: "now", name: "The strip now", meaning: "Soft enough to bend into a new shape, or hard.", result: "soft", format: { kind: "label", labels: { "0": "hard", "1": "soft" } }, color: "secant", highlight: "plastics", headline: true },
    { id: "canReshape", symbol: "reshape?", name: "Can be reshaped", meaning: "Can be softened and moulded again — and so recycled.", result: "canReshape", format: yesNo, color: "cosine" },
    { id: "biodegradable", symbol: "rots?", name: "Biodegradable", meaning: "Broken down by bacteria and other natural processes.", result: "biodegradable", format: yesNo, color: "tangent", highlight: "waste", headline: true },
    { id: "rotTime", symbol: "NCERT time", name: "Time to break down (NCERT, approximate)", meaning: "NCERT's approximate time for this waste to break down.", result: "rotTime", format: { kind: "label", labels: ROT_TIMES }, color: "angle", highlight: "waste", headline: true },
    { id: "rotMidDays", symbol: "gone by", name: "Days to rot away here", meaning: "The middle of NCERT's range, when the waste is gone in this lab (0 when NCERT gives no figure).", result: "rotMidDays", format: { kind: "number", digits: 1 }, color: "neutral" },
    { id: "left", symbol: "left", name: "Left (illustrative)", meaning: "How much of the waste is still there, if it rots at a steady rate.", result: "left", format: { kind: "number", digits: 0 }, unit: "%", color: "secant", highlight: "waste", headline: true },
    { id: "gone", symbol: "gone?", name: "Rotted away", meaning: "Whether nothing is left.", result: "gone", format: yesNo, color: "tangent" },
  ],

  equations: [
    {
      id: "polymer-chain",
      topic: "synthetic-fibres",
      title: "A polymer is a chain of units",
      words: "carbon atoms in the chain = units in the chain × carbon atoms in one unit",
      tokens: [
        { kind: "ref", id: "chainCarbons" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "units" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "unitCarbons" },
      ],
      reading: "'Poly' means many and 'mer' means part. 500 ethene units make a polythene chain with 500 × 2 = 1000 carbon atoms; a nylon unit has 12 carbons, so 100 units hold 1200. Cotton is cellulose, a natural polymer made of many glucose units.",
      assumptions: ["Real chains are thousands of units long; this one stops at 1000"],
      discoverable: true,
    },
    {
      id: "thread-strength",
      topic: "synthetic-fibres",
      title: "The thread test",
      words: "a thread snaps when the load on it is more than its breaking load",
      tokens: [
        { kind: "ref", id: "load" },
        { kind: "text", value: "more than" },
        { kind: "ref", id: "breakingLoad" },
        { kind: "text", value: "→ it snaps" },
      ],
      reading: "Threads of the same thickness hold, in this lab: wool 150 g, rayon 250 g, acrylic 300 g, cotton 350 g, silk 400 g, polyester 550 g and nylon 650 g. Nylon is the strongest: that is why it is used for ropes, seat belts and parachutes.",
      assumptions: ["The breaking loads are illustrative: only their order is real", "Every thread is the same thickness"],
    },
    {
      id: "synthetic-properties",
      topic: "synthetic-fibres",
      title: "What synthetic fibres are like",
      words: "strong and light; they soak up little water and dry quickly; but they melt when heated",
      tokens: [
        { kind: "text", value: "strong" },
        { kind: "op", value: "+" },
        { kind: "text", value: "light" },
        { kind: "op", value: "+" },
        { kind: "text", value: "dry quickly" },
        { kind: "op", value: "+" },
        { kind: "text", value: "melt when heated" },
      ],
      reading: "Rayon is artificial silk, made from wood pulp. Nylon, polyester (terylene, PET) and acrylic (artificial wool) are made from petrochemicals. They last long, cost less and are easy to look after. But they melt: a burning synthetic dress melts and sticks to the skin, so wear cotton in the kitchen or the lab.",
      assumptions: ["NCERT's general description; each fibre differs a little"],
    },
    {
      id: "thermo",
      topic: "plastics-types",
      title: "Soften or set",
      words: "separate chains slide when warm, so the plastic softens (thermoplastic); chains tied together by cross-links stay put (thermosetting)",
      tokens: [
        { kind: "text", value: "separate chains" },
        { kind: "op", value: "=" },
        { kind: "text", value: "softens on heating" },
      ],
      reading: "Polythene softens at about 90 °C, PVC at about 80 °C and PET at about 75 °C here, and can be bent to a new shape. Bakelite and melamine are cross-linked: once moulded, they stay hard however hot they get.",
      assumptions: ["Softening temperatures are approximate; real values depend on the grade of plastic"],
      discoverable: true,
    },
    {
      id: "plastics-useful",
      topic: "plastics-types",
      title: "Why plastics are everywhere",
      words: "plastics do not rust, are light, strong and long-lasting, and do not conduct electricity or much heat",
      tokens: [
        { kind: "text", value: "no rust" },
        { kind: "op", value: "+" },
        { kind: "text", value: "light" },
        { kind: "op", value: "+" },
        { kind: "text", value: "strong" },
        { kind: "op", value: "+" },
        { kind: "text", value: "insulates" },
      ],
      reading: "Bakelite is a poor conductor of heat and electricity, so it makes switches and pan handles. Melamine resists fire and heat: crockery, floor tiles, and the coating on firefighters' uniforms.",
      assumptions: ["Plastics in general; a few special plastics behave differently"],
    },
    {
      id: "rotting",
      topic: "biodegradable",
      title: "Rotting away",
      words: "biodegradable waste is broken down by bacteria; here it rots at a steady rate and is gone at the middle of NCERT's range",
      tokens: [
        { kind: "ref", id: "left" },
        { kind: "op", value: "=" },
        { kind: "text", value: "100% × (1 − days ÷" },
        { kind: "ref", id: "rotMidDays" },
        { kind: "text", value: ")" },
      ],
      reading: "Paper takes 10 to 30 days (NCERT, approximate). Here it is gone at day 20, and after 10 days 50% is left. A plastic bag takes several years: bacteria cannot break it down, so it stays whole for all the days shown.",
      assumptions: ["The steady rate is illustrative; real rotting depends on warmth, water and air", "A month is 30 days and a year 365"],
      discoverable: true,
    },
    {
      id: "four-r",
      topic: "biodegradable",
      title: "The 4 R's",
      words: "reduce, reuse, recycle and recover",
      tokens: [
        { kind: "text", value: "Reduce" },
        { kind: "op", value: "+" },
        { kind: "text", value: "Reuse" },
        { kind: "op", value: "+" },
        { kind: "text", value: "Recycle" },
        { kind: "op", value: "+" },
        { kind: "text", value: "Recover" },
      ],
      reading: "Use less plastic, use things again, send thermoplastics to be melted and remade, and get back energy or material from what is left. Never burn plastic: it gives off poisonous gases that pollute the air.",
      assumptions: ["Only thermoplastics can be melted and remade"],
    },
  ],

  simulation: {
    model: "polymerschool",
    params: { polymer: "polythene", fibre: "cotton", plastic: "polythene", waste: "peels" },
    playLabel: "Run the test",
  },

  visualization: {
    renderer: "polymerschool",
    hint: "Build a chain, hang weights on a thread, heat a plastic, or bury some waste.",
    layers: [
      { id: "chain", label: "Chain" },
      { id: "fibres", label: "Thread test" },
      { id: "plastics", label: "Hotplate" },
      { id: "waste", label: "Soil pit" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    { id: "chains", label: "Chains", description: "Small units, long chains", layers: ["chain", "labels"], graphs: [], equations: ["polymer-chain"] },
    { id: "fibres", label: "Fibres", description: "The thread test", layers: ["fibres", "labels"], graphs: [], equations: ["thread-strength", "synthetic-properties"] },
    { id: "plastics", label: "Plastics", description: "Soften or set", layers: ["plastics", "labels"], graphs: [], equations: ["thermo", "plastics-useful"] },
    { id: "waste", label: "Waste", description: "Rot or remain", layers: ["waste", "labels"], graphs: [], equations: ["rotting", "four-r"] },
  ],
  defaultMode: "chains",
  graphs: [],

  activities: {
    observe: [
      {
        id: "snap",
        prompt: "Snap a thread.",
        hint: "Pick wool, then add weights.",
        condition: { type: "compare", quantity: "snapped", op: "eq", value: 1 },
      },
      {
        id: "soften",
        prompt: "Make a plastic go soft.",
        hint: "Bakelite and melamine never will. Try polythene.",
        condition: { type: "compare", quantity: "soft", op: "eq", value: 1 },
      },
      {
        id: "rot",
        prompt: "Watch some waste rot away completely.",
        hint: "Peels or paper go fastest.",
        condition: { type: "compare", quantity: "gone", op: "eq", value: 1 },
      },
    ],

    predict: [
      {
        id: "more-units",
        question: "A polythene chain has 10 units. Make it 100 units long. What happens to the carbon atoms in the chain?",
        variable: "units",
        from: 10,
        to: 100,
        quantity: "chainCarbons",
        options: ["increase", "decrease", "same"],
        mode: "chains",
        given: { polymer: "polythene" },
        explanation: "They rise from 20 to 200: every ethene unit brings 2 carbon atoms.",
      },
      {
        id: "heavier-cotton",
        question: "A cotton thread holds 300 g. Add more, to 400 g. Will it snap?",
        variable: "load",
        from: 300,
        to: 400,
        quantity: "snapped",
        options: ["increase", "decrease", "same"],
        mode: "fibres",
        given: { fibre: "cotton" },
        explanation: "Yes: the cotton thread here holds only up to 350 g. A nylon thread of the same thickness would hold 400 g easily.",
      },
      {
        id: "hot-bakelite",
        question: "Heat a bakelite strip from 50 °C to 200 °C. Does it go soft?",
        variable: "heat",
        from: 50,
        to: 200,
        quantity: "soft",
        options: ["increase", "decrease", "same"],
        mode: "plastics",
        given: { plastic: "bakelite" },
        explanation: "No: bakelite stays hard. Its chains are cross-linked, so it is a thermosetting plastic.",
      },
      {
        id: "buried-bag",
        question: "Bury a plastic bag and wait a whole year. What happens to how much of it is left?",
        variable: "days",
        from: 0,
        to: 365,
        quantity: "left",
        options: ["increase", "decrease", "same"],
        mode: "waste",
        given: { waste: "bag" },
        explanation: "It stays at 100%: bacteria cannot break a plastic bag down. NCERT says it takes several years.",
      },
    ],

    experiment: {
      title: "The thread test",
      instructions: "Try each thread in turn. Add weights until it snaps, and record the breaking load, the kind of fibre and whether it melts.",
      columns: ["breakingLoad", "fibreNatural", "meltsOnHeating"],
      minRows: 4,
      discovery: {
        question: "Which thread held the most?",
        choices: [
          { id: "nylon", label: "Nylon", correct: true },
          { id: "cotton", label: "Cotton", correct: false },
          { id: "wool", label: "Wool", correct: false },
          { id: "silk", label: "Silk", correct: false },
        ],
        reveals: "thread-strength",
        insight: "Nylon held the most and wool the least. Nylon is strong, light and elastic: ropes, seat belts, tents and parachutes are made of it.",
      },
    },

    explain: [
      {
        id: "chain",
        title: "The chain",
        body: "Each unit has {{unitCarbons}} carbon atoms ({{unitAtoms}} atoms in all). The whole chain has {{chainCarbons}} carbon atoms and {{chainAtoms}} atoms.",
      },
      {
        id: "natural",
        title: "A natural polymer",
        body: "Cotton is cellulose: many glucose units joined in a chain, made by the cotton plant.",
        when: { type: "compare", quantity: "polymerNatural", op: "eq", value: 1 },
      },
      {
        id: "thread",
        title: "The thread",
        body: "This thread holds up to {{breakingLoad}} g (an illustrative figure). Right now it is {{snapped}}. It is {{fibreNatural}}, from {{fibreSource}}, and soaks up {{absorbsWater}} of water.",
      },
      {
        id: "melts",
        title: "Not in the kitchen",
        body: "This fibre melts when heated. If clothes made of it catch fire, they melt and stick to the skin. Wear cotton in the kitchen or the lab.",
        when: { type: "compare", quantity: "meltsOnHeating", op: "eq", value: 1 },
      },
      {
        id: "plastic",
        title: "The plastic",
        body: "This is a {{thermoplastic}} plastic. It softens: {{softensAt}}. Right now the strip is {{soft}}.",
      },
      {
        id: "waste",
        title: "In the soil",
        body: "Biodegradable: {{biodegradable}}. NCERT's approximate time to break down: {{rotTime}}. Left now: {{left}} % (steady rotting, illustrative).",
      },
      {
        id: "no-burning",
        title: "Don't burn it",
        body: "This waste will not rot. Burning plastic gives off poisonous gases that pollute the air. Reduce, reuse, recycle, recover.",
        when: { type: "compare", quantity: "biodegradable", op: "eq", value: 0 },
      },
    ],

    challenges: [
      {
        id: "twelve-hundred",
        title: "1200 carbons",
        prompt: "Build a chain with exactly 1200 carbon atoms.",
        goal: { type: "compare", quantity: "chainCarbons", op: "eq", value: 1200 },
        hint: "Find the carbons in one unit first, then work out how many units you need.",
        success: "100 nylon units × 12 is one way. Polythene needs 600 units, cellulose 200, polyester 120 and acrylic 400.",
      },
      {
        id: "six-hundred",
        title: "Hold 600 g",
        prompt: "Hang at least 600 g on a thread without it snapping.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "load", op: "gte", value: 600 },
            { type: "compare", quantity: "snapped", op: "eq", value: 0 },
          ],
        },
        hint: "Only one thread is strong enough.",
        success: "Only nylon does it here: it holds up to 650 g (illustrative).",
      },
      {
        id: "old-wood",
        title: "Two years of wood",
        prompt: "Bury some wood for two whole years (730 days).",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "waste", op: "eq", value: 4 },
            { type: "compare", quantity: "days", op: "eq", value: 730 },
          ],
        },
        hint: "Pick wood, then slide the days to the end.",
        success: "84% is still there: NCERT says wood takes 10 to 15 years to break down.",
      },
    ],
  },

  realWorld: [
    { title: "Parachutes and climbing ropes", description: "Nylon is strong, light and elastic. A nylon rope can hold a climber who falls." },
    { title: "Polycot and terrycot", description: "Polyester mixed with cotton makes cloth that is cool to wear and does not crease easily." },
    { title: "Firefighters' uniforms", description: "They have a coating of melamine plastic, which resists fire." },
    { title: "Cows and polythene bags", description: "Animals that swallow thrown-away polythene bags can choke on them, and the bags block their stomachs." },
    { title: "Cotton in the kitchen", description: "A burning nylon or polyester dress melts onto the skin. Cotton does not melt, so it is the safer thing to wear near a stove." },
  ],
});
