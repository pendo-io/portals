import { useEffect } from "react";
import { useAuth } from "./useAuth";
import { t } from "@/lib/i18n";

export function useDocumentTitle(title: string) {
  const { partnerType } = useAuth();
  useEffect(() => {
    const translatedTitle = t(title, partnerType);
    const suffix = t("Partner Portal", partnerType);
    document.title = translatedTitle ? `${translatedTitle} - ${suffix}` : suffix;
  }, [title, partnerType]);
}
