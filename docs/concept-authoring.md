# Authoring a concept

A concept is a typed TypeScript object in `content/`, validated by the Zod schema in `packages/concept-schema`. The laboratory UI is generated from it, so you write data, not pages.

## 1. Create the definition

```ts
// content/mathematics/<category>/<id>.ts
import { defineConcept } from "@ise/concept-schema";
import { degToRad as deg } from "@ise/units";

export const myConcept = defineConcept({
  schemaVersion: 1,
  meta: { id: "my-concept", title: "…", domain: "mathematics", … },
  simulation: { model: "unit-circle", params: {} },   // a registered model id
  visualization: { renderer: "unit-circle", layers: [ … ] },
  variables: [ … ],     // controls: range (slider/presets/dial) or choice
  quantities: [ … ],    // read-only outputs bound to model result keys
  equations: [ … ],     // token lists: refs render symbol, then live value
  modes: [ … ],         // which layers, graphs and equations each mode shows
  defaultMode: "…",
  graphs: [ … ],        // series bound to model trace channels
  activities: { observe, predict, experiment, explain, challenges },
  connections: [ … ],
  realWorld: [ … ],
});
```

Then register it in `content/index.ts`.

## 2. Rules the integrity checker enforces

`pnpm test` runs `validateConcept` on every concept. It fails if:

- a quantity's `result`, a prediction's `quantity`, or any condition reads an output the model does not produce
- a variable binds to a state variable or parameter the model does not have
- an equation, mode, graph, experiment column or `{{template}}` references an unknown id
- a graph series uses a channel the model's trace does not record
- the discovery question has no correct answer

## 3. Units

Store every value in its **internal unit** (angles in rad, angular speed in rad/s) and declare that unit on the control. The UI converts for display according to the learner's deg/rad preference.

## 4. Activities cheat-sheet

| Activity | Key fields |
|---|---|
| Observe | `prompt`, optional `hint`, `condition` (latched once true) |
| Predict | `variable` (state or parameter), `from`, `to`, `quantity`, `options`, `explanation`, optional `given`; the outcome is measured by the model |
| Experiment | `columns` to record, `minRows`, `discovery { question, choices, reveals: equationId, insight }` |
| Explain | `title`, `body` (`**bold**`, `{{quantityId}}`), optional `when` condition |
| Challenge | `prompt`, `goal` condition, `hint`, `success` |

Conditions: `compare`, `compareQuantities`, `visitedAll`, `traceCoverage`, `mode`, `event` (`play`, `step`, `reset`, `drag`, `record`, `predict`, `mode:<id>`, `variable:<id>`), `all`, `any`, `not`.

## Optional fields worth knowing

| Field | Purpose |
|---|---|
| `variables[].color` | Accent colour of the control, matching its colour in the drawing |
| `visualization.hint` | One-line direct-manipulation hint above the canvas |
| `visualization.angleUnit` | Open the lab in `"rad"` (e.g. for ωx + φ); the learner can still switch |
| `visualization.options` | Renderer settings, e.g. `{ extent: 6, snap: 0.1 }` for the vector plane |
| `modes[].swatches` | Line samples on mode buttons (colour **and** dash, never colour alone) |
| `simulation.playLabel` | What Play means here, e.g. `"Shrink h"` |
| `graphs[].xDomain`, `xAxis`, `traceOffset`, `guides` | Axis range and kind, trace mapping, live reference lines |
| `predict[].given` | Values set before a prediction runs, e.g. `{ family: "quadratic", x0: 1 }` |

Colour roles: `sine`, `cosine`, `tangent`, `angle`, `point`, `neutral`, `curve`, `secant`, `reference`, `vector`.
Keep the conventions: horizontal/x-parts use `cosine`, vertical/y-parts use `sine`, angles use `angle`.

## 5. A new simulation family

If no existing model fits (e.g. projectile motion):

1. Implement `SimulationModel` (pure, deterministic; declare `outputs`, `stateVariables`, optional `trace`) with tests.
2. Implement `SimulationRenderer` (`layout`, `draw`, optional `pick`) that reads results only.
3. Register both in `apps/web/lib/registry.ts`.
4. Author the concept.
