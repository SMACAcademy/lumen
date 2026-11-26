"use client";

import { currentStreak, goalProgress, streakAtRisk, xpOn } from "@ise/progress-store";
import Link from "next/link";
import { useMemo } from "react";
import { roleVar } from "@/lib/colors";
import { formulasDue } from "@/lib/formulas";
import { bandOf, buildJourney, type LevelStatus } from "@/lib/journey";
import { useProgress } from "@/lib/progress";
import { BoltIcon, SparkIcon } from "../icons";
import { Avatar, Ring } from "../ui/Bits";

function greeting(hour: number): string {
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/**
 * Where the learner stands today and the one thing to do next. Everything is
 * read from the progress snapshot; before it loads, a quiet skeleton keeps the
 * layout still.
 */
export function Today() {
  const { snapshot, loaded } = useProgress();
  const journey = useMemo(() => buildJourney(snapshot), [snapshot]);
  const streak = currentStreak(snapshot);
  const atRisk = streakAtRisk(snapshot);
  const played = snapshot.totals.levelsCompleted > 0;
  const laws = Object.keys(snapshot.laws).length;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const ownName = snapshot.profile.name?.trim();
  const name = ownName;
  const ownWorlds = journey.learner === null ? 0 : journey.worlds.filter((w) => bandOf(w.grade, journey.learner!) === "yours").length;
  const due = formulasDue(snapshot);
  const nextGrade = journey.worlds.find((w) => w.world.id === journey.next?.world.id)?.grade ?? null;

  if (!loaded) return <div className="h-64 animate-pulse rounded-3xl border border-line bg-surface/60" aria-hidden />;

  return (
    <section aria-label="Your progress" className="animate-rise">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
            {greeting(new Date().getHours())}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {played
              ? `${plural(snapshot.totals.levelsCompleted, "level")} · ${plural(snapshot.totals.stars, "star")} · ${plural(laws, "law")} discovered`
              : "Nothing memorised here. You'll work the laws out yourself."}
          </p>
        </div>
        <Link href="/profile" aria-label="Your profile" className="rounded-full transition hover:opacity-80">
          <Avatar seed={snapshot.profile.avatarSeed + (ownName ?? "")} />
        </Link>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Day streak" value={streak === 0 ? "—" : `${streak}`} hint={atRisk ? "Play today to keep it" : undefined} />
        <Stat label="Total XP" value={`${snapshot.xp}`} icon={<BoltIcon className="text-angle" width={15} height={15} />} />
        <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-3 sm:col-span-1">
          <Ring value={goalProgress(snapshot)} size={48} stroke={6}>
            <span className="text-[11px] font-bold tabular-nums text-ink">{Math.round(goalProgress(snapshot) * 100)}%</span>
          </Ring>
          <div className="min-w-0">
            <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Today's goal</dt>
            <dd className="font-display whitespace-nowrap text-sm font-bold tabular-nums text-ink">
              {xpOn(snapshot)} / {snapshot.preferences.dailyGoalXp} XP
            </dd>
          </div>
        </div>
      </dl>

      {journey.next ? (
        <>
          <NextUp status={journey.next} grade={nextGrade ?? 11} started={played} />
          {journey.learner !== null && nextGrade !== null && journey.nextBand !== "yours" && journey.nextBand !== null && (
            <p className="mt-2 px-1 text-sm text-muted">
              {ownWorlds > 0
                ? `Every class ${journey.learner} level has all three stars. Here is one from class ${nextGrade} to `
                : `Class ${journey.learner} levels are on the way. Until then, here is one from class ${nextGrade} to `}
              {journey.nextBand === "warm-up" ? "warm up with" : "peek ahead at"}.
            </p>
          )}
        </>
      ) : (
        <p className="mt-5 rounded-3xl border border-success/40 bg-success/10 px-5 py-6 text-center text-ink">
          Every level played, every star earned. More worlds are on the way.
        </p>
      )}

      {due > 0 && (
        <Link
          href="/revise"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent"
        >
          <span>
            {due} formula{due === 1 ? "" : "s"} to revise today
          </span>
          <span className="text-accent">Recall →</span>
        </Link>
      )}

      {laws > 0 && (
        <section className="mt-6 rounded-2xl border border-angle/30 bg-angle/5 p-4" aria-labelledby="laws">
          <h2 id="laws" className="flex items-center gap-2 text-sm font-semibold text-ink">
            <SparkIcon className="text-angle" width={16} height={16} />
            Laws you have discovered
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {Object.values(snapshot.laws).map((law) => (
              <li key={law.lawId} className="rounded-lg bg-surface px-2.5 py-1.5 text-xs text-ink">
                {law.lawId.replace(/-/g, " ")}
                <span className="ml-2 tabular-nums text-muted">{law.discoveredAt.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

function Stat({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="font-display mt-0.5 flex items-center gap-1 text-xl font-extrabold tabular-nums text-ink">
        {icon}
        {value}
      </dd>
      {hint && <p className="mt-0.5 text-[11px] text-warning">{hint}</p>}
    </div>
  );
}

function NextUp({ status, grade, started }: { status: LevelStatus; grade: number; started: boolean }) {
  const color = roleVar(status.world.color);
  return (
    <Link
      href={`/play/${status.level.id}`}
      className="group mt-5 block overflow-hidden rounded-3xl border border-line bg-surface p-5 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-accent/60"
      style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}
    >
      <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color }}>
        {status.best ? "Beat your score" : started ? "Next up" : "Start here"} · Class {grade} · {status.world.title}
      </p>
      <h2 className="font-display mt-1.5 text-xl font-bold text-ink">{status.level.title}</h2>
      <p className="mt-1 text-sm text-muted">{status.level.summary}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">
          {status.level.steps.length} steps · {status.level.xp} XP
          {status.best && <> · best {status.best.stars}★</>}
        </span>
        <span
          className="font-display inline-flex h-11 items-center rounded-2xl px-6 text-sm font-bold uppercase tracking-wide text-white shadow-[0_4px_0_0] transition group-hover:brightness-110"
          style={{ background: color, boxShadow: `0 4px 0 0 color-mix(in srgb, ${color} 50%, transparent)` }}
        >
          {status.best ? "Play again" : "Play"}
        </span>
      </div>
    </Link>
  );
}
