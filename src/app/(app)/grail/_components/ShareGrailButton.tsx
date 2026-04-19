"use client";

import { useState } from "react";

export function ShareGrailButton({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/grail/${encodeURIComponent(username)}`;

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      {copied ? "Link copied!" : "Share grail →"}
    </button>
  );
}
