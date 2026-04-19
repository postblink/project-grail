"use client";

import { useEffect, useState } from "react";

function format(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RelativeTime({ date }: { date: Date }) {
  const [label, setLabel] = useState(() => format(date));

  useEffect(() => {
    const id = setInterval(() => setLabel(format(date)), 60_000);
    return () => clearInterval(id);
  }, [date]);

  return (
    <time dateTime={date.toISOString()} title={date.toLocaleString()}>
      {label}
    </time>
  );
}
