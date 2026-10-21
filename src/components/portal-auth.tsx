import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readPortalSession, type PortalSession } from "@/lib/portal-session";
import { toast } from "sonner";

const AuthContext = createContext<{ session: PortalSession | null; loading: boolean }>({ session: null, loading: true });
export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    let revision = 0;
    async function refresh() {
      const current = ++revision;
      try { const value = await readPortalSession(); if (active && current === revision) setSession(value); }
      catch (e) { if (active) toast.error(e instanceof Error ? e.message : "Could not load your account."); }
      finally { if (active && current === revision) setLoading(false); }
    }
    void refresh();
    const { data } = supabase.auth.onAuthStateChange(event => {
      if (!["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) return;
      if (event === "SIGNED_OUT") { ++revision; setSession(null); setLoading(false); }
      setTimeout(() => {
        if (!active) return;
        if (event !== "SIGNED_OUT") { void refresh(); void queryClient.invalidateQueries(); }
        void router.invalidate();
      }, 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [router, queryClient]);
  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}
export const useSessionState = () => useContext(AuthContext);