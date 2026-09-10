import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NavBar } from "./_components/NavBar";
import { Providers } from "./_components/Providers";

// Paths inside the (app) group that render for unauthenticated visitors.
// The proxy mirrors this list — keep them in sync.
const PUBLIC_PATH_RE = /^\/leagues(?:\/(?!create$)[^/]+(?:\/(?:leaderboard|activity|missing))?)?$/;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [session, hdrs] = await Promise.all([auth(), headers()]);
  const pathname = hdrs.get("x-pathname") ?? "";
  const isPublicPath = PUBLIC_PATH_RE.test(pathname);

  if (!session && !isPublicPath) redirect("/login");

  return (
    <div className="pg-app-shell text-zinc-100">
      <NavBar
        displayName={session?.user.display_name ?? null}
        isAdmin={session?.user.is_admin ?? false}
        isAuthed={!!session}
      />
      <div className="pg-workspace">
        <main className="pg-main">
          <Providers>{children}</Providers>
        </main>
      </div>
    </div>
  );
}
