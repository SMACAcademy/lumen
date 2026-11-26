import type { Metadata } from "next";
import { JournalScreen } from "@/components/home/JournalScreen";

export const metadata: Metadata = { title: "Journal", description: "The laws you have discovered." };

export default function JournalPage() {
  return <JournalScreen />;
}
