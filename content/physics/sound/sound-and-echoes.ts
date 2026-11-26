import { defineConcept } from "@ise/concept-schema";

/**
 * Sound for class 8 and 9: a vibration passed from particle to particle.
 *
 * A loudspeaker pushes the particles in front of it into compressions and
 * rarefactions. The frequency is the pitch, the amplitude the loudness, and
 * the medium sets the speed — steel, then water, then air, and nothing at
 * all through a vacuum. A clap off a far wall comes back as an echo after
 * t = 2d / v, which is how the speed of sound, and the depth of the sea, are
 * measured.
 */
export const soundAndEchoes = defineConcept({
  schemaVersion: 1,
  meta: {
    id: "sound-and-echoes",
    title: "Sound and Echoes",
    tagline: "Vibrations that travel through stuff: pitch, loudness, speed — and the echo that comes back.",
    domain: "physics",
    category: "waves",
    grade: { min: 8, max: 9 },
    difficulty: "introductory",
    estimatedMinutes: 15,
    objective:
      "See sound as a vibration passed on through a medium, link frequency to pitch and amplitude to loudness, compare the speed of sound in solids, liquids and gases, and use an echo to find a distance with v = 2d / t.",
    tags: ["sound", "vibration", "pitch", "loudness", "echo", "speed of sound", "class 8", "class 9"],
  },

  connections: [
    {
      id: "sine-waves",
      title: "Waves (class 11)",
      domain: "physics",
      relation: "leads-to",
      note: "The pressure trace is a sine wave; later you will describe any wave by its amplitude, frequency and phase.",
      available: false,
    },
  ],

  variables: [
    {
      id: "frequency",
      symbol: "f",
      name: "Frequency",
      meaning: "How many times a second the speaker vibrates.",
      binding: { kind: "param", key: "frequency" },
      control: { type: "range", unit: "Hz", min: 50, max: 1000, step: 10 },
      group: "primary",
      color: "sine",
    },
    {
      id: "amplitude",
      symbol: "A",
      name: "Amplitude",
      meaning: "How far each particle swings back and forth.",
      binding: { kind: "param", key: "amplitude" },
      control: { type: "range", unit: "1", min: 1, max: 10, step: 1 },
      group: "primary",
      color: "cosine",
    },
    {
      id: "medium",
      symbol: "through",
      name: "The sound travels through",
      meaning: "A gas, a liquid, a solid — or nothing at all.",
      binding: { kind: "param", key: "medium" },
      control: {
        type: "choice",
        options: [
          { value: "air", label: "Air" },
          { value: "water", label: "Water" },
          { value: "steel", label: "Steel" },
          { value: "vacuum", label: "Vacuum" },
        ],
      },
      group: "primary",
      color: "neutral",
    },
    {
      id: "wallDistance",
      symbol: "d",
      name: "Distance to the wall",
      meaning: "How far away the wall that reflects the clap is.",
      binding: { kind: "state", key: "wallDistance" },
      control: { type: "range", unit: "m", min: 5, max: 500, step: 5 },
      group: "primary",
      color: "secant",
    },
  ],

  quantities: [
    {
      id: "speed",
      symbol: "v",
      name: "Speed of sound",
      meaning: "How fast the vibration travels through the medium.",
      result: "speed",
      format: { kind: "number", digits: 0 },
      unit: "m/s",
      color: "tangent",
      highlight: "particles",
      headline: true,
    },
    {
      id: "wavelength",
      symbol: "λ",
      name: "Wavelength",
      meaning: "The distance from one compression to the next.",
      result: "wavelength",
      format: { kind: "number", digits: 2 },
      unit: "m",
      color: "angle",
      highlight: "trace",
      headline: true,
    },
    {
      id: "pitch",
      symbol: "pitch",
      name: "Pitch",
      meaning: "How high or low the note sounds.",
      result: "pitch",
      format: { kind: "label", labels: { "0": "low", "1": "middle", "2": "high" } },
      color: "sine",
      headline: true,
    },
    {
      id: "loudness",
      symbol: "loudness",
      name: "Loudness",
      meaning: "How loud it sounds, compared with an amplitude of 1: it grows with the amplitude squared.",
      result: "loudness",
      format: { kind: "number", digits: 0 },
      color: "cosine",
      headline: true,
    },
    {
      id: "travels",
      symbol: "travels?",
      name: "Sound gets through",
      meaning: "Whether there are particles to carry the vibration.",
      result: "travels",
      format: { kind: "label", labels: { "0": "no — nothing to carry it", "1": "yes" } },
      color: "neutral",
    },
    {
      id: "distance",
      symbol: "d",
      name: "Distance to the wall",
      meaning: "How far away the reflecting wall is.",
      result: "wallDistance",
      format: { kind: "number", digits: 0 },
      unit: "m",
      color: "secant",
      highlight: "wall",
    },
    {
      id: "echoTime",
      symbol: "t",
      name: "Time for the echo",
      meaning: "From the clap until the echo gets back.",
      result: "echoTime",
      format: { kind: "number", digits: 2 },
      unit: "s",
      color: "angle",
      highlight: "wall",
      headline: true,
    },
    {
      id: "echoHeard",
      symbol: "echo?",
      name: "Heard as an echo",
      meaning: "Whether the echo is late enough, 0.1 s or more, to hear apart from the clap.",
      result: "echoHeard",
      format: { kind: "label", labels: { "0": "no — it blurs into the clap", "1": "yes" } },
      color: "tangent",
    },
    {
      id: "returned",
      symbol: "back?",
      name: "Echo is back",
      meaning: "Whether the clap has come home yet.",
      result: "returned",
      format: { kind: "label", labels: { "0": "not yet", "1": "yes" } },
      color: "tangent",
    },
  ],

  equations: [
    {
      id: "wave-speed",
      topic: "pitch-loudness",
      title: "Speed of a wave",
      words: "speed = frequency × wavelength",
      tokens: [
        { kind: "ref", id: "speed" },
        { kind: "op", value: "=" },
        { kind: "ref", id: "frequency" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "wavelength" },
      ],
      reading: "Each second f waves leave the speaker, each λ long, so the sound moves fλ metres a second. A higher note has shorter waves.",
      assumptions: ["A steady note in one medium"],
    },
    {
      id: "needs-a-medium",
      topic: "sound-needs-medium",
      title: "Sound needs a medium",
      words: "sound travels fastest in solids, slower in liquids, slower still in gases, and not at all in a vacuum",
      tokens: [
        { kind: "text", value: "no medium" },
        { kind: "op", value: "=" },
        { kind: "text", value: "no sound" },
      ],
      reading: "Sound is particles nudging their neighbours. Closely packed, springy particles pass the nudge on fastest; with no particles, there is nothing to pass it on.",
      assumptions: ["Room temperature"],
      discoverable: true,
    },
    {
      id: "echo-time",
      topic: "echo",
      title: "Echo",
      words: "speed of sound = 2 × distance to the wall ÷ time for the echo",
      tokens: [
        { kind: "ref", id: "speed" },
        { kind: "op", value: "=" },
        { kind: "text", value: "2" },
        { kind: "op", value: "·" },
        { kind: "ref", id: "distance" },
        { kind: "op", value: "/" },
        { kind: "ref", id: "echoTime" },
      ],
      reading: "The clap goes to the wall and back, twice the distance, in the echo time. Time an echo, and you can find the speed of sound — or the distance.",
      assumptions: ["The wall reflects the sound straight back"],
      discoverable: true,
    },
  ],

  simulation: {
    model: "sound",
    params: { medium: "air", frequency: 256, amplitude: 5 },
    playLabel: "Play the sound",
  },

  visualization: {
    renderer: "sound",
    hint: "Change the note, the loudness, or what the sound travels through. Switch to Echo to clap at a wall.",
    layers: [
      { id: "speaker", label: "Speaker" },
      { id: "particles", label: "Particles" },
      { id: "trace", label: "Pressure trace", optional: true },
      { id: "wall", label: "Wall" },
      { id: "labels", label: "Words", optional: true },
    ],
  },

  modes: [
    {
      id: "waves",
      label: "Sound waves",
      description: "Particles, pitch and loudness",
      layers: ["speaker", "particles", "trace", "labels"],
      graphs: [],
      equations: ["wave-speed", "needs-a-medium"],
    },
    {
      id: "echo",
      label: "Echo",
      description: "A clap, a wall, and the time to come back",
      layers: ["speaker", "wall", "labels"],
      graphs: [],
      equations: ["echo-time"],
    },
  ],
  defaultMode: "waves",
  graphs: [],

  activities: {
    observe: [
      {
        id: "high",
        prompt: "Make a high note.",
        condition: { type: "compare", quantity: "pitch", op: "eq", value: 2 },
      },
      {
        id: "silence",
        prompt: "Find where sound cannot travel at all.",
        condition: { type: "compare", quantity: "travels", op: "eq", value: 0 },
      },
    ],

    predict: [
      {
        id: "higher-note",
        question: "The note goes up from 200 Hz to 800 Hz, in air. What happens to the wavelength?",
        variable: "frequency",
        from: 200,
        to: 800,
        quantity: "wavelength",
        options: ["increase", "decrease", "same"],
        given: { medium: "air" },
        explanation: "It gets shorter — a quarter as long. The speed in air stays 343 m/s, so four times as many waves a second must each be a quarter the length.",
      },
    ],

    experiment: {
      title: "Echoes and distance",
      instructions: "In air, record the echo time for walls 50 m, 100 m, 200 m and 400 m away.",
      columns: ["distance", "echoTime", "speed"],
      minRows: 3,
      discovery: {
        question: "How does the echo time depend on the distance to the wall?",
        choices: [
          { id: "twice", label: "It is the time to go twice the distance: t = 2d / v", correct: true },
          { id: "once", label: "It is the time to go the distance once: t = d / v", correct: false },
          { id: "same", label: "It is always the same", correct: false },
          { id: "shorter", label: "Further walls echo sooner", correct: false },
        ],
        reveals: "echo-time",
        insight: "Double the distance, double the echo time — the clap has to get there and back.",
      },
    },

    explain: [
      {
        id: "vibration",
        title: "A vibration, passed on",
        body: "The speaker pushes the particles next to it, they push their neighbours, and the push travels outwards at {{speed}} m/s. The particles themselves only swing back and forth.",
      },
      {
        id: "pitch",
        title: "Pitch and loudness",
        body: "The faster the speaker vibrates, the higher the note: this one is {{pitch}}, with waves {{wavelength}} m long. A bigger swing — a bigger amplitude — makes the same note louder.",
      },
      {
        id: "echo",
        title: "Echoes",
        body: "A wall {{distance}} m away sends the clap back after {{echoTime}} s. Our ears need 0.1 s between the two to hear them apart — about 17 m of air each way.",
      },
    ],

    challenges: [
      {
        id: "one-second",
        title: "A one-second echo",
        prompt: "In air, place the wall so the echo comes back after 1 second.",
        goal: {
          type: "all",
          conditions: [
            { type: "compare", quantity: "speed", op: "eq", value: 343 },
            { type: "compare", quantity: "echoTime", op: "eq", value: 1, tolerance: 0.03 },
          ],
        },
        hint: "The sound travels 343 m in a second: there and back.",
        success: "About 170 m: the clap goes 170 m out and 170 m back in one second.",
      },
    ],
  },

  realWorld: [
    { title: "Thunder", description: "Count the seconds from the flash to the thunder and divide by three: that is roughly how many kilometres away the storm is." },
    { title: "SONAR", description: "Ships send sound down and time the echo from the sea bed. In water sound travels 1480 m/s, so a 2 s echo means 1480 m deep." },
    { title: "Ear to the rail", description: "Sound runs through a steel rail about seventeen times faster than through air, so you hear a train in the rail first." },
  ],
});
