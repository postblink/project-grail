"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

function LoginInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

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
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-zinc-100">Project </span>
          <span className="text-amber-400">Grail</span>
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Hunt every item. Claim the Grail.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
        {error && (
          <p className="mb-4 rounded-lg bg-red-900/30 border border-red-800/40 px-3 py-2 text-sm text-red-400">
            Sign-in failed. Please try again.
          </p>
        )}

        <button
          onClick={() => signIn("discord", { callbackUrl })}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#5865F2] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5865F2]"
        >
          <DiscordIcon />
          Sign in with Discord
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        {emailSent ? (
          <p className="text-center text-sm text-zinc-400">
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>

      <p className="mt-5 text-center text-xs text-zinc-600">
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

function DiscordIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor" aria-hidden>
      <path d="M15.247 1.18A15.1 15.1 0 0 0 11.54 0a.056.056 0 0 0-.06.028c-.163.29-.344.669-.47.967a13.94 13.94 0 0 0-4.02 0 9.875 9.875 0 0 0-.477-.967A.058.058 0 0 0 6.454 0a15.066 15.066 0 0 0-3.707 1.18.052.052 0 0 0-.025.021C.387 4.728-.232 8.17.072 11.568c.002.017.011.033.024.043a15.17 15.17 0 0 0 4.559 2.307.059.059 0 0 0 .064-.021c.351-.48.663-.985.931-1.517a.057.057 0 0 0-.031-.08 9.988 9.988 0 0 1-1.426-.68.058.058 0 0 1-.006-.096c.096-.072.192-.147.283-.222a.056.056 0 0 1 .059-.008c2.991 1.366 6.23 1.366 9.186 0a.056.056 0 0 1 .06.007c.091.076.187.151.283.223a.058.058 0 0 1-.005.096 9.37 9.37 0 0 1-1.427.679.058.058 0 0 0-.03.08c.273.532.585 1.037.93 1.516a.058.058 0 0 0 .064.022 15.124 15.124 0 0 0 4.567-2.307.059.059 0 0 0 .023-.042c.36-3.93-.603-7.342-2.553-10.368a.046.046 0 0 0-.024-.021ZM6.01 9.479c-.866 0-1.58-.796-1.58-1.773 0-.977.7-1.773 1.58-1.773.887 0 1.594.803 1.58 1.773 0 .977-.7 1.773-1.58 1.773Zm5.84 0c-.866 0-1.58-.796-1.58-1.773 0-.977.7-1.773 1.58-1.773.887 0 1.594.803 1.58 1.773 0 .977-.693 1.773-1.58 1.773Z" />
    </svg>
  );
}
