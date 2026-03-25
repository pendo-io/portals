import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export type PartnerType = "partner" | "oem" | "japan";

export interface ImpersonatedUser {
  id: string;
  email: string;
  full_name: string | null;
  partnerType: PartnerType | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  partnerType: PartnerType | null;
  isSuperAdmin: boolean;
  loading: boolean;
}

const IMPERSONATE_KEY = "impersonate_user";

function getStoredImpersonation(): ImpersonatedUser | null {
  try {
    const raw = localStorage.getItem(IMPERSONATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    partnerType: null,
    isSuperAdmin: false,
    loading: true,
  });

  const [impersonating, setImpersonating] = useState<ImpersonatedUser | null>(
    getStoredImpersonation
  );

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
    localStorage.removeItem(IMPERSONATE_KEY);
    await supabase.auth.signOut();
  }, []);

  const startImpersonating = useCallback((target: ImpersonatedUser) => {
    localStorage.setItem(IMPERSONATE_KEY, JSON.stringify(target));
    setImpersonating(target);
  }, []);

  const stopImpersonating = useCallback(() => {
    localStorage.removeItem(IMPERSONATE_KEY);
    setImpersonating(null);
  }, []);

  // When impersonating, override user metadata and partner type
  // but keep isSuperAdmin true so admin nav stays accessible
  const effectiveUser = impersonating
    ? {
        ...state.user!,
        user_metadata: {
          ...state.user?.user_metadata,
          full_name: impersonating.full_name,
        },
      } as User
    : state.user;

  const effectivePartnerType = impersonating
    ? impersonating.partnerType
    : state.partnerType;

  return {
    user: effectiveUser,
    session: state.session,
    partnerType: effectivePartnerType,
    isSuperAdmin: state.isSuperAdmin,
    loading: state.loading,
    impersonating,
    signOut,
    startImpersonating,
    stopImpersonating,
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
