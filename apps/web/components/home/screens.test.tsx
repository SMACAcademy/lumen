import { concepts, getLevel, gradeOfLevel, worlds } from "@ise/content";
import { ProgressStore, memoryAdapter } from "@ise/progress-store";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressProvider } from "@/lib/progress";
import { SubjectScreen } from "../subjects/SubjectScreen";
import { HomeHub } from "./HomeHub";
import { LearnScreen, nodeOffset, PATH_WIDTH, roadAhead, ROW, trailPath } from "./LearnScreen";
import { PracticeScreen } from "./PracticeScreen";
import { lawEntry, ReviseScreen } from "./ReviseScreen";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn() }), usePathname: () => "/home" }));

afterEach(() => {
  cleanup();
  push.mockReset();
});

async function show(ui: React.ReactNode, store = new ProgressStore(memoryAdapter())) {
  await store.ready;
  await act(async () => {
    render(
      <ProgressProvider store={store}>{ui}</ProgressProvider>,
    );
  });
  return store;
}

async function withLevel(levelId: string, stars: 1 | 2 | 3) {
  const store = new ProgressStore(memoryAdapter());
  await store.ready;
  const world = worlds.find((w) => w.levels.includes(levelId))!;
  const conceptId = concepts.find((c) => c.meta.id)!.meta.id;
  await store.append({ type: "level-completed", payload: { levelId, conceptId, worldId: world.id, stars, score: 0.7, xp: 20, steps: [] } });
  return store;
}

describe("HomeHub", () => {
  it("lays out the three subjects and the ways to keep what you learn", async () => {
    await show(<HomeHub />);
    const subjects = screen.getByRole("region", { name: "Your science world" });
    for (const s of ["maths", "physics", "chemistry"]) {
      expect(within(subjects).getAllByRole("link").some((a) => a.getAttribute("href") === `/subjects/${s}`)).toBe(true);
    }
    expect(screen.getByRole("link", { name: /Practice/ }).getAttribute("href")).toBe("/practice");
    expect(screen.getByRole("link", { name: /Revise/ }).getAttribute("href")).toBe("/revise");
    expect(screen.getByText("Nothing to revise yet")).toBeTruthy();
  });
});

describe("SubjectScreen", () => {
  it("shows physics whole: worlds to play, open labs, and the syllabus", async () => {
    await show(<SubjectScreen subject="physics" />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Physics");
    expect(screen.getByRole("heading", { name: "Forces" })).toBeTruthy();
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href") === "/lab/gravitation")).toBe(true);
    // Chapters fold open from the syllabus list.
    expect(screen.getAllByText("Laws of motion").some((el) => el.closest("summary"))).toBe(true);
  });

  it("shows chemistry's first worlds and labs, and the rest of its syllabus", async () => {
    await show(<SubjectScreen subject="chemistry" />);
    expect(screen.getByText(/Chemistry has begun/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Atoms & Light" })).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Reaction Rates" }).length).toBeGreaterThan(0); // the world and its lab
    expect(screen.getAllByRole("link").some((a) => a.getAttribute("href") === "/lab/hydrogen-spectrum")).toBe(true);
    expect(screen.getByRole("heading", { name: "Organic chemistry" })).toBeTruthy();
    expect(screen.queryByText(/mapped, not built yet/)).toBeNull();
  });
});

describe("the learning map", () => {
  it("swings its nodes left and right along a sine wave", () => {
    expect([0, 1, 2, 3].map(nodeOffset)).toEqual([0, 78, 0, -78]);
    for (let i = 0; i < 12; i++) expect(Math.abs(nodeOffset(i)) + 32).toBeLessThanOrEqual(PATH_WIDTH / 2);
  });

  it("draws a trail through every node's centre", () => {
    expect(trailPath(0)).toBe("");
    const d = trailPath(3);
    expect(d.startsWith(`M ${PATH_WIDTH / 2} ${ROW / 2}`)).toBe(true);
    expect(d.match(/C /g)).toHaveLength(2);
    expect(d.endsWith(`${PATH_WIDTH / 2 + nodeOffset(2)} ${ROW / 2 + 2 * ROW}`)).toBe(true);
  });

  it("opens the first level of every world and marks the one to play next", async () => {
    await show(<LearnScreen />);
    expect(screen.getAllByRole("link", { name: /^Level 1: .* — (next up|open)$/ })).toHaveLength(worlds.length);
    expect(screen.getAllByRole("link", { name: /next up$/ })).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: /locked/ }).length).toBeGreaterThan(0);
  });

  it("filters by subject", async () => {
    await show(<LearnScreen />);
    act(() => fireEvent.click(screen.getByRole("button", { name: /Maths/ })));
    const shown = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(shown).toContain("Circles & Waves");
    expect(shown).not.toContain("Forces");
    act(() => fireEvent.click(screen.getByRole("button", { name: /Chemistry/ })));
    const chemistry = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(chemistry).toEqual(expect.arrayContaining(["Atoms & Light", "Reaction Rates"]));
    expect(chemistry).not.toContain("Circles & Waves");
  });
});

