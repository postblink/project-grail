import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { canAttestDiscovery } from "@/lib/discovery";

const schema = z.object({
  grailId: z.string().min(1),
  itemId: z.string().min(1),
  discoveryDropAttested: z.boolean(),
  discoveryIdentificationAttested: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const {
    grailId,
    itemId,
    discoveryDropAttested,
    discoveryIdentificationAttested,
  } = parsed.data;

  try {
    const entry = await db.grailEntry.findUnique({
      where: { grail_id_item_id: { grail_id: grailId, item_id: itemId } },
      select: {
        found: true,
        grail: {
          select: {
            user_id: true,
            season: { select: { slug: true } },
          },
        },
        item: { select: { category: true } },
      },
    });

    if (!entry || entry.grail.user_id !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!canAttestDiscovery(entry.grail.season?.slug ?? null, entry.item.category, entry.found)) {
      return NextResponse.json(
        {
          error: "Discovery attestations require a found Unique or Set item in Season 14",
          code: "DISCOVERY_NOT_APPLICABLE",
        },
        { status: 409 },
      );
    }

    // The found=true predicate prevents an attestation racing with an uncheck/reset.
    const result = await db.grailEntry.updateMany({
      where: { grail_id: grailId, item_id: itemId, found: true },
      data: {
        discovery_drop_attested: discoveryDropAttested,
        discovery_identification_attested: discoveryIdentificationAttested,
      },
    });
    if (result.count !== 1) {
      return NextResponse.json(
        { error: "Item is no longer marked found", code: "ITEM_NOT_FOUND" },
        { status: 409 },
      );
    }

    return NextResponse.json({
      entry: {
        discoveryDropAttested,
        discoveryIdentificationAttested,
      },
    });
  } catch (error) {
    console.error("Failed to update S14 Discovery attestation", error);
    return NextResponse.json({ error: "Unable to update Discovery attestation" }, { status: 500 });
  }
}
