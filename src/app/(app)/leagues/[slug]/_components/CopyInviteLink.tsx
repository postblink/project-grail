"use client";

import { useState } from "react";

export function CopyInviteLink({ slug, inviteCode }: { slug: string; inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/leagues/${slug}?code=${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-lg bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors flex-shrink-0"
    >
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}
