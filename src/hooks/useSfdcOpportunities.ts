import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery } from "@/lib/sfdc";
import { OPP_FIELDS } from "./useSfdcOpportunityDetail";
import type { SfdcOpportunityDetail } from "./useSfdcOpportunityDetail";

export type SfdcOpportunity = SfdcOpportunityDetail;

export function useSfdcOpportunities() {
  const { user, sfdcAccountId, isSuperAdmin, impersonating } = useAuth();
  const shouldFilter = !isSuperAdmin || !!impersonating;

  return useQuery({
    queryKey: ["sfdc-opportunities", user?.id, sfdcAccountId, shouldFilter],
    queryFn: () => {
      const where = shouldFilter && sfdcAccountId
        ? `WHERE LeadSource = 'Partner Referral' AND PartnerAccountId = '${sfdcAccountId}'`
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
