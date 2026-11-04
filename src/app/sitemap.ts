import type { MetadataRoute } from "next";
import { brand } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/hotellerie-restauration", "/tarifs", "/securite", "/inscription", "/mentions-legales", "/confidentialite", "/cgu"].map((p) => ({
    url: `${brand.siteUrl}${p}`,
    changeFrequency: "monthly",
    priority: p === "" ? 1 : 0.6,
  }));
}
