import { branchesOf, concepts, coverage, forExam, forStage, levels, STAGES, SUBJECTS, subjectCoverage } from "@ise/content";
import type { Metadata } from "next";
import { Landing, type LandingStats } from "@/components/landing/Landing";
import { labsOf } from "@/lib/subjects";

export const metadata: Metadata = {
  title: { absolute: "Lumen — step inside the science world" },
};

/** Everything the front door counts, straight from the catalogue. */
function landingStats(): LandingStats {
  const all = coverage();
  const subjects = Object.fromEntries(
    SUBJECTS.map((s) => {
      const cov = subjectCoverage(s);
      return [s, { concepts: cov.total, playable: cov.ready, labs: labsOf(s).length, chapters: branchesOf(s).reduce((n, b) => n + b.chapters.length, 0) }];
    }),
  ) as LandingStats["subjects"];
  return {
    concepts: all.total,
    playable: all.ready,
    labs: concepts.length,
    levels: levels.length,
    subjects,
    exams: { neet: forExam("neet").length, jeeMain: forExam("jee-main").length, jeeAdv: forExam("jee-adv").length },
    stages: Object.fromEntries(STAGES.map((stage) => [stage, forStage(stage).length])) as LandingStats["stages"],
  };
}

export default function LandingPage() {
  return <Landing stats={landingStats()} />;
}
