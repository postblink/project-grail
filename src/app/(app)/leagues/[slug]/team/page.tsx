import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getLeague, getMemberRole, getCoopGrailItems, type GrailScope } from "@/lib/leagues";
import { CoopChecklist } from "./_components/CoopChecklist";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function TeamGrailPage({ params }: Props) {
  const { slug } = await params;
  const [league, session] = await Promise.all([getLeague(slug), auth()]);
  if (!league) notFound();

  if (league.league_type !== "cooperative") {
    redirect(`/leagues/${slug}`);
  }

  if (!session?.user.id) redirect(`/login?callbackUrl=/leagues/${slug}/team`);

  const role = await getMemberRole(league.id, session.user.id);
  if (!role) redirect(`/leagues/${slug}`);

  const scope = league.grail_scope as unknown as GrailScope;
  const items = await getCoopGrailItems(league.id, scope);
  const found = items.filter((i) => i.found).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((found / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/leagues/${slug}`} className="text-sm text-zinc-500 hover:text-zinc-300">
          ← {league.name}
        </Link>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Team Grail</h1>
          <p className="mt-0.5 text-sm text-zinc-500">{league.season.name} · Cooperative</p>
        </div>
        <p className="text-sm text-zinc-400">
          <span className="text-2xl font-bold text-zinc-100">{pct}%</span>
          {" "}— {found} / {total} items
        </p>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <CoopChecklist
        slug={slug}
        initialItems={items}
        currentUserId={session.user.id}
      />
    </div>
  );
}
