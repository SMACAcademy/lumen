/**
 * Layout for the "construction" view: the circle at top-left, the generated
 * sine graph to its right (sharing the circle's vertical scale), the generated
 * cosine graph below it (sharing the horizontal scale), and an optional
 * comparison graph filling the remaining corner (sharing the sine graph's θ axis).
 *
 * The circle's size and position depend only on the width, so switching mode
 * never makes it jump.
 */

import type { Rect } from "@ise/graph-engine";
import type { GraphDescriptor } from "../types";

export interface CircleGeometry {
  cx: number;
  cy: number;
  r: number;
}

export interface ConstructionLayout {
  width: number;
  height: number;
  compact: boolean;
  circle: CircleGeometry;
  /** Graph id → rectangle. */
  graphs: Record<string, Rect>;
  /** Graph id → descriptor, for picking. */
  descriptors: Record<string, GraphDescriptor>;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function computeConstructionLayout(width: number, graphs: readonly GraphDescriptor[]): ConstructionLayout {
  // Phones get tighter margins so the generated graph keeps a readable width.
  const compact = width < 560;
  const pad = compact ? 4 : 20;
  const labelRoom = compact ? 30 : 34; // room for axis and tick labels left of the circle
  const gap = compact ? 16 : 44;

  const r = clamp(width * (compact ? 0.18 : 0.19), 54, 150);
  const cx = pad + labelRoom + r;
  const cy = pad + 34 + r; // room above for the θ readout

  const rightX = cx + r + gap;
  const rightWidth = Math.max(80, width - rightX - pad - (compact ? 16 : 34));
  const downLength = clamp(Math.min(rightWidth, 2.4 * r), 120, 360);

  const rects: Record<string, Rect> = {};
  const descriptors: Record<string, GraphDescriptor> = {};
  let bottom = cy + r + labelRoom;

  const generatedRight = graphs.find((g) => g.role === "generated" && g.orientation === "right");
  const generatedDown = graphs.find((g) => g.role === "generated" && g.orientation === "down");
  const compare = graphs.find((g) => g.role === "compare");

  if (generatedRight) {
    rects[generatedRight.id] = { x: rightX, y: cy - r, width: rightWidth, height: 2 * r };
    descriptors[generatedRight.id] = generatedRight;
  }

  const downTop = cy + r + gap;
  if (generatedDown) {
    rects[generatedDown.id] = { x: cx - r, y: downTop, width: 2 * r, height: downLength };
    descriptors[generatedDown.id] = generatedDown;
    bottom = Math.max(bottom, downTop + downLength + (compact ? 30 : 36));
  }

  if (compare) {
    const compareHeight = clamp(1.6 * r, 100, 240);
    // Beside the cosine graph when there is one; otherwise below the circle.
    const top = generatedDown ? downTop + 18 : cy + r + gap + 10;
    rects[compare.id] = { x: rightX, y: top, width: rightWidth, height: compareHeight };
    descriptors[compare.id] = compare;
    bottom = Math.max(bottom, top + compareHeight + 30);
  }

  return { width, height: Math.ceil(bottom + pad), compact, circle: { cx, cy, r }, graphs: rects, descriptors };
}
