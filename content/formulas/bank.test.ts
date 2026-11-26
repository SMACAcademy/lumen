import { describe, expect, it } from "vitest";
import { findConcept, getConcept, STAGES } from "../index";
import { buildFormulaBank, symbolicText } from "./bank";
import { schoolFormulas } from "./school";

describe("the school formula cards", () => {
  it("are filed under real syllabus concepts, with unique ids", () => {
    const ids = schoolFormulas.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of schoolFormulas) {
      expect(findConcept(f.topic), f.id).toBeDefined();
      expect(f.symbols.length, f.id).toBeGreaterThan(0);
      expect(f.words, f.id).toBeTruthy();
    }
  });
});

describe("the formula bank", () => {
  const bank = buildFormulaBank();

  it("writes a lab equation out as text, with the lab's own symbols", () => {
    const concept = getConcept("motion-in-a-straight-line")!;
    const equation = concept.equations.find((e) => e.id === "velocity-time")!;
    expect(symbolicText(concept, equation)).toBe("v = u + a · t");
    const displacement = concept.equations.find((e) => e.id === "displacement-time")!;
    expect(symbolicText(concept, displacement)).toContain("t²");
  });

  it("files school cards by class, stage and chapter", () => {
    const speed = bank.find((c) => c.id === "card:speed")!;
    expect(speed).toMatchObject({ subject: "physics", grade: 7, stage: "foundation", lab: null, words: "speed = distance ÷ time" });
    expect(speed.chapter.title).toBe("Motion and time");
  });

  it("brings in every lab equation, with a legend for its symbols", () => {
    const v = bank.find((c) => c.id === "lab:motion-in-a-straight-line:velocity-time")!;
    expect(v).toMatchObject({ grade: 11, stage: "advanced", lab: { conceptId: "motion-in-a-straight-line", equationId: "velocity-time" } });
    expect(v.symbols.map((s) => s.symbol)).toEqual(["v", "u", "a", "t"]);
    expect(v.symbols.find((s) => s.symbol === "v")?.unit).toBe("m/s");
    for (const card of bank.filter((c) => c.lab)) for (const s of card.symbols) expect(s.name, card.id).toBeTruthy();
  });

  it("covers every stage and keeps ids unique", () => {
    for (const stage of STAGES) expect(bank.some((c) => c.stage === stage), stage).toBe(true);
    expect(new Set(bank.map((c) => c.id)).size).toBe(bank.length);
    // Ordered: maths first, then by class.
    expect(bank[0]!.subject).toBe("maths");
    expect(bank[0]!.grade).toBe(6);
  });
});
