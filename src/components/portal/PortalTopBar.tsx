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

export function PortalTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, partnerType } = useAuth();
  const { t } = usePortalType();
  const currentPath = location.pathname;

  // Greeting
  let firstName = "";
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (name) firstName = name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("Good morning") : hour < 17 ? t("Good afternoon") : t("Good evening");
  const homeLabel = firstName ? `${greeting}, ${firstName}` : greeting;

  const ROUTE_LABELS: Record<string, string> = {
    "/leads": t("Leads"),
    "/opportunities": t("Opportunities"),
    "/referral": t("Submit a Lead"),
    "/admin/users": t("User Management"),
    "/admin/partners": t("Partner Management"),
  };

  const isLeadDetail = currentPath.startsWith("/leads/") && currentPath !== "/leads";
  const isOppDetail = currentPath.startsWith("/opportunities/") && currentPath !== "/opportunities";

  let breadcrumbSegments: { label: string; path?: string }[];

  if (isLeadDetail) {
    breadcrumbSegments = [{ label: t("Leads"), path: "/leads" }, { label: t("Lead Detail") }];
  } else if (isOppDetail) {
    breadcrumbSegments = [{ label: t("Opportunities"), path: "/opportunities" }, { label: t("Opportunity Detail") }];
  } else if (currentPath === "/") {
    breadcrumbSegments = [{ label: homeLabel }];
  } else {
    breadcrumbSegments = [{
      label: ROUTE_LABELS[currentPath] || currentPath.split("/").filter(Boolean).pop() || t("Home"),
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
                  className="text-base sm:text-lg cursor-pointer hover:underline truncate max-w-[200px] sm:max-w-none"
                  onClick={() => navigate(seg.path!)}
                >
                  {seg.label}
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-base sm:text-lg font-semibold text-foreground truncate max-w-[240px] sm:max-w-none">
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
