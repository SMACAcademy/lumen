import { describe, expect, it } from "vitest";
import { buildsOnOf, gradeOfLevel, leadsToOf, s, spineProblems, stageOf, type Grade } from "./index";

const at = (grade: Grade, ...concepts: ReturnType<typeof s>[]) => concepts.map((concept) => ({ concept, chapter: { grade } }));

describe("the class 6 → 12 spine", () => {
  it("maps grades to stages", () => {
    expect(([6, 7, 8] as Grade[]).map(stageOf)).toEqual(["foundation", "foundation", "foundation"]);
    expect(([9, 10] as Grade[]).map(stageOf)).toEqual(["bridge", "bridge"]);
    expect(([11, 12] as Grade[]).map(stageOf)).toEqual(["advanced", "advanced"]);
  });

  it("school concepts are planned and carry no exams", () => {
    expect(s("x", "X").exams).toEqual([]);
    expect(s("x", "X").status).toBe("planned");
  });

  it("accepts a clean spine", () => {
    const entries = [...at(7, s("speed", "Speed")), ...at(9, s("velocity", "Velocity", { buildsOn: ["speed"] }))];
    expect(spineProblems(entries)).toEqual([]);
  });

  it("reports unknown ids, links to a later class, and cycles", () => {
    expect(spineProblems(at(7, s("a", "A", { buildsOn: ["ghost"] })))).toEqual(["a builds on unknown ghost"]);
    const backwards = [...at(7, s("a", "A", { buildsOn: ["b"] })), ...at(9, s("b", "B"))];
    expect(spineProblems(backwards)).toEqual(["a (class 7) builds on b (class 9)"]);
    const loop = at(8, s("a", "A", { buildsOn: ["b"] }), s("b", "B", { buildsOn: ["a"] }));
    expect(spineProblems(loop).some((p) => p.includes("cycle"))).toBe(true);
  });

  it("finds a level's class and walks the catalogue both ways", () => {
    expect(gradeOfLevel("shadow-of-a-dot")).toBe(11);
    expect(gradeOfLevel("no-such-level")).toBeNull();
    expect(buildsOnOf("nope")).toEqual([]);
    expect(leadsToOf("nope")).toEqual([]);
  });
});
