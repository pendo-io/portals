import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { PortalTopBar } from "@/components/portal/PortalTopBar";
import { Outlet } from "react-router-dom";
import { useSfdcLeads } from "@/hooks/useSfdcLeads";
import { useSfdcOpportunities } from "@/hooks/useSfdcOpportunities";

const PortalLayout = () => {
  // Prefetch data at layout level so it's warm when pages render
  useSfdcLeads();
  useSfdcOpportunities();

  return (
    <SidebarProvider>
      <PortalSidebar />
      <SidebarInset>
        <div className="flex-1 min-h-0 flex flex-col">
          <PortalTopBar />
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PortalLayout;
