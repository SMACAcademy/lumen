import type { Metadata } from "next";
import { HomeHub } from "@/components/home/HomeHub";

export const metadata: Metadata = { title: "Home", description: "Your day, and the whole science world by subject." };

export default function HomePage() {
  return <HomeHub />;
}
