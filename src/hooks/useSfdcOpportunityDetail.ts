import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId, type SfdcQueryResult } from "@/lib/sfdc";

export interface SfdcOpportunityDetail {
  Id: string;
  Name: string;
  Account: { Name: string } | null;
  Owner: { Name: string } | null;
  CreatedBy: { Name: string } | null;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  Probability: number | null;
  LeadSource: string | null;
  Type: string | null;
  CreatedDate: string;
  // Custom fields
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

export const OPP_FIELDS = `Id, Name, Account.Name, Owner.Name, CreatedBy.Name,
                StageName, Amount, CloseDate, Probability, LeadSource, Type, CreatedDate,
                ARR__c, ARR_USD__c, Net_ARR__c, TCV_USD__c,
                Expiration_Date__c, Transaction_Type__c,
                Next_Steps__c, Pipeline_Date__c,
                Primary_Competitor_Names__c,
                Partner_Relationship__c, Partner_Sub_type__c,
                Created_By_Role__c, Net_ARR_Percentage__c,
                Initial_Product_Interest__c, Management_Notes__c,
                Solution_Partner_SI__c, Cloud_Hosting_Commit_Hyperscalers__c,
                Data_Warehouse_Provider__c, Referring_Account_Owner__r.Name,
                Initial_Contact__c, Initial_Contact__r.Name, Initial_Contact_Role__c`;

export function useSfdcOpportunityDetail(oppId: string | undefined) {
  const { user, session, sfdcAccountId, isSuperAdmin, impersonating } = useAuth();
  const queryClient = useQueryClient();
  const shouldFilter = !isSuperAdmin || !!impersonating;

  return useQuery({
    queryKey: ["sfdc-opportunity", oppId],
    queryFn: () => {
      const cachedList = queryClient.getQueryData<SfdcQueryResult<SfdcOpportunityDetail>>(["sfdc-opportunities", user?.id, sfdcAccountId, shouldFilter]);
      const cached = cachedList?.records?.find((o) => o.Id === oppId);
      if (cached) {
        return { totalSize: 1, done: true, records: [cached] } as SfdcQueryResult<SfdcOpportunityDetail>;
      }

      return sfdcQuery<SfdcOpportunityDetail>(
        `SELECT ${OPP_FIELDS}
         FROM Opportunity
         WHERE Id = '${oppId}'
         LIMIT 1`,
        session?.access_token
      );
    },
    enabled: !!user && !!oppId && isSafeSfdcId(oppId),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
