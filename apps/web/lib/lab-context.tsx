"use client";

import type { Concept, Mode, Quantity } from "@ise/concept-schema";
import type { AnySimulationModel } from "@ise/science-engine";
import type { AnySimulationRenderer } from "@ise/simulation-renderer";
import type { AngleUnit } from "@ise/units";
import { createContext, useContext } from "react";
import type { AnyLabSession } from "./useLabSession";

/** Presentation state owned by the lab UI (not by the simulation). */
export interface LabUIState {
  mode: string;
  angleUnit: AngleUnit;
  /** Visualization layer emphasised because the learner is hovering something. */
  highlight: string | null;
  /** Discoverable equations the learner has unlocked. */
  revealed: readonly string[];
  showLabels: boolean;
}

export type LabUIAction =
  | { type: "setMode"; mode: string }
  | { type: "setAngleUnit"; unit: AngleUnit }
  | { type: "setHighlight"; layer: string | null }
  | { type: "reveal"; equation: string }
  | { type: "toggleLabels" };

export function labUIReducer(state: LabUIState, action: LabUIAction): LabUIState {
  switch (action.type) {
    case "setMode":
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case "setAngleUnit":
      return state.angleUnit === action.unit ? state : { ...state, angleUnit: action.unit };
    case "setHighlight":
      return state.highlight === action.layer ? state : { ...state, highlight: action.layer };
    case "reveal":
      return state.revealed.includes(action.equation)
        ? state
        : { ...state, revealed: [...state.revealed, action.equation] };
    case "toggleLabels":
      return { ...state, showLabels: !state.showLabels };
  }
}

/** Lab-level UI events (play, record, mode change…) consumed by activities. */
export type LabEventListener = (name: string) => void;

export interface LabContextValue {
  concept: Concept;
  model: AnySimulationModel;
  renderer: AnySimulationRenderer;
  session: AnyLabSession;
  ui: LabUIState;
  dispatch: (action: LabUIAction) => void;
  mode: Mode;
  quantities: ReadonlyMap<string, Quantity>;
  emit: (event: string) => void;
  onEvent: (listener: LabEventListener) => () => void;
}

export const LabContext = createContext<LabContextValue | null>(null);

export function useLab(): LabContextValue {
  const value = useContext(LabContext);
  if (!value) throw new Error("useLab must be used inside <ConceptLaboratory>");
  return value;
}
