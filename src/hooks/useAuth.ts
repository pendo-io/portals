import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export type PartnerType = "partner" | "oem" | "japan";

interface AuthState {
  user: User | null;
  session: Session | null;
  partnerType: PartnerType | null;
  loading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    partnerType: null,
    loading: true,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchPartnerType(session.user.id).then((partnerType) => {
          setState({ user: session.user, session, partnerType, loading: false });
        });
      } else {
        setState({ user: null, session: null, partnerType: null, loading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchPartnerType(session.user.id).then((partnerType) => {
            setState({ user: session.user, session, partnerType, loading: false });
          });
        } else {
          setState({ user: null, session: null, partnerType: null, loading: false });
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
    loading: state.loading,
    signOut,
  };
}

async function fetchPartnerType(userId: string): Promise<PartnerType | null> {
  const { data } = await supabase
    .from("profiles")
    .select("partners(type)")
    .eq("id", userId)
    .single();

  return (data as any)?.partners?.type ?? null;
}
