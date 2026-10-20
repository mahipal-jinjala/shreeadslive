import { createFileRoute } from "@tanstack/react-router";
import { StudentDashboard } from "@/components/portal";

export const Route = createFileRoute("/student/dashboard")({
  head: () => ({ meta: [
    { title: "My learning | SHREE ADS" },
    { name: "description", content: "Manage SHREE ADS courses, payments, and student profile." },
    { property: "og:title", content: "My learning | SHREE ADS" },
    { property: "og:description", content: "Your SHREE ADS course dashboard." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: StudentDashboard,
});