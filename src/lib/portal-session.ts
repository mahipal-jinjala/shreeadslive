import { supabase } from "@/integrations/supabase/client";

export type PortalRole = "admin" | "student";

export interface PortalSession {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  role: PortalRole;
}

export async function readPortalSession(): Promise<PortalSession | null> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const user = authData.user;
  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("full_name,email,mobile").eq("id", user.id).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", user.id),
  ]);

  const role = roles?.some((item) => item.role === "admin") ? "admin" : "student";
  return {
    id: user.id,
    email: user.email ?? profile?.email ?? "",
    fullName: profile?.full_name ?? (typeof user.user_metadata["full_name"] === "string" ? user.user_metadata["full_name"] : "Student"),
    mobile: profile?.mobile ?? (typeof user.user_metadata["mobile"] === "string" ? user.user_metadata["mobile"] : ""),
    role,
  };
}

export function formatRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function createCourseSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}