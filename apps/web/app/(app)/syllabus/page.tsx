import type { Metadata } from "next";
import { SyllabusScreen } from "@/components/syllabus/SyllabusScreen";

export const metadata: Metadata = {
  title: "Syllabus",
  description: "Every maths, physics and chemistry concept from class 6 to class 12, and where each one stands.",
};

export default function SyllabusPage() {
  return <SyllabusScreen />;
}
