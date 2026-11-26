import type { Metadata } from "next";
import { ProfileScreen } from "@/components/home/ProfileScreen";

export const metadata: Metadata = { title: "Your profile", description: "Your progress, preferences and data." };

export default function ProfilePage() {
  return <ProfileScreen />;
}
