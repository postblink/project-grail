import { notFound } from "next/navigation";
import Link from "next/link";
import { getLeague, getLeagueMissingItems, type GrailScope } from "@/lib/leagues";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  return { title: league ? `${league.name} Missing Items — Project Grail` : "Missing Items — Project Grail" };
}

const CATEGORY_COLORS: Record<string, string> = {
  unique:   "text-[#C7B377]",
  set:      "text-emerald-400",
  runeword: "text-orange-400",
  rune:     "text-amber-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  unique: "Unique",
  set: "Set",
  runeword: "Runeword",
  rune: "Rune",
};

export default async function MissingItemsPage({ params }: Props) {
  const { slug } = await params;
  const league = await getLeague(slug);
  if (!league) notFound();

  const scope = league.grail_scope as unknown as GrailScope;
  const items = await getLeagueMissingItems(league.id, scope);

  // Group by category
  const byCategory = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const categoryOrder = ["unique", "set", "runeword", "rune"];
  const orderedCategories = categoryOrder.filter((c) => byCategory[c]?.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/leagues/${slug}`} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← {league.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Missing Items</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {league.season.name} · {items.length} item{items.length !== 1 ? "s" : ""} no member has found yet
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-emerald-800/50 bg-emerald-900/10 px-6 py-10 text-center">
          <p className="text-2xl">◆◆◆</p>
          <p className="mt-2 text-sm font-medium text-emerald-400">Every item has been found!</p>
          <p className="mt-1 text-xs text-zinc-500">Your league has completed the Grail.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orderedCategories.map((cat) => {
            const catItems = byCategory[cat];
            const color = CATEGORY_COLORS[cat] ?? "text-zinc-400";
            const label = CATEGORY_LABELS[cat] ?? cat;

            // For sets, sub-group by set_name
            if (cat === "set") {
              const bySet = catItems.reduce<Record<string, typeof catItems>>((acc, item) => {
                const key = item.set_name ?? "—";
                (acc[key] ??= []).push(item);
                return acc;
              }, {});
              const setNames = Object.keys(bySet).sort();

              return (
                <section key={cat}>
                  <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${color}`}>
                    {label} · {catItems.length}
                  </h2>
                  <div className="space-y-4">
                    {setNames.map((setName) => (
                      <div key={setName}>
                        <p className="mb-1.5 text-xs text-zinc-600 font-medium">{setName}</p>
                        <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                          {bySet[setName].map((item) => (
                            <ItemRow key={item.id} item={item} color={color} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            }

            return (
              <section key={cat}>
                <h2 className={`mb-3 text-xs font-semibold uppercase tracking-wider ${color}`}>
                  {label} · {catItems.length}
                </h2>
                <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {catItems.map((item) => (
                    <ItemRow key={item.id} item={item} color={color} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  color,
}: {
  item: { name: string; item_type: string | null; pd2_exclusive: boolean; wiki_url?: string | null };
  color: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
      <span className={`text-sm font-medium ${color}`}>{item.name}</span>
      <div className="flex items-center gap-2">
        {item.pd2_exclusive && (
          <span className="rounded bg-violet-900/40 px-1.5 py-0.5 text-xs text-violet-400">PD2</span>
        )}
        {item.item_type && (
          <span className="text-xs text-zinc-600">{item.item_type}</span>
        )}
      </div>
    </div>
  );
}
