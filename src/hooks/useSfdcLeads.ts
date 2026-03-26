import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId } from "@/lib/sfdc";
import { LEAD_FIELDS } from "./useSfdcLeadDetail";
import type { SfdcLeadDetail } from "./useSfdcLeadDetail";

export type SfdcLead = SfdcLeadDetail;

export function useSfdcLeads() {
  const { user, sfdcAccountId, isSuperAdmin, impersonating } = useAuth();
  const shouldFilter = !isSuperAdmin || !!impersonating;

  return useQuery({
    queryKey: ["sfdc-leads", user?.id, sfdcAccountId, shouldFilter],
    queryFn: () => {
      const where = shouldFilter && sfdcAccountId && isSafeSfdcId(sfdcAccountId)
        ? `WHERE LeadSource = 'Partner Referral' AND Referral_Partner_Account__c = '${sfdcAccountId}'`
        : `WHERE LeadSource = 'Partner Referral'`;

      return sfdcQuery<SfdcLead>(
        `SELECT ${LEAD_FIELDS}
         FROM Lead
         ${where}
         ORDER BY CreatedDate DESC`
      );
    },
    enabled: !!user,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
