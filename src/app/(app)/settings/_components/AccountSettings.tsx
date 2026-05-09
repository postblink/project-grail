"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const LINK_ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Authorization failed — please try again.",
  token_exchange: "Could not complete Discord authorization. Please try again.",
  fetch_user: "Could not retrieve your Discord profile. Please try again.",
  already_linked: "That Discord account is already linked to a different user.",
  server: "Something went wrong on our end. Please try again.",
};

export function AccountSettings({
  currentDisplayName,
  email,
  providers,
  isPublic,
  linkSuccess,
  linkError,
}: {
  currentDisplayName: string | null;
  email: string | null;
  providers: string[];
  isPublic: boolean;
  linkSuccess?: boolean;
  linkError?: string;
}) {
  const { update } = useSession();
  const router = useRouter();
  const [name, setName] = useState(currentDisplayName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [privacy, setPrivacy] = useState(isPublic);
  const [privacyBusy, setPrivacyBusy] = useState(false);

  async function handleUnlink(provider: string) {
    setUnlinking(provider);
    const res = await fetch(`/api/user/accounts/${provider}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not unlink provider");
    }
    setUnlinking(null);
  }

  async function handlePrivacyToggle(next: boolean) {
    setPrivacy(next); // optimistic
    setPrivacyBusy(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_public: next }),
    });
    if (!res.ok) {
      setPrivacy(!next); // revert
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Could not update privacy");
    } else {
      router.refresh();
    }
    setPrivacyBusy(false);
  }

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
    pd2: "Project Diablo 2",
  };

  const discordLinked = providers.includes("discord");
  const pd2Linked = providers.includes("pd2");
  // Discord can only be unlinked if there's another sign-in method (magic link or other OAuth)
  const canUnlinkDiscord = discordLinked && providers.some((p) => p !== "discord" && p !== "pd2");

  return (
    <div className="space-y-8">
    {/* Linked accounts */}
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Account</h2>

      {linkSuccess && (
        <p className="text-xs text-emerald-400">Account linked successfully.</p>
      )}
      {linkError && (
        <p className="text-xs text-red-400">
          {LINK_ERROR_MESSAGES[linkError] ?? "Something went wrong. Please try again."}
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
        {email && (
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs text-zinc-500">Email</span>
            <span className="text-sm text-zinc-300">{email}</span>
          </div>
        )}

        {/* Discord row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-zinc-300">Discord</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {discordLinked ? "Linked" : "Sign in faster and sync your username."}
            </p>
          </div>
          {discordLinked ? (
            canUnlinkDiscord && (
              <button
                onClick={() => handleUnlink("discord")}
                disabled={unlinking === "discord"}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 hover:border-red-800 disabled:opacity-50 transition-colors"
              >
                {unlinking === "discord" ? "Unlinking…" : "Unlink"}
              </button>
            )
          ) : (
            <a
              href="/api/auth/link/discord"
              className="rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-indigo-100 hover:bg-indigo-600 transition-colors"
            >
              Connect
            </a>
          )}
        </div>

        {/* PD2 row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm text-zinc-300">Project Diablo 2</p>
            <p className="text-xs text-zinc-600 mt-0.5">
              {pd2Linked ? "Linked — shared stash import enabled." : "Enables shared stash import and character sync."}
            </p>
          </div>
          {pd2Linked ? (
            <button
              onClick={() => handleUnlink("pd2")}
              disabled={unlinking === "pd2"}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 hover:border-red-800 disabled:opacity-50 transition-colors"
            >
              {unlinking === "pd2" ? "Unlinking…" : "Unlink"}
            </button>
          ) : (
            <a
              href="/api/auth/link/pd2"
              className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-600 transition-colors"
            >
              Connect
            </a>
          )}
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

    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Privacy</h2>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm text-zinc-300">Public profile</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            When on, anyone can view your grail at <code className="text-zinc-400">/grail/{currentDisplayName ?? "yourname"}</code>.
            Turn off to hide your profile from non-signed-in visitors. League leaderboards will still show your name.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={privacy}
          onClick={() => handlePrivacyToggle(!privacy)}
          disabled={privacyBusy}
          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${privacy ? "bg-amber-600" : "bg-zinc-700"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-zinc-100 transition-transform ${privacy ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </div>
    </section>
    </div>
  );
}
