import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, Link2, Sun, Moon, Monitor, Loader2 } from "lucide-react";

interface Profile {
  salesforce_user_id: string | null;
  salesforce_org_id: string | null;
  salesforce_instance_url: string | null;
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      setFetching(true);
      const { data } = await supabase
        .from("profiles")
        .select("salesforce_user_id, salesforce_org_id, salesforce_instance_url")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data as Profile);
      }
      setFetching(false);
    };

    fetchProfile();
  }, [user]);

  const handleSfdcSignOut = () => {
    localStorage.removeItem("sfdc_dev_session");
    toast.success("Salesforce session cleared");
    navigate("/login");
  };

  // Salesforce connection info from localStorage (dev mode) or profile
  const sfdcSession = (() => {
    try {
      const raw = localStorage.getItem("sfdc_dev_session");
      if (raw) return JSON.parse(raw) as { email?: string; instance_url?: string; org_id?: string };
    } catch { /* ignore */ }
    return null;
  })();

  const sfdcConnected = !!(
    sfdcSession?.instance_url ||
    profile?.salesforce_instance_url
  );

  const sfdcEmail = sfdcSession?.email ?? user?.email ?? null;
  const sfdcInstanceUrl = sfdcSession?.instance_url ?? profile?.salesforce_instance_url ?? null;
  const sfdcOrgId = sfdcSession?.org_id ?? profile?.salesforce_org_id ?? null;

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ] as const;

  if (authLoading || fetching) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Palette className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the app looks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                    theme === value
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/25"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${theme === value ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${theme === value ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Salesforce Connection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Manage your Salesforce connection</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Salesforce</span>
              <Badge variant={sfdcConnected ? "default" : "outline"}>
                {sfdcConnected ? "Connected" : "Not Connected"}
              </Badge>
            </div>

            {sfdcConnected && (
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                {sfdcEmail && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span className="font-medium">{sfdcEmail}</span>
                  </div>
                )}
                {sfdcInstanceUrl && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Instance URL</span>
                    <span className="font-medium truncate ml-4">{sfdcInstanceUrl}</span>
                  </div>
                )}
                {sfdcOrgId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Org ID</span>
                    <span className="font-medium">{sfdcOrgId}</span>
                  </div>
                )}
              </div>
            )}

            {sfdcConnected && (
              <Button variant="outline" onClick={handleSfdcSignOut}>
                Sign Out of Salesforce
              </Button>
            )}

            {!sfdcConnected && (
              <p className="text-sm text-muted-foreground">
                No Salesforce account connected. Sign in from the login page to connect.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
