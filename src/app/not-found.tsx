import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(196,163,82,0.18) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10 text-center">
        <p className="text-6xl font-bold text-amber-400">404</p>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">This page doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-zinc-500">The item you&apos;re looking for wasn&apos;t found in the armory.</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
        >
          ← Back to Project Grail
        </Link>
      </div>
    </main>
  );
}
