import { getConcept, getLevel, levels, worldOf } from "@ise/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LevelPlayer } from "@/components/play/LevelPlayer";

export const dynamicParams = false;

export function generateStaticParams() {
  return levels.map((l) => ({ levelId: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ levelId: string }> }): Promise<Metadata> {
  const level = getLevel((await params).levelId);
  return level ? { title: level.title, description: level.summary } : {};
}

export default async function PlayPage({ params }: { params: Promise<{ levelId: string }> }) {
  const level = getLevel((await params).levelId);
  const concept = level && getConcept(level.concept);
  if (!level || !concept) notFound();
  // After the last level of a world, go back to the start for now (the world map comes next).
  const world = worldOf(level.id);
  const next = world?.levels[world.levels.indexOf(level.id) + 1];
  return (
    <LevelPlayer
      level={level}
      concept={concept}
      worldId={world?.id ?? "unknown"}
      accent={world?.color}
      nextHref={next ? `/play/${next}` : "/home"}
    />
  );
}
