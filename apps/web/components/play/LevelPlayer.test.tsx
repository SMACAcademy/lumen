import { unitCircleSineCosine } from "@ise/content";
import type { Level } from "@ise/game-engine";
import { degToRad as deg } from "@ise/units";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ProgressStore, memoryAdapter } from "@ise/progress-store";
import { ProgressProvider } from "@/lib/progress";
import { LevelPlayer } from "./LevelPlayer";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(cleanup);

const level: Level = {
  schemaVersion: 1,
  id: "test-level",
  concept: "unit-circle-sine-cosine",
  title: "Test level",
  summary: "For tests.",
  xp: 20,
  steps: [
    {
      id: "top",
      kind: "target",
      prompt: "Make **sin θ** as big as possible.",
      controls: ["theta"],
      goal: { type: "compare", quantity: "sin", op: "gte", value: 0.998 },
      success: "Top of the circle.",
      hints: ["Go up."],
    },
    {
      id: "guess",
      kind: "estimate",
      prompt: "Estimate sin θ.",
      given: { theta: deg(30) },
      quantity: "sin",
      range: { min: -1, max: 1, step: 0.05 },
      tolerance: 0.05,
      explanation: "It is one half.",
    },
    { id: "law", kind: "discover", prompt: "You found it.", equation: "sine-definition", law: "Sine is height." },
  ],
};

const click = (name: string | RegExp) => act(() => fireEvent.click(screen.getByRole("button", { name })));
// The feedback banner (range readouts are <output>s, which also have role="status").
const status = () => screen.getAllByRole("status").find((el) => el.tagName === "DIV")?.textContent;

describe("LevelPlayer", () => {
  it("plays a level: wrong then right check, estimate, law card, stars", async () => {
    const store = new ProgressStore(memoryAdapter());
    await store.ready;
    render(
      <ProgressProvider store={store}>
        <LevelPlayer level={level} concept={unitCircleSineCosine} worldId="circles-and-waves" />
      </ProgressProvider>,
    );
    expect(screen.getByText("Challenge")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");

    click("Check");
    expect(status()).toContain("Not quite");

    click(/Hint/);
    expect(screen.getByText("Go up.")).toBeTruthy();

    act(() => fireEvent.change(screen.getByRole("slider", { name: /Angle/ }), { target: { value: "90" } }));
    click("Check");
    expect(status()).toContain("Nailed it!");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");

    click("Continue");
    expect(screen.getByText("Estimate")).toBeTruthy();
    act(() => fireEvent.change(screen.getByLabelText(/Your estimate/), { target: { value: "0.5" } }));
    click("Check");
    expect(status()).toContain("Spot on!");
    expect(status()).toContain("it is 0.5");

    click("Continue");
    expect(screen.getByText(/Law card/)).toBeTruthy();
    click("Collect & finish");

    // Target: 2 attempts + 1 hint → 0.55; estimate → 1. Mean 0.775 → 2 stars.
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Great work!");
    expect(screen.getByRole("img", { name: "2 of 3 stars" })).toBeTruthy();
    // XP counts up, so wait for it to land.
    expect(await screen.findByText("+30")).toBeTruthy();

    // The run is saved: XP, the best result, and the law that was collected.
    const saved = store.getSnapshot();
    expect(saved.xp).toBe(30);
    expect(saved.levels["test-level"]).toMatchObject({ stars: 2, plays: 1 });
    expect(Object.keys(saved.laws)).toEqual(["sine-definition"]);
    expect(saved.streak.current).toBe(1);

    click("Play again");
    expect(screen.getByText("Challenge")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });

  it("does not count a goal met only while the step's setup is being applied", async () => {
    // Before its setup the circle sits where sin θ ≥ 0, which is the goal; the setup moves it below.
    const explore: Level = {
      ...level,
      id: "explore-level",
      steps: [
        {
          id: "climb",
          kind: "explore",
          prompt: "Bring the point back above the axis.",
          given: { theta: deg(200) },
          controls: ["theta"],
          goal: { type: "compare", quantity: "sin", op: "gte", value: 0 },
          success: "Above the axis.",
        },
        level.steps[2]!,
      ],
    };
    const store = new ProgressStore(memoryAdapter());
    await store.ready;
    render(
      <ProgressProvider store={store}>
        <LevelPlayer level={explore} concept={unitCircleSineCosine} worldId="circles-and-waves" />
      </ProgressProvider>,
    );
    await act(async () => {});
    expect(screen.queryByText("You got it!")).toBeNull();
    expect(screen.getByRole("button", { name: "Keep going…" })).toBeTruthy();

    act(() => fireEvent.change(screen.getByRole("slider", { name: /Angle/ }), { target: { value: "90" } }));
    expect(status()).toContain("You got it!");
  });

  it("shows a very large estimate in powers of ten", async () => {
    const store = new ProgressStore(memoryAdapter());
    await store.ready;
    const big: Level = {
      ...level,
      steps: [{ id: "big", kind: "estimate", prompt: "Estimate.", quantity: "sin", range: { min: 0, max: 1e10, step: 1e8 }, tolerance: 3e8, explanation: "Big." }],
    };
    render(
      <ProgressProvider store={store}>
        <LevelPlayer level={big} concept={unitCircleSineCosine} worldId="circles-and-waves" />
      </ProgressProvider>,
    );
    expect(screen.getAllByText("5.00 × 10⁹").length).toBeGreaterThan(0);
    expect(screen.getByText("1.0 × 10¹⁰")).toBeTruthy();
    expect(screen.queryByText("5000000000")).toBeNull();
  });
});
