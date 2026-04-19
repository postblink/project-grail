"use client";

import { useState } from "react";
import type { GrailItemRow } from "@/lib/grail";
import { GrailChecklist } from "./GrailChecklist";
import { ArmoryImport } from "./ArmoryImport";

interface Props {
  grailId: string;
  initialItems: GrailItemRow[];
}

export function GrailView({ grailId, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);

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
      <div className="flex justify-end">
        <ArmoryImport grailId={grailId} onImportComplete={handleImportComplete} />
      </div>
      <GrailChecklist grailId={grailId} items={items} setItems={setItems} />
    </div>
  );
}
