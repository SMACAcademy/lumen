"use client";

import { buildWaves, chapterCoverage, type Grade, stageOf, type Subject } from "@ise/content";
import Link from "next/link";
import { useMemo, useState } from "react";
import { roleVar } from "@/lib/colors";
import { type Band, bandOf, buildJourney, type LevelStatus, type WorldProgress } from "@/lib/journey";
import { useProgress } from "@/lib/progress";
import { SUBJECT_INFO, SUBJECTS } from "@/lib/subjects";
import { CheckIcon, ChevronRightIcon, LockIcon } from "../icons";
import { SubjectIcon } from "../subjects/SubjectIcon";
import { Bar, Stars } from "../ui/Bits";

/** Geometry of the winding path: one row per level, swinging left and right. */
export const ROW = 96;
export const PATH_WIDTH = 300;
const SWING = 78;

/** How far a level's node sits from the centre line: a sine wave, fittingly. */
export function nodeOffset(index: number): number {
  return Math.round(Math.sin((index * Math.PI) / 2) * SWING);
}

/** A smooth path through the node centres, for the trail drawn behind them. */
export function trailPath(count: number): string {
  const centre = PATH_WIDTH / 2;
  const points = Array.from({ length: count }, (_, i) => [centre + nodeOffset(i), ROW / 2 + i * ROW] as const);
  if (points.length === 0) return "";
  let d = `M ${points[0]![0]} ${points[0]![1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!;
    const [x1, y1] = points[i]!;
    const mid = (y0 + y1) / 2;
    d += ` C ${x0} ${mid}, ${x1} ${mid}, ${x1} ${y1}`;
  }
  return d;
}

type Filter = "all" | Subject;

/**
 * The learning map: every world as a winding trail of levels. The first level
 * of each world is always open; the rest open one at a time. The next level
 * to play glows, so there is never a question of what to do.
 */
export function LearnScreen() {
  const { snapshot, loaded } = useProgress();
  const journey = useMemo(() => buildJourney(snapshot), [snapshot]);
  const [filter, setFilter] = useState<Filter>("all");
  const upcoming = useMemo(() => roadAhead(journey.learner), [journey.learner]);
  const shown = journey.worlds.filter((w) => filter === "all" || w.subject === filter);
  const nextId = journey.next?.level.id;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-ink">Learning map</h1>
      <p className="mt-1 text-sm text-muted">
        Short levels, in order. Your class comes first; everything else is open — start wherever you are.
      </p>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Show worlds for">
        <FilterChip on={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterChip>
        {SUBJECTS.map((subject) => {
          const count = journey.worlds.filter((w) => w.subject === subject).length;
          return (
            <FilterChip key={subject} on={filter === subject} onClick={() => setFilter(subject)} disabled={count === 0} color={SUBJECT_INFO[subject].color}>
              <SubjectIcon subject={subject} width={14} height={14} />
              {SUBJECT_INFO[subject].title}
              {count === 0 && <span className="text-[10px] font-normal opacity-80">· coming</span>}
            </FilterChip>
          );
        })}
      </div>

      {!loaded ? (
        <div className="mt-8 h-72 animate-pulse rounded-3xl border border-line bg-surface/60" aria-hidden />
      ) : (
        journey.learner === null ? (
          <Trails worlds={shown} all={journey.worlds} nextId={nextId} />
        ) : (
          <div className="mt-8 space-y-6">
            {BANDS.map((band) => {
              const inBand = shown.filter((w) => bandOf(w.grade, journey.learner!) === band);
              if (band !== "yours" && inBand.length === 0) return null;
              const holdsNext = inBand.some((w) => w.levels.some((l) => l.level.id === nextId));
              return (
                <BandSection key={band} band={band} learner={journey.learner!} count={inBand.length} open={band === "yours" || holdsNext}>
                  {inBand.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-muted">
                      Class {journey.learner} worlds are being built now.{" "}
                      {elsewhere(shown, journey.learner!)} below — everything is open.
                    </p>
                  ) : (
                    <Trails worlds={inBand} all={journey.worlds} nextId={nextId} nested />
                  )}
                </BandSection>
              );
            })}
          </div>
        )
      )}

      <section className="mt-14" aria-labelledby="ahead">
        <h2 id="ahead" className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted">
          The road ahead
        </h2>
        <p className="mt-1 text-sm text-muted">
          New worlds arrive in waves, each built on one reusable simulation kit. Everything planned is in the{" "}
          <Link href="/syllabus" className="font-semibold text-accent hover:underline">
            syllabus
          </Link>
          .
        </p>
        <ol className="mt-4 space-y-2">
          {upcoming.map(({ wave, chapters }) => (
            <li key={wave} className="rounded-2xl border border-dashed border-line px-4 py-3">
              <p className="font-display text-xs font-bold uppercase tracking-wider text-muted">Wave {wave}</p>
              <p className="mt-1 text-sm text-ink">{chapters.map((c) => c.chapter.title).join(" · ")}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

const BANDS: readonly Band[] = ["yours", "warm-up", "ahead"];

/**
 * The next few build waves worth showing: for a learner with a class, the
 * chapters of their own stage still to be built; otherwise the physics core
 * after the first waves.
 */
export function roadAhead(learner: Grade | null) {
  const waves = buildWaves();
  if (learner === null) return waves.filter((w) => w.wave > 5).slice(0, 4);
  const stage = stageOf(learner);
  return waves
    .map(({ wave, chapters }) => ({
      wave,
      chapters: chapters.filter(({ chapter }) => stageOf(chapter.grade) === stage && chapterCoverage(chapter).ready < chapter.concepts.length),
    }))
    .filter((w) => w.chapters.length > 0)
    .slice(0, 4);
}

/** "Warm up or peek ahead", naming only the bands that have something in them. */
function elsewhere(worlds: readonly WorldProgress[], learner: Grade): string {
  const has = (band: Band) => worlds.some((w) => bandOf(w.grade, learner) === band);
  if (has("warm-up") && has("ahead")) return "Warm up or peek ahead";
  return has("warm-up") ? "Warm up" : "Peek ahead";
}

function bandText(band: Band, learner: number): { title: string; hint: string } {
  if (band === "yours") return { title: "Your class", hint: learner >= 11 ? "Class 11 and 12" : `Class ${learner}` };
  if (band === "warm-up") return { title: "Warm-up", hint: "Earlier classes, to revisit the basics" };
  return { title: "Peek ahead", hint: "Later classes. Fully playable — see where your ideas lead" };
}

function BandSection({
  band,
  learner,
  count,
  open,
  children,
}: {
  band: Band;
  learner: number;
  count: number;
  open: boolean;
  children: React.ReactNode;
}) {
  const { title, hint } = bandText(band, learner);
  return (
    <section aria-labelledby={`band-${band}`}>
      <details open={open} className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl border border-line bg-surface/60 px-4 py-3 transition hover:border-accent/50">
          <span>
            <h2 id={`band-${band}`} className="font-display text-lg font-bold text-ink">
              {title}
            </h2>
            <span className="text-sm text-muted">
              {hint} · {count} world{count === 1 ? "" : "s"}
            </span>
          </span>
          <ChevronRightIcon width={18} height={18} className="shrink-0 text-muted transition group-open:rotate-90" />
        </summary>
        <div className="mt-6">{children}</div>
      </details>
    </section>
  );
}

function Trails({ worlds, all, nextId, nested = false }: { worlds: WorldProgress[]; all: WorldProgress[]; nextId: string | undefined; nested?: boolean }) {
  return (
    <ol className={`${nested ? "" : "mt-8 "}space-y-10`}>
      {worlds.map((w, i) => (
        <li key={w.world.id}>
          <WorldTrail progress={w} index={nested ? i : all.indexOf(w)} nextId={nextId} headingLevel={nested ? 3 : 2} />
        </li>
      ))}
    </ol>
  );
}

function FilterChip({
  on,
  onClick,
  disabled,
  color,
  children,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      onClick={onClick}
      className={`font-display inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? "border-transparent text-white" : "border-line text-muted hover:text-ink"
      }`}
      style={on ? { background: color ?? "var(--lab-accent)" } : undefined}
    >
      {children}
    </button>
  );
}

function WorldTrail({
  progress,
  index,
  nextId,
  headingLevel,
}: {
  progress: WorldProgress;
  index: number;
  nextId: string | undefined;
  headingLevel: 2 | 3;
}) {
  const { world, levels, subject } = progress;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const color = roleVar(world.color);
  const height = levels.length * ROW;
  return (
    <section aria-labelledby={`world-${world.id}`}>
      <header className="glass relative overflow-hidden rounded-3xl p-5" style={{ borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}>
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full opacity-25 blur-2xl" style={{ background: color }} />
        <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
          World {index + 1} · {SUBJECT_INFO[subject].title} · Class {progress.grade}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <Heading id={`world-${world.id}`} className="font-display text-xl font-bold text-ink">
            {world.title}
          </Heading>
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {progress.completed}/{progress.total} · {progress.stars}/{progress.maxStars} ★
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">{world.tagline}</p>
        <div className="mt-3">
          <Bar value={progress.total ? progress.completed / progress.total : 0} color={color} />
        </div>
      </header>

      <div className="relative mx-auto mt-4" style={{ width: PATH_WIDTH, height }}>
        <svg aria-hidden className="absolute inset-0" width={PATH_WIDTH} height={height} viewBox={`0 0 ${PATH_WIDTH} ${height}`}>
          <path d={trailPath(levels.length)} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={6} strokeLinecap="round" strokeDasharray="2 12" />
        </svg>
        <ol className="absolute inset-0">
          {levels.map((status, i) => (
            <li
              key={status.level.id}
              className="absolute"
              style={{ left: PATH_WIDTH / 2 + nodeOffset(i), top: ROW / 2 + i * ROW, transform: "translate(-50%, -50%)" }}
            >
              <LevelNode status={status} order={i + 1} color={color} isNext={status.level.id === nextId} labelSide={nodeOffset(i) > 0 ? "left" : "right"} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function LevelNode({
  status,
  order,
  color,
  isNext,
  labelSide,
}: {
  status: LevelStatus;
  order: number;
  color: string;
  isNext: boolean;
  labelSide: "left" | "right";
}) {
  const { level, best, locked } = status;
  const state = best ? `completed, ${best.stars} of 3 stars` : locked ? "locked — finish the level before it" : isNext ? "next up" : "open";
  const label = (
    <span
      className={`pointer-events-none absolute top-1/2 w-32 -translate-y-1/2 text-xs leading-tight ${labelSide === "left" ? "right-full mr-3 text-right" : "left-full ml-3"}`}
    >
      <span className={`font-display block font-bold ${locked ? "text-muted" : "text-ink"}`}>{level.title}</span>
      {best && (
        <span className="mt-0.5 inline-block">
          <Stars count={best.stars} size={11} />
        </span>
      )}
      {isNext && !best && (
        <span className="mt-0.5 block font-semibold" style={{ color }}>
          Play next
        </span>
      )}
    </span>
  );

  const face = (
    <span
      className={`relative grid h-16 w-16 place-items-center rounded-full border-4 text-lg font-extrabold transition ${
        locked ? "border-line bg-surface-2 text-muted" : "text-white shadow-lg group-hover:scale-105"
      }`}
      style={
        locked
          ? undefined
          : best
            ? { background: color, borderColor: `color-mix(in srgb, ${color} 55%, white)` }
            : { background: `color-mix(in srgb, ${color} 30%, var(--lab-surface))`, borderColor: color, color }
      }
    >
      {isNext && !best && <span aria-hidden className="absolute inset-[-10px] animate-ping rounded-full border-2 opacity-40" style={{ borderColor: color }} />}
      {locked ? <LockIcon width={20} height={20} /> : best ? <CheckIcon width={24} height={24} /> : <span className="font-display">{order}</span>}
    </span>
  );

  return locked ? (
    <span className="relative block" aria-label={`Level ${order}: ${level.title} — ${state}`} role="img">
      {face}
      {label}
    </span>
  ) : (
    <Link href={`/play/${level.id}`} className="group relative block rounded-full" aria-label={`Level ${order}: ${level.title} — ${state}`}>
      {face}
      {label}
    </Link>
  );
}
