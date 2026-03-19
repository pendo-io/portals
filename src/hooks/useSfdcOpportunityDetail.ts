import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { sfdcQuery, type SfdcQueryResult } from "@/lib/sfdc";

export interface SfdcOpportunityDetail {
  Id: string;
  Name: string;
  Account: { Name: string } | null;
  Owner: { Name: string } | null;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  Probability: number | null;
  LeadSource: string | null;
  CreatedDate: string;
  // Custom fields from screenshot
  TCV__c: number | null;
  ARR__c: number | null;
  Net_ARR__c: number | null;
  Expiration_Date__c: string | null;
  Solution_Partner_SI__c: string | null;
  Cloud_Hosting_Commit_Hyperscalers__c: string | null;
  Data_Warehouse_Provider__c: string | null;
  Referring_Account_Owner__c: string | null;
  Initial_Contact__c: string | null;
  Initial_Contact_Role__c: string | null;
}

export const OPP_FIELDS = `Id, Name, Account.Name, Owner.Name, StageName, Amount,
                CloseDate, Probability, LeadSource, CreatedDate,
                TCV__c, ARR__c, Net_ARR__c,
                Expiration_Date__c, Solution_Partner_SI__c,
                Cloud_Hosting_Commit_Hyperscalers__c,
                Data_Warehouse_Provider__c,
                Referring_Account_Owner__c,
                Initial_Contact__c, Initial_Contact_Role__c`;

export function useSfdcOpportunityDetail(oppId: string | undefined) {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId } = useSalesforce();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["sfdc-opportunity", oppId],
    queryFn: () => {
      // Try cached list first
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
