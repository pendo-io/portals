import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function useHomeLabel(): string {
  const { user } = useAuth();
  let firstName = "";
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (name) firstName = name.split(" ")[0];
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
  const navigate = useNavigate();
  const homeLabel = useHomeLabel();
  const currentPath = location.pathname;

  const isLeadDetail = currentPath.startsWith("/portal/partner/leads/") && currentPath !== "/portal/partner/leads";
  const isOppDetail = currentPath.startsWith("/portal/partner/opportunities/") && currentPath !== "/portal/partner/opportunities";

  let breadcrumbSegments: { label: string; path?: string }[];

  if (isLeadDetail) {
    breadcrumbSegments = [{ label: "Partner Leads", path: "/portal/partner/leads" }, { label: "Lead Detail" }];
  } else if (isOppDetail) {
    breadcrumbSegments = [{ label: "Partner Opportunities", path: "/portal/partner/opportunities" }, { label: "Opportunity Detail" }];
  } else {
    breadcrumbSegments = [{
      label: currentPath === "/portal/partner"
        ? homeLabel
        : ROUTE_LABELS[currentPath] || currentPath.split("/").filter(Boolean).pop() || "Home",
    }];
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 sm:px-6">
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbSegments.map((seg, i) => (
            <BreadcrumbItem key={i}>
              {i > 0 && <BreadcrumbSeparator className="text-lg" />}
              {seg.path && i < breadcrumbSegments.length - 1 ? (
                <BreadcrumbLink
                  className="text-lg cursor-pointer hover:underline"
                  onClick={() => navigate(seg.path!)}
                >
                  {seg.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-lg font-semibold text-foreground">
                  {seg.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
