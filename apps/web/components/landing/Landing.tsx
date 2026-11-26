"use client";

import { type Stage, STAGE_INFO, STAGES, type Subject } from "@ise/content";
import Link from "next/link";
import { SUBJECT_INFO, SUBJECTS } from "@/lib/subjects";
import { ChevronRightIcon, SparkIcon } from "../icons";
import { SubjectIcon } from "../subjects/SubjectIcon";
import { CAMERA_END_Z, CAMERA_START_Z, WORLD_OBJECTS, zoneCameraZ } from "./objects";
import { ScienceWorld } from "./ScienceWorld";

/** Real numbers from the catalogue, worked out on the server. */
export interface LandingStats {
  concepts: number;
  playable: number;
  labs: number;
  levels: number;
  subjects: Record<Subject, { concepts: number; playable: number; labs: number; chapters: number }>;
  exams: { neet: number; jeeMain: number; jeeAdv: number };
  /** Concepts mapped in each stage of school. */
  stages: Record<Stage, number>;
}

const STAGE_NOTES: Record<Stage, string> = {
  foundation: "Fractions, magnets, shadows and acids — the ideas everything else stands on.",
  bridge: "Motion, electricity, atoms and trigonometry: the first formulas, met by playing with them.",
  advanced: "The full class 11 and 12 syllabus, as deep as JEE and NEET go.",
};

const STEPS = [
  { title: "Predict", body: "Before anything moves, say what you think will happen. A guess makes you care about the answer." },
  { title: "Experiment", body: "Drag, launch, heat and spin. Every number on screen comes from the same model that draws the scene." },
  { title: "Discover", body: "Spot the pattern in your own results — and the law appears, because you found it." },
  { title: "Master", body: "Short levels with stars, then practice and revision that bring each idea back before it fades." },
] as const;

const SIDE: Record<Subject, "left" | "right"> = { maths: "left", physics: "right", chemistry: "left" };

/**
 * The front door: a glass page over a 3D science world. Scrolling flies the
 * camera through maths, then physics, then chemistry; each section's
 * `data-world-z` says where the camera should be while it is on screen.
 */
