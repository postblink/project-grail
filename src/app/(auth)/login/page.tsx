"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

function LoginInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", { email, redirect: false, callbackUrl });
    setEmailSent(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <p className="reliquary-kicker">Bearer authentication</p>
        <h1 className="mt-3 text-4xl text-zinc-100">Open your ledger</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Continue the current season with Discord, or receive a one-time sign-in link.
        </p>
      </div>

      <div className="reliquary-panel p-6 sm:p-7">
        {error && (
          <p className="mb-5 border-l-2 border-red-700 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            Sign-in failed. Please try again.
          </p>
        )}

        <button
          onClick={() => signIn("discord", { callbackUrl })}
          className="flex min-h-12 w-full items-center justify-between border border-zinc-600 bg-zinc-800 px-4 text-[11px] font-extrabold uppercase tracking-[0.12em] text-zinc-100 transition-colors hover:border-[#7782f4] hover:bg-[#32353f]"
        >
          <span>Sign in with Discord</span>
          <span className="reliquary-serif text-base text-[#aeb4ff]" aria-hidden>
            D
          </span>
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">
            or
          </span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {emailSent ? (
          <p className="border-l-2 border-amber-500 pl-4 text-sm leading-6 text-zinc-400" aria-live="polite">
            Check your inbox — a sign-in link is on its way to{" "}
            <span className="text-zinc-200">{email}</span>.
          </p>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              aria-label="Email address"
              className="min-h-12 w-full border border-zinc-700 bg-zinc-950 px-4 text-sm text-zinc-100 placeholder-zinc-600 outline-none transition-colors focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="reliquary-action min-h-12 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>

      <p className="mt-5 text-xs leading-5 text-zinc-600">
        No password required. Discord is recommended for online ladder players.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
