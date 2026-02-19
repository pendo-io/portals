import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { useSalesforce } from "@/hooks/useSalesforce";

const SFDC_CLIENT_ID = import.meta.env.VITE_SFDC_CLIENT_ID;
const SFDC_REDIRECT_URI = import.meta.env.VITE_SFDC_REDIRECT_URI;
const SFDC_LOGIN_URL = import.meta.env.VITE_SFDC_LOGIN_URL || "https://login.salesforce.com";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { sfdcAccessToken, sfdcLoading } = useSalesforce();
  const expired = searchParams.get("expired") === "true";
  const loggedOut = searchParams.get("logout") === "true";

  useEffect(() => {
    if (!sfdcLoading && sfdcAccessToken) {
      navigate("/", { replace: true });
    }
  }, [sfdcLoading, sfdcAccessToken, navigate]);

  const handleSalesforceLogin = () => {
    setLoading(true);
    const authUrl = new URL(`${SFDC_LOGIN_URL}/services/oauth2/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", SFDC_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", SFDC_REDIRECT_URI);
    if (loggedOut) {
      authUrl.searchParams.set("prompt", "login");
    }
    window.location.href = authUrl.toString();
  };

  if (sfdcLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-1 relative flex-col overflow-hidden bg-[hsl(0,0%,12%)]">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/5" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(0 0% 100%) 1px, transparent 1px), linear-gradient(90deg, hsl(0 0% 100%) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 flex flex-col h-full px-12 xl:px-16 py-10">
          <img src="/logo.png" alt="Pendo" className="h-8 w-8" />

          <div className="flex-1 flex flex-col justify-center -mt-10">
            <h1
              className="text-white text-[2.75rem] xl:text-[3.25rem] font-bold tracking-tight"
              style={{ fontFamily: "'Sora', system-ui, sans-serif", lineHeight: 1.1 }}
            >
              Sales intelligence,
              <br />
              <span className="text-primary">powered by AI.</span>
            </h1>
            <p className="mt-5 text-white/50 text-[15px] leading-relaxed max-w-[380px]">
              Account insights, meeting analysis, and workflow automation built on Pendo's GTM Systems.
            </p>
          </div>

          <p className="text-white/25 text-xs">
            Pendo internal use only
          </p>
        </div>
      </div>

      {/* Login panel */}
      <div className="w-full lg:flex-1 flex flex-col bg-background dark:bg-card lg:dark:border-l lg:dark:border-border">
        <div className="lg:hidden flex items-center px-6 pt-6">
          <img src="/logo.png" alt="Pendo" className="h-7 w-7" />
        </div>

        <div className="flex-1 flex items-center justify-center px-8 xl:px-12">
          <div className="w-full max-w-[340px]">
            <h2
              className="text-foreground text-xl font-bold tracking-tight mb-2"
              style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
            >
              Sign in
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              Use your Salesforce account to continue
            </p>

            {expired && (
              <div className="mb-6 flex items-center gap-2.5 rounded-lg bg-destructive/10 dark:bg-red-500/10 border border-destructive/20 dark:border-red-500/20 px-4 py-3 text-sm text-destructive dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Session expired. Please sign in again.</span>
              </div>
            )}

            <Button
              onClick={handleSalesforceLogin}
              disabled={loading}
              className="w-full h-12 bg-[#00A1E0] hover:bg-[#0088C2] text-white border-0 shadow-sm transition-all duration-200 hover:shadow-md dark:shadow-none dark:ring-1 dark:ring-white/10 dark:hover:ring-white/20 rounded-lg text-sm font-medium"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.006 5.415a4.195 4.195 0 0 1 3.045-1.306c1.56 0 2.954.9 3.69 2.205.63-.3 1.35-.45 2.1-.45 2.85 0 5.159 2.34 5.159 5.22s-2.31 5.22-5.16 5.22c-.45 0-.9-.06-1.32-.165a3.91 3.91 0 0 1-3.48 2.145c-.63 0-1.26-.165-1.8-.45a4.828 4.828 0 0 1-4.2 2.46A4.828 4.828 0 0 1 3.24 16.5c0-.345.03-.69.105-1.02A3.685 3.685 0 0 1 1 12.315 3.72 3.72 0 0 1 4.38 8.58c.075 0 .165 0 .24.015A4.17 4.17 0 0 1 8.46 5.82c.54 0 1.065.135 1.545.39v-.795z" />
                  </svg>
                  Sign in with Salesforce
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
