import { describe, expect, it } from "vitest";
import { addDays, applyEvent, currentStreak, dayKey, daysBetween, dueCount, emptySnapshot, goalProgress, isDue, reduceEvents, streakAtRisk, xpOn } from "./reduce";
import { ProgressStore, memoryAdapter, parseEvents } from "./store";
import type { ProgressEvent, Snapshot } from "./types";

let counter = 0;
const event = (type: ProgressEvent["type"], day: string, payload: unknown, hour = 12): ProgressEvent =>
  ({ id: `e${++counter}`, at: `${day}T${String(hour).padStart(2, "0")}:00:00.000Z`, day, type, payload }) as ProgressEvent;

const completed = (day: string, over: Partial<Record<string, unknown>> = {}) =>
  event("level-completed", day, { levelId: "l1", conceptId: "c1", worldId: "w1", stars: 2, score: 0.75, xp: 30, steps: [], ...over });

describe("day keys", () => {
  it("formats the local day and counts whole days between", () => {
    expect(dayKey(new Date(2026, 8, 23, 23, 30))).toBe("2026-09-23");
    expect(daysBetween("2026-09-23", "2026-09-24")).toBe(1);
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1); // 2026 is not a leap year
    expect(daysBetween("2026-09-24", "2026-09-23")).toBe(-1);
  });
});

describe("streak", () => {
  const days = (...list: string[]) => reduceEvents(list.map((d) => event("day-active", d, {})));

  it("counts consecutive days, remembers the longest, and resets after a gap", () => {
    const s = days("2026-09-01", "2026-09-02", "2026-09-03", "2026-09-06", "2026-09-07");
    expect(s.streak).toEqual({ current: 2, longest: 3, lastActiveDay: "2026-09-07", daysActive: 5 });
  });

  it("a second visit on the same day changes nothing", () => {
    const s = days("2026-09-01", "2026-09-01");
    expect(s.streak.current).toBe(1);
    expect(s.streak.daysActive).toBe(1);
  });

  it("reports the streak as lost once a day has been missed, without rewriting it", () => {
    const s = days("2026-09-01", "2026-09-02");
    expect(currentStreak(s, "2026-09-03")).toBe(2); // still saveable today
    expect(streakAtRisk(s, "2026-09-03")).toBe(true);
    expect(currentStreak(s, "2026-09-04")).toBe(0);
    expect(s.streak.current).toBe(2);
  });

  it("joined date comes from the first event", () => {
    expect(days("2026-09-01").profile.joinedAt).toBe("2026-09-01T12:00:00.000Z");
  });
});

describe("levels and XP", () => {
  it("keeps the best result but counts every play and all XP", () => {
    const s = reduceEvents([
      completed("2026-09-01"),
      completed("2026-09-02", { stars: 3, score: 0.95, xp: 35 }),
      completed("2026-09-02", { stars: 1, score: 0.4, xp: 25 }),
    ]);
    expect(s.levels.l1).toMatchObject({ stars: 3, score: 0.95, xp: 35, plays: 3 });
    expect(s.xp).toBe(90);
    expect(s.totals).toEqual({ levelsCompleted: 1, stars: 3, perfectLevels: 1 });
    expect(xpOn(s, "2026-09-02")).toBe(60);
  });

  it("tracks the daily goal", () => {
    const s = reduceEvents([completed("2026-09-02", { xp: 20 })]);
    expect(goalProgress(s, "2026-09-02")).toBe(0.5); // default goal is 40
    expect(goalProgress(s, "2026-09-03")).toBe(0);
  });

  it("a law is collected once, with the date it was first found", () => {
    const s = reduceEvents([
      event("law-discovered", "2026-09-01", { lawId: "sine-definition", conceptId: "c1", levelId: "l1" }),
      event("law-discovered", "2026-09-05", { lawId: "sine-definition", conceptId: "c1", levelId: "l2" }),
    ]);
    expect(Object.keys(s.laws)).toEqual(["sine-definition"]);
    expect(s.laws["sine-definition"]!.discoveredAt).toContain("2026-09-01");
  });
});

describe("profile and preferences", () => {
  it("sets only the fields given", () => {
    const s = reduceEvents([event("profile-set", "2026-09-01", { name: "Ada" }), event("profile-set", "2026-09-01", { year: 10 })]);
    expect(s.profile).toMatchObject({ name: "Ada", year: 10 });
  });

  it("remembers that the class was asked, even when the answer is 'just exploring'", () => {
    expect(emptySnapshot().profile.yearAsked).toBe(false);
    expect(reduceEvents([event("profile-set", "2026-09-25", { name: "Ada" })]).profile.yearAsked).toBe(false);
    expect(reduceEvents([event("profile-set", "2026-09-25", { year: null })]).profile).toMatchObject({ year: null, yearAsked: true });
    expect(reduceEvents([event("profile-set", "2026-09-25", { year: 7 })]).profile).toMatchObject({ year: 7, yearAsked: true });
  });

  it("ignores unknown preference keys", () => {
    const s = reduceEvents([
      event("preference-set", "2026-09-01", { key: "dailyGoalXp", value: 60 }),
      event("preference-set", "2026-09-01", { key: "nonsense", value: 1 }),
    ]);
    expect(s.preferences.dailyGoalXp).toBe(60);
    expect("nonsense" in s.preferences).toBe(false);
  });
});

