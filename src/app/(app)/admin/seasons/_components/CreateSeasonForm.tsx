"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateSeasonForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      slug: (fd.get("slug") as string) || undefined,
      start_date: fd.get("start_date") as string,
      end_date: (fd.get("end_date") as string) || undefined,
      is_current: fd.get("is_current") === "on",
    };

    const res = await fetch("/api/admin/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setPending(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create season");
      return;
    }

    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <h2 className="text-sm font-semibold text-zinc-300">New Season</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Name *</label>
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Season 10"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Slug (auto-generated if blank)</label>
          <input
            name="slug"
            maxLength={40}
            placeholder="s10"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Start Date *</label>
          <input
            name="start_date"
            type="date"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">End Date</label>
          <input
            name="end_date"
            type="date"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
        <input name="is_current" type="checkbox" className="rounded border-zinc-600 bg-zinc-800" />
        Mark as current season (clears any existing current)
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50 transition-colors"
      >
        {pending ? "Creating…" : "Create Season"}
      </button>
    </form>
  );
}
