import Link from "next/link";
import { auth } from "@/auth";
import { getUserAchievements } from "@/lib/achievements";
import { ALL_ACHIEVEMENT_DEFS, getAchievementDef } from "@/lib/achievement-defs";

export const metadata = { title: "Achievements — Project Grail" };

export default async function AchievementsPage() {
  const session = await auth();
  const userId = session?.user.id;

  const earned = userId ? await getUserAchievements(userId) : [];
  const earnedKeySet = new Set(earned.map((a) => a.key));

  // Add dynamic set_complete defs for any the user has earned
  const earnedSetDefs = earned
    .filter((a) => a.key.startsWith("set_complete:"))
    .map((a) => getAchievementDef(a.key));

  const allDefs = [
    ...ALL_ACHIEVEMENT_DEFS,
    ...earnedSetDefs.filter((d) => !ALL_ACHIEVEMENT_DEFS.some((s) => s.key === d.key)),
  ];

  const total = allDefs.length;
  const unlockedCount = allDefs.filter((d) => earnedKeySet.has(d.key)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Achievements</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {unlockedCount} / {total} unlocked
          </p>
        </div>
        <Link href="/dashboard" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${Math.round((unlockedCount / total) * 100)}%` }}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {allDefs.map((def) => {
          const isEarned = earnedKeySet.has(def.key);
          return (
            <div
              key={def.key}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${
                isEarned
                  ? "border-zinc-700 bg-zinc-900"
                  : "border-zinc-800/60 bg-zinc-900/30"
              }`}
            >
              <span
                className={`text-2xl leading-none ${isEarned ? def.color : "text-zinc-700"}`}
              >
                {def.emoji}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    isEarned ? "text-zinc-100" : "text-zinc-600"
                  }`}
                >
                  {def.name}
                </p>
                <p
                  className={`text-xs truncate ${
                    isEarned ? "text-zinc-400" : "text-zinc-700"
                  }`}
                >
                  {def.description}
                </p>
              </div>
              {isEarned && (
                <span className="ml-auto shrink-0 text-xs font-medium text-amber-500">✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