export function Landing({ stats }: { stats: LandingStats }) {
  const enter = { href: "/home", label: "Start exploring" };

  return (
    <>
      <ScienceWorld />
      <div className="relative z-10">
        <header className="fixed inset-x-0 top-0 z-20 px-3 pt-3 sm:px-6">
          <nav aria-label="Main" className="glass mx-auto flex max-w-6xl items-center gap-2 rounded-2xl px-3 py-2 sm:px-4">
            <Link href="/" className="font-display mr-auto flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-ink">
              <SparkIcon className="text-accent" width={18} height={18} />
              Lumen
            </Link>
            {SUBJECTS.map((s) => (
              <a key={s} href={`#${s}`} className="hidden rounded-xl px-3 py-1.5 text-sm font-medium text-muted transition hover:text-ink md:inline-block">
                {SUBJECT_INFO[s].title}
              </a>
            ))}
            <a href="#how" className="hidden rounded-xl px-3 py-1.5 text-sm font-medium text-muted transition hover:text-ink md:inline-block">
              How it works
            </a>
            <Link
              href="/home"
              className="font-display rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-lg shadow-accent/25 transition hover:brightness-110"
            >
              Open Lumen
            </Link>
          </nav>
        </header>

        <main>
          <section data-world-z={CAMERA_START_Z} className="flex min-h-svh items-center px-4 pb-16 pt-28 sm:px-6" aria-labelledby="hero">
            <div className="mx-auto w-full max-w-6xl">
              <div className="glass max-w-2xl rounded-[2rem] p-6 sm:p-10">
                <p className="font-display text-xs font-bold uppercase tracking-[0.22em] text-muted">
                  Class 6 to 12 · Maths · Physics · Chemistry
                </p>
                <h1 id="hero" className="font-display mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
                  Step inside the{" "}
                  <span className="bg-gradient-to-r from-maths via-physics to-chemistry bg-clip-text text-transparent">science world</span>
                </h1>
                <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">
                  Maths is the language, physics the rules, chemistry the stuff. Here you do not memorise them — you play with them
                  until the laws reveal themselves. Build the foundation from class 6, then go as far as JEE and NEET.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href={enter.href}
                    className="font-display inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-6 text-base font-bold text-white shadow-[0_4px_0_0] shadow-accent/40 transition hover:brightness-110"
                  >
                    {enter.label}
                    <ChevronRightIcon width={18} height={18} />
                  </Link>
                  <a href="#maths" className="glass font-display inline-flex h-12 items-center rounded-2xl px-6 text-base font-bold text-ink transition hover:-translate-y-0.5">
                    Fly through it
                  </a>
                </div>
                <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-6">
                  <HeroStat label="concepts mapped" value={stats.concepts} />
                  <HeroStat label="playable today" value={stats.playable} />
                  <HeroStat label="levels" value={stats.levels} />
                </dl>
              </div>
              <p className="font-display mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted">
                <span aria-hidden className="inline-block h-8 w-5 rounded-full border-2 border-current p-1">
                  <span className="block h-1.5 w-1 animate-bounce rounded-full bg-current" />
                </span>
                Scroll to fly in
              </p>
            </div>
          </section>

          {SUBJECTS.map((subject) => (
            <SubjectSection key={subject} subject={subject} stats={stats.subjects[subject]} />
          ))}

          <section id="how" data-world-z={CAMERA_END_Z + 20} className="scroll-mt-24 px-4 py-24 sm:px-6" aria-labelledby="how-title">
            <div className="mx-auto max-w-6xl">
              <h2 id="how-title" className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
                How you learn here
              </h2>
              <p className="mt-2 max-w-2xl text-muted">The same four moves in every lab and every level — the way scientists actually work.</p>
              <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="glass rounded-3xl p-5">
                    <span className="font-display grid h-10 w-10 place-items-center rounded-2xl bg-accent/15 text-lg font-extrabold text-accent">{i + 1}</span>
                    <h3 className="font-display mt-4 text-xl font-bold text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-sm text-muted">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section data-world-z={CAMERA_END_Z + 14} className="px-4 py-24 sm:px-6" aria-labelledby="path">
            <div className="mx-auto max-w-6xl">
              <h2 id="path" className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
                One path, class 6 to 12
              </h2>
              <p className="mt-2 max-w-2xl text-muted">
                Every idea starts simple and grows. The speed you time in class 7 becomes the velocity graph of class 9 and the
                equations of motion in class 11. Start where you are, look back when you need to, and peek ahead when you want to.
              </p>
              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                {STAGES.map((stage) => (
                  <StageCard key={stage} stage={stage} value={stats.stages[stage]} />
                ))}
              </dl>
            </div>
          </section>

          <section data-world-z={CAMERA_END_Z + 8} className="px-4 py-24 sm:px-6" aria-labelledby="exams">
            <div className="mx-auto max-w-6xl">
              <h2 id="exams" className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
                Heading for JEE or NEET?
              </h2>
              <p className="mt-2 max-w-2xl text-muted">
                Class 11 and 12 are mapped concept by concept against each exam. {stats.playable} concepts are playable today, and
                new worlds arrive in waves — each built on a simulation kit you can reuse.
              </p>
              <dl className="mt-8 grid gap-4 sm:grid-cols-3">
                <ExamCard label="NEET" value={stats.exams.neet} note="Physics and chemistry" />
                <ExamCard label="JEE Main" value={stats.exams.jeeMain} note="Maths, physics and chemistry" />
                <ExamCard label="JEE Advanced" value={stats.exams.jeeAdv} note="Everything, in depth" />
              </dl>
            </div>
          </section>

          <section data-world-z={CAMERA_END_Z} className="px-4 pb-16 pt-24 sm:px-6" aria-labelledby="begin">
            <div className="glass-strong mx-auto max-w-3xl rounded-[2rem] p-8 text-center sm:p-12">
              <h2 id="begin" className="font-display text-3xl font-extrabold text-ink sm:text-4xl">
                Your first level takes two minutes
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted">
                Watch a dot go round a circle, and see where sine and cosine really come from. Then keep going.
              </p>
              <Link
                href={enter.href}
                className="font-display mt-7 inline-flex h-12 items-center gap-2 rounded-2xl bg-accent px-7 text-base font-bold text-white shadow-[0_4px_0_0] shadow-accent/40 transition hover:brightness-110"
              >
                {enter.label}
                <ChevronRightIcon width={18} height={18} />
              </Link>
            </div>
            <footer className="mx-auto mt-16 max-w-6xl text-center text-xs text-muted">
              Lumen — maths, physics and chemistry you can touch. {stats.labs} labs, {stats.levels} levels, and counting.
              <br />
              No account and no tracking: your progress stays in this browser. Free and{" "}
              <a href="https://github.com/SMACAcademy/lumen" className="underline hover:text-ink">
                open source
              </a>
              .
            </footer>
          </section>
        </main>
      </div>
    </>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-display text-2xl font-extrabold tabular-nums text-ink sm:text-3xl">{value}</dd>
    </div>
  );
}

