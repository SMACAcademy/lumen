import { getLevel, levels } from "@ise/content";
import { levelSpine } from "@/lib/spine";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LevelComplete } from "./LevelComplete";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const summary = { score: 0.9, stars: 3 as const, xp: 30, perfectSteps: 4, gradedSteps: 4 };

describe("LevelComplete", () => {
  it("shows the school ideas a level is built on, marking the ones still to come", () => {
    render(<LevelComplete level={getLevel("distance-and-displacement")!} summary={summary} nextHref="/learn" onReplay={() => {}} />);
    const built = screen.getByRole("region", { name: "Built on" });
    // Built for class 7: a link to its level.
    const speed = within(built).getByText(/Class 7 · Speed: distance ÷ time/);
    expect(speed.closest("a")?.getAttribute("href")).toBe("/play/how-fast");
    // Built for class 9 too.
    expect(within(built).getByText(/Class 9 · Uniform and non-uniform motion/).closest("a")?.getAttribute("href")).toBe("/play/steady-or-speeding-up");
  });

  // As the catalogue fills up there may be no root left to build; then there is nothing to mark.
  const pending = levels.map((l) => ({ level: l, root: levelSpine(l.id).roots.find((r) => r.href === null) })).find((x) => x.root);
  it.skipIf(!pending)("marks a root that is not built yet as coming", () => {
    const { level, root } = pending!;
    render(<LevelComplete level={level} summary={summary} nextHref="/learn" onReplay={() => {}} />);
    const item = within(screen.getByRole("region", { name: "Built on" })).getByText((text) => text.includes(root!.title));
    expect(item.closest("a")).toBeNull();
    expect(within(item.closest("li")!).getByText("coming")).toBeTruthy();
  });
});
