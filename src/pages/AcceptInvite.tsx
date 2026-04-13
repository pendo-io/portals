import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import pendoLogo from "@/assets/pendo-logo.png";

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    // Supabase auto-detects tokens in the URL hash and establishes a session.
    // onAuthStateChange fires once the session is resolved (or absent).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (initialized.current) return;
      initialized.current = true;
      setEmail(session?.user?.email ?? null);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password set — welcome to Partner Portal!");
      navigate("/");
    } catch (err) {
      toast.error((err as Error).message || "Failed to set password");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">Invite link invalid or expired</p>
            <p className="text-sm text-muted-foreground mt-1">
              Contact your administrator to request a new invitation.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/login")}>
            Go to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Brand panel — matches Login.tsx */}
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
          <p className="text-white/25 text-xs">Pendo Partner Program</p>
        </div>
      </div>

      {/* Set-password panel */}
      <div className="w-full lg:flex-1 flex flex-col bg-background dark:bg-card lg:dark:border-l lg:dark:border-border">
        <div className="lg:hidden flex items-center px-6 pt-6">
          <img src={pendoLogo} alt="Pendo" className="h-7 w-7" />
        </div>

        <div className="flex-1 flex items-center justify-center px-8 xl:px-12">
          <div className="w-full max-w-[340px]">
            <h2
              className="text-foreground text-xl font-bold tracking-tight mb-1"
              style={{ fontFamily: "'Sora', system-ui, sans-serif" }}
            >
              Set your password
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              You're signing in as{" "}
              <span className="font-medium text-foreground">{email}</span>.
              Create a password to complete your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs text-muted-foreground font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  autoFocus
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm" className="text-xs text-muted-foreground font-medium">
                  Confirm password
                </Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={saving || !password || !confirm}
                className="w-full h-12 shadow-sm transition-all duration-200 hover:shadow-md dark:shadow-none rounded-lg text-sm font-medium mt-2"
              >
                {saving
                  ? <Loader2 className="h-5 w-5 animate-spin" />
                  : "Set password & sign in"
                }
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;
