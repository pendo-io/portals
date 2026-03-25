import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export type PartnerType = "partner" | "oem" | "japan";

interface AuthState {
  user: User | null;
  session: Session | null;
  partnerType: PartnerType | null;
  isSuperAdmin: boolean;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    partnerType: null,
    isSuperAdmin: false,
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserMeta(session.user.id).then((meta) => {
          setState({ user: session.user, session, ...meta, loading: false });
        });
      } else {
        setState({ user: null, session: null, partnerType: null, isSuperAdmin: false, loading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserMeta(session.user.id).then((meta) => {
            setState({ user: session.user, session, ...meta, loading: false });
          });
        } else {
          setState({ user: null, session: null, partnerType: null, isSuperAdmin: false, loading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return {
    user: state.user,
    session: state.session,
    partnerType: state.partnerType,
    isSuperAdmin: state.isSuperAdmin,
    loading: state.loading,
    signOut,
  };
}

async function fetchUserMeta(userId: string): Promise<{ partnerType: PartnerType | null; isSuperAdmin: boolean }> {
  const [profileRes, rolesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("partners(type)")
      .eq("id", userId)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId),
  ]);

  const partnerType = (profileRes.data as any)?.partners?.type ?? null;
  const roles = rolesRes.data?.map((r: any) => r.role) ?? [];
  const isSuperAdmin = roles.includes("super_admin");

  return { partnerType, isSuperAdmin };
}
