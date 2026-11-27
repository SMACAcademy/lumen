import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Landing, type LandingStats } from "./Landing";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn() }) }));
// The 3D world is decoration and needs WebGL; the page must stand without it.
vi.mock("./ScienceWorld", () => ({ ScienceWorld: () => null }));

const STATS: LandingStats = {
  concepts: 482,
  playable: 54,
  labs: 15,
  levels: 23,
  subjects: {
    maths: { concepts: 119, playable: 11, labs: 4, chapters: 20 },
    physics: { concepts: 259, playable: 43, labs: 11, chapters: 30 },
    chemistry: { concepts: 104, playable: 0, labs: 0, chapters: 18 },
  },
  exams: { neet: 341, jeeMain: 456, jeeAdv: 479 },
  stages: { foundation: 118, bridge: 97, advanced: 367 },
};

beforeEach(() => {
  localStorage.clear();
  replace.mockReset();
});
afterEach(cleanup);

const renderIn = async (ui: React.ReactNode) => {
  await act(async () => {
    render(<>{ui}</>);
  });
};

describe("Landing", () => {
  it("introduces all three subjects with the catalogue's own numbers", async () => {
    await renderIn(<Landing stats={STATS} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("science world");
    for (const title of ["Maths", "Physics", "Chemistry"]) expect(screen.getByRole("heading", { level: 2, name: title })).toBeTruthy();
    expect(screen.getByText("482")).toBeTruthy();
    expect(screen.getByText("341")).toBeTruthy(); // NEET
    // One path from class 6, with the exams further along it.
    expect(screen.getAllByText(/Class 6 to 12/).length).toBeGreaterThan(0);
    expect(screen.getByText("Foundation")).toBeTruthy();
    expect(screen.getByText("118")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Heading for JEE or NEET?" })).toBeTruthy();
    // What floats past in 3D is also listed in words.
    expect(screen.getByText("Aromatic compounds")).toBeTruthy();
  });

  it("says the content may contain mistakes and how to report one", async () => {
    await renderIn(<Landing stats={STATS} />);
    expect(screen.getByText(/may contain mistakes/)).toBeTruthy();
    expect(screen.getByText(/Not affiliated with NCERT, CBSE or NTA/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Disclaimer" }).getAttribute("href")).toContain("DISCLAIMER.md");
    expect(screen.getByRole("link", { name: "Report a mistake" }).getAttribute("href")).toContain("template=correction.yml");
  });

  it("marks where the camera should be for each part of the page", async () => {
    await renderIn(<Landing stats={STATS} />);
    const depths = Array.from(document.querySelectorAll<HTMLElement>("[data-world-z]")).map((el) => Number(el.dataset.worldZ));
    expect(depths.length).toBeGreaterThanOrEqual(5);
    // Scrolling down always flies deeper.
    expect(depths).toEqual([...depths].sort((a, b) => b - a));
  });

  it("opens the app straight away: no account needed", async () => {
    await renderIn(<Landing stats={STATS} />);
    for (const link of screen.getAllByRole("link", { name: /Open Lumen|Start exploring/ })) expect(link.getAttribute("href")).toBe("/home");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
  });
});
