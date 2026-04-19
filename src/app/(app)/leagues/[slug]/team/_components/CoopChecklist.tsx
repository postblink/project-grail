"use client";

import { useState, useTransition } from "react";
import type { CoopItemRow } from "@/lib/leagues";

const CATEGORIES = ["unique", "set", "runeword", "rune"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<string, string> = {
  unique: "Unique",
  set: "Set",
  runeword: "Runeword",
  rune: "Rune",
};

interface Props {
  slug: string;
  initialItems: CoopItemRow[];
  currentUserId: string;
  readOnly?: boolean;
}

export function CoopChecklist({ slug, initialItems, currentUserId, readOnly = false }: Props) {
  const [items, setItems] = useState(initialItems);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [filterFound, setFilterFound] = useState<"all" | "found" | "missing">("all");

  function toggle(itemId: string) {
    if (readOnly) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const nextFound = !item.found;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              found: nextFound,
              found_at: nextFound ? new Date() : null,
              found_by_id: nextFound ? currentUserId : null,
              found_by_name: nextFound ? "You" : null,
            }
          : i,
      ),
    );

    startTransition(async () => {
      try {
        const res = await fetch(`/api/leagues/${slug}/grail`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemId, found: nextFound }),
        });
        if (!res.ok) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? { ...i, found: item.found, found_at: item.found_at, found_by_id: item.found_by_id, found_by_name: item.found_by_name }
                : i,
            ),
          );
        }
      } catch {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId
              ? { ...i, found: item.found, found_at: item.found_at, found_by_id: item.found_by_id, found_by_name: item.found_by_name }
              : i,
          ),
        );
      }
    });
  }

  const filtered = items.filter((item) => {
    if (filterCat !== "all" && item.category !== filterCat) return false;
    if (filterFound === "found" && !item.found) return false;
    if (filterFound === "missing" && item.found) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped = CATEGORIES.reduce<Record<string, CoopItemRow[]>>((acc, cat) => {
    acc[cat] = filtered.filter((i) => i.category === cat);
    return acc;
  }, {});

  const found = items.filter((i) => i.found).length;
  const total = items.length;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-48 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-500"
        />

        <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
          {(["all", ...CATEGORIES] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat as typeof filterCat)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${filterCat === cat ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"}`}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
          {(["all", "missing", "found"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterFound(f)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${filterFound === f ? "bg-zinc-700 text-zinc-100" : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <span className="ml-auto text-sm text-zinc-500">
          {filtered.length} shown · {found}/{total} found
        </span>
      </div>

      {/* Grouped lists */}
      {CATEGORIES.map((cat) => {
        const catItems = grouped[cat];
        if (!catItems?.length) return null;
        const catFound = catItems.filter((i) => i.found).length;
        return (
          <section key={cat}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {CATEGORY_LABELS[cat]}
              </h2>
              <span className="text-xs text-zinc-600">{catFound}/{catItems.length}</span>
            </div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {catItems.map((item) => (
                <CoopItemRow key={item.id} item={item} onToggle={() => toggle(item.id)} readOnly={readOnly} />
              ))}
            </div>
          </section>
        );
      })}

      {filtered.length === 0 && (
        <p className="py-12 text-center text-sm text-zinc-600">No items match the current filters.</p>
      )}
    </div>
  );
}

function CoopItemRow({ item, onToggle, readOnly }: { item: CoopItemRow; onToggle: () => void; readOnly?: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={readOnly}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
        item.found
          ? "border-amber-800/50 bg-amber-900/20 hover:bg-amber-900/30"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      } ${readOnly ? "cursor-default" : ""}`}
    >
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-xs transition-colors ${
          item.found ? "border-amber-600 bg-amber-600 text-zinc-950" : "border-zinc-600 bg-transparent"
        }`}
      >
        {item.found && "✓"}
      </span>

      <span className="flex-1 min-w-0">
        <span className={`block truncate text-sm font-medium ${item.found ? "text-amber-200" : "text-zinc-300"}`}>
          {item.name}
        </span>
        {item.found && item.found_by_name && (
          <span className="text-xs text-zinc-600">Found by {item.found_by_name}</span>
        )}
        {!item.found && item.item_type && (
          <span className="text-xs text-zinc-600">{item.item_type}</span>
        )}
      </span>

      {item.pd2_exclusive && (
        <span className="flex-shrink-0 rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-500">PD2</span>
      )}
    </button>
  );
}
