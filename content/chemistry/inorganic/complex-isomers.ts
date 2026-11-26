import { defineConcept } from "@ise/concept-schema";

/**
 * Naming coordination compounds and counting their isomers, for class 12.
 *
 * Naming: the IUPAC name of each complex built by rule, with the metal's
 * oxidation state worked out from the charges. Isomers: every way of placing
 * the ligands on an octahedron or square, sorted by symmetry into cis/trans,
 * fac/mer and mirror-image pairs.
 */
export const complexIsomers = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "complex-isomers",
    title: "Complex Isomers and Names",
    tagline: "Name a complex from its formula, and find every way its ligands can sit — including mirror images.",
    domain: "chemistry",
    category: "inorganic",
    grade: { min: 12, max: 12 },
    difficulty: "advanced",
    estimatedMinutes: 25,
    objective:
      "Name coordination compounds by the IUPAC rules and work out the metal's oxidation state and coordination number, and identify the geometric (cis/trans, fac/mer) and optical isomers of octahedral and square-planar complexes.",
    tags: ["coordination compounds", "Werner", "IUPAC naming", "isomerism", "cis-trans", "fac-mer", "optical isomers", "class 12"],
  },

  connections: [
    {
      id: "coordination-compounds",
      title: "Coordination Compounds",
      domain: "chemistry",
      relation: "related",
      note: "The same complexes, seen through crystal field theory: colour and magnetism.",
      available: true,
    },
    {
      id: "molecular-shapes",
      title: "Molecular Shapes",
      domain: "chemistry",
      relation: "prerequisite",
      note: "Octahedral and square-planar shapes are where the isomers come from.",
      available: true,
    },
  ],

  variables: [
    {
      id: "compound",
      symbol: "compound",
      name: "Compound to name",
      meaning: "A coordination compound from NCERT.",
      binding: { kind: "param", key: "compound" },
      control: {
        type: "choice",
        options: [
          { value: "hexaamminecobalt", label: "[Co(NH₃)₆]Cl₃" },
          { value: "ferricyanide", label: "K₃[Fe(CN)₆]" },
          { value: "cisplatin", label: "[Pt(NH₃)₂Cl₂]" },
          { value: "chloridocobalt", label: "[CoCl(NH₃)₅]Cl₂" },
          { value: "nickel-carbonyl", label: "[Ni(CO)₄]" },
          { value: "tris-en", label: "[Co(en)₃]Cl₃" },
          { value: "ferrocyanide", label: "K₄[Fe(CN)₆]" },
          { value: "tetraamminecopper", label: "[Cu(NH₃)₄]SO₄" },
          { value: "hexachloridoplatinate", label: "K₂[PtCl₆]" },
          { value: "diamminesilver", label: "[Ag(NH₃)₂]Cl" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "type",
      symbol: "type",
      name: "Kind of complex",
      meaning: "A metal M with ligands A and B, or two-toothed ligands AA.",
      binding: { kind: "param", key: "type" },
      control: {
        type: "choice",
        options: [
          { value: "ma4b2", label: "[MA₄B₂] octahedral" },
          { value: "ma3b3", label: "[MA₃B₃] octahedral" },
          { value: "ma2b2-square", label: "[MA₂B₂] square planar" },
          { value: "maa3", label: "[M(AA)₃]" },
          { value: "maa2b2", label: "[M(AA)₂B₂]" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "isomer",
      symbol: "isomer",
      name: "Isomer shown",
      meaning: "Step through the distinct isomers.",
      binding: { kind: "state", key: "isomer" },
      control: { type: "range", unit: "1", min: 0, max: 2, step: 1 },
      group: "primary",
      color: "angle",
    },
  ],

  quantities: [
    {
      id: "oxidationState",
      symbol: "ox",
      name: "Metal's oxidation state",
      meaning: "The complex's charge minus the ligands' charges.",
      result: "oxidationState",
      format: { kind: "number", digits: 0 },
      color: "angle",
      highlight: "working",
      headline: true,
    },
    {
      id: "coordinationNumber",
      symbol: "CN",
      name: "Coordination number",
      meaning: "Donor atoms bonded to the metal; en counts twice.",
      result: "coordinationNumber",
      format: { kind: "number", digits: 0 },
      color: "sine",
      headline: true,
    },
    {
      id: "complexCharge",
      symbol: "charge",
      name: "Charge on the complex",
      meaning: "Balanced by the counter ions outside the square brackets.",
      result: "complexCharge",
      format: { kind: "number", digits: 0 },
      color: "cosine",
    },
    {
      id: "stereoCount",
      symbol: "stereo",
      name: "Stereoisomers",
      meaning: "Distinct arrangements, counting mirror images separately.",
      result: "stereoCount",
      format: { kind: "number", digits: 0 },
      color: "tangent",
      highlight: "isomers",
      headline: true,
    },
    {
      id: "geometricCount",
      symbol: "geometric",
      name: "Geometric isomers",
      meaning: "Distinct arrangements, a mirror-image pair counted once.",
      result: "geometricCount",
      format: { kind: "number", digits: 0 },
      color: "tangent",
      highlight: "isomers",
    },
    {
      id: "chiral",
      symbol: "chiral?",
      name: "Optically active",
      meaning: "Whether this isomer is different from its mirror image.",
      result: "chiral",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "angle",
      headline: true,
    },
    {
      id: "arrangement",
      symbol: "form",
      name: "Arrangement",
      meaning: "cis/trans for two B ligands, fac/mer for three.",
      result: "arrangement",
      format: { kind: "label", labels: { "0": "—", "1": "cis", "2": "trans", "3": "fac", "4": "mer" } },
      color: "cosine",
    },
  ],

  equations: [
    {
      id: "ox-from-charges",
      topic: "werner-nomenclature",
      title: "The metal's oxidation state",
      words: "oxidation state = charge on the complex − the ligands' charges",
      tokens: [
        { kind: "ref", id: "oxidationState" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "complexCharge" },
        { kind: "op", value: "−" },
        { kind: "text", value: "Σ ligand charges" },
      ],
      reading: "In K₃[Fe(CN)₆] three K⁺ make the complex −3; six CN⁻ bring −6; so iron is +3: hexacyanidoferrate(III).",
      assumptions: ["Neutral ligands 0, anionic ligands their charge"],
      discoverable: true,
    },
    {
      id: "naming-order",
      topic: "werner-nomenclature",
      title: "Naming a complex",
      words: "cation first; in the complex, ligands A→Z (di-, tri-…; -ido for anions), then the metal (-ate if the complex is an anion), then its oxidation state",
      tokens: [
        { kind: "text", value: "ligands (A→Z)" },
        { kind: "op", value: "+" },
        { kind: "text", value: "metal(-ate)" },
        { kind: "op", value: "+" },
        { kind: "text", value: "(oxidation state)" },
      ],
      reading: "[CoCl(NH₃)₅]Cl₂ is pentaamminechloridocobalt(III) chloride: ammine before chlorido, ignoring the penta-.",
      assumptions: ["IUPAC 2005, as in NCERT"],
    },
    {
      id: "geometric-isomers",
      topic: "complex-isomerism",
      title: "Geometric isomers",
      words: "two B side by side: cis; opposite: trans. Three B on one face: fac; around a meridian: mer",
      tokens: [
        { kind: "text", value: "B, B at 90°" },
        { kind: "op", value: "=" },
        { kind: "text", value: "cis" },
      ],
      reading: "[MA₄B₂] and square-planar [MA₂B₂] each have a cis and a trans isomer; [MA₃B₃] has fac and mer. Cisplatin, the cancer drug, is the cis isomer of [Pt(NH₃)₂Cl₂].",
      assumptions: ["Octahedral and square-planar complexes"],
    },
    {
      id: "chirality",
      topic: "complex-isomerism",
      title: "Optical isomers",
      words: "a complex whose mirror image cannot be turned to fit it is chiral, and its two forms are optical isomers",
      tokens: [
        { kind: "text", value: "mirror image ≠ any rotation" },
        { kind: "op", value: "=" },
        { kind: "text", value: "optically active" },
      ],
      reading: "[Co(en)₃]³⁺ and cis-[Co(en)₂Cl₂]⁺ come in left- and right-handed forms; trans-[Co(en)₂Cl₂]⁺ has a mirror plane and does not.",
      assumptions: ["Chelating ligands like en"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "isomers",
    params: { compound: "hexaamminecobalt", type: "ma4b2" },
    playLabel: "Show each isomer",
  },

  visualization: {
    renderer: "isomers",
    hint: "Naming: pick a compound. Isomers: pick a kind of complex and step through its isomers.",
    layers: [
      { id: "naming", label: "Name" },
      { id: "working", label: "Working" },
      { id: "isomers", label: "Isomers" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "naming",
      label: "Naming",
      description: "From formula to IUPAC name",
      layers: ["naming", "working"],
      graphs: [],
      equations: ["ox-from-charges", "naming-order"],
    },
    {
      id: "isomers",
      label: "Isomers",
      description: "Every arrangement, mirror images too",
      layers: ["isomers", "labels"],
      graphs: [],
      equations: ["geometric-isomers", "chirality"],
    },
  ],
  defaultMode: "naming",
  graphs: [],

  activities: {
    observe: [
      {
        id: "chiral",
        prompt: "Find a chiral complex.",
        condition: { type: "compare", quantity: "chiral", op: "eq", value: 1 },
      },
      {
        id: "anion",
        prompt: "Find a compound whose complex is an anion.",
        condition: { type: "compare", quantity: "anionic", op: "eq", value: 1 },
      },
    ],

    predict: [
      {
        id: "cycle",
        question: "[MA₄B₂]: step from the first isomer to the second. Does the number of geometric isomers change?",
        variable: "isomer",
        from: 0,
        to: 1,
        quantity: "geometricCount",
        options: ["increase", "decrease", "same"],
        given: { type: "ma4b2" },
        explanation: "No — it is a property of the formula: [MA₄B₂] always has exactly two, cis and trans.",
      },
    ],

    experiment: {
      title: "Counting isomers",
      instructions: "For each kind of complex, record the geometric isomers and the stereoisomers.",
      columns: ["geometricCount", "stereoCount", "chiral"],
      minRows: 3,
      discovery: {
        question: "When are there more stereoisomers than geometric isomers?",
        choices: [
          { id: "chiral", label: "When some isomer is chiral: its mirror image counts separately", correct: true },
          { id: "six", label: "Whenever there are six ligands", correct: false },
          { id: "never", label: "Never", correct: false },
          { id: "square", label: "Only for square-planar complexes", correct: false },
        ],
        reveals: "chirality",
        insight: "A mirror-image pair is one geometric isomer but two stereoisomers — like a left and a right hand.",
      },
    },

    explain: [
      {
        id: "name",
        title: "The name",
        body: "The complex carries a charge of {{complexCharge}}, so the metal is in oxidation state {{oxidationState}}, with {{coordinationNumber}} donor atoms around it.",
      },
      {
        id: "isomers",
        title: "The isomers",
        body: "{{geometricCount}} geometric isomers, {{stereoCount}} counting mirror images. This one is chiral: {{chiral}}.",
      },
    ],

    challenges: [
      {
        id: "three",
        title: "Three stereoisomers",
        prompt: "Find the kind of complex with three stereoisomers, and show a chiral one.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "stereoCount", op: "eq", value: 3 },
            { type: "compare", quantity: "chiral", op: "eq", value: 1 },
          ],
        },
        hint: "Two chelates and two B.",
        success: "[M(AA)₂B₂]: trans, and a cis pair of mirror images.",
      },
    ],
  },

  realWorld: [
    { title: "Cisplatin", description: "cis-[Pt(NH₃)₂Cl₂] fights cancer by binding DNA; its trans isomer does not work." },
    { title: "Silver plating", description: "[Ag(CN)₂]⁻ releases silver slowly and evenly, giving a smooth plate." },
    { title: "Hard water", description: "EDTA wraps round Ca²⁺ and Mg²⁺ like [M(AA)₃], pulling them out of water." },
  ],
});
