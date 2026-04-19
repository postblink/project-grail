"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GrailScope } from "@/lib/leagues";

const LEAGUE_TYPES = [
  { value: "hybrid", label: "Hybrid", desc: "Individual grails + shared team view" },
  { value: "competitive", label: "Competitive", desc: "Individual grails, ranked leaderboard" },
  { value: "cooperative", label: "Cooperative", desc: "One shared grail for the whole group" },
] as const;

const LADDER_MODES = [
  { value: "softcore_ladder", label: "Softcore Ladder" },
  { value: "hardcore_ladder", label: "Hardcore Ladder" },
  { value: "softcore_nonladder", label: "Softcore Non-Ladder" },
  { value: "hardcore_nonladder", label: "Hardcore Non-Ladder" },
] as const;

const SCOPE_LABELS: Record<keyof GrailScope, string> = {
  unique: "Unique items",
  set: "Set items",
  runeword: "Runewords",
  rune: "Runes",
  pd2_exclusive: "PD2-exclusive items",
};

export function CreateLeagueForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [leagueType, setLeagueType] = useState<"hybrid" | "competitive" | "cooperative">("hybrid");
  const [ladderMode, setLadderMode] = useState<"softcore_ladder" | "hardcore_ladder" | "softcore_nonladder" | "hardcore_nonladder">("softcore_ladder");
  const [isPrivate, setIsPrivate] = useState(false);
  const [scope, setScope] = useState<GrailScope>({ unique: true, set: true, runeword: true, rune: true, pd2_exclusive: true });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleScope(key: keyof GrailScope) {
    setScope((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          league_type: leagueType,
          ladder_mode: ladderMode,
          is_private: isPrivate,
          grail_scope: scope,
          discord_webhook_url: webhookUrl || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to create league");
        setSubmitting(false);
        return;
      }

      const { league } = (await res.json()) as { league: { slug: string } };
      router.push(`/leagues/${league.slug}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {/* Name */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">League name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={60}
          placeholder="Season 13 Grail Race"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
        />
      </div>

      {/* League type */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">League type</label>
        <div className="space-y-2">
          {LEAGUE_TYPES.map((t) => (
            <label key={t.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${leagueType === t.value ? "border-amber-700 bg-amber-900/20" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
              <input
                type="radio"
                name="league_type"
                value={t.value}
                checked={leagueType === t.value}
                onChange={() => setLeagueType(t.value)}
                className="mt-0.5 accent-amber-500"
              />
              <span>
                <span className="block text-sm font-medium text-zinc-200">{t.label}</span>
                <span className="text-xs text-zinc-500">{t.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Ladder mode */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">Ladder mode</label>
        <div className="grid grid-cols-2 gap-2">
          {LADDER_MODES.map((m) => (
            <label key={m.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${ladderMode === m.value ? "border-amber-700 bg-amber-900/20 text-amber-200" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"}`}>
              <input
                type="radio"
                name="ladder_mode"
                value={m.value}
                checked={ladderMode === m.value}
                onChange={() => setLadderMode(m.value)}
                className="accent-amber-500"
              />
              {m.label}
            </label>
          ))}
        </div>
      </div>

      {/* Grail scope */}
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-300">Item categories</label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(scope) as (keyof GrailScope)[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleScope(key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${scope[key] ? "border-amber-700 bg-amber-900/30 text-amber-300" : "border-zinc-700 bg-zinc-900 text-zinc-500"}`}
            >
              {SCOPE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="h-4 w-4 rounded accent-amber-500"
        />
        <span>
          <span className="text-sm font-medium text-zinc-300">Private league</span>
          <span className="ml-2 text-xs text-zinc-500">Invite code required to join</span>
        </span>
      </label>

      {/* Discord webhook */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">
          Discord webhook <span className="text-zinc-600 font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://discord.com/api/webhooks/…"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !name.trim()}
        className="rounded-lg bg-amber-700 px-5 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Creating…" : "Create League"}
      </button>
    </form>
  );
}
