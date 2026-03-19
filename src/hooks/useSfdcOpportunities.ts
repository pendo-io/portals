import { useQuery } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { sfdcQuery } from "@/lib/sfdc";
import { OPP_FIELDS } from "./useSfdcOpportunityDetail";
import type { SfdcOpportunityDetail } from "./useSfdcOpportunityDetail";

export type SfdcOpportunity = SfdcOpportunityDetail;

export function useSfdcOpportunities() {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId } = useSalesforce();

  return useQuery({
    queryKey: ["sfdc-opportunities", sfdcUserId],
    queryFn: () =>
      sfdcQuery<SfdcOpportunity>(
        `SELECT ${OPP_FIELDS}
         FROM Opportunity
         WHERE LeadSource = 'Partner Referral'
         ORDER BY CloseDate DESC`,
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
