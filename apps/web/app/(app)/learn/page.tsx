import type { Metadata } from "next";
import { LearnScreen } from "@/components/home/LearnScreen";

export const metadata: Metadata = { title: "Learn", description: "Your path through physics, one short level at a time." };

export default function LearnPage() {
  return <LearnScreen />;
}
