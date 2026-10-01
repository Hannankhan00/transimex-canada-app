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
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
