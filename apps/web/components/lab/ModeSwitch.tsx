"use client";

import type { Mode } from "@ise/concept-schema";
import { roleVar } from "@/lib/colors";
import { useLab } from "@/lib/lab-context";

/** Switches between the concept's declared modes (e.g. Sine / Cosine / Both). */
export function ModeSwitch() {
  const { concept, ui, dispatch, emit } = useLab();
  return (
    <div role="radiogroup" aria-label="What to show" className="flex flex-wrap gap-1 rounded-2xl border border-line bg-surface-2 p-1">
      {concept.modes.map((m) => {
        const active = ui.mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={active}
            title={m.description}
            onClick={() => {
              dispatch({ type: "setMode", mode: m.id });
              emit(`mode:${m.id}`);
            }}
            className={`flex-1 rounded-xl px-3.5 py-1.5 text-left transition sm:flex-none ${
              active ? "bg-surface shadow-md" : "hover:bg-surface/50"
            }`}
          >
            <span className={`block whitespace-nowrap text-sm font-semibold ${active ? "text-ink" : "text-muted"}`}>
              {m.swatches && m.swatches.length > 0 && <ModeSwatches swatches={m.swatches} />} {m.label}
            </span>
            <span className="hidden text-[11px] leading-tight text-muted md:block">{m.description}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Small colour + pattern cues from the concept, so modes are not told apart by colour alone. */
function ModeSwatches({ swatches }: { swatches: NonNullable<Mode["swatches"]> }) {
  return (
    <span aria-hidden className="mr-1 inline-flex translate-y-[-3px] flex-col gap-0.5 align-middle">
      {swatches.map((s, i) => (
        <span
          key={i}
          className="block h-0.5 w-4 rounded"
          style={
            s.dash === "solid"
              ? { background: roleVar(s.color) }
              : {
                  backgroundImage: `linear-gradient(to right, ${roleVar(s.color)} 60%, transparent 60%)`,
                  backgroundSize: "6px 2px",
                }
          }
        />
      ))}
    </span>
  );
}
