"use client";

import { useState, useEffect } from "react";
import type { ArmoryPreviewItem, ArmoryPreviewResult } from "@/lib/armory";
import type { PD2CharacterInfo } from "@/app/api/user/pd2/characters/route";

type Step = "idle" | "previewing" | "preview" | "confirming" | "done";

interface Props {
  grailId: string;
  pd2Linked: boolean;
  onImportComplete: (foundItemIds: string[]) => void;
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ArmoryImport({ grailId, pd2Linked, onImportComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [charInput, setCharInput] = useState("");
  const [characters, setCharacters] = useState<PD2CharacterInfo[] | null>(null);
  const [selectedChars, setSelectedChars] = useState<Set<string>>(new Set());
  const [charsFailed, setCharsFailed] = useState(false);
  const [preview, setPreview] = useState<ArmoryPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  const savedCharsKey = `armory-selected-chars-${grailId}`;

  useEffect(() => {
    if (!open || !pd2Linked || characters !== null) return;
    fetch("/api/user/pd2/characters")
      .then((r) => r.json())
      .then((data: { characters?: PD2CharacterInfo[] }) => {
        if (data.characters) {
          setCharacters(data.characters);
          const names = data.characters.map((c) => c.name);
          try {
            const saved = localStorage.getItem(savedCharsKey);
            const savedSet = saved ? new Set<string>(JSON.parse(saved)) : null;
            const restored = savedSet
              ? new Set(names.filter((n) => savedSet.has(n)))
              : null;
            setSelectedChars(restored?.size ? restored : new Set(names));
          } catch {
            setSelectedChars(new Set(names));
          }
        } else {
          setCharsFailed(true);
        }
      })
      .catch(() => setCharsFailed(true));
  }, [open, pd2Linked, characters, savedCharsKey]);

  function getCharNames(): string[] {
    if (pd2Linked && characters !== null) {
      return [...selectedChars];
    }
    return charInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function handlePreview() {
    const names = getCharNames();
    if (!names.length && !pd2Linked) return;

    setStep("previewing");
    setError(null);

    try {
      const res = await fetch("/api/grail/armory/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grailId, characterNames: names }),
      });
      if (!res.ok) throw new Error("Preview request failed");

      const data = (await res.json()) as ArmoryPreviewResult;

      if (data.needsRelink) {
        setError("Your PD2 account connection has expired. Re-link it in Settings to include your shared stash.");
        setStep("idle");
        return;
      }

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
          characters: getCharNames(),
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

  function toggleChar(name: string) {
    setSelectedChars((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      try { localStorage.setItem(savedCharsKey, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
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

  const canPreview = step !== "previewing" && (getCharNames().length > 0 || pd2Linked);

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
              ? "All items were already marked found."
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
          {pd2Linked && characters !== null ? (
            <div>
              <label className="mb-2 block text-xs text-zinc-500">
                Select characters to import — shared stash included automatically
              </label>
              {characters.length === 0 ? (
                <p className="text-xs text-zinc-600">No characters found on this account.</p>
              ) : (
                <div className="space-y-1.5">
                  {characters.map((char) => (
                    <label key={char.name} className="flex items-start gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedChars.has(char.name)}
                        onChange={() => toggleChar(char.name)}
                        className="mt-0.5 rounded border-zinc-600 bg-zinc-800 text-amber-600 focus:ring-amber-600"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm text-zinc-300 group-hover:text-zinc-100">{char.name}</span>
                          {char.is_hardcore && (
                            <span className="text-[10px] font-semibold px-1 py-px rounded bg-red-950 text-red-400 border border-red-800">HC</span>
                          )}
                          {char.is_ladder && (
                            <span className="text-[10px] font-semibold px-1 py-px rounded bg-amber-950 text-amber-400 border border-amber-800">Ladder</span>
                          )}
                        </div>
                        {(char.class ?? char.level ?? char.updated_at) && (
                          <div className="text-[11px] text-zinc-600 flex items-center gap-1 flex-wrap">
                            {char.class && <span>{char.class}</span>}
                            {char.level && <span>Lv {char.level}</span>}
                            {char.updated_at && (
                              <>
                                <span className="text-zinc-700">·</span>
                                <span>saved {timeAgo(char.updated_at)}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ) : pd2Linked && characters === null && !charsFailed ? (
            <p className="text-xs text-zinc-500">Loading characters…</p>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs text-zinc-500">
                {charsFailed
                  ? "Could not load character list — enter names manually"
                  : pd2Linked
                  ? "Character names (optional — stash is included automatically)"
                  : "Character names (one per line or comma-separated)"}
              </label>
              <textarea
                value={charInput}
                onChange={(e) => setCharInput(e.target.value)}
                placeholder={"MyAmazon\nMyNecromancer, MyMule"}
                rows={3}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500 resize-none"
              />
              {!pd2Linked && (
                <p className="mt-1.5 text-xs text-zinc-500">
                  Import reflects your characters&apos; current inventory. Items in your shared stash or
                  previously traded away will need to be checked off manually.{" "}
                  <a href="/settings" className="text-zinc-400 underline hover:text-zinc-200">
                    Link your PD2 account
                  </a>{" "}
                  to include your shared stash.
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-zinc-600">
            Armory data updates when you log out of a character. Log out in-game first to ensure your latest inventory and stash are reflected.
          </p>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={handlePreview}
            disabled={!canPreview}
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
      {preview.stashFailed && (
        <p className="text-xs text-amber-500">
          Could not fetch shared stash — character imports will still proceed.
        </p>
      )}
      {preview.stashNotFound && (
        <p className="text-xs text-zinc-500">
          Shared stash not available yet — open your shared stash in-game once to initialize it, then try again.
        </p>
      )}
      {preview.stashEmpty && (
        <p className="text-xs text-zinc-500">Shared stash: no trackable items found.</p>
      )}
      {preview.stashIncluded && (
        <p className="text-xs text-zinc-500">Shared stash included.</p>
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
