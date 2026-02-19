import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const SFDC_REDIRECT_URI = import.meta.env.VITE_SFDC_REDIRECT_URI;
const SFDC_CLIENT_ID = import.meta.env.VITE_SFDC_CLIENT_ID;
const SFDC_CLIENT_SECRET = import.meta.env.VITE_SFDC_CLIENT_SECRET;
const SFDC_LOGIN_URL = import.meta.env.VITE_SFDC_LOGIN_URL || "https://login.salesforce.com";
const DEV_BYPASS = import.meta.env.VITE_DEV_BYPASS_AUTH === "true";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    // Guard against React strict mode double-mount (auth codes are single-use)
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");

      if (errorParam) {
        console.error("SFDC OAuth error:", errorParam, params.get("error_description"));
        console.error("Full callback URL:", window.location.href);
        setError(`Salesforce login failed: ${params.get("error_description") || errorParam}`);
        return;
      }

      if (!code) {
        setError("No authorization code received from Salesforce");
        return;
      }

      try {
        if (DEV_BYPASS) {
          // Client-side token exchange using client_secret (proxied via Vite)

          const tokenParams: Record<string, string> = {
            grant_type: "authorization_code",
            code,
            client_id: SFDC_CLIENT_ID,
            redirect_uri: SFDC_REDIRECT_URI,
          };
          if (SFDC_CLIENT_SECRET) tokenParams.client_secret = SFDC_CLIENT_SECRET;

          const tokenResponse = await fetch(
            `/sfdc-token`,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(tokenParams),
            }
          );

          if (!tokenResponse.ok) {
            const err = await tokenResponse.text();
            throw new Error(`Token exchange failed: ${err}`);
          }

          const tokenData = await tokenResponse.json();

          // Get user identity (proxied via Vite to avoid CORS)
          const userInfoResponse = await fetch(
            `/sfdc-api/services/oauth2/userinfo`,
            { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
          );

          if (!userInfoResponse.ok) {
            throw new Error("Failed to fetch Salesforce user info");
          }

          const userInfo = await userInfoResponse.json();

          // Store in localStorage for dev mode
          const sfdcSession = {
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            instance_url: tokenData.instance_url,
            user_id: userInfo.user_id,
            org_id: userInfo.organization_id,
            email: userInfo.email,
            name: userInfo.name,
            issued_at: tokenData.issued_at,
          };

          localStorage.setItem("sfdc_dev_session", JSON.stringify(sfdcSession));
          navigate("/accounts", { replace: true });
          return;
        }

        // Production path: use edge function
        const { data, error: fnError } = await supabase.functions.invoke("sfdc-auth", {
          body: { code, redirectUri: SFDC_REDIRECT_URI },
        });

        if (fnError) {
          throw new Error(fnError.message);
        }

        if (!data?.success || !data?.session) {
          throw new Error(data?.error || "Failed to authenticate with Salesforce");
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) {
          throw sessionError;
        }

        navigate("/accounts", { replace: true });
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message || "Authentication failed. Please try again.");
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold">Authentication Failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="text-sm text-primary hover:underline"
          >
            Return to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
};

export default AuthCallback;
