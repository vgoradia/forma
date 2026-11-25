import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forma",
    short_name: "Forma",
    description: "Buy or skip before you checkout.",
    start_url: "/scan?utm_source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#1A1B26",
    theme_color: "#1A1B26",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
