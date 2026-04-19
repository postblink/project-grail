import { db } from "@/lib/db";
import { ItemToggle } from "./_components/ItemToggle";
import { ItemImport } from "./_components/ItemImport";
import Link from "next/link";

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ q?: string; cat?: string; page?: string; active?: string }>;
}

export default async function AdminItemsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const cat = sp.cat ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const activeFilter = sp.active; // "1" | "0" | undefined = all

  const where = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(cat ? { category: cat as never } : {}),
    ...(activeFilter === "1" ? { is_active: true } : activeFilter === "0" ? { is_active: false } : {}),
  };

  const [items, total] = await Promise.all([
    db.item.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        category: true,
        item_type: true,
        set_name: true,
        pd2_exclusive: true,
        is_active: true,
        season_introduced: { select: { name: true } },
      },
    }),
    db.item.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat) params.set("cat", cat);
    if (activeFilter !== undefined) params.set("active", activeFilter);
    if (page > 1) params.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    });
    params.delete("page"); // reset page on filter change (overrides may re-add it)
    const overridePage = overrides.page;
    if (overridePage !== undefined) params.set("page", overridePage);
    const s = params.toString();
    return `/admin/items${s ? `?${s}` : ""}`;
  }

  const CATEGORIES = ["unique", "set", "runeword", "rune", "other"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Items</h1>

      <ItemImport />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <form action="/admin/items" className="flex gap-2">
          {cat && <input type="hidden" name="cat" value={cat} />}
          {activeFilter !== undefined && <input type="hidden" name="active" value={activeFilter} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name…"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Search
          </button>
          {q && (
            <Link
              href={buildUrl({ q: undefined })}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-700 transition-colors"
            >
              Clear
            </Link>
          )}
        </form>

        <div className="flex gap-1">
          <Link
            href={buildUrl({ cat: undefined })}
            className={`rounded px-2 py-1 text-xs transition-colors ${!cat ? "bg-zinc-600 text-zinc-100" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          >
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={buildUrl({ cat: c })}
              className={`rounded px-2 py-1 text-xs capitalize transition-colors ${cat === c ? "bg-zinc-600 text-zinc-100" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
            >
              {c}
            </Link>
          ))}
        </div>

        <div className="flex gap-1">
          <Link
            href={buildUrl({ active: undefined })}
            className={`rounded px-2 py-1 text-xs transition-colors ${activeFilter === undefined ? "bg-zinc-600 text-zinc-100" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          >
            All
          </Link>
          <Link
            href={buildUrl({ active: "1" })}
            className={`rounded px-2 py-1 text-xs transition-colors ${activeFilter === "1" ? "bg-emerald-700 text-emerald-100" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          >
            Active
          </Link>
          <Link
            href={buildUrl({ active: "0" })}
            className={`rounded px-2 py-1 text-xs transition-colors ${activeFilter === "0" ? "bg-zinc-600 text-zinc-100" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
          >
            Inactive
          </Link>
        </div>

        <span className="ml-auto text-xs text-zinc-500">{total} items</span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Category</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Type / Set</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Season</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">PD2</th>
              <th className="px-4 py-3 text-xs font-medium text-zinc-500 text-right">Active</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-4 py-2.5 text-zinc-200">{item.name}</td>
                <td className="px-4 py-2.5 text-zinc-400 capitalize">{item.category}</td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">
                  {item.set_name ?? item.item_type ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">
                  {item.season_introduced?.name ?? "—"}
                </td>
                <td className="px-4 py-2.5 text-zinc-500 text-xs">
                  {item.pd2_exclusive ? <span className="text-amber-500">✓</span> : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <ItemToggle itemId={item.id} isActive={item.is_active} />
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-600">
                  No items match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800 transition-colors"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="rounded border border-zinc-700 px-3 py-1 hover:bg-zinc-800 transition-colors"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
