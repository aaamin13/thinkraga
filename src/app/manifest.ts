import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ThinkRaga",
    short_name: "ThinkRaga",
    description: "Gamified vocal practice for Hindustani classical music.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f1020",
    theme_color: "#0f1020",
    // Placeholder icon; replace with real PNG icons (192/512) before launch.
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
