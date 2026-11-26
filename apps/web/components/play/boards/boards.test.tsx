import { propertiesOfFluids } from "@ise/content";
import { type Level, LevelSchema } from "@ise/game-engine";
import { ProgressStore, memoryAdapter } from "@ise/progress-store";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ProgressProvider } from "@/lib/progress";
import { LevelPlayer } from "../LevelPlayer";

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

const floats = { type: "compare", quantity: "floats", op: "eq", value: 1 } as const;
const sinks = { type: "compare", quantity: "floats", op: "eq", value: 0 } as const;
const block = (id: string, label: string, density: number) => ({ id, label, given: { blockDensity: density } });

function level(step: object): Level {
  return LevelSchema.parse({ schemaVersion: 1, id: "boards", concept: "properties-of-fluids", title: "Boards", summary: "Boards.", xp: 20, steps: [step] });
}

async function play(step: object) {
  const store = new ProgressStore(memoryAdapter());
  await store.ready;
  await act(async () => {
    render(
      <ProgressProvider store={store}>
        <LevelPlayer level={level(step)} concept={propertiesOfFluids} worldId="matter" />
      </ProgressProvider>,
    );
  });
  return store;
}

const tap = (el: HTMLElement) => act(() => fireEvent.click(el));
const card = (name: string) => within(screen.getByRole("group", { name: /Cards/ })).getByRole("button", { name });
const feedback = () => screen.getAllByRole("status").find((el) => el.tagName === "DIV")?.textContent ?? "";
const finish = async () => {
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Finish" })));
};

describe("sort", () => {
  const step = {
    id: "sort",
    kind: "sort",
    prompt: "Float or sink?",
    given: { fluid: "water" },
    bins: [
      { id: "floats", label: "Floats", when: floats },
      { id: "sinks", label: "Sinks", when: sinks },
    ],
    cards: [block("cork", "Cork", 240), block("iron", "Iron", 7870), block("wax", "Wax", 900)],
  };

  it("places cards by tapping, shakes a wrong one back, and scores first-time placements", async () => {
    const store = await play(step);
    await tap(card("Cork"));
    expect(card("Cork").getAttribute("aria-pressed")).toBe("true");
    await tap(screen.getByRole("button", { name: "Put in Sinks" }));
    expect(card("Cork").className).toContain("animate-shake"); // back in the tray
    await tap(card("Cork"));
    await tap(screen.getByRole("button", { name: "Put in Floats" }));
    await tap(card("Iron"));
    await tap(screen.getByRole("button", { name: "Put in Sinks" }));
    await tap(card("Wax"));
    await tap(screen.getByRole("button", { name: "Put in Floats" }));
    expect(feedback()).toContain("Sorted!");
    expect(feedback()).toContain("2 of 3 right first time");
    await finish();
    expect(store.getSnapshot().levels["boards"]?.stars).toBe(2);
  });
});

describe("match", () => {
  const step = {
    id: "match",
    kind: "match",
    prompt: "Pair each with its unit.",
    pairs: [
      { left: { id: "p", label: "Pressure" }, right: { id: "pa", label: "pascal" } },
      { left: { id: "rho", label: "Density" }, right: { id: "kgm3", label: "kg per m³" } },
      { left: { id: "f", label: "Force" }, right: { id: "n", label: "newton" } },
    ],
  };

  it("locks right pairs and counts wrong ones", async () => {
    await play(step);
    const left = (name: string) => within(screen.getByRole("group", { name: "Left" })).getByRole("button", { name });
    const right = (name: string) => within(screen.getByRole("group", { name: "Right" })).getByRole("button", { name });
    await tap(left("Pressure"));
    await tap(right("newton"));
    await tap(left("Pressure"));
    await tap(right("pascal"));
    expect(screen.getByRole("button", { name: "Pressure (matched)" })).toBeTruthy();
    await tap(right("kg per m³"));
    await tap(left("Density"));
    await tap(left("Force"));
    await tap(right("newton"));
    expect(feedback()).toContain("All matched!");
    expect(feedback()).toContain("2 of 3 pairs right first time");
  });
});

describe("order", () => {
  const step = {
    id: "order",
    kind: "order",
    prompt: "Lightest block first.",
    given: { blockVolume: 20 },
    ends: ["lightest", "heaviest"],
    by: "blockMass",
    cards: [block("cork", "Cork", 240), block("wax", "Wax", 900), block("iron", "Iron", 7870)],
  };

  it("takes the cards in order, first time", async () => {
    await play(step);
    await tap(card("Cork"));
    await tap(card("Wax"));
    await tap(card("Iron"));
    expect(feedback()).toContain("In order, first time!");
    expect(within(screen.getByRole("list", { name: "Your order" })).getByText("Iron")).toBeTruthy();
  });

  it("shakes a card out of turn", async () => {
    await play(step);
    await tap(card("Iron"));
    expect(card("Iron").className).toContain("animate-shake");
  });
});

describe("tap", () => {
  const step = {
    id: "tap",
    kind: "tap",
    prompt: "Catch every block that floats.",
    rule: "floats in water",
    given: { fluid: "water" },
    when: floats,
    cards: [block("cork", "Cork", 240), block("iron", "Iron", 7870), block("wax", "Wax", 900), block("rock", "Rock", 2600)],
  };
  const catchCard = (name: string) => act(() => fireEvent.click(screen.getAllByRole("button", { name }).find((b) => !b.getAttribute("aria-hidden"))!));

  it("scores a perfect catch", async () => {
    await play(step);
    await catchCard("Cork");
    await catchCard("Wax");
    await tap(screen.getByRole("button", { name: "Check" }));
    expect(feedback()).toContain("Caught them all!");
  });

  it("names what was missed, and counts a wrong catch", async () => {
    const store = await play(step);
    await catchCard("Cork");
    await catchCard("Rock");
    await tap(screen.getByRole("button", { name: "Check" }));
    expect(feedback()).toContain("Caught 1 of 2, and 1 that do not fit");
    expect(feedback()).toContain("Missed: Wax.");
    await finish();
    expect(store.getSnapshot().levels["boards"]?.stars).toBe(1);
  });
});

describe("build", () => {
  const step = {
    id: "build",
    kind: "build",
    prompt: "Make the block sink.",
    given: { fluid: "water", blockDensity: 950 },
    goal: sinks,
    success: "Denser than water, so it sinks.",
    hints: ["Add density."],
    parts: [{ variable: "blockDensity", label: "Density", icon: "rock" }],
  };

  it("adds parts through the simulation, and checks the goal on the model", async () => {
    await play(step);
    await tap(screen.getByRole("button", { name: "Check" }));
    expect(feedback()).toContain("Not yet");
    for (let i = 0; i < 200 && screen.getAllByRole("status").every((el) => !el.textContent?.includes("It works")); i++) {
      await tap(screen.getByRole("button", { name: "Add Density" }));
      if (i % 20 === 19) await tap(screen.getByRole("button", { name: "Check" }));
    }
    expect(feedback()).toMatch(/It works!|Perfect build!/);
  });
});
