"use client";

import { useState } from "react";
import type { GrailItemRow } from "@/lib/grail";
import { GrailChecklist } from "./GrailChecklist";
import { ArmoryImport } from "./ArmoryImport";

interface Props {
  grailId: string;
  initialItems: GrailItemRow[];
}

function computeProgress(items: GrailItemRow[]) {
  const total = items.length;
  const found = items.filter((i) => i.found).length;
  return { total, found, pct: total > 0 ? Math.round((found / total) * 100) : 0 };
}

export function GrailView({ grailId, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const progress = computeProgress(items);

  function handleImportComplete(foundItemIds: string[]) {
    const idSet = new Set(foundItemIds);
    setItems((prev) =>
      prev.map((item) =>
        idSet.has(item.id) ? { ...item, found: true, found_at: new Date() } : item,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          <span className="text-2xl font-bold text-zinc-100">{progress.pct}%</span>
          {" "}— {progress.found} / {progress.total} items
        </p>
        <ArmoryImport grailId={grailId} onImportComplete={handleImportComplete} />
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${progress.pct}%` }}
        />
      </div>
      <GrailChecklist grailId={grailId} items={items} setItems={setItems} />
    </div>
  );
}
