import { worlds } from "@ise/content";
import { emptySnapshot, type Snapshot } from "@ise/progress-store";
import { describe, expect, it } from "vitest";
import { bandOf, buildJourney, learnerClass } from "./journey";

/** A snapshot in which these levels have been completed. */
function played(ids: readonly string[], stars = 3): Snapshot {
  const snapshot = emptySnapshot();
  for (const id of ids) {
    (snapshot.levels as Record<string, unknown>)[id] = {
      stars,
      score: 100,
      xp: 10,
      plays: 1,
      firstCompletedAt: "2026-09-24T10:00:00.000Z",
      lastPlayedAt: "2026-09-24T10:00:00.000Z",
    };
  }
  return snapshot;
}

describe("unlocking", () => {
  it("opens the first level of every world to a brand-new learner", () => {
    // The old rule opened only World 1, and nothing ever opened the rest.
    const journey = buildJourney(emptySnapshot());
    for (const w of journey.worlds) {
      expect(w.levels[0]?.locked, w.world.id).toBe(false);
    }
  });

  it("keeps the rest of a world locked until the level before is done", () => {
    const journey = buildJourney(emptySnapshot());
    for (const w of journey.worlds) {
      for (const later of w.levels.slice(1)) expect(later.locked, later.level.id).toBe(true);
    }
  });

  it("finishing a level opens the next one in the same world, and only that one", () => {
    const forces = worlds.find((w) => w.id === "forces")!;
    const journey = buildJourney(played([forces.levels[0]!]));
    const w = journey.worlds.find((x) => x.world.id === "forces")!;
    expect(w.levels.map((l) => l.locked)).toEqual([false, false, ...w.levels.slice(2).map(() => true)]);
  });

  it("a level already played stays open even if an earlier one is not", () => {
    const motion = worlds.find((w) => w.id === "motion")!;
    const third = motion.levels[2]!;
    const journey = buildJourney(played([third]));
    const status = journey.worlds.find((x) => x.world.id === "motion")!.levels.find((l) => l.level.id === third)!;
    expect(status.locked).toBe(false);
  });
});

describe("what to do next", () => {
  it("suggests the very first level to a new learner", () => {
    expect(buildJourney(emptySnapshot()).next?.level.id).toBe(worlds[0]!.levels[0]);
  });

  it("carries on in the world the learner is working through, before starting a new one", () => {
    const motion = worlds.find((w) => w.id === "motion")!;
    const journey = buildJourney(played([motion.levels[0]!]));
    expect(journey.next?.level.id).toBe(motion.levels[1]);
  });

  it("offers a better score once everything has been played", () => {
    const all = worlds.flatMap((w) => w.levels);
    const journey = buildJourney(played(all, 2));
    expect(journey.next?.best?.stars).toBe(2);
    expect(journey.allPerfect).toBe(false);
    expect(buildJourney(played(all, 3)).allPerfect).toBe(true);
  });
});

describe("subjects", () => {
  it("labels every world with the subject its levels belong to", () => {
    const journey = buildJourney(emptySnapshot());
    const bySubject = Object.fromEntries(journey.worlds.map((w) => [w.world.id, w.subject]));
    expect(bySubject["circles-and-waves"]).toBe("maths");
    expect(bySubject.forces).toBe("physics");
    expect(bySubject.heat).toBe("physics");
  });
});

/** A snapshot for a learner in this class (or "just exploring" with null). */
function inClass(year: number | null, base: Snapshot = emptySnapshot()): Snapshot {
  return { ...base, profile: { ...base.profile, year, yearAsked: true } };
}

describe("classes and bands", () => {
  it("sorts worlds into your class, warm-up and peek ahead", () => {
    expect(bandOf(7, 7)).toBe("yours");
    expect(bandOf(6, 7)).toBe("warm-up");
    expect(bandOf(11, 7)).toBe("ahead");
    // Class 11 and 12 are one syllabus for JEE and NEET.
    expect(bandOf(11, 12)).toBe("yours");
    expect(bandOf(12, 11)).toBe("yours");
    expect(bandOf(9, 12)).toBe("warm-up");
  });

  it("knows each world's class from the syllabus", () => {
    const journey = buildJourney(emptySnapshot());
    const circles = journey.worlds.find((w) => w.levels.some((l) => l.level.id === "shadow-of-a-dot"))!;
    expect(circles.grade).toBe(11);
    for (const w of journey.worlds) expect([6, 7, 8, 9, 10, 11, 12], w.world.id).toContain(w.grade);
  });

  it("reads the learner's class, and only a real one", () => {
    expect(learnerClass(inClass(7))).toBe(7);
    expect(learnerClass(inClass(null))).toBeNull();
    expect(learnerClass(inClass(5))).toBeNull();
    expect(learnerClass(emptySnapshot())).toBeNull();
  });

  it("offers a level from the nearest other class once the learner's own is all done", () => {
    // Every class 10 level played with three stars: the nearest classes below come next.
    const own = buildJourney(inClass(10)).worlds.filter((w) => w.grade === 10).flatMap((w) => w.levels.map((l) => l.level.id));
    expect(own.length).toBeGreaterThan(0);
    const journey = buildJourney(inClass(10, played(own)));
    expect(journey.learner).toBe(10);
    expect(journey.nextBand).toBe("warm-up");
    const grade = journey.worlds.find((w) => w.world.id === journey.next!.world.id)!.grade;
    expect(grade).toBeLessThan(10);
    expect(journey.worlds.some((w) => w.grade > grade && w.grade < 10)).toBe(false);
  });

  it("offers the learner's own class first", () => {
    expect(buildJourney(inClass(11)).nextBand).toBe("yours");
  });

  it("without a class, behaves exactly as before", () => {
    const journey = buildJourney(inClass(null));
    expect(journey.nextBand).toBeNull();
    expect(journey.next?.level.id).toBe(worlds[0]!.levels[0]);
  });
});
