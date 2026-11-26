import { defineConcept } from "@ise/concept-schema";

const yesNo = { kind: "label" as const, labels: { "0": "no", "1": "yes" } };

/**
 * Ionic compounds, extracting metals and alloys, for class 10 (NCERT
 * science, "Metals and Non-metals", the sections after the reactivity
 * series).
 *
 * A metal atom gives its outer electrons to a non-metal atom, and the ions'
 * opposite charges hold the compound together; that is why ionic compounds
 * are hard, melt high, and conduct only when their ions can move. Then the
 * reactivity series decides how each metal is got out of its ore: by
 * electrolysis at the top, by roasting or calcining and then carbon in the
 * middle, by heating alone near the bottom, and not at all for gold, which
 * is found free. Last, alloys: brass, bronze, solder, steel and stainless
 * steel, and gold in carats.
 *
 * Simplifications, said plainly: the electrons move one after another, for
 * two atoms, when real compounds form from huge numbers at once; each ore is
 * treated as its pure mineral once the gangue is gone; alloy recipes are
 * typical ones (they vary); and the stages of extraction run on a dial, not
 * in real time. Melting and boiling points are NCERT's, except magnesium
 * oxide's, which NCERT does not give.
 *
 * The reactivity series itself, displacement, corrosion and the thermit
 * reaction as a redox example live in the Metals, Acids and Salts lab;
 * valency and writing formulae live in Atoms, Molecules and the Periodic
 * Table.
 */
