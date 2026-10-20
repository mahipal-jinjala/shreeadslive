import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/portal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SHREE ADS | Practical Video Courses" },
      { name: "description", content: "Learn practical, creator-ready skills at your own pace with SHREE ADS video courses." },
      { property: "og:title", content: "SHREE ADS | Practical Video Courses" },
      { property: "og:description", content: "Focused video courses to build practical skills and keep your next move in motion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});
