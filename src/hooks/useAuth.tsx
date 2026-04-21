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
  email: string | null;
  fullName: string | null;
  partnerId: string | null;
  createdAt: string | null;
  partnerName: string | null;
  partnerCreatedAt: string | null;
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
    partnerOwnerId: null,
    isSuperAdmin: false,
    email: null,
    fullName: null,
    partnerId: null,
    createdAt: null,
    partnerName: null,
    partnerCreatedAt: null,
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
          identifyPendoUser(session.user, meta);
        });
      } else {
        setState({ user: null, session: null, partnerType: null, sfdcAccountId: null, partnerOwnerId: null, isSuperAdmin: false, email: null, fullName: null, partnerId: null, createdAt: null, partnerName: null, partnerCreatedAt: null, loading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserMeta(session.user.id).then((meta) => {
            setState({ user: session.user, session, ...meta, loading: false });
            identifyPendoUser(session.user, meta);
          });
        } else {
          setState({ user: null, session: null, partnerType: null, sfdcAccountId: null, partnerOwnerId: null, isSuperAdmin: false, email: null, fullName: null, partnerId: null, createdAt: null, partnerName: null, partnerCreatedAt: null, loading: false });
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
      .select("email, full_name, partner_id, created_at, partners(id, name, type, sfdc_account_id, owner_id, created_at)")
      .eq("id", userId)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId),
  ]);

  const profile = profileRes.data as any;
  const partner = profile?.partners;
  const partnerType = partner?.type ?? null;
  const sfdcAccountId = partner?.sfdc_account_id ?? null;
  const partnerOwnerId = partner?.owner_id ?? null;
  const roles = rolesRes.data?.map((r: any) => r.role) ?? [];
  const isSuperAdmin = roles.includes("super_admin");

  return {
    partnerType,
    sfdcAccountId,
    partnerOwnerId,
    isSuperAdmin,
    email: profile?.email ?? null,
    fullName: profile?.full_name ?? null,
    partnerId: profile?.partner_id ?? null,
    createdAt: profile?.created_at ?? null,
    partnerName: partner?.name ?? null,
    partnerCreatedAt: partner?.created_at ?? null,
  };
}

function identifyPendoUser(user: User, meta: UserMeta) {
  pendo.identify({
    visitor: {
      id: user.id,
      email: meta.email || '',
      full_name: meta.fullName || '',
      role: meta.isSuperAdmin ? 'super_admin' : 'user',
      partner_id: meta.partnerId || '',
      created_at: meta.createdAt || '',
      partner_type: meta.partnerType || '',
      sfdc_account_id: meta.sfdcAccountId || '',
      is_super_admin: meta.isSuperAdmin,
    },
    account: {
      id: meta.partnerId || '',
      name: meta.partnerName || '',
      partner_type: meta.partnerType || '',
      sfdc_account_id: meta.sfdcAccountId || '',
      owner_id: meta.partnerOwnerId || '',
      created_at: meta.partnerCreatedAt || '',
    },
  });
}
