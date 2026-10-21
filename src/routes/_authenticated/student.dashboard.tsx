import { createFileRoute, redirect } from "@tanstack/react-router";
import { StudentDashboard } from "@/components/portal";
import { readPortalSession } from "@/lib/portal-session";

export const Route = createFileRoute("/_authenticated/student/dashboard")({
  beforeLoad: async () => {
    const session = await readPortalSession();
    if (session?.role === "admin") throw redirect({ to: "/admin/dashboard" });
  },
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