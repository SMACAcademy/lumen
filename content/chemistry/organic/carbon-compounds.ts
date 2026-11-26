import { defineConcept } from "@ise/concept-schema";

const count = (id: string, symbol: string, name: string, meaning: string, min: number, max: number, color: "sine" | "cosine" | "tangent" | "angle" | "neutral") => ({
  id,
  symbol,
  name,
  meaning,
  binding: { kind: "state" as const, key: id },
  control: { type: "range" as const, unit: "1" as const, min, max, step: 1 },
  group: "primary" as const,
  color,
});

const yesNo = { kind: "label" as const, labels: { "0": "no", "1": "yes" } };
const SERIES = { "0": "alkane", "1": "alkene", "2": "alkyne", "3": "haloalkane", "4": "alcohol", "5": "aldehyde", "6": "ketone", "7": "carboxylic acid", "8": "ester", "9": "salt", "10": "carbon dioxide" };

/**
 * Carbon and its compounds, for class 10 (NCERT science, chapter 4).
 *
 * Bonding: electron-dot structures of H₂, Cl₂, O₂, N₂, H₂O, NH₃, CH₄, CO₂,
 * ethane, ethene and ethyne; carbon's four bonds; diamond, graphite and C₆₀.
 * Chains: build a chain of up to ten carbons with a double or triple bond or
 * one functional group, and read its name, formula and formula mass.
 * Reactions: burning (clean or sooty), oxidation, addition, substitution, and
 * what ethanol and ethanoic acid do. Soap: scum in hard water, and micelles.
 *
 * Simplified, and said so in the assumptions: straight chains only, with the
 * multiple bond or the group at the chain's end (the ketone on C2); class 10
 * names without numbers; NCERT's rule for flames; the micelle threshold and
 * the cleaning percentage are illustrative.
 */
