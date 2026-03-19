import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { sfdcQuery, type SfdcQueryResult } from "@/lib/sfdc";

export interface SfdcLeadDetail {
  Id: string;
  Name: string;
  FirstName: string | null;
  LastName: string;
  Company: string;
  Email: string | null;
  Website: string | null;
  Status: string;
  LeadSource: string | null;
  CreatedDate: string;
  Owner: { Name: string } | null;
  CreatedBy: { Name: string } | null;
  // Address compound field
  Street: string | null;
  City: string | null;
  State: string | null;
  PostalCode: string | null;
  Country: string | null;
  // Custom fields
  Referral_Partner_Account__c: string | null;
  Referral_Partner_Account__r: { Name: string } | null;
  Number_of_Users__c: number | null;
  Current_Tech_Stack_Solutions__c: string | null;
  Department_s__c: string | null;
  Use_Case__c: string | null;
  Competitors_Considered_or_Incumbent__c: string | null;
  Additional_Information__c: string | null;
}

const LEAD_FIELDS = `Id, Name, FirstName, LastName, Company, Email, Website,
                Status, LeadSource, CreatedDate,
                Owner.Name, CreatedBy.Name,
                Street, City, State, PostalCode, Country,
                Referral_Partner_Account__c, Referral_Partner_Account__r.Name,
                Number_of_Users__c,
                Current_Tech_Stack_Solutions__c, Department_s__c,
                Use_Case__c, Competitors_Considered_or_Incumbent__c,
                Additional_Information__c`;

export { LEAD_FIELDS };

export function useSfdcLeadDetail(leadId: string | undefined) {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId } = useSalesforce();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["sfdc-lead", leadId],
    queryFn: () => {
      // Try to find the lead in the cached list first
      const cachedList = queryClient.getQueryData<SfdcQueryResult<SfdcLeadDetail>>(["sfdc-leads", sfdcUserId]);
      const cached = cachedList?.records?.find((l) => l.Id === leadId);
      if (cached) {
        return { totalSize: 1, done: true, records: [cached] } as SfdcQueryResult<SfdcLeadDetail>;
      }

      // Fallback to individual fetch
      return sfdcQuery<SfdcLeadDetail>(
        `SELECT ${LEAD_FIELDS}
         FROM Lead
         WHERE Id = '${leadId}'
         LIMIT 1`,
        sfdcInstanceUrl!,
        sfdcAccessToken!
      );
    },
    enabled: !!sfdcAccessToken && !!sfdcInstanceUrl && !!leadId,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
