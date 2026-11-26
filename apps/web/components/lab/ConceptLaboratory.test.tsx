import { unitCircleSineCosine } from "@ise/content";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { ConceptLaboratory } from "./ConceptLaboratory";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeAll(() => {
  // jsdom has no canvas implementation; the renderer is exercised in its own tests.
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
});

afterEach(cleanup);

const values = () => within(screen.getByLabelText("Live values"));

describe("ConceptLaboratory (generated from the concept definition)", () => {
  it("renders the concept with live values from the model", () => {
    render(<ConceptLaboratory concept={unitCircleSineCosine} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveProperty("textContent", "Unit Circle → Sine & Cosine");
    expect(values().getByText("0°")).toBeTruthy();
    expect(values().getByText("0.0000")).toBeTruthy();
    expect(values().getByText("1.0000")).toBeTruthy();
  });

  it("moving the angle slider updates sin θ and cos θ", () => {
    render(<ConceptLaboratory concept={unitCircleSineCosine} />);
    const slider = screen.getByRole("slider", { name: /Angle/ });
    act(() => {
      fireEvent.change(slider, { target: { value: "30" } });
    });
    expect(values().getByText("30°")).toBeTruthy();
    expect(values().getByText("0.5000")).toBeTruthy();
    expect(values().getByText("0.8660")).toBeTruthy();
  });

  it("toggles play and pause", () => {
    render(<ConceptLaboratory concept={unitCircleSineCosine} />);
    const play = screen.getByRole("button", { name: /Play/ });
    fireEvent.click(play);
    expect(screen.getByRole("button", { name: /Pause/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Pause/ }));
    expect(screen.getByRole("button", { name: /Play/ })).toBeTruthy();
  });

  it("switching mode changes the live formula", () => {
    render(<ConceptLaboratory concept={unitCircleSineCosine} />);
    expect(screen.getByText("Sine as a projection")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Cosine/ }));
    expect(screen.getByText("Cosine as a projection")).toBeTruthy();
    expect(screen.queryByText("Sine as a projection")).toBeNull();
  });

  it("switches angle units everywhere", () => {
    render(<ConceptLaboratory concept={unitCircleSineCosine} />);
    act(() => {
      fireEvent.change(screen.getByRole("slider", { name: /Angle/ }), { target: { value: "90" } });
    });
    fireEvent.click(screen.getByRole("radio", { name: /rad/ }));
    expect(values().getByText("π/2 rad")).toBeTruthy();
  });
});
