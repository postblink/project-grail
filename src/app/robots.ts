import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/grail/"],
      disallow: ["/dashboard", "/settings", "/admin", "/api/"],
    },
    sitemap: "https://pd2grail.com/sitemap.xml",
  };
}
