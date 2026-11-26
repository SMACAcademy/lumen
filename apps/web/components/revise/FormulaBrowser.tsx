"use client";

import { type FormulaCard, type Grade, GRADES, type Subject } from "@ise/content";
import { dayKey, dueCount } from "@ise/progress-store";
import { useMemo, useState } from "react";
import { FORMULA_BANK } from "@/lib/formulas";
import { learnerClass } from "@/lib/journey";
import { useProgress } from "@/lib/progress";
import { SUBJECT_INFO, SUBJECTS } from "@/lib/subjects";
import { SearchIcon } from "../icons";
import { Segmented } from "../ui/Bits";
import { FormulaCardView } from "./FormulaCardView";
import { Recall } from "./Recall";
import { TryIt } from "./TryIt";

const BANK = FORMULA_BANK;

type SubjectFilter = Subject | "all";
type ClassFilter = Grade | "all";

const SUBJECT_OPTIONS: { value: SubjectFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...SUBJECTS.map((s) => ({ value: s, label: SUBJECT_INFO[s].title })),
];
const CLASS_OPTIONS: { value: ClassFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...GRADES.map((g) => ({ value: g, label: String(g) })),
];

interface ChapterGroup {
  key: string;
  grade: Grade;
  subject: Subject;
  title: string;
  cards: FormulaCard[];
}

/**
 * Every formula from class 6 to 12, filed by subject, class and chapter.
 * It opens on the learner's own class, and prints as a clean sheet of
 * whatever is showing.
 */
export function FormulaBrowser({ renderTools }: { renderTools?: (card: FormulaCard) => React.ReactNode } = {}) {
  const { snapshot, loaded } = useProgress();
  const [subject, setSubject] = useState<SubjectFilter>("all");
  const [chosenClass, setChosenClass] = useState<ClassFilter | null>(null);
  const [chapter, setChapter] = useState("all");
  const [query, setQuery] = useState("");
  const [recalling, setRecalling] = useState(false);
  const grade: ClassFilter = chosenClass ?? (loaded ? (learnerClass(snapshot) ?? "all") : "all");

  const inScope = useMemo(
    () => BANK.filter((c) => (subject === "all" || c.subject === subject) && (grade === "all" || c.grade === grade)),
    [subject, grade],
  );
  const chapters = useMemo(() => [...new Map(inScope.map((c) => [c.chapter.id, c.chapter.title])).entries()], [inScope]);
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return inScope.filter(
      (c) =>
        (chapter === "all" || c.chapter.id === chapter) &&
        (needle === "" || [c.title, c.symbolic, c.words ?? ""].some((text) => text.toLowerCase().includes(needle))),
    );
  }, [inScope, chapter, query]);

  const groups = useMemo(() => {
    const map = new Map<string, ChapterGroup>();
    for (const card of shown) {
      const key = `${card.grade}|${card.chapter.id}`;
      const group = map.get(key) ?? { key, grade: card.grade, subject: card.subject, title: card.chapter.title, cards: [] };
      group.cards.push(card);
      map.set(key, group);
    }
    return [...map.values()];
  }, [shown]);

  const summary = [
    subject === "all" ? "All subjects" : SUBJECT_INFO[subject].title,
    grade === "all" ? "class 6 to 12" : `class ${grade}`,
    chapter === "all" ? null : chapters.find(([id]) => id === chapter)?.[1],
  ]
    .filter(Boolean)
    .join(" · ");

  const resetChapter = () => setChapter("all");
  const due = dueCount(snapshot, shown.map((c) => c.id), dayKey());

  if (recalling) return <Recall cards={shown} onClose={() => setRecalling(false)} />;

  return (
    <div>
      <p className="hidden text-sm font-semibold print:block">Lumen formula sheet · {summary}</p>

      <div className="space-y-3 print:hidden">
        <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-accent">
          <SearchIcon className="shrink-0 text-muted" width={16} height={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search formulas, e.g. density, Ohm, pH"
            aria-label="Search formulas"
            className="h-11 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Subject" value={subject} options={SUBJECT_OPTIONS} onChange={(v) => (setSubject(v), resetChapter())} />
          <Segmented label="Class" value={grade} options={CLASS_OPTIONS} onChange={(v) => (setChosenClass(v), resetChapter())} />
          <select
            aria-label="Chapter"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className="h-10 max-w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="all">All chapters</option>
            {chapters.map(([id, title]) => (
              <option key={id} value={id}>
                {title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {shown.length} formula{shown.length === 1 ? "" : "s"} · {summary}
          </p>
          <span className="flex gap-2">
          <button
            type="button"
            onClick={() => setRecalling(true)}
            disabled={shown.length === 0}
            className="font-display h-9 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            Recall{due > 0 ? ` · ${due} due` : ""}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="font-display h-9 rounded-xl border border-line px-4 text-sm font-semibold text-ink transition hover:border-accent/60"
          >
            Print
          </button>
          </span>
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="mt-10 text-center text-muted">No formulas match that. Try another word or class.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`chapter-${group.key}`}>
              <h2 id={`chapter-${group.key}`} className="font-display flex items-center gap-2 text-base font-bold text-ink">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: SUBJECT_INFO[group.subject].color }} />
                Class {group.grade} · {group.title}
              </h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {group.cards.map((card) => (
                  <li key={card.id}>
                    <FormulaCardView
                      card={card}
                      tools={renderTools ? renderTools(card) : card.lab && <TryIt conceptId={card.lab.conceptId} equationId={card.lab.equationId} />}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
