import { useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";

function getHomeLabel(): string {
  let firstName = "";
  try {
    const raw = localStorage.getItem("sfdc_dev_session");
    if (raw) {
      const session = JSON.parse(raw);
      if (session.name) firstName = session.name.split(" ")[0];
    }
  } catch { /* ignore */ }
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return firstName ? `${greeting}, ${firstName}` : greeting;
}

const ROUTE_LABELS: Record<string, string> = {
  "/portal/partner": "",
  "/portal/partner/leads": "Partner Leads",
  "/portal/partner/opportunities": "Partner Opportunities",
  "/portal/partner/referral": "Submit a Lead",
};

export function PortalTopBar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const pageLabel = currentPath === "/portal/partner"
    ? getHomeLabel()
    : ROUTE_LABELS[currentPath] || currentPath.split("/").filter(Boolean).pop() || "Home";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-lg font-semibold text-foreground">
              {pageLabel}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
