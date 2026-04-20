"use client";

import { useState, useRef } from "react";

interface Props {
  wikiUrl: string;
  wikiImageUrl: string;
  itemName: string;
  itemType?: string | null;
  setName?: string | null;
  category: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  unique: "text-[#C7B377]",
  set: "text-emerald-400",
  runeword: "text-orange-400",
  rune: "text-amber-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  unique: "Unique",
  set: "Set Item",
  runeword: "Runeword",
  rune: "Rune",
};

export function WikiTooltip({ wikiUrl, wikiImageUrl, itemName, itemType, setName, category }: Props) {
  const [visible, setVisible] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleMouseEnter() {
    timerRef.current = setTimeout(() => setVisible(true), 180);
  }

  function handleMouseLeave() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }

  const nameColor = CATEGORY_COLORS[category] ?? "text-zinc-300";
  const categoryLabel = CATEGORY_LABELS[category] ?? category;

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
        <div
          className="absolute bottom-full right-0 mb-2 z-50 pointer-events-none w-48"
        >
          <div className="rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
            {/* Item image */}
            {!imgError && (
              <div className="flex items-center justify-center bg-zinc-950 px-4 py-3 min-h-[80px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={wikiImageUrl}
                  alt={itemName}
                  onError={() => setImgError(true)}
                  className="max-h-28 max-w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </div>
            )}

            {/* Item info */}
            <div className="px-3 py-2 space-y-0.5 border-t border-zinc-800">
              <p className={`text-sm font-bold leading-tight ${nameColor}`}>{itemName}</p>
              {setName && <p className="text-xs text-zinc-400">{setName}</p>}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-zinc-600">{categoryLabel}</span>
                {itemType && (
                  <>
                    <span className="text-xs text-zinc-700">·</span>
                    <span className="text-xs text-zinc-600 capitalize">{itemType}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
