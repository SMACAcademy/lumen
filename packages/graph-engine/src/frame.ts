/**
 * A GraphFrame maps (coordinate, value) pairs to canvas pixels for a graph
 * whose independent axis runs either to the right or downward. Generated
 * graphs share one axis with the simulation (e.g. the sine graph uses the
 * circle's vertical scale), so the frame accepts an externally supplied
 * value scale.
 */

import { scaleLinear } from "d3-scale";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Orientation = "right" | "down";

export interface GraphFrame {
  rect: Rect;
  orientation: Orientation;
  /** Domain of the independent coordinate, e.g. [0, 2π]. */
  coordinateDomain: readonly [number, number];
  valueDomain: readonly [number, number];
  /** Pixel along the coordinate axis (x for "right", y for "down"). */
  coordinateToPixel(coordinate: number): number;
  /** Pixel along the value axis (y for "right", x for "down"). */
  valueToPixel(value: number): number;
  /** Canvas point for a (coordinate, value) pair. */
  point(coordinate: number, value: number): [number, number];
  /** Inverse: coordinate under a canvas point, clamped to the domain. */
  coordinateAt(x: number, y: number): number;
  contains(x: number, y: number): boolean;
}

export interface GraphFrameOptions {
  rect: Rect;
  orientation: Orientation;
  coordinateDomain: readonly [number, number];
  valueDomain: readonly [number, number];
  /**
   * Pixel range for the value axis. Defaults to the rect's own extent
   * (top = max value for "right"; left = min value for "down").
   */
  valueRange?: readonly [number, number];
}

export function createGraphFrame(options: GraphFrameOptions): GraphFrame {
  const { rect, orientation, coordinateDomain, valueDomain } = options;
  const [c0, c1] = coordinateDomain;
  const [v0, v1] = valueDomain;

  const coordinateScale =
    orientation === "right"
      ? scaleLinear().domain([c0, c1]).range([rect.x, rect.x + rect.width])
      : scaleLinear().domain([c0, c1]).range([rect.y, rect.y + rect.height]);

  const defaultValueRange: [number, number] =
    orientation === "right" ? [rect.y + rect.height, rect.y] : [rect.x, rect.x + rect.width];
  const valueScale = scaleLinear()
    .domain([v0, v1])
    .range(options.valueRange ? [...options.valueRange] : defaultValueRange);

  const coordinateToPixel = (c: number) => coordinateScale(c);
  const valueToPixel = (v: number) => valueScale(v);

  return {
    rect,
    orientation,
    coordinateDomain,
    valueDomain,
    coordinateToPixel,
    valueToPixel,
    point(c, v) {
      return orientation === "right" ? [coordinateToPixel(c), valueToPixel(v)] : [valueToPixel(v), coordinateToPixel(c)];
    },
    coordinateAt(x, y) {
      const raw = coordinateScale.invert(orientation === "right" ? x : y);
      return Math.min(Math.max(raw, Math.min(c0, c1)), Math.max(c0, c1));
    },
    contains(x, y) {
      return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
    },
  };
}
