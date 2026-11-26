import { ConceptValidationError, applyGiven, checkConceptIntegrity, predictionSetup, validateConcept } from "@ise/concept-schema";
import { mathematicsModels, secantModel, sinusoidModel, unitCircleModel, vectorModel } from "@ise/mathematics-engine";
import { chemistryModels } from "@ise/chemistry-engine";
import { physicsModels } from "@ise/physics-engine";
import { type Level, checkLevelIntegrity, validateLevel } from "@ise/game-engine";
import { measurePrediction } from "@ise/science-engine";
import { describe, expect, it } from "vitest";
import { shadowOfADot } from "./worlds/circles-and-waves/shadow-of-a-dot";
import { concepts, findConcept, getConcept, getLevel, levels, secantToTangent, sinusoidalFunctions, unitCircleSineCosine, vectorComponents, worldOf, worlds } from "./index";

const models: Record<string, (typeof mathematicsModels)[number]> = Object.fromEntries(
  [...mathematicsModels, ...physicsModels, ...chemistryModels].map((m) => [m.id, m]),
);

describe("authored concepts", () => {
  it.each(concepts.map((c) => [c.meta.id, c] as const))("%s passes schema and integrity checks", (_id, concept) => {
    const model = models[concept.simulation.model]!;
    expect(model).toBeDefined();
    expect(() => validateConcept(concept, model)).not.toThrow();
  });

  it.each(concepts.map((c) => [c.meta.id, c] as const))("%s: every prediction's measured outcome is an option", (_id, concept) => {
    const model = models[concept.simulation.model]!;
    for (const item of concept.activities.predict) {
      const given = applyGiven(concept, item, model, model.defaultParams, model.initialize(model.defaultParams));
      const { outcome } = measurePrediction(model, given.params, predictionSetup(concept, item), given.state);
      expect(item.options).toContain(outcome);
    }
  });

  it("every equation names a syllabus topic for the formula bank", () => {
    for (const concept of concepts) {
      for (const equation of concept.equations) {
        const where = `${concept.meta.id}/${equation.id}`;
        expect(equation.topic, where).toBeTruthy();
        expect(findConcept(equation.topic), where).toBeDefined();
      }
    }
  });

  it("concept ids are unique", () => {
    expect(new Set(concepts.map((c) => c.meta.id)).size).toBe(concepts.length);
  });

  it("looks concepts up by id", () => {
    expect(getConcept("unit-circle-sine-cosine")).toBe(unitCircleSineCosine);
    expect(getConcept("nope")).toBeUndefined();
  });
});

describe("unit circle concept", () => {
  const params = unitCircleModel.defaultParams;

  it("every prediction has its measured outcome among the options", () => {
    for (const item of unitCircleSineCosine.activities.predict) {
      const { outcome } = measurePrediction(unitCircleModel, params, predictionSetup(unitCircleSineCosine, item));
      expect(item.options).toContain(outcome);
    }
  });

  it("predictions measure the intended outcomes", () => {
    const outcomes = Object.fromEntries(
      unitCircleSineCosine.activities.predict.map((p) => [p.id, measurePrediction(unitCircleModel, params, predictionSetup(unitCircleSineCosine, p)).outcome]),
    );
    expect(outcomes).toEqual({
      "sin-30-60": "increase",
      "sin-120-150": "decrease",
      "cos-0-90": "decrease",
      "sin-30-150": "same",
    });
  });
});

describe("integrity checker catches authoring mistakes", () => {
  it("reports unknown outputs, refs, layers and modes", () => {
    const broken = structuredClone(unitCircleSineCosine);
    broken.quantities[0]!.result = "notAnOutput";
    broken.equations[0]!.tokens[0] = { kind: "ref", id: "ghost" };
    broken.modes[0]!.layers.push("missingLayer");
    broken.defaultMode = "nope";
    const messages = checkConceptIntegrity(broken, unitCircleModel).map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'model has no output "notAnOutput"',
        'unknown reference "ghost"',
        'unknown layer "missingLayer"',
        'unknown mode "nope"',
      ]),
    );
  });

  it("rejects schema violations with readable paths", () => {
    const broken = structuredClone(unitCircleSineCosine) as unknown as { meta: { difficulty: string } };
    broken.meta.difficulty = "impossible";
    expect(() => validateConcept(broken, unitCircleModel)).toThrow(ConceptValidationError);
  });
});

