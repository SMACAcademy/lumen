/**
 * The Concept Definition schema — the machine-readable description from which
 * the laboratory UI is constructed. One schema serves mathematics and physics.
 *
 * Values are stored in each variable's internal unit (e.g. rad, rad/s); the UI
 * converts for display. No transforms or defaults are used, so the authored
 * TypeScript object and the validated object have the same shape.
 */

import type { Condition } from "@ise/science-engine";
import { UNIT_IDS } from "@ise/units";
import { z } from "zod";

const Id = z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9-]*$/, "ids are alphanumeric with dashes");
const Text = z.string().min(1);

export const UnitIdSchema = z.enum(UNIT_IDS);

/** Semantic colour roles, resolved to theme colours by the UI. */
export const ColorRoleSchema = z.enum([
  "sine",
  "cosine",
  "tangent",
  "angle",
  "point",
  "neutral",
  "curve",
  "secant",
  "reference",
  "vector",
]);

const DashSchema = z.enum(["solid", "dashed"]);

// ── Conditions (mirrors science-engine's Condition type) ─────────────────────

const CompareOpSchema = z.enum(["eq", "neq", "gt", "gte", "lt", "lte"]);

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("compare"),
      quantity: Id,
      op: CompareOpSchema,
      value: z.number(),
      tolerance: z.number().nonnegative().optional(),
    }),
    z.object({
      type: z.literal("compareQuantities"),
      left: Id,
      op: CompareOpSchema,
      right: Id,
      tolerance: z.number().nonnegative().optional(),
    }),
    z.object({ type: z.literal("visitedAll"), quantity: Id, values: z.array(z.number()).min(1) }),
    z.object({ type: z.literal("traceCoverage"), min: z.number().min(0).max(1) }),
    z.object({ type: z.literal("mode"), is: Id }),
    z.object({ type: z.literal("event"), name: Text }),
    z.object({ type: z.literal("all"), conditions: z.array(ConditionSchema).min(1) }),
    z.object({ type: z.literal("any"), conditions: z.array(ConditionSchema).min(1) }),
    z.object({ type: z.literal("not"), condition: ConditionSchema }),
  ]),
);

// ── Metadata & connections ───────────────────────────────────────────────────

export const DomainSchema = z.enum(["mathematics", "physics", "chemistry"]);

export const MetaSchema = z.object({
  id: Id,
  title: Text,
  tagline: Text,
  domain: DomainSchema,
  category: Text,
  grade: z.object({ min: z.number().int(), max: z.number().int() }),
  difficulty: z.enum(["introductory", "core", "advanced"]),
  estimatedMinutes: z.number().positive(),
  objective: Text,
  tags: z.array(Text),
});

export const ConnectionSchema = z.object({
  id: Id,
  title: Text,
  domain: DomainSchema,
  relation: z.enum(["prerequisite", "leads-to", "related"]),
  /** Why the connection matters, in one line. */
  note: Text,
  available: z.boolean(),
});

// ── Variables ────────────────────────────────────────────────────────────────

export const VariableBindingSchema = z.discriminatedUnion("kind", [
  /** Part of the model state, written via model.setVariable (e.g. θ). */
  z.object({ kind: z.literal("state"), key: Id }),
  /** A model parameter (e.g. ω, direction). */
  z.object({ kind: z.literal("param"), key: Id }),
]);

export const RangeControlSchema = z.object({
  type: z.literal("range"),
  /** Internal unit of stored values. Angles are stored in rad. */
  unit: UnitIdSchema,
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  /** Quick-set values (internal unit), e.g. the special angles. */
  presets: z.array(z.number()).optional(),
  /** Render as a draggable dial in addition to the slider. */
  dial: z.boolean().optional(),
});

export const ChoiceControlSchema = z.object({
  type: z.literal("choice"),
  options: z
    .array(
      z.object({
        value: z.union([z.string(), z.number()]),
        label: Text,
        /** Optional short glyph shown in compact layouts, e.g. "↺". */
        glyph: z.string().optional(),
      }),
    )
    .min(2),
});

export const VariableSchema = z.object({
  id: Id,
  symbol: Text,
  name: Text,
  meaning: Text,
  binding: VariableBindingSchema,
  control: z.discriminatedUnion("type", [RangeControlSchema, ChoiceControlSchema]),
  /** Which panel group the control belongs to. */
  group: z.enum(["primary", "motion"]),
  /** Accent colour of the control, matching the variable's colour in the drawing. */
  color: ColorRoleSchema.optional(),
});

