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
  const { isLoading: leadsLoading } = useSfdcLeads();
  const { isLoading: oppsLoading } = useSfdcOpportunities();
  const dataReady = !leadsLoading && !oppsLoading;

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
          {dataReady ? (
            <Outlet />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-5">
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                  <img src="/logo.png" alt="" className="absolute inset-3 h-8 w-8" />
                </div>
              </div>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PortalLayout;
