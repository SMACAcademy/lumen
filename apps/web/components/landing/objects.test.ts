import { findConcept, SUBJECTS } from "@ise/content";
import { describe, expect, it } from "vitest";
import { CAMERA_END_Z, CAMERA_START_Z, cameraZAt, lateralScale, WORLD_OBJECTS, ZONE_START, zoneCameraZ } from "./objects";

describe("the science world's objects", () => {
  it("gives every subject its own stretch of space, in order", () => {
    for (const subject of SUBJECTS) {
      const mine = WORLD_OBJECTS.filter((o) => o.subject === subject);
      expect(mine.length, subject).toBeGreaterThanOrEqual(4);
    }
    // Maths first, then physics, then chemistry, as the camera flies deeper.
    const depths = WORLD_OBJECTS.map((o) => o.position[2]);
    expect(depths).toEqual([...depths].sort((a, b) => b - a));
    expect(ZONE_START.maths).toBeGreaterThan(ZONE_START.physics);
    expect(ZONE_START.physics).toBeGreaterThan(ZONE_START.chemistry);
  });

  it("uses each object once, with a title and a caption", () => {
    const kinds = WORLD_OBJECTS.map((o) => o.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const o of WORLD_OBJECTS) {
      expect(o.title.length).toBeGreaterThan(3);
      expect(o.caption.length).toBeGreaterThan(8);
    }
  });

  it("keeps objects off the flight path, so the camera never flies through one", () => {
    for (const o of WORLD_OBJECTS) expect(Math.abs(o.position[0]), o.kind).toBeGreaterThanOrEqual(3);
  });

  it("puts the whole world between the camera's start and end", () => {
    for (const o of WORLD_OBJECTS) {
      expect(o.position[2]).toBeLessThan(CAMERA_START_Z);
      expect(o.position[2]).toBeGreaterThan(CAMERA_END_Z);
    }
    for (const subject of SUBJECTS) expect(zoneCameraZ(subject)).toBeGreaterThan(ZONE_START[subject]);
  });

  it("stands for real syllabus concepts, in the right subject", () => {
    for (const o of WORLD_OBJECTS) {
      const found = findConcept(o.concept);
      expect(found, o.concept).toBeDefined();
      expect(found!.branch.subject, o.concept).toBe(o.subject);
    }
  });
});

describe("cameraZAt", () => {
  const stops = [
    { at: 0, z: 12 },
    { at: 1000, z: -40 },
    { at: 2000, z: -90 },
  ];

  it("holds the first and last stops beyond the ends", () => {
    expect(cameraZAt(-50, stops)).toBe(12);
    expect(cameraZAt(5000, stops)).toBe(-90);
  });

  it("arrives exactly at each stop and eases between them", () => {
    expect(cameraZAt(1000, stops)).toBe(-40);
    expect(cameraZAt(500, stops)).toBeCloseTo(-14, 5); // the midpoint of a smoothstep is the midpoint
    // Easing: a quarter of the way in, it has moved less than a quarter of the distance.
    expect(12 - cameraZAt(250, stops)).toBeLessThan(13);
  });

  it("does not care what order the stops come in", () => {
    expect(cameraZAt(1500, [...stops].reverse())).toBeCloseTo(cameraZAt(1500, stops), 10);
  });

  it("starts at the beginning when there are no stops", () => {
    expect(cameraZAt(300, [])).toBe(CAMERA_START_Z);
  });
});

describe("lateralScale", () => {
  it("leaves wide screens alone and pulls objects in on phones, but not onto the path", () => {
    expect(lateralScale(16 / 9)).toBe(1);
    expect(lateralScale(375 / 812)).toBeLessThan(0.5);
    expect(lateralScale(0.1)).toBe(0.42);
  });
});
