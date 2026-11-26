import { ProgressStore, memoryAdapter } from "@ise/progress-store";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressProvider } from "@/lib/progress";
import { ReviseScreen } from "../home/ReviseScreen";
import { FormulaBrowser } from "./FormulaBrowser";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

async function show(ui: React.ReactNode, year?: number) {
  const store = new ProgressStore(memoryAdapter());
  await store.ready;
  if (year !== undefined) await store.append({ type: "profile-set", payload: { year } });
  await act(async () => {
    render(<ProgressProvider store={store}>{ui}</ProgressProvider>);
  });
  return store;
}

const pick = (group: string, name: string) =>
  act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: group })).getByRole("radio", { name })));

describe("Revise", () => {
  it("opens on the formula bank, with the old sections a tab away", async () => {
    await show(<ReviseScreen />);
    expect(screen.getByRole("tab", { name: /Formulas/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByText("speed = distance ÷ time").length).toBeGreaterThan(0);
    act(() => fireEvent.click(screen.getByRole("tab", { name: /Laws you discovered/ })));
    expect(screen.getByText(/Finish a level's last step/)).toBeTruthy();
  });
});

// It renders every formula in the app, which grows with each lab: allow time on a busy machine.
describe("FormulaBrowser", { timeout: 20000 }, () => {
  it("starts on the learner's own class", async () => {
    await show(<FormulaBrowser />, 7);
    expect(within(screen.getByRole("radiogroup", { name: "Class" })).getByRole("radio", { name: "7" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("heading", { name: /Class 7 · Motion and time/ })).toBeTruthy();
    expect(screen.queryByText("Kinetic energy")).toBeNull();
  });

  it("leads with words for younger classes and with symbols later", async () => {
    await show(<FormulaBrowser />);
    // Several labs give a speed formula; the school one leads with words.
    const speeds = screen.getAllByRole("article", { name: "Speed" });
    expect(speeds.map((a) => a.querySelector("[data-lead]")?.textContent)).toContain("speed = distance ÷ time");
    // The class 10 school card (there is also a lab formula of the same name).
    const ohm = screen.getAllByRole("article", { name: "Ohm's law" }).find((a) => a.querySelector("[data-lead]")?.textContent === "V = IR")!;
    expect(ohm).toBeTruthy();
    expect(within(ohm).getByText("voltage = current × resistance")).toBeTruthy();
  });

  it("filters by subject, class and search", async () => {
    await show(<FormulaBrowser />);
    pick("Subject", "Chemistry");
    expect(screen.queryByRole("article", { name: "Speed" })).toBeNull();
    expect(screen.getAllByRole("article", { name: "Moles from mass" }).length).toBeGreaterThan(0);
    pick("Subject", "All");
    act(() => fireEvent.change(screen.getByLabelText("Search formulas"), { target: { value: "density" } }));
    expect(screen.getByRole("article", { name: "Density" })).toBeTruthy();
    expect(screen.queryByRole("article", { name: "Speed" })).toBeNull();
  });

  it("links lab formulas to their lab, and prints the sheet", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    await show(<FormulaBrowser />);
    pick("Class", "11");
    const card = screen.getByRole("article", { name: "Velocity after time t" });
    expect(within(card).getByRole("link", { name: /Open the lab/ }).getAttribute("href")).toBe("/lab/motion-in-a-straight-line");
    act(() => fireEvent.click(screen.getByRole("button", { name: "Print" })));
    expect(print).toHaveBeenCalled();
  });
});
