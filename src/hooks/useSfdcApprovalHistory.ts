import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { sfdcQuery, isSafeSfdcId } from "@/lib/sfdc";
import { isDemoMode, getDemoApprovalHistory } from "@/lib/demoData";

export interface SfdcApprovalStep {
  Id: string;
  StepStatus: string;
  Comments: string | null;
  CreatedDate: string;
  Actor: { Name: string } | null;
  OriginalActor: { Name: string } | null;
}

export function useSfdcApprovalHistory(targetObjectId: string | undefined) {
  const { user, session, impersonating } = useAuth();
  const demo = isDemoMode(impersonating?.id);

  return useQuery({
    queryKey: ["sfdc-approval-history", targetObjectId, demo ? "demo" : null],
    queryFn: () =>
      demo
        ? getDemoApprovalHistory()
        : sfdcQuery<SfdcApprovalStep>("approval-history", { targetObjectId }, {
            accessToken: session?.access_token,
          }),
    enabled: !!user && !!targetObjectId && (demo || isSafeSfdcId(targetObjectId)),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}