describe("sinusoid concept", () => {
  it("predictions measure the intended outcomes", () => {
    const outcomes = Object.fromEntries(
      sinusoidalFunctions.activities.predict.map((p) => [
        p.id,
        measurePrediction(sinusoidModel, sinusoidModel.defaultParams, predictionSetup(sinusoidalFunctions, p)).outcome,
      ]),
    );
    expect(outcomes).toEqual({
      "omega-period": "decrease",
      "amplitude-period": "same",
      "offset-max": "increase",
      "phi-shift": "decrease",
    });
  });

  it("the cosine challenge is solvable with the slider steps", () => {
    const r = sinusoidModel.derive({ x: 0, time: 0 }, { ...sinusoidModel.defaultParams, phi: Math.PI / 2 });
    expect(r.phi).toBeCloseTo(Math.PI / 2, 12);
    expect(r.phaseShift).toBeCloseTo(-Math.PI / 2, 12);
  });
});

describe("vector concept", () => {
  it("predictions measure the intended outcomes from the default arrow", () => {
    const outcomes = Object.fromEntries(
      vectorComponents.activities.predict.map((p) => {
        const base = vectorModel.setVariable(vectorModel.setVariable(vectorModel.initialize(vectorModel.defaultParams), "vx", 3, vectorModel.defaultParams), "vy", 4, vectorModel.defaultParams);
        return [p.id, measurePrediction(vectorModel, vectorModel.defaultParams, predictionSetup(vectorComponents, p), base).outcome];
      }),
    );
    expect(outcomes).toEqual({
      "theta-vx": "decrease",
      "r-vy": "increase",
      "theta-vy-symmetry": "same",
      "flip-vx": "same",
    });
  });
});

describe("secant concept", () => {
  it("predictions with givens measure the intended outcomes", () => {
    const P = secantModel.defaultParams;
    const outcomes = Object.fromEntries(
      secantToTangent.activities.predict.map((p) => {
        const given = applyGiven(secantToTangent, p, secantModel, P, secantModel.initialize(P));
        return [p.id, measurePrediction(secantModel, given.params, predictionSetup(secantToTangent, p), given.state).outcome];
      }),
    );
    expect(outcomes).toEqual({
      "shrink-secant": "decrease",
      "shrink-tangent": "same",
      "move-right": "increase",
      "sine-slope": "decrease",
    });
  });

  it("givens override whatever the learner had set", () => {
    const P = { ...secantModel.defaultParams, family: "exponential" };
    const item = secantToTangent.activities.predict[0]!;
    const given = applyGiven(secantToTangent, item, secantModel, P, { x0: -2, h: 0.3, time: 0 });
    expect(given.params.family).toBe("quadratic");
    expect(given.state.x0).toBe(1);
  });
});

describe("levels and worlds", () => {
  const conceptOf = (level: Level) => getConcept(level.concept)!;
  const modelOf = (level: Level) => models[conceptOf(level).simulation.model]!;

  it.each(levels.map((l) => [l.id, l] as const))("level %s passes schema and integrity checks", (_id, level) => {
    expect(getConcept(level.concept)).toBeDefined();
    expect(() => validateLevel(level, conceptOf(level), modelOf(level))).not.toThrow();
  });

  it("every level is in exactly one world, and every world level exists", () => {
    for (const level of levels) expect(worlds.filter((w) => w.levels.includes(level.id))).toHaveLength(1);
    for (const world of worlds) for (const id of world.levels) expect(getLevel(id)).toBeDefined();
    expect(worldOf("shadow-of-a-dot")?.id).toBe("circles-and-waves");
  });

  it("level and world ids are unique", () => {
    expect(new Set(levels.map((l) => l.id)).size).toBe(levels.length);
    expect(new Set(worlds.map((w) => w.id)).size).toBe(worlds.length);
  });

  describe("the integrity checker catches level mistakes", () => {
    const issues = (mutate: (level: Level) => void) => {
      const broken = structuredClone(shadowOfADot);
      mutate(broken);
      return checkLevelIntegrity(broken, unitCircleSineCosine, unitCircleModel).map((i) => i.message);
    };
    const step = <K extends Level["steps"][number]["kind"]>(level: Level, kind: K) =>
      level.steps.find((s) => s.kind === kind) as Extract<Level["steps"][number], { kind: K }>;

    it("an unreachable target", () => {
      expect(issues((l) => (step(l, "target").goal = { type: "compare", quantity: "sin", op: "gt", value: 1.5 }))).toContain(
        "no reachable state meets the goal with the controls given",
      );
    });

    it("a prediction whose measured outcome is not offered", () => {
      expect(issues((l) => (step(l, "predict").options = ["decrease", "same"]))).toContain('measured outcome "increase" is not among the options');
    });

    it("an estimate without a well-defined answer", () => {
      expect(issues((l) => delete step(l, "estimate").given)).toContain("estimates need `given` so the answer is well defined");
    });

    it("unknown ids", () => {
      expect(
        issues((l) => {
          step(l, "discover").equation = "nope";
          step(l, "explore").mode = "ghost";
          step(l, "target").controls = ["phi"];
        }),
      ).toEqual(expect.arrayContaining(['unknown equation "nope"', 'unknown mode "ghost"', 'unknown control variable "phi"']));
    });
  });
});
