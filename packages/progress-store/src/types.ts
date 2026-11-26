/**
 * What the app remembers about one learner. Progress is an append-only log of
 * things that happened; every screen reads a snapshot reduced from that log.
 * Keeping the log means two devices can later be merged by union rather than
 * by picking a winner, and the journal timeline comes for free.
 */

/** Local calendar day, "YYYY-MM-DD" — recorded when the event happens, so reducing is timezone-free. */
export type DayKey = string;

export interface StepRecord {
  id: string;
  kind: string;
  attempts: number;
  hints: number;
  /** Null for ungraded steps. */
  score: number | null;
}

export type ProgressPayloads = {
  /** The learner opened the app (drives the streak even on a browsing day). */
  "day-active": Record<string, never>;
  "profile-set": { name?: string | null; avatarSeed?: string; year?: number | null };
  "preference-set": { key: keyof Preferences; value: PreferenceValue };
  "level-completed": {
    levelId: string;
    conceptId: string;
    worldId: string;
    stars: 1 | 2 | 3;
    score: number;
    xp: number;
    steps: readonly StepRecord[];
  };
  "law-discovered": { lawId: string; conceptId: string; levelId: string };
  /** A formula flashcard answered: known, or to come back to. */
  "formula-reviewed": { formulaId: string; knew: boolean };
  /** A timed arcade round finished. */
  "arcade-played": { game: ArcadeGame; score: number; correct: number; wrong: number; bestStreak: number; xp: number };
};

/** The arcade's games. */
export type ArcadeGame = "sort-sprint" | "formula-rush";

/** The best a learner has done at one arcade game. */
export interface ArcadeBest {
  best: number;
  bestStreak: number;
  plays: number;
  lastPlayedAt: string;
}

export type ProgressEventType = keyof ProgressPayloads;

export type ProgressEvent<T extends ProgressEventType = ProgressEventType> = {
  [K in T]: {
    /** Unique and stable: merging two logs is a union by id. */
    id: string;
    /** ISO timestamp. */
    at: string;
    day: DayKey;
    type: K;
    payload: ProgressPayloads[K];
  };
}[T];

/** An event as callers raise it; the store stamps id, time and day. */
export type ProgressEventInput<T extends ProgressEventType = ProgressEventType> = {
  [K in T]: { type: K; payload: ProgressPayloads[K] };
}[T];

export type PreferenceValue = string | number | boolean;

export interface Preferences {
  theme: "dark" | "light" | "system";
  highContrast: boolean;
  sound: boolean;
  haptics: boolean;
  reducedMotion: boolean;
  angleUnit: "deg" | "rad";
  /** XP the learner aims for each day. */
  dailyGoalXp: number;
}

export interface Profile {
  name: string | null;
  /** Seeds the generated avatar, so it is stable without storing an image. */
  avatarSeed: string;
  /** The learner's class, 6–12; null when unknown or "just exploring". */
  year: number | null;
  /** True once the learner has answered "which class are you in?" — "just exploring" included. */
  yearAsked: boolean;
  joinedAt: string | null;
}

export interface LevelBest {
  stars: 1 | 2 | 3;
  score: number;
  /** Best XP earned in a single run. */
  xp: number;
  plays: number;
  firstCompletedAt: string;
  lastPlayedAt: string;
}

export interface Streak {
  current: number;
  longest: number;
  lastActiveDay: DayKey | null;
  /** Distinct days with any activity. */
  daysActive: number;
}

export interface LawCard {
  lawId: string;
  conceptId: string;
  levelId: string;
  discoveredAt: string;
}

/** Where a formula sits in the spaced review: box 1 comes back tomorrow, box 5 in fifteen days. */
export interface FormulaReview {
  box: 1 | 2 | 3 | 4 | 5;
  due: DayKey;
  reviews: number;
  lastReviewed: DayKey;
}

/** Days until a card in each box comes back. */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15] as const;

export interface Snapshot {
  version: 1;
  profile: Profile;
  preferences: Preferences;
  /** Total XP ever earned. */
  xp: number;
  levels: Readonly<Record<string, LevelBest>>;
  laws: Readonly<Record<string, LawCard>>;
  /** Formula flashcards reviewed, by formula id. */
  formulas: Readonly<Record<string, FormulaReview>>;
  /** Arcade bests, by game. */
  arcade: Readonly<Partial<Record<ArcadeGame, ArcadeBest>>>;
  streak: Streak;
  /** XP per day, most recent days only. */
  xpByDay: Readonly<Record<DayKey, number>>;
  totals: { levelsCompleted: number; stars: number; perfectLevels: number };
}

export interface ProgressExport {
  kind: "ise-progress";
  version: 1;
  exportedAt: string;
  events: readonly ProgressEvent[];
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "dark",
  highContrast: false,
  sound: true,
  haptics: true,
  reducedMotion: false,
  angleUnit: "deg",
  dailyGoalXp: 40,
};
