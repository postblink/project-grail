import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCurrentSeason } from "@/lib/grail";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  // The landing page should remain useful even if the optional season label
  // cannot be loaded during a database outage or local setup.
  const season = await getCurrentSeason().catch(() => null);

  return (
    <main className="pg-landing">
      <header className="pg-landing-masthead">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="reliquary-serif text-2xl text-zinc-100">Project Grail</span>
          <span className="hidden text-[9px] font-bold uppercase tracking-[0.2em] text-amber-500 sm:inline">
            PD2 archive
          </span>
        </Link>
        <Link href="/login" className="reliquary-ghost">
          Open the ledger
        </Link>
      </header>

      <div className="pg-landing-grid">
        <section className="pg-landing-copy">
          <p className="reliquary-kicker">A living record of the hunt</p>
          <h1>Every relic. Every rune. One ledger.</h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            A purpose-built Holy Grail tracker for Project Diablo 2—made for solo hunters,
            shared leagues, and the long road to the final missing item.
          </p>

          <ol className="pg-landing-register max-w-2xl">
            <li>
              <span>I</span>
              Record every unique, set item, runeword, and rune across the current season.
            </li>
            <li>
              <span>II</span>
              Reconcile your finds directly from the PD2 armory before committing changes.
            </li>
            <li>
              <span>III</span>
              Hunt together in cooperative, hybrid, or competitive leagues.
            </li>
          </ol>
        </section>

        <aside className="pg-landing-card" aria-label="Begin your grail">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#665d4c]">
            Registry · 001
          </p>
          <p className="mt-10 reliquary-serif text-5xl leading-none tracking-[-0.05em]">
            The hunt,
            <br />
            accounted for.
          </p>
          <div className="my-8 border-y border-[#988d76] py-5">
            <dl className="grid grid-cols-2 gap-5">
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#746a57]">
                  Active archive
                </dt>
                <dd className="mt-2 reliquary-serif text-lg">
                  {season?.name ?? "Current season"}
                </dd>
              </div>
              <div>
                <dt className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#746a57]">
                  Access
                </dt>
                <dd className="mt-2 reliquary-serif text-lg">Discord or email</dd>
              </div>
            </dl>
          </div>
          <Link
            href="/login"
            className="flex min-h-12 w-full items-center justify-between border border-[#171612] bg-[#171612] px-4 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#eee3ca] transition-colors hover:bg-[#8b2f2b]"
          >
            Begin your grail
            <span aria-hidden>→</span>
          </Link>
          <p className="mt-4 text-xs leading-5 text-[#665d4c]">
            No password required. Your seasonal records remain attached to your account.
          </p>
        </aside>
      </div>
    </main>
  );
}
