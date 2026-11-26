import { defineConcept } from "@ise/concept-schema";

/**
 * Reflections and images for class 8 (NCERT "Light").
 *
 * One rule — the laws of reflection — on four benches. A smooth surface
 * keeps parallel rays parallel (regular reflection); a rough one sends them
 * off every which way (diffuse reflection), yet each ray still obeys i = r
 * at its own small bit of surface. Two mirrors at an angle make several
 * images, because an image in one mirror is an object for the other; a
 * kaleidoscope is three such mirrors at 60°. A periscope uses two mirrors at
 * 45° to lift your line of sight over a wall.
 *
 * Simplifications, said plainly: mirrors are perfectly flat and reflect all
 * the light; everything is drawn in one plane; the rough surface is a row
 * of seven small flat bits with fixed tilts; the object between two mirrors
 * stands halfway between them, and the images are counted by tracing
 * reflections until an image lands behind both mirrors; the periscope tube
 * is 10 cm wide.
 *
 * Builds on the class 6 lab (light-and-shadows, the plane mirror), and
 * leads to class 10 (bending-light, mirrors-eye-colours) and the class 12
 * ray-optics bench.
 */
export const mirrorsAndImagesLab = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "mirrors-and-images",
    title: "Reflections and Images",
    tagline: "Smooth and rough surfaces, mirrors at an angle, a kaleidoscope and a periscope.",
    domain: "physics",
    category: "light",
    grade: { min: 8, max: 8 },
    difficulty: "introductory",
    estimatedMinutes: 20,
    objective:
      "Tell regular reflection from diffuse reflection and see that every ray still obeys the laws of reflection; find how many images two mirrors at an angle make, and which ones are reversed; see how a kaleidoscope makes its pattern; and explain how a periscope's two mirrors at 45° let you see over a wall.",
    tags: ["reflection", "regular reflection", "diffuse reflection", "multiple images", "lateral inversion", "kaleidoscope", "periscope", "class 8"],
  },

  connections: [
    {
      id: "light-and-shadows",
      title: "Light and Shadows (class 6)",
      domain: "physics",
      relation: "prerequisite",
      note: "A plane mirror sends light off at the angle it came in — the rule every bench here uses.",
      available: true,
    },
    {
      id: "bending-light",
      title: "Bending Light (class 10)",
      domain: "physics",
      relation: "leads-to",
      note: "The laws of reflection again, then light bending as it enters water and glass.",
      available: true,
    },
    {
      id: "mirrors-eye-colours",
      title: "Mirrors, the Eye and Colours (class 10)",
      domain: "physics",
      relation: "leads-to",
      note: "Curved mirrors: where a concave or convex mirror puts the image.",
      available: true,
    },
    {
      id: "ray-optics",
      title: "Ray Optics and Optical Instruments (class 12)",
      domain: "physics",
      relation: "related",
      note: "The full ray bench: mirrors, lenses, prisms and the instruments built from them.",
      available: true,
    },
  ],

  variables: [
    {
      id: "scene",
      symbol: "bench",
      name: "What is on the bench",
      meaning: "A smooth or rough surface, two mirrors at an angle, a kaleidoscope or a periscope.",
      binding: { kind: "param", key: "scene" },
      control: {
        type: "choice",
        options: [
          { value: "surface", label: "Surface" },
          { value: "angle", label: "Two mirrors" },
          { value: "kaleidoscope", label: "Kaleidoscope" },
          { value: "periscope", label: "Periscope" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "roughness",
      symbol: "rough",
      name: "How rough the surface is",
      meaning: "0 % is a smooth mirror. The rougher it is, the more its small bits tilt this way and that.",
      binding: { kind: "state", key: "roughness" },
      control: { type: "range", unit: "%", min: 0, max: 100, step: 5, presets: [0, 50, 100] },
      group: "primary",
      color: "secant",
    },
    {
      id: "incidence",
      symbol: "i",
      name: "Angle of the incoming rays",
      meaning: "How far the parallel rays tilt from the normal — the line square to the smooth surface.",
      binding: { kind: "state", key: "incidence" },
      control: { type: "range", unit: "deg", min: 0, max: 50, step: 1 },
      group: "primary",
      color: "angle",
    },
    {
      id: "mirrorAngle",
      symbol: "θ",
      name: "Angle between the mirrors",
      meaning: "How far apart the two mirrors are opened, like the pages of a book. 180° is one flat mirror.",
      binding: { kind: "state", key: "mirrorAngle" },
      control: { type: "range", unit: "deg", min: 30, max: 180, step: 1, presets: [180, 120, 90, 72, 60, 45, 30] },
      group: "primary",
      color: "sine",
    },
    {
      id: "tubeHeight",
      symbol: "h",
      name: "Periscope height",
      meaning: "How far apart the top and bottom mirrors are.",
      binding: { kind: "state", key: "tubeHeight" },
      control: { type: "range", unit: "cm", min: 20, max: 100, step: 5 },
      group: "primary",
      color: "tangent",
    },
    {
      id: "tilt",
      symbol: "α",
      name: "Tilt of the periscope mirrors",
      meaning: "How far each mirror leans from the level. Both mirrors lean the same way, so they stay parallel.",
      binding: { kind: "state", key: "tilt" },
      control: { type: "range", unit: "deg", min: 30, max: 60, step: 1, presets: [45] },
      group: "motion",
      color: "sine",
    },
  ],

  quantities: [
    {
      id: "reflection",
      symbol: "r",
      name: "Angle out (marked ray)",
      meaning: "The angle the marked ray leaves at, from the smooth surface's normal. On a smooth surface it equals i.",
      result: "reflection",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "angle",
      highlight: "rays",
    },
    {
      id: "spread",
      symbol: "spread",
      name: "Spread of the reflected rays",
      meaning: "The widest angle between two reflected rays. 0° means they are all parallel.",
      result: "spread",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "secant",
      highlight: "rays",
      headline: true,
    },
    {
      id: "diffuse",
      symbol: "kind",
      name: "Kind of reflection",
      meaning: "Regular when the reflected rays stay parallel, diffuse when they spread out.",
      result: "diffuse",
      format: { kind: "label", labels: { "0": "regular", "1": "diffuse" } },
      color: "neutral",
      headline: true,
    },
    {
      id: "facetIn",
      symbol: "i (bit)",
      name: "Angle of incidence at the marked bit",
      meaning: "Measured from the normal to the small bit of surface the marked ray lands on.",
      result: "facetIn",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "tangent",
      highlight: "rays",
    },
    {
      id: "facetOut",
      symbol: "r (bit)",
      name: "Angle of reflection at the marked bit",
      meaning: "Measured from the same normal. It always equals the angle of incidence.",
      result: "facetOut",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "tangent",
      highlight: "rays",
    },
    {
      id: "images",
      symbol: "n",
      name: "Number of images",
      meaning: "How many images of the F the two mirrors make, found by tracing the reflections.",
      result: "images",
      format: { kind: "integer" },
      color: "sine",
      highlight: "scene",
      headline: true,
    },
    {
      id: "fits",
      symbol: "360°/θ",
      name: "How many times θ fits into 360°",
      meaning: "360° divided by the angle between the mirrors.",
      result: "fits",
      format: { kind: "number", digits: 2 },
      color: "neutral",
    },
    {
      id: "wholeFit",
      symbol: "whole?",
      name: "360°/θ a whole number",
      meaning: "Whether θ divides 360° exactly — then n = 360°/θ − 1.",
      result: "wholeFit",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "neutral",
    },
    {
      id: "reversedImages",
      symbol: "reversed",
      name: "Images with left and right swapped",
      meaning: "Images made by an odd number of reflections (1, 3, …) read backwards.",
      result: "reversedImages",
      format: { kind: "integer" },
      color: "cosine",
      highlight: "scene",
    },
    {
      id: "uprightImages",
      symbol: "right way",
      name: "Images the right way round",
      meaning: "Images made by an even number of reflections (2, 4, …) read the right way round.",
      result: "uprightImages",
      format: { kind: "integer" },
      color: "sine",
      highlight: "scene",
    },
    {
      id: "kaleidoImages",
      symbol: "n (corner)",
      name: "Images round each kaleidoscope corner",
      meaning: "Each corner of a kaleidoscope is two mirrors at 60°.",
      result: "kaleidoImages",
      format: { kind: "integer" },
      color: "sine",
    },
    {
      id: "turnAngle",
      symbol: "turn",
      name: "Turn at the top mirror",
      meaning: "How far the top mirror turns the light from its path.",
      result: "turnAngle",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "angle",
      highlight: "rays",
      headline: true,
    },
    {
      id: "topIncidence",
      symbol: "i (top)",
      name: "Angle of incidence at the top mirror",
      meaning: "The angle between the level ray and the top mirror's normal.",
      result: "topIncidence",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "angle",
    },
    {
      id: "sees",
      symbol: "see?",
      name: "Light reaches your eye",
      meaning: "Whether the light gets down the tube to the bottom mirror and out to your eye.",
      result: "sees",
      format: { kind: "label", labels: { "0": "no — it hits the tube", "1": "yes" } },
      color: "neutral",
      headline: true,
    },
    {
      id: "lift",
      symbol: "lift",
      name: "How much higher you see",
      meaning: "How far the periscope lifts your line of sight (0 if the light does not reach you).",
      result: "lift",
      format: { kind: "number", digits: 0 },
      unit: "cm",
      color: "tangent",
      headline: true,
    },
    {
      id: "exitAngle",
      symbol: "out vs in",
      name: "Angle between the light out and the light in",
      meaning: "0° means the light leaves the periscope going the same way it came in.",
      result: "exitAngle",
      format: { kind: "number", digits: 0 },
      unit: "deg",
      color: "angle",
    },
    {
      id: "periscopeReversed",
      symbol: "reversed?",
      name: "Periscope view reversed",
      meaning: "Two reflections swap left and right twice, so the view is the right way round.",
      result: "periscopeReversed",
      format: { kind: "label", labels: { "0": "no", "1": "yes" } },
      color: "neutral",
    },
  ],

  equations: [
    {
      id: "facet-law",
      topic: "diffuse-reflection",
      title: "Every bit obeys the law",
      words: "at each small bit of a surface, angle of incidence = angle of reflection",
      tokens: [
        { kind: "ref", id: "facetIn" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "facetOut" },
      ],
      reading:
        "Measured from the normal to its own bit of surface, each ray leaves at the angle it arrived. The incident ray, the normal and the reflected ray lie in one plane. On a rough surface the bits face different ways, so the rays scatter.",
      assumptions: ["Each small bit of surface is flat"],
      discoverable: true,
    },
    {
      id: "image-count",
      topic: "multiple-images",
      title: "Images in two mirrors",
      words: "number of images = 360° ÷ angle between the mirrors − 1",
      tokens: [
        { kind: "ref", id: "images" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "fits" },
        { kind: "op", value: "−" },
        { kind: "text", value: "1" },
      ],
      reading:
        "When 360°/θ is a whole number: 90° makes 3 images, 60° makes 5, 45° makes 7. For other angles there is no neat rule — the count depends on where the object stands — so the lab traces it.",
      assumptions: ["360°/θ is a whole number", "The object stands halfway between the mirrors"],
      discoverable: true,
    },
    {
      id: "periscope-turn",
      topic: "periscope",
      title: "A periscope mirror turns light through twice its tilt",
      words: "turn = 2 × tilt of the mirror",
      tokens: [
        { kind: "ref", id: "turnAngle" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "tilt" },
      ],
      reading: "At 45° each mirror turns the light through a right angle: down the tube at the top, level again at the bottom, into your eye.",
      assumptions: ["The light comes in level", "Both mirrors are parallel"],
      discoverable: true,
    },
    {
      id: "periscope-lift",
      topic: "periscope",
      title: "How much higher you see",
      words: "lift = height of the periscope (mirrors at 45°)",
      tokens: [
        { kind: "ref", id: "lift" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "tubeHeight" },
      ],
      reading: "With both mirrors at 45° the light goes straight down the tube, so you see over a wall as high as the periscope is tall.",
      assumptions: ["Both mirrors at 45°"],
    },
  ],

  simulation: {
    model: "mirrorangle",
    params: { scene: "surface" },
    playLabel: "Turn the kaleidoscope",
  },

  visualization: {
    renderer: "mirrorangle",
    hint: "Choose a bench, then roughen the surface, open or close the mirrors, or tilt the periscope's mirrors.",
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
      description: "The mirrors and the rays of light",
      layers: ["scene", "rays", "labels"],
      graphs: [],
      equations: ["facet-law", "image-count", "periscope-turn", "periscope-lift"],
    },
    {
      id: "no-rays",
      label: "Without rays",
      description: "Just what you would see",
      layers: ["scene", "labels"],
      graphs: [],
      equations: ["image-count"],
    },
  ],
  defaultMode: "bench",
  graphs: [],

  activities: {
    observe: [
      {
        id: "scatter",
        prompt: "On the surface bench, make the reflected rays spread over at least 30°.",
        condition: { type: "compare", quantity: "spread", op: "gte", value: 30 },
      },
      {
        id: "five-images",
        prompt: "With two mirrors, make exactly 5 images.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "scene", op: "eq", value: 1 },
            { type: "compare", quantity: "images", op: "eq", value: 5 },
          ],
        },
      },
      {
        id: "see-over",
        prompt: "With the periscope, see over the wall from at least 80 cm higher.",
        condition: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "scene", op: "eq", value: 3 },
            { type: "compare", quantity: "lift", op: "gte", value: 80 },
          ],
        },
      },
    ],

    predict: [
      {
        id: "rougher",
        question: "The surface goes from 20 % to 80 % rough. What happens to the spread of the reflected rays?",
        variable: "roughness",
        from: 20,
        to: 80,
        quantity: "spread",
        options: ["increase", "decrease", "same"],
        given: { scene: "surface", incidence: 30 },
        explanation: "It grows, from about 14° to 55°. Each bit tilts more, and a ray turns by twice the tilt of its bit.",
      },
      {
        id: "close-the-mirrors",
        question: "The mirrors close from 90° to 45°. What happens to the number of images?",
        variable: "mirrorAngle",
        from: 90,
        to: 45,
        quantity: "images",
        options: ["increase", "decrease", "same"],
        given: { scene: "angle" },
        explanation: "It goes up from 3 to 7. The narrower the gap, the more times light bounces to and fro before an image lands behind both mirrors.",
      },
    ],

    experiment: {
      title: "Counting images",
      instructions: "On the two-mirror bench, count the images with the mirrors at 180°, 120°, 90°, 60° and 45°.",
      columns: ["mirrorAngle", "images", "fits"],
      minRows: 4,
      discovery: {
        question: "How does the number of images follow from the angle?",
        choices: [
          { id: "minus-one", label: "It is one less than 360° divided by the angle", correct: true },
          { id: "equal", label: "It equals the angle divided by 10", correct: false },
          { id: "always-two", label: "Two mirrors always make two images", correct: false },
          { id: "double", label: "It doubles every time the angle halves", correct: false },
        ],
        reveals: "image-count",
        insight: "360°/θ − 1: at 180° that is 1, at 90° it is 3, at 60° it is 5, at 45° it is 7.",
      },
    },

    explain: [
      {
        id: "surfaces",
        title: "Smooth and rough",
        body: "Here the reflected rays spread over {{spread}}°. A smooth mirror keeps parallel rays parallel — regular reflection, which gives a clear image. A rough surface, like paper or a wall, scatters them — diffuse reflection. Every ray still obeys the laws: at the marked bit, {{facetIn}}° in and {{facetOut}}° out.",
        when: { type: "compare", quantity: "scene", op: "eq", value: 0 },
      },
      {
        id: "two-mirrors",
        title: "Images of images",
        body: "These mirrors make {{images}} images. An image in one mirror acts as an object for the other, so the light bounces to and fro until an image lands behind both mirrors. {{reversedImages}} of them read backwards (made by an odd number of reflections) and {{uprightImages}} read the right way round.",
        when: { type: "compare", quantity: "scene", op: "eq", value: 1 },
      },
      {
        id: "kaleidoscope",
        title: "The kaleidoscope",
        body: "Three mirror strips at 60° to each other. Each corner is two mirrors at 60°, so it shows {{kaleidoImages}} images round the real triangle, and the reflections repeat all over. Turn it and the beads tumble into a new pattern.",
        when: { type: "compare", quantity: "scene", op: "eq", value: 2 },
      },
      {
        id: "periscope",
        title: "The periscope",
        body: "The top mirror turns the light through {{turnAngle}}°, down the tube; the bottom mirror, parallel to it, turns it level again. Right now your line of sight is lifted {{lift}} cm (0 if the light misses your eye). Two reflections swap left and right twice, so the view is the right way round.",
        when: { type: "compare", quantity: "scene", op: "eq", value: 3 },
      },
    ],

    challenges: [
      {
        id: "seven",
        title: "Seven Fs",
        prompt: "With two mirrors, make exactly 7 images.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "scene", op: "eq", value: 1 },
            { type: "compare", quantity: "images", op: "eq", value: 7 },
          ],
        },
        hint: "360° ÷ θ must be 8.",
        success: "45°: 360 ÷ 45 = 8, and one less is 7.",
      },
      {
        id: "tall-periscope",
        title: "Over the top",
        prompt: "Build a periscope that lets you see 90 cm higher.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "scene", op: "eq", value: 3 },
            { type: "compare", quantity: "lift", op: "eq", value: 90, tolerance: 1 },
          ],
        },
        hint: "Mirrors at 45°, and a tube 90 cm tall.",
        success: "At 45° the light runs straight down the tube, so you see as much higher as the tube is tall.",
      },
    ],
  },

  realWorld: [
    { title: "Why you can read a book", description: "A page scatters light by diffuse reflection, so you can see it from any side — a mirror would only send it one way." },
    { title: "Barber's and tailor's mirrors", description: "Two mirrors at an angle show you many images, so you can see the back of your head." },
    { title: "AMBULANCE", description: "It is written backwards on the front of the van so a driver ahead reads it the right way in the mirror." },
    { title: "The kaleidoscope", description: "Three mirror strips and some bangle pieces: designers of wallpaper and fabric have used it to find patterns." },
    { title: "Periscopes", description: "Submarines, tanks and soldiers in bunkers use periscopes to see without being seen." },
  ],
});
