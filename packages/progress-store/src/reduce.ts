/**
 * Events → snapshot. Pure and incremental: applying one event to a snapshot
 * gives the same result as replaying the whole log, so the UI can update
 * immediately and a rebuild always agrees with it.
 */

import {
  DEFAULT_PREFERENCES,
  type DayKey,
  type FormulaReview,
  type LevelBest,
  type Preferences,
  type ProgressEvent,
  REVIEW_INTERVALS,
  type Snapshot,
} from "./types";

/** Days of XP history kept in the snapshot; the log keeps everything. */
const XP_HISTORY_DAYS = 90;

export function emptySnapshot(): Snapshot {
  return {
    version: 1,
    profile: { name: null, avatarSeed: "orbit", year: null, yearAsked: false, joinedAt: null },
    preferences: { ...DEFAULT_PREFERENCES },
    xp: 0,
    levels: {},
    laws: {},
    formulas: {},
    arcade: {},
    streak: { current: 0, longest: 0, lastActiveDay: null, daysActive: 0 },
    xpByDay: {},
    totals: { levelsCompleted: 0, stars: 0, perfectLevels: 0 },
  };
}

/** Local calendar day of a date, as "YYYY-MM-DD". */
export function dayKey(date: Date = new Date()): DayKey {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole days from one day key to another (b − a). */
export function daysBetween(a: DayKey, b: DayKey): number {
  const parse = (key: DayKey) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((parse(b) - parse(a)) / 86_400_000);
}

/** The day n days after a day key. */
export function addDays(day: DayKey, n: number): DayKey {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + n));
  const pad = (k: number) => String(k).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

/** Whether a formula should be reviewed today. One never reviewed always is. */
export function isDue(snapshot: Snapshot, formulaId: string, today: DayKey): boolean {
  const review = snapshot.formulas[formulaId];
  return !review || daysBetween(review.due, today) >= 0;
}

/** How many of these formulas have been reviewed before and are due again. */
export function dueCount(snapshot: Snapshot, formulaIds: readonly string[], today: DayKey): number {
  return formulaIds.filter((id) => snapshot.formulas[id] && isDue(snapshot, id, today)).length;
}

function withActivity(snapshot: Snapshot, day: DayKey, at: string): Snapshot {
  const { streak, profile } = snapshot;
  const joinedAt = profile.joinedAt ?? at;
  if (streak.lastActiveDay === day) {
    return profile.joinedAt ? snapshot : { ...snapshot, profile: { ...profile, joinedAt } };
  }
  // A day earlier than the last one seen (a late-arriving event) leaves the streak alone.
  if (streak.lastActiveDay && daysBetween(streak.lastActiveDay, day) < 0) return snapshot;
  const consecutive = streak.lastActiveDay !== null && daysBetween(streak.lastActiveDay, day) === 1;
  const current = consecutive ? streak.current + 1 : 1;
  return {
    ...snapshot,
    profile: { ...profile, joinedAt },
    streak: {
      current,
      longest: Math.max(streak.longest, current),
      lastActiveDay: day,
      daysActive: streak.daysActive + 1,
    },
  };
}

function trimHistory(xpByDay: Record<DayKey, number>): Record<DayKey, number> {
  const days = Object.keys(xpByDay).sort();
  if (days.length <= XP_HISTORY_DAYS) return xpByDay;
  return Object.fromEntries(days.slice(days.length - XP_HISTORY_DAYS).map((d) => [d, xpByDay[d]!]));
}

