"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { ARCADE_GAMES, ARCADE_ORDER } from "@/lib/arcade";
import { buildJourney } from "@/lib/journey";
import { useProgress } from "@/lib/progress";
import { labsOf, SUBJECT_INFO, SUBJECTS } from "@/lib/subjects";
import { BoltIcon, SparkIcon, TargetIcon } from "../icons";
import { SubjectIcon } from "../subjects/SubjectIcon";

/** What Phase 3 adds here, stated plainly so nobody mistakes a plan for a feature. */
const COMING = [
  { title: "Endless puzzles", body: "Every lab becomes a question bank: fresh numbers, checked by the same model that draws the lab." },
  { title: "Daily puzzle", body: "One problem a day, the same for everyone, with a streak of its own." },
  { title: "Speed rounds", body: "Ninety seconds of quick predictions to warm up before a session." },
  { title: "Sketch the graph", body: "Draw what you think happens, then watch the lab draw the truth over it." },
] as const;

/**
 * Practice, today: a random open level for a quick challenge, and every lab
 * for free play. Generated practice arrives in Phase 3 and is listed as such.
 */
export function PracticeScreen() {
  const router = useRouter();
  const { snapshot, loaded } = useProgress();
  const open = useMemo(
    () =>
      buildJourney(snapshot)
        .worlds.flatMap((w) => w.levels)
        .filter((l) => !l.locked),
    [snapshot],
  );

  const quickChallenge = () => {
    const pick = open[Math.floor(Math.random() * open.length)];
    if (pick) router.push(`/play/${pick.level.id}`);
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold text-ink">Practice</h1>
      <p className="mt-1 max-w-2xl text-muted">Use it or lose it. A quick challenge, or free play in any lab.</p>

      <section className="glass relative mt-6 overflow-hidden rounded-3xl p-6" aria-labelledby="quick">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cosine opacity-20 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cosine/15 text-cosine">
              <TargetIcon width={24} height={24} />
            </span>
            <div>
              <h2 id="quick" className="font-display text-xl font-bold text-ink">
                Quick challenge
              </h2>
              <p className="text-sm text-muted">A random level from everything open to you — {open.length} to choose from.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={quickChallenge}
            disabled={!loaded || open.length === 0}
            className="font-display h-11 rounded-2xl bg-cosine px-6 text-sm font-bold uppercase tracking-wide text-white shadow-[0_4px_0_0] shadow-cosine/40 transition hover:brightness-110 disabled:opacity-50"
          >
            Surprise me
          </button>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="arcade">
        <h2 id="arcade" className="font-display flex items-center gap-2 text-xl font-bold text-ink">
          <BoltIcon className="text-angle" width={18} height={18} />
          Arcade
        </h2>
        <p className="mt-1 text-sm text-muted">Sixty seconds, three lives. How far can your streak go?</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {ARCADE_ORDER.map((id) => {
            const game = ARCADE_GAMES[id];
            const best = snapshot.arcade[id];
            return (
              <Link key={id} href={`/arcade/${id}`} className="glass group block rounded-2xl p-5 transition hover:-translate-y-0.5">
                <h3 className="font-display text-lg font-bold text-ink group-hover:text-accent">{game.title}</h3>
                <p className="mt-1 text-sm text-muted">{game.blurb}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted">
                  {best ? `Best ${best.best} · streak ${best.bestStreak}` : "Not played yet"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="free-play">
        <h2 id="free-play" className="font-display text-xl font-bold text-ink">
          Free play
        </h2>
        <p className="mt-1 text-sm text-muted">No goals, no stars: every lab with all its controls.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {SUBJECTS.map((subject) => {
            const info = SUBJECT_INFO[subject];
            const labs = labsOf(subject);
            return (
              <div key={subject} className="glass rounded-2xl p-4">
                <h3 className="font-display flex items-center gap-2 font-bold text-ink">
                  <SubjectIcon subject={subject} width={18} height={18} style={{ color: info.color }} />
                  {info.title}
                </h3>
                {labs.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">Labs arrive in waves.</p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {labs.map((lab) => (
                      <li key={lab.meta.id}>
                        <Link href={`/lab/${lab.meta.id}`} className="block rounded-lg px-2 py-1.5 text-sm text-ink transition hover:bg-surface-2/60">
                          {lab.meta.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10" aria-labelledby="coming">
        <h2 id="coming" className="font-display flex items-center gap-2 text-xl font-bold text-ink">
          <SparkIcon className="text-angle" width={18} height={18} />
          Coming in Phase 3
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {COMING.map((item) => (
            <li key={item.title} className="rounded-2xl border border-dashed border-line px-4 py-3">
              <p className="font-display text-sm font-bold text-ink">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
