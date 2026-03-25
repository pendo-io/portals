import { useParams } from "react-router-dom";

export type PortalType = "partner" | "oem" | "japan";

const PORTAL_LABELS: Record<PortalType, string> = {
  partner: "Partner",
  oem: "OEM",
  japan: "Japan",
};

export function usePortalType() {
  const { portalType } = useParams<{ portalType: string }>();
  const type = (portalType as PortalType) || "partner";
  const basePath = `/portal/${type}`;
  const label = PORTAL_LABELS[type] || type;

  return { portalType: type, basePath, label };
}
