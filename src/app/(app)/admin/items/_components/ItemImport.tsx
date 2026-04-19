"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ImportResult {
  created: number;
  updated: number;
  total: number;
}

export function ItemImport() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setResult(null);
    setPending(true);

    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch {
      setError("Invalid JSON file");
      setPending(false);
      e.target.value = "";
      return;
    }

    const res = await fetch("/api/admin/items/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });

    const data = await res.json().catch(() => ({}));
    setPending(false);
    e.target.value = "";

    if (!res.ok) {
      setError(data.error ?? "Import failed");
      return;
    }

    setResult(data as ImportResult);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-300">Import Items (JSON)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Upserts items by name — existing items are updated, new ones are created. Max 2,000 per file.
        </p>
      </div>

      <label className={`flex items-center gap-3 cursor-pointer w-fit rounded-lg border px-4 py-2 text-sm transition-colors ${
        pending
          ? "border-zinc-700 text-zinc-500 cursor-not-allowed"
          : "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
      }`}>
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {pending ? "Importing…" : "Choose JSON file"}
        <input
          type="file"
          accept=".json,application/json"
          disabled={pending}
          onChange={handleFile}
          className="sr-only"
        />
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {result && (
        <div className="rounded-lg bg-emerald-900/20 border border-emerald-800/40 px-4 py-3 text-sm text-emerald-300">
          Import complete: {result.created} created, {result.updated} updated ({result.total} total)
        </div>
      )}
    </div>
  );
}
