"use client";

import type { Concept } from "@ise/concept-schema";
import { UNITS, type UnitId } from "@ise/units";
import Link from "next/link";

import { useLab } from "@/lib/lab-context";
import { useProgress } from "@/lib/progress";
import { ArrowLeftIcon, ContrastIcon, LabelIcon, MoonIcon, SunIcon } from "../icons";

export function LabHeader() {
  const { concept, ui, dispatch } = useLab();
  const { snapshot, store } = useProgress();
  const { theme, highContrast } = snapshot.preferences;
  const dark = theme !== "light";
  const setPreference = (key: "theme" | "highContrast", value: string | boolean) =>
    void store.append({ type: "preference-set", payload: { key, value } });

  const iconButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface-2 text-muted transition hover:text-ink aria-pressed:border-accent/60 aria-pressed:text-ink";

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
      <Link
        href="/home"
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 text-sm text-muted transition hover:text-ink"
      >
        <ArrowLeftIcon width={16} height={16} />
        <span className="hidden sm:inline">Home</span>
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
          {concept.meta.domain} · {concept.meta.category}
        </p>
        <h1 className="font-display text-xl font-bold text-ink sm:truncate sm:text-2xl">{concept.meta.title}</h1>
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        {usesAngles(concept) && (
        <div role="radiogroup" aria-label="Angle unit" className="flex rounded-xl border border-line bg-surface-2 p-0.5">
          {(["deg", "rad"] as const).map((u) => (
            <button
              key={u}
              type="button"
              role="radio"
              aria-checked={ui.angleUnit === u}
              onClick={() => {
                dispatch({ type: "setAngleUnit", unit: u });
                void store.append({ type: "preference-set", payload: { key: "angleUnit", value: u } });
              }}
              className={`h-8 min-w-11 rounded-lg px-2 text-sm font-semibold transition ${
                ui.angleUnit === u ? "bg-surface text-ink shadow" : "text-muted hover:text-ink"
              }`}
            >
              {u === "deg" ? "deg °" : "rad π"}
            </button>
          ))}
        </div>
        )}
        <button
          type="button"
          className={iconButton}
          aria-pressed={ui.showLabels}
          aria-label="Show labels on the drawing"
          title="Show / hide labels"
          onClick={() => dispatch({ type: "toggleLabels" })}
        >
          <LabelIcon />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-pressed={highContrast}
          aria-label="High contrast"
          title="High contrast"
          onClick={() => setPreference("highContrast", !highContrast)}
        >
          <ContrastIcon />
        </button>
        <button
          type="button"
          className={iconButton}
          aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
          title="Light / dark"
          onClick={() => setPreference("theme", dark ? "light" : "dark")}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}

/** The deg/rad toggle only matters when the concept shows angles somewhere. */
function usesAngles(concept: Concept): boolean {
  const angular = (unit: UnitId) => ["angle", "angular-velocity"].includes(UNITS[unit].dimension);
  return (
    concept.variables.some((v) => v.control.type === "range" && angular(v.control.unit)) ||
    concept.quantities.some((q) => q.format.kind === "angle") ||
    concept.graphs.some((g) => g.xAxis === "angle")
  );
}
