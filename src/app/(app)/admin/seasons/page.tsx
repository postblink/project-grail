import { db } from "@/lib/db";
import { CreateSeasonForm } from "./_components/CreateSeasonForm";
import { SeasonActions } from "./_components/SeasonActions";

export default async function AdminSeasonsPage() {
  const seasons = await db.season.findMany({
    orderBy: { start_date: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      start_date: true,
      end_date: true,
      is_current: true,
      is_active: true,
      _count: { select: { grails: true } },
    },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-100">Seasons</h1>

      <CreateSeasonForm />

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Season</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Slug</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Start</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">End</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Grails</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => (
              <tr key={s.id} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-4 py-3 text-zinc-200 font-medium">
                  {s.name}
                  {s.is_current && (
                    <span className="ml-2 rounded-full bg-amber-600/20 px-2 py-0.5 text-xs text-amber-400">
                      Current
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{s.slug}</td>
                <td className="px-4 py-3 text-zinc-400">{s.start_date.toISOString().slice(0, 10)}</td>
                <td className="px-4 py-3 text-zinc-400">{s.end_date?.toISOString().slice(0, 10) ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-400">{s._count.grails}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs ${s.is_active ? "text-emerald-400" : "text-zinc-600"}`}
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <SeasonActions
                    seasonId={s.id}
                    isCurrent={s.is_current}
                    isActive={s.is_active}
                  />
                </td>
              </tr>
            ))}
            {seasons.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-600">
                  No seasons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
