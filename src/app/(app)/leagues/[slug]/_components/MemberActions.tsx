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
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    const label = isSelf ? "leave this league" : `remove ${displayName ?? "this member"}`;
    if (!window.confirm(`Are you sure you want to ${label}?`)) return;

    setLoading(true);
    await fetch(`/api/leagues/${slug}/members/${userId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="text-xs text-zinc-600 hover:text-red-400 disabled:opacity-50 transition-colors"
    >
      {loading ? "…" : isSelf ? "Leave" : "Remove"}
    </button>
  );
}
