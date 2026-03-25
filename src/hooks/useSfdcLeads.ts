import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery } from "@/lib/sfdc";
import { LEAD_FIELDS } from "./useSfdcLeadDetail";
import type { SfdcLeadDetail } from "./useSfdcLeadDetail";

export type SfdcLead = SfdcLeadDetail;

export function useSfdcLeads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sfdc-leads", user?.id],
    queryFn: () =>
      sfdcQuery<SfdcLead>(
        `SELECT ${LEAD_FIELDS}
         FROM Lead
         WHERE LeadSource = 'Partner Referral'
         ORDER BY CreatedDate DESC`
      ),
    enabled: !!user,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
