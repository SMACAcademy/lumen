import { branchesOf, concepts, type Coverage, type Subject, SUBJECTS, subjectCoverage, worlds } from "@ise/content";
import type { Concept } from "@ise/concept-schema";
import type { World } from "@ise/game-engine";
import { subjectOfWorld } from "./journey";

/**
 * The three subjects as the app presents them: what each is called, the one
 * line that sells it, its colour, and what can be played in it today.
 */
export interface SubjectInfo {
  id: Subject;
  title: string;
  /** Short and memorable: what the subject is *for*. */
  motto: string;
  tagline: string;
  /** A CSS colour, defined once per theme in globals.css. */
  color: string;
}

export const SUBJECT_INFO: Record<Subject, SubjectInfo> = {
  maths: {
    id: "maths",
    title: "Maths",
    motto: "The language",
    tagline: "Circles become waves, slopes become rates, and every graph tells a story you can drag.",
    color: "var(--subject-maths)",
  },
  physics: {
    id: "physics",
    title: "Physics",
    motto: "The rules",
    tagline: "Launch it, load it, heat it, spin it — and discover the law that was running it all along.",
    color: "var(--subject-physics)",
  },
  chemistry: {
    id: "chemistry",
    title: "Chemistry",
    motto: "The stuff",
    tagline: "Atoms that glow in sharp colours, reactions you can race and cool — and molecules you can turn in your hand next.",
    color: "var(--subject-chemistry)",
  },
};

export { SUBJECTS };

export function isSubject(value: string): value is Subject {
  return (SUBJECTS as readonly string[]).includes(value);
}

/** Which subject an open lab belongs to. */
export function subjectOfConcept(concept: Concept): Subject {
  const { domain } = concept.meta;
  return domain === "mathematics" ? "maths" : domain === "chemistry" ? "chemistry" : "physics";
}

export function labsOf(subject: Subject): Concept[] {
  return concepts.filter((c) => subjectOfConcept(c) === subject);
}

export function worldsOf(subject: Subject): World[] {
  return worlds.filter((w) => subjectOfWorld(w) === subject);
}

/** Everything a subject card needs, in one place. */
export interface SubjectSummary {
  info: SubjectInfo;
  coverage: Coverage;
  labs: number;
  worlds: number;
  levels: number;
  chapters: number;
}

export function summarise(subject: Subject): SubjectSummary {
  const subjectWorlds = worldsOf(subject);
  return {
    info: SUBJECT_INFO[subject],
    coverage: subjectCoverage(subject),
    labs: labsOf(subject).length,
    worlds: subjectWorlds.length,
    levels: subjectWorlds.reduce((n, w) => n + w.levels.length, 0),
    chapters: branchesOf(subject).reduce((n, b) => n + b.chapters.length, 0),
  };
}
