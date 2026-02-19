import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { query as sfdcQuery, type SFDCQueryResult } from "@/services/salesforce";

const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
const SFDC_CLIENT_ID = import.meta.env.VITE_SFDC_CLIENT_ID;
const SFDC_CLIENT_SECRET = import.meta.env.VITE_SFDC_CLIENT_SECRET;
const SFDC_LOGIN_URL = import.meta.env.VITE_SFDC_LOGIN_URL || "https://login.salesforce.com";

interface SFDCState {
  accessToken: string | null;
  instanceUrl: string | null;
  userId: string | null;
  loading: boolean;
  expired: boolean;
}

function clearSfdcSession() {
  localStorage.removeItem("sfdc_dev_session");
}

export function useSalesforce() {
  const { user } = useAuth();
  const [state, setState] = useState<SFDCState>({
    accessToken: null,
    instanceUrl: null,
    userId: null,
    loading: true,
    expired: false,
  });

  const refreshSFDCToken = useCallback(async (): Promise<string | null> => {
    // Dev mode: client-side refresh
    if (DEV_BYPASS) {
      const stored = localStorage.getItem("sfdc_dev_session");
      if (!stored) return null;

      try {
        const session = JSON.parse(stored);
        const res = await fetch(`/sfdc-token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: session.refresh_token,
            client_id: SFDC_CLIENT_ID,
            client_secret: SFDC_CLIENT_SECRET,
          }),
        });

        if (!res.ok) return null;

        const data = await res.json();
        const updated = {
          ...session,
          access_token: data.access_token,
          instance_url: data.instance_url || session.instance_url,
          issued_at: data.issued_at,
        };
        localStorage.setItem("sfdc_dev_session", JSON.stringify(updated));

        setState((prev) => ({
          ...prev,
          accessToken: data.access_token,
          instanceUrl: data.instance_url || prev.instanceUrl,
          expired: false,
        }));
        return data.access_token;
      } catch {
        return null;
      }
    }

    // Production: use edge function
    try {
      const { data, error } = await supabase.functions.invoke("sfdc-refresh");

      if (error) {
        console.error("Failed to refresh SFDC token:", error);
        return null;
      }

      if (data?.success && data.access_token) {
        setState((prev) => ({
          ...prev,
          accessToken: data.access_token,
          instanceUrl: data.instance_url || prev.instanceUrl,
          expired: false,
        }));
        return data.access_token;
      }

      return null;
    } catch (err) {
      console.error("Error refreshing SFDC token:", err);
      return null;
    }
  }, []);

  const markExpired = useCallback(() => {
    clearSfdcSession();
    setState({
      accessToken: null,
      instanceUrl: null,
      userId: null,
      loading: false,
      expired: true,
    });
  }, []);

  // Validate session on mount with a lightweight API call
  const validateSession = useCallback(async (token: string, instanceUrl: string) => {
    try {
      const baseUrl = DEV_BYPASS ? "/sfdc-api" : instanceUrl;
      const res = await fetch(`${baseUrl}/services/oauth2/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) return true;

      // 401 or 403 both mean the token is invalid/expired
      if (res.status === 401 || res.status === 403) {
        // Try refresh before declaring expired
        const newToken = await refreshSFDCToken();
        if (!newToken) {
          markExpired();
          return false;
        }
        return true;
      }

      // Other errors (5xx, etc.) — don't mark expired, could be transient
      return true;
    } catch {
      // Network error — don't mark expired, could be transient
      return true;
    }
  }, [refreshSFDCToken, markExpired]);

  // Load initial state
  useEffect(() => {
    if (DEV_BYPASS) {
      const stored = localStorage.getItem("sfdc_dev_session");
      if (stored) {
        try {
          const session = JSON.parse(stored);
          setState({
            accessToken: session.access_token,
            instanceUrl: session.instance_url,
            userId: session.user_id,
            loading: true, // still loading until validated
            expired: false,
          });

          // Validate the stored session
          validateSession(session.access_token, session.instance_url).then((valid) => {
            if (valid) {
              setState((prev) => ({ ...prev, loading: false }));
            }
            // If invalid, markExpired was already called by validateSession
          });
          return;
        } catch {
          // fall through
        }
      }
      setState({ accessToken: null, instanceUrl: null, userId: null, loading: false, expired: false });
      return;
    }

    // Production: read from Supabase
    if (!user) {
      setState({ accessToken: null, instanceUrl: null, userId: null, loading: false, expired: false });
      return;
    }

    const loadTokens = async () => {
      const { data: tokenData } = await supabase
        .from("sfdc_tokens")
        .select("access_token, instance_url")
        .eq("user_id", user.id)
        .maybeSingle();

      const { data: profile } = await supabase
        .from("profiles")
        .select("salesforce_user_id")
        .eq("id", user.id)
        .maybeSingle();

      if (tokenData?.access_token && tokenData?.instance_url) {
        setState({
          accessToken: tokenData.access_token,
          instanceUrl: tokenData.instance_url,
          userId: profile?.salesforce_user_id || null,
          loading: true,
          expired: false,
        });

        const valid = await validateSession(tokenData.access_token, tokenData.instance_url);
        if (valid) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } else {
        setState({
          accessToken: null,
          instanceUrl: null,
          userId: profile?.salesforce_user_id || null,
          loading: false,
          expired: false,
        });
      }
    };

    loadTokens();
  }, [user, validateSession]);

  // Listen for sfdc-session-expired events from sfdcFetch
  useEffect(() => {
    const handleExpired = () => {
      // Try refresh first, then mark expired if refresh fails
      refreshSFDCToken().then((newToken) => {
        if (!newToken) {
          markExpired();
        }
      });
    };

    window.addEventListener("sfdc-session-expired", handleExpired);
    return () => window.removeEventListener("sfdc-session-expired", handleExpired);
  }, [refreshSFDCToken, markExpired]);

  const querySFDC = useCallback(
    async <T>(soql: string): Promise<SFDCQueryResult<T> | null> => {
      if (!state.accessToken || !state.instanceUrl) return null;

      try {
        return await sfdcQuery<T>(state.accessToken, state.instanceUrl, soql);
      } catch (err: any) {
        if (err.message?.includes("401")) {
          const newToken = await refreshSFDCToken();
          if (newToken && state.instanceUrl) {
            return await sfdcQuery<T>(newToken, state.instanceUrl, soql);
          }
        }
        throw err;
      }
    },
    [state.accessToken, state.instanceUrl, refreshSFDCToken]
  );

  return {
    sfdcAccessToken: state.accessToken,
    sfdcInstanceUrl: state.instanceUrl,
    sfdcUserId: state.userId,
    sfdcLoading: state.loading,
    sfdcExpired: state.expired,
    refreshSFDCToken,
    querySFDC,
  };
}
