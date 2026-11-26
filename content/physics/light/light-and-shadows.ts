import { defineConcept } from "@ise/concept-schema";

/**
 * Light for class 6: shadows, a pinhole camera and a plane mirror.
 *
 * All three are the same fact — light travels in straight lines — seen three
 * ways. A shadow is where straight rays cannot reach; a pinhole flips the
 * picture because rays cross at the hole; a mirror sends a ray off at the
 * angle it came in. The same bench grows into class 10 reflection and
 * refraction.
 */
export const lightAndShadows = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "light-and-shadows",
    title: "Light and Shadows",
    tagline: "Shadows, a pinhole camera and a mirror — all because light goes in straight lines.",
    domain: "physics",
    category: "light",
    grade: { min: 6, max: 7 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "See that light travels in straight lines, explain how shadows form and why they change size, sort materials as opaque, translucent or transparent, see why a pinhole image is upside down, and find that a mirror reflects light at the angle it arrives.",
    tags: ["light", "shadow", "pinhole camera", "mirror", "reflection", "class 6"],
  },

  connections: [
    {
      id: "laws-of-reflection",
      title: "Reflection and refraction (class 10)",
      domain: "physics",
      relation: "leads-to",
      note: "Angle in equals angle out is the first law of reflection; curved mirrors and lenses follow.",
      available: false,
    },
  ],

  variables: [
    {
      id: "objectDistance",
      symbol: "d",
      name: "Distance from the lamp",
      meaning: "How far the object is from the lamp, the pinhole or the mirror.",
      binding: { kind: "state", key: "objectDistance" },
      control: { type: "range", unit: "cm", min: 10, max: 95, step: 1 },
      group: "primary",
      color: "secant",
    },
    {
      id: "angle",
      symbol: "i",
      name: "Angle of the incoming ray",
      meaning: "How far the ray tilts from the normal — the line square to the mirror.",
      binding: { kind: "state", key: "angle" },
      control: { type: "range", unit: "deg", min: 0, max: 80, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "scene",
      symbol: "scene",
      name: "What is on the bench",
      meaning: "A lamp and screen, a pinhole camera, or a mirror.",
      binding: { kind: "param", key: "scene" },
      control: {
        type: "choice",
        options: [
          { value: "shadow", label: "Shadow" },
          { value: "pinhole", label: "Pinhole camera" },
          { value: "mirror", label: "Mirror" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "material",
      symbol: "made of",
      name: "What the object is made of",
      meaning: "Opaque stops light, translucent lets some through, transparent lets it all through.",
      binding: { kind: "param", key: "material" },
      control: {
        type: "choice",
        options: [
          { value: "opaque", label: "Opaque" },
          { value: "translucent", label: "Translucent" },
          { value: "transparent", label: "Transparent" },
        ],
      },
      group: "primary",
      color: "vector",
    },
    {
      id: "objectHeight",
      symbol: "h",
      name: "Object height",
      meaning: "How tall the card or candle is.",
      binding: { kind: "param", key: "objectHeight" },
      control: { type: "range", unit: "cm", min: 5, max: 30, step: 1 },
      group: "motion",
      color: "tangent",
    },
    {
      id: "screenDistance",
      symbol: "D",
      name: "Distance to the screen",
      meaning: "From the lamp (or pinhole) to the screen.",
      binding: { kind: "param", key: "screenDistance" },
      control: { type: "range", unit: "cm", min: 40, max: 100, step: 5 },
      group: "motion",
      color: "sine",
    },
  ],

  quantities: [
    {
      id: "imageHeight",
      symbol: "H",
      name: "Shadow (or image) height",
      meaning: "How tall the shadow on the screen — or the pinhole image — is.",
      result: "imageHeight",
      format: { kind: "number", digits: 1 },
      unit: "cm",
      color: "angle",
      highlight: "scene",
      headline: true,
    },
    {
      id: "sizeRatio",
      symbol: "D/d",
      name: "How many times bigger",
      meaning: "The shadow is this many times the object's height.",
      result: "sizeRatio",
      format: { kind: "number", digits: 2 },
      color: "secant",
      highlight: "rays",
    },
    {
      id: "darkness",
      symbol: "dark",
      name: "Shadow darkness",
      meaning: "1 is a dark shadow, 0 is no shadow at all.",
      result: "darkness",
      format: { kind: "number", digits: 1 },
      color: "neutral",
      highlight: "scene",
      headline: true,
    },
    {
      id: "inverted",
      symbol: "upside down?",
      name: "Upside down",
      meaning: "Whether the image is upside down.",
      result: "inverted",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "vector",
    },
    {
      id: "incidence",
      symbol: "i",
      name: "Angle in",
      meaning: "The angle between the incoming ray and the normal.",
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
      name: "Angle out",
      meaning: "The angle between the reflected ray and the normal.",
      result: "reflection",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "angle",
      highlight: "rays",
      headline: true,
    },
    {
      id: "imageDistance",
      symbol: "v",
      name: "Image distance behind the mirror",
      meaning: "How far behind the mirror the image seems to be.",
      result: "imageDistance",
      format: { kind: "number", digits: 0 },
      unit: "cm",
      color: "tangent",
    },
  ],

  equations: [
    {
      id: "straight-lines",
      topic: "light-straight-lines",
      title: "Why there are shadows",
      words: "light travels in straight lines, so it cannot bend round an object",
      tokens: [
        { kind: "text", value: "shadow" },
        { kind: "op", value: "=" },
        { kind: "text", value: "where straight rays cannot reach" },
      ],
      reading: "Rays from the lamp go straight; the object blocks some, and the screen behind stays dark in its outline.",
      assumptions: ["A small lamp"],
      discoverable: true,
    },
    {
      id: "shadow-size",
      topic: "shadows",
      title: "How big the shadow is",
      words: "shadow height = object height × screen distance ÷ object distance",
      tokens: [
        { kind: "ref", id: "imageHeight" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "objectHeight" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "screenDistance" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "objectDistance" },
      ],
      reading: "Nearer the lamp, the object blocks a wider fan of rays, so its shadow is bigger.",
      assumptions: ["A point-sized lamp"],
    },
    {
      id: "reflection-law",
      topic: "plane-mirror-school",
      title: "Angle in, angle out",
      words: "the angle a ray comes in at equals the angle it goes out at",
      tokens: [
        { kind: "ref", id: "incidence" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "reflection" },
      ],
      reading: "Measured from the normal, a ray leaves a mirror at exactly the angle it arrived.",
      assumptions: ["A flat, shiny mirror"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "light",
    params: { scene: "shadow", material: "opaque", objectHeight: 10, screenDistance: 80 },
    playLabel: "Move it closer",
  },

  visualization: {
    renderer: "light",
    hint: "Move the object, change what it is made of, or swap the screen for a pinhole camera or a mirror.",
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
      description: "The bench and the rays of light",
      layers: ["scene", "rays", "labels"],
      graphs: [],
      equations: ["shadow-size", "reflection-law"],
    },
    {
      id: "no-rays",
      label: "Without rays",
      description: "Just what you would see",
      layers: ["scene", "labels"],
      graphs: [],
      equations: ["straight-lines"],
    },
  ],
  defaultMode: "bench",
  graphs: [],

  activities: {
    observe: [
      {
        id: "big-shadow",
        prompt: "Make the shadow taller than 40 cm.",
        condition: { type: "compare", quantity: "imageHeight", op: "gte", value: 40 },
      },
      {
        id: "no-shadow",
        prompt: "Make the object transparent.",
        condition: { type: "compare", quantity: "darkness", op: "eq", value: 0 },
      },
      {
        id: "pinhole",
        prompt: "Swap the screen for a pinhole camera.",
        condition: { type: "compare", quantity: "inverted", op: "eq", value: 1 },
      },
    ],

    predict: [
      {
        id: "closer-to-lamp",
        question: "The card moves from 50 cm to 20 cm from the lamp. What happens to its shadow?",
        variable: "objectDistance",
        from: 50,
        to: 20,
        quantity: "imageHeight",
        options: ["increase", "decrease", "same"],
        given: { scene: "shadow" },
        explanation: "It grows. Near the lamp the card blocks a much wider fan of rays.",
      },
      {
        id: "tilt-the-ray",
        question: "The ray hits the mirror at 20° and then at 60°. What happens to the angle it leaves at?",
        variable: "angle",
        from: 20,
        to: 60,
        quantity: "reflection",
        options: ["increase", "decrease", "same"],
        given: { scene: "mirror" },
        explanation: "It grows to 60° too: angle out always equals angle in.",
      },
    ],

    experiment: {
      title: "Shadow sizes",
      instructions: "Record the shadow's height with the card 20, 30, 40 and 60 cm from the lamp.",
      columns: ["imageHeight", "sizeRatio", "darkness"],
      minRows: 3,
      discovery: {
        question: "Why does the shadow grow when the card moves towards the lamp?",
        choices: [
          { id: "fan", label: "Light goes in straight lines, and near the lamp the card blocks a wider fan of them", correct: true },
          { id: "heat", label: "The lamp heats the card and it swells", correct: false },
          { id: "bend", label: "Light bends round the card", correct: false },
          { id: "random", label: "Shadows change size at random", correct: false },
        ],
        reveals: "straight-lines",
        insight: "Straight rays make shadows: the object's outline, scaled by how far the screen is compared with the object.",
      },
    },

    explain: [
      {
        id: "straight",
        title: "Straight lines",
        body: "Light goes in straight lines. That is why you cannot see round a corner, and why a shadow has the same outline as the thing that makes it. This shadow is {{imageHeight}} cm tall.",
      },
      {
        id: "three-kinds",
        title: "Opaque, translucent, transparent",
        body: "Cardboard and wood are opaque: no light gets through, so the shadow is dark. Tracing paper is translucent: some gets through. Clear glass is transparent: it lets almost all light through, so it makes almost no shadow.",
      },
      {
        id: "mirror",
        title: "Mirrors",
        body: "A mirror sends light back at the same angle it arrived: here {{incidence}}° in and {{reflection}}° out. Your image seems as far behind the mirror as you are in front of it.",
      },
    ],

    challenges: [
      {
        id: "double",
        title: "Twice as tall",
        prompt: "Make the shadow exactly twice as tall as the card.",
        goal: { type: "compare", quantity: "sizeRatio", op: "eq", value: 2, tolerance: 0.02 },
        hint: "Put the card halfway between the lamp and the screen.",
        success: "Halfway: the rays have spread twice as far by the time they reach the screen.",
      },
      {
        id: "forty-five",
        title: "Round the corner",
        prompt: "In the mirror, make the ray leave at 45°.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "scene", op: "eq", value: 2 },
            { type: "compare", quantity: "reflection", op: "eq", value: 45, tolerance: 0.5 },
          ],
        },
        hint: "Choose the mirror, then aim the ray in at 45°.",
        success: "45° in, 45° out: a periscope uses two mirrors like this to see round a corner.",
      },
    ],
  },

  realWorld: [
    { title: "Shadow puppets", description: "Move your hand towards the lamp and the shadow grows — the same straight-line rule." },
    { title: "The pinhole camera", description: "The first cameras had no lens, just a small hole; the picture inside was upside down." },
    { title: "A periscope", description: "Two mirrors at 45° let a submarine see above the water: each turns the light through a right angle." },
  ],
});
