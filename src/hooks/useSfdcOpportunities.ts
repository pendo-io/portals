import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery } from "@/lib/sfdc";
import { OPP_FIELDS } from "./useSfdcOpportunityDetail";
import type { SfdcOpportunityDetail } from "./useSfdcOpportunityDetail";

export type SfdcOpportunity = SfdcOpportunityDetail;

export function useSfdcOpportunities() {
  const { user, sfdcAccountId } = useAuth();

  return useQuery({
    queryKey: ["sfdc-opportunities", user?.id, sfdcAccountId],
    queryFn: () => {
      const where = sfdcAccountId
        ? `WHERE Partner_Account__c = '${sfdcAccountId}'`
        : `WHERE LeadSource = 'Partner Referral'`;

      return sfdcQuery<SfdcOpportunity>(
        `SELECT ${OPP_FIELDS}
         FROM Opportunity
         ${where}
         ORDER BY CloseDate DESC`
      );
    },
    enabled: !!user,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
