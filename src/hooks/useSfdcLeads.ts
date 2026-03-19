import { useQuery } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { sfdcQuery } from "@/lib/sfdc";
import { LEAD_FIELDS } from "./useSfdcLeadDetail";
import type { SfdcLeadDetail } from "./useSfdcLeadDetail";

export type SfdcLead = SfdcLeadDetail;

export function useSfdcLeads() {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId } = useSalesforce();

  return useQuery({
    queryKey: ["sfdc-leads", sfdcUserId],
    queryFn: () =>
      sfdcQuery<SfdcLead>(
        `SELECT ${LEAD_FIELDS}
         FROM Lead
         WHERE LeadSource = 'Partner Referral'
         ORDER BY CreatedDate DESC`,
        sfdcInstanceUrl!,
        sfdcAccessToken!
      ),
    enabled: !!sfdcAccessToken && !!sfdcInstanceUrl && !!sfdcUserId,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
