"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
        <p className="text-6xl font-bold text-amber-400">500</p>
        <h1 className="mt-3 text-xl font-semibold text-zinc-100">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-500">An unexpected error occurred. Your grail progress is safe.</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-amber-700 px-5 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-600"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700"
          >
            ← Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