// ── Quantities (derived, read-only outputs) ──────────────────────────────────

export const QuantityFormatSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("number"), digits: z.number().int().min(0).max(8) }),
  /** Value is in rad; shown in the learner's preferred angle unit. */
  z.object({ kind: z.literal("angle") }),
  z.object({ kind: z.literal("integer") }),
  /** Significant figures, with powers of ten for very small or large values (equilibrium constants, [H⁺]). */
  z.object({ kind: z.literal("sig"), figures: z.number().int().min(1).max(8) }),
  /** Map numeric values to labels, e.g. quadrant 0 → "on an axis". */
  z.object({ kind: z.literal("label"), labels: z.record(z.string(), Text) }),
]);

export const QuantitySchema = z.object({
  id: Id,
  symbol: Text,
  name: Text,
  meaning: Text,
  /** Key of the model output this quantity displays. */
  result: Id,
  format: QuantityFormatSchema,
  unit: UnitIdSchema.optional(),
  color: ColorRoleSchema,
  /** Visualization layer highlighted when the learner hovers the quantity. */
  highlight: Id.optional(),
  /** Show in the compact live-values strip. */
  headline: z.boolean().optional(),
});

// ── Equations ────────────────────────────────────────────────────────────────

export const EquationTokenSchema = z.discriminatedUnion("kind", [
  /** Reference to a quantity or variable; renders its symbol, then its live value. */
  z.object({
    kind: z.literal("ref"),
    id: Id,
    power: z.number().int().optional(),
    /** Override the symbolic rendering (e.g. show "1" for the identity result). */
    symbolic: z.string().optional(),
  }),
  z.object({ kind: z.literal("op"), value: z.enum(["=", "+", "−", "/", "·", "≈"]) }),
  z.object({ kind: z.literal("text"), value: Text }),
]);

export const EquationSchema = z.object({
  id: Id,
  title: Text,
  tokens: z.array(EquationTokenSchema).min(3),
  /** Plain-language reading of the equation. */
  reading: Text,
  /** The syllabus concept this formula belongs to, so the formula bank can file it by class and chapter. */
  topic: Id,
  /** The formula in words, e.g. "speed = distance ÷ time" — shown first to younger learners. */
  words: Text.optional(),
  assumptions: z.array(Text),
  /** Hidden until discovered in the experiment activity. */
  discoverable: z.boolean().optional(),
});

// ── Simulation, visualization, modes, graphs ─────────────────────────────────

export const SimulationSchema = z.object({
  model: Id,
  /** Parameter overrides applied on top of the model defaults. */
  params: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  /** What "Play" does in this concept, e.g. "Shrink h". Defaults to "Play". */
  playLabel: Text.optional(),
});

export const VisualizationSchema = z.object({
  renderer: Id,
  layers: z
    .array(z.object({ id: Id, label: Text, optional: z.boolean().optional() }))
    .min(1),
  /** One-line hint about direct manipulation, shown above the canvas. */
  hint: Text.optional(),
  /** Angle unit the lab opens in (the learner can still switch). Defaults to degrees. */
  angleUnit: z.enum(["deg", "rad"]).optional(),
  /** Renderer-specific settings, e.g. { extent: 6 } for a coordinate plane. */
  options: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
});

export const ModeSchema = z.object({
  id: Id,
  label: Text,
  description: Text,
  layers: z.array(Id),
  graphs: z.array(Id),
  /** Equations shown in this mode, in order. */
  equations: z.array(Id),
  /** Small line samples shown on the mode button (colour + dash, never colour alone). */
  swatches: z.array(z.object({ color: ColorRoleSchema, dash: DashSchema })).optional(),
});

export const GraphSeriesSchema = z.object({
  channel: Id,
  label: Text,
  color: ColorRoleSchema,
  dash: DashSchema,
});

export const GraphSchema = z.object({
  id: Id,
  title: Text,
  /**
   * How the renderer places the graph:
   * "generated": the trace as it is generated, attached to the simulation;
   * "compare": several channels on one standard axis;
   * "plot": a stand-alone graph beside the simulation.
   */
  role: z.enum(["generated", "compare", "plot"]),
  /** Axis along which the independent variable runs on screen. */
  orientation: z.enum(["right", "down"]),
  xLabel: Text,
  yLabel: Text,
  /** Range of the independent variable, e.g. [0, 2π] or [−2, 2]. */
  xDomain: z.tuple([z.number(), z.number()]),
  /** "angle": ticks at multiples of π/4 in the learner's unit; "linear": round numbers. */
  xAxis: z.enum(["angle", "linear"]),
  yDomain: z.tuple([z.number(), z.number()]),
  series: z.array(GraphSeriesSchema).min(1),
  /** Maps trace coordinates onto the x-axis when the model traces a shifted coordinate. */
  traceOffset: z.number().optional(),
  /** Horizontal reference lines at live quantity values (e.g. the limit being approached). */
  guides: z.array(z.object({ quantity: Id, label: Text, color: ColorRoleSchema })).optional(),
  /** Draw a connector from the moving point to the current graph value. */
  connector: z.boolean(),
});

