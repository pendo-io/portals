import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId, type SfdcQueryResult } from "@/lib/sfdc";
import { isDemoMode, getDemoLeadDetail } from "@/lib/demoData";

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
  Street: string | null;
  City: string | null;
  State: string | null;
  PostalCode: string | null;
  Country: string | null;
  Referral_Partner_Account__c: string | null;
  Referral_Partner_Account__r: { Name: string } | null;
  Number_of_Users__c: number | null;
  Current_Tech_Stack_Solutions__c: string | null;
  Department_s__c: string | null;
  Use_Case__c: string | null;
  Competitors_Considered_or_Incumbent__c: string | null;
  Additional_Information__c: string | null;
}

export function useSfdcLeadDetail(leadId: string | undefined) {
  const { user, session, sfdcAccountId, impersonating } = useAuth();
  const queryClient = useQueryClient();
  const impersonateAccountId = impersonating?.sfdcAccountId ?? undefined;
  const demo = isDemoMode(impersonating?.id);

  return useQuery({
    queryKey: ["sfdc-lead", leadId, demo ? "demo" : null],
    queryFn: () => {
      if (demo && leadId) return getDemoLeadDetail(leadId);

      const cachedList = queryClient.getQueryData<SfdcQueryResult<SfdcLeadDetail>>(
        ["sfdc-leads", user?.id, impersonateAccountId ?? sfdcAccountId]
      );
      const cached = cachedList?.records?.find((l) => l.Id === leadId);
      if (cached) {
        return { totalSize: 1, done: true, records: [cached] } as SfdcQueryResult<SfdcLeadDetail>;
      }

      return sfdcQuery<SfdcLeadDetail>("lead-detail", { leadId }, {
        accessToken: session?.access_token,
        impersonateAccountId,
      });
    },
    enabled: !!user && !!leadId && (demo || isSafeSfdcId(leadId)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
