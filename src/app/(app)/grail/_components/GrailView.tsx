"use client";

import { useCallback, useState } from "react";
import type { GrailItemRow } from "@/lib/grail";
import { GrailChecklist } from "./GrailChecklist";
import { ArmoryImport } from "./ArmoryImport";
import { AchievementToast } from "./AchievementToast";
import { getDiscoveryProgress } from "@/lib/discovery";

interface Props {
  grailId: string;
  initialItems: GrailItemRow[];
  pd2Linked: boolean;
  discoveryEnabled: boolean;
}

function computeProgress(items: GrailItemRow[]) {
  const total = items.length;
  const found = items.filter((i) => i.found).length;
  return { total, found, pct: total > 0 ? Math.round((found / total) * 100) : 0 };
}

export function GrailView({ grailId, initialItems, pd2Linked, discoveryEnabled }: Props) {
  const [items, setItems] = useState(initialItems);
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);
  const [resetState, setResetState] = useState<"idle" | "confirm" | "resetting">("idle");
  const progress = computeProgress(items);
  const discoveryProgress = getDiscoveryProgress(items);
  const dismissAchievements = useCallback(() => setPendingAchievements([]), []);

  async function handleReset() {
    setResetState("resetting");
    try {
      const res = await fetch("/api/grail/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grailId }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.map((item) => ({
        ...item,
        found: false,
        found_at: null,
        discoveryDropAttested: false,
        discoveryIdentificationAttested: false,
      })));
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
      <div className="reliquary-panel flex flex-col justify-between gap-4 border-l-2 border-l-amber-500 px-4 py-4 sm:flex-row sm:items-center">
        <p className="text-sm text-zinc-400">
          <span className="reliquary-serif text-4xl text-zinc-100">{progress.pct}%</span>
          {" "}— {progress.found} / {progress.total} items
        </p>
        <div className="flex items-center gap-2">
          {resetState === "confirm" ? (
            <div className="flex flex-col items-end gap-2">
              <p className="text-xs text-zinc-400 text-right max-w-xs">
                This will uncheck all found items. You&apos;ll need to re-import your characters to restore progress — items not currently in your stash or inventory cannot be recovered.
              </p>
              <div className="flex items-center gap-2">
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
                  Reset all progress
                </button>
              </div>
            </div>
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

      {discoveryEnabled && (
        <section
          aria-label="Season 14 Discovery self-attestation progress"
          className="reliquary-panel border-l-2 border-l-cyan-700 px-4 py-4"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-cyan-200">Season 14 Discovery — self-attested</h2>
            <span className="text-sm tabular-nums text-zinc-300">
              {discoveryProgress.eligible} / {discoveryProgress.total} eligible
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Counts only found Unique and Set items where you attest to being in the same act at a party drop and present at identification.
            Project Grail cannot verify the game events, Discovery Aura unlock, or ranking.
          </p>
        </section>
      )}

      {/* Progress bar with milestone markers */}
      <div className="relative py-2">
        <div className="h-0.5 w-full overflow-hidden bg-zinc-800">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
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
        <div className="reliquary-panel border-l-2 border-l-amber-700 px-4 py-5 text-center space-y-2">
          <p className="reliquary-serif text-lg text-zinc-300">Your grail is empty — time to hunt.</p>
          <p className="text-xs text-zinc-500">
            Check off items as you find them, or use <span className="text-amber-400">Armory Import</span> to bulk-import from your PD2 characters.
          </p>
        </div>
      )}

      <GrailChecklist
        grailId={grailId}
        items={items}
        setItems={setItems}
        discoveryEnabled={discoveryEnabled}
        onAchievementsUnlocked={setPendingAchievements}
      />
      <AchievementToast
        keys={pendingAchievements}
        onDismissAll={dismissAchievements}
      />
    </div>
  );
}
