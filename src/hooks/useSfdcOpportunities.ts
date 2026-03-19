import { useQuery } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { sfdcQuery } from "@/lib/sfdc";

export interface SfdcOpportunity {
  Id: string;
  Name: string;
  Account: { Name: string } | null;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  Probability: number | null;
}

export function useSfdcOpportunities() {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId } = useSalesforce();

  return useQuery({
    queryKey: ["sfdc-opportunities", sfdcUserId],
    queryFn: () =>
      sfdcQuery<SfdcOpportunity>(
        `SELECT Id, Name, Account.Name, StageName, Amount, CloseDate, Probability, LeadSource
         FROM Opportunity
         WHERE LeadSource = 'Partner Referral'
         ORDER BY CloseDate DESC
         LIMIT 50`,
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
