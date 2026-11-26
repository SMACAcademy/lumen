import { defineConcept } from "@ise/concept-schema";

const choice = (id: string, symbol: string, name: string, meaning: string, labels: string[], color: "sine" | "cosine" | "tangent" | "angle" | "neutral") => ({
  id,
  symbol,
  name,
  meaning,
  binding: { kind: "param" as const, key: id },
  control: { type: "choice" as const, options: labels.map((label, value) => ({ value, label })) },
  group: "primary" as const,
  color,
});

const step = (id: string, symbol: string, name: string, meaning: string, min: number, max: number, color: "sine" | "cosine" | "tangent" | "angle") => ({
  id,
  symbol,
  name,
  meaning,
  binding: { kind: "state" as const, key: id },
  control: { type: "range" as const, unit: "1" as const, min, max, step: 1 },
  group: "primary" as const,
  color,
});

/**
 * Hydrocarbons, for class 11 (NCERT chapter 9).
 *
 * Alkanes: ethane's conformations in a Newman projection, with the
 * torsional energy against the dihedral angle; free-radical chlorination of
 * methane. Alkenes: addition of H₂, Br₂, HBr (Markovnikov, and the peroxide
 * effect), water, Baeyer's reagent and ozone, each product built by rule.
 * Alkynes: acidity of terminal alkynes, Lindlar's catalyst and Na in liquid
 * NH₃, and additions. Benzene: Kekulé structures, Hückel's rule, the
 * mechanism of electrophilic substitution and the directing influence of
 * substituents.
 *
 * Simplified, and said so in the assumptions: the energy curve is the
 * simple ½·12.5·(1 + cos 3θ) form; the mechanisms are drawn as NCERT draws
 * them (the bromonium ion of Br₂ addition and the enol of alkyne hydration
 * are not shown); how the electrophiles are made is written in the usual
 * textbook equations; directing effects are given as rules (ortho/para or
 * meta), not product ratios.
 */
