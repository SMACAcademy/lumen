import { ProgressStore, emptySnapshot, memoryAdapter } from "@ise/progress-store";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { deckFor } from "@/lib/arcade";
import { ProgressProvider } from "@/lib/progress";
import { ArcadeGame } from "./ArcadeGame";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const SEED = "test";

async function show() {
  const store = new ProgressStore(memoryAdapter());
  await store.ready;
  await act(async () => {
    render(
      <ProgressProvider store={store}>
        <ArcadeGame game="sort-sprint" seed={SEED} />
      </ProgressProvider>,
    );
  });
  return store;
}

/** The option button whose words are `label` (buttons also carry their key number). */
const option = (label: string) => screen.getAllByRole("button").find((b) => b.textContent?.replace(/^\d/, "") === label)!;

describe("an arcade round", () => {
  // The deck an empty snapshot deals for this seed: the same one the component will play.
  const deck = deckFor("sort-sprint", emptySnapshot(), SEED);

  it("starts from the rules, scores a right answer, costs a life for a wrong one, and records the round when time runs out", async () => {
    const store = await show();
    expect(screen.getByRole("heading", { name: "Sort Sprint" })).toBeTruthy();
    vi.useFakeTimers({ shouldAdvanceTime: false });
    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    const first = deck[0]!;
    expect(screen.getByText(first.item)).toBeTruthy();
    fireEvent.click(option(first.options.find((o) => o.id === first.answer)!.label));
    expect(screen.getByLabelText("Score 10")).toBeTruthy();
    expect(screen.getByText("Right!")).toBeTruthy();
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    const second = deck[1]!;
    expect(screen.getByText(second.item)).toBeTruthy();
    fireEvent.click(option(second.options.find((o) => o.id !== second.answer)!.label));
    expect(screen.getByRole("img", { name: "2 of 3 lives left" })).toBeTruthy();
    expect(screen.getByText(/Not quite/)).toBeTruthy();

    await act(async () => {
      vi.advanceTimersByTime(61_000);
    });
    expect(screen.getByRole("heading", { name: "Time!" })).toBeTruthy();
    expect(screen.getByText("First score on the board!")).toBeTruthy();
    expect(store.getSnapshot().arcade["sort-sprint"]).toMatchObject({ best: 10, plays: 1 });
    expect(store.getSnapshot().xp).toBe(1);

    // Rerendering the result does not record the round twice.
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(store.getSnapshot().arcade["sort-sprint"]?.plays).toBe(1);
  });

  it("answers with the number keys", async () => {
    await show();
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    const first = deck[0]!;
    const key = first.options.findIndex((o) => o.id === first.answer) + 1;
    fireEvent.keyDown(window, { key: String(key) });
    expect(screen.getByLabelText("Score 10")).toBeTruthy();
  });
});
