"use client";

import type { Subject } from "@ise/content";
import Link from "next/link";
import { useMemo } from "react";
import { buildJourney } from "@/lib/journey";
import { ClassPicker } from "./ClassPicker";
import { useProgress } from "@/lib/progress";
import { SUBJECTS, summarise } from "@/lib/subjects";
import { BookIcon, ChevronRightIcon, CompassIcon, MapIcon, ReviseIcon, TargetIcon } from "../icons";
import { SubjectIcon } from "../subjects/SubjectIcon";
import { Bar } from "../ui/Bits";
import { Today } from "./Today";

/**
 * The signed-in home: the learner's day at the top, then the whole science
 * world laid out by subject, then the ways to keep it — practice and revision.
 */
export function HomeHub() {
  const { snapshot, loaded, store } = useProgress();
  const journey = useMemo(() => buildJourney(snapshot), [snapshot]);

  // How far the learner has got in each subject, counted in levels.
  const mine = useMemo(() => {
    const out: Record<Subject, { done: number; total: number }> = {
      maths: { done: 0, total: 0 },
      physics: { done: 0, total: 0 },
      chemistry: { done: 0, total: 0 },
    };
    for (const w of journey.worlds) {
      out[w.subject].done += w.completed;
      out[w.subject].total += w.total;
    }
    return out;
  }, [journey]);

  const toPolish = journey.worlds.flatMap((w) => w.levels).filter((l) => l.best && l.best.stars < 3).length;
  const laws = Object.keys(snapshot.laws).length;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-20 pt-8 sm:px-6">
      <div className="max-w-3xl">
        {loaded && !snapshot.profile.yearAsked ? (
          <section aria-labelledby="which-class" className="glass animate-rise rounded-3xl p-5 sm:p-7">
            <h1 id="which-class" className="font-display text-2xl font-bold text-ink sm:text-3xl">
              Which class are you in?
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              Lumen starts where you are. You can always look back or peek ahead, and change this in your profile.
            </p>
            <div className="mt-5">
              <ClassPicker value={undefined} onChoose={(year) => void store.append({ type: "profile-set", payload: { year } })} />
            </div>
          </section>
        ) : (
          <Today />
        )}
      </div>

      <section className="mt-12" aria-labelledby="subjects">
        <SectionTitle id="subjects" title="Your science world" hint="Three subjects, one way of learning: predict, experiment, discover." />
        <ul className="mt-5 grid gap-4 md:grid-cols-3">
          {SUBJECTS.map((subject) => (
            <li key={subject}>
              <SubjectCard subject={subject} done={mine[subject].done} total={mine[subject].total} />
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="keep-it">
        <SectionTitle id="keep-it" title="Keep it" hint="Understanding fades unless it is used. These are how you use it." />
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          <li>
            <HubTile
              href="/practice"
              icon={<TargetIcon width={22} height={22} />}
              color="var(--lab-cosine)"
              title="Practice"
              body="Jump into any open level at random, or play freely in a lab. Endless generated puzzles arrive in Phase 3."
              meta="Quick challenge"
            />
          </li>
          <li>
            <HubTile
              href="/revise"
              icon={<ReviseIcon width={22} height={22} />}
              color="var(--lab-angle)"
              title="Revise"
              body="The laws you have discovered, and the levels worth another go."
              meta={laws + toPolish === 0 ? "Nothing to revise yet" : `${laws} law${laws === 1 ? "" : "s"} · ${toPolish} to polish`}
            />
          </li>
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="explore">
        <SectionTitle id="explore" title="Explore" />
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          <li>
            <SmallTile href="/learn" icon={<MapIcon width={18} height={18} />} title="Learning map" body="Every world and level, in order" />
          </li>
          <li>
            <SmallTile href="/syllabus" icon={<CompassIcon width={18} height={18} />} title="Syllabus" body="Class 6 to 12, all three subjects" />
          </li>
          <li>
            <SmallTile href="/journal" icon={<BookIcon width={18} height={18} />} title="Journal" body="Your notes, records and laws" />
          </li>
        </ul>
      </section>
    </main>
  );
}

function SectionTitle({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <div>
      <h2 id={id} className="font-display text-xl font-bold text-ink sm:text-2xl">
        {title}
      </h2>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function SubjectCard({ subject, done, total }: { subject: Subject; done: number; total: number }) {
  const s = summarise(subject);
  const { color } = s.info;
  const playable = s.coverage.ready;
  return (
    <Link
      href={`/subjects/${subject}`}
      className="glass group relative flex h-full flex-col overflow-hidden rounded-3xl p-5 transition hover:-translate-y-0.5"
      style={{ borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}
    >
      {/* A soft glow in the subject's colour, behind the glass. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-30 blur-2xl transition group-hover:opacity-50"
        style={{ background: color }}
      />
      <span
        className="grid h-11 w-11 place-items-center rounded-2xl"
        style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
      >
        <SubjectIcon subject={subject} width={24} height={24} />
      </span>
      <p className="font-display mt-4 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
        {s.info.motto}
      </p>
      <h3 className="font-display mt-0.5 text-2xl font-extrabold text-ink">{s.info.title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted">{s.info.tagline}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Figure label="playable" value={playable} />
        <Figure label="labs" value={s.labs} />
        <Figure label="concepts" value={s.coverage.total} />
      </dl>
      <div className="mt-4">
        {total > 0 ? (
          <>
            <Bar value={done / total} color={color} />
            <p className="mt-1.5 text-xs text-muted">
              {done} of {total} levels done
            </p>
          </>
        ) : (
          <p className="text-xs text-muted">Labs arrive in waves — the whole syllabus is mapped already.</p>
        )}
      </div>
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-2/60 px-1 py-2">
      <dd className="font-display text-lg font-extrabold tabular-nums text-ink">{value}</dd>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
    </div>
  );
}

function HubTile({ href, icon, color, title, body, meta }: { href: string; icon: React.ReactNode; color: string; title: string; body: string; meta: string }) {
  return (
    <Link href={href} className="glass group flex h-full items-start gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="font-display flex items-center justify-between text-lg font-bold text-ink">
          {title}
          <ChevronRightIcon className="text-muted transition group-hover:translate-x-0.5" width={18} height={18} />
        </span>
        <span className="mt-1 block text-sm text-muted">{body}</span>
        <span className="mt-3 block text-xs font-semibold" style={{ color }}>
          {meta}
        </span>
      </span>
    </Link>
  );
}

function SmallTile({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link href={href} className="glass flex h-full items-center gap-3 rounded-2xl px-4 py-3.5 transition hover:-translate-y-0.5">
      <span className="text-accent">{icon}</span>
      <span>
        <span className="font-display block text-sm font-bold text-ink">{title}</span>
        <span className="block text-xs text-muted">{body}</span>
      </span>
    </Link>
  );
}
