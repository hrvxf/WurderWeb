import type { MetadataRoute } from "next";
import { readPublicEnv } from "@/lib/env";

const siteUrl = readPublicEnv("NEXT_PUBLIC_SITE_URL") || "https://wurder.app";

const routes = ["", "/product", "/business", "/download", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}