// ── Activities ───────────────────────────────────────────────────────────────

export const ObserveStepSchema = z.object({
  id: Id,
  prompt: Text,
  hint: Text.optional(),
  condition: ConditionSchema,
});

export const PredictionOptionSchema = z.enum(["increase", "decrease", "same"]);

export const PredictionItemSchema = z.object({
  id: Id,
  question: Text,
  variable: Id,
  from: z.number(),
  to: z.number(),
  quantity: Id,
  options: z.array(PredictionOptionSchema).min(2),
  tolerance: z.number().nonnegative().optional(),
  /** Mode to switch to before running, so the relevant projection is visible. */
  mode: Id.optional(),
  /** Other variables set before the experiment runs (by variable id), so the outcome is well defined. */
  given: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
  /** Why the observed outcome happens; shown after the run. */
  explanation: Text,
});

export const ExperimentSchema = z.object({
  title: Text,
  instructions: Text,
  /** Quantity ids recorded as table columns. */
  columns: z.array(Id).min(1),
  minRows: z.number().int().positive(),
  discovery: z.object({
    question: Text,
    choices: z.array(z.object({ id: Id, label: Text, correct: z.boolean() })).min(2),
    /** Equation revealed after discovery. */
    reveals: Id,
    insight: Text,
  }),
});

export const ExplainSectionSchema = z.object({
  id: Id,
  title: Text,
  /** Markdown-light text; {{quantityId}} is replaced by the live formatted value. */
  body: Text,
  /** Show only when this condition holds; always shown when omitted. */
  when: ConditionSchema.optional(),
});

export const ChallengeSchema = z.object({
  id: Id,
  title: Text,
  prompt: Text,
  goal: ConditionSchema,
  hint: Text,
  success: Text,
});

export const ActivitiesSchema = z.object({
  observe: z.array(ObserveStepSchema),
  predict: z.array(PredictionItemSchema),
  experiment: ExperimentSchema,
  explain: z.array(ExplainSectionSchema),
  challenges: z.array(ChallengeSchema),
});

// ── Concept ──────────────────────────────────────────────────────────────────

export const ConceptSchema = z.object({
  schemaVersion: z.literal(1),
  meta: MetaSchema,
  connections: z.array(ConnectionSchema),
  variables: z.array(VariableSchema).min(1),
  quantities: z.array(QuantitySchema),
  equations: z.array(EquationSchema),
  simulation: SimulationSchema,
  visualization: VisualizationSchema,
  modes: z.array(ModeSchema).min(1),
  defaultMode: Id,
  graphs: z.array(GraphSchema),
  activities: ActivitiesSchema,
  realWorld: z.array(z.object({ title: Text, description: Text })),
});

export type Concept = z.infer<typeof ConceptSchema>;
export type ConceptMeta = z.infer<typeof MetaSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Variable = z.infer<typeof VariableSchema>;
export type RangeControl = z.infer<typeof RangeControlSchema>;
export type ChoiceControl = z.infer<typeof ChoiceControlSchema>;
export type Quantity = z.infer<typeof QuantitySchema>;
export type QuantityFormat = z.infer<typeof QuantityFormatSchema>;
export type ColorRole = z.infer<typeof ColorRoleSchema>;
export type Equation = z.infer<typeof EquationSchema>;
export type EquationToken = z.infer<typeof EquationTokenSchema>;
export type Mode = z.infer<typeof ModeSchema>;
export type Graph = z.infer<typeof GraphSchema>;
export type GraphSeries = z.infer<typeof GraphSeriesSchema>;
export type ObserveStep = z.infer<typeof ObserveStepSchema>;
export type PredictionItem = z.infer<typeof PredictionItemSchema>;
export type PredictionOption = z.infer<typeof PredictionOptionSchema>;
export type Experiment = z.infer<typeof ExperimentSchema>;
export type ExplainSection = z.infer<typeof ExplainSectionSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;
