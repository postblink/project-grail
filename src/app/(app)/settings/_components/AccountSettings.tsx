"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AccountSettings({
  currentDisplayName,
  email,
  providers,
}: {
  currentDisplayName: string | null;
  email: string | null;
  providers: string[];
}) {
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(currentDisplayName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const unchanged = name.trim() === (currentDisplayName ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not save");
      setLoading(false);
      return;
    }

    await update();
    setSaved(true);
    setLoading(false);
    router.refresh();
  }

  const PROVIDER_LABELS: Record<string, string> = {
    discord: "Discord",
    resend: "Magic link (email)",
  };

  return (
    <div className="space-y-8">
    {/* Linked accounts */}
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Account</h2>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {email && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-zinc-500">Email</span>
            <span className="text-sm text-zinc-300">{email}</span>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-zinc-500">Linked providers</span>
          <div className="flex gap-2">
            {providers.length === 0 ? (
              <span className="text-sm text-zinc-600">None</span>
            ) : providers.map((p) => (
              <span key={p} className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                {PROVIDER_LABELS[p] ?? p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>

    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Display Name</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setSaved(false); }}
            placeholder="e.g. RuneHunter"
            minLength={2}
            maxLength={32}
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
          />
          <p className="mt-1.5 text-xs text-zinc-600">
            Letters, numbers, spaces, hyphens, underscores · 2–32 chars · visible on leaderboards and your public grail
          </p>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        {saved && <p className="text-xs text-emerald-400">Display name updated.</p>}

        <button
          type="submit"
          disabled={loading || unchanged || name.trim().length < 2}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
    </div>
  );
}
