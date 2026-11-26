"use client";

import type { Challenge } from "@ise/concept-schema";
import { type Condition, conditionQuantities } from "@ise/science-engine";
import { useState } from "react";
import { useLab } from "@/lib/lab-context";
import { formatQuantity } from "@/lib/format";
import { useLabSnapshot } from "@/lib/useLabSession";
import { CheckIcon } from "../icons";
import { ROLE_TEXT } from "../lab/LiveValues";

export function ChallengePanel({ solved }: { solved: ReadonlySet<string> }) {
  const { concept } = useLab();
  const challenges = concept.activities.challenges;
  const [activeId, setActiveId] = useState(challenges[0]?.id);

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">Use the lab to meet each goal. Stop the point exactly where it needs to be.</p>
      {challenges.map((c) => (
        <ChallengeCard
          key={c.id}
          challenge={c}
          solved={solved.has(c.id)}
          expanded={activeId === c.id}
          onToggle={() => setActiveId(activeId === c.id ? undefined : c.id)}
        />
      ))}
    </div>
  );
}

function ChallengeCard({
  challenge,
  solved,
  expanded,
  onToggle,
}: {
  challenge: Challenge;
  solved: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [hint, setHint] = useState(false);
  return (
    <div className={`rounded-xl border ${solved ? "border-success/50 bg-success/10" : "border-line bg-surface-2/40"}`}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
        <span
          aria-hidden
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${solved ? "bg-success text-white" : "border border-line text-muted"}`}
        >
          {solved ? <CheckIcon width={14} height={14} /> : "★"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">{challenge.title}</span>
          <span className="block text-xs text-muted">{challenge.prompt}</span>
        </span>
        <span className="sr-only">{solved ? "Solved" : "Not solved yet"}</span>
      </button>
      {expanded && (
        <div className="space-y-2 px-3 pb-3">
          {expanded && <LiveGoal goal={challenge.goal} />}
          {solved ? (
            <p className="text-sm text-ink" role="status">
              <span className="font-semibold text-success">Solved!</span> {challenge.success}
            </p>
          ) : (
            <>
              <button type="button" onClick={() => setHint(!hint)} className="text-xs font-medium text-accent hover:underline" aria-expanded={hint}>
                {hint ? "Hide hint" : "Need a hint?"}
              </button>
              {hint && <p className="text-xs text-muted">{challenge.hint}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Live readout of every quantity the goal depends on — continuous feedback. */
export function LiveGoal({ goal }: { goal: Condition }) {
  const { concept, session, ui } = useLab();
  const snap = useLabSnapshot(session);
  const keys = [...new Set(conditionQuantities(goal))];
  const shown = keys.flatMap((key) => concept.quantities.filter((q) => q.result === key || q.id === key).slice(0, 1));
  return (
    <div className="flex flex-wrap gap-2">
      {shown.map((q) => (
        <span key={q.id} className="rounded-lg bg-surface px-2 py-1 font-mono text-xs tabular-nums">
          <span className={`math mr-1 ${ROLE_TEXT[q.color]}`}>{q.symbol}</span>= {formatQuantity(q, snap.results, ui.angleUnit)}
        </span>
      ))}
    </div>
  );
}
