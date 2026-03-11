import type { MetadataRoute } from "next";
import { readPublicEnv } from "@/lib/env";

const siteUrl = readPublicEnv("NEXT_PUBLIC_SITE_URL") || "https://wurder.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}


