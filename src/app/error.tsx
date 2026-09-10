"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="reliquary-panel max-w-lg border-l-2 border-l-amber-600 p-8 text-center">
        <p className="reliquary-kicker">Archive error · 500</p>
        <h1 className="mt-4 text-3xl text-zinc-100">Something went wrong</h1>
        <p className="mt-2 text-sm text-zinc-500">An unexpected error occurred. Your grail progress is safe.</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="reliquary-action"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="reliquary-ghost"
          >
            ← Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
