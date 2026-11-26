import type { Metadata } from "next";
import { PracticeScreen } from "@/components/home/PracticeScreen";

export const metadata: Metadata = { title: "Practice", description: "A quick challenge, or free play in any lab." };

export default function PracticePage() {
  return <PracticeScreen />;
}
