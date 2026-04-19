"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function CopyInviteButton({ slug, inviteCode }: { slug: string; inviteCode: string | null }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!inviteCode) return;
    const url = `${window.location.origin}/leagues/${slug}?code=${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!inviteCode}
      className="rounded-lg bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-40"
    >
      {copied ? "Copied!" : "Copy invite link"}
    </button>
  );
}
import type { GrailScope } from "@/lib/leagues";

interface Props {
  slug: string;
  initialName: string;
  initialIsPrivate: boolean;
  initialInviteCode: string | null;
  initialWebhookUrl: string | null;
  initialScope: GrailScope;
}

const SCOPE_LABELS: Record<keyof GrailScope, string> = {
  unique: "Unique items",
  set: "Set items",
  runeword: "Runewords",
  rune: "Runes",
  pd2_exclusive: "PD2-exclusive items",
};

export function SettingsForm({ slug, initialName, initialIsPrivate, initialInviteCode, initialWebhookUrl, initialScope }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl ?? "");
  const [scope, setScope] = useState<GrailScope>(initialScope);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggleScope(key: keyof GrailScope) {
    setScope((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch(`/api/leagues/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          is_private: isPrivate,
          discord_webhook_url: webhookUrl || null,
          grail_scope: scope,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Save failed");
        setSaving(false);
        return;
      }

      setSaved(true);
      setSaving(false);
      router.refresh();
    } catch {
      setError("Something went wrong.");
      setSaving(false);
    }
  }

  async function handleRegenerateCode() {
    if (!window.confirm("This will invalidate the current invite code. Continue?")) return;

    const res = await fetch(`/api/leagues/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate_invite: true }),
    });

    if (res.ok) {
      const { league } = (await res.json()) as { league: { invite_code: string } };
      setInviteCode(league.invite_code);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-lg">
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
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
        />
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
        <span className="text-sm font-medium text-zinc-300">Private league</span>
      </label>

      {/* Invite code management */}
      {isPrivate && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Invite link</span>
            <code className="font-mono text-sm text-amber-300">{inviteCode ?? "—"}</code>
          </div>
          <div className="flex items-center gap-2">
            <CopyInviteButton slug={slug} inviteCode={inviteCode} />
            <button
              type="button"
              onClick={handleRegenerateCode}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Regenerate code
            </button>
          </div>
        </div>
      )}

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
      {saved && <p className="text-sm text-emerald-400">Settings saved.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-amber-700 px-5 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-600 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
