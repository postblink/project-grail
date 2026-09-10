import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="reliquary-panel max-w-lg border-l-2 border-l-amber-600 p-8 text-center">
        <p className="reliquary-kicker">Missing entry · 404</p>
        <h1 className="mt-4 text-3xl text-zinc-100">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-zinc-500">The item you&apos;re looking for wasn&apos;t found in the armory.</p>
        <Link
          href="/"
          className="reliquary-ghost mt-8"
        >
          ← Back to Project Grail
        </Link>
      </div>
    </main>
  );
}
