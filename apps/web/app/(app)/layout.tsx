import { AppShell } from "@/components/shell/AppShell";

/** Everything past the front door, with the navigation around it. No account needed. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>{children}</AppShell>
  );
}