describe("the learning map, by class", () => {
  async function inClass(year: number | null) {
    const store = new ProgressStore(memoryAdapter());
    await store.ready;
    await store.append({ type: "profile-set", payload: { year } });
    return store;
  }
  const band = (name: RegExp) => screen.getByRole("region", { name });

  it("leads with the learner's class, and opens the band that holds the next level", async () => {
    // A class 10 learner with every class 10 level perfect: the next level is a warm-up.
    const store = await inClass(10);
    for (const w of worlds) {
      for (const levelId of w.levels) {
        if (gradeOfLevel(levelId) !== 10) continue;
        await store.append({ type: "level-completed", payload: { levelId, conceptId: getLevel(levelId)!.concept, worldId: w.id, stars: 3, score: 1, xp: 30, steps: [] } });
      }
    }
    await show(<LearnScreen />, store);
    expect(within(band(/^Your class/)).getByRole("heading", { name: "Bending Light" })).toBeTruthy();
    const warmUp = band(/^Warm-up/);
    expect(warmUp.querySelector("details")?.open).toBe(true);
    expect(within(warmUp).getByRole("heading", { name: "Light the Bulb" })).toBeTruthy();
    const ahead = band(/^Peek ahead/);
    expect(ahead.querySelector("details")?.open).toBe(false);
    expect(within(ahead).getByRole("heading", { name: "Motion" })).toBeTruthy();
  });

  it("numbers worlds within a band, and shows the road ahead for the learner's own stage", async () => {
    await show(<LearnScreen />, await inClass(7));
    expect(within(band(/^Your class/)).getByText(/^World 1 · /)).toBeTruthy();
    const ahead = roadAhead(7).flatMap((w) => w.chapters.map((c) => c.chapter.grade));
    // Only chapters of the learner's own stage still being built; empty once the stage is complete.
    for (const grade of ahead) expect(grade).toBeLessThanOrEqual(8);
  });

  it("treats class 11 and 12 as one syllabus", async () => {
    await show(<LearnScreen />, await inClass(11));
    expect(within(band(/^Your class/)).getByRole("heading", { name: "Motion" })).toBeTruthy();
    expect(screen.queryByRole("region", { name: /^Peek ahead/ })).toBeNull();
  });

  it("shows one plain list to someone just exploring", async () => {
    await show(<LearnScreen />, await inClass(null));
    expect(screen.queryByRole("region", { name: /^Your class/ })).toBeNull();
    expect(screen.getByText(/World 1 · .* · Class 11/)).toBeTruthy();
  });
});

describe("ReviseScreen", () => {
  const tab = (name: RegExp) => act(() => fireEvent.click(screen.getByRole("tab", { name })));

  it("starts empty, and says how to fill it", async () => {
    await show(<ReviseScreen />);
    tab(/Worth another go/);
    expect(screen.getByText("Nothing to replay yet")).toBeTruthy();
  });

  it("offers a level with stars to win back", async () => {
    await show(<ReviseScreen />, await withLevel("shadow-of-a-dot", 1));
    tab(/Worth another go/);
    const polish = screen.getByRole("region", { name: "Worth another go" });
    expect(within(polish).getByRole("link").getAttribute("href")).toBe("/play/shadow-of-a-dot");
  });

  it("joins a law back to its equation and lab", () => {
    const entry = lawEntry({ lawId: "sine-definition", conceptId: "unit-circle-sine-cosine", levelId: "shadow-of-a-dot", discoveredAt: "2026-09-24T10:00:00.000Z" });
    expect(entry.lab).toBe("unit-circle-sine-cosine");
    expect(entry.title.length).toBeGreaterThan(0);
    const unknown = lawEntry({ lawId: "made-up-law", conceptId: "nope", levelId: "x", discoveredAt: "2026-09-24T10:00:00.000Z" });
    expect(unknown).toMatchObject({ title: "made up law", lab: null });
  });
});

describe("PracticeScreen", () => {
  it("sends a quick challenge to an open level", async () => {
    await show(<PracticeScreen />);
    vi.spyOn(Math, "random").mockReturnValue(0);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Surprise me" })));
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/play\//));
    vi.restoreAllMocks();
  });

  it("offers both arcade games, with the best score once played", async () => {
    const store = new ProgressStore(memoryAdapter());
    await store.ready;
    await store.append({ type: "arcade-played", payload: { game: "formula-rush", score: 85, correct: 6, wrong: 3, bestStreak: 4, xp: 6 } });
    await show(<PracticeScreen />, store);
    expect(screen.getByRole("link", { name: /Sort Sprint.*Not played yet/ }).getAttribute("href")).toBe("/arcade/sort-sprint");
    expect(screen.getByRole("link", { name: /Formula Rush.*Best 85 · streak 4/ }).getAttribute("href")).toBe("/arcade/formula-rush");
  });

  it("lists every lab for free play", async () => {
    await show(<PracticeScreen />);
    for (const c of concepts) expect(screen.getAllByRole("link", { name: c.meta.title }).length).toBeGreaterThan(0);
  });
});
