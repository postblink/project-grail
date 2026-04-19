"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  seasonId: string;
  isCurrent: boolean;
  isActive: boolean;
}

export function SeasonActions({ seasonId, isCurrent, isActive }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/seasons/${seasonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.ok;
  }

  async function markCurrent() {
    if (isCurrent) return;
    setPending("current");
    await patch({ is_current: true });
    setPending(null);
    router.refresh();
  }

  async function toggleActive() {
    setPending("active");
    await patch({ is_active: !isActive });
    setPending(null);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {!isCurrent && (
        <button
          onClick={markCurrent}
          disabled={pending === "current"}
          className="rounded px-2 py-1 text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
        >
          {pending === "current" ? "…" : "Set Current"}
        </button>
      )}
      <button
        onClick={toggleActive}
        disabled={pending === "active"}
        className="rounded px-2 py-1 text-xs bg-zinc-700 text-zinc-300 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
      >
        {pending === "active" ? "…" : isActive ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}
