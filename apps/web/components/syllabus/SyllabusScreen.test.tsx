import { allConcepts, coverage, forExam } from "@ise/content";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "../shell/AppShell";
import { SyllabusScreen } from "./SyllabusScreen";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let pathname = "/syllabus";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

afterEach(cleanup);

const click = (name: string | RegExp) => act(() => fireEvent.click(screen.getByRole("radio", { name })));

describe("SyllabusScreen", () => {
  it("shows the whole catalogue with what is playable", () => {
    render(<SyllabusScreen />);
    const all = coverage();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Syllabus");
    expect(screen.getByText(`${all.ready} playable`)).toBeTruthy();
    expect(screen.getByText(`of ${all.total} concepts`)).toBeTruthy();

    // Branches and a chapter from each end of the syllabus.
    expect(screen.getByRole("heading", { name: "Maths for physics" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Semiconductor electronics" })).toBeTruthy();

    // A built concept links to its level; an unbuilt one does not.
    expect(screen.getByRole("link", { name: /Sine and cosine from a circle/ }).getAttribute("href")).toBe("/play/shadow-of-a-dot");
    // Any concept still without a level shows as plain text (none may be left once the catalogue is complete).
    for (const { concept } of allConcepts().filter((e) => !e.concept.built)) {
      expect(screen.queryAllByRole("link").filter((a) => a.textContent?.includes(concept.title))).toHaveLength(0);
    }
  });

  it("filters by subject", () => {
    render(<SyllabusScreen />);
    act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Subject" })).getByRole("radio", { name: "Chemistry" })));
    expect(screen.getByRole("heading", { name: "Organic chemistry" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Laws of motion" })).toBeNull();
  });

  it("can open on one subject", () => {
    render(<SyllabusScreen initialSubject="maths" />);
    expect(screen.getByRole("heading", { name: "Calculus" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Organic chemistry" })).toBeNull();
  });

  it("filters by exam", () => {
    render(<SyllabusScreen />);
    click("NEET");
    expect(screen.getByText(`of ${forExam("neet").length} concepts`)).toBeTruthy();
    // Logic gates are a JEE topic, so they disappear.
    expect(screen.queryByText("Logic gates")).toBeNull();
  });

  it("filters by class and searches", () => {
    render(<SyllabusScreen />);
    act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Class" })).getByRole("radio", { name: "12" })));
    expect(screen.queryByRole("heading", { name: "Laws of motion" })).toBeNull();

    act(() => fireEvent.change(screen.getByLabelText("Search the syllabus"), { target: { value: "capacitor" } }));
    const found = screen.getAllByText(/capacitor/i);
    expect(found.length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Ray optics and optical instruments" })).toBeNull();
  });

  it("shows the exam filter only for class 11 and 12", () => {
    render(<SyllabusScreen />);
    const pick = (name: string) =>
      act(() => fireEvent.click(within(screen.getByRole("radiogroup", { name: "Class" })).getByRole("radio", { name })));
    pick("7");
    expect(screen.queryByRole("radiogroup", { name: "Exam" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Motion and time" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Laws of motion" })).toBeNull();
    pick("11");
    expect(screen.getByRole("radiogroup", { name: "Exam" })).toBeTruthy();
  });

  it("says so when nothing matches", () => {
    render(<SyllabusScreen />);
    act(() => fireEvent.change(screen.getByLabelText("Search the syllabus"), { target: { value: "quidditch" } }));
    expect(screen.getByText(/Nothing matches that/)).toBeTruthy();
  });
});

const framed = (children: React.ReactNode) => render(<AppShell>{children}</AppShell>);

describe("AppShell", () => {
  it("frames ordinary screens with navigation", () => {
    pathname = "/syllabus";
    framed(<p>content</p>);
    const nav = screen.getAllByRole("navigation", { name: "Sections" })[0]!;
    expect(within(nav).getByRole("link", { name: /Home/ }).getAttribute("href")).toBe("/home");
    for (const subject of ["Maths", "Physics", "Chemistry", "Practice", "Revise"]) {
      expect(within(nav).getByRole("link", { name: new RegExp(subject) })).toBeTruthy();
    }
    expect(within(nav).getByRole("link", { name: /Syllabus/ }).getAttribute("aria-current")).toBe("page");
  });

  it("gets out of the way while playing a level or working in a lab", () => {
    pathname = "/play/shadow-of-a-dot";
    framed(<p>content</p>);
    expect(screen.queryByRole("navigation", { name: "Sections" })).toBeNull();
  });
});