export const carbonCompounds = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "carbon-compounds",
    title: "Carbon and its Compounds",
    tagline: "Why carbon shares its electrons, how its chains are named, and how soap gets oil off your hands.",
    domain: "chemistry",
    category: "organic",
    grade: { min: 10, max: 10 },
    difficulty: "introductory",
    estimatedMinutes: 30,
    objective:
      "Draw electron-dot structures and count shared pairs; explain carbon's tetravalency, catenation and allotropes; tell saturated from unsaturated hydrocarbons with CₙH₂ₙ₊₂, CₙH₂ₙ and CₙH₂ₙ₋₂; name compounds in a homologous series from their stem and functional group; describe combustion, oxidation, addition and substitution, and the reactions of ethanol and ethanoic acid; and explain how soap cleans and why it makes scum in hard water.",
    tags: ["carbon", "covalent bond", "electron dot structure", "hydrocarbons", "homologous series", "functional groups", "ethanol", "ethanoic acid", "esterification", "soap", "micelle", "detergent", "class 10"],
  },

  connections: [
    {
      id: "structure-of-the-atom",
      title: "Structure of the Atom",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Valency from the outer shell: why carbon needs four more electrons.",
      available: true,
    },
    {
      id: "metals-acids-salts",
      title: "Metals, Acids and Salts",
      domain: "chemistry",
      relation: "related",
      note: "Ethanoic acid is a weak acid: it fizzes with carbonates and makes salts too.",
      available: true,
    },
    {
      id: "organic-basics",
      title: "Organic Chemistry: Basic Principles",
      domain: "chemistry",
      relation: "leads-to",
      note: "In class 11 the names get numbers (propan-1-ol, but-2-ene), and branches.",
      available: true,
    },
    {
      id: "lewis-structures",
      title: "Lewis Structures",
      domain: "chemistry",
      relation: "leads-to",
      note: "Electron-dot structures for any molecule, with formal charges.",
      available: true,
    },
  ],

  variables: [
    {
      id: "molecule",
      symbol: "molecule",
      name: "Molecule",
      meaning: "A small molecule to draw with dots and crosses.",
      binding: { kind: "param", key: "molecule" },
      control: {
        type: "choice",
        options: [
          { value: "h2", label: "H₂ hydrogen" },
          { value: "cl2", label: "Cl₂ chlorine" },
          { value: "o2", label: "O₂ oxygen" },
          { value: "n2", label: "N₂ nitrogen" },
          { value: "h2o", label: "H₂O water" },
          { value: "nh3", label: "NH₃ ammonia" },
          { value: "ch4", label: "CH₄ methane" },
          { value: "co2", label: "CO₂ carbon dioxide" },
          { value: "c2h6", label: "C₂H₆ ethane" },
          { value: "c2h4", label: "C₂H₄ ethene" },
          { value: "c2h2", label: "C₂H₂ ethyne" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "allotrope",
      symbol: "form",
      name: "Allotrope of carbon",
      meaning: "Pure carbon, with its atoms joined in different ways.",
      binding: { kind: "param", key: "allotrope" },
      control: {
        type: "choice",
        options: [
          { value: "diamond", label: "Diamond" },
          { value: "graphite", label: "Graphite" },
          { value: "fullerene", label: "Fullerene C₆₀" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    count("carbons", "n", "Carbons in the chain", "How many carbon atoms are joined in a row.", 1, 10, "sine"),
    count("bond", "bond", "Multiple bond", "0 only single bonds, 1 a C=C double bond, 2 a C≡C triple bond (at the chain's end).", 0, 2, "tangent"),
    count("group", "group", "Functional group", "0 none, 1 –Cl, 2 –Br, 3 –OH, 4 –CHO, 5 >C=O, 6 –COOH.", 0, 6, "cosine"),
    {
      id: "reaction",
      symbol: "reaction",
      name: "Reaction",
      meaning: "Burning the chain compound, or one of the reactions in the book.",
      binding: { kind: "param", key: "reaction" },
      control: {
        type: "choice",
        options: [
          { value: "combustion", label: "Burning (the chain compound)" },
          { value: "oxidation", label: "Ethanol + alkaline KMnO₄" },
          { value: "addition", label: "Ethene + hydrogen (nickel)" },
          { value: "substitution", label: "Methane + chlorine (sunlight)" },
          { value: "sodium", label: "Ethanol + sodium" },
          { value: "dehydration", label: "Ethanol + hot conc. H₂SO₄" },
          { value: "esterification", label: "Ethanoic acid + ethanol" },
          { value: "saponification", label: "Ester + sodium hydroxide" },
          { value: "carbonate", label: "Ethanoic acid + sodium carbonate" },
          { value: "neutralisation", label: "Ethanoic acid + sodium hydroxide" },
        ],
      },
      group: "primary",
      color: "angle",
    },
    {
      id: "air",
      symbol: "air",
      name: "Air supply",
      meaning: "Air let into the flame, as a percentage of what complete burning needs.",
      binding: { kind: "state", key: "air" },
      control: { type: "range", unit: "%", min: 40, max: 150, step: 5, presets: [60, 100, 120] },
      group: "primary",
      color: "sine",
    },
    {
      id: "cleaner",
      symbol: "cleaner",
      name: "Cleaner",
      meaning: "Soap (a sodium salt of a long-chain acid) or a detergent (a sodium sulphonate).",
      binding: { kind: "param", key: "cleaner" },
      control: {
        type: "choice",
        options: [
          { value: "soap", label: "Soap" },
          { value: "detergent", label: "Detergent" },
        ],
      },
      group: "primary",
      color: "cosine",
    },
    {
      id: "soap",
      symbol: "soap",
      name: "Soap added (mmol)",
      meaning: "Millimoles of soap or detergent put into the bowl.",
      binding: { kind: "state", key: "soap" },
      control: { type: "range", unit: "1", min: 0, max: 20, step: 0.5 },
      group: "motion",
      color: "cosine",
    },
    {
      id: "hardness",
      symbol: "Ca²⁺",
      name: "Hardness (mmol Ca²⁺/Mg²⁺)",
      meaning: "Millimoles of calcium and magnesium ions in the bowl of water.",
      binding: { kind: "state", key: "hardness" },
      control: { type: "range", unit: "1", min: 0, max: 6, step: 0.5 },
      group: "primary",
      color: "tangent",
    },
  ],

  quantities: [
    { id: "sharedPairs", symbol: "shared", name: "Shared pairs", meaning: "Pairs of electrons shared between atoms: covalent bonds (a double bond is two).", result: "sharedPairs", format: { kind: "integer" }, color: "angle", highlight: "dots", headline: true },
    { id: "lonePairs", symbol: "lone", name: "Lone pairs", meaning: "Pairs of outer electrons not shared with another atom.", result: "lonePairs", format: { kind: "integer" }, color: "neutral", highlight: "dots" },
    { id: "valenceElectrons", symbol: "e⁻", name: "Outer electrons", meaning: "Outer-shell electrons of all the atoms together.", result: "valenceElectrons", format: { kind: "integer" }, color: "neutral" },
    { id: "maxBondOrder", symbol: "bond", name: "Strongest bond", meaning: "The most pairs shared between any two atoms.", result: "maxBondOrder", format: { kind: "label", labels: { "1": "single", "2": "double", "3": "triple" } }, color: "tangent", headline: true },
    { id: "carbonBonds", symbol: "C bonds", name: "Bonds carbon makes", meaning: "Shared pairs round a carbon atom (0 if there is no carbon).", result: "carbonBonds", format: { kind: "integer" }, color: "sine", headline: true },
    { id: "neighbours", symbol: "neighbours", name: "Carbons each carbon joins", meaning: "In the allotrope: 4 in diamond, 3 in graphite and C₆₀.", result: "neighbours", format: { kind: "integer" }, color: "sine", highlight: "allotropes", headline: true },
    { id: "conducts", symbol: "conducts?", name: "Conducts electricity", meaning: "Whether the allotrope is a good conductor.", result: "conducts", format: yesNo, color: "angle", highlight: "allotropes" },
    { id: "series", symbol: "family", name: "Family", meaning: "The homologous series the compound belongs to.", result: "series", format: { kind: "label", labels: SERIES }, color: "cosine", highlight: "chain", headline: true },
    { id: "hydrogens", symbol: "H", name: "Hydrogen atoms", meaning: "Hydrogens in one molecule.", result: "hydrogens", format: { kind: "integer" }, color: "sine" },
    { id: "saturated", symbol: "saturated?", name: "Saturated", meaning: "Only single bonds between the carbons.", result: "saturated", format: yesNo, color: "tangent" },
    { id: "formulaMass", symbol: "mass", name: "Formula mass", meaning: "Sum of the atomic masses: C 12, H 1, O 16, Cl 35.5, Br 80 u.", result: "formulaMass", format: { kind: "number", digits: 1 }, unit: "u", color: "angle", highlight: "chain", headline: true },
    { id: "massStep", symbol: "+CH₂", name: "Step to the next member", meaning: "Each member of a series has one more –CH₂– than the one before.", result: "massStep", format: { kind: "integer" }, unit: "u", color: "neutral" },
    { id: "chainPairs", symbol: "bonds", name: "Covalent bonds", meaning: "Shared electron pairs in one molecule (a double bond counts two).", result: "chainPairs", format: { kind: "integer" }, color: "neutral" },
    { id: "alkaneBoilingPoint", symbol: "b.p.", name: "Boiling point of the alkane", meaning: "Measured boiling point of the straight-chain alkane with this many carbons.", result: "alkaneBoilingPoint", format: { kind: "number", digits: 1 }, unit: "degC", color: "secant" },
    {
      id: "problem",
      symbol: "check",
      name: "Can it be made?",
      meaning: "Whether this chain can be built here.",
      result: "problem",
      format: { kind: "label", labels: { "0": "fine", "1": "a double or triple bond needs two carbons", "2": "a ketone needs three carbons", "3": "a multiple bond or a group, not both" } },
      color: "secant",
    },
    { id: "oxygenNeeded", symbol: "O₂", name: "Oxygen needed", meaning: "O₂ molecules for each molecule of fuel to burn completely.", result: "oxygenNeeded", format: { kind: "number", digits: 1 }, color: "sine", highlight: "reaction" },
    { id: "co2Made", symbol: "CO₂", name: "Carbon dioxide made", meaning: "CO₂ molecules from each molecule of fuel.", result: "co2Made", format: { kind: "integer" }, color: "neutral" },
    { id: "waterMade", symbol: "H₂O", name: "Water made", meaning: "H₂O molecules from each molecule of fuel.", result: "waterMade", format: { kind: "integer" }, color: "neutral" },
    { id: "flame", symbol: "flame", name: "Flame", meaning: "Clean and blue when the burning is complete; sooty and yellow when carbon is left unburnt.", result: "flame", format: { kind: "label", labels: { "0": "nothing burning", "1": "clean blue", "2": "sooty yellow" } }, color: "angle", highlight: "reaction", headline: true },
    { id: "complete", symbol: "complete?", name: "Complete burning", meaning: "Whether all the carbon ends up as carbon dioxide.", result: "complete", format: yesNo, color: "sine" },
    { id: "gas", symbol: "gas", name: "Gas given off", meaning: "The gas that bubbles out, if any.", result: "gas", format: { kind: "label", labels: { "0": "none", "1": "hydrogen", "2": "carbon dioxide", "3": "hydrogen chloride", "4": "ethene" } }, color: "sine", highlight: "reaction" },
    { id: "productSeries", symbol: "product", name: "Carbon product", meaning: "The family of the main carbon compound made (burning leaves only CO₂).", result: "productSeries", format: { kind: "label", labels: SERIES }, color: "cosine" },
    { id: "scum", symbol: "scum", name: "Scum (mmol)", meaning: "Insoluble calcium or magnesium soap formed.", result: "scum", format: { kind: "number", digits: 1 }, color: "neutral", highlight: "soap" },
    { id: "soapWasted", symbol: "used up", name: "Soap used up as scum (mmol)", meaning: "Two soap ions for every Ca²⁺ or Mg²⁺.", result: "soapWasted", format: { kind: "number", digits: 1 }, color: "secant", highlight: "soap", headline: true },
    { id: "freeSoap", symbol: "free", name: "Free soap (mmol)", meaning: "Soap left in the water to do the cleaning.", result: "freeSoap", format: { kind: "number", digits: 1 }, color: "cosine" },
    { id: "micelles", symbol: "micelles?", name: "Micelles", meaning: "Whether there is enough free soap to gather round the oil.", result: "micelles", format: yesNo, color: "angle", headline: true },
    { id: "cleaning", symbol: "oil lifted", name: "Oil lifted", meaning: "How much of the oil the micelles carry off (illustrative).", result: "cleaning", format: { kind: "number", digits: 0 }, unit: "%", color: "secant" },
    { id: "soapToLather", symbol: "to lather", name: "Soap needed before lather (mmol)", meaning: "What the hard water uses up, plus enough to start micelles.", result: "soapToLather", format: { kind: "number", digits: 1 }, color: "neutral" },
  ],

  equations: [
    {
      id: "octet",
      topic: "carbon-bonding-school",
      title: "Sharing to fill the outer shell",
      words: "electrons round an atom = 2 for each shared pair + 2 for each lone pair = 8 (2 for hydrogen)",
      tokens: [
        { kind: "text", value: "2 × shared pairs" },
        { kind: "op", value: "+" },
        { kind: "text", value: "2 × lone pairs" },
        { kind: "op", value: "=" },
        { kind: "text", value: "8" },
      ],
      reading: "In CH₄, carbon shares one pair with each of four hydrogens: 2 × 4 = 8 round carbon, 2 round each H. In O₂ the atoms share two pairs (a double bond); in N₂, three (a triple bond).",
      assumptions: ["Each shared pair holds one electron from each atom", "Hydrogen is full with two electrons"],
    },
    {
      id: "tetravalency",
      topic: "carbon-bonding-school",
      title: "Carbon makes four bonds",
      words: "carbon has 4 outer electrons; it shares all four, so it always makes four bonds",
      tokens: [
        { kind: "ref", id: "carbonBonds" },
        { kind: "op", value: "=" },
        { kind: "text", value: "4" },
      ],
      reading: "Carbon cannot easily gain four electrons (six protons could not hold ten electrons in C⁴⁻) or lose four (C⁴⁺ would take a lot of energy), so it shares. Four single bonds in CH₄, two double bonds in CO₂, a triple and a single in ethyne. Carbon also bonds to carbon again and again (catenation), making long chains and rings: carbon atoms are small, so the C–C bond is strong and stable.",
      assumptions: ["Counting a double bond as two and a triple as three"],
      discoverable: true,
    },
    {
      id: "general-formulae",
      topic: "hydrocarbons-school",
      title: "Saturated and unsaturated hydrocarbons",
      words: "alkanes CₙH₂ₙ₊₂ (only single bonds), alkenes CₙH₂ₙ (one C=C), alkynes CₙH₂ₙ₋₂ (one C≡C)",
      tokens: [
        { kind: "ref", id: "hydrogens" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2n + 2, 2n or 2n − 2" },
      ],
      reading: "Propane C₃H₈, propene C₃H₆, propyne C₃H₄. Each extra bond between carbons uses up two hydrogens. Alkanes are saturated; alkenes and alkynes are unsaturated.",
      assumptions: ["Open chains only, with one multiple bond at most"],
    },
    {
      id: "homologous",
      topic: "functional-groups-school",
      title: "A homologous series",
      words: "each member has one more –CH₂– than the one before, so it is 14 u heavier",
      tokens: [
        { kind: "text", value: "mass of next member" },
        { kind: "op", value: "−" },
        { kind: "text", value: "mass of this one" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "massStep" },
      ],
      reading: "CH₃OH 32 u, C₂H₅OH 46 u, C₃H₇OH 60 u. Members share chemical properties; boiling point rises with the mass (methane −161.5 °C, butane −0.5 °C, octane 125.7 °C).",
      assumptions: ["Masses with C 12, H 1, O 16 u"],
      discoverable: true,
    },
    {
      id: "naming",
      topic: "functional-groups-school",
      title: "Naming a carbon compound",
      words: "the stem counts the carbons (meth, eth, prop, but …); the group adds a prefix (chloro-, bromo-) or an ending (-ol, -al, -one, -oic acid, -ene, -yne)",
      tokens: [
        { kind: "text", value: "prefix" },
        { kind: "op", value: "+" },
        { kind: "text", value: "stem" },
        { kind: "op", value: "+" },
        { kind: "text", value: "ending" },
      ],
      reading: "Three carbons: chloropropane, propanol, propanal, propanone, propanoic acid, propene, propyne. When the ending starts with a vowel, the e of -ane drops: propan(e) + ol.",
      assumptions: ["Class 10 names leave out the numbers; class 11 adds them (propan-1-ol, but-1-ene)"],
    },
    {
      id: "combustion",
      topic: "hydrocarbons-school",
      title: "Burning",
      words: "a carbon compound + oxygen → carbon dioxide + water + heat and light",
      tokens: [
        { kind: "text", value: "CH₄ + 2O₂" },
        { kind: "op", value: "=" },
        { kind: "text", value: "CO₂ + 2H₂O + heat and light" },
      ],
      reading: "Saturated compounds burn with a clean blue flame in enough air. Unsaturated ones, or any fuel with too little air, give a yellow sooty flame: some carbon is left unburnt.",
      assumptions: ["NCERT's rule for flames; a real flame's colour also depends on the burner"],
    },
    {
      id: "carbon-reactions",
      topic: "functional-groups-school",
      title: "Oxidation, addition and substitution",
      words: "oxidising agents turn alcohols into acids; hydrogen adds across C=C with a nickel catalyst; chlorine swaps for hydrogen in sunlight",
      tokens: [
        { kind: "text", value: "CH₃CH₂OH + 2[O]" },
        { kind: "op", value: "=" },
        { kind: "text", value: "CH₃COOH + H₂O" },
      ],
      reading: "Alkaline KMnO₄ (or acidified K₂Cr₂O₇) supplies the oxygen. Hydrogenation hardens vegetable oils into vanaspati ghee. CH₄ + Cl₂ → CH₃Cl + HCl in sunlight.",
      assumptions: ["[O] stands for oxygen from the oxidising agent"],
    },
    {
      id: "esterification",
      topic: "functional-groups-school",
      title: "Making an ester",
      words: "carboxylic acid + alcohol → ester + water, with a little acid as catalyst",
      tokens: [
        { kind: "text", value: "CH₃COOH + CH₃CH₂OH" },
        { kind: "op", value: "=" },
        { kind: "text", value: "CH₃COOCH₂CH₃ + H₂O" },
      ],
      reading: "Ethyl ethanoate smells sweet and fruity. Heated with sodium hydroxide, an ester splits back into the alcohol and the sodium salt of the acid: saponification, which turns fats into soap.",
      assumptions: ["A few drops of concentrated sulphuric acid, warmed"],
    },
    {
      id: "scum",
      topic: "soaps",
      title: "Soap in hard water",
      words: "each calcium or magnesium ion takes two soap ions out of the water as scum",
      tokens: [
        { kind: "ref", id: "soapWasted" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "scum" },
      ],
      reading: "2C₁₇H₃₅COO⁻Na⁺ + Ca²⁺ → (C₁₇H₃₅COO)₂Ca↓ + 2Na⁺. The scum is the calcium soap: it does not dissolve, and does not clean. Detergents' calcium salts do dissolve, so they work in hard water.",
      assumptions: ["All the Ca²⁺ and Mg²⁺ reacts before any soap is free", "Each soap ion is one sodium salt of a long-chain acid"],
      discoverable: true,
    },
    {
      id: "micelle",
      topic: "soaps",
      title: "How soap cleans",
      words: "a soap ion's long hydrocarbon tail dissolves in oil; its ionic head stays in water; many of them round an oil drop make a micelle that rinses away",
      tokens: [
        { kind: "text", value: "tail in the oil" },
        { kind: "op", value: "+" },
        { kind: "text", value: "head in the water" },
        { kind: "op", value: "=" },
        { kind: "text", value: "a micelle" },
      ],
      reading: "The heads on the outside all carry a negative charge, so the micelles repel each other and stay apart in the water, carrying the oily dirt with them.",
      assumptions: ["The free soap needed to start micelles (2 mmol here) and the oil lifted are illustrative"],
    },
  ],

  simulation: {
    model: "carbonschool",
    params: { molecule: "ch4", allotrope: "diamond", reaction: "combustion", cleaner: "soap" },
    playLabel: "Pour in soap",
  },

  visualization: {
    renderer: "carbonschool",
    hint: "Pick a molecule, build a chain, light the burner, or add soap to the bowl.",
    layers: [
      { id: "dots", label: "Electron dots" },
      { id: "allotropes", label: "Allotropes" },
      { id: "chain", label: "Chain" },
      { id: "reaction", label: "Reaction" },
      { id: "soap", label: "Soap bowl" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    { id: "bonding", label: "Bonding", description: "Dots and crosses: shared pairs", layers: ["dots", "labels"], graphs: [], equations: ["octet", "tetravalency"] },
    { id: "allotropes", label: "Allotropes", description: "Diamond, graphite and C₆₀", layers: ["allotropes", "labels"], graphs: [], equations: ["tetravalency"] },
    { id: "chains", label: "Chains", description: "Build, name and weigh", layers: ["chain", "labels"], graphs: [], equations: ["general-formulae", "naming", "homologous"] },
    { id: "reactions", label: "Reactions", description: "Burn, oxidise, add, swap", layers: ["reaction", "labels"], graphs: [], equations: ["combustion", "carbon-reactions", "esterification"] },
    { id: "soap", label: "Soap", description: "Micelles and hard water", layers: ["soap", "labels"], graphs: [], equations: ["micelle", "scum"] },
  ],
  defaultMode: "bonding",
  graphs: [],

  activities: {
    observe: [
      {
        id: "triple",
        prompt: "Find a molecule held together by a triple bond.",
        hint: "Try nitrogen, or ethyne.",
        condition: { type: "compare", quantity: "maxBondOrder", op: "eq", value: 3 },
      },
      {
        id: "sooty",
        prompt: "Make the burner give a sooty yellow flame.",
        hint: "Turn the air down, or burn an alkene.",
        condition: { type: "compare", quantity: "flame", op: "eq", value: 2 },
      },
      {
        id: "scum",
        prompt: "Get scum floating on the water.",
        hint: "Make the water hard, then add soap.",
        condition: { type: "compare", quantity: "scum", op: "gt", value: 0 },
      },
    ],

    predict: [
      {
        id: "one-more-carbon",
        question: "Go from propane to butane (one more carbon). What happens to the formula mass?",
        variable: "carbons",
        from: 3,
        to: 4,
        quantity: "formulaMass",
        options: ["increase", "decrease", "same"],
        mode: "chains",
        given: { bond: 0, group: 0 },
        explanation: "It rises by 14 u, from 44 u to 58 u: butane has one more –CH₂– than propane.",
      },
      {
        id: "less-air",
        question: "Methane is burning well. Cut the air from 120% to 80% of what it needs. What happens to complete burning?",
        variable: "air",
        from: 120,
        to: 80,
        quantity: "complete",
        options: ["increase", "decrease", "same"],
        mode: "reactions",
        given: { reaction: "combustion", carbons: 1, bond: 0, group: 0 },
        explanation: "It stops being complete: with too little oxygen some carbon is left unburnt, and the flame turns yellow and sooty.",
      },
      {
        id: "harder-water",
        question: "10 mmol of soap. Make the water harder, from 1 to 4 mmol of Ca²⁺. What happens to the free soap?",
        variable: "hardness",
        from: 1,
        to: 4,
        quantity: "freeSoap",
        options: ["increase", "decrease", "same"],
        mode: "soap",
        given: { cleaner: "soap", soap: 10 },
        explanation: "It falls from 8 to 2 mmol: each Ca²⁺ takes two soap ions out as scum, so 8 mmol are lost instead of 2.",
      },
    ],

    experiment: {
      title: "How many bonds does carbon make?",
      instructions: "Step through methane, carbon dioxide, ethane, ethene and ethyne, and record the shared pairs, the lone pairs and the bonds round carbon.",
      columns: ["sharedPairs", "lonePairs", "carbonBonds"],
      minRows: 4,
      discovery: {
        question: "What stays the same for carbon in every molecule?",
        choices: [
          { id: "four", label: "Carbon always makes four bonds (a double bond counts two)", correct: true },
          { id: "single", label: "Carbon only makes single bonds", correct: false },
          { id: "lone", label: "Carbon always keeps a lone pair", correct: false },
          { id: "two", label: "Carbon makes two bonds, like oxygen", correct: false },
        ],
        reveals: "tetravalency",
        insight: "Carbon has four outer electrons and shares all of them: its valency is four. With carbon joining carbon too, that gives the millions of carbon compounds.",
      },
    },

    explain: [
      {
        id: "dots",
        title: "The electron dots",
        body: "{{sharedPairs}} shared pairs and {{lonePairs}} lone pairs, from {{valenceElectrons}} outer electrons. The strongest bond is {{maxBondOrder}}.",
      },
      {
        id: "carbon",
        title: "Carbon's bonds",
        body: "Carbon here makes {{carbonBonds}} bonds: it shares all four of its outer electrons.",
        when: { type: "compare", quantity: "carbonBonds", op: "gt", value: 0 },
      },
      {
        id: "chain",
        title: "The compound",
        body: "Family: {{series}}. It has {{hydrogens}} hydrogens and {{chainPairs}} covalent bonds, and its formula mass is {{formulaMass}} u. The next member of its family is {{massStep}} u heavier.",
        when: { type: "compare", quantity: "problem", op: "eq", value: 0 },
      },
      {
        id: "cannot",
        title: "Can't be made",
        body: "This chain cannot be built here: {{problem}}.",
        when: { type: "compare", quantity: "problem", op: "gt", value: 0 },
      },
      {
        id: "burning",
        title: "The flame",
        body: "Each molecule needs {{oxygenNeeded}} O₂ to burn completely, making {{co2Made}} CO₂ and {{waterMade}} H₂O. The flame is {{flame}}.",
        when: { type: "compare", quantity: "flame", op: "gt", value: 0 },
      },
      {
        id: "wash",
        title: "The wash",
        body: "{{scum}} mmol of scum used up {{soapWasted}} mmol of soap, leaving {{freeSoap}} mmol free. Micelles: {{micelles}}. Oil lifted: {{cleaning}} %.",
        when: { type: "compare", quantity: "soap", op: "gt", value: 0 },
      },
    ],

    challenges: [
      {
        id: "propanone",
        title: "Nail-polish remover",
        prompt: "Build propanone, the ketone with three carbons.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "series", op: "eq", value: 6 },
            { type: "compare", quantity: "carbons", op: "eq", value: 3 },
          ],
        },
        hint: "Group 5 is the ketone, >C=O.",
        success: "CH₃COCH₃, 58 u: the ketone's C=O sits on the middle carbon.",
      },
      {
        id: "five-oxygen",
        title: "Five oxygens",
        prompt: "Find a fuel that needs exactly 5 O₂ for each molecule to burn completely.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "oxygenNeeded", op: "eq", value: 5 },
            { type: "compare", quantity: "flame", op: "gt", value: 0 },
          ],
        },
        hint: "Count it: C atoms + H atoms ÷ 4 − O atoms ÷ 2. Try the alkanes.",
        success: "Propane is one: C₃H₈ + 5O₂ → 3CO₂ + 4H₂O. (Butanoic acid, C₄H₈O₂, needs 5 too.)",
      },
      {
        id: "lather",
        title: "Lather in very hard water",
        prompt: "In water with 6 mmol of Ca²⁺, get soap micelles to form.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "hardness", op: "eq", value: 6 },
            { type: "compare", quantity: "micelles", op: "eq", value: 1 },
          ],
        },
        hint: "The water eats up twice its hardness in soap first.",
        success: "More than 14 mmol: 12 mmol go into scum before any soap is free. A detergent would lather with just over 2.",
      },
    ],
  },

  realWorld: [
    { title: "LPG and CNG", description: "Cooking gas is mostly butane; CNG is mostly methane. Both burn with a clean blue flame when the burner's air holes are open." },
    { title: "A black-bottomed pan", description: "A yellow, sooty flame on the stove means the air holes are blocked: fuel is being wasted as soot." },
    { title: "Vinegar and glacial acetic acid", description: "Vinegar is 5–8% ethanoic acid in water. Pure ethanoic acid freezes at 290 K, so in a cold room it looks like ice." },
    { title: "Vanaspati ghee", description: "Vegetable oils are unsaturated. Adding hydrogen over nickel saturates them into a solid fat; oils with unsaturated fats are healthier to cook with." },
    { title: "Soap or detergent?", description: "In hard water soap forms a sticky scum on clothes and buckets. Detergents do not, which is why washing powders are detergents." },
  ],
});
