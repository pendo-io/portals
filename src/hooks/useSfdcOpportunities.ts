import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId } from "@/lib/sfdc";

export interface SfdcOpportunity {
  Id: string;
  Name: string;
  Account: { Name: string } | null;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  LeadSource: string | null;
  CreatedDate: string;
}

const OPP_LIST_FIELDS = `Id, Name, Account.Name, StageName, Amount, CloseDate, LeadSource, CreatedDate`;

export function useSfdcOpportunities() {
  const { user, sfdcAccountId, isSuperAdmin, impersonating } = useAuth();
  const shouldFilter = !isSuperAdmin || !!impersonating;

  return useQuery({
    queryKey: ["sfdc-opportunities", user?.id, sfdcAccountId, shouldFilter],
    queryFn: () => {
      const where = shouldFilter && sfdcAccountId && isSafeSfdcId(sfdcAccountId)
        ? `WHERE PartnerAccountId = '${sfdcAccountId}'`
        : `WHERE LeadSource = 'Partner Referral'`;

      return sfdcQuery<SfdcOpportunity>(
        `SELECT ${OPP_LIST_FIELDS}
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
