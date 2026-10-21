import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { readPortalSession } from "@/lib/portal-session";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    const session = await readPortalSession();
    if (!session) throw redirect({ to: "/auth" });
    if (session.role !== "admin") throw redirect({ to: "/student/dashboard" });
  },
  component: Outlet,
});