"use client";

import { useState } from "react";
import type { ArmoryPreviewItem, ArmoryPreviewResult } from "@/lib/armory";

type Step = "idle" | "previewing" | "preview" | "confirming" | "done";

interface Props {
  grailId: string;
  onImportComplete: (foundItemIds: string[]) => void;
}

export function ArmoryImport({ grailId, onImportComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [charInput, setCharInput] = useState("");
  const [preview, setPreview] = useState<ArmoryPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  function parseCharNames(): string[] {
    return charInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handlePreview() {
    const names = parseCharNames();
    if (!names.length) return;

    setStep("previewing");
    setError(null);

    try {
      const res = await fetch("/api/grail/armory/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grailId, characterNames: names }),
      });
      if (!res.ok) {
        throw new Error("Preview request failed");
      }
      const data = (await res.json()) as ArmoryPreviewResult;
      setPreview(data);
      setStep("preview");
    } catch {
      setError("Could not fetch armory data. Check the character names and try again.");
      setStep("idle");
    }
  }

  async function handleConfirm() {
    if (!preview?.newItems.length) return;

    setStep("confirming");
    setError(null);

    try {
      const res = await fetch("/api/grail/armory/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grailId,
          itemIds: preview.newItems.map((i) => i.id),
          characters: parseCharNames(),
        }),
      });
      if (!res.ok) throw new Error("Confirm failed");

      const { added } = (await res.json()) as { added: number };
      setAddedCount(added);
      setStep("done");
      onImportComplete(preview.newItems.map((i) => i.id));
    } catch {
      setError("Import failed. Please try again.");
      setStep("preview");
    }
  }

  function reset() {
    setStep("idle");
    setPreview(null);
    setError(null);
    setCharInput("");
    setAddedCount(0);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
      >
        Import from Armory
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-300">Armory Import</h3>
        <button
          onClick={() => { setOpen(false); reset(); }}
          className="text-xs text-zinc-600 hover:text-zinc-400"
        >
          Close
        </button>
      </div>

      {step === "done" ? (
        <div className="space-y-3">
          <p className="text-sm text-amber-300">
            {addedCount === 0
              ? "All items from these characters were already marked found."
              : `${addedCount} item${addedCount !== 1 ? "s" : ""} marked found.`}
          </p>
          <button
            onClick={() => { setOpen(false); reset(); }}
            className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
          >
            Done
          </button>
        </div>
      ) : step === "preview" && preview ? (
        <PreviewStep
          preview={preview}
          onConfirm={handleConfirm}
          onBack={() => setStep("idle")}
          confirming={false}
          error={error}
        />
      ) : step === "confirming" && preview ? (
        <PreviewStep
          preview={preview}
          onConfirm={handleConfirm}
          onBack={() => setStep("idle")}
          confirming={true}
          error={error}
        />
      ) : (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs text-zinc-500">
              Character names (one per line or comma-separated)
            </label>
            <textarea
              value={charInput}
              onChange={(e) => setCharInput(e.target.value)}
              placeholder={"MyAmazon\nMyNecromancer, MyMule"}
              rows={3}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500 resize-none"
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Import reflects your characters&apos; current inventory. Items in your shared stash or
              previously traded away will need to be checked off manually.
            </p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handlePreview}
            disabled={step === "previewing" || !charInput.trim()}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === "previewing" ? "Fetching…" : "Preview Import"}
          </button>
        </div>
      )}
    </div>
  );
}

function PreviewStep({
  preview,
  onConfirm,
  onBack,
  confirming,
  error,
}: {
  preview: ArmoryPreviewResult;
  onConfirm: () => void;
  onBack: () => void;
  confirming: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-4">
      {preview.failedCharacters.length > 0 && (
        <p className="text-xs text-amber-500">
          Could not fetch data for: {preview.failedCharacters.join(", ")}
        </p>
      )}

      {preview.newItems.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No new items found. All parsed items are already marked found.
        </p>
      ) : (
        <div>
          <p className="mb-2 text-sm text-zinc-300">
            <span className="font-semibold text-amber-300">{preview.newItems.length}</span>{" "}
            item{preview.newItems.length !== 1 ? "s" : ""} will be marked found
            {preview.alreadyFound.length > 0 && (
              <span className="text-zinc-500">
                {" "}· {preview.alreadyFound.length} already found
              </span>
            )}
          </p>
          <ItemList items={preview.newItems} />
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={onBack}
          disabled={confirming}
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 disabled:opacity-50"
        >
          Back
        </button>
        {preview.newItems.length > 0 && (
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="rounded-lg bg-amber-700 px-4 py-1.5 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {confirming ? "Importing…" : `Mark ${preview.newItems.length} Found`}
          </button>
        )}
      </div>
    </div>
  );
}

function ItemList({ items }: { items: ArmoryPreviewItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 10;
  const shown = expanded ? items : items.slice(0, LIMIT);

  return (
    <div className="rounded-lg border border-zinc-800 divide-y divide-zinc-800 max-h-64 overflow-y-auto">
      {shown.map((item) => (
        <div key={item.id} className="flex items-center gap-2 px-3 py-1.5">
          <span className="text-xs font-medium text-zinc-300">{item.name}</span>
          {item.item_type && (
            <span className="text-xs text-zinc-600">{item.item_type}</span>
          )}
          {item.set_name && (
            <span className="text-xs text-zinc-600">{item.set_name}</span>
          )}
        </div>
      ))}
      {!expanded && items.length > LIMIT && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 text-left"
        >
          + {items.length - LIMIT} more
        </button>
      )}
    </div>
  );
}
