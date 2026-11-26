"use client";

import { branchesOf, chapterCoverage, type CurriculumConcept, gradeLabel, STAGE_INFO, stageOf, type Subject } from "@ise/content";
import Link from "next/link";
import { useMemo } from "react";
import { roleVar } from "@/lib/colors";
import { buildJourney } from "@/lib/journey";
import { useProgress } from "@/lib/progress";
import { labsOf, SUBJECT_INFO, summarise } from "@/lib/subjects";
import { ChevronRightIcon, LockIcon } from "../icons";
import { Bar, Stars } from "../ui/Bits";
import { SubjectIcon } from "./SubjectIcon";

/**
 * One subject, whole: what can be played in it now, the open labs, and the
 * full syllabus with what is ready, what is being built, and what is planned.
 */
export function SubjectScreen({ subject }: { subject: Subject }) {
  const info = SUBJECT_INFO[subject];
  const summary = summarise(subject);
  const { snapshot } = useProgress();
  const journey = useMemo(() => buildJourney(snapshot), [snapshot]);
  const worlds = journey.worlds.filter((w) => w.subject === subject);
  const labs = labsOf(subject);
  const branches = branchesOf(subject);
  const { color } = info;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <header className="glass relative overflow-hidden rounded-3xl p-6 sm:p-8" style={{ borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}>
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-3xl" style={{ background: color }} />
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
            <SubjectIcon subject={subject} width={30} height={30} />
          </span>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em]" style={{ color }}>
              {info.motto}
            </p>
            <h1 className="font-display text-3xl font-extrabold text-ink sm:text-4xl">{info.title}</h1>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-muted">{info.tagline}</p>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          <Stat label="concepts in the syllabus" value={summary.coverage.total} />
          <Stat label="playable now" value={summary.coverage.ready} />
          <Stat label="open labs" value={summary.labs} />
          <Stat label="chapters" value={summary.chapters} />
        </dl>
        <div className="mt-5 max-w-md">
          <Bar value={summary.coverage.total ? summary.coverage.ready / summary.coverage.total : 0} color={color} />
          <p className="mt-1.5 text-xs text-muted">How much of the syllabus is built</p>
        </div>
      </header>

      {labs.length === 0 && (
        <p className="glass mt-6 rounded-2xl px-5 py-4 text-sm text-ink">
          <strong className="font-display">{info.title} is mapped, not built yet.</strong>{" "}
          <span className="text-muted">Every chapter below is already on the plan, and its labs arrive in waves.</span>
        </p>
      )}
      {subject === "chemistry" && labs.length > 0 && (
        <p className="glass mt-6 rounded-2xl px-5 py-4 text-sm text-ink">
          <strong className="font-display">Chemistry has begun.</strong>{" "}
          <span className="text-muted">
            The first labs are open — the hydrogen spectrum and reaction rates. Molecules you can turn in 3D come next; every other
            chapter below is already on the plan.
          </span>
        </p>
      )}

      {worlds.length > 0 && (
        <section className="mt-10" aria-labelledby="play">
          <h2 id="play" className="font-display text-xl font-bold text-ink">
            Play
          </h2>
          <p className="mt-1 text-sm text-muted">Short levels with a goal and stars. The first of every world is open.</p>
          <ul className="mt-4 grid gap-4 md:grid-cols-2">
            {worlds.map((w) => (
              <li key={w.world.id} className="glass rounded-2xl p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display font-bold text-ink">{w.world.title}</h3>
                  <span className="text-xs tabular-nums text-muted">
                    {w.completed}/{w.total} · {w.stars}/{w.maxStars} ★
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{w.world.tagline}</p>
                <div className="mt-3">
                  <Bar value={w.total ? w.completed / w.total : 0} color={roleVar(w.world.color)} />
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {w.levels.map((l) => (
                    <li key={l.level.id}>
                      {l.locked ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-muted">
                          <LockIcon width={13} height={13} />
                          {l.level.title}
                        </span>
                      ) : (
                        <Link
                          href={`/play/${l.level.id}`}
                          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface/70 px-3 py-1.5 text-sm text-ink transition hover:border-accent/60"
                        >
                          {l.level.title}
                          {l.best ? <Stars count={l.best.stars} /> : <span className="text-xs font-semibold text-accent">New</span>}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {labs.length > 0 && (
        <section className="mt-10" aria-labelledby="labs">
          <h2 id="labs" className="font-display text-xl font-bold text-ink">
            Open labs
          </h2>
          <p className="mt-1 text-sm text-muted">Free play, no goals: every control, activity and graph.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {labs.map((c) => (
              <li key={c.meta.id}>
                <Link href={`/lab/${c.meta.id}`} className="glass group flex h-full flex-col rounded-2xl p-4 transition hover:-translate-y-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
                    {c.meta.category}
                  </p>
                  <h3 className="font-display mt-1 font-bold text-ink">{c.meta.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted">{c.meta.tagline}</p>
                  <p className="mt-3 flex items-center justify-between text-xs text-muted">
                    ~{c.meta.estimatedMinutes} min
                    <ChevronRightIcon width={16} height={16} className="transition group-hover:translate-x-0.5" />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10" aria-labelledby="syllabus">
        <h2 id="syllabus" className="font-display text-xl font-bold text-ink">
          The syllabus
        </h2>
        <p className="mt-1 text-sm text-muted">Everything {info.title.toLowerCase()} asks of you, chapter by chapter.</p>
        <div className="mt-4 space-y-6">
          {branches.map((branch) => (
            <div key={branch.id}>
              <h3 className="font-display flex items-center gap-2 font-bold text-ink">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--branch-${branch.id})` }} />
                {branch.title}
              </h3>
              <p className="text-sm text-muted">{branch.tagline}</p>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {branch.chapters.map((chapter) => {
                  const cov = chapterCoverage(chapter);
                  return (
                    <li key={chapter.id}>
                      <details className="glass group rounded-2xl px-4 py-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                          <span>
                            <span className="font-display block text-sm font-bold text-ink">{chapter.title}</span>
                            <span className="text-xs text-muted">
                              {gradeLabel(chapter.grade)} · {STAGE_INFO[stageOf(chapter.grade)].title} · {cov.total} concepts
                              {cov.ready > 0 && <> · {cov.ready} ready</>}
                            </span>
                          </span>
                          <ChevronRightIcon width={16} height={16} className="shrink-0 text-muted transition group-open:rotate-90" />
                        </summary>
                        <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                          {chapter.concepts.map((concept) => (
                            <ConceptRow key={concept.id} concept={concept} />
                          ))}
                        </ul>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="font-display text-2xl font-extrabold tabular-nums text-ink">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  );
}

const STATUS_STYLE = {
  ready: { label: "Play", className: "bg-success/15 text-success" },
  building: { label: "Building", className: "bg-warning/15 text-warning" },
  planned: { label: "Planned", className: "bg-surface-2 text-muted" },
} as const;

function ConceptRow({ concept }: { concept: CurriculumConcept }) {
  const style = STATUS_STYLE[concept.status];
  const href = concept.built?.level ? `/play/${concept.built.level}` : concept.built?.lab ? `/lab/${concept.built.lab}` : null;
  const content = (
    <>
      <span className="min-w-0 flex-1 text-sm text-ink">{concept.title}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.className}`}>{style.label}</span>
    </>
  );
  return (
    <li>
      {href && concept.status !== "planned" ? (
        <Link href={href} className="flex items-center gap-3 rounded-lg px-1 py-0.5 transition hover:bg-surface-2/60">
          {content}
        </Link>
      ) : (
        <span className="flex items-center gap-3 px-1 py-0.5">{content}</span>
      )}
    </li>
  );
}
