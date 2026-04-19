import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NavBar } from "./_components/NavBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <NavBar displayName={session.user.display_name} isAdmin={session.user.is_admin} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
