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

export function PortalTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const homeLabel = useHomeLabel();
  const { basePath, label: portalLabel } = usePortalType();
  const currentPath = location.pathname;

  const ROUTE_LABELS: Record<string, string> = {
    [`${basePath}`]: "",
    [`${basePath}/leads`]: `${portalLabel} Leads`,
    [`${basePath}/opportunities`]: `${portalLabel} Opportunities`,
    [`${basePath}/referral`]: "Submit a Lead",
    [`${basePath}/admin/users`]: "User Management",
    [`${basePath}/admin/partners`]: "Partner Management",
  };

  const isLeadDetail = currentPath.startsWith(`${basePath}/leads/`) && currentPath !== `${basePath}/leads`;
  const isOppDetail = currentPath.startsWith(`${basePath}/opportunities/`) && currentPath !== `${basePath}/opportunities`;

  let breadcrumbSegments: { label: string; path?: string }[];

  if (isLeadDetail) {
    breadcrumbSegments = [{ label: `${portalLabel} Leads`, path: `${basePath}/leads` }, { label: "Lead Detail" }];
  } else if (isOppDetail) {
    breadcrumbSegments = [{ label: `${portalLabel} Opportunities`, path: `${basePath}/opportunities` }, { label: "Opportunity Detail" }];
  } else {
    breadcrumbSegments = [{
      label: currentPath === basePath
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