export const hydrocarbons = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "hydrocarbons",
    title: "Hydrocarbons",
    tagline: "Turn ethane, add across double and triple bonds, and see why benzene substitutes instead of adding.",
    domain: "chemistry",
    category: "organic",
    grade: { min: 11, max: 11 },
    difficulty: "core",
    estimatedMinutes: 40,
    objective:
      "Explain ethane's staggered and eclipsed conformations and the torsional energy between them; write the free-radical mechanism of methane's chlorination; predict products of addition to alkenes by Markovnikov's rule and the peroxide effect, and of ozonolysis; explain the acidity of terminal alkynes and reduce alkynes to cis or trans alkenes; apply Hückel's rule; and describe electrophilic substitution in benzene and the directing influence of substituents.",
    tags: ["hydrocarbons", "conformations", "Newman projection", "Markovnikov's rule", "peroxide effect", "ozonolysis", "alkynes", "aromaticity", "Hückel's rule", "electrophilic substitution", "class 11"],
  },

  connections: [
    {
      id: "organic-basics",
      title: "Organic Chemistry: Basic Principles",
      domain: "chemistry",
      relation: "prerequisite",
      note: "IUPAC names, carbocations and free radicals, and the curly arrows used here.",
      available: true,
    },
    {
      id: "carbon-compounds",
      title: "Carbon and its Compounds",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Saturated and unsaturated hydrocarbons, met first in class 10.",
      available: true,
    },
    {
      id: "valence-bond-theory",
      title: "Valence Bond Theory",
      domain: "chemistry",
      relation: "related",
      note: "sp³, sp² and sp carbons: why ethyne's H is acidic and benzene is flat.",
      available: true,
    },
  ],

  variables: [
    {
      id: "dihedral",
      symbol: "θ",
      name: "Dihedral angle",
      meaning: "How far the back carbon's C–H bonds are turned from the front ones.",
      binding: { kind: "state", key: "dihedral" },
      control: { type: "range", unit: "deg", min: 0, max: 360, step: 1, presets: [0, 60, 120, 180] },
      group: "primary",
      color: "angle",
    },
    choice("mechanism", "mechanism", "Mechanism", "A free-radical chain, or an ionic addition.", ["CH₄ + Cl₂ (light)", "CH₃CH=CH₂ + HBr", "CH₃CH=CH₂ + HBr, peroxide"], "tangent"),
    step("stage", "step", "Step of the mechanism", "Step through the mechanism, one bond change at a time.", 0, 5, "tangent"),
    choice("alkene", "alkene", "Alkene", "The alkene being added to.", ["ethene", "propene", "but-1-ene", "but-2-ene", "2-methylpropene"], "sine"),
    choice(
      "reagent",
      "reagent",
      "Reagent",
      "What is added across the C=C.",
      ["H₂, Ni", "Br₂ in CCl₄", "HBr", "HBr, peroxide", "HCl, peroxide", "H₂O, H⁺", "cold dil. KMnO₄", "O₃, then Zn/H₂O"],
      "cosine",
    ),
    choice("alkyne", "alkyne", "Alkyne", "The alkyne that reacts.", ["ethyne", "propyne", "but-1-yne", "but-2-yne"], "sine"),
    choice(
      "alkyneReagent",
      "reagent",
      "Reagent for the alkyne",
      "A base, a reducing agent, or something that adds.",
      ["NaNH₂", "H₂, Lindlar's catalyst", "Na in liquid NH₃", "excess H₂, Ni", "Br₂ (2 mol)", "HBr (2 mol)", "H₂O, Hg²⁺/H₂SO₄"],
      "cosine",
    ),
    choice(
      "ring",
      "ring",
      "Ring",
      "A ring or ring ion to test against Hückel's rule.",
      ["benzene", "cyclopentadienyl anion", "cycloheptatrienyl cation", "naphthalene", "cyclobutadiene", "cyclooctatetraene", "cyclopentadiene", "cyclopentadienyl cation"],
      "angle",
    ),
    choice("reaction", "reaction", "Substitution", "Which electrophile attacks benzene.", ["nitration", "chlorination", "bromination", "sulphonation", "Friedel–Crafts alkylation", "Friedel–Crafts acylation"], "cosine"),
    step("easStage", "step", "Step of substitution", "0 the electrophile forms, 1 the σ-complex, 2 H⁺ leaves.", 0, 2, "tangent"),
    choice("substituent", "–X", "Group on the ring", "A group already on the benzene ring.", ["–H", "–OH", "–NH₂", "–OCH₃", "–CH₃", "–Cl", "–Br", "–NO₂", "–CN", "–CHO", "–COOH"], "cosine"),
    step("position", "position", "Position attacked", "2 ortho, 3 meta, 4 para, counting the group's carbon as 1.", 2, 4, "angle"),
  ],

  quantities: [
    { id: "dihedral", symbol: "θ", name: "Dihedral angle", meaning: "Between a front C–H and the nearest back C–H, seen end-on.", result: "dihedral", format: { kind: "number", digits: 0 }, unit: "deg", color: "angle", highlight: "newman" },
    { id: "torsionalEnergy", symbol: "E", name: "Torsional energy", meaning: "Energy above the staggered form, from the repulsion of bond pairs on the two carbons.", result: "torsionalEnergy", format: { kind: "number", digits: 1 }, unit: "kJ/mol", color: "curve", highlight: "newman", headline: true },
    {
      id: "conformation",
      symbol: "form",
      name: "Conformation",
      meaning: "Eclipsed (θ = 0°, 120°, 240°), staggered (60°, 180°, 300°) or skew.",
      result: "conformation",
      format: { kind: "label", labels: { "0": "eclipsed", "1": "staggered", "2": "skew" } },
      color: "angle",
      highlight: "newman",
      headline: true,
    },
    { id: "stageKind", symbol: "step", name: "Kind of step", meaning: "Initiation makes radicals, propagation passes one on, termination uses them up.", result: "stageKind", format: { kind: "label", labels: { "0": "initiation", "1": "propagation", "2": "termination", "3": "ionic step" } }, color: "tangent", highlight: "mechanism", headline: true },
    { id: "radicalChange", symbol: "Δ radicals", name: "Radicals made", meaning: "Free radicals made (+) or used up (−) in this step.", result: "radicalChange", format: { kind: "integer" }, color: "tangent", highlight: "mechanism" },
    { id: "mechIntermediate", symbol: "left", name: "Intermediate made", meaning: "What the step leaves on carbon.", result: "mechIntermediate", format: { kind: "label", labels: { "0": "no intermediate", "1": "a carbocation", "2": "a free radical" } }, color: "angle", highlight: "mechanism" },
    {
      id: "orientation",
      symbol: "orientation",
      name: "Orientation",
      meaning: "Which way round H–X adds to an unsymmetrical alkene.",
      result: "orientation",
      format: { kind: "label", labels: { "0": "no choice (both ends alike)", "1": "Markovnikov", "2": "anti-Markovnikov" } },
      color: "cosine",
      highlight: "addition",
      headline: true,
    },
    { id: "addIntermediate", symbol: "via", name: "Intermediate", meaning: "Formed on the way: a carbocation (ionic) or a free radical (peroxide).", result: "addIntermediate", format: { kind: "label", labels: { "0": "none shown", "1": "carbocation", "2": "free radical" } }, color: "angle", highlight: "addition" },
    { id: "addDegree", symbol: "degree", name: "Degree of the intermediate", meaning: "Carbons bonded to the carbon carrying + or the odd electron (0 if none).", result: "addDegree", format: { kind: "integer" }, color: "angle", highlight: "addition", headline: true },
    { id: "xLocant", symbol: "locant", name: "Locant of the new group", meaning: "The carbon that took X (or OH) from H–X or H₂O, as numbered in the product's name.", result: "xLocant", format: { kind: "integer" }, color: "cosine", highlight: "addition" },
    { id: "alkeneCisTrans", symbol: "cis/trans?", name: "Cis and trans forms", meaning: "Whether each carbon of the C=C carries two different groups.", result: "alkeneCisTrans", format: { kind: "label", labels: { "0": "no", "1": "yes" } }, color: "sine", highlight: "addition" },
    { id: "acidicH", symbol: "acidic H", name: "Acidic hydrogens", meaning: "H atoms on the triply bonded (sp) carbons.", result: "acidicH", format: { kind: "integer" }, color: "sine", highlight: "alkynes", headline: true },
    { id: "reacts", symbol: "reacts?", name: "Reaction", meaning: "Whether the reagent reacts with this alkyne.", result: "reacts", format: { kind: "label", labels: { "0": "no", "1": "yes" } }, color: "cosine", highlight: "alkynes" },
    { id: "stereo", symbol: "geometry", name: "Alkene formed", meaning: "cis or trans, when the alkene made has the two forms.", result: "stereo", format: { kind: "label", labels: { "0": "no cis/trans", "1": "cis", "2": "trans" } }, color: "cosine", highlight: "alkynes", headline: true },
    { id: "bondAfter", symbol: "bond", name: "Bond left", meaning: "Order of the bond left between the two carbons of the old C≡C.", result: "bondAfter", format: { kind: "integer" }, color: "neutral", highlight: "alkynes" },
    { id: "piElectrons", symbol: "π e⁻", name: "π electrons", meaning: "Two per C=C, two for a carbanion's lone pair, none for C⁺.", result: "piElectrons", format: { kind: "integer" }, color: "angle", highlight: "rings", headline: true },
    { id: "huckelN", symbol: "n", name: "n in 4n + 2", meaning: "Whole number n if the π electrons number 4n + 2.", result: "huckelN", format: { kind: "label", labels: { "-1": "not 4n + 2", "0": "n = 0", "1": "n = 1", "2": "n = 2" } }, color: "angle", highlight: "rings" },
    { id: "aromatic", symbol: "aromatic?", name: "Aromatic", meaning: "Cyclic, planar, a p orbital on every ring atom, and 4n + 2 π electrons.", result: "aromatic", format: { kind: "label", labels: { "0": "no", "1": "yes" } }, color: "tangent", highlight: "rings", headline: true },
    { id: "aromaticReason", symbol: "why", name: "Verdict", meaning: "Which of Hückel's conditions fails, if any.", result: "aromaticReason", format: { kind: "label", labels: { "0": "all conditions met", "1": "an sp³ carbon breaks the ring", "2": "not planar", "3": "4n π electrons" } }, color: "tangent", highlight: "rings" },
    { id: "bondBenzene", symbol: "C–C (benzene)", name: "Benzene's C–C bond", meaning: "All six are the same length (X-ray).", result: "bondBenzene", format: { kind: "number", digits: 0 }, unit: "pm", color: "angle", highlight: "kekule", headline: true },
    { id: "bondSingle", symbol: "C–C", name: "C–C single bond", meaning: "As in ethane.", result: "bondSingle", format: { kind: "number", digits: 0 }, unit: "pm", color: "neutral", highlight: "kekule" },
    { id: "bondDouble", symbol: "C=C", name: "C=C double bond", meaning: "As in ethene.", result: "bondDouble", format: { kind: "number", digits: 0 }, unit: "pm", color: "neutral", highlight: "kekule" },
    { id: "ringSp3", symbol: "sp³ C", name: "sp³ carbons in the ring", meaning: "One in the σ-complex, where E and H sit on the same carbon.", result: "ringSp3", format: { kind: "integer" }, color: "angle", highlight: "eas", headline: true },
    { id: "ringIntact", symbol: "aromatic?", name: "Ring aromatic", meaning: "Whether the six π electrons still run all round the ring.", result: "ringIntact", format: { kind: "label", labels: { "0": "no", "1": "yes" } }, color: "tangent", highlight: "eas" },
    { id: "directs", symbol: "directs", name: "Directs to", meaning: "Where the group sends the next electrophile.", result: "directs", format: { kind: "label", labels: { "0": "any position", "1": "ortho and para", "2": "meta" } }, color: "cosine", highlight: "directing", headline: true },
    { id: "activation", symbol: "rate", name: "Activating or deactivating", meaning: "Faster or slower than benzene itself.", result: "activation", format: { kind: "label", labels: { "-1": "deactivating", "0": "benzene itself", "1": "activating" } }, color: "cosine", highlight: "directing" },
    { id: "favoured", symbol: "favoured?", name: "Position favoured", meaning: "Whether the group directs E⁺ to the position chosen.", result: "favoured", format: { kind: "label", labels: { "0": "no", "1": "yes" } }, color: "angle", highlight: "directing" },
  ],

  equations: [
    {
      id: "torsional-energy",
      topic: "alkanes-conformations",
      title: "Torsional energy of ethane",
      words: "the energy rises and falls three times a turn: highest eclipsed, lowest staggered, 12.5 kJ/mol apart",
      tokens: [
        { kind: "ref", id: "torsionalEnergy" },
        { kind: "op", value: "=" },
        { kind: "text", value: "6.25 kJ/mol" },
        { kind: "op", value: "·" },
        { kind: "text", value: "(1 + cos 3θ)" },
      ],
      reading:
        "θ = 0°: eclipsed, 12.5 kJ/mol. θ = 60°: staggered, 0. The barrier is small, so at room temperature ethane turns freely and its conformations cannot be separated.",
      assumptions: ["NCERT's 12.5 kJ/mol barrier", "The simple cosine shape of the curve", "Energy measured from the staggered form"],
      discoverable: true,
    },
    {
      id: "free-radical-chain",
      topic: "alkanes-conformations",
      title: "Free-radical halogenation",
      words: "light splits Cl₂ into atoms; each Cl• starts a chain of two propagation steps; radicals meeting end it",
      tokens: [
        { kind: "text", value: "initiation: Cl₂ → 2Cl•" },
        { kind: "op", value: "·" },
        { kind: "text", value: "propagation: two steps" },
        { kind: "op", value: "·" },
        { kind: "text", value: "termination" },
      ],
      reading: "CH₄ + Cl• → •CH₃ + HCl, then •CH₃ + Cl₂ → CH₃Cl + Cl•. Termination: Cl• + Cl•, •CH₃ + •CH₃ (ethane), •CH₃ + Cl•.",
      assumptions: ["Diffused light or heat", "Further substitution (CH₂Cl₂, CHCl₃, CCl₄) is left out"],
    },
    {
      id: "markovnikov",
      topic: "alkenes-addition",
      title: "Markovnikov's rule",
      words: "the negative part of the addendum goes to the carbon of the C=C carrying fewer hydrogens",
      tokens: [
        { kind: "text", value: "H → the C with more H" },
        { kind: "op", value: "+" },
        { kind: "text", value: "X → the C with fewer H" },
      ],
      reading: "H⁺ adds first, to give the more stable carbocation (3° > 2° > 1°); X⁻ then joins it. Propene + HBr → 2-bromopropane; propene + H₂O (H⁺) → propan-2-ol.",
      assumptions: ["HX and acid-catalysed water", "No peroxide"],
      discoverable: true,
    },
    {
      id: "peroxide-effect",
      topic: "alkenes-addition",
      title: "Peroxide (Kharasch) effect",
      words: "with a peroxide, HBr adds the other way round, because Br• adds first to give the more stable radical",
      tokens: [
        { kind: "text", value: "HBr + peroxide" },
        { kind: "op", value: "=" },
        { kind: "text", value: "anti-Markovnikov (HBr only)" },
      ],
      reading: "Propene + HBr with benzoyl peroxide → 1-bromopropane. HCl and HI show no peroxide effect.",
      assumptions: ["Benzoyl peroxide as the initiator"],
    },
    {
      id: "ozonolysis",
      topic: "alkenes-addition",
      title: "Ozonolysis",
      words: "ozone, then zinc and water, cuts the C=C; each of its carbons becomes C=O",
      tokens: [
        { kind: "text", value: "R₂C=CR′₂ + O₃, then Zn/H₂O" },
        { kind: "op", value: "=" },
        { kind: "text", value: "R₂C=O + O=CR′₂" },
      ],
      reading: "Propene gives methanal + ethanal; 2-methylpropene gives methanal + propanone. The products show where the double bond was.",
      assumptions: ["Reductive work-up with zinc dust and water"],
    },
    {
      id: "alkyne-acidity",
      topic: "alkynes",
      title: "Acidity of terminal alkynes",
      words: "an sp carbon has 50% s character and holds electrons close, so its H leaves as H⁺ to a strong base",
      tokens: [
        { kind: "text", value: "HC≡CH > CH₂=CH₂ > CH₃CH₃" },
        { kind: "op", value: "·" },
        { kind: "text", value: "s character 50% > 33% > 25%" },
      ],
      reading: "HC≡CH + NaNH₂ → HC≡C⁻Na⁺ + NH₃. But-2-yne has no H on its sp carbons, so it does not react.",
      assumptions: ["Acidic only towards very strong bases like NaNH₂ and Na"],
      discoverable: true,
    },
    {
      id: "alkyne-reduction",
      topic: "alkynes",
      title: "Partial reduction of alkynes",
      words: "Lindlar's catalyst (poisoned Pd on charcoal) stops at the cis-alkene; sodium in liquid ammonia gives the trans-alkene",
      tokens: [
        { kind: "text", value: "Lindlar → cis-alkene" },
        { kind: "op", value: "·" },
        { kind: "text", value: "Na, liquid NH₃ → trans-alkene" },
      ],
      reading: "But-2-yne → cis-but-2-ene or trans-but-2-ene. Excess H₂ over Ni goes on to butane.",
      assumptions: ["Na with a terminal alkyne takes its acidic H first (sodium alkynide and H₂), as NCERT describes for ethyne"],
    },
    {
      id: "huckel",
      topic: "aromaticity",
      title: "Hückel's rule",
      words: "a planar ring with a p orbital on every atom is aromatic when it holds 4n + 2 π electrons (n = 0, 1, 2 …)",
      tokens: [
        { kind: "ref", id: "piElectrons" },
        { kind: "op", value: "=" },
        { kind: "text", value: "4n + 2" },
      ],
      reading: "Benzene 6 (n = 1), naphthalene 10 (n = 2), cyclopentadienyl anion 6: aromatic. Cyclobutadiene 4 is not; cyclooctatetraene (8) is tub-shaped, not planar.",
      assumptions: ["The π electrons are counted from a Kekulé structure: two per C=C, two for a ring carbanion's lone pair", "Cyclooctatetraene is drawn flat on the canvas but is really tub-shaped"],
      discoverable: true,
    },
    {
      id: "kekule",
      topic: "aromaticity",
      title: "Benzene's bond length",
      words: "all six C–C bonds are equal, between a single and a double bond: the π electrons are delocalised",
      tokens: [
        { kind: "ref", id: "bondBenzene" },
        { kind: "op", value: "=" },
        { kind: "text", value: "between C–C (154 pm) and C=C (134 pm)" },
      ],
      reading: "Neither Kekulé structure alone is benzene; the real molecule is their resonance hybrid, drawn with a circle in the ring.",
      assumptions: ["NCERT's bond lengths: C–C 154 pm, C=C 134 pm, C≡C 120 pm, benzene 139 pm"],
    },
    {
      id: "eas-mechanism",
      topic: "electrophilic-substitution",
      title: "Electrophilic substitution",
      words: "the electrophile is made; the ring's π electrons attack it to give a σ-complex; loss of H⁺ restores the aromatic ring",
      tokens: [
        { kind: "text", value: "C₆H₆ + E⁺" },
        { kind: "op", value: "=" },
        { kind: "text", value: "σ-complex → C₆H₅E + H⁺" },
      ],
      reading: "Nitration: NO₂⁺ from conc. HNO₃ and conc. H₂SO₄. Halogenation: Cl⁺ with anhydrous FeCl₃. Sulphonation: SO₃. Friedel–Crafts: CH₃⁺ or CH₃CO⁺ with anhydrous AlCl₃.",
      assumptions: ["How each electrophile forms is written in the usual summary equation", "Sulphonation's proton transfers are not shown"],
      discoverable: true,
    },
    {
      id: "directing",
      topic: "electrophilic-substitution",
      title: "Directing influence",
      words: "groups that give electrons to the ring direct to ortho and para; groups that pull them out direct to meta; halogens slow the ring but direct to ortho and para",
      tokens: [
        { kind: "text", value: "–OH, –NH₂, –OCH₃, –CH₃, –X: o/p" },
        { kind: "op", value: "·" },
        { kind: "text", value: "–NO₂, –CN, –CHO, –COOH: meta" },
      ],
      reading: "A +R group puts negative charge at ortho and para in its resonance structures; a −R group leaves them positive, so meta is attacked.",
      assumptions: ["The rule only: how much ortho against para product forms is not modelled"],
    },
  ],

  simulation: {
    model: "hydrocarbon",
    params: { mechanism: 0, alkene: 1, reagent: 2, alkyne: 1, alkyneReagent: 0, ring: 0, reaction: 0, substituent: 4 },
    playLabel: "Turn the back carbon",
  },

  visualization: {
    renderer: "hydrocarbon",
    hint: "Turn ethane with θ or Play; in the other modes pick from the lists and step through.",
    layers: [
      { id: "newman", label: "Newman projection" },
      { id: "mechanism", label: "Mechanism" },
      { id: "addition", label: "Alkene addition" },
      { id: "alkynes", label: "Alkynes" },
      { id: "rings", label: "Rings" },
      { id: "kekule", label: "Kekulé structures" },
      { id: "eas", label: "Substitution" },
      { id: "directing", label: "Directing groups" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    { id: "conformations", label: "Conformations", description: "Turn ethane about its C–C bond", layers: ["newman", "labels"], graphs: [], equations: ["torsional-energy"] },
    { id: "mechanisms", label: "Mechanisms", description: "Radical chains and ionic additions", layers: ["mechanism", "labels"], graphs: [], equations: ["free-radical-chain", "markovnikov", "peroxide-effect"] },
    { id: "addition", label: "Alkenes", description: "What adds across C=C, and which way", layers: ["addition", "labels"], graphs: [], equations: ["markovnikov", "peroxide-effect", "ozonolysis"] },
    { id: "alkynes", label: "Alkynes", description: "Acidic H, and cis or trans alkenes", layers: ["alkynes", "labels"], graphs: [], equations: ["alkyne-acidity", "alkyne-reduction"] },
    { id: "aromaticity", label: "Aromaticity", description: "Hückel's 4n + 2 rule", layers: ["rings", "labels"], graphs: [], equations: ["huckel"] },
    { id: "benzene", label: "Benzene", description: "Kekulé structures and bond lengths", layers: ["kekule", "labels"], graphs: [], equations: ["kekule"] },
    { id: "substitution", label: "Substitution", description: "E⁺, the σ-complex, loss of H⁺", layers: ["eas", "labels"], graphs: [], equations: ["eas-mechanism"] },
    { id: "directing", label: "Directing", description: "Ortho, meta or para?", layers: ["directing", "labels"], graphs: [], equations: ["directing"] },
  ],
  defaultMode: "conformations",
  graphs: [],

  activities: {
    observe: [
      {
        id: "eclipsed",
        prompt: "Turn ethane into an eclipsed conformation.",
        hint: "Line the back C–H bonds up behind the front ones.",
        condition: { type: "compare", quantity: "conformation", op: "eq", value: 0 },
      },
      {
        id: "anti-markovnikov",
        prompt: "Find an addition that goes against Markovnikov's rule.",
        hint: "Only one reagent does it, and only with a peroxide.",
        condition: { type: "compare", quantity: "orientation", op: "eq", value: 2 },
      },
      {
        id: "aromatic-ion",
        prompt: "Find an ion that is aromatic.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "aromatic", op: "eq", value: 1 },
            { type: "compare", quantity: "ringCharge", op: "neq", value: 0 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "to-staggered",
        question: "Turn ethane from eclipsed (0°) to staggered (60°). What happens to the torsional energy?",
        variable: "dihedral",
        from: 0,
        to: 60,
        quantity: "torsionalEnergy",
        options: ["increase", "decrease", "same"],
        mode: "conformations",
        explanation: "It falls from 12.5 kJ/mol to 0: in the staggered form the C–H bond pairs on the two carbons are as far apart as they can be.",
      },
      {
        id: "peroxide",
        question: "Propene + HBr: now add a peroxide. What happens to the locant of the Br in the product?",
        variable: "reagent",
        from: 2,
        to: 3,
        quantity: "xLocant",
        options: ["increase", "decrease", "same"],
        mode: "addition",
        given: { alkene: 1 },
        explanation: "It falls from 2 to 1: 2-bromopropane becomes 1-bromopropane. Br• adds first, to the CH₂ end, leaving the more stable 2° radical.",
      },
      {
        id: "sigma",
        question: "Nitration: NO₂⁺ attacks the ring. What happens to the number of sp³ carbons in the ring?",
        variable: "easStage",
        from: 0,
        to: 1,
        quantity: "ringSp3",
        options: ["increase", "decrease", "same"],
        mode: "substitution",
        given: { reaction: 0 },
        explanation: "It rises from 0 to 1: the carbon that NO₂ joins also keeps its H, so it is sp³ and the ring is no longer aromatic — until H⁺ leaves.",
      },
    ],

    experiment: {
      title: "Turning ethane",
      instructions: "Turn the back carbon from 0° to 180° and record θ, the torsional energy and the conformation at least every 30°.",
      columns: ["dihedral", "torsionalEnergy", "conformation"],
      minRows: 4,
      discovery: {
        question: "When is ethane's torsional energy highest?",
        choices: [
          { id: "eclipsed", label: "When eclipsed: every 120°, the bond pairs line up and repel", correct: true },
          { id: "staggered", label: "When staggered", correct: false },
          { id: "constant", label: "It does not change as the molecule turns", correct: false },
          { id: "once", label: "Only once a full turn", correct: false },
        ],
        reveals: "torsional-energy",
        insight: "Three maxima a turn, 12.5 kJ/mol high: small enough for ethane to turn freely at room temperature.",
      },
    },

    explain: [
      {
        id: "conformation",
        title: "The conformation",
        body: "At θ = {{dihedral}}° ethane is {{conformation}}: {{torsionalEnergy}} kJ/mol above the staggered form.",
      },
      {
        id: "mechanism",
        title: "This step",
        body: "A {{stageKind}} step: radicals made {{radicalChange}}; it leaves {{mechIntermediate}}.",
      },
      {
        id: "addition",
        title: "The addition",
        body: "Orientation: {{orientation}}, by way of a {{addDegree}}° {{addIntermediate}}; the new group is on C{{xLocant}}.",
        when: { type: "compare", quantity: "addIntermediate", op: "gt", value: 0 },
      },
      {
        id: "alkyne",
        title: "The alkyne",
        body: "Acidic H: {{acidicH}}. Reacts: {{reacts}}; the alkene formed: {{stereo}}; bond left: order {{bondAfter}}.",
      },
      {
        id: "ring",
        title: "Hückel's rule",
        body: "{{piElectrons}} π electrons ({{huckelN}}). Aromatic: {{aromatic}} — {{aromaticReason}}.",
      },
      {
        id: "substitution",
        title: "Substitution",
        body: "sp³ carbons in the ring: {{ringSp3}}; ring aromatic: {{ringIntact}}.",
      },
      {
        id: "directing",
        title: "The group on the ring",
        body: "It directs to {{directs}} and is {{activation}}. The position shown is favoured: {{favoured}}.",
      },
    ],

    challenges: [
      {
        id: "skew-energy",
        title: "Halfway up",
        prompt: "Find a skew conformation whose torsional energy is between 3 and 4 kJ/mol.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "torsionalEnergy", op: "gt", value: 3 },
            { type: "compare", quantity: "torsionalEnergy", op: "lt", value: 4 },
          ],
        },
        hint: "Somewhere between staggered (60°) and eclipsed — nearer the staggered end.",
        success: "E = 6.25 (1 + cos 3θ): about 39° (or 81°, 159° …) gives 3.5 kJ/mol.",
      },
      {
        id: "cis-alkene",
        title: "Make it cis",
        prompt: "Make cis-but-2-ene from an alkyne.",
        goal: { type: "compare", quantity: "stereo", op: "eq", value: 1 },
        hint: "A poisoned catalyst stops at the alkene.",
        success: "But-2-yne with H₂ over Lindlar's catalyst: both H add from the same side.",
      },
    ],
  },

  realWorld: [
    { title: "LPG and CNG", description: "Cooking gas is mostly butane and propane; CNG is mostly methane. Alkanes burn cleanly to CO₂ and water." },
    { title: "Oxy-acetylene welding", description: "Ethyne burnt in oxygen gives a flame of over 3000 °C, hot enough to cut and weld steel." },
    { title: "Testing for C=C", description: "Bromine water and Baeyer's reagent lose their colour with an alkene: a quick test for unsaturation." },
    { title: "From benzene to dyes and drugs", description: "Nitration of benzene, then reduction, gives aniline — the starting point for many dyes and medicines." },
  ],
});