function SubjectSection({ subject, stats }: { subject: Subject; stats: LandingStats["subjects"][Subject] }) {
  const info = SUBJECT_INFO[subject];
  const { color } = info;
  const inside = WORLD_OBJECTS.filter((o) => o.subject === subject);
  return (
    <section
      id={subject}
      data-world-z={zoneCameraZ(subject)}
      className="flex min-h-[130svh] scroll-mt-0 items-center px-4 py-24 sm:px-6"
      aria-labelledby={`${subject}-title`}
    >
      <div className={`mx-auto flex w-full max-w-6xl ${SIDE[subject] === "right" ? "justify-end" : "justify-start"}`}>
        <div className="glass relative w-full max-w-md overflow-hidden rounded-[2rem] p-6 sm:p-8" style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}>
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-30 blur-3xl" style={{ background: color }} />
          <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ color, background: `color-mix(in srgb, ${color} 18%, transparent)` }}>
            <SubjectIcon subject={subject} width={26} height={26} />
          </span>
          <p className="font-display mt-5 text-xs font-bold uppercase tracking-[0.2em]" style={{ color }}>
            {info.motto}
          </p>
          <h2 id={`${subject}-title`} className="font-display mt-1 text-4xl font-extrabold text-ink">
            {info.title}
          </h2>
          <p className="mt-3 text-muted">{info.tagline}</p>
          <dl className="mt-6 grid grid-cols-3 gap-2 text-center">
            <Figure label="concepts" value={stats.concepts} />
            <Figure label="chapters" value={stats.chapters} />
            <Figure label={stats.playable ? "playable" : "labs"} value={stats.playable || stats.labs} />
          </dl>
          <p className="font-display mt-6 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Floating past you</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {inside.map((o) => (
              <li key={o.kind} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink">
                {o.title}
              </li>
            ))}
          </ul>
          {stats.labs === 0 && (
            <p className="mt-5 text-xs text-muted">{info.title} is mapped chapter by chapter; its labs arrive in waves.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse rounded-xl bg-surface-2/60 px-1 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="font-display text-xl font-extrabold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function StageCard({ stage, value }: { stage: Stage; value: number }) {
  const info = STAGE_INFO[stage];
  return (
    <div className="glass rounded-3xl p-6">
      <dt className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted">{info.title}</dt>
      <dd className="font-display mt-1 text-xs font-semibold text-accent">{info.classes}</dd>
      <dd className="font-display mt-2 text-5xl font-extrabold tabular-nums text-ink">{value}</dd>
      <dd className="mt-1 text-sm text-muted">concepts · {STAGE_NOTES[stage]}</dd>
    </div>
  );
}

function ExamCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="glass rounded-3xl p-6">
      <dt className="font-display text-sm font-bold uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="font-display mt-2 text-5xl font-extrabold tabular-nums text-ink">{value}</dd>
      <dd className="mt-1 text-sm text-muted">concepts · {note}</dd>
    </div>
  );
}
