import type { Dash } from "@ise/graph-engine";
import type { CurveTrace, Results } from "@ise/science-engine";
import type { AngleUnit } from "@ise/units";
import type { LabTheme } from "./theme";

/** A graph as the renderer needs it — resolved from a concept's graph definition. */
export interface GraphDescriptor {
  id: string;
  role: "generated" | "compare" | "plot";
  orientation: "right" | "down";
  xLabel: string;
  yLabel: string;
  xDomain: readonly [number, number];
  xAxis: "angle" | "linear";
  yDomain: readonly [number, number];
  traceOffset?: number;
  /** Reference lines; `result` is the model output key giving the line's value. */
  guides?: readonly { result: string; label: string; color: string }[];
  connector: boolean;
  series: readonly { channel: string; label: string; color: string; dash: Dash }[];
}

export interface RenderInput {
  results: Results;
  trace: CurveTrace | null;
  /** Visualization layers visible in the current mode. */
  layers: ReadonlySet<string>;
  /** Layer to emphasise (e.g. when the learner hovers "sin θ" in a formula). */
  highlight: string | null;
  theme: LabTheme;
  angleUnit: AngleUnit;
  graphs: readonly GraphDescriptor[];
}

export type RendererOptions = Readonly<Record<string, number | string | boolean>>;

/** One state-variable write produced by direct manipulation. */
export interface VariableWrite {
  variable: string;
  /** New value in the variable's internal unit. */
  value: number;
}

export interface PickResult {
  /** Applied in order, e.g. vₓ then v_y when dragging a vector's head. */
  writes: readonly VariableWrite[];
  /** Where the pointer landed; also the region a drag stays locked to. */
  region: string;
  /**
   * How the first press applies: "sweep" moves continuously (painting any trace),
   * "jump" teleports (e.g. clicking far along a graph). Drags always sweep.
   */
  press?: "sweep" | "jump";
}

/**
 * A renderer draws one family of simulations. It is registered by id and
 * selected by a concept's `visualization.renderer`.
 */
export interface SimulationRenderer<L extends { width: number; height: number }> {
  readonly id: string;
  /**
   * Compute geometry for a width. `layers` lets a renderer reserve space only for
   * what is shown; `options` carries the concept's renderer settings.
   */
  layout(width: number, graphs: readonly GraphDescriptor[], layers: ReadonlySet<string>, options: RendererOptions): L;
  draw(ctx: CanvasRenderingContext2D, layout: L, input: RenderInput): void;
  /**
   * Map a pointer position to state-variable writes (drag-to-manipulate).
   * While dragging, `lockedRegion` is the region the drag started in.
   */
  pick?(layout: L, x: number, y: number, lockedRegion: string | undefined, results: Results): PickResult | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySimulationRenderer = SimulationRenderer<any>;

/** Resolve a descriptor's guides against the current results. */
export function resolveGuides(graph: GraphDescriptor, results: Results) {
  return (graph.guides ?? []).map((g) => {
    const value = results[g.result];
    return { value: typeof value === "number" ? value : Number.NaN, label: g.label, color: g.color };
  });
}
