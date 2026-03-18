import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { Outlet } from "react-router-dom";

const PortalLayout = () => {
  return (
    <SidebarProvider>
      <PortalSidebar />
      <SidebarInset>
        <div className="flex-1 min-h-0 flex flex-col">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default PortalLayout;
