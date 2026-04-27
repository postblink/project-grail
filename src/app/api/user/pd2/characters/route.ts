import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token, getPD2Characters } from "@/lib/pd2-api";

export interface PD2CharacterInfo {
  name: string;
  class: string | null;
  level: number | null;
  is_hardcore: boolean;
  is_ladder: boolean;
  updated_at: number | null;
}

async function fetchCharacterDetails(name: string): Promise<PD2CharacterInfo> {
  try {
    const res = await fetch(
      `https://api.projectdiablo2.com/game/character/${encodeURIComponent(name)}`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) return fallback(name);
    const data = (await res.json()) as {
      character?: {
        class?: { name?: string };
        level?: number;
        status?: { is_hardcore?: boolean; is_ladder?: boolean };
      };
      file?: { updated_at?: number };
    };
    return {
      name,
      class: data.character?.class?.name ?? null,
      level: data.character?.level ?? null,
      is_hardcore: data.character?.status?.is_hardcore ?? false,
      is_ladder: data.character?.status?.is_ladder ?? false,
      updated_at: data.file?.updated_at ?? null,
    };
  } catch {
    return fallback(name);
  }
}

function fallback(name: string): PD2CharacterInfo {
  return { name, class: null, level: null, is_hardcore: false, is_ladder: false, updated_at: null };
}

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pd2Result = await getPD2Token(session.user.id);
  if (!pd2Result.token) {
    return NextResponse.json({ characters: [], needsRelink: pd2Result.needsRelink });
  }

  const names = await getPD2Characters(pd2Result.username);
  if (names === null) {
    return NextResponse.json({ error: "Could not fetch character list" }, { status: 502 });
  }

  const characters = await Promise.all(names.map(fetchCharacterDetails));

  // Ladder (current season) characters first, then alphabetical within each group
  characters.sort((a, b) => {
    if (a.is_ladder !== b.is_ladder) return a.is_ladder ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ characters });
}
