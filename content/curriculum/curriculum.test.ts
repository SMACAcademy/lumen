import { describe, expect, it } from "vitest";
import { concepts as builtConcepts, levels as builtLevels } from "../index";
import {
  allChapters,
  allConcepts,
  branchCoverage,
  branchesOf,
  buildsOnOf,
  buildWaves,
  chaptersByKit,
  coverage,
  curriculum,
  findConcept,
  forExam,
  leadsToOf,
  GRADES,
  SUBJECTS,
  spineProblems,
  subjectCoverage,
} from "./index";

const ID = /^[a-z][a-z0-9-]*$/;

describe("the curriculum catalogue", () => {
  it("has unique ids everywhere", () => {
    const ids = [
      ...curriculum.map((b) => b.id),
      ...allChapters().map((e) => e.chapter.id),
      ...allConcepts().map((e) => e.concept.id),
    ];
    const seen = new Set<string>();
    const duplicates = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    expect(duplicates).toEqual([]);
    for (const id of ids) expect(id).toMatch(ID);
  });

  it("covers every class from 6 to 12", () => {
    const grades = new Set(allChapters().map((e) => e.chapter.grade));
    expect(grades).toEqual(new Set(GRADES));
    for (const branch of curriculum) expect(branch.chapters.length).toBeGreaterThan(0);
    for (const { chapter } of allChapters()) expect(chapter.concepts.length).toBeGreaterThan(2);
  });

  it("is big enough to be the whole syllabus, and mostly still to build", () => {
    const total = coverage();
    expect(total.total).toBeGreaterThan(180);
    expect(total.ready).toBe(total.total - total.planned - total.building);
  });

  it("class 11–12 concepts name an exam; school concepts name none", () => {
    for (const { concept, chapter } of allConcepts()) {
      if (chapter.grade >= 11) expect(concept.exams.length, concept.id).toBeGreaterThan(0);
      else expect(concept.exams, concept.id).toEqual([]);
    }
  });

  it("has school depth in every subject", () => {
    for (const subject of SUBJECTS) {
      const school = allConcepts().filter((e) => e.branch.subject === subject && e.chapter.grade <= 10);
      expect(school.length, subject).toBeGreaterThan(25);
    }
  });

  it("links the class 11–12 chapters back to their school roots", () => {
    const linked = allConcepts().filter((e) => e.chapter.grade >= 11 && (e.concept.buildsOn?.length ?? 0) > 0);
    expect(linked.length).toBeGreaterThanOrEqual(60);
    expect(leadsToOf("speed-school").map((e) => e.concept.id)).toContain("speed-velocity");
    expect(buildsOnOf("unit-circle").map((e) => e.concept.id)).toEqual(["trig-ratios"]);
  });

  it("has a sound spine: links exist, point to the same or an earlier class, and never loop", () => {
    expect(spineProblems(allConcepts())).toEqual([]);
  });

  it("NEET and JEE each get most of the catalogue, and JEE gets more", () => {
    const neet = forExam("neet").length;
    const main = forExam("jee-main").length;
    const adv = forExam("jee-adv").length;
    expect(neet).toBeGreaterThan(150);
    expect(adv).toBeGreaterThanOrEqual(main);
    expect(main).toBeGreaterThan(neet);
  });

  it("anything marked ready or building points at something that exists", () => {
    const labIds = new Set(builtConcepts.map((c) => c.meta.id));
    const levelIds = new Set(builtLevels.map((l) => l.id));
    for (const { concept } of allConcepts()) {
      if (concept.status === "planned") {
        expect(concept.built).toBeUndefined();
        continue;
      }
      expect(concept.built, `${concept.id} is ${concept.status} but nothing is built`).toBeDefined();
      if (concept.built?.lab) expect(labIds).toContain(concept.built.lab);
      if (concept.built?.level) expect(levelIds).toContain(concept.built.level);
    }
  });

  it("everything built is in the catalogue", () => {
    const referenced = new Set(allConcepts().flatMap((e) => [e.concept.built?.lab, e.concept.built?.level].filter(Boolean)));
    for (const concept of builtConcepts) expect(referenced).toContain(concept.meta.id);
    for (const level of builtLevels) expect(referenced).toContain(level.id);
  });

  it("groups into build waves and reusable kits", () => {
    const waves = buildWaves();
    expect(waves[0]!.wave).toBe(0);
    expect(waves.map((w) => w.wave)).toEqual([...waves.map((w) => w.wave)].sort((a, b) => a - b));
    // Reuse is the point: most kits serve more than one chapter.
    const kits = chaptersByKit();
    expect(kits.filter((k) => k.chapters.length > 1).length).toBeGreaterThan(kits.length / 3);
  });

  it("is organised into maths, physics and chemistry, each with real depth", () => {
    for (const subject of SUBJECTS) {
      expect(branchesOf(subject).length, subject).toBeGreaterThan(1);
      expect(subjectCoverage(subject).total, subject).toBeGreaterThan(60);
    }
    // Every branch belongs to exactly one subject, and the three add up to the whole.
    const sum = SUBJECTS.reduce((n, subject) => n + subjectCoverage(subject).total, 0);
    expect(sum).toBe(coverage().total);
  });

  it("keeps measurement with physics and the toolkit with maths", () => {
    expect(findConcept("errors")?.branch.subject).toBe("physics");
    expect(findConcept("unit-circle")?.branch.subject).toBe("maths");
    expect(findConcept("mole-concept")?.branch.subject).toBe("chemistry");
  });

  it("mathematics is for JEE only, since NEET has no maths paper", () => {
    const jeeOnly = branchesOf("maths")
      .filter((b) => b.id !== "toolkit")
      .flatMap((b) => b.chapters.flatMap((ch) => ch.concepts));
    for (const concept of jeeOnly) expect(concept.exams, concept.id).not.toContain("neet");
  });

  it("finds a concept and reports coverage per branch", () => {
    const found = findConcept("projectile-motion");
    expect(found?.chapter.id).toBe("motion-in-a-plane");
    expect(found?.branch.id).toBe("motion");
    expect(findConcept("nope")).toBeUndefined();
    expect(branchCoverage(findConcept("unit-circle")!.branch).ready).toBeGreaterThan(0);
  });
});
