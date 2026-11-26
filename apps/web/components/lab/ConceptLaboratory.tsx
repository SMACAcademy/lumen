"use client";

import type { Concept } from "@ise/concept-schema";
import { useEffect, useMemo } from "react";
import { type LabContextValue, LabContext } from "@/lib/lab-context";
import { useLabCore } from "@/lib/useLabCore";
import { ActivityDock } from "../activities/ActivityDock";
import { LabHeader } from "./LabHeader";
import { LiveFormula } from "./LiveFormula";
import { LiveValues, ResultsPanel } from "./LiveValues";
import { ModeSwitch } from "./ModeSwitch";
import { PlaybackControls } from "./PlaybackControls";
import { SimulationStage } from "./SimulationStage";
import { VariablePanel } from "./VariablePanel";

/**
 * The generic Concept Laboratory. Everything concept-specific comes from the
 * definition: the model and renderer are resolved by id, and panels are built
 * from its variables, quantities, equations, modes, graphs and activities.
 */
export function ConceptLaboratory({ concept }: { concept: Concept }) {
  const { model, renderer, session, ui, dispatch, baseMode: mode, quantities, emit, onEvent } = useLabCore(concept);

  const value: LabContextValue = useMemo(
    () => ({ concept, model, renderer, session, ui, dispatch, mode, quantities, emit, onEvent }),
    [concept, model, renderer, session, ui, dispatch, mode, quantities, emit, onEvent],
  );

  // Keyboard shortcuts: Space play/pause, ←/→ step, R reset.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      if (e.key === " " && tag !== "BUTTON") {
        e.preventDefault();
        const wasPlaying = session.getSnapshot().playback.playing;
        session.togglePlay();
        if (!wasPlaying) emit("play");
      } else if (e.key === "ArrowRight" && !target?.closest("[role=radiogroup],[role=tablist]")) {
        session.step(1);
        emit("step");
      } else if (e.key === "ArrowLeft" && !target?.closest("[role=radiogroup],[role=tablist]")) {
        session.step(-1);
        emit("step");
      } else if (e.key === "r" || e.key === "R") {
        session.reset();
        emit("reset");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, emit]);

  return (
    <LabContext.Provider value={value}>
      <div className="mx-auto w-full max-w-[1480px] px-4 pb-16 sm:px-6">
        <LabHeader />
        <p className="-mt-2 mb-4 max-w-3xl text-sm text-muted">{concept.meta.objective}</p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
          <main className="min-w-0 space-y-4">
            <section
              aria-label="Simulation"
              className="rounded-3xl border border-line bg-[var(--lab-canvas)] p-2 shadow-xl shadow-black/10 sm:p-4"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <ModeSwitch />
                {concept.visualization.hint && <p className="text-xs text-muted">{concept.visualization.hint}</p>}
              </div>
              <SimulationStage />
              <div className="mt-3 border-t border-line pt-3">
                <PlaybackControls />
              </div>
            </section>

            <section aria-label="Values" className="space-y-3 rounded-2xl border border-line bg-surface/80 p-3 sm:p-4">
              <LiveValues />
              <ResultsPanel />
            </section>
          </main>

          <aside className="min-w-0 space-y-4" aria-label="Laboratory panels">
            <VariablePanel />
            <LiveFormula />
            <ActivityDock />
          </aside>
        </div>
      </div>
    </LabContext.Provider>
  );
}
