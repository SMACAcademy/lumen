"use client";

import { getConcept, getLevel } from "@ise/content";
import type { LawCard } from "@ise/progress-store";
import Link from "next/link";
import { useMemo, useState } from "react";
import { formulasDue } from "@/lib/formulas";
import { buildJourney } from "@/lib/journey";
import { useProgress } from "@/lib/progress";
import { ReviseIcon, SparkIcon } from "../icons";
import { FormulaBrowser } from "../revise/FormulaBrowser";
import { Stars } from "../ui/Bits";

/** A discovered law, joined back to the equation and lab it came from. */
export interface LawEntry {
  card: LawCard;
  title: string;
  reading: string;
  lab: string | null;
  labTitle: string | null;
}

export function lawEntry(card: LawCard): LawEntry {
  const concept = getConcept(card.conceptId);
  const equation = concept?.equations.find((e) => e.id === card.lawId);
  return {
    card,
    title: equation?.title ?? card.lawId.replace(/-/g, " "),
    reading: equation?.reading ?? "",
    lab: concept ? concept.meta.id : null,
    labTitle: concept?.meta.title ?? null,
  };
}

type Tab = "formulas" | "laws" | "replay";

const TABS: { id: Tab; label: string }[] = [
  { id: "formulas", label: "Formulas" },
  { id: "laws", label: "Laws you discovered" },
  { id: "replay", label: "Worth another go" },
];

/**
 * Revision: every formula from class 6 to 12 to browse, recall and print; the
 * laws the learner worked out themselves; and the levels worth another go —
 * lowest stars first.
 */
export function ReviseScreen() {
  const { snapshot, loaded } = useProgress();
  const [tab, setTab] = useState<Tab>("formulas");
  const journey = useMemo(() => buildJourney(snapshot), [snapshot]);
  const laws = useMemo(
    () => Object.values(snapshot.laws).map(lawEntry).sort((a, b) => b.card.discoveredAt.localeCompare(a.card.discoveredAt)),
    [snapshot.laws],
  );
  const played = journey.worlds.flatMap((w) => w.levels).filter((l) => l.best);
  const toPolish = played.filter((l) => l.best!.stars < 3).sort((a, b) => a.best!.stars - b.best!.stars);
  const mastered = played.filter((l) => l.best!.stars === 3);
  const due = formulasDue(snapshot);

  if (!loaded) return <main className="mx-auto h-64 w-full max-w-5xl animate-pulse px-4 pt-8 sm:px-6" aria-hidden />;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <div className="print:hidden">
        <h1 className="font-display text-3xl font-extrabold text-ink">Revise</h1>
        <p className="mt-1 max-w-2xl text-muted">Every formula from class 6 to 12, the laws you worked out yourself, and the levels worth another go.</p>
        <p className="mt-2 text-sm text-muted">
          Want it against the clock?{" "}
          <Link href="/arcade/formula-rush" className="font-semibold text-accent hover:underline">
            Play Formula Rush
          </Link>
        </p>

        <div role="tablist" aria-label="Revise" className="mt-6 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`font-display -mb-px shrink-0 border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.id === "formulas" && due > 0 && (
                <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">{due}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-6">
        {tab === "formulas" && <FormulaBrowser />}

        {tab === "laws" && (
          <section aria-labelledby="laws">
            <h2 id="laws" className="font-display flex items-center gap-2 text-xl font-bold text-ink">
              <SparkIcon className="text-angle" width={18} height={18} />
              Laws you discovered
            </h2>
            {laws.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Finish a level's last step to add its law here.</p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {laws.map((law) => (
                  <li key={law.card.lawId} className="glass rounded-2xl border-angle/30 p-4">
                    <p className="font-display font-bold text-ink">{law.title}</p>
                    {law.reading && <p className="mt-1 text-sm text-muted">{law.reading}</p>}
                    <p className="mt-3 flex items-center justify-between text-xs text-muted">
                      <span>Discovered {law.card.discoveredAt.slice(0, 10)}</span>
                      {law.lab && (
                        <Link href={`/lab/${law.lab}`} className="font-semibold text-accent hover:underline">
                          Open {law.labTitle}
                        </Link>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "replay" &&
          (played.length === 0 ? (
            <div className="glass rounded-3xl px-6 py-10 text-center">
              <ReviseIcon className="mx-auto text-angle" width={32} height={32} />
              <p className="font-display mt-3 text-lg font-bold text-ink">Nothing to replay yet</p>
              <p className="mt-1 text-sm text-muted">Play a level and the ones worth another go will collect here.</p>
              <Link href="/learn" className="mt-5 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white">
                Open the learning map
              </Link>
            </div>
          ) : (
            <>
              <section aria-labelledby="polish">
                <h2 id="polish" className="font-display text-xl font-bold text-ink">
                  Worth another go
                </h2>
                {toPolish.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">Every level you have played has all three stars.</p>
                ) : (
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {toPolish.map((l) => (
                      <li key={l.level.id}>
                        <ReplayCard id={l.level.id} stars={l.best!.stars} world={l.world.title} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {mastered.length > 0 && (
                <section className="mt-10" aria-labelledby="mastered">
                  <h2 id="mastered" className="font-display text-xl font-bold text-ink">
                    Mastered
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {mastered.map((l) => (
                      <li key={l.level.id}>
                        <ReplayCard id={l.level.id} stars={3} world={l.world.title} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          ))}
      </div>
    </main>
  );
}

function ReplayCard({ id, stars, world }: { id: string; stars: number; world: string }) {
  const level = getLevel(id);
  if (!level) return null;
  return (
    <Link href={`/play/${id}`} className="glass flex items-center justify-between gap-3 rounded-2xl px-4 py-3 transition hover:-translate-y-0.5">
      <span>
        <span className="font-display block font-bold text-ink">{level.title}</span>
        <span className="text-xs text-muted">{world}</span>
      </span>
      <Stars count={stars} />
    </Link>
  );
}
