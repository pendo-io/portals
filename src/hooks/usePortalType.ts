import { useAuth } from "./useAuth";

export type PortalType = "partner" | "oem" | "japan";

const PORTAL_LABELS: Record<PortalType, string> = {
  partner: "Partner",
  oem: "OEM",
  japan: "Japan",
};

export function usePortalType() {
  const { partnerType } = useAuth();
  const type = partnerType || "partner";
  const label = PORTAL_LABELS[type] || type;

  return { portalType: type, basePath: "", label };
}