export const ionsAndOres = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "ions-and-ores",
    title: "Ionic Compounds and Extracting Metals",
    tagline: "Metals give electrons to non-metals — and how reactive a metal is decides how we get it out of its ore.",
    domain: "chemistry",
    category: "reactions",
    grade: { min: 10, max: 10 },
    difficulty: "introductory",
    estimatedMinutes: 25,
    objective:
      "Draw how a metal atom gives electrons to a non-metal atom to form ions, explain the properties of ionic compounds, choose how a metal is extracted from its place in the reactivity series (electrolysis, roasting or calcination then carbon, heating alone), describe electrolytic refining, and say what common alloys are made of and what carats mean.",
    tags: ["ionic compounds", "ions", "electron transfer", "extraction of metals", "ores", "gangue", "roasting", "calcination", "electrolysis", "thermit", "refining", "alloys", "carat", "class 10"],
  },

  connections: [
    {
      id: "metals-acids-salts",
      title: "Metals, Acids and Salts",
      domain: "chemistry",
      relation: "prerequisite",
      note: "The reactivity series and displacement, which decide how each metal is extracted.",
      available: true,
    },
    {
      id: "atoms-and-the-table",
      title: "Atoms, Molecules and the Periodic Table",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Valency and writing formulae such as MgCl₂ by crossing valencies.",
      available: true,
    },
    {
      id: "structure-of-the-atom",
      title: "Structure of the Atom",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Electron shells: 2, 8, 8 — and why eight outer electrons are stable.",
      available: true,
    },
    {
      id: "lewis-structures",
      title: "Lewis Structures",
      domain: "chemistry",
      relation: "leads-to",
      note: "In class 11, ionic and covalent bonds are drawn with dots for every outer electron.",
      available: true,
    },
    {
      id: "electrolysis-and-conductance",
      title: "Electrolysis and Conductance",
      domain: "chemistry",
      relation: "leads-to",
      note: "How much metal a current deposits, and why molten and dissolved salts conduct.",
      available: true,
    },
  ],

  variables: [
    {
      id: "compound",
      symbol: "compound",
      name: "Ionic compound",
      meaning: "The metal and non-metal that react.",
      binding: { kind: "param", key: "compound" },
      control: {
        type: "choice",
        options: [
          { value: "nacl", label: "Sodium chloride (NaCl)" },
          { value: "licl", label: "Lithium chloride (LiCl)" },
          { value: "mgcl2", label: "Magnesium chloride (MgCl₂)" },
          { value: "cacl2", label: "Calcium chloride (CaCl₂)" },
          { value: "mgo", label: "Magnesium oxide (MgO)" },
          { value: "cao", label: "Calcium oxide (CaO)" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "form",
      symbol: "test",
      name: "In the circuit",
      meaning: "How the compound is put between the two electrodes.",
      binding: { kind: "param", key: "form" },
      control: {
        type: "choice",
        options: [
          { value: "solid", label: "Solid crystals" },
          { value: "molten", label: "Molten (melted)" },
          { value: "water", label: "Dissolved in water" },
          { value: "kerosene", label: "Stirred into kerosene" },
        ],
      },
      group: "primary",
      color: "angle",
    },
    {
      id: "ore",
      symbol: "ore",
      name: "Ore",
      meaning: "The ore the metal is taken from.",
      binding: { kind: "param", key: "ore" },
      control: {
        type: "choice",
        options: [
          { value: "rock-salt", label: "Rock salt (NaCl) → sodium" },
          { value: "magnesium-chloride", label: "Magnesium chloride (MgCl₂) → magnesium" },
          { value: "bauxite", label: "Bauxite (Al₂O₃) → aluminium" },
          { value: "zinc-blende", label: "Zinc blende (ZnS) → zinc" },
          { value: "calamine", label: "Calamine (ZnCO₃) → zinc" },
          { value: "haematite", label: "Haematite (Fe₂O₃) → iron" },
          { value: "galena", label: "Galena (PbS) → lead" },
          { value: "copper-glance", label: "Copper glance (Cu₂S) → copper" },
          { value: "cinnabar", label: "Cinnabar (HgS) → mercury" },
          { value: "native-gold", label: "Gold nuggets (Au) → gold" },
          { value: "thermit", label: "Thermit welding: Fe₂O₃ + aluminium" },
        ],
      },
      group: "primary",
      color: "secant",
    },
    {
      id: "alloy",
      symbol: "alloy",
      name: "Alloy",
      meaning: "A mixture of a metal with other metals, or with a non-metal.",
      binding: { kind: "param", key: "alloy" },
      control: {
        type: "choice",
        options: [
          { value: "brass", label: "Brass" },
          { value: "bronze", label: "Bronze" },
          { value: "solder", label: "Solder" },
          { value: "stainless", label: "Stainless steel" },
          { value: "steel", label: "Steel" },
          { value: "gold22", label: "22 carat gold" },
        ],
      },
      group: "primary",
      color: "curve",
    },
    {
      id: "carat",
      symbol: "carat",
      name: "Carats",
      meaning: "Parts of gold in 24 parts of the metal: 24 carat is pure gold.",
      binding: { kind: "state", key: "carat" },
      control: { type: "range", unit: "1", min: 1, max: 24, step: 1, presets: [14, 18, 22, 24] },
      group: "primary",
      color: "angle",
    },
    {
      id: "transfer",
      symbol: "e⁻ moved",
      name: "Electron transfer",
      meaning: "How far the metal's outer electrons have moved across, from 0 to 1.",
      binding: { kind: "state", key: "transfer" },
      control: { type: "range", unit: "1", min: 0, max: 1, step: 0.05, presets: [0, 0.5, 1] },
      group: "motion",
      color: "sine",
    },
    {
      id: "stage",
      symbol: "stage",
      name: "Stage",
      meaning: "How far the ore has got: 0 to 1 enrich, 1 to 2 convert to the oxide, 2 to 3 reduce, 3 to 4 refine.",
      binding: { kind: "state", key: "stage" },
      control: { type: "range", unit: "1", min: 0, max: 4, step: 0.1, presets: [0, 1, 2, 3, 4] },
      group: "motion",
      color: "secant",
    },
  ],

  quantities: [
    { id: "valency", symbol: "gives", name: "Electrons the metal gives", meaning: "The metal atom's outer electrons, all given away. This is its valency.", result: "valency", format: { kind: "integer" }, color: "sine", highlight: "ions", headline: true },
    { id: "gainEach", symbol: "takes", name: "Electrons each non-metal takes", meaning: "What each non-metal atom needs for eight outer electrons.", result: "gainEach", format: { kind: "integer" }, color: "cosine", highlight: "ions" },
    { id: "electronsMoved", symbol: "moved", name: "Electrons moved so far", meaning: "How many of the metal's electrons have gone across.", result: "electronsMoved", format: { kind: "integer" }, color: "sine", highlight: "ions", headline: true },
    { id: "metalCharge", symbol: "charge", name: "Charge on the metal", meaning: "Each electron given away leaves one more positive charge.", result: "metalCharge", format: { kind: "integer" }, color: "sine", highlight: "ions" },
    { id: "totalCharge", symbol: "total", name: "Total charge", meaning: "Positive charges minus negative charges, over all the atoms.", result: "totalCharge", format: { kind: "integer" }, color: "neutral", highlight: "ions" },
    { id: "ionsFormed", symbol: "ions?", name: "Ions formed", meaning: "Whether every atom now has a full outer shell.", result: "ionsFormed", format: yesNo, color: "tangent", highlight: "ions" },

    { id: "meltingPoint", symbol: "m.p.", name: "Melting point", meaning: "The temperature at which the solid melts. NCERT's table values; magnesium oxide, which NCERT does not list, is from data books.", result: "meltingPoint", format: { kind: "number", digits: 0 }, unit: "K", color: "angle", highlight: "properties", headline: true },
    { id: "boilingPoint", symbol: "b.p.", name: "Boiling point", meaning: "The temperature at which the liquid boils.", result: "boilingPoint", format: { kind: "number", digits: 0 }, unit: "K", color: "secant", highlight: "properties" },
    { id: "conducts", symbol: "bulb", name: "Conducts electricity", meaning: "Whether the bulb glows: only if the ions are free to move.", result: "conducts", format: { kind: "label", labels: { "0": "no: the bulb stays dark", "1": "yes: the bulb glows" } }, color: "angle", highlight: "properties", headline: true },
    { id: "inWater", symbol: "water", name: "In water", meaning: "What happens when the compound is stirred into water.", result: "inWater", format: { kind: "label", labels: { "0": "hardly dissolves", "1": "dissolves", "2": "reacts with the water" } }, color: "sine", highlight: "properties" },
    { id: "inKerosene", symbol: "kerosene", name: "In kerosene", meaning: "Ionic compounds do not dissolve in kerosene or petrol.", result: "inKerosene", format: { kind: "label", labels: { "0": "does not dissolve", "1": "dissolves" } }, color: "neutral", highlight: "properties" },

    { id: "reactivity", symbol: "rank", name: "Place in the series", meaning: "13 for potassium, the most reactive, down to 1 for gold.", result: "reactivity", format: { kind: "integer" }, color: "secant", highlight: "extraction", headline: true },
    { id: "method", symbol: "route", name: "How the metal is freed", meaning: "The step that turns the ore into metal.", result: "method", format: { kind: "label", labels: { "0": "electrolysis of the melt", "1": "reduction with carbon", "2": "heating alone", "3": "found free", "4": "displacement by aluminium" } }, color: "secant", highlight: "extraction", headline: true },
    { id: "oreKind", symbol: "mineral", name: "The mineral is", meaning: "What kind of compound the metal is found as.", result: "oreKind", format: { kind: "label", labels: { "0": "a chloride", "1": "an oxide", "2": "a sulphide", "3": "a carbonate", "4": "the metal itself" } }, color: "neutral", highlight: "extraction" },
    { id: "firstGas", symbol: "gas", name: "Gas given off on heating", meaning: "Roasting a sulphide gives sulphur dioxide; calcining a carbonate gives carbon dioxide.", result: "firstGas", format: { kind: "label", labels: { "0": "none", "1": "sulphur dioxide", "2": "carbon dioxide" } }, color: "neutral", highlight: "extraction" },
    { id: "metalPercent", symbol: "metal %", name: "Metal in the mineral", meaning: "The metal's share of the mineral's formula mass.", result: "metalPercent", format: { kind: "number", digits: 1 }, unit: "%", color: "secant", highlight: "extraction" },
    { id: "stageNow", symbol: "now", name: "Stage", meaning: "Which of the four stages the ore is in.", result: "stageIndex", format: { kind: "label", labels: { "0": "1: enrich", "1": "2: convert to the oxide", "2": "3: reduce to the metal", "3": "4: refine" } }, color: "secant", highlight: "extraction" },
    { id: "metalFormed", symbol: "metal", name: "Metal formed", meaning: "How much of the metal has been freed, from 0 to 1.", result: "metalFormed", format: { kind: "number", digits: 2 }, color: "tangent", highlight: "extraction" },
    { id: "refined", symbol: "refined", name: "Refined so far", meaning: "How much of the impure metal has moved to the pure cathode, from 0 to 1.", result: "refined", format: { kind: "number", digits: 2 }, color: "tangent", highlight: "refining", headline: true },

    { id: "mainPercent", symbol: "main %", name: "Main metal", meaning: "The share of the metal the others are melted into.", result: "mainPercent", format: { kind: "number", digits: 1 }, unit: "%", color: "curve", highlight: "alloys", headline: true },
    { id: "alloyMetals", symbol: "metals", name: "Metals in it", meaning: "How many different metals are mixed.", result: "alloyMetals", format: { kind: "integer" }, color: "curve", highlight: "alloys" },
    { id: "hasNonMetal", symbol: "non-metal?", name: "Has a non-metal", meaning: "Steel is iron with a little carbon, a non-metal.", result: "hasNonMetal", format: yesNo, color: "neutral", highlight: "alloys" },
    { id: "tinPercent", symbol: "tin %", name: "Tin", meaning: "The share of tin in the alloy.", result: "tinPercent", format: { kind: "number", digits: 1 }, unit: "%", color: "tangent", highlight: "alloys" },
    { id: "rusts", symbol: "rusts?", name: "Rusts", meaning: "Whether it rusts in moist air (only iron and its alloys rust).", result: "rusts", format: yesNo, color: "secant", highlight: "alloys" },

    { id: "goldPercent", symbol: "gold %", name: "Gold in it", meaning: "The share of gold: carats ÷ 24 × 100.", result: "goldPercent", format: { kind: "number", digits: 1 }, unit: "%", color: "angle", highlight: "carat", headline: true },
    { id: "otherParts", symbol: "other", name: "Parts of other metal", meaning: "Parts in 24 that are copper or silver.", result: "otherParts", format: { kind: "integer" }, color: "secant", highlight: "carat" },
  ],

  equations: [
    {
      id: "sodium-chloride",
      topic: "ionic-compounds",
      title: "Sodium chloride",
      words: "sodium atom + chlorine atom → sodium ion + chloride ion",
      tokens: [
        { kind: "text", value: "Na + Cl" },
        { kind: "op", value: "=" },
        { kind: "text", value: "Na⁺ + Cl⁻" },
      ],
      reading: "Sodium (2,8,1) gives its one outer electron to chlorine (2,8,7): Na → Na⁺ + e⁻ and Cl + e⁻ → Cl⁻. Now Na⁺ is 2,8 and Cl⁻ is 2,8,8: both have eight outer electrons, and their opposite charges hold them together.",
      assumptions: ["Only the outer shells are drawn", "Real salt forms from huge numbers of ions at once"],
      discoverable: true,
    },
    {
      id: "magnesium-oxide",
      topic: "ionic-compounds",
      title: "Magnesium oxide and magnesium chloride",
      words: "magnesium atom + oxygen atom → magnesium ion + oxide ion",
      tokens: [
        { kind: "text", value: "Mg + O" },
        { kind: "op", value: "=" },
        { kind: "text", value: "Mg²⁺ + O²⁻" },
      ],
      reading: "Magnesium (2,8,2) gives both its outer electrons to one oxygen atom (2,6): Mg → Mg²⁺ + 2e⁻ and O + 2e⁻ → O²⁻. A chlorine atom takes only one, so magnesium needs two of them: MgCl₂.",
      assumptions: ["Only the outer shells are drawn"],
    },
    {
      id: "ionic-charge",
      topic: "ionic-compounds",
      title: "Charge on the metal ion",
      words: "charge on the metal ion = electrons it has given away",
      tokens: [
        { kind: "ref", id: "metalCharge" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "electronsMoved" },
      ],
      reading: "Each electron that leaves takes one negative charge with it. The non-metal gains exactly the charge the metal loses, so the compound as a whole has no charge.",
      assumptions: ["One metal atom"],
    },
    {
      id: "electrolysis-melt",
      topic: "extraction-metals",
      title: "Electrolysis of a molten chloride",
      words: "molten sodium chloride, with a current → sodium + chlorine",
      tokens: [
        { kind: "text", value: "2NaCl" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2Na + Cl₂" },
      ],
      reading: "At the cathode, Na⁺ + e⁻ → Na; at the anode, 2Cl⁻ → Cl₂ + 2e⁻. Metals at the top of the series (K, Na, Ca, Mg, Al) cling to non-metals too tightly for carbon to pull them off, so electricity is used. Aluminium comes from its molten oxide: 2Al₂O₃ → 4Al + 3O₂.",
      assumptions: ["The compound must be molten, so its ions can move"],
    },
    {
      id: "roasting",
      topic: "extraction-metals",
      title: "Roasting a sulphide ore",
      words: "sulphide ore heated strongly in plenty of air → oxide + sulphur dioxide",
      tokens: [
        { kind: "text", value: "2ZnS + 3O₂" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2ZnO + 2SO₂" },
      ],
      reading: "Oxides are easier to reduce than sulphides, so a sulphide ore such as zinc blende is first roasted in air.",
      assumptions: ["Plenty of air"],
    },
    {
      id: "calcination",
      topic: "extraction-metals",
      title: "Calcining a carbonate ore",
      words: "carbonate ore heated strongly in limited air → oxide + carbon dioxide",
      tokens: [
        { kind: "text", value: "ZnCO₃" },
        { kind: "op", value: "=" },
        { kind: "text", value: "ZnO + CO₂" },
      ],
      reading: "A carbonate ore such as calamine is calcined: heated in limited air, it breaks down to the oxide.",
      assumptions: ["Limited air"],
    },
    {
      id: "carbon-reduction",
      topic: "extraction-metals",
      title: "Reduction with carbon",
      words: "metal oxide + carbon → metal + carbon monoxide",
      tokens: [
        { kind: "text", value: "ZnO + C" },
        { kind: "op", value: "=" },
        { kind: "text", value: "Zn + CO" },
      ],
      reading: "For metals in the middle of the series (Zn, Fe, Pb), carbon takes the oxygen from the oxide. Iron: Fe₂O₃ + 3C → 2Fe + 3CO.",
      assumptions: ["Heated strongly"],
      discoverable: true,
    },
    {
      id: "heating-alone",
      topic: "extraction-metals",
      title: "Heating alone",
      words: "oxide of a metal low in the series, heated → metal + oxygen",
      tokens: [
        { kind: "text", value: "2HgO" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2Hg + O₂" },
      ],
      reading: "Cinnabar is roasted first: 2HgS + 3O₂ → 2HgO + 2SO₂, and the oxide then falls apart on heating. Copper glance needs no carbon either: 2Cu₂S + 3O₂ → 2Cu₂O + 2SO₂, then 2Cu₂O + Cu₂S → 6Cu + SO₂.",
      assumptions: ["Metals low in the series, such as mercury and copper"],
    },
    {
      id: "thermit",
      topic: "extraction-metals",
      title: "The thermit reaction",
      words: "iron oxide + aluminium → iron + aluminium oxide + a lot of heat",
      tokens: [
        { kind: "text", value: "Fe₂O₃ + 2Al" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2Fe + Al₂O₃" },
      ],
      reading: "Aluminium is above iron in the series, so it takes the oxygen. So much heat is given out that the iron comes out molten — enough to join railway tracks or cracked machine parts.",
      assumptions: ["Started with a fuse; then it keeps itself going"],
    },
    {
      id: "refining",
      topic: "extraction-metals",
      title: "Electrolytic refining",
      words: "impure copper anode → copper ions → pure copper cathode",
      tokens: [
        { kind: "text", value: "Cu (impure anode)" },
        { kind: "op", value: "=" },
        { kind: "text", value: "Cu²⁺ + 2e⁻" },
      ],
      reading: "At the impure anode, Cu → Cu²⁺ + 2e⁻. In the acidified copper sulphate the ions cross to the thin pure cathode: Cu²⁺ + 2e⁻ → Cu. Soluble impurities stay in the solution; insoluble ones fall as anode mud.",
      assumptions: ["Zinc, tin, nickel, silver and gold are refined the same way"],
    },
    {
      id: "metal-share",
      topic: "extraction-metals",
      title: "Metal in an ore",
      words: "metal % = mass of the metal atoms ÷ formula mass × 100",
      tokens: [
        { kind: "ref", id: "metalPercent" },
        { kind: "op", value: "=" },
        { kind: "text", value: "mass of the metal atoms" },
        { kind: "op", value: "/" },
        { kind: "text", value: "formula mass × 100" },
      ],
      reading: "In Fe₂O₃ the iron is 2 × 56 = 112 u of 112 + 3 × 16 = 160 u, so 70% of haematite's mass is iron.",
      assumptions: ["The pure mineral, after the gangue is removed", "School atomic masses (Fe 56, O 16, Zn 65, S 32)"],
    },
    {
      id: "alloy",
      topic: "alloys",
      title: "Alloys",
      words: "alloy = a metal melted together with other metals, or with a non-metal",
      tokens: [
        { kind: "text", value: "brass" },
        { kind: "op", value: "=" },
        { kind: "text", value: "copper + zinc" },
      ],
      reading: "Bronze is copper and tin; solder is lead and tin; stainless steel is iron, chromium and nickel; steel is iron and a little carbon. An alloy of mercury is called an amalgam. Alloys are harder than the pure metal, and conduct electricity less well.",
      assumptions: ["Recipes vary; these are typical"],
    },
    {
      id: "carat",
      topic: "alloys",
      title: "Carats",
      words: "gold % = carats ÷ 24 × 100",
      tokens: [
        { kind: "ref", id: "goldPercent" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "carat" },
        { kind: "op", value: "/" },
        { kind: "text", value: "24 × 100" },
      ],
      reading: "Pure gold is 24 carat, and too soft for jewellery. 22 carat gold is 22 parts gold and 2 parts copper or silver: 91.7% gold.",
      assumptions: ["Parts by mass"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "metallurgy",
    params: { compound: "nacl", form: "solid", ore: "zinc-blende", alloy: "brass" },
    playLabel: "Run it",
  },

  visualization: {
    renderer: "metallurgy",
    hint: "Pick a compound, an ore or an alloy, then press play or move the slider.",
    layers: [
      { id: "ions", label: "Electrons" },
      { id: "properties", label: "Properties" },
      { id: "extraction", label: "Extraction" },
      { id: "refining", label: "Refining" },
      { id: "alloys", label: "Alloys" },
      { id: "carat", label: "Carats" },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    { id: "ions", label: "Giving electrons", description: "A metal gives its outer electrons to a non-metal", layers: ["ions", "labels"], graphs: [], equations: ["sodium-chloride", "magnesium-oxide", "ionic-charge"] },
    { id: "properties", label: "Properties", description: "Melting, dissolving and conducting", layers: ["properties", "labels"], graphs: [], equations: [] },
    { id: "extraction", label: "Extraction", description: "From ore to metal, by the reactivity series", layers: ["extraction", "labels"], graphs: [], equations: ["electrolysis-melt", "roasting", "calcination", "carbon-reduction", "heating-alone", "thermit", "metal-share"] },
    { id: "refining", label: "Refining", description: "Purifying a metal by electrolysis", layers: ["refining", "labels"], graphs: [], equations: ["refining"] },
    { id: "alloys", label: "Alloys", description: "What brass, bronze, solder and steel are made of", layers: ["alloys", "labels"], graphs: [], equations: ["alloy"] },
    { id: "carat", label: "Carats", description: "How pure is the gold?", layers: ["carat", "labels"], graphs: [], equations: ["carat"] },
  ],
  defaultMode: "ions",
  graphs: [],

  activities: {
    observe: [
      {
        id: "full-shells",
        prompt: "Make magnesium oxide: move both of magnesium's electrons across.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "compound", op: "eq", value: 4 },
            { type: "compare", quantity: "ionsFormed", op: "eq", value: 1 },
          ],
        },
      },
      {
        id: "bulb-glows",
        prompt: "Make the bulb glow with an ionic compound.",
        condition: { type: "compare", quantity: "conducts", op: "eq", value: 1 },
      },
      {
        id: "pure-metal",
        prompt: "Take an ore all the way to pure metal on the cathode.",
        condition: { type: "compare", quantity: "refined", op: "gte", value: 1 },
      },
    ],

    predict: [
      {
        id: "charge-stays-zero",
        question: "Magnesium gives its two electrons to two chlorine atoms. As they move across, what happens to the total charge?",
        variable: "transfer",
        from: 0,
        to: 1,
        quantity: "totalCharge",
        options: ["increase", "decrease", "same"],
        mode: "ions",
        given: { compound: "mgcl2" },
        explanation: "It stays at 0 the whole time. Magnesium ends up +2 and each chlorine −1: whatever charge one atom gains, another loses.",
      },
      {
        id: "gold-share",
        question: "A jeweller turns 24 carat gold into 18 carat. What happens to the share of gold?",
        variable: "carat",
        from: 24,
        to: 18,
        quantity: "goldPercent",
        options: ["increase", "decrease", "same"],
        mode: "carat",
        explanation: "It falls from 100% to 75%: only 18 of the 24 parts are now gold.",
      },
    ],

    experiment: {
      title: "How does each metal come out?",
      instructions: "Try different ores. Record where the metal sits in the reactivity series, and how it is freed.",
      columns: ["reactivity", "method"],
      minRows: 4,
      discovery: {
        question: "What decides how a metal is extracted from its ore?",
        choices: [
          { id: "series", label: "Its place in the reactivity series", correct: true },
          { id: "colour", label: "The colour of the ore", correct: false },
          { id: "heavy", label: "How heavy the metal is", correct: false },
          { id: "price", label: "How much the metal costs", correct: false },
        ],
        reveals: "carbon-reduction",
        insight: "The most reactive metals (potassium to aluminium) need electrolysis; the middle ones (zinc, iron, lead) give up their oxygen to carbon; copper and mercury need only heat; gold is found free.",
      },
    },

    explain: [
      { id: "ions", title: "Giving electrons", body: "The metal gives {{valency}} electron(s), and each non-metal atom takes {{gainEach}}. Moved so far: {{electronsMoved}}. Total charge: {{totalCharge}}." },
      { id: "properties", title: "Properties", body: "It melts at {{meltingPoint}} and boils at {{boilingPoint}}. Does the bulb glow? {{conducts}}. In water it {{inWater}}; in kerosene it {{inKerosene}}." },
      { id: "extraction", title: "From ore to metal", body: "This metal is number {{reactivity}} in the series. The mineral is {{oreKind}}. Route: {{method}}. The metal is {{metalPercent}} of the mineral's mass." },
      { id: "refining", title: "Refining", body: "Refined so far: {{refined}}." },
      { id: "alloys", title: "Alloys", body: "The main metal is {{mainPercent}} of it, with {{alloyMetals}} metal(s) in all. Has a non-metal: {{hasNonMetal}}. Rusts: {{rusts}}." },
      { id: "carat", title: "Carats", body: "This gold is {{goldPercent}} gold, with {{otherParts}} parts in 24 of copper or silver." },
    ],

    challenges: [
      {
        id: "no-carbon-needed",
        title: "Roast, but no carbon",
        prompt: "Find an ore that gives off sulphur dioxide when roasted, but needs no carbon to become metal.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "firstGas", op: "eq", value: 1 },
            { type: "compare", quantity: "method", op: "eq", value: 2 },
          ],
        },
        hint: "Look near the bottom of the series.",
        success: "Cinnabar or copper glance. After roasting, heating alone finishes the job: 2HgO → 2Hg + O₂.",
      },
    ],
  },

  realWorld: [
    { title: "Welding railway tracks", description: "Iron oxide and aluminium powder are packed round the gap between two rails and lit. The molten iron from the thermit reaction fills the gap." },
    { title: "Aluminium needs electricity", description: "Carbon cannot take oxygen from aluminium oxide, so aluminium is made by electrolysis. That uses so much electricity that recycling a can saves most of it." },
    { title: "Copper wires", description: "Copper for electric wires is refined by electrolysis, because even small impurities make it a poorer conductor." },
    { title: "Hallmarked jewellery", description: "Gold jewellery in India is stamped with its carat, such as 22K. Pure 24 carat gold is too soft and bends easily." },
    { title: "Solder in electronics", description: "Solder, an alloy of tin and lead, melts at a lower temperature than either metal, so it joins wires without harming them. Lead-free solders are now common." },
  ],
});
