import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pg-auth-shell">
      <aside className="pg-auth-aside">
        <Link href="/" className="pg-wordmark p-0 pb-7">
          <span className="pg-wordmark-kicker">Archive · PG</span>
          <span className="pg-wordmark-name">Project Grail</span>
          <span className="pg-wordmark-sub">The hunter&apos;s reliquary</span>
        </Link>

        <div>
          <p className="reliquary-kicker">Field note · XIII</p>
          <blockquote className="mt-5 max-w-sm reliquary-serif text-4xl leading-tight text-zinc-200">
            The rarest find is the one still absent from the page.
          </blockquote>
          <p className="mt-6 max-w-xs text-xs leading-6 text-zinc-600">
            Keep the record. Compare the hunt. Return when the season turns.
          </p>
        </div>

        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-700">
          Project Diablo 2 · Community tracker
        </p>
      </aside>

      <div className="pg-auth-main">{children}</div>
    </div>
  );
}
