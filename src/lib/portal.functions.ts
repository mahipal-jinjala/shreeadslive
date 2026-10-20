import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
      .eq("mobile", data.mobile)
      .maybeSingle();

    if (!profile?.email) throw new Error("The mobile number or password is incorrect.");

    const { data: signedIn, error } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password: data.password,
    });
    if (error || !signedIn.session) throw new Error("The mobile number or password is incorrect.");

    return {
      accessToken: signedIn.session.access_token,
      refreshToken: signedIn.session.refresh_token,
    };
  });