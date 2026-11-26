"use client";

import { concepts } from "@ise/content";
import { useProgress } from "@/lib/progress";
import { SparkIcon } from "../icons";

const SOON = [
  { title: "Achievements", note: "Badges for streaks, perfect runs and whole worlds." },
  { title: "Records", note: "Your best scores, fastest solves and longest streak." },
  { title: "Formula sheet", note: "Every law you have discovered, ready to revise before an exam." },
];

/** The collection: laws discovered, with more to keep here as the app grows. */
export function JournalScreen() {
  const { snapshot, loaded } = useProgress();
  const laws = Object.values(snapshot.laws);

  const titleOf = (lawId: string, conceptId: string) =>
    concepts.find((c) => c.meta.id === conceptId)?.equations.find((e) => e.id === lawId)?.title ?? lawId.replace(/-/g, " ");

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Journal</h1>
      <p className="mt-1 text-sm text-muted">The laws you worked out, in the order you found them.</p>

      {!loaded ? (
        <div className="mt-6 h-32 animate-pulse rounded-3xl border border-line bg-surface/60" aria-hidden />
      ) : laws.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-line px-5 py-8 text-center text-muted">
          Nothing yet. Finish a level and the law you discover lands here.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {laws.map((law) => (
            <li key={law.lawId} className="rounded-2xl border border-angle/40 bg-gradient-to-br from-angle/10 to-accent/10 p-4">
              <p className="font-display flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-angle">
                <SparkIcon width={14} height={14} />
                Law card
              </p>
              <p className="font-display mt-2 text-lg font-bold text-ink">{titleOf(law.lawId, law.conceptId)}</p>
              <p className="mt-1 text-xs tabular-nums text-muted">Discovered {law.discoveredAt.slice(0, 10)}</p>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-10" aria-labelledby="soon">
        <h2 id="soon" className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted">
          Coming to the journal
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {SOON.map((item) => (
            <li key={item.title} className="rounded-2xl border border-dashed border-line p-4">
              <p className="font-display font-bold text-muted">{item.title}</p>
              <p className="mt-1 text-xs text-muted">{item.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
