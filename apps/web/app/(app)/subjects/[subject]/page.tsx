import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubjectScreen } from "@/components/subjects/SubjectScreen";
import { isSubject, SUBJECT_INFO, SUBJECTS } from "@/lib/subjects";

export const dynamicParams = false;

export function generateStaticParams() {
  return SUBJECTS.map((subject) => ({ subject }));
}

export async function generateMetadata({ params }: { params: Promise<{ subject: string }> }): Promise<Metadata> {
  const { subject } = await params;
  return isSubject(subject) ? { title: SUBJECT_INFO[subject].title, description: SUBJECT_INFO[subject].tagline } : {};
}

export default async function SubjectPage({ params }: { params: Promise<{ subject: string }> }) {
  const { subject } = await params;
  if (!isSubject(subject)) notFound();
  return <SubjectScreen subject={subject} />;
}
