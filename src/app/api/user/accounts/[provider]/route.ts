import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const UNLINKABLE_PROVIDERS = ["discord", "pd2"];

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { provider } = await params;

  if (!UNLINKABLE_PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Cannot unlink this provider" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await db.$transaction(async (tx: any) => {
      // Atomic check: count other sign-in methods inside the transaction
      const otherCount = await tx.account.count({
        where: { userId: session.user.id, provider: { notIn: [provider, "pd2"] } },
      });
      if (otherCount === 0) {
        throw new Error("LAST_METHOD");
      }

      await tx.account.deleteMany({ where: { userId: session.user.id, provider } });

      if (provider === "discord") {
        await tx.user.update({
          where: { id: session.user.id },
          data: { discord_id: null },
        });
      }
    });
  } catch (err) {
    if (err instanceof Error && err.message === "LAST_METHOD") {
      return NextResponse.json(
        { error: "Cannot unlink your only sign-in method" },
        { status: 400 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}
