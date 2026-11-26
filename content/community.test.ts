import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { levels } from "./index";

/** The level the weekly Discussions workflow posts must be a real, playable level. */
describe("community/weekly-levels.json", () => {
  const list = JSON.parse(readFileSync(new URL("../community/weekly-levels.json", import.meta.url), "utf8")) as Record<string, { title: string }>;

  it("names only levels that exist, with their current titles", () => {
    expect(Object.keys(list).length).toBeGreaterThan(0);
    for (const [id, entry] of Object.entries(list)) {
      const level = levels.find((l) => l.id === id);
      expect(level, id).toBeDefined();
      expect(entry.title).toBe(level!.title);
    }
  });
});
