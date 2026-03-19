import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { SfdcLeadDetail } from "@/hooks/useSfdcLeadDetail";
import type { SfdcQueryResult } from "@/lib/sfdc";

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentPath = location.pathname;

  const isLeadDetail = currentPath.startsWith("/portal/partner/leads/") && currentPath !== "/portal/partner/leads";

  let leadDetailLabel = "Lead Detail";
  if (isLeadDetail) {
    const leadId = currentPath.split("/portal/partner/leads/")[1];
    const cachedLead = queryClient.getQueryData<SfdcQueryResult<SfdcLeadDetail>>(["sfdc-lead", leadId]);
    if (cachedLead?.records?.[0]?.Name) leadDetailLabel = cachedLead.records[0].Name;
  }

  const breadcrumbSegments = isLeadDetail
    ? [{ label: "Partner Leads", path: "/portal/partner/leads" }, { label: leadDetailLabel }]
    : [{
        label: currentPath === "/portal/partner"
          ? getHomeLabel()
          : ROUTE_LABELS[currentPath] || currentPath.split("/").filter(Boolean).pop() || "Home",
      }];

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
