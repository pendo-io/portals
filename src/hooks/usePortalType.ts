import { useAuth } from "./useAuth";
import { useCallback } from "react";
import { t } from "@/lib/i18n";

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
  const translate = useCallback((key: string) => t(key, type), [type]);

  return { portalType: type, basePath: "", label, t: translate };
}
