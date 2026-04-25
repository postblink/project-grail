import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPD2Token, getPD2Characters } from "@/lib/pd2-api";

export async function GET() {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pd2Result = await getPD2Token(session.user.id);
  if (!pd2Result.token) {
    return NextResponse.json({ characters: [], needsRelink: pd2Result.needsRelink });
  }

  const characters = await getPD2Characters(pd2Result.username);
  if (characters === null) {
    return NextResponse.json({ error: "Could not fetch character list" }, { status: 502 });
  }

  return NextResponse.json({ characters });
}
