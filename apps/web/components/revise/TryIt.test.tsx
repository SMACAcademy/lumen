import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TryIt } from "./TryIt";

afterEach(cleanup);

describe("TryIt", () => {
  it("opens sliders, and the formula's numbers follow them", () => {
    render(<TryIt conceptId="motion-in-a-straight-line" equationId="velocity-time" />);
    act(() => fireEvent.click(screen.getByRole("button", { name: "Try it" })));
    const line = () => screen.getByLabelText("With these values").textContent;
    const before = line();
    const time = screen.getAllByRole("slider").find((el) => el.getAttribute("aria-label")?.toLowerCase().includes("time"))!;
    act(() => fireEvent.change(time, { target: { value: String(Number(time.getAttribute("max")) / 2) } }));
    expect(line()).not.toBe(before);
    expect(line()).toContain("=");
  });
});
