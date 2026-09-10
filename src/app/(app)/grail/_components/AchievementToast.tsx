"use client";

import { useEffect } from "react";
import { getAchievementDef } from "@/lib/achievement-defs";

interface Props {
  keys: string[];
  onDismissAll: () => void;
}

export function AchievementToast({ keys, onDismissAll }: Props) {
  if (keys.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col items-end gap-2"
      aria-live="polite"
    >
      {keys.map((key) => (
        <Toast key={key} achievementKey={key} onDismiss={onDismissAll} />
      ))}
    </div>
  );
}

function Toast({
  achievementKey,
  onDismiss,
}: {
  achievementKey: string;
  onDismiss: () => void;
}) {
  const def = getAchievementDef(achievementKey);

  useEffect(() => {
    const timer = setTimeout(onDismiss, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="pointer-events-auto flex cursor-pointer items-center gap-3 border border-zinc-700 border-l-2 border-l-amber-500 bg-zinc-900 px-4 py-3 shadow-xl"
      onClick={onDismiss}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onDismiss();
      }}
    >
      <span className={`text-2xl leading-none ${def.color}`}>{def.emoji}</span>
      <div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-amber-400">
          Achievement unlocked
        </p>
        <p className="mt-1 reliquary-serif text-sm text-zinc-100">{def.name}</p>
        <p className="text-xs text-zinc-500">{def.description}</p>
      </div>
    </div>
  );
}
