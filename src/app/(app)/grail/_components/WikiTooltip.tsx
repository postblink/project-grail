"use client";

import { useState, useRef, useCallback } from "react";
import type { WikiItemInfo } from "@/app/api/wiki-item/route";

interface Props {
  wikiUrl: string;
  wikiImageUrl: string;
  itemName: string;
  itemType?: string | null;
  setName?: string | null;
  category: string;
}

type FetchState = "idle" | "loading" | "done" | "error";

// Module-level cache keyed by wiki title
const infoCache = new Map<string, WikiItemInfo | null>();

const CATEGORY_COLORS: Record<string, string> = {
  unique: "text-[#C7B377]",
  set: "text-emerald-400",
  runeword: "text-orange-400",
  rune: "text-amber-400",
};

export function WikiTooltip({ wikiUrl, wikiImageUrl, itemName, itemType, setName, category }: Props) {
  const [visible, setVisible] = useState(false);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [info, setInfo] = useState<WikiItemInfo | null>(null);
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchInfo = useCallback(async () => {
    const title = wikiUrl.split("/wiki/").pop() ?? encodeURIComponent(itemName);

    if (infoCache.has(title)) {
      setInfo(infoCache.get(title) ?? null);
      setFetchState("done");
      return;
    }

    setFetchState("loading");
    try {
      const res = await fetch(`/api/wiki-item?title=${title}&category=${encodeURIComponent(category)}`);
      const data = (await res.json()) as { info: WikiItemInfo | null };
      infoCache.set(title, data.info);
      setInfo(data.info);
      setFetchState("done");
    } catch {
      setFetchState("error");
    }
  }, [wikiUrl, itemName]);

  function handleMouseEnter() {
    timerRef.current = setTimeout(() => {
      setVisible(true);
      if (fetchState === "idle") fetchInfo();
    }, 200);
  }

  function handleMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }

  const nameColor = CATEGORY_COLORS[category] ?? "text-zinc-300";

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Wiki link icon */}
      <a
        href={wikiUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="flex items-center opacity-30 hover:opacity-100 transition-opacity text-zinc-400 hover:text-zinc-200"
        title="View on wiki"
      >
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7" />
          <path d="M8 1h3v3M11 1 6 6" />
        </svg>
      </a>

      {/* Tooltip card */}
      {visible && (
        <div className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none w-56">
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">

            {/* Item image */}
            {wikiImageUrl && !imgError && (
              <div className="flex items-center justify-center bg-zinc-950 px-4 py-3 min-h-[72px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wikiImageUrl}
                  alt={itemName}
                  onError={() => setImgError(true)}
                  className="max-h-24 max-w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
            )}

            {/* Header: name + base info */}
            <div className="px-3 pt-2 pb-1.5 border-t border-zinc-800">
              <p className={`text-sm font-bold leading-tight ${nameColor}`}>{itemName}</p>
              {setName && <p className="text-xs text-zinc-400 mt-0.5">{setName}</p>}

              {fetchState === "done" && info && (
                <div className="mt-1 space-y-0.5">
                  {info.baseType && (
                    <p className="text-xs text-zinc-400">{info.baseType}</p>
                  )}
                  {info.runeCombo && (
                    <p className="text-xs text-amber-600/80">{info.runeCombo}</p>
                  )}
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {info.defense && (
                      <span className="text-xs text-zinc-500">Def: {info.defense}</span>
                    )}
                    {info.damage && (
                      <span className="text-xs text-zinc-500">{info.damage}</span>
                    )}
                    {info.requiredLevel !== null && (
                      <span className="text-xs text-zinc-500">Req Lvl: {info.requiredLevel}</span>
                    )}
                    {info.requiredStrength !== null && (
                      <span className="text-xs text-zinc-500">Str: {info.requiredStrength}</span>
                    )}
                    {info.requiredDexterity !== null && (
                      <span className="text-xs text-zinc-500">Dex: {info.requiredDexterity}</span>
                    )}
                  </div>
                </div>
              )}

              {(fetchState === "idle" || fetchState === "loading") && (
                <p className="text-xs text-zinc-700 mt-1">Loading…</p>
              )}
            </div>

            {/* Stats list */}
            {fetchState === "done" && info && info.stats.length > 0 && (
              <div className="px-3 pb-2.5 pt-1 border-t border-zinc-800 space-y-0.5">
                {info.stats.map((stat, i) => (
                  <p key={i} className="text-xs text-sky-300/80 leading-snug">{stat}</p>
                ))}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
