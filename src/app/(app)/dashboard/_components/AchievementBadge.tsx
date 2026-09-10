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
      className={`flex items-center gap-3 bg-zinc-900 ${isSm ? "px-2.5 py-1.5" : "px-4 py-3"}`}
    >
      <span className={`${isSm ? "text-base" : "text-lg"} ${achievement.color} leading-none`}>
        {achievement.emoji}
      </span>
      <div>
        <p className={`reliquary-serif text-zinc-200 ${isSm ? "text-xs" : "text-sm"}`}>{achievement.name}</p>
        {!isSm && (
          <p className="text-xs text-zinc-600">{achievement.description}</p>
        )}
      </div>
    </div>
  );
}
