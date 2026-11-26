import type { Subject } from "@ise/content";

/**
 * The science world's inhabitants. Every object stands for a real concept in
 * the syllabus, and the three subjects each get their own stretch of space:
 * the camera flies through maths, then physics, then chemistry as the page
 * scrolls. This file is plain data so it can be checked without WebGL.
 */
export type WorldObjectKind =
  | "helix"
  | "conic"
  | "vectors"
  | "riemann"
  | "die"
  | "atom"
  | "orbit"
  | "pendulum"
  | "prism"
  | "magnet"
  | "water"
  | "benzene"
  | "lattice"
  | "dna"
  | "methane";

export interface WorldObject {
  kind: WorldObjectKind;
  subject: Subject;
  /** The syllabus concept it stands for (an id in the curriculum). */
  concept: string;
  /** That concept, as a learner would name it. */
  title: string;
  /** One line on what the object shows. */
  caption: string;
  /** Where it sits: x to the side (scaled down on narrow screens), y up, z into the scene. */
  position: readonly [number, number, number];
  /** Overall size, so objects read at a similar weight. */
  scale: number;
}

/** How far apart objects sit along the flight path, and where each subject's stretch starts. */
export const SPACING = 9;
export const ZONE_START: Record<Subject, number> = { maths: -2, physics: -52, chemistry: -102 };

const lane = (subject: Subject, i: number, side: 1 | -1, y: number): readonly [number, number, number] => [
  side * (3.4 + (i % 2) * 0.9),
  y,
  ZONE_START[subject] - i * SPACING,
];

export const WORLD_OBJECTS: readonly WorldObject[] = [
  // Maths: the language.
  { kind: "helix", concept: "unit-circle", subject: "maths", title: "Sine and cosine", caption: "A turning circle, unrolled into a wave", position: lane("maths", 0, 1, 0.4), scale: 1 },
  { kind: "conic", concept: "ellipse", subject: "maths", title: "Conic sections", caption: "Slice a cone: circle, ellipse, parabola", position: lane("maths", 1, -1, -0.3), scale: 1 },
  { kind: "vectors", concept: "vectors-in-space", subject: "maths", title: "Vectors in 3D", caption: "Three arrows, one resultant", position: lane("maths", 2, 1, 0.2), scale: 1 },
  { kind: "riemann", concept: "definite-integral-limits", subject: "maths", title: "Integration", caption: "The area under a curve, slice by slice", position: lane("maths", 3, -1, 0), scale: 1 },
  { kind: "die", concept: "classical-probability", subject: "maths", title: "Probability", caption: "Twenty faces, one chance each", position: lane("maths", 4, 1, -0.2), scale: 1 },

  // Physics: the rules.
  { kind: "atom", concept: "bohr-model", subject: "physics", title: "The Bohr atom", caption: "Electrons in allowed orbits", position: lane("physics", 0, -1, 0.3), scale: 1 },
  { kind: "orbit", concept: "keplers-laws", subject: "physics", title: "Gravitation", caption: "Kepler's ellipse, fastest at perigee", position: lane("physics", 1, 1, -0.2), scale: 1 },
  { kind: "pendulum", concept: "simple-pendulum", subject: "physics", title: "Oscillations", caption: "Simple harmonic motion", position: lane("physics", 2, -1, 0.6), scale: 1 },
  { kind: "prism", concept: "dispersion", subject: "physics", title: "Dispersion", caption: "White light, split by a prism", position: lane("physics", 3, 1, 0), scale: 1 },
  { kind: "magnet", concept: "magnetic-field-lines", subject: "physics", title: "Magnetism", caption: "Field lines from pole to pole", position: lane("physics", 4, -1, -0.1), scale: 1 },

  // Chemistry: the stuff.
  { kind: "water", concept: "bond-parameters", subject: "chemistry", title: "Chemical bonding", caption: "H₂O, bent at 104.5°", position: lane("chemistry", 0, 1, 0.2), scale: 1 },
  { kind: "benzene", concept: "aromaticity", subject: "chemistry", title: "Aromatic compounds", caption: "Benzene's ring of six", position: lane("chemistry", 1, -1, -0.2), scale: 1 },
  { kind: "lattice", concept: "ionic-covalent", subject: "chemistry", title: "Ionic solids", caption: "Na⁺ and Cl⁻, stacked in a cube", position: lane("chemistry", 2, 1, 0.1), scale: 1 },
  { kind: "dna", concept: "nucleic-acids", subject: "chemistry", title: "Biomolecules", caption: "DNA's double helix", position: lane("chemistry", 3, -1, 0.3), scale: 1 },
  { kind: "methane", concept: "hybridisation", subject: "chemistry", title: "Molecular shape", caption: "CH₄: a tetrahedron, 109.5°", position: lane("chemistry", 4, 1, -0.3), scale: 1 },
];

/** Where the camera should hover to look at a subject's stretch of space. */
export function zoneCameraZ(subject: Subject): number {
  return ZONE_START[subject] + 7;
}

/** The camera's start and end, before and after every object. */
export const CAMERA_START_Z = 12;
export const CAMERA_END_Z = ZONE_START.chemistry - 4 * SPACING - 6;

/**
 * Turn the page's scroll position into a camera depth. Sections mark the
 * depth they want with `stops`: the scroll offset where they sit and the z the
 * camera should be at there. Between stops the camera glides linearly.
 */
export function cameraZAt(scroll: number, stops: readonly { at: number; z: number }[]): number {
  if (stops.length === 0) return CAMERA_START_Z;
  const sorted = [...stops].sort((a, b) => a.at - b.at);
  if (scroll <= sorted[0]!.at) return sorted[0]!.z;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1]!;
    const b = sorted[i]!;
    if (scroll <= b.at) {
      const t = b.at === a.at ? 1 : (scroll - a.at) / (b.at - a.at);
      // Ease in and out, so the camera settles at each subject instead of drifting past.
      const eased = t * t * (3 - 2 * t);
      return a.z + (b.z - a.z) * eased;
    }
  }
  return sorted[sorted.length - 1]!.z;
}

/** On a narrow screen objects move in towards the centre so they stay in view. */
export function lateralScale(aspect: number): number {
  return Math.max(0.42, Math.min(1, aspect / 1.4));
}
