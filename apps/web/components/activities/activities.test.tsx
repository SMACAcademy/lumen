import { unitCircleSineCosine } from "@ise/content";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ConceptLaboratory } from "../lab/ConceptLaboratory";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
});
afterEach(cleanup);

const setAngle = (degrees: number) =>
  act(() => {
    fireEvent.change(screen.getByRole("slider", { name: /Angle/ }), { target: { value: String(degrees) } });
  });

describe("activities", () => {
  it("discovery: recording observations and answering reveals the hidden identity", () => {
    render(<ConceptLaboratory concept={unitCircleSineCosine} />);
    fireEvent.click(screen.getByRole("radio", { name: /Both/ }));
    expect(screen.getByText(/A hidden relationship/)).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Experiment/ }));
    const panel = within(screen.getByRole("tabpanel", { name: /Experiment/ }));
    for (const deg of [30, 120, 210]) {
      setAngle(deg);
      fireEvent.click(panel.getByRole("button", { name: /Record observation/ }));
    }
    expect(panel.getAllByText("1.0000")).toHaveLength(3);

    fireEvent.click(panel.getByLabelText("It is always 1"));
    expect(panel.getByText(/You discovered a law/)).toBeTruthy();
    expect(screen.queryByText(/A hidden relationship/)).toBeNull();
    expect(screen.getByText("Pythagorean identity")).toBeTruthy();
  });

  it("a wrong discovery answer gives a nudge instead of the answer", () => {
    render(<ConceptLaboratory concept={unitCircleSineCosine} />);
    fireEvent.click(screen.getByRole("tab", { name: /Experiment/ }));
    const panel = within(screen.getByRole("tabpanel", { name: /Experiment/ }));
    for (const deg of [10, 100, 200]) {
      setAngle(deg);
      fireEvent.click(panel.getByRole("button", { name: /Record observation/ }));
    }
    fireEvent.click(panel.getByLabelText("It grows as θ grows"));
    expect(panel.getByText(/try an angle in a different quadrant/)).toBeTruthy();
    expect(panel.queryByText(/You discovered a law/)).toBeNull();
  });

  it("challenges complete when the learner places the point on the goal", () => {
    render(<ConceptLaboratory concept={unitCircleSineCosine} />);
    const challengeTab = screen.getByRole("tab", { name: /Challenge/ });
    expect(challengeTab.textContent).toContain("0/3");
    setAngle(210);
    expect(challengeTab.textContent).toContain("1/3");
    setAngle(270);
    expect(challengeTab.textContent).toContain("2/3");
  });

  it("observe checkpoints latch as the learner explores", () => {
    render(<ConceptLaboratory concept={unitCircleSineCosine} />);
    const observeTab = screen.getByRole("tab", { name: /Observe/ });
    fireEvent.click(screen.getByRole("button", { name: /Play/ }));
    fireEvent.click(screen.getByRole("button", { name: /Pause/ }));
    setAngle(90);
    expect(observeTab.textContent).toContain("2/5");
    setAngle(45); // leaving the top does not undo the checkpoint
    expect(observeTab.textContent).toContain("2/5");
  });
});
