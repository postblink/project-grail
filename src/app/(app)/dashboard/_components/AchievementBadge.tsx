"use client";

import type { AchievementDef } from "@/lib/achievements";

interface Props {
  achievement: AchievementDef & { unlockedAt: Date };
  size?: "sm" | "md";
}

export function AchievementBadge({ achievement, size = "md" }: Props) {
  const isSm = size === "sm";
  return (
    <div
      title={`${achievement.name}: ${achievement.description}`}
      className={`flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 ${isSm ? "px-2.5 py-1.5" : "px-3 py-2"}`}
    >
      <span className={`${isSm ? "text-base" : "text-lg"} ${achievement.color} leading-none`}>
        {achievement.emoji}
      </span>
      <div>
        <p className={`font-medium text-zinc-200 ${isSm ? "text-xs" : "text-sm"}`}>{achievement.name}</p>
        {!isSm && (
          <p className="text-xs text-zinc-600">{achievement.description}</p>
        )}
      </div>
    </div>
  );
}
