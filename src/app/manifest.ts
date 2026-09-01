import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cued",
    short_name: "Cued",
    description: "Your self-hosted media discovery companion",
    start_url: "/en",
    display: "standalone",
    background_color: "#171513",
    theme_color: "#d96438",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
