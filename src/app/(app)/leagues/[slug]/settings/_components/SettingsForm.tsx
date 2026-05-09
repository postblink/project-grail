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

interface Member {
  user_id: string;
  display_name: string | null;
}

interface Props {
  slug: string;
  initialName: string;
  initialIsPrivate: boolean;
  initialInviteCode: string | null;
  initialWebhookUrl: string | null;
  initialScope: GrailScope;
  commissionerId: string;
  members: Member[];
  currentUserId: string;
}

const SCOPE_LABELS: Record<keyof GrailScope, string> = {
  unique: "Unique items",
  set: "Set items",
  runeword: "Runewords",
  rune: "Runes",
  pd2_exclusive: "PD2-exclusive items",
};

export function SettingsForm({ slug, initialName, initialIsPrivate, initialInviteCode, initialWebhookUrl, initialScope, commissionerId, members, currentUserId }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isPrivate, setIsPrivate] = useState(initialIsPrivate);
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl ?? "");
  const [scope, setScope] = useState<GrailScope>(initialScope);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [regenerateConfirming, setRegenerateConfirming] = useState(false);

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
    setRegenerateConfirming(true);
  }

  async function confirmRegenerate() {
    setRegenerateConfirming(false);
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
            {regenerateConfirming ? (
              <>
                <span className="text-xs text-zinc-500">Invalidates current link.</span>
                <button type="button" onClick={confirmRegenerate} className="text-xs text-red-400 hover:text-red-300 transition-colors">Confirm</button>
                <button type="button" onClick={() => setRegenerateConfirming(false)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Cancel</button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleRegenerateCode}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Regenerate
              </button>
            )}
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

      {currentUserId === commissionerId && (
        <TransferOwnership slug={slug} commissionerId={commissionerId} members={members} />
      )}
    </form>
  );
}

function TransferOwnership({ slug, commissionerId, members }: { slug: string; commissionerId: string; members: Member[] }) {
  const router = useRouter();
  const candidates = members.filter((m) => m.user_id !== commissionerId);
  const [targetId, setTargetId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <h3 className="text-sm font-semibold text-zinc-300">Transfer ownership</h3>
        <p className="mt-1 text-xs text-zinc-500">
          You&apos;re the only member. Invite someone first to transfer the league.
        </p>
      </div>
    );
  }

  async function handleTransfer() {
    if (!targetId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/leagues/${slug}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: targetId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr((data as { error?: string }).error ?? "Transfer failed");
        setBusy(false);
        return;
      }
      router.push(`/leagues/${slug}`);
      router.refresh();
    } catch {
      setErr("Something went wrong.");
      setBusy(false);
    }
  }

  const target = candidates.find((m) => m.user_id === targetId) ?? null;

  return (
    <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-4 py-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-zinc-200">Transfer ownership</h3>
        <p className="mt-1 text-xs text-zinc-500">
          Hand the commissioner role to another member. You&apos;ll become a co-commissioner and can leave the league after.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={targetId}
          onChange={(e) => { setTargetId(e.target.value); setConfirming(false); }}
          disabled={busy}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-500"
        >
          <option value="">Select a member…</option>
          {candidates.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.display_name ?? "Unknown"}
            </option>
          ))}
        </select>

        {confirming && target ? (
          <>
            <span className="text-xs text-zinc-400">
              Transfer to {target.display_name ?? "Unknown"}?
            </span>
            <button
              type="button"
              onClick={handleTransfer}
              disabled={busy}
              className="rounded-lg bg-red-900 px-3 py-1.5 text-xs font-semibold text-red-100 hover:bg-red-800 disabled:opacity-50"
            >
              {busy ? "Transferring…" : "Confirm transfer"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={!targetId || busy}
            className="rounded-lg border border-red-800 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Transfer
          </button>
        )}
      </div>

      {err && <p className="text-xs text-red-400">{err}</p>}
    </div>
  );
}
