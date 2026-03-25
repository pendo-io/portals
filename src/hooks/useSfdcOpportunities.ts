import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery } from "@/lib/sfdc";
import { OPP_FIELDS } from "./useSfdcOpportunityDetail";
import type { SfdcOpportunityDetail } from "./useSfdcOpportunityDetail";

export type SfdcOpportunity = SfdcOpportunityDetail;

export function useSfdcOpportunities() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sfdc-opportunities", user?.id],
    queryFn: () =>
      sfdcQuery<SfdcOpportunity>(
        `SELECT ${OPP_FIELDS}
         FROM Opportunity
         WHERE LeadSource = 'Partner Referral'
         ORDER BY CloseDate DESC`
      ),
    enabled: !!user,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
