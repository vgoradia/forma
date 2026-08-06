import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/app-url";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppUrl();
  const routes = ["", "/about", "/home", "/scan", "/onboarding", "/alerts", "/wardrobe", "/profile", "/analysis/demo"];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "daily",
    priority: route === "" ? 1 : 0.8,
  }));
}
