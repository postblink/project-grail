import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://pd2grail.com";

  // Public grail profiles — users with a display_name set
  const users = await db.user.findMany({
    where: { display_name: { not: null }, deleted_at: null },
    select: { display_name: true, created_at: true },
  });

  const grailPages = users
    .filter((u) => u.display_name)
    .map((u) => ({
      url: `${baseUrl}/grail/${encodeURIComponent(u.display_name!)}`,
      lastModified: u.created_at,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

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
