import { electromagnetism } from "./electromagnetism";
import { forces, motion, rotation } from "./mechanics";
import { matter, waves } from "./matter";
import { modern, optics } from "./optics-and-modern";
import { chemistryBranches } from "./chemistry";
import { mathsBranches } from "./maths";
import { schoolMathsBranches } from "./school-maths";
import { schoolPhysicsBranches } from "./school-physics";
import { schoolChemistryBranches } from "./school-chemistry";
import { type Branch, type Chapter, type CurriculumConcept, type Exam, type Grade, type KitId, type Stage, type Status, type Subject, stageOf } from "./schema";
import { measurement, toolkit } from "./toolkit";

/** The whole syllabus: maths, then physics, then chemistry, each from class 6 up in teaching order. */
export const curriculum: readonly Branch[] = [
  ...schoolMathsBranches,
  toolkit,
  ...mathsBranches,
  ...schoolPhysicsBranches,
  measurement,
  motion,
  forces,
  rotation,
  matter,
  waves,
  electromagnetism,
  optics,
  modern,
  ...schoolChemistryBranches,
  ...chemistryBranches,
];

/** The branches of one subject, in teaching order. */
export function branchesOf(subject: Subject): Branch[] {
  return curriculum.filter((branch) => branch.subject === subject);
}

export * from "./schema";

export interface ConceptLocation {
  concept: CurriculumConcept;
  chapter: Chapter;
  branch: Branch;
}

/** Every concept, with the chapter and branch it belongs to. */
export function allConcepts(): ConceptLocation[] {
  return curriculum.flatMap((branch) =>
    branch.chapters.flatMap((chapter) => chapter.concepts.map((concept) => ({ concept, chapter, branch }))),
  );
}

export function allChapters(): { chapter: Chapter; branch: Branch }[] {
  return curriculum.flatMap((branch) => branch.chapters.map((chapter) => ({ chapter, branch })));
}

export function findConcept(id: string): ConceptLocation | undefined {
  return allConcepts().find((entry) => entry.concept.id === id);
}

export interface Coverage {
  ready: number;
  building: number;
  planned: number;
  total: number;
}

export function coverage(concepts: readonly CurriculumConcept[] = allConcepts().map((e) => e.concept)): Coverage {
  const count = (status: Status) => concepts.filter((concept) => concept.status === status).length;
  return { ready: count("ready"), building: count("building"), planned: count("planned"), total: concepts.length };
}

export function chapterCoverage(chapter: Chapter): Coverage {
  return coverage(chapter.concepts);
}

export function branchCoverage(branch: Branch): Coverage {
  return coverage(branch.chapters.flatMap((chapter) => chapter.concepts));
}

export function subjectCoverage(subject: Subject): Coverage {
  return coverage(branchesOf(subject).flatMap((branch) => branch.chapters.flatMap((chapter) => chapter.concepts)));
}

/** Concepts an exam asks for. */
export function forExam(exam: Exam): ConceptLocation[] {
  return allConcepts().filter((entry) => entry.concept.exams.includes(exam));
}

/** Chapters grouped by the simulation kit they need — the build plan, by reusable. */
export function chaptersByKit(): { kit: KitId; chapters: Chapter[] }[] {
  const map = new Map<KitId, Chapter[]>();
  for (const { chapter } of allChapters()) {
    const list = map.get(chapter.kit) ?? [];
    list.push(chapter);
    map.set(chapter.kit, list);
  }
  return [...map.entries()].map(([kit, chapters]) => ({ kit, chapters }));
}

/** Chapters in build order, grouped into waves. */
export function buildWaves(): { wave: number; chapters: { chapter: Chapter; branch: Branch }[] }[] {
  const map = new Map<number, { chapter: Chapter; branch: Branch }[]>();
  for (const entry of allChapters()) {
    const list = map.get(entry.chapter.wave) ?? [];
    list.push(entry);
    map.set(entry.chapter.wave, list);
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([wave, chapters]) => ({ wave, chapters }));
}

// ── The spine: how a class 6 idea grows into a class 12 one ──────────────────

/** The earlier concepts one concept grows from. */
export function buildsOnOf(id: string): ConceptLocation[] {
  const ids = findConcept(id)?.concept.buildsOn ?? [];
  return ids.flatMap((other) => findConcept(other) ?? []);
}

/** The later concepts that grow from this one. */
export function leadsToOf(id: string): ConceptLocation[] {
  return allConcepts().filter((entry) => entry.concept.buildsOn?.includes(id));
}

/** Concepts taught in one stage of school. */
export function forStage(stage: Stage): ConceptLocation[] {
  return allConcepts().filter((entry) => stageOf(entry.chapter.grade) === stage);
}

/** A level's class: the lowest class of the concepts it is the level for. Null when nothing names it. */
export function gradeOfLevel(levelId: string): Grade | null {
  const grades = allConcepts()
    .filter((entry) => entry.concept.built?.level === levelId)
    .map((entry) => entry.chapter.grade);
  return grades.length === 0 ? null : (Math.min(...grades) as Grade);
}

/** Everything wrong with the spine: unknown ids, links to a later class, and cycles. Empty when sound. */
export function spineProblems(entries: readonly { concept: CurriculumConcept; chapter: { grade: Grade } }[]): string[] {
  const byId = new Map(entries.map((entry) => [entry.concept.id, entry]));
  const problems: string[] = [];
  for (const { concept, chapter } of entries) {
    for (const id of concept.buildsOn ?? []) {
      const other = byId.get(id);
      if (!other) problems.push(`${concept.id} builds on unknown ${id}`);
      else if (other.chapter.grade > chapter.grade)
        problems.push(`${concept.id} (class ${chapter.grade}) builds on ${id} (class ${other.chapter.grade})`);
    }
  }
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string, path: string[]): void => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") {
      problems.push(`cycle: ${[...path.slice(path.indexOf(id)), id].join(" → ")}`);
      return;
    }
    state.set(id, "visiting");
    for (const next of byId.get(id)?.concept.buildsOn ?? []) if (byId.has(next)) visit(next, [...path, id]);
    state.set(id, "done");
  };
  for (const id of byId.keys()) visit(id, []);
  return problems;
}
