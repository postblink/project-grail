import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  const counts = await db.$queryRaw<{ users: bigint; grails: bigint; entries: bigint }[]>`
    SELECT
      (SELECT COUNT(*) FROM users) AS users,
      (SELECT COUNT(*) FROM grails) AS grails,
      (SELECT COUNT(*) FROM grail_entries) AS entries
  `;
  return NextResponse.json({
    session: session ? { id: session.user.id, name: session.user.display_name } : null,
    db: { users: counts[0].users.toString(), grails: counts[0].grails.toString(), entries: counts[0].entries.toString() },
  });
}
