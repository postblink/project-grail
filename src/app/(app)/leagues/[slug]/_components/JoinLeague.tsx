"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  isPrivate: boolean;
}

export function JoinLeague({ slug, isPrivate }: Props) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) setInviteCode(code);
  }, []);

  async function handleJoin() {
    setLoading(true);
    setError(null);

    const body = isPrivate ? { invite_code: inviteCode.trim() } : { slug };

    try {
      const res = await fetch("/api/leagues/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 409) {
        router.refresh();
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Failed to join");
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (isPrivate) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          placeholder="Enter invite code"
          className="h-9 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
        />
        <button
          onClick={handleJoin}
          disabled={loading || !inviteCode.trim()}
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {loading ? "Joining…" : "Join"}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-600 disabled:opacity-50 transition-colors"
    >
      {loading ? "Joining…" : "Join League"}
    </button>
  );
}
