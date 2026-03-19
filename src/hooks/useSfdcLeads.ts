import { useQuery } from "@tanstack/react-query";
import { useSalesforce } from "./useSalesforce";
import { sfdcQuery } from "@/lib/sfdc";

export interface SfdcLead {
  Id: string;
  Company: string;
  Name: string;
  FirstName: string | null;
  LastName: string;
  Email: string | null;
  Status: string;
  LeadSource: string | null;
  CreatedDate: string;
}

export function useSfdcLeads() {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId } = useSalesforce();

  return useQuery({
    queryKey: ["sfdc-leads", sfdcUserId],
    queryFn: () =>
      sfdcQuery<SfdcLead>(
        `SELECT Id, Company, Name, FirstName, LastName, Email, Status, LeadSource, CreatedDate
         FROM Lead
         WHERE LeadSource = 'Partner Referral'
         ORDER BY CreatedDate DESC
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
