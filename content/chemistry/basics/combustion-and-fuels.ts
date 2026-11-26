import { defineConcept } from "@ise/concept-schema";

const yesNo = { kind: "label" as const, labels: { "0": "no", "1": "yes" } };
const SIDES = { "0": "nothing", "1": "the fuel", "2": "the air (oxygen)", "3": "the heat" };

/**
 * Combustion, fuels and flames, for class 8 (NCERT science, "Combustion and
 * Flame" and "Coal and Petroleum").
 *
 * The fire triangle — a fuel, air and heat up to the ignition temperature —
 * tried on ten materials; a candle under a jar; water in a paper cup that
 * will not burn; a probe moved through the three zones of a candle flame;
 * putting out fires, and why water is wrong for electrical and petrol fires;
 * fuels compared by their calorific value and by what they leave in the air;
 * and what coal and petroleum are turned into.
 *
 * Simplifications, stated in the lab: ignition temperatures are typical,
 * rounded values (for liquids and LPG, the temperature at which their vapour
 * catches fire from a small flame); nothing burns below 16 % oxygen; the
 * candle uses 5 mL of oxygen a second; the paper cup's heating rates are
 * illustrative; the flame is three nested ovals; and where NCERT gives a range
 * of calorific values, the middle is used.
 */
export const combustionAndFuels = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "combustion-and-fuels",
    title: "Combustion, Fuels and Flames",
    tagline: "What a fire needs, what is inside a flame, how to put a fire out, and which fuel gives the most heat.",
    domain: "chemistry",
    category: "reactions",
    grade: { min: 8, max: 8 },
    difficulty: "introductory",
    estimatedMinutes: 25,
    objective:
      "Name the three things burning needs and use ignition temperature to explain why some things catch fire easily; explain why a covered candle goes out and why a paper cup of water does not burn; name the three zones of a candle flame; choose the right way to put out a fire; compare fuels by calorific value (heat = mass × calorific value) and by pollution; and know the products of coal and petroleum.",
    tags: ["combustion", "ignition temperature", "inflammable", "fire triangle", "flame", "fire extinguisher", "fuel", "calorific value", "coal", "petroleum", "class 8"],
  },

  connections: [
    {
      id: "materials-and-particles",
      title: "Materials, Mixtures and Particles",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Rusting needs air too: oxygen joins with things in more ways than one.",
      available: true,
    },
    {
      id: "carbon-compounds",
      title: "Carbon and its Compounds",
      domain: "chemistry",
      relation: "leads-to",
      note: "In class 10, the fuels here turn out to be carbon compounds, and a sooty flame means too little air.",
      available: true,
    },
    {
      id: "enthalpy-and-hess",
      title: "Enthalpy and Hess's Law",
      domain: "chemistry",
      relation: "leads-to",
      note: "In class 11, calorific value becomes the enthalpy of combustion.",
      available: true,
    },
  ],

  variables: [
    {
      id: "material",
      symbol: "material",
      name: "Material",
      meaning: "What you try to set on fire.",
      binding: { kind: "param", key: "material" },
      control: {
        type: "choice",
        options: [
          { value: "lpg", label: "LPG (cooking gas)" },
          { value: "petrol", label: "Petrol" },
          { value: "alcohol", label: "Alcohol" },
          { value: "kerosene", label: "Kerosene" },
          { value: "paper", label: "Paper" },
          { value: "wood", label: "Wood" },
          { value: "charcoal", label: "Charcoal" },
          { value: "stone", label: "Stone" },
          { value: "glass", label: "Glass" },
          { value: "iron-nail", label: "Iron nail" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "temperature",
      symbol: "T",
      name: "Heated to",
      meaning: "How hot the material is made.",
      binding: { kind: "param", key: "temperature" },
      control: { type: "range", unit: "degC", min: 20, max: 500, step: 5, presets: [30, 40, 230, 300] },
      group: "primary",
      color: "angle",
    },
    {
      id: "oxygen",
      symbol: "O₂",
      name: "Oxygen in the air",
      meaning: "The share of the air around it that is oxygen. Fresh air has 21 %.",
      binding: { kind: "param", key: "oxygen" },
      control: { type: "range", unit: "%", min: 0, max: 21, step: 0.5, presets: [21, 16, 10] },
      group: "primary",
      color: "sine",
    },
    {
      id: "jar",
      symbol: "jar",
      name: "Candle",
      meaning: "A burning candle, in the open air or covered by a glass jar.",
      binding: { kind: "param", key: "jar" },
      control: { type: "choice", options: [{ value: "open", label: "In the open air" }, { value: "closed", label: "Under a jar" }] },
      group: "primary",
      color: "sine",
    },
    {
      id: "jarVolume",
      symbol: "V",
      name: "Size of the jar",
      meaning: "How much air the jar holds.",
      binding: { kind: "param", key: "jarVolume" },
      control: { type: "range", unit: "L", min: 0.25, max: 2, step: 0.25, presets: [0.5, 1, 2] },
      group: "primary",
      color: "sine",
    },
    {
      id: "cup",
      symbol: "cup",
      name: "Paper cup",
      meaning: "A paper cup held over a flame, with water in it or empty.",
      binding: { kind: "param", key: "cup" },
      control: { type: "choice", options: [{ value: "water", label: "With water" }, { value: "empty", label: "Empty" }] },
      group: "primary",
      color: "cosine",
    },
    {
      id: "probeX",
      symbol: "x",
      name: "Probe: sideways",
      meaning: "How far the probe is from the middle of the flame.",
      binding: { kind: "param", key: "probeX" },
      control: { type: "range", unit: "mm", min: -15, max: 15, step: 0.5 },
      group: "primary",
      color: "point",
    },
    {
      id: "probeY",
      symbol: "y",
      name: "Probe: height",
      meaning: "How far above the wick the probe is.",
      binding: { kind: "param", key: "probeY" },
      control: { type: "range", unit: "mm", min: 0, max: 60, step: 1 },
      group: "primary",
      color: "point",
    },
    {
      id: "fire",
      symbol: "fire",
      name: "The fire",
      meaning: "What is burning.",
      binding: { kind: "param", key: "fire" },
      control: {
        type: "choice",
        options: [
          { value: "wood", label: "Burning wood" },
          { value: "paper", label: "Burning paper" },
          { value: "electrical", label: "Electrical fire" },
          { value: "petrol", label: "Burning petrol" },
          { value: "gas-stove", label: "Gas stove fire" },
        ],
      },
      group: "primary",
      color: "secant",
    },
    {
      id: "agent",
      symbol: "use",
      name: "Put it out with",
      meaning: "What you try in order to put the fire out.",
      binding: { kind: "param", key: "agent" },
      control: {
        type: "choice",
        options: [
          { value: "water", label: "Water" },
          { value: "sand", label: "Sand" },
          { value: "co2", label: "CO₂ extinguisher" },
          { value: "shut-off", label: "Shut off the supply" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "fuel",
      symbol: "fuel",
      name: "Fuel",
      meaning: "A fuel from NCERT's table of calorific values.",
      binding: { kind: "param", key: "fuel" },
      control: {
        type: "choice",
        options: [
          { value: "dung", label: "Cow dung cake" },
          { value: "wood", label: "Wood" },
          { value: "coal", label: "Coal" },
          { value: "biogas", label: "Biogas" },
          { value: "kerosene", label: "Kerosene" },
          { value: "petrol", label: "Petrol" },
          { value: "diesel", label: "Diesel" },
          { value: "cng", label: "CNG" },
          { value: "lpg", label: "LPG" },
          { value: "hydrogen", label: "Hydrogen" },
        ],
      },
      group: "primary",
      color: "angle",
    },
    {
      id: "mass",
      symbol: "m",
      name: "Mass of fuel",
      meaning: "How much of the fuel is burnt.",
      binding: { kind: "param", key: "mass" },
      control: { type: "range", unit: "kg", min: 0, max: 10, step: 0.1, presets: [1, 2, 5] },
      group: "primary",
      color: "tangent",
    },
    {
      id: "product",
      symbol: "product",
      name: "Product",
      meaning: "Something made from coal or from petroleum.",
      binding: { kind: "param", key: "product" },
      control: {
        type: "choice",
        options: [
          { value: "coke", label: "Coke (from coal)" },
          { value: "coal-tar", label: "Coal tar" },
          { value: "coal-gas", label: "Coal gas" },
          { value: "lpg", label: "LPG (from petroleum)" },
          { value: "petrol", label: "Petrol" },
          { value: "kerosene", label: "Kerosene" },
          { value: "diesel", label: "Diesel" },
          { value: "lubricating-oil", label: "Lubricating oil" },
          { value: "paraffin-wax", label: "Paraffin wax" },
          { value: "bitumen", label: "Bitumen" },
        ],
      },
      group: "primary",
      color: "curve",
    },
    {
      id: "time",
      symbol: "t",
      name: "Time",
      meaning: "Seconds since the jar went over the candle, or the cup went on the flame.",
      binding: { kind: "state", key: "time" },
      control: { type: "range", unit: "s", min: 0, max: 300, step: 1, presets: [0, 10, 60, 240] },
      group: "motion",
      color: "angle",
    },
  ],

  quantities: [
    { id: "burning", symbol: "fire?", name: "Burning", meaning: "Whether it is on fire.", result: "burning", format: { kind: "label", labels: { "0": "not burning", "1": "burning" } }, color: "secant", highlight: "burn", headline: true },
    { id: "missing", symbol: "missing", name: "What is missing", meaning: "The side of the fire triangle that is not there.", result: "missing", format: { kind: "label", labels: { "0": "nothing: it burns", "1": "a fuel: it is not combustible", "2": "enough air (oxygen)", "3": "heat up to its ignition temperature" } }, color: "secant", highlight: "burn", headline: true },
    { id: "combustible", symbol: "fuel?", name: "Combustible", meaning: "Whether it can burn at all.", result: "combustible", format: { kind: "label", labels: { "0": "non-combustible", "1": "combustible" } }, color: "neutral", highlight: "burn" },
    { id: "ignitionTemp", symbol: "T(ignite)", name: "Ignition temperature", meaning: "The lowest temperature at which it catches fire (typical, rounded).", result: "ignitionTemp", format: { kind: "number", digits: 0 }, unit: "degC", color: "angle", highlight: "burn" },
    { id: "inflammable", symbol: "inflammable?", name: "Inflammable", meaning: "Catches fire from a flame even at room temperature.", result: "inflammable", format: yesNo, color: "secant", highlight: "burn" },

    { id: "jarOxygen", symbol: "O₂", name: "Oxygen in the jar", meaning: "The share of the jar's air that is still oxygen.", result: "jarOxygen", format: { kind: "number", digits: 1 }, unit: "%", color: "sine", highlight: "jar", headline: true },
    { id: "candleLit", symbol: "lit?", name: "Candle", meaning: "Whether the candle is still burning.", result: "candleLit", format: { kind: "label", labels: { "0": "out", "1": "alight" } }, color: "angle", highlight: "jar" },
    { id: "burnTime", symbol: "t(out)", name: "Lasts under a closed jar", meaning: "How long the candle burns under a closed jar this size.", result: "burnTime", format: { kind: "number", digits: 1 }, unit: "s", color: "angle", highlight: "jar", headline: true },

    { id: "cupTemp", symbol: "T(paper)", name: "Temperature of the paper", meaning: "How hot the paper cup is.", result: "cupTemp", format: { kind: "number", digits: 0 }, unit: "degC", color: "secant", highlight: "cup", headline: true },
    { id: "cupBurning", symbol: "cup", name: "The cup", meaning: "Whether the paper has caught fire.", result: "cupBurning", format: { kind: "label", labels: { "0": "not burning", "1": "on fire" } }, color: "secant", highlight: "cup" },

    { id: "zone", symbol: "zone", name: "Probe is in", meaning: "The part of the candle flame the probe is in.", result: "zone", format: { kind: "label", labels: { "0": "outside the flame", "1": "the dark zone: unburnt wax vapour", "2": "the luminous zone: partial burning", "3": "the outer non-luminous zone: complete burning, hottest" } }, color: "angle", highlight: "flame", headline: true },

    { id: "fireOut", symbol: "out?", name: "The fire", meaning: "Whether it went out.", result: "fireOut", format: { kind: "label", labels: { "0": "still burning", "1": "out" } }, color: "tangent", highlight: "fire", headline: true },
    { id: "sideRemoved", symbol: "removes", name: "Takes away", meaning: "The side of the fire triangle the method takes away.", result: "sideRemoved", format: { kind: "label", labels: SIDES }, color: "sine", highlight: "fire" },
    { id: "waterSafe", symbol: "water?", name: "Safe to use water", meaning: "Whether water may be used on this fire.", result: "waterSafe", format: yesNo, color: "sine", highlight: "fire" },

    { id: "calorific", symbol: "CV", name: "Calorific value (kJ/kg)", meaning: "Heat given by burning 1 kg of the fuel completely. The middle of NCERT's range when it gives one.", result: "calorific", format: { kind: "number", digits: 0 }, color: "angle", highlight: "fuel", headline: true },
    { id: "heat", symbol: "Q", name: "Heat given (kJ)", meaning: "Heat from burning this mass of fuel.", result: "heat", format: { kind: "number", digits: 0 }, color: "tangent", highlight: "fuel", headline: true },
    { id: "pollution", symbol: "pollution", name: "Pollution", meaning: "How much smoke, ash and harmful gas it leaves in the air.", result: "pollution", format: { kind: "label", labels: { "0": "none: only water", "1": "little", "2": "some", "3": "a lot" } }, color: "secant", highlight: "fuel" },
    { id: "so2", symbol: "SO₂?", name: "Gives sulphur dioxide", meaning: "Coal and diesel give sulphur dioxide, which causes acid rain.", result: "so2", format: yesNo, color: "secant", highlight: "fuel" },
    { id: "fossil", symbol: "fossil?", name: "Fossil fuel", meaning: "Formed from dead living things over millions of years. It will run out.", result: "fossil", format: yesNo, color: "neutral", highlight: "fuel" },
    { id: "fuelState", symbol: "state", name: "State", meaning: "Solid, liquid or gas.", result: "fuelState", format: { kind: "label", labels: { "0": "solid", "1": "liquid", "2": "gas" } }, color: "neutral", highlight: "fuel" },

    { id: "productSource", symbol: "from", name: "Made from", meaning: "Whether it comes from coal or from petroleum.", result: "productSource", format: { kind: "label", labels: { "0": "coal", "1": "petroleum" } }, color: "curve", highlight: "products", headline: true },
  ],

  equations: [
    {
      id: "fire-triangle",
      topic: "combustion-conditions",
      title: "The fire triangle",
      words: "fuel + air (oxygen) + heat up to the ignition temperature → fire",
      tokens: [
        { kind: "text", value: "fuel" },
        { kind: "op", value: "+" },
        { kind: "text", value: "oxygen" },
        { kind: "op", value: "+" },
        { kind: "text", value: "heat to the ignition temperature" },
        { kind: "op", value: "=" },
        { kind: "text", value: "fire" },
      ],
      reading: "Take away any one of the three and burning stops.",
      assumptions: ["Ignition temperatures here are typical values; they vary from sample to sample"],
      discoverable: true,
    },
    {
      id: "burning-charcoal",
      topic: "combustion-conditions",
      title: "Combustion",
      words: "a substance + oxygen → new substances + heat + light",
      tokens: [
        { kind: "text", value: "C + O₂" },
        { kind: "op", value: "=" },
        { kind: "text", value: "CO₂ + heat + light" },
      ],
      reading: "Charcoal burning in air. Combustion is a chemical change in which a substance reacts with oxygen and gives off heat.",
      assumptions: ["Plenty of air; with too little, poisonous carbon monoxide forms"],
    },
    {
      id: "candle-jar",
      topic: "combustion-conditions",
      title: "A candle under a jar",
      words: "time the candle lasts = 10 s for every litre of air in the jar",
      tokens: [
        { kind: "ref", id: "burnTime" },
        { kind: "op", value: "=" },
        { kind: "text", value: "10 s/L" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "jarVolume" },
      ],
      reading: "Each litre of air can lose 50 mL of oxygen (from 21 % down to 16 %) before the flame dies. A small candle uses about 5 mL a second.",
      assumptions: ["A candle using 5 mL of oxygen a second", "It goes out at 16 % oxygen"],
    },
    {
      id: "paper-cup",
      topic: "combustion-conditions",
      title: "Water in a paper cup",
      words: "the paper cannot get hotter than the boiling water, 100 °C",
      tokens: [
        { kind: "text", value: "paper with water in it" },
        { kind: "op", value: "=" },
        { kind: "text", value: "at most 100 °C, below its ignition temperature" },
      ],
      reading: "The heat goes into the water. The paper stays far below the 230 °C it needs, so the cup does not burn.",
      assumptions: ["The heating rates shown are illustrative"],
    },
    {
      id: "flame-zones",
      topic: "flame-zones",
      title: "The zones of a candle flame",
      words: "outer zone: complete burning, hottest; middle: partial burning, gives light; inner: unburnt wax vapour",
      tokens: [
        { kind: "text", value: "hottest" },
        { kind: "op", value: "=" },
        { kind: "text", value: "outer non-luminous zone, where the wax burns completely" },
      ],
      reading: "The bright yellow middle zone burns only partly: unburnt carbon glows and leaves soot. The dark zone next to the wick does not burn at all.",
      assumptions: ["The flame is drawn as three nested ovals"],
    },
    {
      id: "fire-control",
      topic: "fire-control",
      title: "Putting out a fire",
      words: "take away the fuel, or cut off the air, or cool it below its ignition temperature",
      tokens: [
        { kind: "text", value: "fire out" },
        { kind: "op", value: "=" },
        { kind: "text", value: "no fuel, or no air, or too cool to burn" },
      ],
      reading: "Water cools burning wood and paper. Never use it on electrical fires (it conducts) or petrol fires (petrol floats on it). CO₂, heavier than air, smothers those.",
      assumptions: ["Always switch off the electricity or the gas first"],
      discoverable: true,
    },
    {
      id: "calorific-value",
      topic: "fuels-calorific",
      title: "Heat from a fuel",
      words: "heat given = mass of fuel × calorific value",
      tokens: [
        { kind: "ref", id: "heat" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "mass" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "calorific" },
      ],
      reading: "The calorific value is the heat from burning 1 kg of a fuel completely, in kilojoules per kilogram (kJ/kg).",
      assumptions: ["Complete burning", "The middle of NCERT's range for cow dung cake, wood, coal and biogas"],
      discoverable: true,
    },
    {
      id: "coal-products",
      topic: "coal-petroleum",
      title: "Products of coal",
      words: "coal, heated without air → coke + coal tar + coal gas",
      tokens: [
        { kind: "text", value: "coal (heated without air)" },
        { kind: "op", value: "=" },
        { kind: "text", value: "coke + coal tar + coal gas" },
      ],
      reading: "Coke is almost pure carbon, used to make steel. Coal tar gives dyes, paints and naphthalene balls. Coal gas is a fuel.",
      assumptions: ["Done in industry; heated in air, coal simply burns to carbon dioxide"],
    },
    {
      id: "petroleum-fractions",
      topic: "coal-petroleum",
      title: "Refining petroleum",
      words: "petroleum → LPG, petrol, kerosene, diesel, lubricating oil, paraffin wax, bitumen",
      tokens: [
        { kind: "text", value: "petroleum" },
        { kind: "op", value: "=" },
        { kind: "text", value: "LPG + petrol + kerosene + diesel + lubricating oil + paraffin wax + bitumen" },
      ],
      reading: "A refinery separates petroleum into these parts. The lightest, LPG, collects at the top of the column; bitumen stays at the bottom.",
      assumptions: ["Natural gas is found with petroleum and is used as CNG"],
    },
  ],

  simulation: {
    model: "combustion",
    params: { material: "wood", temperature: 30, oxygen: 21, jar: "closed", jarVolume: 1, cup: "water", probeX: 0, probeY: 25, fire: "wood", agent: "water", fuel: "lpg", mass: 1, product: "petrol" },
    playLabel: "Start the clock",
  },

  visualization: {
    renderer: "combustion",
    hint: "Pick a material, a fire or a fuel, then move the sliders.",
    layers: [
      { id: "burn", label: "Fire triangle" },
      { id: "jar", label: "Candle and jar" },
      { id: "cup", label: "Paper cup" },
      { id: "flame", label: "Candle flame" },
      { id: "fire", label: "Fire fighting" },
      { id: "fuel", label: "Fuels" },
      { id: "products", label: "Coal and petroleum" },
      { id: "labels", label: "Labels", optional: true },
    ],
  },

  modes: [
    { id: "burn", label: "What burning needs", description: "Fuel, air and heat", layers: ["burn", "labels"], graphs: [], equations: ["fire-triangle", "burning-charcoal"] },
    { id: "jar", label: "Candle in a jar", description: "Watch the oxygen run out", layers: ["jar", "labels"], graphs: [], equations: ["candle-jar", "fire-triangle"] },
    { id: "cup", label: "Paper cup", description: "Boil water in a paper cup", layers: ["cup", "labels"], graphs: [], equations: ["paper-cup"] },
    { id: "flame", label: "Flame", description: "The three zones of a candle flame", layers: ["flame", "labels"], graphs: [], equations: ["flame-zones"] },
    { id: "fire", label: "Put it out", description: "The right way to fight each fire", layers: ["fire", "labels"], graphs: [], equations: ["fire-control"] },
    { id: "fuel", label: "Fuels", description: "Calorific value and pollution", layers: ["fuel", "labels"], graphs: [], equations: ["calorific-value"] },
    { id: "products", label: "Coal and petroleum", description: "What they are turned into", layers: ["products", "labels"], graphs: [], equations: ["coal-products", "petroleum-fractions"] },
  ],
  defaultMode: "burn",
  graphs: [],

  activities: {
    observe: [
      {
        id: "light-kerosene",
        prompt: "Warm kerosene just enough to make it catch fire.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "material", op: "eq", value: 3 },
            { type: "compare", quantity: "burning", op: "eq", value: 1 },
          ],
        },
      },
      {
        id: "candle-out",
        prompt: "Cover the candle with a jar and wait for it to go out.",
        condition: { type: "compare", quantity: "candleLit", op: "eq", value: 0 },
      },
      {
        id: "hottest",
        prompt: "Put the probe in the hottest part of the flame.",
        condition: { type: "compare", quantity: "zone", op: "eq", value: 3 },
      },
    ],

    predict: [
      {
        id: "bigger-jar",
        question: "The candle is covered by a bigger and bigger jar. How long does it stay alight?",
        variable: "jarVolume",
        from: 0.5,
        to: 2,
        quantity: "burnTime",
        options: ["increase", "decrease", "same"],
        mode: "jar",
        given: { jar: "closed" },
        explanation: "Longer: from 5 s to 20 s. A bigger jar holds more air, so there is more oxygen to use up.",
      },
      {
        id: "cup-keeps-cool",
        question: "The paper cup of water has been on the flame for 200 s. What happens to the paper's temperature over the next 100 s?",
        variable: "time",
        from: 200,
        to: 300,
        quantity: "cupTemp",
        options: ["increase", "decrease", "same"],
        mode: "cup",
        given: { cup: "water" },
        explanation: "It stays at 100 °C. The water is boiling and takes the heat away, so the paper never gets near the 230 °C it needs to catch fire.",
      },
    ],

    experiment: {
      title: "How much heat?",
      instructions: "Pick a fuel and burn different masses of it. Record the mass and the heat it gives.",
      columns: ["mass", "heat"],
      minRows: 3,
      discovery: {
        question: "How is the heat linked to the mass burnt?",
        choices: [
          { id: "times", label: "Heat = mass × the fuel's calorific value", correct: true },
          { id: "same", label: "Every fuel gives the same heat per kilogram", correct: false },
          { id: "fixed", label: "The heat does not depend on the mass", correct: false },
        ],
        reveals: "calorific-value",
        insight: "Twice the fuel gives twice the heat. The calorific value tells you how much 1 kg gives: 55 000 kJ for LPG, but only about 7000 kJ for cow dung cake.",
      },
    },

    explain: [
      { id: "burn", title: "Will it burn?", body: "It is {{burning}}. What is missing: {{missing}}." },
      {
        id: "ignition",
        title: "Ignition temperature",
        body: "It catches fire at about {{ignitionTemp}} °C. Inflammable: {{inflammable}}.",
        when: { type: "compare", quantity: "combustible", op: "eq", value: 1 },
      },
      { id: "jar", title: "Candle under a jar", body: "The jar's air is {{jarOxygen}} % oxygen and the candle is {{candleLit}}. Under a closed jar this size it lasts {{burnTime}} s." },
      { id: "cup", title: "Paper cup", body: "The paper is at {{cupTemp}} °C, and {{cupBurning}}. Paper needs about 230 °C to catch fire." },
      { id: "flame", title: "Candle flame", body: "The probe is in {{zone}}." },
      { id: "fire", title: "Fighting the fire", body: "The fire is {{fireOut}}. The method takes away {{sideRemoved}}. Water is safe on this fire: {{waterSafe}}." },
      { id: "fuel", title: "Fuel", body: "Calorific value: {{calorific}} kJ/kg, so this mass gives {{heat}} kJ. Pollution: {{pollution}}. A fossil fuel: {{fossil}}." },
      { id: "products", title: "Coal and petroleum", body: "This comes from {{productSource}}. Both are fossil fuels: they took millions of years to form and will run out." },
    ],

    challenges: [
      {
        id: "least-heat",
        title: "Just warm enough",
        prompt: "Make kerosene burn while heating it no higher than 45 °C.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "material", op: "eq", value: 3 },
            { type: "compare", quantity: "burning", op: "eq", value: 1 },
            { type: "compare", quantity: "temperature", op: "lte", value: 45 },
          ],
        },
        hint: "Kerosene catches fire at about 40 °C.",
        success: "40 °C is enough. Wood heated to 40 °C would not even smoke: it needs about 300 °C.",
      },
      {
        id: "cleanest",
        title: "The cleanest fuel",
        prompt: "Find the fuel that leaves nothing but water.",
        goal: { type: "compare", quantity: "pollution", op: "eq", value: 0 },
        hint: "It also has the highest calorific value.",
        success: "Hydrogen: 150 000 kJ/kg and only water when it burns. It is hard to store safely, so it is not yet used widely.",
      },
    ],
  },

  realWorld: [
    { title: "The goldsmith's blow-pipe", description: "Goldsmiths blow the outermost zone of a flame onto gold and silver to melt them, because it is the hottest part." },
    { title: "CNG buses", description: "Many Indian cities run buses and autos on CNG. It gives much less smoke than diesel or petrol." },
    { title: "Acid rain and global warming", description: "Sulphur dioxide and nitrogen oxides from burning fuels dissolve in rain to make acid rain. The carbon dioxide adds to global warming." },
    { title: "Fires in coal mines", description: "Coal dust can catch fire by itself — spontaneous combustion — which is one of the dangers of mining." },
    { title: "Saving fuel (PCRA)", description: "Drive at a steady, moderate speed, switch off the engine at traffic lights, keep the tyres at the right pressure, and service the vehicle regularly." },
  ],
});
