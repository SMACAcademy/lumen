"use client";

import {
  type Branch,
  type Chapter,
  type CurriculumConcept,
  type Exam,
  type Grade,
  type Status,
  type Subject,
  branchCoverage,
  coverage,
  curriculum,
  GRADES,
  gradeLabel,
  STAGE_INFO,
  stageOf,
} from "@ise/content";
import Link from "next/link";
import { useMemo, useState } from "react";
import { SUBJECT_INFO, SUBJECTS } from "@/lib/subjects";
import { CheckIcon, LockIcon, SearchIcon } from "../icons";
import { Bar } from "../ui/Bits";

type SubjectFilter = Subject | "all";
type ExamFilter = Exam | "all";

const SUBJECT_OPTIONS: { value: SubjectFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...SUBJECTS.map((s) => ({ value: s, label: SUBJECT_INFO[s].title })),
];
type YearFilter = Grade | "all";

const EXAMS: { value: ExamFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "jee-main", label: "JEE Main" },
  { value: "jee-adv", label: "JEE Adv" },
  { value: "neet", label: "NEET" },
];

const YEARS: { value: YearFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...GRADES.map((g) => ({ value: g, label: String(g) })),
];

const STATUS_LABEL: Record<Status, string> = { ready: "Playable", building: "Building now", planned: "Coming" };

const branchColor = (branch: Branch) => `var(--branch-${branch.id})`;

/**
 * Everything the app intends to teach, and where each piece stands. It is the
 * plan and the map at once: what is playable today, and the rest listed so
 * the shape of the whole thing — maths, physics and chemistry — is visible.
 */
export function SyllabusScreen({ initialSubject = "all" }: { initialSubject?: SubjectFilter } = {}) {
  const [subject, setSubject] = useState<SubjectFilter>(initialSubject);
  const [exam, setExam] = useState<ExamFilter>("all");
  const [year, setYear] = useState<YearFilter>("all");
  const [readyOnly, setReadyOnly] = useState(false);
  const [query, setQuery] = useState("");

  // Entrance exams only examine class 11 and 12, so the exam filter only means something there.
  const examsApply = year === "all" || year >= 11;
  const chooseYear = (next: YearFilter) => {
    setYear(next);
    if (next !== "all" && next < 11) setExam("all");
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const keep = (concept: CurriculumConcept) =>
      (exam === "all" || concept.exams.includes(exam)) &&
      (!readyOnly || concept.status !== "planned") &&
      (needle === "" || concept.title.toLowerCase().includes(needle));
    return curriculum
      .filter((branch) => subject === "all" || branch.subject === subject)
      .map((branch) => ({
        branch,
        chapters: branch.chapters
          .filter((chapter) => year === "all" || chapter.grade === year)
          .map((chapter) => ({ chapter, concepts: chapter.concepts.filter(keep) }))
          .filter((entry) => entry.concepts.length > 0 || (needle === "" && !readyOnly && exam === "all")),
      }))
      .filter((entry) => entry.chapters.length > 0);
  }, [subject, exam, year, readyOnly, query]);

  const shown = filtered.flatMap((b) => b.chapters.flatMap((c) => c.concepts));
  const total = coverage(shown);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Syllabus</h1>
      <p className="mt-1 text-sm text-muted">
        Maths, physics and chemistry from class 6 to class 12, following NCERT. Each concept becomes a simulation you can
        play with; this is what is built and what is on the way.
      </p>

      <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display font-bold text-ink">
            {total.ready} playable
            <span className="font-sans text-sm font-normal text-muted">
              {" "}
              of {total.total} concept{total.total === 1 ? "" : "s"}
            </span>
          </p>
          {total.building > 0 && <p className="text-xs font-semibold text-accent">{total.building} building now</p>}
        </div>
        <div className="mt-2">
          <Bar value={total.total === 0 ? 0 : total.ready / total.total} color="var(--lab-success)" />
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-accent">
          <SearchIcon className="shrink-0 text-muted" width={16} height={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search concepts, e.g. fractions, magnets, Doppler"
            aria-label="Search the syllabus"
            className="h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <Filter label="Subject" options={SUBJECT_OPTIONS} value={subject} onChange={setSubject} />
          <Filter label="Class" options={YEARS} value={year} onChange={chooseYear} />
          {examsApply && <Filter label="Exam" options={EXAMS} value={exam} onChange={setExam} />}
          <button
            type="button"
            aria-pressed={readyOnly}
            onClick={() => setReadyOnly(!readyOnly)}
            className={`h-9 rounded-xl border px-3 text-sm font-semibold transition ${
              readyOnly ? "border-success/60 bg-success/15 text-ink" : "border-line text-muted hover:text-ink"
            }`}
          >
            Playable only
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-muted">Nothing matches that. Try a different word.</p>
      ) : (
        <div className="mt-8 space-y-10">
          {filtered.map(({ branch, chapters }) => (
            <BranchSection key={branch.id} branch={branch} chapters={chapters} />
          ))}
        </div>
      )}
    </main>
  );
}

