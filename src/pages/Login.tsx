import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

const Login = () => {
  useDocumentTitle("Sign In");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const loggedOut = searchParams.get("logout") === "true";

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/portals", { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    }
  };

  if (authLoading) {
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
              Pendo
              <br />
              <span className="text-primary">Partner Portal.</span>
            </h1>
            <p className="mt-5 text-white/50 text-[15px] leading-relaxed max-w-[380px]">
              Manage leads, opportunities, and referrals through the Pendo Partner Program.
            </p>
          </div>

          <p className="text-white/25 text-xs">
            Pendo Partner Program
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
              Enter your credentials to continue
            </p>

            {loggedOut && (
              <div className="mb-6 flex items-center gap-2.5 rounded-lg bg-muted/50 border border-border px-4 py-3 text-sm text-muted-foreground">
                You have been signed out.
              </div>
            )}

            {error && (
              <div className="mb-6 flex items-center gap-2.5 rounded-lg bg-destructive/10 dark:bg-red-500/10 border border-destructive/20 dark:border-red-500/20 px-4 py-3 text-sm text-destructive dark:text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-muted-foreground font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 shadow-sm transition-all duration-200 hover:shadow-md dark:shadow-none rounded-lg text-sm font-medium"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
