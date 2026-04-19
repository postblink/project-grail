"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  userId: string;
  isSelf: boolean;
  displayName?: string | null;
}

export function MemberActions({ slug, userId, isSelf, displayName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await fetch(`/api/leagues/${slug}/members/${userId}`, { method: "DELETE" });
    router.refresh();
  }

  if (confirming) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">{isSelf ? "Leave?" : `Remove ${displayName ?? "member"}?`}</span>
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
        >
          {loading ? "…" : "Yes"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
    >
      {isSelf ? "Leave" : "Remove"}
    </button>
  );
}
