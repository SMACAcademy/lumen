import { allConcepts, buildsOnOf, type ConceptLocation, type Grade, gradeOfLevel, leadsToOf } from "@ise/content";

/** One idea on the spine, and where to play it if it is built yet. */
export interface SpineLink {
  id: string;
  title: string;
  grade: Grade;
  /** A level, else a lab; null while it is still to be built. */
  href: string | null;
}

const MAX = 4;

function toLinks(entries: readonly ConceptLocation[], exclude: ReadonlySet<string>): SpineLink[] {
  const seen = new Set<string>();
  const links: SpineLink[] = [];
  for (const { concept, chapter } of entries) {
    if (exclude.has(concept.id) || seen.has(concept.id)) continue;
    seen.add(concept.id);
    const href = concept.built?.level ? `/play/${concept.built.level}` : concept.built?.lab ? `/lab/${concept.built.lab}` : null;
    links.push({ id: concept.id, title: concept.title, grade: chapter.grade, href });
  }
  return links.sort((a, b) => a.grade - b.grade || a.title.localeCompare(b.title)).slice(0, MAX);
}

/**
 * Where a level's ideas come from and where they go next, read from the
 * syllabus's `buildsOn` links: the roots to warm up on, and the later
 * chapters that grow out of it. Lowest class first, at most four of each.
 */
export function levelSpine(levelId: string): { grade: Grade | null; roots: SpineLink[]; next: SpineLink[] } {
  const own = allConcepts().filter((entry) => entry.concept.built?.level === levelId);
  const ownIds = new Set(own.map((entry) => entry.concept.id));
  return {
    grade: gradeOfLevel(levelId),
    roots: toLinks(own.flatMap((entry) => buildsOnOf(entry.concept.id)), ownIds),
    next: toLinks(own.flatMap((entry) => leadsToOf(entry.concept.id)), ownIds),
  };
}
