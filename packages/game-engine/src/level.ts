/**
 * Levels and worlds: the game layer over concepts. A level is a short,
 * ordered sequence of steps played on one concept's simulation. Levels are
 * data, validated here and cross-checked against their concept and model.
 */

import { ColorRoleSchema, ConditionSchema, PredictionOptionSchema } from "@ise/concept-schema";
import { z } from "zod";

const Id = z.string().min(1).regex(/^[a-zA-Z][a-zA-Z0-9-]*$/, "ids are alphanumeric with dashes");
const Text = z.string().min(1);

/** Variable id → value, in the variable's internal unit. */
export const GivenSchema = z.record(z.string(), z.union([z.number(), z.string()]));

const stepBase = {
  id: Id,
  /** What the learner is asked to do. Markdown-light (**bold**, *italic*). */
  prompt: Text,
  /** Concept mode shown during the step; keeps the previous one when omitted. */
  mode: Id.optional(),
  /** Variables set when the step starts; the generated curve starts afresh. */
  given: GivenSchema.optional(),
  /** Variable ids that get an on-screen control. */
  controls: z.array(Id).optional(),
  /** Whether the learner may drag on the simulation (default true). */
  canvas: z.boolean().optional(),
  /** Show play/pause. */
  playback: z.boolean().optional(),
  /** Hide numeric labels on the drawing (e.g. while estimating). */
  hideLabels: z.boolean().optional(),
  /** Hide the graphs (e.g. while estimating a value the graph would give away). */
  hideGraphs: z.boolean().optional(),
  /** Progressive hints: a nudge, then something more concrete. */
  hints: z.array(Text).optional(),
};

/** Read and look. Continue whenever ready. */
export const IntroStepSchema = z.object({ ...stepBase, kind: z.literal("intro") });

/** Free play until a goal latches (e.g. "drag the dot all the way round"). Ungraded. */
export const ExploreStepSchema = z.object({
  ...stepBase,
  kind: z.literal("explore"),
  goal: ConditionSchema,
  success: Text,
});

/** Put the simulation into a state that meets the goal, then press Check. Graded by attempts and hints. */
export const TargetStepSchema = z.object({
  ...stepBase,
  kind: z.literal("target"),
  goal: ConditionSchema,
  success: Text,
  /** Shown after a wrong check. */
  retry: Text.optional(),
});

/** Predict how a quantity changes; the model measures the answer. */
export const PredictStepSchema = z.object({
  ...stepBase,
  kind: z.literal("predict"),
  variable: Id,
  from: z.number(),
  to: z.number(),
  /** Model output being predicted. */
  quantity: Id,
  options: z.array(PredictionOptionSchema).min(2),
  tolerance: z.number().nonnegative().optional(),
  explanation: Text,
});

/** Guess a quantity's value on a slider, then the real value is revealed. Graded by closeness. */
export const EstimateStepSchema = z.object({
  ...stepBase,
  kind: z.literal("estimate"),
  /** Concept quantity id. */
  quantity: Id,
  range: z.object({ min: z.number(), max: z.number(), step: z.number().positive() }),
  /** Within this distance of the truth counts as spot on. */
  tolerance: z.number().positive(),
  explanation: Text,
});

/** Name the pattern: reveals one of the concept's equations as a Law Card. */
export const DiscoverStepSchema = z.object({
  ...stepBase,
  kind: z.literal("discover"),
  /** Concept equation id. */
  equation: Id,
  /** The law in one plain sentence, e.g. "sin θ is the height of the point". */
  law: Text,
});

// ── Card games ───────────────────────────────────────────────────────────────

/** The small picture set cards can carry — one consistent style, no emoji. */
export const PICTOGRAMS = [
  "magnet",
  "nail",
  "coin",
  "eraser",
  "paper-clip",
  "spoon",
  "key",
  "wood",
  "glass",
  "lemon",
  "soap",
  "ice",
  "water",
  "steam",
  "flame",
  "bulb",
  "battery",
  "cork",
  "rock",
  "feather",
] as const;

export const PictogramSchema = z.enum(PICTOGRAMS);
export type Pictogram = z.infer<typeof PictogramSchema>;

/**
 * Whether cards with `given` are also drawn by the level's renderer. Off by
 * default: a drawing often shows the answer (a floating block floats), so an
 * author turns it on only when the drawing is the question.
 */
const drawCards = z.boolean().optional();

/**
 * A card: words, perhaps a picture, and perhaps a state of the simulation
 * (`given`), which the model can answer for — and which the step may draw.
 */
