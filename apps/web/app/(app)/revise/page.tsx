import type { Metadata } from "next";
import { ReviseScreen } from "@/components/home/ReviseScreen";

export const metadata: Metadata = { title: "Revise", description: "The laws you discovered, and the levels worth another go." };

export default function RevisePage() {
  return <ReviseScreen />;
}
