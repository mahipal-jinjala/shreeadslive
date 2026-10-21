import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => { throw redirect({ to: "/admin/dashboard" }); },
  head: () => ({ meta: [
    { title: "Administration | SHREE ADS" },
    { name: "description", content: "Protected SHREE ADS administration workspace." },
    { property: "og:title", content: "Administration | SHREE ADS" },
    { property: "og:description", content: "Protected SHREE ADS administration workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});