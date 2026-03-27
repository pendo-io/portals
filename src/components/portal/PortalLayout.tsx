import { useRef, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { PortalTopBar } from "@/components/portal/PortalTopBar";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useSfdcLeads } from "@/hooks/useSfdcLeads";
import { useSfdcOpportunities } from "@/hooks/useSfdcOpportunities";
import { useAuth } from "@/hooks/useAuth";
import { usePortalType } from "@/hooks/usePortalType";
import { Button } from "@/components/ui/button";

const PortalLayout = () => {
  useSfdcLeads();
  useSfdcOpportunities();

  const { impersonating, stopImpersonating } = useAuth();
  const { t } = usePortalType();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [pathname]);

  const handleStop = () => {
    stopImpersonating();
    navigate("/admin/users", { replace: true });
  };

  return (
    <SidebarProvider>
      <PortalSidebar />
      <SidebarInset ref={contentRef}>
        <div className="flex-1 min-h-0 flex flex-col">
          {impersonating && (
            <div className="bg-primary text-primary-foreground px-3 sm:px-4 py-2 flex items-center justify-between text-xs sm:text-sm font-medium shrink-0">
              <span>
                {t("Currently impersonating")} <strong>{impersonating.full_name || impersonating.email}</strong>
                {impersonating.partnerType && (
                  <span className="ml-1.5 opacity-70">({impersonating.partnerType})</span>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-primary-foreground hover:bg-primary-foreground/20 font-semibold"
                onClick={handleStop}
              >
                {t("Go Back")}
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
