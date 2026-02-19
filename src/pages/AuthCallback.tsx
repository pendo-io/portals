import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const SFDC_REDIRECT_URI = import.meta.env.VITE_SFDC_REDIRECT_URI;

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");

      if (errorParam) {
        console.error("SFDC OAuth error:", errorParam, params.get("error_description"));
        setError(`Salesforce login failed: ${params.get("error_description") || errorParam}`);
        return;
      }

      if (!code) {
        setError("No authorization code received from Salesforce");
        return;
      }

      try {
        const response = await fetch("/api/sfdc-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirectUri: SFDC_REDIRECT_URI }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Token exchange failed");
        }

        const data = await response.json();

        localStorage.setItem(
          "sfdc_dev_session",
          JSON.stringify({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            instance_url: data.instance_url,
            user_id: data.user_id,
            org_id: data.org_id,
            email: data.email,
            name: data.name,
            issued_at: data.issued_at,
          })
        );

        navigate("/", { replace: true });
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
