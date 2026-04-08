import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery } from "@/lib/sfdc";
import { isDemoMode, getDemoLeads } from "@/lib/demoData";

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

export function useSfdcLeads() {
  const { user, session, sfdcAccountId, impersonating } = useAuth();
  const impersonateAccountId = impersonating?.sfdcAccountId ?? undefined;
  const demo = isDemoMode(impersonating?.id);

  return useQuery({
    queryKey: ["sfdc-leads", user?.id, demo ? "demo" : impersonateAccountId ?? sfdcAccountId],
    queryFn: () =>
      demo
        ? getDemoLeads()
        : sfdcQuery<SfdcLead>("leads", {}, {
            accessToken: session?.access_token,
            impersonateAccountId,
          }),
    enabled: !!user,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });
}
