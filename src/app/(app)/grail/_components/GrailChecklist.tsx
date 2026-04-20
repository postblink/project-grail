"use client";

import { useState, useTransition } from "react";
import type { GrailItemRow } from "@/lib/grail";
import { WikiTooltip } from "./WikiTooltip";

const CATEGORIES = ["unique", "set", "runeword", "rune"] as const;
type Category = (typeof CATEGORIES)[number];

const CATEGORY_LABELS: Record<string, string> = {
  unique: "Unique",
  set: "Set",
  runeword: "Runeword",
  rune: "Rune",
};

// D2-authentic item category colors
const CATEGORY_COLORS: Record<string, { name: string; found: string; header: string; badge: string; border: string; bg: string }> = {
  unique:   { name: "text-[#C7B377]",  found: "text-[#e8d49a]",  header: "text-[#C7B377]",  badge: "bg-[#C7B377]/10 text-[#C7B377]",  border: "border-[#C7B377]/30", bg: "bg-[#C7B377]/10" },
  set:      { name: "text-emerald-400", found: "text-emerald-300", header: "text-emerald-400", badge: "bg-emerald-900/30 text-emerald-400", border: "border-emerald-700/30", bg: "bg-emerald-900/15" },
  runeword: { name: "text-orange-400",  found: "text-orange-300",  header: "text-orange-400",  badge: "bg-orange-900/30 text-orange-400",  border: "border-orange-700/30", bg: "bg-orange-900/15" },
  rune:     { name: "text-amber-400",   found: "text-amber-300",   header: "text-amber-400",   badge: "bg-amber-900/30 text-amber-400",   border: "border-amber-700/30", bg: "bg-amber-900/15" },
};

interface Props {
  grailId: string;
  items: GrailItemRow[];
  setItems?: React.Dispatch<React.SetStateAction<GrailItemRow[]>>;
  readOnly?: boolean;
  onAchievementsUnlocked?: (keys: string[]) => void;
}

export function GrailChecklist({ grailId, items, setItems, readOnly = false, onAchievementsUnlocked }: Props) {
  const [, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [filterFound, setFilterFound] = useState<"all" | "found" | "missing">("all");
  const [filterPd2, setFilterPd2] = useState(false);

  function toggle(itemId: string) {
    if (readOnly || !setItems) return;
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
          setItems((prev) =>
            prev.map((i) =>
              i.id === itemId ? { ...i, found: item.found, found_at: item.found_at } : i
            )
          );
        } else if (nextFound && onAchievementsUnlocked) {
          const data = await res.json() as { newAchievements?: string[] };
          if (data.newAchievements && data.newAchievements.length > 0) {
            onAchievementsUnlocked(data.newAchievements);
          }
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
      <div className="sticky top-0 z-10 -mx-1 bg-zinc-950/95 backdrop-blur-sm px-1 py-2 flex flex-wrap items-center gap-2">
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
          {(["missing", "all", "found"] as const).map((f) => (
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
          onClick={() => setFilterPd2((v: boolean) => !v)}
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
        const catPct = catItems.length > 0 ? Math.round((catFound / catItems.length) * 100) : 0;
        const colors = CATEGORY_COLORS[cat];

        // Sets get sub-grouped by set_name
        if (cat === "set") {
          const bySet = catItems.reduce<Record<string, GrailItemRow[]>>((acc, item) => {
            const key = item.set_name ?? "Other";
            (acc[key] ??= []).push(item);
            return acc;
          }, {});
          const setNames = Object.keys(bySet).sort();

          return (
            <section key={cat}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className={`text-xs font-semibold uppercase tracking-wider ${colors?.header ?? "text-zinc-500"}`}>
                  {CATEGORY_LABELS[cat]}
                </h2>
                <div className="flex-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                  <div className={`h-full rounded-full transition-all ${colors ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${catPct}%` }} />
                </div>
                <span className="text-xs text-zinc-600 tabular-nums">{catFound}/{catItems.length}</span>
              </div>
              <div className="space-y-4">
                {setNames.map((setName) => {
                  const setItems = bySet[setName]!;
                  const setFound = setItems.filter((i) => i.found).length;
                  const complete = setFound === setItems.length;
                  return (
                    <div key={setName}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <span className={`text-xs font-medium ${complete ? "text-emerald-400" : "text-zinc-400"}`}>
                          {complete && <span className="mr-1">✓</span>}{setName}
                        </span>
                        <span className="text-xs text-zinc-700">{setFound}/{setItems.length}</span>
                      </div>
                      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                        {setItems.map((item) => (
                          <ItemRow key={item.id} item={item} onToggle={() => toggle(item.id)} readOnly={readOnly} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        }

        return (
          <section key={cat}>
            <div className="mb-2 flex items-center gap-3">
              <h2 className={`text-xs font-semibold uppercase tracking-wider ${colors?.header ?? "text-zinc-500"}`}>
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="flex-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all ${cat === "rune" ? "bg-amber-500" : cat === "runeword" ? "bg-orange-500" : "bg-amber-500"}`}
                  style={{ width: `${catPct}%` }}
                />
              </div>
              <span className="text-xs text-zinc-600 tabular-nums">{catFound}/{catItems.length}</span>
            </div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {catItems.map((item) => (
                <ItemRow key={item.id} item={item} onToggle={() => toggle(item.id)} readOnly={readOnly} />
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

function ItemRow({ item, onToggle, readOnly }: { item: GrailItemRow; onToggle: () => void; readOnly?: boolean }) {
  const colors = CATEGORY_COLORS[item.category];

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${
        item.found
          ? `${colors?.border ?? "border-amber-800/50"} ${colors?.bg ?? "bg-amber-900/20"}`
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
      }`}
    >
      {/* Toggle area */}
      <button
        onClick={onToggle}
        disabled={readOnly}
        className={`flex items-center gap-3 flex-1 min-w-0 text-left ${readOnly ? "cursor-default" : ""}`}
      >
        {/* Checkbox */}
        <span
          className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-xs transition-colors ${
            item.found
              ? `${colors?.badge ?? "bg-amber-600 text-zinc-950"} border-transparent`
              : "border-zinc-600 bg-transparent"
          }`}
        >
          {item.found && "✓"}
        </span>

        <span className="flex-1 min-w-0">
          <span
            className={`block truncate text-sm font-medium transition-colors ${
              item.found
                ? (colors?.found ?? "text-amber-200")
                : (colors?.name ?? "text-zinc-300")
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
      </button>

      {/* Right side badges + wiki link */}
      <div className="flex flex-shrink-0 items-center gap-1.5">
        {item.pd2_exclusive && (
          <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-500">
            PD2
          </span>
        )}
        {item.wiki_url && (
          <WikiTooltip
            wikiUrl={item.wiki_url}
            wikiImageUrl={item.wiki_image_url}
            itemName={item.name}
            itemType={item.item_type}
            setName={item.set_name}
            category={item.category}
          />
        )}
      </div>
    </div>
  );
}
