"use client";

import { useState } from "react";
import type { GrailItemRow } from "@/lib/grail";
import { GrailChecklist } from "./GrailChecklist";
import { ArmoryImport } from "./ArmoryImport";
import { AchievementToast } from "./AchievementToast";

interface Props {
  grailId: string;
  initialItems: GrailItemRow[];
  pd2Linked: boolean;
}

function computeProgress(items: GrailItemRow[]) {
  const total = items.length;
  const found = items.filter((i) => i.found).length;
  return { total, found, pct: total > 0 ? Math.round((found / total) * 100) : 0 };
}

export function GrailView({ grailId, initialItems, pd2Linked }: Props) {
  const [items, setItems] = useState(initialItems);
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);
  const [resetState, setResetState] = useState<"idle" | "confirm" | "resetting">("idle");
  const progress = computeProgress(items);

  async function handleReset() {
    setResetState("resetting");
    try {
      const res = await fetch("/api/grail/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grailId }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((item) => ({ ...item, found: false, found_at: null })));
    } catch {
      // leave state as-is on failure so user can retry
    } finally {
      setResetState("idle");
    }
  }

  function handleImportComplete(foundItemIds: string[]) {
    const idSet = new Set(foundItemIds);
    setItems((prev) =>
      prev.map((item) =>
        idSet.has(item.id) ? { ...item, found: true, found_at: new Date() } : item,
      ),
    );
  }

  const milestones = [25, 50, 75];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          <span className="text-2xl font-bold text-zinc-100">{progress.pct}%</span>
          {" "}— {progress.found} / {progress.total} items
        </p>
        <div className="flex items-center gap-2">
          {resetState === "confirm" ? (
            <>
              <span className="text-xs text-zinc-400">Reset all progress?</span>
              <button
                onClick={() => setResetState("idle")}
                className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="rounded-lg bg-red-900 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-800"
              >
                Reset
              </button>
            </>
          ) : (
            <button
              onClick={() => setResetState("confirm")}
              disabled={resetState === "resetting"}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-600 hover:border-zinc-700 hover:text-zinc-400 disabled:opacity-50"
            >
              {resetState === "resetting" ? "Resetting…" : "Reset"}
            </button>
          )}
          <ArmoryImport grailId={grailId} onImportComplete={handleImportComplete} pd2Linked={pd2Linked} />
        </div>
      </div>

      {/* Progress bar with milestone markers */}
      <div className="relative">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        {milestones.map((m) => (
          <div
            key={m}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${m}%` }}
          >
            <div className={`w-px h-3 ${progress.pct >= m ? "bg-amber-700" : "bg-zinc-700"}`} />
            <span className={`mt-0.5 text-[10px] leading-none ${progress.pct >= m ? "text-amber-600" : "text-zinc-600"}`}>{m}%</span>
          </div>
        ))}
      </div>

      {/* First-time empty state nudge */}
      {progress.found === 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-5 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-300">Your grail is empty — time to hunt.</p>
          <p className="text-xs text-zinc-500">
            Check off items as you find them, or use <span className="text-amber-400">Armory Import</span> to bulk-import from your PD2 characters.
          </p>
        </div>
      )}

      <GrailChecklist
        grailId={grailId}
        items={items}
        setItems={setItems}
        onAchievementsUnlocked={setPendingAchievements}
      />
      <AchievementToast
        keys={pendingAchievements}
        onDismissAll={() => setPendingAchievements([])}
      />
    </div>
  );
}
