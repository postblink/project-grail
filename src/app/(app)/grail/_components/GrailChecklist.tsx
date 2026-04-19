"use client";

import { useState, useTransition } from "react";
import type { GrailItemRow } from "@/lib/grail";

const CATEGORIES = ["unique", "set", "runeword", "rune"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<string, string> = {
  unique: "Unique",
  set: "Set",
  runeword: "Runeword",
  rune: "Rune",
};

interface Props {
  grailId: string;
  initialItems: GrailItemRow[];
}

export function GrailChecklist({ grailId, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [filterFound, setFilterFound] = useState<"all" | "found" | "missing">("all");
  const [filterPd2, setFilterPd2] = useState(false);

  function toggle(itemId: string) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const nextFound = !item.found;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, found: nextFound, found_at: nextFound ? new Date() : null }
          : i
      )
    );

    startTransition(async () => {
      try {
        const res = await fetch("/api/grail/entries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grailId, itemId, found: nextFound }),
        });
        if (!res.ok) {
          // Roll back on error
          setItems((prev) =>
            prev.map((i) =>
              i.id === itemId ? { ...i, found: item.found, found_at: item.found_at } : i
            )
          );
        }
      } catch {
        setItems((prev) =>
          prev.map((i) =>
            i.id === itemId ? { ...i, found: item.found, found_at: item.found_at } : i
          )
        );
      }
    });
  }

  const filtered = items.filter((item) => {
    if (filterCat !== "all" && item.category !== filterCat) return false;
    if (filterFound === "found" && !item.found) return false;
    if (filterFound === "missing" && item.found) return false;
    if (filterPd2 && !item.pd2_exclusive) return false;
    if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by category for display
  const grouped = CATEGORIES.reduce<Record<string, GrailItemRow[]>>((acc, cat) => {
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
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                filterCat === cat
                  ? "bg-zinc-700 text-zinc-100"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
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
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                filterFound === f
                  ? "bg-zinc-700 text-zinc-100"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <button
          onClick={() => setFilterPd2((v) => !v)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            filterPd2
              ? "border-amber-700 bg-amber-900/30 text-amber-300"
              : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          PD2 exclusive
        </button>

        <span className="ml-auto text-sm text-zinc-500">
          {filtered.length} shown · {found}/{total} found
        </span>
      </div>

      {/* Grouped item lists */}
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
              <span className="text-xs text-zinc-600">
                {catFound}/{catItems.length}
              </span>
            </div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {catItems.map((item) => (
                <ItemRow key={item.id} item={item} onToggle={() => toggle(item.id)} />
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

function ItemRow({ item, onToggle }: { item: GrailItemRow; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
        item.found
          ? "border-amber-800/50 bg-amber-900/20 hover:bg-amber-900/30"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      {/* Checkbox indicator */}
      <span
        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-xs transition-colors ${
          item.found
            ? "border-amber-600 bg-amber-600 text-zinc-950"
            : "border-zinc-600 bg-transparent"
        }`}
      >
        {item.found && "✓"}
      </span>

      <span className="flex-1 min-w-0">
        <span
          className={`block truncate text-sm font-medium ${
            item.found ? "text-amber-200" : "text-zinc-300"
          }`}
        >
          {item.name}
        </span>
        {item.item_type && (
          <span className="text-xs text-zinc-600">{item.item_type}</span>
        )}
        {item.set_name && (
          <span className="text-xs text-zinc-600">{item.set_name}</span>
        )}
      </span>

      {item.pd2_exclusive && (
        <span className="flex-shrink-0 rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-500">
          PD2
        </span>
      )}
    </button>
  );
}
