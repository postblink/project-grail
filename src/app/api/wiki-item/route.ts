import { NextResponse } from "next/server";
import { fetchWikiItemInfo } from "@/lib/wiki";

export type { WikiItemInfo } from "@/lib/wiki";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title");
  const category = searchParams.get("category") ?? "";
  if (!title) return NextResponse.json({ info: null });

  try {
    const itemName = decodeURIComponent(title).replace(/_/g, " ");
    const info = await fetchWikiItemInfo(itemName, category);
    return NextResponse.json({ info });
  } catch {
    return NextResponse.json({ info: null });
  }
}