describe("arcade rounds", () => {
  const round = (day: string, score: number, bestStreak: number, xp: number, hour = 12) =>
    event("arcade-played", day, { game: "sort-sprint", score, correct: xp, wrong: 1, bestStreak, xp }, hour);

  it("keep the best score and streak, and count the plays", () => {
    const s = reduceEvents([round("2026-09-25", 120, 5, 8), round("2026-09-25", 90, 7, 6, 13)]);
    expect(s.arcade["sort-sprint"]).toMatchObject({ best: 120, bestStreak: 7, plays: 2 });
    expect(s.arcade["formula-rush"]).toBeUndefined();
  });

  it("add their XP to the day", () => {
    const s = reduceEvents([round("2026-09-25", 120, 5, 8)]);
    expect(s.xp).toBe(8);
    expect(xpOn(s, "2026-09-25")).toBe(8);
  });

  it("survive an export and import", () => {
    expect(parseEvents({ events: [round("2026-09-25", 120, 5, 8)] })).toHaveLength(1);
  });
});

describe("spaced review of formulas", () => {
  const reviewed = (day: string, knew: boolean, formulaId = "card:speed") => event("formula-reviewed", day, { formulaId, knew });

  it("adds days across month ends", () => {
    expect(addDays("2026-09-30", 2)).toBe("2026-10-02");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("moves a card up a box each time it is known, and back to the start when it is not", () => {
    let s = reduceEvents([reviewed("2026-09-25", true)]);
    expect(s.formulas["card:speed"]).toMatchObject({ box: 1, due: "2026-09-26", reviews: 1, lastReviewed: "2026-09-25" });
    s = applyEvent(s, reviewed("2026-09-26", true));
    expect(s.formulas["card:speed"]).toMatchObject({ box: 2, due: "2026-09-28" });
    s = applyEvent(s, reviewed("2026-09-28", false));
    expect(s.formulas["card:speed"]).toMatchObject({ box: 1, due: "2026-09-29", reviews: 3 });
  });

  it("stops at the fifth box, fifteen days apart", () => {
    const days = ["2026-09-01", "2026-09-02", "2026-09-04", "2026-09-08", "2026-09-15", "2026-09-30"];
    const s = reduceEvents(days.map((d) => reviewed(d, true)));
    expect(s.formulas["card:speed"]).toMatchObject({ box: 5, due: "2026-10-15" });
  });

  it("knows what is due today", () => {
    const s = reduceEvents([reviewed("2026-09-25", true, "a"), reviewed("2026-09-25", false, "b"), reviewed("2026-09-25", true, "c"), reviewed("2026-09-26", true, "c")]);
    // a and b are due on the 26th; c has moved to box 2, due on the 28th.
    expect(isDue(s, "a", "2026-09-26")).toBe(true);
    expect(isDue(s, "c", "2026-09-26")).toBe(false);
    expect(isDue(s, "never-seen", "2026-09-26")).toBe(true);
    expect(dueCount(s, ["a", "b", "c", "never-seen"], "2026-09-26")).toBe(2);
  });
});

describe("replaying", () => {
  it("applying one event equals replaying the log", () => {
    const log = [completed("2026-09-01"), event("day-active", "2026-09-02", {}), completed("2026-09-02", { stars: 3, xp: 35 })];
    const incremental = log.reduce<Snapshot>(applyEvent, emptySnapshot());
    expect(incremental).toEqual(reduceEvents(log));
  });

  it("orders by time, so a merged log gives the same answer", () => {
    const a = completed("2026-09-01");
    const b = completed("2026-09-02", { stars: 3, xp: 35 });
    expect(reduceEvents([b, a])).toEqual(reduceEvents([a, b]));
  });
});

describe("store", () => {
  const options = { now: () => new Date("2026-09-23T10:00:00.000Z"), newId: () => `id${++counter}` };

  it("updates the snapshot immediately and persists", async () => {
    const adapter = memoryAdapter();
    const store = new ProgressStore(adapter, options);
    await store.ready;
    const seen: number[] = [];
    store.subscribe(() => seen.push(store.getSnapshot().xp));
    await store.append({ type: "level-completed", payload: { levelId: "l1", conceptId: "c1", worldId: "w1", stars: 3, score: 1, xp: 35, steps: [] } });
    expect(store.getSnapshot().xp).toBe(35);
    expect(seen).toEqual([35]);
    expect(await adapter.load()).toHaveLength(1);

    const reopened = new ProgressStore(adapter, options);
    await reopened.ready;
    expect(reopened.getSnapshot().xp).toBe(35);
    expect(reopened.isLoaded()).toBe(true);
  });

  it("records a once-a-day event only once", async () => {
    const store = new ProgressStore(memoryAdapter(), options);
    await store.appendOncePerDay({ type: "day-active", payload: {} });
    await store.appendOncePerDay({ type: "day-active", payload: {} });
    expect(store.log()).toHaveLength(1);
  });

  it("exports and re-imports, merging by id and skipping duplicates", async () => {
    const source = new ProgressStore(memoryAdapter(), options);
    await source.append({ type: "law-discovered", payload: { lawId: "sine-definition", conceptId: "c1", levelId: "l1" } });
    const backup = source.export();

    const target = new ProgressStore(memoryAdapter(), options);
    await target.ready;
    expect(await target.import(backup)).toBe(1);
    expect(await target.import(backup)).toBe(0);
    expect(Object.keys(target.getSnapshot().laws)).toEqual(["sine-definition"]);
  });

  it("ignores junk and unknown event types on import", () => {
    expect(parseEvents({ events: [{ id: "x" }, { id: "y", at: "now", day: "2026-09-23", type: "from-the-future", payload: {} }] })).toEqual([]);
    expect(parseEvents("nope")).toEqual([]);
  });

  it("clears everything", async () => {
    const adapter = memoryAdapter();
    const store = new ProgressStore(adapter, options);
    await store.append({ type: "day-active", payload: {} });
    await store.clear();
    expect(store.getSnapshot()).toEqual(emptySnapshot());
    expect(await adapter.load()).toHaveLength(0);
  });
});
