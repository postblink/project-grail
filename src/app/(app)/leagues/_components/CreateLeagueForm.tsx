"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GrailScope } from "@/lib/leagues";

const LEAGUE_TYPES = [
  {
    value: "hybrid",
    label: "Hybrid",
    desc: "Individual grails + shared team view",
    detail: "Everyone tracks their own grail independently. When you find an item it counts toward your personal progress AND the team's combined grail. Great for friend groups — compete individually while seeing collective coverage.",
  },
  {
    value: "competitive",
    label: "Competitive",
    desc: "Individual grails, ranked leaderboard",
    detail: "Everyone tracks their own grail with no shared state. The leaderboard ranks players purely by individual completion %. Best for race-style leagues where you want a clear winner.",
  },
  {
    value: "cooperative",
    label: "Cooperative",
    desc: "One shared grail for the whole group",
    detail: "There is one grail for the whole league. When any member checks off an item, it's marked found for everyone. The leaderboard tracks contribution rather than personal completion. Ideal for close-knit groups working toward a collective goal.",
  },
] as const;

const LADDER_MODES = [
  { value: "softcore_ladder", label: "Softcore Ladder", desc: "Standard SC ladder characters" },
  { value: "hardcore_ladder", label: "Hardcore Ladder", desc: "HC ladder — permadeath" },
  { value: "softcore_nonladder", label: "Softcore Non-Ladder", desc: "SC non-ladder (older chars)" },
  { value: "hardcore_nonladder", label: "Hardcore Non-Ladder", desc: "HC non-ladder — permadeath" },
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
  const [expandedType, setExpandedType] = useState<string | null>(null);
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
            <div key={t.value} className={`rounded-lg border transition-colors ${leagueType === t.value ? "border-amber-700 bg-amber-900/20" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"}`}>
              <label className="flex cursor-pointer items-start gap-3 p-3">
                <input
                  type="radio"
                  name="league_type"
                  value={t.value}
                  checked={leagueType === t.value}
                  onChange={() => setLeagueType(t.value)}
                  className="mt-0.5 accent-amber-500"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-zinc-200">{t.label}</span>
                  <span className="text-xs text-zinc-500">{t.desc}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setExpandedType(expandedType === t.value ? null : t.value)}
                  className="mt-0.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                  aria-label="More info"
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </button>
              </label>
              {expandedType === t.value && (
                <p className="px-3 pb-3 text-xs text-zinc-400 border-t border-zinc-700/50 pt-2 mt-0">{t.detail}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Ladder mode */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-300">Ladder mode</label>
        <div className="grid grid-cols-2 gap-2">
          {LADDER_MODES.map((m) => (
            <label key={m.value} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors ${ladderMode === m.value ? "border-amber-700 bg-amber-900/20 text-amber-200" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600"}`}>
              <input
                type="radio"
                name="ladder_mode"
                value={m.value}
                checked={ladderMode === m.value}
                onChange={() => setLadderMode(m.value)}
                className="mt-0.5 accent-amber-500"
              />
              <span>
                <span className="block text-sm font-medium">{m.label}</span>
                <span className="text-xs opacity-60">{m.desc}</span>
              </span>
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
        <div className="mb-1.5 flex items-center gap-1.5">
          <label className="text-sm font-medium text-zinc-300">
            Discord webhook <span className="text-zinc-600 font-normal">(optional)</span>
          </label>
          <div className="group relative">
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor" className="text-zinc-600 hover:text-zinc-400 cursor-default transition-colors">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg">
              <p className="font-medium text-zinc-200 mb-1">How to get a webhook URL:</p>
              <ol className="space-y-0.5 text-zinc-400 list-decimal list-inside">
                <li>Open your Discord server</li>
                <li>Edit the channel you want posts in</li>
                <li>Go to Integrations → Webhooks</li>
                <li>Create a new webhook and copy the URL</li>
              </ol>
              <p className="mt-1.5 text-zinc-500">Members&apos; item finds will be posted to this channel.</p>
            </div>
          </div>
        </div>
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
