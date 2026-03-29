import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId } from "@/lib/sfdc";

export interface SfdcLead {
  Id: string;
  Name: string;
  FirstName: string | null;
  LastName: string;
  Company: string;
  Email: string | null;
  Status: string;
  LeadSource: string | null;
  CreatedDate: string;
}

const LEAD_LIST_FIELDS = `Id, Name, FirstName, LastName, Company, Email, Status, LeadSource, CreatedDate`;

export function useSfdcLeads() {
  const { user, session, sfdcAccountId, isSuperAdmin, impersonating } = useAuth();
  const shouldFilter = !isSuperAdmin || !!impersonating;

  return useQuery({
    queryKey: ["sfdc-leads", user?.id, sfdcAccountId, shouldFilter],
    queryFn: () => {
      const where = shouldFilter && sfdcAccountId && isSafeSfdcId(sfdcAccountId)
        ? `WHERE Referral_Partner_Account__c = '${sfdcAccountId}'`
        : `WHERE LeadSource = 'Partner Referral'`;

      return sfdcQuery<SfdcLead>(
        `SELECT ${LEAD_LIST_FIELDS}
         FROM Lead
         ${where}
         ORDER BY CreatedDate DESC`,
        session?.access_token
      );
    },
    enabled: !!user,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
