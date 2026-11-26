import { allConcepts, levels } from "@ise/content";
import { describe, expect, it } from "vitest";
import { levelSpine } from "./spine";

describe("a level's place on the spine", () => {
  it("names the school ideas a class 11 level is built on", () => {
    const spine = levelSpine("distance-and-displacement");
    expect(spine.grade).toBe(11);
    // Speed is built for class 7, so it links to its level; uniform motion (class 9) is still to come.
    const speed = spine.roots.find((r) => r.id === "speed-school");
    expect(speed).toMatchObject({ grade: 7, title: "Speed: distance ÷ time", href: "/play/how-fast" });
    expect(spine.roots.find((r) => r.id === "uniform-motion")).toMatchObject({ grade: 9, href: "/play/steady-or-speeding-up" });
    // The class 9 mole under the class 11 mole level links to its own level.
    expect(levelSpine("counting-by-weighing").roots.find((r) => r.id === "mole-school")).toMatchObject({ grade: 9, href: "/play/counting-in-moles" });
    // Any root still to be built has no link.
    for (const l of levels) for (const r of levelSpine(l.id).roots) if (r.href === null) expect(r.title).toBeTruthy();
    expect(spine.roots.length).toBeLessThanOrEqual(4);
    // Lowest class first.
    expect(spine.roots.map((r) => r.grade)).toEqual([...spine.roots.map((r) => r.grade)].sort((a, b) => a - b));
    // Never the level's own concepts.
    const own = allConcepts().filter((e) => e.concept.built?.level === "distance-and-displacement").map((e) => e.concept.id);
    for (const r of [...spine.roots, ...spine.next]) expect(own).not.toContain(r.id);
  });

  it("links to what is built, and only to that", () => {
    for (const levelId of ["distance-and-displacement", "shadow-of-a-dot", "counting-by-weighing"]) {
      const { roots, next } = levelSpine(levelId);
      for (const link of [...roots, ...next]) {
        if (link.href) expect(link.href).toMatch(/^\/(play|lab)\//);
      }
    }
  });

  it("is empty for a level it does not know", () => {
    expect(levelSpine("no-such-level")).toEqual({ grade: null, roots: [], next: [] });
  });
});
