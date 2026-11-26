import { defineConcept } from "@ise/concept-schema";

const yesNo = { kind: "label" as const, labels: { "0": "no", "1": "yes" } };
const SPECIES = { "0": "CuO", "1": "H₂", "2": "ZnO", "3": "C", "4": "Fe₂O₃", "5": "Al", "6": "MnO₂", "7": "HCl", "8": "H₂S", "9": "Cl₂" };
const NATURE = { kind: "label" as const, labels: { "0": "acidic", "1": "neutral", "2": "basic" } };

/**
 * Metals, acids and salts for classes 7 to 10 (NCERT science).
 *
 * What makes a metal a metal, and the elements that break the rules; how
 * metals corrode; the reactivity series, shown by dropping a metal strip into
 * a salt solution, an acid or cold water; oxidation and reduction as gaining
 * or losing oxygen or hydrogen; what acids do to metals, carbonates, metal
 * oxides and bases; the pH scale with everyday things and four indicators;
 * and the salts in the kitchen cupboard.
 *
 * How fast things happen here is for show, not measured: each change follows
 * the same smooth curve, with a pace chosen to look right.
 */
export const metalsAcidsSalts = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "metals-acids-salts",
    title: "Metals, Acids and Salts",
    tagline: "Which metal wins a swap, what an acid does to it, and the salts left behind.",
    domain: "chemistry",
    category: "reactions",
    grade: { min: 7, max: 10 },
    difficulty: "introductory",
    estimatedMinutes: 25,
    objective:
      "Tell metals from non-metals by their properties, use the reactivity series to predict displacement and the reaction with acids and water, name what is oxidised and reduced, test the gases acids give off, read the pH scale, and know the common salts and their uses.",
    tags: ["metals", "non-metals", "reactivity series", "displacement", "corrosion", "oxidation", "reduction", "acids", "pH", "salts", "class 7", "class 8", "class 10"],
  },

  connections: [
    {
      id: "chemical-equations",
      title: "Balancing Equations",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Every reaction here is written as a balanced equation.",
      available: true,
    },
    {
      id: "acids-and-bases",
      title: "Acids and Bases",
      domain: "chemistry",
      relation: "related",
      note: "Indicators and neutralisation drop by drop, and later the numbers behind pH.",
      available: true,
    },
    {
      id: "redox-reactions",
      title: "Redox Reactions",
      domain: "chemistry",
      relation: "leads-to",
      note: "In class 11, oxidation becomes losing electrons, and the series becomes electrode potentials.",
      available: true,
    },
    {
      id: "batteries-and-corrosion",
      title: "Batteries and Corrosion",
      domain: "chemistry",
      relation: "leads-to",
      note: "Why rust needs both air and water, and how zinc protects iron.",
      available: true,
    },
  ],

  variables: [
    {
      id: "element",
      symbol: "element",
      name: "Element",
      meaning: "The element on the bench, to test its properties.",
      binding: { kind: "param", key: "element" },
      control: {
        type: "choice",
        options: [
          { value: "iron", label: "Iron" },
          { value: "copper", label: "Copper" },
          { value: "aluminium", label: "Aluminium" },
          { value: "gold", label: "Gold" },
          { value: "silver", label: "Silver" },
          { value: "sodium", label: "Sodium" },
          { value: "mercury", label: "Mercury" },
          { value: "sulphur", label: "Sulphur" },
          { value: "graphite", label: "Carbon (graphite)" },
          { value: "iodine", label: "Iodine" },
          { value: "bromine", label: "Bromine" },
          { value: "oxygen", label: "Oxygen" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "metal",
      symbol: "metal",
      name: "Metal",
      meaning: "The metal strip dropped into the beaker, or left out in moist air.",
      binding: { kind: "param", key: "metal" },
      control: {
        type: "choice",
        options: [
          { value: "potassium", label: "Potassium" },
          { value: "sodium", label: "Sodium" },
          { value: "calcium", label: "Calcium" },
          { value: "magnesium", label: "Magnesium" },
          { value: "aluminium", label: "Aluminium" },
          { value: "zinc", label: "Zinc" },
          { value: "iron", label: "Iron" },
          { value: "lead", label: "Lead" },
          { value: "copper", label: "Copper" },
          { value: "mercury", label: "Mercury" },
          { value: "silver", label: "Silver" },
          { value: "gold", label: "Gold" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "liquid",
      symbol: "beaker",
      name: "In the beaker",
      meaning: "What the metal strip is dropped into.",
      binding: { kind: "param", key: "liquid" },
      control: {
        type: "choice",
        options: [
          { value: "hcl", label: "Dilute hydrochloric acid" },
          { value: "water", label: "Cold water" },
          { value: "cuso4", label: "Copper sulphate solution" },
          { value: "feso4", label: "Iron sulphate solution" },
          { value: "znso4", label: "Zinc sulphate solution" },
          { value: "mgso4", label: "Magnesium sulphate solution" },
          { value: "agno3", label: "Silver nitrate solution" },
        ],
      },
      group: "primary",
      color: "cosine",
    },
    {
      id: "redox",
      symbol: "reaction",
      name: "Redox reaction",
      meaning: "A reaction where one substance gains oxygen (or loses hydrogen) while another loses it.",
      binding: { kind: "param", key: "redox" },
      control: {
        type: "choice",
        options: [
          { value: "copper-oxide", label: "Hydrogen over hot copper oxide" },
          { value: "zinc-oxide", label: "Zinc oxide heated with carbon" },
          { value: "thermit", label: "Iron oxide with aluminium" },
          { value: "manganese-dioxide", label: "Manganese dioxide with hydrochloric acid" },
          { value: "hydrogen-sulphide", label: "Hydrogen sulphide with chlorine" },
        ],
      },
      group: "primary",
      color: "secant",
    },
    {
      id: "compound",
      symbol: "solid",
      name: "Added to the acid",
      meaning: "What goes into the flask of dilute hydrochloric acid.",
      binding: { kind: "param", key: "compound" },
      control: {
        type: "choice",
        options: [
          { value: "zinc", label: "Zinc granules" },
          { value: "marble", label: "Marble chips (calcium carbonate)" },
          { value: "washing-soda", label: "Sodium carbonate" },
          { value: "baking-soda", label: "Baking soda" },
          { value: "copper-oxide", label: "Copper oxide" },
          { value: "caustic-soda", label: "Sodium hydroxide" },
        ],
      },
      group: "primary",
      color: "tangent",
    },
    {
      id: "substance",
      symbol: "sample",
      name: "Substance",
      meaning: "A substance from home or the lab, tested with indicators.",
      binding: { kind: "param", key: "substance" },
      control: {
        type: "choice",
        options: [
          { value: "hydrochloric", label: "Hydrochloric acid (1 M)" },
          { value: "stomach", label: "Stomach acid" },
          { value: "lemon", label: "Lemon juice" },
          { value: "vinegar", label: "Vinegar" },
          { value: "orange", label: "Orange juice" },
          { value: "rain", label: "Clean rain water" },
          { value: "milk", label: "Fresh milk" },
          { value: "water", label: "Pure water" },
          { value: "salt-water", label: "Common salt solution" },
          { value: "blood", label: "Blood" },
          { value: "baking-soda", label: "Baking soda solution" },
          { value: "magnesia", label: "Milk of magnesia" },
          { value: "washing-soda", label: "Washing soda solution" },
          { value: "limewater", label: "Limewater" },
          { value: "caustic-soda", label: "Sodium hydroxide (1 M)" },
        ],
      },
      group: "primary",
      color: "angle",
    },
    {
      id: "salt",
      symbol: "salt",
      name: "Salt",
      meaning: "A salt you meet at home or in the lab.",
      binding: { kind: "param", key: "salt" },
      control: {
        type: "choice",
        options: [
          { value: "common-salt", label: "Common salt" },
          { value: "baking-soda", label: "Baking soda" },
          { value: "washing-soda", label: "Washing soda" },
          { value: "bleaching-powder", label: "Bleaching powder" },
          { value: "plaster", label: "Plaster of Paris" },
          { value: "gypsum", label: "Gypsum" },
          { value: "blue-vitriol", label: "Blue vitriol (copper sulphate crystals)" },
          { value: "ammonium-chloride", label: "Ammonium chloride" },
        ],
      },
      group: "primary",
      color: "curve",
    },
    {
      id: "time",
      symbol: "t",
      name: "Time",
      meaning: "Minutes since the metal, solid or gas went in.",
      binding: { kind: "state", key: "time" },
      control: { type: "range", unit: "min", min: 0, max: 30, step: 0.5, presets: [0, 5, 10, 20] },
      group: "motion",
      color: "angle",
    },
    {
      id: "days",
      symbol: "days",
      name: "Days in moist air",
      meaning: "How long the metal has been left out in damp air.",
      binding: { kind: "state", key: "days" },
      control: { type: "range", unit: "1", min: 0, max: 100, step: 1, presets: [0, 7, 30, 100] },
      group: "motion",
      color: "secant",
    },
  ],

  quantities: [
    { id: "isMetal", symbol: "metal?", name: "Metal or non-metal", meaning: "Whether the element is a metal.", result: "isMetal", format: { kind: "label", labels: { "0": "non-metal", "1": "metal" } }, color: "sine", highlight: "element", headline: true },
    { id: "lustre", symbol: "shiny?", name: "Lustre", meaning: "Whether a fresh surface shines.", result: "lustre", format: yesNo, color: "neutral", highlight: "element" },
    { id: "malleable", symbol: "sheets?", name: "Malleable", meaning: "Whether it can be beaten into thin sheets.", result: "malleable", format: yesNo, color: "neutral", highlight: "element" },
    { id: "ductile", symbol: "wires?", name: "Ductile", meaning: "Whether it can be drawn into thin wires.", result: "ductile", format: yesNo, color: "neutral", highlight: "element" },
    { id: "conducts", symbol: "conducts?", name: "Conducts electricity", meaning: "Whether a current flows through it.", result: "conducts", format: yesNo, color: "neutral", highlight: "element" },
    { id: "sonorous", symbol: "rings?", name: "Sonorous", meaning: "Whether it rings when struck.", result: "sonorous", format: yesNo, color: "neutral", highlight: "element" },
    { id: "physicalState", symbol: "state", name: "State at room temperature", meaning: "Solid, liquid or gas.", result: "physicalState", format: { kind: "label", labels: { "0": "solid", "1": "liquid", "2": "gas" } }, color: "neutral", highlight: "element" },
    { id: "oxideNature", symbol: "oxide", name: "Its oxide", meaning: "Metal oxides are basic, non-metal oxides acidic; a few are both.", result: "oxideNature", format: { kind: "label", labels: { "0": "acidic", "1": "basic", "2": "both acidic and basic", "3": "hardly forms one", "4": "—" } }, color: "neutral", highlight: "element" },

    { id: "reactivity", symbol: "rank", name: "Place in the series", meaning: "13 for potassium, the most reactive, down to 1 for gold.", result: "reactivity", format: { kind: "integer" }, color: "sine", highlight: "series", headline: true },
    { id: "aboveHydrogen", symbol: "above H?", name: "Above hydrogen", meaning: "Whether the metal is above hydrogen in the series.", result: "aboveHydrogen", format: yesNo, color: "angle", highlight: "series" },
    { id: "reaction", symbol: "what happens", name: "What happens", meaning: "What the strip does in the beaker.", result: "reaction", format: { kind: "label", labels: { "0": "nothing happens", "1": "displacement", "2": "hydrogen from the acid", "3": "reacts with the water" } }, color: "cosine", highlight: "beaker", headline: true },
    { id: "displaces", symbol: "swaps?", name: "Displaces the other metal", meaning: "Whether the strip pushes the dissolved metal out of the solution.", result: "displaces", format: yesNo, color: "cosine", highlight: "beaker" },
    { id: "progress", symbol: "done", name: "Reaction so far", meaning: "How far the strip's reaction has gone, from 0 to 1.", result: "progress", format: { kind: "number", digits: 2 }, color: "tangent", highlight: "beaker" },
    { id: "blueness", symbol: "blue", name: "Blue colour left", meaning: "How blue the solution is from copper ions, from 0 to 1.", result: "blueness", format: { kind: "number", digits: 2 }, color: "sine", highlight: "beaker" },

    { id: "corrosion", symbol: "coated", name: "Surface corroded", meaning: "The share of the surface covered by its coat, from 0 to 1.", result: "corrosion", format: { kind: "number", digits: 2 }, color: "secant", highlight: "corrosion", headline: true },
    { id: "coatingColour", symbol: "coat", name: "The coat", meaning: "What corrosion leaves on the surface.", result: "coatingColour", format: { kind: "label", labels: { "0": "none", "1": "reddish-brown rust", "2": "green coating", "3": "black coating", "4": "dull white or grey layer" } }, color: "secant", highlight: "corrosion" },

    { id: "oxidised", symbol: "oxidised", name: "Substance oxidised", meaning: "The one that gains oxygen or loses hydrogen. It is the reducing agent.", result: "oxidised", format: { kind: "label", labels: SPECIES }, color: "secant", highlight: "redox", headline: true },
    { id: "reduced", symbol: "reduced", name: "Substance reduced", meaning: "The one that loses oxygen or gains hydrogen. It is the oxidising agent.", result: "reduced", format: { kind: "label", labels: SPECIES }, color: "sine", highlight: "redox", headline: true },
    { id: "redoxProgress", symbol: "done", name: "Reacted so far", meaning: "How far the heated reaction has gone, from 0 to 1.", result: "redoxProgress", format: { kind: "number", digits: 2 }, color: "tangent", highlight: "redox" },

    { id: "acidGas", symbol: "gas", name: "Gas given off", meaning: "The gas that bubbles out of the acid.", result: "acidGas", format: { kind: "label", labels: { "0": "none", "1": "hydrogen", "2": "carbon dioxide" } }, color: "tangent", highlight: "acid", headline: true },
    { id: "gasTest", symbol: "test", name: "Gas test", meaning: "What the test for the gas shows.", result: "gasTest", format: { kind: "label", labels: { "0": "nothing yet", "1": "a lit splint pops", "2": "limewater turns milky" } }, color: "tangent", highlight: "acid" },
    { id: "beakerPH", symbol: "pH", name: "pH in the flask", meaning: "The pH of the acid as it is used up.", result: "beakerPH", format: { kind: "number", digits: 2 }, color: "angle", highlight: "acid", headline: true },

    { id: "pH", symbol: "pH", name: "pH", meaning: "Below 7 is acidic, 7 is neutral, above 7 is basic.", result: "pH", format: { kind: "number", digits: 1 }, color: "angle", highlight: "phscale", headline: true },
    { id: "nature", symbol: "nature", name: "Acid, neutral or base", meaning: "What the pH says about the substance.", result: "nature", format: NATURE, color: "angle", highlight: "phscale" },
    { id: "litmus", symbol: "litmus", name: "Litmus", meaning: "Red in acid, blue in base; purple when the pH is close to 7 (about 5 to 8).", result: "litmus", format: { kind: "label", labels: { "0": "red", "1": "purple", "2": "blue" } }, color: "neutral", highlight: "indicators" },
    { id: "phenolphthalein", symbol: "phph", name: "Phenolphthalein", meaning: "Colourless in acid and in neutral solutions; pink only above about pH 8.2, so a very weak base like blood leaves it colourless.", result: "phenolphthalein", format: { kind: "label", labels: { "0": "colourless", "1": "pink" } }, color: "neutral", highlight: "indicators" },
    { id: "methylOrange", symbol: "MO", name: "Methyl orange", meaning: "Red below pH 3.1, yellow above 4.4: lemon juice turns it red, but slightly acidic milk or rain water already turn it yellow.", result: "methylOrange", format: { kind: "label", labels: { "0": "red", "1": "orange", "2": "yellow" } }, color: "neutral", highlight: "indicators" },
    { id: "turmeric", symbol: "turmeric", name: "Turmeric", meaning: "Yellow, turning reddish-brown in a base.", result: "turmeric", format: { kind: "label", labels: { "0": "yellow", "1": "reddish-brown" } }, color: "neutral", highlight: "indicators" },

    { id: "water", symbol: "n(H₂O)", name: "Water of crystallisation", meaning: "Water molecules held in each formula unit of the crystal.", result: "water", format: { kind: "number", digits: 1 }, color: "curve", highlight: "salts", headline: true },
    { id: "saltNature", symbol: "solution", name: "Its solution", meaning: "Whether the salt dissolves to give an acidic, neutral or basic solution.", result: "saltNature", format: NATURE, color: "curve", highlight: "salts" },
  ],

  equations: [
    {
      id: "metal-oxide",
      topic: "metal-properties",
      title: "Metal oxides are basic",
      words: "metal oxide + water → base; non-metal oxide + water → acid",
      tokens: [
        { kind: "text", value: "MgO + H₂O" },
        { kind: "op", value: "=" },
        { kind: "text", value: "Mg(OH)₂" },
      ],
      reading: "Burn magnesium and dissolve the ash: it turns red litmus blue. Burn sulphur and dissolve the gas: SO₂ + H₂O → H₂SO₃ turns blue litmus red.",
      assumptions: ["A few oxides, like Al₂O₃ and ZnO, behave as both"],
    },
    {
      id: "rusting",
      topic: "corrosion-school",
      title: "Rusting",
      words: "iron + oxygen + water → rust (hydrated iron oxide)",
      tokens: [
        { kind: "text", value: "4Fe + 3O₂ + 2xH₂O" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2Fe₂O₃·xH₂O" },
      ],
      reading: "Iron needs both air and water to rust. Rust is flaky, so it falls off and lets the iron below rust too.",
      assumptions: ["x, the water in rust, varies"],
      discoverable: true,
    },
    {
      id: "reactivity-series",
      topic: "reactivity-series",
      title: "The reactivity series",
      words: "most reactive at the top, least at the bottom",
      tokens: [
        { kind: "text", value: "K > Na > Ca > Mg > Al > Zn > Fe > Pb" },
        { kind: "text", value: "> (H) >" },
        { kind: "text", value: "Cu > Hg > Ag > Au" },
      ],
      reading: "A metal higher up reacts more easily. Metals above hydrogen push it out of dilute acids; those below cannot.",
      assumptions: ["Found by experiment, by watching which metal displaces which"],
    },
    {
      id: "displacement",
      topic: "displacement-school",
      title: "Displacement",
      words: "more reactive metal + salt of a less reactive metal → salt of the more reactive metal + less reactive metal",
      tokens: [
        { kind: "text", value: "Fe + CuSO₄" },
        { kind: "op", value: "=" },
        { kind: "text", value: "FeSO₄ + Cu" },
      ],
      reading: "Iron is above copper, so it pushes copper out of copper sulphate. Copper is below iron, so it cannot push iron out.",
      assumptions: ["Only a metal higher in the series can displace one lower down"],
      discoverable: true,
    },
    {
      id: "oxidation-reduction",
      topic: "oxidation-reduction-school",
      title: "Oxidation and reduction",
      words: "gains oxygen or loses hydrogen: oxidised; loses oxygen or gains hydrogen: reduced",
      tokens: [
        { kind: "text", value: "CuO + H₂" },
        { kind: "op", value: "=" },
        { kind: "text", value: "Cu + H₂O" },
      ],
      reading: "Copper oxide loses oxygen, so it is reduced; hydrogen gains oxygen, so it is oxidised. The two always happen together.",
      assumptions: ["The class 10 meaning, by oxygen and hydrogen"],
      discoverable: true,
    },
    {
      id: "metal-acid",
      topic: "acid-reactions",
      title: "Metal + acid",
      words: "metal + acid → salt + hydrogen",
      tokens: [
        { kind: "text", value: "Zn + 2HCl" },
        { kind: "op", value: "=" },
        { kind: "text", value: "ZnCl₂ + H₂" },
      ],
      reading: "Only metals above hydrogen in the series do this. Hydrogen burns with a pop when a lit splint is brought near.",
      assumptions: ["Dilute acid"],
    },
    {
      id: "carbonate-acid",
      topic: "acid-reactions",
      title: "Carbonate + acid",
      words: "metal carbonate (or hydrogencarbonate) + acid → salt + carbon dioxide + water",
      tokens: [
        { kind: "text", value: "CaCO₃ + 2HCl" },
        { kind: "op", value: "=" },
        { kind: "text", value: "CaCl₂ + CO₂ + H₂O" },
      ],
      reading: "The carbon dioxide turns limewater milky: Ca(OH)₂ + CO₂ → CaCO₃ + H₂O.",
      assumptions: ["Dilute acid"],
      discoverable: true,
    },
    {
      id: "neutralisation-salt",
      topic: "salts",
      title: "Acid + base → salt + water",
      words: "acid + base → salt + water",
      tokens: [
        { kind: "text", value: "NaOH + HCl" },
        { kind: "op", value: "=" },
        { kind: "text", value: "NaCl + H₂O" },
      ],
      reading: "Every salt has a parent acid and a parent base. Metal oxides react the same way: CuO + 2HCl → CuCl₂ + H₂O.",
      assumptions: ["A strong acid and a strong base give a neutral salt"],
    },
    {
      id: "plaster-of-paris",
      topic: "salts",
      title: "Plaster of Paris",
      words: "gypsum, heated to 373 K → plaster of Paris + water",
      tokens: [
        { kind: "text", value: "CaSO₄·2H₂O" },
        { kind: "op", value: "=" },
        { kind: "text", value: "CaSO₄·½H₂O + 1½H₂O" },
      ],
      reading: "Heating drives out some water of crystallisation; mixing with water puts it back, and the plaster sets hard as gypsum.",
      assumptions: ["Heated at 373 K, not hotter"],
    },
    {
      id: "ph-scale",
      topic: "ph-scale-school",
      title: "The pH scale",
      words: "pH below 7: acid; pH 7: neutral; pH above 7: base",
      tokens: [
        { kind: "ref", id: "pH" },
        { kind: "op", value: "=" },
        { kind: "text", value: "7 is neutral; lower is acid, higher is base" },
      ],
      reading: "The scale runs from 0 to 14. The lower the pH, the more acidic; the higher, the more basic. Universal indicator shows a different colour for each.",
      assumptions: ["At room temperature"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "metalacid",
    params: { element: "iron", metal: "iron", liquid: "cuso4", redox: "copper-oxide", compound: "marble", substance: "lemon", salt: "baking-soda" },
    playLabel: "Let it react",
  },

  visualization: {
    renderer: "metalacid",
    hint: "Pick what goes in, then press play or move the time.",
    layers: [
      { id: "element", label: "Element" },
      { id: "corrosion", label: "Corrosion" },
      { id: "series", label: "Reactivity series" },
      { id: "beaker", label: "Beaker" },
      { id: "redox", label: "Redox" },
      { id: "acid", label: "Acid flask" },
      { id: "phscale", label: "pH scale" },
      { id: "indicators", label: "Indicators" },
      { id: "salts", label: "Salts" },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    { id: "element", label: "Metal or not", description: "Test an element's properties", layers: ["element", "labels"], graphs: [], equations: ["metal-oxide"] },
    { id: "corrosion", label: "Corrosion", description: "Leave a metal out in moist air", layers: ["corrosion", "labels"], graphs: [], equations: ["rusting"] },
    { id: "series", label: "Reactivity", description: "Drop a metal strip into a solution, an acid or water", layers: ["series", "beaker", "labels"], graphs: [], equations: ["reactivity-series", "displacement", "metal-acid"] },
    { id: "redox", label: "Redox", description: "What is oxidised and what is reduced", layers: ["redox", "labels"], graphs: [], equations: ["oxidation-reduction"] },
    { id: "acid", label: "Acid reactions", description: "Acids with metals, carbonates, an oxide and a base", layers: ["acid", "labels"], graphs: [], equations: ["metal-acid", "carbonate-acid", "neutralisation-salt"] },
    { id: "ph", label: "pH scale", description: "Everyday things on the pH scale", layers: ["phscale", "indicators", "labels"], graphs: [], equations: ["ph-scale"] },
    { id: "salts", label: "Salts", description: "Salts at home and their water of crystallisation", layers: ["salts", "labels"], graphs: [], equations: ["neutralisation-salt", "plaster-of-paris"] },
  ],
  defaultMode: "series",
  graphs: [],

  activities: {
    observe: [
      {
        id: "brown-nail",
        prompt: "Drop an iron nail into copper sulphate and wait until it is mostly coated with copper.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "displaces", op: "eq", value: 1 },
            { type: "compare", quantity: "coating", op: "gte", value: 0.8 },
          ],
        },
      },
      {
        id: "no-swap",
        prompt: "Find a metal and a solution where nothing happens at all.",
        condition: { type: "compare", quantity: "reaction", op: "eq", value: 0 },
      },
      {
        id: "milky",
        prompt: "Make limewater turn milky.",
        condition: { type: "compare", quantity: "gasTest", op: "eq", value: 2 },
      },
    ],

    predict: [
      {
        id: "blue-fades",
        question: "An iron nail sits in copper sulphate. As the minutes pass, what happens to the blue colour of the solution?",
        variable: "time",
        from: 0,
        to: 20,
        quantity: "blueness",
        options: ["increase", "decrease", "same"],
        given: { metal: "iron", liquid: "cuso4" },
        explanation: "It fades, from 1 to about 0.08 after 20 minutes. Copper leaves the solution and coats the nail; pale green iron sulphate takes its place.",
      },
      {
        id: "copper-in-iron",
        question: "Now a copper strip sits in iron sulphate. As the minutes pass, how much has reacted?",
        variable: "time",
        from: 0,
        to: 20,
        quantity: "progress",
        options: ["increase", "decrease", "same"],
        given: { metal: "copper", liquid: "feso4" },
        explanation: "Nothing changes. Copper is below iron in the series, so it cannot push iron out.",
      },
    ],

    experiment: {
      title: "Who pushes whom out?",
      instructions: "Drop different metals into copper sulphate and silver nitrate. Record each metal's place in the series and whether it swaps.",
      columns: ["reactivity", "displaces"],
      minRows: 4,
      discovery: {
        question: "When does a metal push another metal out of its solution?",
        choices: [
          { id: "above", label: "When it is higher in the reactivity series", correct: true },
          { id: "below", label: "When it is lower in the reactivity series", correct: false },
          { id: "always", label: "Always: any metal swaps with any other", correct: false },
          { id: "heavier", label: "When it is the heavier metal", correct: false },
        ],
        reveals: "displacement",
        insight: "The more reactive metal wins. Iron, zinc and magnesium all push copper out of copper sulphate; copper pushes silver out of silver nitrate; silver and gold push nothing out.",
      },
    },

    explain: [
      { id: "element", title: "Metal or non-metal?", body: "This element is a {{isMetal}}. Shiny: {{lustre}}. Conducts: {{conducts}}. Its oxide is {{oxideNature}}." },
      { id: "series", title: "What happens in the beaker", body: "The metal is number {{reactivity}} in the series (13 is the top). In this beaker: {{reaction}}." },
      { id: "corrosion", title: "Corrosion", body: "So far {{corrosion}} of the surface is covered: {{coatingColour}}." },
      { id: "redox", title: "Oxidised and reduced", body: "{{oxidised}} is oxidised and {{reduced}} is reduced. The substance reduced is the oxidising agent." },
      { id: "acid", title: "Acid reactions", body: "Gas given off: {{acidGas}}. The test shows: {{gasTest}}. The flask is at pH {{beakerPH}}." },
      { id: "ph", title: "The pH scale", body: "pH {{pH}}: {{nature}}. Litmus is {{litmus}}, phenolphthalein {{phenolphthalein}}, methyl orange {{methylOrange}}." },
      { id: "salts", title: "Salts", body: "Water of crystallisation: {{water}} per formula unit. Its solution is {{saltNature}}." },
    ],

    challenges: [
      {
        id: "silver-not-hydrogen",
        title: "Below hydrogen, above silver",
        prompt: "Find a metal that pushes silver out of silver nitrate, but gives no hydrogen with dilute acid.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "liquid", op: "eq", value: 6 },
            { type: "compare", quantity: "displaces", op: "eq", value: 1 },
            { type: "compare", quantity: "aboveHydrogen", op: "eq", value: 0 },
          ],
        },
        hint: "Look between hydrogen and silver in the series.",
        success: "Copper (or mercury): above silver, below hydrogen. Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag, and the solution turns blue.",
      },
    ],
  },

  realWorld: [
    { title: "Galvanised buckets", description: "Iron is coated with zinc. Zinc is above iron in the series, so it corrodes first and protects the iron underneath." },
    { title: "Old copper and silver", description: "Copper roofs and vessels turn green, and silver jewellery turns black, as they slowly react with the air." },
    { title: "Indigestion and bee stings", description: "Too much stomach acid hurts: a base such as milk of magnesia neutralises it. A bee sting is acidic, so baking soda soothes it." },
    { title: "Tooth decay", description: "Tooth enamel starts to wear away when the mouth's pH falls below about 5.5, as bacteria turn sugar into acids." },
    { title: "Acid rain", description: "Clean rain is about pH 5.6. Rain below that is called acid rain, and it harms rivers and buildings." },
  ],
});
