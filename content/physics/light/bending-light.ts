import { defineConcept } from "@ise/concept-schema";

/**
 * Light for class 10: reflection, refraction and the convex lens.
 *
 * The class 6 light bench, grown up. A mirror obeys the laws of reflection; a
 * ray entering water, glass or diamond slows and bends towards the normal,
 * by Snell's law; and a convex lens gathers rays into a real, upside-down
 * image — or, with the object inside its focus, shows a magnified virtual one.
 */
export const bendingLight = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "bending-light",
    title: "Bending Light",
    tagline: "Mirrors, refraction and lenses: the rules light follows when it bounces and bends.",
    domain: "physics",
    category: "light",
    grade: { min: 10, max: 10 },
    difficulty: "core",
    estimatedMinutes: 20,
    objective:
      "Apply the laws of reflection, see a ray bend towards the normal as it enters a denser medium, compare how much water, glass and diamond bend light, and use a convex lens to form real and virtual images.",
    tags: ["light", "reflection", "refraction", "lens", "snell", "class 10"],
  },

  connections: [
    {
      id: "light-and-shadows",
      title: "Light and Shadows",
      domain: "physics",
      relation: "prerequisite",
      note: "Light travels in straight lines — until it meets a mirror or a new medium.",
      available: true,
    },
  ],

  variables: [
    {
      id: "angle",
      symbol: "i",
      name: "Angle of incidence",
      meaning: "The angle between the incoming ray and the normal.",
      binding: { kind: "state", key: "angle" },
      control: { type: "range", unit: "deg", min: 0, max: 80, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "objectDistance",
      symbol: "u",
      name: "Object distance",
      meaning: "How far the object is in front of the lens or mirror.",
      binding: { kind: "state", key: "objectDistance" },
      control: { type: "range", unit: "cm", min: 10, max: 95, step: 1 },
      group: "primary",
      color: "tangent",
    },
    {
      id: "scene",
      symbol: "scene",
      name: "What is on the bench",
      meaning: "A plane mirror, a surface to refract through, or a convex lens.",
      binding: { kind: "param", key: "scene" },
      control: {
        type: "choice",
        options: [
          { value: "mirror", label: "Mirror" },
          { value: "refraction", label: "Into a medium" },
          { value: "lens", label: "Convex lens" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "medium",
      symbol: "medium",
      name: "Medium",
      meaning: "What the ray passes into.",
      binding: { kind: "param", key: "medium" },
      control: {
        type: "choice",
        options: [
          { value: "water", label: "Water" },
          { value: "glass", label: "Glass" },
          { value: "diamond", label: "Diamond" },
        ],
      },
      group: "primary",
      color: "sine",
    },
    {
      id: "focal",
      symbol: "f",
      name: "Focal length",
      meaning: "How far from the lens parallel rays come to a focus.",
      binding: { kind: "param", key: "focal" },
      control: { type: "range", unit: "cm", min: 5, max: 30, step: 1 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "objectHeight",
      symbol: "h",
      name: "Object height",
      meaning: "How tall the object is.",
      binding: { kind: "param", key: "objectHeight" },
      control: { type: "range", unit: "cm", min: 5, max: 30, step: 1 },
      group: "motion",
      color: "tangent",
    },
  ],

  quantities: [
    {
      id: "incidence",
      symbol: "i",
      name: "Angle of incidence",
      meaning: "The incoming ray's angle to the normal.",
      result: "incidence",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "angle",
      highlight: "rays",
      headline: true,
    },
    {
      id: "reflection",
      symbol: "r",
      name: "Angle of reflection",
      meaning: "The reflected ray's angle to the normal.",
      result: "reflection",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "angle",
      highlight: "rays",
    },
    {
      id: "refracted",
      symbol: "r",
      name: "Angle of refraction",
      meaning: "The ray's angle to the normal inside the medium.",
      result: "refracted",
      format: { kind: "number", digits: 1 },
      unit: "deg",
      color: "sine",
      highlight: "rays",
      headline: true,
    },
    {
      id: "index",
      symbol: "n",
      name: "Refractive index",
      meaning: "How many times slower light goes in the medium than in air.",
      result: "index",
      format: { kind: "number", digits: 2 },
      color: "sine",
    },
    {
      id: "criticalAngle",
      symbol: "c",
      name: "Critical angle",
      meaning: "Going the other way, out of the medium, beyond this angle light cannot escape at all.",
      result: "criticalAngle",
      format: { kind: "number", digits: 1 },
      unit: "deg",
      color: "vector",
    },
    {
      id: "lensImage",
      symbol: "v",
      name: "Image distance",
      meaning: "Where the lens forms the image: behind the lens if positive (real), on the object's side if negative (virtual).",
      result: "lensImage",
      format: { kind: "number", digits: 1 },
      unit: "cm",
      color: "cosine",
      highlight: "scene",
      headline: true,
    },
    {
      id: "lensMagnification",
      symbol: "m",
      name: "Magnification",
      meaning: "How many times the object's height the image is.",
      result: "lensMagnification",
      format: { kind: "number", digits: 2 },
      color: "cosine",
      highlight: "scene",
    },
    {
      id: "real",
      symbol: "real?",
      name: "Real image",
      meaning: "A real image can be caught on a screen; a virtual one cannot.",
      result: "real",
      format: { kind: "label", labels: { "0": "no — virtual", "1": "yes" } },
      color: "cosine",
    },
  ],

  equations: [
    {
      id: "laws-of-reflection",
      topic: "laws-of-reflection-school",
      title: "The laws of reflection",
      words: "angle of incidence = angle of reflection",
      tokens: [
        { kind: "ref", id: "incidence" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "reflection" },
      ],
      reading: "The two angles are equal, and the incoming ray, the reflected ray and the normal all lie in one plane.",
      assumptions: ["A smooth mirror"],
      discoverable: true,
    },
    {
      id: "snell-school",
      topic: "refraction-school",
      title: "Snell's law",
      words: "sin i ÷ sin r = refractive index",
      tokens: [
        { kind: "text", value: "sin" },
        { kind: "ref", id: "incidence" },
        { kind: "op", value: "/" },
        { kind: "text", value: "sin" },
        { kind: "ref", id: "refracted" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "index" },
      ],
      reading: "Going from air into a denser medium, light slows and bends towards the normal — more for a bigger refractive index.",
      assumptions: ["From air into the medium"],
      discoverable: true,
    },
    {
      id: "lens-formula-school",
      topic: "lenses-school",
      title: "The lens formula",
      words: "1 ÷ v − 1 ÷ u = 1 ÷ f, with u negative on the object's side",
      tokens: [
        { kind: "text", value: "1/" },
        { kind: "ref", id: "lensImage" },
        { kind: "op", value: "−" },
        { kind: "text", value: "1/u" },
        { kind: "op", value: "=" },
        { kind: "text", value: "1/" },
        { kind: "ref", id: "focal" },
      ],
      reading: "An object beyond F gives a real, upside-down image; inside F, a virtual, upright, magnified one.",
      assumptions: ["A thin convex lens"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "light",
    params: { scene: "refraction", material: "opaque", objectHeight: 10, screenDistance: 100, medium: "glass", focal: 10 },
    playLabel: "Move it closer",
  },

  visualization: {
    renderer: "light",
    hint: "Change the angle of the ray, the medium, or move the object in front of the lens.",
    layers: [
      { id: "scene", label: "Bench" },
      { id: "rays", label: "Rays", optional: true },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "bench",
      label: "With rays",
      description: "The bench and the rays",
      layers: ["scene", "rays", "labels"],
      graphs: [],
      equations: ["snell-school", "lens-formula-school"],
    },
    {
      id: "no-rays",
      label: "Without rays",
      description: "Just what you would see",
      layers: ["scene", "labels"],
      graphs: [],
      equations: ["laws-of-reflection"],
    },
  ],
  defaultMode: "bench",
  graphs: [],

  activities: {
    observe: [
      {
        id: "into-diamond",
        prompt: "Send the ray into diamond.",
        condition: { type: "compare", quantity: "medium", op: "eq", value: 2 },
      },
      {
        id: "virtual",
        prompt: "Use the lens to make a virtual image.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "scene", op: "eq", value: 4 },
            { type: "compare", quantity: "real", op: "eq", value: 0 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "steeper-in",
        question: "A ray enters water at 20°, then at 50°. What happens to the angle of refraction?",
        variable: "angle",
        from: 20,
        to: 50,
        quantity: "refracted",
        options: ["increase", "decrease", "same"],
        given: { scene: "refraction", medium: "water" },
        explanation: "It increases too, but always stays smaller than the angle in air.",
      },
    ],

    experiment: {
      title: "Snell's law",
      instructions: "For glass, record the angle of refraction for i = 20°, 40°, 60° and 80°.",
      columns: ["incidence", "refracted", "index"],
      minRows: 3,
      discovery: {
        question: "What stays the same for every angle?",
        choices: [
          { id: "ratio", label: "sin i ÷ sin r — the refractive index", correct: true },
          { id: "difference", label: "i − r", correct: false },
          { id: "ratio-angles", label: "i ÷ r", correct: false },
          { id: "nothing", label: "Nothing stays the same", correct: false },
        ],
        reveals: "snell-school",
        insight: "sin i / sin r is always 1.5 for glass: that is its refractive index.",
      },
    },

    explain: [
      {
        id: "slowing",
        title: "Why light bends",
        body: "Light slows down in water, glass and diamond. Entering at a slant, one side of the beam slows first, so it swings towards the normal — here from {{incidence}}° to {{refracted}}°.",
      },
      {
        id: "lens",
        title: "Real and virtual images",
        body: "An object beyond the focus gives a real image you can catch on a screen, upside down. Inside the focus you get a virtual image: upright, magnified, seen only by looking through the lens — a magnifying glass.",
      },
    ],

    challenges: [
      {
        id: "same-size",
        title: "Same size",
        prompt: "Use the lens to make an image exactly the same size as the object.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "scene", op: "eq", value: 4 },
            { type: "compare", quantity: "lensMagnification", op: "eq", value: 1, tolerance: 0.02 },
          ],
        },
        hint: "Put the object at twice the focal length.",
        success: "At 2F the image is real, upside down and the same size, 2F on the other side.",
      },
    ],
  },

  realWorld: [
    { title: "A pencil in water", description: "It looks bent at the surface: light from the part underwater bends as it leaves." },
    { title: "Diamonds sparkle", description: "With a refractive index of 2.42, diamond bends light more than almost anything, and traps it inside." },
    { title: "Cameras and eyes", description: "A convex lens forms a real, upside-down image on the film — or on your retina." },
  ],
});
