import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meine App",
    short_name: "MeineApp",
    description: "Progressive Web App für eine app-ähnliche Nutzung der Meine App Plattform.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#004b99",
    lang: "de",
    scope: "/",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/maskable-icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
