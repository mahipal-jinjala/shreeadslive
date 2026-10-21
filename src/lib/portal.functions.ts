import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizeMobile } from "@/lib/portal-rules";

export const signInWithMobile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      mobile: z.string().trim().min(8).max(20),
      password: z.string().min(1).max(128),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("mobile", normalizeMobile(data.mobile))
      .maybeSingle();

    if (!profile?.email) throw new Error("The mobile number or password is incorrect.");

    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Sign in is temporarily unavailable.");
    const authClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signedIn, error } = await authClient.auth.signInWithPassword({
      email: profile.email,
      password: data.password,
    });
    if (error || !signedIn.session) throw new Error("The mobile number or password is incorrect.");

    return {
      accessToken: signedIn.session.access_token,
      refreshToken: signedIn.session.refresh_token,
    };
  });