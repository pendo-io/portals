import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery } from "@/lib/sfdc";
import { isDemoMode, getDemoOpportunities } from "@/lib/demoData";

export interface SfdcOpportunity {
  Id: string;
  Name: string;
  Account: { Name: string; Website: string | null } | null;
  StageName: string;
  Amount: number | null;
  CloseDate: string;
  LeadSource: string | null;
  CreatedDate: string;
}

export function useSfdcOpportunities() {
  const { user, session, sfdcAccountId, impersonating } = useAuth();
  const impersonateAccountId = impersonating?.sfdcAccountId ?? undefined;
  const demo = isDemoMode(impersonating?.id);

  return useQuery({
    queryKey: ["sfdc-opportunities", user?.id, demo ? "demo" : impersonateAccountId ?? sfdcAccountId],
    queryFn: () =>
      demo
        ? getDemoOpportunities()
        : sfdcQuery<SfdcOpportunity>("opportunities", {}, {
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
