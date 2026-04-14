import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId, type SfdcQueryResult } from "@/lib/sfdc";
import { isDemoMode, getDemoOpportunityDetail } from "@/lib/demoData";

export interface SfdcOpportunityDetail {
  Id: string;
  Name: string;
  Account: { Name: string; Website: string | null } | null;
  Owner: { Name: string; Email: string | null; Title: string | null } | null;
  CreatedBy: { Name: string } | null;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  Probability: number | null;
  LeadSource: string | null;
  Type: string | null;
  CreatedDate: string;
  ARR__c: number | null;
  ARR_USD__c: number | null;
  Net_ARR__c: number | null;
  TCV_USD__c: number | null;
  Expiration_Date__c: string | null;
  Transaction_Type__c: string | null;
  Next_Steps__c: string | null;
  Pipeline_Date__c: string | null;
  Primary_Competitor_Names__c: string | null;
  Partner_Relationship__c: string | null;
  Partner_Sub_type__c: string | null;
  Created_By_Role__c: string | null;
  Net_ARR_Percentage__c: number | null;
  Initial_Product_Interest__c: string | null;
  Management_Notes__c: string | null;
  Solution_Partner_SI__c: string | null;
  Cloud_Hosting_Commit_Hyperscalers__c: string | null;
  Data_Warehouse_Provider__c: string | null;
  Referring_Account_Owner__r: { Name: string } | null;
  Initial_Contact__c: string | null;
  Initial_Contact__r: { Name: string } | null;
  Initial_Contact_Role__c: string | null;
}

export function useSfdcOpportunityDetail(oppId: string | undefined) {
  const { user, session, sfdcAccountId, impersonating } = useAuth();
  const queryClient = useQueryClient();
  const impersonateAccountId = impersonating?.sfdcAccountId ?? undefined;
  const demo = isDemoMode(impersonating?.id);

  return useQuery({
    queryKey: ["sfdc-opportunity", oppId, demo ? "demo" : null],
    queryFn: () => {
      if (demo && oppId) return getDemoOpportunityDetail(oppId);

      const cachedList = queryClient.getQueryData<SfdcQueryResult<SfdcOpportunityDetail>>(
        ["sfdc-opportunities", user?.id, impersonateAccountId ?? sfdcAccountId]
      );
      const cached = cachedList?.records?.find((o) => o.Id === oppId);
      if (cached) {
        return { totalSize: 1, done: true, records: [cached] } as SfdcQueryResult<SfdcOpportunityDetail>;
      }

      return sfdcQuery<SfdcOpportunityDetail>("opportunity-detail", { oppId }, {
        accessToken: session?.access_token,
        impersonateAccountId,
      });
    },
    enabled: !!user && !!oppId && (demo || isSafeSfdcId(oppId)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
