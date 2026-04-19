import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentSeason, getOrCreateGrail, getGrailItems } from "@/lib/grail";
import { GrailView } from "./_components/GrailView";

export default async function GrailPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  const season = await getCurrentSeason();
  if (!season) {
    return (
      <div className="rounded-xl border border-amber-800/40 bg-amber-900/20 p-6 text-amber-300">
        <p className="font-medium">No active season</p>
        <p className="mt-1 text-sm text-amber-400/70">
          An admin needs to create and activate a season before you can start tracking.
        </p>
      </div>
    );
  }

  const grail = await getOrCreateGrail(session.user.id, season.id);
  const items = await getGrailItems(grail.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">My Grail</h1>
        <p className="mt-0.5 text-sm text-zinc-500">{season.name}</p>
      </div>
      <GrailView grailId={grail.id} initialItems={items} />
    </div>
  );
}
