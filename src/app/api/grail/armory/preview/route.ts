import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { previewArmoryImport } from "@/lib/armory";

const schema = z.object({
  grailId: z.string().min(1),
  characterNames: z.array(z.string().min(1)).min(1).max(10),
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

  const result = await previewArmoryImport(grailId, characterNames);
  return NextResponse.json(result);
}
