"use client";

import { SPEED_MULTIPLIERS, type SpeedMultiplier } from "@ise/science-engine";
import { useLab } from "@/lib/lab-context";
import { useLabSelector } from "@/lib/useLabSession";
import { EraseIcon, PauseIcon, PlayIcon, ResetIcon, StepBackIcon, StepForwardIcon } from "../icons";

const SPEED_LABEL: Record<SpeedMultiplier, string> = { 0.1: "0.1×", 0.25: "¼×", 0.5: "½×", 1: "1×", 2: "2×" };

export function PlaybackControls() {
  const { concept, session, emit } = useLab();
  const playing = useLabSelector(session, (s) => s.playback.playing);
  const speed = useLabSelector(session, (s) => s.playback.speed);

  const button =
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 text-sm font-medium text-ink transition hover:border-accent/60 hover:bg-surface-2/70 active:scale-[0.97]";

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Playback controls">
      <button
        type="button"
        onClick={() => {
          session.togglePlay();
          if (!playing) emit("play");
        }}
        className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition hover:brightness-110 active:scale-[0.97]"
        aria-keyshortcuts="Space"
        title="Play / pause (Space)"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
        {playing ? "Pause" : (concept.simulation.playLabel ?? "Play")}
      </button>
      <button
        type="button"
        className={button}
        onClick={() => (session.step(-1), emit("step"))}
        aria-label="Step back"
        aria-keyshortcuts="ArrowLeft"
        title="Step back (←)"
      >
        <StepBackIcon />
      </button>
      <button
        type="button"
        className={button}
        onClick={() => (session.step(1), emit("step"))}
        aria-label="Step forward"
        aria-keyshortcuts="ArrowRight"
        title="Step forward (→)"
      >
        <StepForwardIcon />
      </button>
      <button
        type="button"
        className={button}
        onClick={() => (session.reset(), emit("reset"))}
        aria-keyshortcuts="R"
        title="Reset angle and erase the curve (R)"
      >
        <ResetIcon />
        <span className="hidden sm:inline">Reset</span>
      </button>
      {session.model.trace && (
        <button
          type="button"
          className={button}
          onClick={() => session.clearTrace()}
          title="Erase the generated curve but keep the current position"
        >
          <EraseIcon />
          <span className="hidden sm:inline">Erase curve</span>
        </button>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span id="speed-label" className="text-xs font-medium uppercase tracking-wide text-muted">
          Speed
        </span>
        <div role="radiogroup" aria-labelledby="speed-label" className="flex rounded-xl border border-line bg-surface-2 p-0.5">
          {SPEED_MULTIPLIERS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={speed === s}
              aria-label={s < 1 ? `Slow motion ${s} times` : `${s} times speed`}
              onClick={() => session.setSpeed(s)}
              className={`h-9 min-w-10 rounded-lg px-2 text-xs font-semibold transition ${
                speed === s ? "bg-surface text-ink shadow" : "text-muted hover:text-ink"
              }`}
            >
              {SPEED_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
