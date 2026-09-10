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
    <div className="space-y-7">
      <header className="reliquary-page-head">
        <div>
          <p className="reliquary-kicker">Archive of distinction</p>
          <h1 className="reliquary-page-title mt-3">Achievements</h1>
          <p className="mt-3 text-sm text-zinc-500">
            {unlockedCount} / {total} unlocked
          </p>
        </div>
        <Link href="/dashboard" className="reliquary-ghost">
          ← Dashboard
        </Link>
      </header>

      {/* Progress bar */}
      {total > 0 && (
        <div className="reliquary-panel flex items-center gap-5 border-l-2 border-l-amber-500 px-5 py-4">
          <span className="reliquary-serif text-4xl text-zinc-100">
            {Math.round((unlockedCount / total) * 100)}%
          </span>
          <div className="h-0.5 flex-1 overflow-hidden bg-zinc-800">
          <div
              className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${Math.round((unlockedCount / total) * 100)}%` }}
          />
          </div>
          <span className="hidden text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 sm:block">
            Ledger complete
          </span>
        </div>
      )}

      <div className="grid gap-px border border-zinc-800 bg-zinc-800 sm:grid-cols-2 lg:grid-cols-3">
        {allDefs.map((def) => {
          const isEarned = earnedKeySet.has(def.key);
          return (
            <div
              key={def.key}
              className={`flex min-h-20 items-center gap-3 px-4 py-3 transition-colors ${
                isEarned
                  ? "bg-zinc-900"
                  : "bg-zinc-950/80"
              }`}
            >
              <span
                className={`text-2xl leading-none ${isEarned ? def.color : "text-zinc-700"}`}
              >
                {def.emoji}
              </span>
              <div className="min-w-0">
                <p
                  className={`reliquary-serif text-sm truncate ${
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
                <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-400">
                  Earned
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
