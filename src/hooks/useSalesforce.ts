import { useState, useEffect, useCallback } from "react";

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
          loading: false,
          expired: false,
        });
        return;
      } catch {
        // fall through
      }
    }
    setState({ accessToken: null, instanceUrl: null, userId: null, loading: false, expired: false });
  }, []);

  // Listen for sfdc-session-expired events
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

  return {
    sfdcAccessToken: state.accessToken,
    sfdcInstanceUrl: state.instanceUrl,
    sfdcUserId: state.userId,
    sfdcLoading: state.loading,
    sfdcExpired: state.expired,
    refreshSFDCToken,
  };
}
