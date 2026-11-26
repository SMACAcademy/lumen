import { getLevel, gradeOfLevel, worlds } from "@ise/content";
import { ProgressStore, memoryAdapter } from "@ise/progress-store";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressProvider } from "@/lib/progress";
import { Today } from "./Today";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const show = async (store: ProgressStore) => {
  await store.ready;
  await act(async () => {
    render(
      <ProgressProvider store={store}>
        <Today />
      </ProgressProvider>,
    );
  });
};

describe("Today", () => {
  it("invites a new learner to the first level", async () => {
    await show(new ProgressStore(memoryAdapter()));
    expect(screen.getByText(/Nothing memorised here/)).toBeTruthy();
    expect(screen.getByText("Start here · Class 11 · Circles & Waves")).toBeTruthy();
    expect(screen.getByRole("link", { name: /The shadow of a dot/ }).getAttribute("href")).toBe("/play/shadow-of-a-dot");
  });

  it("shows what a returning learner has done, and moves them on", async () => {
    const store = new ProgressStore(memoryAdapter());
    await store.ready;
    await store.append({ type: "profile-set", payload: { name: "Ada" } });
    await store.append({
      type: "level-completed",
      payload: { levelId: "shadow-of-a-dot", conceptId: "unit-circle-sine-cosine", worldId: "circles-and-waves", stars: 2, score: 0.8, xp: 30, steps: [] },
    });
    await store.append({ type: "law-discovered", payload: { lawId: "sine-definition", conceptId: "unit-circle-sine-cosine", levelId: "shadow-of-a-dot" } });
    await show(store);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Ada");
    expect(screen.getByText("1 level · 2 stars · 1 law discovered")).toBeTruthy();
    expect(screen.getByText("30")).toBeTruthy(); // total XP
    expect(screen.getByText("75%")).toBeTruthy(); // 30 of the default 40 XP goal
    // Every world's first level is open, so the next thing is something new, not a replay.
    expect(screen.getByText(/^Next up · /)).toBeTruthy();
    expect(screen.queryByText(/Beat your score/)).toBeNull();
    expect(screen.getByText(/sine definition/)).toBeTruthy();
  });

  it("says so when Up next comes from another class", async () => {
    const store = new ProgressStore(memoryAdapter());
    await store.ready;
    await store.append({ type: "profile-set", payload: { year: 10 } });
    // Three stars on every class 10 level, so Up next has to look elsewhere.
    for (const w of worlds) {
      for (const levelId of w.levels) {
        const level = getLevel(levelId)!;
        if (gradeOfLevel(levelId) !== 10) continue;
        await store.append({ type: "level-completed", payload: { levelId, conceptId: level.concept, worldId: w.id, stars: 3, score: 1, xp: 30, steps: [] } });
      }
    }
    await show(store);
    expect(screen.getByText(/Every class 10 level has all three stars/)).toBeTruthy();
    expect(screen.getByText(/to warm up with/)).toBeTruthy();
  });

  it("says nothing extra when Up next is from the learner's own class", async () => {
    const store = new ProgressStore(memoryAdapter());
    await store.ready;
    await store.append({ type: "profile-set", payload: { year: 11 } });
    await show(store);
    expect(screen.queryByText(/levels are on the way/)).toBeNull();
  });

  it("says how many formulas are due for revision", async () => {
    const store = new ProgressStore(memoryAdapter());
    await store.ready;
    const reviewed = (formulaId: string) => ({
      id: `r-${formulaId}`,
      at: "2020-01-01T10:00:00.000Z",
      day: "2020-01-01",
      type: "formula-reviewed",
      payload: { formulaId, knew: true },
    });
    await store.import({ kind: "ise-progress", version: 1, exportedAt: "2020-01-01T10:00:00.000Z", events: [reviewed("card:speed"), reviewed("card:density")] });
    await show(store);
    expect(screen.getByRole("link", { name: /2 formulas to revise today/ }).getAttribute("href")).toBe("/revise");
  });
});
