import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminPage() {
  const [seasonCount, itemCount] = await Promise.all([
    db.season.count(),
    db.item.count(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Admin</h1>

      <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
        <AdminCard
          href="/admin/seasons"
          title="Seasons"
          description="Create seasons, mark current, set end dates"
          stat={`${seasonCount} season${seasonCount !== 1 ? "s" : ""}`}
        />
        <AdminCard
          href="/admin/items"
          title="Items"
          description="Toggle active status, import JSON updates"
          stat={`${itemCount} items`}
        />
      </div>
    </div>
  );
}

function AdminCard({
  href,
  title,
  description,
  stat,
}: {
  href: string;
  title: string;
  description: string;
  stat: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors space-y-2"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-base font-semibold text-zinc-200">{title}</span>
        <span className="text-xs text-zinc-600">{stat}</span>
      </div>
      <p className="text-sm text-zinc-500">{description}</p>
    </Link>
  );
}
