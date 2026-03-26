import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePortalType } from "@/hooks/usePortalType";
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
  "/leads": "Leads",
  "/opportunities": "Opportunities",
  "/referral": "Submit a Lead",
  "/admin/users": "User Management",
  "/admin/partners": "Partner Management",
};

export function PortalTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const homeLabel = useHomeLabel();
  const { label: portalLabel } = usePortalType();
  const currentPath = location.pathname;

  const isLeadDetail = currentPath.startsWith("/leads/") && currentPath !== "/leads";
  const isOppDetail = currentPath.startsWith("/opportunities/") && currentPath !== "/opportunities";

  let breadcrumbSegments: { label: string; path?: string }[];

  if (isLeadDetail) {
    breadcrumbSegments = [{ label: `${portalLabel} Leads`, path: "/leads" }, { label: "Lead Detail" }];
  } else if (isOppDetail) {
    breadcrumbSegments = [{ label: `${portalLabel} Opportunities`, path: "/opportunities" }, { label: "Opportunity Detail" }];
  } else if (currentPath === "/") {
    breadcrumbSegments = [{ label: homeLabel }];
  } else {
    const label = ROUTE_LABELS[currentPath];
    breadcrumbSegments = [{
      label: label
        ? (currentPath === "/leads" || currentPath === "/opportunities" ? `${portalLabel} ${label}` : label)
        : currentPath.split("/").filter(Boolean).pop() || "Home",
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
