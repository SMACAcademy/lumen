"use client";

import type { Level, RunSummary } from "@ise/game-engine";
import type { LevelBest } from "@ise/progress-store";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCues } from "@/lib/cues";
import { levelSpine, type SpineLink } from "@/lib/spine";
import { BoltIcon, StarIcon } from "../icons";
import { Button } from "../ui/Button";

const TITLE = { 3: "Perfect run!", 2: "Great work!", 1: "Level complete!" } as const;

export function LevelComplete({
  level,
  summary,
  previousBest,
  nextHref,
  onReplay,
}: {
  level: Level;
  summary: RunSummary;
  /** The learner's result before this run, if they have played it before. */
  previousBest?: LevelBest | null;
  nextHref: string;
  onReplay: () => void;
}) {
  const isBest = !previousBest || summary.stars > previousBest.stars || summary.score > previousBest.score;
  const cues = useCues();
  const xp = useCountUp(summary.xp);
  const spine = useMemo(() => levelSpine(level.id), [level.id]);
  // Warm-ups are offered from class 9 up; below that the roots are everyday experience.
  const roots = spine.grade !== null && spine.grade >= 9 ? spine.roots : [];

  // One chime per star, then the flourish — in step with the stars popping in.
  useEffect(() => {
    const timers = [
      ...Array.from({ length: summary.stars }, (_, i) => window.setTimeout(() => cues.play("star"), 200 + i * 220)),
      window.setTimeout(() => cues.play("complete"), 200 + summary.stars * 220),
    ];
    return () => timers.forEach(clearTimeout);
  }, [summary.stars, cues]);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6 py-10 text-center">
      <p className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-muted">{level.title}</p>
      <h1 className="animate-pop font-display mt-2 text-4xl font-extrabold tracking-tight text-ink">{TITLE[summary.stars]}</h1>
      {previousBest && (
        <p className={`mt-2 text-sm font-semibold ${isBest ? "text-success" : "text-muted"}`}>
          {isBest ? "New personal best!" : `Your best: ${previousBest.stars}★ · ${Math.round(previousBest.score * 100)}%`}
        </p>
      )}

      <div className="mt-8 flex items-end gap-3" role="img" aria-label={`${summary.stars} of 3 stars`}>
        {[1, 2, 3].map((n) => {
          const earned = n <= summary.stars;
          return (
            <StarIcon
              key={n}
              width={n === 2 ? 84 : 64}
              height={n === 2 ? 84 : 64}
              strokeWidth={1.5}
              className={`${earned ? "animate-star fill-angle text-angle drop-shadow-[0_0_18px_var(--lab-angle)]" : "fill-surface-2 text-line"} ${n === 2 ? "-translate-y-3" : ""}`}
              style={{ animationDelay: `${150 + n * 220}ms` }}
            />
          );
        })}
      </div>

      <dl className="mt-10 grid w-full grid-cols-3 gap-3">
        <Stat label="XP" value={`+${xp}`} icon={<BoltIcon className="text-angle" width={16} height={16} />} />
        <Stat label="Accuracy" value={`${Math.round(summary.score * 100)}%`} />
        <Stat label="Perfect" value={`${summary.perfectSteps}/${summary.gradedSteps}`} />
      </dl>

      {(roots.length > 0 || spine.next.length > 0) && (
        <div className="mt-8 w-full space-y-4 rounded-3xl border border-line bg-surface/70 p-4 text-left">
          {roots.length > 0 && <SpineList id="built-on" title="Built on" lead="Shaky on any of these? Warm up first." links={roots} />}
          {spine.next.length > 0 && <SpineList id="meet-again" title="You'll meet this again" lead="Where this idea goes next." links={spine.next} />}
        </div>
      )}

      <div className="mt-10 flex w-full flex-col gap-3">
        <Button tone="success" size="lg" href={nextHref} full>
          Continue
        </Button>
        <Button tone="quiet" size="lg" onClick={onReplay} full>
          Play again
        </Button>
      </div>
    </main>
  );
}

function SpineList({ id, title, lead, links }: { id: string; title: string; lead: string; links: readonly SpineLink[] }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="font-display text-xs font-bold uppercase tracking-[0.16em] text-muted">
        {title}
      </h2>
      <p className="mt-0.5 text-xs text-muted">{lead}</p>
      <ul className="mt-2 space-y-1.5">
        {links.map((link) => {
          const text = `Class ${link.grade} · ${link.title}`;
          return (
            <li key={link.id} className="flex items-center justify-between gap-2 text-sm">
              {link.href ? (
                <Link href={link.href} className="font-medium text-accent hover:underline">
                  {text}
                </Link>
              ) : (
                <span className="text-ink">{text}</span>
              )}
              {!link.href && <span className="shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">coming</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="animate-rise rounded-2xl border border-line bg-surface px-2 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="font-display mt-1 flex items-center justify-center gap-1 text-xl font-extrabold tabular-nums text-ink">
        {icon}
        {value}
      </dd>
    </div>
  );
}

/** Counts up to a number over half a second, because earning feels like counting. */
function useCountUp(target: number, duration = 600): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (still || typeof requestAnimationFrame !== "function") {
      setValue(target);
      return;
    }
    // The first frame's clock may sit before this one, so the fraction is clamped.
    let start: number | null = null;
    let raf = requestAnimationFrame(function tick(now) {
      start ??= now;
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      setValue(Math.round(target * t));
      if (t < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
