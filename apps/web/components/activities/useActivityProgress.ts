"use client";

import { type Condition, ConditionTracker, evaluateCondition, traceCoverage } from "@ise/science-engine";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLab } from "@/lib/lab-context";

export interface ActivityProgress {
  /** Observe step ids the learner has completed. */
  observed: ReadonlySet<string>;
  /** Challenge ids the learner has solved. */
  solved: ReadonlySet<string>;
  /** While a prediction run animates the lab, challenges must not auto-complete. */
  setBusy: (busy: boolean) => void;
}

/**
 * Watches the simulation and lab events, and latches observe checkpoints and
 * challenge goals declared in the concept. Nothing here is concept-specific.
 */
export function useActivityProgress(): ActivityProgress {
  const { concept, session, ui, onEvent } = useLab();
  const { observe, challenges } = concept.activities;

  const tracker = useMemo(
    () => new ConditionTracker(new Map<string, Condition>(observe.map((s) => [s.id, s.condition]))),
    [observe],
  );
  const [observed, setObserved] = useState<ReadonlySet<string>>(new Set());
  const [solved, setSolved] = useState<ReadonlySet<string>>(new Set());
  const busy = useRef(false);
  const mode = useRef(ui.mode);
  mode.current = ui.mode;

  useEffect(() => {
    const update = () => {
      const snap = session.getSnapshot();
      const ctx = {
        results: snap.results,
        mode: mode.current,
        traceCoverage: snap.trace ? traceCoverage(snap.trace) : 0,
      };
      const newly = tracker.update(ctx);
      if (newly.length > 0) setObserved(new Set(tracker.satisfied()));

      // A challenge counts only when the learner has deliberately placed the point.
      if (snap.playback.playing || busy.current) return;
      setSolved((prev) => {
        let next: Set<string> | null = null;
        for (const c of challenges) {
          if (prev.has(c.id)) continue;
          if (evaluateCondition(c.goal, { ...ctx, events: new Set() })) (next ??= new Set(prev)).add(c.id);
        }
        return next ?? prev;
      });
    };
    update();
    const offSession = session.subscribe(update);
    const offEvents = onEvent((name) => {
      tracker.recordEvent(name);
      update();
    });
    return () => {
      offSession();
      offEvents();
    };
  }, [session, tracker, challenges, onEvent]);

  // Mode is UI state, not simulation state: re-evaluate when it changes.
  useEffect(() => {
    const snap = session.getSnapshot();
    const newly = tracker.update({
      results: snap.results,
      mode: ui.mode,
      traceCoverage: snap.trace ? traceCoverage(snap.trace) : 0,
    });
    if (newly.length > 0) setObserved(new Set(tracker.satisfied()));
  }, [ui.mode, session, tracker]);

  return { observed, solved, setBusy: (b) => (busy.current = b) };
}
