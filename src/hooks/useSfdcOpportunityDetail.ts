import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { sfdcQuery, type SfdcQueryResult } from "@/lib/sfdc";

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
}

export const OPP_FIELDS = `Id, Name, Account.Name, Owner.Name, CreatedBy.Name,
                StageName, Amount, CloseDate, Probability, LeadSource, Type, CreatedDate,
                ARR__c, ARR_USD__c, Net_ARR__c, TCV_USD__c,
                Expiration_Date__c, Transaction_Type__c,
                Next_Steps__c, Pipeline_Date__c,
                Primary_Competitor_Names__c,
                Partner_Relationship__c, Partner_Sub_type__c,
                Created_By_Role__c, Net_ARR_Percentage__c,
                Initial_Product_Interest__c, Management_Notes__c`;

export function useSfdcOpportunityDetail(oppId: string | undefined) {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId } = useSalesforce();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["sfdc-opportunity", oppId],
    queryFn: () => {
      const cachedList = queryClient.getQueryData<SfdcQueryResult<SfdcOpportunityDetail>>(["sfdc-opportunities", sfdcUserId]);
      const cached = cachedList?.records?.find((o) => o.Id === oppId);
      if (cached) {
        return { totalSize: 1, done: true, records: [cached] } as SfdcQueryResult<SfdcOpportunityDetail>;
      }

      return sfdcQuery<SfdcOpportunityDetail>(
        `SELECT ${OPP_FIELDS}
         FROM Opportunity
         WHERE Id = '${oppId}'
         LIMIT 1`,
        sfdcInstanceUrl!,
        sfdcAccessToken!
      );
    },
    enabled: !!sfdcAccessToken && !!sfdcInstanceUrl && !!oppId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
