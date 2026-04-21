import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export type PartnerType = "partner" | "oem" | "japan";

export interface ImpersonatedUser {
  id: string;
  email: string;
  full_name: string | null;
  partnerType: PartnerType | null;
  sfdcAccountId: string | null;
  partnerOwnerId: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  partnerType: PartnerType | null;
  sfdcAccountId: string | null;
  partnerOwnerId: string | null;
  /** The real admin's partner type (unaffected by impersonation) */
  realPartnerType: PartnerType | null;
  isSuperAdmin: boolean;
  loading: boolean;
  impersonating: ImpersonatedUser | null;
  signOut: () => Promise<void>;
  startImpersonating: (target: ImpersonatedUser) => void;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const IMPERSONATE_KEY = "impersonate_user";

function getStoredImpersonation(): ImpersonatedUser | null {
  try {
    const raw = sessionStorage.getItem(IMPERSONATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface UserMeta {
  partnerType: PartnerType | null;
  sfdcAccountId: string | null;
  partnerOwnerId: string | null;
  isSuperAdmin: boolean;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    user: User | null;
    session: Session | null;
    loading: boolean;
  } & UserMeta>({
    user: null,
    session: null,
    partnerType: null,
    sfdcAccountId: null,
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
        setState({ user: null, session: null, partnerType: null, sfdcAccountId: null, partnerOwnerId: null, isSuperAdmin: false, loading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserMeta(session.user.id).then((meta) => {
            setState({ user: session.user, session, ...meta, loading: false });
          });
        } else {
          setState({ user: null, session: null, partnerType: null, sfdcAccountId: null, partnerOwnerId: null, isSuperAdmin: false, loading: false });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    sessionStorage.removeItem(IMPERSONATE_KEY);
    await supabase.auth.signOut();
  }, []);

  const startImpersonating = useCallback((target: ImpersonatedUser) => {
    sessionStorage.setItem(IMPERSONATE_KEY, JSON.stringify(target));
    setImpersonating(target);
  }, []);

  const stopImpersonating = useCallback(() => {
    const target = getStoredImpersonation();
    if (target) {
      pendo.track("user_impersonation_stopped", {
        targetUserId: target.id,
      });
    }
    sessionStorage.removeItem(IMPERSONATE_KEY);
    setImpersonating(null);
  }, []);

  const effectiveUser = impersonating && state.user
    ? {
        ...state.user,
        user_metadata: {
          ...state.user.user_metadata,
          full_name: impersonating.full_name,
        },
      } as User
    : state.user;

  const effectivePartnerType = impersonating
    ? impersonating.partnerType
    : state.partnerType;

  const effectiveSfdcAccountId = impersonating
    ? impersonating.sfdcAccountId
    : state.sfdcAccountId;

  const effectivePartnerOwnerId = impersonating
    ? impersonating.partnerOwnerId
    : state.partnerOwnerId;

  const value: AuthContextValue = {
    user: effectiveUser,
    session: state.session,
    partnerType: effectivePartnerType,
    sfdcAccountId: effectiveSfdcAccountId,
    partnerOwnerId: effectivePartnerOwnerId,
    realPartnerType: state.partnerType,
    isSuperAdmin: state.isSuperAdmin,
    loading: state.loading,
    impersonating,
    signOut,
    startImpersonating,
    stopImpersonating,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

async function fetchUserMeta(userId: string): Promise<UserMeta> {
  const [profileRes, rolesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("partners(type, sfdc_account_id, owner_id)")
      .eq("id", userId)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId),
  ]);

  const partner = (profileRes.data as any)?.partners;
  const partnerType = partner?.type ?? null;
  const sfdcAccountId = partner?.sfdc_account_id ?? null;
  const partnerOwnerId = partner?.owner_id ?? null;
  const roles = rolesRes.data?.map((r: any) => r.role) ?? [];
  const isSuperAdmin = roles.includes("super_admin");

  return { partnerType, sfdcAccountId, partnerOwnerId, isSuperAdmin };
}
