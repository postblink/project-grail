import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const schema = z.object({
  display_name: z.string().min(2).max(32).regex(/^[a-zA-Z0-9_\- ]+$/, "Only letters, numbers, spaces, hyphens, and underscores").optional(),
  is_public: z.boolean().optional(),
}).refine((d) => d.display_name !== undefined || d.is_public !== undefined, {
  message: "Provide at least one field to update",
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { display_name, is_public } = parsed.data;

  if (display_name !== undefined) {
    const existing = await db.user.findFirst({
      where: { display_name: { equals: display_name, mode: "insensitive" }, NOT: { id: session.user.id } },
    });
    if (existing) {
      return NextResponse.json({ error: "That name is already taken" }, { status: 409 });
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(display_name !== undefined && { display_name }),
      ...(is_public !== undefined && { is_public }),
    },
  });

  return NextResponse.json({ ok: true });
}
