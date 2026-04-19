import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NavBar } from "./_components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

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
        <NavBar displayName={session.user.display_name} isAdmin={session.user.is_admin} />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
