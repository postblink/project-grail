import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getMemberRole, isCommissioner } from "@/lib/leagues";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; userId: string }> },
) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, userId } = await params;
  const league = await db.league.findUnique({
    where: { slug },
    select: { id: true, commissioner_id: true },
  });
  if (!league) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isSelf = session.user.id === userId;
  const actorRole = await getMemberRole(league.id, session.user.id);

  // Self-leave is always allowed. Kicking requires commissioner role.
  // The commissioner themselves cannot leave (they must transfer or close the league).
  if (!isSelf && !isCommissioner(actorRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (isSelf && league.commissioner_id === session.user.id) {
    return NextResponse.json({ error: "Commissioner cannot leave. Transfer ownership first." }, { status: 422 });
  }
  // Commissioner cannot kick themselves via this route either
  if (!isSelf && userId === league.commissioner_id) {
    return NextResponse.json({ error: "Cannot remove the commissioner" }, { status: 403 });
  }

  const member = await db.leagueMember.findUnique({
    where: { league_id_user_id: { league_id: league.id, user_id: userId } },
  });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  await db.leagueMember.delete({
    where: { league_id_user_id: { league_id: league.id, user_id: userId } },
  });

  return new NextResponse(null, { status: 204 });
}
