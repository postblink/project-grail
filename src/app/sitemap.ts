import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://pd2grail.com";

  // Public grail profiles — users with a display_name set.
  //
  // This runs at BUILD time, so an unreachable database used to fail the whole
  // deploy: preview builds have no DATABASE_URL and died on 127.0.0.1:5432, and
  // a transient blip during a production deploy would have done the same. A
  // sitemap missing its profile URLs is recoverable on the next build; an
  // undeployable app is not. Degrade to the static routes instead.
  let grailPages: MetadataRoute.Sitemap = [];
  try {
    const users = await db.user.findMany({
      where: { display_name: { not: null }, deleted_at: null },
      select: { display_name: true, created_at: true },
    });

    grailPages = users
      .filter((u) => u.display_name)
      .map((u) => ({
        url: `${baseUrl}/grail/${encodeURIComponent(u.display_name!)}`,
        lastModified: u.created_at,
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
  } catch (error) {
    console.warn(
      "[sitemap] profile listing unavailable — emitting static routes only:",
      error instanceof Error ? error.message : error,
    );
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...grailPages,
  ];
}
