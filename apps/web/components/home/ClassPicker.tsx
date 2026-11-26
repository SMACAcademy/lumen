"use client";

import { type Grade, GRADES, STAGE_INFO, stageOf } from "@ise/content";

/**
 * "Which class are you in?" — seven tiles and a way out. `value` is the
 * current answer: a class, null for "just exploring", or undefined when the
 * learner has not answered yet. Compact is the one-line version for Profile.
 */
export function ClassPicker({
  value,
  onChoose,
  compact = false,
}: {
  value: Grade | null | undefined;
  onChoose: (grade: Grade | null) => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div role="radiogroup" aria-label="Your class" className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-0.5">
        {GRADES.map((grade) => (
          <Chip key={grade} label={`Class ${grade}`} on={value === grade} onClick={() => onChoose(grade)}>
            {grade}
          </Chip>
        ))}
        <Chip label="Just exploring" on={value === null} onClick={() => onChoose(null)}>
          Exploring
        </Chip>
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label="Your class">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {GRADES.map((grade) => {
          const on = value === grade;
          return (
            <button
              key={grade}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`Class ${grade}`}
              onClick={() => onChoose(grade)}
              className={`flex flex-col items-center rounded-2xl border px-2 py-3 transition hover:-translate-y-0.5 hover:border-accent/60 ${
                on ? "border-accent bg-accent/15" : "border-line bg-surface/70"
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Class</span>
              <span className="font-display text-3xl font-extrabold tabular-nums text-ink">{grade}</span>
              <span className="text-[10px] font-semibold text-muted">{STAGE_INFO[stageOf(grade)].title}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        onClick={() => onChoose(null)}
        className="mt-3 text-sm font-semibold text-muted underline-offset-4 transition hover:text-ink hover:underline"
      >
        Just exploring
      </button>
    </div>
  );
}

function Chip({ label, on, onClick, children }: { label: string; on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`font-display h-9 min-w-9 rounded-lg px-2.5 text-sm font-semibold tabular-nums transition ${
        on ? "bg-surface text-ink shadow" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
