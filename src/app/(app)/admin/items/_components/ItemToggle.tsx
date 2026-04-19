"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  itemId: string;
  isActive: boolean;
}

export function ItemToggle({ itemId, isActive }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [localActive, setLocalActive] = useState(isActive);

  async function toggle() {
    setPending(true);
    const next = !localActive;
    setLocalActive(next);

    const res = await fetch(`/api/admin/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: next }),
    });

    if (!res.ok) {
      setLocalActive(!next);
    }

    setPending(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
        localActive ? "bg-amber-600" : "bg-zinc-700"
      }`}
      aria-label={localActive ? "Deactivate item" : "Activate item"}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
          localActive ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}
