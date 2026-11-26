import { levels as allLevels, worlds as allWorlds, getConcept, getLevel, gradeOfLevel, GRADES, type Grade, type Subject } from "@ise/content";
import type { Level, World } from "@ise/game-engine";
import type { LevelBest, Snapshot } from "@ise/progress-store";

/** A level as the learner sees it: played or not, open or still locked. */
export interface LevelStatus {
  level: Level;
  world: World;
  best: LevelBest | null;
  locked: boolean;
}

export interface WorldProgress {
  world: World;
  /** The subject the world teaches, read from the concepts its levels use. */
  subject: Subject;
  /** The class the world is taught in: the lowest class of its levels. */
  grade: Grade;
  levels: LevelStatus[];
  completed: number;
  total: number;
  stars: number;
  maxStars: number;
}

export interface Journey {
  worlds: WorldProgress[];
  /** What to offer on the Today screen: the next unplayed level, else one worth a better score. */
  next: LevelStatus | null;
  /** True when every level has been played with all three stars. */
  allPerfect: boolean;
  /** The learner's class, or null when they have not said or are just exploring. */
  learner: Grade | null;
  /** Which band "next" came from; null without a learner class. */
  nextBand: Band | null;
}

/** Where a world sits relative to the learner's class. */
export type Band = "yours" | "warm-up" | "ahead";

/** The learner's class, if it is a real one (6–12). */
export function learnerClass(snapshot: Snapshot): Grade | null {
  const year = snapshot.profile.year;
  return year !== null && (GRADES as readonly number[]).includes(year) ? (year as Grade) : null;
}

/**
 * Class 11 and 12 are one syllabus for JEE and NEET, so for those learners both
 * years are their own; below that, a class is its own band.
 */
export function bandOf(worldGrade: Grade, learner: Grade): Band {
  if (learner >= 11) return worldGrade >= 11 ? "yours" : "warm-up";
  return worldGrade === learner ? "yours" : worldGrade < learner ? "warm-up" : "ahead";
}

/** Which subject a world belongs to: that of the concept its first level teaches. */
export function subjectOfWorld(world: World): Subject {
  const first = world.levels[0] ? getLevel(world.levels[0]) : undefined;
  const domain = first ? getConcept(first.concept)?.meta.domain : undefined;
  return domain === "mathematics" ? "maths" : domain === "chemistry" ? "chemistry" : "physics";
}

/** A world's class: the lowest class of its levels. Every level is in the syllabus, so 11 is only a guard. */
function gradeOfWorld(levelIds: readonly string[]): Grade {
  const grades = levelIds.map(gradeOfLevel).filter((g): g is Grade => g !== null);
  return grades.length === 0 ? 11 : (Math.min(...grades) as Grade);
}

/** The next level within some worlds: finish a started world, then something fresh, then a better score. */
function pickNext(worlds: readonly WorldProgress[]): LevelStatus | null {
  const flat = worlds.flatMap((w) => w.levels);
  const fresh = (l: LevelStatus) => !l.best && !l.locked;
  // Finish what has been started before opening something new.
  const inProgress = worlds.filter((w) => w.completed > 0 && w.completed < w.total).flatMap((w) => w.levels);
  return (
    inProgress.find(fresh) ??
    flat.find(fresh) ??
    [...flat].filter((l) => l.best && l.best.stars < 3).sort((a, b) => a.best!.stars - b.best!.stars)[0] ??
    null
  );
}

/** Worlds in the order "Up next" searches them: your class, then the nearest classes below, then above. */
function searchOrder(worlds: readonly WorldProgress[], learner: Grade): { band: Band; worlds: WorldProgress[] }[] {
  const byGrade = (band: Band, nearestFirst: (a: Grade, b: Grade) => number) => {
    const inBand = worlds.filter((w) => bandOf(w.grade, learner) === band);
    return [...new Set(inBand.map((w) => w.grade))].sort(nearestFirst).map((g) => ({ band, worlds: inBand.filter((w) => w.grade === g) }));
  };
  return [
    { band: "yours", worlds: worlds.filter((w) => bandOf(w.grade, learner) === "yours") },
    ...byGrade("warm-up", (a, b) => b - a),
    ...byGrade("ahead", (a, b) => a - b),
  ];
}

/**
 * Joins authored content with the learner's progress.
 *
 * Every world's first level is open from the start, so a student revising one
 * chapter for an exam can go straight to it. Inside a world the levels open
 * one at a time, because each builds on the one before.
 */
export function buildJourney(snapshot: Snapshot): Journey {
  const worlds: WorldProgress[] = allWorlds.map((world) => {
    let previousDone = true;
    const levels: LevelStatus[] = world.levels.flatMap((id) => {
      const level = getLevel(id);
      if (!level) return [];
      const best = snapshot.levels[id] ?? null;
      const status: LevelStatus = { level, world, best, locked: !previousDone && !best };
      previousDone = best !== null;
      return [status];
    });
    return {
      world,
      subject: subjectOfWorld(world),
      grade: gradeOfWorld(world.levels),
      levels,
      completed: levels.filter((l) => l.best).length,
      total: levels.length,
      stars: levels.reduce((sum, l) => sum + (l.best?.stars ?? 0), 0),
      maxStars: levels.length * 3,
    };
  });

  const flat = worlds.flatMap((w) => w.levels);
  const allPerfect = flat.length > 0 && flat.every((l) => l.best?.stars === 3);
  const learner = learnerClass(snapshot);
  if (learner === null) return { worlds, next: pickNext(worlds), allPerfect, learner, nextBand: null };

  // Your class first; if it has nothing to play yet, the nearest class below, then above.
  for (const group of searchOrder(worlds, learner)) {
    const next = pickNext(group.worlds);
    if (next) return { worlds, next, allPerfect, learner, nextBand: group.band };
  }
  return { worlds, next: null, allPerfect, learner, nextBand: null };
}

/** Total levels authored, for "3 of 12" style counts. */
export const totalLevels = allLevels.length;
