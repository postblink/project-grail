import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  end_date: z.string().date().optional().nullable(),
  is_current: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const season = await db.season.findUnique({ where: { id }, select: { id: true } });
  if (!season) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const { name, end_date, is_current, is_active } = parsed.data;

  const updated = await db.$transaction(async (tx) => {
    // Marking this season current clears all others first
    if (is_current === true) {
      await tx.season.updateMany({ data: { is_current: false } });
    }
    return tx.season.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(end_date !== undefined && { end_date: end_date ? new Date(end_date) : null }),
        ...(is_current !== undefined && { is_current }),
        ...(is_active !== undefined && { is_active }),
      },
    });
  });

  return NextResponse.json({ season: updated });
}
