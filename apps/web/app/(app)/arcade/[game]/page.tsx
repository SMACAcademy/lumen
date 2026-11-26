import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArcadeGame } from "@/components/arcade/ArcadeGame";
import { ARCADE_GAMES, ARCADE_ORDER, isArcadeGame } from "@/lib/arcade";

export const dynamicParams = false;

export function generateStaticParams() {
  return ARCADE_ORDER.map((game) => ({ game }));
}

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const { game } = await params;
  return isArcadeGame(game) ? { title: ARCADE_GAMES[game].title, description: ARCADE_GAMES[game].blurb } : {};
}

export default async function ArcadePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  if (!isArcadeGame(game)) notFound();
  return <ArcadeGame game={game} />;
}
