import { defineConcept } from "@ise/concept-schema";

/**
 * Coordination compounds for class 12: crystal field theory for octahedral
 * complexes — the splitting, high and low spin, stabilisation energy,
 * magnetism and colour — with the valence-bond names alongside.
 */
export const coordinationCompounds = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "coordination-compounds",
    title: "Coordination Compounds",
    tagline: "Six ligands split the d orbitals: the gap sets the colour, the spin and the magnetism.",
    domain: "chemistry",
    category: "inorganic",
    grade: { min: 12, max: 12 },
    difficulty: "advanced",
    estimatedMinutes: 25,
    objective:
      "Use crystal field theory to split the d orbitals of an octahedral complex into t₂g and eg, place ligands in the spectrochemical series, decide between high and low spin by comparing Δo with the pairing energy, work out the CFSE, the unpaired electrons and the colour, and link low spin to valence bond theory's inner-orbital complexes.",
    tags: ["coordination compounds", "crystal field theory", "spectrochemical series", "high spin", "low spin", "CFSE", "class 12"],
  },

  connections: [
    {
      id: "transition-metals",
      title: "Transition Metals",
      domain: "chemistry",
      relation: "prerequisite",
      note: "The d counts and unpaired electrons of the free ions, before the ligands arrive.",
      available: true,
    },
    {
      id: "molecular-shapes",
      title: "Molecular Shapes",
      domain: "chemistry",
      relation: "related",
      note: "Six ligands round a metal sit at the corners of an octahedron, like the six pairs in SF₆.",
      available: true,
    },
  ],

  variables: [
    {
      id: "metal",
      symbol: "M",
      name: "Metal ion",
      meaning: "The central ion and its d electrons.",
      binding: { kind: "param", key: "metal" },
      control: {
        type: "choice",
        options: [
          { value: "sc3", label: "Sc³⁺ (d⁰)" },
          { value: "ti3", label: "Ti³⁺ (d¹)" },
          { value: "v3", label: "V³⁺ (d²)" },
          { value: "cr3", label: "Cr³⁺ (d³)" },
          { value: "fe3", label: "Fe³⁺ (d⁵)" },
          { value: "fe2", label: "Fe²⁺ (d⁶)" },
          { value: "co3", label: "Co³⁺ (d⁶)" },
          { value: "ni2", label: "Ni²⁺ (d⁸)" },
          { value: "zn2", label: "Zn²⁺ (d¹⁰)" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "ligand",
      symbol: "L",
      name: "Ligand (weak → strong)",
      meaning: "Along the spectrochemical series: 0 I⁻, 1 Br⁻, 2 Cl⁻, 3 F⁻, 4 OH⁻, 5 H₂O, 6 NH₃, 7 en, 8 CN⁻, 9 CO.",
      binding: { kind: "state", key: "ligand" },
      control: { type: "range", unit: "1", min: 0, max: 9, step: 1 },
      group: "primary",
      color: "angle",
    },
  ],

  quantities: [
    {
      id: "deltaO",
      symbol: "Δo",
      name: "Crystal field splitting",
      meaning: "The energy gap between eg and t₂g, as a wavenumber.",
      result: "deltaO",
      format: { kind: "number", digits: 0 },
      unit: "1/cm",
      color: "angle",
      highlight: "splitting",
      headline: true,
    },
    {
      id: "pairing",
      symbol: "P",
      name: "Pairing energy",
      meaning: "The cost of putting a second electron into an orbital (d⁴–d⁷ only).",
      result: "pairing",
      format: { kind: "number", digits: 0 },
      unit: "1/cm",
      color: "cosine",
    },
    {
      id: "lowSpin",
      symbol: "spin",
      name: "Spin state",
      meaning: "Low spin: electrons pair in t₂g. High spin: they spread into eg.",
      result: "lowSpin",
      format: { kind: "label", labels: { "0": "high spin", "1": "low spin" } },
      color: "tangent",
      highlight: "splitting",
      headline: true,
    },
    {
      id: "unpaired",
      symbol: "n",
      name: "Unpaired electrons",
      meaning: "Electrons alone in an orbital.",
      result: "unpaired",
      format: { kind: "number", digits: 0 },
      color: "sine",
      headline: true,
    },
    {
      id: "moment",
      symbol: "μ",
      name: "Magnetic moment (BM)",
      meaning: "Spin-only, √(n(n + 2)).",
      result: "moment",
      format: { kind: "number", digits: 2 },
      color: "sine",
    },
    {
      id: "t2g",
      symbol: "t₂g",
      name: "Electrons in t₂g",
      meaning: "In the three lower orbitals.",
      result: "t2g",
      format: { kind: "number", digits: 0 },
      color: "sine",
    },
    {
      id: "eg",
      symbol: "eg",
      name: "Electrons in eg",
      meaning: "In the two upper orbitals.",
      result: "eg",
      format: { kind: "number", digits: 0 },
      color: "cosine",
    },
    {
      id: "cfse",
      symbol: "CFSE",
      name: "Crystal field stabilisation energy (Δo)",
      meaning: "−0.4Δo for each t₂g electron, +0.6Δo for each eg electron.",
      result: "cfse",
      format: { kind: "number", digits: 1 },
      color: "tangent",
    },
    {
      id: "absorbed",
      symbol: "λ",
      name: "Wavelength absorbed",
      meaning: "Light whose energy matches the gap: 10⁷ / Δo.",
      result: "absorbed",
      format: { kind: "number", digits: 0 },
      unit: "nm",
      color: "angle",
      highlight: "spectrum",
    },
    {
      id: "colour",
      symbol: "colour",
      name: "Colour seen",
      meaning: "The complement of the light absorbed.",
      result: "colour",
      format: { kind: "label", labels: { "0": "colourless", "1": "pale yellow", "2": "yellow", "3": "orange", "4": "violet", "5": "blue", "6": "green", "7": "very pale" } },
      color: "angle",
      highlight: "spectrum",
    },
  ],

  equations: [
    {
      id: "absorption",
      topic: "crystal-field",
      title: "The light a complex absorbs",
      words: "wavelength absorbed (nm) = 10⁷ ÷ Δo (cm⁻¹)",
      tokens: [
        { kind: "ref", id: "absorbed" },
        { kind: "op", value: "=" },
        { kind: "text", value: "10⁷" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "deltaO" },
      ],
      reading: "An electron jumps from t₂g to eg by absorbing light of exactly the gap's energy. A bigger gap means shorter, bluer light absorbed — and a yellower complex.",
      assumptions: ["One d–d band"],
      discoverable: true,
    },
    {
      id: "spin-rule",
      topic: "crystal-field",
      title: "High spin or low spin",
      words: "Δo > P: electrons pair in t₂g (low spin); Δo < P: they spread into eg (high spin)",
      tokens: [
        { kind: "ref", id: "deltaO" },
        { kind: "text", value: ">" },
        { kind: "ref", id: "pairing" },
        { kind: "op", value: "=" },
        { kind: "text", value: "low spin" },
      ],
      reading: "Strong-field ligands (CN⁻, CO, NH₃ with Co³⁺) make a big gap, so pairing is cheaper than climbing: [Fe(CN)₆]⁴⁻ is diamagnetic. Weak-field ligands leave it high spin: [Fe(H₂O)₆]²⁺ has four unpaired electrons.",
      assumptions: ["d⁴ to d⁷ octahedral complexes"],
      discoverable: true,
    },
    {
      id: "cfse-formula",
      topic: "crystal-field",
      title: "Crystal field stabilisation energy",
      words: "CFSE = (−0.4 × t₂g electrons + 0.6 × eg electrons) Δo",
      tokens: [
        { kind: "ref", id: "cfse" },
        { kind: "op", value: "=" },
        { kind: "text", value: "−0.4" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "t2g" },
        { kind: "op", value: "+" },
        { kind: "text", value: "0.6" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "eg" },
      ],
      reading: "The t₂g set sits 0.4Δo below the average and eg 0.6Δo above it. Low-spin d⁶ is the most stabilised: −2.4Δo.",
      assumptions: ["Octahedral; pairing energy counted separately"],
    },
    {
      id: "valence-bond",
      topic: "vbt-complexes",
      title: "The valence-bond picture",
      words: "low-spin octahedral = inner-orbital (d²sp³); high-spin octahedral = outer-orbital (sp³d²)",
      tokens: [
        { kind: "text", value: "low spin" },
        { kind: "op", value: "=" },
        { kind: "text", value: "d²sp³ (inner orbital)" },
      ],
      reading: "Valence bond theory explains the same magnetism: pairing the d electrons frees two inner 3d orbitals for bonding.",
      assumptions: ["Octahedral complexes"],
    },
  ],

  simulation: {
    model: "crystal",
    params: { metal: "ti3" },
    playLabel: "Climb the series",
  },

  visualization: {
    renderer: "crystal",
    hint: "Pick a metal ion and move along the spectrochemical series.",
    layers: [
      { id: "splitting", label: "Splitting" },
      { id: "spectrum", label: "Spectrum" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "field",
      label: "Crystal field",
      description: "Splitting, spin and colour",
      layers: ["splitting", "spectrum", "labels"],
      graphs: [],
      equations: ["absorption", "spin-rule", "cfse-formula", "valence-bond"],
    },
  ],
  defaultMode: "field",
  graphs: [],

  activities: {
    observe: [
      {
        id: "low-spin",
        prompt: "Make a low-spin complex.",
        condition: { type: "compare", quantity: "lowSpin", op: "eq", value: 1 },
      },
      {
        id: "uv",
        prompt: "Make a complex whose absorption is in the ultraviolet.",
        condition: { type: "compare", quantity: "absorbed", op: "lt", value: 380 },
      },
    ],

    predict: [
      {
        id: "stronger",
        question: "Cobalt(III): the ligand changes from F⁻ to NH₃. What happens to Δo?",
        variable: "ligand",
        from: 3,
        to: 6,
        quantity: "deltaO",
        options: ["increase", "decrease", "same"],
        given: { metal: "co3" },
        explanation: "It grows: NH₃ is further along the spectrochemical series, a stronger-field ligand than F⁻ — enough to make [Co(NH₃)₆]³⁺ low spin.",
      },
    ],

    experiment: {
      title: "Gap and light",
      instructions: "For Ti³⁺, record Δo and the wavelength absorbed for four ligands.",
      columns: ["deltaO", "absorbed"],
      minRows: 3,
      discovery: {
        question: "How is the wavelength absorbed related to Δo?",
        choices: [
          { id: "inverse", label: "λ = 10⁷ / Δo: a bigger gap absorbs shorter wavelengths", correct: true },
          { id: "direct", label: "λ grows with Δo", correct: false },
          { id: "none", label: "They are unrelated", correct: false },
          { id: "same", label: "λ is the same for every ligand", correct: false },
        ],
        reveals: "absorption",
        insight: "Energy is inversely proportional to wavelength, so a wider gap means bluer light absorbed.",
      },
    },

    explain: [
      {
        id: "gap",
        title: "The gap",
        body: "Δo = {{deltaO}} cm⁻¹; the complex absorbs {{absorbed}} nm and looks {{colour}}.",
      },
      {
        id: "spin",
        title: "Spin",
        body: "It is {{lowSpin}}, with {{unpaired}} unpaired electrons: μ = {{moment}} BM. CFSE = {{cfse}} Δo.",
      },
    ],

    challenges: [
      {
        id: "ferrocyanide",
        title: "Diamagnetic iron",
        prompt: "Make an iron(II) complex with no unpaired electrons at all.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "metal", op: "eq", value: 4 },
            { type: "compare", quantity: "unpaired", op: "eq", value: 0 },
          ],
        },
        hint: "It takes a very strong-field ligand.",
        success: "[Fe(CN)₆]⁴⁻ (or with CO): t₂g⁶, all paired — the yellow ferrocyanide ion.",
      },
    ],
  },

  realWorld: [
    { title: "Ruby and emerald", description: "Both owe their colour to Cr³⁺: the different surroundings split its d orbitals by different amounts." },
    { title: "Haemoglobin", description: "Oxygen binding switches iron between high and low spin, changing the colour of blood from dark red to bright red." },
    { title: "Carbon monoxide poisoning", description: "CO is at the top of the spectrochemical series and binds iron in haemoglobin far more strongly than oxygen." },
  ],
});
