"use client";

import { type ColorRole, type Concept, type Mode, resolveGiven } from "@ise/concept-schema";
import { type Level, type Step, levelRunReducer, startRun, summarizeRun } from "@ise/game-engine";
import Link from "next/link";
import type { LevelBest } from "@ise/progress-store";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { roleVar } from "@/lib/colors";
import { useCues } from "@/lib/cues";
import { applyWrites } from "@/lib/experiment";
import { type LabContextValue, LabContext, useLab } from "@/lib/lab-context";
import { useProgress } from "@/lib/progress";
import { useLabCore } from "@/lib/useLabCore";
import { useLabSelector } from "@/lib/useLabSession";
import { CloseIcon, PauseIcon, PlayIcon } from "../icons";
import { SimulationStage } from "../lab/SimulationStage";
import { VariableControl } from "../lab/VariablePanel";
import { LevelComplete } from "./LevelComplete";
import { StepPanel } from "./StepPanel";

/** What the drawing shows during a step: the concept mode, minus anything the step hides. */
function stepMode(mode: Mode, step: Step, revealed: boolean): Mode {
  if (revealed) return mode;
  return {
    ...mode,
    layers: step.hideLabels ? mode.layers.filter((l) => l !== "labels") : mode.layers,
    graphs: step.hideGraphs ? [] : mode.graphs,
  };
}

/**
 * Plays one level: a focused, step-by-step session on a concept's live
 * simulation. The run (attempts, hints, scores) is a pure reducer from the
 * game engine; every right/wrong decision is made by the model.
 */
export function LevelPlayer({
  level,
  concept,
  worldId,
  accent = "sine",
  nextHref = "/home",
}: {
  level: Level;
  concept: Concept;
  worldId: string;
  /** The world's colour, which the whole level adopts. */
  accent?: ColorRole;
  nextHref?: string;
}) {
  const core = useLabCore(concept);
  const { store } = useProgress();
  const { session, dispatch } = core;
  const [run, act] = useReducer(
    (r: ReturnType<typeof startRun>, a: Parameters<typeof levelRunReducer>[2]) => levelRunReducer(level, r, a),
    level,
    startRun,
  );
  const [attempt, setAttempt] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const step = level.steps[run.stepIndex]!;
  const outcome = run.outcomes[run.stepIndex]!;
  const summary = run.finished ? summarizeRun(level, run) : null;

  // Finishing writes the run to the learner's progress, exactly once per play.
  const saved = useRef(-1);
  const [previousBest, setPreviousBest] = useState<LevelBest | null>(null);
  useEffect(() => {
    if (!summary || saved.current === attempt) return;
    saved.current = attempt;
    setPreviousBest(store.getSnapshot().levels[level.id] ?? null);
    void store.append({
      type: "level-completed",
      payload: {
        levelId: level.id,
        conceptId: concept.meta.id,
        worldId,
        stars: summary.stars,
        score: summary.score,
        xp: summary.xp,
        steps: level.steps.map((s, i) => ({
          id: s.id,
          kind: s.kind,
          attempts: run.outcomes[i]?.attempts ?? 0,
          hints: run.outcomes[i]?.hints ?? 0,
          score: run.outcomes[i]?.score ?? null,
        })),
      },
    });
    level.steps.forEach((s, i) => {
      if (s.kind === "discover" && run.outcomes[i]?.done) {
        void store.append({ type: "law-discovered", payload: { lawId: s.equation, conceptId: concept.meta.id, levelId: level.id } });
      }
    });
  }, [summary, attempt, store, level, concept.meta.id, worldId, run.outcomes]);

  const mode = useMemo(() => stepMode(core.baseMode, step, revealed), [core.baseMode, step, revealed]);
  const value: LabContextValue = useMemo(
    () => ({ ...core, mode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [core.concept, core.model, core.renderer, core.session, core.ui, core.quantities, core.emit, core.onEvent, mode],
  );

  // Each step starts from its declared setup.
  useEffect(() => {
    setRevealed(false);
    session.pause();
    if (run.stepIndex === 0) {
      session.reset();
      dispatch({ type: "setMode", mode: concept.defaultMode });
    }
    if (step.mode) dispatch({ type: "setMode", mode: step.mode });
    const writes = resolveGiven(concept, step.given);
    applyWrites(session, writes);
    if (writes.length > 0) session.clearTrace();
    // Only on entering a step (or restarting the level).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.stepIndex, attempt]);

  if (summary) {
    return (
      <LevelComplete
        level={level}
        summary={summary}
        previousBest={previousBest}
        nextHref={nextHref}
        onReplay={() => {
          act({ type: "restart" });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  const done = run.outcomes.filter((o) => o.done).length;
  const controls = (step.controls ?? []).flatMap((id) => concept.variables.filter((v) => v.id === id));

  return (
    <LabContext.Provider value={value}>
      <div className="flex min-h-dvh flex-col" style={{ "--lab-accent": roleVar(accent) } as React.CSSProperties}>
        <header className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 pb-2 pt-4">
          <Link
            href="/home"
            aria-label="Quit level"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <CloseIcon />
          </Link>
          <div
            role="progressbar"
            aria-label="Level progress"
            aria-valuemin={0}
            aria-valuemax={level.steps.length}
            aria-valuenow={done}
            className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${Math.max(4, (done / level.steps.length) * 100)}%` }}
            />
          </div>
          <span className="font-display hidden text-sm font-semibold text-muted sm:block">{level.title}</span>
        </header>

        <div className="mx-auto grid w-full max-w-6xl flex-1 content-start items-start gap-4 px-4 pb-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <section aria-label="Simulation" className="min-w-0 rounded-3xl border border-line bg-[var(--lab-canvas)] p-2 sm:p-4">
            <SimulationStage interactive={step.canvas !== false} />
            {(controls.length > 0 || step.playback) && (
              <div className="mt-3 space-y-4 border-t border-line px-1 pt-3">
                {step.playback && <PlayButton />}
                {controls.map((v) => (
                  <VariableControl key={v.id} variable={v} />
                ))}
              </div>
            )}
          </section>

          <StepPanel
            key={`${attempt}-${step.id}`}
            step={step}
            outcome={outcome}
            act={act}
            onReveal={() => setRevealed(true)}
            isLast={run.stepIndex === level.steps.length - 1}
          />
        </div>
      </div>
    </LabContext.Provider>
  );
}

function PlayButton() {
  const { session, concept, emit } = useLab();
  const cues = useCues();
  const playing = useLabSelector(session, (s) => s.playback.playing);
  return (
    <button
      type="button"
      onClick={() => {
        cues.play("tap");
        if (!playing) emit("play");
        session.togglePlay();
      }}
      className="font-display inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-bold text-white shadow-lg shadow-accent/30 transition hover:brightness-110 active:scale-95"
    >
      {playing ? <PauseIcon /> : <PlayIcon />}
      {playing ? "Pause" : (concept.simulation.playLabel ?? "Play")}
    </button>
  );
}
