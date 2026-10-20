import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/portal";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in | SHREE ADS" },
    { name: "description", content: "Sign in or create a student account for SHREE ADS video courses." },
    { property: "og:title", content: "Sign in | SHREE ADS" },
    { property: "og:description", content: "Access your SHREE ADS courses, payment history, and student profile." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});