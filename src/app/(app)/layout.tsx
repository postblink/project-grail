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
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(196,163,82,0.18) 0%, transparent 70%)",
        }}
      />
      <div className="relative z-10">
        <NavBar
          displayName={session?.user.display_name ?? null}
          isAdmin={session?.user.is_admin ?? false}
          isAuthed={!!session}
        />
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Providers>{children}</Providers>
        </main>
      </div>
    </div>
  );
}
