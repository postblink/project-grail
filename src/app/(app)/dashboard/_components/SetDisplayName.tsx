"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function SetDisplayName() {
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not save name");
      setLoading(false);
      return;
    }

    await update();
    setDone(true);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-amber-800/50 bg-amber-900/10 px-5 py-4 max-w-xl">
      <p className="text-sm font-medium text-amber-300 mb-3">Choose a display name to get started</p>
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. RuneHunter"
            minLength={2}
            maxLength={32}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
          />
          {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
          <p className="mt-1.5 text-xs text-zinc-600">Letters, numbers, spaces, hyphens, underscores · 2–32 chars</p>
        </div>
        <button
          type="submit"
          disabled={loading || name.trim().length < 2}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-600 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