function Filter<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-xl border border-line bg-surface-2 p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`h-8 rounded-lg px-2.5 text-xs font-semibold transition ${
            value === option.value ? "bg-surface text-ink shadow" : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BranchSection({ branch, chapters }: { branch: Branch; chapters: { chapter: Chapter; concepts: CurriculumConcept[] }[] }) {
  const color = branchColor(branch);
  const cover = branchCoverage(branch);
  return (
    <section aria-labelledby={`branch-${branch.id}`}>
      <div className="flex items-baseline gap-3">
        <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: color }} />
        <h2 id={`branch-${branch.id}`} className="font-display text-xl font-bold text-ink">
          {branch.title}
        </h2>
        <span className="ml-auto text-xs tabular-nums text-muted">
          {cover.ready}/{cover.total}
        </span>
      </div>
      <p className="ml-6 mt-0.5 text-sm text-muted">{branch.tagline}</p>

      <ul className="mt-4 space-y-3">
        {chapters.map(({ chapter, concepts }) => (
          <li key={chapter.id}>
            <ChapterCard chapter={chapter} concepts={concepts} color={color} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChapterCard({ chapter, concepts, color }: { chapter: Chapter; concepts: CurriculumConcept[]; color: string }) {
  const cover = coverage(chapter.concepts);
  const year = `${gradeLabel(chapter.grade)} · ${STAGE_INFO[stageOf(chapter.grade)].title}`;
  return (
    <article
      className="rounded-2xl border border-line bg-surface/70 p-4 transition hover:border-[color-mix(in_srgb,var(--edge)_50%,transparent)]"
      style={{ "--edge": color } as React.CSSProperties}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="font-display font-bold text-ink">{chapter.title}</h3>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          {year} · wave {chapter.wave} · {chapter.kit} kit
        </p>
      </div>
      <p className="mt-1 text-sm text-muted">{chapter.blurb}</p>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <Bar value={cover.total === 0 ? 0 : cover.ready / cover.total} color={color} />
        </div>
        <span className="text-[11px] tabular-nums text-muted">
          {cover.ready}/{cover.total}
        </span>
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {concepts.map((concept) => (
          <li key={concept.id}>
            <ConceptChip concept={concept} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function ConceptChip({ concept }: { concept: CurriculumConcept }) {
  const href = concept.built?.level ? `/play/${concept.built.level}` : concept.built?.lab ? `/lab/${concept.built.lab}` : null;
  const shared = "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs transition";

  if (href) {
    return (
      <Link
        href={href}
        title={`${STATUS_LABEL[concept.status]}: ${concept.title}`}
        className={`${shared} border-success/50 bg-success/10 text-ink hover:border-success`}
      >
        <CheckIcon width={13} height={13} className="text-success" />
        {concept.title}
      </Link>
    );
  }
  if (concept.status === "building") {
    return (
      <span className={`${shared} border-accent/50 bg-accent/10 text-ink`}>
        <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        {concept.title}
        <span className="sr-only"> — building now</span>
      </span>
    );
  }
  return (
    <span className={`${shared} border-dashed border-line text-muted`}>
      <LockIcon width={12} height={12} />
      {concept.title}
      <span className="sr-only"> — coming</span>
    </span>
  );
}
