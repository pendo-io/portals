import { useState, useEffect, useCallback } from "react";
import { query as sfdcQuery, type SFDCQueryResult } from "@/services/salesforce";

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
  const [state, setState] = useState<SFDCState>({
    accessToken: null,
    instanceUrl: null,
    userId: null,
    loading: true,
    expired: false,
  });

  const refreshSFDCToken = useCallback(async (): Promise<string | null> => {
    const stored = localStorage.getItem("sfdc_dev_session");
    if (!stored) return null;

    try {
      const session = JSON.parse(stored);
      const res = await fetch("/api/sfdc-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
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
      const res = await fetch("/api/sfdc-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, instanceUrl, path: "/services/oauth2/userinfo" }),
      });

      if (res.ok) return true;

      if (res.status === 401 || res.status === 403) {
        const newToken = await refreshSFDCToken();
        if (!newToken) {
          markExpired();
          return false;
        }
        return true;
      }

      return true;
    } catch {
      return true;
    }
  }, [refreshSFDCToken, markExpired]);

  // Load initial state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sfdc_dev_session");
    if (stored) {
      try {
        const session = JSON.parse(stored);
        setState({
          accessToken: session.access_token,
          instanceUrl: session.instance_url,
          userId: session.user_id,
          loading: true,
          expired: false,
        });

        validateSession(session.access_token, session.instance_url).then((valid) => {
          if (valid) {
            setState((prev) => ({ ...prev, loading: false }));
          }
        });
        return;
      } catch {
        // fall through
      }
    }
    setState({ accessToken: null, instanceUrl: null, userId: null, loading: false, expired: false });
  }, [validateSession]);

  // Listen for sfdc-session-expired events from sfdcFetch
  useEffect(() => {
    const handleExpired = () => {
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
