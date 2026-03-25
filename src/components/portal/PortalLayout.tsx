import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { PortalTopBar } from "@/components/portal/PortalTopBar";
import { Outlet, useNavigate } from "react-router-dom";
import { useSfdcLeads } from "@/hooks/useSfdcLeads";
import { useSfdcOpportunities } from "@/hooks/useSfdcOpportunities";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const PortalLayout = () => {
  // Prefetch data at layout level so it's warm when pages render
  useSfdcLeads();
  useSfdcOpportunities();

  const { impersonating, stopImpersonating, partnerType } = useAuth();
  const navigate = useNavigate();

  const handleStop = () => {
    stopImpersonating();
    navigate(`/portal/${partnerType || "partner"}/admin/users`, { replace: true });
    // Force reload so the auth state fully resets
    window.location.reload();
  };

  return (
    <SidebarProvider>
      <PortalSidebar />
      <SidebarInset>
        <div className="flex-1 min-h-0 flex flex-col">
          {impersonating && (
            <div className="bg-amber-500 text-amber-950 px-4 py-1.5 flex items-center justify-between text-sm font-medium shrink-0">
              <span>
                Viewing as <strong>{impersonating.full_name || impersonating.email}</strong>
                {impersonating.partnerType && (
                  <span className="ml-1.5 opacity-70">({impersonating.partnerType})</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
                onClick={handleStop}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Stop
              </Button>
            </div>
          )}
          <PortalTopBar />
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PortalLayout;
