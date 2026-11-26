import { concepts, getConcept } from "@ise/content";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConceptLaboratory } from "@/components/lab/ConceptLaboratory";

export const dynamicParams = false;

export function generateStaticParams() {
  return concepts.map((c) => ({ conceptId: c.meta.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ conceptId: string }> }): Promise<Metadata> {
  const concept = getConcept((await params).conceptId);
  return concept ? { title: concept.meta.title, description: concept.meta.tagline } : {};
}

export default async function LabPage({ params }: { params: Promise<{ conceptId: string }> }) {
  const concept = getConcept((await params).conceptId);
  if (!concept) notFound();
  return <ConceptLaboratory concept={concept} />;
}
