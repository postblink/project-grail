import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AccountSettings } from "./_components/AccountSettings";

export const metadata = { title: "Account Settings — Project Grail" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      accounts: { select: { provider: true } },
    },
  });

  const providers = user?.accounts.map((a) => a.provider) ?? [];

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Account Settings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your display name and account preferences.
        </p>
      </div>

      <AccountSettings
        currentDisplayName={session.user.display_name}
        email={user?.email ?? null}
        providers={providers}
      />
    </div>
  );
}
