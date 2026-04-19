import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { getLeague, getMemberRole, isCommissioner, type GrailScope } from "@/lib/leagues";
import { SettingsForm } from "./_components/SettingsForm";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LeagueSettingsPage({ params }: Props) {
  const { slug } = await params;
  const [league, session] = await Promise.all([getLeague(slug), auth()]);

  if (!league) notFound();

  if (!session?.user.id) redirect(`/login?callbackUrl=/leagues/${slug}/settings`);

  const role = await getMemberRole(league.id, session.user.id);
  if (!isCommissioner(role)) redirect(`/leagues/${slug}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/leagues/${slug}`} className="text-sm text-zinc-500 hover:text-zinc-300">
          ← {league.name}
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-100">League Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Season and ladder mode cannot be changed after creation.
        </p>
      </div>

      <SettingsForm
        slug={slug}
        initialName={league.name}
        initialIsPrivate={league.is_private}
        initialInviteCode={league.invite_code}
        initialWebhookUrl={league.discord_webhook_url}
        initialScope={league.grail_scope as unknown as GrailScope}
      />
    </div>
  );
}
