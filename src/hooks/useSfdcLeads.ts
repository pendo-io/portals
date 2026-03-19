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

function buildLeadsQuery(search: string, status: string): string {
  const conditions = ["LeadSource = 'Partner Referral'"];

  if (search.trim()) {
    const escaped = search.trim().replace(/'/g, "\\'");
    conditions.push(
      `(Company LIKE '%${escaped}%' OR Name LIKE '%${escaped}%' OR Email LIKE '%${escaped}%')`
    );
  }

  if (status && status !== "all") {
    const escaped = status.replace(/'/g, "\\'");
    conditions.push(`Status = '${escaped}'`);
  }

  return `SELECT Id, Company, Name, FirstName, LastName, Email, Status, LeadSource, CreatedDate
    FROM Lead
    WHERE ${conditions.join(" AND ")}
    ORDER BY CreatedDate DESC
    LIMIT 200`;
}

export function useSfdcLeads(search = "", status = "all") {
  const { sfdcAccessToken, sfdcInstanceUrl, sfdcUserId } = useSalesforce();

  return useQuery({
    queryKey: ["sfdc-leads", sfdcUserId, search, status],
    queryFn: () =>
      sfdcQuery<SfdcLead>(
        buildLeadsQuery(search, status),
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
