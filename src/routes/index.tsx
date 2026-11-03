import { createFileRoute } from "@tanstack/react-router";
import SolenneGrand from "@/components/SolenneGrand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solenne Grand — Five-Star Hotel" },
      { name: "description", content: "A five-star retreat among olive gardens: spa, fine dining and suites, from morning light to quiet nights." },
      { property: "og:title", content: "Solenne Grand — Five-Star Hotel" },
      { property: "og:description", content: "Spa, fine dining and suites wrapped in morning light and quiet nights." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SolenneGrand,
});
