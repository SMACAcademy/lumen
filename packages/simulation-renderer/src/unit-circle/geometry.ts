/** Pure mapping between unit-circle coordinates and canvas pixels. */

import { createGraphFrame, type GraphFrame } from "@ise/graph-engine";
import { TAU, normalizeRadians } from "@ise/units";
import type { PickResult } from "../types";
import type { CircleGeometry, ConstructionLayout } from "./layout";

/** Maths coordinates (y up) → canvas pixels (y down). */
export function toPixel(circle: CircleGeometry, x: number, y: number): [number, number] {
  return [circle.cx + x * circle.r, circle.cy - y * circle.r];
}

/** Angle of a canvas point around the circle centre, in [0, 2π). */
export function angleAtPixel(circle: CircleGeometry, px: number, py: number): number {
  return normalizeRadians(Math.atan2(circle.cy - py, px - circle.cx));
}

/** Graph frame for a graph in the construction layout, with shared scales. */
export function frameFor(layout: ConstructionLayout, graphId: string): GraphFrame | null {
  const rect = layout.graphs[graphId];
  const descriptor = layout.descriptors[graphId];
  if (!rect || !descriptor) return null;
  return createGraphFrame({
    rect,
    orientation: descriptor.orientation,
    coordinateDomain: descriptor.xDomain,
    valueDomain: descriptor.yDomain,
  });
}

/**
 * Pointer → θ. Dragging near the circle sets θ to the pointer's angle;
 * dragging along any graph scrubs θ along its axis.
 */
export function pickTheta(layout: ConstructionLayout, x: number, y: number, lockedRegion?: string): PickResult | null {
  const { circle } = layout;
  // While dragging, keep following the pointer in the region the drag began in.
  if (lockedRegion === "circle") {
    return theta(angleAtPixel(circle, x, y), "circle");
  }
  if (lockedRegion) {
    const frame = frameFor(layout, lockedRegion);
    if (frame) {
      const value = Math.min(frame.coordinateAt(x, y), TAU - 1e-9);
      return theta(value, lockedRegion);
    }
  }
  const distance = Math.hypot(x - circle.cx, y - circle.cy);
  if (distance <= circle.r * 1.45 && distance >= 4) {
    return theta(angleAtPixel(circle, x, y), "circle");
  }
  for (const id of Object.keys(layout.graphs)) {
    const frame = frameFor(layout, id);
    if (!frame) continue;
    const slack = 14;
    const { rect } = frame;
    const inside =
      x >= rect.x - slack && x <= rect.x + rect.width + slack && y >= rect.y - slack && y <= rect.y + rect.height + slack;
    if (inside) {
      const value = Math.min(frame.coordinateAt(x, y), TAU - 1e-9);
      return theta(value, id, "jump");
    }
  }
  return null;
}

function theta(value: number, region: string, press: "sweep" | "jump" = "sweep"): PickResult {
  return { writes: [{ variable: "theta", value }], region, press };
}
