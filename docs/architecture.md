# Architecture

## The one rule

**One model is the single source of truth.** The animation, the numbers, the formula, the graphs and the activity feedback all read from the same derived results. No React component or renderer computes a scientific value.

```
User input (slider · drag · play · step · activity)
        │ actions
        ▼
LabSession  (science-engine, framework-free store)
        │ tick(dt) · setVariable · setParam · step · reset
        ▼
SimulationModel  (mathematics-engine / future physics-engine)
   initialize(params) → state
   advance(state, dt, params) → state      pure, deterministic
   step(state, params, ±1) → state
   derive(state, params) → results          flat scalars: sin, cos, quadrant, …
        │
        ├─► CurveTrace — marks visited coordinate bins and stores model samples
        ▼
LabSnapshot {params, playback, state, results, trace}   immutable per change
   ├─► simulation-renderer  (canvas; reads results only)
   ├─► graph-engine          (canvas; reads the trace only)
   ├─► React panels          (values, formula, variables; via useSyncExternalStore)
   └─► activities            (conditions & predictions evaluated against results)
```

The real-time loop runs entirely in the browser. `requestAnimationFrame` runs only while playing. Canvases redraw imperatively, coalesced to one draw per frame, and text panels subscribe to the store.

## Packages and dependency direction

```
units  ◄── science-engine  ◄── mathematics-engine
   ▲            ▲    ▲                ▲
   │            │    └── concept-schema (Zod; mirrors Condition type)
   │            └──────── graph-engine (d3-scale)
   └───────────────────── simulation-renderer ──► graph-engine, mathematics-engine
content ──► concept-schema          apps/web ──► everything
```

- **units**: radians internally; deg/rad display, π-fractions, noise-free formatting (never "−0.0000"), and a dimension-aware unit registry (km/h ↔ m/s is data, not code).
- **science-engine**: the `SimulationModel` contract; `LabSession`; the playback reducer; `CurveTrace`; the declarative `Condition` language with a latching `ConditionTracker`; `measurePrediction`.
- **mathematics-engine**: `unitCircleModel`. It is the only code that evaluates sin/cos for the lab, and it snaps floating-point noise so sin 180° is exactly 0.
- **concept-schema**: the concept definition (Zod) and `checkConceptIntegrity`, which cross-checks every id and every model output a concept references.
- **graph-engine**: `GraphFrame` (orientation-aware scales, including a shared external value scale), ticks, trace → polylines, and canvas drawing.
- **simulation-renderer**: the `SimulationRenderer` contract (`layout`, `draw`, `pick`), CSS-variable theme, DPR-aware canvas, and the unit-circle construction.

## Key design decisions

### Curve generation is recorded, not drawn
`CurveTrace` divides one period into 720 bins. When the coordinate (θ) sweeps across a bin, the bin is tagged with the current revolution and the model's sample at the bin centre is stored. The graph draws only visited bins, so the wave literally appears where the point has been. The previous revolution is faded and Reset clears everything. Long sweeps are capped at one period. This is all unit-tested.

### Shared scales make projection visible
In the construction layout, the sine graph occupies exactly the circle's vertical extent and the cosine graph exactly its horizontal extent. Both use the circle's scale, so the connector from the point to the curve is geometrically horizontal (or vertical). Tests assert this pixel equality. The circle never moves when the mode changes.

### State variables vs parameters
A concept variable binds to either model **state** (θ, written through `model.setVariable`) or a model **parameter** (ω, direction, step size). For θ, `setVariable` moves to the nearest equivalent angle. Dragging across 0° continues into the next revolution, and continuous slider drags still sweep exactly the path dragged.

### Activities are data
Observe steps, challenges and explanations use the `Condition` language (`compare`, `compareQuantities`, `visitedAll`, `traceCoverage`, `mode`, `event`, `all`/`any`/`not`). Predictions declare `variable / from / to / quantity`; the answer is **measured** by running the model, so content cannot contradict the physics.

### Registries, not pages
`apps/web/lib/registry.ts` maps model ids and renderer ids. `/lab/[conceptId]` renders the generic `ConceptLaboratory` for any registered concept. A new simulation family (projectile, pendulum…) adds a model, a renderer and a concept file, with no new page.

### Models and renderers today

| Model (`mathematics-engine`) | Renderer (`simulation-renderer`) | State · trace |
|---|---|---|
| `unit-circle` | `unit-circle` (construction: circle + generated graphs) | θ · sin, cos over one turn |
| `sinusoid` | `sinusoid` (annotated plot + generating circle) | probe x · y over [−2π, 2π), reset when A, ω, φ, d change |
| `vector-2d` | `vector-2d` (coordinate plane) | r, θ, vₓ, v_y (any is writable) · none |
| `secant-tangent` | `secant-tangent` (curve plane + slope-vs-h graph) | x, h · secant slope vs h, reset when P or the curve changes |

`mathematicsModels` lists every model once; the web registry and the content tests both use it.

### Contract details added for the maths lab
- **Trace invalidation:** `trace.sample(coordinate, params, state)` sees the state being sampled, and `trace.resetOn` lists the parameters or state variables that make recorded samples stale. `LabSession` restarts the trace when one of them changes.
- **Direct manipulation:** `renderer.pick(layout, x, y, lockedRegion, results)` returns several `writes`, applied in order (e.g. vₓ then v_y), plus `press: "sweep" | "jump"`. A drag stays locked to the region it started in.
- **Layout inputs:** `renderer.layout(width, graphs, layers, options)` can reserve space only for visible layers (the sinusoid's circle panel). It also receives the concept's `visualization.options`, e.g. the plane extent.
- **Graphs:** each graph declares `xDomain`, `xAxis` (`angle` ticks at π/4 in the learner's unit, or `linear` nice numbers), `traceOffset` (for shifted trace coordinates) and `guides` (reference lines at live quantity values).
- **Predictions:** a prediction can change a parameter as well as state (`predictionSetup` resolves the binding). It can declare `given` values so the outcome is well defined. It is measured from the learner's current state.

## Future attachment points (deliberately not built yet)

| Future need | Where it attaches |
|---|---|
| Physics concepts | `packages/physics-engine` implementing `SimulationModel`; new renderer; concept files |
| Backend (FastAPI + PostgreSQL) | Persists progress and experiments; concept JSON validated by the same Zod schema. It never runs frames |
| AI tutor | Reads `LabSnapshot` + concept as context; the engine stays the numerical source of truth |
| PWA / offline | Static-export-compatible routes; concepts are plain data, easy to cache |
| Teacher / classroom mode | Another UI consuming the same `LabSession` |
| Recorded experiments / replay | `LabSession` is deterministic; record actions + dt |
