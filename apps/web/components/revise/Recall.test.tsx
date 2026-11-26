import { buildFormulaBank } from "@ise/content";
import { ProgressStore, memoryAdapter } from "@ise/progress-store";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressProvider } from "@/lib/progress";
import { Recall } from "./Recall";

afterEach(cleanup);

const cards = buildFormulaBank().filter((c) => c.chapter.id === "motion-class-9" || c.chapter.id === "motion-and-time").slice(0, 3);

async function show(onClose = vi.fn()) {
  const store = new ProgressStore(memoryAdapter());
  await store.ready;
  await act(async () => {
    render(
      <ProgressProvider store={store}>
        <Recall cards={cards} onClose={onClose} />
      </ProgressProvider>,
    );
  });
  return store;
}

const click = (name: string) => act(async () => fireEvent.click(screen.getByRole("button", { name })));

describe("Recall", () => {
  it("asks, shows the answer, records what you knew, and sums up", async () => {
    const store = await show();
    expect(screen.getByText(`1 of ${cards.length}`)).toBeTruthy();
    expect(screen.queryByLabelText("Answer")).toBeNull();
    await click("Show answer");
    expect(screen.getByLabelText("Answer")).toBeTruthy();
    await click("Knew it");
    expect(store.getSnapshot().formulas[cards[0]!.id]?.box).toBe(1);
    expect(screen.getByText(`2 of ${cards.length}`)).toBeTruthy();

    for (let i = 1; i < cards.length; i++) {
      await click("Show answer");
      await click("Not yet");
    }
    expect(screen.getByText("Done")).toBeTruthy();
    expect(screen.getByText(`1 knew · ${cards.length - 1} to come back to tomorrow`)).toBeTruthy();
  });

  it("works from the keyboard", async () => {
    const store = await show();
    await act(async () => fireEvent.keyDown(window, { key: " " }));
    expect(screen.getByLabelText("Answer")).toBeTruthy();
    await act(async () => fireEvent.keyDown(window, { key: "2" }));
    expect(store.getSnapshot().formulas[cards[0]!.id]).toMatchObject({ box: 1, reviews: 1 });
  });
});