export function applyEvent(snapshot: Snapshot, event: ProgressEvent): Snapshot {
  const base = withActivity(snapshot, event.day, event.at);
  switch (event.type) {
    case "day-active":
      return base;

    case "profile-set": {
      const { name, avatarSeed, year } = event.payload;
      return {
        ...base,
        profile: {
          ...base.profile,
          ...(name !== undefined ? { name } : {}),
          ...(avatarSeed !== undefined ? { avatarSeed } : {}),
          ...(year !== undefined ? { year, yearAsked: true } : {}),
        },
      };
    }

    case "formula-reviewed": {
      const { formulaId, knew } = event.payload;
      const previous = base.formulas[formulaId];
      const box = (knew ? Math.min((previous?.box ?? 0) + 1, 5) : 1) as FormulaReview["box"];
      const review: FormulaReview = {
        box,
        due: addDays(event.day, REVIEW_INTERVALS[box - 1]!),
        reviews: (previous?.reviews ?? 0) + 1,
        lastReviewed: event.day,
      };
      return { ...base, formulas: { ...base.formulas, [formulaId]: review } };
    }

    case "arcade-played": {
      const { game, score, bestStreak, xp } = event.payload;
      const previous = base.arcade[game];
      const best = {
        best: Math.max(previous?.best ?? 0, score),
        bestStreak: Math.max(previous?.bestStreak ?? 0, bestStreak),
        plays: (previous?.plays ?? 0) + 1,
        lastPlayedAt: event.at,
      };
      return {
        ...base,
        xp: base.xp + xp,
        arcade: { ...base.arcade, [game]: best },
        xpByDay: trimHistory({ ...base.xpByDay, [event.day]: (base.xpByDay[event.day] ?? 0) + xp }),
      };
    }

    case "preference-set": {
      const { key, value } = event.payload;
      if (!(key in base.preferences)) return base;
      return { ...base, preferences: { ...base.preferences, [key]: value } as Preferences };
    }

    case "level-completed": {
      const { levelId, stars, score, xp } = event.payload;
      const previous = base.levels[levelId];
      const best: LevelBest = {
        stars: previous ? (Math.max(previous.stars, stars) as 1 | 2 | 3) : stars,
        score: Math.max(previous?.score ?? 0, score),
        xp: Math.max(previous?.xp ?? 0, xp),
        plays: (previous?.plays ?? 0) + 1,
        firstCompletedAt: previous?.firstCompletedAt ?? event.at,
        lastPlayedAt: event.at,
      };
      const starGain = best.stars - (previous?.stars ?? 0);
      return {
        ...base,
        xp: base.xp + xp,
        levels: { ...base.levels, [levelId]: best },
        xpByDay: trimHistory({ ...base.xpByDay, [event.day]: (base.xpByDay[event.day] ?? 0) + xp }),
        totals: {
          levelsCompleted: base.totals.levelsCompleted + (previous ? 0 : 1),
          stars: base.totals.stars + starGain,
          perfectLevels: base.totals.perfectLevels + (best.stars === 3 && previous?.stars !== 3 ? 1 : 0),
        },
      };
    }

    case "law-discovered": {
      const { lawId, conceptId, levelId } = event.payload;
      if (base.laws[lawId]) return base;
      return { ...base, laws: { ...base.laws, [lawId]: { lawId, conceptId, levelId, discoveredAt: event.at } } };
    }
  }
}

/** Replay a log. Events are sorted by time so an imported log merges cleanly. */
export function reduceEvents(events: readonly ProgressEvent[], from: Snapshot = emptySnapshot()): Snapshot {
  return [...events].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0)).reduce(applyEvent, from);
}

/** XP earned on a given day. */
export function xpOn(snapshot: Snapshot, day: DayKey = dayKey()): number {
  return snapshot.xpByDay[day] ?? 0;
}

/** Progress towards today's goal, in [0, 1]. */
export function goalProgress(snapshot: Snapshot, day: DayKey = dayKey()): number {
  const goal = Math.max(1, snapshot.preferences.dailyGoalXp);
  return Math.min(1, xpOn(snapshot, day) / goal);
}

/** True when the streak will be lost unless the learner plays today. */
export function streakAtRisk(snapshot: Snapshot, day: DayKey = dayKey()): boolean {
  const last = snapshot.streak.lastActiveDay;
  return snapshot.streak.current > 0 && last !== null && daysBetween(last, day) === 1;
}

/** A streak that has already lapsed shows as zero without rewriting history. */
export function currentStreak(snapshot: Snapshot, day: DayKey = dayKey()): number {
  const last = snapshot.streak.lastActiveDay;
  if (last === null) return 0;
  const gap = daysBetween(last, day);
  return gap <= 1 ? snapshot.streak.current : 0;
}
