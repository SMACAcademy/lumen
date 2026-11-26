import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-ink">This experiment doesn’t exist (yet)</h1>
      <p className="mt-2 text-muted">It may still be on the research bench.</p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white">
        Back to the universe
      </Link>
    </main>
  );
}
