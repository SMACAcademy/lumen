"use client";

import { type KeyboardEvent, useRef, useState } from "react";
import { useLab } from "@/lib/lab-context";
import { Panel } from "../lab/Panel";
import { ChallengePanel } from "./ChallengePanel";
import { ExperimentPanel } from "./ExperimentPanel";
import { ExplainPanel } from "./ExplainPanel";
import { ObservePanel } from "./ObservePanel";
import { PredictPanel } from "./PredictPanel";
import { useActivityProgress } from "./useActivityProgress";

const TABS = ["observe", "predict", "experiment", "explain", "challenge"] as const;
type Tab = (typeof TABS)[number];

const LABEL: Record<Tab, string> = {
  observe: "Observe",
  predict: "Predict",
  experiment: "Experiment",
  explain: "Explain",
  challenge: "Challenge",
};

/** The learning loop: Observe → Predict → Experiment → Explain → Challenge. */
export function ActivityDock() {
  const { concept, ui } = useLab();
  const progress = useActivityProgress();
  const [tab, setTab] = useState<Tab>("observe");
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({
    observe: null,
    predict: null,
    experiment: null,
    explain: null,
    challenge: null,
  });

  const { observe, challenges, experiment } = concept.activities;
  const badge: Record<Tab, string | null> = {
    observe: `${progress.observed.size}/${observe.length}`,
    predict: null,
    experiment: ui.revealed.includes(experiment.discovery.reveals) ? "✓" : null,
    explain: null,
    challenge: `${progress.solved.size}/${challenges.length}`,
  };

  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    e.stopPropagation();
    const i = TABS.indexOf(tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length]!;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <Panel title="Lab activities" subtitle="See → predict → experiment → discover → explain">
      <div
        role="tablist"
        aria-label="Activities"
        onKeyDown={onKeyDown}
        className="-mx-1 mb-3 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2 p-1"
      >
        {TABS.map((t) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[t] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
              tab === t ? "bg-surface text-ink shadow" : "text-muted hover:text-ink"
            }`}
          >
            {LABEL[t]}
            {badge[t] && (
              <span className="rounded-full bg-accent/20 px-1.5 text-[10px] font-bold tabular-nums text-accent">{badge[t]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Panels stay mounted so progress survives tab switches. */}
      {TABS.map((t) => (
        <div key={t} role="tabpanel" id={`panel-${t}`} aria-labelledby={`tab-${t}`} hidden={tab !== t}>
          {t === "observe" && <ObservePanel observed={progress.observed} onNext={() => setTab("predict")} />}
          {t === "predict" && <PredictPanel setBusy={progress.setBusy} />}
          {t === "experiment" && <ExperimentPanel />}
          {t === "explain" && tab === "explain" && <ExplainPanel />}
          {t === "challenge" && <ChallengePanel solved={progress.solved} />}
        </div>
      ))}
    </Panel>
  );
}
