"use client";

import type { GivenWrite } from "@ise/concept-schema";
import { type PredictionMeasurement, type PredictionSetup, measurePrediction } from "@ise/science-engine";
import type { AnyLabSession } from "./useLabSession";

/** Apply resolved `given` writes to a running session (state writes jump, not sweep). */
export function applyWrites(session: AnyLabSession, writes: readonly GivenWrite[]): void {
  for (const w of writes) {
    if (w.target === "param") session.setParam(w.key, w.value);
    else if (typeof w.value === "number") session.setVariable(w.key, w.value, "jump");
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
}

/**
 * Run a prediction experiment in the live simulation: jump to `from`, clear
 * the curve, then sweep to `to` with easing so the learner watches the change.
 * The outcome is measured by the model at the end. Returns a cancel function.
 */
export function runExperiment(
  session: AnyLabSession,
  setup: PredictionSetup,
  onDone: (measurement: PredictionMeasurement) => void,
  duration = 1800,
): () => void {
  session.pause();
  const write = (value: number, mode: "sweep" | "jump") =>
    setup.target === "param" ? session.setParam(setup.variable, value) : session.setVariable(setup.variable, value, mode);
  write(setup.from, "jump");
  session.clearTrace();

  const total = prefersReducedMotion() ? 1 : duration;
  const start = performance.now();
  let raf = 0;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / total);
    const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    write(setup.from + (setup.to - setup.from) * eased, "sweep");
    if (t < 1) {
      raf = requestAnimationFrame(tick);
      return;
    }
    raf = 0;
    const snap = session.getSnapshot();
    onDone(measurePrediction(session.model, snap.params, setup, snap.state));
  };
  raf = requestAnimationFrame(tick);
  return () => {
    if (raf) cancelAnimationFrame(raf);
  };
}
