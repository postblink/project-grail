import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { previewArmoryImport } from "@/lib/armory";
import { getPD2Token } from "@/lib/pd2-api";

const schema = z.object({
  grailId: z.string().min(1),
  characterNames: z.array(z.string().min(1)).max(30).default([]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { grailId, characterNames } = parsed.data;

  const grail = await db.grail.findUnique({ where: { id: grailId }, select: { user_id: true } });
  if (!grail || grail.user_id !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Require at least one character or a linked PD2 account
  const pd2Result = await getPD2Token(session.user.id);
  if (pd2Result.needsRelink) {
    return NextResponse.json({ needsRelink: true, newItems: [], alreadyFound: [], unmatchedNames: [], failedCharacters: [], stashIncluded: false, stashFailed: false });
  }

  if (characterNames.length === 0 && !pd2Result.token) {
    return NextResponse.json({ error: "Provide at least one character name", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const result = await previewArmoryImport(grailId, characterNames, pd2Result.token, pd2Result.sub);
  return NextResponse.json(result);
}
