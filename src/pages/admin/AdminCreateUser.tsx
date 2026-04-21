import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAdminPartners } from "@/hooks/useAdmin";

const ROLES = ["user", "super_admin"] as const;

function getRoleLabel(role: string) {
  switch (role) {
    case "super_admin": return "Super Admin";
    default: return "User";
  }
}

const AdminCreateUser = () => {
  useDocumentTitle("Invite User");
  const navigate = useNavigate();
  const { data: partners } = useAdminPartners();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>("user");
  const [partnerId, setPartnerId] = useState<string>("none");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !fullName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          fullName: fullName.trim(),
          role,
          partnerId: partnerId !== "none" ? partnerId : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send invitation");

      pendo.track("user_invited", {
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        partnerId: partnerId !== "none" ? partnerId : "",
      });
      toast.success(`Invitation sent to ${email.trim()}`);
      navigate("/admin/users");
    } catch (err) {
      toast.error((err as Error).message || "Failed to send invitation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="border-b px-3 sm:px-6 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Invite User</h2>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              Send an invitation email. The user will set their own password when they accept.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground font-medium">
                Full Name <span className="text-primary">*</span>
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                autoFocus
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground font-medium">
                Email <span className="text-primary">*</span>
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@company.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground font-medium">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{getRoleLabel(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground font-medium">Partner</Label>
                <Select value={partnerId} onValueChange={setPartnerId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Partner</SelectItem>
                    {partners?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/admin/users")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="min-w-[140px] gap-2">
                {saving
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><Mail className="h-4 w-4" />Send Invitation</>
                }
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminCreateUser;