export const CardSchema = z.object({
  id: Id,
  label: Text,
  icon: PictogramSchema.optional(),
  given: GivenSchema.optional(),
});

/** Put each card in the right bin. A bin's `when` lets the model decide where a card with `given` belongs. */
export const SortStepSchema = z.object({
  ...stepBase,
  kind: z.literal("sort"),
  drawCards,
  bins: z.array(z.object({ id: Id, label: Text, when: ConditionSchema.optional() })).min(2).max(4),
  cards: z.array(CardSchema.extend({ bin: Id.optional() })).min(2).max(12),
  explanation: Text.optional(),
});

/** Pair each card on the left with its partner on the right. */
export const MatchStepSchema = z.object({
  ...stepBase,
  kind: z.literal("match"),
  drawCards,
  pairs: z.array(z.object({ left: CardSchema, right: CardSchema })).min(2).max(6),
  explanation: Text.optional(),
});

/** Put the cards in order. Authored in the right order; `by` names a model output that must rise along it. */
export const OrderStepSchema = z.object({
  ...stepBase,
  kind: z.literal("order"),
  drawCards,
  cards: z.array(CardSchema).min(3).max(7),
  /** What the two ends of the order mean, e.g. ["smallest", "largest"]. */
  ends: z.tuple([Text, Text]),
  by: Id.optional(),
  explanation: Text.optional(),
});

/** Catch every card that fits the rule. `when` lets the model decide for cards with `given`. */
export const TapStepSchema = z.object({
  ...stepBase,
  kind: z.literal("tap"),
  drawCards,
  rule: Text,
  cards: z.array(CardSchema.extend({ correct: z.boolean().optional() })).min(3).max(12),
  when: ConditionSchema.optional(),
  explanation: Text.optional(),
});

/** Add and remove parts until the simulation meets the goal — a target step with a parts tray. */
export const BuildStepSchema = z.object({
  ...stepBase,
  kind: z.literal("build"),
  goal: ConditionSchema,
  success: Text,
  retry: Text.optional(),
  parts: z.array(z.object({ variable: Id, label: Text, icon: PictogramSchema.optional() })).min(1).max(4),
});

export const StepSchema = z.discriminatedUnion("kind", [
  IntroStepSchema,
  ExploreStepSchema,
  TargetStepSchema,
  PredictStepSchema,
  EstimateStepSchema,
  DiscoverStepSchema,
  SortStepSchema,
  MatchStepSchema,
  OrderStepSchema,
  TapStepSchema,
  BuildStepSchema,
]);

export const LevelSchema = z.object({
  schemaVersion: z.literal(1),
  id: Id,
  /** Concept whose simulation the level is played on. */
  concept: Id,
  title: Text,
  /** One line on the level card. */
  summary: Text,
  /** Base XP for completing the level. */
  xp: z.number().int().positive(),
  steps: z.array(StepSchema).min(1),
});

export const WorldSchema = z.object({
  id: Id,
  title: Text,
  tagline: Text,
  color: ColorRoleSchema,
  /** Level ids in play order. */
  levels: z.array(Id).min(1),
});

export type Level = z.infer<typeof LevelSchema>;
export type Step = z.infer<typeof StepSchema>;
export type StepKind = Step["kind"];
export type IntroStep = z.infer<typeof IntroStepSchema>;
export type ExploreStep = z.infer<typeof ExploreStepSchema>;
export type TargetStep = z.infer<typeof TargetStepSchema>;
export type PredictStep = z.infer<typeof PredictStepSchema>;
export type EstimateStep = z.infer<typeof EstimateStepSchema>;
export type DiscoverStep = z.infer<typeof DiscoverStepSchema>;
export type Card = z.infer<typeof CardSchema>;
export type SortStep = z.infer<typeof SortStepSchema>;
export type MatchStep = z.infer<typeof MatchStepSchema>;
export type OrderStep = z.infer<typeof OrderStepSchema>;
export type TapStep = z.infer<typeof TapStepSchema>;
export type BuildStep = z.infer<typeof BuildStepSchema>;
export type World = z.infer<typeof WorldSchema>;

/** Steps whose outcome counts towards the level's stars. */
export function isGraded(step: Step): boolean {
  return step.kind !== "intro" && step.kind !== "explore" && step.kind !== "discover";
}

export function defineLevel(level: Level): Level {
  return level;
}

export function defineWorld(world: World): World {
  return world;
}
