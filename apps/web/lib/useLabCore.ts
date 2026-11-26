"use client";

import type { Concept } from "@ise/concept-schema";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { type LabEventListener, labUIReducer } from "./lab-context";
import { useProgress } from "./progress";
import { resolveModel, resolveRenderer } from "./registry";
import { useLabSession } from "./useLabSession";

/**
 * Everything a concept's simulation needs, independent of the page around it:
 * model, renderer, running session, presentation state and the event bus.
 * The laboratory and the level player both build their LabContext from this.
 */
export function useLabCore(concept: Concept) {
  const { snapshot, loaded } = useProgress();
  const model = useMemo(() => resolveModel(concept.simulation.model), [concept]);
  const renderer = useMemo(() => resolveRenderer(concept.visualization.renderer), [concept]);
  const session = useLabSession(model, concept.simulation.params);
  const [ui, dispatch] = useReducer(labUIReducer, {
    mode: concept.defaultMode,
    angleUnit: concept.visualization.angleUnit ?? "deg",
    highlight: null,
    revealed: [],
    showLabels: true,
  });

  // A concept that is inherently in radians keeps its unit; otherwise the
  // learner's saved preference applies once progress has loaded.
  const preferredUnit = snapshot.preferences.angleUnit;
  useEffect(() => {
    if (loaded && !concept.visualization.angleUnit) dispatch({ type: "setAngleUnit", unit: preferredUnit });
  }, [loaded, preferredUnit, concept.visualization.angleUnit]);

  const listeners = useRef(new Set<LabEventListener>());
  const emit = useCallback((event: string) => {
    for (const listener of listeners.current) listener(event);
  }, []);
  const onEvent = useCallback((listener: LabEventListener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const baseMode = concept.modes.find((m) => m.id === ui.mode) ?? concept.modes[0]!;
  const quantities = useMemo(() => new Map(concept.quantities.map((q) => [q.id, q])), [concept]);

  return { concept, model, renderer, session, ui, dispatch, baseMode, quantities, emit, onEvent };
}
