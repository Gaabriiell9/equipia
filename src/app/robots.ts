import type { MetadataRoute } from "next";
import { brand } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/api", "/onboarding", "/auth", "/bienvenue"] }],
    sitemap: `${brand.siteUrl}/sitemap.xml`,
  };
}
