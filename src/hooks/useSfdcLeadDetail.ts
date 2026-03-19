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
  Phone: string | null;
  Website: string | null;
  Status: string;
  LeadSource: string | null;
  Industry: string | null;
  Title: string | null;
  Department: string | null;
  Description: string | null;
  NumberOfEmployees: number | null;
  AnnualRevenue: number | null;
  CreatedDate: string;
  LastModifiedDate: string;
  Owner: { Name: string } | null;
  CreatedBy: { Name: string } | null;
}

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
        `SELECT Id, Name, FirstName, LastName, Company, Email, Phone, Website,
                Status, LeadSource, Industry, Title, Department, Description,
                NumberOfEmployees, AnnualRevenue,
                CreatedDate, LastModifiedDate,
                Owner.Name, CreatedBy.Name
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
