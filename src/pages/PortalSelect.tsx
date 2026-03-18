import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { usePortal, PortalType } from "@/contexts/PortalContext";
import { Card, CardContent } from "@/components/ui/card";
import { Handshake, Building, Globe } from "lucide-react";

const portals: { type: PortalType; label: string; description: string; icon: typeof Handshake; enabled: boolean }[] = [
  {
    type: "partner",
    label: "Partner Portal",
    description: "Manage leads, opportunities, and referral registrations",
    icon: Handshake,
    enabled: true,
  },
  {
    type: "oem",
    label: "OEM Portal",
    description: "OEM partnership management and resources",
    icon: Building,
    enabled: false,
  },
  {
    type: "japan",
    label: "Japan Portal",
    description: "Japan market operations and management",
    icon: Globe,
    enabled: false,
  },
];

const PortalSelect = () => {
  useDocumentTitle("Select Portal");
  const { setPortal } = usePortal();
  const navigate = useNavigate();

  const handleSelect = (type: PortalType) => {
    setPortal(type);
    navigate(`/portal/${type}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="mb-10 flex flex-col items-center gap-3">
        <img src="/logo.png" alt="Pendo" className="w-8 h-8" />
        <h1 className="text-2xl font-bold tracking-tight">Select Your Portal</h1>
        <p className="text-sm text-muted-foreground">Choose the portal that matches your role</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
        {portals.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.type}
              onClick={() => p.enabled && handleSelect(p.type)}
              disabled={!p.enabled}
              className="text-left group"
            >
              <Card className={`h-full transition-all ${p.enabled ? "hover:border-primary hover:shadow-md cursor-pointer" : "opacity-50 cursor-not-allowed"}`}>
                <CardContent className="p-6 flex flex-col gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base">{p.label}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{p.description}</p>
                  </div>
                  {!p.enabled && (
                    <span className="text-xs text-muted-foreground italic">Coming soon</span>
                  )}
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PortalSelect;
