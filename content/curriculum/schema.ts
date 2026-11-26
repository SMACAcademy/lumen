/**
 * The curriculum: every concept the app intends to teach, with what is built
 * today and what is planned. It is the product plan in machine-readable form —
 * the syllabus screen, the subject pages, the roadmap and the coverage counts
 * all read it.
 *
 * Scope: maths, physics and chemistry from class 6 to class 12, following
 * NCERT. Class 6–10 is the school foundation, with no exam tags; class 11–12
 * is tagged with what JEE Main, JEE Advanced and NEET examine.
 */

/** The three subjects the app is organised around. */
export type Subject = "maths" | "physics" | "chemistry";

export const SUBJECTS: readonly Subject[] = ["maths", "physics", "chemistry"];

export type Status =
  /** Playable today. */
  | "ready"
  /** Being built now. */
  | "building"
  /** Designed, not started. */
  | "planned";

/** The class a chapter is taught in. */
export type Grade = 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const GRADES: readonly Grade[] = [6, 7, 8, 9, 10, 11, 12];

/** Three stretches of school, worked out from the class and never stored. */
export type Stage = "foundation" | "bridge" | "advanced";

export const STAGES: readonly Stage[] = ["foundation", "bridge", "advanced"];

export const STAGE_INFO: Record<Stage, { title: string; classes: string }> = {
  foundation: { title: "Foundation", classes: "Class 6–8" },
  bridge: { title: "Bridge", classes: "Class 9–10" },
  advanced: { title: "Advanced", classes: "Class 11–12" },
};

export function stageOf(grade: Grade): Stage {
  return grade <= 8 ? "foundation" : grade <= 10 ? "bridge" : "advanced";
}

export function gradeLabel(grade: Grade): string {
  return `Class ${grade}`;
}

export type Exam = "jee-main" | "jee-adv" | "neet";

export const ALL_EXAMS: readonly Exam[] = ["jee-main", "jee-adv", "neet"];

/**
 * A simulation kit is a reusable model + renderer family. Several chapters
 * share one kit, which is what keeps the build tractable: the kit is written
 * once and every chapter on it becomes content.
 */
export type KitId =
  | "graphing"
  | "vectors"
  | "kinematics"
  | "forces"
  | "collisions"
  | "rotation"
  | "orbits"
  | "materials"
  | "fluids"
  | "thermal"
  | "gas"
  | "oscillator"
  | "waves"
  | "efield"
  | "circuits"
  | "magnetics"
  | "rays"
  | "waveoptics"
  | "quantum"
  | "nuclear"
  | "semiconductor"
  | "measurement"
  // Mathematics
  | "geometry"
  | "counting"
  | "matrices"
  | "probability"
  // Chemistry
  | "atoms"
  | "molecules"
  | "reactions"
  | "solutions"
  | "electrochem"
  // School foundation
  | "number-line"
  | "balance-scale"
  | "cards";

export interface CurriculumConcept {
  id: string;
  title: string;
  status: Status;
  /** The entrance exams that ask for it. Empty for class 6–10. */
  exams: readonly Exam[];
  /** Earlier concepts this one grows from. `leadsTo` is their inverse, worked out in the index. */
  buildsOn?: readonly string[];
  /** What exists today: an open lab and/or a playable level. */
  built?: { lab?: string; level?: string };
  /** One line on what the learner will do, when it is not obvious from the title. */
  note?: string;
}

export interface Chapter {
  id: string;
  title: string;
  /** The class it is taught in, following NCERT. */
  grade: Grade;
  /** The simulation kit this chapter needs. */
  kit: KitId;
  /** Build order: chapters in the same wave ship together. */
  wave: number;
  blurb: string;
  concepts: readonly CurriculumConcept[];
}

export interface Branch {
  id: string;
  title: string;
  tagline: string;
  subject: Subject;
  /** Each branch has its own colour, defined in CSS as `--branch-<id>`. */
  chapters: readonly Chapter[];
}

// ── Authoring helpers, so the data below stays readable ──────────────────────

/** A concept. Planned and examined by all three exams unless said otherwise. */
export function c(id: string, title: string, extra: Partial<CurriculumConcept> = {}): CurriculumConcept {
  return { id, title, status: "planned", exams: ALL_EXAMS, ...extra };
}

/** A school concept, class 6–10: planned, and examined by no entrance exam. */
export function s(id: string, title: string, extra: Partial<CurriculumConcept> = {}): CurriculumConcept {
  return { id, title, status: "planned", exams: [], ...extra };
}

/** A concept that JEE asks for and NEET does not. */
export function jee(id: string, title: string, extra: Partial<CurriculumConcept> = {}): CurriculumConcept {
  return c(id, title, { exams: ["jee-main", "jee-adv"], ...extra });
}

/** A concept only JEE Advanced asks for. */
export function advanced(id: string, title: string, extra: Partial<CurriculumConcept> = {}): CurriculumConcept {
  return c(id, title, { exams: ["jee-adv"], ...extra });
}

export function chapter(
  id: string,
  title: string,
  meta: { grade: Grade; kit: KitId; wave: number; blurb: string },
  concepts: readonly CurriculumConcept[],
): Chapter {
  return { id, title, ...meta, concepts };
}

export function branch(
  id: string,
  title: string,
  tagline: string,
  chapters: readonly Chapter[],
  subject: Subject = "physics",
): Branch {
  return { id, title, tagline, subject, chapters };
}
