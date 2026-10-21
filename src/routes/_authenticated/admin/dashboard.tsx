import { createFileRoute } from "@tanstack/react-router";
import { AdminDashboard } from "@/components/portal";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  head: () => ({ meta: [
    { title: "Admin dashboard | SHREE ADS" },
    { name: "description", content: "Manage SHREE ADS courses, students, and payment requests." },
    { property: "og:title", content: "Admin dashboard | SHREE ADS" },
    { property: "og:description", content: "SHREE ADS course administration." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminDashboard,
});