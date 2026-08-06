import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://forma.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/home", "/scan", "/onboarding", "/alerts", "/wardrobe", "/profile", "/analysis/demo"];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "daily",
    priority: route === "" ? 1 : 0.8,
  }));
}
