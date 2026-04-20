"use client";

import { useEffect, useState } from "react";
import { getAchievementDef } from "@/lib/achievement-defs";

interface ToastItem {
  id: number;
  key: string;
}

interface Props {
  keys: string[];
  onDismissAll: () => void;
}

export function AchievementToast({ keys, onDismissAll }: Props) {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (keys.length === 0) return;
    const newToasts = keys.map((key) => ({ id: Date.now() + Math.random(), key }));
    setItems((prev) => [...prev, ...newToasts]);
    onDismissAll();
  // onDismissAll is an inline arrow — stable setter underneath, safe to omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys]);

  function dismiss(id: number) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {items.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const def = getAchievementDef(toast.key);

  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4500);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-xl animate-in slide-in-from-right-4 fade-in duration-300"
      onClick={() => onDismiss(toast.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onDismiss(toast.id)}
    >
      <span className={`text-2xl leading-none ${def.color}`}>{def.emoji}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Achievement Unlocked</p>
        <p className="text-sm font-medium text-zinc-100">{def.name}</p>
        <p className="text-xs text-zinc-500">{def.description}</p>
      </div>
    </div>
  );
}
