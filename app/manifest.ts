import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Transimex Canada Logistics",
    short_name: "Transimex",
    description: "Transimex Canada client portal — track shipments, quotes, and customs documentation.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#0B2545",
    icons: [
      { src: "/api/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
