import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "COO Schedule",
    short_name: "COO",
    description: "Πρόγραμμα βαρδιών COO cafe-bar",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFBEA",
    theme_color: "#FFD800",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
